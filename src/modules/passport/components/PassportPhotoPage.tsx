import { Component, createSignal, Show } from 'solid-js';
import { Card } from '../../ui';
import PassportPhotoManager from './PassportPhotoManager';
import { useModal } from '../../../contexts/ModalContext';

const PassportPhotoPage: Component = () => {
  const modal = useModal();
  const [savedPhotos, setSavedPhotos] = createSignal<Array<{
    id: string;
    clientName: string;
    photoUrl: string;
    timestamp: Date;
  }>>([]);

  const handlePhotoSaved = (photoUrl: string) => {
    const newPhoto = {
      id: Date.now().toString(),
      clientName: 'Cliente ' + (savedPhotos().length + 1),
      photoUrl,
      timestamp: new Date()
    };
    
    setSavedPhotos([...savedPhotos(), newPhoto]);
    
    modal.showModal({
      title: '✅ Foto Guardada',
      children: (
        <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
          <p style={{ 'margin-bottom': '1rem' }}>
            La foto de pasaporte ha sido guardada exitosamente.
          </p>
          <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Puede continuar capturando más fotos o usar las fotos guardadas en las solicitudes de pasaporte.
          </p>
        </div>
      )
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 'max-width': '1200px', margin: '0 auto' }}>
        <h1 style={{
          'font-size': '2rem',
          'font-weight': '700',
          'margin-bottom': '0.5rem',
          color: 'var(--text-primary)'
        }}>
          📸 Captura de Foto de Pasaporte
        </h1>
        
        <p style={{
          'margin-bottom': '2rem',
          color: 'var(--text-muted)',
          'font-size': '1.125rem'
        }}>
          Capture fotos profesionales para pasaportes con detección facial automática y ajuste a los requisitos oficiales.
        </p>

        <div style={{ 'margin-bottom': '2rem' }}>
          <PassportPhotoManager
            onPhotoSaved={handlePhotoSaved}
          />
        </div>

        <Show when={savedPhotos().length > 0}>
          <Card>
            <div style={{ padding: '2rem' }}>
              <h3 style={{
                'font-size': '1.25rem',
                'font-weight': '600',
                'margin-bottom': '1rem'
              }}>
                📁 Fotos Guardadas Recientemente ({savedPhotos().length})
              </h3>
              
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                {savedPhotos().map(photo => (
                  <div style={{
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius)',
                    overflow: 'hidden',
                    background: 'white'
                  }}>
                    <img
                      src={photo.photoUrl}
                      style={{
                        width: '100%',
                        height: '150px',
                        'object-fit': 'cover'
                      }}
                      alt={`Foto de ${photo.clientName}`}
                    />
                    <div style={{
                      padding: '0.5rem',
                      'font-size': '0.75rem',
                      'text-align': 'center'
                    }}>
                      <p style={{ 
                        margin: '0', 
                        'font-weight': 'bold',
                        'white-space': 'nowrap',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis'
                      }}>
                        {photo.clientName}
                      </p>
                      <p style={{ 
                        margin: '0', 
                        color: 'var(--text-muted)',
                        'margin-top': '0.25rem'
                      }}>
                        {photo.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Show>

        <Card>
          <div style={{ padding: '2rem' }}>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '1rem'
            }}>
              🌟 Características del Sistema
            </h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              <div>
                <h4 style={{ 
                  'margin-bottom': '0.5rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  🎯 Detección Facial Automática
                </h4>
                <p style={{ 
                  color: 'var(--text-muted)',
                  'font-size': '0.875rem',
                  'line-height': '1.6'
                }}>
                  El sistema detecta automáticamente el rostro y valida la posición correcta para cumplir con los requisitos oficiales.
                </p>
              </div>
              
              <div>
                <h4 style={{ 
                  'margin-bottom': '0.5rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  📐 Ajuste Automático
                </h4>
                <p style={{ 
                  color: 'var(--text-muted)',
                  'font-size': '0.875rem',
                  'line-height': '1.6'
                }}>
                  La foto se recorta y ajusta automáticamente a 900×900px con el rostro centrado y las proporciones correctas.
                </p>
              </div>
              
              <div>
                <h4 style={{ 
                  'margin-bottom': '0.5rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  ✨ Mejora de Calidad
                </h4>
                <p style={{ 
                  color: 'var(--text-muted)',
                  'font-size': '0.875rem',
                  'line-height': '1.6'
                }}>
                  Ajuste automático de brillo y contraste para obtener fotos claras con fondo blanco uniforme.
                </p>
              </div>
              
              <div>
                <h4 style={{ 
                  'margin-bottom': '0.5rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  💾 Formato Profesional
                </h4>
                <p style={{ 
                  color: 'var(--text-muted)',
                  'font-size': '0.875rem',
                  'line-height': '1.6'
                }}>
                  Las fotos se guardan en formato JPEG de alta calidad, listas para imprimir o usar en aplicaciones digitales.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '2rem' }}>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '1rem'
            }}>
              📋 Requisitos Técnicos
            </h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': '1fr 1fr',
              gap: '2rem'
            }}>
              <div>
                <h4 style={{ 'margin-bottom': '0.5rem' }}>Especificaciones de la Foto:</h4>
                <ul style={{ 
                  margin: '0', 
                  'padding-left': '1.5rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)',
                  'line-height': '1.8'
                }}>
                  <li>Dimensiones: 900×900 píxeles</li>
                  <li>Formato: JPEG alta calidad</li>
                  <li>Fondo: Blanco uniforme</li>
                  <li>Rostro: 70-80% del marco</li>
                  <li>Resolución: 300 DPI (impresión)</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{ 'margin-bottom': '0.5rem' }}>Requisitos del Sistema:</h4>
                <ul style={{ 
                  margin: '0', 
                  'padding-left': '1.5rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)',
                  'line-height': '1.8'
                }}>
                  <li>Cámara web funcional</li>
                  <li>Navegador moderno (Chrome, Firefox, Edge)</li>
                  <li>Buena iluminación frontal</li>
                  <li>Fondo liso sin patrones</li>
                  <li>Conexión a internet estable</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <div style={{
          'margin-top': '2rem',
          'text-align': 'center',
          padding: '2rem',
          background: 'var(--primary-light)',
          'border-radius': 'var(--border-radius)',
          color: 'var(--primary-dark)'
        }}>
          <p style={{ 
            margin: '0',
            'font-size': '1.125rem',
            'font-weight': '500'
          }}>
            💡 Consejo: Para mejores resultados, asegúrese de tener buena iluminación frontal y un fondo liso de color claro.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PassportPhotoPage;