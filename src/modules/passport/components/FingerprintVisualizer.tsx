import { Component, createSignal, createEffect, For, Show, onMount } from 'solid-js';
import { Card, Button, Modal } from '../../ui';
import { devLog } from '../../../services/utils';
import {
  FingerName,
  FingerData,
  FingerprintSetData,
  FINGER_DEFINITIONS,
  CAPTURE_ORDER,
} from '../types/fingerprint';
import FingerprintRenderer from './FingerprintRenderer';

type ViewMode = 'hands' | 'grid' | 'list' | 'card';
type ExportFormat = 'png' | 'pdf' | 'json';

interface FingerprintVisualizerProps {
  data: FingerprintSetData;
  viewMode?: ViewMode;
  showQuality?: boolean;
  showLabels?: boolean;
  editable?: boolean;
  onFingerClick?: (finger: FingerData) => void;
  onExport?: (format: ExportFormat, data: string | Blob) => void;
}

const FingerprintVisualizer: Component<FingerprintVisualizerProps> = (props) => {
  const [currentViewMode, setCurrentViewMode] = createSignal<ViewMode>(props.viewMode || 'hands');
  const [selectedFinger, setSelectedFinger] = createSignal<FingerData | null>(null);
  const [showDetailModal, setShowDetailModal] = createSignal(false);
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = createSignal(false);

  const showQuality = () => props.showQuality !== false;
  const showLabels = () => props.showLabels !== false;

  // Get captured fingers
  const capturedFingers = () => {
    return Object.values(props.data.fingers).filter(f => f.captured);
  };

  // Get quality color
  const getQualityColor = (quality: number | undefined): string => {
    if (!quality) return 'var(--text-muted)';
    if (quality >= 80) return 'var(--success-color)';
    if (quality >= 60) return 'var(--warning-color)';
    return 'var(--error-color)';
  };

  // Get quality label
  const getQualityLabel = (quality: number | undefined): string => {
    if (!quality) return 'N/A';
    if (quality >= 80) return 'Excelente';
    if (quality >= 60) return 'Buena';
    if (quality >= 40) return 'Aceptable';
    return 'Baja';
  };

  // Get NFIQ description
  const getNFIQDescription = (nfiq: number | undefined): string => {
    if (!nfiq) return 'N/A';
    const descriptions: Record<number, string> = {
      1: 'Excelente',
      2: 'Muy Buena',
      3: 'Buena',
      4: 'Regular',
      5: 'Pobre',
    };
    return descriptions[nfiq] || 'N/A';
  };

  // Handle finger click
  const handleFingerClick = (finger: FingerData) => {
    if (props.onFingerClick) {
      props.onFingerClick(finger);
    } else {
      setSelectedFinger(finger);
      setShowDetailModal(true);
    }
  };

  // Draw fingerprint on canvas with enhancement
  const drawFingerprintOnCanvas = (
    canvas: HTMLCanvasElement,
    imageDataUrl: string,
    options: {
      width?: number;
      height?: number;
      enhance?: boolean;
      showGrid?: boolean;
      showMinutiae?: boolean;
    } = {}
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const width = options.width || img.width;
        const height = options.height || img.height;

        canvas.width = width;
        canvas.height = height;

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Draw the fingerprint image
        ctx.drawImage(img, 0, 0, width, height);

        // Apply enhancement if requested
        if (options.enhance) {
          const imageData = ctx.getImageData(0, 0, width, height);
          enhanceFingerprintImage(imageData);
          ctx.putImageData(imageData, 0, 0);
        }

        // Draw grid overlay if requested
        if (options.showGrid) {
          drawGridOverlay(ctx, width, height);
        }

        // Draw minutiae markers if requested (simulated)
        if (options.showMinutiae) {
          drawMinutiaeMarkers(ctx, width, height);
        }

        resolve();
      };

      img.onerror = () => {
        reject(new Error('Failed to load fingerprint image'));
      };

      img.src = imageDataUrl;
    });
  };

  // Enhance fingerprint image (contrast and sharpening)
  const enhanceFingerprintImage = (imageData: ImageData) => {
    const data = imageData.data;
    const contrast = 1.3;
    const brightness = 10;

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast and brightness
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
    }
  };

  // Draw grid overlay for analysis
  const drawGridOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  // Draw simulated minutiae markers
  const drawMinutiaeMarkers = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Simulate minutiae points (in real implementation, these would come from template analysis)
    const minutiaeCount = 15 + Math.floor(Math.random() * 10);

    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 1;

    for (let i = 0; i < minutiaeCount; i++) {
      const x = 30 + Math.random() * (width - 60);
      const y = 30 + Math.random() * (height - 60);
      const angle = Math.random() * Math.PI * 2;
      const type = Math.random() > 0.5 ? 'ending' : 'bifurcation';

      // Draw marker
      ctx.beginPath();
      if (type === 'ending') {
        // Circle for ridge ending
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Triangle for bifurcation
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x - 3, y + 3);
        ctx.lineTo(x + 3, y + 3);
        ctx.closePath();
        ctx.fill();
      }

      // Draw direction indicator
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8);
      ctx.stroke();
    }
  };

  // Export all fingerprints as composite image
  const exportAsImage = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const fingerSize = 130;
    const padding = 20;
    const cols = 5;
    const rows = 2;

    canvas.width = cols * (fingerSize + padding) + padding;
    canvas.height = rows * (fingerSize + padding * 2) + 100;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Registro de Huellas Dactilares', canvas.width / 2, 30);

    // Draw applicant info
    ctx.font = '12px Arial';
    ctx.fillText(`ID: ${props.data.applicantId || 'N/A'} | Fecha: ${new Date(props.data.captureStartedAt).toLocaleDateString()}`, canvas.width / 2, 50);

    // Draw each finger
    const fingerOrder: FingerName[] = [
      'leftLittle', 'leftRing', 'leftMiddle', 'leftIndex', 'leftThumb',
      'rightThumb', 'rightIndex', 'rightMiddle', 'rightRing', 'rightLittle'
    ];

    for (let i = 0; i < fingerOrder.length; i++) {
      const finger = props.data.fingers[fingerOrder[i]];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + col * (fingerSize + padding);
      const y = 70 + row * (fingerSize + padding * 2);

      // Finger box
      ctx.strokeStyle = finger.captured ? '#4CAF50' : '#cccccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, fingerSize, fingerSize);

      if (finger.captured && finger.imageDataUrl) {
        // Draw fingerprint image
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, x + 5, y + 5, fingerSize - 10, fingerSize - 10);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = finger.imageDataUrl!;
        });
      } else {
        // Placeholder
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x + 1, y + 1, fingerSize - 2, fingerSize - 2);
        ctx.fillStyle = '#999999';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No capturada', x + fingerSize / 2, y + fingerSize / 2);
      }

      // Label
      ctx.fillStyle = '#333333';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(finger.labelEs, x + fingerSize / 2, y + fingerSize + 15);

      // Quality
      if (finger.captured && finger.quality) {
        ctx.fillStyle = getQualityColor(finger.quality);
        ctx.fillText(`${finger.quality}%`, x + fingerSize / 2, y + fingerSize + 28);
      }
    }

    // Footer
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Dispositivo: ${props.data.deviceModel} | ${props.data.completedCount}/10 huellas capturadas`, canvas.width / 2, canvas.height - 15);

    return canvas.toDataURL('image/png');
  };

  // Export data as JSON
  const exportAsJSON = (): string => {
    const exportData = {
      ...props.data,
      exportedAt: new Date().toISOString(),
      fingers: Object.fromEntries(
        Object.entries(props.data.fingers).map(([key, finger]) => [
          key,
          {
            ...finger,
            // Optionally exclude large image data
            imageDataUrl: finger.imageDataUrl ? '[BASE64_IMAGE_DATA]' : undefined,
          },
        ])
      ),
    };
    return JSON.stringify(exportData, null, 2);
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      let data: string | Blob;

      switch (format) {
        case 'png':
          data = await exportAsImage();
          break;
        case 'json':
          data = exportAsJSON();
          break;
        case 'pdf':
          // For PDF, export as PNG first and let the caller handle PDF generation
          data = await exportAsImage();
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      if (props.onExport) {
        props.onExport(format, data);
      } else {
        // Default download behavior
        const link = document.createElement('a');
        if (format === 'json') {
          const blob = new Blob([data as string], { type: 'application/json' });
          link.href = URL.createObjectURL(blob);
          link.download = `fingerprints_${props.data.applicantId || 'export'}.json`;
        } else {
          link.href = data as string;
          link.download = `fingerprints_${props.data.applicantId || 'export'}.png`;
        }
        link.click();
      }
    } catch (error) {
      devLog('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Render hands view
  const renderHandsView = () => {
    const renderHand = (hand: 'left' | 'right') => {
      const handFingers = CAPTURE_ORDER.filter(name => props.data.fingers[name].hand === hand);
      const isRightHand = hand === 'right';

      return (
        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
        }}>
          <h4 style={{
            'margin-bottom': '0.75rem',
            color: 'var(--text-secondary)',
            'font-size': '0.875rem',
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
                const finger = props.data.fingers[fingerName];
                const isThumb = fingerName.includes('Thumb');
                const heights = [70, 100, 110, 95, 65];
                const fingerIndex = isRightHand ? index() : 4 - index();

                return (
                  <div
                    style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      'align-items': 'center',
                      cursor: 'pointer',
                      transform: isThumb ? 'translateY(15px)' : undefined,
                    }}
                    onClick={() => finger.captured && handleFingerClick(finger)}
                  >
                    <div
                      style={{
                        width: isThumb ? '50px' : '42px',
                        height: `${heights[fingerIndex]}px`,
                        'border-radius': '50% 50% 40% 40% / 40% 40% 60% 60%',
                        border: `2px solid ${finger.captured ? getQualityColor(finger.quality) : 'var(--border-color)'}`,
                        overflow: 'hidden',
                        background: finger.captured ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (finger.captured) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Show when={finger.captured && finger.imageDataUrl}>
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
                      <Show when={!finger.captured}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          color: 'var(--text-muted)',
                          'font-size': '1.5rem',
                        }}>
                          ?
                        </div>
                      </Show>
                    </div>

                    <Show when={showLabels()}>
                      <span style={{
                        'font-size': '0.6rem',
                        'margin-top': '0.25rem',
                        color: finger.captured ? getQualityColor(finger.quality) : 'var(--text-muted)',
                        'text-align': 'center',
                        'max-width': '50px',
                      }}>
                        {finger.labelEs.split(' ')[0]}
                      </span>
                    </Show>

                    <Show when={showQuality() && finger.captured && finger.quality}>
                      <span style={{
                        'font-size': '0.6rem',
                        color: getQualityColor(finger.quality),
                        'font-weight': '500',
                      }}>
                        {finger.quality}%
                      </span>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Palm */}
          <div style={{
            width: '180px',
            height: '50px',
            background: 'var(--bg-secondary)',
            'border-radius': '0 0 50% 50%',
            'margin-top': '-10px',
            border: '2px solid var(--border-color)',
            'border-top': 'none',
          }} />
        </div>
      );
    };

    return (
      <div style={{
        display: 'flex',
        'justify-content': 'center',
        gap: '3rem',
        'flex-wrap': 'wrap',
        padding: '1rem',
      }}>
        {renderHand('left')}
        {renderHand('right')}
      </div>
    );
  };

  // Render grid view
  const renderGridView = () => {
    return (
      <div style={{
        display: 'grid',
        'grid-template-columns': 'repeat(5, 1fr)',
        gap: '1rem',
        padding: '1rem',
      }}>
        <For each={CAPTURE_ORDER}>
          {(fingerName) => {
            const finger = props.data.fingers[fingerName];

            return (
              <div
                style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  'align-items': 'center',
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  'border-radius': 'var(--border-radius)',
                  border: `2px solid ${finger.captured ? getQualityColor(finger.quality) : 'var(--border-color)'}`,
                  cursor: finger.captured ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => finger.captured && handleFingerClick(finger)}
                onMouseEnter={(e) => {
                  if (finger.captured) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '80px',
                  height: '96px',
                  'border-radius': 'var(--border-radius-sm)',
                  overflow: 'hidden',
                  background: 'var(--bg-tertiary)',
                  'margin-bottom': '0.5rem',
                }}>
                  <Show when={finger.captured && finger.imageDataUrl}>
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
                  <Show when={!finger.captured}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      color: 'var(--text-muted)',
                    }}>
                      Sin captura
                    </div>
                  </Show>
                </div>

                <Show when={showLabels()}>
                  <span style={{
                    'font-size': '0.75rem',
                    color: 'var(--text-primary)',
                    'text-align': 'center',
                    'font-weight': '500',
                  }}>
                    {finger.labelEs}
                  </span>
                </Show>

                <Show when={showQuality() && finger.captured}>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    'margin-top': '0.25rem',
                    'font-size': '0.7rem',
                  }}>
                    <span style={{ color: getQualityColor(finger.quality) }}>
                      {finger.quality}%
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      NFIQ: {finger.nfiq}
                    </span>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    );
  };

  // Render list view
  const renderListView = () => {
    return (
      <div style={{ padding: '1rem' }}>
        <table style={{
          width: '100%',
          'border-collapse': 'collapse',
          'font-size': '0.875rem',
        }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th style={{ padding: '0.75rem', 'text-align': 'left', 'border-bottom': '2px solid var(--border-color)' }}>Huella</th>
              <th style={{ padding: '0.75rem', 'text-align': 'left', 'border-bottom': '2px solid var(--border-color)' }}>Dedo</th>
              <th style={{ padding: '0.75rem', 'text-align': 'center', 'border-bottom': '2px solid var(--border-color)' }}>Estado</th>
              <th style={{ padding: '0.75rem', 'text-align': 'center', 'border-bottom': '2px solid var(--border-color)' }}>Calidad</th>
              <th style={{ padding: '0.75rem', 'text-align': 'center', 'border-bottom': '2px solid var(--border-color)' }}>NFIQ</th>
              <th style={{ padding: '0.75rem', 'text-align': 'center', 'border-bottom': '2px solid var(--border-color)' }}>Capturada</th>
            </tr>
          </thead>
          <tbody>
            <For each={CAPTURE_ORDER}>
              {(fingerName) => {
                const finger = props.data.fingers[fingerName];

                return (
                  <tr
                    style={{
                      cursor: finger.captured ? 'pointer' : 'default',
                      'border-bottom': '1px solid var(--border-color)',
                    }}
                    onClick={() => finger.captured && handleFingerClick(finger)}
                    onMouseEnter={(e) => {
                      if (finger.captured) {
                        e.currentTarget.style.background = 'var(--bg-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{
                        width: '40px',
                        height: '48px',
                        'border-radius': '4px',
                        overflow: 'hidden',
                        background: 'var(--bg-secondary)',
                      }}>
                        <Show when={finger.captured && finger.imageDataUrl}>
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
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <div>
                        <div style={{ 'font-weight': '500' }}>{finger.labelEs}</div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                          {finger.hand === 'right' ? 'Mano derecha' : 'Mano izquierda'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem', 'text-align': 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        'border-radius': '12px',
                        'font-size': '0.75rem',
                        background: finger.captured ? 'var(--success-light)' : 'var(--bg-secondary)',
                        color: finger.captured ? 'var(--success-dark)' : 'var(--text-muted)',
                      }}>
                        {finger.captured ? 'Capturada' : 'Pendiente'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', 'text-align': 'center' }}>
                      <Show when={finger.captured} fallback="-">
                        <span style={{ color: getQualityColor(finger.quality), 'font-weight': '500' }}>
                          {finger.quality}%
                        </span>
                        <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                          {getQualityLabel(finger.quality)}
                        </div>
                      </Show>
                    </td>
                    <td style={{ padding: '0.5rem', 'text-align': 'center' }}>
                      <Show when={finger.captured} fallback="-">
                        <span>{finger.nfiq}</span>
                        <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                          {getNFIQDescription(finger.nfiq)}
                        </div>
                      </Show>
                    </td>
                    <td style={{ padding: '0.5rem', 'text-align': 'center', 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      <Show when={finger.captured && finger.capturedAt} fallback="-">
                        {new Date(finger.capturedAt!).toLocaleTimeString()}
                      </Show>
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    );
  };

  // Render card view (single fingerprint detail)
  const renderCardView = () => {
    const captured = capturedFingers();

    return (
      <div style={{
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        padding: '1rem',
      }}>
        <For each={captured}>
          {(finger) => (
            <div
              style={{
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius)',
                overflow: 'hidden',
                border: `2px solid ${getQualityColor(finger.quality)}`,
                cursor: 'pointer',
              }}
              onClick={() => handleFingerClick(finger)}
            >
              <div style={{
                height: '180px',
                background: '#1a1a2e',
                position: 'relative',
              }}>
                <img
                  src={finger.imageDataUrl}
                  alt={finger.labelEs}
                  style={{
                    width: '100%',
                    height: '100%',
                    'object-fit': 'contain',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  'border-radius': '4px',
                  background: getQualityColor(finger.quality),
                  color: 'white',
                  'font-size': '0.75rem',
                  'font-weight': '600',
                }}>
                  {finger.quality}%
                </div>
              </div>

              <div style={{ padding: '1rem' }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  'font-size': '1rem',
                  color: 'var(--text-primary)',
                }}>
                  {finger.labelEs}
                </h4>

                <div style={{
                  display: 'grid',
                  'grid-template-columns': '1fr 1fr',
                  gap: '0.5rem',
                  'font-size': '0.75rem',
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>NFIQ:</span>
                    <span style={{ 'margin-left': '0.25rem', 'font-weight': '500' }}>{finger.nfiq}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Mano:</span>
                    <span style={{ 'margin-left': '0.25rem' }}>{finger.hand === 'right' ? 'Der.' : 'Izq.'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    );
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'flex-start',
          'margin-bottom': '1.5rem',
          'flex-wrap': 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h2 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              margin: '0 0 0.25rem 0',
            }}>
              Visualizador de Huellas Dactilares
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, 'font-size': '0.875rem' }}>
              {props.data.completedCount} de 10 huellas capturadas
              {props.data.applicantId && ` | ID: ${props.data.applicantId}`}
            </p>
          </div>

          {/* View mode toggle */}
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            background: 'var(--bg-secondary)',
            padding: '0.25rem',
            'border-radius': 'var(--border-radius-sm)',
          }}>
            <For each={[
              { mode: 'hands' as ViewMode, label: 'Manos', icon: '🖐' },
              { mode: 'grid' as ViewMode, label: 'Cuadrícula', icon: '⊞' },
              { mode: 'list' as ViewMode, label: 'Lista', icon: '☰' },
              { mode: 'card' as ViewMode, label: 'Tarjetas', icon: '▢' },
            ]}>
              {(view) => (
                <button
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: currentViewMode() === view.mode ? 'var(--primary-color)' : 'transparent',
                    color: currentViewMode() === view.mode ? 'white' : 'var(--text-primary)',
                    'border-radius': 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    'font-size': '0.75rem',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setCurrentViewMode(view.mode)}
                  title={view.label}
                >
                  {view.icon} {view.label}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          'margin-bottom': '1.5rem',
          padding: '1rem',
          background: 'var(--bg-secondary)',
          'border-radius': 'var(--border-radius)',
          'flex-wrap': 'wrap',
        }}>
          <div>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Completadas</div>
            <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: 'var(--success-color)' }}>
              {props.data.completedCount}/10
            </div>
          </div>
          <div>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Calidad Promedio</div>
            <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
              {capturedFingers().length > 0
                ? Math.round(capturedFingers().reduce((acc, f) => acc + (f.quality || 0), 0) / capturedFingers().length)
                : 0}%
            </div>
          </div>
          <div>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Dispositivo</div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>{props.data.deviceModel}</div>
          </div>
          <div>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Fecha Captura</div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
              {new Date(props.data.captureStartedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Content based on view mode */}
        <Show when={currentViewMode() === 'hands'}>{renderHandsView()}</Show>
        <Show when={currentViewMode() === 'grid'}>{renderGridView()}</Show>
        <Show when={currentViewMode() === 'list'}>{renderListView()}</Show>
        <Show when={currentViewMode() === 'card'}>{renderCardView()}</Show>

        {/* Export buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          'justify-content': 'flex-end',
          'margin-top': '1.5rem',
          'padding-top': '1rem',
          'border-top': '1px solid var(--border-color)',
        }}>
          <Button
            onClick={() => handleExport('json')}
            variant="outline"
            size="sm"
            disabled={isExporting()}
          >
            Exportar JSON
          </Button>
          <Button
            onClick={() => handleExport('png')}
            variant="secondary"
            size="sm"
            disabled={isExporting()}
          >
            {isExporting() ? 'Exportando...' : 'Exportar Imagen'}
          </Button>
        </div>
      </div>

      {/* Detail Modal */}
      <Show when={showDetailModal() && selectedFinger()}>
        <Modal
          isOpen={showDetailModal()}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedFinger(null);
          }}
          title={`Detalle: ${selectedFinger()!.labelEs}`}
          maxWidth="600px"
        >
          <div style={{ padding: '1rem' }}>
            {/* Fingerprint Renderer with controls */}
            <div style={{
              display: 'flex',
              'justify-content': 'center',
              'margin-bottom': '1rem',
            }}>
              <FingerprintRenderer
                fingerData={selectedFinger()!}
                width={280}
                height={320}
                showControls={true}
                label={selectedFinger()!.labelEs}
              />
            </div>

            {/* Details */}
            <div style={{
              display: 'grid',
              'grid-template-columns': '1fr 1fr',
              gap: '1rem',
              'margin-bottom': '1rem',
            }}>
              <div style={{
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius-sm)',
              }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                  Calidad
                </div>
                <div style={{
                  'font-size': '1.5rem',
                  'font-weight': '600',
                  color: getQualityColor(selectedFinger()!.quality),
                }}>
                  {selectedFinger()!.quality}%
                </div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {getQualityLabel(selectedFinger()!.quality)}
                </div>
              </div>

              <div style={{
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius-sm)',
              }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                  NFIQ Score
                </div>
                <div style={{
                  'font-size': '1.5rem',
                  'font-weight': '600',
                  color: 'var(--text-primary)',
                }}>
                  {selectedFinger()!.nfiq}/5
                </div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {getNFIQDescription(selectedFinger()!.nfiq)}
                </div>
              </div>

              <div style={{
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius-sm)',
              }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                  Mano
                </div>
                <div style={{ 'font-size': '1rem', 'font-weight': '500' }}>
                  {selectedFinger()!.hand === 'right' ? 'Derecha' : 'Izquierda'}
                </div>
              </div>

              <div style={{
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius-sm)',
              }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                  Capturada
                </div>
                <div style={{ 'font-size': '0.875rem' }}>
                  {selectedFinger()!.capturedAt
                    ? new Date(selectedFinger()!.capturedAt!).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Template info */}
            <Show when={selectedFinger()!.templateData}>
              <div style={{
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem',
              }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                  Template Biometrico
                </div>
                <div style={{ 'font-size': '0.75rem', 'font-family': 'monospace', color: 'var(--text-muted)' }}>
                  {selectedFinger()!.templateData!.substring(0, 50)}...
                </div>
              </div>
            </Show>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              'justify-content': 'flex-end',
            }}>
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedFinger(null);
                }}
                variant="outline"
              >
                Cerrar
              </Button>
              <Show when={props.editable}>
                <Button
                  onClick={() => props.onFingerClick?.(selectedFinger()!)}
                  variant="secondary"
                >
                  Recapturar
                </Button>
              </Show>
            </div>
          </div>
        </Modal>
      </Show>
    </Card>
  );
};

export default FingerprintVisualizer;
