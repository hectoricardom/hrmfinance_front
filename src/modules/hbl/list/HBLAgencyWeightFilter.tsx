import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { HBL } from '../types';
import { printHBLList, exportHBLListToCSV } from './printHBLList';
import { inventoryApi } from '../../../services/apiAdapter';
import { AGENCIES, getAgencyNameById } from '../../../data/agencyMap';
import { devLog } from '../../../services/utils';

interface HBLAgencyWeightFilterProps {
  onFilterChange?: (filteredHbls: HBL[]) => void;
  onHBLSelect?: (hbl: HBL) => void;
}

interface WeightCategory {
  key: string;
  label: string;
  filter: (weight: number) => boolean;
  color: string;
}

interface AgencyGroup {
  agency: string;
  weightGroups: {
    [weightCategory: string]: HBL[];
  };
  total: {
    hbls: number;
    weight: number;
    packages: number;
  };
}

const HBLAgencyWeightFilter: Component<HBLAgencyWeightFilterProps> = (props) => {
  const { t } = useTranslation();
  
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedAgency, setSelectedAgency] = createSignal<string>('all');
  const [selectedWeightCategory, setSelectedWeightCategory] = createSignal<string>('all');
  const [expandedAgencies, setExpandedAgencies] = createSignal<Set<string>>(new Set());
  const [hbls, setHbls] = createSignal<HBL[]>([]);

  const [guideFilter, setGuideFilter] = createSignal<string>('');
  
  const uniqueGuides = createMemo(() => {
    const guides = new Set([2518,2519, 2520, 2521, 2522, 2523, 2524, 2525, 2526].map(hbl => hbl));
    return Array.from(guides).sort((a, b) => a - b);
  });

  const handleGuideChange = (filtered: any) => {
    setGuideFilter(filtered);
  };
  // Weight categories definition
  const weightCategories: WeightCategory[] = [
    {
      key: 'light',
      label: 'Ligero (< 7 kg)',
      filter: (weight: number) => weight < 7,
      color: '#28a745'
    },
    {
      key: 'medium',
      label: 'Medio (15-50 kg)',
      filter: (weight: number) => weight >= 7 && weight <= 23,
      color: '#ffc107'
    },
    {
      key: 'heavy',
      label: 'Pesado (> 50 kg)',
      filter: (weight: number) => weight > 23,
      color: '#dc3545'
    }
  ];

  // Group HBLs by agency and weight category
  const groupedData = createMemo(() => {
    let filtered = hbls();

    // Apply search filter
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      filtered = filtered.filter(hbl => 
        hbl.hbl.toLowerCase().includes(term) ||
        hbl.idairguide.toLowerCase().includes(term) ||
        hbl.nameshipper.toLowerCase().includes(term) ||
        hbl.consigneeName.toLowerCase().includes(term) ||
        hbl.namegood.toLowerCase().includes(term) ||
        hbl.bagnumber.toLowerCase().includes(term) ||
        hbl.cidentity.toLowerCase().includes(term) ||
        hbl.agency.toLowerCase().includes(term)
      );
    }

    // Group by agency
    const agencyGroups: { [agency: string]: AgencyGroup } = {};

    filtered?.forEach?.(hbl => {

      
      const agency = hbl.agency || 'Sin Agencia';
      if(agency !== "42"){

        

        const weight = parseFloat(hbl.weight || '0');

        if (!agencyGroups[agency]) {
          agencyGroups[agency] = {
            agency,
            weightGroups: {
              light: [],
              medium: [],
              heavy: []
            },
            total: {
              hbls: 0,
              weight: 0,
              packages: 0
            }
          };
        }

        // Categorize by weight
        const category = weightCategories.find(cat => cat.filter(weight));
        if (category) {
          agencyGroups[agency].weightGroups[category.key].push(hbl);
        }

        // Update totals
        agencyGroups[agency].total.hbls += 1;
        agencyGroups[agency].total.weight += weight;
        agencyGroups[agency].total.packages += parseInt(hbl.quantity || '0');
      }
    });

    return agencyGroups;
  });



   const fetchHbl = async () => {


      if(!searchTerm().trim()){
        //setHbls([]);
        return null;
      }
      
      let hh = await  inventoryApi.getHBLS(searchTerm().trim(),{
          guia: guideFilter()
      })

        devLog(hh);

      if(hh?.error){
        setHbls([]);
      }else{
         setHbls(Object.values(hh));
      }
     
  }

 

  // Filter data based on selected filters
  const filteredData = createMemo(() => {
    const groups = groupedData();
    let result = { ...groups };

    // Filter by selected agency
    if (selectedAgency() !== 'all') {
      const agency = selectedAgency();
      result = agency in groups ? { [agency]: groups[agency] } : {};
    }

    // Filter by weight category
    if (selectedWeightCategory() !== 'all') {
      const category = selectedWeightCategory();
      Object.keys(result).forEach(agency => {
        const newWeightGroups = { light: [], medium: [], heavy: [] };
        newWeightGroups[category] = result[agency].weightGroups[category];
        
        // Recalculate totals for filtered data
        const allHbls = newWeightGroups[category];
        result[agency] = {
          ...result[agency],
          weightGroups: newWeightGroups,
          total: {
            hbls: allHbls.length,
            weight: allHbls.reduce((sum, hbl) => sum + parseFloat(hbl.weight || '0'), 0),
            packages: allHbls.reduce((sum, hbl) => sum + parseInt(hbl.quantity || '0'), 0)
          }
        };
      });
    }

    return result;
  });

  const toggleAgencyExpansion = (agency: string) => {
    const expanded = new Set(expandedAgencies());
    if (expanded.has(agency)) {
      expanded.delete(agency);
    } else {
      expanded.add(agency);
    }
    setExpandedAgencies(expanded);
  };

  const getWeightCategoryColor = (category: string) => {
    const cat = weightCategories.find(c => c.key === category);
    return cat ? cat.color : '#6c757d';
  };

  const getWeightCategoryLabel = (category: string) => {
    const cat = weightCategories.find(c => c.key === category);
    return cat ? cat.label : category;
  };

  const handlePrintFiltered = () => {
    const allFilteredHbls = Object.values(filteredData()).flatMap(group => 
      Object.values(group.weightGroups).flat()
    );
    
    if (allFilteredHbls.length === 0) {
      alert(t('hbl.noDataToPrint', 'No hay datos para imprimir'));
      return;
    }

    const title = selectedAgency() !== 'all' 
      ? `Reporte por Agencia: ${selectedAgency()}` 
      : 'Reporte por Agencias y Peso';
    
    printHBLList(allFilteredHbls, title);
  };

  const handleExportFiltered = () => {
    const allFilteredHbls = Object.values(filteredData()).flatMap(group => 
      Object.values(group.weightGroups).flat()
    );
    
    if (allFilteredHbls.length === 0) {
      alert(t('hbl.noDataToExport', 'No hay datos para exportar'));
      return;
    }

    const filename = selectedAgency() !== 'all' 
      ? `agencia_${selectedAgency()}_${new Date().toISOString().split('T')[0]}.csv`
      : `agencias_por_peso_${new Date().toISOString().split('T')[0]}.csv`;
    
    exportHBLListToCSV(allFilteredHbls, filename);
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ 
          'font-size': '1.5rem', 
          'font-weight': '600', 
          'margin-bottom': '1.5rem',
          color: 'var(--text-primary)'
        }}>
          🏢 {t('hbl.agencyWeightReport', 'Reporte por Agencia y Peso')}
        </h2>


        <div>
            <label style={{ 
              display: 'block', 
              'margin-bottom': '0.25rem',
              'font-size': '0.875rem',
              color: 'var(--text-muted)'
            }}>
              {t('common.status', 'Guias')}
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
 <Show when={guideFilter()}>
              <>
        {/* Filters */}
       
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            'margin-bottom': '1.5rem',
            padding: '1rem',
            background: 'var(--gray-50)',
            'border-radius': 'var(--border-radius-sm)'
          }}>

            {/* Search */}
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem',
                'font-weight': '500',
                color: 'var(--text-primary)'
              }}>
                🔍 {t('common.search', 'Buscar')}
              </label>
              <input
                type="text"
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
                placeholder={t('hbl.searchPlaceholder', 'Buscar HBL, agencia, consignee...')}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-family': 'inherit'
                }}
              />
            </div>

            {/* Agency Filter */}
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem',
                'font-weight': '500',
                color: 'var(--text-primary)'
              }}>
                🏢 {t('hbl.agency', 'Agencia')}
              </label>
              <select
                value={selectedAgency()}
                onChange={(e) => setSelectedAgency(e.currentTarget.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-family': 'inherit'
                }}
              >
                <option value="all">{t('common.all', 'Todas')}</option>
                <For each={AGENCIES}>
                  {(agency) => <option value={agency.id}>{agency.name}</option>}
                </For>
              </select>
            </div>

            {/* Weight Category Filter */}
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem',
                'font-weight': '500',
                color: 'var(--text-primary)'
              }}>
                ⚖️ {t('hbl.weightCategory', 'Categoría de Peso')}
              </label>
              <select
                value={selectedWeightCategory()}
                onChange={(e) => setSelectedWeightCategory(e.currentTarget.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-family': 'inherit'
                }}
              >
                <option value="all">{t('common.all', 'Todas')}</option>
                <For each={weightCategories}>
                  {(category) => <option value={category.key}>{category.label}</option>}
                </For>
              </select>
            </div>
          </div>
       

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          'margin-bottom': '1.5rem',
          'flex-wrap': 'wrap'
        }}>
          <Button variant="outline" onClick={fetchHbl}>
            🖨️ {t('hbl.search', 'Buscar')}
          </Button>
          <Button variant="outline" onClick={handlePrintFiltered}>
            🖨️ {t('hbl.print', 'Imprimir')}
          </Button>
          <Button variant="outline" onClick={handleExportFiltered}>
            📊 {t('hbl.exportCSV', 'Exportar CSV')}
          </Button>
        </div>
        
       
        {/* Grouped Data Display */}
        <div style={{ 'margin-top': '1rem' }}>
          <For each={Object.entries(filteredData())}>
            {([agency, group]) => (
              <div style={{
                'margin-bottom': '2rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius)',
                overflow: 'hidden',
                'box-shadow': 'var(--shadow-sm)'
              }}>
                {/* Agency Header */}
                <div 
                  style={{
                    background: 'linear-gradient(135deg, #2c3e50, #34495e)',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center'
                  }}
                  onClick={() => toggleAgencyExpansion(agency)}
                >
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <span style={{ 'font-size': '1.2rem' }}>
                      {expandedAgencies().has(agency) ? '📂' : '📁'}
                    </span>
                    <span style={{ 'font-weight': '600', 'font-size': '1.1rem' }}>
                      🏢 {getAgencyNameById(parseInt(agency))}
                    </span>
                  </div>
                  <div style={{ 'font-size': '0.9rem', opacity: '0.9' }}>
                    {group.total.hbls} HBLs • {group.total.weight.toFixed(2)} kg • {group.total.packages} paquetes
                  </div>
                </div>

                {/* Weight Categories */}
                <Show when={expandedAgencies().has(agency)}>
                  <div style={{ background: 'white' }}>
                    <For each={weightCategories}>
                      {(category) => {
                        const categoryHbls = group.weightGroups[category.key];
                        const categoryWeight = categoryHbls.reduce((sum, hbl) => sum + parseFloat(hbl.weight || '0'), 0);
                        const categoryPackages = categoryHbls.reduce((sum, hbl) => sum + parseInt(hbl.quantity || '0'), 0);

                        return (
                          <Show when={categoryHbls.length > 0}>
                            <div style={{
                              'border-bottom': '1px solid var(--border-color)'
                            }}>
                              {/* Weight Category Header */}
                              <div style={{
                                background: category.color,
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                'font-weight': '500',
                                display: 'flex',
                                'justify-content': 'space-between',
                                'align-items': 'center'
                              }}>
                                <span>⚖️ {category.label}</span>
                                <span style={{ 'font-size': '0.9rem' }}>
                                  {categoryHbls.length} HBLs • {categoryWeight.toFixed(2)} kg • {categoryPackages} paquetes
                                </span>
                              </div>

                              {/* HBL Table */}
                              <div style={{ padding: '1rem' }}>
                                <div style={{
                                  display: 'grid',
                                  'grid-template-columns': '120px 250px 200px 150px 80px 120px 100px',
                                  gap: '0.5rem',
                                  'font-weight': '600',
                                  'font-size': '0.875rem',
                                  padding: '0.5rem',
                                  background: 'var(--gray-100)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'margin-bottom': '0.5rem'
                                }}>
                                  <div>HBL #</div>
                                  <div>Consignatario</div>
                                  <div>Dirección</div>
                                  <div>Artículos</div>
                                  <div>Peso (kg)</div>
                                  <div>Bultos</div>
                                  <div>Fecha</div>
                                </div>

                                <For each={categoryHbls}>
                                  {(hbl) => (
                                    <div style={{
                                      display: 'grid',
                                      'grid-template-columns': '120px 250px 200px 150px 80px 120px 100px',
                                      gap: '0.5rem',
                                      padding: '0.75rem 0.5rem',
                                      'border-bottom': '1px solid var(--border-color)',
                                      'font-size': '0.875rem',
                                      'align-items': 'center',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => props.onHBLSelect?.(hbl)}
                                    >
                                      <div style={{ 
                                        'font-weight': '600',
                                        color: 'var(--primary-color)',
                                        'font-size': '0.8rem'
                                      }}>
                                        {hbl.hbl}
                                      </div>
                                      <div>
                                        <div style={{ 'font-weight': '500', 'line-height': '1.2' }}>
                                          {hbl.consigneeName}
                                        </div>
                                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                          ID: {hbl.cidentity}
                                        </div>
                                      </div>
                                      <div style={{ 
                                        'font-size': '0.75rem',
                                        overflow: 'hidden',
                                        'text-overflow': 'ellipsis'
                                      }}>
                                        {hbl.street || ''}
                                      </div>
                                      <div style={{ 'font-size': '0.75rem' }}>
                                        {hbl.namegood || ''}
                                      </div>
                                      <div style={{ 
                                        'text-align': 'right',
                                        'font-weight': '600',
                                        color: category.color
                                      }}>
                                        {hbl.weight || '0'}
                                      </div>
                                      <div style={{ 'text-align': 'center' }}>
                                        {hbl.bagnumber}
                                      </div>
                                      <div style={{ 'font-size': '0.75rem' }}>
                                        {new Date(hbl.datereserve).toLocaleDateString('es-ES')}
                                      </div>
                                    </div>
                                  )}
                                </For>
                              </div>
                            </div>
                          </Show>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>


        {/* Summary Statistics */}
        <Show when={Object.keys(filteredData()).length > 0}>
          <div style={{
            'margin-top': '2rem',
            padding: '1.5rem',
            background: 'var(--gray-50)',
            'border-radius': 'var(--border-radius)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ 
              'margin-bottom': '1rem',
              color: 'var(--text-primary)',
              'font-size': '1.125rem'
            }}>
              📊 Resumen General
            </h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                  {Object.keys(filteredData()).length}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Agencias
                </div>
              </div>
              
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--success-color)' }}>
                  {Object.values(filteredData()).reduce((sum, group) => sum + group.total.hbls, 0)}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Total HBLs
                </div>
              </div>
              
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--warning-color)' }}>
                  {Object.values(filteredData()).reduce((sum, group) => sum + group.total.weight, 0).toFixed(2)}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Peso Total (kg)
                </div>
              </div>
              
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--info-color)' }}>
                  {Object.values(filteredData()).reduce((sum, group) => sum + group.total.packages, 0)}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Total Paquetes
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* No Data Message */}
        <Show when={Object.keys(filteredData()).length === 0}>
          <div style={{
            'text-align': 'center',
            padding: '3rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📦</div>
            <div style={{ 'font-size': '1.125rem', 'font-weight': '500' }}>
              {t('hbl.noDataFound', 'No se encontraron datos')}
            </div>
            <div style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
              {t('hbl.adjustFilters', 'Ajusta los filtros para ver resultados')}
            </div>
          </div>
        </Show>
       </></Show>
      </div>
    </Card>
  );
};

export default HBLAgencyWeightFilter;