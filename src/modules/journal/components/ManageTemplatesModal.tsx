import { Component, createSignal, createEffect, Index, Show, For } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import { journalTemplateStore, JournalTemplate, JournalTemplateLine } from '../stores/journalTemplateStore';
import { accountsStore } from '../../accounts/stores/accountsStore';
import { useTranslation } from '../../../translations';

interface ManageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageTemplatesModal: Component<ManageTemplatesModalProps> = (props) => {
  const { t } = useTranslation();
  
  const [selectedTemplateId, setSelectedTemplateId] = createSignal<string>('');
  const [isEditing, setIsEditing] = createSignal(false);
  const [showAddTemplate, setShowAddTemplate] = createSignal(false);
  
  // Form data for new/edit template
  const [formData, setFormData] = createSignal({
    name: '',
    description: '',
    category: 'expenses' as JournalTemplate['category']
  });
  
  const [templateLines, setTemplateLines] = createSignal<Omit<JournalTemplateLine, 'id'>[]>([
    {
      accountId: '',
      accountName: '',
      description: '',
      type: 'debit',
      isAmountField: true,
      amountFieldName: t('common.amount', 'Amount')
    },
    {
      accountId: '',
      accountName: '',
      description: '',
      type: 'credit',
      isAmountField: true,
      amountFieldName: t('common.amount', 'Amount')
    }
  ]);
  
  const [validationError, setValidationError] = createSignal<string | null>(null);

