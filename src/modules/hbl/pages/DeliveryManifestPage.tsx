/**
 * Delivery Manifest Page
 *
 * Main page for generating and managing delivery manifests
 * Integrates HBL search with manifest generation
 */

import { Component, createSignal, Show, createMemo, For } from 'solid-js';
import DeliveryManifest from '../components/DeliveryManifest';
import { hblStore } from '../data/hblStore';
import { getAllProvinceNames, getAllCityNames } from '../data/cubaLocations';
import { devLog } from '../../../services/utils';

const DeliveryManifestPage: Component = () => {
  const [searchMode, setSearchMode] = createSignal<'term' | 'list'>('term');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [hblList, setHblList] = createSignal('');
  const [filterState, setFilterState] = createSignal('');
  const [filterCity, setFilterCity] = createSignal('');
  const [filterGuide, setFilterGuide] = createSignal('');
  const [isSearching, setIsSearching] = createSignal(false);

  // Get available provinces and cities
  const provinces = getAllProvinceNames();

  // Get available cities based on selected province (cascading)
  const availableCities = createMemo(() => {
    const selectedProvince = filterState();
    if (!selectedProvince) {
      return getAllCityNames(); // All cities if no province selected
    }
    return getAllCityNames(selectedProvince); // Cities for selected province
  });

  // Handle province change - reset city if it's not in the new province
  const handleProvinceChange = (newProvince: string) => {
    setFilterState(newProvince);

    // If a city is selected, check if it's valid for the new province
    const currentCity = filterCity();
    if (currentCity && newProvince) {
      const cities = getAllCityNames(newProvince);
      if (!cities.includes(currentCity)) {
        setFilterCity(''); // Reset city if it's not in the new province
      }
    }
  };

  const handleSearch = async () => {
    var term = searchTerm();

    let filtersTerm:string[] = []
    setIsSearching(true);
    try {
      const filters: any = {};
      if (filterState().trim()) filtersTerm.push(filterState().trim());
      if (filterCity().trim()) filtersTerm.push(filterCity().trim());
      if (filterGuide().trim()) filtersTerm.push(filterGuide().trim());

      devLog( filtersTerm)  
      term +=  filtersTerm.join(" ")
      if (!term) {
        alert('Por favor ingrese un término de búsqueda (Número de Guía, HBL, etc.)');
        return;
      }

      await hblStore.fetchHBLs(term, filters);
    } catch (error) {
      devLog('Search error:', error);
      alert('Error al buscar HBLs. Por favor, intente de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchByList = async () => {
    const list = hblList().trim();

    if (!list) {
      alert('Por favor ingrese al menos un número de HBL');
      return;
    }

    setIsSearching(true);
    try {
      // Parse HBL list - support comma, space, or newline separated
      const hblIds = list
        .split(/[\n,\s]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (hblIds.length === 0) {
        alert('No se encontraron números de HBL válidos');
        return;
      }

      const filters: any = {};
      if (filterGuide().trim()) filters.guia = filterGuide().trim();

      await hblStore.fetchHBLsByIds(hblIds, filters);
    } catch (error) {
      devLog('Fetch by list error:', error);
      alert('Error al buscar HBLs. Por favor, intente de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={{ padding: '1.5rem', 'max-width': '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ 'margin-bottom': '2rem' }}>
        <h1 style={{
          margin: '0 0 0.5rem 0',
          'font-size': '2rem',
          color: '#2c3e50'
        }}>
          📦 Delivery Manifest Generator
        </h1>
        <p style={{
          margin: '0',
          color: '#6c757d',
          'font-size': '1rem'
        }}>
          Search for HBL records, then generate organized delivery manifests grouped by address and customer
        </p>
      </div>

      {/* Search Section */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': '8px',
        border: '1px solid #dee2e6',
        'margin-bottom': '2rem',
        'box-shadow': '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
          <h2 style={{
            margin: '0',
            'font-size': '1.25rem',
            color: '#495057'
          }}>
            1️⃣ Buscar Registros HBL
          </h2>

          {/* Mode Switcher */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            background: '#f8f9fa',
            padding: '0.25rem',
            'border-radius': '6px',
            border: '1px solid #dee2e6'
          }}>
            <button
              onClick={() => setSearchMode('term')}
              style={{
                padding: '0.5rem 1rem',
                background: searchMode() === 'term' ? '#0d6efd' : 'transparent',
                color: searchMode() === 'term' ? 'white' : '#495057',
                border: 'none',
                'border-radius': '4px',
                cursor: 'pointer',
                'font-size': '0.9rem',
                'font-weight': '500',
                transition: 'all 0.2s'
              }}
            >
              🔍 Por Término
            </button>
            <button
              onClick={() => setSearchMode('list')}
              style={{
                padding: '0.5rem 1rem',
                background: searchMode() === 'list' ? '#0d6efd' : 'transparent',
                color: searchMode() === 'list' ? 'white' : '#495057',
                border: 'none',
                'border-radius': '4px',
                cursor: 'pointer',
                'font-size': '0.9rem',
                'font-weight': '500',
                transition: 'all 0.2s'
              }}
            >
              📋 Por Lista de HBLs
            </button>
          </div>
        </div>

        {/* Search by Term Mode */}
        <Show when={searchMode() === 'term'}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            'align-items': 'center',
            'flex-wrap': 'wrap'
          }}>
            <input
              type="text"
              placeholder="Ingrese Número de Guía, HBL, ID de Cliente, o cualquier término..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              style={{
                flex: '1',
                'min-width': '300px',
                padding: '0.75rem',
                border: '2px solid #dee2e6',
                'border-radius': '6px',
                'font-size': '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#0d6efd'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
            />

            <button
              onClick={handleSearch}
              disabled={isSearching()}
              style={{
                padding: '0.75rem 2rem',
                background: isSearching() ? '#6c757d' : '#0d6efd',
                color: 'white',
                border: 'none',
                'border-radius': '6px',
                cursor: isSearching() ? 'not-allowed' : 'pointer',
                'font-size': '1rem',
                'font-weight': '600',
                'white-space': 'nowrap',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isSearching()) {
                  e.currentTarget.style.background = '#0b5ed7';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSearching()) {
                  e.currentTarget.style.background = '#0d6efd';
                }
              }}
            >
              {isSearching() ? '🔍 Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </Show>

        {/* Fetch by HBL List Mode */}
        <Show when={searchMode() === 'list'}>
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              'align-items': 'center',
              padding: '0.75rem',
              background: '#e7f1ff',
              'border-radius': '6px',
              border: '1px solid #b6d4fe',
              'font-size': '0.9rem',
              color: '#084298'
            }}>
              <span>💡</span>
              <span>Ingrese números de HBL separados por comas, espacios o en líneas separadas. También puede usar un escáner de códigos de barras.</span>
            </div>

            <textarea
              placeholder="Ejemplo:&#10;HBL001&#10;HBL002&#10;HBL003&#10;&#10;O separados por comas: HBL001, HBL002, HBL003"
              value={hblList()}
              onInput={(e) => setHblList(e.currentTarget.value)}
              style={{
                width: '100%',
                'min-height': '150px',
                padding: '0.75rem',
                border: '2px solid #dee2e6',
                'border-radius': '6px',
                'font-size': '1rem',
                'font-family': 'monospace',
                outline: 'none',
                transition: 'border-color 0.2s',
                resize: 'vertical'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#0d6efd'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
            />

            <div style={{
              display: 'flex',
              gap: '1rem',
              'align-items': 'center',
              'justify-content': 'space-between'
            }}>
              <div style={{
                'font-size': '0.9rem',
                color: '#6c757d'
              }}>
                {hblList().trim() ? `${hblList().split(/[\n,\s]+/).filter(id => id.trim().length > 0).length} HBLs ingresados` : 'Sin HBLs ingresados'}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setHblList('')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    'border-radius': '4px',
                    cursor: 'pointer',
                    'font-size': '0.9rem'
                  }}
                >
                  🗑️ Limpiar
                </button>

                <button
                  onClick={handleFetchByList}
                  disabled={isSearching()}
                  style={{
                    padding: '0.75rem 2rem',
                    background: isSearching() ? '#6c757d' : '#0d6efd',
                    color: 'white',
                    border: 'none',
                    'border-radius': '6px',
                    cursor: isSearching() ? 'not-allowed' : 'pointer',
                    'font-size': '1rem',
                    'font-weight': '600',
                    'white-space': 'nowrap',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSearching()) {
                      e.currentTarget.style.background = '#0b5ed7';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSearching()) {
                      e.currentTarget.style.background = '#0d6efd';
                    }
                  }}
                >
                  {isSearching() ? '📋 Obteniendo...' : '📋 Obtener HBLs'}
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* Filtros Adicionales - Solo para modo "Por Término" */}
        <Show when={searchMode() === 'term'}>
          <div style={{
            'margin-top': '1rem',
            'padding-top': '1rem',
            'border-top': '1px solid #dee2e6',
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-size': '0.9rem',
              'font-weight': '500',
              color: '#495057'
            }}>
              Filtrar por Provincia
            </label>
            <select
              value={filterState()}
              onChange={(e) => handleProvinceChange(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                'border-radius': '4px',
                'font-size': '0.9rem',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Todas las Provincias</option>
              <For each={provinces}>
                {(province) => <option value={province}>{province}</option>}
              </For>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-size': '0.9rem',
              'font-weight': '500',
              color: '#495057'
            }}>
              Filtrar por Ciudad
            </label>
            <select
              value={filterCity()}
              onChange={(e) => setFilterCity(e.currentTarget.value)}
              disabled={!filterState()}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                'border-radius': '4px',
                'font-size': '0.9rem',
                background: 'white',
                cursor: filterState() ? 'pointer' : 'not-allowed',
                opacity: filterState() ? 1 : 0.6
              }}
            >
              <option value="">
                {filterState() ? 'Todas las Ciudades' : 'Seleccione una Provincia primero'}
              </option>
              <For each={availableCities()}>
                {(city) => <option value={city}>{city}</option>}
              </For>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-size': '0.9rem',
              'font-weight': '500',
              color: '#495057'
            }}>
              Filtrar por Guía
            </label>
            <input
              type="text"
              placeholder="Ej: G12345"
              value={filterGuide()}
              onInput={(e) => setFilterGuide(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                'border-radius': '4px',
                'font-size': '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', 'align-items': 'flex-end' }}>
            <button
              onClick={() => {
                setFilterState('');
                setFilterCity('');
                setFilterGuide('');
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                'border-radius': '4px',
                cursor: 'pointer',
                'font-size': '0.9rem'
              }}
            >
              🗑️ Limpiar Filtros
            </button>
          </div>
        </div>
        </Show>

        {/* Search Results Summary */}
        <Show when={hblStore.filteredHBLs().length > 0}>
          <div style={{
            'margin-top': '1rem',
            padding: '0.75rem',
            background: '#d1ecf1',
            border: '1px solid #bee5eb',
            'border-radius': '4px',
            color: '#0c5460'
          }}>
            ✅ Found <strong>{hblStore.filteredHBLs().length}</strong> HBL records
          </div>
        </Show>

        <Show when={hblStore.error()}>
          <div style={{
            'margin-top': '1rem',
            padding: '0.75rem',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            'border-radius': '4px',
            color: '#721c24'
          }}>
            ⚠️ {hblStore.error()}
          </div>
        </Show>
      </div>

      {/* Instructions */}
      <div style={{
        background: '#fff3cd',
        padding: '1rem',
        'border-radius': '6px',
        border: '1px solid #ffc107',
        'margin-bottom': '2rem'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404', 'font-size': '1rem' }}>
          💡 How to use:
        </h3>
        <ol style={{
          margin: '0',
          'padding-left': '1.5rem',
          color: '#856404',
          'line-height': '1.8'
        }}>
          <li>Enter a search term (guide number, HBL, customer ID, etc.) and click Search</li>
          <li>Review the found records in the summary above</li>
          <li>Click "Generate Manifest" button below to create the delivery manifest</li>
          <li>The manifest will be grouped by: <strong>State → Address → Customer → Bag</strong></li>
          <li>Use Print button to print or PDF button to download</li>
          <li>Each customer entry includes a signature line for delivery confirmation</li>
        </ol>
      </div>

      {/* Manifest Generation Section */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': '8px',
        border: '1px solid #dee2e6',
        'box-shadow': '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{
          margin: '0 0 1rem 0',
          'font-size': '1.25rem',
          color: '#495057'
        }}>
          2️⃣ Generate & Print Manifest
        </h2>

        <DeliveryManifest
          guideNumber={searchTerm()}
        />
      </div>

      {/* Features Info */}
      <div style={{
        'margin-top': '2rem',
        padding: '1.5rem',
        background: '#e7f1ff',
        'border-radius': '8px',
        border: '1px solid #b6d4fe'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#084298' }}>
          📋 Manifest Features:
        </h3>
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          color: '#084298'
        }}>
          <div>
            <strong>✓ Hierarchical Grouping</strong><br />
            <span style={{ 'font-size': '0.9rem' }}>
              Organized by State → City → Street → Address → Customer → Bag
            </span>
          </div>
          <div>
            <strong>✓ Customer Details</strong><br />
            <span style={{ 'font-size': '0.9rem' }}>
              Shows CID, name, phone, and total bags/items per customer
            </span>
          </div>
          <div>
            <strong>✓ Delivery Signatures</strong><br />
            <span style={{ 'font-size': '0.9rem' }}>
              Each customer section includes a signature line for confirmation
            </span>
          </div>
          <div>
            <strong>✓ Compact Mode</strong><br />
            <span style={{ 'font-size': '0.9rem' }}>
              Toggle between detailed and summary views
            </span>
          </div>
          <div>
            <strong>✓ Multiple Export Options</strong><br />
            <span style={{ 'font-size': '0.9rem' }}>
              Print directly, download as PDF, or export to JSON
            </span>
          </div>
          <div>
            <strong>✓ Summary Statistics</strong><br />
            <span style={{ 'font-size': '0.9rem' }}>
              View totals for states, addresses, customers, bags, and weight
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryManifestPage;



// 230170515,230169221,230170374,230171922,230170539