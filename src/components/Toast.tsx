import { Component, For, Show } from 'solid-js';
import { toasts, removeToast, type ToastType } from '../services/toastService';
import Icon from './Icon';

const Toast: Component = () => {
  const getToastStyles = (type: ToastType) => {
    const baseStyles = {
      padding: '1rem 1.5rem',
      'border-radius': '8px',
      'margin-bottom': '0.75rem',
      display: 'flex',
      'align-items': 'center',
      gap: '0.75rem',
      'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.15)',
      'min-width': '300px',
      'max-width': '500px',
      animation: 'slideInRight 0.3s ease-out',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    };

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: '1px solid #059669'
      },
      error: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        border: '1px solid #dc2626'
      },
      warning: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        border: '1px solid #d97706'
      },
      info: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        border: '1px solid #2563eb'
      }
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = (type: ToastType): string => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes slideOutRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }

          .toast-item:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>
      <Show when={toasts().length > 0}>
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          'z-index': '10000',
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'flex-end'
        }}>
          <For each={toasts()}>
            {(toast) => (
              <div
                class="toast-item"
                style={getToastStyles(toast.type)}
                onClick={() => removeToast(toast.id)}
                title="Click to dismiss"
              >
                <Icon name={getIcon(toast.type)} size="1.25em" />
                <div style={{ flex: '1', 'font-weight': '500' }}>
                  {toast.message}
                </div>
                <Icon name="close" size="1em" style={{ opacity: '0.8' }} />
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  );
};

export default Toast;
