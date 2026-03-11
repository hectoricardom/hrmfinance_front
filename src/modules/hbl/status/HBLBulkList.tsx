import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import { parseAndUpdateHBLs, statusAllList, BulkUpdateResponse } from './hblUpdateService';
import { parseHBLNumbers } from '../data/hblParser';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryApi } from '../../../services/apiAdapter';
import { printHBLList, exportHBLListToCSV, export3HBLListToCSV } from '../list/printHBLList';
import { sortBy, devLog } from '../../../services/utils';

interface HBLBulkListProps {
  onClose?: () => void;
  onSuccess?: (response: BulkUpdateResponse) => void;
}

const HBLBulkList: Component<HBLBulkListProps> = (props) => {
  const { t } = useTranslation();
  const [inputText, setInputText] = createSignal('');
  const [selectedStatus, setSelectedStatus] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [parsedHBLs, setParsedHBLs] = createSignal<string[]>([]);
  const [hblsList, setHblsList] = createSignal<any[]>([]);
  const [selectedHBLs, setSelectedHBLs] = createSignal<Set<string>>(new Set());
  const [loading, setLoading] = createSignal(false);
  const [response, setResponse] = createSignal<BulkUpdateResponse | null>(null);


  const [guideFilter, setGuideFilter] = createSignal<string>('all');
  
  const uniqueGuides = createMemo(() => {
    const guides = new Set([2518,2519, 2520, 2521, 2522, 2523, 2524, 2525].map(hbl => hbl));
    return Array.from(guides).sort((a, b) => a - b);
  });

  const handleGuideChange = (filtered: any) => {
    setGuideFilter(filtered);
  };
  
  const handleParseText = async () => {
    const hbls = parseHBLNumbers(inputText());
    let tr = await inventoryApi.seahblsByMultIds(hbls, {guia: guideFilter()})
   
    
    const parsF=(itm: any)=>{
      let bagnumber = ""

      bagm.map(bg=>{
        if(bg.hbls.includes(itm.hbl)){
          const bgn = bg.bulk.replace(/[\t\n]+/g, '').trim();
          bagnumber = bgn;
        }
      })
      return {...itm}
    }

    let arry =  sortBy(tr,"bagnumber")



    devLog('arry:', arry)


    let pp = tr.reduce((sum, hbl) => sum + parseInt(hbl.weight || '0'), 0)
    devLog('Fetched HBLs:', pp, tr)

    
    if (arry && Array.isArray(arry)) {
      setHblsList(arry);
    } else {
      setHblsList([]);
    }
    
    setParsedHBLs(hbls);
  };

  const toggleHBLSelection = (hblId: string) => {
    const selected = new Set(selectedHBLs());
    if (selected.has(hblId)) {
      selected.delete(hblId);
    } else {
      selected.add(hblId);
    }
    setSelectedHBLs(selected);
  };

  const toggleSelectAll = () => {
    const allSelected = selectedHBLs().size === hblsList().length;
    if (allSelected) {
      setSelectedHBLs(new Set());
    } else {
      setSelectedHBLs(new Set(hblsList().map(hbl => hbl.hbl)));
    }
  };

  const formatAddress = (hbl: any) => {
    if (hbl.address) {
      return `${hbl.address.streetName || ''} ${hbl.address.streetNo || ''}, ${hbl.address.city || ''}, ${hbl.address.estate || ''}`.trim();
    }
    return hbl.street || '';
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'PENDIENTE': '#ffc107',
      'EN BODEGA': '#28a745',
      'ENVIADA': '#17a2b8',
      'ENTREGADO': '#007bff',
      'DEVUELTO': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  };

  // Get the air guide from the first HBL (they should all have the same air guide)
  const getAirGuide = () => {
    const firstHBL = hblsList()[0];
    return firstHBL?.idairguide || firstHBL?.idairnumber || `Guide-${guideFilter()}`;
  };

  const handlePrintSelected = () => {
    const selected = hblsList().filter(hbl => selectedHBLs().has(hbl.hbl));
    if (selected.length === 0) {
      alert(t('hbl.selectAtLeastOne', 'Please select at least one HBL to print'));
      return;
    }
    
    const airGuide = getAirGuide();
    const title = `Guía Aérea: ${airGuide} - Lista HBL (${selected.length} elementos)`;
    printHBLList(selected, title);
  };

  const handleExportSelected = () => {
    const selected = hblsList().filter(hbl => selectedHBLs().has(hbl.hbl));
    if (selected.length === 0) {
      alert(t('hbl.selectAtLeastOne', 'Please select at least one HBL to export'));
      return;
    }
    
    const airGuide = getAirGuide();
    const filename = `air_guide_${airGuide.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    exportHBLListToCSV(selected, filename);
  };

  const handlePrintAll = () => {
    if (hblsList().length === 0) {
      alert(t('hbl.noHBLsLoaded', 'No HBLs loaded to print'));
      return;
    }
    
   
    const title = `Lista HBL Completa (${hblsList().length} elementos)`;
    //printHBLList(hblsList(), title);

    export3HBLListToCSV(hblsList());
  };

  const handleExportAll = () => {
    if (hblsList().length === 0) {
      alert(t('hbl.noHBLsLoaded', 'No HBLs loaded to export'));
      return;
    }

    
    const airGuide = getAirGuide();
    const filename = `air_guide_${airGuide.replace(/[^a-zA-Z0-9]/g, '_')}_complete_${new Date().toISOString().split('T')[0]}.csv`;
    
    
    
    exportHBLListToCSV(hblsList(), filename);
  };

  const handleUpdateStatuses = async () => {
    if (!selectedStatus() || selectedHBLs().size === 0) {
      alert(t('hbl.bulkUpdate.selectStatusAndHBLs', 'Please select a status and at least one HBL'));
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      // Create a text string with only selected HBLs
      const selectedHBLText = Array.from(selectedHBLs()).join('\n');
      
      const result = await parseAndUpdateHBLs(
        selectedHBLText,
        selectedStatus(),
        notes() || undefined
      );
      
      setResponse(result);
      
      // Refresh the HBL list after update to show new statuses
      if (result.totalSuccess > 0) {
        const hbls = parseHBLNumbers(inputText());
        const updatedList = await inventoryApi.hblsByMultIds(hbls, {guia: guideFilter()});
        if (updatedList && Array.isArray(updatedList)) {
          setHblsList(updatedList);
        }
      }
      
      if (props.onSuccess && result.totalSuccess > 0) {
        props.onSuccess(result);
      }
    } catch (error) {
      devLog('Error updating HBL statuses:', error);
      alert(t('hbl.bulkUpdate.error', 'Error updating HBL statuses. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInputText('');
    setSelectedStatus('');
    setNotes('');
    setParsedHBLs([]);
    setHblsList([]);
    setSelectedHBLs(new Set());
    setResponse(null);
  };


   

  const textareaStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease',
    resize: 'vertical' as const,
    'min-height': '120px'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease'
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const containerStyle = {
    'margin-bottom': '1rem'
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }} aria-container='Bulk HBL Status Update'>
        <h2 style={{ 
          'font-size': '1.5rem', 
          'font-weight': '600', 
          'margin-bottom': '1.5rem',
          color: 'var(--text-primary)'
        }}>
          {t('hbl.bulkUpdate.title', 'Bulk HBL Status Update')}
        </h2>
        
        <div style={{ width: '13rem', margin: '1rem' }}>
            <label style={{ 
              display: 'block', 
              'margin-bottom': '0.25rem',
              'font-size': '0.875rem',
              color: 'var(--text-muted)'
            }}>
              {t('hbl.guideNumber', 'Guide Number')}
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                background: 'var(--surface-color)'
              }}
              value={guideFilter()}
              onChange={(e) => handleGuideChange(e.currentTarget.value)}
            >
              <option value="all">{t('common.all', 'All')}</option>
              <For each={uniqueGuides()}>
                {(guide) => <option value={guide}>{t('hbl.guideNo', 'Guide No.')} {guide}</option>}
              </For>
            </select>
          </div>
        <div>
        {/* Text Input Area */}
        <div style={containerStyle}>
            <label style={labelStyle}>
              {t('hbl.bulkUpdate.inputLabel', 'Enter text containing HBL numbers (format: 230XXXXXX)')}
            </label>
            <textarea
              style={textareaStyle}
              value={inputText()}
              onInput={(e) => setInputText(e.currentTarget.value)}
              placeholder={t('hbl.bulkUpdate.placeholder', 'Paste text here. HBL numbers matching 230XXXXXX will be extracted automatically.')}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
            <div style={{ 'margin-top': '0.75rem' }}>
              <Button onClick={handleParseText} variant="secondary" size="sm">
                {t('hbl.bulkUpdate.parseButton', 'Parse HBLs')}
              </Button>
            </div>
          </div>

          {/* Parsed HBLs Display */}
          <Show when={parsedHBLs().length > 0}>
            <div style={containerStyle}>
              <h3 style={{
                'font-size': '1.125rem',
                'font-weight': '500',
                'margin-bottom': '0.75rem',
                color: 'var(--text-primary)'
              }}>
                {t('hbl.bulkUpdate.found', 'Found')} {parsedHBLs().length} HBL(s):
              </h3>
              <div style={{
                background: 'var(--gray-50)',
                padding: '0.75rem',
                'border-radius': 'var(--border-radius-sm)',
                'max-height': '8rem',
                'overflow-y': 'auto'
              }}>
                <div style={{
                  display: 'flex',
                  'flex-wrap': 'wrap',
                  gap: '0.5rem'
                }}>
                  <For each={parsedHBLs()}>
                    {(hbl) => (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: 'var(--primary-light)',
                        color: '#ffffff',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem',
                        'font-weight': '500'
                      }}>
                        {hbl}
                      </span>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Show>

          {/* HBL List Display */}
          <Show when={hblsList().length > 0}>
            <div style={containerStyle}>
              {/* Air Guide Info */}
              <div style={{
                background: 'var(--info-background)',
                border: '1px solid var(--info-border)',
                'border-radius': 'var(--border-radius-sm)',
                padding: '0.75rem 1rem',
                'margin-bottom': '1rem',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                <span style={{ 'font-size': '1.2rem' }}>✈️</span>
                <div>
                  <span style={{ 
                    'font-weight': '600',
                    color: 'var(--info-text)'
                  }}>
                    {t('hbl.airGuide', 'Air Guide')}: {getAirGuide()}
                  </span>
                  <span style={{ 
                    'margin-left': '1rem',
                    'font-size': '0.875rem',
                    color: 'var(--info-text-muted)'
                  }}>
                    {t('hbl.guide', 'Guide')}: {guideFilter() !== 'all' ? guideFilter() : 'All Guides'}
                  </span>
                </div>
              </div>

              <div style={{ 
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1rem'
              }}>
                <h3 style={{
                  'font-size': '1.125rem',
                  'font-weight': '500',
                  color: 'var(--text-primary)'
                }}>
                  {t('hbl.bulkList.loaded', 'Loaded HBLs')} ({hblsList().length})
                </h3>
                
                <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleSelectAll}
                  >
                    {selectedHBLs().size === hblsList().length ? 
                      t('hbl.deselectAll', 'Deselect All') : 
                      t('hbl.selectAll', 'Select All')
                    }
                  </Button>
                  
                  <span style={{ 
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)',
                    'align-self': 'center'
                  }}>
                    {t('hbl.selected', 'Selected')}: {selectedHBLs().size}
                  </span>
                </div>
              </div>

              {/* Print and Export Actions */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                'margin-bottom': '1rem',
                'flex-wrap': 'wrap'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem',
                  'align-items': 'center'
                }}>
                  <span style={{ 
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    color: 'var(--text-muted)'
                  }}>
                    {t('hbl.selectedActions', 'Selected')} ({selectedHBLs().size}):
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrintSelected}
                    disabled={selectedHBLs().size === 0}
                    style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}
                  >
                    🖨️ {t('hbl.printSelected', 'Print')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportSelected}
                    disabled={selectedHBLs().size === 0}
                    style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}
                  >
                    📊 {t('hbl.exportSelected', 'Export')}
                  </Button>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem',
                  'align-items': 'center',
                  'margin-left': '1rem'
                }}>
                  <span style={{ 
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    color: 'var(--text-muted)'
                  }}>
                    {t('hbl.allActions', 'All')} ({hblsList().length}):
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrintAll}
                    style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}
                  >
                    🖨️ {t('hbl.printAll', 'Print All')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportAll}
                    style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}
                  >
                    📊 {t('hbl.exportAll', 'Export All')}
                  </Button>
                </div>
              </div>

              <div style={{
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                overflow: 'hidden',
                'max-height': '400px',
                'overflow-y': 'auto'
              }}>
                {/* Header */}
                <div style={{ 
                  display: 'grid',
                  'grid-template-columns': '30px 120px 280px 300px 80px 100px 100px',
                  gap: '0.5rem',
                  'align-items': 'center',
                  'font-weight': '600',
                  'font-size': '0.875rem',
                  padding: '0.75rem 0.5rem',
                  background: 'var(--gray-100)',
                  'border-bottom': '1px solid var(--border-color)'
                }}>
                  <div>✓</div>
                  <div>HBL #</div>
                  <div>Consignee</div>
                  <div>Address</div>
                  <div>Weight</div>
                  <div>Bulto</div>
                  <div>Date</div>
                </div>

                {/* Rows */}
                <For each={hblsList()}>
                  {(hbl) => (
                    <div style={{ 
                      display: 'grid',
                      'grid-template-columns': '30px 120px 280px 300px 80px 100px 100px',
                      gap: '0.5rem',
                      'align-items': 'center',
                      padding: '0.75rem 0.5rem',
                      'border-bottom': '1px solid var(--border-color)',
                      'font-size': '0.875rem',
                      background: selectedHBLs().has(hbl.hbl) ? 'var(--primary-light-bg)' : 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleHBLSelection(hbl.hbl)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedHBLs().has(hbl.hbl)}
                        onChange={() => toggleHBLSelection(hbl.hbl)}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div style={{ 
                        'font-weight': '600',
                        color: 'var(--primary-color)',
                        'font-size': '0.8rem'
                      }}>
                        {hbl.hbl}
                      </div>
                      
                      <div>
                        <div style={{ 
                          'font-weight': '500',
                          'font-size': '0.8rem',
                          'line-height': '1.2'
                        }}>
                          {hbl.consigneeName}
                        </div>
                        <div style={{ 
                          'font-size': '0.7rem',
                          color: 'var(--text-muted)'
                        }}>
                          ID: {hbl.cidentity}
                        </div>
                      </div>
                      
                      <div style={{ 
                        'font-size': '0.75rem',
                        'line-height': '1.3',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis'
                      }}>
                        {formatAddress(hbl)}
                      </div>
                      
                      <div style={{ 
                        'text-align': 'right',
                        'font-weight': '500'
                      }}>
                        {hbl.weight} kg
                      </div>
                      
                      <div>
                        <span style={{ 
                          padding: '0.25rem 0.5rem',
                          'border-radius': 'var(--border-radius-sm)',
                          background: getStatusColor(hbl.idguidestate),
                          color: 'white',
                          'font-size': '0.7rem',
                          'font-weight': '500',
                          'white-space': 'nowrap'
                        }}>
                          {hbl.bagnumber}
                        </span>
                      </div>
                      
                      <div style={{ 'font-size': '0.75rem' }}>
                        {new Date(hbl.datereserve).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
     
          {/* Results Display */}
          <Show when={response()}>
            {(resp) => (
              <div style={{
                'margin-top': '1.5rem',
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h3 style={{
                  'font-size': '1.125rem',
                  'font-weight': '500',
                  'margin-bottom': '1rem',
                  color: 'var(--text-primary)'
                }}>
                  {t('hbl.bulkUpdate.results', 'Update Results')}
                </h3>
                
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(3, 1fr)',
                  gap: '1rem',
                  'margin-bottom': '1rem'
                }}>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--primary-color)'
                    }}>
                      {resp().totalProcessed}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      {t('hbl.bulkUpdate.totalProcessed', 'Total Processed')}
                    </div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--success-color)'
                    }}>
                      {resp().totalSuccess}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      {t('hbl.bulkUpdate.successful', 'Successful')}
                    </div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--danger-color)'
                    }}>
                      {resp().totalFailed}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      {t('hbl.bulkUpdate.failed', 'Failed')}
                    </div>
                  </div>
                </div>

                <Show when={resp().totalFailed > 0}>
                  <div style={{
                    'margin-top': '1rem',
                    padding: '0.75rem',
                    background: 'var(--danger-light)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <h4 style={{
                      'font-weight': '500',
                      'margin-bottom': '0.5rem',
                      color: 'var(--danger-dark)'
                    }}>
                      {t('hbl.bulkUpdate.failedUpdates', 'Failed Updates:')}
                    </h4>
                    <div style={{
                      'max-height': '8rem',
                      'overflow-y': 'auto'
                    }}>
                      <For each={resp().results.filter(r => !r.success)}>
                        {(result) => (
                          <div style={{
                            'font-size': '0.875rem',
                            color: 'var(--danger-color)',
                            'margin-bottom': '0.25rem'
                          }}>
                            {result.hbl}: {result.error}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default HBLBulkList;


let bagm: any = []