import { Component, createSignal, createEffect, For, Show, onMount, onCleanup } from 'solid-js';
import { Card, Button, Modal } from '../../ui';
import { FingerprintService, getFingerprintService } from '../services/fingerprintService';
import {
  FingerName,
  FingerData,
  FingerprintSetData,
  FingerprintDeviceInfo,
  FingerprintVendor,
  FINGER_DEFINITIONS,
  CAPTURE_ORDER,
  FingerprintCaptureResult,
  VENDOR_INFO,
} from '../types/fingerprint';
import FingerprintRenderer from './FingerprintRenderer';

interface FingerprintCaptureProps {
  onComplete?: (data: FingerprintSetData) => void;
  onCancel?: () => void;
  applicantId?: string;
  initialData?: Partial<FingerprintSetData>;
  minRequiredFingers?: number;
  preferredVendor?: FingerprintVendor;
}

const FingerprintCapture: Component<FingerprintCaptureProps> = (props) => {
  const minRequired = props.minRequiredFingers ?? 10;

  // State
  const [deviceInfo, setDeviceInfo] = createSignal<FingerprintDeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = createSignal(false);
  const [connectionError, setConnectionError] = createSignal<string>('');
  const [fingers, setFingers] = createSignal<Record<FingerName, FingerData>>(initializeFingers());
  const [selectedFinger, setSelectedFinger] = createSignal<FingerName | null>(null);
  const [isCapturing, setIsCapturing] = createSignal(false);
  const [captureMessage, setCaptureMessage] = createSignal('');
  const [showPreviewModal, setShowPreviewModal] = createSignal(false);
  const [previewFinger, setPreviewFinger] = createSignal<FingerData | null>(null);
  const [captureStartTime, setCaptureStartTime] = createSignal<string | null>(null);
  const [autoAdvance, setAutoAdvance] = createSignal(true);
  const [selectedVendor, setSelectedVendor] = createSignal<FingerprintVendor>(props.preferredVendor || 'secugen');
  const [showVendorSelector, setShowVendorSelector] = createSignal(false);

  let fingerprintService: FingerprintService;

  function initializeFingers(): Record<FingerName, FingerData> {
    const result: Record<string, FingerData> = {};
    for (const [name, def] of Object.entries(FINGER_DEFINITIONS)) {
      result[name] = {
        ...def,
        captured: false,
      };
    }
    // Merge with initial data if provided
    if (props.initialData?.fingers) {
      for (const [name, data] of Object.entries(props.initialData.fingers)) {
        if (result[name]) {
          result[name] = { ...result[name], ...data };
        }
      }
    }
    return result as Record<FingerName, FingerData>;
  }

  // Computed values
  const capturedCount = () => Object.values(fingers()).filter(f => f.captured).length;
  const isComplete = () => capturedCount() >= minRequired;
  const nextUncapturedFinger = () => CAPTURE_ORDER.find(name => !fingers()[name].captured);

  onMount(async () => {
    fingerprintService = getFingerprintService({ preferredVendor: selectedVendor() });
    await connectToDevice();
    setCaptureStartTime(new Date().toISOString());
  });

  onCleanup(() => {
    if (fingerprintService) {
      fingerprintService.cancelCapture();
    }
  });

  async function connectToDevice() {
    setIsConnecting(true);
    setConnectionError('');

    try {
      const info = await fingerprintService.initializeWithVendor(selectedVendor());
      setDeviceInfo(info);
      setCaptureMessage(`Dispositivo ${VENDOR_INFO[selectedVendor()].name} conectado. Seleccione un dedo para capturar.`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error de conexión';
      setConnectionError(errorMsg);
      setCaptureMessage('Modo de simulación activo - Dispositivo no conectado');
      // Still allow operation in simulation mode
      const vendor = selectedVendor();
      const isSecuGen = vendor === 'secugen';
      setDeviceInfo({
        connected: false,
        vendor,
        model: isSecuGen ? 'SecuGen HU20-A (Simulación)' : 'Digital Persona U.are.U (Simulación)',
        imageWidth: isSecuGen ? 260 : 355,
        imageHeight: isSecuGen ? 300 : 390,
        imageDPI: 500,
      });
    } finally {
      setIsConnecting(false);
    }
  }

  async function switchVendor(vendor: FingerprintVendor) {
    if (vendor === selectedVendor()) return;

    setSelectedVendor(vendor);
    setShowVendorSelector(false);

    // Reconnect with new vendor
    await connectToDevice();
  }

  async function handleFingerClick(fingerName: FingerName) {
    if (isCapturing()) return;

    setSelectedFinger(fingerName);
    setCaptureMessage(`Coloque el ${fingers()[fingerName].labelEs} en el lector...`);
    await captureFingerprint(fingerName);
  }

  async function captureFingerprint(fingerName: FingerName) {
    setIsCapturing(true);
    setCaptureMessage(`Capturando ${fingers()[fingerName].labelEs}...`);

    try {
      const result = await fingerprintService.captureFingerprint(fingerName);

      if (result.success) {
        // Update finger data
        setFingers(prev => ({
          ...prev,
          [fingerName]: {
            ...prev[fingerName],
            captured: true,
            imageDataUrl: result.imageDataUrl,
            quality: result.quality,
            nfiq: result.nfiq,
            templateData: result.templateData,
            capturedAt: new Date().toISOString(),
          },
        }));

        const qualityText = result.quality && result.quality >= 80
          ? 'Excelente'
          : result.quality && result.quality >= 60
          ? 'Buena'
          : 'Aceptable';

        setCaptureMessage(`${fingers()[fingerName].labelEs} capturado - Calidad: ${qualityText} (${result.quality}%)`);

        // Auto-advance to next finger
        if (autoAdvance()) {
          const next = CAPTURE_ORDER.find(name => name !== fingerName && !fingers()[name].captured);
          if (next) {
            setTimeout(() => {
              setSelectedFinger(next);
              setCaptureMessage(`Siguiente: ${fingers()[next].labelEs}`);
            }, 1500);
          } else if (capturedCount() + 1 >= minRequired) {
            setCaptureMessage('Todas las huellas capturadas correctamente');
          }
        }
      } else {
        setCaptureMessage(`Error: ${result.error || 'No se pudo capturar la huella'}`);
      }
    } catch (error) {
      setCaptureMessage(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsCapturing(false);
    }
  }

  function recaptureFinger(fingerName: FingerName) {
    // Reset the finger data
    setFingers(prev => ({
      ...prev,
      [fingerName]: {
        ...FINGER_DEFINITIONS[fingerName],
        captured: false,
      },
    }));
    setShowPreviewModal(false);
    setPreviewFinger(null);
    handleFingerClick(fingerName);
  }

  function showFingerPreview(finger: FingerData) {
    setPreviewFinger(finger);
    setShowPreviewModal(true);
  }

  function handleComplete() {
    const data: FingerprintSetData = {
      applicantId: props.applicantId,
      fingers: fingers(),
      completedCount: capturedCount(),
      totalCount: 10,
      captureStartedAt: captureStartTime() || new Date().toISOString(),
      captureCompletedAt: new Date().toISOString(),
      deviceSerial: deviceInfo()?.serial,
      deviceModel: deviceInfo()?.model || VENDOR_INFO[selectedVendor()].models[0],
      deviceVendor: selectedVendor(),
    };
    props.onComplete?.(data);
  }

  // Hand SVG rendering
  function renderHand(hand: 'left' | 'right') {
    const handFingers = CAPTURE_ORDER.filter(name => fingers()[name].hand === hand);
    const isRightHand = hand === 'right';

    return (
      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        padding: '1rem',
      }}>
        <h4 style={{
          'margin-bottom': '1rem',
          color: 'var(--text-secondary)',
          'font-weight': '500',
        }}>
          {isRightHand ? 'Mano Derecha' : 'Mano Izquierda'}
        </h4>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          'flex-direction': isRightHand ? 'row' : 'row-reverse',
          'align-items': 'flex-end',
        }}>
          <For each={handFingers}>
            {(fingerName, index) => {
              const finger = () => fingers()[fingerName];
              const isThumb = fingerName.includes('Thumb');
              const isSelected = () => selectedFinger() === fingerName;

              // Calculate finger heights for visual effect
              const heights = [70, 100, 110, 95, 65]; // thumb, index, middle, ring, little
              const fingerIndex = isRightHand ? index() : 4 - index();

              return (
                <div
                  style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    cursor: isCapturing() ? 'wait' : 'pointer',
                    transform: isThumb ? 'translateY(15px)' : undefined,
                  }}
                  onClick={() => !isCapturing() && handleFingerClick(fingerName)}
                >
                  {/* Finger visual */}
                  <div
                    style={{
                      width: isThumb ? '42px' : '36px',
                      height: `${heights[fingerIndex]}px`,
                      background: finger().captured
                        ? 'var(--success-color)'
                        : isSelected()
                        ? 'var(--primary-color)'
                        : 'var(--border-color)',
                      'border-radius': '50% 50% 40% 40% / 40% 40% 60% 60%',
                      border: isSelected() ? '3px solid var(--primary-dark)' : '2px solid transparent',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      position: 'relative',
                      'box-shadow': isSelected() ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCapturing()) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {/* Quality indicator */}
                    <Show when={finger().captured && finger().imageDataUrl}>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '5px',
                          width: '24px',
                          height: '24px',
                          'border-radius': '50%',
                          background: 'white',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          'font-size': '12px',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          showFingerPreview(finger());
                        }}
                        title="Ver huella capturada"
                      >
                        {(finger().quality ?? 0) >= 80 ? '✓' : (finger().quality ?? 0) >= 60 ? '○' : '!'}
                      </div>
                    </Show>

                    {/* Capturing indicator */}
                    <Show when={isCapturing() && isSelected()}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '20px',
                        border: '3px solid white',
                        'border-top-color': 'transparent',
                        'border-radius': '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                    </Show>
                  </div>

                  {/* Finger label */}
                  <span style={{
                    'font-size': '0.65rem',
                    'margin-top': '0.25rem',
                    color: finger().captured ? 'var(--success-color)' : 'var(--text-muted)',
                    'text-align': 'center',
                    'max-width': '45px',
                    'word-wrap': 'break-word',
                  }}>
                    {finger().labelEs.split(' ')[0]}
                  </span>
                </div>
              );
            }}
          </For>
        </div>

        {/* Palm visual */}
        <div style={{
          width: '180px',
          height: '60px',
          background: 'var(--bg-secondary)',
          'border-radius': '0 0 50% 50%',
          'margin-top': '-10px',
          border: '2px solid var(--border-color)',
          'border-top': 'none',
        }} />
      </div>
    );
  }

  return (
    <Card>
      <style>{`
        @keyframes spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'flex-start',
          'margin-bottom': '1.5rem',
        }}>
          <div>
            <h2 style={{
              'font-size': '1.5rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0',
            }}>
              Captura de Huellas Dactilares
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {VENDOR_INFO[selectedVendor()].description}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', 'align-items': 'center' }}>
            {/* Vendor selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowVendorSelector(!showVendorSelector())}
                disabled={isCapturing() || isConnecting()}
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  cursor: isCapturing() || isConnecting() ? 'not-allowed' : 'pointer',
                  'font-size': '0.875rem',
                  color: 'var(--text-primary)',
                }}
              >
                <span>{VENDOR_INFO[selectedVendor()].name}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
                </svg>
              </button>

              {/* Vendor dropdown */}
              <Show when={showVendorSelector()}>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  'margin-top': '0.25rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
                  'z-index': '100',
                  'min-width': '200px',
                }}>
                  <For each={Object.entries(VENDOR_INFO)}>
                    {([vendor, info]) => (
                      <button
                        onClick={() => switchVendor(vendor as FingerprintVendor)}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: 'none',
                          background: vendor === selectedVendor() ? 'var(--primary-light)' : 'transparent',
                          cursor: 'pointer',
                          'text-align': 'left',
                          'font-size': '0.875rem',
                        }}
                      >
                        <div style={{ 'font-weight': '500', color: 'var(--text-primary)' }}>
                          {info.name}
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                          {info.models[0]}
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Device status */}
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: deviceInfo()?.connected ? 'var(--success-light)' : 'var(--warning-light)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem',
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                'border-radius': '50%',
                background: deviceInfo()?.connected ? 'var(--success-color)' : 'var(--warning-color)',
                animation: isConnecting() ? 'pulse 1s infinite' : 'none',
              }} />
              <span style={{
                color: deviceInfo()?.connected ? 'var(--success-dark)' : 'var(--warning-dark)',
              }}>
                {isConnecting() ? 'Conectando...' : deviceInfo()?.connected ? 'Conectado' : 'Simulación'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection error message */}
        <Show when={connectionError()}>
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: 'var(--warning-light)',
            color: 'var(--warning-dark)',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.875rem',
          }}>
            {connectionError()}
            <br />
            <small>El sistema funcionará en modo de simulación para demostración.</small>
          </div>
        </Show>

        {/* Progress bar */}
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'margin-bottom': '0.5rem',
          }}>
            <span style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
              Progreso: {capturedCount()} de {minRequired} huellas
            </span>
            <span style={{
              'font-size': '0.875rem',
              color: isComplete() ? 'var(--success-color)' : 'var(--text-muted)',
            }}>
              {Math.round((capturedCount() / minRequired) * 100)}%
            </span>
          </div>
          <div style={{
            height: '8px',
            background: 'var(--bg-secondary)',
            'border-radius': '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(capturedCount() / minRequired) * 100}%`,
              background: isComplete() ? 'var(--success-color)' : 'var(--primary-color)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Capture message */}
        <div style={{
          'text-align': 'center',
          padding: '1rem',
          'margin-bottom': '1.5rem',
          background: 'var(--bg-secondary)',
          'border-radius': 'var(--border-radius)',
          'min-height': '50px',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
        }}>
          <p style={{
            margin: 0,
            color: isCapturing() ? 'var(--primary-color)' : 'var(--text-primary)',
            'font-weight': isCapturing() ? '500' : 'normal',
          }}>
            {captureMessage() || 'Haga clic en un dedo para iniciar la captura'}
          </p>
        </div>

        {/* Hands display */}
        <div style={{
          display: 'flex',
          'justify-content': 'center',
          gap: '2rem',
          'flex-wrap': 'wrap',
          'margin-bottom': '2rem',
        }}>
          {renderHand('left')}
          {renderHand('right')}
        </div>

        {/* Captured fingerprints gallery */}
        <Show when={capturedCount() > 0}>
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h4 style={{
              'font-size': '0.875rem',
              'font-weight': '500',
              color: 'var(--text-secondary)',
              'margin-bottom': '0.75rem',
            }}>
              Huellas Capturadas
            </h4>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              'flex-wrap': 'wrap',
            }}>
              <For each={Object.values(fingers()).filter(f => f.captured)}>
                {(finger) => (
                  <div
                    style={{
                      width: '60px',
                      height: '70px',
                      'border-radius': 'var(--border-radius-sm)',
                      overflow: 'hidden',
                      border: '2px solid var(--success-color)',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => showFingerPreview(finger)}
                    title={`${finger.labelEs} - Calidad: ${finger.quality}%`}
                  >
                    <img
                      src={finger.imageDataUrl}
                      alt={finger.labelEs}
                      style={{
                        width: '100%',
                        height: '100%',
                        'object-fit': 'cover',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      'font-size': '0.6rem',
                      padding: '2px',
                      'text-align': 'center',
                    }}>
                      {finger.quality}%
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Options */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '1rem',
          'margin-bottom': '1.5rem',
          padding: '0.75rem',
          background: 'var(--bg-secondary)',
          'border-radius': 'var(--border-radius-sm)',
        }}>
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            'font-size': '0.875rem',
          }}>
            <input
              type="checkbox"
              checked={autoAdvance()}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Avanzar automáticamente al siguiente dedo
          </label>

          <Show when={!deviceInfo()?.connected}>
            <Button
              onClick={connectToDevice}
              variant="outline"
              size="sm"
              disabled={isConnecting()}
            >
              {isConnecting() ? 'Conectando...' : 'Reconectar dispositivo'}
            </Button>
          </Show>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'justify-content': 'flex-end',
        }}>
          <Show when={props.onCancel}>
            <Button
              onClick={props.onCancel}
              variant="outline"
              disabled={isCapturing()}
            >
              Cancelar
            </Button>
          </Show>

          <Button
            onClick={handleComplete}
            variant="primary"
            disabled={!isComplete() || isCapturing()}
          >
            {isComplete() ? 'Completar Captura' : `Faltan ${minRequired - capturedCount()} huellas`}
          </Button>
        </div>

        {/* Requirements info */}
        <div style={{
          'margin-top': '1.5rem',
          padding: '1rem',
          background: 'var(--info-light)',
          'border-radius': 'var(--border-radius)',
          'font-size': '0.875rem',
          color: 'var(--info-dark)',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Instrucciones:</h4>
          <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
            <li>Coloque el dedo firmemente sobre el sensor</li>
            <li>Mantenga el dedo quieto durante la captura</li>
            <li>Asegúrese de que el dedo esté limpio y seco</li>
            <li>Si la calidad es baja, puede recapturar haciendo clic en la huella</li>
            <li>Se requieren las 10 huellas para completar el proceso</li>
          </ul>
        </div>
      </div>

      {/* Preview Modal */}
      <Show when={showPreviewModal() && previewFinger()}>
        <Modal
          isOpen={showPreviewModal()}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewFinger(null);
          }}
          title={`Huella: ${previewFinger()!.labelEs}`}
          maxWidth="550px"
        >
          <div style={{ padding: '1rem' }}>
            {/* FingerprintRenderer with controls for analysis */}
            <div style={{
              display: 'flex',
              'justify-content': 'center',
              'margin-bottom': '1rem',
            }}>
              <FingerprintRenderer
                fingerData={previewFinger()!}
                width={260}
                height={300}
                showControls={true}
                label={previewFinger()!.labelEs}
              />
            </div>

            {/* Capture details */}
            <div style={{
              display: 'grid',
              'grid-template-columns': '1fr 1fr',
              gap: '0.5rem',
              'font-size': '0.875rem',
              'margin-bottom': '1rem',
              padding: '0.75rem',
              background: 'var(--bg-secondary)',
              'border-radius': 'var(--border-radius-sm)',
            }}>
              <div>
                <strong>Calidad:</strong> {previewFinger()!.quality}%
              </div>
              <div>
                <strong>NFIQ:</strong> {previewFinger()!.nfiq} de 5
              </div>
              <div>
                <strong>Capturada:</strong> {new Date(previewFinger()!.capturedAt!).toLocaleTimeString()}
              </div>
              <div>
                <strong>Mano:</strong> {previewFinger()!.hand === 'right' ? 'Derecha' : 'Izquierda'}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              'justify-content': 'flex-end',
            }}>
              <Button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewFinger(null);
                }}
                variant="outline"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => recaptureFinger(previewFinger()!.name)}
                variant="secondary"
              >
                Recapturar
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </Card>
  );
};

export default FingerprintCapture;
