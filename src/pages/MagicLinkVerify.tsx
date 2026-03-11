import { Component, createSignal, onMount, Show } from 'solid-js';
import { useSearchParams, useNavigate } from '@solidjs/router';
import MagicLinkService from '../services/magicLinkService';
import { authStore } from '../stores/authStore';

const MagicLinkVerify: Component = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [verifying, setVerifying] = createSignal(false);
  const [success, setSuccess] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [showCodeForm, setShowCodeForm] = createSignal(false);

  // Form fields
  const [email, setEmail] = createSignal('');
  const [code, setCode] = createSignal('');

  onMount(async () => {
    const token = searchParams.token;

    // If token exists in URL, verify it (legacy support)
    if (token) {
      setVerifying(true);
      try {
        // Verify the magic link token
        const result = await MagicLinkService.verifyMagicLink(token);

        if (result.success && result.user) {
          setSuccess(true);

          // Authenticate user with magic link and pass session token
          await authStore.signInWithMagicLink(result.user, result.token);

          // Redirect to dashboard after successful auth
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          setError(result.message || 'Token inválido o expirado');
        }
      } catch (err: any) {
        setError(err.message || 'Error al verificar el token');
      } finally {
        setVerifying(false);
      }
    } else {
      // No token - show code verification form
      setShowCodeForm(true);

      // Pre-fill email if there's a pending request
      const pending = MagicLinkService.getPendingRequest();
      if (pending) {
        setEmail(pending.email);
      }
    }
  });

  // Handle code verification
  const handleVerifyCode = async (e: Event) => {
    e.preventDefault();

    if (!email() || !code()) {
      setError('Por favor ingrese su email y código de verificación');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const result = await MagicLinkService.verifyCode(email(), code());

      if (result.success && result.user) {
        setSuccess(true);

        // Authenticate user with magic link and pass session token
        await authStore.signInWithMagicLink(result.user, result.token);

        // Redirect to dashboard after successful auth
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      } else {
        setError(result.message || 'Código inválido o expirado');
      }
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código');
    } finally {
      setVerifying(false);
    }
  };

  const containerStyle = {
    'min-height': '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '2rem'
  };

  const cardStyle = {
    background: 'white',
    'border-radius': '1rem',
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    'max-width': '500px',
    width: '100%',
    padding: '3rem',
    'text-align': 'center' as const
  };

  const spinnerStyle = {
    width: '50px',
    height: '50px',
    margin: '0 auto 2rem',
    border: '3px solid rgba(102, 126, 234, 0.3)',
    'border-top-color': '#667eea',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite'
  };

  const iconStyle = {
    'font-size': '4rem',
    'margin-bottom': '1.5rem'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: '#2d3748',
    'margin-bottom': '1rem'
  };

  const messageStyle = {
    color: '#718096',
    'line-height': '1.6',
    'margin-bottom': '2rem'
  };

  const buttonStyle = {
    padding: '0.75rem 2rem',
    'font-size': '1rem',
    'font-weight': '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    'border-radius': '0.5rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  };

  // Add CSS animation for spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-magic-link-spinner]')) {
    style.setAttribute('data-magic-link-spinner', 'true');
    document.head.appendChild(style);
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    'font-size': '1rem',
    border: '2px solid #e2e8f0',
    'border-radius': '0.5rem',
    'margin-bottom': '1rem',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    display: 'block',
    'text-align': 'left' as const,
    'margin-bottom': '0.5rem',
    'font-weight': '600',
    color: '#2d3748'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Show when={verifying()}>
          <div style={spinnerStyle}></div>
          <h2 style={titleStyle}>Verificando...</h2>
          <p style={messageStyle}>
            Por favor espere mientras verificamos su código de autenticación...
          </p>
        </Show>

        <Show when={!verifying() && success()}>
          <div style={iconStyle}>✅</div>
          <h2 style={titleStyle}>¡Autenticación Exitosa!</h2>
          <p style={messageStyle}>
            Has iniciado sesión correctamente con tu código de verificación.
            <br />
            Serás redirigido al panel de control en breve...
          </p>
        </Show>

        <Show when={showCodeForm() && !verifying() && !success()}>
          <div style={iconStyle}>🔐</div>
          <h2 style={titleStyle}>Verificar Código</h2>
          <p style={messageStyle}>
            Ingrese el código de verificación que recibió por email
          </p>

          <form onSubmit={handleVerifyCode} style={{ 'margin-top': '2rem' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Código de Verificación</label>
              <input
                type="text"
                placeholder="123456"
                value={code()}
                onInput={(e) => setCode(e.currentTarget.value)}
                style={{
                  ...inputStyle,
                  'text-align': 'center',
                  'font-size': '1.5rem',
                  'letter-spacing': '0.5rem',
                  'font-weight': '700'
                }}
                maxLength={6}
                pattern="[0-9]{6}"
                required
              />
            </div>

            <Show when={error()}>
              <div style={{
                padding: '0.75rem',
                'margin-bottom': '1rem',
                background: '#fee',
                color: '#c33',
                'border-radius': '0.5rem',
                'font-size': '0.875rem'
              }}>
                {error()}
              </div>
            </Show>

            <button
              type="submit"
              style={buttonStyle}
              disabled={verifying()}
              onMouseEnter={(e) => {
                if (!verifying()) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {verifying() ? 'Verificando...' : 'Verificar Código'}
            </button>
          </form>

          <button
            style={{
              ...buttonStyle,
              background: 'transparent',
              color: '#667eea',
              'margin-top': '1rem',
              'font-size': '0.875rem',
              border: '1px solid #667eea'
            }}
            onClick={() => navigate('/login', { replace: true })}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Volver al inicio de sesión
          </button>
        </Show>

        <Show when={!verifying() && !success() && error() && !showCodeForm()}>
          <div style={iconStyle}>❌</div>
          <h2 style={titleStyle}>Error de Autenticación</h2>
          <p style={messageStyle}>
            {error()}
          </p>
          <button
            style={buttonStyle}
            onClick={() => navigate('/login', { replace: true })}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Volver al inicio de sesión
          </button>

          <div style={{
            'margin-top': '2rem',
            padding: '1rem',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            'border-radius': '0.5rem',
            'font-size': '0.875rem',
            color: '#856404',
            'text-align': 'left' as const
          }}>
            <strong>💡 Posibles causas:</strong>
            <ul style={{ 'margin': '0.5rem 0 0 0', 'padding-left': '1.5rem' }}>
              <li>El enlace ya fue utilizado</li>
              <li>El enlace expiró (válido por 15 minutos)</li>
              <li>El token es inválido</li>
            </ul>
            <p style={{ 'margin-top': '0.5rem', 'margin-bottom': '0' }}>
              Por favor solicite un nuevo Magic Link desde la página de inicio de sesión.
            </p>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MagicLinkVerify;
