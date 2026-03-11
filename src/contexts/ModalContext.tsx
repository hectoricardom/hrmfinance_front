import { Component, JSX, createContext, useContext, createSignal, Show } from 'solid-js';

interface ModalConfig {
  title: string;
  children: JSX.Element;
  onClose?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

interface ModalContextType {
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
  isOpen: () => boolean;
}

const ModalContext = createContext<ModalContextType>();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: Component<{ children: JSX.Element }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [config, setConfig] = createSignal<ModalConfig | null>(null);

  const showModal = (modalConfig: ModalConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const hideModal = () => {
    const currentConfig = config();
    setIsOpen(false);
    setConfig(null);
    document.body.style.overflow = '';
    currentConfig?.onClose?.();
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      hideModal();
    }
  };

  const handleModalClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const getModalWidth = () => {
    const size = config()?.size || 'md';
    switch (size) {
      case 'sm': return '400px';
      case 'md': return '600px';
      case 'lg': return '800px';
      case 'xl': return '1200px';
      default: return '600px';
    }
  };

  const contextValue = {
    showModal,
    hideModal,
    isOpen,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {props.children}
      
      {/* Global Modal Portal */}
      <Show when={isOpen() && config()}>
        <div 
          class="modal-overlay"
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
            'z-index': '9999',
            padding: '1rem'
          }}
          onClick={handleOverlayClick}
        >
          <div 
            class="modal-content"
            style={{
              background: 'white',
              'border-radius': '8px',
              'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.2)',
              width: '100%',
              'max-width': getModalWidth(),
              'max-height': '90vh',
              overflow: 'auto'
            }}
            onClick={handleModalClick}
          >
            <div style={{
              padding: '1.5rem 2rem',
              'border-bottom': '1px solid var(--border-color)',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center'
            }}>
              <h2 style={{
                'font-size': '1.25rem',
                'font-weight': '600',
                color: 'var(--text-primary)',
                margin: '0'
              }}>
                {config()?.title}
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
                onClick={hideModal}
                type="button"
              >
                ×
              </button>
            </div>
            <div>
              {config()?.children}
            </div>
          </div>
        </div>
      </Show>
      
      <style>{`
        @media print {
          .modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
          }
          
          .modal-content {
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
          }
          
          .modal-content > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </ModalContext.Provider>
  );
};