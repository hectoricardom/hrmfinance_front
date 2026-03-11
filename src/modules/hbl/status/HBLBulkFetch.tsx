import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { parseHBLNumbers, getHBLFormat } from '../data/hblParser';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryApi } from '../../../services/apiAdapter';
import { convertToCSV, downloadCSV } from '../../../utils/csvUtils';
import { devLog } from '../../../services/utils';

interface HBLBulkFetchProps {
  onClose?: () => void;
}

const HBLBulkFetch: Component<HBLBulkFetchProps> = (props) => {
  const { t } = useTranslation();
  const [inputText, setInputText] = createSignal('');
  const [parsedHBLs, setParsedHBLs] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [fetchedData, setFetchedData] = createSignal<any[]>([]);
  const [copied, setCopied] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleParseText = () => {
    const hbls = parseHBLNumbers(inputText());
    setParsedHBLs(hbls);
    setCopied(false);
    setFetchedData([]);
    setError(null);
  };

  const handleCopyAllHBLs = async () => {
    const hblList = parsedHBLs().join('\n');

    try {
      await navigator.clipboard.writeText(hblList);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      devLog('Failed to copy HBLs:', error);
      alert('Error al copiar HBLs al portapapeles');
    }
  };

  const handleFetchHBLs = async () => {
    if (parsedHBLs().length === 0) {
      alert('Por favor parse los HBLs primero');
      return;
    }

    setLoading(true);
    setError(null);
    setFetchedData([]);

    try {
      const result = await inventoryApi.seahblsByMultIds(parsedHBLs());

      if (result && Array.isArray(result)) {
        setFetchedData(result);
        devLog('Fetched SeaYaba HBLs:', result);
      } else {
        setError('No se encontraron datos para los HBLs ingresados');
      }
    } catch (err) {
      devLog('Error fetching HBLs:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener datos de HBLs');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total weight
  const totalWeight = createMemo(() => {
    return fetchedData().reduce((sum, item) => {
      const weight = parseFloat(item.weightpound || item.weight || '0');
      return sum + (isNaN(weight) ? 0 : weight);
    }, 0);
  });

  // Calculate total packages
  const totalPackages = createMemo(() => {
    return fetchedData().reduce((sum, item) => {
      const packages = parseInt(item.numberofbultos || item.bagnumber || '0');
      return sum + (isNaN(packages) ? 0 : packages);
    }, 0);
  });

  const resetForm = () => {
    setInputText('');
    setParsedHBLs([]);
    setFetchedData([]);
    setError(null);
    setCopied(false);
  };

  const exportToCSV = () => {
    if (fetchedData().length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      // Get all unique keys from fetched data
      const allKeys = new Set<string>();
      fetchedData().forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });

      const headers = Array.from(allKeys);
      const rows = fetchedData().map(item => {
        return headers.map(key => item[key]);
      });

      // Use CSV utility that properly handles commas, quotes, and special characters
      const csvContent = convertToCSV(rows, headers);
      downloadCSV(csvContent, `hbl_bulk_fetch_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      devLog('Error exporting CSV:', error);
      alert('Error al exportar CSV');
    }
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
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{
          'font-size': '1.5rem',
          'font-weight': '600',
          'margin-bottom': '1.5rem',
          color: 'var(--text-primary)'
        }}>
          Búsqueda Masiva de HBLs
        </h2>

        <div>
          {/* Text Input Area */}
          <div style={containerStyle}>
            <label style={labelStyle}>
              Ingrese texto con números HBL
            </label>
            <div style={{
              'font-size': '0.875rem',
              color: 'var(--text-muted)',
              'margin-bottom': '0.5rem',
              'line-height': '1.5'
            }}>
              Formatos soportados:
              <div style={{ 'margin-top': '0.25rem', 'padding-left': '1rem' }}>
                • Estándar: <code style={{
                  background: 'var(--gray-100)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '4px'
                }}>230XXXXXX</code> (ej: 230123456)
              </div>
              <div style={{ 'padding-left': '1rem' }}>
                • Extendido: <code style={{
                  background: 'var(--gray-100)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '4px'
                }}>AAA12345678</code> (ej: TRE20272709)
              </div>
            </div>
            <textarea
              style={textareaStyle}
              value={inputText()}
              onInput={(e) => setInputText(e.currentTarget.value)}
              placeholder="Pegue el texto aquí. Los números HBL se extraerán automáticamente (230XXXXXX o AAA12345678)..."
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
            <div style={{ 'margin-top': '0.75rem' }}>
              <Button onClick={handleParseText} variant="secondary" size="sm">
                Extraer HBLs
              </Button>
            </div>
          </div>

          {/* Parsed HBLs Display */}
          <Show when={parsedHBLs().length > 0}>
            <div style={containerStyle}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                'margin-bottom': '0.75rem'
              }}>
                <h3 style={{
                  'font-size': '1.125rem',
                  'font-weight': '500',
                  margin: '0',
                  color: 'var(--text-primary)'
                }}>
                  Encontrados {parsedHBLs().length} HBL(s):
                </h3>
                <Button
                  onClick={handleCopyAllHBLs}
                  variant="secondary"
                  size="sm"
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Show when={!copied()} fallback={
                    <>
                      <span style={{ 'font-size': '1rem' }}>✓</span>
                      Copiado
                    </>
                  }>
                    <span style={{ 'font-size': '1rem' }}>📋</span>
                    Copiar Todos
                  </Show>
                </Button>
              </div>
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
                    {(hbl) => {
                      const format = getHBLFormat(hbl);
                      const formatColor = format === 'standard' ? '#3b82f6' :
                                          format === 'extended' ? '#8b5cf6' : '#6b7280';
                      const formatLabel = format === 'standard' ? '230' :
                                          format === 'extended' ? 'EXT' : '?';

                      return (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: 'var(--primary-light)',
                          'border-radius': 'var(--border-radius-sm)',
                          'font-size': '0.875rem',
                          'font-weight': '500',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.375rem'
                        }}>
                          <span style={{
                            'font-size': '0.625rem',
                            'font-weight': '700',
                            background: formatColor,
                            color: 'white',
                            padding: '0.125rem 0.25rem',
                            'border-radius': '3px',
                            'text-transform': 'uppercase'
                          }}>
                            {formatLabel}
                          </span>
                          {hbl}
                        </span>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          </Show>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-top': '1.5rem'
          }}>
            <Button
              onClick={handleFetchHBLs}
              disabled={loading() || parsedHBLs().length === 0}
              variant="primary"
            >
              <Show when={loading()} fallback="Buscar Datos de HBLs">
                <span style={{ display: 'flex', 'align-items': 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid #fff',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 0.8s linear infinite',
                    'margin-right': '0.5rem'
                  }} />
                  Buscando...
                </span>
              </Show>
            </Button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Show when={fetchedData().length > 0}>
                <Button onClick={exportToCSV} variant="secondary" size="sm">
                  Exportar CSV
                </Button>
              </Show>
              <Button onClick={resetForm} variant="secondary" size="sm">
                Limpiar
              </Button>
              <Show when={props.onClose}>
                <Button onClick={props.onClose} variant="outline" size="sm">
                  Cerrar
                </Button>
              </Show>
            </div>
          </div>

          {/* Error Display */}
          <Show when={error()}>
            <div style={{
              'margin-top': '1.5rem',
              padding: '1rem',
              background: 'var(--danger-light)',
              'border-radius': 'var(--border-radius)',
              color: 'var(--danger-dark)'
            }}>
              <strong>Error:</strong> {error()}
            </div>
          </Show>

          {/* Results Display */}
          <Show when={fetchedData().length > 0}>
            <div style={{
              'margin-top': '1.5rem',
              padding: '1rem',
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius)'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1rem'
              }}>
                <h3 style={{
                  'font-size': '1.125rem',
                  'font-weight': '500',
                  margin: '0',
                  color: 'var(--text-primary)'
                }}>
                  Resultados ({fetchedData().length} HBL{fetchedData().length !== 1 ? 's' : ''})
                </h3>
              </div>

              {/* Summary Cards */}
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(3, 1fr)',
                gap: '1rem',
                'margin-bottom': '1rem'
              }}>
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  'border-radius': 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)',
                    'margin-bottom': '0.25rem'
                  }}>
                    Total HBLs
                  </div>
                  <div style={{
                    'font-size': '1.875rem',
                    'font-weight': '700',
                    color: 'var(--primary-color)'
                  }}>
                    {fetchedData().length}
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  padding: '1rem',
                  'border-radius': 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)',
                    'margin-bottom': '0.25rem'
                  }}>
                    Total Bultos
                  </div>
                  <div style={{
                    'font-size': '1.875rem',
                    'font-weight': '700',
                    color: 'var(--info-color)'
                  }}>
                    {totalPackages()}
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  padding: '1rem',
                  'border-radius': 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)',
                    'margin-bottom': '0.25rem'
                  }}>
                    Peso Total (lb)
                  </div>
                  <div style={{
                    'font-size': '1.875rem',
                    'font-weight': '700',
                    color: 'var(--success-color)'
                  }}>
                    {totalWeight().toFixed(2)}
                  </div>
                </div>
              </div>

              <div style={{
                'max-height': '400px',
                'overflow-y': 'auto',
                'overflow-x': 'auto'
              }}>
                <table style={{
                  width: '100%',
                  'border-collapse': 'collapse',
                  'font-size': '0.875rem'
                }}>
                  <thead>
                    <tr style={{
                      background: 'var(--gray-100)',
                      'border-bottom': '2px solid var(--border-color)'
                    }}>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600' }}>HBL</th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600' }}>Guía</th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600' }}>Estado</th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600' }}>Remitente</th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600' }}>Destinatario</th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600' }}>Bultos</th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600' }}>Peso (lb)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={fetchedData()}>
                      {(item, index) => (
                        <tr style={{
                          'border-bottom': '1px solid var(--border-color)',
                          background: index() % 2 === 0 ? 'white' : 'var(--gray-50)'
                        }}>
                          <td style={{ padding: '0.75rem' }}>
                            <code style={{
                              background: 'var(--primary-light)',
                              padding: '0.25rem 0.5rem',
                              'border-radius': '4px',
                              'font-weight': '500'
                            }}>
                              {item.hbl || 'N/A'}
                            </code>
                          </td>
                          <td style={{ padding: '0.75rem' }}>{item.guia || item.idairguide || 'N/A'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              'border-radius': '4px',
                              'font-size': '0.75rem',
                              background: 'var(--info-light)',
                              color: 'var(--info-dark)'
                            }}>
                              {item.idguidestate || item.status || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>{item.nameshipper || 'N/A'}</td>
                          <td style={{ padding: '0.75rem' }}>{item.consigneeName || item.nameConsignee || 'N/A'}</td>
                          <td style={{ padding: '0.75rem', 'text-align': 'center' }}>{item.numberofbultos || item.bagnumber || '0'}</td>
                          <td style={{ padding: '0.75rem', 'text-align': 'right' }}>{item.weightpound || item.weight || '0'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
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

export default HBLBulkFetch;
