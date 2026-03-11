import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { TemplateLineRule } from '../types/journalTemplateTypes';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import { generateRandomId } from '../../../services/utils';
import { accountsStore } from '../../accounts';

interface VisualLineBuilderProps {
  lineRules: TemplateLineRule[];
  onLineRulesChange: (rules: TemplateLineRule[]) => void;
  availableFields: Array<{ name: string; label: string; type: string }>;
}

const VisualLineBuilder: Component<VisualLineBuilderProps> = (props) => {
  const [expandedConditions, setExpandedConditions] = createSignal<Set<string>>(new Set());

  // Toggle condition section visibility
  const toggleConditions = (lineId: string) => {
    const expanded = new Set(expandedConditions());
    if (expanded.has(lineId)) {
      expanded.delete(lineId);
    } else {
      expanded.add(lineId);
    }
    setExpandedConditions(expanded);
  };

  // Add a new line rule
  const addNewLine = () => {
    const newLine: TemplateLineRule = {
      id: generateRandomId(),
      accountId: '',
      description: '',
      type: 'debit',
      amountExpression: '',
      conditions: []
    };
    props.onLineRulesChange([...props.lineRules, newLine]);
  };

  // Remove a line rule
  const removeLine = (lineId: string) => {
    props.onLineRulesChange(props.lineRules.filter(line => line.id !== lineId));
  };

  // Update a specific line rule
  const updateLine = (lineId: string, updates: Partial<TemplateLineRule>) => {
    props.onLineRulesChange(
      props.lineRules.map(line =>
        line.id === lineId ? { ...line, ...updates } : line
      )
    );
  };

  // Add a condition to a line
  const addCondition = (lineId: string) => {
    const line = props.lineRules.find(l => l.id === lineId);
    if (!line) return;

    const newCondition = {
      field: '',
      operator: '=' as const,
      value: ''
    };

    updateLine(lineId, {
      conditions: [...(line.conditions || []), newCondition]
    });

    // Expand conditions section
    const expanded = new Set(expandedConditions());
    expanded.add(lineId);
    setExpandedConditions(expanded);
  };

  // Remove a condition from a line
  const removeCondition = (lineId: string, conditionIndex: number) => {
    const line = props.lineRules.find(l => l.id === lineId);
    if (!line || !line.conditions) return;

    updateLine(lineId, {
      conditions: line.conditions.filter((_, index) => index !== conditionIndex)
    });
  };

  // Update a specific condition
  const updateCondition = (
    lineId: string,
    conditionIndex: number,
    field: 'field' | 'operator' | 'value',
    value: any
  ) => {
    const line = props.lineRules.find(l => l.id === lineId);
    if (!line || !line.conditions) return;

    const updatedConditions = line.conditions.map((cond, index) =>
      index === conditionIndex ? { ...cond, [field]: value } : cond
    );

    updateLine(lineId, { conditions: updatedConditions });
  };

  // Calculate balance summary
  const balanceSummary = createMemo(() => {
    const debitExpressions = props.lineRules
      .filter(line => line.type === 'debit')
      .map(line => line.amountExpression);

    const creditExpressions = props.lineRules
      .filter(line => line.type === 'credit')
      .map(line => line.amountExpression);

    // Check if expressions match (simple check)
    const debitSet = new Set(debitExpressions);
    const creditSet = new Set(creditExpressions);

    const isBalanced =
      debitExpressions.length > 0 &&
      creditExpressions.length > 0 &&
      debitExpressions.some(expr => creditSet.has(expr));

    return {
      debitLines: props.lineRules.filter(l => l.type === 'debit').length,
      creditLines: props.lineRules.filter(l => l.type === 'credit').length,
      debitExpressions: debitExpressions.join(' + '),
      creditExpressions: creditExpressions.join(' + '),
      isBalanced
    };
  });

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem'
  };

  const lineCardStyle = {
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    background: 'var(--surface-color)',
    overflow: 'hidden'
  };

  const lineHeaderStyle = (type: 'debit' | 'credit') => ({
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    'background-color': type === 'debit' ? '#e8f5e9' : '#fff3e0',
    'border-bottom': '1px solid var(--border-color)'
  });

  const lineBodyStyle = {
    padding: '1.5rem'
  };

  const fieldRowStyle = {
    display: 'grid',
    'grid-template-columns': 'auto 1fr auto',
    gap: '1rem',
    'align-items': 'start',
    'margin-bottom': '1rem'
  };

  const labelStyle = {
    'font-weight': '500',
    'padding-top': '0.75rem',
    'min-width': '80px'
  };

  const inputWithButtonStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'stretch'
  };

  const expressionButtonStyle = {
    padding: '0.75rem 1rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    'font-size': '1.2rem',
    transition: 'all 0.2s ease',
    'flex-shrink': '0'
  };

  const conditionsSectionStyle = {
    'margin-top': '1rem',
    padding: '1rem',
    background: '#f8f9fa',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };

  const conditionsHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    cursor: 'pointer',
    'user-select': 'none' as const,
    'margin-bottom': '0.5rem'
  };

  const conditionRowStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 120px 1fr auto',
    gap: '0.5rem',
    'align-items': 'end',
    'margin-top': '0.75rem',
    padding: '0.75rem',
    background: 'white',
    'border-radius': 'var(--border-radius-sm)'
  };

  const balanceIndicatorStyle = (isBalanced: boolean) => ({
    'margin-top': '2rem',
    padding: '1.5rem',
    'border-radius': 'var(--border-radius)',
    background: isBalanced ? '#e8f5e9' : '#fff3e0',
    border: `2px solid ${isBalanced ? '#4caf50' : '#ff9800'}`
  });

  const addButtonStyle = {
    width: '100%',
    padding: '1rem',
    border: '2px dashed var(--border-color)',
    'border-radius': 'var(--border-radius)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'all 0.2s ease',
    'margin-top': '1rem'
  };

  const accountModeOptions = [
    { value: 'fixed', label: 'Cuenta Fija' },
    { value: 'dynamic', label: 'Expresión Dinámica' }
  ];

  const operatorOptions = [
    { value: '=', label: 'Igual a (=)' },
    { value: '!=', label: 'Diferente de (!=)' },
    { value: '>', label: 'Mayor que (>)' },
    { value: '<', label: 'Menor que (<)' },
    { value: '>=', label: 'Mayor o igual (>=)' },
    { value: '<=', label: 'Menor o igual (<=)' },
    { value: 'contains', label: 'Contiene' },
    { value: 'not_empty', label: 'No vacío' }
  ];

  return (
    <div style={containerStyle}>
      {/* Line rules list */}
      <For each={props.lineRules}>
        {(line, index) => {
          const [accountMode, setAccountMode] = createSignal<'fixed' | 'dynamic'>(
            line.accountExpression ? 'dynamic' : 'fixed'
          );

          return (
            <div style={lineCardStyle}>
              {/* Line header */}
              <div style={lineHeaderStyle(line.type)}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                  <strong>Línea {index() + 1}</strong>
                  <select
                    value={line.type}
                    onChange={(e) => updateLine(line.id, { type: e.currentTarget.value as 'debit' | 'credit' })}
                    style={{
                      padding: '0.5rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      'font-weight': '500'
                    }}
                  >
                    <option value="debit">Débito</option>
                    <option value="credit">Crédito</option>
                  </select>
                </div>
                <button
                  onClick={() => removeLine(line.id)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    'border-radius': '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    'font-weight': 'bold',
                    'font-size': '1.2rem',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center'
                  }}
                  title="Eliminar línea"
                >
                  −
                </button>
              </div>

              {/* Line body */}
              <div style={lineBodyStyle}>
                {/* Account selection */}
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Cuenta:</label>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', width: '100%' }}>
                    <select
                      value={accountMode()}
                      onChange={(e) => {
                        const mode = e.currentTarget.value as 'fixed' | 'dynamic';
                        setAccountMode(mode);
                        if (mode === 'fixed') {
                          updateLine(line.id, { accountExpression: undefined });
                        } else {
                          updateLine(line.id, { accountId: '' });
                        }
                      }}
                      style={{
                        padding: '0.5rem',
                        'border-radius': 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)',
                        'font-size': '0.875rem'
                      }}
                    >
                      <option value="fixed">Cuenta Fija</option>
                      <option value="dynamic">Expresión Dinámica</option>
                    </select>

                    <Show
                      when={accountMode() === 'fixed'}
                      fallback={
                        <input
                          type="text"
                          value={line.accountExpression || ''}
                          onInput={(e) => updateLine(line.id, { accountExpression: e.currentTarget.value })}
                          placeholder="Ej: {accountId}, account_{type}"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border-color)',
                            'border-radius': 'var(--border-radius-sm)',
                            'font-size': '1rem',
                            'font-family': 'inherit'
                          }}
                        />
                      }
                    >
                      <SearchableAccountDropdown
                        selectedAccountId={line.accountId}
                        onSelect={(account) => updateLine(line.id, { accountId: account.id })}
                        placeholder="Seleccionar cuenta..."
                      />
                    </Show>

                    <Show when={line.accountId}>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                        {accountsStore.getAccountById(line.accountId)?.accountNumber} - {accountsStore.getAccountById(line.accountId)?.name}
                      </div>
                    </Show>
                  </div>
                  <div style={{ width: '50px' }}></div>
                </div>

                {/* Amount expression */}
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Monto:</label>
                  <div style={inputWithButtonStyle}>
                    <input
                      type="text"
                      value={line.amountExpression}
                      onInput={(e) => updateLine(line.id, { amountExpression: e.currentTarget.value })}
                      placeholder="Ej: {amount}, {subtotal} * 1.18"
                      style={{
                        flex: '1',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '1rem',
                        'font-family': 'inherit'
                      }}
                    />
                    <button
                      style={expressionButtonStyle}
                      title="Ayuda de expresiones"
                      onClick={() => {
                        // TODO: Open ExpressionHelper modal
                        alert('Helper de expresiones - Por implementar');
                      }}
                    >
                      📝
                    </button>
                  </div>
                  <div style={{ width: '50px' }}></div>
                </div>

                {/* Description */}
                <div style={fieldRowStyle}>
                  <label style={labelStyle}>Desc:</label>
                  <div style={inputWithButtonStyle}>
                    <input
                      type="text"
                      value={line.description}
                      onInput={(e) => updateLine(line.id, { description: e.currentTarget.value })}
                      placeholder="Ej: Pago: {description}"
                      style={{
                        flex: '1',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '1rem',
                        'font-family': 'inherit'
                      }}
                    />
                    <button
                      style={expressionButtonStyle}
                      title="Ayuda de expresiones"
                      onClick={() => {
                        // TODO: Open ExpressionHelper modal
                        alert('Helper de expresiones - Por implementar');
                      }}
                    >
                      📝
                    </button>
                  </div>
                  <div style={{ width: '50px' }}></div>
                </div>

                {/* Conditions section */}
                <div style={conditionsSectionStyle}>
                  <div
                    style={conditionsHeaderStyle}
                    onClick={() => toggleConditions(line.id)}
                  >
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                      <span style={{ 'font-size': '1.2rem' }}>
                        {expandedConditions().has(line.id) ? '▾' : '▸'}
                      </span>
                      <strong>Condiciones</strong>
                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                        (opcional - {line.conditions?.length || 0})
                      </span>
                    </div>
                    <Show when={!expandedConditions().has(line.id)}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addCondition(line.id);
                        }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          'font-size': '0.875rem'
                        }}
                      >
                        + Agregar condición
                      </button>
                    </Show>
                  </div>

                  <Show when={expandedConditions().has(line.id)}>
                    <div style={{ 'margin-top': '1rem' }}>
                      <Show
                        when={line.conditions && line.conditions.length > 0}
                        fallback={
                          <div style={{
                            padding: '1rem',
                            'text-align': 'center',
                            color: 'var(--text-muted)',
                            'font-size': '0.875rem'
                          }}>
                            No hay condiciones configuradas
                          </div>
                        }
                      >
                        <For each={line.conditions}>
                          {(condition, condIndex) => (
                            <div style={conditionRowStyle}>
                              <select
                                value={condition.field}
                                onChange={(e) => updateCondition(line.id, condIndex(), 'field', e.currentTarget.value)}
                                style={{
                                  padding: '0.75rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-size': '0.875rem'
                                }}
                              >
                                <option value="">Seleccionar campo...</option>
                                <For each={props.availableFields}>
                                  {(field) => (
                                    <option value={field.name}>{field.label}</option>
                                  )}
                                </For>
                              </select>

                              <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(line.id, condIndex(), 'operator', e.currentTarget.value)}
                                style={{
                                  padding: '0.75rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-size': '0.875rem'
                                }}
                              >
                                <For each={operatorOptions}>
                                  {(op) => <option value={op.value}>{op.label}</option>}
                                </For>
                              </select>

                              <input
                                type="text"
                                value={condition.value}
                                onInput={(e) => updateCondition(line.id, condIndex(), 'value', e.currentTarget.value)}
                                placeholder="Valor..."
                                disabled={condition.operator === 'not_empty'}
                                style={{
                                  padding: '0.75rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-size': '0.875rem',
                                  opacity: condition.operator === 'not_empty' ? '0.5' : '1'
                                }}
                              />

                              <button
                                onClick={() => removeCondition(line.id, condIndex())}
                                style={{
                                  padding: '0.5rem',
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  'border-radius': 'var(--border-radius-sm)',
                                  cursor: 'pointer',
                                  'font-weight': 'bold'
                                }}
                                title="Eliminar condición"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </For>
                      </Show>

                      <button
                        onClick={() => addCondition(line.id)}
                        style={{
                          'margin-top': '0.75rem',
                          padding: '0.5rem 1rem',
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          'font-size': '0.875rem',
                          width: '100%'
                        }}
                      >
                        + Agregar condición
                      </button>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          );
        }}
      </For>

      {/* Add new line button */}
      <button
        style={addButtonStyle}
        onClick={addNewLine}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary-color)';
          e.currentTarget.style.color = 'var(--primary-color)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        + Agregar nueva línea
      </button>

      {/* Balance indicator */}
      <Show when={props.lineRules.length > 0}>
        <div style={balanceIndicatorStyle(balanceSummary().isBalanced)}>
          <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem' }}>
            Resumen de Balance {balanceSummary().isBalanced ? '✓' : '⚠'}
          </h4>
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
            <div>
              <strong>Débitos ({balanceSummary().debitLines}):</strong>
              <div style={{ 'font-family': 'monospace', 'margin-top': '0.5rem', 'font-size': '0.875rem' }}>
                {balanceSummary().debitExpressions || 'Ninguno'}
              </div>
            </div>
            <div>
              <strong>Créditos ({balanceSummary().creditLines}):</strong>
              <div style={{ 'font-family': 'monospace', 'margin-top': '0.5rem', 'font-size': '0.875rem' }}>
                {balanceSummary().creditExpressions || 'Ninguno'}
              </div>
            </div>
          </div>
          <Show when={!balanceSummary().isBalanced}>
            <div style={{
              'margin-top': '1rem',
              padding: '0.75rem',
              background: '#fff3cd',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem'
            }}>
              ⚠ Las expresiones de débito y crédito deben balancear. Verifica que las sumas sean equivalentes.
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default VisualLineBuilder;
