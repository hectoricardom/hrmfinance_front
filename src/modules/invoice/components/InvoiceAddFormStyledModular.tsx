import { Component, createSignal, createEffect, createMemo, Show, onMount, For, untrack } from 'solid-js';
import { invoiceStyledFormStore } from '../stores/invoiceStyledFormStore';
import { invoiceStore } from '../stores/invoiceStore';
import { apiAdapter, inventoryApi, yabaOffersApi } from '../../../services/apiAdapter';
import { devLog, generateRandomId, generateShortCode } from '../../../services/utils';
import { calculateDynamicPrice, calculateArancel, categorizeReservaType } from '../hooks/usePricingLogic';
import { useTranslation } from '../../../translations';
import Icon from '../../../components/Icon';
import {
  loadActiveOffers,
  getActiveConfig,
  switchActiveOffer,
  isOffersLoaded,
  activeConfig,
  getAvailableOffers
} from '../../../services/activeOffersService';

// Import our modular components
import BulkManager from './BulkManager';
import CustomerInfo from './CustomerInfo';
import InvoiceBasicInfo from './InvoiceBasicInfo';
import PaymentSection from './PaymentSection';
import InvoiceStyledDraftControls, { clearStyledDraftAfterSubmission } from './InvoiceStyledDraftControls';
import Toast from '../../../components/Toast';

// Import YABA Global Express tariff components
import ItemTariffSelector from './ItemTariffSelector';
import ShippingCalculator from './ShippingCalculator';
import TariffQuickAdd from './TariffQuickAdd';
import type { TariffItem } from '../config/yabaGlobalTariffs';
//import { calculateAirShippingCost, calculateMaritimeShippingCost, YABA_LOCATIONS } from '../config/yabaGlobalTariffs';

// Import types
import { 
  InvoiceProduct, 
  InvoiceReserva, 
  InvoiceService, 
  InvoiceBulk,
  Customer,
  PaymentMethod 
} from '../types/invoiceTypes';
import RecomendationManager from './RecomendationManager';
import { auth } from '../../../services/firebase';
import { authStore } from '../../../stores/authStore';

