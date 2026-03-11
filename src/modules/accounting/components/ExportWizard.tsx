import { Component, createSignal, Show, For } from 'solid-js';
import { Modal, Button, Card, FormSelect } from '../../ui';
import { exportTaxData, validateTaxData } from '../services/accountingApi';

interface ExportWizardProps {
  year: number;
  onClose: () => void;
}

interface DataCompleteness {
  totalTransactions: number;
  categorizedTransactions: number;
  missingCategories: string[];
  warnings: string[];
  ready: boolean;
}

const ExportWizard: Component<ExportWizardProps> = (props) => {
  const [currentStep, setCurrentStep] = createSignal(1);
  const [selectedYear, setSelectedYear] = createSignal(props.year.toString());
  const [exportFormat, setExportFormat] = createSignal('');
  const [dataCompleteness, setDataCompleteness] = createSignal<DataCompleteness | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);
  const [downloadUrl, setDownloadUrl] = createSignal('');

  const exportFormats = [
    { value: '', label: 'Select export format' },
    { value: 'drake', label: 'Drake Tax Software (.csv)' },
    { value: 'turbotax', label: 'TurboTax (.txf)' },
    { value: 'taxact', label: 'TaxAct (.csv)' },
    { value: 'quickbooks', label: 'QuickBooks (.iif)' },
    { value: 'excel', label: 'Microsoft Excel (.xlsx)' },
    { value: 'csv', label: 'Generic CSV (.csv)' },
    { value: 'pdf', label: 'PDF Report (.pdf)' }
  ];

  const formatInstructions: Record<string, string[]> = {
    drake: [
      '1. Open Drake Tax Software',
      '2. Go to File > Import > Client Data',
      '3. Select the downloaded CSV file',
      '4. Map the imported fields to Schedule C lines',
      '5. Review and verify all imported data',
      '6. Save and continue with your tax preparation'
    ],
    turbotax: [
      '1. Open TurboTax',
      '2. Go to File > Import > From Accounting Software',
      '3. Choose "TXF File" option',
      '4. Browse and select the downloaded .txf file',
      '5. TurboTax will automatically categorize transactions',
      '6. Review the Business Income section (Schedule C)',
      '7. Verify all amounts and categories'
    ],
    taxact: [
      '1. Log in to TaxAct',
      '2. Navigate to Business Income section',
      '3. Select "Import from File"',
      '4. Upload the downloaded CSV file',
      '5. Review imported categories and amounts',
      '6. Continue with tax filing'
    ],
    quickbooks: [
      '1. Open QuickBooks',
      '2. Go to File > Utilities > Import > IIF Files',
      '3. Select the downloaded .iif file',
      '4. Click "Import"',
      '5. Review the Chart of Accounts',
      '6. Run a Profit & Loss report to verify'
    ],
    excel: [
      '1. Open the downloaded Excel file',
      '2. Review the summary sheet with totals',
      '3. Check the detailed transactions sheet',
      '4. Use the pivot tables for analysis',
      '5. Print or save as PDF for your records',
      '6. Share with your CPA if needed'
    ],
    csv: [
      '1. Open the downloaded CSV file in any spreadsheet software',
      '2. Review columns: Date, Description, Category, Amount',
      '3. Import into your preferred accounting software',
      '4. Or provide to your tax preparer',
      '5. Keep a copy for your records'
    ],
    pdf: [
      '1. Open the downloaded PDF file',
      '2. Review the tax summary and Schedule C breakdown',
      '3. Print for your records',
      '4. Provide to your CPA or tax preparer',
      '5. File with your tax documents'
    ]
  };

  const validateData = async () => {
    setLoading(true);
    try {
      const validation = await validateTaxData(parseInt(selectedYear()));
      setDataCompleteness(validation);
    } catch (error) {
      console.error('Failed to validate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep() === 1) {
      setCurrentStep(2);
      await validateData();
    } else if (currentStep() === 2) {
      if (dataCompleteness()?.ready) {
        setCurrentStep(3);
      } else {
        alert('Please resolve all data issues before proceeding');
      }
    } else if (currentStep() === 3) {
      if (!exportFormat()) {
        alert('Please select an export format');
        return;
      }
      await handleExport();
    }
  };

  const handleBack = () => {
    if (currentStep() > 1) {
      setCurrentStep(currentStep() - 1);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportTaxData(parseInt(selectedYear()), exportFormat());
      setDownloadUrl(result.downloadUrl);
      setCurrentStep(4);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const modalStyle = {
    'max-width': '800px',
    width: '90vw'
  };

  const headerStyle = {
    'text-align': 'center',
    'margin-bottom': '2rem'
  };

  const titleStyle = {
    'font-size': '1.75rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0'
  };

  const subtitleStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const progressBarContainerStyle = {
    width: '100%',
    height: '8px',
    background: 'var(--background-color)',
    'border-radius': '4px',
    overflow: 'hidden',
    'margin-bottom': '2rem'
  };

  const progressBarFillStyle = {
    height: '100%',
    background: 'linear-gradient(90deg, var(--primary-color), var(--primary-dark))',
    transition: 'width 0.3s ease',
    width: `${(currentStep() / 4) * 100}%`
  };

  const stepsIndicatorStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'margin-bottom': '2rem'
  };

  const stepStyle = (stepNumber: number) => ({
    flex: '1',
    'text-align': 'center',
    padding: '1rem',
    'border-radius': 'var(--border-radius)',
    background: currentStep() === stepNumber ? 'var(--primary-color)' : 'var(--background-color)',
    color: currentStep() === stepNumber ? 'white' : 'var(--text-muted)',
    'font-weight': currentStep() === stepNumber ? '600' : '400',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease'
  });

  const contentStyle = {
    'min-height': '300px',
    'margin-bottom': '2rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'space-between',
    'padding-top': '1.5rem',
    'border-top': '1px solid var(--border-color)'
  };

  const yearSelectorStyle = {
    'max-width': '200px',
    margin: '0 auto'
  };

  const checklistStyle = {
    'list-style': 'none',
    padding: '0',
    margin: '0',
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem'
  };

  const checklistItemStyle = (isComplete: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: isComplete ? '#d4edda' : '#f8d7da',
    border: `1px solid ${isComplete ? '#28a745' : '#dc3545'}`,
    'border-radius': 'var(--border-radius)',
    color: isComplete ? '#155724' : '#721c24'
  });

  const checkIconStyle = (isComplete: boolean) => ({
    width: '24px',
    height: '24px',
    'border-radius': '50%',
    background: isComplete ? '#28a745' : '#dc3545',
    color: 'white',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-weight': '600',
    'flex-shrink': '0'
  });

  const warningBoxStyle = {
    padding: '1rem 1.5rem',
    background: '#fff3cd',
    border: '1px solid #ffc107',
    'border-radius': 'var(--border-radius)',
    'margin-top': '1rem',
    color: '#856404'
  };

  const formatCardStyle = (isSelected: boolean) => ({
    padding: '1rem',
    'border-radius': 'var(--border-radius)',
    border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
    background: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'var(--surface-color)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    'margin-bottom': '0.75rem'
  });

  const instructionsListStyle = {
    'list-style': 'none',
    padding: '0',
    margin: '1rem 0',
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.5rem'
  };

  const instructionItemStyle = {
    padding: '0.5rem 1rem',
    background: 'var(--background-color)',
    'border-left': '4px solid var(--primary-color)',
    'border-radius': '0 var(--border-radius-sm) var(--border-radius-sm) 0',
    color: 'var(--text-secondary)'
  };

  const downloadBoxStyle = {
    'text-align': 'center',
    padding: '3rem 2rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius)',
    border: '2px dashed var(--border-color)'
  };

  const downloadIconStyle = {
    width: '64px',
    height: '64px',
    margin: '0 auto 1rem',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'font-size': '2rem',
    'font-weight': '600'
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      { value: currentYear.toString(), label: currentYear.toString() },
      { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
      { value: (currentYear - 2).toString(), label: (currentYear - 2).toString() }
    ];
  };

  return (
    <Modal isOpen={true} onClose={props.onClose} title="">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Export Tax Data</h2>
          <p style={subtitleStyle}>Multi-step wizard to export your tax data</p>
        </div>

        <div style={progressBarContainerStyle}>
          <div style={progressBarFillStyle} />
        </div>

        <div style={stepsIndicatorStyle}>
          <div style={stepStyle(1)}>1. Select Year</div>
          <div style={stepStyle(2)}>2. Review Data</div>
          <div style={stepStyle(3)}>3. Choose Format</div>
          <div style={stepStyle(4)}>4. Download</div>
        </div>

        <div style={contentStyle}>
          <Show when={currentStep() === 1}>
            <Card title="Select Tax Year" subtitle="Choose the year you want to export">
              <div style={yearSelectorStyle}>
                <FormSelect
                  label="Tax Year"
                  value={selectedYear()}
                  onChange={setSelectedYear}
                  options={getYearOptions()}
                />
              </div>
              <div style={{ 'margin-top': '2rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
                <p>Select the tax year for which you want to generate an export.</p>
                <p>All transactions for the selected year will be included.</p>
              </div>
            </Card>
          </Show>

          <Show when={currentStep() === 2}>
            <Card title="Data Completeness Check" subtitle="Reviewing your tax data">
              <Show when={loading()}>
                <div style={{ 'text-align': 'center', padding: '2rem' }}>
                  <p>Validating data...</p>
                </div>
              </Show>

              <Show when={!loading() && dataCompleteness()}>
                <ul style={checklistStyle}>
                  <li style={checklistItemStyle(true)}>
                    <div style={checkIconStyle(true)}>✓</div>
                    <div>
                      <strong>{dataCompleteness()!.totalTransactions} total transactions</strong> found for {selectedYear()}
                    </div>
                  </li>
                  <li style={checklistItemStyle(dataCompleteness()!.categorizedTransactions === dataCompleteness()!.totalTransactions)}>
                    <div style={checkIconStyle(dataCompleteness()!.categorizedTransactions === dataCompleteness()!.totalTransactions)}>
                      {dataCompleteness()!.categorizedTransactions === dataCompleteness()!.totalTransactions ? '✓' : '!'}
                    </div>
                    <div>
                      <strong>{dataCompleteness()!.categorizedTransactions} transactions categorized</strong>
                      {dataCompleteness()!.categorizedTransactions < dataCompleteness()!.totalTransactions && (
                        <span> ({dataCompleteness()!.totalTransactions - dataCompleteness()!.categorizedTransactions} uncategorized)</span>
                      )}
                    </div>
                  </li>
                  <li style={checklistItemStyle(dataCompleteness()!.missingCategories.length === 0)}>
                    <div style={checkIconStyle(dataCompleteness()!.missingCategories.length === 0)}>
                      {dataCompleteness()!.missingCategories.length === 0 ? '✓' : '!'}
                    </div>
                    <div>
                      <strong>All accounts mapped to tax categories</strong>
                      {dataCompleteness()!.missingCategories.length > 0 && (
                        <span> ({dataCompleteness()!.missingCategories.length} accounts need mapping)</span>
                      )}
                    </div>
                  </li>
                  <li style={checklistItemStyle(dataCompleteness()!.ready)}>
                    <div style={checkIconStyle(dataCompleteness()!.ready)}>
                      {dataCompleteness()!.ready ? '✓' : '!'}
                    </div>
                    <div>
                      <strong>Data ready for export</strong>
                    </div>
                  </li>
                </ul>

                <Show when={dataCompleteness()!.warnings.length > 0}>
                  <div style={warningBoxStyle}>
                    <strong>Warnings:</strong>
                    <ul style={{ 'margin-top': '0.5rem', 'padding-left': '1.5rem' }}>
                      <For each={dataCompleteness()!.warnings}>
                        {(warning) => <li>{warning}</li>}
                      </For>
                    </ul>
                  </div>
                </Show>
              </Show>
            </Card>
          </Show>

          <Show when={currentStep() === 3}>
            <Card title="Select Export Format" subtitle="Choose your tax software or file format">
              <For each={exportFormats.filter(f => f.value !== '')}>
                {(format) => (
                  <div
                    style={formatCardStyle(exportFormat() === format.value)}
                    onClick={() => setExportFormat(format.value)}
                  >
                    <div style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {format.label}
                    </div>
                  </div>
                )}
              </For>
            </Card>
          </Show>

          <Show when={currentStep() === 4}>
            <Card title="Download Complete" subtitle="Your tax export is ready">
              <div style={downloadBoxStyle}>
                <div style={downloadIconStyle}>↓</div>
                <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600', margin: '0 0 1rem 0' }}>
                  Tax Data Export - {selectedYear()}
                </h3>
                <p style={{ color: 'var(--text-muted)', 'margin-bottom': '2rem' }}>
                  Format: {exportFormats.find(f => f.value === exportFormat())?.label}
                </p>
                <Button onClick={() => window.open(downloadUrl(), '_blank')} size="lg">
                  Download File
                </Button>
              </div>

              <Show when={formatInstructions[exportFormat()]}>
                <div style={{ 'margin-top': '2rem' }}>
                  <h4 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>Import Instructions</h4>
                  <ul style={instructionsListStyle}>
                    <For each={formatInstructions[exportFormat()]}>
                      {(instruction) => (
                        <li style={instructionItemStyle}>{instruction}</li>
                      )}
                    </For>
                  </ul>
                </div>
              </Show>

              <div style={{ 'margin-top': '2rem', padding: '1rem', background: '#e3f2fd', 'border-radius': 'var(--border-radius)' }}>
                <strong style={{ color: '#1565c0' }}>Important:</strong>
                <p style={{ color: '#1565c0', margin: '0.5rem 0 0 0', 'font-size': '0.875rem' }}>
                  Keep a copy of this export with your tax records. Review all imported data carefully
                  before filing your taxes. Consult with a CPA if you have questions.
                </p>
              </div>
            </Card>
          </Show>
        </div>

        <div style={buttonGroupStyle}>
          <div>
            <Show when={currentStep() > 1 && currentStep() < 4}>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            </Show>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="outline" onClick={props.onClose}>
              {currentStep() === 4 ? 'Close' : 'Cancel'}
            </Button>
            <Show when={currentStep() < 4}>
              <Button onClick={handleNext} disabled={loading() || exporting()}>
                {exporting() ? 'Exporting...' : currentStep() === 3 ? 'Export' : 'Next'}
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExportWizard;
