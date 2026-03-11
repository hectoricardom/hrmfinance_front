import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { InvoiceBulk, InvoiceProduct, InvoiceReserva, InvoiceService } from '../types/invoiceTypes';
import { BASE_TRANSPORT_COST, validateBulkCompatibility, validateExclusiveBulkItem, categorizeReservaType, calculateDynamicPrice, calculateArancel } from '../hooks/usePricingLogic';
import { delay, devLog, generateRandomId, generateShortCode } from '../../../services/utils';
import BulkReservasSection from './bulk-sections/BulkReservasSection';
import BulkProductsSection from './bulk-sections/BulkProductsSection';
import BulkServicesSection from './bulk-sections/BulkServicesSection';
import { FormInput } from '../../ui';
import Icon from '../../../components/Icon';
import { shippingOffersService, type ShippingMethod, type ItemCategory, type PriceValidationResult } from '../../../services/shippingOffersService';
import { isAirShipping, getShippingMethodDisplayName, isValidShippingMethod, isMaritimeShipping } from '../../../services/shippingMethodService';
import { invoiceStyledFormStore } from '../stores/invoiceStyledFormStore';
import { inventoryApi } from '../../../services/apiAdapter';
import type { HBL } from '../../hbl/types';

interface BulkManagerProps {
  bulks: InvoiceBulk[];
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  services: InvoiceService[];
  shippingMethod: 'AEREO' | 'SEA' | 'EXPRESS';
  onAddBulk: (bulk: InvoiceBulk) => void;
  onUpdateBulk: (index: number, updates: Partial<InvoiceBulk>) => void;
  onRemoveBulk: (index: number) => void;
  onAddReserva: (reserva: InvoiceReserva) => void;
  onUpdateReserva: (index: number, updates: Partial<InvoiceReserva>) => void;
  onRemoveReserva: (index: number) => void;
  onAddProduct: (product: InvoiceProduct) => void;
  onUpdateProduct: (index: number, updates: Partial<InvoiceProduct>) => void;
  onRemoveProduct: (index: number) => void;
  onAddService: (service: InvoiceService) => void;
  onUpdateService: (index: number, updates: Partial<InvoiceService>) => void;
  onRemoveService: (index: number) => void;
}

