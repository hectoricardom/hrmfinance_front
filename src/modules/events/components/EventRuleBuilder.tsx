import { Component, createSignal, For, Show, createMemo, createEffect, onMount, onCleanup } from 'solid-js';
import { EventAutomationRule, EventType, EventRuleCondition, CustomField } from '../types/eventTypes';
import { getEventTemplate, getAvailableFields } from '../data/eventTemplates';
import { useTranslation } from '../../../translations';
// INACTIVE: CustomFieldsManager - Now using VisualRuleMapper for custom field creation
// import CustomFieldsManager from './CustomFieldsManager';
import EnhancedSmartInput from './EnhancedSmartInput';
import SearchableAccountDropdown from './SearchableAccountDropdown';
import RuleFieldAssistant from './RuleFieldAssistant';
import AutocompleteInput from './AutocompleteInput';
import { accountsStore } from '../../accounts';
import { FormInput } from '../../ui';
import { ruleDraftStore, createAutoSave } from '../stores/ruleDraftStore';


interface EventRuleBuilderProps {
  rule?: EventAutomationRule | null;
  onSave: (rule: Omit<EventAutomationRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const EventRuleBuilder: Component<EventRuleBuilderProps> = (props) => {
  const { t } = useTranslation();
  const isEditing = () => props.rule && props.rule.id;
  const [showDataInterface, setShowDataInterface] = createSignal(false);
  const [selectedExample, setSelectedExample] = createSignal(0);
  const [showCustomFields, setShowCustomFields] = createSignal(false);
  const [customFields, setCustomFields] = createSignal<CustomField[]>(props.rule?.customFields || []);
  const [showFieldAssistant, setShowFieldAssistant] = createSignal(false);
  const [activeLineIndex, setActiveLineIndex] = createSignal<number | null>(null);

  const [formData, setFormData] = createSignal<Partial<EventAutomationRule>>({
    name: props.rule?.name || '',
    description: props.rule?.description || '',
    eventType: props.rule?.eventType || 'invoice_completed',
    isActive: props.rule?.isActive ?? true,
    priority: props.rule?.priority || 100,
    conditions: props.rule?.conditions || [],
    customFields: props.rule?.customFields || [],
    journalEntryTemplate: props.rule?.journalEntryTemplate || {
      description: '',
      reference: '',
      lines: []
    },
    createdBy: props.rule?.createdBy || 'user'
  });

  // Draft state
  const [showDraftDialog, setShowDraftDialog] = createSignal(false);
  const [draftChecked, setDraftChecked] = createSignal(false);

  // Check for existing draft on mount (only for new rules)
  onMount(() => {
    if (!isEditing() && ruleDraftStore.hasDraft()) {
      const draft = ruleDraftStore.draft();
      // Only show dialog if the draft is not for a specific rule being edited
      if (draft && !draft.ruleId) {
        setShowDraftDialog(true);
      }
    }
    setDraftChecked(true);
  });

  // Restore from draft
  const restoreFromDraft = () => {
    const draft = ruleDraftStore.draft();
    if (draft) {
      setFormData(draft.formData);
      setCustomFields(draft.customFields || []);
      if (draft.activeLineIndex !== null) {
        setActiveLineIndex(draft.activeLineIndex);
      }
      setShowFieldAssistant(draft.showFieldAssistant || false);
      setShowCustomFields(draft.showCustomFields || false);
    }
    setShowDraftDialog(false);
  };

  // Dismiss draft dialog
  const dismissDraft = () => {
    ruleDraftStore.clearDraft();
    setShowDraftDialog(false);
  };

  // Setup auto-save
  const triggerAutoSave = createAutoSave(
    formData,
    customFields,
    activeLineIndex,
    showFieldAssistant,
    showCustomFields,
    props.rule?.id
  );

  // Auto-save on changes (after initial load)
  createEffect(() => {
    if (!draftChecked()) return;

    // Access reactive values to track changes
    const _formData = formData();
    const _customFields = customFields();
    const _activeLineIndex = activeLineIndex();
    const _showFieldAssistant = showFieldAssistant();
    const _showCustomFields = showCustomFields();

    // Trigger auto-save
    triggerAutoSave();
  });

  // Get available fields based on selected event type, including custom fields
  const availableFields = createMemo(() => {
    const eventType = formData().eventType;
    if (!eventType) return [];
    
    const baseFields = getAvailableFields(eventType);
    const customFieldsAsFields = customFields().map(field => ({
      path: `custom.${field.name}`,
      definition: {
        type: 'expression',
        description: field.description || `Custom field: ${field.expression}`,
        example: field.expression
      }
    }));
    
    return [...baseFields, ...customFieldsAsFields];
  });

  const eventTemplate = createMemo(() => {
    const eventType = formData().eventType;
    if (!eventType) return null;
    return getEventTemplate(eventType);
  });

  const operators = [
    { value: 'equals', label: t('eventAutomation.operators.equals') },
    { value: 'notEquals', label: t('eventAutomation.operators.notEquals') },
    { value: 'greaterThan', label: t('eventAutomation.operators.greaterThan') },
    { value: 'lessThan', label: t('eventAutomation.operators.lessThan') },
    { value: 'greaterThanOrEqual', label: t('eventAutomation.operators.greaterThanOrEqual') },
    { value: 'lessThanOrEqual', label: t('eventAutomation.operators.lessThanOrEqual') },
    { value: 'contains', label: t('eventAutomation.operators.contains') },
    { value: 'notContains', label: t('eventAutomation.operators.notContains') },
    { value: 'exists', label: t('eventAutomation.operators.exists') },
    { value: 'notExists', label: t('eventAutomation.operators.notExists') }
  ];

   

  const availableAccounts = [
    // Assets
    { id: '1001', name: 'Cash - Operating Account', type: 'Asset' },
    { id: '1002', name: 'Cash - Zelle Account', type: 'Asset' },
    { id: '1003', name: 'Cash - Credit Card Processing', type: 'Asset' },
    { id: '1101', name: 'Accounts Receivable - Customers', type: 'Asset' },
    { id: '1201', name: 'Inventory - Products', type: 'Asset' },
    { id: '1401', name: 'Customs Fees Receivable', type: 'Asset' },
    // Liabilities
    { id: '2001', name: 'Accounts Payable', type: 'Liability' },
    { id: '2301', name: 'Sales Tax Payable', type: 'Liability' },
    { id: '2302', name: 'Customs Fees Payable', type: 'Liability' },
    // Revenue
    { id: '4001', name: 'Sales Revenue - Products', type: 'Revenue' },
    { id: '4101', name: 'Service Revenue - General', type: 'Revenue' },
    { id: '4201', name: 'Transport Service Revenue', type: 'Revenue' },
    // Expenses
    { id: '5001', name: 'Cost of Goods Sold - Products', type: 'Expense' },
    { id: '5201', name: 'Salaries and Wages', type: 'Expense' },
    { id: '5301', name: 'Utilities Expense', type: 'Expense' }
  ];

  const eventTypes: Array<{value: EventType, label: string}> = [
    { value: 'invoice_completed', label: t('eventAutomation.eventTypes.invoice_completed') },
    { value: 'invoice_created', label: t('eventAutomation.eventTypes.invoice_created') },
    { value: 'payment_received', label: t('eventAutomation.eventTypes.payment_received') },
    { value: 'inventory_received', label: t('eventAutomation.eventTypes.inventory_received') },
    { value: 'inventory_sold', label: t('eventAutomation.eventTypes.inventory_sold') },
    { value: 'expense_created', label: t('eventAutomation.eventTypes.expense_created') },
    { value: 'expense_approved', label: t('eventAutomation.eventTypes.expense_approved') },
    { value: 'service_rendered', label: t('eventAutomation.eventTypes.service_rendered') }
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTemplate = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      journalEntryTemplate: {
        ...prev.journalEntryTemplate!,
        [field]: value
      }
    }));
  };

  // Condition management
  const addCondition = () => {
    const newCondition: EventRuleCondition = {
      field: availableFields()[0]?.path || '',
      operator: 'equals',
      value: '',
      dataType: 'string'
    };
    
    setFormData(prev => ({
      ...prev,
      conditions: [...(prev.conditions || []), newCondition]
    }));
  };

  const updateCondition = (index: number, field: keyof EventRuleCondition, value: any) => {
    const conditions = [...(formData().conditions || [])];
    conditions[index] = { ...conditions[index], [field]: value };
    
    // Update dataType based on selected field
    if (field === 'field') {
      const selectedField = availableFields().find(f => f.path === value);
      if (selectedField) {
        conditions[index].dataType = selectedField.definition.type as any;
      }
    }
    
    setFormData(prev => ({ ...prev, conditions }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index) || []
    }));
  };

  // Journal entry line management
  const addJournalLine = () => {
    const newLine = {
      accountExpression: '1001',
      descriptionTemplate: '',
      amountExpression: '',
      documentExpression: '',
      isDebit: true,
      conditions: [] // Initialize with empty conditions array
    };
    
    setFormData(prev => ({
      ...prev,
      journalEntryTemplate: {
        ...prev.journalEntryTemplate!,
        lines: [...(prev.journalEntryTemplate?.lines || []), newLine]
      }
    }));
  };

  const updateJournalLine = (index: number, field: string, value: any) => {
    const lines = [...(formData().journalEntryTemplate?.lines || [])];
    lines[index] = { ...lines[index], [field]: value };
    
    setFormData(prev => ({
      ...prev,
      journalEntryTemplate: {
        ...prev.journalEntryTemplate!,
        lines
      }
    }));
  };

  // Line condition management
  const addLineCondition = (lineIndex: number) => {
    const newCondition: EventRuleCondition = {
      field: availableFields()[0]?.path || '',
      operator: 'greaterThan',
      value: '0',
      dataType: 'number'
    };
    
    const lines = [...(formData().journalEntryTemplate?.lines || [])];
    lines[lineIndex] = { 
      ...lines[lineIndex], 
      conditions: [...(lines[lineIndex].conditions || []), newCondition]
    };
    
    setFormData(prev => ({
      ...prev,
      journalEntryTemplate: {
        ...prev.journalEntryTemplate!,
        lines
      }
    }));
  };

  const updateLineCondition = (lineIndex: number, conditionIndex: number, field: keyof EventRuleCondition, value: any) => {
    const lines = [...(formData().journalEntryTemplate?.lines || [])];
    const conditions = [...(lines[lineIndex].conditions || [])];
    conditions[conditionIndex] = { ...conditions[conditionIndex], [field]: value };
    
    // Update dataType based on selected field
    if (field === 'field') {
      const selectedField = availableFields().find(f => f.path === value);
      if (selectedField) {
        conditions[conditionIndex].dataType = selectedField.definition.type as any;
      }
    }
    
    lines[lineIndex] = { ...lines[lineIndex], conditions };
    
    setFormData(prev => ({
      ...prev,
      journalEntryTemplate: {
        ...prev.journalEntryTemplate!,
        lines
      }
    }));
  };

  const removeLineCondition = (lineIndex: number, conditionIndex: number) => {
    const lines = [...(formData().journalEntryTemplate?.lines || [])];
    lines[lineIndex] = {
      ...lines[lineIndex],
      conditions: lines[lineIndex].conditions?.filter((_, i) => i !== conditionIndex) || []
    };
    
    setFormData(prev => ({
      ...prev,
      journalEntryTemplate: {
        ...prev.journalEntryTemplate!,
        lines
      }
    }));
  };

  // Custom fields management
  const handleCustomFieldAdd = (field: Omit<CustomField, 'id'>) => {
    const newField: CustomField = {
      ...field,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setCustomFields(prev => [...prev, newField]);
  };

  const handleCustomFieldUpdate = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(prev => prev.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const handleCustomFieldRemove = (id: string) => {
    setCustomFields(prev => prev.filter(field => field.id !== id));
  };

  const handleFieldSelect = (fieldPath: string) => {
    // Copy field path to clipboard for easy pasting
    navigator.clipboard.writeText(fieldPath).then(() => {
      // Could show a toast notification here
      console.log('Field path copied:', fieldPath);
    });
  };

  const removeJournalLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      journalEntryTemplate: {
        ...prev.journalEntryTemplate!,
        lines: prev.journalEntryTemplate?.lines.filter((_, i) => i !== index) || []
      }
    }));
  };

  const handleSave = () => {
    const data = formData();
    
    // Basic validation
    if (!data.name || !data.description || !data.eventType) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (!data.journalEntryTemplate?.lines.length) {
      alert('Por favor agregue al menos una línea de asiento contable');
      return;
    }

    // Ensure each line has required fields
    const invalidLines = data.journalEntryTemplate.lines.filter(
      line => !line.accountExpression || !line.amountExpression || !line.descriptionTemplate
    );

    console.log({invalidLines})
    
    if (invalidLines.length > 0) {
      alert('Por favor complete todos los campos de las líneas de asiento contable');
      return;
    }

    // Validate line conditions
    const linesWithInvalidConditions = data.journalEntryTemplate.lines.filter(line => {
      return line.conditions?.some(condition => 
        !condition.field || !condition.operator || 
        (condition.operator !== 'exists' && condition.operator !== 'notExists' && !condition.value)
      );
    });
    

    console.log({linesWithInvalidConditions})
    if (linesWithInvalidConditions.length > 0) {
     // alert('Por favor complete todos los campos de condiciones de línea o elimine las condiciones incompletas');
      // return;
    }

    // Include custom fields in the saved data
    const ruleToSave = {
      ...data,
      customFields: customFields()
    };

    // Clear draft before saving (it will be gone once successfully saved)
    ruleDraftStore.clearDraft();

    props.onSave(ruleToSave as any);
  };

  const modalStyle = {
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
    overflow: 'auto',
    padding: '2rem'
  };

  const modalContentStyle = {
    'background-color': 'white',
    'border-radius': '0.5rem',
    padding: '2rem',
    'max-width': '1440px',
    'max-height': '96vh',
    'overflow-y': 'auto',
    width: '100%'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem'
  };

  const selectStyle = {
    ...inputStyle,
    'background-color': 'white'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500',
    border: '1px solid #d1d5db'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    'background-color': '#3b82f6',
    color: 'white',
    border: 'none'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    'background-color': 'white',
    color: '#374151'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    'background-color': '#ef4444',
    color: 'white',
    border: 'none'
  };

  const sectionStyle = {
    'margin-bottom': '2rem',
    'border-bottom': '1px solid #e5e7eb',
    'padding-bottom': '2rem'
  };



  return (
    <div style={modalStyle}>
      {/* Draft Restore Dialog */}
      <Show when={showDraftDialog()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          'background-color': 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': '1100'
        }}>
          <div style={{
            'background-color': 'white',
            'border-radius': '0.75rem',
            padding: '1.5rem',
            'max-width': '450px',
            width: '90%',
            'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '1rem' }}>
              <span style={{ 'font-size': '2rem' }}>💾</span>
              <div>
                <h3 style={{ 'font-size': '1.125rem', 'font-weight': '700', margin: 0 }}>
                  {t('eventAutomation.draft.foundTitle')}
                </h3>
                <p style={{ 'font-size': '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                  {t('eventAutomation.draft.foundDescription')} {ruleDraftStore.getDraftAge()}
                </p>
              </div>
            </div>

            <div style={{
              'background-color': '#f0f9ff',
              border: '1px solid #bae6fd',
              'border-radius': '0.5rem',
              padding: '0.75rem',
              'margin-bottom': '1rem',
              'font-size': '0.875rem'
            }}>
              <div style={{ 'font-weight': '600', color: '#0369a1', 'margin-bottom': '0.25rem' }}>
                {ruleDraftStore.draft()?.formData.name || t('eventAutomation.draft.untitled')}
              </div>
              <div style={{ color: '#0c4a6e', 'font-size': '0.75rem' }}>
                {ruleDraftStore.draft()?.formData.journalEntryTemplate?.lines?.length || 0} {t('eventAutomation.draft.lines')} &bull; {' '}
                {ruleDraftStore.draft()?.formData.conditions?.length || 0} {t('eventAutomation.draft.conditions')} &bull; {' '}
                {ruleDraftStore.draft()?.customFields?.length || 0} {t('eventAutomation.draft.customFields')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={restoreFromDraft}
                style={{
                  flex: 1,
                  padding: '0.625rem 1rem',
                  'background-color': '#3b82f6',
                  color: 'white',
                  border: 'none',
                  'border-radius': '0.5rem',
                  'font-weight': '600',
                  cursor: 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  gap: '0.5rem'
                }}
              >
                ✓ {t('eventAutomation.draft.restore')}
              </button>
              <button
                onClick={dismissDraft}
                style={{
                  flex: 1,
                  padding: '0.625rem 1rem',
                  'background-color': '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  'border-radius': '0.5rem',
                  'font-weight': '600',
                  cursor: 'pointer'
                }}
              >
                {t('eventAutomation.draft.startFresh')}
              </button>
            </div>
          </div>
        </div>
      </Show>

      <div style={modalContentStyle}>
        {/* Header with auto-save indicator */}
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1.5rem' }}>
          <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', margin: 0 }}>
            {isEditing() ? t('eventAutomation.builder.editTitle') : t('eventAutomation.builder.createTitle')}
          </h2>

          {/* Auto-save status */}
          <Show when={ruleDraftStore.lastSaved()}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.375rem',
              'font-size': '0.75rem',
              color: '#059669',
              'background-color': '#ecfdf5',
              padding: '0.25rem 0.625rem',
              'border-radius': '9999px'
            }}>
              <span style={{ 'font-size': '0.625rem' }}>●</span>
              {t('eventAutomation.draft.autoSaved')}
            </div>
          </Show>
        </div>

        {/* Basic Information */}
        <div style={sectionStyle}>
          <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
            {t('eventAutomation.builder.basicInfo')}
          </h3>
          
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                {t('eventAutomation.builder.ruleName')} *
              </label>
              <input
                type="text"
                style={inputStyle}
                value={formData().name || ''}
                onInput={(e) => updateFormData('name', e.currentTarget.value)}
                placeholder={t('eventAutomation.builder.ruleNamePlaceholder')}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                {t('eventAutomation.builder.priority')}
              </label>
              <input
                type="number"
                style={inputStyle}
                value={formData().priority || 100}
                onInput={(e) => updateFormData('priority', parseInt(e.currentTarget.value) || 100)}
                min="1"
                max="1000"
              />
            </div>
          </div>

          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              {t('eventAutomation.builder.description')} *
            </label>
            <textarea
              style={{ ...inputStyle, height: '4rem', resize: 'vertical' as const }}
              value={formData().description || ''}
              onInput={(e) => updateFormData('description', e.currentTarget.value)}
              placeholder={t('eventAutomation.builder.descriptionPlaceholder')}
            />
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': '1fr auto', gap: '1rem', 'align-items': 'end' }}>
            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                {t('eventAutomation.builder.eventType')} *
              </label>
              <select
                style={selectStyle}
                value={formData().eventType || ''}
                onChange={(e) => updateFormData('eventType', e.currentTarget.value)}
              >
                <For each={eventTypes}>
                  {(event) => <option value={event.value}>{event.label}</option>}
                </For>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={formData().isActive ?? true}
                  onChange={(e) => updateFormData('isActive', e.currentTarget.checked)}
                />
                {t('eventAutomation.builder.active')}
              </label>
            </div>
          </div>  
          {/*  
          <Show when={eventTemplate()}>
            <div style={{ 
              'margin-top': '1rem', 
              padding: '1rem', 
              'background-color': '#f3f4f6', 
              'border-radius': '0.375rem' 
            }}>
              <p style={{ 'font-size': '0.875rem', color: '#4b5563', 'margin-bottom': '0.5rem' }}>
                <strong>{t('eventAutomation.builder.eventDescription')}:</strong> {eventTemplate()?.description}
              </p>
              <button 
                type="button"
                style={{
                  ...secondaryButtonStyle,
                  'font-size': '0.75rem',
                  padding: '0.25rem 0.5rem'
                }}
                onClick={() => setShowDataInterface(!showDataInterface())}
              >
                {showDataInterface() ? '🔽 Ocultar Interfaz de Datos' : '🔼 Mostrar Interfaz de Datos y Ejemplos'}
              </button>
            </div>
          </Show>
          */}
        </div>

        {/* Data Interface & Examples 
        <Show when={showDataInterface() && eventTemplate()}>
          <div style={sectionStyle}>
            <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
              📋 Interfaz de Datos y Ejemplos
            </h3>
            
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '2rem' }}>
             
              <div>
                <h4 style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#1f2937' }}>
                  📊 Campos Disponibles
                </h4>
                <div style={{
                  'max-height': '300px',
                  'overflow-y': 'auto',
                  border: '1px solid #d1d5db',
                  'border-radius': '0.375rem',
                  padding: '0.75rem',
                  'background-color': '#f9fafb'
                }}>
                  <For each={availableFields()}>
                    {(field) => (
                      <div style={{
                        'margin-bottom': '0.5rem',
                        padding: '0.5rem',
                        'background-color': 'white',
                        'border-radius': '0.25rem',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                          <code style={{ 
                            'font-family': 'monospace', 
                            'font-size': '0.8rem', 
                            color: '#059669',
                            'font-weight': '600'
                          }}>
                            {field.path}
                          </code>
                          <span style={{
                            'font-size': '0.7rem',
                            padding: '0.125rem 0.375rem',
                            'background-color': field.definition.type === 'number' ? '#dbeafe' : field.definition.type === 'string' ? '#fef3c7' : field.definition.type === 'boolean' ? '#dcfce7' : '#f3e8ff',
                            color: field.definition.type === 'number' ? '#1e40af' : field.definition.type === 'string' ? '#92400e' : field.definition.type === 'boolean' ? '#166534' : '#7c3aed',
                            'border-radius': '0.25rem',
                            'font-weight': '500'
                          }}>
                            {field.definition.type}
                          </span>
                        </div>
                        <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                          {field.definition.description}
                        </p>
                        <Show when={field.definition.example}>
                          <p style={{ 'font-size': '0.7rem', color: '#374151', margin: '0.25rem 0 0 0', 'font-style': 'italic' }}>
                            Example: <code style={{ 'background-color': '#f3f4f6', padding: '0.125rem 0.25rem', 'border-radius': '0.125rem' }}>
                              {typeof field.definition.example === 'object' 
                                ? JSON.stringify(field.definition.example) 
                                : field.definition.example}
                            </code>
                          </p>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              {// Sample Data Examples /}
              <div>
                <h4 style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#1f2937' }}>
                  💡 Ejemplos de Datos de Muestra
                </h4>
                <Show when={eventTemplate()?.examples && eventTemplate()!.examples.length > 0}>
                  <div style={{ 'margin-bottom': '0.75rem' }}>
                    <For each={eventTemplate()!.examples}>
                      {(example, index) => (
                        <button
                          type="button"
                          style={{
                            ...secondaryButtonStyle,
                            'margin-right': '0.5rem',
                            'margin-bottom': '0.5rem',
                            'font-size': '0.75rem',
                            padding: '0.375rem 0.75rem',
                            'background-color': selectedExample() === index() ? '#3b82f6' : 'white',
                            color: selectedExample() === index() ? 'white' : '#374151',
                            border: selectedExample() === index() ? 'none' : '1px solid #d1d5db'
                          }}
                          onClick={() => setSelectedExample(index())}
                        >
                          {example.name}
                        </button>
                      )}
                    </For>
                  </div>
                  
                  <Show when={eventTemplate()?.examples[selectedExample()]}>
                    <div style={{
                      border: '1px solid #d1d5db',
                      'border-radius': '0.375rem',
                      padding: '0.75rem',
                      'background-color': '#f9fafb'
                    }}>
                      <h5 style={{ 'font-size': '0.875rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                        {eventTemplate()!.examples[selectedExample()].name}
                      </h5>
                      <p style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '0.75rem' }}>
                        {eventTemplate()!.examples[selectedExample()].description}
                      </p>
                      <div style={{
                        'background-color': '#1f2937',
                        color: '#f9fafb',
                        padding: '0.75rem',
                        'border-radius': '0.25rem',
                        'font-family': 'monospace',
                        'font-size': '0.75rem',
                        'overflow-x': 'auto',
                        'white-space': 'pre'
                      }}>
                        {JSON.stringify({ data: eventTemplate()!.examples[selectedExample()].sampleData }, null, 2)}
                      </div>
                      <div style={{
                        'margin-top': '0.5rem',
                        padding: '0.5rem',
                        'background-color': '#fef3c7',
                        'border-radius': '0.25rem'
                      }}>
                        <p style={{ 'font-size': '0.7rem', color: '#92400e' }}>
                          💡 <strong>Consejo de Uso:</strong> Copia rutas de campos como <code>data.totalAmount</code> o <code>data.customerName</code> para usar en condiciones y plantillas de asientos contables.
                        </p>
                      </div>
                    </div>
                  </Show>
                </Show>
              </div>
            </div>
          </div>
        </Show>
        */}


        {/* Conditions */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>
              {t('eventAutomation.builder.conditions.title')}
            </h3>
            <button style={secondaryButtonStyle} onClick={addCondition}>
              + {t('eventAutomation.builder.conditions.add')}
            </button>
          </div>

          <Show when={(formData().conditions?.length || 0) === 0}>
            <p style={{ color: '#6b7280', 'font-style': 'italic' }}>
              {t('eventAutomation.builder.conditions.noConditions')} {formData().eventType} events
            </p>
          </Show>

          <For each={formData().conditions || []}>
            {(condition, index) => (
              <div style={{
                border: '1px solid #d1d5db',
                'border-radius': '0.375rem',
                padding: '1rem',
                'margin-bottom': '1rem'
              }}>
                <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr 1fr auto', gap: '1rem', 'align-items': 'end' }}>
                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      {t('eventAutomation.builder.conditions.field')}
                    </label>
                    <select
                      style={selectStyle}
                      value={condition.field}
                      onChange={(e) => updateCondition(index(), 'field', e.currentTarget.value)}
                    >
                      <option value="">{t('eventAutomation.builder.conditions.selectField')}</option>
                      <For each={availableFields()}>
                        {(field) => (
                          <option value={field.path}>
                            {field.path} ({field.definition.description})
                          </option>
                        )}
                      </For>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      {t('eventAutomation.builder.conditions.operator')}
                    </label>
                    <select
                      style={selectStyle}
                      value={condition.operator}
                      onChange={(e) => updateCondition(index(), 'operator', e.currentTarget.value)}
                    >
                      <For each={operators}>
                        {(op) => <option value={op.value}>{op.label}</option>}
                      </For>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      {t('eventAutomation.builder.conditions.value')}
                    </label>
                    <Show 
                      when={condition.operator !== 'exists' && condition.operator !== 'notExists'}
                      fallback={<input type="text" style={inputStyle} value="N/A" disabled />}
                    >
                      <FormInput
                        type={condition.dataType === 'number' ? 'number' : 'text'}
                        style={inputStyle}
                        value={condition.value}
                        onChange={(e) => updateCondition(index(), 'value', 
                          condition.dataType === 'number' 
                            ? parseFloat(e) || 0 
                            : e
                        )}
                        placeholder={condition.dataType === 'number' ? '0' : t('eventAutomation.builder.conditions.enterValue')}
                      />
                    </Show>
                  </div>

                  <div>
                    <button style={dangerButtonStyle} onClick={() => removeCondition(index())}>
                      {t('eventAutomation.builder.conditions.remove')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Custom Fields Section - Read-only display (creation via VisualRuleMapper) */}
        <Show when={customFields().length > 0}>
          <div style={{
            'margin-bottom': '1.5rem',
            padding: '1rem',
            'background-color': '#faf5ff',
            'border': '1px solid #e9d5ff',
            'border-radius': '0.5rem'
          }}>
            <h4 style={{
              'font-size': '0.875rem',
              'font-weight': '600',
              color: '#7c3aed',
              'margin-bottom': '0.75rem',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              ⚙️ Campos Personalizados ({customFields().length})
            </h4>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
              <For each={customFields()}>
                {(field) => (
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    padding: '0.5rem 0.75rem',
                    'background-color': 'white',
                    'border': '1px solid #e5e7eb',
                    'border-radius': '0.375rem',
                    'font-size': '0.8rem'
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                      <span style={{
                        'font-weight': '600',
                        color: '#7c3aed',
                        'background-color': '#f3e8ff',
                        padding: '0.125rem 0.5rem',
                        'border-radius': '0.25rem'
                      }}>
                        {field.name}
                      </span>
                      <code style={{
                        'font-size': '0.7rem',
                        color: '#6b7280',
                        'background-color': '#f3f4f6',
                        padding: '0.125rem 0.375rem',
                        'border-radius': '0.25rem'
                      }}>
                        {field.expression}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCustomFieldRemove(field.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        'font-size': '0.75rem'
                      }}
                      title="Eliminar campo"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </For>
            </div>
            <p style={{
              'font-size': '0.7rem',
              color: '#9ca3af',
              'margin-top': '0.5rem',
              'font-style': 'italic'
            }}>
              💡 Usa el Field Assistant → Visual para agregar más campos personalizados
            </p>
          </div>
        </Show>

        {/* ============================================================
         * INACTIVE COMPONENT: CustomFieldsManager
         * Moved to inactive - Now using VisualRuleMapper for custom field creation
         *
         * <Show when={showCustomFields()}>
         *   <div style={{ 'margin-bottom': '2rem' }}>
         *     <CustomFieldsManager
         *       customFields={customFields()}
         *       availableFields={availableFields()}
         *       eventType={formData().eventType!}
         *       onAdd={handleCustomFieldAdd}
         *       onUpdate={handleCustomFieldUpdate}
         *       onRemove={handleCustomFieldRemove}
         *     />
         *   </div>
         * </Show>
         * ============================================================ */}

        {/* Journal Entry Template */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>
              {t('eventAutomation.builder.journalTemplate.title')}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                style={{
                  ...primaryButtonStyle,
                  'font-size': '0.875rem',
                  'background': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                }}
                onClick={() => setShowFieldAssistant(true)}
              >
                🚀 Field Assistant
              </button>
              {/* INACTIVE BUTTON: Custom Fields Manager toggle
              <button
                type="button"
                style={{
                  ...secondaryButtonStyle,
                  'font-size': '0.875rem'
                }}
                onClick={() => setShowCustomFields(!showCustomFields())}
              >
                {showCustomFields() ? '🔽 Ocultar Campos Personalizados' : '🛠️ Gestionar Campos Personalizados'}
              </button>
             
              <button
                style={{
                  ...secondaryButtonStyle,
                  'font-size': '0.875rem'
                }}
                onClick={() => setShowDataInterface(!showDataInterface())}
              >
                {showDataInterface() ? '🔽 Ocultar Interfaz de Datos' : '📊 Mostrar Interfaz de Datos'}
              </button>
               */}
            </div>
          </div>


          {/* Template Fields
          <Show when={formData().eventType}>
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
              <EnhancedSmartInput
                label={`${t('eventAutomation.builder.journalTemplate.description')} *`}
                value={formData().journalEntryTemplate?.description || ''}
                onChange={(value) => updateTemplate('description', value)}
                eventType={formData().eventType!}
                placeholder={t('eventAutomation.builder.journalTemplate.descriptionPlaceholder')}
                type="template"
                helpText="Usa {data.field} para insertar datos del evento en descripciones"
                required={true}
                customFields={customFields()}
              />
              
              <EnhancedSmartInput
                label={`${t('eventAutomation.builder.journalTemplate.reference')} *`}
                value={formData().journalEntryTemplate?.reference || ''}
                onChange={(value) => updateTemplate('reference', value)}
                eventType={formData().eventType!}
                placeholder={t('eventAutomation.builder.journalTemplate.referencePlaceholder')}
                type="template"
                helpText="Plantilla para referencia del asiento contable"
                required={true}
                customFields={customFields()}
              />
            </div>
          </Show>
          */}

          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h4 style={{ 'font-size': '1rem', 'font-weight': '600' }}>
              {t('eventAutomation.builder.journalTemplate.lines')}
            </h4>
            <button style={secondaryButtonStyle} onClick={addJournalLine}>
              + {t('eventAutomation.builder.journalTemplate.addLine')}
            </button>
          </div>

          {/* Empty State */}
          <Show when={(formData().journalEntryTemplate?.lines.length || 0) === 0}>
            <div style={{
              'text-align': 'center',
              padding: '2rem',
              'background': 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              'border-radius': '0.75rem',
              'border': '2px dashed #cbd5e1',
              'margin-bottom': '1rem'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📋</div>
              <p style={{ color: '#64748b', 'font-size': '0.875rem', margin: 0 }}>
                {t('eventAutomation.builder.journalTemplate.noLines')}
              </p>
              <p style={{ color: '#94a3b8', 'font-size': '0.75rem', 'margin-top': '0.25rem' }}>
                Agrega líneas de débito y crédito para crear el asiento
              </p>
            </div>
          </Show>

          {/* Journal Lines - Modern Card Design */}
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
            <For each={formData().journalEntryTemplate?.lines || []}>
              {(line, index) => (
                <div style={{
                  'border-radius': '0.75rem',
                  'box-shadow': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  'background-color': 'white',
                  border: `2px solid ${line.isDebit ? '#10b981' : '#f59e0b'}`
                }}>
                  {/* Line Header - Color coded */}
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    padding: '0.75rem 1rem',
                    'background': line.isDebit
                      ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                      : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    'border-bottom': `1px solid ${line.isDebit ? '#a7f3d0' : '#fde68a'}`
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                      {/* Line Number Badge */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        'border-radius': '50%',
                        'background-color': line.isDebit ? '#10b981' : '#f59e0b',
                        color: 'white',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-weight': '700',
                        'font-size': '0.875rem'
                      }}>
                        {index() + 1}
                      </div>

                      {/* Type Toggle - Modern Pills */}
                      <div style={{
                        display: 'flex',
                        'background-color': 'rgba(255,255,255,0.8)',
                        'border-radius': '9999px',
                        padding: '2px',
                        gap: '2px'
                      }}>
                        <button
                          type="button"
                          onClick={() => updateJournalLine(index(), 'isDebit', true)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            'border-radius': '9999px',
                            border: 'none',
                            'font-size': '0.75rem',
                            'font-weight': '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            'background-color': line.isDebit ? '#10b981' : 'transparent',
                            color: line.isDebit ? 'white' : '#6b7280'
                          }}
                        >
                          ↓ Débito
                        </button>
                        <button
                          type="button"
                          onClick={() => updateJournalLine(index(), 'isDebit', false)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            'border-radius': '9999px',
                            border: 'none',
                            'font-size': '0.75rem',
                            'font-weight': '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            'background-color': !line.isDebit ? '#f59e0b' : 'transparent',
                            color: !line.isDebit ? 'white' : '#6b7280'
                          }}
                        >
                          ↑ Crédito
                        </button>
                      </div>

                      {/* Account Preview */}
                      <Show when={line.accountExpression}>
                        <span style={{
                          'font-size': '0.75rem',
                          color: '#64748b',
                          'background-color': 'rgba(255,255,255,0.8)',
                          padding: '0.25rem 0.5rem',
                          'border-radius': '0.375rem'
                        }}>
                          Cuenta: <strong>{line.accountExpression}</strong>
                        </span>
                      </Show>
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => removeJournalLine(index())}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        color: '#dc2626',
                        padding: '0.375rem 0.625rem',
                        'border-radius': '0.375rem',
                        cursor: 'pointer',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>✕</span> Eliminar
                    </button>
                  </div>

                  {/* Line Body */}
                  <div style={{ padding: '1rem' }}>
                    {/* Account Selection */}
                    <div style={{ 'margin-bottom': '1rem' }}>
                      <label style={{
                        display: 'block',
                        'font-size': '0.75rem',
                        'font-weight': '600',
                        color: '#374151',
                        'margin-bottom': '0.375rem',
                        'text-transform': 'uppercase',
                        'letter-spacing': '0.025em'
                      }}>
                        {t('eventAutomation.builder.journalTemplate.account')}
                      </label>
                      <SearchableAccountDropdown
                        selectedAccountId={line.accountId}
                        onSelect={(accountId) => {
                          updateJournalLine(index(), 'accountExpression', accountId?.accountNumber)
                          updateJournalLine(index(), 'accountId', accountId?.id)
                        }}
                        placeholder={t('eventAutomation.builder.journalTemplate.selectAccount')}
                      />
                    </div>

                    {/* Description, Amount & Document - Three Columns */}
                    <Show when={formData().eventType}>
                      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem' }}>
                        {/* Description */}
                        <div>
                          <label style={{
                            display: 'block',
                            'font-size': '0.75rem',
                            'font-weight': '600',
                            color: '#374151',
                            'margin-bottom': '0.375rem',
                            'text-transform': 'uppercase',
                            'letter-spacing': '0.025em'
                          }}>
                            📝 Descripción
                          </label>
                          <AutocompleteInput
                            value={line.descriptionTemplate}
                            onChange={(value) => updateJournalLine(index(), 'descriptionTemplate', value)}
                            eventType={formData().eventType!}
                            placeholder="ej: Venta {data.customerName}"
                            type="template"
                            customFields={customFields()}
                          />
                        </div>

                        {/* Amount */}
                        <div>
                          <label style={{
                            display: 'block',
                            'font-size': '0.75rem',
                            'font-weight': '600',
                            color: '#374151',
                            'margin-bottom': '0.375rem',
                            'text-transform': 'uppercase',
                            'letter-spacing': '0.025em'
                          }}>
                            💰 Monto
                          </label>
                          <AutocompleteInput
                            value={line.amountExpression}
                            onChange={(value) => updateJournalLine(index(), 'amountExpression', value)}
                            eventType={formData().eventType!}
                            placeholder="ej: data.total"
                            type="expression"
                            customFields={customFields()}
                          />
                        </div>

                        {/* Document */}
                        <div>
                          <label style={{
                            display: 'block',
                            'font-size': '0.75rem',
                            'font-weight': '600',
                            color: '#374151',
                            'margin-bottom': '0.375rem',
                            'text-transform': 'uppercase',
                            'letter-spacing': '0.025em'
                          }}>
                            📄 Documento
                          </label>
                          <AutocompleteInput
                            value={line.documentExpression || ''}
                            onChange={(value) => updateJournalLine(index(), 'documentExpression', value)}
                            eventType={formData().eventType!}
                            placeholder="ej: {data.invoice}"
                            type="template"
                            customFields={customFields()}
                          />
                        </div>
                      </div>
                    </Show>

                    {/* Line Conditions - Collapsible */}
                    <div style={{
                      'margin-top': '1rem',
                      'background-color': '#f8fafc',
                      'border-radius': '0.5rem',
                      overflow: 'hidden'
                    }}>
                      {/* Conditions Header */}
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        padding: '0.625rem 0.75rem',
                        'background-color': '#f1f5f9',
                        'border-bottom': (line.conditions?.length || 0) > 0 ? '1px solid #e2e8f0' : 'none'
                      }}>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                          <span style={{ 'font-size': '0.8rem' }}>🔒</span>
                          <span style={{
                            'font-size': '0.75rem',
                            'font-weight': '600',
                            color: '#475569'
                          }}>
                            Condiciones
                          </span>
                          <Show when={(line.conditions?.length || 0) > 0}>
                            <span style={{
                              'background-color': '#3b82f6',
                              color: 'white',
                              'font-size': '0.625rem',
                              padding: '0.125rem 0.375rem',
                              'border-radius': '9999px',
                              'font-weight': '600'
                            }}>
                              {line.conditions?.length}
                            </span>
                          </Show>
                        </div>
                        <button
                          type="button"
                          onClick={() => addLineCondition(index())}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            border: 'none',
                            color: 'white',
                            padding: '0.25rem 0.625rem',
                            'border-radius': '0.375rem',
                            'font-size': '0.7rem',
                            'font-weight': '600',
                            cursor: 'pointer',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.25rem'
                          }}
                        >
                          + Agregar
                        </button>
                      </div>

                      {/* Conditions Content */}
                      <Show when={(line.conditions?.length || 0) === 0}>
                        <div style={{
                          padding: '0.75rem',
                          'text-align': 'center',
                          color: '#94a3b8',
                          'font-size': '0.75rem'
                        }}>
                          Sin condiciones - Esta línea siempre se incluirá
                        </div>
                      </Show>

                      <Show when={(line.conditions?.length || 0) > 0}>
                        <div style={{ padding: '0.75rem', display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                          <For each={line.conditions || []}>
                            {(condition, conditionIndex) => (
                              <div style={{
                                display: 'flex',
                                'align-items': 'center',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                'background-color': 'white',
                                'border-radius': '0.375rem',
                                border: '1px solid #e2e8f0'
                              }}>
                                {/* Field */}
                                <div style={{ flex: 2 }}>
                                  <AutocompleteInput
                                    value={condition.field}
                                    onChange={(value) => {
                                      updateLineCondition(index(), conditionIndex(), 'field', value);
                                      const selectedField = availableFields().find(f => f.path === value);
                                      if (selectedField) {
                                        updateLineCondition(index(), conditionIndex(), 'dataType', selectedField.definition.type);
                                      }
                                    }}
                                    eventType={formData().eventType!}
                                    placeholder="Campo"
                                    type="expression"
                                    customFields={customFields()}
                                    style={{ 'font-size': '0.75rem' }}
                                  />
                                </div>

                                {/* Operator */}
                                <div style={{ flex: 1 }}>
                                  <select
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      'border-radius': '0.375rem',
                                      'font-size': '0.75rem',
                                      'background-color': 'white'
                                    }}
                                    value={condition.operator}
                                    onChange={(e) => updateLineCondition(index(), conditionIndex(), 'operator', e.currentTarget.value)}
                                  >
                                    <For each={operators}>
                                      {(op) => <option value={op.value}>{op.label}</option>}
                                    </For>
                                  </select>
                                </div>

                                {/* Value */}
                                <div style={{ flex: 1 }}>
                                  <Show
                                    when={condition.operator !== 'exists' && condition.operator !== 'notExists'}
                                    fallback={
                                      <input
                                        type="text"
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          border: '1px solid #d1d5db',
                                          'border-radius': '0.375rem',
                                          'font-size': '0.75rem',
                                          'background-color': '#f3f4f6',
                                          color: '#9ca3af'
                                        }}
                                        value="N/A"
                                        disabled
                                      />
                                    }
                                  >
                                    <AutocompleteInput
                                      value={String(condition.value || '')}
                                      onChange={(value) => updateLineCondition(index(), conditionIndex(), 'value',
                                        condition.dataType === 'number' ? parseFloat(value) || 0 : value
                                      )}
                                      eventType={formData().eventType!}
                                      placeholder={condition.dataType === 'number' ? '0' : 'Valor'}
                                      type="expression"
                                      customFields={customFields()}
                                      style={{ 'font-size': '0.75rem' }}
                                    />
                                  </Show>
                                </div>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => removeLineCondition(index(), conditionIndex())}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '0.375rem',
                                    'border-radius': '0.25rem',
                                    'font-size': '0.875rem',
                                    'line-height': 1
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Line Footer - Summary */}
                  <Show when={line.amountExpression || line.documentExpression}>
                    <div style={{
                      padding: '0.5rem 1rem',
                      'background-color': '#f8fafc',
                      'border-top': '1px solid #e2e8f0',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.75rem',
                      'font-size': '0.75rem',
                      color: '#64748b'
                    }}>
                      <span>Vista previa:</span>
                      <Show when={line.amountExpression}>
                        <code style={{
                          'background-color': '#e2e8f0',
                          padding: '0.125rem 0.375rem',
                          'border-radius': '0.25rem',
                          'font-size': '0.7rem'
                        }}>
                          {line.isDebit ? 'Débito' : 'Crédito'}: {line.amountExpression}
                        </code>
                      </Show>
                      <Show when={line.documentExpression}>
                        <code style={{
                          'background-color': '#dbeafe',
                          padding: '0.125rem 0.375rem',
                          'border-radius': '0.25rem',
                          'font-size': '0.7rem',
                          color: '#1e40af'
                        }}>
                          📄 {line.documentExpression}
                        </code>
                      </Show>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          'justify-content': 'space-between', 
          'align-items': 'center',
          'border-top': '1px solid #e5e7eb',
          'padding-top': '1.5rem',
          'margin-top': '2rem'
        }}>
          <div>
            <Show when={customFields().length > 0 || formData().journalEntryTemplate?.lines.length > 0}>
              <p style={{ 'font-size': '0.875rem', color: '#6b7280' }}>
                ⚠️ Recuerda guardar la regla para persistir todos los cambios incluyendo campos personalizados
              </p>
            </Show>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={secondaryButtonStyle} onClick={props.onCancel}>
              {t('eventAutomation.builder.cancel')}
            </button>
            <button style={primaryButtonStyle} onClick={handleSave}>
              {isEditing() ? t('eventAutomation.builder.update') : t('eventAutomation.builder.save')}
            </button>
          </div>
        </div>
      </div>

      {/* Field Assistant Modal */}
      <Show when={showFieldAssistant()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          'background-color': 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1100,
          padding: '2rem'
        }}>
          <div style={{ width: '100%', 'max-width': '1440px', 'max-height': '96vh' }}>
            <RuleFieldAssistant
              eventType={formData().eventType || 'invoice_completed'}
              journalLines={formData().journalEntryTemplate?.lines || []}
              onAddCondition={(fieldPath) => {
                const newCondition: EventRuleCondition = {
                  field: fieldPath,
                  operator: 'exists',
                  value: '',
                  dataType: 'string'
                };
                setFormData(prev => ({
                  ...prev,
                  conditions: [...(prev.conditions || []), newCondition]
                }));
              }}
              onSetDescription={(template) => {
                const currentDesc = formData().journalEntryTemplate?.description || '';
                updateTemplate('description', currentDesc ? `${currentDesc} ${template}` : template);
              }}
              onSetAmount={(expression, lineIndex) => {
                const lines = formData().journalEntryTemplate?.lines || [];
                if (lineIndex >= 0 && lineIndex < lines.length) {
                  updateJournalLine(lineIndex, 'amountExpression', expression);
                }
              }}
              onSetLineDescription={(template, lineIndex) => {
                const lines = formData().journalEntryTemplate?.lines || [];
                if (lineIndex >= 0 && lineIndex < lines.length) {
                  const currentDesc = lines[lineIndex].descriptionTemplate || '';
                  updateJournalLine(lineIndex, 'descriptionTemplate', currentDesc ? `${currentDesc} ${template}` : template);
                }
              }}
              onSetReference={(template) => {
                const currentRef = formData().journalEntryTemplate?.reference || '';
                updateTemplate('reference', currentRef ? `${currentRef} ${template}` : template);
              }}
              onAddLine={(amountExpression, descriptionTemplate, lineConditions) => {
                const newLine = {
                  accountExpression: '1001',
                  descriptionTemplate: descriptionTemplate || '',
                  amountExpression: amountExpression,
                  documentExpression: '',
                  isDebit: true,
                  conditions: lineConditions || []
                };
                // Update formData to trigger auto-save
                setFormData(prev => ({
                  ...prev,
                  journalEntryTemplate: {
                    ...prev.journalEntryTemplate!,
                    lines: [...(prev.journalEntryTemplate?.lines || []), newLine]
                  }
                }));
                console.log('[RuleDraft] New line added with amount:', amountExpression);
              }}
              onAddCustomField={(name, expression, description) => {
                // Generate unique ID for the custom field
                const newCustomField: CustomField = {
                  id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name,
                  expression,
                  description: description || ''
                };
                // Update both signals to trigger auto-save
                setCustomFields(prev => [...prev, newCustomField]);
                setFormData(prev => ({
                  ...prev,
                  customFields: [...(prev.customFields || []), newCustomField]
                }));
                console.log('[RuleDraft] Custom field added:', newCustomField.name);
              }}
              onClose={() => setShowFieldAssistant(false)}
            />
          </div>
        </div>
      </Show>
    </div>
  );
};

export default EventRuleBuilder;