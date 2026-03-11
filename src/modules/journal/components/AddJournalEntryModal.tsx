import { Component, createSignal, createEffect, For } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import { JournalEntry, JournalEntryLine, entryBookStore } from '../stores/entryBookStore';
import { accountsStore } from '../../accounts/stores/accountsStore';
import { useTranslation } from '../../../translations';
import { aisleJson, compareJSON, deepClone, devLog, formatFloat, formatNumber, generateShortCode } from '../../../services/utils';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';

interface AddJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editEntry?: JournalEntry | any | null; // Support both legacy and new API structure
}

// Helper to convert timestamp to date string
const timestampToDateStr = (date: number | string): string => {
  if (typeof date === 'number') {
    return new Date(date).toISOString()?.split?.('T')[0];
  }
  if (typeof date === 'string' && date?.includes?.('T')) {
    return date.split('T')[0];
  }
  return date as string;
};

// Helper to convert date string to timestamp
const dateStrToTimestamp = (dateStr: string): number => {
  return new Date(dateStr).getTime();
};

const AddJournalEntryModal: Component<AddJournalEntryModalProps> = (props) => {
  const { t } = useTranslation();

   const [formDataBackup, setFormDataBackUp] = createSignal({})


  const [formData, setFormData] = createSignal({
    entryNumber: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    document: '',
    createdBy: t('journal.currentUser', 'Current User'),
    // Additional API fields
    year: new Date().getFullYear(),
    businessId: '',
    providerId: '',
    payOrCollect: '' as '' | 'pay' | 'collect',
    comprobanteId: ''
  });

  const [lines, setLines] = createSignal<(Partial<JournalEntryLine> & { tempId: string })[]>([]);

  const [validationError, setValidationError] = createSignal<string | null>(null);

  // Initialize form when modal opens or editEntry changes
  createEffect(() => {
    if (props.isOpen) {
      if (props.editEntry) {
        const entry = props.editEntry;
        // Handle both legacy (entryNumber) and new API (id) structure
        const entryId = entry.entryNumber || entry.id || '';
        // Handle date as timestamp or string
        const dateStr = timestampToDateStr(entry.date || entry.entryDate || new Date().toISOString());

        setFormDataBackUp(deepClone(entry));
        setFormData({
          entryNumber: entryId,
          date: dateStr,
          description: entry.description || '',
          reference: entry.reference || '',
          document: entry.document || '',
          createdBy: entry.createdBy || t('journal.currentUser', 'Current User'),
          // Additional API fields
          year: entry.year || new Date(dateStr).getFullYear(),
          businessId: entry.businessId || '',
          providerId: entry.providerId || '',
          payOrCollect: entry.payOrCollect || '',
          comprobanteId: entry.comprobanteId || ''
        });

        // Map lines - handle both lineId and id for line identification
        setLines(entry.lines.map((line: any, index: number) => ({
          ...line,
          lineId: line.lineId || line.id || generateShortCode(9),
          tempId: `line_${entryId}_${index}`,
          // Ensure amount and isDebit are set correctly
          amount: line.amount || line.debitAmount || line.creditAmount || 0,
          isDebit: line.isDebit !== undefined ? line.isDebit : (line.debitAmount > 0),
          debitAmount: line.debitAmount || (line.isDebit ? line.amount : 0) || 0,
          creditAmount: line.creditAmount || (!line.isDebit ? line.amount : 0) || 0,
          document: line.document || '',
          referenceId: line.referenceId || '',
          accountNumber: line.accountNumber || ''
        })));
      } else {
        // Generate next entry number for new entries
        const nextNumber = entryBookStore.getNextEntryNumber();

        setFormData({
          entryNumber: nextNumber,
          date: new Date().toISOString().split('T')[0],
          description: '',
          reference: '',
          document: '',
          createdBy: t('journal.currentUser', 'Current User'),
          year: new Date().getFullYear(),
          businessId: '',
          providerId: '',
          payOrCollect: '',
          comprobanteId: ''
        });
        setLines([
          { tempId: `line_${nextNumber}_0`, lineId: generateShortCode(9), accountId: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0, amount: 0, isDebit: true, document: '' },
          { tempId: `line_${nextNumber}_1`, lineId: generateShortCode(9), accountId: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0, amount: 0, isDebit: false, document: '' }
        ]);
      }
      setValidationError(null);
    }
  });

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const lineItemBxStyle = {
    
    'margin-bottom': '1rem',
    padding: '1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--background-color)'
  }; 

  const lineItemStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 1.5fr 1fr 1fr 1fr 0.5fr',
    gap: '0.75rem',
    'align-items': 'end',
  };

  const lineItemBStyle = {
    display: 'grid',
    'grid-template-columns': '3fr 2fr 0.5fr',
    gap: '0.75rem',
    'align-items': 'end',
  };

  const totalsStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '1rem'
  };

  const getAccountOptions = () => {
    return accountsStore.accounts.map(account => ({
      value: account.id,
      label: `${account.accountNumber} - ${account.name}`
    }));
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLine = (tempId: string, field: string, value: string | number | boolean) => {
    setLines(prev => prev.map((line) => {
      if (line.tempId === tempId) {
        const updatedLine: any = { ...line, [field]: value };

        // Auto-populate account name and number when account is selected
        if (field === 'accountId' && typeof value === 'string') {
          const account = accountsStore.getAccountById(value);
          if (account) {
            updatedLine.accountName = account.name;
            updatedLine.accountNumber = account.accountNumber;
          }
        }

        // Sync amount and isDebit when debit/credit changes
        if (field === 'debitAmount' && typeof value === 'number' && value > 0) {
          updatedLine.amount = value;
          updatedLine.isDebit = true;
          updatedLine.creditAmount = 0;
        }
        if (field === 'creditAmount' && typeof value === 'number' && value > 0) {
          updatedLine.amount = value;
          updatedLine.isDebit = false;
          updatedLine.debitAmount = 0;
        }

        return updatedLine;
      }
      return line;
    }));
  };

  const addLine = () => {
    setLines(prev => [...prev, {
      tempId: `line_${formData()?.entryNumber}_${prev.length}`,
      lineId: generateShortCode(9),
      accountId: '',
      accountName: '',
      accountNumber: '',
      description: '',
      document: '',
      debitAmount: 0,
      creditAmount: 0,
      amount: 0,
      isDebit: true
    }]);
  };

  const removeLine = (tempId: string) => {
    if (lines().length > 2) {
      setLines(prev => prev.filter(line => line.tempId !== tempId));
    }
  };

  const getTotals = () => {
    const totalDebits = lines().reduce((sum, line) => sum + formatFloat(line?.debitAmount || 0), 0);
    const totalCredits = lines().reduce((sum, line) => sum + formatFloat(line?.creditAmount || 0), 0);
    return { totalDebits, totalCredits, isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 };
  };

  const handleSubmit = (e: Event) => {
    try{
    e.preventDefault();
    setValidationError(null);

    const data = formData();
    const entryLines = lines() as JournalEntryLine[];
    const { totalDebits, totalCredits, isBalanced } = getTotals();

    // Validation
    if (!data.description) {
      setValidationError(t('forms.descriptionRequired', 'Description is required'));
      return;
    }

    if (entryLines.length < 2) {
      setValidationError(t('journal.minTwoLinesRequired', 'At least 2 line items are required'));
      return;
    }

    if (!isBalanced) {
      setValidationError(t('journal.entryNotBalanced', 'Entry is not balanced. Debit: ${debit}, Credit: ${credit}')
        .replace('${debit}', `$${totalDebits.toFixed(2)}`)
        .replace('${credit}', `$${totalCredits.toFixed(2)}`));
      return;
    }

    for (let i = 0; i < entryLines.length; i++) {
      const line = entryLines[i];
      if (!line.accountId) {
        setValidationError(t('journal.lineAccountRequired', 'Line {lineNumber}: Account is required')
          .replace('{lineNumber}', (i + 1).toString()));
        return;
      }
      if (line.debitAmount === 0 && line.creditAmount === 0) {
        setValidationError(t('journal.lineAmountRequired', 'Line {lineNumber}: Either debit or credit amount must be provided')
          .replace('{lineNumber}', (i + 1).toString()));
        return;
      }
      if ((line.debitAmount || 0) > 0 && (line.creditAmount || 0) > 0) {
        setValidationError(t('journal.lineBothAmounts', 'Line {lineNumber}: Cannot have both debit and credit amounts')
          .replace('{lineNumber}', (i + 1).toString()));
        return;
      }
    }

   
   

    // Build journal entry with API-compatible structure
    const journalEntry: any = {
      id: data.entryNumber,
      entryNumber: data.entryNumber,
      date: dateStrToTimestamp(data.date),
      year: data.year || new Date(data.date).getFullYear(),
      description: data.description,
      reference: data.reference,
      document: data.document,
      status: 'draft',
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
      entryDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDebits,
      totalCredits,
      // Additional API fields
      businessId: data.businessId,
      providerId: data.providerId,
      payOrCollect: data.payOrCollect,
      comprobanteId: data.comprobanteId || data.entryNumber,
      lines: entryLines.map((line: any, index) => {
        const { tempId, ...lineWithoutTempId } = line;
        return {
          lineId: lineWithoutTempId.lineId || generateShortCode(9),
          accountId: lineWithoutTempId.accountId,
          accountName: lineWithoutTempId.accountName,
          accountNumber: lineWithoutTempId.accountNumber,
          description: lineWithoutTempId.description,
          document: lineWithoutTempId.document || '',
          referenceId: lineWithoutTempId.referenceId || '',
          amount: lineWithoutTempId.amount || lineWithoutTempId.debitAmount || lineWithoutTempId.creditAmount || 0,
          isDebit: lineWithoutTempId.isDebit !== undefined ? lineWithoutTempId.isDebit : (lineWithoutTempId.debitAmount > 0),
          debitAmount: lineWithoutTempId.debitAmount || 0,
          creditAmount: lineWithoutTempId.creditAmount || 0
        };
      })
    };

    // Clean up empty optional fields
    if (!journalEntry.businessId) delete journalEntry.businessId;
    if (!journalEntry.providerId) delete journalEntry.providerId;
    if (!journalEntry.payOrCollect) delete journalEntry.payOrCollect;
    if (!journalEntry.document) delete journalEntry.document;

    let tr = compareJSON(Object.keys(journalEntry|| {}), journalEntry, formDataBackup || {}, { id: 1, referenceHId: 1, createdBy: 1, createdAt: 1, createdTimeStamp: 1 })
   

    try {
      if (props.editEntry) {
        entryBookStore.updateJournalEntry(props.editEntry.id, tr.data);
      } else {
       entryBookStore.addJournalEntry(journalEntry);
      }
      
      let entryNum = entryBookStore.getNextEntryNumber();
      // Reset form
      setFormData({
        entryNumber: entryNum,
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        document: '',
        createdBy: t('journal.currentUser', 'Current User'),
        year: new Date().getFullYear(),
        businessId: '',
        providerId: '',
        payOrCollect: '',
        comprobanteId: ''
      });
      setLines([
        { tempId: `line_${entryNum}_0`, lineId: generateShortCode(9), accountId: '', accountName: '', accountNumber: '', description: '', document: '', referenceId: '', debitAmount: 0, creditAmount: 0, amount: 0, isDebit: true },
        { tempId: `line_${entryNum}_1`, lineId: generateShortCode(9), accountId: '', accountName: '', accountNumber: '', description: '', document: '', referenceId: '', debitAmount: 0, creditAmount: 0, amount: 0, isDebit: false }
      ]);
      
      props.onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : t('forms.errorOccurred', 'An error occurred'));
    }
    }catch(e){
      devLog({e})
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totals = getTotals();

  return (
    <Modal 
      isOpen={props.isOpen} 
      onClose={props.onClose} 
      title={props.editEntry ? t('journal.editEntry') : t('journal.addEntry', 'Add Journal Entry')}
      maxWidth='80vw'
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
          <FormInput
            label={t('journal.entryNumber')}
            value={formData().entryNumber}
            onChange={(value) => updateFormData('entryNumber', value)}
            disabled={!!props.editEntry}
            required
          />
          
          <FormInput
            label={t('common.date')}
            type="date"
            value={formData().date}
            onChange={(value) => updateFormData('date', value)}
            required
          />
        </div>

        <FormInput
          label={t('common.description')}
          value={formData().description}
          onChange={(value) => updateFormData('description', value)}
          placeholder={t('journal.enterEntryDescription', 'Enter journal entry description')}
          required
        />

        <FormInput
          label={t('journal.reference')}
          value={formData().reference}
          onChange={(value) => updateFormData('reference', value)}
          placeholder={t('journal.enterReferenceNumber', 'Enter reference number')}
        />

        <div style={{ 'margin-top': '2rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h4 style={{ margin: '0' }}>{t('journal.entryLines', 'Journal Entry Lines')}</h4>
            <Button type="button" variant="secondary" size="sm" onClick={addLine}>
              {t('journal.addLine', 'Add Line')}
            </Button>
          </div>
          {/**
          <div style={{ 'margin-bottom': '1rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'grid', 'grid-template-columns': '2fr 1.5fr 1fr 1fr 1fr 0.5fr', gap: '0.75rem' }}>
              <div><strong>{t('journal.account')}</strong></div>
              <div><strong>{t('journal.document', 'Doc')}</strong></div>
              <div><strong>{t('journal.debit')}</strong></div>
              <div><strong>{t('journal.credit')}</strong></div>
              <div><strong></strong></div>
              
            </div>
          </div>
           */}

          <For each={lines()} fallback={<div>{t('journal.noLines', 'No lines')}</div>}>
            {(line, i) => {
              const currentLine = line as any;

              return (
                <div style={{...lineItemBxStyle  ,  "align-items": 'center'}} class='centerBx'>
                  <div style={lineItemStyle}>

                  
                    <div>
                      <label style={labelStyle}>
                      Cuenta Contable
                      </label>
                      <SearchableAccountDropdown
                        selectedAccountId={currentLine.accountId}
                        onSelect={(value) => {
                          updateLine(currentLine.tempId, 'accountId', value.accountId);
                        }}
                      />
                    </div>

                   

                    <FormInput
                      label={t('journal.docNumber', 'Documento')}
                      value={currentLine.document || ''}
                      onChange={(value) => updateLine(currentLine.tempId, 'document', value)}
                      placeholder={t('journal.docNumber', 'Doc #')}
                    />

                    <FormInput
                      label="Debito"
                      
                      type="text"
                      value={currentLine.debitAmount?.toString() || '0'}
                      onChange={(value) => {
                        updateLine(currentLine.tempId, 'debitAmount', parseFloat(value) || 0);
                      }}
                      placeholder="0.00"
                    />

                    <FormInput
                      label="Credito"
                      type="text"
                      value={currentLine.creditAmount?.toString() || '0'}
                      onChange={(value) => {
                        updateLine(currentLine.tempId, 'creditAmount', parseFloat(value) || 0);
                      }}
                      placeholder="0.00"
                    />

                    
                  
                    
                  </div>
                  <div style={{...lineItemBStyle, margin: '.85rem 0 0'}}>
                    <FormInput
                      label={t('journal.lineDescription', 'Line description')}
                      value={currentLine.description || ''}
                      onChange={(value) => updateLine(currentLine.tempId, 'description', value)}
                      placeholder={t('journal.lineDescription', 'Line description')}
                    />
                    <FormInput
                      label={t('journal.referenceId', 'Referencia (Id)')}
                      value={currentLine.referenceId || ''}
                      onChange={(value) => updateLine(currentLine.tempId, 'referenceId', value)}
                      placeholder={t('journal.referenceId', 'Referencia')}
                    />
                    <div style={{"align-items": 'center', display: 'flex'}}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(currentLine.tempId)}
                        disabled={lines().length <= 2}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>

          <div style={totalsStyle}>
            <div>
              <strong>{t('journal.totalDebit', 'Total Debit')}: {formatCurrency(totals.totalDebits)}</strong>
            </div>
            <div>
              <strong>{t('journal.totalCredit', 'Total Credit')}: {formatCurrency(totals.totalCredits)}</strong>
            </div>
            <div style={{ 
              color: totals.isBalanced ? '#4caf50' : '#f44336',
              'font-weight': '600'
            }}>
              {totals.isBalanced ? `✓ ${t('journal.balanced')}` : `⚠️ ${t('journal.notBalanced', 'Not Balanced')}`}
            </div>
          </div>
        </div>

        {validationError() && (
          <div style={{
            padding: '1rem',
            'border-radius': 'var(--border-radius-sm)',
            'margin-top': '1rem',
            background: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb'
          }}>
            {validationError()}
          </div>
        )}

        <div style={buttonGroupStyle}>
          <Button variant="secondary" type="button" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={!totals.isBalanced}
          >
            {props.editEntry ? t('journal.updateEntry', 'Update Entry') : t('journal.saveAsDraft', 'Save as Draft')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddJournalEntryModal;





/*

*/