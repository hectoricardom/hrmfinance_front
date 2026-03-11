import { Component, createSignal, For, Show, createEffect } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';
import { 
  JournalTemplate, 
  TemplateField, 
  TemplateLineRule, 
  TemplateBuilderState 
} from '../types/journalTemplateTypes';
import { useTranslation } from '../../../translations';
import { generateRandomId } from '../../../services/utils';
import { categoryOptions } from '../stores/templateStore';
import { accountsStore } from '../../accounts';

interface TemplateBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: JournalTemplate) => void;
  editTemplate?: JournalTemplate | null;
}

const TemplateBuilder: Component<TemplateBuilderProps> = (props) => {
  const { t } = useTranslation();
  
  const [builderState, setBuilderState] = createSignal<TemplateBuilderState>({
    template: {
      name: '',
      description: '',
      category: 'general',
      isActive: true,
      fields: [],
      lineRules: [],
      settings: {
        referenceFormat: '',
        defaultDescription: '',
        requiresApproval: false,
        tags: []
      }
    },
    currentStep: 'basic',
    validationErrors: {}
  });

  // Reset builder state when opening with edit template
  createEffect(() => {
    if (props.isOpen) {
      if (props.editTemplate) {
        setBuilderState({
          template: { ...props.editTemplate },
          currentStep: 'basic',
          validationErrors: {}
        });
        // Reset input fields
        setNewField({
          type: 'text',
          required: false
        });
        setNewLineRule({
          type: 'debit',
          conditions: []
        });
        setOptionLabel('');
        setOptionValue('');
        setCustomLabel('');
        setCustomValue('');
      } else {
        // Reset for new template
        setBuilderState({
          template: {
            name: '',
            description: '',
            category: 'general',
            isActive: true,
            fields: [],
            lineRules: [],
            settings: {
              referenceFormat: '',
              defaultDescription: '',
              requiresApproval: false,
              tags: []
            }
          },
          currentStep: 'basic',
          validationErrors: {}
        });
      }
    }
  });

  const [newField, setNewField] = createSignal<Partial<TemplateField>>({
    type: 'text',
    required: false
  });

  const [newLineRule, setNewLineRule] = createSignal<Partial<TemplateLineRule>>({
    type: 'debit',
    conditions: []
  });

  // Signals para manejar opciones de select
  const [optionLabel, setOptionLabel] = createSignal('');
  const [optionValue, setOptionValue] = createSignal('');
  
  // Signals para manejar lista personalizada searchable-select
  const [customLabel, setCustomLabel] = createSignal('');
  const [customValue, setCustomValue] = createSignal('');

  // Estilos
  const stepNavStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '2rem'
  };

  const stepButtonStyle = (isActive: boolean) => ({
    padding: '1rem 1.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent'
  });

  const fieldRowStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 1fr 1fr 1fr 100px',
    gap: '1rem',
    'align-items': 'center',
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '1rem'
  };

  const lineRuleStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '1rem',
    border: '1px solid var(--border-color)'
  };

  // Funciones auxiliares
  const updateTemplate = (updates: Partial<JournalTemplate>) => {
    setBuilderState(prev => ({
      ...prev,
      template: { ...prev.template, ...updates }
    }));
  };

  const addField = () => {
    const field = newField();
    if (!field.name || !field.label) return;

    const fullField: TemplateField = {
      id: generateRandomId(),
      name: field.name,
      label: field.label,
      type: field.type || 'text',
      required: field.required || false,
      placeholder: field.placeholder,
      defaultValue: field.defaultValue,
      validation: field.validation,
      options: field.options,
      dataSource: field.dataSource
    };

    const current = builderState().template;
    updateTemplate({
      fields: [...(current.fields || []), fullField]
    });

    setNewField({ type: 'text', required: false });
    // También limpiar los inputs de opciones
    setOptionLabel('');
    setOptionValue('');
    setCustomLabel('');
    setCustomValue('');
  };

  const removeField = (fieldId: string) => {
    const current = builderState().template;
    updateTemplate({
      fields: current.fields?.filter(f => f.id !== fieldId) || []
    });
  };

  const addLineRule = () => {
    const rule = newLineRule();
    if (!rule.accountId || !rule.amountExpression) return;

    const fullRule: TemplateLineRule = {
      id: generateRandomId(),
      accountId: rule.accountId,
      accountExpression: rule.accountExpression,
      description: rule.description || 'Línea de asiento',
      descriptionExpression: rule.descriptionExpression,
      type: rule.type || 'debit',
      amountExpression: rule.amountExpression,
      conditions: rule.conditions || []
    };

    const current = builderState().template;
    updateTemplate({
      lineRules: [...(current.lineRules || []), fullRule]
    });

    setNewLineRule({ type: 'debit', conditions: [] });
  };

  const removeLineRule = (ruleId: string) => {
    const current = builderState().template;
    updateTemplate({
      lineRules: current.lineRules?.filter(r => r.id !== ruleId) || []
    });
  };

  const handleSave = () => {
    const template = builderState().template;
    
    // Validación básica
    if (!template.name || !template.description) {
      alert('El nombre y descripción son requeridos');
      return;
    }

    if (!template.fields || template.fields.length === 0) {
      alert('Debe agregar al menos un campo al formulario');
      return;
    }

    if (!template.lineRules || template.lineRules.length === 0) {
      alert('Debe agregar al menos una línea de asiento');
      return;
    }

    const fullTemplate: JournalTemplate = {
      id: props.editTemplate?.id || generateRandomId(),
      name: template.name!,
      description: template.description!,
      category: template.category || 'general',
      isActive: template.isActive ?? true,
      fields: template.fields,
      lineRules: template.lineRules,
      settings: template.settings || {
        referenceFormat: '',
        defaultDescription: '',
        requiresApproval: false,
        tags: []
      },
      createdBy:  'user', // TODO: obtener del contexto de usuario
      createdAt: props.editTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: props.editTemplate?.usageCount || 0
    };

    props.onSave(fullTemplate);
  };

  const fieldTypeOptions = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'currency', label: 'Moneda' },
    { value: 'date', label: 'Fecha' },
    { value: 'select', label: 'Lista de Selección' },
    { value: 'searchable-select', label: 'Búsqueda Dinámica' },
    { value: 'textarea', label: 'Texto Largo' }
  ];

  const dataSourceOptions = [
    { value: 'accounts', label: 'Cuentas Contables' },
    { value: 'products', label: 'Productos' },
    { value: 'locations', label: 'Ubicaciones/Almacenes' },
    { value: 'customers', label: 'Clientes' },
    { value: 'suppliers', label: 'Proveedores' },
    { value: 'custom', label: 'Lista Personalizada' }
  ];

 

  return (
    <Modal 
      isOpen={props.isOpen} 
      onClose={props.onClose} 
      title={props.editTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Asiento'}
      size="large"
    >
      <div>
        {/* Navegación por pasos */}
        <div style={stepNavStyle}>
          <button 
            style={stepButtonStyle(builderState().currentStep === 'basic')}
            onClick={() => setBuilderState(prev => ({ ...prev, currentStep: 'basic' }))}
          >
            1. Información Básica
          </button>
          <button 
            style={stepButtonStyle(builderState().currentStep === 'fields')}
            onClick={() => setBuilderState(prev => ({ ...prev, currentStep: 'fields' }))}
          >
            2. Campos del Formulario
          </button>
          <button 
            style={stepButtonStyle(builderState().currentStep === 'lines')}
            onClick={() => setBuilderState(prev => ({ ...prev, currentStep: 'lines' }))}
          >
            3. Líneas del Asiento
          </button>
          <button 
            style={stepButtonStyle(builderState().currentStep === 'settings')}
            onClick={() => setBuilderState(prev => ({ ...prev, currentStep: 'settings' }))}
          >
            4. Configuración
          </button>
          <button 
            style={stepButtonStyle(builderState().currentStep === 'preview')}
            onClick={() => setBuilderState(prev => ({ ...prev, currentStep: 'preview' }))}
          >
            5. Vista Previa
          </button>
        </div>

        {/* Contenido según el paso actual */}
        <Show when={builderState().currentStep === 'basic'}>
          <div>
            <h3>Información Básica de la Plantilla</h3>
            
            <FormInput
              label="Nombre de la Plantilla"
              value={builderState().template.name || ''}
              onChange={(value) => updateTemplate({ name: value })}
              placeholder="Ej: Pago de Facturas, Registro de Ventas..."
              required
            />

            <FormInput
              label="Descripción"
              value={builderState().template.description || ''}
              onChange={(value) => updateTemplate({ description: value })}
              placeholder="Descripción detallada de para qué sirve esta plantilla"
              required
            />

            <FormSelect
              label="Categoría"
              value={builderState().template.category || 'general'}
              onChange={(value) => updateTemplate({ category: value })}
              options={categoryOptions}
            />

            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-top': '1rem' }}>
              <input
                type="checkbox"
                id="isActive"
                checked={builderState().template.isActive ?? true}
                onChange={(e) => updateTemplate({ isActive: e.currentTarget.checked })}
              />
              <label for="isActive">Plantilla activa</label>
            </div>
          </div>
        </Show>

        <Show when={builderState().currentStep === 'fields'}>
          <div>
            <h3>Campos del Formulario Dinámico</h3>
            <p style={{ color: 'var(--text-muted)', 'margin-bottom': '2rem' }}>
              Define los campos que aparecerán en el formulario cuando se use esta plantilla.
              Los valores ingresados podrán usarse en las líneas del asiento con la sintaxis {'{nombreCampo}'}.
            </p>

            {/* Lista de campos existentes */}
            <Show when={(builderState().template.fields?.length || 0) > 0}>
              <div style={{ 'margin-bottom': '2rem' }}>
                <h4>Campos Configurados:</h4>
                <For each={builderState().template.fields}>
                  {(field) => (
                    <div style={fieldRowStyle}>
                      <div>
                        <strong>{field.label}</strong>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          Variable: {'{' + field.name + '}'} | Tipo: {field.type}
                        </div>
                      </div>
                      <div>{field.required ? 'Requerido' : 'Opcional'}</div>
                      <div>{field.placeholder || '-'}</div>
                      <div>{field.defaultValue || '-'}</div>
                      <div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeField(field.id)}
                          style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* Agregar nuevo campo */}
            <div style={{ padding: '2rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius)' }}>
              <h4>Agregar Nuevo Campo:</h4>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                <FormInput
                  label="Nombre del Campo (variable)"
                  value={newField().name || ''}
                  onChange={(value) => setNewField(prev => ({ ...prev, name: value }))}
                  placeholder="documentNumber, amount, supplier..."
                />
                <FormInput
                  label="Etiqueta (lo que ve el usuario)"
                  value={newField().label || ''}
                  onChange={(value) => setNewField(prev => ({ ...prev, label: value }))}
                  placeholder="Número de Documento, Monto, Proveedor..."
                />
              </div>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                <FormSelect
                  label="Tipo de Campo"
                  value={newField().type || 'text'}
                  onChange={(value) => setNewField(prev => ({ ...prev, type: value as any }))}
                  options={fieldTypeOptions}
                />
                <FormInput
                  label="Texto de Ayuda"
                  value={newField().placeholder || ''}
                  onChange={(value) => setNewField(prev => ({ ...prev, placeholder: value }))}
                  placeholder="Ingrese el número de documento..."
                />
                <FormInput
                  label="Valor Por Defecto"
                  value={newField().defaultValue || ''}
                  onChange={(value) => setNewField(prev => ({ ...prev, defaultValue: value }))}
                  placeholder="Valor inicial..."
                />
              </div>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem', 'margin-bottom': '1rem' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={newField().required || false}
                    onChange={(e) => setNewField(prev => ({ ...prev, required: e.currentTarget.checked }))}
                  />
                  {' '}Campo Requerido
                </label>
              </div>

              {/* Configuración específica para campos select */}
              <Show when={newField().type === 'select'}>
                <div style={{ 'margin-bottom': '1rem', padding: '1rem', background: '#e3f2fd', 'border-radius': '4px' }}>
                  <h5>Opciones de la Lista</h5>
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <Show when={(newField().options?.length || 0) > 0}>
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <strong>Opciones actuales:</strong>
                        <For each={newField().options}>
                          {(option, index) => (
                            <div style={{ 
                              display: 'flex', 
                              'justify-content': 'space-between', 
                              'align-items': 'center',
                              padding: '0.5rem',
                              background: 'white',
                              'margin-bottom': '0.25rem',
                              'border-radius': '4px'
                            }}>
                              <span>{option.label} (valor: {option.value})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentOptions = newField().options || [];
                                  const newOptions = currentOptions.filter((_, i) => i !== index());
                                  setNewField(prev => ({ ...prev, options: newOptions }));
                                }}
                                style={{ 
                                  background: '#dc3545', 
                                  color: 'white', 
                                  border: 'none', 
                                  'border-radius': '4px',
                                  padding: '0.25rem 0.5rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                    
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr auto', gap: '0.5rem', 'align-items': 'end' }}>
                      <FormInput
                        label="Etiqueta (lo que ve el usuario)"
                        placeholder="Ej: Efectivo"
                        value={optionLabel()}
                        onChange={setOptionLabel}
                      />
                      <FormInput
                        label="Valor (lo que se guarda)"
                        placeholder="Ej: cash"
                        value={optionValue()}
                        onChange={setOptionValue}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (optionLabel() && optionValue()) {
                            const currentOptions = newField().options || [];
                            const newOptions = [
                              ...currentOptions,
                              { label: optionLabel(), value: optionValue() }
                            ];
                            setNewField(prev => ({ ...prev, options: newOptions }));
                            setOptionLabel('');
                            setOptionValue('');
                          }
                        }}
                      >
                        + Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Configuración específica para campos searchable-select */}
              <Show when={newField().type === 'searchable-select'}>
                <div style={{ 'margin-bottom': '1rem', padding: '1rem', background: '#f3e5f5', 'border-radius': '4px' }}>
                  <h5>Configuración de Búsqueda Dinámica</h5>
                  <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                    <FormSelect
                      label="Fuente de Datos"
                      value={newField().dataSource?.type || 'custom'}
                      onChange={(value) => setNewField(prev => ({ 
                        ...prev, 
                        dataSource: { 
                          ...prev.dataSource, 
                          type: value as any 
                        } 
                      }))}
                      options={dataSourceOptions}
                    />
                    <Show when={newField().dataSource?.type !== 'custom'}>
                      <FormInput
                        label="Campo de Etiqueta"
                        value={newField().dataSource?.labelField || 'name'}
                        onChange={(value) => setNewField(prev => ({ 
                          ...prev, 
                          dataSource: { 
                            ...prev.dataSource, 
                            labelField: value 
                          } 
                        }))}
                        placeholder="name, description, etc."
                      />
                    </Show>
                  </div>
                  
                  {/* Lista personalizada para tipo custom */}
                  <Show when={newField().dataSource?.type === 'custom'}>
                    <div>
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <Show when={(newField().dataSource?.customList?.length || 0) > 0}>
                          <div style={{ 'margin-bottom': '1rem' }}>
                            <strong>Lista personalizada:</strong>
                            <For each={newField().dataSource?.customList}>
                              {(item, index) => (
                                <div style={{ 
                                  display: 'flex', 
                                  'justify-content': 'space-between', 
                                  'align-items': 'center',
                                  padding: '0.5rem',
                                  background: 'white',
                                  'margin-bottom': '0.25rem',
                                  'border-radius': '4px'
                                }}>
                                  <span>{item.label} (valor: {item.value})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentList = newField().dataSource?.customList || [];
                                      const newList = currentList.filter((_, i) => i !== index());
                                      setNewField(prev => ({ 
                                        ...prev, 
                                        dataSource: { 
                                          ...prev.dataSource, 
                                          customList: newList 
                                        } 
                                      }));
                                    }}
                                    style={{ 
                                      background: '#dc3545', 
                                      color: 'white', 
                                      border: 'none', 
                                      'border-radius': '4px',
                                      padding: '0.25rem 0.5rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>
                        
                        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr auto', gap: '0.5rem', 'align-items': 'end' }}>
                          <FormInput
                            label="Etiqueta"
                            placeholder="Ej: María García"
                            value={customLabel()}
                            onChange={setCustomLabel}
                          />
                          <FormInput
                            label="Valor"
                            placeholder="Ej: maria.garcia"
                            value={customValue()}
                            onChange={setCustomValue}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (customLabel() && customValue()) {
                                const currentList = newField().dataSource?.customList || [];
                                const newList = [
                                  ...currentList,
                                  { label: customLabel(), value: customValue() }
                                ];
                                setNewField(prev => ({ 
                                  ...prev, 
                                  dataSource: { 
                                    ...prev.dataSource, 
                                    customList: newList 
                                  } 
                                }));
                                setCustomLabel('');
                                setCustomValue('');
                              }
                            }}
                          >
                            + Agregar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>

              <Button variant="primary" onClick={addField}>
                Agregar Campo
              </Button>
            </div>
          </div>
        </Show>

        <Show when={builderState().currentStep === 'lines'}>
          <div>
            <h3>Líneas del Asiento Contable</h3>
            <p style={{ color: 'var(--text-muted)', 'margin-bottom': '2rem' }}>
              Define las líneas que se generarán automáticamente en el asiento contable.
              Puedes usar las variables de los campos en las expresiones de monto y descripción.
            </p>

            {/* Lista de líneas existentes */}
            <Show when={(builderState().template.lineRules?.length || 0) > 0}>
              <div style={{ 'margin-bottom': '2rem' }}>
                <h4>Líneas Configuradas:</h4>
                <For each={builderState().template.lineRules}>
                  {(rule) => (
                    <div style={lineRuleStyle}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                        <div style={{ flex: '1' }}>
                          <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                            <div>
                              <strong>Cuenta:</strong> {rule.accountId}
                              <div>
                                <strong> {accountsStore.getAccountById(rule.accountId)?.accountNumber} -</strong> {accountsStore.getAccountById(rule.accountId)?.name} 
                           
                              </div>
                               {rule.accountExpression && (
                                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                                  Expresión: {rule.accountExpression}
                                </div>
                              )}
                            </div>
                            <div>
                              <strong>Tipo:</strong> {rule.type === 'debit' ? 'Débito' : 'Crédito'}
                            </div>
                          </div>
                          <div style={{ 'margin-bottom': '1rem' }}>
                            <strong>Descripción:</strong> {rule.description}
                            {rule.descriptionExpression && (
                              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                                Expresión: {rule.descriptionExpression}
                              </div>
                            )}
                          </div>
                          <div>
                            <strong>Monto:</strong> {rule.amountExpression}
                          </div>
                          {rule.conditions && rule.conditions.length > 0 && (
                            <div style={{ 'margin-top': '1rem', padding: '0.5rem', background: '#fff3cd', 'border-radius': '4px' }}>
                              <strong>Condiciones:</strong>
                              <For each={rule.conditions}>
                                {(condition) => (
                                  <div style={{ 'font-size': '0.875rem' }}>
                                    • {condition.field} {condition.operator} {condition.value}
                                  </div>
                                )}
                              </For>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeLineRule(rule.id)}
                          style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* Agregar nueva línea */}
            <div style={{ padding: '2rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius)' }}>
              <h4>Agregar Nueva Línea:</h4>
              <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                <div>
                  <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                    Cuenta Contable
                  </label>
                  <SearchableAccountDropdown
                    selectedAccountId={newLineRule().accountId}
                    onSelect={(account) => setNewLineRule(prev => ({ ...prev, accountId: account.id }))}
                    placeholder="Seleccionar cuenta..."
                  />
                </div>
                <FormSelect
                  label="Tipo"
                  value={newLineRule().type || 'debit'}
                  onChange={(value) => setNewLineRule(prev => ({ ...prev, type: value as 'debit' | 'credit' }))}
                  options={[
                    { value: 'debit', label: 'Débito' },
                    { value: 'credit', label: 'Crédito' }
                  ]}
                />
              </div>
              <div style={{ 'margin-bottom': '1rem' }}>
                <FormInput
                  label="Descripción de la Línea"
                  value={newLineRule().description || ''}
                  onChange={(value) => setNewLineRule(prev => ({ ...prev, description: value }))}
                  placeholder="Ej: Pago a proveedor {supplier}"
                />
              </div>
              <div style={{ 'margin-bottom': '1rem' }}>
                <FormInput
                  label="Expresión de Monto"
                  value={newLineRule().amountExpression || ''}
                  onChange={(value) => setNewLineRule(prev => ({ ...prev, amountExpression: value }))}
                  placeholder="Ej: {amount}, {subtotal} + {tax}, {amount} * 0.18"
                />
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                  Puedes usar variables de campos, operaciones matemáticas (+, -, *, /) y funciones como percentage(monto, porcentaje)
                </div>
              </div>
              <Button variant="primary" onClick={addLineRule}>
                Agregar Línea
              </Button>
            </div>
          </div>
        </Show>

        <Show when={builderState().currentStep === 'settings'}>
          <div>
            <h3>Configuración Adicional</h3>
            
            <FormInput
              label="Formato de Referencia"
              value={builderState().template.settings?.referenceFormat || ''}
              onChange={(value) => updateTemplate({ 
                settings: { 
                  ...builderState().template.settings, 
                  referenceFormat: value 
                } 
              })}
              placeholder="Ej: FAC-{documentNumber}, PAG-{year}-{month}-{sequence}"
            />

            <FormInput
              label="Descripción por Defecto del Asiento"
              value={builderState().template.settings?.defaultDescription || ''}
              onChange={(value) => updateTemplate({ 
                settings: { 
                  ...builderState().template.settings, 
                  defaultDescription: value 
                } 
              })}
              placeholder="Ej: {description} - {documentNumber}"
            />

            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-top': '1rem' }}>
              <input
                type="checkbox"
                id="requiresApproval"
                checked={builderState().template.settings?.requiresApproval || false}
                onChange={(e) => updateTemplate({ 
                  settings: { 
                    ...builderState().template.settings, 
                    requiresApproval: e.currentTarget.checked 
                  } 
                })}
              />
              <label for="requiresApproval">Requiere aprobación antes de contabilizar</label>
            </div>
          </div>
        </Show>

        <Show when={builderState().currentStep === 'preview'}>
          <div>
            <h3>Vista Previa de la Plantilla</h3>
            
            <div style={{ padding: '2rem', background: 'var(--surface-color)', 'border-radius': 'var(--border-radius)' }}>
              <h4>{builderState().template.name}</h4>
              <p>{builderState().template.description}</p>
              
              <div style={{ 'margin-bottom': '2rem' }}>
                <h5>Campos del Formulario ({builderState().template.fields?.length || 0}):</h5>
                <For each={builderState().template.fields}>
                  {(field) => (
                    <div style={{ 'margin-bottom': '0.5rem' }}>
                      • <strong>{field.label}</strong> ({field.type}) 
                      {field.required && <span style={{ color: 'red' }}> *</span>}
                    </div>
                  )}
                </For>
              </div>

              <div>
                <h5>Líneas del Asiento ({builderState().template.lineRules?.length || 0}):</h5>
                <For each={builderState().template.lineRules}>
                  {(rule) => (
                    <div style={{ 'margin-bottom': '1rem', padding: '1rem', background: 'white', 'border-radius': '4px' }}>
                      <div><strong>Cuenta:</strong> {rule.accountId}</div>
                      <div><strong>Tipo:</strong> {rule.type === 'debit' ? 'Débito' : 'Crédito'}</div>
                      <div><strong>Monto:</strong> {rule.amountExpression}</div>
                      <div><strong>Descripción:</strong> {rule.description}</div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        {/* Botones de navegación */}
        <div style={{ 
          display: 'flex', 
          'justify-content': 'space-between', 
          'margin-top': '2rem', 
          'padding-top': '2rem', 
          'border-top': '1px solid var(--border-color)' 
        }}>
          <div>
            <Show when={builderState().currentStep !== 'basic'}>
              <Button 
                variant="outline" 
                onClick={() => {
                  const steps = ['basic', 'fields', 'lines', 'settings', 'preview'];
                  const currentIndex = steps.indexOf(builderState().currentStep);
                  if (currentIndex > 0) {
                    setBuilderState(prev => ({ 
                      ...prev, 
                      currentStep: steps[currentIndex - 1] as any 
                    }));
                  }
                }}
              >
                Anterior
              </Button>
            </Show>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="secondary" onClick={props.onClose}>
              Cancelar
            </Button>
            
            <Show when={builderState().currentStep !== 'preview'}>
              <Button 
                variant="primary"
                onClick={() => {
                  const steps = ['basic', 'fields', 'lines', 'settings', 'preview'];
                  const currentIndex = steps.indexOf(builderState().currentStep);
                  if (currentIndex < steps.length - 1) {
                    setBuilderState(prev => ({ 
                      ...prev, 
                      currentStep: steps[currentIndex + 1] as any 
                    }));
                  }
                }}
              >
                Siguiente
              </Button>
            </Show>
            
            <Show when={builderState().currentStep === 'preview'}>
              <Button variant="primary" onClick={handleSave}>
                Guardar Plantilla
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TemplateBuilder;