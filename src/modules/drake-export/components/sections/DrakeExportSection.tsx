/**
 * DrakeExportSection
 * SolidJS component for exporting tax data to Drake format
 */

import { Component, JSX, createSignal, createMemo, Show, For } from 'solid-js';
import { drakeExportStore, drakeExportActions } from '../../stores/drakeExportStore';
import type { DrakeExportRecord, DrakeExportResult } from '../../types/drakeTypes';
import { FORM_DEFINITIONS, DRAKE_CSV_HEADERS, formatDrakeAmount, formatDrakeSSN, formatDrakeEIN } from '../data/drakeFieldMappings';

// Validation item structure
interface ValidationItem {
  label: string;
  passed: boolean;
  message?: string;
}

const DrakeExportSection: Component = () => {
  const [isExporting, setIsExporting] = createSignal(false);
  const [exportSuccess, setExportSuccess] = createSignal(false);
  const [exportedFilename, setExportedFilename] = createSignal<string | null>(null);
  const [csvData, setCsvData] = createSignal<string | null>(null);

  // Build validation checklist
  const validationChecklist = createMemo((): ValidationItem[] => {
    const client = drakeExportStore.selectedClient;
    const documents = drakeExportStore.documents;
    const verifiedDocs = documents.filter((doc) => doc.verified);
    const hasErrors = documents.some((doc) => doc.uploadStatus === 'error');

    return [
      {
        label: 'Client selected',
        passed: client !== null,
        message: client ? `${client.firstName} ${client.lastName}` : 'No client selected'
      },
      {
        label: 'Tax year selected',
        passed: drakeExportStore.taxYear !== null,
        message: drakeExportStore.taxYear?.toString() || 'No tax year selected'
      },
      {
        label: 'At least one document uploaded',
        passed: documents.length > 0,
        message: documents.length > 0 ? `${documents.length} document(s)` : 'No documents uploaded'
      },
      {
        label: 'All documents verified',
        passed: documents.length > 0 && verifiedDocs.length === documents.length,
        message:
          documents.length === 0
            ? 'No documents to verify'
            : verifiedDocs.length === documents.length
              ? 'All verified'
              : `${verifiedDocs.length}/${documents.length} verified`
      },
      {
        label: 'No errors',
        passed: !hasErrors,
        message: hasErrors ? 'Some documents have errors' : 'No errors'
      }
    ];
  });

  // Check if all validations pass
  const isValidationPassed = createMemo(() => {
    return validationChecklist().every((item) => item.passed);
  });

  // Calculate totals
  const totals = createMemo(() => {
    const documents = drakeExportStore.documents;
    let totalIncome = 0;
    let totalWithholding = 0;

    documents.forEach((doc) => {
      if (doc.extractedAmounts) {
        const amounts = doc.extractedAmounts;
        // Income
        totalIncome += amounts.wages || 0;
        totalIncome += amounts.nonEmployeeCompensation || 0;
        totalIncome += amounts.interestIncome || 0;
        totalIncome += amounts.ordinaryDividends || 0;
        totalIncome += amounts.rents || 0;
        totalIncome += amounts.royalties || 0;
        totalIncome += amounts.otherIncome || 0;
        totalIncome += amounts.ordinaryBusinessIncome || 0;

        // Withholding
        totalWithholding += amounts.federalTaxWithheld || 0;
        totalWithholding += amounts.federalTaxWithheld1099 || 0;
        totalWithholding += amounts.stateTaxWithheld || 0;
        totalWithholding += amounts.localTaxWithheld || 0;
      }
    });

    return { totalIncome, totalWithholding };
  });

  // Generate Drake export records
  const generateExportRecords = (): DrakeExportRecord[] => {
    const records: DrakeExportRecord[] = [];
    const client = drakeExportStore.selectedClient;
    const taxYear = drakeExportStore.taxYear;

    if (!client) return records;

    drakeExportStore.documents.forEach((doc) => {
      const formType = doc.drakeFormType || 'other';
      const formDef = FORM_DEFINITIONS[formType];

      if (doc.extractedAmounts && formDef) {
        formDef.boxes.forEach((box) => {
          const value = doc.extractedAmounts?.[box.dataField];
          if (typeof value === 'number' && value !== 0) {
            records.push({
              SSN: formatDrakeSSN(client.ss || ''),
              firstName: client.firstName || '',
              lastName: client.lastName || '',
              middleInitial: client.middleName?.charAt(0) || '',
              taxYear: taxYear,
              formType: formDef.formCode,
              boxNumber: box.boxNumber,
              amount: value,
              description: box.description,
              payerName: doc.payerInfo?.name || '',
              payerEIN: doc.payerInfo?.ein ? formatDrakeEIN(doc.payerInfo.ein) : '',
              payerAddress: doc.payerInfo?.address || '',
              state: doc.payerInfo?.state || '',
              stateId: ''
            });
          }
        });
      }
    });

    return records;
  };

  // Generate CSV string from records
  const generateCSV = (records: DrakeExportRecord[]): string => {
    const headers = DRAKE_CSV_HEADERS.join(',');
    const rows = records.map((record) =>
      [
        record.SSN,
        record.firstName,
        record.middleInitial || '',
        record.lastName,
        record.suffix || '',
        record.taxYear,
        record.formType,
        record.boxNumber,
        formatDrakeAmount(record.amount),
        record.description || '',
        record.payerName || '',
        record.payerEIN || '',
        record.payerAddress || '',
        record.state || '',
        record.stateId || ''
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );

    return [headers, ...rows].join('\n');
  };

  // CSV preview data (first 5 rows)
  const csvPreview = createMemo(() => {
    if (!isValidationPassed()) return null;

    const records = generateExportRecords();
    const previewRecords = records.slice(0, 5);

    return {
      headers: DRAKE_CSV_HEADERS,
      rows: previewRecords.map((record) => [
        record.SSN,
        record.firstName,
        record.middleInitial || '',
        record.lastName,
        record.suffix || '',
        String(record.taxYear),
        record.formType,
        record.boxNumber,
        formatDrakeAmount(record.amount)
      ]),
      totalCount: records.length
    };
  });

  // Handle export click
  const handleExport = async () => {
    if (!isValidationPassed()) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      // Generate CSV data
      const records = generateExportRecords();
      const csv = generateCSV(records);
      setCsvData(csv);

      // Create filename
      const client = drakeExportStore.selectedClient;
      const taxYear = drakeExportStore.taxYear;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `drake_export_${client?.lastName || 'client'}_${taxYear}_${timestamp}.csv`;

      // Create blob and trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update store
      const result: DrakeExportResult = {
        success: true,
        csvData: csv,
        fileName: filename,
        recordCount: records.length,
        totalIncome: totals().totalIncome,
        totalWithholding: totals().totalWithholding,
        exportedAt: Date.now()
      };

      drakeExportActions.setExportResult(result);
      drakeExportActions.setExportStatus('completed');

      setExportedFilename(filename);
      setExportSuccess(true);
    } catch (error) {
      drakeExportActions.setExportStatus('error');
      drakeExportActions.setError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle re-export (download again)
  const handleReExport = () => {
    const csv = csvData();
    const filename = exportedFilename();

    if (!csv || !filename) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Styles
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1.5rem'
  };

  const validationContainerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    padding: '1.5rem'
  };

  const validationTitleStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary, #1f2937)',
    'margin-bottom': '1rem'
  };

  const checklistStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem'
  };

  const checkItemStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem'
  };

  const checkIconStyle = (passed: boolean): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '1.5rem',
    height: '1.5rem',
    'border-radius': '9999px',
    background: passed ? 'var(--success-light, #D1FAE5)' : 'var(--danger-light, #FEE2E2)',
    color: passed ? 'var(--success-color, #10B981)' : 'var(--danger-color, #EF4444)',
    'font-size': '0.875rem',
    'flex-shrink': '0'
  });

  const checkLabelStyle: JSX.CSSProperties = {
    'font-size': '0.9375rem',
    color: 'var(--text-primary, #1f2937)',
    flex: '1'
  };

  const checkMessageStyle = (passed: boolean): JSX.CSSProperties => ({
    'font-size': '0.8125rem',
    color: passed ? 'var(--success-dark, #047857)' : 'var(--danger-dark, #B91C1C)'
  });

  const previewContainerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    overflow: 'hidden'
  };

  const previewHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 1.5rem',
    background: 'var(--surface-secondary, #f9fafb)',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)'
  };

  const previewTitleStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary, #1f2937)'
  };

  const recordCountStyle: JSX.CSSProperties = {
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.375rem 0.75rem',
    'border-radius': '9999px',
    background: 'var(--primary-light, #DBEAFE)',
    color: 'var(--primary-color, #3B82F6)',
    'font-size': '0.8125rem',
    'font-weight': '600'
  };

  const tableWrapperStyle: JSX.CSSProperties = {
    'overflow-x': 'auto',
    padding: '0 0 0.5rem 0'
  };

  const tableStyle: JSX.CSSProperties = {
    width: '100%',
    'border-collapse': 'collapse',
    'font-size': '0.8125rem'
  };

  const thStyle: JSX.CSSProperties = {
    padding: '0.75rem 1rem',
    'text-align': 'left',
    'font-weight': '600',
    color: 'var(--text-secondary, #6B7280)',
    background: 'var(--surface-secondary, #f9fafb)',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'white-space': 'nowrap'
  };

  const tdStyle: JSX.CSSProperties = {
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    color: 'var(--text-primary, #1f2937)',
    'white-space': 'nowrap'
  };

  const totalsContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    gap: '1.5rem',
    padding: '1rem 1.5rem',
    background: 'var(--surface-secondary, #f9fafb)',
    'border-top': '1px solid var(--border-color, #e5e7eb)'
  };

  const totalItemStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.25rem'
  };

  const totalLabelStyle: JSX.CSSProperties = {
    'font-size': '0.8125rem',
    color: 'var(--text-secondary, #6B7280)'
  };

  const totalValueStyle: JSX.CSSProperties = {
    'font-weight': '700',
    'font-size': '1.125rem',
    color: 'var(--text-primary, #1f2937)',
    'font-variant-numeric': 'tabular-nums'
  };

  const actionsContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-top': '0.5rem'
  };

  const exportButtonStyle = (disabled: boolean): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    'border-radius': 'var(--border-radius, 8px)',
    background: disabled ? 'var(--disabled-bg, #E5E7EB)' : 'var(--primary-color, #3B82F6)',
    color: disabled ? 'var(--disabled-text, #9CA3AF)' : '#ffffff',
    border: 'none',
    'font-size': '1rem',
    'font-weight': '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s ease, transform 0.1s ease'
  });

  const reExportButtonStyle: JSX.CSSProperties = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    'border-radius': 'var(--border-radius, 8px)',
    background: 'var(--surface-color, #ffffff)',
    color: 'var(--primary-color, #3B82F6)',
    border: '2px solid var(--primary-color, #3B82F6)',
    'font-size': '1rem',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  };

  const successMessageStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    background: 'var(--success-light, #D1FAE5)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--success-border, #6EE7B7)'
  };

  const successIconStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '2rem',
    height: '2rem',
    'border-radius': '9999px',
    background: 'var(--success-color, #10B981)',
    color: '#ffffff',
    'font-size': '1rem'
  };

  const successTextContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.125rem'
  };

  const successTitleStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '0.9375rem',
    color: 'var(--success-dark, #047857)'
  };

  const successFilenameStyle: JSX.CSSProperties = {
    'font-size': '0.8125rem',
    color: 'var(--success-text, #059669)',
    'font-family': 'monospace'
  };

  const validationFailedStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '2rem',
    background: 'var(--surface-secondary, #f9fafb)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px dashed var(--border-color, #d1d5db)',
    'text-align': 'center'
  };

  const validationFailedIconStyle: JSX.CSSProperties = {
    'font-size': '2rem',
    'margin-bottom': '0.75rem',
    opacity: '0.5'
  };

  const validationFailedTextStyle: JSX.CSSProperties = {
    'font-size': '0.9375rem',
    color: 'var(--text-secondary, #6B7280)'
  };

  // Truncated headers for preview table (show first 9 columns)
  const previewHeaders = DRAKE_CSV_HEADERS.slice(0, 9);

  return (
    <div style={containerStyle}>
      {/* Pre-export Validation Checklist */}
      <div style={validationContainerStyle}>
        <div style={validationTitleStyle}>Pre-Export Validation</div>
        <div style={checklistStyle}>
          <For each={validationChecklist()}>
            {(item) => (
              <div style={checkItemStyle}>
                <span style={checkIconStyle(item.passed)}>{item.passed ? '✓' : '✗'}</span>
                <span style={checkLabelStyle}>{item.label}</span>
                <span style={checkMessageStyle(item.passed)}>{item.message}</span>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* CSV Preview (only if validation passes) */}
      <Show
        when={isValidationPassed()}
        fallback={
          <div style={validationFailedStyle}>
            <span style={validationFailedIconStyle}>⚠️</span>
            <span style={validationFailedTextStyle}>
              Complete all validation requirements above to preview and export data
            </span>
          </div>
        }
      >
        <div style={previewContainerStyle}>
          <div style={previewHeaderStyle}>
            <span style={previewTitleStyle}>CSV Preview</span>
            <span style={recordCountStyle}>{csvPreview()?.totalCount || 0} records</span>
          </div>

          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <For each={previewHeaders}>{(header) => <th style={thStyle}>{header}</th>}</For>
                </tr>
              </thead>
              <tbody>
                <For each={csvPreview()?.rows || []}>
                  {(row) => (
                    <tr>
                      <For each={row}>{(cell) => <td style={tdStyle}>{cell}</td>}</For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          <Show when={(csvPreview()?.totalCount || 0) > 5}>
            <div
              style={{
                'text-align': 'center',
                padding: '0.75rem',
                'font-size': '0.8125rem',
                color: 'var(--text-secondary, #6B7280)',
                'border-top': '1px solid var(--border-color, #e5e7eb)'
              }}
            >
              Showing 5 of {csvPreview()?.totalCount} records...
            </div>
          </Show>

          <div style={totalsContainerStyle}>
            <div style={totalItemStyle}>
              <span style={totalLabelStyle}>Total Income</span>
              <span style={totalValueStyle}>{formatCurrency(totals().totalIncome)}</span>
            </div>
            <div style={totalItemStyle}>
              <span style={totalLabelStyle}>Total Withholding</span>
              <span style={totalValueStyle}>{formatCurrency(totals().totalWithholding)}</span>
            </div>
          </div>
        </div>
      </Show>

      {/* Success Message */}
      <Show when={exportSuccess() && exportedFilename()}>
        <div style={successMessageStyle}>
          <span style={successIconStyle}>✓</span>
          <div style={successTextContainerStyle}>
            <span style={successTitleStyle}>Export Successful!</span>
            <span style={successFilenameStyle}>{exportedFilename()}</span>
          </div>
        </div>
      </Show>

      {/* Export Actions */}
      <div style={actionsContainerStyle}>
        <button
          style={exportButtonStyle(!isValidationPassed() || isExporting())}
          onClick={handleExport}
          disabled={!isValidationPassed() || isExporting()}
        >
          <Show when={isExporting()} fallback={<>📥 Export to Drake CSV</>}>
            <span
              style={{
                display: 'inline-block',
                width: '1rem',
                height: '1rem',
                border: '2px solid #ffffff',
                'border-top-color': 'transparent',
                'border-radius': '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            Exporting...
          </Show>
        </button>

        <Show when={exportSuccess() && csvData()}>
          <button style={reExportButtonStyle} onClick={handleReExport}>
            🔄 Download Again
          </button>
        </Show>
      </div>

      {/* Inline CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DrakeExportSection;
