/**
 * Documents Page
 * Document upload and AI processing
 */

import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button, Modal } from '../../ui';
import { accountingStore } from '../stores/accountingStore';
import type { SourceDocument } from '../types';

const DocumentsPage: Component = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = createSignal(true);
  const [dragActive, setDragActive] = createSignal(false);
  const [uploadingFiles, setUploadingFiles] = createSignal<Array<{
    id: string;
    name: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: any;
    error?: string;
  }>>([]);
  const [selectedDocument, setSelectedDocument] = createSignal<SourceDocument | null>(null);
  const [filterStatus, setFilterStatus] = createSignal<string>('all');

  onMount(async () => {
    try {
      await accountingStore.loadDocuments();
    } finally {
      setIsLoading(false);
    }
  });

  const filteredDocuments = createMemo(() => {
    let docs = accountingStore.documents;

    if (filterStatus() !== 'all') {
      docs = docs.filter(d => d.processingStatus === filterStatus());
    }

    return docs.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  const statusLabels: Record<string, string> = {
    pending: t('accounting.pending', 'Pendiente'),
    processing: t('accounting.processing', 'Procesando'),
    completed: t('accounting.completed', 'Completado'),
    failed: t('accounting.failed', 'Fallido')
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#e5e7eb', color: '#6b7280' },
    processing: { bg: '#dbeafe', color: '#2563eb' },
    completed: { bg: '#d1fae5', color: '#059669' },
    failed: { bg: '#fee2e2', color: '#dc2626' }
  };

  const handleFiles = async (fileList: FileList) => {
    for (const file of Array.from(fileList)) {
      const uploadId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      setUploadingFiles(prev => [...prev, {
        id: uploadId,
        name: file.name,
        status: 'uploading',
        progress: 0
      }]);

      try {
        // Simulate upload progress
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadId ? { ...f, progress: 50 } : f
        ));

        const result = await accountingStore.uploadDocument(file);

        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadId ? { ...f, status: 'processing', progress: 100, result } : f
        ));

        // Poll for processing status
        pollStatus(uploadId, result.id);

      } catch (error: any) {
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadId ? { ...f, status: 'failed', error: error.message } : f
        ));
      }
    }
  };

  const pollStatus = async (uploadId: string, docId: string) => {
    const checkStatus = async () => {
      try {
        const doc = accountingStore.getDocumentById(docId);

        if (doc?.processingStatus === 'completed') {
          setUploadingFiles(prev => prev.map(f =>
            f.id === uploadId ? { ...f, status: 'completed', result: doc } : f
          ));
          await accountingStore.loadDocuments();
        } else if (doc?.processingStatus === 'failed') {
          setUploadingFiles(prev => prev.map(f =>
            f.id === uploadId ? { ...f, status: 'failed', error: 'Procesamiento falló' } : f
          ));
        } else {
          setTimeout(checkStatus, 2000);
        }
      } catch {
        setTimeout(checkStatus, 2000);
      }
    };

    setTimeout(checkStatus, 2000);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <h1 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '0.25rem' }}>
          {t('accounting.documents', 'Documentos')}
        </h1>
        <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
          {t('accounting.uploadProcessAI', 'Sube documentos para procesarlos con AI')}
        </p>
      </div>

      {/* Upload Area */}
      <div
        style={{
          border: `2px dashed ${dragActive() ? 'var(--primary-color)' : 'var(--border-color)'}`,
          'border-radius': 'var(--border-radius-md)',
          padding: '2rem',
          'text-align': 'center',
          'margin-bottom': '1.5rem',
          background: dragActive() ? 'var(--primary-color)10' : 'var(--surface-color)',
          transition: 'all 0.2s'
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📄</div>
        <p style={{ color: 'var(--text-primary)', 'margin-bottom': '0.5rem' }}>
          {t('accounting.dragDropFiles', 'Arrastra documentos aquí o')}
        </p>
        <label style={{ display: 'inline-block' }}>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Button as="span" variant="primary">
            {t('accounting.selectFiles', 'Seleccionar archivos')}
          </Button>
        </label>
        <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.75rem' }}>
          {t('accounting.supportedFormats', 'PDF, PNG, JPG - Facturas, recibos, estados de cuenta')}
        </p>
      </div>

      {/* Processing Queue */}
      <Show when={uploadingFiles().length > 0}>
        <div style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-md)',
          padding: '1rem',
          'margin-bottom': '1.5rem'
        }}>
          <h3 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>
            {t('accounting.processingWithAI', 'Procesando con AI')}
          </h3>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
            <For each={uploadingFiles()}>
              {(file) => (
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  padding: '0.75rem',
                  background: 'var(--surface-secondary)',
                  'border-radius': 'var(--border-radius-sm)'
                }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                    <span style={{ 'font-size': '1.5rem' }}>
                      {file.status === 'uploading' && '⏳'}
                      {file.status === 'processing' && '🤖'}
                      {file.status === 'completed' && '✅'}
                      {file.status === 'failed' && '❌'}
                    </span>
                    <div>
                      <div style={{ 'font-weight': '500' }}>{file.name}</div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {file.status === 'uploading' && t('accounting.uploading', 'Subiendo...')}
                        {file.status === 'processing' && t('accounting.processingAI', 'Procesando con AI...')}
                        {file.status === 'completed' && t('accounting.completed', 'Completado')}
                        {file.status === 'failed' && file.error}
                      </div>
                    </div>
                  </div>
                  <Show when={file.status === 'completed' && file.result?.aiExtractedData}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      'border-radius': '9999px',
                      'font-size': '0.875rem',
                      'font-weight': '500',
                      background: '#d1fae5',
                      color: '#059669'
                    }}>
                      {formatCurrency(file.result.aiExtractedData.totalAmount || 0)}
                    </span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        'margin-bottom': '1rem'
      }}>
        <select
          value={filterStatus()}
          onChange={(e) => setFilterStatus(e.currentTarget.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.875rem',
            background: 'var(--surface-color)'
          }}
        >
          <option value="all">{t('accounting.allStatuses', 'Todos los estados')}</option>
          <option value="pending">{t('accounting.pending', 'Pendiente')}</option>
          <option value="processing">{t('accounting.processing', 'Procesando')}</option>
          <option value="completed">{t('accounting.completed', 'Completado')}</option>
          <option value="failed">{t('accounting.failed', 'Fallido')}</option>
        </select>
      </div>

      {/* Documents List */}
      <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div>{t('common.loading', 'Cargando...')}</div>
        </div>
      </Show>

      <Show when={!isLoading()}>
        <div style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-md)',
          overflow: 'hidden'
        }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('accounting.fileName', 'Archivo')}</th>
                <th style={thStyle}>{t('accounting.type', 'Tipo')}</th>
                <th style={thStyle}>{t('accounting.date', 'Fecha')}</th>
                <th style={thStyle}>{t('accounting.status', 'Estado')}</th>
                <th style={thStyle}>{t('accounting.extractedAmount', 'Monto')}</th>
                <th style={{ ...thStyle, width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredDocuments()} fallback={
                <tr>
                  <td colspan="6" style={{ ...tdStyle, 'text-align': 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {t('accounting.noDocuments', 'No hay documentos')}
                  </td>
                </tr>
              }>
                {(doc) => (
                  <tr>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span>📄</span>
                        <span>{doc.fileName}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{doc.documentType || '-'}</td>
                    <td style={{ ...tdStyle, 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {formatDate(doc.createdAt)}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        'border-radius': '9999px',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        background: statusColors[doc.processingStatus].bg,
                        color: statusColors[doc.processingStatus].color
                      }}>
                        {statusLabels[doc.processingStatus]}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, 'font-weight': '500' }}>
                      {doc.aiExtractedData?.totalAmount
                        ? formatCurrency(doc.aiExtractedData.totalAmount)
                        : '-'
                      }
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => setSelectedDocument(doc)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--primary-color)',
                          cursor: 'pointer',
                          'font-size': '0.875rem'
                        }}
                      >
                        {t('common.view', 'Ver')}
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Document Detail Modal */}
      <Modal
        isOpen={!!selectedDocument()}
        onClose={() => setSelectedDocument(null)}
        title={selectedDocument()?.fileName || ''}
        size="large"
      >
        <Show when={selectedDocument()}>
          {(doc) => (
            <div>
              <div style={{
                display: 'grid',
                'grid-template-columns': '1fr 1fr',
                gap: '1.5rem',
                'margin-bottom': '1.5rem'
              }}>
                <div>
                  <h4 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>
                    {t('accounting.documentInfo', 'Información del Documento')}
                  </h4>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                        {t('accounting.type', 'Tipo')}
                      </span>
                      <div>{doc().documentType || t('accounting.unknown', 'Desconocido')}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                        {t('accounting.uploadDate', 'Fecha de subida')}
                      </span>
                      <div>{formatDate(doc().createdAt)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                        {t('accounting.status', 'Estado')}
                      </span>
                      <div>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          'border-radius': '9999px',
                          'font-size': '0.75rem',
                          'font-weight': '500',
                          background: statusColors[doc().processingStatus].bg,
                          color: statusColors[doc().processingStatus].color
                        }}>
                          {statusLabels[doc().processingStatus]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Show when={doc().aiExtractedData}>
                  <div>
                    <h4 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>
                      {t('accounting.extractedData', 'Datos Extraídos por AI')}
                    </h4>
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                      <Show when={doc().aiExtractedData?.vendor}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                            {t('accounting.vendor', 'Proveedor')}
                          </span>
                          <div>{doc().aiExtractedData!.vendor}</div>
                        </div>
                      </Show>
                      <Show when={doc().aiExtractedData?.date}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                            {t('accounting.documentDate', 'Fecha del documento')}
                          </span>
                          <div>{doc().aiExtractedData!.date}</div>
                        </div>
                      </Show>
                      <div>
                        <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                          {t('accounting.totalAmount', 'Monto Total')}
                        </span>
                        <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                          {formatCurrency(doc().aiExtractedData!.totalAmount)}
                        </div>
                      </div>
                      <Show when={doc().aiExtractedData?.taxAmount}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                            {t('accounting.taxAmount', 'Impuestos')}
                          </span>
                          <div>{formatCurrency(doc().aiExtractedData!.taxAmount!)}</div>
                        </div>
                      </Show>
                    </div>
                  </div>
                </Show>
              </div>

              <Show when={doc().aiExtractedData?.lineItems && doc().aiExtractedData!.lineItems!.length > 0}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <h4 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>
                    {t('accounting.lineItems', 'Líneas del Documento')}
                  </h4>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t('accounting.description', 'Descripción')}</th>
                        <th style={{ ...thStyle, 'text-align': 'center' }}>{t('accounting.quantity', 'Cantidad')}</th>
                        <th style={{ ...thStyle, 'text-align': 'right' }}>{t('accounting.amount', 'Monto')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={doc().aiExtractedData!.lineItems}>
                        {(item) => (
                          <tr>
                            <td style={tdStyle}>{item.description}</td>
                            <td style={{ ...tdStyle, 'text-align': 'center' }}>{item.quantity || 1}</td>
                            <td style={{ ...tdStyle, 'text-align': 'right' }}>{formatCurrency(item.amount)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>

              <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.75rem' }}>
                <Button variant="secondary" onClick={() => setSelectedDocument(null)}>
                  {t('common.close', 'Cerrar')}
                </Button>
                <Show when={doc().processingStatus === 'completed'}>
                  <Button variant="primary">
                    {t('accounting.createEntry', 'Crear Asiento')}
                  </Button>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
