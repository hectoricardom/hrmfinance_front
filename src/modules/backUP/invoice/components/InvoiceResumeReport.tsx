import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Button, Card } from '../../ui';

import { invoiceStore } from '../stores/invoiceStore';
import { inventoryStore } from '../../inventory';
import { calcInvoice, totalRese, totalSubProd } from './InvoiceDashboard';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';
// import styles from './InvoiceResumeReport.module.css';

interface InvoiceResumeReportProps {
  onClose?: () => void;
}


 {/* */}

export const InvoiceResumeReport: Component<InvoiceResumeReportProps> = (props) => {
  const { t } = useTranslation();
  
  // Filter states
  const [loading, setLoading] = createSignal(false);
  const [dateFrom, setDateFrom] = createSignal('');
  const [dateTo, setDateTo] = createSignal('');
  const [selectedStore, setSelectedStore] = createSignal('all');
  const [selectedProduct, setSelectedProduct] = createSignal('all');
  const [paymentMethod, setPaymentMethod] = createSignal('all');
  const [shippingType, setShippingType] = createSignal<'all' | 'SEA' | 'AEREO'>('all');
  
  // Report data
  const [reportData, setReportData] = createSignal<any>(null);
  const [filteredInvoices, setFilteredInvoices] = createSignal<any[]>([]);
  const [generatingPDF, setGeneratingPDF] = createSignal(false);
  const [selectedPriceInvoices, setSelectedPriceInvoices] = createSignal<{ price: number; invoices: string[]; type: string } | null>(null);

  // Load initial data
  onMount(async () => {
    await loadReportData();
  });

  const locations = () => inventoryStore.getActiveLocations();

  const loadReportData = async () => {
    setLoading(true);
    try {
      let StorCh = selectedStore() !== 'all' ? selectedStore() : undefined
      const filters = {
        store: StorCh, 
        dateFrom: dateFrom() || undefined,
        dateTo: dateTo() || undefined,
      };
      if(StorCh){
        await invoiceStore.fetchInvoices(filters);
        generateReport();
      }
    } catch (error) {
      devLog('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a type should be classified as miscellaneous
  // Groups items containing these keywords into a single "Misceláneo" category for better organization
  const isMiscellaneous = (type: string): boolean => {
    // Empty or whitespace-only types are considered miscellaneous
    if (!type || type.trim() === '') {
      return true;
    }

    const miscKeywords = [
      // Food & Consumables
      'comida', 'alimento', 'food',
      // Clothing & Footwear
      'sapatos', 'zapato', 'ropa', 'clothes', 'shoe',
      // Hygiene & Personal Care
      'aseo', 'higiene', 'hygiene',
      // Medicine & Health
      'medicina', 'medicamento', 'medicamentos', 'medicine', 'medication',
      // General Miscellaneous
      'miscelanea', 'misceláneo', 'miscellaneous', 'varios', 'other'
    ];
    const typeLower = type.toLowerCase();
    return miscKeywords.some(keyword => typeLower.includes(keyword));
  };

  const generateReport = () => {
    let invoices = invoiceStore.getFilteredInvoices({
      store: selectedStore(),
      dateFrom: dateFrom(),
      dateTo: dateTo()
    });

    // Filter by shipping type
    if (shippingType() !== 'all') {
      invoices = invoices.filter(invoice =>
        invoice.shippingType === shippingType() ||
        // If no shippingType is set, assume based on some logic (you can adjust this)
        (!invoice.shippingType && shippingType() === 'SEA') // Default to sea if not specified
      );
    }

    setFilteredInvoices(invoices);

    // Calculate totals by payment method
    let cashTotal = 0;
    let zelleTotal = 0;
    let otherPaymentTotal = 0;

    // Calculate product totals
    let productsByType = new Map<string, { qty: number; total: number }>();
    
    // Calculate reservas totals - grouped by shipping method, type and price
    let reservasByShippingAndType = new Map<string, Map<string, {
      qty: number;
      price: number;
      arancel?: number;
      total: number;
      priceGroups: Map<number, { qty: number; invoices: string[] }>
    }>>();
    
    // Calculate transport and other services - separate section
    let otherServicesByType = new Map<string, { qty: number; price: number; arancel: number; total: number }>();
    let transportTotal = 0;
    let arancelesTotal = 0;
    let taxTotal = 0;

    invoices.forEach(invoice => {
      const invoiceCalc = calcInvoice(invoice);
      
      // Assume payment method based on some logic (you may need to adjust this)
      // For now, using random distribution as example
      const total = parseFloat(invoiceCalc.total);
     
     
      if(invoice.paymentMethods){
        if (invoice?.paymentMethods?.cash) {
          cashTotal += invoice?.paymentMethods?.cash;
        }
        if (invoice?.paymentMethods?.zelle) {
          zelleTotal += invoice?.paymentMethods?.zelle;
        }
         taxTotal += invoice?.taxAmount;
      }
      else{
        if(invoice.hasTax && invoice?.TaxPercent){
          zelleTotal += total;
          taxTotal += (invoice?.TaxPercent / 100) * total;
        }
        else{
          cashTotal += total;
        }
       
      }

      

      // Process products - handle both bulk and non-bulk cases
      invoice.products?.forEach(product => {
        const productType = product.product.label;
        const qty = Math.abs(product.qty);
        const total = parseFloat(totalSubProd(product));
        
        // Add bulk information to the product type if it exists
        let displayType = productType;
        if (product?.bulkId && invoice?.bulks) {
          const bulk = invoice?.bulks.find(b => b?.id === product?.bulkId);
          if (bulk) {
            displayType = `${productType} (${bulk?.name})`;
          }
        }
        
        if (productsByType.has(displayType)) {
          const existing = productsByType.get(displayType)!;
          productsByType.set(displayType, {
            qty: existing.qty + qty,
            total: existing.total + total
          });
        } else {
          productsByType.set(displayType, { qty, total });
        }
      });

      // Process reservas - handle both bulk and non-bulk cases
      invoice.reservas?.forEach(reserva => {
        const type = reserva.type;
        const qty = parseFloat(reserva.qty) || 0;
        const price = parseFloat(reserva.price) || 0;
        const arancel = parseFloat(reserva.arancel) || 0;
        const total = price * qty;

        // Determine shipping method from bulk
        let shippingMethod = 'SEA'; // Default to SEA
        let displayType = type;
        let bulkName = type;

        if (reserva?.bulkId && invoice?.bulks) {
          const bulk = invoice?.bulks.find(b => b?.id === reserva?.bulkId);
          if (bulk) {
            displayType = `${type}`;
            bulkName = bulk?.name;
            shippingMethod = bulk?.shippingMethod?.toUpperCase() || 'SEA';
          }
        }

        // Check if this type should be classified as miscellaneous
        if (isMiscellaneous(displayType)) {
          displayType = 'Misceláneo';
        }

        // Normalize shipping method
        const shippingKey = shippingMethod === 'AEREO' ? 'AEREO' : 'SEA';

        // Initialize shipping method map if it doesn't exist
        if (!reservasByShippingAndType.has(shippingKey)) {
          reservasByShippingAndType.set(shippingKey, new Map());
        }

        const reservasByType = reservasByShippingAndType.get(shippingKey)!;
        const key = displayType;

        if (reservasByType.has(key)) {
          const existing = reservasByType.get(key)!;

          // Update total quantities and amounts
          reservasByType.set(key, {
            qty: parseFloat((existing.qty + qty).toFixed(2)),
            price: existing.price, // Keep the first price as representative
            total: parseFloat((existing.total + total).toFixed(2)),
            priceGroups: existing.priceGroups
          });

          // Group quantities by price and track invoices
          const priceGroup = existing.priceGroups.get(price) || { qty: 0, invoices: [] };
          priceGroup.qty += qty;
          let InvId = `${type}-${bulkName}`;
          if (!priceGroup.invoices.includes(InvId)) {
            priceGroup.invoices.push(InvId);
          }
          existing.priceGroups.set(price, priceGroup);

        } else {
          const priceGroups = new Map<number, { qty: number; invoices: string[] }>();
          priceGroups.set(price, { qty, invoices: [invoice.invoice] });

          reservasByType.set(key, {
            qty,
            price,
            arancel,
            total,
            priceGroups
          });
        }

        arancelesTotal += arancel;
      });

      // Process services - handle both bulk and non-bulk cases
      invoice.services?.forEach(service => {
        const type = service.type;
        const qty = parseFloat(service.qty) || 0;
        const arancel = parseFloat(service.arancel) || 0;
        const total = qty * arancel; // Services use arancel as the total
        
        // Add bulk information to the service type if it exists
        let displayType = type;
        if (service.bulkId && invoice.bulks) {
          const bulk = invoice.bulks.find(b => b?.id === service?.bulkId);
          if (bulk) {
            displayType = `${type} (${bulk?.name})`;
          }
        }
        
        //transportTotal += total;
        
        // Add to other services tracking
        if (otherServicesByType.has(displayType)) {
          const existing = otherServicesByType.get(displayType)!;
          otherServicesByType.set(displayType, {
            qty: existing.qty + qty,
            arancel: existing.arancel + arancel,
            total: existing.total + total
          });
        } else {
          otherServicesByType.set(displayType, { qty, arancel, total });
        }
      });
    });

    // Calculate bulk statistics
    let bulkStatistics = new Map<string, { 
      count: number; 
      totalValue: number; 
      avgValue: number; 
      items: number;
      shippingMethod: string;
    }>();
    
    invoices.forEach(invoice => {
      if (invoice.bulks && invoice.bulks.length > 0) {
        invoice.bulks.forEach((bulk: any) => {
          const bulkProducts = invoice.products?.filter((p: any) => p.bulkId === bulk?.id) || [];
          const bulkReservas = invoice.reservas?.filter((r: any) => r.bulkId === bulk?.id) || [];
          const bulkServices = invoice.services?.filter((s: any) => s.bulkId === bulk?.id) || [];


          
          const bulkValue = [
            ...bulkProducts.map((p: any) => Math.abs(p.qty) * parseFloat(p.salePrice || 0)),
            ...bulkReservas.map((r: any) => parseFloat(r.qty || 0) * parseFloat(r.price || 0)),
            ...bulkServices.map((s: any) => parseFloat(s.qty || 0) * parseFloat(s.arancel || 0))
          ].reduce((sum, val) => sum + val, 0);
          
          transportTotal +=  (bulk?.transportCost || 20)

          const totalItems = bulkProducts.length + bulkReservas.length + bulkServices.length;
          
          const key = `${bulk?.type} - ${bulk?.shippingMethod?.toLowerCase() === 'aereo' ? 'Aéreo' : 'Marítimo'}`;
          
          if (bulkStatistics.has(key)) {
            const existing = bulkStatistics.get(key)!;
            bulkStatistics.set(key, {
              count: existing.count + 1,
              totalValue: existing.totalValue + bulkValue,
              avgValue: (existing.totalValue + bulkValue) / (existing.count + 1),
              items: existing.items + totalItems,
              shippingMethod: bulk?.shippingMethod
            });
          } else {
            bulkStatistics.set(key, {
              count: 1,
              totalValue: bulkValue,
              avgValue: bulkValue,
              items: totalItems,
              shippingMethod: bulk?.shippingMethod
            });
          }
        });
      }
    });

    // Calculate tax (assuming 10% of subtotal)
    const subtotal = cashTotal + zelleTotal + otherPaymentTotal;
    //taxTotal = subtotal * 0.1; // Adjust tax rate as needed

    const report = {
      dateRange: {
        from: dateFrom(),
        to: dateTo()
      },
      store: selectedStore(),
      shippingType: shippingType(),
      totalInvoices: invoices.length,

      // Payment methods
      paymentMethods: {
        cash: cashTotal,
        zelle: zelleTotal,
        other: otherPaymentTotal,
        total: cashTotal + zelleTotal + otherPaymentTotal
      },

      // Products breakdown
      productsByType,

      // Reservas breakdown - grouped by shipping method, then type and price
      reservasByShippingAndType,

      // Other services breakdown (transport, aranceles, etc.)
      otherServicesByType,

      // Bulk statistics
      bulkStatistics,

      // Additional totals
      transportTotal,
      arancelesTotal,
      taxTotal,

      // Grand totals
      grandTotal: subtotal + taxTotal
    };

    setReportData(report);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handlePrint = () => {
    // Add print-specific styling
   // document.body.classList.add('printing');
    handleExportPDF()
    setTimeout(() => {
     // window.print();
     // document.body.classList.remove('printing');
    }, 100);
  };

  const handleExportPDF = async () => {
    try {
      const reportData = report();
      
      if (reportData) {
        setGeneratingPDF(true);
        
        // Use the dedicated invoice resume PDF generator
        const { generateInvoiceResumePDF } = await import('../../../utils/invoiceResumePdfGenerator');
        
        const filename = `invoice-resume-report-${new Date().toISOString().split('T')[0]}.pdf`;
        await generateInvoiceResumePDF(reportData, t, filename);
        
        devLog(`PDF generated successfully: ${filename}`);
      }
    } catch (error) {
      devLog('Error generating PDF:', error);
      // Fallback to print
      alert(t('invoiceReport.pdfGenerationFailed'));
      handlePrint();
    } finally {
      setGeneratingPDF(false);
    }
  };

  const report = createMemo(() => reportData());

  return (
    <div style={{ padding: '2rem', 'max-width': '1200px', margin: '0 auto' }}>
      {/* Print Header - only visible in print */}
      <div class="print-only" style={{ 'text-align': 'center', 'margin-bottom': '2rem', 'border-bottom': '2px solid #333', 'padding-bottom': '1rem' }}>
        <h1>{t('invoiceReport.title')}</h1>
        <div style={{ 'font-size': '12pt', 'margin-top': '0.5rem', color: '#666' }}>
          <Show when={report()?.dateRange?.from && report()?.dateRange?.to}>
            {t('invoiceReport.reportPeriod')}: {report()?.dateRange?.from} to {report()?.dateRange?.to}
          </Show>
          <Show when={!report()?.dateRange?.from || !report()?.dateRange?.to}>
            {t('invoiceReport.allTimeReport')}
          </Show>
        </div>
        <div style={{ 'font-size': '10pt', 'margin-top': '0.5rem' }}>
          {t('invoiceReport.generatedOn')}: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Screen Header */}
      <div class="no-print" style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '2rem'
      }}>
        <h1 style={{ 'font-size': '1.75rem', 'font-weight': 'bold' }}>
          {t('invoiceReport.title')}
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="outline" onClick={handlePrint}>
            {t('invoiceReport.print')}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={generatingPDF()}>
            {generatingPDF() ? t('invoiceReport.generating') : t('invoiceReport.exportPdf')}
          </Button>
          <Show when={props.onClose}>
            <Button variant="secondary" onClick={props.onClose}>
              {t('invoiceReport.close')}
            </Button>
          </Show>
        </div>
      </div>

      {/* Filters */}
      <Card title={t('invoiceReport.filters')} style={{ 'margin-bottom': '2rem' }} class="no-print">
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          'align-items': 'end'
        }}>
          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              {t('invoiceReport.storeLocation')}
            </label>
            <select
              value={selectedStore()}
              onChange={(e) => setSelectedStore(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            >
              <option value="all">{t('invoiceReport.allStores')}</option>
              <For each={locations()}>
                {(location) => <option value={location.id}>{location.name}</option>}
              </For>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              {t('invoiceReport.fromDate')}
            </label>
            <input
              type="date"
              value={dateFrom()}
              onChange={(e) => setDateFrom(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              {t('invoiceReport.toDate')}
            </label>
            <input
              type="date"
              value={dateTo()}
              onChange={(e) => setDateTo(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              {t('invoiceReport.paymentMethod')}
            </label>
            <select
              value={paymentMethod()}
              onChange={(e) => setPaymentMethod(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            >
              <option value="all">{t('invoiceReport.allMethodsOption')}</option>
              <option value="cash">{t('invoiceReport.cashOption')}</option>
              <option value="zelle">{t('invoiceReport.zelleOption')}</option>
              <option value="other">{t('invoiceReport.otherOption')}</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              {t('invoiceReport.shippingType')}
            </label>
            <select
              value={shippingType()}
              onChange={(e) => setShippingType(e.currentTarget.value as 'all' | 'SEA' | 'AEREO')}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            >
              <option value="all">{t('invoiceReport.allTypesOption')}</option>
              <option value="SEA">{t('invoiceReport.seaOption')}</option>
              <option value="AEREO">{t('invoiceReport.airOption')}</option>
            </select>
          </div>
          <Show when={selectedStore() !== 'all'}>
            <Button variant="primary" onClick={loadReportData} disabled={selectedStore() === 'all' && loading()}>
              {loading() ? t('invoiceReport.loading') : t('invoiceReport.generateReport')}
            </Button>
          </Show>
        </div>
      </Card>

      <Show when={selectedStore() !== 'all' && report() && !loading()}>
        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          'margin-bottom': '2rem'
        }}>
          <Card title={t('invoiceReport.invoiceSummary')}>
            <div style={{ padding: '1rem' }}>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.totalInvoices')}:</strong> {report().totalInvoices}
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.dateRange')}:</strong> {report().dateRange.from || t('common.all')} {t('common.to')} {report().dateRange.to || t('common.all')}
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.store')}:</strong> {report().store === 'all' ? t('invoiceReport.allStores') : report().store}
              </div>
              <div>
                <strong>{t('invoiceReport.shippingTypeLabel')}:</strong> {
                  report().shippingType === 'all' ? t('invoiceReport.allTypes') : 
                  report().shippingType === 'SEA' ? t('invoiceReport.maritime') : 
                  report().shippingType === 'AEREO' ? t('invoiceReport.air') : t('invoiceReport.notSet')
                }
              </div>
            </div>
          </Card>

          <Card title={t('invoiceReport.paymentMethods')}>
            <div style={{ padding: '1rem' }}>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.cash')}:</strong> {formatCurrency(report().paymentMethods.cash)}
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.zelle')}:</strong> {formatCurrency(report().paymentMethods.zelle)}
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.other')}:</strong> {formatCurrency(report().paymentMethods.other)}
              </div>
              <div style={{ 'border-top': '1px solid var(--border-color)', 'padding-top': '0.5rem', 'font-weight': 'bold' }}>
                <strong>{t('invoiceReport.total')}:</strong> {formatCurrency(report().paymentMethods.total)}
              </div>
            </div>
          </Card>

          <Card title={t('invoiceReport.additionalCharges')}>
            <div style={{ padding: '1rem' }}>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.transport')}:</strong> {formatCurrency(report().transportTotal)}
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.aranceles')}:</strong> {formatCurrency(report().arancelesTotal)}
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>{t('invoiceReport.tax')}:</strong> {formatCurrency(report().taxTotal)}
              </div>
            </div>
          </Card>
        </div>

        {/* Products by Type */}
        <Show when={report().productsByType?.size > 0}>
          <Card title={t('invoiceReport.productsSummary')} style={{ 'margin-bottom': '2rem' }}>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--background-color)' }}>
                    <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '2px solid var(--border-color)' }}>
                      {t('invoiceReport.productType')}
                    </th>
                    <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                      {t('invoiceReport.quantity')}
                    </th>
                    <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                      {t('invoiceReport.totalValue')}
                    </th>
                    <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                      {t('invoiceReport.avgPrice')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Array.from(report().productsByType.entries()).sort((a, b) => b[1].total - a[1].total)}>
                    {([type, data]) => (
                      <tr>
                        <td style={{ padding: '0.75rem', 'border-bottom': '1px solid var(--border-color)' }}>
                          {type}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>
                          {data.qty}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', 'font-weight': '600' }}>
                          {formatCurrency(data.total)}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>
                          {formatCurrency(data.total / data.qty)}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Card>
        </Show>

        {/* Reservas by Shipping Method and Type */}
        <Show when={report().reservasByShippingAndType?.size > 0}>
          {/* Info note about miscellaneous grouping - only show if there's Misceláneo data */}
          <Show when={() => {
            let hasMisc = false;
            Array.from(report().reservasByShippingAndType.values()).forEach(reservasByType => {
              if (reservasByType.has('Misceláneo')) {
                hasMisc = true;
              }
            });
            return hasMisc;
          }}>
            <div style={{
              'margin-bottom': '1rem',
              padding: '1rem',
              background: 'rgba(255, 193, 7, 0.1)',
              border: '2px solid rgba(255, 193, 7, 0.3)',
              'border-radius': 'var(--border-radius-sm)',
              display: 'flex',
              'align-items': 'start',
              gap: '0.75rem'
            }}>
              <div style={{ 'font-size': '1.5rem' }}>🏷️</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem', color: '#856404' }}>
                  Agrupación Automática de "Misceláneo"
                </div>
                <div style={{ 'font-size': '0.875rem', color: '#856404' }}>
                  Los items que contienen palabras como <strong>comida, sapatos, aseo, medicina, medicamentos</strong> y similares
                  son agrupados automáticamente en la categoría <strong>"Misceláneo"</strong> para mejor organización del reporte.
                  Los tipos vacíos también se incluyen en esta categoría.
                </div>
              </div>
            </div>
          </Show>

          <For each={Array.from(report().reservasByShippingAndType.entries()).sort((a, b) => {
            // Sort: SEA first, then AEREO
            if (a[0] === 'SEA') return -1;
            if (b[0] === 'SEA') return 1;
            return 0;
          })}>
            {([shippingMethod, reservasByType]) => {
              const shippingIcon = shippingMethod === 'AEREO' ? '✈️' : '🚢';
              const shippingLabel = shippingMethod === 'AEREO' ? 'Aéreo' : 'Marítimo';

              // Calculate totals for this shipping method
              const shippingTotals = Array.from(reservasByType.values()).reduce(
                (acc, data) => ({
                  qty: acc.qty + data.qty,
                  total: acc.total + data.total
                }),
                { qty: 0, total: 0 }
              );

              return (
                <Card
                  title={`${shippingIcon} ${t('invoiceReport.reservasSummary')} - ${shippingLabel}`}
                  style={{ 'margin-bottom': '2rem' }}
                >
                  <div style={{ 'overflow-x': 'auto' }}>
                    <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--background-color)' }}>
                          <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '2px solid var(--border-color)' }}>
                            {t('invoiceReport.reservaType')}
                          </th>
                          <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                            {t('invoiceReport.totalQtyLbs')}
                          </th>
                          <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '2px solid var(--border-color)' }}>
                            {t('invoiceReport.priceGroups')}
                          </th>
                          <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                            {t('invoiceReport.total')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={Array.from(reservasByType.entries()).sort((a, b) => b[1].total - a[1].total)}>
                          {([type, data]) => {
                            const isMisc = type === 'Misceláneo';
                            const rowStyle = isMisc ? { background: 'rgba(255, 193, 7, 0.08)' } : {};

                            return (
                              <tr style={rowStyle}>
                                <td style={{ padding: '0.75rem', 'border-bottom': '1px solid var(--border-color)' }}>
                                  {isMisc ? '🏷️ ' : ''}{type}
                                </td>
                                <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', 'font-weight': '600' }}>
                                  {data.qty?.toFixed(2)}
                                </td>
                                <td style={{ padding: '0.75rem', 'border-bottom': '1px solid var(--border-color)' }}>
                                  <div style={{ 'font-size': '0.875rem' }}>
                                    <For each={Array.from(data.priceGroups.entries()).sort((a, b) => a[0] - b[0])}>
                                      {([price, priceData]) => (
                                        <div style={{
                                          'margin-bottom': '0.5rem',
                                          display: 'flex',
                                          'align-items': 'center',
                                          gap: '0.5rem'
                                        }}>
                                          <span>{formatCurrency(price)} → {priceData.qty?.toFixed(2)} lbs</span>
                                          <button
                                            style={{
                                              background: 'var(--blue-ribbon-500)',
                                              color: 'white',
                                              border: 'none',
                                              'border-radius': '4px',
                                              padding: '0.25rem 0.5rem',
                                              'font-size': '0.75rem',
                                              cursor: 'pointer',
                                              transition: 'background 0.2s'
                                            }}
                                            onClick={() => setSelectedPriceInvoices({
                                              price,
                                              invoices: priceData.invoices,
                                              type
                                            })}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--blue-ribbon-700)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--blue-ribbon-500)'}
                                          >
                                            📋 {priceData.invoices.length} invoice{priceData.invoices.length > 1 ? 's' : ''}
                                          </button>
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', 'font-weight': '600' }}>
                                  {formatCurrency(data.total)}
                                </td>
                              </tr>
                            );
                          }}
                        </For>

                        {/* Subtotal row for this shipping method */}
                        <tr style={{
                          background: shippingMethod === 'AEREO' ? 'rgba(108, 92, 231, 0.08)' : 'rgba(52, 152, 219, 0.08)',
                          'font-weight': 'bold'
                        }}>
                          <td style={{ padding: '0.75rem', 'border-top': '2px solid var(--border-color)' }}>
                            <strong>{shippingIcon} Total {shippingLabel}:</strong>
                          </td>
                          <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-top': '2px solid var(--border-color)', 'font-weight': '700' }}>
                            {shippingTotals.qty.toFixed(2)} lbs
                          </td>
                          <td style={{ padding: '0.75rem', 'border-top': '2px solid var(--border-color)' }}>
                            -
                          </td>
                          <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-top': '2px solid var(--border-color)', 'font-weight': '700' }}>
                            {formatCurrency(shippingTotals.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            }}
          </For>
        </Show>

        {/* Bulk Statistics Section */}
        <Show when={report().bulkStatistics?.size > 0}>
          <Card title="📦 Resumen de Bultos" style={{ 'margin-bottom': '2rem' }}>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--background-color)' }}>
                    <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '2px solid var(--border-color)' }}>
                      Tipo de Bulto
                    </th>
                    <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '2px solid var(--border-color)' }}>
                      Cantidad
                    </th>
                    <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '2px solid var(--border-color)' }}>
                      Items Totales
                    </th>
                    <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                      Valor Total
                    </th>
                    <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                      Valor Promedio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Array.from(report().bulkStatistics.entries()).sort((a, b) => b[1].totalValue - a[1].totalValue)}>
                    {([type, data]) => (
                      <tr>
                        <td style={{ padding: '0.75rem', 'border-bottom': '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                            <span>{data.shippingMethod === 'aereo' ? '✈️' : '🚢'}</span>
                            {type}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)', 'font-weight': '600' }}>
                          {data.count}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)' }}>
                          {data.items}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', 'font-weight': '600' }}>
                          {formatCurrency(data.totalValue)}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>
                          {formatCurrency(data.avgValue)}
                        </td>
                      </tr>
                    )}
                  </For>
                  
                  {/* Total row for bulks */}
                  <tr style={{ background: 'var(--strip-color)', 'font-weight': 'bold' }}>
                    <td style={{ padding: '0.75rem', 'border-top': '2px solid var(--border-color)' }}>
                      <strong>Total de Bultos:</strong>
                    </td>
                    <td style={{ padding: '0.75rem', 'text-align': 'center', 'border-top': '2px solid var(--border-color)', 'font-weight': '700' }}>
                      {Array.from(report().bulkStatistics.values()).reduce((sum, b) => sum + b.count, 0)}
                    </td>
                    <td style={{ padding: '0.75rem', 'text-align': 'center', 'border-top': '2px solid var(--border-color)', 'font-weight': '700' }}>
                      {Array.from(report().bulkStatistics.values()).reduce((sum, b) => sum + b.items, 0)}
                    </td>
                    <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-top': '2px solid var(--border-color)', 'font-weight': '700' }}>
                      {formatCurrency(Array.from(report().bulkStatistics.values()).reduce((sum, b) => sum + b.totalValue, 0))}
                    </td>
                    <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-top': '2px solid var(--border-color)' }}>
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </Show>

        {/* Other Services Section */}
        <Show when={report().otherServicesByType?.size > 0}>
          <Card title={t('invoiceReport.otherServicesTitle')} style={{ 'margin-bottom': '2rem' }}>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--background-color)' }}>
                    <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '2px solid var(--border-color)' }}>
                      {t('invoiceReport.serviceType')}
                    </th>
                    
                    <th style={{ padding: '1rem', 'text-align': 'right', 'border-bottom': '2px solid var(--border-color)' }}>
                      {t('invoiceReport.total')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Array.from(report().otherServicesByType.entries()).sort((a, b) => b[1].total - a[1].total)}>
                    {([type, data]) => (
                      <tr>
                        <td style={{ padding: '0.75rem', 'border-bottom': '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                          
                            {type}
                          </div>
                        </td>
                        
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', 'font-weight': '600' }}>
                          {formatCurrency(data.total)}
                        </td>
                      </tr>
                    )}
                  </For>
                  
                  {/* Total row for other services */}
                  <tr style={{ background: 'var(--strip-color)', 'font-weight': 'bold' }}>
                    <td colSpan={4} style={{ padding: '0.75rem', 'text-align': 'right', 'border-top': '2px solid var(--border-color)' }}>
                      <strong>{t('invoiceReport.totalOtherServices')}:</strong>
                    </td>
                    <td style={{ padding: '0.75rem', 'text-align': 'right', 'border-top': '2px solid var(--border-color)', 'font-weight': '700' }}>
                      {formatCurrency(report().transportTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </Show>

        {/* Grand Total */}
        <Card title={t('invoiceReport.totalSummary')}>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            padding: '2rem'
          }}>
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.5rem' }}>
                {t('invoiceReport.productsTotal')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(Array.from(report().productsByType.values()).reduce((sum, p) => sum + p.total, 0))}
              </div>
            </div>
            
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.5rem' }}>
                {t('invoiceReport.reservasTotal')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(
                  Array.from(report().reservasByShippingAndType.values()).reduce((sum, reservasByType) => {
                    return sum + Array.from(reservasByType.values()).reduce((innerSum, r) => innerSum + r.total, 0);
                  }, 0)
                )}
              </div>
            </div>
            
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.5rem' }}>
                {t('invoiceReport.transportServices')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(report().transportTotal)}
              </div>
            </div>
            
            <div style={{ 'text-align': 'center', 'border-left': '2px solid var(--primary-color)', 'padding-left': '2rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.5rem' }}>
                {t('invoiceReport.grandTotal')}
              </div>
              <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(report().paymentMethods.total)}
              </div>
            </div>
          </div>
        </Card>
      </Show>

      <Show when={loading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div style={{ 'font-size': '1.25rem', 'margin-bottom': '1rem' }}>
            {t('invoiceReport.generatingReport')}
          </div>
        </div>
      </Show>

      {/* Invoice Reference Modal */}
      <Show when={selectedPriceInvoices()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000
        }} onClick={() => setSelectedPriceInvoices(null)}>
          <div style={{
            background: 'white',
            padding: '2rem',
            'border-radius': 'var(--border-radius)',
            'max-width': '600px',
            'max-height': '80vh',
            'overflow-y': 'auto',
            'box-shadow': 'var(--shadow-lg)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem'
            }}>
              <h3 style={{ 'font-size': '1.25rem', 'font-weight': 'bold' }}>
                {t('invoiceReport.invoiceReferences')}
              </h3>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  'font-size': '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
                onClick={() => setSelectedPriceInvoices(null)}
              >
                ×
              </button>
            </div>
            
            <div style={{ 'margin-bottom': '1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                {t('invoiceReport.type')}: <strong>{selectedPriceInvoices()!.type}</strong>
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                {t('invoiceReport.pricePerPound')}: <strong>{formatCurrency(selectedPriceInvoices()!.price)}</strong>
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                {t('invoiceReport.totalInvoicesCount')}: <strong>{selectedPriceInvoices()!.invoices.length}</strong>
              </div>
            </div>

            <div style={{
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              padding: '1rem',
              background: 'var(--background-color)'
            }}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
                {t('invoiceReport.invoiceNumbers')}:
              </div>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '0.5rem'
              }}>
                <For each={selectedPriceInvoices()!.invoices}>
                  {(invoiceNumber) => (
                    <div style={{
                      padding: '0.5rem',
                      background: 'white',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-family': 'monospace',
                      'font-size': '0.875rem',
                      'text-align': 'center',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e3f2fd';
                      e.currentTarget.style.borderColor = '#2196f3';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                    onClick={() => {
                      // Find and display the specific invoice
                      const invoice = filteredInvoices().find(inv => inv.invoice === invoiceNumber);
                      if (invoice) {
                        devLog('Invoice details:', invoice);
                        // You could add navigation to the invoice here
                      }
                    }}
                    >
                      {invoiceNumber}
                    </div>
                  )}
                </For>
              </div>
            </div>

            <div style={{
              'margin-top': '1.5rem',
              display: 'flex',
              'justify-content': 'flex-end',
              gap: '1rem'
            }}>
              <Button
                variant="outline"
                onClick={() => {
                  // Copy invoice numbers to clipboard
                  const invoiceList = selectedPriceInvoices()!.invoices.join(', ');
                  navigator.clipboard.writeText(invoiceList).then(() => {
                    alert(t('invoiceReport.invoiceNumbersCopied'));
                  });
                }}
              >
                {t('invoiceReport.copyInvoiceNumbers')}
              </Button>
              <Button variant="primary" onClick={() => setSelectedPriceInvoices(null)}>
                {t('invoiceReport.close')}
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default InvoiceResumeReport;