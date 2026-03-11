import { Component, createSignal, Show, For, createEffect } from 'solid-js';
import { Button, FormSelect } from '../../ui';
import { CubanPassportApiService, SavedPassportApplication } from '../services/cubanPassportApiService';
import { SignatureRequest } from '../../../services/signatureRequest';
import Icon from '../../../components/Icon';
import { updatePassportApplicationPartial } from '../services/savePassportApplication';
import { devLog } from '../../../services/utils';

interface ExportSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureRequest: SignatureRequest;
}

const ExportSignatureModal: Component<ExportSignatureModalProps> = (props) => {
  const [passportApplications, setPassportApplications] = createSignal<SavedPassportApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = createSignal<string>('');
  const [exporting, setExporting] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string>('');
  const [success, setSuccess] = createSignal(false);

  const passportApiService = new CubanPassportApiService();

  // Load passport applications when modal opens
  const loadPassportApplications = async () => {
    if (!props.isOpen) return;
    
    setLoading(true);
    setError('');
    
    try {

      devLog("loadPassportApplications")
      const applications = await passportApiService.getPassportApplications(props.signatureRequest.clientName);
      // Filter applications that don't have a signature yet or match the client name
      devLog(applications)
      const filteredApplications = applications.filter(app => {
        const hasNoSignature = !app.applicationData.firmaBase64 && !app.applicationData.firmaUrl;
        const nameMatches = 
          app.applicationData.primerNombre?.toLowerCase().includes(props.signatureRequest.clientName.toLowerCase()) ||
          app.applicationData.primerApellido?.toLowerCase().includes(props.signatureRequest.clientName.toLowerCase()) ||
          props.signatureRequest.clientName.toLowerCase().includes(app.applicationData.primerNombre?.toLowerCase() || '') ||
          props.signatureRequest.clientName.toLowerCase().includes(app.applicationData.primerApellido?.toLowerCase() || '');
        
        return hasNoSignature || nameMatches;
      });
      
      setPassportApplications(filteredApplications);
    } catch (err) {
      devLog('Error loading passport applications:', err);
      setError(err instanceof Error ? err.message : 'Error loading passport applications');
    } finally {
      setLoading(false);
    }
  };

  // Export signature to selected passport application
  const handleExport = async () => {
    if (!selectedApplicationId() || !props.signatureRequest.signatureUrl) {
      setError('Please select a passport application');
      return;
    }

    setExporting(true);
    setError('');

    try {

      let hh = passportApplications().filter(r=>r.id===selectedApplicationId())?.[0];
      let hu = {
        signatureBase64: props.signatureRequest.signatureUrl,
        signatureRequestId: props.signatureRequest.id,
        ...hh.applicationData
      }

      await updatePassportApplicationPartial(selectedApplicationId(), hu);


      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        props.onClose();
      }, 2000);

    } catch (err) {
      devLog('Error exporting signature:', err);
      setError(err instanceof Error ? err.message : 'Error exporting signature');
    } finally {
      setExporting(false);
    }
  };

  // Load applications when modal opens
  const handleModalOpen = () => {
    if (props.isOpen) {
      loadPassportApplications();
      setSelectedApplicationId('');
      setError('');
      setSuccess(false);
    }
  };

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedApplicationId('');
    setError('');
    setSuccess(false);
    props.onClose();
  };

  createEffect(()=>{
    // Watch for modal open
    if (props.isOpen) {
      handleModalOpen();
    }
  })
  

  return (
    <Show when={props.isOpen}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'z-index': 1000
      }}>
        <div style={{
          background: '#ffffff',
          'border-radius': 'var(--border-radius)',
          'box-shadow': '0 4px 20px rgba(0, 0, 0, 0.2)',
          'max-width': '600px',
          width: '90%',
          'max-height': '80vh',
          overflow: 'auto'
        }}>
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            'border-bottom': '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <h2 style={{
              margin: 0,
              'font-size': '1.25rem',
              color: 'var(--text-primary)'
            }}>
              📋 Exportar Firma a Aplicación de Pasaporte
            </h2>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                'font-size': '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem' }}>
            {/* Signature Request Info */}
            <div style={{
              padding: '1rem',
              background: 'var(--info-light)',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1.5rem',
              border: '1px solid var(--info-color)'
            }}>
              <h3 style={{
                margin: '0 0 0.5rem 0',
                'font-size': '1rem',
                color: 'var(--info-dark)'
              }}>
                Solicitud de Firma
              </h3>
              <p style={{ margin: '0.25rem 0', 'font-size': '0.875rem' }}>
                <strong>Cliente:</strong> {props.signatureRequest.clientName}
              </p>
              <p style={{ margin: '0.25rem 0', 'font-size': '0.875rem' }}>
                <strong>ID:</strong> {props.signatureRequest.id}
              </p>
              <p style={{ margin: '0.25rem 0', 'font-size': '0.875rem' }}>
                <strong>Firmado:</strong> {props.signatureRequest.signedAt?.toDate().toLocaleDateString()}
              </p>
            </div>

            {/* Signature Preview */}
            <Show when={props.signatureRequest.signatureUrl}>
              <div style={{
                'text-align': 'center',
                'margin-bottom': '1.5rem'
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  Firma a Exportar:
                </h4>
                <img
                  src={props.signatureRequest.signatureUrl}
                  alt="Signature"
                  style={{
                    'max-width': '300px',
                    'max-height': '100px',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'white',
                    padding: '0.5rem'
                  }}
                />
              </div>
            </Show>

            {/* Loading State */}
            <Show when={loading()}>
              <div style={{
                'text-align': 'center',
                padding: '2rem',
                color: 'var(--text-muted)'
              }}>
                <Icon name="loading" size="2rem" />
                <p>Cargando aplicaciones de pasaporte...</p>
              </div>
            </Show>

            {/* Error State */}
            <Show when={error()}>
              <div style={{
                padding: '1rem',
                background: 'var(--error-light)',
                color: 'var(--error-dark)',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem',
                border: '1px solid var(--error-color)'
              }}>
                <strong>⚠ Error:</strong> {error()}
              </div>
            </Show>

            {/* Success State */}
            <Show when={success()}>
              <div style={{
                padding: '1rem',
                background: 'var(--success-light)',
                color: 'var(--success-dark)',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem',
                border: '1px solid var(--success-color)'
              }}>
                <strong>✓ Éxito:</strong> Firma exportada exitosamente a la aplicación de pasaporte
              </div>
            </Show>

            {/* Passport Applications Selection */}
            <Show when={!loading() && passportApplications().length > 0}>
              <div>
                <FormSelect
                  label="Seleccionar Aplicación de Pasaporte"
                  value={selectedApplicationId()}
                  onChange={setSelectedApplicationId}
                  options={[
                    { value: '', label: '-- Seleccione una aplicación --' },
                    ...passportApplications().map(app => ({
                      value: app.id,
                      label: `${app.applicationData.primerNombre} ${app.applicationData.primerApellido} (${app.applicationNumber}) - ${app.status}`
                    }))
                  ]}
                  required
                />
                
                <div style={{
                  'margin-top': '0.5rem',
                  'font-size': '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  Se muestran aplicaciones sin firma o que coinciden con el nombre del cliente
                </div>
              </div>
            </Show>

            {selectedApplicationId()}

            {/* No Applications Found */}
            <Show when={!loading() && passportApplications().length === 0}>
              <div style={{
                padding: '2rem',
                'text-align': 'center',
                color: 'var(--text-muted)'
              }}>
                <Icon name="search" size="3rem" style={{ 'margin-bottom': '1rem' }} />
                <p>No se encontraron aplicaciones de pasaporte compatibles.</p>
                <p style={{ 'font-size': '0.875rem' }}>
                  Busque aplicaciones sin firma o que coincidan con el nombre del cliente: <strong>{props.signatureRequest.clientName}</strong>
                </p>
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            'border-top': '1px solid var(--border-color)',
            display: 'flex',
            gap: '0.75rem',
            'justify-content': 'flex-end'
          }}>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={exporting()}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={!selectedApplicationId() || exporting() || success()}
            >
              <Show when={exporting()} fallback="📋 Exportar Firma">
                Exportando...
              </Show>
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ExportSignatureModal;