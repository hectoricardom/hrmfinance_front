import { Component } from 'solid-js';
import { Layout } from '../modules/ui';
import SignatureRequestManager from '../components/SignatureRequestManager';

const SignatureManagerPage: Component = () => {
  return (
    <Layout title="Gestión de Firmas Digitales">
      <div style={{
        'max-width': '1200px',
        margin: '0 auto',
        padding: '2rem 1rem'
      }}>
        <div style={{
          'text-align': 'center',
          'margin-bottom': '3rem'
        }}>
          <h1 style={{
            'font-size': '2.5rem',
            'font-weight': '700',
            'margin-bottom': '1rem',
            color: 'var(--text-primary)',
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
            '-webkit-background-clip': 'text',
            '-webkit-text-fill-color': 'transparent',
            'background-clip': 'text'
          }}>
            ✍️ Firmas Digitales
          </h1>
          
          <p style={{
            'font-size': '1.125rem',
            color: 'var(--text-muted)',
            'max-width': '600px',
            margin: '0 auto',
            'line-height': '1.6'
          }}>
            Solicite firmas digitales de sus clientes de forma remota. 
            Envíe enlaces por email o SMS para que firmen desde cualquier dispositivo.
          </p>
        </div>

        <SignatureRequestManager />

        {/* Feature highlights */}
        <div style={{
          'margin-top': '4rem',
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div style={{
            padding: '2rem',
            background: 'white',
            'border-radius': 'var(--border-radius)',
            'box-shadow': 'var(--shadow-sm)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '2.5rem',
              'margin-bottom': '1rem'
            }}>
              📱
            </div>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              Firma Móvil
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              'line-height': '1.5',
              margin: '0'
            }}>
              Los clientes pueden firmar desde cualquier dispositivo móvil usando su dedo en la pantalla táctil.
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'white',
            'border-radius': 'var(--border-radius)',
            'box-shadow': 'var(--shadow-sm)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '2.5rem',
              'margin-bottom': '1rem'
            }}>
              🔗
            </div>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              Enlaces Seguros
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              'line-height': '1.5',
              margin: '0'
            }}>
              Genere enlaces únicos con fecha de expiración para asegurar la validez de las solicitudes.
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'white',
            'border-radius': 'var(--border-radius)',
            'box-shadow': 'var(--shadow-sm)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '2.5rem',
              'margin-bottom': '1rem'
            }}>
              ☁️
            </div>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              Almacenamiento Seguro
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              'line-height': '1.5',
              margin: '0'
            }}>
              Las firmas se guardan de forma segura en Firebase con acceso controlado y trazabilidad completa.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div style={{
          'margin-top': '4rem',
          padding: '3rem 2rem',
          background: 'linear-gradient(135deg, var(--primary-color)10, var(--secondary-color)10)',
          'border-radius': 'var(--border-radius)',
          'text-align': 'center'
        }}>
          <h3 style={{
            'font-size': '2rem',
            'font-weight': '600',
            'margin-bottom': '2rem',
            color: 'var(--text-primary)'
          }}>
            ¿Cómo Funciona?
          </h3>
          
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            'margin-top': '2rem'
          }}>
            <div>
              <div style={{
                width: '60px',
                height: '60px',
                'border-radius': '50%',
                background: 'var(--primary-color)',
                color: 'white',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '1.5rem',
                'font-weight': '600',
                margin: '0 auto 1rem'
              }}>
                1
              </div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Crear Solicitud</h4>
              <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                Complete los datos del cliente y cree una nueva solicitud de firma
              </p>
            </div>

            <div>
              <div style={{
                width: '60px',
                height: '60px',
                'border-radius': '50%',
                background: 'var(--secondary-color)',
                color: 'white',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '1.5rem',
                'font-weight': '600',
                margin: '0 auto 1rem'
              }}>
                2
              </div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Enviar Enlace</h4>
              <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                Envíe el enlace único al cliente por email, SMS o cualquier medio
              </p>
            </div>

            <div>
              <div style={{
                width: '60px',
                height: '60px',
                'border-radius': '50%',
                background: 'var(--accent-color)',
                color: 'white',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '1.5rem',
                'font-weight': '600',
                margin: '0 auto 1rem'
              }}>
                3
              </div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Cliente Firma</h4>
              <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                El cliente abre el enlace y firma usando su dedo o mouse
              </p>
            </div>

            <div>
              <div style={{
                width: '60px',
                height: '60px',
                'border-radius': '50%',
                background: 'var(--success-color)',
                color: 'white',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '1.5rem',
                'font-weight': '600',
                margin: '0 auto 1rem'
              }}>
                ✓
              </div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Firma Guardada</h4>
              <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                La firma se guarda automáticamente y usted recibe notificación
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SignatureManagerPage;