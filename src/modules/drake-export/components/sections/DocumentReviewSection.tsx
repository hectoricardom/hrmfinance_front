/**
 * DocumentReviewSection
 * SolidJS component for reviewing documents in Drake Tax Export
 */

import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { drakeExportStore, drakeExportActions } from '../../stores/drakeExportStore';
import {
  DrakeTaxDocument,
  DrakeTaxDocumentType,
  DRAKE_FORM_LABELS,
  ExtractedTaxAmounts,
  PayerInfo
} from '../../types/drakeTypes';
import { FORM_DEFINITIONS, TaxFormBoxDefinition, getFormDefinition } from '../data/drakeFieldMappings';

const DocumentReviewSection: Component = () => {
  const [isExpanded, setIsExpanded] = createSignal(true);
  const [selectedDocId, setSelectedDocId] = createSignal<string | null>(null);

  // Get documents that need review (analyzed but not verified)
  const documentsToReview = createMemo(() => {
    return drakeExportStore.documents.filter(
      doc => (doc.uploadStatus === 'analyzed' || doc.uploadStatus === 'verified') && !doc.verified
    );
  });

  // Get all reviewable documents (including verified)
  const allReviewableDocuments = createMemo(() => {
    return drakeExportStore.documents.filter(
      doc => doc.uploadStatus === 'analyzed' || doc.uploadStatus === 'verified'
    );
  });

  // Get verified documents count
  const verifiedCount = createMemo(() => {
    return drakeExportStore.documents.filter(doc => doc.verified).length;
  });

  // Get total analyzable documents count
  const totalAnalyzedCount = createMemo(() => {
    return drakeExportStore.documents.filter(
      doc => doc.uploadStatus === 'analyzed' || doc.verified
    ).length;
  });

  // Get selected document for detailed view
  const selectedDoc = createMemo(() => {
    const id = selectedDocId();
    if (!id) return null;
    return drakeExportStore.documents.find(d => d.id === id) || null;
  });

  // Handle document type change
  const handleDocTypeChange = (docId: string, newType: DrakeTaxDocumentType) => {
    drakeExportActions.updateDocument(docId, {
      drakeFormType: newType,
      manualOverride: true
    });
  };

  // Handle amount field change
  const handleAmountChange = (docId: string, field: keyof ExtractedTaxAmounts, value: string) => {
    const doc = drakeExportStore.documents.find(d => d.id === docId);
    if (!doc) return;

    const numValue = parseFloat(value.replace(/,/g, '')) || 0;
    const updatedAmounts = {
      ...(doc.extractedAmounts || {}),
      [field]: numValue
    };

    drakeExportActions.updateDocument(docId, {
      extractedAmounts: updatedAmounts,
      manualOverride: true
    });
  };

  // Handle payer info change
  const handlePayerInfoChange = (docId: string, field: keyof PayerInfo, value: string) => {
    const doc = drakeExportStore.documents.find(d => d.id === docId);
    if (!doc) return;

    const updatedPayerInfo = {
      ...(doc.payerInfo || {}),
      [field]: value
    };

    drakeExportActions.updateDocument(docId, {
      payerInfo: updatedPayerInfo,
      manualOverride: true
    });
  };

  // Handle notes change
  const handleNotesChange = (docId: string, notes: string) => {
    drakeExportActions.updateDocument(docId, { notes });
  };

  // Handle verify single document
  const handleVerifyDocument = (docId: string) => {
    drakeExportActions.verifyDocument(docId);
  };

  // Handle unverify document
  const handleUnverifyDocument = (docId: string) => {
    drakeExportActions.updateDocument(docId, { verified: false });
  };

  // Handle verify all documents
  const handleVerifyAll = () => {
    documentsToReview().forEach(doc => {
      drakeExportActions.verifyDocument(doc.id);
    });
  };

  // Get form boxes for a document type
  const getFormBoxes = (docType: DrakeTaxDocumentType): TaxFormBoxDefinition[] => {
    const definition = FORM_DEFINITIONS[docType];
    return definition?.boxes || [];
  };

  // Format currency for display
  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return '';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get document icon
  const getDocIcon = (docType?: DrakeTaxDocumentType): string => {
    const def = docType ? getFormDefinition(docType) : null;
    return def?.icon || '📄';
  };

  // Get primary amount for a document
  const getPrimaryAmount = (doc: DrakeTaxDocument): number | undefined => {
    const amounts = doc.extractedAmounts;
    if (!amounts) return undefined;

    switch (doc.drakeFormType) {
      case 'w2': return amounts.wages;
      case '1099_nec': return amounts.nonEmployeeCompensation;
      case '1099_misc': return amounts.rents || amounts.royalties || amounts.otherIncome;
      case '1099_int': return amounts.interestIncome;
      case '1099_div': return amounts.ordinaryDividends;
      case '1098': return amounts.mortgageInterest;
      case '1098_t': return amounts.paymentsReceived;
      case 'schedule_k1': return amounts.ordinaryBusinessIncome;
      default: return amounts.totalAmount;
    }
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

  const progressBadgeStyle = (complete: boolean) => ({
    background: complete ? 'var(--success-color, #22c55e)' : 'var(--warning-color, #f59e0b)',
    color: 'white',
    padding: '0.25rem 0.625rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '600'
  });

  const contentStyle = {
    padding: '1.5rem'
  };

  const progressBarContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '1.5rem',
    padding: '1rem',
    background: 'var(--bg-light, #f8fafc)',
    'border-radius': 'var(--border-radius, 8px)'
  };

  const progressBarStyle = {
    flex: '1',
    height: '8px',
    background: 'var(--border-color, #e2e8f0)',
    'border-radius': '4px',
    overflow: 'hidden'
  };

  const progressFillStyle = (percentage: number) => ({
    height: '100%',
    width: `${percentage}%`,
    background: 'var(--success-color, #22c55e)',
    transition: 'width 0.3s ease'
  });

  const progressTextStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #64748b)',
    'white-space': 'nowrap' as const
  };

  const buttonStyle = (variant: 'primary' | 'success' | 'secondary' | 'ghost' = 'secondary') => {
    const styles = {
      primary: { background: 'var(--primary-color, #3b82f6)', color: 'white', border: 'none' },
      success: { background: 'var(--success-color, #22c55e)', color: 'white', border: 'none' },
      secondary: { background: 'transparent', color: 'var(--text-secondary, #64748b)', border: '1px solid var(--border-color, #e2e8f0)' },
      ghost: { background: 'transparent', color: 'var(--text-muted, #94a3b8)', border: 'none' }
    };
    return {
      ...styles[variant],
      padding: '0.5rem 1rem',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-weight': '500',
      'font-size': '0.875rem',
      display: 'inline-flex',
      'align-items': 'center',
      gap: '0.375rem'
    };
  };

  const docListStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '0.75rem',
    'margin-bottom': '1.5rem'
  };

  const docCardStyle = (isSelected: boolean, isVerified: boolean) => ({
    padding: '1rem',
    border: `2px solid ${isSelected ? 'var(--primary-color, #3b82f6)' : isVerified ? 'var(--success-color, #22c55e)' : 'var(--border-color, #e2e8f0)'}`,
    'border-radius': '8px',
    cursor: 'pointer',
    background: isVerified ? 'var(--success-light, #f0fdf4)' : 'var(--card-bg, #fff)',
    transition: 'all 0.2s ease'
  });

  const detailPanelStyle = {
    border: '1px solid var(--border-color, #e2e8f0)',
    'border-radius': '8px',
    overflow: 'hidden'
  };

  const detailHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 1.5rem',
    background: 'var(--bg-light, #f8fafc)',
    'border-bottom': '1px solid var(--border-color, #e2e8f0)'
  };

  const detailBodyStyle = {
    padding: '1.5rem',
    'max-height': '500px',
    overflow: 'auto'
  };

  const formGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const fieldGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.375rem'
  };

  const labelStyle = {
    'font-size': '0.75rem',
    'font-weight': '500',
    color: 'var(--text-secondary, #64748b)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color, #e2e8f0)',
    'border-radius': '6px',
    'font-size': '0.9375rem',
    'font-family': 'inherit',
    'box-sizing': 'border-box' as const
  };

  const selectStyle = {
    ...inputStyle,
    background: 'white',
    cursor: 'pointer'
  };

  const sectionTitleStyle = {
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-primary, #1e293b)',
    'margin-bottom': '0.75rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '1px solid var(--border-color, #e2e8f0)'
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '3rem',
    color: 'var(--text-muted, #94a3b8)'
  };

  return (
    <div style={sectionStyle}>
      {/* Section Header */}
      <div style={headerStyle} onClick={() => setIsExpanded(!isExpanded())}>
        <div style={headerTitleStyle}>
          <span>3.</span>
          <span>Document Review</span>
          <Show when={totalAnalyzedCount() > 0}>
            <span style={progressBadgeStyle(verifiedCount() === totalAnalyzedCount())}>
              {verifiedCount()} / {totalAnalyzedCount()} verified
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
          {/* Progress Indicator */}
          <Show when={totalAnalyzedCount() > 0}>
            <div style={progressBarContainerStyle}>
              <div style={progressTextStyle}>
                Review Progress
              </div>
              <div style={progressBarStyle}>
                <div style={progressFillStyle(
                  totalAnalyzedCount() > 0
                    ? (verifiedCount() / totalAnalyzedCount()) * 100
                    : 0
                )} />
              </div>
              <div style={progressTextStyle}>
                {verifiedCount()} of {totalAnalyzedCount()}
              </div>
              <Show when={documentsToReview().length > 0}>
                <button
                  style={buttonStyle('success')}
                  onClick={handleVerifyAll}
                  type="button"
                >
                  ✓ Verify All ({documentsToReview().length})
                </button>
              </Show>
            </div>
          </Show>

          {/* Empty State */}
          <Show when={totalAnalyzedCount() === 0}>
            <div style={emptyStateStyle}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📋</div>
              <div style={{ 'font-size': '1.125rem', 'margin-bottom': '0.5rem' }}>
                No documents to review
              </div>
              <div style={{ 'font-size': '0.875rem' }}>
                Upload and process documents in the previous section to begin review
              </div>
            </div>
          </Show>

          {/* Document Cards Grid */}
          <Show when={allReviewableDocuments().length > 0}>
            <div style={docListStyle}>
              <For each={allReviewableDocuments()}>
                {(doc) => (
                  <div
                    style={docCardStyle(selectedDocId() === doc.id, doc.verified || false)}
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                      <span style={{ 'font-size': '1.5rem' }}>{getDocIcon(doc.drakeFormType)}</span>
                      <div style={{ flex: '1', 'min-width': '0' }}>
                        <div style={{
                          'font-weight': '500',
                          'white-space': 'nowrap',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'margin-bottom': '0.25rem'
                        }} title={doc.originalFileName}>
                          {doc.originalFileName}
                        </div>
                        <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                          {DRAKE_FORM_LABELS[doc.drakeFormType || 'other']}
                        </div>
                        <Show when={getPrimaryAmount(doc)}>
                          <div style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-top': '0.5rem', color: 'var(--text-primary)' }}>
                            ${formatCurrency(getPrimaryAmount(doc))}
                          </div>
                        </Show>
                        <Show when={doc.payerInfo?.name}>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                            {doc.payerInfo?.name}
                          </div>
                        </Show>
                      </div>
                      <Show when={doc.verified}>
                        <span style={{ color: 'var(--success-color)', 'font-size': '1.25rem' }}>✓</span>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          {/* Detail Panel for Selected Document */}
          <Show when={selectedDoc()}>
            {(doc) => {
              const formBoxes = getFormBoxes(doc().drakeFormType || 'other');
              const formDef = getFormDefinition(doc().drakeFormType || 'other');

              return (
                <div style={detailPanelStyle}>
                  {/* Detail Header */}
                  <div style={detailHeaderStyle}>
                    <div>
                      <div style={{ 'font-weight': '600', 'font-size': '1.125rem' }}>
                        {getDocIcon(doc().drakeFormType)} {doc().originalFileName}
                      </div>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                        {formDef.formName} - {formDef.description}
                        <Show when={doc().aiConfidence}>
                          {' '}| AI Confidence: {doc().aiConfidence}%
                        </Show>
                        <Show when={doc().manualOverride}>
                          {' '}| <span style={{ color: 'var(--warning-color)' }}>Manually edited</span>
                        </Show>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Show when={!doc().verified}>
                        <button
                          style={buttonStyle('success')}
                          onClick={() => handleVerifyDocument(doc().id)}
                          type="button"
                        >
                          ✓ Verify
                        </button>
                      </Show>
                      <Show when={doc().verified}>
                        <button
                          style={buttonStyle('secondary')}
                          onClick={() => handleUnverifyDocument(doc().id)}
                          type="button"
                        >
                          ↩ Unverify
                        </button>
                      </Show>
                      <button
                        style={buttonStyle('ghost')}
                        onClick={() => setSelectedDocId(null)}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Detail Body */}
                  <div style={detailBodyStyle}>
                    {/* Document Type & Tax Year */}
                    <div style={{ ...formGridStyle, 'margin-bottom': '1.5rem' }}>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Document Type</label>
                        <select
                          style={selectStyle}
                          value={doc().drakeFormType || 'other'}
                          onChange={(e) => handleDocTypeChange(doc().id, e.currentTarget.value as DrakeTaxDocumentType)}
                        >
                          <For each={Object.entries(DRAKE_FORM_LABELS)}>
                            {([value, label]) => (
                              <option value={value}>{label}</option>
                            )}
                          </For>
                        </select>
                      </div>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Tax Year</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={doc().taxYear || drakeExportStore.taxYear}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Payer Information */}
                    <div style={sectionTitleStyle}>Payer / Employer Information</div>
                    <div style={{ ...formGridStyle, 'margin-bottom': '1.5rem' }}>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Name</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={doc().payerInfo?.name || ''}
                          onInput={(e) => handlePayerInfoChange(doc().id, 'name', e.currentTarget.value)}
                        />
                      </div>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>EIN</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={doc().payerInfo?.ein || ''}
                          onInput={(e) => handlePayerInfoChange(doc().id, 'ein', e.currentTarget.value)}
                          placeholder="XX-XXXXXXX"
                        />
                      </div>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Address</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={doc().payerInfo?.address || ''}
                          onInput={(e) => handlePayerInfoChange(doc().id, 'address', e.currentTarget.value)}
                        />
                      </div>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>City</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={doc().payerInfo?.city || ''}
                          onInput={(e) => handlePayerInfoChange(doc().id, 'city', e.currentTarget.value)}
                        />
                      </div>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>State</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={doc().payerInfo?.state || ''}
                          onInput={(e) => handlePayerInfoChange(doc().id, 'state', e.currentTarget.value)}
                          maxLength={2}
                        />
                      </div>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>ZIP</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={doc().payerInfo?.zip || ''}
                          onInput={(e) => handlePayerInfoChange(doc().id, 'zip', e.currentTarget.value)}
                        />
                      </div>
                    </div>

                    {/* Extracted Amounts */}
                    <div style={sectionTitleStyle}>
                      {formDef.formName} - Extracted Amounts
                    </div>
                    <div style={formGridStyle}>
                      <For each={formBoxes}>
                        {(box) => {
                          const value = doc().extractedAmounts?.[box.dataField];
                          const numValue = typeof value === 'number' ? value : undefined;

                          return (
                            <div style={fieldGroupStyle}>
                              <label style={labelStyle}>
                                Box {box.boxNumber}: {box.description}
                                <Show when={box.required}>
                                  <span style={{ color: 'var(--danger-color)' }}> *</span>
                                </Show>
                              </label>
                              <input
                                type="text"
                                style={inputStyle}
                                value={numValue !== undefined ? formatCurrency(numValue) : ''}
                                onInput={(e) => handleAmountChange(doc().id, box.dataField, e.currentTarget.value)}
                                placeholder="0.00"
                              />
                              <Show when={box.scheduleMapping}>
                                <span style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                                  → {box.scheduleMapping?.schedule} Line {box.scheduleMapping?.line}
                                </span>
                              </Show>
                            </div>
                          );
                        }}
                      </For>
                    </div>

                    {/* Notes */}
                    <div style={{ 'margin-top': '1rem' }}>
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Notes</label>
                        <textarea
                          style={{ ...inputStyle, 'min-height': '60px', resize: 'vertical' as const }}
                          value={doc().notes || ''}
                          onInput={(e) => handleNotesChange(doc().id, e.currentTarget.value)}
                          placeholder="Add any notes about this document..."
                        />
                      </div>
                    </div>

                    {/* Validation Errors */}
                    <Show when={doc().errorMessage}>
                      <div style={{
                        'margin-top': '1rem',
                        padding: '0.75rem',
                        background: 'var(--danger-light, #fef2f2)',
                        'border-radius': '6px',
                        color: 'var(--danger-color, #ef4444)',
                        'font-size': '0.875rem'
                      }}>
                        <strong>Validation Issues:</strong> {doc().errorMessage}
                      </div>
                    </Show>
                  </div>
                </div>
              );
            }}
          </Show>

          {/* All Verified State */}
          <Show when={allReviewableDocuments().length > 0 && verifiedCount() === totalAnalyzedCount() && !selectedDocId()}>
            <div style={{
              ...emptyStateStyle,
              background: 'var(--success-light, #f0fdf4)',
              'border-radius': '8px',
              padding: '2rem'
            }}>
              <div style={{ 'font-size': '2.5rem', 'margin-bottom': '0.75rem', color: 'var(--success-color, #22c55e)' }}>✓</div>
              <div style={{ 'font-size': '1.125rem', 'margin-bottom': '0.5rem', color: 'var(--success-dark, #166534)' }}>
                All documents verified!
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--success-color, #22c55e)' }}>
                {verifiedCount()} document{verifiedCount() !== 1 ? 's' : ''} ready for export
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default DocumentReviewSection;