const InvoiceAddFormStyledModular: Component = () => {
  const { t } = useTranslation();

  // Local state
  const [customer, setCustomer] = createSignal<Customer | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [submitError, setSubmitError] = createSignal('');
  const [submitSuccess, setSubmitSuccess] = createSignal(false);
  const [stockErrors, setStockErrors] = createSignal<any[]>([]);

  // Track touched fields for validation on blur
  const [touchedFields, setTouchedFields] = createSignal<Set<string>>(new Set());

  // Mark a field as touched (called on blur)
  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => {
      const newSet = new Set(prev);
      newSet.add(fieldName);
      return newSet;
    });
  };

  // Check if a field should show error (touched + has error)
  const shouldShowFieldError = (fieldName: string) => {
    return touchedFields().has(fieldName) && invoiceStyledFormStore.hasFieldError(fieldName);
  };

  // Mark all fields as touched (for submit attempt)
  const touchAllFields = () => {
    const allFields = [
      'invoice', 'store', 'shippingMethod',
      'firstName', 'lastName', 'name', 'phoneNumber', 'phoneNumberS', 'cid',
      'items', 'balance', 'grandTotal'
    ];
    setTouchedFields(new Set(allFields));
  };

  // YABA Offers state
  const [offersReady, setOffersReady] = createSignal(false);
  const [showOfferSelector, setShowOfferSelector] = createSignal(false);

  // ============================================
  // YABA GLOBAL EXPRESS - Sistema de Bultos y Pagos
  // ============================================

  // Types for YABA system
  interface YabaTariffItem {
    id: string;
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
  }

  interface YabaBulk {
    id: string;
    number: number;
    name: string; // Custom name for the bulk
    items: YabaTariffItem[];
    itemsTotal: number;
    weight: number;
    shippingMethod: 'aereo' | 'maritimo';
    shippingCost: number;
    shippingDetails: {
      pricePerLb: number;
      billableWeight: number;
      freeLbs: number;
      promotionApplied: boolean;
    };
    services: YabaService[]; // Services per bulk
    servicesTotal: number;
    total: number;
    createdAt: number;
  }

  interface YabaService {
    id: string;
    name: string;
    price: number;
  }

  // Predefined services
  const YABA_SERVICES = [
    { id: 'transporte', name: 'Transporte', icon: '🚚', defaultPrice: 10 },
    { id: 'seguro', name: 'Seguro', icon: '🛡️', defaultPrice: 15 },
    { id: 'caja_small', name: 'Caja Pequeña', icon: '📦', defaultPrice: 3 },
    { id: 'caja_medium', name: 'Caja Mediana', icon: '📦', defaultPrice: 5 },
    { id: 'caja_large', name: 'Caja Grande', icon: '📦', defaultPrice: 8 },
    { id: 'embalaje', name: 'Embalaje', icon: '🎁', defaultPrice: 5 },
  ];

  // YABA Panel state
  const [showTariffPanel, setShowTariffPanel] = createSignal(true);
  const [maritimeDeparture, setMaritimeDeparture] = createSignal<'weekly' | 'monthly'>('weekly');
  const [maritimeItemType, setMaritimeItemType] = createSignal<'miscellaneous' | 'durable'>('miscellaneous');

  // Current bulk being built
  const [currentBulkWeight, setCurrentBulkWeight] = createSignal(0);
  const [currentShippingMethod, setCurrentShippingMethod] = createSignal<'aereo' | 'maritimo' | ''>('');
  const [currentBulkName, setCurrentBulkName] = createSignal('');
  const [shippingBreakdown, setShippingBreakdown] = createSignal<{
    subtotal: number;
    freeLbs: number;
    billableWeight: number;
    pricePerLb: number;
    total: number;
    promotionApplied: boolean;
    tierUsed?: string;
    weight?: number;
    method?: 'aereo' | 'maritimo' | '';
  } | null>(null);
  const [selectedTariffItems, setSelectedTariffItems] = createSignal<YabaTariffItem[]>([]);

  // YABA Bulks collection
  const [yabaBulks, setYabaBulks] = createSignal<YabaBulk[]>([]);
  const [bulkCounter, setBulkCounter] = createSignal(1);

  // Current bulk services (services being added to the bulk being built)
  const [currentBulkServices, setCurrentBulkServices] = createSignal<YabaService[]>([]);

  // Bulk being edited
  const [editingBulkId, setEditingBulkId] = createSignal<string | null>(null);
  const [editingBulkName, setEditingBulkName] = createSignal('');

  // Calculated values for current bulk
  const tariffItemsTotal = () => selectedTariffItems().reduce((sum, item) => sum + item.total, 0);
  const currentBulkServicesTotal = () => currentBulkServices().reduce((sum, svc) => sum + svc.price, 0);
  const currentBulkTotal = () => tariffItemsTotal() + (shippingBreakdown()?.total || 0) + currentBulkServicesTotal();

  // YABA totals across all bulks (broken down by category)
  const yabaItemsTotalSum = () => yabaBulks().reduce((sum, bulk) => sum + bulk.itemsTotal, 0);
  const yabaShippingTotalSum = () => yabaBulks().reduce((sum, bulk) => sum + bulk.shippingCost, 0);
  const yabaServicesTotalSum = () => yabaBulks().reduce((sum, bulk) => sum + bulk.servicesTotal, 0);
  const yabaBulksTotal = () => yabaBulks().reduce((sum, bulk) => sum + bulk.total, 0);
  const yabaGrandTotal = () => yabaBulksTotal();
  const yabaTotalItems = () => yabaBulks().reduce((sum, bulk) => sum + bulk.items.length, 0);
  const yabaTotalWeight = () => yabaBulks().reduce((sum, bulk) => sum + bulk.weight, 0);
  const yabaTotalServices = () => yabaBulks().reduce((sum, bulk) => sum + bulk.services.length, 0);

  // Get reactive form data
  const formData = invoiceStyledFormStore.formData;

  // ============================================
  // YABA LOCAL STORAGE PERSISTENCE
  // ============================================
  const YABA_SESSION_STORAGE_KEY = 'yaba_tariff_session';

  interface YabaSession {
    bulks: YabaBulk[];
    currentBulkServices: YabaService[];
    bulkCounter: number;
    selectedTariffItems: YabaTariffItem[];
    currentBulkWeight: number;
    currentShippingMethod: 'aereo' | 'maritimo' | '';
    currentBulkName: string;
    shippingBreakdown: typeof shippingBreakdown extends () => infer R ? R : never;
    maritimeDeparture: 'weekly' | 'monthly';
    maritimeItemType: 'miscellaneous' | 'durable';
    savedAt: number;
  }

  // Save YABA session to local storage
  const saveYabaSession = () => {
    try {
      const session: YabaSession = {
        bulks: yabaBulks(),
        currentBulkServices: currentBulkServices(),
        bulkCounter: bulkCounter(),
        selectedTariffItems: selectedTariffItems(),
        currentBulkWeight: currentBulkWeight(),
        currentShippingMethod: currentShippingMethod(),
        currentBulkName: currentBulkName(),
        shippingBreakdown: shippingBreakdown(),
        maritimeDeparture: maritimeDeparture(),
        maritimeItemType: maritimeItemType(),
        savedAt: Date.now()
      };
      localStorage.setItem(YABA_SESSION_STORAGE_KEY, JSON.stringify(session));
      devLog('YABA session saved to local storage');
    } catch (error) {
      console.warn('Failed to save YABA session:', error);
    }
  };

  // Load YABA session from local storage
  const loadYabaSession = (): boolean => {
    try {
      const stored = localStorage.getItem(YABA_SESSION_STORAGE_KEY);
      if (!stored) return false;

      const session: YabaSession = JSON.parse(stored);

      // Check if session is less than 24 hours old
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - session.savedAt > maxAge) {
        localStorage.removeItem(YABA_SESSION_STORAGE_KEY);
        devLog('YABA session expired, cleared');
        return false;
      }

      // Restore state
      if (session.bulks?.length > 0) setYabaBulks(session.bulks);
      if (session.currentBulkServices?.length > 0) setCurrentBulkServices(session.currentBulkServices);
      if (session.bulkCounter) setBulkCounter(session.bulkCounter);
      if (session.selectedTariffItems?.length > 0) setSelectedTariffItems(session.selectedTariffItems);
      if (session.currentBulkWeight) setCurrentBulkWeight(session.currentBulkWeight);
      if (session.currentShippingMethod) setCurrentShippingMethod(session.currentShippingMethod);
      if (session.currentBulkName) setCurrentBulkName(session.currentBulkName);
      if (session.shippingBreakdown) setShippingBreakdown(session.shippingBreakdown);
      if (session.maritimeDeparture) setMaritimeDeparture(session.maritimeDeparture);
      if (session.maritimeItemType) setMaritimeItemType(session.maritimeItemType);

      devLog('YABA session restored from local storage:', {
        bulks: session.bulks?.length || 0,
        currentBulkServices: session.currentBulkServices?.length || 0
      });
      return true;
    } catch (error) {
      console.warn('Failed to load YABA session:', error);
      return false;
    }
  };

  // Clear YABA session from local storage
  const clearYabaSession = () => {
    try {
      localStorage.removeItem(YABA_SESSION_STORAGE_KEY);
      devLog('YABA session cleared from local storage');
    } catch (error) {
      console.warn('Failed to clear YABA session:', error);
    }
  };

  // Auto-save YABA session when state changes
  createEffect(() => {
    // Track all YABA state
    const bulks = yabaBulks();
    const services = currentBulkServices();
    const counter = bulkCounter();
    const items = selectedTariffItems();
    const weight = currentBulkWeight();
    const method = currentShippingMethod();
    const name = currentBulkName();
    const breakdown = shippingBreakdown();
    const departure = maritimeDeparture();
    const itemType = maritimeItemType();

    // Only save if there's meaningful data
    if (bulks.length > 0 || services.length > 0 || items.length > 0 || weight > 0) {
      saveYabaSession();
    }
  });

  // Sync YABA total to invoice as a service
  // Use untrack to prevent infinite loop when reading formData().services
  createEffect(() => {
    const total = yabaGrandTotal();

    // Use untrack to read services without creating dependency
    untrack(() => {
      const services = formData().services;
      const existingYabaService = services.find(s => s.type === 'yaba_total');

      if (total > 0) {
        if (existingYabaService) {
          // Only update if value changed to prevent unnecessary updates
          if (existingYabaService.total !== total) {
            const index = services.indexOf(existingYabaService);
            invoiceStyledFormStore.updateService(index, {
              arancel: total, // Use arancel so it's included in servicesTotal calculation
              total: total
            });
          }
        } else {
          invoiceStyledFormStore.addService({
            id: generateRandomId(),
            type: 'yaba_total',
            qty: 1,
            arancel: total, // Use arancel so it's included in servicesTotal calculation
            total: total
          });
        }
      } else if (existingYabaService) {
        // Remove YABA service if total is 0
        const index = services.indexOf(existingYabaService);
        invoiceStyledFormStore.removeService(index);
      }
    });
  });

  // Load YABA offers and session on mount
  onMount(async () => {
    try {
      // In edit mode, load YABA data from the invoice being edited
      if (invoiceStyledFormStore.isEditMode && invoiceStyledFormStore.editingYabaBulks?.length) {
        const bulks = invoiceStyledFormStore.editingYabaBulks as YabaBulk[];
        setYabaBulks(bulks);
        setBulkCounter(bulks.length);
        // Reconstruct selectedTariffItems from all bulk items for display
        const allItems: YabaTariffItem[] = [];
        for (const bulk of bulks) {
          if (bulk.items?.length) {
            for (const item of bulk.items) {
              allItems.push(item);
            }
          }
        }
        if (allItems.length > 0) setSelectedTariffItems(allItems);
        devLog('✅ YABA data loaded from editing invoice:', bulks.length, 'bulks,', allItems.length, 'items');
      } else {
        // Load YABA session from local storage (new invoice flow)
        loadYabaSession();
      }

      // Load active configuration
      await loadActiveOffers();
      setOffersReady(true);
      const config = getActiveConfig();
      devLog('✅ YABA Offers loaded for modular invoice:', config?.name);
    } catch (error) {
      console.warn('⚠️ Could not load YABA offers, using defaults');
      setOffersReady(true);
    }
  });

  // Calculate invoice totals
  const invoiceTotals = createMemo(() => {
    const data = formData();

    // Calculate items total
    const productsTotal = data.products.reduce((sum, p) => sum + p.qty*p.salePrice, 0);
    const reservasTotal = data.reservas.reduce((sum, r) => sum + (r.qty*r.price + r.arancel), 0);
    const servicesTotal = data.services.reduce((sum, s) => sum + s.qty*s.arancel, 0);
    const transportTotal = data.bulks.reduce((sum, b) => sum + (b?.transportCost || 20), 0);


    // data.reservas.map(( r) => { devLog("qty:",r.qty,"price:",r.price ,"arancel:",r.arancel, r.qty*r.price + r.arancel)});


    const itemsTotal = Math.round(productsTotal) +  Math.round(reservasTotal) +  Math.round(servicesTotal) +  Math.round(transportTotal);

    // Get discount
    const discount = data.paymentMethods.discount || 0;

    // Apply discount to items total
    const itemsTotalAfterDiscount = Math.max(0, itemsTotal - discount);

    const subtotal =  data.paymentMethods.cash +  data.paymentMethods.zelle +  data.paymentMethods.creditCard;

    let taxableAmount = itemsTotalAfterDiscount;

    let saveOnTaxPayByCash = 0;
    if ( data.paymentMethods.exemptTaxOnCash) {
      taxableAmount = ( itemsTotalAfterDiscount -  data.paymentMethods.cash );
       saveOnTaxPayByCash =  data.paymentMethods?.cash * data.paymentMethods?.taxPercent/100;
    }

    let taxAmount = data.paymentMethods.taxOnTotal ?
      ( itemsTotalAfterDiscount * data.paymentMethods.taxPercent / 100) :
      (taxableAmount * data.paymentMethods.taxPercent / 100);


    taxAmount =
       itemsTotalAfterDiscount * data.paymentMethods.taxPercent / 100 - saveOnTaxPayByCash;



    const totalWithTax =   itemsTotalAfterDiscount + taxAmount;


    const balance = totalWithTax - subtotal;

    const saveOnExemptTaxOnCash = ( itemsTotalAfterDiscount * data.paymentMethods.taxPercent / 100) - taxAmount;
    // Calculate transport costs from bulks

    // Grand total (after discount, before tax)
    const grandTotal = itemsTotalAfterDiscount;

    return {
      itemsTotal,
      discount,
      itemsTotalAfterDiscount,
      transportTotal,
      grandTotal,
      productsTotal,
      reservasTotal,
      servicesTotal,
      balance,
      totalWithTax,
      taxAmount,
      saveOnExemptTaxOnCash
    };
  });

  // Auto-generate invoice number on mount
  createEffect(() => {
    if (!formData().invoice) {
      const newInvoiceNumber =`${generateShortCode(7)}-${generateShortCode(8)}`
      invoiceStyledFormStore.updateForm({ invoice: newInvoiceNumber });
    }
  });

  // Auto-calculate reserva prices, aranceles and totals
  createEffect(() => {
    const data = formData();
    // Track active config to re-run when offers switch
    const currentConfig = activeConfig();

    data.reservas.forEach((reserva, index) => {
      let updates: Partial<InvoiceReserva> = {};

      // Auto-calculate price and arancel if in auto mode
      if (reserva.autoCalculate !== false && reserva.type) {
        const calculatedPrice = calculateDynamicPrice(
          reserva.type,
          reserva.bulkId || '',
          data.reservas,
          reserva.qty,
          reserva.qty, // weight (same as qty in this context)
          data.shippingMethod as 'MARITIMO' | 'AEREO'
        );
        const calculatedArancel = calculateArancel(reserva.category || categorizeReservaType(reserva.type), reserva.qty);
        
        if (Math.abs(reserva.price - calculatedPrice) > 0.001) {
          updates.price = calculatedPrice;
        }
        if (Math.abs(reserva.arancel - calculatedArancel) > 0.001) {
          updates.arancel = calculatedArancel;
        }
      }
      
      // Always calculate total
      const currentPrice = updates.price !== undefined ? updates.price : reserva.price;
      const currentArancel = updates.arancel !== undefined ? updates.arancel : reserva.arancel;
      const calculatedTotal = (currentPrice + currentArancel) * reserva.qty;
      
      if (Math.abs(reserva.total - calculatedTotal) > 0.001) {
        updates.total = calculatedTotal;
      }
      
      // Update if any changes
      if (Object.keys(updates).length > 0) {
        invoiceStyledFormStore.updateReserva(index, updates);
      }
    });
  });

  // Validate stock availability
  const validateStockAvailability = async (products: any[], storeId?: string) => {
    if (!products || products.length === 0) return { valid: true, errors: [] };

    try {
      const items = products.map(p => ({
        productId: p.product?.id || p.productId || p.id,
        quantity: parseFloat(p.qty || p.quantity || '0')
      })).filter(item => item.productId && item.quantity > 0);

      if (items.length === 0) return { valid: true, errors: [] };

      const result = await inventoryApi.checkStockAvailability(items, storeId);

      if (!result.available) {
        return {
          valid: false,
          errors: result.unavailableItems || []
        };
      }
      return { valid: true, errors: [] };
    } catch (err) {
      console.warn('Stock check failed, proceeding anyway:', err);
      return { valid: true, errors: [] };
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Touch all fields to show all validation errors
    touchAllFields();

    if (!invoiceStyledFormStore.isValid()) {
      setSubmitError('Por favor complete todos los campos requeridos');
      return;
    }

    setLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);
    setStockErrors([]);

    try {
      if (invoiceStyledFormStore.isEditMode) {
        // Edit mode - update existing invoice
        devLog('Updating existing invoice in edit mode');
        const result = await invoiceStyledFormStore.saveEditedInvoice({
          yabaBulks: yabaBulks().length > 0 ? yabaBulks() : undefined,
          yabaGrandTotal: yabaBulks().length > 0 ? yabaGrandTotal() : undefined,
        });
        setSubmitSuccess(true);
        
        // Navigate back after successful update
        setTimeout(() => {
          invoiceStyledFormStore.exitEditMode();
          window.history.back();
        }, 1500);
      } else {
        // Create mode - create new invoice
        let invoiceTotal = invoiceTotals();
        
        // Validate required fields
        if (!formData().invoice.trim()) {
          throw new Error('Numero de factura es requerido');
        }
        if (!formData().shipper_consignee.name.trim()) {
          throw new Error('Nombre del cliente es requerido');
        }
        if (formData().products.length === 0 && formData().reservas.length === 0 && formData().services.length === 0) {
          throw new Error('Al menos un producto, reserva o servicio es requerido');
        }

        // Check stock availability first
        const stockCheck = await validateStockAvailability(formData().products, formData().store);
        if (!stockCheck.valid) {
          setStockErrors(stockCheck.errors);
          // Show error message but don't block - just warn
          setSubmitError('Warning: Some items have insufficient stock. Please review before proceeding.');
        }

        let idInv = generateRandomId()
        // Create invoice data
        const invoiceData = {
          ...formData(),
          type: 'SALES',
          id: idInv,
          ssg_inventory_key: `INVOICE-${Date.now()}`,
          ssg_sorder_key: `SO-${Date.now()}`,
          createDate: formData().createDate || Date.now(),
          businessId: authStore.getBusinessId(),
          isCompleted: true,
          productSubtotal: invoiceTotal.productsTotal,
          reservaSubtotal: invoiceTotal.reservasTotal,
          serviceSubtotal: invoiceTotal.servicesTotal,
          subtotalBeforeTax: invoiceTotal.itemsTotal,
          transportTotal: invoiceTotal.transportTotal,
          taxAmount: invoiceTotal.taxAmount,
          taxSavings: invoiceTotal.saveOnExemptTaxOnCash,
          total: invoiceTotal.totalWithTax,
          shippingMethod: formData().shippingMethod,
          taxCalculationMethod: formData()?.paymentMethods.taxOnTotal ? 'total' : 'subtotal',
          cashPaymentRatio: invoiceTotal.balance > 0 ? formData().paymentMethods.cash / invoiceTotal.balance : 0,
          paymentMethods: formData().paymentMethods,
          // YABA Global Express data
          yabaBulks: yabaBulks().length > 0 ? yabaBulks() : undefined,
          yabaGrandTotal: yabaBulks().length > 0 ? yabaGrandTotal() : undefined,
        };

        // Save to invoice store
       
        const result2 = await inventoryApi.addInvoice(invoiceData);
        //devLog(result2)
        if(result2?.success && result2?.id){

          if(invoiceData.products.length){
            let form2Invent = {
              products: invoiceData.products,
              productSubtotal: invoiceData.total,
              type: 'SALES',
              id: generateRandomId(),
              invoice: invoiceData.invoice,
              invoiceId: idInv,
              ssg_inventory_key: `INVOICE-${Date.now()}`,
              createDate: formData().createDate || Date.now(),
              businessId: authStore.getBusinessId(),
              store: invoiceData.store,
              userId: invoiceData.userId,
              description: invoiceData.description
            }
            const result = await inventoryApi.addInventorySafe(form2Invent);
            devLog(result)
          }
          
          // Clear draft after successful submission
          clearStyledDraftAfterSubmission(formData().invoice);
          // Clear YABA session from local storage
          clearYabaSession();
          // Reset YABA state
          setYabaBulks([]);
          setCurrentBulkServices([]);
          setSelectedTariffItems([]);
          setBulkCounter(1);
          setCurrentBulkWeight(0);
          setCurrentShippingMethod('');
          setCurrentBulkName('');
          setShippingBreakdown(null);
          // Clear form and show success
          invoiceStyledFormStore.clearForm();
          setCustomer(null);
          setSubmitSuccess(true);
        }else{
          setSubmitError(
          invoiceStyledFormStore.isEditMode 
            ? 'Error al actualizar la factura. Por favor intente nuevamente.'
            : 'Error al guardar la factura. Por favor intente nuevamente.'
          );
        }
        
        
      }
    } catch (error) {
      console.error('Error submitting invoice:', error);
      setSubmitError(
        invoiceStyledFormStore.isEditMode 
          ? 'Error al actualizar la factura. Por favor intente nuevamente.'
          : 'Error al guardar la factura. Por favor intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };



  // Handle form clearing
  const handleClearForm = () => {
    if (invoiceStyledFormStore.hasData() || yabaBulks().length > 0 || currentBulkServices().length > 0) {
      const confirmed = confirm('¿Está seguro que desea limpiar el formulario? Se perderán todos los datos no guardados.');
      if (confirmed) {
        // Clear YABA session
        clearYabaSession();
        setYabaBulks([]);
        setCurrentBulkServices([]);
        setSelectedTariffItems([]);
        setBulkCounter(1);
        setCurrentBulkWeight(0);
        setCurrentShippingMethod('');
        setCurrentBulkName('');
        setShippingBreakdown(null);
        // Clear main form
        invoiceStyledFormStore.clearForm();
        setCustomer(null);
        setSubmitError('');
        setSubmitSuccess(false);
      }
    }
  };

  // Bulk management handlers
  const handleAddBulk = (bulk: InvoiceBulk) => {
    invoiceStyledFormStore.addBulk(bulk);
  };

  const handleUpdateBulk = (index: number, updates: Partial<InvoiceBulk>) => {
    invoiceStyledFormStore.updateBulk(index, updates);
    invoiceStyledFormStore.updateBulk(index, { token: generateRandomId()});
  };

  const handleRemoveBulk = (index: number) => {
    const bulkToRemove = formData().bulks[index];
    if (bulkToRemove) {
      // Ask for confirmation
      const confirmed = confirm(`¿Está seguro que desea eliminar el bulto "${bulkToRemove.name}"? Esto también eliminará todos los items asignados al bulto.`);
      if (confirmed) {
        // Remove all items assigned to this bulk first
        const updatedReservas = formData().reservas.filter(r => r.bulkId !== bulkToRemove.id);
        const updatedProducts = formData().products.filter(p => p.bulkId !== bulkToRemove.id);
        const updatedServices = formData().services.filter(s => s.bulkId !== bulkToRemove.id);
        
        // Update form data
        invoiceStyledFormStore.updateForm({
          reservas: updatedReservas,
          products: updatedProducts,
          services: updatedServices
        });
        
        // Remove the bulk
        invoiceStyledFormStore.removeBulk(index);
      }
    }
  };

  // Item management handlers
  const handleAddReserva = (reserva: InvoiceReserva) => {
    invoiceStyledFormStore.addReserva(reserva);
  };

  const handleUpdateReserva = (index: number, updates: Partial<InvoiceReserva>) => {
    invoiceStyledFormStore.updateReserva(index, updates);
  };

  const handleRemoveReserva = (index: number) => {
    invoiceStyledFormStore.removeReserva(index);
  };

  const handleAddProduct = (product: InvoiceProduct) => {
    invoiceStyledFormStore.addProduct(product);
  };

  const handleUpdateProduct = (index: number, updates: Partial<InvoiceProduct>) => {
    invoiceStyledFormStore.updateProduct(index, updates);
  };

  const handleRemoveProduct = (index: number) => {
    invoiceStyledFormStore.removeProduct(index);
  };

  const handleAddService = (service: InvoiceService) => {
    invoiceStyledFormStore.addService(service);
  };

  const handleUpdateService = (index: number, updates: Partial<InvoiceService>) => {
    invoiceStyledFormStore.updateService(index, updates);
  };

  const handleRemoveService = (index: number) => {
    invoiceStyledFormStore.removeService(index);
  };

  // Customer handlers
  const handleCustomerChange = (newCustomer: Customer | null) => {
    //
    let ccustomer = customer();
    if(!customer){
      ccustomer = {
          id: '',
          name: '',
          firstName: '',
          middleName: '',
          lastName: '',
          phoneNumber: '',
          cid: '',
          passport: '',
          email: '',
          address:'',
      }
    }
    let updCust: any = {...ccustomer, ...newCustomer};
    setCustomer(updCust);


  };

  const handleShipperConsigneeChange = (updates: any) => {
    invoiceStyledFormStore.updateShipperConsignee(updates);
  };

  // Payment handlers
  const handlePaymentMethodsChange = (updates: Partial<PaymentMethod>) => {
    invoiceStyledFormStore.updatePaymentMethods(updates);
  };

  // Basic info handlers
  const handleInvoiceChange = (invoice: string) => {
    invoiceStyledFormStore.updateForm({ invoice });
  };

  const handleDescriptionChange = (description: string) => {
    invoiceStyledFormStore.updateForm({ description });
  };

  const handleStoreChange = (store: string) => {
    invoiceStyledFormStore.updateForm({ store });
  };

  const handleGuideChange = (guide: string) => {
    invoiceStyledFormStore.updateForm({ guide });
  };

  const handlePackagesOrderChange = (packagesOrder: boolean) => {
    invoiceStyledFormStore.updateForm({ packagesOrder });
  };

  const handleShippingMethodChange = (shippingMethod: 'aereo' | 'maritimo' | '') => {
    invoiceStyledFormStore.updateForm({ shippingMethod });
  };

  const handleCreateDateChange = (createDate: number) => {
    invoiceStyledFormStore.updateForm({ createDate });
  };

  // YABA Offers handler
  const handleOfferSwitch = async (offerId: string) => {
    try {
      await switchActiveOffer(offerId);

      // Recalculate all reservas with new pricing
      const data = formData();
      data.reservas.forEach((reserva, index) => {
        if (reserva.autoCalculate !== false && reserva.type) {
          const newPrice = calculateDynamicPrice(
            reserva.type,
            reserva.bulkId || '',
            data.reservas,
            reserva.qty,
            reserva.qty,
            data.shippingMethod as 'MARITIMO' | 'AEREO'
          );
          invoiceStyledFormStore.updateReserva(index, { price: newPrice });
        }
      });

      setShowOfferSelector(false);
    } catch (error) {
      console.error('Error switching offers:', error);
    }
  };

  // YABA Tariff handlers - Add to current bulk selection only
  const handleTariffItemSelect = (item: TariffItem) => {
    if (item.price === null) {
      devLog('Item requires custom quote:', item.nameEs);
      return;
    }

    const price = item.price ?? 0;

    // Add to selected tariff items (YABA system only)
    setSelectedTariffItems(prev => [...prev, {
      id: generateRandomId(),
      name: item.nameEs,
      qty: 1,
      price: price,
      total: price
    }]);
  };

  const handleTariffQuickAdd = (items: Array<{ item: TariffItem; qty: number }>) => {
    items.forEach(({ item, qty }) => {
      if (qty > 0) {
        const price = item.price ?? 0;
        const total = price * qty;

        // Add to selected tariff items (YABA system only)
        setSelectedTariffItems(prev => [...prev, {
          id: generateRandomId(),
          name: item.nameEs,
          qty: qty,
          price: price,
          total: total
        }]);
      }
    });
  };

  // Remove tariff item from current selection
  const handleRemoveTariffItem = (itemId: string) => {
    setSelectedTariffItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Create YABA bulk with current items, shipping, and services
  const handleCreateYabaBulk = () => {
    const items = selectedTariffItems();
    const shipping = shippingBreakdown();
    const weight = currentBulkWeight();
    const method = currentShippingMethod();
    const bulkName = currentBulkName().trim();
    const services = currentBulkServices();

    if (items.length === 0 && weight <= 0) {
      devLog('No items or weight to add to bulk');
      return;
    }

    if (!method) {
      devLog('No shipping method selected');
      return;
    }

    const bulkNumber = bulkCounter();
    const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);

    // Create YABA bulk
    const newYabaBulk: YabaBulk = {
      id: generateRandomId(),
      number: bulkNumber,
      name: bulkName || `Bulto #${bulkNumber}`,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unitPrice: item.price,
        total: item.total
      })),
      itemsTotal: tariffItemsTotal(),
      weight: weight,
      shippingMethod: method as 'aereo' | 'maritimo',
      shippingCost: shipping?.total || 0,
      shippingDetails: {
        pricePerLb: shipping?.pricePerLb || 0,
        billableWeight: shipping?.billableWeight || weight,
        freeLbs: shipping?.freeLbs || 0,
        promotionApplied: shipping?.promotionApplied || false
      },
      services: [...services], // Services for this bulk
      servicesTotal: servicesTotal,
      total: currentBulkTotal(), // Already includes services via currentBulkServicesTotal()
      createdAt: Date.now()
    };

    // Add to YABA bulks
    setYabaBulks(prev => [...prev, newYabaBulk]);

    // Clear current selection for next bulk
    setSelectedTariffItems([]);
    setShippingBreakdown(null);
    setCurrentBulkWeight(0);
    setCurrentShippingMethod('');
    setCurrentBulkName('');
    setCurrentBulkServices([]); // Clear services for next bulk
    setBulkCounter(prev => prev + 1);

    devLog(`Created YABA bulk "${newYabaBulk.name}" with ${items.length} items, ${services.length} services, ${weight} lbs, $${newYabaBulk.total.toFixed(2)} total`);
  };

  // Remove a YABA bulk
  const handleRemoveYabaBulk = (bulkId: string) => {
    setYabaBulks(prev => prev.filter(bulk => bulk.id !== bulkId));
  };

  // Clear current selection without creating bulk
  const handleClearCurrentSelection = () => {
    setSelectedTariffItems([]);
    setShippingBreakdown(null);
    setCurrentBulkWeight(0);
  };

  const handleShippingCostCalculated = (breakdown: {
    subtotal: number;
    freeLbs: number;
    billableWeight: number;
    pricePerLb: number;
    total: number;
    promotionApplied: boolean;
    tierUsed?: string;
    weight?: number;
    method?: 'aereo' | 'maritimo' | '';
  }) => {
    setShippingBreakdown(breakdown);

    // Update current bulk weight and method
    if (breakdown.weight !== undefined) {
      setCurrentBulkWeight(breakdown.weight);
    }
    if (breakdown.method) {
      setCurrentShippingMethod(breakdown.method);
    }
  };

  // YABA Services handlers (for current bulk being built)
  const handleAddYabaService = (serviceId: string, customPrice?: number) => {
    const predefinedService = YABA_SERVICES.find(s => s.id === serviceId);
    if (!predefinedService) return;

    const newService: YabaService = {
      id: generateRandomId(),
      name: predefinedService.name,
      price: customPrice ?? predefinedService.defaultPrice
    };

    setCurrentBulkServices(prev => [...prev, newService]);
  };

  const handleRemoveYabaService = (serviceId: string) => {
    setCurrentBulkServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const handleUpdateYabaServicePrice = (serviceId: string, newPrice: number) => {
    setCurrentBulkServices(prev => prev.map(s =>
      s.id === serviceId ? { ...s, price: newPrice } : s
    ));
  };

  // Bulk name editing handlers
  const handleStartEditBulkName = (bulkId: string, currentName: string) => {
    setEditingBulkId(bulkId);
    setEditingBulkName(currentName);
  };

  const handleSaveBulkName = () => {
    const bulkId = editingBulkId();
    const newName = editingBulkName().trim();

    if (bulkId && newName) {
      setYabaBulks(prev => prev.map(bulk =>
        bulk.id === bulkId ? { ...bulk, name: newName } : bulk
      ));
    }

    setEditingBulkId(null);
    setEditingBulkName('');
  };

  const handleCancelEditBulkName = () => {
    setEditingBulkId(null);
    setEditingBulkName('');
  };

  // Styles
  const containerStyle = {
    'max-width': '1200px',
    margin: '0 auto',
    padding: '2rem',
    'font-family': 'system-ui, sans-serif'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem',
    padding: '1rem',
    background: 'var(--primary-color)',
    color: 'white',
    'border-radius': 'var(--border-radius)',
    position: 'relative' as const
  };

  const titleStyle = {
    'font-size': '2rem',
    'font-weight': 'bold',
    'margin-bottom': '0.5rem'
  };

  const subtitleStyle = {
    'font-size': '1rem',
    opacity: '0.9',
     color: 'white',
  };

  const statusIndicatorStyle = {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'font-weight': '500',
    background: invoiceStyledFormStore.isDirty ? 'var(--warning-color)' : 'var(--success-color)',
    color: 'white'
  };

  const totalsStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-bottom': '2rem',
    'text-align': 'center' as const
  };

  const totalRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem',
    'font-size': '1rem'
  };

  const grandTotalStyle = {
    ...totalRowStyle,
    'font-size': '1.25rem',
    'font-weight': 'bold',
    'padding-top': '0.5rem',
    'border-top': '2px solid var(--primary-color)',
    color: 'var(--primary-color)'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'center',
    'margin-top': '2rem',
    'flex-wrap': 'wrap' as const
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-weight': '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    'min-width': '120px'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'var(--primary-color)',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'var(--border-color)',
    color: 'var(--text-primary)'
  };

  const errorStyle = {
    background: 'var(--error-background)',
    color: 'var(--error-color)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    border: '1px solid var(--error-color)'
  };

  const successStyle = {
    background: 'var(--success-background)',
    color: 'var(--success-color)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    border: '1px solid var(--success-color)',
    'text-align': 'center' as const
  };

  const validationSummaryStyle = {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1rem',
    'margin-bottom': '1.5rem'
  };

  const validationHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'margin-bottom': '0.75rem',
    'font-weight': '600',
    color: '#856404'
  };

  const validationListStyle = {
    margin: '0',
    padding: '0 0 0 1.5rem',
    'font-size': '0.9rem',
    color: '#856404'
  };

  const validationItemStyle = {
    'margin-bottom': '0.25rem'
  };

  // Get validation errors
  const validationErrors = createMemo(() => {
    return invoiceStyledFormStore.getValidationErrors();
  });

  // Group errors by section
  const errorsBySection = createMemo(() => {
    const errors = validationErrors();
    const grouped: Record<string, { field: string; label: string }[]> = {};

    errors.forEach(error => {
      if (!grouped[error.section]) {
        grouped[error.section] = [];
      }
      grouped[error.section].push({ field: error.field, label: error.label });
    });

    return grouped;
  });

  // Get section validation for progress tracking
  const sectionValidation = createMemo(() => {
    return invoiceStyledFormStore.getSectionValidation();
  });

  // Calculate overall progress
  const overallProgress = createMemo(() => {
    const validation = sectionValidation();
    const totalFields = validation.basicInfo.totalFields + validation.customerInfo.totalFields +
                        validation.items.totalFields + validation.payment.totalFields;
    const completedFields = validation.basicInfo.completedFields + validation.customerInfo.completedFields +
                            validation.items.completedFields + validation.payment.completedFields;
    const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

    return {
      completed: completedFields,
      total: totalFields,
      percentage,
      sections: {
        basicInfo: validation.basicInfo.isValid,
        customerInfo: validation.customerInfo.isValid,
        items: validation.items.isValid,
        payment: validation.payment.isValid
      }
    };
  });

  return (
    <>
      <Toast />
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
        <h1 style={titleStyle}>
          <Icon name="invoice" size="1.2em" style={{ "margin-right": "0.5rem" }} />
          {invoiceStyledFormStore.isEditMode ? 'Editar Factura' : 'Nueva Factura'}
        </h1>
        <p style={subtitleStyle}>
          {invoiceStyledFormStore.isEditMode ? 'Modificar factura existente' : 'Sistema de facturación con gestión de bultos'}
        </p>
      </div>

      {/* Validation Progress Bar */}
      <div style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius)',
        padding: '1rem',
        'margin-bottom': '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '0.75rem'
        }}>
          <span style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
            Progreso del Formulario
          </span>
          <span style={{
            'font-size': '0.875rem',
            color: overallProgress().percentage === 100 ? '#155724' : '#856404',
            'font-weight': '500'
          }}>
            {overallProgress().completed}/{overallProgress().total} campos ({overallProgress().percentage}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          background: '#e9ecef',
          'border-radius': '10px',
          height: '10px',
          overflow: 'hidden',
          'margin-bottom': '1rem'
        }}>
          <div style={{
            background: overallProgress().percentage === 100
              ? 'linear-gradient(90deg, #28a745, #20c997)'
              : overallProgress().percentage >= 50
                ? 'linear-gradient(90deg, #ffc107, #fd7e14)'
                : 'linear-gradient(90deg, #dc3545, #e83e8c)',
            width: `${overallProgress().percentage}%`,
            height: '100%',
            'border-radius': '10px',
            transition: 'width 0.3s ease, background 0.3s ease'
          }} />
        </div>

        {/* Section Status Pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          'flex-wrap': 'wrap'
        }}>
          <div style={{
            padding: '0.35rem 0.75rem',
            'border-radius': '20px',
            'font-size': '0.75rem',
            'font-weight': '500',
            background: overallProgress().sections.basicInfo ? '#d4edda' : '#fff3cd',
            color: overallProgress().sections.basicInfo ? '#155724' : '#856404',
            border: `1px solid ${overallProgress().sections.basicInfo ? '#c3e6cb' : '#ffeeba'}`,
            display: 'flex',
            'align-items': 'center',
            gap: '0.25rem'
          }}>
            <span>{overallProgress().sections.basicInfo ? '✓' : '○'}</span>
            <span>Info Básica</span>
          </div>

          <div style={{
            padding: '0.35rem 0.75rem',
            'border-radius': '20px',
            'font-size': '0.75rem',
            'font-weight': '500',
            background: overallProgress().sections.customerInfo ? '#d4edda' : '#fff3cd',
            color: overallProgress().sections.customerInfo ? '#155724' : '#856404',
            border: `1px solid ${overallProgress().sections.customerInfo ? '#c3e6cb' : '#ffeeba'}`,
            display: 'flex',
            'align-items': 'center',
            gap: '0.25rem'
          }}>
            <span>{overallProgress().sections.customerInfo ? '✓' : '○'}</span>
            <span>Cliente</span>
          </div>

          <div style={{
            padding: '0.35rem 0.75rem',
            'border-radius': '20px',
            'font-size': '0.75rem',
            'font-weight': '500',
            background: overallProgress().sections.items ? '#d4edda' : '#fff3cd',
            color: overallProgress().sections.items ? '#155724' : '#856404',
            border: `1px solid ${overallProgress().sections.items ? '#c3e6cb' : '#ffeeba'}`,
            display: 'flex',
            'align-items': 'center',
            gap: '0.25rem'
          }}>
            <span>{overallProgress().sections.items ? '✓' : '○'}</span>
            <span>Items</span>
          </div>

          <div style={{
            padding: '0.35rem 0.75rem',
            'border-radius': '20px',
            'font-size': '0.75rem',
            'font-weight': '500',
            background: overallProgress().sections.payment ? '#d4edda' : '#fff3cd',
            color: overallProgress().sections.payment ? '#155724' : '#856404',
            border: `1px solid ${overallProgress().sections.payment ? '#c3e6cb' : '#ffeeba'}`,
            display: 'flex',
            'align-items': 'center',
            gap: '0.25rem'
          }}>
            <span>{overallProgress().sections.payment ? '✓' : '○'}</span>
            <span>Pago</span>
          </div>
        </div>
      </div>

      {/* Active Offers Configuration Banner */}
      <Show when={offersReady() && isOffersLoaded()}>
        <div style={{
          padding: '0.75rem 1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          'border-radius': 'var(--border-radius-sm)',
          'margin-bottom': '1.5rem',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'box-shadow': '0 2px 8px rgba(102, 126, 234, 0.3)',
          position: 'relative' as const
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <strong>💰 Ofertas Activas:</strong>
            <span>{getActiveConfig()?.name || 'Default'}</span>
            <span style={{ 'margin-left': '1rem', opacity: 0.9, 'font-size': '0.9rem' }}>
              {getActiveConfig()?.code || 'Default'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
            <Show when={getAvailableOffers().length > 1}>
              <button
                onClick={() => setShowOfferSelector(!showOfferSelector())}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  'border-radius': 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  'font-size': '0.875rem',
                  'font-weight': '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                🔄 Cambiar
              </button>
            </Show>
          </div>

          {/* Dropdown selector */}
          <Show when={showOfferSelector()}>
            <div style={{
              position: 'absolute' as const,
              top: '100%',
              right: '0',
              'margin-top': '0.5rem',
              background: 'white',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.15)',
              'z-index': '1000',
              'min-width': '250px',
              overflow: 'hidden'
            }}>
              <For each={getAvailableOffers()}>
                {(offer) => {
                  const offerData = JSON.parse(offer.data);
                  const isActive = getActiveConfig()?.id === offer.id;

                  return (
                    <button
                      onClick={() => handleOfferSwitch(offer.id)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: isActive ? '#f0f0ff' : 'white',
                        border: 'none',
                        'border-bottom': '1px solid var(--border-color)',
                        'text-align': 'left' as const,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = '#f8f8f8')}
                      onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'white')}
                    >
                      <span style={{ 'font-weight': isActive ? '600' : '400' }}>
                        {isActive && '✓ '}{offerData.offerName}
                      </span>
                      <Show when={isActive}>
                        <span style={{
                          'font-size': '0.75rem',
                          padding: '0.2rem 0.5rem',
                          background: '#667eea',
                          color: 'white',
                          'border-radius': '3px'
                        }}>
                          ACTIVA
                        </span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Multi-Draft Controls - Only show in create mode */}
      <Show when={!invoiceStyledFormStore.isEditMode}>
        <div style={{ 'margin-bottom': '1.5rem', display: 'flex', 'justify-content': 'center' }}>
          <InvoiceStyledDraftControls />
        </div>
      </Show>

      {/* Success Message */}
      {submitSuccess() && (
        <div style={successStyle}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            <Icon name="success" size="1.2em" style={{ "margin-right": "0.5rem" }} />
            {invoiceStyledFormStore.isEditMode ? '¡Factura Actualizada Exitosamente!' : '¡Factura Creada Exitosamente!'}
          </h3>
          <p style={{ margin: '0' }}>
            {invoiceStyledFormStore.isEditMode 
              ? 'La factura ha sido actualizada correctamente en el sistema.'
              : 'La factura ha sido guardada correctamente en el sistema.'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {submitError() && (
        <div style={errorStyle}>
          <strong><Icon name="error" size="1em" style={{ "margin-right": "0.3rem" }} />Error:</strong> {submitError()}
        </div>
      )}

      {/* Invoice Basic Information */}
      <InvoiceBasicInfo
        invoice={formData().invoice}
        description={formData().description}
        store={formData().store}
        guide={formData().guide || ''}
        packagesOrder={formData().packagesOrder}
        shippingMethod={formData().shippingMethod}
        createDate={formData().createDate}
        onInvoiceChange={handleInvoiceChange}
        onDescriptionChange={handleDescriptionChange}
        onStoreChange={handleStoreChange}
        onGuideChange={handleGuideChange}
        onPackagesOrderChange={handlePackagesOrderChange}
        onShippingMethodChange={handleShippingMethodChange}
        onCreateDateChange={handleCreateDateChange}
        onFieldBlur={handleFieldBlur}
        shouldShowFieldError={shouldShowFieldError}
      />

      <RecomendationManager
        shippingMethod={
          formData().shippingMethod === 'aereo' ? 'AEREO' :
          formData().shippingMethod === 'maritimo' ? 'SEA' :
          undefined
        }
        onShipperConsigneeChange={handleShipperConsigneeChange}
        bulks={formData().bulks}
        reservas={formData().reservas}
        products={formData().products}
        services={formData().services}
        onAddBulk={handleAddBulk}
        onAddReserva={handleAddReserva}
        onUpdateBulk={handleUpdateBulk}
        onRemoveBulk={handleRemoveBulk}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onRemoveProduct={handleRemoveProduct}
        onUpdateService={handleUpdateService}
        onRemoveService={handleRemoveService}
        onRemoveReserva={handleRemoveReserva}
      />

      {/* Customer Information */}
      <CustomerInfo
        customer={customer()}
        shipperConsignee={formData().shipper_consignee}
        //onCustomerChange={handleCustomerChange}
        onShipperConsigneeChange={handleShipperConsigneeChange}
        onFieldBlur={handleFieldBlur}
        shouldShowFieldError={shouldShowFieldError}
      />

      {/* Stock Warnings */}
      <Show when={stockErrors().length > 0}>
        <div style={{
          padding: '1rem',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          'border-radius': '8px',
          'margin-bottom': '1rem',
        }}>
          <div style={{ 'font-weight': '600', color: '#92400e', 'margin-bottom': '0.5rem' }}>
            ⚠️ Low Stock Warning
          </div>
          <ul style={{ margin: 0, 'padding-left': '1.25rem', color: '#92400e', 'font-size': '0.875rem' }}>
            <For each={stockErrors()}>
              {(item) => (
                <li>
                  {item.productName}: Need {item.requestedQuantity}, only {item.availableQuantity} available
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      {/* Bulk Management 
      <BulkManager
        bulks={formData().bulks}
        products={formData().products}
        reservas={formData().reservas}
        services={formData().services}
        shippingMethod={formData().shippingMethod as 'AEREO' | 'SEA' | ''}
        onAddBulk={handleAddBulk}
        onUpdateBulk={handleUpdateBulk}
        onRemoveBulk={handleRemoveBulk}
        onAddReserva={handleAddReserva}
        onUpdateReserva={handleUpdateReserva}
        onRemoveReserva={handleRemoveReserva}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onRemoveProduct={handleRemoveProduct}
        onAddService={handleAddService}
        onUpdateService={handleUpdateService}
        onRemoveService={handleRemoveService}
      />
    */}


      {/* YABA Global Express Tariff Panel */}
      <div style={{
        background: 'var(--surface-color)',
        border: '2px solid #2563eb',
        'border-radius': 'var(--border-radius)',
        'margin-bottom': '2rem',
        overflow: 'hidden'
      }}>
        {/* Panel Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            padding: '1rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            color: 'white'
          }}
          onClick={() => setShowTariffPanel(!showTariffPanel())}
        >
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
            <span style={{ 'font-size': '1.5rem' }}>📦</span>
            <div>
              <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>YABA GLOBAL EXPRESS</div>
              <div style={{ 'font-size': '0.8rem', opacity: '0.9' }}>Tarifas y Envíos a Cuba</div>
            </div>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
            <span style={{
              background: '#fbbf24',
              color: '#1a1a2e',
              padding: '0.25rem 0.75rem',
              'border-radius': '999px',
              'font-size': '0.75rem',
              'font-weight': '600'
            }}>
              Toda Cuba + Isla de la Juventud
            </span>
            <span style={{ 'font-size': '1.25rem', transition: 'transform 0.2s' }}>
              {showTariffPanel() ? '▼' : '▶'}
            </span>
          </div>
        </div>

        {/* Panel Content */}
        <Show when={showTariffPanel()}>
          <div style={{ padding: '1.5rem' }}>
            {/* Two Column Layout */}
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Left Column: Item Selection */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  🏷️ Seleccionar Artículos por Aranceles
                </h4>

                {/* Item Tariff Selector */}
                <ItemTariffSelector onSelect={handleTariffItemSelect} />

                {/* Quick Add Grid */}
                <div style={{ 'margin-top': '1.5rem' }}>
                  <TariffQuickAdd onAdd={handleTariffQuickAdd} />
                </div>
              </div>

              {/* Right Column: Shipping Calculator */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  🚚 Calculadora de Envío
                </h4>

                <ShippingCalculator
                  onCostCalculated={handleShippingCostCalculated}
                  maritimeDeparture={maritimeDeparture()}
                  maritimeItemType={maritimeItemType()}
                  onMaritimeDepartureChange={setMaritimeDeparture}
                  onMaritimeItemTypeChange={setMaritimeItemType}
                  onWeightChange={setCurrentBulkWeight}
                  onMethodChange={setCurrentShippingMethod}
                />

                {/* Cost Breakdown - Desglose de Costo */}
                <Show when={selectedTariffItems().length > 0 || shippingBreakdown()}>
                  <div style={{
                    'margin-top': '1rem',
                    padding: '1rem',
                    background: '#f8fafc',
                    'border-radius': '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ 'font-weight': '700', color: 'var(--text-primary)', 'margin-bottom': '0.75rem', 'font-size': '1rem' }}>
                      📋 Desglose de Costo
                    </div>

                    {/* Selected Tariff Items */}
                    <Show when={selectedTariffItems().length > 0}>
                      <div style={{ 'margin-bottom': '0.75rem' }}>
                        <div style={{ 'font-size': '0.8rem', 'font-weight': '600', color: 'var(--text-secondary)', 'margin-bottom': '0.5rem' }}>
                          Artículos por Tarifa:
                        </div>
                        <For each={selectedTariffItems()}>
                          {(item) => (
                            <div style={{
                              display: 'flex',
                              'justify-content': 'space-between',
                              'align-items': 'center',
                              padding: '0.4rem 0.5rem',
                              background: item.price === 0 ? '#e8f5e9' : 'white',
                              'border-radius': '4px',
                              'margin-bottom': '0.25rem',
                              'font-size': '0.85rem',
                              border: '1px solid var(--border-color)'
                            }}>
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                                <span>{item.price === 0 ? '🆓' : '📦'}</span>
                                <span>{item.name}</span>
                                <span style={{ color: 'var(--text-secondary)', 'font-size': '0.75rem' }}>x{item.qty}</span>
                              </div>
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                                <span style={{ 'font-weight': '600', color: item.price === 0 ? '#2e7d32' : 'var(--primary-color)' }}>
                                  {item.price === 0 ? 'GRATIS' : `$${item.total.toFixed(2)}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTariffItem(item.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#dc3545',
                                    'font-size': '1rem',
                                    padding: '0 0.25rem'
                                  }}
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </For>
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'padding-top': '0.5rem',
                          'border-top': '1px dashed var(--border-color)',
                          'margin-top': '0.5rem',
                          'font-size': '0.9rem'
                        }}>
                          <span style={{ 'font-weight': '500' }}>Subtotal Artículos:</span>
                          <span style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>${tariffItemsTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </Show>

                    {/* Shipping Cost */}
                    <Show when={shippingBreakdown()}>
                      <div style={{
                        'padding-top': selectedTariffItems().length > 0 ? '0.75rem' : '0',
                        'border-top': selectedTariffItems().length > 0 ? '1px solid var(--border-color)' : 'none'
                      }}>
                        <div style={{ 'font-size': '0.8rem', 'font-weight': '600', color: 'var(--text-secondary)', 'margin-bottom': '0.5rem' }}>
                          {currentShippingMethod() === 'aereo' ? '✈️' : '🚢'} Costo de Envío ({currentShippingMethod() === 'aereo' ? 'Aéreo' : 'Marítimo'}):
                        </div>
                        <div style={{ 'font-size': '0.85rem' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span>Peso total:</span>
                            <span style={{ 'font-weight': '600' }}>{currentBulkWeight().toFixed(2)} lbs</span>
                          </div>
                          <Show when={shippingBreakdown()!.promotionApplied && shippingBreakdown()!.freeLbs > 0}>
                            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem', color: '#10b981' }}>
                              <span>🎉 Libras gratis:</span>
                              <span>-{shippingBreakdown()!.freeLbs} lbs</span>
                            </div>
                          </Show>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span>Peso facturable:</span>
                            <span>{shippingBreakdown()!.billableWeight.toFixed(2)} lbs</span>
                          </div>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span>Tarifa:</span>
                            <span>${shippingBreakdown()!.pricePerLb.toFixed(2)}/lb</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            'justify-content': 'space-between',
                            'padding-top': '0.5rem',
                            'border-top': '1px dashed var(--border-color)',
                            'margin-top': '0.25rem'
                          }}>
                            <span style={{ 'font-weight': '500' }}>Subtotal Envío:</span>
                            <span style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>${shippingBreakdown()!.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </Show>

                    {/* Services Section - Per Bulk */}
                    <div style={{
                      'margin-top': '0.75rem',
                      'padding-top': '0.75rem',
                      'border-top': '1px solid var(--border-color)'
                    }}>
                      <div style={{ 'font-size': '0.8rem', 'font-weight': '600', color: 'var(--text-secondary)', 'margin-bottom': '0.5rem' }}>
                        🛠️ Servicios para este Bulto:
                      </div>

                      {/* Services Quick Add Buttons with Popover */}
                      <div style={{
                        display: 'flex',
                        'flex-wrap': 'wrap',
                        gap: '0.35rem',
                        'margin-bottom': '0.5rem'
                      }}>
                        <For each={YABA_SERVICES}>
                          {(service) => {
                            const [showTooltip, setShowTooltip] = createSignal(false);
                            return (
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button
                                  type="button"
                                  onClick={() => handleAddYabaService(service.id)}
                                  onMouseEnter={() => setShowTooltip(true)}
                                  onMouseLeave={() => setShowTooltip(false)}
                                  style={{
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '0.25rem',
                                    padding: '0.4rem 0.6rem',
                                    background: 'white',
                                    border: '1px solid #d1d5db',
                                    'border-radius': '6px',
                                    cursor: 'pointer',
                                    'font-size': '0.85rem',
                                    transition: 'all 0.2s',
                                    'box-shadow': '0 1px 2px rgba(0,0,0,0.05)'
                                  }}
                                >
                                  <span style={{ 'font-size': '1rem' }}>{service.icon}</span>
                                  <span style={{ color: '#16a34a', 'font-weight': '600', 'font-size': '0.75rem' }}>${service.defaultPrice}</span>
                                </button>
                                {/* Popover Tooltip */}
                                <Show when={showTooltip()}>
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    'margin-bottom': '6px',
                                    padding: '0.5rem 0.75rem',
                                    background: '#1f2937',
                                    color: 'white',
                                    'border-radius': '6px',
                                    'font-size': '0.75rem',
                                    'white-space': 'nowrap',
                                    'z-index': '1000',
                                    'box-shadow': '0 4px 6px rgba(0,0,0,0.15)',
                                    'pointer-events': 'none'
                                  }}>
                                    <div style={{ 'font-weight': '600', 'margin-bottom': '2px' }}>{service.name}</div>
                                    <div style={{ color: '#9ca3af', 'font-size': '0.7rem' }}>Click para agregar • ${service.defaultPrice}</div>
                                    {/* Arrow */}
                                    <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      width: '0',
                                      height: '0',
                                      'border-left': '6px solid transparent',
                                      'border-right': '6px solid transparent',
                                      'border-top': '6px solid #1f2937'
                                    }} />
                                  </div>
                                </Show>
                              </div>
                            );
                          }}
                        </For>
                      </div>

                      {/* Selected Services for Current Bulk */}
                      <Show when={currentBulkServices().length > 0}>
                        <div style={{
                          background: '#f0fdf4',
                          'border-radius': '4px',
                          padding: '0.5rem',
                          'margin-bottom': '0.5rem'
                        }}>
                          <For each={currentBulkServices()}>
                            {(service) => (
                              <div style={{
                                display: 'flex',
                                'justify-content': 'space-between',
                                'align-items': 'center',
                                padding: '0.25rem 0',
                                'font-size': '0.8rem'
                              }}>
                                <span>{service.name}</span>
                                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={service.price}
                                    onInput={(e) => handleUpdateYabaServicePrice(service.id, parseFloat(e.currentTarget.value) || 0)}
                                    style={{
                                      width: '55px',
                                      padding: '0.15rem 0.25rem',
                                      border: '1px solid #d1d5db',
                                      'border-radius': '3px',
                                      'font-size': '0.75rem',
                                      'text-align': 'right'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveYabaService(service.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#dc2626',
                                      'font-size': '0.9rem',
                                      padding: '0'
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            )}
                          </For>
                          <div style={{
                            display: 'flex',
                            'justify-content': 'space-between',
                            'padding-top': '0.25rem',
                            'border-top': '1px dashed #22c55e',
                            'margin-top': '0.25rem',
                            'font-size': '0.8rem',
                            'font-weight': '600'
                          }}>
                            <span>Subtotal Servicios:</span>
                            <span style={{ color: '#16a34a' }}>${currentBulkServicesTotal().toFixed(2)}</span>
                          </div>
                        </div>
                      </Show>
                    </div>

                    {/* Grand Total */}
                    <div style={{
                      'margin-top': '0.75rem',
                      'padding-top': '0.75rem',
                      'border-top': '2px solid var(--primary-color)',
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center'
                    }}>
                      <span style={{ 'font-weight': '700', 'font-size': '1rem' }}>💰 TOTAL BULTO:</span>
                      <span style={{ 'font-weight': '700', 'font-size': '1.25rem', color: 'var(--primary-color)' }}>
                        ${currentBulkTotal().toFixed(2)}
                      </span>
                    </div>

                    {/* Bulk Name Input */}
                    <div style={{ 'margin-top': '1rem' }}>
                      <label style={{ display: 'block', 'font-size': '0.8rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>
                        📝 Nombre del Bulto (opcional)
                      </label>
                      <input
                        type="text"
                        value={currentBulkName()}
                        onInput={(e) => setCurrentBulkName(e.currentTarget.value)}
                        placeholder={`Bulto #${bulkCounter()}`}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border-color)',
                          'border-radius': '6px',
                          'font-size': '0.9rem'
                        }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      'margin-top': '0.75rem',
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <button
                        type="button"
                        onClick={handleCreateYabaBulk}
                        disabled={selectedTariffItems().length === 0 || currentBulkWeight() <= 0 || !currentShippingMethod()}
                        style={{
                          flex: '1',
                          padding: '0.75rem 1rem',
                          background: (selectedTariffItems().length === 0 || currentBulkWeight() <= 0 || !currentShippingMethod())
                            ? '#ccc'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '8px',
                          cursor: (selectedTariffItems().length === 0 || currentBulkWeight() <= 0 || !currentShippingMethod())
                            ? 'not-allowed'
                            : 'pointer',
                          'font-weight': '600',
                          'font-size': '0.9rem',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <span>📦</span>
                        <span>Agregar Bulto #{bulkCounter()}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCurrentSelection}
                        style={{
                          padding: '0.75rem 1rem',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          border: '1px solid var(--border-color)',
                          'border-radius': '8px',
                          cursor: 'pointer',
                          'font-weight': '500'
                        }}
                        title="Limpiar selección"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          

            {/* ============================================ */}
            {/* YABA BULKS LIST */}
            {/* ============================================ */}
            <Show when={yabaBulks().length > 0}>
              <div style={{
                'margin-top': '1.5rem',
                'padding-top': '1.5rem',
                'border-top': '2px solid var(--primary-color)'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  📦 Bultos Creados ({yabaBulks().length})
                </h4>

                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                  <For each={yabaBulks()}>
                    {(bulk) => (
                      <div style={{
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        'border-radius': '8px',
                        padding: '1rem',
                        'box-shadow': '0 1px 3px rgba(0,0,0,0.05)'
                      }}>
                        {/* Bulk Header */}
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'margin-bottom': '0.75rem'
                        }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
                            <span style={{ 'font-size': '1.25rem' }}>
                              {bulk.shippingMethod === 'aereo' ? '✈️' : '🚢'}
                            </span>
                            {/* Editable Bulk Name */}
                            <Show when={editingBulkId() === bulk.id} fallback={
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                                <span style={{ 'font-weight': '700', 'font-size': '1rem' }}>
                                  {bulk.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditBulkName(bulk.id, bulk.name)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.1rem',
                                    'font-size': '0.75rem',
                                    color: 'var(--text-secondary)'
                                  }}
                                  title="Editar nombre"
                                >
                                  ✏️
                                </button>
                              </div>
                            }>
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
                                <input
                                  type="text"
                                  value={editingBulkName()}
                                  onInput={(e) => setEditingBulkName(e.currentTarget.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleSaveBulkName()}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid var(--primary-color)',
                                    'border-radius': '4px',
                                    'font-size': '0.9rem',
                                    'font-weight': '600',
                                    width: '150px'
                                  }}
                                  autofocus
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveBulkName}
                                  style={{
                                    background: '#10b981',
                                    border: 'none',
                                    'border-radius': '4px',
                                    padding: '0.25rem 0.5rem',
                                    cursor: 'pointer',
                                    color: 'white',
                                    'font-size': '0.7rem'
                                  }}
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditBulkName}
                                  style={{
                                    background: '#f3f4f6',
                                    border: '1px solid var(--border-color)',
                                    'border-radius': '4px',
                                    padding: '0.25rem 0.5rem',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    'font-size': '0.7rem'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </Show>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              background: bulk.shippingMethod === 'aereo' ? '#dbeafe' : '#e0f2fe',
                              color: bulk.shippingMethod === 'aereo' ? '#1d4ed8' : '#0369a1',
                              'border-radius': '4px',
                              'font-size': '0.7rem',
                              'font-weight': '600'
                            }}>
                              {bulk.shippingMethod === 'aereo' ? 'AÉREO' : 'MARÍTIMO'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveYabaBulk(bulk.id)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              'border-radius': '4px',
                              padding: '0.25rem 0.5rem',
                              cursor: 'pointer',
                              color: '#dc2626',
                              'font-size': '0.8rem'
                            }}
                          >
                            ✕ Eliminar
                          </button>
                        </div>

                        {/* Bulk Details Grid */}
                        <div style={{
                          display: 'grid',
                          'grid-template-columns': 'repeat(auto-fit, minmax(90px, 1fr))',
                          gap: '0.5rem',
                          'font-size': '0.8rem'
                        }}>
                          <div style={{ padding: '0.5rem', background: '#f8fafc', 'border-radius': '4px' }}>
                            <div style={{ color: 'var(--text-secondary)', 'font-size': '0.7rem' }}>Artículos</div>
                            <div style={{ 'font-weight': '600' }}>{bulk.items.length} items</div>
                          </div>
                          <div style={{ padding: '0.5rem', background: '#f8fafc', 'border-radius': '4px' }}>
                            <div style={{ color: 'var(--text-secondary)', 'font-size': '0.7rem', "z-index": "999999999" }}>Peso <span style={{'font-weight': '700',color: '#2e7d32'}}>
                              (${bulk?.shippingDetails?.pricePerLb.toFixed(2)} x lbs)</span> </div>
                            <div style={{ 'font-weight': '600' }}>{bulk.weight.toFixed(1)} lbs</div>
                          </div>
                          
                          <div style={{ padding: '0.5rem', background: '#f8fafc', 'border-radius': '4px' }}>
                            <div style={{ color: 'var(--text-secondary)', 'font-size': '0.7rem' }}>Envío</div>
                            <div style={{ 'font-weight': '600' }}>${bulk.shippingCost.toFixed(2)}</div>
                          </div>
                          <div style={{ padding: '0.5rem', background: '#f8fafc', 'border-radius': '4px' }}>
                            <div style={{ color: 'var(--text-secondary)', 'font-size': '0.7rem' }}>Aranceles</div>
                            <div style={{ 'font-weight': '600' }}>${bulk.itemsTotal.toFixed(2)}</div>
                          </div>
                          <Show when={bulk.services && bulk.services.length > 0}>
                            <div style={{ padding: '0.5rem', background: '#f0fdf4', 'border-radius': '4px' }}>
                              <div style={{ color: '#16a34a', 'font-size': '0.7rem' }}>Servicios</div>
                              <div style={{ 'font-weight': '600', color: '#16a34a' }}>${bulk.servicesTotal.toFixed(2)}</div>
                            </div>
                          </Show>
                          <div style={{ padding: '0.5rem', background: '#e8f5e9', 'border-radius': '4px' }}>
                            <div style={{ color: '#2e7d32', 'font-size': '0.7rem' }}>Total</div>
                            <div style={{ 'font-weight': '700', color: '#2e7d32' }}>${bulk.total.toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Items Preview */}
                        <div style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
                          📦 {bulk.items.slice(0, 3).map(i => i.name).join(', ')}
                          {bulk.items.length > 3 && ` +${bulk.items.length - 3} más`}
                        </div>

                        {/* Services Preview */}
                        <Show when={bulk.services && bulk.services.length > 0}>
                          <div style={{ 'margin-top': '0.25rem', 'font-size': '0.75rem', color: '#16a34a' }}>
                            🛠️ {bulk.services.map(s => s.name).join(', ')}
                          </div>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>

                {/* YABA Grand Total */}
                <div style={{
                  'margin-top': '1rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  'border-radius': '8px',
                  color: 'white'
                }}>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(3, 1fr)',
                    gap: '1rem',
                    'text-align': 'center',
                    'margin-bottom': '0.75rem'
                  }}>
                    <div>
                      <div style={{ 'font-size': '0.75rem', opacity: '0.9' }}>Bultos</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>{yabaBulks().length}</div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '0.75rem', opacity: '0.9' }}>Peso Total</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>{yabaTotalWeight().toFixed(1)} lbs</div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '0.75rem', opacity: '0.9' }}>Total General</div>
                      <div style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>${yabaGrandTotal().toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* Note about payment - shown when bulks exist */}
            <Show when={yabaBulks().length > 0}>
              <div style={{
                'margin-top': '1rem',
                padding: '0.75rem',
                background: '#fef3c7',
                'border-radius': '6px',
                'font-size': '0.8rem',
                color: '#92400e',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                <span>💡</span>
                <span>El total de YABA (${yabaGrandTotal().toFixed(2)}) se agregará automáticamente a los servicios de la factura.</span>
              </div>
            </Show>

            {/* Contact Information 
            <div style={{
              'margin-top': '1.5rem',
              'padding-top': '1rem',
              'border-top': '1px solid var(--border-color)',
              display: 'flex',
              'justify-content': 'center',
              gap: '2rem',
              'flex-wrap': 'wrap',
              'font-size': '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              <For each={YABA_LOCATIONS}>
                {(location) => (
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{ 'font-weight': '500' }}>📍 {location.address}, {location.city} {location.zip}</div>
                    <div>📞 {location.phone}</div>
                  </div>
                )}
              </For>
            </div>
          */}
          </div>
        </Show>
      </div>

      {/* Invoice Totals */}
      <div style={totalsStyle}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
          <Icon name="accounts" size="1em" style={{ "margin-right": "0.5rem" }} />
          Resumen de la Factura
        </h3>

        <div style={totalRowStyle}>
          <span> 📦 Total de Productos:</span>
          <span>${invoiceTotals().productsTotal.toFixed(2)}</span>
        </div>

        <div style={totalRowStyle}>
          <span>📋 Total de Reservas:</span>
          <span>${invoiceTotals().reservasTotal.toFixed(2)}</span>
        </div>

        <div style={totalRowStyle}>
          <span>🔧 Total de Servicios:</span>
          <span>${invoiceTotals().servicesTotal.toFixed(2)}</span>
        </div>

        <div style={totalRowStyle}>
          <span>🚚 Costo de Transporte:</span>
          <span>${invoiceTotals().transportTotal.toFixed(2)}</span>
        </div>

        {/* YABA Grand Total Breakdown - Show when there are YABA bulks */}
        <Show when={yabaBulks().length > 0}>
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            'border-radius': '8px',
            'margin': '0.75rem 0',
            overflow: 'hidden',
            border: '1px solid #bfdbfe'
          }}>
            {/* YABA Header */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              padding: '0.6rem 0.75rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white'
            }}>
              <span style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span style={{ 'font-size': '1.1rem' }}>🌴</span>
                <span style={{ 'font-weight': '600' }}>YABA Global Express</span>
                <span style={{
                  'font-size': '0.65rem',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '0.1rem 0.4rem',
                  'border-radius': '4px'
                }}>
                  {yabaBulks().length} bulto{yabaBulks().length > 1 ? 's' : ''} • {yabaTotalWeight().toFixed(1)} lbs
                </span>
              </span>
            </div>

            {/* YABA Breakdown */}
            <div style={{ padding: '0.5rem 0.75rem' }}>
              {/* Tarifa (Items) */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '0.35rem 0',
                'font-size': '0.85rem',
                color: '#374151'
              }}>
                <span style={{ display: 'flex', 'align-items': 'center', gap: '0.4rem' }}>
                  <span>📦</span>
                  <span>Tarifa Artículos:</span>
                  <span style={{ 'font-size': '0.7rem', color: '#6b7280' }}>({yabaTotalItems()} items)</span>
                </span>
                <span style={{ 'font-weight': '600' }}>${yabaItemsTotalSum().toFixed(2)}</span>
              </div>

              {/* Envío (Shipping) */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '0.35rem 0',
                'font-size': '0.85rem',
                color: '#374151'
              }}>
                <span style={{ display: 'flex', 'align-items': 'center', gap: '0.4rem' }}>
                  <span>✈️</span>
                  <span>Costo de Envío:</span>
                </span>
                <span style={{ 'font-weight': '600' }}>${yabaShippingTotalSum().toFixed(2)}</span>
              </div>

              {/* Servicios */}
              <Show when={yabaServicesTotalSum() > 0}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  padding: '0.35rem 0',
                  'font-size': '0.85rem',
                  color: '#374151'
                }}>
                  <span style={{ display: 'flex', 'align-items': 'center', gap: '0.4rem' }}>
                    <span>🛠️</span>
                    <span>Servicios:</span>
                    <span style={{ 'font-size': '0.7rem', color: '#6b7280' }}>({yabaTotalServices()} servicios)</span>
                  </span>
                  <span style={{ 'font-weight': '600' }}>${yabaServicesTotalSum().toFixed(2)}</span>
                </div>
              </Show>

              {/* YABA Total */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '0.5rem 0 0.25rem 0',
                'margin-top': '0.35rem',
                'border-top': '1px dashed #93c5fd',
                'font-size': '0.95rem'
              }}>
                <span style={{ 'font-weight': '700', color: '#1d4ed8' }}>Total YABA:</span>
                <span style={{ 'font-weight': '700', color: '#1d4ed8', 'font-size': '1.1rem' }}>
                  ${yabaGrandTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Show>

        <div style={{...totalRowStyle, 'padding-top': '0.5rem', 'border-top': '1px solid var(--border-color)'}}>
          <span>Subtotal:</span>
          <span>${invoiceTotals().itemsTotal.toFixed(2)}</span>
        </div>

        <Show when={invoiceTotals().discount > 0}>
          <div style={{...totalRowStyle, color: '#28a745', 'font-weight': '500'}}>
            <span>🏷️ Descuento:</span>
            <span>-${invoiceTotals().discount.toFixed(2)}</span>
          </div>
        </Show>

        <div style={grandTotalStyle}>
          <span><Icon name="finance" size="1em" style={{ "margin-right": "0.3rem" }} />Total General:</span>
          <span>${invoiceTotals().grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Section */}
      <PaymentSection
        paymentMethods={formData().paymentMethods}
        onPaymentMethodsChange={handlePaymentMethodsChange}
        invoiceTotal={invoiceTotals().grandTotal}
      />

      {/* Validation Summary - Show when there are errors */}
      <Show when={validationErrors().length > 0}>
        <div style={validationSummaryStyle}>
          <div style={validationHeaderStyle}>
            <Icon name="warning" size="1.2em" />
            <span>Campos Requeridos Faltantes ({validationErrors().length})</span>
          </div>

          <For each={Object.entries(errorsBySection())}>
            {([section, errors]) => (
              <div style={{ 'margin-bottom': '0.75rem' }}>
                <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem', color: '#856404' }}>
                  {section}:
                </div>
                <ul style={validationListStyle}>
                  <For each={errors}>
                    {(error) => (
                      <li style={validationItemStyle}>
                        <span style={{ color: '#dc3545' }}>✗</span> {error.label}
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Form Actions */}
      <div style={actionsStyle}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={handleClearForm}
          disabled={loading()}
        >
          <Icon name="delete" size="1em" style={{ "margin-right": "0.5rem" }} />
          Limpiar Form
        </button>

        <Show when={invoiceStyledFormStore.isEditMode}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => {
              invoiceStyledFormStore.exitEditMode();
              window.history.back();
            }}
            disabled={loading()}
          >
            <Icon name="close" size="1em" style={{ "margin-right": "0.5rem" }} />
            Cancelar Edición
          </button>
        </Show>
        
        <Show when={invoiceStyledFormStore.isValid()} >
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={handleSubmit}
          disabled={loading() || !invoiceStyledFormStore.isValid()}
        >
          {loading() ? 
            (<><Icon name="loading" size="1em" style={{ "margin-right": "0.5rem" }} />Procesando...</>) : 
            invoiceStyledFormStore.isEditMode ?
            (<><Icon name="check" size="1em" style={{ "margin-right": "0.5rem" }} />Actualizar Factura</>) :
            (<><Icon name="check" size="1em" style={{ "margin-right": "0.5rem" }} />Crear Factura</>)
          }
        </button>
        </Show>
      </div>

      {/* Debug Info (Development only) */}
      {import.meta.env.DEV && (
        <details style={{ 'margin-top': '2rem', 'font-size': '0.875rem' }}>
          <summary><Icon name="search" size="0.9em" style={{ "margin-right": "0.3rem" }} />Debug Info (Development Only)</summary>
          <pre style={{
            background: '#f5f5f5',
            padding: '1rem',
            'border-radius': '4px',
            overflow: 'auto',
            'max-height': '300px'
          }}>
            {JSON.stringify({
              formValid: invoiceStyledFormStore.isValid(),
              hasData: invoiceStyledFormStore.hasData(),
              isDirty: invoiceStyledFormStore.isDirty,
              bulksCount: formData().bulks.length,
              itemsCount: {
                products: formData().products.length,
                reservas: formData().reservas.length,
                services: formData().services.length
              },
              totals: invoiceTotals()
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
    </>
  );
};

export default InvoiceAddFormStyledModular;





// Peso X {"id":"btv99lUVWQabBFOI","number":1,"name":"SS0205","items":[{"id":"vgmm9S1SX1FvUtG4","name":"Ventilador","qty":1,"unitPrice":3,"total":3},{"id":"460D2bGLJC1HjbSU","name":"Ventilador","qty":1,"unitPrice":3,"total":3},{"id":"Fw9ZAu7eCKn4KV0K","name":"Freidora","qty":1,"unitPrice":4,"total":4},{"id":"3Vcp9UQl0WKdDXku","name":"Comida","qty":1,"unitPrice":0,"total":0},{"id":"83fF7apG03tP8o7L","name":"Medicina","qty":1,"unitPrice":0,"total":0},{"id":"zYEgMAqMo0bSGcnf","name":"Ropa","qty":1,"unitPrice":0,"total":0}],"itemsTotal":10,"weight":64,"shippingMethod":"aereo","shippingCost":191.36,"shippingDetails":{"pricePerLb":2.99,"billableWeight":64,"freeLbs":0,"promotionApplied":false},"services":[{"id":"GPOGvQG5Sj1yMpUd","name":"Transporte","price":10}],"servicesTotal":10,"total":211.36,"createdAt":1768872822272}
// 352598699