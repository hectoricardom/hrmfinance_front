import { Component, createSignal, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { FormInput } from '../../ui';

interface JournalLineTemplate {
  accountExpression: string;
  descriptionTemplate: string;
  amountExpression: string;
  isDebit: boolean;
}

interface DroppableJournalLineProps {
  line: JournalLineTemplate;
  index: number;
  availableAccounts: Array<{ id: string; name: string; type: string }>;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
  onFieldDrop: (field: string, expression: string) => void;
}

const DroppableJournalLine: Component<DroppableJournalLineProps> = (props) => {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = createSignal<string | null>(null);
  const [showFieldHelper, setShowFieldHelper] = createSignal(false);

  const handleDragOver = (e: DragEvent, fieldType: string) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
    setDragOver(fieldType);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: DragEvent, fieldType: string) => {
    e.preventDefault();
    const fieldPath = e.dataTransfer!.getData('text/plain');
    
    if (fieldPath) {
      // Insert the field path into the appropriate field
      if (fieldType === 'description') {
        const currentValue = props.line.descriptionTemplate;
        const newValue = currentValue ? `${currentValue} {${fieldPath}}` : `{${fieldPath}}`;
        props.onUpdate('descriptionTemplate', newValue);
      } else if (fieldType === 'amount') {
        props.onUpdate('amountExpression', fieldPath);
      }
      
      props.onFieldDrop(fieldType, fieldPath);
    }
    
    setDragOver(null);
  };

  const getDropZoneStyle = (fieldType: string, baseStyle: any) => ({
    ...baseStyle,
    border: dragOver() === fieldType ? '2px dashed #3b82f6' : '1px solid #d1d5db',
    'background-color': dragOver() === fieldType ? '#eff6ff' : 'white',
    transition: 'all 0.2s ease',
    position: 'relative' as const
  });

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

  const dangerButtonStyle = {
    padding: '0.5rem 1rem',
    'background-color': '#ef4444',
    color: 'white',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500'
  };

  const helpButtonStyle = {
    padding: '0.25rem 0.5rem',
    'background-color': '#6b7280',
    color: 'white',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-size': '0.75rem'
  };

  return (
    <div style={{
      border: '1px solid #d1d5db',
      'border-radius': '0.375rem',
      padding: '1rem',
      'margin-bottom': '1rem',
      'background-color': '#fafafa'
    }}>
      {/* Line Header */}
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
        <h5 style={{ 'font-size': '0.875rem', 'font-weight': '600', margin: '0' }}>
          Journal Line {props.index + 1}
        </h5>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          <button
            style={helpButtonStyle}
            onClick={() => setShowFieldHelper(!showFieldHelper())}
          >
            {showFieldHelper() ? '❌' : '💡'} Field Helper
          </button>
          <button style={dangerButtonStyle} onClick={props.onRemove}>
            Remove
          </button>
        </div>
      </div>

      {/* Field Helper */}
      <Show when={showFieldHelper()}>
        <div style={{
          'background-color': '#fef3c7',
          border: '1px solid #f59e0b',
          'border-radius': '0.375rem',
          padding: '0.75rem',
          'margin-bottom': '1rem',
          'font-size': '0.75rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', 'font-weight': '600' }}>
            💡 Drag & Drop Tips:
          </p>
          <ul style={{ margin: '0', 'padding-left': '1rem' }}>
            <li>Drag fields from the left panel into the input areas below</li>
            <li>Use curly braces for templates: <code>{'{data.customerName}'}</code></li>
            <li>Combine text with fields: <code>Payment from {'{data.customerName}'}</code></li>
            <li>Use field paths directly in amount expressions: <code>data.totalAmount</code></li>
          </ul>
        </div>
      </Show>

      {/* Account and Type Row */}
      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
        <div>
          <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
            {t('eventAutomation.builder.journalTemplate.account')}
          </label>
          <select
            style={selectStyle}
            value={props.line.accountExpression}
            onChange={(e) => props.onUpdate('accountExpression', e.currentTarget.value)}
          >
            <For each={props.availableAccounts}>
              {(account) => (
                <option value={account.id}>
                  {account.id} - {account.name} ({account.type})
                </option>
              )}
            </For>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
            {t('eventAutomation.builder.journalTemplate.type')}
          </label>
          <select
            style={selectStyle}
            value={props.line.isDebit ? 'debit' : 'credit'}
            onChange={(e) => props.onUpdate('isDebit', e.currentTarget.value === 'debit')}
          >
            <option value="debit">{t('eventAutomation.builder.journalTemplate.debit')}</option>
            <option value="credit">{t('eventAutomation.builder.journalTemplate.credit')}</option>
          </select>
        </div>
      </div>

      {/* Droppable Fields Row */}
      <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr', gap: '1rem', 'align-items': 'end' }}>
        {/* Description Template - Droppable */}
        <div>
          <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
            {t('eventAutomation.builder.journalTemplate.descriptionTemplate')}
            <span style={{ 'font-size': '0.75rem', color: '#6b7280', 'font-weight': 'normal' }}>
              {' '}(Drop zone 📥)
            </span>
          </label>
          <div
            style={getDropZoneStyle('description', { position: 'relative' })}
            onDragOver={(e) => handleDragOver(e, 'description')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'description')}
          >
            <FormInput
              label=""
              type="text"
              style={{
                ...inputStyle,
                border: 'none',
                'background-color': 'transparent'
              }}
              value={props.line.descriptionTemplate}
              onChange={(e) => props.onUpdate('descriptionTemplate', e)}
              placeholder={t('eventAutomation.builder.journalTemplate.descriptionTemplatePlaceholder')}
            />
            <Show when={dragOver() === 'description'}>
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '0.5rem',
                transform: 'translateY(-50%)',
                'font-size': '1.25rem',
                'pointer-events': 'none'
              }}>
                📥
              </div>
            </Show>
          </div>
        </div>

        {/* Amount Expression - Droppable */}
        <div>
          <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
            {t('eventAutomation.builder.journalTemplate.amountExpression')}
            <span style={{ 'font-size': '0.75rem', color: '#6b7280', 'font-weight': 'normal' }}>
              {' '}(Drop zone 📥)
            </span>
          </label>
          <div
            style={getDropZoneStyle('amount', { position: 'relative' })}
            onDragOver={(e) => handleDragOver(e, 'amount')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'amount')}
          >
            <FormInput
              label=""
              type="text"
              style={{
                ...inputStyle,
                border: 'none',
                'background-color': 'transparent'
              }}
              value={props.line.amountExpression}
              onChange={(e) => props.onUpdate('amountExpression', e)}
              placeholder={t('eventAutomation.builder.journalTemplate.amountExpressionPlaceholder')}
            />

           
            <Show when={dragOver() === 'amount'}>
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '0.5rem',
                transform: 'translateY(-50%)',
                'font-size': '1.25rem',
                'pointer-events': 'none'
              }}>
                📥
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Current Values Preview */}
      <Show when={props.line.descriptionTemplate || props.line.amountExpression}>
        <div style={{
          'margin-top': '1rem',
          padding: '0.75rem',
          'background-color': '#f0fdf4',
          border: '1px solid #22c55e',
          'border-radius': '0.375rem',
          'font-size': '0.75rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', 'font-weight': '600', color: '#15803d' }}>
            ✅ Current Mapping:
          </p>
          <Show when={props.line.descriptionTemplate}>
            <p style={{ margin: '0 0 0.25rem 0' }}>
              <strong>Description:</strong> <code>{props.line.descriptionTemplate}</code>
            </p>
          </Show>
          <Show when={props.line.amountExpression}>
            <p style={{ margin: '0' }}>
              <strong>Amount:</strong> <code>{props.line.amountExpression}</code>
            </p>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default DroppableJournalLine;