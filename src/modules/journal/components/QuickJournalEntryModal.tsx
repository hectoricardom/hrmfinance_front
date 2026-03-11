import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import { JournalEntry, entryBookStore } from '../stores/entryBookStore';
import { journalTemplateStore, JournalTemplate } from '../stores/journalTemplateStore';
import { useTranslation } from '../../../translations';
import { createStore } from 'solid-js/store';
import { deepClone } from '../../../services/utils';

interface QuickJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InvoiceReserva {
  type: string;
  qty: string;
  arancel: string;
  price: string;
  key: string;
  onlyTariff?: boolean;
}


const QuickJournalEntryModal: Component<QuickJournalEntryModalProps> = (props) => {
  const { t } = useTranslation();
  
  const [selectedTemplateId, setSelectedTemplateId] = createSignal<string>('');
  const [selectedTemplate, setSelectedTemplate] = createStore<any>({form:{}});
  const [lines, setLines] = createSignal<any>('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('');
 const [amounts, setAmount] = createSignal<Record<string, any>>({})
  
  const [formData, setFormData] = createSignal({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    createdBy: t('journal.currentUser', 'Current User')
  });

  const [validationError, setValidationError] = createSignal<string | null>(null);

  // Reset form when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setSelectedTemplateId('');
      setSelectedTemplate("form", null);
      setLines(null);
      setSelectedCategory('');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        createdBy: t('journal.currentUser', 'Current User')
      });
      setValidationError(null);
    }
  });


  

  // Update selected template when template ID changes
  createEffect(() => {
    
  });

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const templatePreviewStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1rem',
    'margin-top': '1rem'
  };

  const lineItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const amountInputStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 150px',
    gap: '1rem',
    'align-items': 'center',
    padding: '0.75rem',
    background: 'var(--background-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '0.5rem'
  };


  const handleSelectedTemplateId = (templateId) => {
   setSelectedTemplateId(templateId);
    if (templateId) {
      const template = journalTemplateStore.getTemplateById(templateId);
      setSelectedTemplate("form", deepClone(template) || null);
      setLines(template?.lines);
      
      // Auto-fill description if template is selected
      if (template && !formData().description) {
        setFormData(prev => ({ ...prev, description: template.description }));
      }
      

     

      // Initialize amounts in the template lines
      if (template) {
        template.lines.forEach((line, index) => {
          if (!line.fixedAmount) {
            setSelectedTemplate("form", "lines", index, "fixedAmount", 0);
            setAmount(prev => ({ ...prev, [line.id]: 0 }));
          }
        });
      }
    }

  }

  const getCategoryOptions = () => {
    return journalTemplateStore.getAllCategories().map(category => ({
      value: category,
      label: journalTemplateStore.getCategoryDisplayName(category)
    }));
  };

  const getTemplateOptions = () => {
    const category = selectedCategory();
    if (!category) return [];
    
    return journalTemplateStore.getTemplatesByCategory(category as any).map(template => ({
      value: template.id,
      label: journalTemplateStore.getTranslatedTemplateName(template.name)
    }));
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };





  const getAmount = (lineId: string) => {
    //const template = selectedTemplate.form;
    //if (!template) return;
    // Find the line being updated
    //const targetLine = template.lines.find(line => line.id === lineId);
    //if (!targetLine) return;
    //return targetLine?.fixedAmount || 0;

    return amounts()?.[lineId] || 0;
  }


  const updateAmount = (lineId: string, amount: number) => {
    const template = selectedTemplate.form;
    if (!template) return;

    // Find the line being updated
    const targetLine = template.lines.find(line => line.id === lineId);
    if (!targetLine) return;

    // If this line has an amount field name, update all lines with the same field name
    /**
    if (targetLine.amountFieldName) {
      template.lines.forEach((line, index) => {
        if (line.amountFieldName === targetLine.amountFieldName) {
          setSelectedTemplate("form", "lines", index, "fixedAmount", amount);
        }
      });
    } else {}
     */
      setAmount(prev => ({ ...prev, [lineId]: amount }));
      // For lines without shared field names, update just this line
      const lineIndex = template.lines.findIndex(line => line.id === lineId);
      if (lineIndex !== -1) {
        //setSelectedTemplate("form", "lines", lineIndex, "fixedAmount", amount);
      }
    

  };


  const calculateTotals = () => {
    const template = selectedTemplate.form;
    if (!template) return { totalDebit: 0, totalCredit: 0, isBalanced: false };

    let totalDebit = 0;
    let totalCredit = 0;

    template?.lines?.forEach(line => {
      const amount = amounts()?.[line.id] || line.fixedAmount || 0;
      if (line.type === 'debit') {
        totalDebit += amount;
      } else {
        totalCredit += amount;
      }
    });

    return {
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    };
  };

  const getUniqueAmountFields = () => {
    const template = selectedTemplate.form;
    if (!template) return [];
    
    // Group lines by amount field name to avoid duplicate inputs
    const amountFields = new Map<string, string>();
    template?.lines?.forEach(line => {
      if (line.isAmountField && line.amountFieldName) {
        amountFields.set(line.amountFieldName, line.id);
      }
    });
    
    return Array.from(amountFields.entries()).map(([fieldName, lineId]) => ({
      fieldName,
      lineId
    }));
  };

  const handleAmountChange = (fieldName: string, value: number) => {
    const template = selectedTemplate.form;
    if (!template) return;

    // Update all lines that use this amount field
    template?.lines?.forEach(line => {
      if (line.amountFieldName === fieldName) {
       // updateAmount(line.id, value);
      }
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setValidationError(null);

    const template = selectedTemplate.form;
    if (!template) {
      setValidationError(t('journal.templateRequired', 'Please select a template'));
      return;
    }

    const data = formData();
    const { totalDebit, totalCredit, isBalanced } = calculateTotals();

    // Validation
    if (!data.description) {
      setValidationError(t('forms.descriptionRequired', 'Description is required'));
      return;
    }

    if (!isBalanced) {
      setValidationError(t('journal.entryNotBalanced', 'Entry is not balanced. Debit: ${debit}, Credit: ${credit}')
        .replace('${debit}', `$${totalDebit.toFixed(2)}`)
        .replace('${credit}', `$${totalCredit.toFixed(2)}`));
      return;
    }

    // Check if all required amounts are provided
    for (const line of template.lines) {
      const amount = amounts()?.[line.id] || 0;
      if (line.isAmountField && amount <= 0) {
        setValidationError(t('journal.amountRequired', 'Amount is required for {field}')
          .replace('{field}', line.amountFieldName || 'line'));
        return;
      }
    }

    const journalEntry: Omit<JournalEntry, 'id'> = {
      entryNumber: entryBookStore.getNextEntryNumber(),
      date: data.date,
      description: data.description,
      reference: data.reference,
      status: 'draft', // Status values are handled by the translation system when displayed
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
      totalDebit,
      totalCredit,
      lines: template.lines.map((line, index) => {
        const amount = amounts()?.[line.id] || 0;
        return {
          id: `jel_${Date.now()}_${index}`,
          accountId: line.accountId,
          accountName: line.accountName,
          description: line.description,
          debitAmount: line.type === 'debit' ? amount : 0,
          creditAmount: line.type === 'credit' ? amount : 0
        };
      })
    };

    try {
      entryBookStore.addJournalEntry(journalEntry);
      props.onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : t('forms.errorOccurred', 'An error occurred'));
    }
  };

  const formatCurrency = (amount: number) => {
    // Use Spanish locale for Spanish-speaking users
    const locale = 'es-ES'; // You can make this dynamic based on user settings
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD' // You can make this configurable based on company settings
    }).format(amount);
  };

  const uniqueAmountFields = getUniqueAmountFields();


  const linesList = (): any => {
    return selectedTemplate?.form?.lines || [];
  }

  return (
    <Modal 
      isOpen={props.isOpen} 
      onClose={props.onClose} 
      title={t('journal.quickEntry', 'Quick Journal Entry')}
    >
      <form onSubmit={handleSubmit}>
        {/* Template Selection */}
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
          <FormSelect
            label={t('journal.selectCategory', 'Select Category')}
            value={selectedCategory()}
            onChange={(value) => {
              setSelectedCategory(value);
              handleSelectedTemplateId(''); // Reset template when category changes
            }}
            options={[
              { value: '', label: t('journal.chooseCategory', 'Choose a category...') },
              ...getCategoryOptions()
            ]}
            required
          />
          
          <FormSelect
            label={t('journal.selectTemplate', 'Select Template')}
            value={selectedTemplateId()}
            onChange={handleSelectedTemplateId}
            options={[
              { value: '', label: t('journal.chooseTemplate', 'Choose a template...') },
              ...getTemplateOptions()
            ]}
            disabled={!selectedCategory()}
            required
          />
        </div>

        {/* Basic Information */}
        <Show when={selectedTemplate.form}>
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
            <FormInput
              label={t('common.date')}
              type="date"
              value={formData().date}
              onChange={(value) => updateFormData('date', value)}
              required
            />
            
            <FormInput
              label={t('journal.reference')}
              value={formData().reference}
              onChange={(value) => updateFormData('reference', value)}
              placeholder={t('journal.enterReferenceNumber', 'Enter reference number')}
            />
          </div>

          <FormInput
            label={t('common.description')}
            value={formData().description}
            onChange={(value) => updateFormData('description', value)}
            placeholder={selectedTemplate?.form?.description || t('journal.enterEntryDescription', 'Enter journal entry description')}
            required
          />


          {/* Template Preview with Amount Inputs */}
          <div style={templatePreviewStyle}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
              {t('journal.entryPreview', 'Entry Preview')}
            </h4>

            
            <For each={linesList()}>
              {(line) => {
                
                return (
                  <div style={{
                    ...lineItemStyle,
                    display: 'grid',
                    'grid-template-columns': '2fr 1fr 1fr',
                    gap: '1rem',
                    'align-items': 'center'
                  }}>
                    <div>
                      <div style={{ 'font-weight': '500' }}>{line.accountName}</div>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                        {journalTemplateStore.getTranslatedLineDesc(line.description)}
                      </div>
                      <div style={{ 
                        'font-size': '0.75rem',
                        'margin-top': '0.25rem',
                        color: line.type === 'debit' ? '#d32f2f' : '#2e7d32',
                        'font-weight': '500'
                      }}>
                        {line.type === 'debit' ? t('journal.debit') : t('journal.credit')}
                      </div>
                    </div>
                    <div>
                      <FormInput
                        label=""
                        type="number"
                        value={getAmount(line.id).toString()}
                        onChange={(value) => updateAmount(line.id, parseFloat(value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={{ 'font-size': '0.875rem' }}
                      />
                    </div>
                   
                    <div style={{ 'text-align': 'right' }}>
                      <div style={{ 
                        'font-weight': '600',
                        color: line.type === 'debit' ? '#d32f2f' : '#2e7d32'
                      }}>
                        {line.type === 'debit' ? 'DR' : 'CR'} {formatCurrency(getAmount(line.id))}
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>

            {/* Totals */}
            <div style={{ 
              'margin-top': '1rem', 
              'padding-top': '1rem', 
              'border-top': '2px solid var(--border-color)',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center'
            }}>
              <div>
                <strong>{t('journal.totalDebit')}: {formatCurrency(calculateTotals().totalDebit)}</strong>
                <span style={{ margin: '0 1rem', color: 'var(--text-muted)' }}>|</span>
                <strong>{t('journal.totalCredit')}: {formatCurrency(calculateTotals().totalCredit)}</strong>
              </div>
              <div style={{ 
                color: calculateTotals().isBalanced ? '#4caf50' : '#f44336',
                'font-weight': '600'
              }}>
                {calculateTotals().isBalanced ? `✓ ${t('journal.balanced', 'Balanced')}` : `⚠️ ${t('journal.notBalanced', 'Not Balanced')}`}
              </div>
            </div>
          </div>
        </Show>

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
            disabled={!selectedTemplate.form || !calculateTotals().isBalanced}
          >
            {t('journal.createQuickEntry', 'Create Quick Entry')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default QuickJournalEntryModal;