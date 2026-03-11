/**
 * TaxPortalRequestManager
 * Component for managing document requests for a Tax Portal
 * - Create new document requests
 * - View existing requests with status
 * - Access methods: Magic Link, PIN, QR Code
 * - Send reminders and cancel/delete requests
 */

import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { Card, Button, FormInput, FormSelect } from '../../ui';
import {
  createDocumentRequest,
  getDocumentRequestsByPortal,
  cancelDocumentRequest,
  deleteDocumentRequest,
  sendDocumentRequestReminder,
  getPublicUploadUrl,
  getPinAccessUrl,
  formatExpiration,
  getUploadProgress,
  isRequestExpired
} from '../services/taxPortalApi';
import type { TaxPortal, TaxDocumentRequest, TaxYear } from '../types/drakeTypes';
import { DEFAULT_REQUESTED_DOCUMENTS, ALL_REQUEST_TYPES, VERIFICATION_FORM_TYPES } from '../types/drakeTypes';
import { devLog } from '../../../services/utils';

interface TaxPortalRequestManagerProps {
  taxPortal: TaxPortal;
  onRequestCreated?: (request: TaxDocumentRequest) => void;
}

const TaxPortalRequestManager: Component<TaxPortalRequestManagerProps> = (props) => {
  // State
  const [requests, setRequests] = createSignal<TaxDocumentRequest[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

  // Create request form state
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [selectedTaxYear, setSelectedTaxYear] = createSignal<TaxYear>(2024);
  const [selectedDocuments, setSelectedDocuments] = createSignal<string[]>(
    DEFAULT_REQUESTED_DOCUMENTS.filter(d => d.required).map(d => d.type)
  );
  const [instructions, setInstructions] = createSignal('');
  const [isCreating, setIsCreating] = createSignal(false);

  // Expanded request cards
  const [expandedRequestId, setExpandedRequestId] = createSignal<string | null>(null);

  // Clipboard feedback
  const [copiedField, setCopiedField] = createSignal<string | null>(null);

  // Load requests on mount and when taxPortal changes
  createEffect(() => {
    devLog(props.taxPortal)
    if (props.taxPortal?.id) {
      loadRequests();
    }
  });

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDocumentRequestsByPortal(props.taxPortal.id);
      setRequests(data);
    } catch (err) {
      setError('Error al cargar las solicitudes');
      devLog('Error loading requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    setIsCreating(true);
    setError(null);
    try {
      // Only include selected documents in the request
      const requestedDocs = ALL_REQUEST_TYPES
        .filter(doc => selectedDocuments().includes(doc.type))
        .map(doc => ({
          ...doc,
          required: true, // Selected documents are required
          uploaded: false
        }));



      

      const newRequest = await createDocumentRequest(props.taxPortal, {
        taxYear: selectedTaxYear(),
        requestedDocuments: requestedDocs,
        instructions: instructions() || undefined
      });

      setRequests(prev => [newRequest, ...prev]);
      setShowCreateForm(false);
      setInstructions('');
      setSuccessMessage('Solicitud creada exitosamente');
      setTimeout(() => setSuccessMessage(null), 3000);

      props.onRequestCreated?.(newRequest);
    } catch (err) {
      setError('Error al crear la solicitud');
      devLog('Error creating request:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Esta seguro de cancelar esta solicitud?')) return;

    try {
      await cancelDocumentRequest(requestId);
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: 'cancelled' as const } : r
      ));
      setSuccessMessage('Solicitud cancelada');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al cancelar la solicitud');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Esta seguro de eliminar esta solicitud? Esta accion no se puede deshacer.')) return;

    try {
      await deleteDocumentRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setSuccessMessage('Solicitud eliminada');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al eliminar la solicitud');
    }
  };

  const handleSendReminder = async (requestId: string) => {
    try {
      await sendDocumentRequestReminder(requestId);
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, remindersSent: (r.remindersSent || 0) + 1 } : r
      ));
      setSuccessMessage('Recordatorio enviado');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Error al enviar el recordatorio');
    }
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      devLog('Error copying to clipboard:', err);
    }
  };

  const openWhatsApp = (request: TaxDocumentRequest) => {
    const phone = request.clientPhone?.replace(/\D/g, '') || '';
    const link = getPublicUploadUrl(request.accessToken);
    const message = encodeURIComponent(
      `Hola ${request.clientName}, necesitamos que suba sus documentos fiscales para el ano ${request.taxYear}.\n\n` +
      `Puede acceder usando este enlace: ${link}\n\n` +
      `O ingrese con el PIN: ${request.accessPin}\n\n` +
      `La solicitud expira en: ${formatExpiration(request.expiresAt)}`
    );

    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadge = (status: TaxDocumentRequest['status']) => {
    const configs = {
      pending: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
      partial: { label: 'Parcial', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
      complete: { label: 'Completo', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
      expired: { label: 'Expirado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
      cancelled: { label: 'Cancelado', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)' }
    };
    return configs[status] || configs.pending;
  };

  const toggleDocumentSelection = (docType: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docType)
        ? prev.filter(d => d !== docType)
        : [...prev, docType]
    );
  };

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const titleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    margin: '0'
  };

  const messageStyle = (type: 'success' | 'error') => ({
    padding: '0.75rem 1rem',
    'border-radius': '6px',
    'font-size': '0.875rem',
    background: type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: type === 'success' ? '#10B981' : '#EF4444',
    border: `1px solid ${type === 'success' ? '#10B981' : '#EF4444'}`,
    'margin-bottom': '1rem'
  });

  const formContainerStyle = {
    padding: '1rem',
    background: 'var(--surface-alt, #f9fafb)',
    'border-radius': '8px',
    border: '1px solid var(--border-color, #e5e7eb)',
    'margin-bottom': '1rem'
  };

  const formGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const documentGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.5rem',
    'margin-bottom': '1rem'
  };

  const documentCheckboxStyle = (selected: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: selected ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface-color, #ffffff)',
    border: `1px solid ${selected ? '#3B82F6' : 'var(--border-color, #e5e7eb)'}`,
    'border-radius': '6px',
    cursor: 'pointer',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease'
  });

  const requestCardStyle = (isExpanded: boolean) => ({
    background: 'var(--surface-color, #ffffff)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '8px',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease',
    'box-shadow': isExpanded ? 'var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1))' : 'none'
  });

  const requestHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    cursor: 'pointer',
    'user-select': 'none' as const
  };

  const requestInfoStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem'
  };

  const statusBadgeStyle = (config: { color: string; bg: string }) => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.25rem 0.625rem',
    'border-radius': '9999px',
    background: config.bg,
    color: config.color,
    'font-size': '0.75rem',
    'font-weight': '600'
  });

  const progressBarContainerStyle = {
    width: '100px',
    height: '6px',
    background: 'var(--border-color, #e5e7eb)',
    'border-radius': '3px',
    overflow: 'hidden'
  };

  const progressBarStyle = (progress: number) => ({
    width: `${progress}%`,
    height: '100%',
    background: progress === 100 ? '#10B981' : '#3B82F6',
    transition: 'width 0.3s ease'
  });

  const expandedContentStyle = {
    padding: '1rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--surface-alt, #f9fafb)'
  };

  const accessMethodsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const accessMethodCardStyle = {
    padding: '1rem',
    background: 'var(--surface-color, #ffffff)',
    'border-radius': '8px',
    border: '1px solid var(--border-color, #e5e7eb)'
  };

  const accessMethodTitleStyle = {
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
    color: 'var(--text-secondary, #6B7280)',
    'margin-bottom': '0.5rem'
  };

  const accessValueStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const accessValueTextStyle = {
    flex: '1',
    padding: '0.5rem',
    background: 'var(--surface-alt, #f9fafb)',
    'border-radius': '4px',
    'font-family': 'monospace',
    'font-size': '0.875rem',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap' as const
  };

  const copyButtonStyle = (isCopied: boolean) => ({
    padding: '0.5rem',
    background: isCopied ? '#10B981' : 'var(--primary-color, #3B82F6)',
    color: '#ffffff',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    transition: 'background 0.2s ease'
  });

  const qrCodeContainerStyle = {
    display: 'flex',
    'justify-content': 'center',
    'align-items': 'center',
    padding: '1rem',
    background: '#ffffff',
    'border-radius': '8px'
  };

  const actionsRowStyle = {
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap' as const,
    'margin-top': '1rem'
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)',
    'font-size': '0.875rem'
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: 'var(--text-secondary, #6B7280)'
  };

  const TAX_YEAR_OPTIONS = [
    { value: '2023', label: '2023' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' }
  ];

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={titleStyle}>Solicitudes de Documentos</h3>
        <Button
          variant={showCreateForm() ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm())}
        >
          {showCreateForm() ? 'Cancelar' : '+ Nueva Solicitud'}
        </Button>
      </div>

      {/* Messages */}
      <Show when={error()}>
        <div style={messageStyle('error')}>{error()}</div>
      </Show>
      <Show when={successMessage()}>
        <div style={messageStyle('success')}>{successMessage()}</div>
      </Show>

      {/* Create Request Form */}
      <Show when={showCreateForm()}>
        <div style={formContainerStyle}>
          <h4 style={{ margin: '0 0 1rem 0', 'font-size': '1rem' }}>Nueva Solicitud de Documentos</h4>

          <div style={formGridStyle}>
            <FormSelect
              label="Ano Fiscal"
              value={selectedTaxYear().toString()}
              onChange={(v) => setSelectedTaxYear(parseInt(v) as TaxYear)}
              options={TAX_YEAR_OPTIONS}
              required
            />
            <div>
              <FormInput
                label="Instrucciones (opcional)"
                value={instructions()}
                onChange={setInstructions}
                placeholder="Instrucciones adicionales para el cliente..."
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Verificacion de Informacion (Formularios)</label>
            <div style={documentGridStyle}>
              <For each={ALL_REQUEST_TYPES.filter(d => VERIFICATION_FORM_TYPES.includes(d.type as any))}>
                {(doc) => (
                  <div
                    style={{
                      ...documentCheckboxStyle(selectedDocuments().includes(doc.type)),
                      background: selectedDocuments().includes(doc.type)
                        ? 'rgba(139, 92, 246, 0.1)'
                        : 'var(--surface-alt, #f9fafb)',
                      border: selectedDocuments().includes(doc.type)
                        ? '2px solid #8b5cf6'
                        : '1px solid var(--border-color, #e5e7eb)'
                    }}
                    onClick={() => toggleDocumentSelection(doc.type)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments().includes(doc.type)}
                      onChange={() => toggleDocumentSelection(doc.type)}
                    />
                    <span style={{ display: 'flex', 'align-items': 'center', gap: '0.375rem' }}>
                      <svg viewBox="0 0 20 20" fill="#8b5cf6" style={{ width: '14px', height: '14px' }}>
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                      </svg>
                      {doc.label}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Documentos a Subir (Archivos)</label>
            <div style={documentGridStyle}>
              <For each={ALL_REQUEST_TYPES.filter(d => !VERIFICATION_FORM_TYPES.includes(d.type as any))}>
                {(doc) => (
                  <div
                    style={documentCheckboxStyle(selectedDocuments().includes(doc.type))}
                    onClick={() => toggleDocumentSelection(doc.type)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments().includes(doc.type)}
                      onChange={() => toggleDocumentSelection(doc.type)}
                    />
                    <span style={{ display: 'flex', 'align-items': 'center', gap: '0.375rem' }}>
                      <svg viewBox="0 0 20 20" fill="#3b82f6" style={{ width: '14px', height: '14px' }}>
                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                      {doc.label}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateForm(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateRequest}
              disabled={isCreating() || selectedDocuments().length === 0}
            >
              {isCreating() ? 'Creando...' : 'Crear Solicitud'}
            </Button>
          </div>
        </div>
      </Show>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div style={emptyStateStyle}>
          <p>Cargando solicitudes...</p>
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!isLoading() && requests().length === 0}>
        <div style={emptyStateStyle}>
          <p>No hay solicitudes de documentos</p>
          <p style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
            Cree una nueva solicitud para que el cliente suba sus documentos fiscales.
          </p>
        </div>
      </Show>

      {/* Request List */}
      <Show when={!isLoading() && requests().length > 0}>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
          <For each={requests()}>
            {(request) => {
              const isExpanded = () => expandedRequestId() === request.id;
              const statusConfig = getStatusBadge(request.status);
              const progress = getUploadProgress(request);
              const uploadUrl = getPublicUploadUrl(request.accessToken);
              const isExpiredRequest = isRequestExpired(request);

              return (
                <div style={requestCardStyle(isExpanded())}>
                  {/* Request Header */}
                  <div
                    style={requestHeaderStyle}
                    onClick={() => setExpandedRequestId(isExpanded() ? null : request.id)}
                  >
                    <div style={requestInfoStyle}>
                      <span style={statusBadgeStyle(statusConfig)}>{statusConfig.label}</span>
                      <span style={{ 'font-weight': '500' }}>Ano {request.taxYear}</span>
                      <div style={progressBarContainerStyle}>
                        <div style={progressBarStyle(progress)} />
                      </div>
                      <span style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
                        {progress}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                      <span style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
                        {formatExpiration(request.expiresAt)}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        style={{
                          transform: isExpanded() ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <path
                          d="M4 6L8 10L12 6"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <Show when={isExpanded()}>
                    <div style={expandedContentStyle}>
                      {/* Access Methods */}
                      <div style={accessMethodsGridStyle}>
                        {/* Magic Link */}
                        <div style={accessMethodCardStyle}>
                          <div style={accessMethodTitleStyle}>Enlace Magico</div>
                          <div style={accessValueStyle}>
                            <div style={accessValueTextStyle}>{uploadUrl}</div>
                            <button
                              style={copyButtonStyle(copiedField() === `link-${request.id}`)}
                              onClick={() => copyToClipboard(uploadUrl, `link-${request.id}`)}
                              title="Copiar enlace"
                            >
                              <Show when={copiedField() === `link-${request.id}`} fallback={
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              }>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </Show>
                            </button>
                          </div>
                        </div>

                        {/* PIN Code */}
                        <div style={accessMethodCardStyle}>
                          <div style={accessMethodTitleStyle}>Codigo PIN</div>
                          <div style={accessValueStyle}>
                            <div style={{
                              ...accessValueTextStyle,
                              'font-size': '1.25rem',
                              'font-weight': '700',
                              'letter-spacing': '0.1em',
                              'text-align': 'center'
                            }}>
                              {request.accessPin}
                            </div>
                            <button
                              style={copyButtonStyle(copiedField() === `pin-${request.id}`)}
                              onClick={() => copyToClipboard(request.accessPin, `pin-${request.id}`)}
                              title="Copiar PIN"
                            >
                              <Show when={copiedField() === `pin-${request.id}`} fallback={
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              }>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </Show>
                            </button>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-top': '0.5rem' }}>
                            Usar en: {getPinAccessUrl()}
                          </div>
                        </div>

                        {/* QR Code */}
                        <div style={accessMethodCardStyle}>
                          <div style={accessMethodTitleStyle}>Codigo QR</div>
                          <Show when={request.qrCodeUrl}>
                            <div style={qrCodeContainerStyle}>
                              <img
                                src={request.qrCodeUrl}
                                alt="QR Code"
                                style={{ width: '150px', height: '150px' }}
                              />
                            </div>
                          </Show>
                        </div>
                      </div>

                      {/* Document Progress */}
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <div style={accessMethodTitleStyle}>Documentos Solicitados</div>
                        <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                          <For each={request.requestedDocuments}>
                            {(doc) => (
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                'border-radius': '4px',
                                'font-size': '0.75rem',
                                background: doc.uploaded ? 'rgba(16, 185, 129, 0.1)' :
                                            doc.required ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                color: doc.uploaded ? '#10B981' :
                                       doc.required ? '#EF4444' : '#6B7280',
                                border: `1px solid ${doc.uploaded ? '#10B981' : doc.required ? '#EF4444' : '#6B7280'}`
                              }}>
                                {doc.uploaded ? 'OK' : doc.required ? '*' : ''} {doc.label}
                              </span>
                            )}
                          </For>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={actionsRowStyle}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openWhatsApp(request)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </Button>
                        <Show when={request.status !== 'complete' && request.status !== 'cancelled' && !isExpiredRequest}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendReminder(request.id)}
                          >
                            Enviar Recordatorio
                            {request.remindersSent ? ` (${request.remindersSent})` : ''}
                          </Button>
                        </Show>
                        <Show when={request.status === 'pending' || request.status === 'partial'}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            Cancelar
                          </Button>
                        </Show>
                        <Show when={request.status === 'cancelled' || request.status === 'expired'}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteRequest(request.id)}
                          >
                            Eliminar
                          </Button>
                        </Show>
                      </div>

                      {/* Request Details */}
                      <div style={{
                        'margin-top': '1rem',
                        'padding-top': '1rem',
                        'border-top': '1px solid var(--border-color)',
                        'font-size': '0.75rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <div>Creado: {new Date(request.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}</div>
                        <div>Por: {request.requestedByName}</div>
                        <Show when={request.lastAccessedAt}>
                          <div>Ultimo acceso: {new Date(request.lastAccessedAt!).toLocaleDateString('es-ES', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}</div>
                        </Show>
                        <Show when={request.instructions}>
                          <div style={{ 'margin-top': '0.5rem' }}>
                            <strong>Instrucciones:</strong> {request.instructions}
                          </div>
                        </Show>
                      </div>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default TaxPortalRequestManager;
