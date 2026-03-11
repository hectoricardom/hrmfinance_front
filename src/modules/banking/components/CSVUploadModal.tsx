import { Component, createSignal, For, Show } from 'solid-js';
import { Modal, Button, LoadingBar } from '../../ui';
import { BankAccount, bankConsolidationStore } from '../stores/bankConsolidationStore';
import { useTranslation } from '../../../translations';
import {
  parseCSV,
  validateCSV,
  parseInternationalAmount,
  parseInternationalDate,
  formatDateString
} from '../../../utils/csvUtils';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccount: BankAccount | null;
}

// Date format options
type DateFormatOption = {
  value: string;
  label: string;
  example: string;
  pattern: RegExp;
};

const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  { value: 'auto', label: 'Auto-detect', example: '', pattern: /.*/ },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)', example: '2024-01-15', pattern: /^\d{4}-\d{2}-\d{2}$/ },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)', example: '15/01/2024', pattern: /^\d{2}\/\d{2}\/\d{4}$/ },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)', example: '01/15/2024', pattern: /^\d{2}\/\d{2}\/\d{4}$/ },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '15-01-2024', pattern: /^\d{2}-\d{2}-\d{4}$/ },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY', example: '01-15-2024', pattern: /^\d{2}-\d{2}-\d{4}$/ },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '15.01.2024', pattern: /^\d{2}\.\d{2}\.\d{4}$/ },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD', example: '2024/01/15', pattern: /^\d{4}\/\d{2}\/\d{2}$/ },
  { value: 'D/M/YYYY', label: 'D/M/YYYY (short EU)', example: '5/1/2024', pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
  { value: 'M/D/YYYY', label: 'M/D/YYYY (short US)', example: '1/5/2024', pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
];

// Function to parse date with specific format
const parseDateWithFormat = (dateStr: string, format: string): Date | null => {
  if (!dateStr) return null;

  const cleanDate = dateStr.trim();

  // Auto-detect: use the existing parseInternationalDate
  if (format === 'auto') {
    return parseInternationalDate(cleanDate);
  }

  let day: number, month: number, year: number;

  try {
    switch (format) {
      case 'YYYY-MM-DD':
        [year, month, day] = cleanDate.split('-').map(Number);
        break;
      case 'DD/MM/YYYY':
        [day, month, year] = cleanDate.split('/').map(Number);
        break;
      case 'MM/DD/YYYY':
        [month, day, year] = cleanDate.split('/').map(Number);
        break;
      case 'DD-MM-YYYY':
        [day, month, year] = cleanDate.split('-').map(Number);
        break;
      case 'MM-DD-YYYY':
        [month, day, year] = cleanDate.split('-').map(Number);
        break;
      case 'DD.MM.YYYY':
        [day, month, year] = cleanDate.split('.').map(Number);
        break;
      case 'YYYY/MM/DD':
        [year, month, day] = cleanDate.split('/').map(Number);
        break;
      case 'D/M/YYYY':
        [day, month, year] = cleanDate.split('/').map(Number);
        break;
      case 'M/D/YYYY':
        [month, day, year] = cleanDate.split('/').map(Number);
        break;
      default:
        return parseInternationalDate(cleanDate);
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;

    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
};

// Function to detect date format from sample data
const detectDateFormat = (sampleDates: string[]): string => {
  const validSamples = sampleDates.filter(d => d && d.trim());
  if (validSamples.length === 0) return 'auto';

  // Count matches for each format
  const formatScores: Record<string, number> = {};

  for (const format of DATE_FORMAT_OPTIONS) {
    if (format.value === 'auto') continue;

    let matches = 0;
    for (const dateStr of validSamples) {
      const parsed = parseDateWithFormat(dateStr.trim(), format.value);
      if (parsed && !isNaN(parsed.getTime())) {
        // Additional validation: check if result is reasonable (1900-2100)
        const year = parsed.getFullYear();
        if (year >= 1900 && year <= 2100) {
          matches++;
        }
      }
    }
    formatScores[format.value] = matches;
  }

  // Find best match
  let bestFormat = 'auto';
  let bestScore = 0;

  for (const [format, score] of Object.entries(formatScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestFormat = format;
    }
  }

  // Only return detected format if it matches most samples
  if (bestScore >= validSamples.length * 0.8) {
    return bestFormat;
  }

  return 'auto';
};

const CSVUploadModal: Component<CSVUploadModalProps> = (props) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [uploadResult, setUploadResult] = createSignal<{ success: boolean; message: string; count?: number } | null>(null);
  const [csvData, setCsvData] = createSignal<any[]>([]);
  const [dateFormat, setDateFormat] = createSignal<string>('auto');
  const [detectedDateFormat, setDetectedDateFormat] = createSignal<string>('');
  const [columnMapping, setColumnMapping] = createSignal({
    date: '',
    description: '',
    reference: '',
    debit: '',
    credit: '',
    balance: ''
  });

  const dropZoneStyle = {
    border: `2px dashed ${isDragging() ? 'var(--primary-color)' : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius)',
    padding: '2rem',
    'text-align': 'center' as const,
    'background-color': isDragging() ? 'var(--background-color)' : 'transparent',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  };

  const mappingStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    'margin-top': '1.5rem'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-family': 'inherit'
  };

  const previewStyle = {
    'max-height': '200px',
    'overflow-y': 'auto',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '1rem'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '0.875rem'
  };

  const cellStyle = {
    padding: '0.5rem',
    'border-bottom': '1px solid var(--border-color)',
    'text-align': 'left' as const
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      handleFileUpload(target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadResult({ success: false, message: t('banking.pleaseUploadCSV') });
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;

        // Validate CSV format first
        const validation = validateCSV(csv);
        if (!validation.isValid) {
          setUploadResult({
            success: false,
            message: t('banking.csvValidationError') + ': ' + validation.errors.join(', ')
          });
          setIsProcessing(false);
          return;
        }

        if (validation.rowCount === 0) {
          setUploadResult({ success: false, message: t('banking.csvRequiresHeaderAndData') });
          setIsProcessing(false);
          return;
        }

        // Use the improved parseCSV function (trims fields by default)
        const { headers, rows: parsedRows } = parseCSV(csv, true, true);

        // Convert rows to objects with header keys
        const rows = parsedRows.map(values => {
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        setCsvData(rows);
        setUploadResult({
          success: true,
          message: t('banking.successfullyParsed').replace('{count}', rows.length.toString()),
          count: rows.length
        });

        // Auto-detect common column mappings
        const mapping = { ...columnMapping() };
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          // Date detection
          if (lowerHeader.includes('date') || lowerHeader.includes('fecha')) {
            mapping.date = header;
          }
          // Description detection
          if (lowerHeader.includes('description') || lowerHeader.includes('memo') ||
              lowerHeader.includes('descripcion') || lowerHeader.includes('concepto')) {
            mapping.description = header;
          }
          // Reference detection
          if (lowerHeader.includes('reference') || lowerHeader.includes('check') ||
              lowerHeader.includes('ref') || lowerHeader.includes('numero') ||
              lowerHeader.includes('cheque')) {
            mapping.reference = header;
          }
          // Debit/Credit detection
          if (lowerHeader.includes('debit') || lowerHeader.includes('deposit') ||
              lowerHeader.includes('debito') || lowerHeader.includes('cargo')) {
            mapping.debit = header;
          }
          if (lowerHeader.includes('credit') || lowerHeader.includes('withdrawal') ||
              lowerHeader.includes('credito') || lowerHeader.includes('abono')) {
            if (!mapping.debit) mapping.debit = header;
            else mapping.credit = header;
          }
          // Amount (single column for both debit/credit)
          if ((lowerHeader.includes('amount') || lowerHeader.includes('monto') ||
               lowerHeader.includes('importe')) && !mapping.debit) {
            mapping.debit = header;
          }
          // Balance detection
          if (lowerHeader.includes('balance') || lowerHeader.includes('saldo')) {
            mapping.balance = header;
          }
        });
        setColumnMapping(mapping);

      } catch (error) {
        console.error('CSV parsing error:', error);
        setUploadResult({ success: false, message: t('banking.errorParsingCSV') });
      }
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const updateMapping = (field: string, value: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: value }));

    // Auto-detect date format when date column is selected
    if (field === 'date' && value && csvData().length > 0) {
      const sampleDates = csvData().slice(0, 10).map(row => row[value]);
      const detected = detectDateFormat(sampleDates);
      setDetectedDateFormat(detected);
      if (detected !== 'auto') {
        setDateFormat(detected);
      }
    }
  };

  const getAvailableColumns = () => {
    if (csvData().length === 0) return [];
    return Object.keys(csvData()[0]);
  };

  const processImport = async () => {
    if (!props.bankAccount || csvData().length === 0) return;

    const mapping = columnMapping();
    if (!mapping.date || !mapping.description) {
      setUploadResult({ success: false, message: t('banking.dateDescriptionRequired') });
      return;
    }

    try {
      setIsProcessing(true);

      // Parse all statements using the selected date format
      const selectedFormat = dateFormat();
      const statements = csvData().map(row => {
        // Use the selected date format parser
        const parsedDate = parseDateWithFormat(row[mapping.date], selectedFormat);
        const dateStr = parsedDate ? formatDateString(parsedDate, 'iso') : new Date().toISOString().split('T')[0];

        let debitAmount = 0;
        let creditAmount = 0;

        if (mapping.debit && mapping.credit) {
          // Separate debit and credit columns
          debitAmount = parseInternationalAmount(row[mapping.debit]) || 0;
          creditAmount = parseInternationalAmount(row[mapping.credit]) || 0;
          // Ensure positive values
          debitAmount = Math.abs(debitAmount);
          creditAmount = Math.abs(creditAmount);
        } else if (mapping.debit) {
          // Single amount column - positive = debit, negative = credit
          const amount = parseInternationalAmount(row[mapping.debit]);
          if (!isNaN(amount)) {
            if (amount > 0) {
              debitAmount = amount;
            } else {
              creditAmount = Math.abs(amount);
            }
          }
        }

        return {
          accountId: props.bankAccount!.accountId,
          date:row[mapping.date],
          description: row[mapping.description] || t('banking.importedTransaction'),
          reference: row[mapping.reference] || '',
          debitAmount,
          creditAmount,
          balance: mapping.balance ? (parseInternationalAmount(row[mapping.balance]) || 0) : 0,
          isReconciled: false
        };
      });

      // Use API method which handles duplicate detection on server
      const result = await bankConsolidationStore.addBankStatementsFromCSVWithAPI(statements);

      if (result.added.length > 0 && result.duplicates.length > 0) {
        // Some imported, some duplicates
        setUploadResult({
          success: true,
          message: t('banking.importedWithDuplicatesSkipped')
            .replace('{imported}', result.added.length.toString())
            .replace('{skipped}', result.duplicates.length.toString()),
          count: result.added.length
        });
      } else if (result.added.length === 0 && result.duplicates.length > 0) {
        // All duplicates
        setUploadResult({
          success: false,
          message: t('banking.allTransactionsAreDuplicates')
        });
      } else {
        // All imported successfully
        setUploadResult({
          success: true,
          message: t('banking.successfullyImported').replace('{count}', result.added.length.toString()),
          count: result.added.length
        });
      }

      // Clear form on successful import
      if (result.added.length > 0) {
        setCsvData([]);
        setColumnMapping({
          date: '',
          description: '',
          reference: '',
          debit: '',
          credit: '',
          balance: ''
        });
      }

    } catch (error) {
      console.error('Import error:', error);
      setUploadResult({ success: false, message: t('banking.errorImportingTransactions') });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCsvData([]);
    setUploadResult(null);
    setDateFormat('auto');
    setDetectedDateFormat('');
    setColumnMapping({
      date: '',
      description: '',
      reference: '',
      debit: '',
      credit: '',
      balance: ''
    });
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('banking.importBankStatementCSV')}>
      {props.bankAccount && (
        <div style={{ 
          'margin-bottom': '1.5rem',
          padding: '1rem',
          background: 'var(--background-color)',
          'border-radius': 'var(--border-radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <strong>{t('banking.bankAccount')}:</strong> {props.bankAccount.bankName} - {props.bankAccount.accountNumber}
        </div>
      )}

      {csvData().length === 0 ? (
        <div>
          <div
            style={dropZoneStyle}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csvFileInput')?.click()}
          >
            <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>📄</div>
            <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              {isDragging() ? t('banking.dropCSVHere') : t('banking.clickToUploadCSV')}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              {t('banking.supportedFormat')}
            </div>
          </div>
          
          <input
            id="csvFileInput"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div>
          <h4 style={{ margin: '0 0 1rem 0' }}>{t('banking.mapCSVColumns')}</h4>
          <div style={mappingStyle}>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('banking.dateColumn')} *
              </label>
              <select
                style={selectStyle}
                value={columnMapping().date}
                onChange={(e) => updateMapping('date', e.target.value)}
              >
                <option value="">{t('banking.selectColumn')}</option>
                <For each={getAvailableColumns()}>
                  {(col) => <option value={col}>{col}</option>}
                </For>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('banking.dateFormat', 'Date Format')}
                <Show when={detectedDateFormat() && detectedDateFormat() !== 'auto'}>
                  <span style={{
                    'margin-left': '0.5rem',
                    'font-size': '0.75rem',
                    'font-weight': '400',
                    color: 'var(--success-color, #28a745)',
                    background: '#d4edda',
                    padding: '0.15rem 0.4rem',
                    'border-radius': '4px'
                  }}>
                    ✓ {t('banking.detected', 'Detected')}
                  </span>
                </Show>
              </label>
              <select
                style={selectStyle}
                value={dateFormat()}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <For each={DATE_FORMAT_OPTIONS}>
                  {(fmt) => (
                    <option value={fmt.value}>
                      {fmt.label}{fmt.example ? ` (${fmt.example})` : ''}
                    </option>
                  )}
                </For>
              </select>
              <Show when={columnMapping().date && csvData().length > 0}>
                <div style={{
                  'margin-top': '0.35rem',
                  'font-size': '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('banking.sampleDate', 'Sample')}: <strong>{csvData()[0]?.[columnMapping().date] || '-'}</strong>
                  {dateFormat() !== 'auto' && (
                    <span style={{ 'margin-left': '0.5rem' }}>
                      → {(() => {
                        const parsed = parseDateWithFormat(csvData()[0]?.[columnMapping().date], dateFormat());
                        return parsed ? formatDateString(parsed, 'iso') : t('banking.invalidDate', 'Invalid');
                      })()}
                    </span>
                  )}
                </div>
              </Show>
            </div>

            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('banking.descriptionColumn')} *
              </label>
              <select
                style={selectStyle}
                value={columnMapping().description}
                onChange={(e) => updateMapping('description', e.target.value)}
              >
                <option value="">{t('banking.selectColumn')}</option>
                <For each={getAvailableColumns()}>
                  {(col) => <option value={col}>{col}</option>}
                </For>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('banking.referenceColumn')}
              </label>
              <select
                style={selectStyle}
                value={columnMapping().reference}
                onChange={(e) => updateMapping('reference', e.target.value)}
              >
                <option value="">{t('banking.selectColumn')}</option>
                <For each={getAvailableColumns()}>
                  {(col) => <option value={col}>{col}</option>}
                </For>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('banking.amountDebitColumn')} *
              </label>
              <select
                style={selectStyle}
                value={columnMapping().debit}
                onChange={(e) => updateMapping('debit', e.target.value)}
              >
                <option value="">{t('banking.selectColumn')}</option>
                <For each={getAvailableColumns()}>
                  {(col) => <option value={col}>{col}</option>}
                </For>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('banking.creditColumn')}
              </label>
              <select
                style={selectStyle}
                value={columnMapping().credit}
                onChange={(e) => updateMapping('credit', e.target.value)}
              >
                <option value="">{t('banking.selectColumn')}</option>
                <For each={getAvailableColumns()}>
                  {(col) => <option value={col}>{col}</option>}
                </For>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('banking.balanceColumn')}
              </label>
              <select
                style={selectStyle}
                value={columnMapping().balance}
                onChange={(e) => updateMapping('balance', e.target.value)}
              >
                <option value="">{t('banking.selectColumn')}</option>
                <For each={getAvailableColumns()}>
                  {(col) => <option value={col}>{col}</option>}
                </For>
              </select>
            </div>
          </div>

          <Show when={csvData().length > 0}>
            <div style={previewStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ 'background-color': 'var(--background-color)' }}>
                    <For each={getAvailableColumns().slice(0, 6)}>
                      {(col) => <th style={cellStyle}>{col}</th>}
                    </For>
                  </tr>
                </thead>
                <tbody>
                  <For each={csvData().slice(0, 5)}>
                    {(row) => (
                      <tr>
                        <For each={getAvailableColumns().slice(0, 6)}>
                          {(col) => <td style={cellStyle}>{row[col]}</td>}
                        </For>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
              <Show when={csvData().length > 5}>
                <div style={{ padding: '0.5rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
                  {t('banking.andMoreRows').replace('{count}', (csvData().length - 5).toString())}
                </div>
              </Show>
            </div>
          </Show>
        </div>
      )}

      <Show when={isProcessing()}>
        <div style={{ 'margin-top': '1rem' }}>
          <LoadingBar />
          <div style={{ 'text-align': 'center', 'margin-top': '0.5rem', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            {t('banking.importing')}
          </div>
        </div>
      </Show>

      <Show when={uploadResult()}>
        <div style={{
          padding: '1rem',
          'border-radius': 'var(--border-radius-sm)',
          'margin-top': '1rem',
          background: uploadResult()!.success ? '#d4edda' : '#f8d7da',
          color: uploadResult()!.success ? '#155724' : '#721c24',
          border: `1px solid ${uploadResult()!.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {uploadResult()!.message}
        </div>
      </Show>

      <div style={buttonGroupStyle}>
        <Button variant="secondary" onClick={() => { resetForm(); props.onClose(); }}>
          {t('common.cancel')}
        </Button>
        <Show when={csvData().length > 0}>
          <Button variant="outline" onClick={resetForm}>
            {t('common.reset')}
          </Button>
          <Button
            variant="primary"
            onClick={processImport}
            disabled={isProcessing() || !columnMapping().date || !columnMapping().description}
          >
            {isProcessing() ? t('banking.importing') : t('banking.importTransactions').replace('{count}', csvData().length.toString())}
          </Button>
        </Show>
      </div>
    </Modal>
  );
};

export default CSVUploadModal;