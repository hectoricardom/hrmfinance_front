import { Component, createSignal, onMount, Show, createEffect } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getSignatureRequest, saveSignature, SignatureRequest } from '../services/signatureRequest';

const PublicSignaturePage: Component = () => {
  const params = useParams();
  
  // Create mock data immediately during component initialization
  const requestId = params.id || 'test-123';
  const mockRequest = {
    id: requestId,
    clientName: 'Test Client',
    clientEmail: 'test@example.com',
    clientPhone: '+1 234 567 8900',
    documentType: 'Test Document',
    notes: 'This is a test signature request',
    status: 'pending',
    requestedBy: 'test-user',
    requestedByName: 'Test User',
    createdAt: { toDate: () => new Date() },
    expiresAt: { toDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
  };
  
  const [request, setRequest] = createSignal<SignatureRequest | null>(mockRequest as any);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [hasSignature, setHasSignature] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [success, setSuccess] = createSignal(false);

  onMount(() => {
    console.log('PublicSignaturePage - onMount started');
    console.log('PublicSignaturePage - Request already set:', request());
    
    // Initialize canvas
    setTimeout(initializeCanvas, 100);
  });

  const initializeCanvas = () => {
    const canvasEl = canvas();
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvasEl.getBoundingClientRect();
    canvasEl.width = rect.width;
    canvasEl.height = rect.height;

    // Set drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    setIsDrawing(true);
    const canvasEl = canvas();
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    let x, y;
    if (e instanceof MouseEvent) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing()) return;
    
    const canvasEl = canvas();
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    let x, y;
    if (e instanceof MouseEvent) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvasEl = canvas();
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    setHasSignature(false);
  };

  const saveSignatureHandler = async () => {
    const canvasEl = canvas();
    const req = request();
    if (!canvasEl || !req || !hasSignature()) return;

    setSaving(true);
    setError('');

    try {
      const signatureDataUrl = canvasEl.toDataURL('image/png');
      console.log('Signature captured:', signatureDataUrl.substring(0, 50) + '...');
      
      // TEMPORARY: Skip Firebase save and just simulate success
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate saving
      
      console.log('Mock signature save completed');
      setSuccess(true);
    } catch (err: any) {
      console.error('Error saving signature:', err);
      setError(err.message || 'Error al guardar la firma');
    } finally {
      setSaving(false);
    }
  };

  // Handle window resize
  createEffect(() => {
    const handleResize = () => {
      if (canvas() && hasSignature()) {
        // Save current canvas content
        const canvasEl = canvas()!;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasEl.width;
        tempCanvas.height = canvasEl.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(canvasEl, 0, 0);

        // Resize canvas
        initializeCanvas();

        // Restore content
        const ctx = canvasEl.getContext('2d')!;
        ctx.drawImage(tempCanvas, 0, 0);
      } else {
        initializeCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  const pageStyle = {
    'min-height': '100vh',
    background: 'var(--background-secondary)',
    padding: '1rem',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center'
  };

  const containerStyle = {
    'max-width': '500px',
    width: '100%',
    background: 'white',
    'border-radius': 'var(--border-radius)',
    'box-shadow': 'var(--shadow-lg)',
    overflow: 'hidden'
  };

  const headerStyle = {
    background: 'var(--primary-color)',
    color: 'white',
    padding: '2rem',
    'text-align': 'center'
  };

  const contentStyle = {
    padding: '2rem'
  };

  const canvasStyle = {
    width: '100%',
    height: '300px',
    border: '2px dashed var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'crosshair',
    'touch-action': 'none',
    background: 'white'
  };

  const buttonStyle = {
    width: '100%',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    border: 'none',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  // Debug output
  console.log('Render - loading:', loading(), 'request:', !!request(), 'error:', error(), 'success:', success());
  
  if (loading()) {
    console.log('Showing loading screen');
    return (
      <div style={pageStyle}>
        <div style={{ 'text-align': 'center' }}>
          <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>⏳</div>
          <p>Cargando solicitud de firma...</p>
        </div>
      </div>
    );
  }

  if (error() && !request()) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ padding: '3rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>❌</div>
            <h2 style={{ 'margin-bottom': '1rem', color: 'var(--error-color)' }}>Error</h2>
            <p style={{ color: 'var(--text-muted)' }}>{error()}</p>
          </div>
        </div>
      </div>
    );
  }

  if (success()) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ padding: '3rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>✅</div>
            <h2 style={{ 'margin-bottom': '1rem', color: 'var(--success-color)' }}>¡Firma Guardada!</h2>
            <p style={{ color: 'var(--text-muted)', 'margin-bottom': '2rem' }}>
              Su firma ha sido guardada exitosamente.
            </p>
            <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Puede cerrar esta ventana.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const req = request();
  if (!req) return null;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={{ 'font-size': '1.5rem', 'margin-bottom': '0.5rem' }}>
            Solicitud de Firma
          </h1>
          <p style={{ opacity: '0.9', 'font-size': '0.875rem' }}>
            {req.requestedByName}
          </p>
        </div>

        <div style={contentStyle}>
          <div style={{ 'margin-bottom': '2rem' }}>
            <h3 style={{ 'margin-bottom': '1rem', color: 'var(--text-primary)' }}>
              Información del Cliente
            </h3>
            <div style={{ 
              background: 'var(--background-secondary)', 
              padding: '1rem', 
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem'
            }}>
              <p><strong>Nombre:</strong> {req.clientName}</p>
              <p><strong>Email:</strong> {req.clientEmail}</p>
              <Show when={req.clientPhone}>
                <p><strong>Teléfono:</strong> {req.clientPhone}</p>
              </Show>
              <Show when={req.documentType}>
                <p><strong>Tipo de Documento:</strong> {req.documentType}</p>
              </Show>
              <Show when={req.notes}>
                <p style={{ 'margin-top': '0.5rem' }}><strong>Notas:</strong> {req.notes}</p>
              </Show>
            </div>
          </div>

          <Show when={error()}>
            <div style={{
              padding: '1rem',
              background: 'var(--error-light)',
              color: 'var(--error-dark)',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1rem'
            }}>
              {error()}
            </div>
          </Show>

          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h3 style={{ 'margin-bottom': '1rem', color: 'var(--text-primary)' }}>
              Firme en el Área Indicada
            </h3>
            <canvas
              ref={setCanvas}
              style={canvasStyle}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <p style={{ 
              'margin-top': '0.5rem', 
              'font-size': '0.8rem', 
              color: 'var(--text-muted)',
              'text-align': 'center'
            }}>
              Use su dedo o mouse para dibujar su firma
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', 'margin-bottom': '1rem' }}>
            <button
              onClick={clearSignature}
              style={{
                ...buttonStyle,
                background: 'var(--background-secondary)',
                color: 'var(--text-primary)'
              }}
              disabled={!hasSignature() || saving()}
            >
              Limpiar
            </button>
            <button
              onClick={saveSignatureHandler}
              style={{
                ...buttonStyle,
                background: 'var(--primary-color)',
                color: 'white'
              }}
              disabled={!hasSignature() || saving()}
            >
              <Show when={saving()} fallback="Guardar Firma">
                Guardando...
              </Show>
            </button>
          </div>

          <p style={{ 
            'font-size': '0.75rem', 
            color: 'var(--text-muted)', 
            'text-align': 'center',
            'line-height': '1.4'
          }}>
            Al firmar, usted acepta que esta firma electrónica tiene la misma validez legal que una firma manuscrita.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicSignaturePage;