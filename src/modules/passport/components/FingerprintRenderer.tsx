import { Component, createSignal, createEffect, Show, onMount } from 'solid-js';
import { FingerData, FingerprintSetData } from '../types/fingerprint';

interface RenderOptions {
  enhance?: boolean;           // Apply contrast/brightness enhancement
  showGrid?: boolean;          // Show analysis grid overlay
  showMinutiae?: boolean;      // Show minutiae markers (simulated)
  showCoreAndDelta?: boolean;  // Show core and delta points
  grayscale?: boolean;         // Convert to grayscale
  invert?: boolean;            // Invert colors
  brightness?: number;         // Brightness adjustment (-100 to 100)
  contrast?: number;           // Contrast adjustment (0.5 to 2.0)
  zoom?: number;               // Zoom level (0.5 to 3.0)
}

interface FingerprintRendererProps {
  // Single fingerprint
  fingerData?: FingerData;
  // Or image data URL directly
  imageDataUrl?: string;
  // Render options
  options?: RenderOptions;
  // Size
  width?: number;
  height?: number;
  // Callbacks
  onRenderComplete?: (canvas: HTMLCanvasElement) => void;
  onClick?: () => void;
  // Show controls
  showControls?: boolean;
  // Label
  label?: string;
}

const DEFAULT_OPTIONS: RenderOptions = {
  enhance: false,
  showGrid: false,
  showMinutiae: false,
  showCoreAndDelta: false,
  grayscale: false,
  invert: false,
  brightness: 0,
  contrast: 1.0,
  zoom: 1.0,
};

