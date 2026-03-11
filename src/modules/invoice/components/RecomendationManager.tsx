import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { InvoiceBulk, InvoiceProduct, InvoiceReserva, InvoiceService, ShipperConsignee } from '../types/invoiceTypes';
import { BASE_TRANSPORT_COST, validateBulkCompatibility, validateExclusiveBulkItem, categorizeReservaType, calculateDynamicPrice, calculateArancel } from '../hooks/usePricingLogic';
import { delay, devLog, generateRandomId, generateShortCode } from '../../../services/utils';
import { FormInput } from '../../ui';
import Icon from '../../../components/Icon';
import { shippingOffersService, type ShippingMethod, type ItemCategory, type PriceValidationResult } from '../../../services/shippingOffersService';
import { isAirShipping, getShippingMethodDisplayName, isValidShippingMethod, isMaritimeShipping } from '../../../services/shippingMethodService';
import { invoiceStyledFormStore } from '../stores/invoiceStyledFormStore';
import { inventoryApi } from '../../../services/apiAdapter';
import type { HBL } from '../../hbl/types';
import type { Consignee, Shipper } from '../../../types/shippingTypes';
import { showToast } from '../../../services/toastService';

interface RecomManagerProps {
  shippingMethod?: 'AEREO' | 'SEA' | 'EXPRESS';
  onShipperConsigneeChange: (updates: Partial<ShipperConsignee>) => void;

  // Data arrays
  bulks: InvoiceBulk[];
  reservas: InvoiceReserva[];
  products: InvoiceProduct[];
  services: InvoiceService[];

  // Event handlers
  onAddBulk: (bulk: InvoiceBulk) => void;
  onAddReserva: (reserva: InvoiceReserva) => void;
  onUpdateBulk: (index: number, updates: Partial<InvoiceBulk>) => void;
  onRemoveBulk: (index: number) => void;
  onAddProduct: (product: InvoiceProduct) => void;
  onUpdateProduct: (index: number, updates: Partial<InvoiceProduct>) => void;
  onRemoveProduct: (index: number) => void;
  onUpdateService: (index: number, updates: Partial<InvoiceService>) => void;
  onRemoveService: (index: number) => void;
  onRemoveReserva: (index: number) => void;
}


