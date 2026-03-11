import { Component, createSignal, createMemo, For, Show, JSX, onMount } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { inventoryApi } from '../../../services/apiAdapter';
import { HBL } from '../types';
import { printHBLLabels, printSelectedHBLLabels } from '../labels/printHBLLabels';
import { statusAllList } from '../status';
import { convertToCSV, downloadCSV } from '../../../utils/csvUtils';
import { devLog } from '../../../services/utils';

interface HBLListFilterProps {
  hbls: HBL[];
  guideFilter: string;
  onFilterChange?: (filteredHbls: HBL[]) => void;
  onHBLSelect?: (hbl: HBL) => void;
  customFecth?: () => void;
}

const HBLListFilter: Component<HBLListFilterProps> = (props) => {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal<string>('all');
  const [dateRange, setDateRange] = createSignal({ start: '', end: '' });
  const [shipperFilter, setShipperFilter] = createSignal('');
  const [consigneeFilter, setConsigneeFilter] = createSignal('');
  const [showAdvancedFilters, setShowAdvancedFilters] = createSignal(false);
  const [classificationFilter, setClassificationFilter] = createSignal<string>('all');
  const [selectedHBLs, setSelectedHBLs] = createSignal<Set<string>>(new Set());
  



  
  const filteredHBLs = createMemo(() => {
    let filtered = props.hbls;
    var term = ""
     if (searchTerm()) {
      term += searchTerm().toLowerCase();
     }

   


    // Search filter
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      filtered = filtered.filter(hbl => 
        hbl.hbl.toLowerCase().includes(term) ||
        hbl.idairguide.toLowerCase().includes(term) ||
        hbl.nameshipper.toLowerCase().includes(term) ||
        hbl.consigneeName.toLowerCase().includes(term) ||
        hbl.namegood.toLowerCase().includes(term) ||
        hbl.bagnumber.toLowerCase().includes(term) ||
        hbl.cidentity.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (statusFilter() !== 'all') {
      filtered = filtered.filter(hbl => hbl.idguidestate === statusFilter());
    }
   
    
    if (props?.guideFilter && props?.guideFilter !== 'all') {
      filtered = filtered.filter(hbl => hbl.guia === props?.guideFilter 
        
       // && !hbl.currentLocation
      );
    }
    // Classification filter
    if (classificationFilter() !== 'all') {
      filtered = filtered.filter(hbl => hbl.idclasification === classificationFilter());
    }
    
    // Date range filter
    if (dateRange().start || dateRange().end) {
      filtered = filtered.filter(hbl => {
        const hblDate = new Date(hbl.datereserve);
        const startDate = dateRange().start ? new Date(dateRange().start) : new Date('1900-01-01');
        const endDate = dateRange().end ? new Date(dateRange().end) : new Date('2100-12-31');
        return hblDate >= startDate && hblDate <= endDate;
      });
    }
    
    // Shipper filter
    if (shipperFilter()) {
      filtered = filtered?.filter(hbl => 
        hbl.nameshipper.toLowerCase().includes(shipperFilter().toLowerCase())
      );
    }
    
    // Consignee filter
    if (consigneeFilter()) {
      filtered = filtered?.filter(hbl => 
        hbl.consigneeName.toLowerCase().includes(consigneeFilter().toLowerCase())
      );
    }
    
   
    
    // Sort by date (newest first)
    filtered = filtered?.sort((a, b) => 
      new Date(b.datereserve).getTime() - new Date(a.datereserve).getTime()
    );
    
    // Notify parent component
    props.onFilterChange?.(filtered);
    
    return filtered;
  });
  
  const uniqueShippers = createMemo(() => {
    const shippers = new Set(props.hbls.map(hbl => hbl.nameshipper));
    return Array.from(shippers).sort();
  });
  
  const uniqueConsignees = createMemo(() => {
    const consignees = new Set(props.hbls.map(hbl => hbl.consigneeName));
    return Array.from(consignees).sort();
  });
  
  const uniqueStatuses = createMemo(() => {
    const statuses = new Set(props.hbls.map(hbl => hbl.idguidestate));
    return Array.from(statuses).sort();
  });
  
  const uniqueClassifications = createMemo(() => {
    const classifications = new Set(props.hbls.map(hbl => hbl.idclasification));
    return Array.from(classifications).sort();
  });
  

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setShipperFilter('');
    setConsigneeFilter('');
    setClassificationFilter('all');
  };

  const toggleHBLSelection = (hblId: string) => {
    const newSelection = new Set(selectedHBLs());
    if (newSelection.has(hblId)) {
      newSelection.delete(hblId);
    } else {
      newSelection.add(hblId);
    }
    setSelectedHBLs(newSelection);
  };

  const selectAllHBLs = () => {
    const allIds = filteredHBLs().map(hbl => hbl.referenceHId || hbl.hbl);
    setSelectedHBLs(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedHBLs(new Set());
  };

  const handlePrintSelectedLabels = () => {
    printSelectedHBLLabels(filteredHBLs(), selectedHBLs());
  };

  const handlePrintAllLabels = () => {
    if (filteredHBLs().length === 0) {
      alert('No hay HBLs para imprimir etiquetas');
      return;
    }
    printHBLLabels(filteredHBLs());
  };
  
  const exportToCSV = () => {
    const headers = [
      'HBL Number',
      'Air Guide',
      'Status',
      'Classification',
      'Shipper',
      'Consignee',
      'Identity',
      'Phone',
      'City',
      'Commodity',
      'Weight (kg)',
      'Quantity',
      'Bag Number',
      'Reserve Date'
    ];
    
    const rows = filteredHBLs().map(hbl => [
      hbl.hbl,
      hbl.idairguide,
      hbl.idguidestate,
      hbl.idclasification,
      hbl.nameshipper,
      hbl.consigneeName,
      hbl.cidentity,
      hbl.phoneshipper,
      hbl.address.city,
      hbl.namegood,
      hbl.weight,
      hbl.quantity,
      hbl.bagnumber,
      new Date(hbl.datereserve).toLocaleDateString()
    ]);
    
    // Use CSV utility that properly handles commas, quotes, and special characters
    const csvContent = convertToCSV(rows, headers);
    downloadCSV(csvContent, `HBL_List_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const exportToExcel = () => {
    // For Excel export, we'll create a CSV with Excel-friendly formatting
    const headers = [
      'HBL Number',
      'Air Guide',
      'Air Number',
      'Status',
      'Classification',
      'Shipper',
      'Consignee',
      'Identity',
      'Shipper Phone',
      'Consignee Phone',
      'Street',
      'City',
      'State',
      'Commodity',
      'Weight (kg)',
      'Quantity',
      'Bag Number',
      'Agency',
      'Guide',
      'Reserve Date'
    ];
    
    const rows22 = filteredHBLs().map(hbl => [
      hbl.hbl,
      hbl.idairguide,
      hbl.idairnumber,
      hbl.idguidestate,
      hbl.idclasification,
      hbl.nameshipper,
      hbl.consigneeName,
      hbl.cidentity,
      hbl.phoneshipper,
      hbl.ctelephone,
      hbl.street,
      hbl.address.city,
      hbl.address.estate,
      hbl.namegood,
      hbl.weight,
      hbl.quantity,
      hbl.bagnumber,
      hbl.agency,
      hbl.guia,
      new Date(hbl.datereserve).toLocaleDateString()
    ]);

    const rows = filteredHBLs().map(hbl => [
      hbl.hbl,
      hbl.idclasification,

      hbl.idairguide,
      hbl.idairnumber,
      hbl.idguidestate,
      
      hbl.nameshipper,
      hbl.consigneeName,
      hbl.cidentity,
      hbl.phoneshipper,
      hbl.ctelephone,
      hbl.street,
      hbl.address.city,
      hbl.address.estate,
      hbl.namegood,
      hbl.weight,
      hbl.quantity,
      hbl.bagnumber,
      hbl.agency,
      hbl.guia,
      new Date(hbl.datereserve).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HBL_List_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const printList = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('House Bill of Lading List', 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
    
    // Add filters info
    doc.setFontSize(10);
    let yPos = 35;
    if (searchTerm()) {
      doc.text(`Search: ${searchTerm()}`, 14, yPos);
      yPos += 5;
    }
    if (statusFilter() !== 'all') {
      doc.text(`Status: ${statusFilter()}`, 14, yPos);
      yPos += 5;
    }
    
    // Prepare table data
    const tableHeaders = [
      'HBL#',
      'Status',
      'Shipper',
      'Consignee',
      'City',
      'Weight',
      'Commodity'
    ];
    
    const tableData = filteredHBLs().map(hbl => [
      hbl.hbl,
      hbl.idguidestate,
      hbl.nameshipper.substring(0, 20) + (hbl.nameshipper.length > 20 ? '...' : ''),
      hbl.consigneeName.substring(0, 20) + (hbl.consigneeName.length > 20 ? '...' : ''),
      hbl.address.city,
      hbl.weight + ' kg',
      hbl.namegood.substring(0, 15) + (hbl.namegood.length > 15 ? '...' : '')
    ]);
    
    // Add table
    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: yPos + 5,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 123, 255] }
    });
    
    // Save the PDF
    doc.save(`HBL_List_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'EN BODEGA': '#17a2b8',
      'ENVIADO': '#007bff',
      'ENTREGADO': '#28a745',
      'CANCELADO': '#dc3545',
      'PENDIENTE': '#ffc107'
    };
    return colors[status] || '#6c757d';
  };




   const selectedStatus = (v:string) => {
      return statusAllList.find(status => status.id === v);
    };

 
  return (
    <div>
      <Card>
        <div style={{ padding: '1rem' }}>
           
          <div style={{ 
            display: 'grid', 
            'grid-template-columns': '1fr auto', 
            gap: '1rem',
            'margin-bottom': '1rem'
          }}>
              
            <FormInput
              type="text"
              placeholder={t('hbl.searchPlaceholder', 'Search by HBL#, air guide, shipper, consignee, commodity, bag#, identity...')}
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
            />
            

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters())}
              >
                {showAdvancedFilters() ? t('common.hideFilters', 'Hide Filters') : t('common.showFilters', 'Show Filters')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                {t('common.clearFilters', 'Clear Filters')}
              </Button>
            </div>
          </div>
         
          
          <Show when={showAdvancedFilters()}>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'margin-bottom': '1rem',
              padding: '1rem',
              background: 'var(--background-color)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('common.status', 'Status')}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={statusFilter()}
                  onChange={(e) => setStatusFilter(e.currentTarget.value)}
                >
                  <option value="all">{t('common.all', 'All')}</option>
                  <For each={uniqueStatuses()}>
                    {(status) => <option value={status}>{status}</option>}
                  </For>
                </select>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('hbl.classification', 'Classification')}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={classificationFilter()}
                  onChange={(e) => setClassificationFilter(e.currentTarget.value)}
                >
                  <option value="all">{t('common.all', 'All')}</option>
                  <For each={uniqueClassifications()}>
                    {(classification) => <option value={classification}>{classification}</option>}
                  </For>
                </select>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('hbl.shipper', 'Shipper')}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={shipperFilter()}
                  onChange={(e) => setShipperFilter(e.currentTarget.value)}
                >
                  <option value="">{t('common.all', 'All')}</option>
                  <For each={uniqueShippers()}>
                    {(shipper) => <option value={shipper}>{shipper}</option>}
                  </For>
                </select>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('hbl.consignee', 'Consignee')}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={consigneeFilter()}
                  onChange={(e) => setConsigneeFilter(e.currentTarget.value)}
                >
                  <option value="">{t('common.all', 'All')}</option>
                  <For each={uniqueConsignees()}>
                    {(consignee) => <option value={consignee}>{consignee}</option>}
                  </For>
                </select>
              </div>
              
              <div>
                <label 
                  style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('common.dateFrom', 'Date From')}
                </label>
                <FormInput
                  type="date"
                  value={dateRange().start}
                  onInput={(e) => setDateRange({ ...dateRange(), start: e.currentTarget.value })}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('common.dateTo', 'Date To')}
                </label>
                <FormInput
                  type="date"
                  value={dateRange().end}
                  onInput={(e) => setDateRange({ ...dateRange(), end: e.currentTarget.value })}
                />
              </div>
              
          
            </div>
          </Show>
          
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '1rem'
          }}>
            <div style={{
              'font-size': '0.875rem',
              color: 'var(--text-muted)'
            }}>
              {t('common.showing', 'Showing')} {filteredHBLs().length} {t('common.of', 'of')} {props.hbls.length} {t('hbl.records', 'records')}
              <Show when={selectedHBLs().size > 0}>
                <span style={{
                  'margin-left': '1rem',
                  color: 'var(--primary-color)',
                  'font-weight': '600'
                }}>
                  ({selectedHBLs().size} {t('common.selected', 'selected')})
                </span>
              </Show>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Show when={filteredHBLs().length > 0}>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handlePrintAllLabels}
                >
                  🏷️ {t('hbl.printLabels', 'Print Labels')} ({filteredHBLs().length})
                </Button>
              </Show>
              <Button
                variant="outline"
                size="sm"
                onClick={printList}
              >
                {t('common.print', 'Print')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                {t('common.exportCSV', 'Export CSV')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
              >
                {t('common.exportExcel', 'Export Excel')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      <Show when={selectedHBLs().size > 0}>
        <Card style={{
          'margin-top': '1rem',
          background: 'var(--primary-color)',
          color: 'white'
        }}>
          <div style={{
            padding: '1rem',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <span style={{ 'font-weight': '600' }}>
              ✓ {selectedHBLs().size} HBL(s) {t('common.selected', 'selected')}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  color: 'var(--primary-color)',
                  border: 'none',
                  'border-radius': 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  'font-weight': '500',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}
                onClick={handlePrintSelectedLabels}
              >
                🏷️ {t('hbl.printLabels', 'Print Labels')} ({selectedHBLs().size})
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid white',
                  'border-radius': 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  'font-weight': '500'
                }}
                onClick={clearSelection}
              >
                {t('common.clearSelection', 'Clear Selection')}
              </button>
            </div>
          </div>
        </Card>
      </Show>

      <div style={{ 'margin-top': '1rem' }}>
        <For each={filteredHBLs()}>
          {(hbl) => (
            <Card style={{ 'margin-bottom': '0.5rem' }}>
              <div
                style={{
                  padding: '1rem',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'auto 150px 1fr auto',
                  gap: '1rem',
                  'align-items': 'center'
                }}>
                  {/* Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedHBLs().has(hbl.referenceHId || hbl.hbl)}
                      onChange={() => toggleHBLSelection(hbl.referenceHId || hbl.hbl)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* HBL Number */}
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => props.onHBLSelect?.(hbl)}
                  >
                    <div style={{
                      'font-weight': '600',
                      color: 'var(--primary-color)'
                    }}>
                      {hbl.hbl}
                    </div>
                    
                    <div style={{
                      'font-size': '0.75rem',
                      
                      "font-weight": "bold"
                    }}>
                      {hbl.bagnumber}
                    </div>
                    <div style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      {hbl.idairguide}
                    </div>
                  </div>
                  
                  {/* Shipper and Consignee */}
                  <div
                    style={{
                      display: 'grid',
                      'grid-template-columns': '1fr 1fr',
                      gap: '1rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => props.onHBLSelect?.(hbl)}
                  >
                    <div>
                      <div style={{
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        {t('hbl.shipper', 'Shipper')}
                      </div>
                      <div style={{ 'font-weight': '500' }}>{hbl.nameshipper}</div>
                    </div>
                    <div>
                      <div style={{
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        {t('hbl.consignee', 'Consignee')}
                      </div>
                      <div style={{ 'font-weight': '500' }}>{hbl.consigneeName || hbl.nameconsignee}</div>
                    </div>
                  </div>
                  
                  <div style={{ 'text-align': 'right' }}>
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', 'align-items': 'flex-end' }}>
                      <a href={`/#/hbl-scan-location?hbl=${hbl.hbl}`}>
                       
                        <div style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          'border-radius': 'var(--border-radius-sm)',
                          'font-size': '0.75rem',
                          'font-weight': '500',
                          color: 'white',
                          'background-color': getStatusColor(hbl.idguidestate)
                        }}>
                          {hbl.bagnumber}
                        </div>
                         
                      </a>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        
                        <button
                          style={{
                            padding: '0.25rem 0.5rem',
                            'font-size': '0.75rem',
                            background: 'var(--success-color, #28a745)',
                            color: 'white',
                            border: 'none',
                            'border-radius': 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.25rem'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            printHBLLabels([hbl]);
                          }}
                          title={t('hbl.printLabel', 'Print 2.3x4 inch label')}
                        >
                          🏷️ {t('hbl.label', 'Label')}
                        </button>
                        
                        <button
                          style={{
                            padding: '0.25rem 0.5rem',
                            'font-size': '0.75rem',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            'border-radius': 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.25rem'
                          }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            
                            if (confirm(`¿Está seguro que desea eliminar el HBL ${hbl.hbl}?`)) {
                              try {
                                devLog('Deleting HBL:', hbl.hbl);
                                
                                const response = await inventoryApi.deleteHBL(hbl.id, hbl.guia);
                                
                                if (response?.success) {
                                  devLog('HBL deleted successfully');
                                  alert('HBL eliminado exitosamente');
                                  // Optionally refresh the list or remove from UI
                                  //window.location.reload();
                                } else {
                                  throw new Error(response?.message || 'Error al eliminar HBL');
                                }
                              } catch (error) {
                                devLog('Error deleting HBL:', error);
                                alert('Error al eliminar HBL: ' + error.message);
                              }
                            }
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  
                    <div style={{ 
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'margin-top': '0.25rem'
                    }}>
                      {formatDate(hbl.datereserve)}
                    </div>
                   
                  </div>
                </div>
                
                <div style={{ 
                  'margin-top': '0.75rem',
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.5rem',
                  'font-size': '0.875rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('hbl.id', 'ID')}: </span>
                    <span style={{ 'font-weight': '500' }}>{hbl.cidentity}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('hbl.agency', 'Agencia')}: </span>
                    <span style={{ 'font-weight': '500' }}>{hbl.agency}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('hbl.guideNo', 'Guide No.')}: </span>
                    <span style={{ 'font-weight': '500' }}>{hbl.guia}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('hbl.location', 'Locacion')}: </span>
                    <span style={{ 'font-weight': '500' }}>{selectedStatus(hbl?.currentLocation)?.label}</span>
                  </div>
                  
                </div>
                <div style={{ 
                  'margin-top': '0.75rem',
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.5rem',
                  'font-size': '0.875rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('hbl.commodity', 'Commodity')}: </span>
                    <span style={{ 'font-weight': '500' }}>{hbl.namegood}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('hbl.weight', 'Weight')}: </span>
                    <span style={{ 'font-weight': '500' }}>{hbl.weight} kg</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </For>
      </div>
    </div>
  );
};

export default HBLListFilter;