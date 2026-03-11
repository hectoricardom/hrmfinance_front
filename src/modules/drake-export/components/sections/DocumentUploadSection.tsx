/**
 * DocumentUploadSection
 * SolidJS component for document upload in Drake Tax Export
 */

import { Component, createSignal, createEffect, For, Show, on } from 'solid-js';
import { drakeExportStore, drakeExportActions } from '../../stores/drakeExportStore';
import { DrakeTaxDocument, DrakeTaxDocumentType, DRAKE_FORM_LABELS } from '../../types/drakeTypes';
import {
  uploadTaxDocument,
  processTaxDocument,
  getClientTaxDocuments,
  apiResponseToDrakeTaxDocument,
  batchProcessTaxDocuments,
  deleteTaxDocument
} from '../../services/taxDocumentApi';
import { devLog } from '../../../../services/utils';

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

// Flag to use real API or mock (set to true when backend is ready)
const USE_REAL_API = true;

const DocumentUploadSection: Component = () => {
  const [isExpanded, setIsExpanded] = createSignal(true);
  const [isDragOver, setIsDragOver] = createSignal(false);
  const [uploadError, setUploadError] = createSignal<string | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [isReprocessing, setIsReprocessing] = createSignal(false);
  const [duplicateWarning, setDuplicateWarning] = createSignal<string | null>(null);
  let fileInputRef: HTMLInputElement | undefined;

  // Load existing documents when client or tax year changes
  createEffect(on(
    () => [drakeExportStore.selectedClient?.clientNotaryId, drakeExportStore.taxYear],
    async ([clientNotaryId, taxYear]) => {
      if (!clientNotaryId) {
        return;
      }

      setIsLoadingExisting(true);
      setLoadError(null);

      try {
        const existingDocs = await getClientTaxDocuments(clientNotaryId as string, taxYear as number);
        drakeExportActions.setDocuments(existingDocs);
      } catch (error) {
        devLog('Error loading existing documents:', error);
        setLoadError('Failed to load existing documents');
      } finally {
        setIsLoadingExisting(false);
      }
    },
    { defer: true }
  ));

  // Generate unique ID (for fallback mock)
  const generateId = (): string => {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Check for duplicate file
  const isDuplicateFile = (fileName: string, fileSize: number): DrakeTaxDocument | null => {
    const existingDoc = drakeExportStore.documents.find(doc =>
      doc.originalFileName === fileName ||
      (doc.originalFileName?.toLowerCase() === fileName.toLowerCase() && doc.fileSize === fileSize)
    );
    return existingDoc || null;
  };

  // Detect document type from filename (fallback when API doesn't detect)
  const detectDocumentType = (fileName: string): DrakeTaxDocumentType => {
    const lower = fileName.toLowerCase();
    if (lower.includes('w2') || lower.includes('w-2')) return 'w2';
    if (lower.includes('1099-nec') || lower.includes('1099nec')) return '1099_nec';
    if (lower.includes('1099-misc') || lower.includes('1099misc')) return '1099_misc';
    if (lower.includes('1099-int') || lower.includes('1099int')) return '1099_int';
    if (lower.includes('1099-div') || lower.includes('1099div')) return '1099_div';
    if (lower.includes('1098-t') || lower.includes('1098t')) return '1098_t';
    if (lower.includes('1098')) return '1098';
    if (lower.includes('k-1') || lower.includes('k1') || lower.includes('schedule k')) return 'schedule_k1';
    if (lower.includes('receipt') || lower.includes('expense')) return 'receipt';
    return 'other';
  };

  // Process a single file using real API
  const processFileWithApi = async (file: File) => {
    const clientNotaryId = drakeExportStore.selectedClient?.clientNotaryId;
    if (!clientNotaryId) {
      setUploadError('Please select a client first');
      return;
    }

    // Check for duplicates
    const duplicate = isDuplicateFile(file.name, file.size);
    if (duplicate) {
      setDuplicateWarning(`File "${file.name}" already exists. Skipping upload.`);
      setTimeout(() => setDuplicateWarning(null), 5000);
      return;
    }

    const tempId = generateId();
    const detectedType = detectDocumentType(file.name);

    // Create initial document with 'uploading' status
    const tempDoc: DrakeTaxDocument = {
      id: tempId,
      clientNotaryId,
      documentType: 'other',
      drakeFormType: detectedType,
      fileUrl: URL.createObjectURL(file),
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: Date.now(),
      uploadStatus: 'uploading',
      processingProgress: 10
    };

    drakeExportActions.addDocument(tempDoc);
    setUploadError(null);

    try {
      // Step 1: Upload the document
      const uploadResult = await uploadTaxDocument(
        file,
        clientNotaryId,
        drakeExportStore.taxYear
      );

      if (!uploadResult.success || !uploadResult.documentId) {
        drakeExportActions.updateDocument(tempId, {
          uploadStatus: 'error',
          errorMessage: uploadResult.error || 'Upload failed'
        });
        return;
      }

      // Update with real document ID and URL
      const realDocId = uploadResult.documentId;
      drakeExportActions.updateDocument(tempId, {
        id: realDocId,
        fileUrl: uploadResult.document?.fileUrl || tempDoc.fileUrl,
        uploadStatus: 'analyzing',
        processingProgress: 40
      });

      // Step 2: Process the document with AI
      const processResult = await processTaxDocument(realDocId);

      if (!processResult.success || !processResult.document) {
        drakeExportActions.updateDocument(tempId, {
          uploadStatus: 'error',
          errorMessage: processResult.error || 'Processing failed'
        });
        return;
      }

      // Step 3: Update with processed data
      const processedDoc = apiResponseToDrakeTaxDocument(processResult.document);
      drakeExportActions.updateDocument(tempId, {
        ...processedDoc,
        processingProgress: 100
      });

    } catch (error) {
      devLog('Error processing file:', error);
      drakeExportActions.updateDocument(tempId, {
        uploadStatus: 'error',
        errorMessage: (error as Error).message || 'An unexpected error occurred'
      });
    }
  };

  // Process a single file with mock data (fallback)
  const processFileWithMock = async (file: File) => {
    // Check for duplicates
    const duplicate = isDuplicateFile(file.name, file.size);
    if (duplicate) {
      setDuplicateWarning(`File "${file.name}" already exists. Skipping upload.`);
      setTimeout(() => setDuplicateWarning(null), 5000);
      return;
    }

    const id = generateId();
    const detectedType = detectDocumentType(file.name);

    // Create initial document with 'uploading' status
    const newDoc: DrakeTaxDocument = {
      id,
      clientNotaryId: drakeExportStore.selectedClient?.clientNotaryId || '',
      documentType: 'other',
      drakeFormType: detectedType,
      fileUrl: URL.createObjectURL(file),
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: Date.now(),
      uploadStatus: 'uploading',
      processingProgress: 0
    };

    drakeExportActions.addDocument(newDoc);

    // Simulate upload progress (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    drakeExportActions.updateDocumentStatus(id, 'analyzing', 50);

    // Simulate analysis (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update with mock extracted data
    const extractedAmounts = generateMockExtractedData(detectedType);
    const payerInfo = generateMockPayerInfo(detectedType);

    drakeExportActions.updateDocument(id, {
      uploadStatus: 'analyzed',
      processingProgress: 100,
      extractedAmounts,
      payerInfo,
      aiConfidence: Math.floor(Math.random() * 15) + 85,
      aiAnalyzedAt: Date.now(),
      taxYear: drakeExportStore.taxYear
    });
  };

  // Generate mock extracted amounts based on document type
  const generateMockExtractedData = (docType: DrakeTaxDocumentType) => {
    const baseAmount = Math.floor(Math.random() * 50000) + 10000;
    const taxWithheld = Math.floor(baseAmount * 0.22);

    switch (docType) {
      case 'w2':
        return {
          wages: baseAmount,
          federalTaxWithheld: taxWithheld,
          socialSecurityWages: baseAmount,
          socialSecurityTax: Math.floor(baseAmount * 0.062),
          medicareWages: baseAmount,
          medicareTax: Math.floor(baseAmount * 0.0145),
          stateTaxWithheld: Math.floor(baseAmount * 0.05)
        };
      case '1099_nec':
        return {
          nonEmployeeCompensation: baseAmount,
          federalTaxWithheld1099: taxWithheld
        };
      case '1099_int':
        return {
          interestIncome: Math.floor(baseAmount * 0.1)
        };
      case '1099_div':
        return {
          ordinaryDividends: Math.floor(baseAmount * 0.15),
          qualifiedDividends: Math.floor(baseAmount * 0.1)
        };
      case '1098':
        return {
          mortgageInterest: Math.floor(baseAmount * 0.3),
          propertyTaxes: Math.floor(baseAmount * 0.1)
        };
      default:
        return {
          totalAmount: baseAmount
        };
    }
  };

  // Generate mock payer info
  const generateMockPayerInfo = (docType: DrakeTaxDocumentType) => {
    const employers = [
      { name: 'Acme Corporation', ein: '12-3456789' },
      { name: 'Tech Solutions Inc', ein: '98-7654321' },
      { name: 'Global Services LLC', ein: '45-6789012' }
    ];
    const banks = [
      { name: 'First National Bank', ein: '11-1111111' },
      { name: 'Community Credit Union', ein: '22-2222222' }
    ];

    const isFinancial = ['1099_int', '1099_div', '1098'].includes(docType);
    const entity = isFinancial
      ? banks[Math.floor(Math.random() * banks.length)]
      : employers[Math.floor(Math.random() * employers.length)];

    return {
      name: entity.name,
      ein: entity.ein,
      address: '123 Business St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102'
    };
  };

  // Process file - route to real API or mock
  const processFile = async (file: File) => {
    if (USE_REAL_API) {
      await processFileWithApi(file);
    } else {
      await processFileWithMock(file);
    }
  };

  // Reprocess a single document
  const handleReprocessDocument = async (docId: string) => {
    drakeExportActions.updateDocument(docId, {
      uploadStatus: 'analyzing',
      processingProgress: 20
    });

    try {
      const processResult = await processTaxDocument(docId);
      if (processResult.success && processResult.document) {
        const processedDoc = apiResponseToDrakeTaxDocument(processResult.document);
        drakeExportActions.updateDocument(docId, {
          ...processedDoc,
          processingProgress: 100
        });
      } else {
        drakeExportActions.updateDocument(docId, {
          uploadStatus: 'error',
          errorMessage: processResult.error || 'Reprocessing failed'
        });
      }
    } catch (error) {
      drakeExportActions.updateDocument(docId, {
        uploadStatus: 'error',
        errorMessage: (error as Error).message
      });
    }
  };

  // Reprocess all documents
  const handleReprocessAll = async () => {
    const docIds = drakeExportStore.documents.map(d => d.id);
    if (docIds.length === 0) return;

    setIsReprocessing(true);
    try {
      await batchProcessTaxDocuments(docIds);
      // Refresh documents from server
      const clientId = drakeExportStore.selectedClient?.clientNotaryId;
      if (clientId) {
        const docs = await getClientTaxDocuments(clientId, drakeExportStore.taxYear);
        drakeExportActions.setDocuments(docs);
      }
    } catch (error) {
      setLoadError('Failed to reprocess documents');
    } finally {
      setIsReprocessing(false);
    }
  };

  // Handle view/download document
  const handleViewDocument = (doc: DrakeTaxDocument) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  const handleDownloadDocument = (doc: DrakeTaxDocument) => {
    if (doc.fileUrl) {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.originalFileName || 'document';
      link.click();
    }
  };

  // Handle file drop
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (files) {
      Array.from(files)
        .filter(file => ACCEPTED_FILE_TYPES.includes(file.type))
        .forEach(file => processFile(file));
    }
  };

  // Handle file input change
  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files) {
      Array.from(files).forEach(file => processFile(file));
    }
    // Reset input
    input.value = '';
  };

  // Handle document removal (permanently deletes from server)
  const handleRemoveDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to permanently delete this document?')) {
      return;
    }

    try {
      // Remove from local store first for immediate UI feedback
      drakeExportActions.removeDocument(docId);

      // Then delete from server
      const result = await deleteTaxDocument(docId);
      if (!result.success) {
        devLog('Failed to delete document from server:', result.error);
        // Optionally refresh to restore the document if server delete failed
        // handleRefresh();
      }
    } catch (error) {
      devLog('Error deleting document:', error);
    }
  };

  // Refresh documents from server
  const handleRefresh = async () => {
    const clientId = drakeExportStore.selectedClient?.clientNotaryId;
    if (clientId) {
      setIsLoadingExisting(true);
      setLoadError(null);
      try {
        const docs = await getClientTaxDocuments(clientId, drakeExportStore.taxYear);
        drakeExportActions.setDocuments(docs);
      } catch (error) {
        setLoadError('Failed to refresh documents');
      } finally {
        setIsLoadingExisting(false);
      }
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'uploading': return 'var(--info-color, #3b82f6)';
      case 'analyzing': return 'var(--warning-color, #f59e0b)';
      case 'analyzed': return 'var(--success-color, #22c55e)';
      case 'verified': return 'var(--success-dark, #16a34a)';
      case 'error': return 'var(--danger-color, #ef4444)';
      default: return 'var(--text-muted, #94a3b8)';
    }
  };

  // Get status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'analyzing': return 'Analyzing...';
      case 'analyzed': return 'Ready for Review';
      case 'verified': return 'Verified';
      case 'error': return 'Error';
      default: return 'Pending';
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get document icon
  const getDocIcon = (mimeType?: string): string => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    return '📎';
  };

  // Styles
  const sectionStyle = {
    background: 'var(--card-bg, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e2e8f0)',
    'margin-bottom': '1rem',
    overflow: 'hidden'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 1.5rem',
    background: 'var(--section-header-bg, #f8fafc)',
    'border-bottom': isExpanded() ? '1px solid var(--border-color, #e2e8f0)' : 'none',
    cursor: 'pointer'
  };

  const headerTitleStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'font-weight': '600',
    'font-size': '1.125rem',
    color: 'var(--text-primary, #1e293b)'
  };

  const badgeStyle = {
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    padding: '0.25rem 0.625rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '600'
  };

  const contentStyle = {
    padding: '1.5rem'
  };

  const dropZoneStyle = (isDragging: boolean) => ({
    border: `2px dashed ${isDragging ? 'var(--primary-color, #3b82f6)' : 'var(--border-color, #cbd5e1)'}`,
    'border-radius': 'var(--border-radius, 8px)',
    padding: '2rem',
    'text-align': 'center' as const,
    background: isDragging ? 'var(--primary-light, #eff6ff)' : 'var(--bg-light, #f8fafc)',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  });

  const alertStyle = (type: 'info' | 'error' | 'warning' | 'success') => {
    const colors = {
      info: { bg: '#eff6ff', color: '#3b82f6' },
      error: { bg: '#fef2f2', color: '#ef4444' },
      warning: { bg: '#fffbeb', color: '#f59e0b' },
      success: { bg: '#f0fdf4', color: '#22c55e' }
    };
    return {
      padding: '0.75rem 1rem',
      background: colors[type].bg,
      'border-radius': '6px',
      'margin-bottom': '1rem',
      display: 'flex',
      'align-items': 'center',
      gap: '0.5rem',
      color: colors[type].color,
      'font-size': '0.875rem'
    };
  };

  const buttonStyle = (variant: 'primary' | 'secondary' | 'ghost' = 'secondary') => {
    const styles = {
      primary: {
        background: 'var(--primary-color, #3b82f6)',
        color: 'white',
        border: 'none'
      },
      secondary: {
        background: 'transparent',
        color: 'var(--text-secondary, #64748b)',
        border: '1px solid var(--border-color, #e2e8f0)'
      },
      ghost: {
        background: 'transparent',
        color: 'var(--text-muted, #94a3b8)',
        border: 'none'
      }
    };
    return {
      ...styles[variant],
      padding: '0.375rem 0.75rem',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-size': '0.875rem',
      display: 'inline-flex',
      'align-items': 'center',
      gap: '0.375rem'
    };
  };

  const documentCardStyle = (isFromServer: boolean) => ({
    display: 'flex',
    'align-items': 'flex-start',
    gap: '1rem',
    padding: '1rem',
    background: isFromServer ? 'var(--bg-light, #f8fafc)' : 'var(--card-bg, #ffffff)',
    'border-radius': '8px',
    border: `1px solid ${isFromServer ? 'var(--border-color, #e2e8f0)' : 'var(--primary-light, #bfdbfe)'}`,
    'margin-bottom': '0.75rem'
  });

  const isClientSelected = () => !!drakeExportStore.selectedClient?.clientNotaryId;

  return (
    <div style={sectionStyle}>
      {/* Section Header */}
      <div style={headerStyle} onClick={() => setIsExpanded(!isExpanded())}>
        <div style={headerTitleStyle}>
          <span>2.</span>
          <span>Document Upload</span>
          <Show when={drakeExportStore.documents.length > 0}>
            <span style={badgeStyle}>
              {drakeExportStore.documents.length} document{drakeExportStore.documents.length !== 1 ? 's' : ''}
            </span>
          </Show>
        </div>
        <span style={{
          transform: isExpanded() ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </div>

      {/* Section Content */}
      <Show when={isExpanded()}>
        <div style={contentStyle}>
          {/* No client selected warning */}
          <Show when={!isClientSelected()}>
            <div style={alertStyle('warning')}>
              <span>⚠️</span>
              <span>Please select a client first to view or upload documents.</span>
            </div>
          </Show>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Loading existing documents indicator */}
          <Show when={isLoadingExisting()}>
            <div style={alertStyle('info')}>
              <span>⏳</span>
              <span>Loading existing documents for this client...</span>
            </div>
          </Show>

          {/* Load error message */}
          <Show when={loadError()}>
            <div style={alertStyle('error')}>
              <span>❌</span>
              <span>{loadError()}</span>
            </div>
          </Show>

          {/* Upload error message */}
          <Show when={uploadError()}>
            <div style={alertStyle('warning')}>
              <span>⚠️</span>
              <span>{uploadError()}</span>
            </div>
          </Show>

          {/* Duplicate warning */}
          <Show when={duplicateWarning()}>
            <div style={alertStyle('warning')}>
              <span>📋</span>
              <span>{duplicateWarning()}</span>
            </div>
          </Show>

          {/* Drop Zone - only show when client is selected */}
          <Show when={isClientSelected()}>
            <div
              style={dropZoneStyle(isDragOver())}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef?.click()}
            >
              <div style={{ 'font-size': '3rem', 'margin-bottom': '0.5rem' }}>
                {isDragOver() ? '📥' : '📤'}
              </div>
              <div style={{ color: 'var(--text-secondary, #64748b)', 'margin-bottom': '0.25rem' }}>
                <strong>Drag and drop</strong> your tax documents here
              </div>
              <div style={{ color: 'var(--text-muted, #94a3b8)', 'font-size': '0.875rem' }}>
                Accepts PDF, JPG, and PNG files (W-2, 1099, 1098, K-1, receipts)
              </div>
              <button type="button" style={{
                ...buttonStyle('primary'),
                'margin-top': '1rem',
                padding: '0.5rem 1.25rem'
              }}>
                Browse Files
              </button>
            </div>
          </Show>

          {/* Document List */}
          <Show when={drakeExportStore.documents.length > 0}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-top': '1.5rem',
              'margin-bottom': '1rem',
              'padding-bottom': '0.75rem',
              'border-bottom': '1px solid var(--border-color, #e2e8f0)'
            }}>
              <span style={{
                'font-weight': '600',
                color: 'var(--text-primary, #1e293b)',
                'font-size': '1rem'
              }}>
                📁 Documents ({drakeExportStore.documents.length})
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  style={buttonStyle('secondary')}
                  onClick={handleRefresh}
                  disabled={isLoadingExisting()}
                >
                  <span>↻</span>
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  style={buttonStyle('secondary')}
                  onClick={handleReprocessAll}
                  disabled={isReprocessing() || drakeExportStore.documents.length === 0}
                >
                  <span>🔄</span>
                  <span>{isReprocessing() ? 'Processing...' : 'Reprocess All'}</span>
                </button>
              </div>
            </div>

            {/* Document cards */}
            <div style={{overflow: 'auto', "max-height": '600px'}}>
              <For each={drakeExportStore.documents}>
                {(doc) => {
                  const isFromServer = !doc.id.startsWith('doc_');
                  return (
                    <div style={documentCardStyle(isFromServer)}>
                      {/* Document Icon */}
                      <div style={{ 'font-size': '2rem', 'flex-shrink': '0' }}>
                        {getDocIcon(doc.mimeType)}
                      </div>

                      {/* Document Info */}
                      <div style={{ flex: '1', 'min-width': '0' }}>
                        <div style={{
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.5rem',
                          'margin-bottom': '0.25rem'
                        }}>
                          <span style={{
                            'font-weight': '500',
                            color: 'var(--text-primary, #1e293b)',
                            'white-space': 'nowrap',
                            overflow: 'hidden',
                            'text-overflow': 'ellipsis'
                          }} title={doc.originalFileName}>
                            {doc.originalFileName}
                          </span>
                          <Show when={isFromServer}>
                            <span style={{
                              background: 'var(--success-light, #dcfce7)',
                              color: 'var(--success-color, #16a34a)',
                              padding: '0.125rem 0.5rem',
                              'border-radius': '4px',
                              'font-size': '0.7rem',
                              'font-weight': '500'
                            }}>
                              SERVER
                            </span>
                          </Show>
                        </div>

                        <div style={{
                          display: 'flex',
                          'flex-wrap': 'wrap',
                          gap: '0.75rem',
                          'font-size': '0.8rem',
                          color: 'var(--text-muted, #94a3b8)',
                          'margin-bottom': '0.5rem'
                        }}>
                          <Show when={doc.fileSize}>
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </Show>
                          <span style={{
                            background: 'var(--bg-light, #f1f5f9)',
                            padding: '0.125rem 0.5rem',
                            'border-radius': '4px'
                          }}>
                            {DRAKE_FORM_LABELS[doc.drakeFormType || 'other']}
                          </span>
                          <Show when={doc.uploadedAt}>
                            <span>{formatDate(doc.uploadedAt)}</span>
                          </Show>
                          <span style={{ color: getStatusColor(doc.uploadStatus) }}>
                            ● {getStatusLabel(doc.uploadStatus)}
                          </span>
                        </div>

                        {/* Progress bar for uploading/analyzing */}
                        <Show when={doc.uploadStatus === 'uploading' || doc.uploadStatus === 'analyzing'}>
                          <div style={{
                            height: '4px',
                            background: 'var(--border-color, #e2e8f0)',
                            'border-radius': '2px',
                            overflow: 'hidden',
                            'margin-bottom': '0.5rem'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${doc.processingProgress || 0}%`,
                              background: getStatusColor(doc.uploadStatus),
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </Show>

                        {/* Error message */}
                        <Show when={doc.uploadStatus === 'error' && doc.errorMessage}>
                          <div style={{
                            color: 'var(--danger-color, #ef4444)',
                            'font-size': '0.8rem',
                            'margin-bottom': '0.5rem'
                          }}>
                            ❌ {doc.errorMessage}
                          </div>
                        </Show>

                        {/* AI Confidence */}
                        <Show when={doc.aiConfidence && doc.uploadStatus !== 'error'}>
                          <div style={{
                            'font-size': '0.75rem',
                            color: 'var(--success-color, #22c55e)'
                          }}>
                            AI Confidence: {doc.aiConfidence}%
                          </div>
                        </Show>

                        {/* Payer Info */}
                        <Show when={doc.payerInfo?.name}>
                          <div style={{
                            'font-size': '0.75rem',
                            color: 'var(--text-secondary, #64748b)',
                            'margin-top': '0.25rem'
                          }}>
                            Payer: {doc.payerInfo?.name} {doc.payerInfo?.ein ? `(EIN: ${doc.payerInfo.ein})` : ''}
                          </div>
                        </Show>

                        {/* Extracted Amounts Summary */}
                        <Show when={doc.extractedAmounts && Object.keys(doc.extractedAmounts).length > 0}>
                          <div style={{
                            'margin-top': '0.5rem',
                            padding: '0.5rem',
                            background: 'var(--bg-light, #f1f5f9)',
                            'border-radius': '4px',
                            'font-size': '0.75rem'
                          }}>
                            <div style={{
                              'font-weight': '500',
                              'margin-bottom': '0.25rem',
                              color: 'var(--text-primary, #1e293b)'
                            }}>
                              Extracted Data:
                            </div>
                            <div style={{
                              display: 'grid',
                              'grid-template-columns': 'repeat(2, 1fr)',
                              gap: '0.25rem 1rem',
                              color: 'var(--text-secondary, #64748b)'
                            }}>
                              {/* W-2 Fields */}
                              <Show when={doc.extractedAmounts?.wages}>
                                <span>Wages: ${doc.extractedAmounts?.wages?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.federalTaxWithheld}>
                                <span>Fed Tax: ${doc.extractedAmounts?.federalTaxWithheld?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.socialSecurityWages}>
                                <span>SS Wages: ${doc.extractedAmounts?.socialSecurityWages?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.socialSecurityTax}>
                                <span>SS Tax: ${doc.extractedAmounts?.socialSecurityTax?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.medicareTax}>
                                <span>Medicare: ${doc.extractedAmounts?.medicareTax?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.stateTaxWithheld}>
                                <span>State Tax: ${doc.extractedAmounts?.stateTaxWithheld?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.localTaxWithheld}>
                                <span>Local Tax: ${doc.extractedAmounts?.localTaxWithheld?.toLocaleString()}</span>
                              </Show>

                              {/* 1099-NEC/MISC Fields */}
                              <Show when={doc.extractedAmounts?.nonEmployeeCompensation}>
                                <span>NEC: ${doc.extractedAmounts?.nonEmployeeCompensation?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.rents}>
                                <span>Rents: ${doc.extractedAmounts?.rents?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.royalties}>
                                <span>Royalties: ${doc.extractedAmounts?.royalties?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.otherIncome}>
                                <span>Other Inc: ${doc.extractedAmounts?.otherIncome?.toLocaleString()}</span>
                              </Show>

                              {/* 1099-INT Fields */}
                              <Show when={doc.extractedAmounts?.interestIncome}>
                                <span>Interest: ${doc.extractedAmounts?.interestIncome?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.taxExemptInterest}>
                                <span>Tax-Exempt Int: ${doc.extractedAmounts?.taxExemptInterest?.toLocaleString()}</span>
                              </Show>

                              {/* 1099-DIV Fields */}
                              <Show when={doc.extractedAmounts?.ordinaryDividends}>
                                <span>Dividends: ${doc.extractedAmounts?.ordinaryDividends?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.qualifiedDividends}>
                                <span>Qual Div: ${doc.extractedAmounts?.qualifiedDividends?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.capitalGainDistributions}>
                                <span>Cap Gains: ${doc.extractedAmounts?.capitalGainDistributions?.toLocaleString()}</span>
                              </Show>

                              {/* 1098 Fields */}
                              <Show when={doc.extractedAmounts?.mortgageInterest}>
                                <span>Mortgage Int: ${doc.extractedAmounts?.mortgageInterest?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.propertyTaxes}>
                                <span>Property Tax: ${doc.extractedAmounts?.propertyTaxes?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.pointsPaid}>
                                <span>Points: ${doc.extractedAmounts?.pointsPaid?.toLocaleString()}</span>
                              </Show>

                              {/* 1098-T Fields */}
                              <Show when={doc.extractedAmounts?.paymentsReceived}>
                                <span>Tuition Paid: ${doc.extractedAmounts?.paymentsReceived?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.scholarshipsGrants}>
                                <span>Scholarships: ${doc.extractedAmounts?.scholarshipsGrants?.toLocaleString()}</span>
                              </Show>

                              {/* K-1 Fields */}
                              <Show when={doc.extractedAmounts?.ordinaryBusinessIncome}>
                                <span>Business Inc: ${doc.extractedAmounts?.ordinaryBusinessIncome?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.guaranteedPayments}>
                                <span>Guar Pmts: ${doc.extractedAmounts?.guaranteedPayments?.toLocaleString()}</span>
                              </Show>
                              <Show when={doc.extractedAmounts?.selfEmploymentEarnings}>
                                <span>SE Earnings: ${doc.extractedAmounts?.selfEmploymentEarnings?.toLocaleString()}</span>
                              </Show>

                              {/* Common withholding for 1099s */}
                              <Show when={doc.extractedAmounts?.federalTaxWithheld1099}>
                                <span>Fed Withheld: ${doc.extractedAmounts?.federalTaxWithheld1099?.toLocaleString()}</span>
                              </Show>
                            </div>
                          </div>
                        </Show>
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '0.375rem',
                        'flex-shrink': '0'
                      }}>
                        <Show when={doc.fileUrl}>
                          <button
                            type="button"
                            style={buttonStyle('secondary')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDocument(doc);
                            }}
                            title="View document"
                          >
                            👁️ View
                          </button>
                          <button
                            type="button"
                            style={buttonStyle('secondary')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadDocument(doc);
                            }}
                            title="Download document"
                          >
                            ⬇️ Download
                          </button>
                        </Show>
                        <Show when={isFromServer && doc.uploadStatus !== 'analyzing'}>
                          <button
                            type="button"
                            style={buttonStyle('secondary')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReprocessDocument(doc.id);
                            }}
                            title="Reprocess document"
                          >
                            🔄 Reprocess
                          </button>
                        </Show>
                        <button
                          type="button"
                          style={buttonStyle('ghost')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDocument(doc.id);
                          }}
                          title="Remove from list"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>

          {/* Empty state when client selected but no documents */}
          <Show when={isClientSelected() && !isLoadingExisting() && drakeExportStore.documents.length === 0}>
            <div style={{
              'text-align': 'center',
              padding: '2rem',
              color: 'var(--text-muted, #94a3b8)',
              'margin-top': '1rem'
            }}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '0.5rem' }}>📭</div>
              <div>No documents found for this client.</div>
              <div style={{ 'font-size': '0.875rem' }}>Upload tax documents using the drop zone above.</div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default DocumentUploadSection;
