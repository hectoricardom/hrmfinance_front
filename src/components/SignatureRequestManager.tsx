import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card, Button, FormInput, FormSelect } from '../modules/ui';
import { 
  createSignatureRequest, 
  getMySignatureRequests,
  getBusinessSignatureRequests,
  exportSignedRequests,
  cleanupExportedRequests,
  cancelSignatureRequest,
  deleteSignatureRequest,
  generateSignatureLink,
  getSignatureFile,
  formatFileSize,
  SignatureRequest,
  SignatureFile
} from '../services/signatureRequest';
import Icon from './Icon';
import { useModal } from '../contexts/ModalContext';
import { sendWAmsg } from '../modules/passport';
import ExportSignatureModal from '../modules/passport/components/ExportSignatureModal';
import { authStore } from '../stores/authStore';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { parseDate } from '../modules/appointments/utils/urlParams';
import { devLog, formatDate } from '../services/utils';

const SignatureRequestManager: Component = () => {
  const modal = useModal();
  const navigate = useNavigate();
  const [requests, setRequests] = createSignal<SignatureRequest[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [selectedRequest, setSelectedRequest] = createSignal<SignatureRequest | null>(null);
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal('');
  const [selectedRequests, setSelectedRequests] = createSignal<Set<string>>(new Set());
  const [exporting, setExporting] = createSignal(false);
  const [showExported, setShowExported] = createSignal(false);
  const [sendingMsg, setSendingMsg] = createSignal(false);
  
  // Export to passport modal
  const [showExportModal, setShowExportModal] = createSignal(false);
  const [selectedSignatureRequest, setSelectedSignatureRequest] = createSignal<SignatureRequest | null>(null);
  
  // Store/Business selection
  const [selectedStoreId, setSelectedStoreId] = createSignal<string>('all');
  
  // Form fields
  const [clientId, setClientId] = createSignal('');
  const [clientName, setClientName] = createSignal('');
  const [clientEmail, setClientEmail] = createSignal('');
  const [clientPhone, setClientPhone] = createSignal('');
  const [documentType, setDocumentType] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [expirationDays, setExpirationDays] = createSignal('7');
  const [formStoreId, setFormStoreId] = createSignal('');
  const [formStoreName, setFormStoreName] = createSignal('');

  onMount(() => {
    loadRequests();
  });

  
  const loadRequests = async () => {
    setLoading(true);
    try {
      // Always load business requests (which includes businessId and store filtering)
      let data = await getBusinessSignatureRequests();
      
      // Apply additional store filtering if a specific store is selected
      if (selectedStoreId() !== 'all') {
        data = data.filter(request => request.storeId === selectedStoreId());
      }
      
      devLog(`Loaded signature requests filtered by store ${selectedStoreId()}:`, data);
      setRequests(data);
    } catch (err) {
      setError('Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };
  

  const handleCreateRequest = async () => {
    devLog('handleCreateRequest called');
    devLog('Form values:', {
      clientId: clientId(),
      clientName: clientName(),
      clientEmail: clientEmail(),
      clientPhone: clientPhone(),
      documentType: documentType(),
      notes: notes(),
      expirationDays: expirationDays()
    });

    if (!clientId() || !clientName() || !expirationDays() || !formStoreId()) {
      setError('Por favor complete todos los campos requeridos (incluyendo la tienda)');
      return;
    }

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      devLog('Creating signature request...');
      const request = await createSignatureRequest({
        clientId: clientId(),
        clientName: clientName(),
        clientEmail: clientEmail(),
        clientPhone: clientPhone(),
        documentType: documentType(),
        notes: notes(),
        storeId: formStoreId(),
        businessId: authStore.getBusinessId(),
        storeName: formStoreName()
      }, parseInt(expirationDays()));

      devLog('Request created successfully:', request);
      setSuccess('Solicitud creada exitosamente');
      modal.hideModal();
      resetForm();
      await loadRequests();
      
      // Show the link modal for the created request
      showLinkModal(request);
    } catch (err: any) {
      console.error('Error creating request:', err);
      setError(err.message || 'Error al crear la solicitud');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('¿Está seguro de cancelar esta solicitud?')) return;

    try {
      await cancelSignatureRequest(requestId);
      await loadRequests();
      setSuccess('Solicitud cancelada');
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la solicitud');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('¿Está seguro de ELIMINAR permanentemente esta solicitud? Esta acción no se puede deshacer.')) return;

    try {
      await deleteSignatureRequest(requestId);
      await loadRequests();
      setSuccess('Solicitud eliminada permanentemente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la solicitud');
      setTimeout(() => setError(''), 5000);
    }
  };

  const resetForm = () => {
    setClientId('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setDocumentType('');
    setNotes('');
    setExpirationDays('7');
    setFormStoreId('');
    setFormStoreName('');
  };

  const handleExportToPassport = (request: SignatureRequest) => {
    setSelectedSignatureRequest(request);
    setShowExportModal(true);
      modal.hideModal();
  };

  const handleCloseExportModal = () => {
    setShowExportModal(false);
    setSelectedSignatureRequest(null);
  };

const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  const showCreateModal = () => {
    modal.showModal({
      title: 'Nueva Solicitud de Firma',
      children: (
        <div style={{ padding: '1.5rem' }}>
          <Show when={error()}>
            <div style={{
              padding: '1rem',
              'margin-bottom': '1rem',
              background: 'var(--error-light)',
              color: 'var(--error-dark)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              {error()}
            </div>
          </Show>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Store Selection */}
            <div>
              <label style={{
                display: 'block',
                'margin-bottom': '0.5rem',
                'font-weight': '500',
                color: 'var(--text-primary)'
              }}>
                Tienda/Ubicación *
              </label>
              <select
                value={formStoreId()}
                onChange={(e) => {
                  const storeId = e.target.value;
                  setFormStoreId(storeId);
                  const selectedStore = authStore.allowedStores.find(s => s.id === storeId);
                  setFormStoreName(selectedStore?.name || '');
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  background: 'white'
                }}
                required
              >
                <option value="">Seleccionar tienda...</option>
                {authStore.allowedStores.map(store => (
                  <option value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            
            <FormInput
              label="Pasaporte"
              value={clientId()}
              onChange={setClientId}
              placeholder="CLI-001"
              required
            />
            
            <FormInput
              label="Nombre del Cliente"
              value={clientName()}
              onChange={setClientName}
              placeholder="Juan Pérez"
              required
            />
            
          
            
            <FormInput
              label="Teléfono del Cliente"
              value={clientPhone()}
              onChange={setClientPhone}
              placeholder="+1 234 567 8900"
            />
            

            <div>
              <label style={{
                display: 'block',
                'margin-bottom': '0.5rem',
                'font-weight': '500',
                color: 'var(--text-primary)'
              }}>
                Días hasta expiración *
              </label>
              <select
                value={expirationDays()}
                onChange={(e) => setExpirationDays(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  background: 'white'
                }}
              >
                <option value="1">1 día</option>
                <option value="3">3 días</option>
                <option value="7">7 días</option>
                <option value="14">14 días</option>
                <option value="30">30 días</option>
              </select>
            </div>

            
            <div>
              <label style={{
                display: 'block',
                'margin-bottom': '0.5rem',
                'font-weight': '500',
                color: 'var(--text-primary)'
              }}>
                Notas
              </label>
              <textarea
                value={notes()}
                onInput={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales para el cliente..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  resize: 'vertical',
                  'font-family': 'inherit'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            'margin-top': '2rem',
            'justify-content': 'flex-end'
          }}>
            <Button
              variant="outline"
              onClick={() => {
                modal.hideModal();
                resetForm();
                setError('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRequest}
              disabled={creating()}
            >
              <Show when={creating()} fallback="Crear Solicitud">
                Creando...
              </Show>
            </Button>
          </div>
        </div>
      ),
      onClose: () => {
        resetForm();
        setError('');
      }
    });
  };

  const showLinkModal = (request: SignatureRequest) => {
    modal.showModal({
      title: 'Enlace de Firma Generado',
      children: (
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            'text-align': 'center',
            'margin-bottom': '2rem'
          }}>
            <div style={{
              'font-size': '4rem',
              'margin-bottom': '1rem'
            }}>
              📋
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              Comparta este enlace con <strong>{request.clientName}</strong>
            </p>
          </div>

          <div style={{
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius-sm)',
            'word-break': 'break-all',
            'font-family': 'monospace',
            'font-size': '0.875rem',
            'text-align': 'center',
            'margin-bottom': '1rem'
          }}>
            {generateSignatureLink( request?.accessToken || '', request.id)}
          </div>

          <div style={{
            display: 'grid',
            gap: '0.75rem'
          }}>
            <Button
              variant="primary"
              onClick={() => {
                copyLink( request.id, request?.accessToken || "");
              }}
              style={{ width: '100%' }}
            >
              <Icon name="copy" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Copiar Enlace
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => {
                const link = generateSignatureLink(request?.accessToken || '', request.id);
                const text = `Por favor firme el documento usando este enlace: ${link}`;
                window.open(`mailto:${request.clientEmail}?subject=Solicitud de Firma&body=${encodeURIComponent(text)}`);
              }}
              style={{ width: '100%' }}
            >
              <Icon name="email" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Enviar por Email
            </Button>
            
            <Show when={request.clientPhone}>
              <Button
                variant="secondary"
                onClick={async () => {
                  setSendingMsg(true)
                  const link = generateSignatureLink(request?.accessToken || '', request.id);
                  const text = `Por favor firme el documento: \n${link}`;
                  //window.open(`sms:${request.clientPhone}?body=${encodeURIComponent(text)}`);

                  let hh = await sendWAmsg(request.clientPhone, text);
                  devLog(hh)
                  setSendingMsg(false)
                }}
                style={{ width: '100%' }}
              >

                <Show when={!sendingMsg()} fallback={<div>
                  sending...
                </div>}>
                  <Icon name="whatsapp" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                  Enviar por WhatsApp
                </Show>
               
              </Button>
            </Show>
          </div>

          <p style={{
            'margin-top': '1rem',
            'font-size': '0.8rem',
            color: 'var(--text-muted)',
            'text-align': 'center'
          }}>
            El enlace expirará el {request.expiresAt}
          </p>
        </div>
      )
    });
  };

  const copyLink = (requestId: string, accessToken: string) => {
    const link = generateSignatureLink(accessToken , requestId)
    navigator.clipboard.writeText(link);
    setSuccess('Enlace copiado al portapapeles');
    setTimeout(() => setSuccess(''), 3000);
  };

  const sendToPDFSignature = (request: SignatureRequest) => {
    if (!request.signatureUrl) return;
    
    // Store the signature data in sessionStorage to pass to PDF signature page
    const signatureData = {
      imageData: request.signatureUrl, // Base64 data - no CORS issues!
      clientName: request.clientName,
      requestId: request.id,
      signedAt: request.signedAt
    };
    
    sessionStorage.setItem('pendingSignature', JSON.stringify(signatureData));
    modal.hideModal();
    navigate('/pdf-signature');
  };

  const showSignatureModal = (request: SignatureRequest) => {
    if (!request.signatureUrl) {
      modal.showModal({
        title: 'Error',
        children: (
          <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
            <p>Esta solicitud no tiene firma disponible.</p>
          </div>
        )
      });
      return;
    }

    // Calculate base64 size for display
    const base64Size = Math.round((request.signatureUrl.length * 3) / 4); // Approximate base64 size
    
    modal.showModal({
      title: 'Firma del Cliente',
      children: (
        <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h3 style={{ 'margin-bottom': '0.5rem' }}>{request.clientName}</h3>
            <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Firmado el: {request.signedAt}
            </p>
            
            {/* Base64 metadata */}
            <div style={{
              'margin-top': '0.5rem',
              padding: '0.5rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <span style={{ 'margin-right': '1rem' }}>
                📁 {formatFileSize(base64Size)}
              </span>
              <span style={{ 'margin-right': '1rem' }}>
                🗃️ Base64 (PNG)
              </span>
              <span>
                🚫 No CORS Issues
              </span>
            </div>
          </div>
          
          <div style={{
            border: '2px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            padding: '1rem',
            background: 'white',
            'max-width': '100%',
            overflow: 'hidden'
          }}>
            <img 
              src={request.signatureUrl}
              alt="Firma del cliente"
              style={{
                'max-width': '100%',
                'max-height': '400px',
                height: 'auto',
                display: 'block',
                margin: '0 auto'
              }}
            />
          </div>
          
          <div style={{ 
            'margin-top': '1.5rem',
            display: 'flex',
            gap: '1rem',
            'justify-content': 'center',
            'flex-wrap': 'wrap'
          }}>
            <Show when={authStore.state?.profile?.AdminPassportAccess}>

           
              <Button
                variant="primary"
                onClick={() => sendToPDFSignature(request)}
              >
                <Icon name="document" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                Usar en PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExportToPassport(request)}
              >
                <Icon name="card" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                Exportar a Pasaporte
              </Button>
            </Show>
            
            <Button
              variant="outline"
              onClick={() => {
                // Use base64 data directly for download - no CORS issues!
                const link = document.createElement('a');
                link.download = `firma-${request.clientName}-${request.id}.png`;
                link.href = request.signatureUrl;
                link.click();
              }}
            >
              <Icon name="download" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Descargar
            </Button>
            <Button
              variant="outline"
              onClick={() => modal.hideModal()}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )
    });
  };

  const toggleRequestSelection = (requestId: string) => {
    const selected = new Set(selectedRequests());
    if (selected.has(requestId)) {
      selected.delete(requestId);
    } else {
      selected.add(requestId);
    }
    setSelectedRequests(selected);
  };

  const selectAllSigned = () => {
    const signedRequests = requests().filter(r => r.status === 'signed');
    setSelectedRequests(new Set(signedRequests.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedRequests(new Set());
  };

  const handleExportSelected = async () => {
    if (selectedRequests().size === 0) {
      setError('No hay solicitudes seleccionadas para exportar');
      return;
    }

    setExporting(true);
    setError('');
    setSuccess('');

    try {
      const requestIds = Array.from(selectedRequests());
      const results = await exportSignedRequests(requestIds);

      if (results.success.length > 0) {
        setSuccess(`${results.success.length} solicitudes exportadas exitosamente`);
      }

      if (results.errors.length > 0) {
        const errorMsg = results.errors.map(e => `${e.id}: ${e.error}`).join(', ');
        setError(`Errores en exportación: ${errorMsg}`);
      }

      clearSelection();
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Error al exportar solicitudes');
    } finally {
      setExporting(false);
    }
  };

  const handleCleanupExported = async () => {
    const exportedRequests = requests().filter(r => r.status === 'exported');
    if (exportedRequests.length === 0) {
      setError('No hay solicitudes exportadas para limpiar');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar ${exportedRequests.length} solicitudes exportadas de Firestore? Esta acción no se puede deshacer.`)) {
      return;
    }

    setExporting(true);
    setError('');
    setSuccess('');

    try {
      const requestIds = exportedRequests.map(r => r.id);
      const results = await cleanupExportedRequests(requestIds);

      if (results.success.length > 0) {
        setSuccess(`${results.success.length} solicitudes limpiadas exitosamente`);
      }

      if (results.errors.length > 0) {
        const errorMsg = results.errors.map(e => `${e.id}: ${e.error}`).join(', ');
        setError(`Errores en limpieza: ${errorMsg}`);
      }

      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Error al limpiar solicitudes');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'var(--warning-color)', bg: 'var(--warning-light)', text: 'Pendiente' },
      signed: { color: 'var(--success-color)', bg: 'var(--success-light)', text: 'Firmado' },
      expired: { color: 'var(--error-color)', bg: 'var(--error-light)', text: 'Expirado' },
      cancelled: { color: 'var(--text-muted)', bg: 'var(--background-secondary)', text: 'Cancelado' },
      exported: { color: 'var(--info-color)', bg: 'var(--info-light)', text: 'Exportado' }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        'border-radius': 'var(--border-radius-sm)',
        background: badge.bg,
        color: badge.color,
        'font-size': '0.8rem',
        'font-weight': '500'
      }}>
        {badge.text}
      </span>
    );
  };

  return (
    <>
    <Card title="Gestión de Solicitudes de Firma">
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '2rem',
          'flex-wrap': 'wrap',
          gap: '1rem'
        }}>
          <div>
            <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Envíe solicitudes de firma a sus clientes por email o SMS
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
            <Button
              variant="primary"
              onClick={showCreateModal}
            >
              <Icon name="add" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Nueva Solicitud
            </Button>
            
            <Show when={requests().some(r => r.status === 'signed')}>
              <Button
                variant="secondary"
                onClick={selectAllSigned}
                disabled={exporting()}
              >
                Seleccionar Firmadas
              </Button>
              
              <Show when={selectedRequests().size > 0}>
                <Button
                  variant="success"
                  onClick={handleExportSelected}
                  disabled={exporting()}
                >
                  <Show when={exporting()} fallback={`Exportar (${selectedRequests().size})`}>
                    Exportando...
                  </Show>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={exporting()}
                >
                  Limpiar Selección
                </Button>
              </Show>
            </Show>
            
            <Show when={requests().some(r => r.status === 'exported')}>
              <Button
                variant="warning"
                onClick={handleCleanupExported}
                disabled={exporting()}
              >
                <Show when={exporting()} fallback="Limpiar Exportadas">
                  Limpiando...
                </Show>
              </Button>
            </Show>
          </div>
        </div>

        {/* Store Filter */}
        <div style={{
          'margin-bottom': '2rem',
          padding: '1.5rem',
          background: 'var(--bg-secondary)',
          'border-radius': 'var(--border-radius)',
          border: '1px solid var(--border-color)'
        }}>
          <FormSelect
            value={selectedStoreId()}
            onChange={(value) => {
              setSelectedStoreId(value);
              loadRequests();
            }}
            options={[
              { value: 'all', label: 'Todas las Tiendas' },
              ...authStore.allowedStores.map(store => ({
                value: store.id,
                label: store.name,
                disabled: !store.isActive
              }))
            ]}
            style={{ 'min-width': '250px' }}
            disabled={loading()}
            label="Filtrar Solicitudes de Firma por Tienda"
          />
        </div>

        {/* Messages */}
        <Show when={error()}>
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: 'var(--error-light)',
            color: 'var(--error-dark)',
            'border-radius': 'var(--border-radius-sm)'
          }}>
            {error()}
          </div>
        </Show>

        <Show when={success()}>
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: 'var(--success-light)',
            color: 'var(--success-dark)',
            'border-radius': 'var(--border-radius-sm)'
          }}>
            {success()}
          </div>
        </Show>

        {/* Requests List */}
        <Show when={!loading()} fallback={
          <div style={{ 'text-align': 'center', padding: '2rem' }}>
            <div style={{ 'font-size': '1.5rem', 'margin-bottom': '0.5rem' }}>⏳</div>
            <p>Cargando solicitudes...</p>
          </div>
        }>
          <Show when={requests().length > 0} fallback={
            <div style={{
              'text-align': 'center',
              padding: '3rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius)'
            }}>
              <Icon name="document" size="3rem" style={{ opacity: '0.3', 'margin-bottom': '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>
                No hay solicitudes de firma. Cree una nueva para empezar.
              </p>
            </div>
          }>
            <div style={{
              display: 'grid',
              gap: '1rem'
            }}>
              <For each={requests()}>
                {(request) => (
                  <div style={{
                    padding: '1.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius)',
                    background: 'var(--surface-color)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'flex-start',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '1rem' }}>
                        <Show when={request.status === 'signed'}>
                          <input
                            type="checkbox"
                            checked={selectedRequests().has(request.id)}
                            onChange={() => toggleRequestSelection(request.id)}
                            style={{
                              'margin-top': '0.25rem',
                              width: '1.125rem',
                              height: '1.125rem'
                            }}
                          />
                        </Show>
                        <div>
                          <h4 style={{ 'margin-bottom': '0.5rem' }}>{request.signerName}</h4>
                          <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                            {request.signerEmail}
                            <Show when={request.signerPhone}>
                              <span> • {request.signerPhone}</span>
                            </Show>
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      'font-size': '0.8rem',
                      color: 'var(--text-muted)'
                    }}>
                      <div>
                        <strong>ID:</strong> {request?.id}
                      </div>
                      <div>
                        <strong>Creado:</strong> {formatDate(request?.createdAt)}
                      </div>
                      <div>
                        <strong>Expira:</strong> {formatDate(request?.expiresAt)}
                      </div>
                      <Show when={request?.documentType}>
                        <div>
                          <strong>Documento:</strong> {request?.documentType}
                        </div>
                      </Show>
                      <Show when={request?.storeName || request?.storeId}>
                        <div>
                          <strong>Tienda:</strong> {request?.storeName || request?.storeId}
                        </div>
                      </Show>
                    </div>

                    <Show when={request?.signedAt}>
                      <div style={{
                        'margin-top': '0.75rem',
                        padding: '0.75rem',
                        background: 'var(--success-light)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem'
                      }}>
                        <strong>Firmado el:</strong> {formatDate(request?.signedAt)}
                      </div>
                    </Show>

                    <Show when={request.notes}>
                      <div style={{
                        'margin-top': '0.75rem',
                        padding: '0.75rem',
                        background: 'var(--background-secondary)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem'
                      }}>
                        <strong>Notas:</strong> {request.notes}
                      </div>
                    </Show>

                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      'margin-top': '1rem',
                      'flex-wrap': 'wrap'
                    }}>
                      <Show when={request.status === 'pending'}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            showLinkModal(request);
                          }}
                        >
                          <Icon name="copy" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />
                          Copiar Enlace
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          Cancelar
                        </Button>
                      </Show>
                      <Show when={request.status === 'signed' && request.signatureUrl}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => showSignatureModal(request)}
                        >
                          <Icon name="signature" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />
                          Ver Firma
                        </Button>
                      </Show>
                      
                      {/* Delete button - visible to admin or creator */}
                      <Show when={authStore.isAdmin() || request.requestedBy === authStore.state.user?.uid}>
                        <Button
                          variant="error"
                          size="sm"
                          onClick={() => handleDeleteRequest(request.id)}
                          title="Eliminar solicitud permanentemente"
                        >
                          <Icon name="delete" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />
                          Eliminar
                        </Button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>

      </div>
    </Card>
    
    {/* Export to Passport Modal */}
    <Show when={selectedSignatureRequest()}>
      <ExportSignatureModal
        isOpen={showExportModal()}
        onClose={handleCloseExportModal}
        signatureRequest={selectedSignatureRequest()!}
      />
    </Show>
    </>
  );
};

export default SignatureRequestManager;