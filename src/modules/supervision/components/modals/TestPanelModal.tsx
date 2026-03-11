import { Component, createSignal, Show, For } from 'solid-js';
import { supervisionStore } from '../../stores/supervisionStore';

interface TestPanelModalProps {
  isOpen: boolean;
  adapterId: string;
  adapterName: string;
  onClose: () => void;
}

interface FieldTransformation {
  field: string;
  sourceValue: unknown;
  transformedValue: unknown;
  success: boolean;
}

interface JournalEntry {
  accountCode: string;
  accountName: string;
  debit: number | null;
  credit: number | null;
}

interface TestResult {
  transformations: FieldTransformation[];
  journalEntries: JournalEntry[];
  balance: number;
  mappedCount: number;
  totalCount: number;
}

const SAMPLE_DATA = {
  id: 'ch_test123',
  amount: 5000,
  currency: 'usd',
  metadata: { customer: 'Test Co' },
};

const TestPanelModal: Component<TestPanelModalProps> = (props) => {
  const [inputData, setInputData] = createSignal(JSON.stringify(SAMPLE_DATA, null, 2));
  const [isRunning, setIsRunning] = createSignal(false);
  const [testResult, setTestResult] = createSignal<TestResult | null>(null);
  const [parseError, setParseError] = createSignal<string | null>(null);

  const handleLoadSample = () => {
    setInputData(JSON.stringify(SAMPLE_DATA, null, 2));
    setParseError(null);
    setTestResult(null);
  };

  const handleRun = async () => {
    setParseError(null);
    setTestResult(null);

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(inputData());
    } catch {
      setParseError('Invalid JSON format. Please check your input.');
      return;
    }

    setIsRunning(true);

    try {
      const result = await supervisionStore.testAdapter(props.adapterId, parsedData);

      // Process the result into our display format
      // In a real implementation, the API would return structured data
      // For now, we simulate the transformation result
      const mockResult: TestResult = processTestResult(parsedData, result);
      setTestResult(mockResult);
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : 'Test execution failed'
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Simulate processing the test result
  const processTestResult = (
    input: Record<string, unknown>,
    _apiResult: unknown
  ): TestResult => {
    // This would normally come from the API response
    // Simulating based on the sample data structure
    const transformations: FieldTransformation[] = [
      {
        field: 'amount',
        sourceValue: input.amount,
        transformedValue:
          typeof input.amount === 'number'
            ? (input.amount / 100).toFixed(2)
            : undefined,
        success: typeof input.amount === 'number',
      },
      {
        field: 'currency',
        sourceValue: input.currency,
        transformedValue:
          typeof input.currency === 'string'
            ? input.currency.toUpperCase()
            : undefined,
        success: typeof input.currency === 'string',
      },
      {
        field: 'customer_name',
        sourceValue: (input.metadata as Record<string, unknown>)?.customer,
        transformedValue: (input.metadata as Record<string, unknown>)?.customer,
        success: !!(input.metadata as Record<string, unknown>)?.customer,
      },
      {
        field: 'reference',
        sourceValue: undefined,
        transformedValue: undefined,
        success: false,
      },
    ];

    const mappedCount = transformations.filter((t) => t.success).length;
    const amount =
      typeof input.amount === 'number' ? input.amount / 100 : 50.0;

    const journalEntries: JournalEntry[] = [
      {
        accountCode: '1010',
        accountName: 'Bank-CC',
        debit: amount,
        credit: null,
      },
      {
        accountCode: '4000',
        accountName: 'Revenue',
        debit: null,
        credit: amount,
      },
    ];

    const totalDebit = journalEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = journalEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const balance = totalDebit - totalCredit;

    return {
      transformations,
      journalEntries,
      balance,
      mappedCount,
      totalCount: transformations.length,
    };
  };

  const handleClose = () => {
    setTestResult(null);
    setParseError(null);
    setInputData(JSON.stringify(SAMPLE_DATA, null, 2));
    props.onClose();
  };

  const formatValue = (value: unknown): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '';
    return amount.toFixed(2);
  };

  const getMappingPercentage = (): string => {
    const result = testResult();
    if (!result) return '0';
    return Math.round((result.mappedCount / result.totalCount) * 100).toString();
  };

  // Styles
  const overlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    'background-color': 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
  };

  const modalStyle = {
    'background-color': '#ffffff',
    'border-radius': '8px',
    width: '700px',
    'max-width': '90vw',
    'max-height': '90vh',
    overflow: 'hidden',
    display: 'flex',
    'flex-direction': 'column' as const,
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '16px 20px',
    'border-bottom': '1px solid #E5E7EB',
    'background-color': '#F9FAFB',
  };

  const titleStyle = {
    'font-size': '16px',
    'font-weight': '600',
    color: '#111827',
    margin: '0',
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-size': '20px',
    color: '#6B7280',
    padding: '4px 8px',
    'line-height': '1',
    'border-radius': '4px',
  };

  const contentStyle = {
    padding: '20px',
    overflow: 'auto',
    'flex-grow': '1',
  };

  const sectionStyle = {
    'margin-bottom': '20px',
  };

  const sectionTitleStyle = {
    'font-size': '12px',
    'font-weight': '600',
    color: '#6B7280',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
    'margin-bottom': '8px',
  };

  const codeAreaStyle = {
    'background-color': '#1F2937',
    'border-radius': '6px',
    padding: '12px',
    'font-family': 'Monaco, Consolas, "Courier New", monospace',
    'font-size': '13px',
    color: '#F3F4F6',
    border: 'none',
    width: '100%',
    'min-height': '140px',
    resize: 'vertical' as const,
    'box-sizing': 'border-box' as const,
  };

  const buttonRowStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '8px',
    'margin-top': '12px',
  };

  const buttonStyle = (variant: 'primary' | 'secondary') => ({
    padding: '8px 16px',
    'border-radius': '6px',
    'font-size': '14px',
    'font-weight': '500',
    cursor: 'pointer',
    border: variant === 'primary' ? 'none' : '1px solid #D1D5DB',
    'background-color': variant === 'primary' ? '#8B5CF6' : '#ffffff',
    color: variant === 'primary' ? '#ffffff' : '#374151',
    transition: 'all 0.2s ease',
  });

  const outputBoxStyle = {
    'background-color': '#1F2937',
    'border-radius': '6px',
    padding: '12px',
    'font-family': 'Monaco, Consolas, "Courier New", monospace',
    'font-size': '13px',
  };

  const transformationLineStyle = (success: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    padding: '4px 0',
    color: success ? '#10B981' : '#EF4444',
  });

  const summaryStyle = {
    'font-size': '14px',
    color: '#6B7280',
    'margin-top': '12px',
    'padding-top': '12px',
    'border-top': '1px solid #E5E7EB',
  };

  const ledgerTableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '13px',
  };

  const ledgerRowStyle = {
    'border-bottom': '1px solid #374151',
  };

  const ledgerCellStyle = {
    padding: '8px 12px',
    color: '#F3F4F6',
  };

  const ledgerAmountCellStyle = {
    padding: '8px 12px',
    color: '#F3F4F6',
    'text-align': 'right' as const,
    'font-family': 'Monaco, Consolas, "Courier New", monospace',
  };

  const balanceRowStyle = (isBalanced: boolean) => ({
    'border-top': '2px solid #4B5563',
    'margin-top': '8px',
    'padding-top': '8px',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    color: isBalanced ? '#10B981' : '#F59E0B',
  });

  const errorStyle = {
    color: '#EF4444',
    'font-size': '14px',
    padding: '12px',
    'background-color': 'rgba(239, 68, 68, 0.1)',
    'border-radius': '6px',
    'margin-bottom': '16px',
  };

  const loadingStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '40px',
    color: '#6B7280',
    'font-size': '14px',
  };

  const spinnerStyle = {
    width: '20px',
    height: '20px',
    border: '2px solid #E5E7EB',
    'border-top-color': '#8B5CF6',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite',
    'margin-right': '12px',
  };

  return (
    <Show when={props.isOpen}>
      <div style={overlayStyle} onClick={handleClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={headerStyle}>
            <h2 style={titleStyle}>TEST ADAPTER: {props.adapterName}</h2>
            <button
              style={closeButtonStyle}
              onClick={handleClose}
              aria-label="Close modal"
            >
              X
            </button>
          </div>

          {/* Content */}
          <div style={contentStyle}>
            {/* Input Section */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>INPUT (Raw Data)</div>
              <textarea
                style={codeAreaStyle}
                value={inputData()}
                onInput={(e) => setInputData(e.currentTarget.value)}
                placeholder="Enter JSON data to test..."
                disabled={isRunning()}
              />
              <div style={buttonRowStyle}>
                <button
                  style={buttonStyle('secondary')}
                  onClick={handleLoadSample}
                  disabled={isRunning()}
                >
                  Load Sample
                </button>
                <button
                  style={buttonStyle('primary')}
                  onClick={handleRun}
                  disabled={isRunning()}
                >
                  {isRunning() ? 'Running...' : 'Run'}
                </button>
              </div>
            </div>

            {/* Error Display */}
            <Show when={parseError()}>
              <div style={errorStyle}>{parseError()}</div>
            </Show>

            {/* Loading State */}
            <Show when={isRunning()}>
              <div style={loadingStyle}>
                <div style={spinnerStyle} />
                Running test...
              </div>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </Show>

            {/* Output Section */}
            <Show when={testResult() && !isRunning()}>
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>OUTPUT (Transformed)</div>
                <div style={outputBoxStyle}>
                  <For each={testResult()!.transformations}>
                    {(transformation) => (
                      <div style={transformationLineStyle(transformation.success)}>
                        <span>{transformation.success ? '\u2713' : '\u2717'}</span>
                        <span>
                          {transformation.field}:{' '}
                          {formatValue(transformation.sourceValue)}
                          {transformation.success ? (
                            <span style={{ color: '#9CA3AF' }}>
                              {' -> '}
                              {formatValue(transformation.transformedValue)}
                            </span>
                          ) : (
                            <span style={{ color: '#EF4444', 'font-style': 'italic' }}>
                              {' '}
                              (no mapping)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
                <div style={summaryStyle}>
                  Overall: {testResult()!.mappedCount}/{testResult()!.totalCount} fields
                  mapped ({getMappingPercentage()}%)
                </div>
              </div>

              {/* Journal Preview Section */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>JOURNAL PREVIEW</div>
                <div style={outputBoxStyle}>
                  <table style={ledgerTableStyle}>
                    <tbody>
                      <For each={testResult()!.journalEntries}>
                        {(entry) => (
                          <tr style={ledgerRowStyle}>
                            <td style={ledgerCellStyle}>
                              {entry.accountCode} {entry.accountName}
                            </td>
                            <td style={ledgerAmountCellStyle}>
                              {entry.debit !== null ? `DR  ${formatCurrency(entry.debit)}` : ''}
                            </td>
                            <td style={ledgerAmountCellStyle}>
                              {entry.credit !== null ? `CR  ${formatCurrency(entry.credit)}` : ''}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                  <div
                    style={{
                      'border-top': '1px dashed #4B5563',
                      'margin-top': '8px',
                      'padding-top': '8px',
                    }}
                  />
                  <div style={balanceRowStyle(testResult()!.balance === 0)}>
                    <span>Balance:</span>
                    <span>
                      {testResult()!.balance === 0 ? '\u2713' : '\u26A0'}{' '}
                      {formatCurrency(Math.abs(testResult()!.balance))}
                    </span>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default TestPanelModal;
