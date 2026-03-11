import { Component, createSignal, Show, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import MagicLinkService from '../services/magicLinkService';
import { authStore } from '../stores/authStore';
import { Button } from '../modules/ui';
import { devLog } from '../services/utils';

interface MagicLinkAuthProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

const MagicLinkAuth: Component<MagicLinkAuthProps> = (props) => {
  const navigate = useNavigate();

  const [email, setEmail] = createSignal('');
  const [code, setCode] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [verifying, setVerifying] = createSignal(false);
  const [sent, setSent] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [timeRemaining, setTimeRemaining] = createSignal(0);

  let intervalId: number | undefined;

  onMount(() => {
    // Check if there's a pending request
    const pending = MagicLinkService.getPendingRequest();
    if (pending) {
      setEmail(pending.email);
      setSent(true);
      startCountdown();
    }
  });

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  const startCountdown = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }

    updateTimeRemaining();

    intervalId = window.setInterval(() => {
      updateTimeRemaining();
    }, 1000);
  };

  const updateTimeRemaining = () => {
    const remaining = MagicLinkService.getTimeRemaining();
    setTimeRemaining(remaining);

    if (remaining <= 0) {
      if (intervalId) {
        clearInterval(intervalId);
      }
      setSent(false);
      MagicLinkService.clearPendingRequest();
    }
  };

  const handleSendMagicLink = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await MagicLinkService.requestMagicLink(email());

      if (result.success) {
        setSent(true);
        startCountdown();
      } else {
        setError(result.message);
        props.onError?.(result.message);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al enviar el magic link';
      setError(errorMessage);
      props.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setSent(false);
    setCode('');
    setError(null);
    setTimeRemaining(0);
    MagicLinkService.clearPendingRequest();
    await handleSendMagicLink();
  };

  const handleVerifyCode = async (e: Event) => {
    e.preventDefault();

    if (!email() || !code()) {
      setError('Por favor ingrese su email y código de verificación');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      devLog('🔐 Verifying code...');
      const result = await MagicLinkService.verifyCode(email(), code());

      if (result.success && result.user) {
        devLog('✅ Code verified successfully');

        // Authenticate user with magic link and pass session token
        await authStore.signInWithMagicLink(result.user, result.token);

        // Call success callback if provided
        if (props.onSuccess) {
          props.onSuccess(result.user);
        } else {
          // Default: redirect to dashboard
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
        }
      } else {
        setError(result.message || 'Código inválido o expirado');
        props.onError?.(result.message || 'Código inválido o expirado');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al verificar el código';
      setError(errorMessage);
      props.onError?.(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const containerStyle = {
    width: '100%',
    'max-width': '400px',
    margin: '0 auto'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    'font-size': '1rem',
    border: '2px solid #e2e8f0',
    'border-radius': '0.5rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    'box-sizing': 'border-box' as const
  };

  const buttonStyle = {
    width: '100%',
    padding: '0.75rem 1.5rem',
    'font-size': '1rem',
    'font-weight': '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    'border-radius': '0.5rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    'margin-top': '1rem'
  };

  const successBoxStyle = {
    padding: '1.5rem',
    background: '#d4edda',
    border: '1px solid #c3e6cb',
    'border-radius': '0.5rem',
    'text-align': 'center' as const,
    color: '#155724'
  };

  const errorBoxStyle = {
    padding: '1rem',
    background: '#f8d7da',
    border: '1px solid #f5c6cb',
    'border-radius': '0.5rem',
    color: '#721c24',
    'margin-top': '1rem',
    'font-size': '0.875rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.5rem',
    'font-weight': '500',
    color: '#2d3748',
    'font-size': '0.875rem'
  };

  const infoBoxStyle = {
    padding: '1rem',
    background: '#e3f2fd',
    border: '1px solid #90caf9',
    'border-radius': '0.5rem',
    'margin-top': '1rem',
    'font-size': '0.875rem',
    color: '#1976d2',
    'line-height': '1.6'
  };

  const iconStyle = {
    'font-size': '3rem',
    'margin-bottom': '1rem'
  };

  const resendButtonStyle = {
    ...buttonStyle,
    background: 'transparent',
    color: '#667eea',
    border: '2px solid #667eea'
  };

  return (
    <div style={containerStyle}>
      <Show
        when={!sent()}
        fallback={
          <div>
            <div style={{ ...successBoxStyle, 'margin-bottom': '1.5rem' }}>
              <div style={iconStyle}>📧</div>
              <h3 style={{ 'margin-bottom': '0.5rem' }}>Código Enviado</h3>
              <p style={{ 'margin-bottom': '0', 'font-size': '0.875rem', 'line-height': '1.6' }}>
                Hemos enviado un código de 6 dígitos a:
                <br />
                <strong>{email()}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyCode}>
              <div>
                <label style={labelStyle}>Código de Verificación</label>
                <input
                  type="text"
                  value={code()}
                  onInput={(e) => {
                    const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 6);
                    setCode(value);
                  }}
                  placeholder="123456"
                  style={{
                    ...inputStyle,
                    'text-align': 'center',
                    'font-size': '1.5rem',
                    'letter-spacing': '0.5rem',
                    'font-weight': '700'
                  }}
                  maxLength={6}
                  disabled={verifying()}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              <Show when={error()}>
                <div style={errorBoxStyle}>
                  ⚠️ {error()}
                </div>
              </Show>

              <button
                type="submit"
                style={buttonStyle}
                disabled={verifying() || code().length !== 6}
                onMouseEnter={(e) => {
                  if (!verifying() && code().length === 6) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Show when={verifying()} fallback="Verificar Código">
                  Verificando...
                </Show>
              </button>

              <button
                type="button"
                style={{...resendButtonStyle, 'margin-top': '0.5rem'}}
                onClick={handleResend}
                disabled={loading() || verifying()}
                onMouseEnter={(e) => {
                  if (!loading() && !verifying()) {
                    e.currentTarget.style.background = '#667eea';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading() && !verifying()) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#667eea';
                  }
                }}
              >
                {loading() ? 'Reenviando...' : 'Reenviar Código'}
              </button>
            </form>

            <div style={infoBoxStyle}>
              <strong>💡 Consejos:</strong>
              <ul style={{ 'margin': '0.5rem 0 0 0', 'padding-left': '1.5rem', 'text-align': 'left' as const }}>
                <li>Revise su carpeta de spam si no ve el correo</li>
                <li>El código expira en: <strong>{formatTime(timeRemaining())}</strong></li>
                <li>En modo desarrollo, el código aparece en la consola del navegador</li>
              </ul>
            </div>
          </div>
        }
      >
        <div>
          <label style={labelStyle}>
            Correo Electrónico
          </label>
          <input
            type="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            placeholder="tu@email.com"
            style={inputStyle}
            disabled={loading()}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading() && email().trim()) {
                handleSendMagicLink();
              }
            }}
          />

          <button
            style={buttonStyle}
            onClick={handleSendMagicLink}
            disabled={loading() || !email().trim()}
            onMouseEnter={(e) => {
              if (!loading() && email().trim()) {
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Show when={loading()} fallback="Enviar Magic Link">
              Enviando...
            </Show>
          </button>

          <Show when={error()}>
            <div style={errorBoxStyle}>
              ⚠️ {error()}
            </div>
          </Show>

          <div style={infoBoxStyle}>
            <strong>🔐 Autenticación sin contraseña</strong>
            <p style={{ 'margin-top': '0.5rem', 'margin-bottom': '0' }}>
              Ingrese su email y recibirá un enlace mágico para iniciar sesión de forma segura sin necesidad de contraseña.
            </p>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default MagicLinkAuth;
