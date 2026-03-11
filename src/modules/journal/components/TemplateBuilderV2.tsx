import { Component, createSignal, For, Show, createEffect, createMemo } from 'solid-js';
import { Button, FormInput, FormSelect } from '../../ui';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';
import EntryPreviewCard from './EntryPreviewCard';
import {
  JournalTemplate,
  TemplateField,
  TemplateLineRule
} from '../types/journalTemplateTypes';
import { devLog, generateRandomId } from '../../../services/utils';
import { categoryOptions } from '../stores/templateStore';
import { accountsStore } from '../../accounts';
import {
  COMMON_FIELDS,
  CATEGORY_FIELD_SUGGESTIONS,
  CommonFieldId,
  createCustomField,
  createBlankCustomField,
  getFieldsByCategory
} from '../constants/commonFields';

interface TemplateBuilderV2Props {
  template?: JournalTemplate;
  onSave: (template: JournalTemplate) => void;
  onCancel: () => void;
  presetId?: string;
}

const TemplateBuilderV2: Component<TemplateBuilderV2Props> = (props) => {
  const [currentStep, setCurrentStep] = createSignal<1 | 2 | 3>(1);

  // Template data
  const [templateName, setTemplateName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [category, setCategory] = createSignal('general');
  const [fields, setFields] = createSignal<TemplateField[]>([]);
  const [lineRules, setLineRules] = createSignal<TemplateLineRule[]>([]);
  const [referenceFormat, setReferenceFormat] = createSignal('');
  const [defaultDescription, setDefaultDescription] = createSignal('');
  const [requiresApproval, setRequiresApproval] = createSignal(false);

  // Step 1 - Field editing
  const [editingFieldId, setEditingFieldId] = createSignal<string | null>(null);
  const [showCustomFieldForm, setShowCustomFieldForm] = createSignal(false);

  // Custom field form state
  const [customFieldName, setCustomFieldName] = createSignal('');
  const [customFieldLabel, setCustomFieldLabel] = createSignal('');
  const [customFieldType, setCustomFieldType] = createSignal<string>('text');
  const [customFieldRequired, setCustomFieldRequired] = createSignal(false);
  const [customFieldPlaceholder, setCustomFieldPlaceholder] = createSignal('');
  const [customFieldDataSourceType, setCustomFieldDataSourceType] = createSignal<string>('');
  const [customFieldDefaultValue, setCustomFieldDefaultValue] = createSignal<string>('');

  // Step 2 - Line builder state
  const [newLineAccount, setNewLineAccount] = createSignal('');
  const [newLineType, setNewLineType] = createSignal<'debit' | 'credit'>('debit');
  const [newLineDescription, setNewLineDescription] = createSignal('');
  const [newLineAmount, setNewLineAmount] = createSignal('');
  const [newLineDocument, setNewLineDocument] = createSignal('');
  const [editingLineId, setEditingLineId] = createSignal<string | null>(null);

  // Step 3 - Test data
  const [testData, setTestData] = createSignal<Record<string, any>>({});
  const [showTestPreview, setShowTestPreview] = createSignal(false);

  // Initialize from props
  createEffect(() => {
    if (props.template) {
      setTemplateName(props.template.name);
      setDescription(props.template.description);
      setCategory(props.template.category);
      setFields(props.template.fields || []);
      setLineRules(props.template.lineRules || []);
      setReferenceFormat(props.template.settings?.referenceFormat || '');
      setDefaultDescription(props.template.settings?.defaultDescription || '');
      setRequiresApproval(props.template.settings?.requiresApproval || false);
    }
  });

  // Auto-suggest fields when category changes
  createEffect(() => {
    const cat = category();
    if (fields().length === 0 && cat) {
      const suggestedFields = getFieldsByCategory(cat);
      const mappedFields = suggestedFields.map(commonField =>
        createCustomField(commonField.id as CommonFieldId, { id: generateRandomId() })
      );
      setFields(mappedFields);
    }
  });

  // Calculate balance
  const totalDebits = createMemo(() => {
    // This would calculate based on test data
    return 0;
  });

  const totalCredits = createMemo(() => {
    // This would calculate based on test data
    return 0;
  });

  const isBalanced = createMemo(() => {
    return Math.abs(totalDebits() - totalCredits()) < 0.01;
  });

  // Quick field picker - Add common field
  const addCommonField = (fieldId: CommonFieldId) => {
    const commonField = COMMON_FIELDS[fieldId];
    if (!commonField) return;

    const newField = createCustomField(fieldId, { id: generateRandomId() });
    setFields([...fields(), newField]);
  };

  // Add custom field from form
  const addCustomField = () => {
    if (!customFieldName() || !customFieldLabel()) {
      alert('Por favor complete el nombre y la etiqueta del campo');
      return;
    }

    // Check for duplicate names
    if (fields().some(f => f.name === customFieldName())) {
      alert('Ya existe un campo con ese nombre de variable');
      return;
    }

    const dataSource = customFieldDataSourceType() ? {
      type: customFieldDataSourceType() as 'accounts' | 'products' | 'customers' | 'suppliers' | 'locations',
      valueField: 'id',
      labelField: 'name'
    } : undefined;

    // Parse default value based on type
    let defaultVal: any = customFieldDefaultValue() || undefined;
    if (defaultVal && (customFieldType() === 'number' || customFieldType() === 'currency')) {
      defaultVal = Number(defaultVal);
    }

    const newField = createBlankCustomField({
      id: generateRandomId(),
      name: customFieldName(),
      label: customFieldLabel(),
      type: customFieldType() as any,
      required: customFieldRequired(),
      placeholder: customFieldPlaceholder(),
      defaultValue: defaultVal,
      dataSource
    });

    setFields([...fields(), newField]);

    // Reset form
    setCustomFieldName('');
    setCustomFieldLabel('');
    setCustomFieldType('text');
    setCustomFieldRequired(false);
    setCustomFieldPlaceholder('');
    setCustomFieldDataSourceType('');
    setCustomFieldDefaultValue('');
    setShowCustomFieldForm(false);
  };

  // Remove field
  const removeField = (fieldId: string) => {
    setFields(fields().filter(f => f.id !== fieldId));
  };

  // Update field property
  const updateField = (fieldId: string, updates: Partial<TemplateField>) => {
    setFields(fields().map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  // Move field up/down
  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  // Add line rule
  const addLineRule = () => {
    if (!newLineAccount() || !newLineAmount()) return;

    const rule: TemplateLineRule = {
      id: generateRandomId(),
      accountId: newLineAccount(),
      description: newLineDescription() || 'Línea de asiento',
      type: newLineType(),
      amountExpression: newLineAmount(),
      document: newLineDocument(),
      conditions: []
    };

    setLineRules([...lineRules(), rule]);

    // Reset form
    setNewLineAccount('');
    setNewLineType('debit');
    setNewLineDescription('');
    setNewLineAmount('');
  };

  // Remove line rule
  const removeLineRule = (ruleId: string) => {
    setLineRules(lineRules().filter(r => r.id !== ruleId));
  };

  // Update line rule
  const updateLineRule = (ruleId: string, updates: Partial<TemplateLineRule>) => {
    setLineRules(lineRules().map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  // Move line up/down
  const moveLine = (index: number, direction: 'up' | 'down') => {
    const newLines = [...lineRules()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLines.length) return;

    [newLines[index], newLines[targetIndex]] = [newLines[targetIndex], newLines[index]];
    setLineRules(newLines);
  };

  // Fill test data with sample values
  const fillSampleData = () => {
    const sampleData: Record<string, any> = {};
    fields().forEach(field => {
      switch (field.type) {
        case 'text':
          sampleData[field.name] = 'Ejemplo';
          break;
        case 'number':
        case 'currency':
          sampleData[field.name] = 1000;
          break;
        case 'date':
          sampleData[field.name] = new Date().toISOString().split('T')[0];
          break;
        case 'select':
          sampleData[field.name] = field.options?.[0]?.value || '';
          break;
        default:
          sampleData[field.name] = '';
      }
    });
    setTestData(sampleData);
    setShowTestPreview(true);
  };

  // Generate preview entry from test data
  const previewEntry = createMemo(() => {
    if (!showTestPreview()) return null;

    const data = testData();
    const lines = lineRules().map(rule => {
      let amount = 0;
      try {
        // Simple expression evaluation - replace field names with values
        let expression = rule.amountExpression;
        Object.keys(data).forEach(key => {
          expression = expression.replace(new RegExp(`{${key}}`, 'g'), data[key] || '0');
        });
        amount = eval(expression) || 0;
      } catch (e) {
        amount = 0;
      }

      const account = accountsStore.getAccountById(rule.accountId);

      return {
        accountId: rule.accountId,
        accountName: account?.name || 'Cuenta no encontrada',
        description: rule.description,
        document: rule.document,
        debitAmount: rule.type === 'debit' ? amount : 0,
        creditAmount: rule.type === 'credit' ? amount : 0,
        type: rule.type
      };
    });

    return {
      description: defaultDescription() || templateName(),
      reference: referenceFormat(),
      lines
    };
  });

  // Validation for each step
  const canProceedFromStep1 = createMemo(() => {
    return templateName().trim() !== '' && fields().length > 0;
  });

  const canProceedFromStep2 = createMemo(() => {
    return lineRules().length >= 2;
  });

  // Navigate steps
  const nextStep = () => {
    if (currentStep() === 1 && !canProceedFromStep1()) {
      alert('Por favor complete el nombre de la plantilla y agregue al menos un campo');
      return;
    }
    if (currentStep() === 2 && !canProceedFromStep2()) {
      alert('Por favor agregue al menos 2 líneas al asiento');
      return;
    }
    if (currentStep() < 3) {
      setCurrentStep((currentStep() + 1) as 1 | 2 | 3);
    }
  };

  const previousStep = () => {
    if (currentStep() > 1) {
      setCurrentStep((currentStep() - 1) as 1 | 2 | 3);
    }
  };

  // Save template
  const handleSave = () => {
    const template: JournalTemplate = {
      id: props.template?.id || generateRandomId(),
      name: templateName(),
      description: description(),
      category: category(),
      isActive: true,
      fields: fields(),
      lineRules: lineRules(),
      settings: {
        referenceFormat: referenceFormat(),
        defaultDescription: defaultDescription(),
        requiresApproval: requiresApproval(),
        tags: []
      },
      createdBy: props.template?.createdBy || 'user',
      createdAt: props.template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: props.template?.usageCount || 0
    };

    props.onSave(template);
  };

  // Available common fields to add
  const availableCommonFields = createMemo(() => {
    const currentFieldNames = new Set(fields().map(f => f.name));
    //devLog(Object.values(COMMON_FIELDS))
    return Object.values(COMMON_FIELDS).filter(
      cf => !currentFieldNames.has(cf.name)
    );
  });

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    height: '600px',
    'max-height': '95vh'
  };

  const headerStyle = {
    padding: '1.5rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const titleStyle = {
    margin: '0 0 1rem 0',
    'font-size': '1.5rem',
    'font-weight': '600'
  };

  const stepIndicatorStyle = {
    display: 'flex',
    gap: '2rem',
    'align-items': 'center'
  };

  const stepStyle = (isActive: boolean, isCompleted: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    color: isActive ? 'var(--primary-color)' : isCompleted ? 'var(--success-color)' : 'var(--text-muted)',
    'font-weight': isActive ? '600' : '400'
  });

  const stepCircleStyle = (isActive: boolean, isCompleted: boolean) => ({
    width: '2rem',
    height: '2rem',
    'border-radius': '50%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: isActive ? 'var(--primary-color)' : isCompleted ? 'var(--success-color)' : 'var(--border-color)',
    color: isActive || isCompleted ? 'white' : 'var(--text-muted)',
    'font-weight': '600'
  });

  const contentStyle = {
    flex: '1',
    padding: '2rem',
    'overflow-y': 'auto'
  };

  const footerStyle = {
    padding: '1.5rem',
    'border-top': '2px solid var(--border-color)',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const fieldListStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem',
    'margin-top': '1rem'
  };

  const fieldCardStyle = {
    padding: '1rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const quickPickerStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
    'margin-bottom': '1.5rem'
  };

  const quickFieldButtonStyle = {
    padding: '0.75rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    cursor: 'pointer',
    'text-align': 'left' as const,
    transition: 'all 0.2s',
    ':hover': {
      'border-color': 'var(--primary-color)',
      background: 'var(--primary-background)'
    }
  };

  const lineCardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '1rem'
  };

  const balanceIndicatorStyle = (balanced: boolean) => ({
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius)',
    background: balanced ? 'var(--success-background)' : 'var(--error-background)',
    color: balanced ? 'var(--success-color)' : 'var(--error-color)',
    'text-align': 'center' as const,
    'font-weight': '600',
    'margin-bottom': '1rem'
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          {props.template ? 'Editar Plantilla' : 'Crear Plantilla'}
        </h2>

        {/* Step Indicator */}
        <div style={stepIndicatorStyle}>
          <div style={stepStyle(currentStep() === 1, currentStep() > 1)}>
            <div style={stepCircleStyle(currentStep() === 1, currentStep() > 1)}>
              {currentStep() > 1 ? '✓' : '1'}
            </div>
            <span>Información</span>
          </div>

          <div style={{ flex: '1', height: '2px', background: 'var(--border-color)' }} />

          <div style={stepStyle(currentStep() === 2, currentStep() > 2)}>
            <div style={stepCircleStyle(currentStep() === 2, currentStep() > 2)}>
              {currentStep() > 2 ? '✓' : '2'}
            </div>
            <span>Líneas</span>
          </div>

          <div style={{ flex: '1', height: '2px', background: 'var(--border-color)' }} />

          <div style={stepStyle(currentStep() === 3, false)}>
            <div style={stepCircleStyle(currentStep() === 3, false)}>3</div>
            <span>Revisar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Step 1: Basic Info + Fields */}
        <Show when={currentStep() === 1}>
          <div>
            <h3 style={{ 'margin-top': '0' }}>Información Básica y Campos</h3>

            <FormInput
              label="Nombre de la Plantilla"
              value={templateName()}
              onChange={setTemplateName}
              placeholder="Ej: Pago de Facturas, Registro de Ventas..."
              required
            />

            <FormInput
              label="Descripción"
              value={description()}
              onChange={setDescription}
              placeholder="Descripción detallada de para qué sirve esta plantilla"
            />

            <FormSelect
              label="Categoría"
              value={category()}
              onChange={(val) => setCategory(val)}
              options={categoryOptions}
            />

            <div style={{ 'margin-top': '2rem' }}>
              <h4>Campos del Formulario</h4>
              <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                Seleccione los campos que aparecerán en el formulario. Puede reorganizarlos arrastrándolos.
              </p>

              {/* Quick Field Picker */}
              <Show when={availableCommonFields().length > 0}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                    Agregar Campo Común:
                  </label>
                  <div style={quickPickerStyle}>
                    <For each={availableCommonFields()}>
                      {(field) => (
                        <button
                          style={quickFieldButtonStyle}
                          onClick={() => addCommonField(field.id as CommonFieldId)}
                        >
                          <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                            {field.label}
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                            {field.type}
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Custom Field Creation */}
              <div style={{ 'margin-bottom': '1.5rem', padding: '1rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius)' }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': showCustomFieldForm() ? '1rem' : '0' }}>
                  <div>
                    <div style={{ 'font-weight': '500' }}>Campo Personalizado</div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      Crea un campo con configuración personalizada
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={showCustomFieldForm() ? 'secondary' : 'primary'}
                    onClick={() => setShowCustomFieldForm(!showCustomFieldForm())}
                  >
                    {showCustomFieldForm() ? 'Cancelar' : '+ Crear Campo'}
                  </Button>
                </div>

                <Show when={showCustomFieldForm()}>
                  <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                    <FormInput
                      label="Nombre Variable"
                      value={customFieldName()}
                      onChange={setCustomFieldName}
                      placeholder="miCampo (sin espacios)"
                      required
                    />
                    <FormInput
                      label="Etiqueta"
                      value={customFieldLabel()}
                      onChange={setCustomFieldLabel}
                      placeholder="Mi Campo Personalizado"
                      required
                    />
                    <FormSelect
                      label="Tipo de Campo"
                      value={customFieldType()}
                      onChange={setCustomFieldType}
                      options={[
                        { value: 'text', label: 'Texto' },
                        { value: 'number', label: 'Número' },
                        { value: 'currency', label: 'Moneda' },
                        { value: 'date', label: 'Fecha' },
                        { value: 'textarea', label: 'Texto Largo' },
                        { value: 'searchable-select', label: 'Selector con Búsqueda' }
                      ]}
                    />
                    <Show when={customFieldType() === 'searchable-select'}>
                      <FormSelect
                        label="Fuente de Datos"
                        value={customFieldDataSourceType()}
                        onChange={setCustomFieldDataSourceType}
                        options={[
                          { value: '', label: 'Seleccionar...' },
                          { value: 'accounts', label: 'Cuentas Contables' },
                          { value: 'products', label: 'Productos' },
                          { value: 'customers', label: 'Clientes' },
                          { value: 'suppliers', label: 'Proveedores' },
                          { value: 'locations', label: 'Ubicaciones' }
                        ]}
                      />
                    </Show>
                    <Show when={customFieldType() !== 'searchable-select'}>
                      <FormInput
                        label="Placeholder"
                        value={customFieldPlaceholder()}
                        onChange={setCustomFieldPlaceholder}
                        placeholder="Texto de ayuda..."
                      />
                    </Show>
                    <Show when={customFieldType() !== 'searchable-select'}>
                      <FormInput
                        label="Valor por Defecto"
                        value={customFieldDefaultValue()}
                        onChange={setCustomFieldDefaultValue}
                        placeholder="Valor inicial del campo..."
                        type={customFieldType() === 'number' || customFieldType() === 'currency' ? 'number' : customFieldType() === 'date' ? 'date' : 'text'}
                      />
                    </Show>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-top': '1.5rem' }}>
                      <input
                        type="checkbox"
                        checked={customFieldRequired()}
                        onChange={(e) => setCustomFieldRequired(e.currentTarget.checked)}
                        id="customFieldRequired"
                      />
                      <label for="customFieldRequired">Campo Requerido</label>
                    </div>
                  </div>
                  <div style={{ 'margin-top': '1rem', display: 'flex', gap: '0.5rem' }}>
                    <Button variant="primary" onClick={addCustomField}>
                      Agregar Campo
                    </Button>
                    <Show when={customFieldName()}>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'flex', 'align-items': 'center' }}>
                        Variable: <code style={{ background: '#e9ecef', padding: '0.125rem 0.375rem', 'border-radius': '4px', 'margin-left': '0.25rem' }}>{`{${customFieldName()}}`}</code>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Field List */}
              <Show when={fields().length > 0}>
                <div style={fieldListStyle}>
                  <For each={fields()}>
                    {(field, index) => (
                      <div style={fieldCardStyle}>
                        <div style={{ flex: '1' }}>
                          <Show when={editingFieldId() === field.id} fallback={
                            <div>
                              <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                                {field.label}
                                {field.required && <span style={{ color: 'red' }}> *</span>}
                              </div>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                Variable: {`{${field.name}}`} | Tipo: {field.type}
                                {field.defaultValue && <span> | Default: {String(field.defaultValue)}</span>}
                              </div>
                            </div>
                          }>
                            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem', width: '100%' }}>
                              {/* Row 1: Label and Required */}
                              <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                                <div style={{ flex: '1' }}>
                                  <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>Etiqueta</label>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(field.id, { label: e.currentTarget.value })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', 'border-radius': '4px' }}
                                  />
                                </div>
                                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem', 'margin-top': '1rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateField(field.id, { required: e.currentTarget.checked })}
                                  />
                                  Requerido
                                </label>
                              </div>
                              {/* Row 2: Default Value and Placeholder */}
                              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                  <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>Valor por Defecto</label>
                                  <input
                                    type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                    value={field.defaultValue !== undefined ? String(field.defaultValue) : ''}
                                    onChange={(e) => {
                                      const val = field.type === 'number' || field.type === 'currency'
                                        ? (e.currentTarget.value ? Number(e.currentTarget.value) : undefined)
                                        : (e.currentTarget.value || undefined);
                                      updateField(field.id, { defaultValue: val });
                                    }}
                                    placeholder="Valor inicial..."
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', 'border-radius': '4px' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>Placeholder</label>
                                  <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateField(field.id, { placeholder: e.currentTarget.value || undefined })}
                                    placeholder="Texto de ayuda..."
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', 'border-radius': '4px' }}
                                  />
                                </div>
                              </div>
                              {/* Save button */}
                              <div style={{ display: 'flex', 'justify-content': 'flex-end' }}>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => setEditingFieldId(null)}
                                >
                                  ✓ Guardar
                                </Button>
                              </div>
                            </div>
                          </Show>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                          <Show when={editingFieldId() !== field.id}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingFieldId(field.id)}
                            >
                              Editar
                            </Button>
                          </Show>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveField(index(), 'up')}
                            disabled={index() === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveField(index(), 'down')}
                            disabled={index() === fields().length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeField(field.id)}
                            style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>


        {/* Step 2: Entry Lines */}
        <Show when={currentStep() === 2}>
          <div>
            <h3 style={{ 'margin-top': '0' }}>Líneas del Asiento Contable</h3>

            <Show when={lineRules().length < 2}>
              <div style={{ ...balanceIndicatorStyle(false), 'margin-bottom': '1.5rem' }}>
                Se requieren al menos 2 líneas para crear un asiento balanceado
              </div>
            </Show>

            {/* Existing Lines */}
            <Show when={lineRules().length > 0}>
              <div style={{ 'margin-bottom': '2rem' }}>
                <h4>Líneas Configuradas:</h4>
                <For each={lineRules()}>
                  {(rule, index) => {
                    const account = accountsStore.getAccountById(rule.accountId);
                    return (
                      <div style={lineCardStyle}>
                        <Show when={editingLineId() === rule.id} fallback={
                          <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                            <div style={{ flex: '1' }}>
                              <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                                {account?.accountNumber} - {account?.name || rule.accountId}
                              </div>
                              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                                <strong>Tipo:</strong> {rule.type === 'debit' ? 'Débito' : 'Crédito'}
                              </div>
                              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                                <strong>Monto:</strong> {rule.amountExpression}
                              </div>
                              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                                <strong>Documento:</strong> {rule.document}
                              </div>
                              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                                <strong>Descripción:</strong> {rule.description}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'flex-start' }}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingLineId(rule.id)}
                                title="Editar"
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveLine(index(), 'up')}
                                disabled={index() === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveLine(index(), 'down')}
                                disabled={index() === lineRules().length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeLineRule(rule.id)}
                                style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        }>
                          {/* Edit Mode */}
                          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
                                  Cuenta Contable
                                </label>
                                <SearchableAccountDropdown
                                  selectedAccountId={rule.accountId}
                                  onSelect={(acc) => updateLineRule(rule.id, { accountId: acc.id })}
                                  placeholder="Seleccionar cuenta..."
                                />
                              </div>
                              <FormSelect
                                label="Tipo"
                                value={rule.type}
                                onChange={(val) => updateLineRule(rule.id, { type: val as 'debit' | 'credit' })}
                                options={[
                                  { value: 'debit', label: 'Débito' },
                                  { value: 'credit', label: 'Crédito' }
                                ]}
                              />
                            </div>
                            <FormInput
                              label="Documento"
                              value={rule.document}
                              onChange={(val) => updateLineRule(rule.id, { document: val })}
                              placeholder="Documento de la línea..."
                            />
                            <FormInput
                              label="Descripción"
                              value={rule.description}
                              onChange={(val) => updateLineRule(rule.id, { description: val })}
                              placeholder="Descripción de la línea..."
                            />
                            <div>
                              <FormInput
                                label="Expresión de Monto"
                                value={rule.amountExpression}
                                onChange={(val) => updateLineRule(rule.id, { amountExpression: val })}
                                placeholder="Ej: {amount}, {subtotal} + {taxAmount}"
                              />
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                                Variables disponibles: {fields().map(f => `{${f.name}}`).join(', ')}
                              </div>
                            </div>
                            <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.5rem' }}>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setEditingLineId(null)}
                              >
                                ✓ Guardar
                              </Button>
                            </div>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>

            {/* Add New Line */}
            <div style={{ padding: '1.5rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius)' }}>
              <h4 style={{ 'margin-top': '0' }}>Agregar Nueva Línea:</h4>

              <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                <div>
                  <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                    Cuenta Contable
                  </label>
                  <SearchableAccountDropdown
                    selectedAccountId={newLineAccount()}
                    onSelect={(account) => setNewLineAccount(account.id)}
                    placeholder="Seleccionar cuenta..."
                  />
                </div>

                <FormSelect
                  label="Tipo"
                  value={newLineType()}
                  onChange={(val) => setNewLineType(val as 'debit' | 'credit')}
                  options={[
                    { value: 'debit', label: 'Débito' },
                    { value: 'credit', label: 'Crédito' }
                  ]}
                />
              </div>

              
              <FormInput
                label="Documento de la Línea"
                value={newLineDocument()}
                onChange={setNewLineDocument}
                placeholder="Ej: Documento {document}"
              />

              <FormInput
                label="Descripción de la Línea"
                value={newLineDescription()}
                onChange={setNewLineDescription}
                placeholder="Ej: Pago a proveedor {provider}"
              />

              <div style={{ 'margin-bottom': '1rem' }}>
                <FormInput
                  label="Expresión de Monto"
                  value={newLineAmount()}
                  onChange={setNewLineAmount}
                  placeholder="Ej: {amount}, {subtotal} + {taxAmount}, {amount} * 0.18"
                />
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                  Usa variables de campos entre llaves. Soporta +, -, *, /
                </div>
              </div>

              <Button
                variant="primary"
                onClick={addLineRule}
                disabled={!newLineAccount() || !newLineAmount()}
              >
                Agregar Línea
              </Button>
            </div>
          </div>
        </Show>

        {/* Step 3: Review & Test */}
        <Show when={currentStep() === 3}>
          <div>
            <h3 style={{ 'margin-top': '0' }}>Revisar y Probar</h3>

            {/* Summary */}
            <div style={{ padding: '1.5rem', background: 'var(--surface-color)', 'border-radius': 'var(--border-radius)', 'margin-bottom': '2rem' }}>
              <h4 style={{ 'margin-top': '0' }}>{templateName()}</h4>
              <p style={{ color: 'var(--text-muted)' }}>{description()}</p>

              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem', 'margin-top': '1rem' }}>
                <div>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'text-transform': 'uppercase' }}>
                    Categoría
                  </div>
                  <div style={{ 'font-weight': '600' }}>
                    {categoryOptions.find(c => c.value === category())?.label}
                  </div>
                </div>
                <div>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'text-transform': 'uppercase' }}>
                    Campos
                  </div>
                  <div style={{ 'font-weight': '600' }}>
                    {fields().length}
                  </div>
                </div>
                <div>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'text-transform': 'uppercase' }}>
                    Líneas
                  </div>
                  <div style={{ 'font-weight': '600' }}>
                    {lineRules().length}
                  </div>
                </div>
              </div>
            </div>

            {/* Fields Preview */}
            <div style={{ 'margin-bottom': '2rem' }}>
              <h4>Campos ({fields().length})</h4>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                <For each={fields()}>
                  {(field) => (
                    <div style={{ padding: '0.75rem', background: 'var(--surface-color)', 'border-radius': 'var(--border-radius)' }}>
                      <div style={{ 'font-weight': '500' }}>
                        {field.label}
                        {field.required && <span style={{ color: 'red' }}> *</span>}
                      </div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {field.type} - {`{${field.name}}`}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Lines Preview */}
            <div style={{ 'margin-bottom': '2rem' }}>
              <h4>Líneas ({lineRules().length})</h4>
              <For each={lineRules()}>
                {(rule) => {
                  const account = accountsStore.getAccountById(rule.accountId);
                  return (
                    <div style={{
                      padding: '1rem',
                      background: 'var(--surface-color)',
                      'border-radius': 'var(--border-radius)',
                      'margin-bottom': '0.5rem'
                    }}>
                      <div style={{ 'font-weight': '500' }}>
                        {account?.accountNumber} - {account?.name}
                      </div>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                        {rule.type === 'debit' ? 'Débito' : 'Crédito'}: {rule.amountExpression}
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>

            {/* Settings */}
            <div style={{ 'margin-bottom': '2rem' }}>
              <h4>Configuración</h4>

              <FormInput
                label="Formato de Referencia"
                value={referenceFormat()}
                onChange={setReferenceFormat}
                placeholder="Ej: FAC-{documentNumber}"
              />

              <FormInput
                label="Descripción por Defecto"
                value={defaultDescription()}
                onChange={setDefaultDescription}
                placeholder="Ej: {description} - {documentNumber}"
              />

              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-top': '1rem' }}>
                <input
                  type="checkbox"
                  checked={requiresApproval()}
                  onChange={(e) => setRequiresApproval(e.currentTarget.checked)}
                />
                Requiere aprobación antes de contabilizar
              </label>
            </div>

            {/* Test Section */}
            <div style={{ padding: '1.5rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius)' }}>
              <h4 style={{ 'margin-top': '0' }}>Probar Plantilla</h4>
              <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Genere datos de prueba para ver cómo se vería el asiento resultante.
              </p>

              <Button
                variant="secondary"
                onClick={fillSampleData}
              >
                Llenar con Datos de Ejemplo
              </Button>

              <Show when={showTestPreview()}>
                <div style={{ 'margin-top': '1.5rem' }}>
                  <EntryPreviewCard
                    entry={previewEntry()}
                    isValid={true}
                    errors={[]}
                    warnings={[]}
                  />
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <div>
          <Show when={currentStep() > 1}>
            <Button variant="outline" onClick={previousStep}>
              Anterior
            </Button>
          </Show>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" onClick={props.onCancel}>
            Cancelar
          </Button>

          <Show when={currentStep() < 3}>
            <Button variant="primary" onClick={nextStep}>
              Siguiente
            </Button>
          </Show>

          <Show when={currentStep() === 3}>
            <Button variant="primary" onClick={handleSave}>
              Guardar Plantilla
            </Button>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilderV2;