const RecomendationManager: Component< RecomManagerProps> = (props) => {
  const [reservaRecomendation, setReservaRecomendation] = createSignal({});
  const [showPricing, setShowPricing] = createSignal(false);
  const [cid, setCid] = createSignal("");
  
  // HBL Lookup state
  const [hblRecommendations, setHblRecommendations] = createSignal<HBL[]>([]);
  const [loadingHBL, setLoadingHBL] = createSignal(false);
  const [showHBLRecommendations, setShowHBLRecommendations] = createSignal(false);
  const [selectedHBLs, setSelectedHBLs] = createSignal<Set<string>>(new Set());

  // Consignee and Shipper info state - now storing arrays for multiple matches
  const [consigneeInfo, setConsigneeInfo] = createSignal<Map<string, Consignee[]>>(new Map());
  const [shipperInfo, setShipperInfo] = createSignal<Map<string, Shipper[]>>(new Map());
  const [loadingDetails, setLoadingDetails] = createSignal(false);

  // Selected consignee/shipper for form population
  const [selectedConsignee, setSelectedConsignee] = createSignal<Consignee | null>(null);
  const [selectedShipper, setSelectedShipper] = createSignal<Shipper | null>(null);

  // Toggle visibility of consignee and shipper details
  const [showConsigneeDetails, setShowConsigneeDetails] = createSignal(true);
  const [showShipperDetails, setShowShipperDetails] = createSignal(true);


 // Fetch consignee and shipper details for HBLs
  const fetchConsigneeAndShipperDetails = async (hbls: HBL[]) => {
    setLoadingDetails(true);
    const consigneeMap = new Map<string, Consignee[]>();
    const shipperMap = new Map<string, Shipper[]>();

    try {
      // Get unique consignee IDs and shipper names
      const consigneeIds = [...new Set(hbls.map(h => h.cidentity).filter(Boolean))];
      const shipperNames = [...new Set(hbls.map(h => h.nameshipper).filter(Boolean))];

      devLog('📦 HBLs to process:', hbls.length);
      devLog('🔍 Unique consignee IDs:', consigneeIds);
      devLog('🔍 Unique shipper names:', shipperNames);

      // Fetch all consignees in parallel using inventoryApi.getConsigee
      const consigneePromises = consigneeIds.map(async (cid) => {
        try {
          devLog(`Fetching consignees for CID: ${cid}`);
          const results = await inventoryApi.getConsigee(cid);

          // Convert API results to Consignee array
          const consignees: Consignee[] = Object.values(results || {}).map((item: any) => ({
            id: item.consigneeId,
            consigneeId: item.consigneeId,
            firstName: item.firstName,
            middleName: item.middleName,
            lastName: item.lastName + (item.lastName2 ? " " + item.lastName2 : ""),
            name: item.firstName + (item.middleName ? " " + item.middleName : "") + " " + item.lastName + (item.lastName2 ? " " + item.lastName2 : ""),
            cid: item.cid,
            phone: item.phoneNumber,
            email: item.email || '',
            address: `Calle ${item.ybstreet}${item.ybstreetNo ? " # " + item.ybstreetNo : ""}${item.ybbetwen1 ? " / " + item.ybbetwen1 : ""}${item.ybbetwen2 ? " y " + item.ybbetwen2 : ""}${item.ybreparto ? ", Rpto " + item.ybreparto : ""}, ${item.ybcity ? item.ybcity : ""}, ${item.ybestate ? item.ybestate : ""}`,
            city: item.ybcity,
            state: item.ybestate,
            zipCode: item.zipCode || '',
            isActive: true,
            createdAt: '',
            updatedAt: '',
            businessId: ''
          }));

          devLog(`✅ Found ${consignees.length} consignees for ${cid}:`, consignees);
          if (consignees.length > 0) {
            consigneeMap.set(cid, consignees);
          } else {
            console.warn(`⚠️ No consignees found for CID: ${cid}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching consignee ${cid}:`, error);
        }
      });

      // Fetch all shippers in parallel using inventoryApi.getShipper
      const shipperPromises = shipperNames.map(async (name) => {
        try {
          devLog(`Fetching shippers for name: ${name}`);
          const results = await inventoryApi.getShipper(name);

          // Store raw API results as any[] (API structure doesn't match Shipper type)
          const shippers: any[] = Object.values(results || {});

          devLog(`✅ Found ${shippers.length} shippers for ${name}:`, shippers);
          if (shippers.length > 0) {
            shipperMap.set(name, shippers);
          } else {
            console.warn(`⚠️ No shippers found for name: ${name}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching shipper ${name}:`, error);
        }
      });

      // Wait for all fetches to complete
      await Promise.all([...consigneePromises, ...shipperPromises]);

      devLog('📊 Final consignee map:', consigneeMap);
      devLog('📊 Final shipper map:', shipperMap);
      devLog(`✅ Fetched ${consigneeMap.size} unique consignee IDs`);
      devLog(`✅ Fetched ${shipperMap.size} unique shipper names`);

      setConsigneeInfo(consigneeMap);
      setShipperInfo(shipperMap);
    } catch (error) {
      console.error('❌ Error fetching details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 'aereo' | 'maritimo' | 'express' | ''
  // Fetch HBL recommendations based on guide number
  const fetchHBLRecommendations = async () => {
    const formData = invoiceStyledFormStore.getFormData();
    const guide = formData?.shippingMethod === "aereo"? formData?.guide?.trim(): formData?.shippingMethod === 'maritimo'? "TRE": "";
    const shippingMethod = formData?.shippingMethod;


    // Validate shipping method using the service
    if (!isValidShippingMethod(shippingMethod)) {
      showToast('Por favor, seleccione un método de envío válido', 'warning');
      return;
    }



    if (!cid || !guide) {
      showToast('Por favor, ingrese el número de guía y el CID del cliente', 'warning');
      return;
    }

    setLoadingHBL(true);
    try {
      const result = await inventoryApi.sugestHBLS(`${cid()} ${guide}`);
      devLog(result)
      if (result?.error) {
        showToast(`Error al buscar HBL: ${result.error}`, 'error');
        setHblRecommendations([]);
      } else {
        const hblList = Object.values(result || {}) as HBL[];

        // Filter by shipping method if possible
        // Air guides typically start with specific patterns
        let filteredHbls: any = []
        if( formData?.shippingMethod === 'maritimo'){
          filteredHbls = setHblRecommendations(hblList);
        }else{
        
          filteredHbls = hblList.filter((hbl: HBL) => {
            // Match by guide number
            const matchesGuide = hbl.idairguide === guide || hbl.guia === guide;

            // Additional filtering logic can be added here
            return matchesGuide;
          });
         
      }


         setHblRecommendations(filteredHbls);
        setShowHBLRecommendations(true);

        if (filteredHbls.length === 0) {
          showToast(`No se encontraron reservas HBL para la guía: ${guide}`, 'info');
        } else {
          // Fetch consignee and shipper details
          await fetchConsigneeAndShipperDetails(filteredHbls);
          showToast(`✅ ${filteredHbls.length} reservas HBL encontradas`, 'success');
        }
      }

//99111920437


    } catch (error) {
      console.error('Error fetching HBL:', error);
      showToast('Error al buscar reservas HBL', 'error');
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

  // Populate form with selected consignee
  const applyConsigneeToForm = (consignee: Consignee) => {
    setSelectedConsignee(consignee);



    let hsfs = {
        id: consignee.consigneeId,
        firstName : consignee.firstName ,
        middleName : consignee.middleName ,
        lastName: consignee.lastName,
        cid: consignee.cid,
        phoneNumber: consignee.phone,
      
        address: consignee.address,
      }

      // devLog(consignee) 
    //devLog(hsfs)    
    props.onShipperConsigneeChange(hsfs);

   

    //alert(`✅ Cliente aplicado: ${consignee.name || consignee.firstName + ' ' + consignee.lastName}`);
    showToast(`✅ Destinatario aplicado: ${consignee.name || consignee.firstName + ' ' + consignee.lastName}`, 'success');
  };

  // Populate form with selected shipper
  const applyShipperToForm = (shipper: Shipper) => {
    setSelectedShipper(shipper);


    let shipperS = {
          name: shipper.name || '',
          phoneNumberS: shipper.phoneNumber || '',
          idS: shipper.passport || '',
          dob: shipper.dob || '',
          addressS: shipper?.address || ''
        }
    
    props.onShipperConsigneeChange(shipperS)
        

    // Update form with shipper data
   

    //alert(`✅ Remitente aplicado: ${shipper.name || shipper.companyName}`);
    showToast(`✅ Remitente aplicado: ${shipper.name || shipper.phoneNumber}`, 'info');
  };

  // Apply multiple HBLs at once
  const applyMultipleHBLs = async () => {
    const selected = selectedHBLs();
    if (selected.size === 0) {
      showToast('Por favor, seleccione al menos un HBL', 'warning');
      return;
    }

    const selectedHBLRecords = hblRecommendations().filter(
      h => selected.has(h.referenceHId || h.hbl)
    );

    // Group by bagnumber
    const byBag = selectedHBLRecords.reduce((acc, hbl) => {
      const bag = hbl.bagnumber?.trim() || hbl.hbl || 'Sin Bulto';
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
    showToast(
      `✅ ${successCount} de ${selected.size} HBL(s) aplicados exitosamente. Bultos: ${bagCount}, Peso total: ${totalWeight.toFixed(2)} lbs`,
      'success',
      5000
    );
  };

  // Apply HBL data to create reservas
  const applyHBLToReservas = async (hbl: HBL, silent = false) => {
    const bagnumber = hbl.bagnumber?.trim() || hbl.hbl ;

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
        ? `✅ Reserva creada desde HBL: ${hbl.hbl}. Nuevo bulto creado: ${bagnumber}`
        : `✅ Reserva creada desde HBL: ${hbl.hbl}. Agregada al bulto existente: ${bagnumber}`;

      showToast(message, 'success', 4000);
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






  // Styles
  const containerStyle = {
    'margin': '2rem'
  };

 const requiredMarkerStyle = {
    color: 'var(--error-color)',
    'margin-left': '0.25rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
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
         
         <div>
          <label style={labelStyle}>
            Carnet de Identidad
            <span style={requiredMarkerStyle}>?</span>
          </label>
          <input
            type="text"
            style={inputStyle}
            value={cid()}
            onInput={(e) => setCid((e.target as HTMLInputElement).value)}
            placeholder="Ej: 010101010101"
            required
          />
        </div>
   
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
              <Show when={loadingDetails()}>
                <span style={{
                  'margin-left': '0.5rem',
                  'font-size': '0.85rem',
                  color: '#f59e0b',
                  'font-weight': '500'
                }}>
                  <Icon name="loading" size="0.9em" style={{ "margin-right": "0.25rem" }} />
                  Cargando detalles...
                </span>
              </Show>
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
              {/* Toggle Consignee/Shipper Details */}
              <button
                type="button"
                style={{
                  background: showConsigneeDetails() ? '#10b981' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  'border-radius': 'var(--border-radius-sm)',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  'font-weight': '500',
                  'font-size': '0.75rem'
                }}
                onClick={() => setShowConsigneeDetails(!showConsigneeDetails())}
                title={showConsigneeDetails() ? 'Ocultar información de destinatarios' : 'Mostrar información de destinatarios'}
              >
                👤 Destinatarios
              </button>
              <button
                type="button"
                style={{
                  background: showShipperDetails() ? '#3b82f6' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  'border-radius': 'var(--border-radius-sm)',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  'font-weight': '500',
                  'font-size': '0.75rem'
                }}
                onClick={() => setShowShipperDetails(!showShipperDetails())}
                title={showShipperDetails() ? 'Ocultar información de remitentes' : 'Mostrar información de remitentes'}
              >
                📦 Remitentes
              </button>

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
                      <div style={{ 'grid-column': '1 / -1' }}>
                        <strong>Cliente:</strong> {hbl.consigneeName}
                        <Show when={showConsigneeDetails()}>
                          <div style={{ 'font-size': '0.7rem', color: '#9ca3af', 'margin-top': '0.25rem' }}>
                            CID: {hbl.cidentity} | Has Info: {consigneeInfo().has(hbl.cidentity) ? 'Yes' : 'No'}
                          </div>
                          <Show when={consigneeInfo().has(hbl.cidentity)}>
                            {() => {
                              const consignees = consigneeInfo().get(hbl.cidentity) || [];
                              devLog(`Displaying consignees for ${hbl.cidentity}:`, consignees);
                              return (
                                <div style={{ 'margin-top': '0.5rem' }}>
                                  <Show when={consignees.length > 1}>
                                    <div style={{
                                      'font-size': '0.75rem',
                                      color: '#f59e0b',
                                      'font-weight': '600',
                                      'margin-bottom': '0.5rem'
                                    }}>
                                      ⚠️ {consignees.length} registros encontrados - Seleccione uno:
                                    </div>
                                  </Show>
                                  <div style={{
                                    display: 'grid',
                                    gap: '0.5rem'
                                  }}>
                                    <For each={consignees}>
                                      {(consignee, index) => (
                                        <div style={{
                                          'font-size': '0.75rem',
                                          color: '#374151',
                                          padding: '0.5rem',
                                          'border-left': '3px solid #10b981',
                                          background: index() % 2 === 0 ? '#f3f4f6' : 'white',
                                          'border-radius': '4px',
                                          display: 'flex',
                                          'justify-content': 'space-between',
                                          'align-items': 'flex-start',
                                          gap: '0.5rem'
                                        }}>
                                          <div style={{ flex: '1' }}>
                                            <Show when={consignees.length > 1}>
                                              <div style={{
                                                'font-weight': '700',
                                                color: '#10b981',
                                                'margin-bottom': '0.25rem'
                                              }}>
                                                Opción {index() + 1}:
                                              </div>
                                            </Show>
                                            <div>👤 {consignee?.name || (consignee?.firstName + ' ' + consignee?.lastName) || 'N/A'}</div>
                                            <div>📞 {consignee?.phone || 'N/A'}</div>
                                            <div>📧 {consignee?.email || 'N/A'}</div>
                                            <div>📍 {consignee?.address || 'N/A'}</div>
                                            <Show when={consignee?.city || consignee?.state}>
                                              <div>🏙️ {[consignee?.city, consignee?.state].filter(Boolean).join(', ')}</div>
                                            </Show>
                                          </div>
                                          <button
                                            type="button"
                                            style={{
                                              background: '#10b981',
                                              color: 'white',
                                              border: 'none',
                                              'border-radius': '4px',
                                              padding: '0.375rem 0.75rem',
                                              cursor: 'pointer',
                                              'font-size': '0.7rem',
                                              'font-weight': '600',
                                              'white-space': 'nowrap'
                                            }}
                                            onClick={() => applyConsigneeToForm(consignee)}
                                          >
                                            ✓ Usar Cliente
                                          </button>
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                </div>
                              );
                            }}
                          </Show>
                        </Show>
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
                      <div style={{ 'grid-column': '1 / -1' }}>
                        <strong>Remitente:</strong> {hbl.nameshipper}
                        <Show when={showShipperDetails()}>
                          <div style={{ 'font-size': '0.7rem', color: '#9ca3af', 'margin-top': '0.25rem' }}>
                            Name: {hbl.nameshipper} | Has Info: {shipperInfo().has(hbl.nameshipper) ? 'Yes' : 'No'}
                          </div>
                          <Show when={shipperInfo().has(hbl.nameshipper)}>
                            {() => {
                              const shippers = shipperInfo().get(hbl.nameshipper) || [];
                              devLog(`Displaying shippers for ${hbl.nameshipper}:`, shippers);
                              return (
                                <div style={{ 'margin-top': '0.5rem' }}>
                                  <Show when={shippers.length > 1}>
                                    <div style={{
                                      'font-size': '0.75rem',
                                      color: '#f59e0b',
                                      'font-weight': '600',
                                      'margin-bottom': '0.5rem'
                                    }}>
                                      ⚠️ {shippers.length} registros encontrados - Seleccione uno:
                                    </div>
                                  </Show>
                                  <div style={{
                                    display: 'grid',
                                    gap: '0.5rem'
                                  }}>
                                    <For each={shippers}>
                                      {(shipper, index) => (
                                        <div style={{
                                          'font-size': '0.75rem',
                                          color: '#374151',
                                          padding: '0.5rem',
                                          'border-left': '3px solid #3b82f6',
                                          background: index() % 2 === 0 ? '#eff6ff' : 'white',
                                          'border-radius': '4px',
                                          display: 'flex',
                                          'justify-content': 'space-between',
                                          'align-items': 'flex-start',
                                          gap: '0.5rem'
                                        }}>
                                          <div style={{ flex: '1' }}>
                                            <Show when={shippers.length > 1}>
                                              <div style={{
                                                'font-weight': '700',
                                                color: '#3b82f6',
                                                'margin-bottom': '0.25rem'
                                              }}>
                                                Opción {index() + 1}:
                                              </div>
                                            </Show>
                                            <div>👤 {shipper?.name || 'N/A'}</div>
                                            <Show when={shipper?.companyName}>
                                              <div>🏢 {shipper?.companyName}</div>
                                            </Show>
                                            <Show when={shipper?.phoneNumber}>
                                              <div>📞 {shipper?.phoneNumber}</div>
                                            </Show>
                                            <Show when={shipper?.email}>
                                              <div>📧 {shipper?.email}</div>
                                            </Show>
                                            <Show when={shipper?.address}>
                                              <div>📍 {shipper?.address}</div>
                                            </Show>
                                          </div>
                                          <button
                                            type="button"
                                            style={{
                                              background: '#3b82f6',
                                              color: 'white',
                                              border: 'none',
                                              'border-radius': '4px',
                                              padding: '0.375rem 0.75rem',
                                              cursor: 'pointer',
                                              'font-size': '0.7rem',
                                              'font-weight': '600',
                                              'white-space': 'nowrap'
                                            }}
                                            onClick={() => applyShipperToForm(shipper)}
                                          >
                                            ✓ Usar Remitente
                                          </button>
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                </div>
                              );
                            }}
                          </Show>
                        </Show>
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

    </div>
  );
};

export default RecomendationManager;