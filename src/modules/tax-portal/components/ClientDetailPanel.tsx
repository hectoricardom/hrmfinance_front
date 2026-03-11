import { Component, createSignal, onMount, For, Show, createEffect } from 'solid-js';
import { devLog } from '../../../services/utils';
import { Card, Button } from '../../ui';
import {
  TaxClientProfile,
  TaxDocument,
  DocumentChecklist,
  ChecklistItem,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  FILING_STATUS_LABELS,
  INCOME_SOURCE_LABELS,
  DEDUCTION_TYPE_LABELS,
} from '../types';
import { taxPortalService } from '../services/taxPortalService';
import { taxPortalStore } from '../stores/taxPortalStore';
import { useTranslation } from '../../../translations';
import DocumentDataViewer from './DocumentDataViewer';
import ClientEditForm from './ClientEditForm';

interface ClientDetailPanelProps {
  client: TaxClientProfile;
  onClose: () => void;
  onCopyLink: () => void;
  onClientUpdated?: (client: TaxClientProfile) => void;
}

type TabType = 'overview' | 'documents' | 'checklist' | 'edit';

const ClientDetailPanel: Component<ClientDetailPanelProps> = (props) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<TabType>('overview');
  const [documents, setDocuments] = createSignal<TaxDocument[]>([]);
  const [checklist, setChecklist] = createSignal<DocumentChecklist | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [linkSent, setLinkSent] = createSignal(false);
  const [analyzing, setAnalyzing] = createSignal<string | null>(null);
  const [uploading, setUploading] = createSignal(false);
  const [uploadSuccess, setUploadSuccess] = createSignal<string | null>(null);
  const [dragOver, setDragOver] = createSignal(false);
  const [viewingDocument, setViewingDocument] = createSignal<TaxDocument | null>(null);

  onMount(async () => {
    await loadClientData();
  });

  createEffect(() => {
    // Reload when client changes
    loadClientData();
  });

  const loadClientData = async () => {
    setIsLoading(true);
    try {
      const docs = await taxPortalService.getClientDocuments(props.client.id);
      setDocuments(docs);

      const clientChecklist = taxPortalStore.getClientChecklist(props.client.id);
      setChecklist(clientChecklist);
    } catch (error) {
      devLog('Error loading client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send portal link
  const sendPortalLink = async (method: 'email' | 'sms' | 'both') => {
    try {
      await taxPortalService.sendMagicLink(props.client.id, method);
      setLinkSent(true);
      setTimeout(() => setLinkSent(false), 3000);
    } catch (error) {
      devLog('Error sending link:', error);
    }
  };

  // Analyze document
  const analyzeDocument = async (doc: TaxDocument) => {
    setAnalyzing(doc.id);
    try {
      await taxPortalService.analyzeDocument(doc);
      await loadClientData();
    } catch (error) {
      devLog('Error analyzing document:', error);
    } finally {
      setAnalyzing(null);
    }
  };

  // Bulk analyze all documents
  const bulkAnalyze = async () => {
    setAnalyzing('bulk');
    try {
      await taxPortalService.bulkAnalyzeDocuments(props.client.id);
      await loadClientData();
    } catch (error) {
      devLog('Error in bulk analysis:', error);
    } finally {
      setAnalyzing(null);
    }
  };

  // Approve document
  const approveDocument = async (docId: string) => {
    await taxPortalService.approveDocument(docId);
    await loadClientData();
  };

  // Update client status
  const updateStatus = async (status: TaxClientProfile['status']) => {
    await taxPortalService.updateClient(props.client.id, { status });
  };

  // Upload document for client (preparer upload)
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadSuccess(null);

    try {
      devLog('📤 Uploading document for client:', props.client.firstName, props.client.lastName);

      const uploadedDoc = await taxPortalService.uploadDocument(
        props.client.id,
        file,
        'preparer'
      );

      devLog('✅ Document uploaded:', uploadedDoc.id);

      // Try to auto-analyze
      try {
        await taxPortalService.analyzeDocument(uploadedDoc);
        devLog('✅ Document analyzed');
      } catch (analyzeError) {
        devLog('Auto-analysis failed, will need manual analysis');
      }

      // Refresh documents list
      await loadClientData();

      setUploadSuccess(`"${file.name}" ${t('taxPortal.uploadSuccess')}`);
      setTimeout(() => setUploadSuccess(null), 4000);

    } catch (error) {
      devLog('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Get progress info
  const getProgress = () => {
    const list = checklist();
    if (!list) return { completed: 0, total: 0, percent: 0 };

    const required = list.items.filter(i => i.required);
    const completed = required.filter(i => i.status !== 'missing');

    return {
      completed: completed.length,
      total: required.length,
      percent: required.length > 0 ? Math.round((completed.length / required.length) * 100) : 0,
    };
  };

  // Styles
  const panelStyle = {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '600px',
    'max-width': '100vw',
    background: 'white',
    'box-shadow': '-4px 0 20px rgba(0,0,0,0.15)',
    'z-index': 1000,
    display: 'flex',
    'flex-direction': 'column' as const,
  };

  const headerStyle = {
    padding: '1.5rem',
    'border-bottom': '1px solid var(--border-color)',
    background: 'var(--gray-50)',
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1rem',
    background: isActive ? 'white' : 'transparent',
    border: 'none',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '400',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
  });

  const contentStyle = {
    flex: 1,
    'overflow-y': 'auto' as const,
    padding: '1.5rem',
  };

  const infoRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)',
  };

  const statusBadgeStyle = (status: TaxClientProfile['status']) => ({
    padding: '0.25rem 0.75rem',
    background: CLIENT_STATUS_COLORS[status] + '20',
    color: CLIENT_STATUS_COLORS[status],
    'border-radius': '999px',
    'font-size': '0.875rem',
    'font-weight': '500',
  });

  const documentItemStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    padding: '1rem',
    background: 'var(--gray-50)',
    'border-radius': '8px',
    'margin-bottom': '0.75rem',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          'z-index': 999,
        }}
        onClick={props.onClose}
      />

      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 0.25rem' }}>
                {props.client.firstName} {props.client.lastName}
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {props.client.email || props.client.phone}
              </p>
            </div>
            <button
              onClick={props.onClose}
              style={{
                background: 'none',
                border: 'none',
                'font-size': '1.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
              }}
            >
              X
            </button>
          </div>

          {/* Progress Bar */}
          <div style={{ 'margin-top': '1rem' }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                {t('taxPortal.documentProgress')}
              </span>
              <span style={{ 'font-weight': '600' }}>{getProgress().percent}%</span>
            </div>
            <div style={{
              height: '8px',
              background: 'var(--gray-200)',
              'border-radius': '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${getProgress().percent}%`,
                background: getProgress().percent === 100 ? '#22c55e' : 'var(--primary-color)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem', 'margin-top': '1rem' }}>
            <span style={statusBadgeStyle(props.client.status)}>
              {CLIENT_STATUS_LABELS[props.client.status]}
            </span>
            <select
              value={props.client.status}
              onChange={(e) => updateStatus(e.currentTarget.value as TaxClientProfile['status'])}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': '4px',
                'font-size': '0.75rem',
              }}
            >
              <For each={Object.entries(CLIENT_STATUS_LABELS)}>
                {([value, label]) => (
                  <option value={value}>{label}</option>
                )}
              </For>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', 'border-bottom': '1px solid var(--border-color)' }}>
          <button style={tabStyle(activeTab() === 'overview')} onClick={() => setActiveTab('overview')}>
            {t('taxPortal.overview')}
          </button>
          <button style={tabStyle(activeTab() === 'documents')} onClick={() => setActiveTab('documents')}>
            {t('taxPortal.documents')} ({documents().length})
          </button>
          <button style={tabStyle(activeTab() === 'checklist')} onClick={() => setActiveTab('checklist')}>
            {t('taxPortal.checklist')}
          </button>
          <button style={tabStyle(activeTab() === 'edit')} onClick={() => setActiveTab('edit')}>
            {t('common.edit')}
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* Overview Tab */}
          <Show when={activeTab() === 'overview'}>
            {/* Quick Actions */}
            <Card>
              <div style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem' }}>{t('common.quickActions')}</h4>
                <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                  <Button variant="primary" size="sm" onClick={props.onCopyLink}>
                    {t('taxPortal.copyLink')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendPortalLink('email')}
                    disabled={linkSent()}
                  >
                    {linkSent() ? t('taxPortal.linkSent') : t('taxPortal.sendViaEmail')}
                  </Button>
                  <Show when={props.client.phone}>
                    <Button variant="outline" size="sm" onClick={() => sendPortalLink('sms')}>
                      {t('taxPortal.sendViaSms')}
                    </Button>
                  </Show>
                </div>
              </div>
            </Card>

            {/* Client Info */}
            <Card>
              <div style={{ padding: '1rem', 'margin-top': '1rem' }}>
                <h4 style={{ margin: '0 0 1rem' }}>{t('taxPortal.personalInfo')}</h4>

                <div style={infoRowStyle}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('taxPortal.taxYear')}</span>
                  <span style={{ 'font-weight': '500' }}>{props.client.taxYear}</span>
                </div>
                <div style={infoRowStyle}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('taxPortal.filingStatus')}</span>
                  <span style={{ 'font-weight': '500' }}>{FILING_STATUS_LABELS[props.client.filingStatus]}</span>
                </div>
                <Show when={props.client.email}>
                  <div style={infoRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('taxPortal.email')}</span>
                    <span style={{ 'font-weight': '500' }}>{props.client.email}</span>
                  </div>
                </Show>
                <Show when={props.client?.phone}>
                  <div style={infoRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('taxPortal.phone')}</span>
                    <span style={{ 'font-weight': '500' }}>{props.client.phone}</span>
                  </div>
                </Show>
                <Show when={props.client.address}>
                  <div style={infoRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('taxPortal.address')}</span>
                    <span style={{ 'font-weight': '500' }}>
                      {props.client.address}, {props.client.city}, {props.client.state} {props.client.zipCode}
                    </span>
                  </div>
                </Show>
              </div>
            </Card>

            {/* Income Sources */}
            <Show when={props.client?.incomeSources?.length > 0}>
              <Card>
                <div style={{ padding: '1rem', 'margin-top': '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem' }}>{t('taxPortal.incomeSources')}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                    <For each={props.client.incomeSources}>
                      {(source) => (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: 'var(--gray-100)',
                          'border-radius': '999px',
                          'font-size': '0.875rem',
                        }}>
                          {INCOME_SOURCE_LABELS[source]}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </Card>
            </Show>

            {/* Deductions */}
            <Show when={props.client?.deductions?.length > 0}>
              <Card>
                <div style={{ padding: '1rem', 'margin-top': '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem' }}>{t('taxPortal.deductions')}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                    <For each={props.client?.deductions}>
                      {(deduction) => (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: '#dcfce7',
                          color: '#16a34a',
                          'border-radius': '999px',
                          'font-size': '0.875rem',
                        }}>
                          {DEDUCTION_TYPE_LABELS[deduction]}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </Card>
            </Show>

            {/* Notes */}
            <Show when={props.client?.notes}>
              <Card>
                <div style={{ padding: '1rem', 'margin-top': '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem' }}>{t('taxPortal.notes')}</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{props.client.notes}</p>
                </div>
              </Card>
            </Show>
          </Show>

          {/* Documents Tab */}
          <Show when={activeTab() === 'documents'}>
            {/* Upload Success Message */}
            <Show when={uploadSuccess()}>
              <div style={{
                padding: '0.75rem 1rem',
                background: '#dcfce7',
                border: '1px solid #22c55e',
                'border-radius': '8px',
                'margin-bottom': '1rem',
                color: '#16a34a',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
              }}>
                {uploadSuccess()}
              </div>
            </Show>

            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver() ? '#3b82f6' : 'var(--border-color)'}`,
                'border-radius': '8px',
                padding: '1.5rem',
                'text-align': 'center',
                background: dragOver() ? '#e0f2fe' : 'var(--gray-50)',
                cursor: 'pointer',
                'margin-bottom': '1rem',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('preparer-file-input')?.click()}
            >
              <Show when={!uploading()}>
                <div style={{ 'font-size': '1.5rem', 'margin-bottom': '0.25rem' }}>
                  {dragOver() ? t('taxPortal.dragDropHere') : t('taxPortal.uploadDocument')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.acceptedFormats')}
                </div>
              </Show>
              <Show when={uploading()}>
                <div style={{ 'font-size': '1.5rem', 'margin-bottom': '0.25rem' }}>
                  {t('taxPortal.uploading')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('common.loading')}
                </div>
              </Show>
            </div>
            <input
              id="preparer-file-input"
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) handleFileUpload(file);
                e.currentTarget.value = '';
              }}
            />

            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
              <h4 style={{ margin: 0 }}>{t('taxPortal.documentsUploaded')} ({documents().length})</h4>
              <Show when={documents().filter(d => !d.aiAnalyzed).length > 0}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkAnalyze}
                  disabled={analyzing() === 'bulk'}
                >
                  {analyzing() === 'bulk' ? t('taxPortal.analyzing') : t('taxPortal.analyzeAll')}
                </Button>
              </Show>
            </div>

            <Show when={documents().length === 0}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)', background: 'var(--gray-50)', 'border-radius': '8px' }}>
                <p style={{ margin: '0 0 0.5rem' }}>{t('taxPortal.noDocuments')}</p>
                <p style={{ margin: 0, 'font-size': '0.875rem' }}>
                  {t('taxPortal.uploadDocuments')} or {t('taxPortal.sendPortalLink').toLowerCase()}
                </p>
              </div>
            </Show>

            <For each={documents()}>
              {(doc) => (
                <div style={documentItemStyle}>
                  <div style={{ 'font-size': '2rem' }}>
                    {doc.mimeType?.includes('pdf') ? 'PDF' : 'IMG'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 'font-weight': '600' }}>{doc.originalFileName}</div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {doc.detectedType || t('taxPortal.pendingAnalysis')} |
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                    <Show when={doc.confidence}>
                      <div style={{ 'font-size': '0.75rem', color: '#16a34a' }}>
                        {Math.round((doc.confidence || 0) * 100)}% {t('taxPortal.confidence').toLowerCase()}
                      </div>
                    </Show>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Show when={!doc.aiAnalyzed}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => analyzeDocument(doc)}
                        disabled={analyzing() === doc.id}
                      >
                        {analyzing() === doc.id ? '...' : t('taxPortal.analyze')}
                      </Button>
                    </Show>
                    <Show when={doc.aiAnalyzed}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingDocument(doc)}
                      >
                        {t('taxPortal.review')}
                      </Button>
                    </Show>
                    <Show when={doc.aiAnalyzed && doc.status !== 'approved'}>
                      <Button variant="primary" size="sm" onClick={() => approveDocument(doc.id)}>
                        {t('taxPortal.approve')}
                      </Button>
                    </Show>
                    <Show when={doc.status === 'approved'}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#dcfce7',
                        color: '#16a34a',
                        'border-radius': '4px',
                        'font-size': '0.75rem',
                      }}>
                        {t('taxPortal.approved')}
                      </span>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </Show>

          {/* Checklist Tab */}
          <Show when={activeTab() === 'checklist'}>
            <h4 style={{ margin: '0 0 1rem' }}>
              {t('taxPortal.documentChecklist')} ({getProgress().completed}/{getProgress().total} {t('common.required').toLowerCase()})
            </h4>

            <Show when={!checklist()}>
              <p style={{ color: 'var(--text-muted)' }}>{t('taxPortal.noChecklistItems')}</p>
            </Show>

            <For each={checklist()?.items || []}>
              {(item) => (
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  background: item.status === 'missing' ? 'var(--gray-50)' : '#dcfce7',
                  'border-radius': '8px',
                  'margin-bottom': '0.5rem',
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    'border-radius': '50%',
                    background: item.status === 'missing' ? 'var(--gray-300)' : '#22c55e',
                    color: 'white',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'font-size': '0.75rem',
                  }}>
                    {item.status === 'missing' ? '' : 'OK'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      'font-weight': '500',
                      'text-decoration': item.status !== 'missing' ? 'line-through' : 'none',
                      opacity: item.status !== 'missing' ? 0.7 : 1,
                    }}>
                      {item.name}
                      <Show when={item.required}>
                        <span style={{ color: '#ef4444' }}> *</span>
                      </Show>
                    </div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      {item.description}
                    </div>
                  </div>
                  <Show when={item.uploadedDocumentIds.length > 0}>
                    <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      {item.uploadedDocumentIds.length} {item.uploadedDocumentIds.length === 1 ? t('taxPortal.document').toLowerCase() : t('taxPortal.documents').toLowerCase()}
                    </span>
                  </Show>
                </div>
              )}
            </For>
          </Show>

          {/* Edit Tab */}
          <Show when={activeTab() === 'edit'}>
            <ClientEditForm
              client={props.client}
              onSave={async (updates) => {
                const updated = await taxPortalService.updateClient(props.client.id, updates);
                if (updated && props.onClientUpdated) {
                  props.onClientUpdated(updated);
                }
                // Regenerate checklist based on updated profile
                taxPortalStore.upsertClient(updated!);
                const newChecklist = taxPortalStore.getClientChecklist(props.client.id);
                setChecklist(newChecklist);
                setActiveTab('overview');
              }}
              onCancel={() => setActiveTab('overview')}
            />

            {/* Delete Client Section */}
            <div style={{
              'margin-top': '2rem',
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              'border-radius': '8px',
            }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#991b1b' }}>{t('taxPortal.dangerZone')}</h4>
              <p style={{ margin: '0 0 1rem', 'font-size': '0.875rem', color: '#991b1b' }}>
                {t('taxPortal.deleteClientWarning')}
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm(t('taxPortal.confirmDeleteClient'))) {
                    await taxPortalService.deleteClient(props.client.id);
                    props.onClose();
                  }
                }}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  'font-weight': '500',
                }}
              >
                {t('taxPortal.deleteClient')}
              </Button>
            </div>
          </Show>
        </div>
      </div>

      {/* Document Data Viewer Modal */}
      <Show when={viewingDocument()}>
        <DocumentDataViewer
          document={viewingDocument()!}
          onClose={() => setViewingDocument(null)}
          onApprove={async (doc) => {
            await approveDocument(doc.id);
            setViewingDocument(null);
          }}
          onReject={async (doc, reason) => {
            await taxPortalService.updateDocument(doc.id, {
              status: 'rejected',
              reviewNotes: reason,
              reviewedAt: Date.now(),
            });
            await loadClientData();
            setViewingDocument(null);
          }}
          onEditField={async (doc, field, value) => {
            const updatedExtractedData = { ...doc.extractedData, [field]: value };
            await taxPortalService.updateDocument(doc.id, {
              extractedData: updatedExtractedData,
            });
            await loadClientData();
            // Update the viewing document with the new data
            const updatedDoc = documents().find(d => d.id === doc.id);
            if (updatedDoc) setViewingDocument(updatedDoc);
          }}
        />
      </Show>
    </>
  );
};

export default ClientDetailPanel;