  // Reset form when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setSelectedTemplateId('');
      setIsEditing(false);
      setShowAddTemplate(false);
      setValidationError(null);
      resetForm();
    }
  });

  const containerStyle = {
    display: 'flex',
    gap: '1.5rem',
    height: '500px'
  };

  const sidebarStyle = {
    width: '300px',
    'border-right': '1px solid var(--border-color)',
    'padding-right': '1.5rem',
    'overflow-y': 'auto'
  };

  const contentStyle = {
    'flex': '1',
    'overflow-y': 'auto'
  };

  const templateListItemStyle = {
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const lineItemStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 2fr 1fr 1fr 1fr 80px',
    gap: '0.5rem',
    'align-items': 'end',
    'margin-bottom': '0.75rem',
    padding: '0.75rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)'
  };

  const getAccountOptions = () => {
    return accountsStore.accounts.map(account => ({
      value: account.id,
      label: `${account.accountNumber} - ${account.name}`
    }));
  };

  const getCategoryOptions = () => {
    return journalTemplateStore.getAllCategories().map(category => ({
      value: category,
      label: journalTemplateStore.getCategoryDisplayName(category)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'expenses'
    });
    setTemplateLines([
      {
        accountId: '',
        accountName: '',
        description: '',
        type: 'debit',
        isAmountField: true,
        amountFieldName: t('common.amount', 'Amount')
      },
      {
        accountId: '',
        accountName: '',
        description: '',
        type: 'credit',
        isAmountField: true,
        amountFieldName: t('common.amount', 'Amount')
      }
    ]);
  };

  const loadTemplate = (templateId: string) => {
    const template = journalTemplateStore.getTemplateById(templateId);
   
    if (template) {
     
      setFormData({
        name: template.name,
        description: template.description,
        category: template.category
      });


      setTemplateLines(template.lines.map(line => ({
        accountId: line.accountId,
        accountName: line.accountName,
        description: line.description,
        type: line.type,
        isAmountField: line.isAmountField,
        amountFieldName: line.amountFieldName,
        fixedAmount: line.fixedAmount
      })));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsEditing(false);
    setShowAddTemplate(false);
    loadTemplate(templateId);
  };

  const handleAddNew = () => {
    setSelectedTemplateId('');
    setIsEditing(false);
    setShowAddTemplate(true);
    resetForm();
  };

  const handleEdit = () => {
    if (selectedTemplateId() && selectedTemplateId().startsWith('custom_')) {
      setIsEditing(true);
    }
  };

  const handleDelete = () => {
    const templateId = selectedTemplateId();
    if (templateId && templateId.startsWith('custom_')) {
      if (confirm(t('journal.confirmDeleteTemplate', 'Are you sure you want to delete this template?'))) {
        try {
          journalTemplateStore.deleteTemplate(templateId);
          setSelectedTemplateId('');
          resetForm();
        } catch (error) {
          setValidationError(error instanceof Error ? error.message : t('journal.errorDeletingTemplate', 'Error deleting template'));
        }
      }
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLine = (index: number, field: string, value: any) => {
    setTemplateLines(prev => prev.map((line, i) => {
      if (i === index) {
        const updatedLine = { ...line, [field]: value };
        
        // Auto-populate account name when account is selected
        if (field === 'accountId' && typeof value === 'string') {
          const account = accountsStore.getAccountById(value);
          if (account) {
            updatedLine.accountName = account.name;
          }
        }
        
        return updatedLine;
      }
      return line;
    }));
  };

  const addLine = () => {
    setTemplateLines(prev => [...prev, {
      accountId: '',
      accountName: '',
      description: '',
      type: prev.length % 2 === 0 ? 'debit' : 'credit',
      isAmountField: true,
      amountFieldName: t('common.amount', 'Amount')
    }]);
  };

  const removeLine = (index: number) => {
    if (templateLines().length > 2) {
      setTemplateLines(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    setValidationError(null);
    
    const data = formData();
    const lines = templateLines();
    
    // Validation
    if (!data.name.trim()) {
      setValidationError(t('journal.templateNameRequired', 'Template name is required'));
      return;
    }
    
    if (!data.description.trim()) {
      setValidationError(t('journal.templateDescriptionRequired', 'Template description is required'));
      return;
    }
    
    if (lines.length < 2) {
      setValidationError(t('journal.minTwoLinesRequired', 'At least 2 lines are required'));
      return;
    }
    
    // Validate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        setValidationError(t('journal.lineAccountRequired', 'Line {lineNumber}: Account is required').replace('{lineNumber}', (i + 1).toString()));
        return;
      }
      if (!line.description) {
        setValidationError(t('journal.lineDescriptionRequired', 'Line {lineNumber}: Description is required').replace('{lineNumber}', (i + 1).toString()));
        return;
      }
      if (line.isAmountField && !line.amountFieldName) {
        setValidationError(t('journal.amountFieldNameRequired', 'Line {lineNumber}: Amount field name is required').replace('{lineNumber}', (i + 1).toString()));
        return;
      }
    }
    
    const template: Omit<JournalTemplate, 'id'> = {
      name: data.name,
      description: data.description,
      category: data.category,
      lines: lines.map((line, index) => ({
        id: `line_${Date.now()}_${index}`,
        ...line
      }))
    };
    
    try {
      if (isEditing() && selectedTemplateId()) {
        journalTemplateStore.updateTemplate(selectedTemplateId(), template);
      } else {
        const newTemplate = journalTemplateStore.addTemplate(template);
        setSelectedTemplateId(newTemplate.id);
      }
      setIsEditing(false);
      setShowAddTemplate(false);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : t('journal.errorSavingTemplate', 'Error saving template'));
    }
  };

  const groupedTemplates = () => {
    const templates = journalTemplateStore.templates;
    const grouped: Record<string, JournalTemplate[]> = {};
    
    templates.forEach(template => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    
    return grouped;
  };

  return (
    <Modal 
      isOpen={props.isOpen} 
      onClose={props.onClose} 
      title={t('journal.manageTemplates', 'Manage Journal Templates')}
      size="large"
    >
      <div style={containerStyle}>
        {/* Sidebar - Template List */}
        <div style={sidebarStyle}>
          <Button 
            variant="primary" 
            onClick={handleAddNew}
            style={{ width: '100%', 'margin-bottom': '1rem' }}
          >
            + {t('journal.addNewTemplate', 'Add New Template')}
          </Button>
          
          <For each={Object.entries(groupedTemplates())}>
            {([category, templates]) => (
              <>
                <h4 style={{ 
                  margin: '1rem 0 0.5rem 0', 
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)',
                  'text-transform': 'uppercase'
                }}>
                  {journalTemplateStore.getCategoryDisplayName(category as any)}
                </h4>
                <For each={templates}>
                  {(template) => (
                    <div 
                      style={{
                        ...templateListItemStyle,
                        background: selectedTemplateId() === template.id ? 'var(--primary-color)' : 'var(--surface-color)',
                        color: selectedTemplateId() === template.id ? 'white' : 'inherit'
                      }}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div style={{ 'font-weight': '500' }}>{journalTemplateStore.getTranslatedTemplateName(template.name)}</div>
                      <div style={{ 
                        'font-size': '0.75rem', 
                        opacity: '0.8',
                        'margin-top': '0.25rem'
                      }}>
                        {journalTemplateStore.getTranslatedTemplateDesc(template.description)}
                      </div>
                      {template.id.startsWith('custom_') && (
                        <span style={{
                          'font-size': '0.625rem',
                          background: 'rgba(255,255,255,0.2)',
                          padding: '0.125rem 0.5rem',
                          'border-radius': '10px',
                          'margin-top': '0.25rem',
                          display: 'inline-block'
                        }}>
                          {t('journal.custom', 'Custom')}
                        </span>
                      )}
                    </div>
                  )}
                </For>
              </>
            )}
          </For>
        </div>

        {/* Content Area */}
        <div style={contentStyle}>
          <Show when={selectedTemplateId() || showAddTemplate()}>
            <div style={{ 
              display: 'flex', 
              'justify-content': 'space-between', 
              'align-items': 'center',
              'margin-bottom': '1rem'
            }}>
              <h3 style={{ margin: 0 }}>
                {showAddTemplate() ? t('journal.newTemplate', 'New Template') : 
                 isEditing() ? t('journal.editTemplate', 'Edit Template') : 
                 t('journal.templateDetails', 'Template Details')}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Show when={selectedTemplateId() && selectedTemplateId().startsWith('custom_') && !isEditing()}>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDelete} style={{ color: 'var(--danger-color)' }}>
                    {t('common.delete')}
                  </Button>
                </Show>
                <Show when={isEditing() || showAddTemplate()}>
                  <Button variant="secondary" size="sm" onClick={() => {
                    setIsEditing(false);
                    setShowAddTemplate(false);
                    if (selectedTemplateId()) {
                      loadTemplate(selectedTemplateId());
                    }
                  }}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave}>
                    {t('common.save')}
                  </Button>
                </Show>
              </div>
            </div>

            {/* Template Form */}
           
            <div style={{ background: 'var(--background-color)', padding: '1rem', 'border-radius': 'var(--border-radius-sm)' }}>
              <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                <FormInput
                  label={t('journal.templateName', 'Template Name')}
                  value={formData().name}
                  onChange={(value) => updateFormData('name', value)}
                  disabled={!isEditing() && !showAddTemplate()}
                  placeholder={t('journal.enterTemplateName', 'Enter template name')}
                />
                
                <FormSelect
                  label={t('journal.category', 'Category')}
                  value={formData().category}
                  onChange={(value) => updateFormData('category', value)}
                  options={getCategoryOptions()}
                  disabled={!isEditing() && !showAddTemplate()}
                />
              </div>


              
              <FormInput
                label={t('common.description')}
                value={formData().description}
                onChange={(value) => updateFormData('description', value)}
                disabled={!isEditing() && !showAddTemplate()}
                placeholder={t('journal.enterTemplateDescription', 'Enter template description')}
              />
              
              {/* Template Lines */}
              <div style={{ 'margin-top': '2rem' }}>
                <div style={{ 
                  display: 'flex', 
                  'justify-content': 'space-between', 
                  'align-items': 'center',
                  'margin-bottom': '1rem'
                }}>
                  <h4 style={{ margin: 0 }}>{t('journal.templateLines', 'Template Lines')}</h4>
                  <Show when={isEditing() || showAddTemplate()}>
                    <Button variant="secondary" size="sm" onClick={addLine}>
                      + {t('journal.addLine')}
                    </Button>
                  </Show>
                </div>
                
                <div style={{ 'margin-bottom': '0.5rem', 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'grid', 'grid-template-columns': '2fr 2fr 1fr 1fr 1fr 80px', gap: '0.5rem' }}>
                    <div>{t('journal.account')}</div>
                    <div>{t('common.description')}</div>
                    <div>{t('journal.type', 'Type')}</div>
                    <div>{t('journal.amountType', 'Amount Type')}</div>
                    <div>{t('journal.fieldName', 'Field Name')}</div>
                    <div>{t('common.actions')}</div>
                  </div>
                </div>
               
                <For each={templateLines()} fallback={<div>{t('journal.noTemplateLines', 'No template lines')}</div>}>
                  {(line, index) => {
                    const currentLine = line;
                    const currentIndex:number = index();
                    return (
                      <div style={lineItemStyle}>
                        <FormSelect
                          label=""
                          value={currentLine.accountId || ''}
                          onChange={(value) => updateLine(currentIndex, 'accountId', value)}
                          options={[
                            { value: '', label: t('journal.selectAccount', 'Select account...') },
                            ...getAccountOptions()
                          ]}
                          disabled={!isEditing() && !showAddTemplate()}
                        />
                        
                        <FormInput
                          label=""
                          value={currentLine.description || ''}
                          onChange={(value) => updateLine(currentIndex, 'description', value)}
                          placeholder={t('journal.lineDescription')}
                          disabled={!isEditing() && !showAddTemplate()}
                        />
                        
                        <FormSelect
                          label=""
                          value={currentLine.type}
                          onChange={(value) => updateLine(currentIndex, 'type', value)}
                          options={[
                            { value: 'debit', label: t('journal.debit') },
                            { value: 'credit', label: t('journal.credit') }
                          ]}
                          disabled={!isEditing() && !showAddTemplate()}
                        />
                        
                        <FormSelect
                          label=""
                          value={currentLine.isAmountField ? 'variable' : 'fixed'}
                          onChange={(value) => {
                            updateLine(currentIndex, 'isAmountField', value === 'variable');
                            if (value === 'fixed') {
                              updateLine(currentIndex, 'fixedAmount', 0);
                            }
                          }}
                          options={[
                            { value: 'variable', label: t('journal.variable', 'Variable') },
                            { value: 'fixed', label: t('journal.fixed', 'Fixed') }
                          ]}
                          disabled={!isEditing() && !showAddTemplate()}
                        />
                        
                        <Show 
                          when={currentLine.isAmountField}
                          fallback={
                            <FormInput
                              label=""
                              type="number"
                              value={currentLine.fixedAmount?.toString() || '0'}
                              onChange={(value) => updateLine(currentIndex, 'fixedAmount', parseFloat(value) || 0)}
                              placeholder="0.00"
                              disabled={!isEditing() && !showAddTemplate()}
                            />
                          }
                        >
                          <FormInput
                            label=""
                            value={currentLine.amountFieldName || ''}
                            onChange={(value) => updateLine(currentIndex, 'amountFieldName', value)}
                            placeholder={t('journal.fieldNamePlaceholder', 'e.g., Monto')}
                            disabled={!isEditing() && !showAddTemplate()}
                          />
                        </Show>
                        
                        <Show when={isEditing() || showAddTemplate()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeLine(currentIndex)}
                            disabled={templateLines().length <= 2}
                            style={{ color: 'var(--danger-color)' }}
                          >
                            {t('common.remove')}
                          </Button>
                        </Show>
                      </div>
                    );
                  }}
                </For>
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
          </Show>

          <Show when={!selectedTemplateId() && !showAddTemplate()}>
            <div style={{ 
              'text-align': 'center', 
              padding: '3rem',
              color: 'var(--text-muted)'
            }}>
              <p>{t('journal.selectTemplateToView', 'Select a template from the list to view details')}</p>
              <p>{t('journal.orCreateNew', 'or create a new custom template')}</p>
            </div>
          </Show>
        </div>
      </div>
    </Modal>
  );
};

export default ManageTemplatesModal;