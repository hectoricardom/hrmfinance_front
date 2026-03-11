import { Component, createSignal, onMount, Show } from 'solid-js';
import { useParams } from '@solidjs/router';

const PublicSignaturePageSimple: Component = () => {
  const params = useParams();
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = createSignal(false);

  onMount(() => {
    console.log('Simple signature page loaded');
  });

  const clearSignature = () => {
    const canvasEl = canvas();
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    setHasSignature(false);
  };

  return (
    <div style={{
      'min-height': '100vh',
      background: '#f5f5f5',
      padding: '1rem',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center'
    }}>
      <div style={{
        'max-width': '500px',
        width: '100%',
        background: 'white',
        'border-radius': '8px',
        'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#6c5ce7',
          color: 'white',
          padding: '2rem',
          'text-align': 'center'
        }}>
          <h1 style={{ 'font-size': '1.5rem', 'margin-bottom': '0.5rem' }}>
            Solicitud de Firma
          </h1>
          <p style={{ opacity: '0.9', 'font-size': '0.875rem' }}>
            Test User
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
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
              <p><strong>ID:</strong> {params.id}</p>
              <p><strong>Nombre:</strong> Test Client</p>
              <p><strong>Email:</strong> test@example.com</p>
              <p><strong>Teléfono:</strong> +1 234 567 8900</p>
            </div>
          </div>

          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h3 style={{ 'margin-bottom': '1rem' }}>
              Firme en el Área Indicada
            </h3>
            <canvas
              ref={setCanvas}
              style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #ddd',
                'border-radius': '4px',
                cursor: 'crosshair',
                background: 'white'
              }}
              width="450"
              height="200"
              onMouseDown={(e) => {
                const canvasEl = canvas();
                if (!canvasEl) return;
                const ctx = canvasEl.getContext('2d');
                if (!ctx) return;
                
                const rect = canvasEl.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                setHasSignature(true);
              }}
              onMouseMove={(e) => {
                const canvasEl = canvas();
                if (!canvasEl) return;
                const ctx = canvasEl.getContext('2d');
                if (!ctx) return;
                
                if (e.buttons === 1) { // Left mouse button pressed
                  const rect = canvasEl.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  ctx.lineTo(x, y);
                  ctx.stroke();
                  setHasSignature(true);
                }
              }}
            />
            <p style={{ 
              'margin-top': '0.5rem', 
              'font-size': '0.8rem', 
              color: '#666',
              'text-align': 'center'
            }}>
              Use su mouse para dibujar su firma
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', 'margin-bottom': '1rem' }}>
            <button
              onClick={clearSignature}
              style={{
                width: '100%',
                padding: '1rem',
                'border-radius': '4px',
                border: 'none',
                'font-weight': '600',
                cursor: 'pointer',
                background: '#f8f9fa',
                color: '#333'
              }}
              disabled={!hasSignature()}
            >
              Limpiar
            </button>
            <button
              onClick={() => {
                const canvasEl = canvas();
                if (canvasEl && hasSignature()) {
                  const dataUrl = canvasEl.toDataURL('image/png');
                  console.log('Signature saved:', dataUrl.substring(0, 50) + '...');
                  alert('¡Firma guardada exitosamente!');
                }
              }}
              style={{
                width: '100%',
                padding: '1rem',
                'border-radius': '4px',
                border: 'none',
                'font-weight': '600',
                cursor: 'pointer',
                background: '#6c5ce7',
                color: 'white'
              }}
              disabled={!hasSignature()}
            >
              Guardar Firma
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
  );
};

export default PublicSignaturePageSimple;