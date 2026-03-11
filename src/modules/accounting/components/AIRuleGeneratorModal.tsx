/**
 * AI Rule Generator Modal
 * Reusable modal component for generating accounting rules from data
 */

import { Component, createSignal, Show, For } from 'solid-js';
import { Button, Modal } from '../../ui';
import { accountingApi, GeneratedRule, AccountingRule } from '../services/accountingApi';

interface AIRuleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: string;
  initialEventType?: string;
  dataSource?: 'invoice' | 'inventory' | 'transaction' | 'manual';
  sourceId?: string;
  onRuleCreated?: (rule: any) => void;
}

const AIRuleGeneratorModal: Component<AIRuleGeneratorModalProps> = (props) => {
  const [inputData, setInputData] = createSignal(props.initialData || '');
  const [eventType, setEventType] = createSignal(props.initialEventType || 'invoice_generated');
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [generatedRule, setGeneratedRule] = createSignal<GeneratedRule | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveResult, setSaveResult] = createSignal<{ success: boolean; message: string } | null>(null);

  // Update input when props change
  const getInputData = () => props.initialData || inputData();

  const eventTypeOptions = [
    { value: 'invoice_generated', label: 'Cuando se genera una factura', icon: '🧾' },
    { value: 'transaction_created', label: 'Cuando se crea una transacción', icon: '💰' },
    { value: 'document_uploaded', label: 'Cuando se sube un documento', icon: '📄' },
    { value: 'inventory_movement', label: 'Cuando hay movimiento de inventario', icon: '📦' }
  ];

  const ruleTypeLabels: Record<string, { label: string; icon: string }> = {
    auto_categorize: { label: 'Auto-categorizar', icon: '🏷️' },
    auto_split: { label: 'Auto-dividir', icon: '✂️' },
    auto_reconcile: { label: 'Auto-conciliar', icon: '🔄' },
    alert: { label: 'Alerta', icon: '🔔' },
    validation: { label: 'Validación', icon: '✓' }
  };

  const handleGenerate = async () => {
    const data = getInputData();
    if (!data.trim()) {
      setError('Por favor proporciona datos para generar la regla');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedRule(null);
    setSaveResult(null);

    try {
      const result = await accountingApi.rules.generateFromAI(data, eventType());

      if (result) {
        setGeneratedRule(result);
      } else {
        setError('No se pudo generar la regla. Intenta con más detalles.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al generar la regla con IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const rule = generatedRule();
    if (!rule) return;

    setIsSaving(true);
    setSaveResult(null);

    try {
      const ruleToSave: Omit<AccountingRule, 'id'> = {
        name: rule.name,
        description: rule.description,
        ruleType: rule.ruleType as AccountingRule['ruleType'],
        triggerType: rule.triggerType as AccountingRule['triggerType'],
        conditions: rule.conditions.map(c => ({
          field: c.field,
          operator: c.operator as any,
          value: c.value
        })),
        actions: rule.actions.map(a => ({
          actionType: a.actionType as any,
          parameters: a.parameters
        })),
        priority: 1,
        isActive: true
      };

      const result = await accountingApi.rules.createCustom(ruleToSave);

      if (result) {
        setSaveResult({
          success: true,
          message: `Regla "${rule.name}" creada exitosamente`
        });
        props.onRuleCreated?.(result);

        // Close after short delay
        setTimeout(() => {
          props.onClose();
        }, 1500);
      } else {
        setSaveResult({
          success: false,
          message: 'Error al guardar la regla'
        });
      }
    } catch (err: any) {
      setSaveResult({
        success: false,
        message: err.message || 'Error al guardar la regla'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setGeneratedRule(null);
    setError(null);
    setSaveResult(null);
    setInputData('');
    props.onClose();
  };

  const cardStyle = {
    background: 'var(--surface-secondary)',
    'border-radius': 'var(--border-radius-md)',
    padding: '1rem',
    'margin-bottom': '1rem'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title="✨ Generar Regla con IA"
    >
      <div style={{ 'max-height': '70vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          'border-radius': 'var(--border-radius-md)',
          'margin-bottom': '1.5rem'
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
            <span style={{ 'font-size': '1.5rem' }}>
              {props.dataSource === 'invoice' ? '🧾' :
               props.dataSource === 'inventory' ? '📦' : '✨'}
            </span>
            <div>
              <h4 style={{ margin: 0, 'font-weight': '600' }}>
                {props.dataSource === 'invoice' ? 'Crear regla desde factura' :
                 props.dataSource === 'inventory' ? 'Crear regla desde inventario' :
                 'Crear regla con IA'}
              </h4>
              <p style={{ margin: 0, 'font-size': '0.875rem', opacity: 0.9 }}>
                La IA analizará los datos y generará una regla automática
              </p>
            </div>
          </div>
        </div>

        {/* Event Type Selection */}
        <div style={cardStyle}>
          <label style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'block' }}>
            Tipo de evento
          </label>
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.5rem' }}>
            <For each={eventTypeOptions}>
              {(option) => (
                <button
                  onClick={() => setEventType(option.value)}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid ${eventType() === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    'border-radius': 'var(--border-radius-sm)',
                    background: eventType() === option.value ? 'var(--primary-color)' : 'white',
                    color: eventType() === option.value ? 'white' : 'inherit',
                    cursor: 'pointer',
                    'text-align': 'left',
                    'font-size': '0.875rem'
                  }}
                >
                  <span style={{ 'margin-right': '0.5rem' }}>{option.icon}</span>
                  {option.label}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Data Input */}
        <div style={cardStyle}>
          <label style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', display: 'block' }}>
            Datos para analizar
          </label>
          <Show when={props.dataSource === 'invoice' || props.dataSource === 'inventory'}>
            <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
              Los datos del {props.dataSource === 'invoice' ? 'factura' : 'inventario'} ya están cargados
            </p>
          </Show>
          <textarea
            value={getInputData()}
            onInput={(e) => setInputData(e.currentTarget.value)}
            placeholder="Describe la regla que quieres crear o los datos del que derivarla..."
            style={{
              width: '100%',
              'min-height': '120px',
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-family': 'inherit',
              'font-size': '0.875rem',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Generate Button */}
        <div style={{ 'text-align': 'center', 'margin-bottom': '1rem' }}>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating() || !getInputData().trim()}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            {isGenerating() ? '⏳ Generando...' : '✨ Generar Regla'}
          </Button>
        </div>

        {/* Error */}
        <Show when={error()}>
          <div style={{
            padding: '0.75rem',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            'border-radius': 'var(--border-radius-sm)',
            color: '#991b1b',
            'margin-bottom': '1rem'
          }}>
            ❌ {error()}
          </div>
        </Show>

        {/* Save Result */}
        <Show when={saveResult()}>
          <div style={{
            padding: '0.75rem',
            background: saveResult()?.success ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${saveResult()?.success ? '#10b981' : '#ef4444'}`,
            'border-radius': 'var(--border-radius-sm)',
            color: saveResult()?.success ? '#065f46' : '#991b1b',
            'margin-bottom': '1rem'
          }}>
            {saveResult()?.success ? '✅' : '❌'} {saveResult()?.message}
          </div>
        </Show>

        {/* Generated Rule Preview */}
        <Show when={generatedRule()}>
          <div style={{
            padding: '1rem',
            background: '#f0fdf4',
            border: '2px solid #10b981',
            'border-radius': 'var(--border-radius-md)'
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
              <h4 style={{ margin: 0, color: '#065f46' }}>✅ Regla Generada</h4>
              <Show when={generatedRule()?.confidence}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: '#d1fae5',
                  'border-radius': '9999px',
                  'font-size': '0.75rem',
                  color: '#065f46'
                }}>
                  {Math.round((generatedRule()?.confidence || 0) * 100)}% confianza
                </span>
              </Show>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem', 'font-size': '0.875rem' }}>
              <div>
                <strong>Nombre:</strong> {generatedRule()?.name}
              </div>
              <div>
                <strong>Descripción:</strong> {generatedRule()?.description}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div>
                  <strong>Tipo:</strong>{' '}
                  {ruleTypeLabels[generatedRule()?.ruleType || '']?.icon}{' '}
                  {ruleTypeLabels[generatedRule()?.ruleType || '']?.label || generatedRule()?.ruleType}
                </div>
                <div>
                  <strong>Disparador:</strong> {generatedRule()?.triggerType}
                </div>
              </div>

              <Show when={generatedRule()?.conditions?.length}>
                <div>
                  <strong>Condiciones:</strong>
                  <For each={generatedRule()?.conditions}>
                    {(c) => (
                      <div style={{ 'margin-left': '1rem', 'font-family': 'monospace', 'font-size': '0.8rem' }}>
                        {c.field} {c.operator} "{c.value}"
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={generatedRule()?.actions?.length}>
                <div>
                  <strong>Acciones:</strong>
                  <For each={generatedRule()?.actions}>
                    {(a) => (
                      <div style={{ 'margin-left': '1rem', 'font-family': 'monospace', 'font-size': '0.8rem' }}>
                        {a.actionType}: {JSON.stringify(a.parameters)}
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={generatedRule()?.reasoning}>
                <div style={{ 'font-style': 'italic', color: 'var(--text-muted)' }}>
                  💡 {generatedRule()?.reasoning}
                </div>
              </Show>
            </div>

            <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.5rem', 'margin-top': '1rem' }}>
              <Button variant="secondary" onClick={() => setGeneratedRule(null)}>
                Descartar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving()}
                style={{ background: '#059669' }}
              >
                {isSaving() ? 'Guardando...' : '💾 Guardar Regla'}
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </Modal>
  );
};

export default AIRuleGeneratorModal;