const FingerprintRenderer: Component<FingerprintRendererProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;

  const [isRendering, setIsRendering] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [currentOptions, setCurrentOptions] = createSignal<RenderOptions>({
    ...DEFAULT_OPTIONS,
    ...props.options,
  });

  const width = () => props.width || 260;
  const height = () => props.height || 300;
  const imageUrl = () => props.fingerData?.imageDataUrl || props.imageDataUrl;

  // Re-render when options change
  createEffect(() => {
    const opts = { ...DEFAULT_OPTIONS, ...props.options };
    setCurrentOptions(opts);
  });

  // Render fingerprint when data changes
  createEffect(() => {
    const url = imageUrl();
    const opts = currentOptions();
    if (url && canvasRef) {
      renderFingerprint(url, opts);
    }
  });

  onMount(() => {
    if (imageUrl() && canvasRef) {
      renderFingerprint(imageUrl()!, currentOptions());
    }
  });

  // Main render function
  const renderFingerprint = async (dataUrl: string, options: RenderOptions) => {
    if (!canvasRef) return;

    setIsRendering(true);
    setError(null);

    try {
      const ctx = canvasRef.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Load the image
      const img = await loadImage(dataUrl);

      // Calculate dimensions with zoom
      const zoom = options.zoom || 1.0;
      const renderWidth = width();
      const renderHeight = height();

      canvasRef.width = renderWidth;
      canvasRef.height = renderHeight;

      // Clear canvas with dark background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, renderWidth, renderHeight);

      // Calculate centered position with zoom
      const scaledWidth = img.width * zoom;
      const scaledHeight = img.height * zoom;
      const offsetX = (renderWidth - scaledWidth) / 2;
      const offsetY = (renderHeight - scaledHeight) / 2;

      // Draw the fingerprint image
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Get image data for processing
      let imageData = ctx.getImageData(0, 0, renderWidth, renderHeight);

      // Apply image processing
      if (options.grayscale) {
        applyGrayscale(imageData);
      }

      if (options.brightness !== undefined && options.brightness !== 0) {
        applyBrightness(imageData, options.brightness);
      }

      if (options.contrast !== undefined && options.contrast !== 1.0) {
        applyContrast(imageData, options.contrast);
      }

      if (options.enhance) {
        applyEnhancement(imageData);
      }

      if (options.invert) {
        applyInvert(imageData);
      }

      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);

      // Draw overlays
      if (options.showGrid) {
        drawGrid(ctx, renderWidth, renderHeight);
      }

      if (options.showCoreAndDelta) {
        drawCoreAndDelta(ctx, renderWidth, renderHeight);
      }

      if (options.showMinutiae) {
        drawMinutiae(ctx, renderWidth, renderHeight);
      }

      // Notify completion
      if (props.onRenderComplete) {
        props.onRenderComplete(canvasRef);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render fingerprint');
    } finally {
      setIsRendering(false);
    }
  };

  // Load image from data URL
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  };

  // Image processing functions
  const applyGrayscale = (imageData: ImageData) => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  };

  const applyBrightness = (imageData: ImageData, brightness: number) => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + brightness));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
    }
  };

  const applyContrast = (imageData: ImageData, contrast: number) => {
    const data = imageData.data;
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
    }
  };

  const applyEnhancement = (imageData: ImageData) => {
    // Apply adaptive contrast enhancement
    const data = imageData.data;
    const contrast = 1.4;
    const brightness = 15;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
    }
  };

  const applyInvert = (imageData: ImageData) => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  };

  // Draw grid overlay
  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Draw core and delta points (simulated positions)
  const drawCoreAndDelta = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Core point (center of fingerprint pattern)
    const coreX = w / 2 + (Math.random() - 0.5) * 20;
    const coreY = h / 2 - 20 + (Math.random() - 0.5) * 15;

    ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.lineWidth = 2;

    // Draw core as circle
    ctx.beginPath();
    ctx.arc(coreX, coreY, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(coreX, coreY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.font = '10px Arial';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.fillText('Core', coreX + 12, coreY + 4);

    // Delta points (triangular convergence)
    const deltaPoints = [
      { x: w / 4 + (Math.random() - 0.5) * 20, y: h * 0.7 + (Math.random() - 0.5) * 20 },
      { x: (w * 3) / 4 + (Math.random() - 0.5) * 20, y: h * 0.7 + (Math.random() - 0.5) * 20 },
    ];

    ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.9)';

    deltaPoints.forEach((delta, i) => {
      // Draw delta as triangle
      ctx.beginPath();
      ctx.moveTo(delta.x, delta.y - 8);
      ctx.lineTo(delta.x - 7, delta.y + 5);
      ctx.lineTo(delta.x + 7, delta.y + 5);
      ctx.closePath();
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
      ctx.fillText(`Delta ${i + 1}`, delta.x + 10, delta.y + 4);
    });
  };

  // Draw minutiae markers
  const drawMinutiae = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Generate simulated minutiae points
    const minutiaeCount = 20 + Math.floor(Math.random() * 15);
    const minutiae: { x: number; y: number; type: 'ending' | 'bifurcation'; angle: number }[] = [];

    for (let i = 0; i < minutiaeCount; i++) {
      minutiae.push({
        x: 30 + Math.random() * (w - 60),
        y: 30 + Math.random() * (h - 60),
        type: Math.random() > 0.5 ? 'ending' : 'bifurcation',
        angle: Math.random() * Math.PI * 2,
      });
    }

    // Draw minutiae
    minutiae.forEach((m) => {
      if (m.type === 'ending') {
        // Ridge ending - small filled circle
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bifurcation - small triangle
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - 4);
        ctx.lineTo(m.x - 3, m.y + 3);
        ctx.lineTo(m.x + 3, m.y + 3);
        ctx.closePath();
        ctx.fill();
      }

      // Direction indicator
      ctx.strokeStyle = m.type === 'ending' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 255, 0, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + Math.cos(m.angle) * 10, m.y + Math.sin(m.angle) * 10);
      ctx.stroke();
    });

    // Draw legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(5, h - 35, 100, 30);

    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(15, h - 22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '9px Arial';
    ctx.fillText('Terminaciones', 22, h - 19);

    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.moveTo(15, h - 14);
    ctx.lineTo(11, h - 6);
    ctx.lineTo(19, h - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText('Bifurcaciones', 22, h - 8);
  };

  // Update an option
  const updateOption = (key: keyof RenderOptions, value: any) => {
    setCurrentOptions(prev => ({ ...prev, [key]: value }));
  };

  // Export current canvas as image
  const exportAsImage = (): string | null => {
    if (!canvasRef) return null;
    return canvasRef.toDataURL('image/png');
  };

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      gap: '1rem',
    }}>
      {/* Canvas */}
      <div
        style={{
          position: 'relative',
          background: '#1a1a2e',
          'border-radius': '8px',
          overflow: 'hidden',
          cursor: props.onClick ? 'pointer' : 'default',
          border: '2px solid var(--border-color)',
        }}
        onClick={props.onClick}
      >
        <canvas
          ref={canvasRef}
          width={width()}
          height={height()}
          style={{
            display: 'block',
          }}
        />

        {/* Loading overlay */}
        <Show when={isRendering()}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            color: 'white',
          }}>
            Renderizando...
          </div>
        </Show>

        {/* Error overlay */}
        <Show when={error()}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(220, 38, 38, 0.9)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            color: 'white',
            padding: '1rem',
            'text-align': 'center',
          }}>
            {error()}
          </div>
        </Show>

        {/* No image overlay */}
        <Show when={!imageUrl() && !error()}>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            color: 'var(--text-muted)',
            gap: '0.5rem',
          }}>
            <span style={{ 'font-size': '2rem' }}>?</span>
            <span style={{ 'font-size': '0.875rem' }}>Sin imagen</span>
          </div>
        </Show>
      </div>

      {/* Label */}
      <Show when={props.label}>
        <div style={{
          'font-size': '0.875rem',
          'font-weight': '500',
          color: 'var(--text-primary)',
        }}>
          {props.label}
        </div>
      </Show>

      {/* Quality indicator */}
      <Show when={props.fingerData?.quality}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          'font-size': '0.75rem',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Calidad:</span>
          <span style={{
            color: (props.fingerData?.quality || 0) >= 80 ? 'var(--success-color)'
              : (props.fingerData?.quality || 0) >= 60 ? 'var(--warning-color)'
                : 'var(--error-color)',
            'font-weight': '600',
          }}>
            {props.fingerData?.quality}%
          </span>
        </div>
      </Show>

      {/* Controls */}
      <Show when={props.showControls}>
        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '0.5rem',
          width: '100%',
          padding: '0.75rem',
          background: 'var(--bg-secondary)',
          'border-radius': '8px',
          'font-size': '0.75rem',
        }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
            Opciones de Visualizacion
          </div>

          {/* Toggle options */}
          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentOptions().enhance}
                onChange={(e) => updateOption('enhance', e.currentTarget.checked)}
              />
              Mejorar
            </label>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentOptions().showGrid}
                onChange={(e) => updateOption('showGrid', e.currentTarget.checked)}
              />
              Cuadricula
            </label>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentOptions().showMinutiae}
                onChange={(e) => updateOption('showMinutiae', e.currentTarget.checked)}
              />
              Minucias
            </label>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentOptions().showCoreAndDelta}
                onChange={(e) => updateOption('showCoreAndDelta', e.currentTarget.checked)}
              />
              Core/Delta
            </label>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentOptions().grayscale}
                onChange={(e) => updateOption('grayscale', e.currentTarget.checked)}
              />
              Escala grises
            </label>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentOptions().invert}
                onChange={(e) => updateOption('invert', e.currentTarget.checked)}
              />
              Invertir
            </label>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap', 'margin-top': '0.5rem' }}>
            <div style={{ flex: 1, 'min-width': '120px' }}>
              <label>Brillo: {currentOptions().brightness}</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentOptions().brightness}
                onInput={(e) => updateOption('brightness', parseInt(e.currentTarget.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1, 'min-width': '120px' }}>
              <label>Contraste: {(currentOptions().contrast || 1).toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={currentOptions().contrast}
                onInput={(e) => updateOption('contrast', parseFloat(e.currentTarget.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1, 'min-width': '120px' }}>
              <label>Zoom: {(currentOptions().zoom || 1).toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={currentOptions().zoom}
                onInput={(e) => updateOption('zoom', parseFloat(e.currentTarget.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={() => setCurrentOptions({ ...DEFAULT_OPTIONS })}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              'border-radius': '4px',
              cursor: 'pointer',
              'margin-top': '0.5rem',
              'align-self': 'flex-start',
            }}
          >
            Restablecer
          </button>
        </div>
      </Show>
    </div>
  );
};

export default FingerprintRenderer;
