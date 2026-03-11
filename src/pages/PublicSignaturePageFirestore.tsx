import { Component, createSignal, onMount, Show, createEffect } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getSignatureRequestByToken, saveSignaturePublic, SignatureRequest } from '../services/signatureRequest';

const PublicSignaturePageFirestore: Component = () => {
  const params = useParams();
  const [request, setRequest] = createSignal<SignatureRequest | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [hasSignature, setHasSignature] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [success, setSuccess] = createSignal(false);

  // Store accessToken for use in save function
  const [accessToken, setAccessToken] = createSignal<string>('');

  onMount(() => {
    const reqid = params.id; // The URL param is now the accessToken
    const token = params.token; // The URL param is now the accessToken
    console.log('Public signature page - Loading request with token:', token , reqid);

    if (!token) {
      setError('Token de acceso inválido');
      setLoading(false);
      return;
    }

    setAccessToken(token);

    // Add maximum 10-second timeout
    const timeoutId = setTimeout(() => {
      console.log('Request timed out');
      setError('La solicitud tardó demasiado tiempo. Por favor intente nuevamente.');
      setLoading(false);
    }, 10000);

    // Load signature request by token (PUBLIC - no login required)
    const loadRequest = async () => {
      try {
        console.log('Fetching signature request by token...');
        const signatureRequest = await getSignatureRequestByToken(token, reqid);

        clearTimeout(timeoutId);

        if (!signatureRequest) {
          setError('Solicitud de firma no encontrada o enlace inválido');
        } else if (signatureRequest.status === 'expired') {
          setError('Esta solicitud de firma ha expirado');
        } else if (signatureRequest.status === 'signed') {
          setError('Esta solicitud ya ha sido firmada');
        } else if (signatureRequest.status === 'cancelled') {
          setError('Esta solicitud ha sido cancelada');
        } else {
          console.log('Signature request loaded successfully:', signatureRequest);
          setRequest(signatureRequest);
          setTimeout(initializeCanvas, 100);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Error loading signature request:', err);
        setError('Error al cargar la solicitud: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        console.log("setLoading(false);", request())
        setLoading(false);
      }
    };

    loadRequest();
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
    const token = accessToken();
    if (!canvasEl || !req || !hasSignature() || !token) return;

    setSaving(true);
    setError('');

    try {
      const signatureDataUrl = canvasEl.toDataURL('image/png');
      console.log('Saving signature via public endpoint with token...');

      // Add timeout for save operation
      const savePromise = saveSignaturePublic(
        params.id,
        token,
        signatureDataUrl,
        {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Save operation timed out')), 10000);
      });

      await Promise.race([savePromise, timeoutPromise]);

      console.log('Signature saved successfully');
      setSuccess(true);
    } catch (err: any) {
      console.error('Error saving signature:', err);
      if (err.message.includes('timed out')) {
        setError('La operación de guardado tardó demasiado tiempo. Intente nuevamente.');
      } else {
        setError(err.message || 'Error al guardar la firma');
      }
    } finally {
      setSaving(false);
    }
  };

  const pageStyle = {
    'min-height': '100vh',
    background: 'var(--background-secondary, #f5f5f5)',
    padding: '1rem',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center'
  };

  const containerStyle = {
    'max-width': '500px',
    width: '100%',
    background: 'white',
    'border-radius': '8px',
    'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  };

  const headerStyle = {
    background: '#6c5ce7',
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
    border: '2px dashed #ddd',
    'border-radius': '4px',
    cursor: 'crosshair',
    'touch-action': 'none',
    background: 'white'
  };

  const buttonStyle = {
    width: '100%',
    padding: '1rem',
    'border-radius': '4px',
    border: 'none',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

 
  const LoadingzV =  () =>  (
    <div style={pageStyle}>
      <div style={{ 'text-align': 'center' }}>
        <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>⏳</div>
        <p>Cargando solicitud de firma...</p>
        <p style={{ 'font-size': '0.875rem', color: '#666' }}>
          Conectando (máximo 5 segundos)
        </p>
      </div>
    </div>
  );

   //if (loading()) {}

  if (error() && !request()) {}

   const ErroV =  () =>   (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ padding: '3rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>❌</div>
            <h2 style={{ 'margin-bottom': '1rem', color: '#e74c3c' }}>Error</h2>
            <p style={{ color: '#666' }}>{error()}</p>
          </div>
        </div>
      </div>
    );
  

  //if (success()) {}



  let SuccessV =  () => (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ padding: '3rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>✅</div>
            <h2 style={{ 'margin-bottom': '1rem', color: '#27ae60' }}>¡Firma Guardada!</h2>
            <p style={{ color: '#666', 'margin-bottom': '2rem' }}>
              Su firma ha sido guardada exitosamente en la base de datos.
            </p>
            <p style={{ 'font-size': '0.875rem', color: '#666' }}>
              Puede cerrar esta ventana.
            </p>
          </div>
        </div>
      </div>
    );
  


  //if (!req) return null;



  return (
    <>
  
    <Show when={success()}>
        <SuccessV />
    </Show>

      <Show when={error() && !request()}>
        <ErroV />
    </Show>

  <Show when={loading()}>
        <LoadingzV/>
    </Show>


    <Show when={request() && !success()}>

      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h1 style={{ 'font-size': '1.5rem', 'margin-bottom': '0.5rem' }}>
              Solicitud de Firma
            </h1>
            <p style={{ opacity: '0.9', 'font-size': '0.875rem' }}>
              {request()?.requestedByName}
            </p>
          </div>

          <div style={contentStyle}>
            <div style={{ 'margin-bottom': '2rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>
                Información del Cliente
              </h3>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '1rem', 
                'border-radius': '4px',
                'font-size': '0.875rem'
              }}>
                <p><strong>Nombre:</strong> {request()?.clientName}</p>
                <p><strong>Email:</strong> {request()?.clientEmail}</p>
                <Show when={request()?.clientPhone}>
                  <p><strong>Teléfono:</strong> {request()?.clientPhone}</p>
                </Show>
                <Show when={request()?.documentType}>
                  <p><strong>Tipo de Documento:</strong> {request()?.documentType}</p>
                </Show>
                <Show when={request()?.notes}>
                  <p style={{ 'margin-top': '0.5rem' }}><strong>Notas:</strong> {request()?.notes}</p>
                </Show>
              </div>
            </div>

            <Show when={error()}>
              <div style={{
                padding: '1rem',
                background: '#fee',
                color: '#c33',
                'border-radius': '4px',
                'margin-bottom': '1rem'
              }}>
                {error()}
              </div>
            </Show>

            <div style={{ 'margin-bottom': '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>
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
                color: '#666',
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
                  background: '#f8f9fa',
                  color: '#333'
                }}
                disabled={!hasSignature() || saving()}
              >
                Limpiar
              </button>
              <button
                onClick={saveSignatureHandler}
                style={{
                  ...buttonStyle,
                  background: '#6c5ce7',
                  color: 'white'
                }}
                disabled={!hasSignature() || saving()}
              >
                <Show when={saving()} fallback="Guardar">
                  Guardando...
                </Show>
              </button>
            </div>

            <p style={{ 
              'font-size': '0.75rem', 
              color: '#666', 
              'text-align': 'center',
              'line-height': '1.4'
            }}>
              Al firmar, usted acepta que esta firma electrónica tiene la misma validez legal que una firma manuscrita.
            </p>
          </div>
        </div>
      </div>
    </Show>
    </>
  );
};

export default PublicSignaturePageFirestore;