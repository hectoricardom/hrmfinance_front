import { Component, createSignal, Show, For } from 'solid-js';
import { Card, Button } from '../../ui';
import { devLog } from '../../../services/utils';
import FingerprintCapture from '../components/FingerprintCapture';
import FingerprintVisualizer from '../components/FingerprintVisualizer';
import FingerprintRenderer from '../components/FingerprintRenderer';
import { FingerprintSetData, FingerData, CAPTURE_ORDER } from '../types/fingerprint';

type PageMode = 'capture' | 'view' | 'analyze' | 'history';

const FingerprintPage: Component = () => {
  const [mode, setMode] = createSignal<PageMode>('capture');
  const [capturedData, setCapturedData] = createSignal<FingerprintSetData | null>(null);
  const [savedSessions, setSavedSessions] = createSignal<FingerprintSetData[]>([]);
  const [selectedFingerForAnalysis, setSelectedFingerForAnalysis] = createSignal<FingerData | null>(null);

  // Get captured fingers from current data
  const capturedFingers = () => {
    const data = capturedData();
    if (!data) return [];
    return CAPTURE_ORDER.map(name => data.fingers[name]).filter(f => f.captured);
  };

  // Handle capture completion
  const handleCaptureComplete = (data: FingerprintSetData) => {
    setCapturedData(data);
    // Add to saved sessions
    setSavedSessions(prev => [data, ...prev]);
    // Switch to view mode
    setMode('view');
  };

  // Start new capture session
  const startNewCapture = () => {
    setCapturedData(null);
    setMode('capture');
  };

  // View a saved session
  const viewSession = (data: FingerprintSetData) => {
    setCapturedData(data);
    setMode('view');
  };

  return (
    <div style={{ padding: '1.5rem', 'max-width': '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem',
        'flex-wrap': 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{
            'font-size': '1.75rem',
            'font-weight': '600',
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}>
            Captura de Huellas Dactilares
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            margin: 0,
          }}>
            SecuGen HU20-A Hamster Pro 20 - Sistema de captura biométrica
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--bg-secondary)',
          padding: '0.25rem',
          'border-radius': 'var(--border-radius)',
        }}>
          <button
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: mode() === 'capture' ? 'var(--primary-color)' : 'transparent',
              color: mode() === 'capture' ? 'white' : 'var(--text-primary)',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-size': '0.875rem',
              'font-weight': '500',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setMode('capture')}
          >
            Nueva Captura
          </button>
          <button
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: mode() === 'view' ? 'var(--primary-color)' : 'transparent',
              color: mode() === 'view' ? 'white' : 'var(--text-primary)',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-size': '0.875rem',
              'font-weight': '500',
              transition: 'all 0.2s ease',
              opacity: capturedData() ? 1 : 0.5,
            }}
            onClick={() => capturedData() && setMode('view')}
            disabled={!capturedData()}
          >
            Ver Resultados
          </button>
          <button
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: mode() === 'analyze' ? 'var(--primary-color)' : 'transparent',
              color: mode() === 'analyze' ? 'white' : 'var(--text-primary)',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-size': '0.875rem',
              'font-weight': '500',
              transition: 'all 0.2s ease',
              opacity: capturedData() && capturedFingers().length > 0 ? 1 : 0.5,
            }}
            onClick={() => {
              if (capturedData() && capturedFingers().length > 0) {
                if (!selectedFingerForAnalysis()) {
                  setSelectedFingerForAnalysis(capturedFingers()[0]);
                }
                setMode('analyze');
              }
            }}
            disabled={!capturedData() || capturedFingers().length === 0}
          >
            Analizar
          </button>
          <button
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: mode() === 'history' ? 'var(--primary-color)' : 'transparent',
              color: mode() === 'history' ? 'white' : 'var(--text-primary)',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-size': '0.875rem',
              'font-weight': '500',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setMode('history')}
          >
            Historial ({savedSessions().length})
          </button>
        </div>
      </div>

      {/* Capture Mode */}
      <Show when={mode() === 'capture'}>
        <FingerprintCapture
          onComplete={handleCaptureComplete}
          onCancel={() => {
            if (capturedData()) {
              setMode('view');
            }
          }}
        />
      </Show>

      {/* View Mode */}
      <Show when={mode() === 'view' && capturedData()}>
        <div style={{ 'margin-bottom': '1rem' }}>
          <Button onClick={startNewCapture} variant="primary">
            Nueva Captura
          </Button>
        </div>
        <FingerprintVisualizer
          data={capturedData()!}
          showQuality={true}
          showLabels={true}
          editable={true}
          onFingerClick={(finger) => {
            devLog('Recapture finger:', finger);
            // Could implement recapture logic here
          }}
        />
      </Show>

      {/* Analyze Mode */}
      <Show when={mode() === 'analyze' && capturedData()}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem',
            }}>
              <h2 style={{
                'font-size': '1.25rem',
                'font-weight': '600',
                margin: 0,
              }}>
                Analisis de Huella Dactilar
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={() => setMode('view')} variant="outline" size="sm">
                  Volver a Vista
                </Button>
                <Button onClick={startNewCapture} variant="primary" size="sm">
                  Nueva Captura
                </Button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              'grid-template-columns': '250px 1fr',
              gap: '1.5rem',
            }}>
              {/* Finger selector */}
              <div style={{
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius)',
                padding: '1rem',
              }}>
                <h4 style={{
                  'font-size': '0.875rem',
                  'font-weight': '600',
                  margin: '0 0 1rem 0',
                  color: 'var(--text-secondary)',
                }}>
                  Seleccionar Huella ({capturedFingers().length} capturadas)
                </h4>
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(2, 1fr)',
                  gap: '0.5rem',
                }}>
                  <For each={capturedFingers()}>
                    {(finger) => (
                      <div
                        style={{
                          padding: '0.5rem',
                          background: selectedFingerForAnalysis()?.name === finger.name
                            ? 'var(--primary-color)'
                            : 'var(--bg-tertiary)',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: selectedFingerForAnalysis()?.name === finger.name
                            ? '2px solid var(--primary-color)'
                            : '2px solid transparent',
                        }}
                        onClick={() => setSelectedFingerForAnalysis(finger)}
                      >
                        <div style={{
                          width: '100%',
                          'aspect-ratio': '5/6',
                          'border-radius': '4px',
                          overflow: 'hidden',
                          background: '#1a1a2e',
                          'margin-bottom': '0.25rem',
                        }}>
                          <Show when={finger.imageDataUrl}>
                            <img
                              src={finger.imageDataUrl}
                              alt={finger.labelEs}
                              style={{
                                width: '100%',
                                height: '100%',
                                'object-fit': 'cover',
                              }}
                            />
                          </Show>
                        </div>
                        <div style={{
                          'font-size': '0.7rem',
                          'text-align': 'center',
                          color: selectedFingerForAnalysis()?.name === finger.name
                            ? 'white'
                            : 'var(--text-primary)',
                          'white-space': 'nowrap',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                        }}>
                          {finger.labelEs.split(' ')[0]}
                        </div>
                        <div style={{
                          'font-size': '0.65rem',
                          'text-align': 'center',
                          color: selectedFingerForAnalysis()?.name === finger.name
                            ? 'rgba(255,255,255,0.8)'
                            : 'var(--text-muted)',
                        }}>
                          {finger.quality}%
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              {/* Fingerprint Renderer with controls */}
              <div style={{
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
              }}>
                <Show when={selectedFingerForAnalysis()}>
                  <FingerprintRenderer
                    fingerData={selectedFingerForAnalysis()!}
                    width={350}
                    height={400}
                    showControls={true}
                    options={{
                      enhance: true,
                    }}
                  />
                </Show>
                <Show when={!selectedFingerForAnalysis()}>
                  <div style={{
                    width: '350px',
                    height: '400px',
                    background: 'var(--bg-secondary)',
                    'border-radius': 'var(--border-radius)',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    color: 'var(--text-muted)',
                  }}>
                    Seleccione una huella para analizar
                  </div>
                </Show>
              </div>
            </div>

            {/* Selected finger details */}
            <Show when={selectedFingerForAnalysis()}>
              <div style={{
                'margin-top': '1.5rem',
                padding: '1rem',
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius)',
              }}>
                <h4 style={{
                  'font-size': '0.875rem',
                  'font-weight': '600',
                  margin: '0 0 1rem 0',
                }}>
                  Detalles: {selectedFingerForAnalysis()!.labelEs}
                </h4>
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                }}>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Calidad</div>
                    <div style={{
                      'font-size': '1.25rem',
                      'font-weight': '600',
                      color: (selectedFingerForAnalysis()!.quality || 0) >= 80
                        ? 'var(--success-color)'
                        : (selectedFingerForAnalysis()!.quality || 0) >= 60
                        ? 'var(--warning-color)'
                        : 'var(--error-color)',
                    }}>
                      {selectedFingerForAnalysis()!.quality}%
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>NFIQ Score</div>
                    <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
                      {selectedFingerForAnalysis()!.nfiq}/5
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Mano</div>
                    <div style={{ 'font-size': '1rem', 'font-weight': '500' }}>
                      {selectedFingerForAnalysis()!.hand === 'right' ? 'Derecha' : 'Izquierda'}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Capturada</div>
                    <div style={{ 'font-size': '0.875rem' }}>
                      {selectedFingerForAnalysis()!.capturedAt
                        ? new Date(selectedFingerForAnalysis()!.capturedAt!).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                  <Show when={selectedFingerForAnalysis()!.templateData}>
                    <div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Template</div>
                      <div style={{
                        'font-size': '0.75rem',
                        'font-family': 'monospace',
                        color: 'var(--text-muted)',
                        'max-width': '200px',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap',
                      }}>
                        {selectedFingerForAnalysis()!.templateData!.substring(0, 30)}...
                      </div>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* History Mode */}
      <Show when={mode() === 'history'}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem',
            }}>
              <h2 style={{
                'font-size': '1.25rem',
                'font-weight': '600',
                margin: 0,
              }}>
                Historial de Capturas
              </h2>
              <Button onClick={startNewCapture} variant="primary" size="sm">
                Nueva Captura
              </Button>
            </div>

            <Show when={savedSessions().length === 0}>
              <div style={{
                'text-align': 'center',
                padding: '3rem',
                color: 'var(--text-muted)',
              }}>
                <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>
                  {/* Fingerprint icon placeholder */}
                  <span role="img" aria-label="fingerprint">&#128270;</span>
                </div>
                <p>No hay capturas guardadas en esta sesión.</p>
                <div style={{ 'margin-top': '1rem' }}>
                  <Button onClick={startNewCapture} variant="secondary">
                    Iniciar Primera Captura
                  </Button>
                </div>
              </div>
            </Show>

            <Show when={savedSessions().length > 0}>
              <div style={{
                display: 'grid',
                gap: '1rem',
              }}>
                {savedSessions().map((session, index) => (
                  <div
                    style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      padding: '1rem',
                      background: 'var(--bg-secondary)',
                      'border-radius': 'var(--border-radius)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => viewSession(session)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                      {/* Preview thumbnails */}
                      <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                      }}>
                        {Object.values(session.fingers)
                          .filter(f => f.captured)
                          .slice(0, 5)
                          .map(finger => (
                            <div style={{
                              width: '30px',
                              height: '36px',
                              'border-radius': '4px',
                              overflow: 'hidden',
                              background: '#1a1a2e',
                            }}>
                              <Show when={finger.imageDataUrl}>
                                <img
                                  src={finger.imageDataUrl}
                                  alt={finger.labelEs}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    'object-fit': 'cover',
                                  }}
                                />
                              </Show>
                            </div>
                          ))}
                        <Show when={session.completedCount > 5}>
                          <div style={{
                            width: '30px',
                            height: '36px',
                            'border-radius': '4px',
                            background: 'var(--bg-tertiary)',
                            display: 'flex',
                            'align-items': 'center',
                            'justify-content': 'center',
                            'font-size': '0.7rem',
                            color: 'var(--text-muted)',
                          }}>
                            +{session.completedCount - 5}
                          </div>
                        </Show>
                      </div>

                      <div>
                        <div style={{
                          'font-weight': '500',
                          color: 'var(--text-primary)',
                        }}>
                          Captura #{savedSessions().length - index}
                          {session.applicantId && ` - ID: ${session.applicantId}`}
                        </div>
                        <div style={{
                          'font-size': '0.875rem',
                          color: 'var(--text-muted)',
                        }}>
                          {new Date(session.captureStartedAt).toLocaleString()} | {session.completedCount}/10 huellas
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '1rem',
                    }}>
                      <div style={{
                        padding: '0.25rem 0.75rem',
                        'border-radius': '12px',
                        'font-size': '0.75rem',
                        background: session.completedCount === 10 ? 'var(--success-light)' : 'var(--warning-light)',
                        color: session.completedCount === 10 ? 'var(--success-dark)' : 'var(--warning-dark)',
                      }}>
                        {session.completedCount === 10 ? 'Completo' : 'Parcial'}
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Device Info Footer */}
      <div style={{
        'margin-top': '2rem',
        padding: '1rem',
        background: 'var(--bg-secondary)',
        'border-radius': 'var(--border-radius)',
        'font-size': '0.875rem',
        color: 'var(--text-muted)',
        display: 'flex',
        'justify-content': 'space-between',
        'flex-wrap': 'wrap',
        gap: '1rem',
      }}>
        <div>
          <strong>Dispositivo:</strong> SecuGen HU20-A Hamster Pro 20 |
          <strong> Resolución:</strong> 500 DPI |
          <strong> Formato:</strong> ISO/IEC 19794-4
        </div>
        <div>
          <strong>Sesión actual:</strong> {savedSessions().length} capturas
        </div>
      </div>
    </div>
  );
};

export default FingerprintPage;
