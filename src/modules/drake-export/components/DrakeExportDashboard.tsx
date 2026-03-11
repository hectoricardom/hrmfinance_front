/**
 * DrakeExportDashboard
 * Main container component for the Drake Tax Export dashboard
 */

import { Component, createEffect, Show, For, createMemo } from 'solid-js';
import { drakeExportStore, drakeExportActions } from '../stores/drakeExportStore';
import CollapsibleSection from './shared/CollapsibleSection';
import ClientSelectorSection from './sections/ClientSelectorSection';
import DocumentUploadSection from './sections/DocumentUploadSection';
import DocumentReviewSection from './sections/DocumentReviewSection';
// import TaxFormSummarySection from './sections/TaxFormSummarySection';
// import ExportToDrakeSection from './sections/ExportToDrakeSection';
import { TaxYear } from '../types/drakeTypes';

type WorkflowStep = 'client' | 'upload' | 'review' | 'export';
type StepStatus = 'pending' | 'in_progress' | 'completed';

const TAX_YEARS: TaxYear[] = [2023, 2024, 2025, 2026];

const DrakeExportDashboard: Component = () => {
  // Compute section statuses based on store state
  const clientStatus = createMemo((): StepStatus => {
    if (drakeExportStore.selectedClient) return 'completed';
    if (drakeExportStore.sectionState.clientSelector) return 'in_progress';
    return 'pending';
  });

  const uploadStatus = createMemo((): StepStatus => {
    if (drakeExportStore.documents.length > 0) return 'completed';
    if (drakeExportStore.selectedClient && drakeExportStore.sectionState.documentUpload) return 'in_progress';
    return 'pending';
  });

  const reviewStatus = createMemo((): StepStatus => {
    const docs = drakeExportStore.documents;
    if (docs.length > 0 && docs.every(doc => doc.verified)) return 'completed';
    if (docs.length > 0 && drakeExportStore.sectionState.documentReview) return 'in_progress';
    return 'pending';
  });

  const summaryStatus = createMemo((): StepStatus => {
    if (drakeExportStore.formSummaries.length > 0) return 'completed';
    if (reviewStatus() === 'completed' && drakeExportStore.sectionState.formSummary) return 'in_progress';
    return 'pending';
  });

  const exportStatus = createMemo((): StepStatus => {
    if (drakeExportStore.exportStatus === 'completed') return 'completed';
    if (drakeExportStore.exportStatus === 'generating') return 'in_progress';
    if (summaryStatus() === 'completed' && drakeExportStore.sectionState.export) return 'in_progress';
    return 'pending';
  });

  // Progress indicator workflow steps
  const workflowSteps = createMemo(() => [
    { id: 'client' as WorkflowStep, label: 'Client', status: clientStatus() },
    { id: 'upload' as WorkflowStep, label: 'Upload', status: uploadStatus() },
    { id: 'review' as WorkflowStep, label: 'Review', status: reviewStatus() },
    { id: 'export' as WorkflowStep, label: 'Export', status: exportStatus() },
  ]);

  // Auto-expand next section when current completes
  createEffect(() => {
    // When client is selected, open document upload
    if (drakeExportStore.selectedClient && !drakeExportStore.sectionState.documentUpload) {
      drakeExportActions.toggleSection('documentUpload');
    }
  });

  createEffect(() => {
    // When documents are uploaded, open document review
    if (drakeExportStore.documents.length > 0 && !drakeExportStore.sectionState.documentReview) {
      drakeExportActions.toggleSection('documentReview');
    }
  });

  createEffect(() => {
    // When all docs verified, open form summary
    const docs = drakeExportStore.documents;
    if (docs.length > 0 && docs.every(doc => doc.verified) && !drakeExportStore.sectionState.formSummary) {
      drakeExportActions.toggleSection('formSummary');
      drakeExportActions.calculateFormSummaries();
    }
  });

  createEffect(() => {
    // When summaries calculated, open export
    if (drakeExportStore.formSummaries.length > 0 && !drakeExportStore.sectionState.export) {
      drakeExportActions.toggleSection('export');
    }
  });

  // Section badges
  const clientBadge = createMemo(() =>
    drakeExportStore.selectedClient ? '1' : '0'
  );

  const uploadBadge = createMemo(() =>
    drakeExportStore.documents.length.toString()
  );

  const reviewBadge = createMemo(() => {
    const verified = drakeExportStore.documents.filter(d => d.verified).length;
    const total = drakeExportStore.documents.length;
    return total > 0 ? `${verified}/${total}` : '0';
  });

  const summaryBadge = createMemo(() =>
    drakeExportStore.formSummaries.length.toString()
  );

  const exportBadge = createMemo(() => {
    switch (drakeExportStore.exportStatus) {
      case 'completed': return 'Done';
      case 'generating': return '...';
      case 'ready': return 'Ready';
      default: return '-';
    }
  });

  // Get status color for progress indicator
  const getStepColor = (status: StepStatus): string => {
    switch (status) {
      case 'completed': return '#10B981'; // green
      case 'in_progress': return '#3B82F6'; // blue
      default: return '#9CA3AF'; // gray
    }
  };

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    height: '100%',
    'min-height': '100vh',
    background: 'var(--background-color, #f5f5f5)',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1.5rem 2rem',
    background: 'var(--surface-color, #ffffff)',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'box-shadow': 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))',
  };

  const titleContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary, #1f2937)',
    margin: '0',
  };

  const yearSelectorStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
  };

  const yearLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6B7280)',
    'font-weight': '500',
  };

  const yearSelectStyle = {
    padding: '0.5rem 1rem',
    'border-radius': '6px',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--surface-color, #ffffff)',
    'font-size': '0.875rem',
    'font-weight': '600',
    cursor: 'pointer',
  };

  const progressContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: 'var(--surface-color, #ffffff)',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
  };

  const progressStepStyle = (status: StepStatus) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
  });

  const stepCircleStyle = (status: StepStatus) => ({
    width: '2rem',
    height: '2rem',
    'border-radius': '50%',
    background: getStepColor(status),
    color: '#ffffff',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '0.75rem',
    'font-weight': '600',
    transition: 'background 0.3s ease',
  });

  const stepLabelStyle = (status: StepStatus) => ({
    'font-size': '0.875rem',
    'font-weight': status === 'in_progress' ? '600' : '500',
    color: status === 'pending' ? 'var(--text-secondary, #6B7280)' : 'var(--text-primary, #1f2937)',
  });

  const stepConnectorStyle = (status: StepStatus) => ({
    width: '3rem',
    height: '2px',
    background: status === 'completed' ? '#10B981' : 'var(--border-color, #e5e7eb)',
    margin: '0 0.25rem',
    transition: 'background 0.3s ease',
  });

  const contentStyle = {
    flex: '1',
    overflow: 'auto',
    padding: '1.5rem 2rem',
  };

  const sectionsContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem',
    'max-width': '1200px',
    margin: '0 auto',
  };

  // Handle tax year change
  const handleYearChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    drakeExportActions.setTaxYear(parseInt(target.value) as TaxYear);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={titleContainerStyle}>
          <h1 style={titleStyle}>Drake Tax Export</h1>
        </div>
        <div style={yearSelectorStyle}>
          <span style={yearLabelStyle}>Tax Year:</span>
          <select
            style={yearSelectStyle}
            value={drakeExportStore.taxYear}
            onChange={handleYearChange}
          >
            <For each={TAX_YEARS}>
              {(year) => (
                <option value={year}>{year}</option>
              )}
            </For>
          </select>
        </div>
      </header>

      {/* Progress Indicator */}
      <div style={progressContainerStyle}>
        <For each={workflowSteps()}>
          {(step, index) => (
            <>
              <div style={progressStepStyle(step.status)}>
                <div style={stepCircleStyle(step.status)}>
                  <Show
                    when={step.status === 'completed'}
                    fallback={index() + 1}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 4"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </Show>
                </div>
                <span style={stepLabelStyle(step.status)}>{step.label}</span>
              </div>
              <Show when={index() < workflowSteps().length - 1}>
                <div style={stepConnectorStyle(step.status)} />
              </Show>
            </>
          )}
        </For>
      </div>

      {/* Main Content */}
      <main style={contentStyle}>
        <div style={sectionsContainerStyle}>
          {/* 1. Client Selection */}
          <CollapsibleSection
            title="Client Selection"
            icon="1"
            isOpen={drakeExportStore.sectionState.clientSelector}
            onToggle={() => drakeExportActions.toggleSection('clientSelector')}
            status={clientStatus()}
            badge={clientBadge()}
          >
            <ClientSelectorSection />
          </CollapsibleSection>

          {/* 2. Document Upload */}
          <CollapsibleSection
            title="Document Upload"
            icon="2"
            isOpen={drakeExportStore.sectionState.documentUpload}
            onToggle={() => drakeExportActions.toggleSection('documentUpload')}
            status={uploadStatus()}
            badge={uploadBadge()}
          >
            <DocumentUploadSection />
          </CollapsibleSection>

          {/* 3. Document Review */}
          <CollapsibleSection
            title="Document Review"
            icon="3"
            isOpen={drakeExportStore.sectionState.documentReview}
            onToggle={() => drakeExportActions.toggleSection('documentReview')}
            status={reviewStatus()}
            badge={reviewBadge()}
          >
            <DocumentReviewSection />
          </CollapsibleSection>

          {/* 4. Tax Form Summary */}
          <CollapsibleSection
            title="Tax Form Summary"
            icon="4"
            isOpen={drakeExportStore.sectionState.formSummary}
            onToggle={() => drakeExportActions.toggleSection('formSummary')}
            status={summaryStatus()}
            badge={summaryBadge()}
          >
            <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-secondary, #6B7280)' }}>
              {/* TaxFormSummarySection will be rendered here */}
              <Show
                when={drakeExportStore.formSummaries.length > 0}
                fallback={<p>Complete document review to see tax form summaries.</p>}
              >
                <For each={drakeExportStore.formSummaries}>
                  {(summary) => (
                    <div style={{
                      padding: '0.75rem',
                      background: 'var(--surface-color, #f9fafb)',
                      'border-radius': '6px',
                      'margin-bottom': '0.5rem',
                      'text-align': 'left'
                    }}>
                      <strong>{summary.formType}</strong>: {summary.documentCount} document(s) - ${summary.totalAmount.toLocaleString()}
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </CollapsibleSection>

          {/* 5. Export to Drake */}
          <CollapsibleSection
            title="Export to Drake"
            icon="5"
            isOpen={drakeExportStore.sectionState.export}
            onToggle={() => drakeExportActions.toggleSection('export')}
            status={exportStatus()}
            badge={exportBadge()}
          >
            <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-secondary, #6B7280)' }}>
              {/* ExportToDrakeSection will be rendered here */}
              <Show
                when={drakeExportStore.exportStatus === 'completed'}
                fallback={
                  <Show
                    when={summaryStatus() === 'completed'}
                    fallback={<p>Complete all previous steps to export to Drake.</p>}
                  >
                    <button
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'var(--primary-color, #3B82F6)',
                        color: '#ffffff',
                        border: 'none',
                        'border-radius': '6px',
                        'font-size': '1rem',
                        'font-weight': '600',
                        cursor: 'pointer',
                      }}
                      onClick={() => drakeExportActions.setExportStatus('ready')}
                    >
                      Generate Drake Export
                    </button>
                  </Show>
                }
              >
                <div style={{ color: 'var(--success-color, #10B981)' }}>
                  <p>Export completed successfully!</p>
                  <Show when={drakeExportStore.exportResult}>
                    <p>Records exported: {drakeExportStore.exportResult?.recordCount}</p>
                  </Show>
                </div>
              </Show>
            </div>
          </CollapsibleSection>
        </div>
      </main>
    </div>
  );
};

export default DrakeExportDashboard;
