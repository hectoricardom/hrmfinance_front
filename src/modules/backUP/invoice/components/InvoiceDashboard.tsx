import { Component, createSignal, createMemo, For, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { Layout } from '../../ui';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { useTranslation } from '../../../translations';
import InvoiceDisplay from './InvoiceDisplay';
import { invoiceStore } from '../stores/invoiceStore';
import { inventoryStore, SearchableLocationDropdown } from '../../inventory';
import InvoiceAddFormStyledModular from './InvoiceAddFormStyledModular';
import { InvoiceResumeReport } from './InvoiceResumeReport';
import { movementsApi } from '../../../services/apiAdapter';
import { deepClone, devLog } from '../../../services/utils';
import { parseInvoice } from '../utils/invoiceParser';
import { EnhancedInvoiceAddForm } from './EnhancedInvoiceAddForm';
import { InvoiceAddForm } from './InvoiceAddForm';
import { BulkManagementV1 } from './BulkManagementV1';
import { BulkManagementV3 } from './BulkManagementV3';
import { BulkAssociationExample } from './BulkAssociationExample';
import { SmartBulkSystem } from './SmartBulkSystem';
import { SmartBulkSystemStyled } from './SmartBulkSystemStyled';
import  InternationalShippingFormStyled  from '../../international-shipping/components/InternationalShippingFormStyled';
import {  useMobile } from '../../../hooks';
import { authStore } from '../../../stores/authStore';

interface InvoiceProduct {
  product: {
    id: string;
    label: string;
    code: string;
  };
  qty: number;
  price: number;
  salePrice: string;
}

interface InvoiceReserva {
  type: string;
  qty: string;
  arancel: string;
  price: string;
  key: string;
  onlyTariff?: boolean;
}

interface ShipperConsignee {
  name: string;
  phoneNumberS: string;
  dob: string;
  firstName: string;
  lastName: string;
  lastName2: string;
  middleName: string;
  email: string;
  phoneNumber: string;
  altPhoneNumber: string;
  cid: string;
  ybstreetNo: string;
  ybstreet: string;
  ybbetwen1: string;
  ybbetwen2: string;
  ybapt: string;
  ybreparto: string;
  consigneeId: string;
  ssg_consignee_key: string;
  passport: string;
  nacionality: string;
  ybcity: string;
  ybestate: string;
  comment: string;
}

interface Invoice {
  type: string;
  invoice: string;
  description: string;
  store: string;
  ssg_inventory_key: string;
  ssg_sorder_key: string;
  createDate: number;
  shipper_consignee: ShipperConsignee;
  packagesOrder: boolean;
  businessId: string;
  userId: string;
  reservas: InvoiceReserva[];
  products: InvoiceProduct[];
  isCompleted: boolean;
}

interface InvoiceDashboardProps {
  invoices?: Invoice[];
}


interface SumInoice {
  reservaSubtotal:number;
  productSubtotal:number;
  subtotalBeforeTax:number;
  total :number;
}


  const parse2Fl = (v: any):number =>{
      return parseFloat(v?.toString()) || 0;
  }
  
  export const totalRese = (v: any):string =>{
    let qty = parse2Fl(v.qty);
    let price = parse2Fl(v.price);
    let arancel = parse2Fl(v.arancel);
      
    let amount = qty*price+arancel;
    return `${amount?.toFixed(2)}`
  }

export const totalSubProd = (v: any):string =>{
    let qty = Math.abs(v.qty);
    let price = parse2Fl(v.salePrice);
    let amount = qty*price;
    
    return `${amount?.toFixed(2)}`
}

export const calcInvoice = (inv: any): SumInoice =>{

 
    let reservaSubtotal = 0;
    inv?.reservas?.forEach((re: any)=>{
      reservaSubtotal += parseFloat(totalRese(re))
    })

    let productSubtotal = 0;
    inv?.products?.forEach((re: any)=>{
      productSubtotal += parseFloat(totalSubProd(re))
    })
    let sum:any = {}
    sum.reservaSubtotal = reservaSubtotal.toFixed(2);
    sum.productSubtotal = productSubtotal.toFixed(2);
    sum.subtotalBeforeTax = (productSubtotal+reservaSubtotal).toFixed(2);
    //let taxAmount = has
    sum.total = sum.subtotalBeforeTax;

    return sum;

}

const InvoiceDashboard: Component<InvoiceDashboardProps> = (props) => {
  const { t } = useTranslation();
  

   const  {  isMobile } =   useMobile()
  // State
  const [loading, setLoading] = createSignal<boolean>(false);
  const [selectedStore, setSelectedStore] = createSignal<string>('all');
  const [selectedType, setSelectedType] = createSignal<'SALES' | 'INTERNATIONAL_SHIPPING'>('SALES' );
  const [dateFrom, setDateFrom] = createSignal<string>('');
  const [dateTo, setDateTo] = createSignal<string>('');
  const [selectedInvoice, setSelectedInvoice] = createSignal<Invoice | null>(null);
  const [parseSelectedInvoice, setParseSelectedInvoice] = createSignal<any>(null);
  const [viewMode, setViewMode] = createSignal<'dashboard' | 'detail'>('dashboard');
  const [stores, setStores] = createSignal<string[]>([]);
  const [searchQuery, setSearchQuery] = createSignal<string>('');

  const [activeTab, setActiveTab] = createSignal<'overview' | 'invoices' | 'add' | 'report' | 'international'>('overview');
  
  // Load data on mount
  onMount(async () => {
    try {
      // Load invoices if not provided via props
      if (!props.invoices) {
       
        
      }
      
      //await invoiceStore.fetchInvoices();
      // Load stores list
      try {
        const storesList = await invoiceStore.fetchStores();
       
        let storeL = Array.isArray(storesList) ? storesList as Invoice[] : Object.keys(storesList) || [] as Invoice[] 
        //setStores(storeL);
      } catch (error) {
        // Fallback to extracting stores from invoices
        const invoiceList = invoiceStore.state.invoices || props.invoices;
        const uniqueStores = [...new Set(invoiceList.map(inv => inv.store))];
        setStores(uniqueStores.sort());
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  });

  // Get current invoices (from props or store)
  const currentInvoices = createMemo(() => {
    return invoiceStore.state.invoices ||  props.invoices;
  });


  // Filter invoices
  const filteredInvoices = createMemo(() => {
    let invoices;
    if (props.invoices) {
      // Use local filtering for prop-based data
      invoices = invoiceStore.getFilteredInvoices({
        store: selectedStore(),
        dateFrom: dateFrom(),
        dateTo: dateTo()
      });
    } else {
      // Use store filtering for API-based data
      invoices = invoiceStore.getFilteredInvoices({
        store: selectedStore(),
        dateFrom: dateFrom(),
        dateTo: dateTo()
      });
    }

    


    // Apply type filter
    const type = selectedType();

    if (type !== 'all') {
      invoices = invoices.filter(invoice => {
        if (type === 'INTERNATIONAL_SHIPPING') {
          return invoice.type === 'INTERNATIONAL_SHIPPING';
        } else if (type === 'SALES') {
          return !invoice.type || invoice.type === 'SALES' || invoice.type === 'POS_SALES';
        }
        return true;
      });
    }

    
    /**
    // Apply search filter
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      invoices = invoices.filter(invoice => {
        // Search in invoice number
        if (invoice.invoice?.toLowerCase().includes(query)) return true;
        
        // Search in customer name
        if (invoice.shipper_consignee?.name?.toLowerCase().includes(query)) return true;
        
        // Search in customer name
        if (invoice.shipper_consignee?.cid?.toLowerCase().includes(query)) return true;
        
        // Search in description
        if (invoice.description?.toLowerCase().includes(query)) return true;
        
        // Search in store
        if (invoice.store?.toLowerCase().includes(query)) return true;
        
        // Search in customer email
        if (invoice.shipper_consignee?.email?.toLowerCase().includes(query)) return true;
        
        // Search in customer phone
        if (invoice.shipper_consignee?.phoneNumber?.includes(query)) return true;

        // Search in customer phone
        if (invoice.shipper_consignee?.phoneNumberS?.includes(query)) return true;
        
        //return false;
      });
    }
    */

    
    return invoices;
  });

  // Refresh data function
  const refreshData = async () => {
    try {
      if (!props.invoices) {}
      setLoading(true)
      if(authStore.isAdmin()){

      await invoiceStore.refreshData({
          store: "",
          dateFrom: dateFrom() || undefined,
          dateTo: dateTo() || undefined,
          search: searchQuery(),
          type: selectedType() ,
        });
        setLoading(false)
      }
      else{
         let store =  selectedStore() !== 'all' ? selectedStore() : undefined;

      store &&  await invoiceStore.refreshData({
          store,
          dateFrom: dateFrom() || undefined,
          dateTo: dateTo() || undefined,
          search: searchQuery(),
          type: selectedType() ,
        });
        setLoading(false)
      }
     
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Calculate summary statistics
  const summary = createMemo(() => {
    if(loading()){
      //return {};
    }

    const invoices = filteredInvoices();
    const baseSummary = invoiceStore.calculateSummary(invoices);
    
    // Calculate additional breakdown data
    let productsByCategory = new Map<string, number>();
    let reservasByType = new Map<string, number>();
    let othersByType = new Map<string, number>();
    
    invoices.forEach(invoice => {
      // Process products for category breakdown
      if( invoice?.products?.length>0){
        invoice?.products?.forEach(item => {

          const qty = Math.abs(item.qty);
          const category = item.product.label;
          productsByCategory.set(category, (productsByCategory.get(category) || 0) + qty);
        });
      }
      // Process reservas for type breakdown
      if( invoice?.reservas?.length>0){
        invoice?.reservas?.forEach(item => {
          let qty = parseInt(item.qty);


          if(isNaN(qty)){
            qty = 0;
          }

          let others: any = {
            "TRANSPORTACION": 1,
            "OTROS SERVICIO": 1,
            "OTROS": 1,
            "SERVICIO DE RAPEADO": 1,
            "CAJAS": 1
          }
        
          if(others[item.type] ||  item?.onlyTariff){

            qty = parseFloat(item.arancel) || (parseFloat(item.qty) * parseFloat(item.price));
            othersByType.set(item.type, (reservasByType.get(item.type) || 0) + qty);
          }
          else{
            reservasByType.set(item.type, (reservasByType.get(item.type) || 0) + qty);

          }
        });
      }
    });
    
    return {
      ...baseSummary,
      productsByCategory,
      reservasByType,
      othersByType
    };
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Styles
  const dashboardStyle = {
    padding: isMobile() ? '2rem' : '.1rem'
  };

  const filtersStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'flex-end',
    'margin-bottom': '2rem',
    'flex-wrap': 'wrap',
    padding: isMobile()? '1.5rem' : ".3rem",
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    'box-shadow': 'var(--shadow-sm)'
  };

  const filterGroupStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.5rem',
    flex: '1',
    'min-width': '200px'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)'
  };

  const inputStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--background-color)'
  };

  const summaryGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const summaryCardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    'box-shadow': 'var(--shadow-sm)',
    border: '1px solid var(--border-color)'
  };

  const cardIconStyle = {
    width: '48px',
    height: '48px',
    'border-radius': '12px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '1.5rem',
    'margin-bottom': '1rem'
  };

  const cardTitleStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.5rem'
  };

  const cardValueStyle = {
    'font-size': '1.75rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    'margin-bottom': '0.25rem'
  };

  const cardSubtextStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)'
  };

  const tableStyle = {
    width: '100%',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    'box-shadow': 'var(--shadow-sm)',
    overflow: 'hidden'
  };

  const thStyle = {
    padding: '1rem',
    'text-align': 'left',
    background: 'var(--background-color)',
    'font-weight': '600',
    color: 'var(--text-secondary)',
    'font-size': '0.875rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const tdStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)'
  };


  const tabsStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '1.5rem'
  };



    const descriptionStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem',
    'font-style': 'italic'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    transition: 'all 0.2s ease'
  });


  const viewButtonStyle = {
    padding: '0.5rem 1rem',
    background: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    'font-size': '0.875rem',
    transition: 'opacity 0.2s'
  };

  const backButtonStyle = {
    padding: '0.75rem 1.5rem',
    background: 'var(--secondary-color)',
    color: 'white',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };



  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implement PDF export logic here
    // You can use libraries like jsPDF or html2pdf
    devLog('Exporting to PDF...');
  };
  // Summary card configurations
  const summaryCards = () => [
    {
      title: t('invoices.totalRevenue'),
      value: summary().grandTotal,
      icon: '💰',
      color: '#4CAF50',
      subtext: `${t('common.of')} ${summary().totalInvoices} ${t('common.invoice')} `
    },
    {
      title: t('invoices.totalProducts'),
      value: summary().totalProducts,
      icon: '📦',
      color: '#2196F3',
      subtext: `${formatCurrency(summary().totalProductAmount)} ${t('invoices.value')}`,
      isNumber: true
    },
    {
      title: t('invoices.totalReservations'),
      value: summary().totalReservas,
      icon: '🎫',
      color: '#FF9800',
      subtext: `${formatCurrency(summary().totalReservaAmount)} ${t('invoices.value')}`,
      isNumber: true
    },
    {
      title: t('invoices.aranceles'),
      value: summary().totalAranceles,
      icon: '🏛️',
      color: '#9C27B0',
      subtext: t('invoices.customsFees')
    },
    {
      title: t('invoices.uniqueCustomers'),
      value: summary().uniqueCustomers,
      icon: '👥',
      color: '#00BCD4',
      subtext: t('invoices.activeCustomers'),
      isNumber: true
    },
    {
      title: t('invoices.averageInvoice'),
      value: summary().avgInvoiceValue,
      icon: '📊',
      color: '#FF5722',
      subtext: t('invoices.perInvoiceValue')
    },
    {
      title: t('invoices.completed'),
      value: summary().completedInvoices,
      icon: '✅',
      color: '#4CAF50',
      subtext: `${summary().pendingInvoices} ${t('invoices.pending')}`,
      isNumber: true
    },
    {
      title: t('invoices.storesActive'),
      value: stores().length,
      icon: '🏪',
      color: '#795548',
      subtext: t('invoices.locations'),
      isNumber: true
    }
  ];


  const locations = () => inventoryStore.getActiveLocations();

  createEffect(()=>{
  })




  const Initialize = async () => {
    let qry = "YB1";
    movementsApi.calcStockLevels();
    await inventoryStore.fecthProduct(qry);
    await inventoryStore.fecthInventory(qry)
  }
  


 

  onMount(()=>{
    Initialize();
  })

  
  return (
    <Layout title={t('invoices.title')}>
      <div style={dashboardStyle}>
        <Show when={viewMode() === 'dashboard'}>
          {/* Loading State */}
          <Show when={!props.invoices && invoiceStore.state.loading}>
            <div style={{ 'text-align': 'center', padding:  isMobile() ? '2rem': "" }}>
              <div style={{ 'font-size': '1.25rem', 'margin-bottom': '1rem' }}>
                {t('invoices.loadingInvoices')}
              </div>
            </div>
          </Show>



          {/* Error State */}
          <Show when={invoiceStore.state.error}>
            <div style={{
              padding:  isMobile() ?'1rem' : "",
              'margin-bottom': '1rem',
              background: '#ffebee',
              border: '1px solid #ffcdd2',
              'border-radius': 'var(--border-radius)',
              color: '#d32f2f'
            }}>
              ⚠️ {invoiceStore.state.error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                style={{ 'margin-left': '1rem' }}
              >
                {t('invoices.refreshData')}
              </Button>
            </div>
          </Show>

          {/* Filters */}
          <div style={filtersStyle}>
            

          <div>
          <label style={labelStyle}>Tienda/Sucursal</label>
            <SearchableLocationDropdown
              value={selectedStore()}
               onChange={(e) => setSelectedStore(e)}
              placeholder="Seleccionar tienda..."
              style={{ width: '100%' }}
            />
           
          </div>

            <div style={filterGroupStyle}>
              <label style={labelStyle}>Tipo de Documento</label>
              <select
                style={inputStyle}
                value={selectedType()}
                onChange={(e) => setSelectedType(e.currentTarget.value)}
              >
                <option value="all">Todos los Tipos</option>
                <option value="SALES">📋 Facturas Regulares</option>
                <option value="INTERNATIONAL_SHIPPING">🌎 Envíos Internacionales</option>
              </select>
            </div>

            <div style={filterGroupStyle}>
              <label style={labelStyle}>{t('invoices.fromDate')}</label>
              <input
                type="date"
                style={inputStyle}
                value={dateFrom()}
                onChange={(e) => setDateFrom(e.currentTarget.value)}
              />
            </div>
            
            <div style={filterGroupStyle}>
              <label style={labelStyle}>{t('invoices.toDate')}</label>
              <input
                type="date"
                style={inputStyle}
                value={dateTo()}
                onChange={(e) => setDateTo(e.currentTarget.value)}
              />
            </div>
            
            <div style={filterGroupStyle}>
              <label style={labelStyle}>{t('invoices.search')}</label>
              <input
                type="text"
                style={inputStyle}
                placeholder={t('invoices.searchPlaceholder')}
                value={searchQuery()}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
              />
            </div>
            
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedStore('all');
                setSelectedType('all');
                setDateFrom('');
                setDateTo('');
                setSearchQuery('');
              }}
            >
              {t('invoices.clearFilters')}
            </Button>

            <Button
              variant="primary"
              onClick={refreshData}
              disabled={!props.invoices && invoiceStore.state.loading}
            >
              🔄 {t('invoices.refreshData')}
            </Button>
          </div>


            {/* Tabs */}
            <div style={tabsStyle}>
            <button
              style={tabStyle(activeTab() === 'overview')}
              onClick={() => setActiveTab('overview')}
            >
              {t('inventory.overview')}
            </button>
            <button
              style={tabStyle(activeTab() === 'invoices')}
              onClick={() => setActiveTab('invoices')}
            >
              {t('invoices.invoices')}
            </button>
            <button
              style={tabStyle(activeTab() === 'add')}
              onClick={() => setActiveTab('add')}
            >
              ➕ { "Crear Nueva Factura"}
            </button>
            <button
              style={tabStyle(activeTab() === 'international')}
              onClick={() => setActiveTab('international')}
            >
              🌎 Envío Internacional
            </button>
            <button
              style={tabStyle(activeTab() === 'report')}
              onClick={() => setActiveTab('report')}
            >
              📊 Resume Report
            </button>
          </div>

          <Show when={activeTab() === 'overview'} >

          
         
          {/* Summary Cards */}
          <div style={summaryGridStyle}>
            <For each={summaryCards()}>
              {(card) => (
                <div style={summaryCardStyle}>
                  <div style={{
                    ...cardIconStyle,
                    background: `${card?.color}20`,
                    color: card?.color
                  }}>
                    {card?.icon}
                  </div>
                  <div style={cardTitleStyle}>{card?.title}</div>
                  <div style={cardValueStyle}>
                    {card.isNumber ? card.value : formatCurrency(card.value)}
                  </div>
                  <div style={cardSubtextStyle}>{card.subtext}</div>
                </div>
              )}
            </For>
          </div>

          {/* Products by Category */}
          <Show when={summary()?.productsByCategory?.size > 0}>
            <Card title={t('invoices.topProducts')} subtitle={t('invoices.mostSoldProducts')}>
              <div style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
                {Array.from(summary().productsByCategory.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([product, qty]) => (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      padding: '0.75rem',
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <span>{product}</span>
                      <span style={{ 'font-weight': '600' }}>{qty} {t('common.units')}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </Show>
          <div style={{margin: "19px"}}/>

          {/* Reservations by Type */}
          <Show when={summary()?.reservasByType?.size > 0}>
            <Card title={t('invoices.reservationsByType')} subtitle={t('invoices.distributionOfCategories')} style={{ 'margin-top': '1.5rem' }}>
              <div style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
                {Array.from(summary().reservasByType.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, qty]) => (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      padding: '0.75rem',
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <span>{type}</span>
                      <span style={{ 'font-weight': '600' }}>{qty} {t('common.lbs')}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </Show>

                  <div style={{margin: "19px"}}/>

                 
             {/* Other Services by Type */}
             <Show when={summary()?.othersByType?.size > 0}>
            <Card title={"Aranceles y otros servicios"} subtitle={t('invoices.distributionOfCategories')} style={{ 'margin-top': '1.5rem' }}>
              <div style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
                {Array.from(summary().othersByType.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, qty]) => (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      padding: '0.75rem',
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <span>{type}</span>
                      <span style={{ 'font-weight': '600' }}>{qty} $</span>
                    </div>
                  ))}
              </div>
            </Card>
          </Show>

          
        </Show>

        
      </Show>


      {/*****************invoices******************/}


      <Show when={activeTab() === 'invoices'} >
      <Show when={viewMode() !== 'detail' }>
      
      <Card title={t('invoices.recentInvoices')} subtitle={`Mostrando ${filteredInvoices().length} facturas`} style={{ 'margin-top': '1.5rem' }}>
        <div style={{ 'overflow-x': 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('invoices.invoiceNumber')}</th>
                <th style={thStyle}>{t('invoices.date')}</th>
                <th style={thStyle}>{t('invoices.customer')}</th>
                <th style={thStyle}>{t('invoices.id')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.total')}</th>
               
                <th style={thStyle}>{t('invoices.actions')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredInvoices().slice(0, 150)}>
                {(invoice) => {


                  const totalizing: any = ()=>{
                      // Process products
                   //let t = calcInvoice(deepClone(invoice));
                   let t = parseInvoice(invoice);
                   // AEREO
                   devLog({t, invoice})
                    //devLog(total, totalProductAmount , totalReservaAmount,totalAranceles ,totalOther)
                    //return {total, totalProductAmount , totalReservaAmount,totalOther}
                    return t;
                  }
                

                  return (
                    <tr style={"font-size: 12px;"}>
                      <td style={tdStyle}>{invoice?.invoice}</td>
                      
                      <td style={tdStyle}>{formatDate(invoice?.createDate)}</td>
                      <td style={tdStyle}>{invoice?.shipper_consignee?.name}</td>
                       <td style={tdStyle}>{invoice?.shipper_consignee?.cid || "POS"}</td>
                      <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '600' }}>
                        {formatCurrency(totalizing()?.total)}
                      </td>
                      {/*
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          'border-radius': '9999px',
                          'font-size': '0.75rem',
                          'font-weight': '600',
                          background: invoice.isCompleted ? '#d4edda' : '#fff3cd',
                          color: invoice.isCompleted ? '#155724' : '#856404'
                        }}>
                          {invoice.isCompleted ? t('invoices.completed') : t('invoices.pending')}
                        </span>
                      </td>
                       */}
                      <td style={tdStyle}>
                        <button
                          style={viewButtonStyle}
                          onClick={() => {
                            setParseSelectedInvoice(parseInvoice(invoice));
                            setSelectedInvoice(invoice);
                            setViewMode('detail');
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          {t('invoices.view')}
                        </button>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
        </Card>
        </Show>
        {/* Invoice Detail View */}
        <Show when={viewMode() === 'detail' && selectedInvoice()}>
          <button
            style={backButtonStyle}
            onClick={() => {
              setViewMode('dashboard');
              setSelectedInvoice(null);
            }}
          >
            ← {t('invoices.backToDashboard')}
          </button>
          
          <InvoiceDisplay
            invoice={selectedInvoice()!}
            onPrint={() => window.print()}
            parseData={parseSelectedInvoice()}
            goBack={()=>{
              setViewMode('dashboard');
              setSelectedInvoice(null);
            }}
            onEdit={() => {
              // Switch to the add tab which will show the form in edit mode
              setActiveTab('add');
            }}
          />
        </Show>
      </Show>

      {/* Add Invoice Tab */}
      <Show when={activeTab() === 'add'}>
        <InvoiceAddFormStyledModular />
      </Show>

      {/* International Shipping Tab */}
      <Show when={activeTab() === 'international'}>
        <InternationalShippingFormStyled />
      </Show>

      {/* Resume Report Tab */}
      <Show when={activeTab() === 'report'}>
        <InvoiceResumeReport />
      </Show>
      </div>
    </Layout>
  );
};

export default InvoiceDashboard;





/* Recent Invoices Table 


*/