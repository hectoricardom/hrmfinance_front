import { Component, createSignal, createEffect, createMemo, Show, onMount, For } from 'solid-js';
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
import { calculateAirShippingCost, calculateMaritimeShippingCost, YABA_LOCATIONS } from '../config/yabaGlobalTariffs';

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

  // YABA Tariff state
  const [showTariffPanel, setShowTariffPanel] = createSignal(true);
  const [maritimeDeparture, setMaritimeDeparture] = createSignal<'weekly' | 'monthly'>('weekly');
  const [maritimeItemType, setMaritimeItemType] = createSignal<'miscellaneous' | 'durable'>('miscellaneous');
  const [currentBulkWeight, setCurrentBulkWeight] = createSignal(0);
  const [currentShippingMethod, setCurrentShippingMethod] = createSignal<'aereo' | 'maritimo' | ''>('');
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
  const [selectedTariffItems, setSelectedTariffItems] = createSignal<Array<{
    id: string;
    name: string;
    qty: number;
    price: number;
    total: number;
  }>>([]);
  const [bulkCounter, setBulkCounter] = createSignal(1);

  // Calculate tariff items total
  const tariffItemsTotal = () => selectedTariffItems().reduce((sum, item) => sum + item.total, 0);

  // Calculate current bulk total (items + shipping)
  const currentBulkTotal = () => tariffItemsTotal() + (shippingBreakdown()?.total || 0);

  // Get reactive form data
  const formData = invoiceStyledFormStore.formData;

  // Load YABA offers on mount
  onMount(async () => {
    try {
      
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
        const result = await invoiceStyledFormStore.saveEditedInvoice();
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
    if (invoiceStyledFormStore.hasData()) {
      const confirmed = confirm('¿Está seguro que desea limpiar el formulario? Se perderán todos los datos no guardados.');
      if (confirmed) {
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

  // YABA Tariff handlers
  const handleTariffItemSelect = (item: TariffItem) => {
    if (item.price === null) {
      // Item requires custom quote
      devLog('Item requires custom quote:', item.nameEs);
      return;
    }

    const itemId = generateRandomId();
    const price = item.price ?? 0;

    // Add as a reserva with tariff pricing
    const newReserva: InvoiceReserva = {
      id: itemId,
      type: item.nameEs,
      qty: 1,
      weight: 0,
      category: 'tariff',
      price: price,
      arancel: 0,
      total: price,
      autoCalculate: false // Don't auto-calculate tariff items
    };
    invoiceStyledFormStore.addReserva(newReserva);

    // Add to selected tariff items for display
    setSelectedTariffItems(prev => [...prev, {
      id: itemId,
      name: item.nameEs,
      qty: 1,
      price: price,
      total: price
    }]);
  };

  const handleTariffQuickAdd = (items: Array<{ item: TariffItem; qty: number }>) => {
    items.forEach(({ item, qty }) => {
      if (qty > 0) {
        const itemId = generateRandomId();
        const price = item.price ?? 0;
        const total = price * qty;

        const newReserva: InvoiceReserva = {
          id: itemId,
          type: item.nameEs,
          qty: qty,
          weight: 0,
          category: 'tariff',
          price: total,
          arancel: 0,
          total: total,
          autoCalculate: false
        };
        invoiceStyledFormStore.addReserva(newReserva);

        // Add to selected tariff items for display
        setSelectedTariffItems(prev => [...prev, {
          id: itemId,
          name: item.nameEs,
          qty: qty,
          price: price,
          total: total
        }]);
      }
    });
  };

  // Remove tariff item
  const handleRemoveTariffItem = (itemId: string) => {
    // Remove from selectedTariffItems
    setSelectedTariffItems(prev => prev.filter(item => item.id !== itemId));

    // Remove from reservas
    const reservaIndex = formData().reservas.findIndex(r => r.id === itemId);
    if (reservaIndex !== -1) {
      invoiceStyledFormStore.removeReserva(reservaIndex);
    }
  };

  // Create bulk with current tariff items and shipping
  const handleCreateBulk = () => {
    const items = selectedTariffItems();
    const shipping = shippingBreakdown();
    const weight = currentBulkWeight();
    const method = currentShippingMethod();

    if (items.length === 0 && !shipping) {
      devLog('No items or shipping to add to bulk');
      return;
    }

    const bulkId = generateRandomId();
    const bulkNumber = bulkCounter();
    const bulkName = `Bulto #${bulkNumber}`;

    // Create the bulk
    const newBulk: InvoiceBulk = {
      id: bulkId,
      name: bulkName,
      type: 'PERSONAL',
      maxWeight: 100,
      currentWeight: weight,
      transportCost: shipping?.total || 0,
      shippingMethod: method === 'aereo' ? 'AEREO' : 'SEA',
      status: 'READY',
      pricingMode: 'weight'
    };
    invoiceStyledFormStore.addBulk(newBulk);

    // Update all current tariff reservas to belong to this bulk
    const currentReservas = formData().reservas;
    items.forEach(item => {
      const reservaIndex = currentReservas.findIndex(r => r.id === item.id);
      if (reservaIndex !== -1) {
        invoiceStyledFormStore.updateReserva(reservaIndex, { bulkId: bulkId });
      }
    });

    // Clear current selection for next bulk
    setSelectedTariffItems([]);
    setShippingBreakdown(null);
    setCurrentBulkWeight(0);
    setBulkCounter(prev => prev + 1);

    devLog(`Created bulk: ${bulkName} with ${items.length} items and $${shipping?.total || 0} shipping`);
  };

  // Clear current selection without creating bulk
  const handleClearCurrentSelection = () => {
    // Remove all selected tariff items from reservas
    const items = selectedTariffItems();
    items.forEach(item => {
      const reservaIndex = formData().reservas.findIndex(r => r.id === item.id);
      if (reservaIndex !== -1) {
        invoiceStyledFormStore.removeReserva(reservaIndex);
      }
    });

    // Clear state
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

      {/* Bulk Management */}
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
                  🏷️ Seleccionar Artículos por Tarifa
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
                          Costo de Envío:
                        </div>
                        <div style={{ 'font-size': '0.85rem' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span>Peso facturable:</span>
                            <span>{shippingBreakdown()!.billableWeight} lbs</span>
                          </div>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span>Tarifa:</span>
                            <span>${shippingBreakdown()!.pricePerLb.toFixed(2)}/lb</span>
                          </div>
                          <Show when={shippingBreakdown()!.promotionApplied}>
                            <div style={{ color: '#f57c00', 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                              🎉 ¡Promoción! {shippingBreakdown()!.freeLbs} lbs GRATIS
                            </div>
                          </Show>
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

                    {/* Grand Total */}
                    <div style={{
                      'margin-top': '0.75rem',
                      'padding-top': '0.75rem',
                      'border-top': '2px solid var(--primary-color)',
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center'
                    }}>
                      <span style={{ 'font-weight': '700', 'font-size': '1rem' }}>💰 TOTAL YABA:</span>
                      <span style={{ 'font-weight': '700', 'font-size': '1.25rem', color: 'var(--primary-color)' }}>
                        ${(tariffItemsTotal() + (shippingBreakdown()?.total || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Show>
              </div>
            </div>

            {/* Contact Information */}
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