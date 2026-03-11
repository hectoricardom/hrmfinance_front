import { Component, createSignal, For, Show, createEffect } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import DynamicSearchableDropdown from './DynamicSearchableDropdown';
import SearchableCustomerDropdown from '../../invoice/components/SearchableCustomerDropdown';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';
import {
  JournalTemplate,
  TemplateFormData,
  ProcessedTemplate,
  TemplateField
} from '../types/journalTemplateTypes';
import { TemplateProcessor } from '../services/templateProcessor';
import { useTranslation } from '../../../translations';
import { providersClientsStore } from '../../providers-clients';

// Payment method options
const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Seleccione método de pago' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'check', label: 'Cheque' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'credit', label: 'Crédito' },
];



interface DynamicTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  template: JournalTemplate;
  onSubmit: (processedTemplate: ProcessedTemplate) => void;
}

const DynamicTemplateForm: Component<DynamicTemplateFormProps> = (props) => {
  const { t } = useTranslation();
  
  const [formData, setFormData] = createSignal<TemplateFormData>({});
  const [validationErrors, setValidationErrors] = createSignal<Record<string, string>>({});
  const [previewMode, setPreviewMode] = createSignal(false);
  const [processedTemplate, setProcessedTemplate] = createSignal<ProcessedTemplate | null>(null);

  // Inicializar valores por defecto
  const initializeDefaults = () => {
    const defaults: TemplateFormData = {};
    props.template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      }
    });
    setFormData(defaults);
  };

  // Reset form when template changes or modal opens
  createEffect(() => {
    if (props.isOpen && props.template) {
      initializeDefaults();
      setValidationErrors({});
      setPreviewMode(false);
      setProcessedTemplate(null);
    }
  });

  const updateFieldValue = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Limpiar error de validación si existe
    if (validationErrors()[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    props.template.fields.forEach(field => {
      const value = formData()[field.name];
      
      // Validar campos requeridos
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.name] = `${field.label} es requerido`;
      }
      
      // Validar tipos de datos
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'number':
          case 'currency':
            if (isNaN(Number(value))) {
              errors[field.name] = `${field.label} debe ser un número válido`;
            }
            break;
          case 'date':
            if (!(value instanceof Date) && isNaN(Date.parse(value))) {
              errors[field.name] = `${field.label} debe ser una fecha válida`;
            }
            break;
        }
        
        // Validaciones personalizadas
        if (field.validation) {
          if (field.validation.min !== undefined && Number(value) < field.validation.min) {
            errors[field.name] = `${field.label} debe ser mayor o igual a ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && Number(value) > field.validation.max) {
            errors[field.name] = `${field.label} debe ser menor o igual a ${field.validation.max}`;
          }
          if (field.validation.pattern && !new RegExp(field.validation.pattern).test(String(value))) {
            errors[field.name] = field.validation.message || `${field.label} no tiene el formato correcto`;
          }
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePreview = () => {
    if (!validateForm()) {
      return;
    }

    const processed = TemplateProcessor.processTemplate(props.template, formData());
    setProcessedTemplate(processed);
    setPreviewMode(true);
  };

  const handleSubmit = () => {
    const processed = processedTemplate();
    if (processed && processed.validation.isValid) {
      props.onSubmit(processed);
    } else {
      alert('Hay errores en la plantilla que deben ser corregidos antes de continuar');
    }
  };

  const renderField = (field: TemplateField) => {
    const error = () => validationErrors()[field.name];

    const fieldStyle = {
      'margin-bottom': '1.5rem'
    };

    const errorStyle = {
      color: '#dc3545',
      'font-size': '0.875rem',
      'margin-top': '0.25rem'
    };

    const labelStyle = {
      display: 'block',
      'font-weight': '500',
      'margin-bottom': '0.5rem'
    };

    const inputStyle = {
      width: '100%',
      padding: '0.75rem',
      border: `1px solid ${error() ? '#dc3545' : 'var(--border-color)'}`,
      'border-radius': 'var(--border-radius)',
      'font-family': 'inherit'
    };

    switch (field.type) {
      // ========== Specialized Field Types ==========

      // Document number/reference field
      case 'document':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                'font-size': '1rem'
              }}>📄</span>
              <input
                type="text"
                value={formData()?.[field.name] || ''}
                onInput={(e) => updateFieldValue(field.name, e.currentTarget.value)}
                placeholder={field.placeholder || 'Ej: FAC-001, NCR-002'}
                style={{
                  ...inputStyle,
                  'padding-left': '2.5rem',
                  'font-family': 'monospace',
                  'letter-spacing': '0.5px'
                }}
              />
            </div>
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      // Provider/Supplier searchable dropdown
      case 'provider':
        return (
          <div style={fieldStyle}>
            <DynamicSearchableDropdown
              field={{
                ...field,
                type: 'searchable-select',
                dataSource: field.dataSource || {
                  type: 'suppliers',
                  valueField: 'id',
                  labelField: 'name',
                  displayFields: ['name', 'code', 'taxId']
                }
              }}
              value={formData()?.[field.name]}
              onChange={(newValue) => updateFieldValue(field.name, newValue)}
              error={error()}
            />
          </div>
        );

      // Customer searchable dropdown
      case 'customer':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <SearchableCustomerDropdown
              value={formData()?.[field.name] ? { id: formData()[field.name], name: '', fullName: '' } : null}
              onChange={(customer) => {
                if (customer) {
                  updateFieldValue(field.name, customer.id || customer.name);
                } else {
                  updateFieldValue(field.name, '');
                }
              }}
              placeholder={field.placeholder || 'Buscar cliente...'}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      // Amount currency input
      case 'amount':
      case 'subtotal':
      case 'taxAmount':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                'font-weight': '600'
              }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData()?.[field.name] || ''}
                onInput={(e) => updateFieldValue(field.name, e.currentTarget.value)}
                placeholder={field.placeholder || '0.00'}
                style={{
                  ...inputStyle,
                  'padding-left': '2rem',
                  'text-align': 'right'
                }}
              />
            </div>
            <Show when={field.type === 'taxAmount'}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                Puede ser calculado automáticamente según configuración
              </div>
            </Show>
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      // Payment method select
      case 'paymentMethod':
        return (
          <div style={fieldStyle}>
            <FormSelect
              label={field.label + (field.required ? ' *' : '')}
              value={formData()?.[field.name] || ''}
              onChange={(newValue) => updateFieldValue(field.name, newValue)}
              options={field.options || PAYMENT_METHOD_OPTIONS}
              placeholder={field.placeholder}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      // Bank account searchable dropdown
      case 'bankAccount':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <SearchableAccountDropdown
              selectedAccountId={formData()?.[field.name]}
              onSelect={(account) => {
                if (account) {
                  updateFieldValue(field.name, account.id);
                } else {
                  updateFieldValue(field.name, '');
                }
              }}
              placeholder={field.placeholder || 'Seleccionar cuenta bancaria...'}
              filterFn={(account) => {
                // Filter for bank accounts only
                const isBankAccount =
                  account.accountType === 'bank' ||
                  account.isBankAccount ||
                  (account.accountNumber && account.accountNumber.startsWith('1') && account.accountNumber.length >= 4);
                return isBankAccount;
              }}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      // Description textarea
      case 'description':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <textarea
              value={formData()?.[field.name] || ''}
              onInput={(e) => updateFieldValue(field.name, e.currentTarget.value)}
              placeholder={field.placeholder || 'Descripción de la transacción...'}
              style={{
                ...inputStyle,
                'min-height': '80px',
                resize: 'vertical'
              }}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      // Notes textarea
      case 'notes':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <textarea
              value={formData()?.[field.name] || ''}
              onInput={(e) => updateFieldValue(field.name, e.currentTarget.value)}
              placeholder={field.placeholder || 'Notas adicionales (opcional)...'}
              style={{
                ...inputStyle,
                'min-height': '60px',
                resize: 'vertical',
                background: '#fffef5',
                'border-style': 'dashed'
              }}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      // ========== Standard Field Types ==========

      case 'select':
        return (
          <div style={fieldStyle}>
            <FormSelect
              label={field.label + (field.required ? ' *' : '')}
              value={formData()?.[field.name] || ''}
              onChange={(newValue) => updateFieldValue(field.name, newValue)}
              options={field.options || []}
              placeholder={field.placeholder}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      case 'searchable-select':
        return (
          <div style={fieldStyle}>
            <DynamicSearchableDropdown
              field={field}
              value={formData()?.[field.name]}
              onChange={(newValue) => updateFieldValue(field.name, newValue)}
              error={error()}
            />
          </div>
        );

      case 'textarea':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <textarea
              value={formData()?.[field.name] || ''}
              onInput={(e) => updateFieldValue(field.name, e.currentTarget.value)}
              placeholder={field.placeholder}
              style={{
                ...inputStyle,
                'min-height': '100px',
                resize: 'vertical'
              }}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      case 'date':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            <input
              type="date"
              value={formData()?.[field.name] || ''}
              onChange={(e) => updateFieldValue(field.name, e.currentTarget.value)}
              style={inputStyle}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      case 'number':
      case 'currency':
        return (
          <div style={fieldStyle}>
            <FormInput
              label={field.label + (field.required ? ' *' : '')}
              type="number"
              value={formData()?.[field.name] || ''}
              onChange={(newValue) => updateFieldValue(field.name, newValue)}
              placeholder={field.placeholder}
              step={field.type === 'currency' ? '0.01' : 'any'}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );

      default: // text
        return (
          <div style={fieldStyle}>
            <FormInput
              label={field.label + (field.required ? ' *' : '')}
              value={formData()?.[field.name] || ''}
              onChange={(newValue) => updateFieldValue(field.name, newValue)}
              placeholder={field.placeholder}
            />
            {error() && <div style={errorStyle}>{error()}</div>}
          </div>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Modal 
      isOpen={props.isOpen} 
      onClose={props.onClose} 
      title={props.template.name}
      size="large"
      maxWidth='80vw'
    >
      <Show when={!previewMode()}>
        <div>
          <div style={{ 'margin-bottom': '2rem', padding: '1rem', background: 'var(--surface-color)', 'border-radius': 'var(--border-radius)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>{props.template.name}</h4>
            <p style={{ margin: '0', color: 'var(--text-muted)' }}>{props.template.description}</p>
          </div>

          <div>
            <h3>Complete la Información Requerida</h3>
            <For each={props.template.fields}>
              {renderField}
            </For>
          </div>

          <div style={{ 
            display: 'flex', 
            'justify-content': 'flex-end', 
            gap: '1rem', 
            'margin-top': '2rem',
            'padding-top': '2rem',
            'border-top': '1px solid var(--border-color)' 
          }}>
            <Button variant="secondary" onClick={props.onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handlePreview}>
              Vista Previa del Asiento
            </Button>
          </div>
        </div>
      </Show>

      <Show when={previewMode() && processedTemplate()}>
        <div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '2rem' }}>
            <h3>Vista Previa del Asiento Contable</h3>
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              ← Volver al Formulario
            </Button>
          </div>

          {(() => {
            const processed = processedTemplate()!;
            
            return (
              <>
                {/* Mostrar errores si los hay */}
                <Show when={!processed.validation.isValid}>
                  <div style={{ 
                    padding: '1rem', 
                    background: '#f8d7da', 
                    color: '#721c24', 
                    'border-radius': 'var(--border-radius)',
                    'margin-bottom': '2rem'
                  }}>
                    <h4>⚠️ Errores en la Plantilla:</h4>
                    <For each={processed.validation.errors}>
                      {(error) => <div>• {error}</div>}
                    </For>
                  </div>
                </Show>

                {/* Mostrar advertencias si las hay */}
                <Show when={processed.validation.warnings.length > 0}>
                  <div style={{ 
                    padding: '1rem', 
                    background: '#fff3cd', 
                    color: '#856404', 
                    'border-radius': 'var(--border-radius)',
                    'margin-bottom': '2rem'
                  }}>
                    <h4>⚠️ Advertencias:</h4>
                    <For each={processed.validation.warnings}>
                      {(warning) => <div>• {warning}</div>}
                    </For>
                  </div>
                </Show>

                {/* Debug: Mostrar valores de campos */}
                <div style={{ 
                  'margin-bottom': '2rem', 
                  padding: '1rem', 
                  background: '#e8f5e8', 
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid #4caf50'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#2e7d2e' }}>🔍 Valores Capturados del Formulario</h4>
                  <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem' }}>
                    <For each={props.template.fields}>
                      {(field) => {
                        const value = formData()[field.name];
                        return (
                          <div style={{ 
                            padding: '0.5rem', 
                            background: 'white', 
                            'border-radius': '4px',
                            border: '1px solid #c8e6c9'
                          }}>
                            <div style={{ 'font-weight': '500', 'font-size': '0.875rem', color: '#2e7d2e' }}>
                              {field.label}
                            </div>
                            <div style={{ 'font-size': '0.875rem', color: '#666', 'margin-top': '0.25rem' }}>
                              Variable: <code>{'{' + field.name + '}'}</code>
                              {field.type === 'searchable-select' && field.dataSource && (
                                <div style={{ 'margin-top': '0.25rem', 'font-size': '0.75rem' }}>
                                  Tipo: {field.dataSource.type} | Campo: {field.dataSource.valueField || 'id'}
                                </div>
                              )}
                            </div>
                            <div style={{ 
                              'font-weight': '600', 
                              'margin-top': '0.25rem',
                              color: value ? '#1b5e20' : '#9e9e9e'
                            }}>
                              {value !== undefined && value !== null && value !== '' ? 
                                (typeof value === 'object' ? JSON.stringify(value) : String(value)) : 
                                <em>Sin valor</em>
                              }
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </div>

                {/* Información del asiento */}
                <div style={{ 
                  display: 'grid', 
                  'grid-template-columns': '1fr 1fr', 
                  gap: '2rem', 
                  'margin-bottom': '2rem' 
                }}>
                  <div>
                    <h4>Información General</h4>
                    <div style={{ padding: '1rem', background: 'var(--surface-color)', 'border-radius': 'var(--border-radius)' }}>
                      <div style={{ 'margin-bottom': '0.5rem' }}>
                        <strong>Descripción:</strong> {processed.generatedEntry.description}
                      </div>
                      <div>
                        <strong>Referencia:</strong> {processed.generatedEntry.reference || 'Sin referencia'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4>Resumen de Balance</h4>
                    <div style={{ padding: '1rem', background: 'var(--surface-color)', 'border-radius': 'var(--border-radius)' }}>
                      <div style={{ 'margin-bottom': '0.5rem' }}>
                        <strong>Total Débitos:</strong> {formatCurrency(
                          processed.generatedEntry.lines.reduce((sum, line) => sum + line.debitAmount, 0)
                        )}
                      </div>
                      <div style={{ 'margin-bottom': '0.5rem' }}>
                        <strong>Total Créditos:</strong> {formatCurrency(
                          processed.generatedEntry.lines.reduce((sum, line) => sum + line.creditAmount, 0)
                        )}
                      </div>
                      <div style={{ 
                        color: processed.validation.isValid ? '#4caf50' : '#dc3545',
                        'font-weight': '600'
                      }}>
                        {processed.validation.isValid ? '✓ Balanceado' : '⚠️ No Balanceado'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Líneas del asiento */}
                <div>
                  <h4>Líneas del Asiento ({processed.generatedEntry.lines.length})</h4>
                  <div style={{ 
                    border: '1px solid var(--border-color)', 
                    'border-radius': 'var(--border-radius)',
                    overflow: 'hidden'
                  }}>
                    {/* Cabecera */}
                    <div style={{ 
                      display: 'grid', 
                      'grid-template-columns': '2fr 1fr 2fr 1fr 1fr', 
                      gap: '1rem',
                      padding: '1rem',
                      background: 'var(--surface-color)',
                      'font-weight': '600',
                      'font-size': '0.875rem',
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <div>Cuenta</div>
                      <div>Documento</div>
                      <div>Descripción</div>
                      <div>Débito</div>
                      <div>Crédito</div>
                    </div>

                    {/* Líneas */}
                    <For each={processed.generatedEntry.lines}>
                      {(line, index) => (
                        <div style={{ 
                          display: 'grid', 
                          'grid-template-columns': '2fr 1fr 2fr 1fr 1fr', 
                          gap: '1rem',
                          padding: '1rem',
                          'border-bottom': index() < processed.generatedEntry.lines.length - 1 ? '1px solid var(--border-color)' : 'none'
                        }}>
                          <div>
                            <div style={{ 'font-weight': '500' }}>{line.accountName}</div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                              {line.accountId}
                            </div>
                          </div>
                          <div style={{ 'font-size': '0.875rem' }}>
                            {line.document}
                          </div>
                           <div style={{ 'font-size': '0.875rem' }}>
                            {line.description}
                          </div>
                          <div style={{ 
                            'font-weight': '600', 
                            color: line.debitAmount > 0 ? '#4caf50' : 'var(--text-muted)' 
                          }}>
                            {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                          </div>
                          <div style={{ 
                            'font-weight': '600', 
                            color: line.creditAmount > 0 ? '#dc3545' : 'var(--text-muted)' 
                          }}>
                            {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  'justify-content': 'flex-end', 
                  gap: '1rem', 
                  'margin-top': '2rem',
                  'padding-top': '2rem',
                  'border-top': '1px solid var(--border-color)' 
                }}>
                  <Button variant="secondary" onClick={props.onClose}>
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={!processed.validation.isValid}
                  >
                    Crear Asiento Contable
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      </Show>
    </Modal>
  );
};

export default DynamicTemplateForm;