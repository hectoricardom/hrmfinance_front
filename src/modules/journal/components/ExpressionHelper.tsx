import { Component, createSignal, For, Show } from 'solid-js';
import Modal from '../../ui/components/Modal';

interface ExpressionHelperProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (expression: string) => void;
  initialExpression?: string;
  availableFields: Array<{ name: string; label: string; type: string }>;
  expressionType: 'amount' | 'description' | 'account';
}

interface MathFunction {
  name: string;
  signature: string;
  description: string;
  example: string;
}

const ExpressionHelper: Component<ExpressionHelperProps> = (props) => {
  const [expression, setExpression] = createSignal(props.initialExpression || '');
  let textareaRef: HTMLTextAreaElement | undefined;

  // Sample data for testing
  const sampleData: Record<string, any> = {
    subtotal: 1000,
    amount: 500,
    quantity: 10,
    unitPrice: 50,
    taxRate: 18,
    discount: 100,
    documentNumber: 'F001-00123',
    customerName: 'Cliente Ejemplo',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
  };

  // Available math functions for amount expressions
  const mathFunctions: MathFunction[] = [
    {
      name: 'sum',
      signature: 'sum(...values)',
      description: 'Suma varios valores',
      example: 'sum({subtotal}, {discount})'
    },
    {
      name: 'percentage',
      signature: 'percentage(value, percent)',
      description: 'Calcula un porcentaje',
      example: 'percentage({subtotal}, {taxRate})'
    },
    {
      name: 'multiply',
      signature: 'multiply(a, b)',
      description: 'Multiplica dos valores',
      example: 'multiply({quantity}, {unitPrice})'
    },
    {
      name: 'divide',
      signature: 'divide(a, b)',
      description: 'Divide dos valores',
      example: 'divide({subtotal}, {quantity})'
    },
    {
      name: 'round',
      signature: 'round(value, decimals)',
      description: 'Redondea a N decimales',
      example: 'round({amount}, 2)'
    }
  ];

  // Math operators
  const mathOperators = [
    { symbol: '+', description: 'Suma' },
    { symbol: '-', description: 'Resta' },
    { symbol: '*', description: 'Multiplicación' },
    { symbol: '/', description: 'División' },
    { symbol: '()', description: 'Paréntesis para agrupar' }
  ];

  // Examples based on expression type
  const getExamples = () => {
    switch (props.expressionType) {
      case 'amount':
        return [
          { label: 'Monto simple', value: '{amount}' },
          { label: 'Calcular IGV', value: 'percentage({subtotal}, 18)' },
          { label: 'Total con impuesto', value: '{subtotal} + percentage({subtotal}, 18)' },
          { label: 'Cantidad por precio', value: '{quantity} * {unitPrice}' },
          { label: 'Total con descuento', value: '{subtotal} - {discount}' }
        ];
      case 'description':
        return [
          { label: 'Con número de documento', value: 'Factura {documentNumber}' },
          { label: 'Con cliente', value: 'Venta a {customerName}' },
          { label: 'Con fecha', value: 'Factura {documentNumber} del {day}/{month}/{year}' },
          { label: 'Descripción completa', value: '{customerName} - Fact. {documentNumber}' }
        ];
      case 'account':
        return [
          { label: 'Cuenta fija', value: '40111' },
          { label: 'Cuenta según campo', value: '{accountCode}' }
        ];
      default:
        return [];
    }
  };

  // Insert variable at cursor position
  const insertVariable = (variableName: string) => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const currentValue = expression();
    const variableText = `{${variableName}}`;

    const newValue =
      currentValue.substring(0, start) +
      variableText +
      currentValue.substring(end);

    setExpression(newValue);

    // Set cursor position after inserted variable
    setTimeout(() => {
      if (textareaRef) {
        const newPosition = start + variableText.length;
        textareaRef.focus();
        textareaRef.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Insert function template at cursor position
  const insertFunction = (functionName: string) => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const currentValue = expression();

    let functionText = '';
    switch (functionName) {
      case 'sum':
        functionText = 'sum(value1, value2)';
        break;
      case 'percentage':
        functionText = 'percentage(value, percent)';
        break;
      case 'multiply':
        functionText = 'multiply(a, b)';
        break;
      case 'divide':
        functionText = 'divide(a, b)';
        break;
      case 'round':
        functionText = 'round(value, 2)';
        break;
    }

    const newValue =
      currentValue.substring(0, start) +
      functionText +
      currentValue.substring(end);

    setExpression(newValue);

    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus();
        textareaRef.setSelectionRange(start, start + functionText.length);
      }
    }, 0);
  };

  // Evaluate expression with sample data
  const evaluateExpression = () => {
    try {
      let processed = expression();

      // Replace variables with sample values
      const variableMatches = processed.match(/\{([^}]+)\}/g);
      if (variableMatches) {
        for (const match of variableMatches) {
          const varName = match.slice(1, -1);
          const value = sampleData[varName];
          if (value !== undefined) {
            processed = processed.replace(match, String(value));
          } else {
            processed = processed.replace(match, '0');
          }
        }
      }

      if (props.expressionType === 'amount') {
        // Replace functions
        processed = processed.replace(/sum\((.*?)\)/g, (match, args) => {
          const values = args.split(',').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v));
          return values.reduce((a: number, b: number) => a + b, 0).toString();
        });

        processed = processed.replace(/percentage\(([^,]+),([^)]+)\)/g, (match, amount, percent) => {
          return (parseFloat(amount) * (parseFloat(percent) / 100)).toString();
        });

        processed = processed.replace(/multiply\(([^,]+),([^)]+)\)/g, (match, a, b) => {
          return (parseFloat(a) * parseFloat(b)).toString();
        });

        processed = processed.replace(/divide\(([^,]+),([^)]+)\)/g, (match, a, b) => {
          const divisor = parseFloat(b);
          return divisor !== 0 ? (parseFloat(a) / divisor).toString() : '0';
        });

        processed = processed.replace(/round\(([^,]+),([^)]+)\)/g, (match, value, decimals) => {
          const dec = parseInt(decimals) || 2;
          return (Math.round(parseFloat(value) * Math.pow(10, dec)) / Math.pow(10, dec)).toString();
        });

        // Evaluate math expression
        const sanitized = processed.replace(/[^0-9+\-*/().\s]/g, '');
        const result = new Function('return ' + sanitized)();

        return typeof result === 'number' ? result.toFixed(2) : '0.00';
      } else {
        // For description, just return the processed string
        return processed;
      }
    } catch (error) {
      return 'Error en expresión';
    }
  };

  const handleApply = () => {
    props.onApply(expression());
    props.onClose();
  };

  const handleCancel = () => {
    setExpression(props.initialExpression || '');
    props.onClose();
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleCancel}
      title={`Ayuda de Expresiones - ${props.expressionType === 'amount' ? 'Monto' : props.expressionType === 'description' ? 'Descripción' : 'Cuenta'}`}
      maxWidth="900px"
    >
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Left Panel - Variables and Functions */}
        <div style={{ flex: '1', 'min-width': '0' }}>
          {/* Available Variables */}
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h3 style={{
              'font-size': '0.875rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              'margin-bottom': '0.75rem',
              'text-transform': 'uppercase',
              'letter-spacing': '0.05em'
            }}>
              Variables Disponibles
            </h3>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.5rem',
              'max-height': '200px',
              overflow: 'auto',
              padding: '0.5rem',
              background: 'var(--background-color)',
              'border-radius': 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)'
            }}>
              <For each={props.availableFields}>
                {(field) => (
                  <button
                    type="button"
                    onClick={() => insertVariable(field.name)}
                    style={{
                      background: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      'border-radius': '4px',
                      padding: '0.5rem 0.75rem',
                      'font-size': '0.813rem',
                      color: 'var(--primary-color)',
                      'font-weight': '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      'text-align': 'left',
                      display: 'flex',
                      'flex-direction': 'column',
                      gap: '0.25rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary-light)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ 'font-family': 'monospace' }}>{`{${field.name}}`}</span>
                    <span style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'font-weight': '400'
                    }}>
                      {field.label}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Math Functions (only for amount type) */}
          <Show when={props.expressionType === 'amount'}>
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <h3 style={{
                'font-size': '0.875rem',
                'font-weight': '600',
                color: 'var(--text-primary)',
                'margin-bottom': '0.75rem',
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em'
              }}>
                Funciones
              </h3>
              <div style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '0.5rem',
                'max-height': '250px',
                overflow: 'auto',
                padding: '0.5rem',
                background: 'var(--background-color)',
                'border-radius': 'var(--border-radius-sm)',
                border: '1px solid var(--border-color)'
              }}>
                <For each={mathFunctions}>
                  {(func) => (
                    <button
                      type="button"
                      onClick={() => insertFunction(func.name)}
                      style={{
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        'border-radius': '4px',
                        padding: '0.75rem',
                        'text-align': 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--background-color)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-color)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{
                        'font-family': 'monospace',
                        'font-size': '0.875rem',
                        color: 'var(--primary-color)',
                        'font-weight': '600',
                        'margin-bottom': '0.25rem'
                      }}>
                        {func.signature}
                      </div>
                      <div style={{
                        'font-size': '0.75rem',
                        color: 'var(--text-secondary)',
                        'margin-bottom': '0.25rem'
                      }}>
                        {func.description}
                      </div>
                      <div style={{
                        'font-family': 'monospace',
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)',
                        background: 'var(--background-color)',
                        padding: '0.25rem 0.5rem',
                        'border-radius': '4px',
                        'margin-top': '0.25rem'
                      }}>
                        {func.example}
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Math Operators */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <h3 style={{
                'font-size': '0.875rem',
                'font-weight': '600',
                color: 'var(--text-primary)',
                'margin-bottom': '0.75rem',
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em'
              }}>
                Operadores
              </h3>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                'flex-wrap': 'wrap'
              }}>
                <For each={mathOperators}>
                  {(op) => (
                    <div style={{
                      background: 'var(--background-color)',
                      border: '1px solid var(--border-color)',
                      'border-radius': '4px',
                      padding: '0.5rem 0.75rem',
                      'font-size': '0.813rem',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        'font-family': 'monospace',
                        'font-weight': '600',
                        color: 'var(--primary-color)'
                      }}>
                        {op.symbol}
                      </span>
                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                        {op.description}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Examples */}
          <div>
            <h3 style={{
              'font-size': '0.875rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              'margin-bottom': '0.75rem',
              'text-transform': 'uppercase',
              'letter-spacing': '0.05em'
            }}>
              Ejemplos
            </h3>
            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '0.5rem',
              padding: '0.5rem',
              background: 'var(--background-color)',
              'border-radius': 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)'
            }}>
              <For each={getExamples()}>
                {(example) => (
                  <button
                    type="button"
                    onClick={() => setExpression(example.value)}
                    style={{
                      background: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      'border-radius': '4px',
                      padding: '0.5rem 0.75rem',
                      'text-align': 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      'flex-direction': 'column',
                      gap: '0.25rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--background-color)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-color)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'font-weight': '500'
                    }}>
                      {example.label}
                    </span>
                    <span style={{
                      'font-family': 'monospace',
                      'font-size': '0.813rem',
                      color: 'var(--text-primary)'
                    }}>
                      {example.value}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* Right Panel - Expression Editor and Preview */}
        <div style={{ flex: '1', 'min-width': '0' }}>
          {/* Expression Input */}
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <label style={{
              display: 'block',
              'font-size': '0.875rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              'margin-bottom': '0.5rem',
              'text-transform': 'uppercase',
              'letter-spacing': '0.05em'
            }}>
              Expresión
            </label>
            <textarea
              ref={textareaRef}
              value={expression()}
              onInput={(e) => setExpression(e.currentTarget.value)}
              placeholder={
                props.expressionType === 'amount'
                  ? 'Ej: {subtotal} + percentage({subtotal}, 18)'
                  : props.expressionType === 'description'
                  ? 'Ej: Factura {documentNumber} - {customerName}'
                  : 'Ej: {accountCode} o 40111'
              }
              style={{
                width: '100%',
                'min-height': '120px',
                padding: '0.75rem',
                border: '2px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                'font-family': 'monospace',
                'font-size': '0.875rem',
                'line-height': '1.5',
                resize: 'vertical',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-color)';
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            />
          </div>

          {/* Test Result */}
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h3 style={{
              'font-size': '0.875rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              'margin-bottom': '0.5rem',
              'text-transform': 'uppercase',
              'letter-spacing': '0.05em'
            }}>
              {props.expressionType === 'amount' ? 'Resultado de Prueba' : 'Vista Previa'}
            </h3>
            <div style={{
              background: 'var(--background-color)',
              border: '2px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              padding: '1rem',
              'min-height': '60px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center'
            }}>
              <div style={{
                'font-family': props.expressionType === 'amount' ? 'monospace' : 'inherit',
                'font-size': props.expressionType === 'amount' ? '1.5rem' : '1rem',
                'font-weight': props.expressionType === 'amount' ? '700' : '400',
                color: 'var(--primary-color)'
              }}>
                {evaluateExpression()}
              </div>
            </div>
            <div style={{
              'font-size': '0.75rem',
              color: 'var(--text-muted)',
              'margin-top': '0.5rem',
              'line-height': '1.4'
            }}>
              {props.expressionType === 'amount'
                ? 'Usando datos de ejemplo: subtotal=1000, amount=500, quantity=10, unitPrice=50, taxRate=18, discount=100'
                : 'Datos de ejemplo: documentNumber=F001-00123, customerName=Cliente Ejemplo'}
            </div>
          </div>

          {/* Help Text */}
          <div style={{
            background: 'var(--blue-ribbon-50)',
            border: '1px solid var(--blue-ribbon-200)',
            'border-radius': 'var(--border-radius-sm)',
            padding: '0.75rem',
            'font-size': '0.813rem',
            color: 'var(--text-secondary)',
            'line-height': '1.5'
          }}>
            <strong style={{ color: 'var(--primary-color)' }}>Consejo:</strong>
            {' '}
            {props.expressionType === 'amount'
              ? 'Haz clic en las variables para insertarlas en tu expresión. Puedes combinar variables, funciones y operadores matemáticos.'
              : 'Haz clic en las variables para insertarlas. El texto se reemplazará con los valores reales cuando se use la plantilla.'}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            'justify-content': 'flex-end',
            'margin-top': '1.5rem',
            'padding-top': '1.5rem',
            'border-top': '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                'font-weight': '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--background-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-color)';
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                'font-weight': '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                'box-shadow': 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              Aplicar Expresión
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExpressionHelper;
