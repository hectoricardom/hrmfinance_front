import { Component, JSX, createEffect, onCleanup, Show } from 'solid-js';

interface ModalProps {
  isOpen: boolean;
  maxWidth: string;
  onClose: () => void;
  title: string;
  children: JSX.Element;
}

const Modal: Component<ModalProps> = (props) => {
  // Handle body scroll
  createEffect(() => {
    if (props.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    document.body.style.overflow = '';
  });


  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const handleModalClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Show when={props.isOpen}>
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          'background-color': 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': '1000',
          padding: '1rem'
        }}
        onClick={handleOverlayClick}
      >
        <div 
          style={{
            background: 'white',
            'border-radius': '8px',
            'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.2)',
            width: '100%',
            'max-width':  props?.maxWidth  ||'960px',
            'max-height': '90vh' ,
            overflow: 'auto',
            padding: '2rem'
          }}
          onClick={handleModalClick}
        >
          <div style={{
            padding: '1.1rem 2rem',
            'border-bottom': '1px solid var(--border-color)',
            display: 'flex',
            "margin-bottom": "1.1rem",
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <h2 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              margin: '0'
            }}>
              {props.title}
            </h2>
            <button 
              style={{
                background: 'none',
                border: 'none',
                'font-size': '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.5rem',
                'border-radius': '4px'
              }}
              onClick={props.onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <div>
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Modal;