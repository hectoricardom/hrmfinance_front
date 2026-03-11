import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import { Button } from '../../ui';
import Portal from '../../../components/Portal';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureDataUrl: string;
  enhancementType: 'basic' | 'enhanced' | 'vectorized';
}

const SignatureModal: Component<SignatureModalProps> = (props) => {
  let modalRef: HTMLDivElement | undefined;
  
  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose();
    }
  };
  
  // Manage body overflow and event listeners
  createEffect(() => {
    if (props.isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    }
  });
  
  // Cleanup on unmount
  onCleanup(() => {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
  });
  
  if (!props.isOpen) {
    return null;
  }
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'firma-extraida.png';
    link.href = props.signatureDataUrl;
    link.click();
  };
  
  const getEnhancementDescription = () => {
    switch (props.enhancementType) {
      case 'basic':
        return 'Firma extraída sin procesamiento adicional';
      case 'enhanced':
        return 'Firma mejorada con algoritmos avanzados';
      case 'vectorized':
        return 'Firma optimizada con filtros avanzados';
      default:
        return 'Firma procesada';
    }
  };
  
  return (
    <Portal>
      <div 
        ref={modalRef}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.9)',
          'z-index': '10000',
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': 'center',
          padding: '2rem',
          'box-sizing': 'border-box'
        }}
        onClick={props.onClose}
      >
        {/* Header */}
        <div 
          style={{
            'text-align': 'center',
            color: 'white',
            'margin-bottom': '2rem'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{
            'font-size': '1.5rem',
            margin: '0 0 0.5rem 0'
          }}>
            Vista Completa de la Firma
          </h3>
          <p style={{
            'font-size': '1rem',
            margin: '0',
            opacity: '0.8'
          }}>
            {getEnhancementDescription()}
          </p>
        </div>
        
        {/* Signature Container */}
        <div 
          style={{
            background: 'white',
            padding: '2rem',
            'border-radius': '12px',
            'max-width': '90vw',
            'max-height': '70vh',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.5)',
            'margin-bottom': '2rem'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={props.signatureDataUrl}
            alt="Firma en tamaño completo"
            style={{
              'max-width': '100%',
              'max-height': '100%',
              width: 'auto',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>
        
        {/* Action Buttons */}
        <div 
          style={{
            display: 'flex',
            gap: '1rem'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={props.onClose}
            variant="secondary"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              color: 'var(--text-primary)'
            }}
          >
            Cerrar (ESC)
          </Button>
          
          <Button
            onClick={handleDownload}
            variant="primary"
          >
            Descargar Firma
          </Button>
        </div>
      </div>
    </Portal>
  );
};

export default SignatureModal;