const BulkManager: Component<BulkManagerProps> = (props) => {
  const [collapsedBulks, setCollapsedBulks] = createSignal<Set<string>>(new Set());
  const [reservaRecomendation, setReservaRecomendation] = createSignal({});
  const [showPricing, setShowPricing] = createSignal(false);
  const [autoCalculation, setAutoCalculation] = createSignal(true);
  const [validationResults, setValidationResults] = createSignal<Map<string, PriceValidationResult>>(new Map());

  // HBL Lookup state
  const [hblRecommendations, setHblRecommendations] = createSignal<HBL[]>([]);
  const [loadingHBL, setLoadingHBL] = createSignal(false);
  const [showHBLRecommendations, setShowHBLRecommendations] = createSignal(false);
  const [selectedHBLs, setSelectedHBLs] = createSignal<Set<string>>(new Set());

  // Helper to map shipping method
  const mapShippingMethod = (method: 'AEREO' | 'SEA' |  'EXPRESS' | ''): ShippingMethod | null => {
    if (method === 'AEREO') return 'air';
    if (method === 'SEA') return 'maritime';
    if (method === 'EXPRESS') return 'express';
    return null;
  };

  // Helper to map category
  const mapCategory = (category: string): ItemCategory | null => {
    if (category === 'MISCELANEAS') return 'miscellaneous';
    if (category === 'DURADEROS') return 'durable';
    return null;
  };

  // Fetch HBL recommendations based on guide number
  const fetchHBLRecommendations = async () => {
    const formData = invoiceStyledFormStore.getFormData();
    const guide = formData?.guide?.trim();
    const shippingMethod = formData?.shippingMethod;
    const cid = formData?.shipper_consignee?.cid;

    // Validate shipping method using the service
    if (!isValidShippingMethod(shippingMethod)) {
      alert('Por favor, seleccione un método de envío válido');
      return;
    }

    // Check if air shipping using the service (handles all variations)
    if (!isAirShipping(shippingMethod)) {
      alert(
        `⚠️ El método de envío debe ser Aéreo para buscar HBL.\n\n` +
        `Método actual: ${getShippingMethodDisplayName(shippingMethod) || 'No seleccionado'}\n\n` +
        `Por favor, cambie el método de envío a Aéreo.`
      );
      return;
    }

    if (!cid || !guide) {
      alert('Por favor, ingrese el número de guía y el CID del cliente');
      return;
    }

    setLoadingHBL(true);
    try {
      const result = await inventoryApi.sugestHBLS(`${cid} ${guide}`, {
        guia: guide
      });

      if (result?.error) {
        alert(`Error al buscar HBL: ${result.error}`);
        setHblRecommendations([]);
      } else {
        const hblList = Object.values(result || {}) as HBL[];

        // Filter by shipping method if possible
        // Air guides typically start with specific patterns
        const filteredHbls = hblList.filter((hbl: HBL) => {
          // Match by guide number
          const matchesGuide = hbl.idairguide === guide || hbl.guia === guide;

          // Additional filtering logic can be added here
          return matchesGuide;
        });

        setHblRecommendations(filteredHbls);
        setShowHBLRecommendations(true);

        if (filteredHbls.length === 0) {
          alert(`No se encontraron reservas HBL para la guía: ${guide}`);
        }
      }
    } catch (error) {
      console.error('Error fetching HBL:', error);
      alert('Error al buscar reservas HBL');
      setHblRecommendations([]);
    } finally {
      setLoadingHBL(false);
    }
  };

  // Toggle HBL selection
  const toggleHBLSelection = (hblId: string) => {
    setSelectedHBLs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hblId)) {
        newSet.delete(hblId);
      } else {
        newSet.add(hblId);
      }
      return newSet;
    });
  };

  // Select all HBLs with same bagnumber
  const selectHBLsByBag = (bagnumber: string) => {
    const hblsWithSameBag = hblRecommendations().filter(h => h.bagnumber === bagnumber);
    const newSelected = new Set(selectedHBLs());

    hblsWithSameBag.forEach(hbl => {
      newSelected.add(hbl.referenceHId || hbl.hbl);
    });

    setSelectedHBLs(newSelected);
  };

  // Clear selection
  const clearHBLSelection = () => {
    setSelectedHBLs(new Set());
  };

  // Apply multiple HBLs at once
  const applyMultipleHBLs = async () => {
    const selected = selectedHBLs();
    if (selected.size === 0) {
      alert('Por favor, seleccione al menos un HBL');
      return;
    }

    const selectedHBLRecords = hblRecommendations().filter(
      h => selected.has(h.referenceHId || h.hbl)
    );

    // Group by bagnumber
    const byBag = selectedHBLRecords.reduce((acc, hbl) => {
      const bag = hbl.bagnumber?.trim() || 'Sin Bulto';
      if (!acc[bag]) acc[bag] = [];
      acc[bag].push(hbl);
      return acc;
    }, {} as Record<string, HBL[]>);

    const totalWeight = selectedHBLRecords.reduce((sum, hbl) => sum + (parseFloat(hbl.weight) || 0), 0);
    const bagCount = Object.keys(byBag).length;

    const confirmed = confirm(
      `¿Aplicar ${selected.size} HBL(s) seleccionados?\n\n` +
      `Total de bultos: ${bagCount}\n` +
      `Peso total: ${totalWeight.toFixed(2)} lbs\n\n` +
      Object.entries(byBag).map(([bag, hbls]) =>
        `📦 ${bag}: ${hbls.length} HBL(s), ${hbls.reduce((s, h) => s + (parseFloat(h.weight) || 0), 0).toFixed(2)} lbs`
      ).join('\n')
    );

    if (!confirmed) return;

    // Apply each HBL


    let successCount = 0;

      
    const promises =selectedHBLRecords.map(async (hbl, ind2) => {
        try {
          await applyHBLToReservas(hbl, true); // true = silent mode
          successCount++;
        } catch (error) {
          console.error(`Error applying HBL ${hbl.hbl}:`, error);
        }
    })

    await Promise.all(promises);

    // await delay(500)
    // handleRecomendationReserva();
    
    clearHBLSelection();
    alert(
      `✅ ${successCount} de ${selected.size} HBL(s) aplicados exitosamente\n\n` +
      `Bultos creados/actualizados: ${bagCount}\n` +
      `Peso total: ${totalWeight.toFixed(2)} lbs`
    );
  };

  // Apply HBL data to create reservas
  const applyHBLToReservas = async (hbl: HBL, silent = false) => {
    const bagnumber = hbl.bagnumber?.trim();

    if (!silent) {
      const confirmed = confirm(
        `¿Aplicar datos del HBL?\n\n` +
        `Cliente: ${hbl.consigneeName}\n` +
        `Peso: ${hbl.weight} lbs\n` +
        `Descripción: ${hbl.namegood}\n` +
        `Bulto: ${bagnumber}\n\n` +
        `Esto creará una nueva reserva con estos datos.`
      );

      if (!confirmed) return;
    }

    let bulkId: string = generateRandomId();;
    let bulkCreated = false;

    // Check if a bulk with matching bagnumber exists
    const matchingBulk = props.bulks.find(b => b.name === bagnumber);

   
    
    if (matchingBulk) {
      // Use existing bulk
      bulkId = matchingBulk.id;
      devLog(`Using existing bulk: ${bagnumber} (${bulkId})`);
    } else {
      // Create new bulk with bagnumber as name
      const newBulk: InvoiceBulk = {
        id: bulkId,
        name: bagnumber || `Bulto ${props.bulks?.length + 1}`,
        type: 'PERSONAL',
        maxWeight: 50,
        currentWeight: 0,
        transportCost: 10,
        shippingMethod: (props.shippingMethod as 'AEREO' | 'SEA') || 'AEREO',
        status: 'DRAFT',
        token: generateRandomId(),
      };

      // Add bulk immediately to prevent race conditions
      props.onAddBulk(newBulk);
      bulkCreated = true;
      devLog(`Created new bulk: ${bagnumber} (${bulkId})`);
    }

    let wLb: number = parseFloat((parseFloat(hbl.weight ) * 2.2).toFixed(2))
    // Create reserva
    const newReserva: InvoiceReserva = {
      id: generateRandomId(),
      type: hbl.namegood || 'HBL Item',
      qty: wLb || 0,
      weight: wLb || 0,
      category: 'MISCELANEAS',
      price: 0,
      arancel: 0,
      total: 0,
      bulkId,
      autoCalculate: false // Enable auto-calculation
    };

    props.onAddReserva(newReserva);

    if (!silent) {
      const message = bulkCreated
        ? `✅ Reserva creada desde HBL: ${hbl.hbl}\n📦 Nuevo bulto creado: ${bagnumber}`
        : `✅ Reserva creada desde HBL: ${hbl.hbl}\n📦 Agregada al bulto existente: ${bagnumber}`;

      alert(message);
    }
    await delay(560);
    handleRecomendationReserva();
    let indexBulk:number = 0;
    props.bulks.find((b,iV) => {
      if(b.name === bagnumber){
        indexBulk = iV ;
      }
    });
    if(!isNaN(indexBulk)){
      invoiceStyledFormStore.updateBulk(indexBulk, { token: generateRandomId()});
    }
    
   
    return  
  };

  // Toggle bulk collapse
  const toggleBulkCollapse = (bulkId: string) => {
    setCollapsedBulks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bulkId)) {
        newSet.delete(bulkId);
      } else {
        newSet.add(bulkId);
      }
      return newSet;
    });
  };

  // Trigger bulk update when items change
  const triggerBulkUpdate = (bulkId: string) => {
    const bulkIndex = props.bulks?.findIndex(b => b?.id === bulkId);
    if (bulkIndex !== -1) {
      props.onUpdateBulk(bulkIndex, { token: generateRandomId() });
    }
  };

  // Create new bulk
  const handleCreateBulk = () => {

    const newBulk: InvoiceBulk = {
      id: generateRandomId(),
      name:  props?.shippingMethod == "express"? ` ${generateShortCode(8)}`:  `Bulto ${props.bulks?.length + 1}`,
      type: 'PERSONAL',
      maxWeight: 50,
      currentWeight: 0,
      transportCost: 10,
      shippingMethod: (props.shippingMethod as 'AEREO' | 'SEA') || 'AEREO',
      status: 'DRAFT',
      token: generateRandomId(),
    };
    props.onAddBulk(newBulk);
  };

  // Add reserva to specific bulk
  const handleAddReservaToBulk = (bulkId: string) => {
    const validation = validateBulkCompatibility(bulkId, props.products, props.reservas, props.services);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const newReserva: InvoiceReserva = {
      id: generateRandomId(),
      type: '',
      qty: 1,
      weight: 0,
      category: 'MISCELANEAS',
      price: 0,
      arancel: 0,
      total: 0,
      bulkId,
      autoCalculate: false // Default to auto-calculation enabled
    };
    props.onAddReserva(newReserva);
    triggerBulkUpdate(bulkId);
  };

  // Add product to specific bulk
  const handleAddProductToBulk = (bulkId: string) => {
    const validation = validateBulkCompatibility(bulkId, props.products, props.reservas, props.services);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const newProduct: InvoiceProduct = {
      id: generateRandomId(),
      product: {
        id: '',
        code: '',
        label: '',
        price: 0
      },
      qty: 1,
      salePrice: 0,
      total: 0,
      bulkId
    };
    props.onAddProduct(newProduct);
    triggerBulkUpdate(bulkId);
  };

  // Add service to specific bulk
  const handleAddServiceToBulk = (bulkId: string) => {
    const validation = validateBulkCompatibility(bulkId, props.products, props.reservas, props.services);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const newService: InvoiceService = {
      id: generateRandomId(),
      type: '',
      qty: 1,
      price: 0,
      arancel: 0,
      total: 0,
      bulkId
    };
    props.onAddService(newService);
    triggerBulkUpdate(bulkId);
  };



  // Update reserva with automatic pricing
  const handleRecomendationReserva = () => {
   
    /** 
    const reserva = props.reservas[index];
    if (!reserva) return;

     const bulkId = updates.bulkId || reserva.bulkId || '';
    const newType = updates.type || reserva.type;
    const newQty = updates.qty ?? reserva.qty;
    const newCategory = updates.category || reserva.category;

    reservas[index] =  {...reserva, ...{ type: newType, qty: newQty, bulkId : bulkId, category: newCategory} }
    */


    var reservas = props.reservas;

    let categorieskms:any = {
      "MISCELANEAS": "miscellaneous",
      "DURADEROS": 'durable',
      "LITHIUM_BATTERIES": "", 
      "OFFERS_FREE":"miscellaneous"
    }

   

    Object.keys(categorieskms).map(tr=>{

      let catH = tr ==="MISCELANEAS" || tr ==="OFFERS_FREE" ? "MISCELANEAS" : tr ;



      // Calcular peso total de misceláneas en el bulto
      let totalWeightByCat = 0;

      if(tr ==="MISCELANEAS" || tr ==="OFFERS_FREE"){
        totalWeightByCat = reservas
        .filter(r => r.category === "MISCELANEAS" || r.category ==="OFFERS_FREE")
        .reduce((sum, r) => sum + (r.qty || 0), 0);
      }else{
        totalWeightByCat = reservas
          .filter(r => r.category === catH)
          .reduce((sum, r) => sum + (r.qty || 0), 0);
      }

      let offergift = reservas
            .filter(r => r.category === "OFFERS_FREE")
            .reduce((sum, r) => sum + (r.qty || 0), 0);
        

      let prb = {
        method: invoiceStyledFormStore?.getFormData()?.shippingMethod === 'aereo'? 'air' : 'maritime',
        weight: totalWeightByCat, category: categorieskms[catH]
      }



      if( categorieskms[catH]){

        let ff: any =  shippingOffersService.calculateSuggestedPrice(prb);
        if(ff?.breakdown){
           ff.breakdown.offergift = offergift;
        }

        if(tr ==="OFFERS_FREE"){
         
          if(ff?.breakdown){
             ff.breakdown.pricePerLb = 0;
             ff.breakdown.range =  `( ${offergift} / ${ff.breakdown.freeWeight} libras gratis )`;
          }
        }
    
        
        let aa:any = {...reservaRecomendation()} ;
        aa[tr] = ff
        setReservaRecomendation( aa )

        return ff
      }
    })
  
  };

  // Update reserva with automatic pricing
  const handleUpdateReserva = (index: number, updates: Partial<InvoiceReserva>) => {
    var reservas = props.reservas;
    const reserva = props.reservas[index];
    if (!reserva) return;

   
    let finalUpdates = { ...updates };

    // Check if auto-calculation is enabled globally AND for this specific reserva
    const isAutoCalcEnabled = autoCalculation() && (updates.autoCalculate !== false) && (reserva.autoCalculate !== false);
   
    /**
    method: ShippingMethod;
    category: ItemCategory;
    weight: number;

    */

    const newCategory = updates.category || reserva.category;
    if(newCategory === "OFFERS_FREE"){
      finalUpdates.price = 0;
      props.onUpdateReserva(index, finalUpdates);
    }

    const bulk = props.bulks.find(b => b?.id === reserva.bulkId);

   
    if(bulk?.pricingMode === 'box_flat_rate' && bulk?.boxSize){
     
      finalUpdates.price = 0;
      props.onUpdateReserva(index, finalUpdates);
    }
    


     devLog(isAutoCalcEnabled , (updates.type || updates.category || updates.qty !== undefined ))
    

    // Auto-calculate pricing if enabled and type, quantity, or weight changed
    if (isAutoCalcEnabled && (updates.type || updates.category || updates.qty !== undefined )) {
      // First update the current reserva
      const newType = updates.type || reserva.type;
      const newQty = updates.qty ?? reserva.qty;
      const bulkId = updates.bulkId || reserva.bulkId || '';
     
      devLog(newType || reserva.type, bulkId)
      devLog(newQty, bulkId)
      // Always recalculate when there's a type and auto-calculation is on
      if (newType || reserva.type ) {
        const typeToUse = newType || reserva.type;
        
        // Validate exclusive bulk requirement

       

        if (bulkId && updates.type) { // Only validate on type change
          const exclusiveValidation = validateExclusiveBulkItem(typeToUse, bulkId, props.products, props.reservas, props.services);
          if (!exclusiveValidation.isValid) {
            alert(exclusiveValidation.error);
            return;
          }
        }


                // Calcular peso total de misceláneas en el bulto
     

      

        // Calculate dynamic pricing and arancel for current reserva
        const category = newCategory || categorizeReservaType(typeToUse);
        const dynamicPrice = calculateDynamicPrice(category, bulkId, reservas, newQty);
        const dynamicArancel = calculateArancel(category, newQty);

        finalUpdates = {
          ...finalUpdates,
          category,
          price: dynamicPrice,
          arancel: dynamicArancel,
          total: (dynamicPrice + dynamicArancel) * newQty
        };

        /** 
        devLog('Auto-calculation results:', {
          typeToUse,
          category,
          newQty,
          dynamicPrice,
          dynamicArancel,
          total: (dynamicPrice + dynamicArancel) * newQty
        });
        */


        // Validate price against shipping offers
        const shippingMethod = mapShippingMethod(props.shippingMethod);
        const offerCategory = mapCategory(category);


          devLog({shippingMethod, offerCategory ,newQty})
        if (shippingMethod && offerCategory && newQty > 0) {
          try {
            const validation = shippingOffersService.validatePrice({
              method: shippingMethod,
              category: offerCategory,
              weight: newQty,
              currentPrice: dynamicPrice,
              tolerancePercent: 5
            });


            devLog({validation})

            // Store validation result
            setValidationResults(prev => {
              const updated = new Map(prev);
              updated.set(reserva.id, validation);
              return updated;
            });

            devLog('Price validation:', validation);
          } catch (error) {
            console.warn('Price validation failed:', error);
          }
        }
      }

      // Now recalculate ALL reservas when quantity changes (including current one)
      if (updates.qty !== undefined || updates.category  !== undefined ) {
        devLog('Recalculating all reservas due to quantity/weight change...');
        
        // First, apply the quantity update to get the updated list
        const updatedReservas = props.reservas.map((r, i) => 
          i === index ? { ...r, qty: finalUpdates.qty || r.qty } : r
        );

        // Recalculate ALL reservas that have auto-calculation enabled
        props.reservas.forEach((r, i) => {
          // Check if this reserva has auto-calculation enabled
          const shouldAutoCalc = r.autoCalculate !== false;
          
          if (r.type && r.category &&  shouldAutoCalc) {
            const currentReserva = i === index ? { ...r, ...finalUpdates } : r;
            //const recalcCategory = categorizeReservaType(currentReserva.type);
            const recalcPrice = calculateDynamicPrice(currentReserva.category, currentReserva.bulkId || '', updatedReservas, currentReserva.qty);
            const recalcArancel = calculateArancel(currentReserva.category, i === index ? (finalUpdates.qty || currentReserva.qty) : currentReserva.qty);
            
            const updates = {
              category: currentReserva.category,
              price: recalcPrice,
              arancel: recalcArancel,
              total: (recalcPrice + recalcArancel) * currentReserva.qty
            };
            
            // For the current item, merge with any other updates
            if (i === index) {
              props.onUpdateReserva(i, { ...finalUpdates, ...updates });
            } else {
              props.onUpdateReserva(i, updates);
            }
          } else if (i === index) {
            // If auto-calc is disabled for current item, just update with the changes
            props.onUpdateReserva(i, finalUpdates);
          }
        });
      } else {
        // If not a quantity change, just update the current reserva
        props.onUpdateReserva(index, finalUpdates);
      }
    } else {
      // Manual calculation when auto-calculation is disabled
      if (updates.price !== undefined || updates.arancel !== undefined || updates.qty !== undefined) {
        const newPrice = updates.price ?? reserva.price;
        const newArancel = updates.arancel ?? reserva.arancel;
        const newQty = updates.qty ?? reserva.qty;
        
        finalUpdates = {
          ...finalUpdates,
          total: (newPrice + newArancel) * newQty
        };
      }
      
      // For all non-auto-calculation updates
      props.onUpdateReserva(index, finalUpdates);
    }
  };

  // Get items in a specific bulk
  const getBulkItems = (bulkId: string) => {
    return {
      reservas: props.reservas.filter(r => r.bulkId === bulkId),
      products: props.products.filter(p => p.bulkId === bulkId),
      services: props.services.filter(s => s.bulkId === bulkId)
    };
  };

  // Calculate bulk totals
  const getBulkTotals = (bulkId: string) => {
    const items = getBulkItems(bulkId);
    const bulk = props.bulks.find(b => b?.id === bulkId);
    
    const itemsTotal = [
      ...items.reservas.map(r => r.qty*r.price+r.arancel),
      ...items.products.map(p => p.qty*p.salePrice),
      ...items.services.map(s => s.qty*s.arancel)
    ].reduce((sum, total) => sum + total, 0);

    const transportCost = bulk?.transportCost || 0;
    const totalQty = [
      ...items.reservas.map(r => r.qty),
      ...items.products.map(p => p.qty),
      ...items.services.map(s => s.qty)
    ].reduce((sum, qty) => sum + qty, 0);

    return {
      itemsTotal,
      transportCost,
      grandTotal: itemsTotal + transportCost,
      totalItems: items.reservas.length + items.products.length + items.services.length,
      totalQty
    };
  };

  // Styles
  const containerStyle = {
    'margin-bottom': '2rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--primary-color)'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': 'bold',
    color: 'var(--text-primary)',
    margin: '0'
  };

  const createBulkButtonStyle = {
    background: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'font-weight': '500',
    transition: 'all 0.2s ease',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const togglePricingButtonStyle = {
    background: showPricing() ? 'var(--success-color)' : 'var(--border-color)',
    color: showPricing() ? 'white' : 'var(--text-muted)',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'margin-right': '0.5rem'
  };

  const bulkContainerStyle = {
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '1rem',
    background: 'var(--surface-color)'
  };

  const bulkHeaderStyle = (bulk: InvoiceBulk) => {
   
    const isCollapsed = collapsedBulks().has(bulk?.id);
    
    return {
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      padding: '1rem',
      'background-color': isCollapsed ? 'var(--strip-color)' : 'var(--surface-color)',
      'border-bottom': isCollapsed ? 'none' : '1px solid var(--border-color)',
      cursor: 'pointer'
    };
  };

  const bulkContentStyle = {
    padding: '1rem'
  };

  const addButtonsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1rem',
    'flex-wrap': 'wrap'
  };

  const addButtonStyle = {
    background: 'var(--strip-color)',
    color: 'var(--primary-color)',
    border: '1px solid var(--primary-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease'
  };

  const removeButtonStyle = {
    color:  'var(--error-color)',
    background: 'white',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    'font-size': '0.75rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    
  };

  const inputGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem'
  };


   const centerBx = {
    "align-items": "center",
   
    display:" flex"
  };



  onMount(()=>{
    setTimeout(() => {
      handleRecomendationReserva();
    }, 650);
  })
 

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={titleStyle}><Icon name="operations" size="1.2em" style={{ "margin-right": "0.5rem" }} />Gestión de Bultos</h3>
        <div style={{display:  'flex', gap: '0.5rem'}}>
          <button
            type="button"
            style={{
              ...togglePricingButtonStyle,
              background: loadingHBL() ? '#9ca3af' : '#6366f1',
              color: 'white'
            }}
            onClick={fetchHBLRecommendations}
            disabled={loadingHBL()}
          >
            <Icon name={loadingHBL() ? 'loading' : 'search'} size="1em" style={{ "margin-right": "0.5rem" }} />
            {loadingHBL() ? 'Buscando...' : '🔍 Buscar HBL'}
          </button>

         

          <button
            type="button"
            style={createBulkButtonStyle}
            onClick={handleCreateBulk}
          >
            <Icon name="add" size="1em" style={{ "margin-right": "0.5rem" }} />
            <span>Crear Bulto</span>
          </button>
        </div>
      </div>

      {/* HBL Recommendations Panel */}
      <Show when={showHBLRecommendations() && hblRecommendations().length > 0}>
        <div style={{
          background: '#f0f9ff',
          border: '2px solid #3b82f6',
          'border-radius': 'var(--border-radius)',
          padding: '1.5rem',
          'margin-bottom': '1rem'
        }}>
           
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '1rem',
            'flex-wrap': 'wrap',
            gap: '0.5rem'
          }}>
            <h4 style={{
              margin: '0',
              color: '#1e40af',
              'font-size': '1.1rem',
              'font-weight': '600'
            }}>
              📦 Reservas HBL Encontradas ({hblRecommendations().length})
              <Show when={selectedHBLs().size > 0}>
                <span style={{
                  'margin-left': '0.5rem',
                  'font-size': '0.9rem',
                  color: '#10b981',
                  'font-weight': '700'
                }}>
                  ({selectedHBLs().size} seleccionados)
                </span>
              </Show>
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
              <Show when={selectedHBLs().size > 0}>
                <button
                  type="button"
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    'border-radius': 'var(--border-radius-sm)',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    'font-weight': '600',
                    'font-size': '0.875rem'
                  }}
                  onClick={applyMultipleHBLs}
                  title="Aplicar todos los HBL seleccionados"
                >
                  ✅ Aplicar Seleccionados ({selectedHBLs().size})
                </button>
                <button
                  type="button"
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    'border-radius': 'var(--border-radius-sm)',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    'font-weight': '600',
                    'font-size': '0.875rem'
                  }}
                  onClick={clearHBLSelection}
                  title="Limpiar selección"
                >
                  🗑️ Limpiar
                </button>
              </Show>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  'font-size': '1.2rem',
                  color: '#1e40af'
                }}
                onClick={() => {
                  setShowHBLRecommendations(false);
                  clearHBLSelection();
                }}
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{
            'max-height': '400px',
            'overflow-y': 'auto',
            display: 'grid',
            gap: '0.75rem'
          }}>
            <For each={hblRecommendations()}>
              {(hbl) => {
                const hblId = hbl.referenceHId || hbl.hbl;
                const isSelected = selectedHBLs().has(hblId);
                const sameBagCount = hblRecommendations().filter(h => h.bagnumber === hbl.bagnumber).length;

                return (
                  <div style={{
                    background: isSelected ? '#d1fae5' : 'white',
                    border: isSelected ? '2px solid #10b981' : '1px solid #bfdbfe',
                    'border-radius': 'var(--border-radius-sm)',
                    padding: '1rem',
                    display: 'grid',
                    'grid-template-columns': 'auto 1fr auto',
                    gap: '1rem',
                    'align-items': 'center',
                    transition: 'all 0.2s'
                  }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleHBLSelection(hblId)}
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        cursor: 'pointer'
                      }}
                      title="Seleccionar este HBL"
                    />

                    {/* HBL Details */}
                    <div>
                    <div style={{
                      'font-weight': '700',
                      color: '#1e40af',
                      'margin-bottom': '0.5rem',
                      'font-size': '1rem'
                    }}>
                      HBL: {hbl.hbl} | Guía: {hbl.idairguide || hbl.guia}
                    </div>
                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.5rem',
                      'font-size': '0.875rem'
                    }}>
                      <div>
                        <strong>Cliente:</strong> {hbl.consigneeName}
                      </div>
                      <div>
                        <strong>Peso:</strong> {(parseFloat(hbl.weight ) * 2.2).toFixed(2) } lbs
                      </div>
                      <div>
                        <strong>Bulto:</strong> <span style={{
                          background: '#dbeafe',
                          padding: '2px 8px',
                          'border-radius': '4px',
                          'font-size': '0.75rem'
                        }}>{hbl.bagnumber}</span>
                      </div>
                      <div>
                        <strong>Fecha:</strong> {new Date(hbl.datereserve).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Descripción:</strong> {hbl.namegood}
                      </div>
                      
                     
                    </div>
                  </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      gap: '0.5rem'
                    }}>
                      <Show when={sameBagCount > 1}>
                        <button
                          type="button"
                          style={{
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            'border-radius': 'var(--border-radius-sm)',
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            'font-weight': '600',
                            'font-size': '0.75rem',
                            'white-space': 'nowrap'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectHBLsByBag(hbl.bagnumber);
                          }}
                          title={`Seleccionar todos los HBL del bulto ${hbl.bagnumber}`}
                        >
                          📦 Seleccionar {sameBagCount} de {hbl.bagnumber}
                        </button>
                      </Show>
                      <button
                        type="button"
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          'border-radius': 'var(--border-radius-sm)',
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          'font-weight': '600',
                          'white-space': 'nowrap',
                          transition: 'background 0.2s'
                        }}
                        onClick={() => applyHBLToReservas(hbl)}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
                      >
                        ➕ Aplicar Solo Este
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Pricing Info */}
      <Show when={showPricing()}>
        <div style={{
          background: 'var(--info-color)',
          
          padding: '1rem',
          'border-radius': 'var(--border-radius)',
          'margin-bottom': '1rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '1rem' }}>
            <Icon name="finance" size="1em" style={{ "margin-right": "0.5rem" }} />
            Información de Precios {autoCalculation() ? 
              (<><Icon name="robot" size="0.9em" style={{ "margin-left": "0.5rem", "margin-right": "0.3rem" }} />Auto-Cálculo ACTIVO</>) : 
              (<><Icon name="hand" size="0.9em" style={{ "margin-left": "0.5rem", "margin-right": "0.3rem" }} />Auto-Cálculo DESACTIVADO</>)
            }
          </h4>
          <div style={{ 'font-size': '0.875rem', 'line-height': '1.4' }}>
            • <strong>Misceláneas:</strong> $3.99 (&lt;50 lbs) / $2.99 (≥50 lbs) - <em>Calculado por peso</em><br/>
            • <strong>Duraderos:</strong> $4.50 + arancel dinámico por cantidad<br/>
            • <strong>Aranceles Duraderos:</strong> 0-5 qty: $5, 5-20 qty: $10, 20-50 qty: $20, 50-100 qty: $35, 100+ qty: $50<br/>
            • <strong>Baterías Litio:</strong> $8.99 (bulto exclusivo)<br/>
            • <strong>Equipos Exclusivos:</strong> $6.99 (bulto exclusivo - TV, computadoras, generadores)<br/>
            • <strong>Documentos:</strong> $1.99<br/>
            • <strong>Transporte:</strong> $20 mínimo por bulto<br/>
            {!autoCalculation() && (
              <>
                <br/><strong><Icon name="warning" size="0.9em" style={{ "margin-right": "0.3rem" }} />Auto-cálculo desactivado:</strong> Los precios y aranceles deben ingresarse manualmente
              </>
            )}
          </div>
        </div>
      </Show>

      {/* Bulks */}
      <For each={props.bulks}>
        {(bulk, bulkIndex) => {
          const totals = getBulkTotals(bulk?.id);
          const isCollapsed = collapsedBulks().has(bulk?.id);
          const items = getBulkItems(bulk?.id);
          
          return (
            <div style={bulkContainerStyle}>
              {/* Bulk Header */}
              <div
                style={bulkHeaderStyle(bulk)}
                onClick={() => toggleBulkCollapse(bulk?.id)}
              >
                <div>
                  <span style={{ 'font-weight': 'bold', 'font-size': '1.1rem' }}>
                    <Icon name={isCollapsed ? 'folder-closed' : 'folder-open'} size="1em" style={{ "margin-right": "0.5rem" }} />
                    {bulk?.name}
                  </span>
                  <span style={{ 
                    'margin-left': '0.5rem', 
                    color: 'var(--text-muted)', 
                    'font-size': '0.875rem' 
                  }}>
                    ({totals.totalItems} items, {totals.totalQty} lbs)
                  </span>
                </div>
                <div style={{ 'text-align': 'right' }}>
                  <div style={{ 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                    ${totals.grandTotal.toFixed(2)}
                  </div>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                    Items: ${totals.itemsTotal.toFixed(2)} + Transport: ${totals.transportCost.toFixed(2)}
                  </div>
                </div>
              </div>

              

              {/* Bulk Content */}
              <Show when={!isCollapsed}>
                <div style={bulkContentStyle}>
                  <div style="margin: .65rem; padding: .25rem .5rem; backgrouqnd: rgb(240, 253, 244); border: 2px solid rgb(16, 185, 129); border-radius: 8px;">
                <div style="display:flex;align-items:center;gap:1rem;">
                  <div style="font-size:.75rem;font-weight:500;color:#010101;text-align:center;">
                    El nombre del bulto debe ser el numero de saco ej: <span  style="font-weight:700;color:#10b981">YSC29003</span> si es aereo, maritimo pondria el numero de bulto o hbl maritimo ej: <span style="font-weight:700;color:#10b981">TRE20294162</span> 
                  </div>
                </div>
              </div>
                   {/* Bulk Settings */}
                  <div style={inputGroupStyle}>
                    <div>
                      <label style={{...{ 'font-size': '0.875rem', 'font-weight': '500' }, ...centerBx}}>
                        Nombre del Bulto
                      </label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={bulk?.name}
                        onChange={(e) => props.onUpdateBulk(bulkIndex(), {
                          name: e
                        })}
                      />
                    </div>
                    {/* Show pricing mode selector only for maritime shipping */}

                    <Show when={isMaritimeShipping(bulk?.shippingMethod)}>
                      <div>
                        <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                          Modo de Precio
                        </label>
                        <select
                          style={{...inputStyle, ...{ "margin": "7px 0 0"}}}
                          value={bulk?.pricingMode || 'weight'}
                          onChange={(e) => {
                            const mode = e.target.value as 'weight' | 'box_flat_rate';
                            props.onUpdateBulk(bulkIndex(), {
                              pricingMode: mode,
                              boxSize: mode === 'weight' ? undefined : bulk?.boxSize
                            });
                          }}
                        >
                          <option value="weight">Por Peso</option>
                          <option value="box_flat_rate">Tarifa Plana por Caja</option>
                        </select>
                      </div>
                    </Show>

                    {/* Show box selector when box flat rate is selected */}
                    <Show when={isMaritimeShipping(bulk?.shippingMethod) && bulk?.pricingMode === 'box_flat_rate'}>
                      <div style={{}}>

                        <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                          Tamaño de Caja
                        </label>
                        
                        <select
                          style={{...inputStyle, ...{ "margin": "7px 0 0"}}}
                          value={bulk?.boxSize || ''}
                          onChange={(e) => {
                            const selectedBoxSize = e.target.value;
                            const boxOptions = shippingOffersService.getBoxOptions('maritime');
                            const selectedBox = boxOptions.find(b => b.size === selectedBoxSize);

                            // Auto-calculate transport cost based on box
                            if (selectedBox) {
                              const calculation = shippingOffersService.calculateSuggestedPrice({
                                method: 'maritime',
                                category: 'box_flat_rate',
                                weight: totals.totalQty,
                                boxSize: selectedBoxSize
                              });

                              props.onUpdateBulk(bulkIndex(), {
                                boxSize: selectedBoxSize,
                               // transportCost: calculation?.price || selectedBox.price
                              });

                              items.reservas.map((res, resInx)=>{
                                handleUpdateReserva(resInx, {category: "MISCELANEAS", price: 0, arancel:calculation?.price, total: calculation?.price })
                              })
                              invoiceStyledFormStore.updateBulk(bulkIndex(), { token: generateRandomId()});
                            }
                          }}
                        >
                          <option value="">Seleccionar caja...</option>
                          <For each={shippingOffersService.getBoxOptions('maritime')}>
                            {(box) => (
                              <option value={box.size}>
                                {box.size} - ${box.price.toFixed(2)} (hasta {box.maxWeight} lbs)
                              </option>
                            )}
                          </For>
                        </select>
                      </div>
                    </Show>

                    <div>
                      <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                        Costo Transporte ($)
                      </label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={(bulk?.transportCost || 0).toString()}
                        min={0}
                        onChange={(e) => props.onUpdateBulk(bulkIndex(), {
                          transportCost: Math.max( Number(e), 0)
                        })}
                      />
                    </div>
                  </div>

                  
                  
                  {/* Add Buttons */}
                  <div style={addButtonsStyle}>
                    <button
                      type="button"
                      style={addButtonStyle}
                      onClick={() => handleAddReservaToBulk(bulk?.id)}
                    >
                      <Icon name="add" size="1em" style={{ "margin-right": "0.3rem" }} />Reserva
                    </button>
                    <button
                      type="button"
                      style={addButtonStyle}
                      onClick={() => handleAddProductToBulk(bulk?.id)}
                    >
                      <Icon name="add" size="1em" style={{ "margin-right": "0.3rem" }} />Producto
                    </button>
                    <button
                      type="button"
                      style={addButtonStyle}
                      onClick={() => handleAddServiceToBulk(bulk?.id)}
                    >
                      <Icon name="add" size="1em" style={{ "margin-right": "0.3rem" }} />Servicio
                    </button>
                    <button
                      type="button"
                      style={{ ...removeButtonStyle, 'margin-left': 'auto', 'color': 'red' }}
                      onClick={() => props.onRemoveBulk(bulkIndex())}
                    >
                      <Icon name="delete" size="1em" color='red' style={{ "margin-right": "0.3rem" }} />Eliminar Bulto
                    </button>
                  </div>

                 

                  {/* Items Sections */}
                  <BulkReservasSection
                    bulk={bulk}
                    reservas={items.reservas}
                    showPricing={showPricing()}
                    autoCalculation={autoCalculation()}
                    validationResults={validationResults()}
                    shippingMethod={props.shippingMethod}
                    reservaRecomendation={reservaRecomendation()}
                    handleRecomendationReserva={handleRecomendationReserva}
                    getBulkTotals={getBulkTotals}
                    onUpdateReserva={(localIndex, updates) => {
                      const reserva = items.reservas[localIndex];
                      const globalIndex = props.reservas.findIndex(r => r.id === reserva.id);
                      handleUpdateReserva(globalIndex, updates);
                    }}
                    onRemoveReserva={(localIndex) => {
                      const reserva = items.reservas[localIndex];
                      const globalIndex = props.reservas.findIndex(r => r.id === reserva.id);
                      props.onRemoveReserva(globalIndex);
                    }}
                    onBulkChange={() => triggerBulkUpdate(bulk?.id)}
                    onApplySuggestedPrice={(localIndex) => {
                      const reserva = items.reservas[localIndex];
                      const validation = validationResults().get(reserva.id);
                      if (validation) {
                        const globalIndex = props.reservas.findIndex(r => r.id === reserva.id);
                        handleUpdateReserva(globalIndex, { price: validation.suggestedPrice });
                      }
                    }}
                  />
                  
                  <BulkProductsSection 
                    products={items.products}
                    showPricing={showPricing()}
                    onUpdateProduct={(localIndex, updates) => {
                      const product = items.products[localIndex];
                      const globalIndex = props.products.findIndex(p => p.id === product.id);
                      props.onUpdateProduct(globalIndex, updates);
                    }}
                    onRemoveProduct={(localIndex) => {
                      const product = items.products[localIndex];
                      const globalIndex = props.products.findIndex(p => p.id === product.id);
                      props.onRemoveProduct(globalIndex);
                    }}
                    onBulkChange={() => triggerBulkUpdate(bulk?.id)}
                  />
                  
                  <BulkServicesSection 
                    services={items.services}
                    showPricing={showPricing()}
                    onUpdateService={(localIndex, updates) => {
                      const service = items.services[localIndex];
                      const globalIndex = props.services.findIndex(s => s.id === service.id);
                      props.onUpdateService(globalIndex, updates);
                    }}
                    onRemoveService={(localIndex) => {
                      const service = items.services[localIndex];
                      const globalIndex = props.services.findIndex(s => s.id === service.id);
                      props.onRemoveService(globalIndex);
                    }}
                    onBulkChange={() => triggerBulkUpdate(bulk?.id)}
                  />

                  {/* Empty state */}
                  <Show when={totals.totalItems === 0}>
                    <div style={{
                      'text-align': 'center',
                      color: 'var(--text-muted)',
                      'font-style': 'italic',
                      padding: '2rem'
                    }}>
                      Este bulto está vacío. Use los botones de arriba para agregar items.
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          );
        }}
      </For>

      {/* Empty state */}
      <Show when={props.bulks.length === 0}>
        <div style={{
          'text-align': 'center',
          padding: '3rem',
          color: 'var(--text-muted)',
          border: '2px dashed var(--border-color)',
          'border-radius': 'var(--border-radius)'
        }}>
          <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>📦</div>
          <h3 style={{ 'margin-bottom': '0.5rem' }}>No hay bultos creados</h3>
          <p style={{ 'margin-bottom': '1rem' }}>
            Cree un bulto para comenzar a organizar sus reservas, productos y servicios.
          </p>
          <button
            type="button"
            style={createBulkButtonStyle}
            onClick={handleCreateBulk}
          >
            <span>➕</span>
            <span>Crear Primer Bulto</span>
          </button>
        </div>
      </Show>
    </div>
  );
};

export default BulkManager;