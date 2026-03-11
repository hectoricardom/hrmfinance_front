import { Component, createSignal, For, Show } from 'solid-js';
import Card from '../../ui/components/Card';
import FormInput from '../../ui/components/FormInput';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ExtractedData {
  documentType: string;
  vendor: string;
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  lineItems?: LineItem[];
  confidence?: number;
  invoiceNumber?: string;
  poNumber?: string;
  notes?: string;
}

interface ExtractedDataViewProps {
  extractedData: ExtractedData;
  onUpdate?: (data: ExtractedData) => void;
  editable?: boolean;
}

const ExtractedDataView: Component<ExtractedDataViewProps> = (props) => {
  const [isEditing, setIsEditing] = createSignal(props.editable || false);
  const [editedData, setEditedData] = createSignal<ExtractedData>(props.extractedData);

  const updateField = (field: keyof ExtractedData, value: any) => {
    setEditedData({ ...editedData(), [field]: value });
    props.onUpdate?.(editedData());
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const items = [...(editedData().lineItems || [])];
    items[index] = { ...items[index], [field]: value };

    // Recalculate amount for the line item
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].amount = items[index].quantity * items[index].unitPrice;
    }

    setEditedData({ ...editedData(), lineItems: items });
    props.onUpdate?.(editedData());
  };

  const addLineItem = () => {
    const items = [...(editedData().lineItems || [])];
    items.push({
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    });
    setEditedData({ ...editedData(), lineItems: items });
  };

  const removeLineItem = (index: number) => {
    const items = [...(editedData().lineItems || [])];
    items.splice(index, 1);
    setEditedData({ ...editedData(), lineItems: items });
    props.onUpdate?.(editedData());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const dataGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const dataItemStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em'
  };

  const valueStyle = {
    'font-size': '1.125rem',
    color: 'var(--text-primary)',
    'font-weight': '600'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-top': '1rem'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem 1rem',
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em'
  };

  const tdStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  };

  const summaryBoxStyle = {
    background: 'linear-gradient(135deg, var(--primary-color-10), var(--primary-color-5))',
    border: '1px solid var(--primary-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-top': '2rem'
  };

  const summaryRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0'
  };

  const data = () => editedData();

  return (
    <Card title="Extracted Data">
      <div>
        {/* Header with Edit Toggle */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            <span style={{ 'font-size': '1.5rem' }}>🤖</span>
            <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              AI-extracted information
            </span>
          </div>
          {props.editable && (
            <button
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                color: 'var(--primary-color)',
                'font-weight': '500'
              }}
              onClick={() => setIsEditing(!isEditing())}
            >
              {isEditing() ? 'Done Editing' : 'Edit Values'}
            </button>
          )}
        </div>

        {/* Main Data Grid */}
        <div style={dataGridStyle}>
          <div style={dataItemStyle}>
            <div style={labelStyle}>Document Type</div>
            <Show
              when={isEditing()}
              fallback={<div style={valueStyle}>{data().documentType}</div>}
            >
              <FormInput
                label=""
                value={data().documentType}
                onChange={(value) => updateField('documentType', value)}
              />
            </Show>
          </div>

          <div style={dataItemStyle}>
            <div style={labelStyle}>Vendor</div>
            <Show
              when={isEditing()}
              fallback={<div style={valueStyle}>{data().vendor}</div>}
            >
              <FormInput
                label=""
                value={data().vendor}
                onChange={(value) => updateField('vendor', value)}
              />
            </Show>
          </div>

          <div style={dataItemStyle}>
            <div style={labelStyle}>Date</div>
            <Show
              when={isEditing()}
              fallback={<div style={valueStyle}>{formatDate(data().date)}</div>}
            >
              <FormInput
                label=""
                type="date"
                value={data().date}
                onChange={(value) => updateField('date', value)}
              />
            </Show>
          </div>

          {data().invoiceNumber && (
            <div style={dataItemStyle}>
              <div style={labelStyle}>Invoice Number</div>
              <Show
                when={isEditing()}
                fallback={<div style={valueStyle}>{data().invoiceNumber}</div>}
              >
                <FormInput
                  label=""
                  value={data().invoiceNumber}
                  onChange={(value) => updateField('invoiceNumber', value)}
                />
              </Show>
            </div>
          )}

          {data().poNumber && (
            <div style={dataItemStyle}>
              <div style={labelStyle}>PO Number</div>
              <Show
                when={isEditing()}
                fallback={<div style={valueStyle}>{data().poNumber}</div>}
              >
                <FormInput
                  label=""
                  value={data().poNumber}
                  onChange={(value) => updateField('poNumber', value)}
                />
              </Show>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <Show when={data().lineItems && data().lineItems!.length > 0}>
          <div style={{ 'margin-top': '2rem' }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1rem'
            }}>
              <h4 style={{ margin: '0', color: 'var(--text-primary)' }}>Line Items</h4>
              {isEditing() && (
                <button
                  style={{
                    background: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    'border-radius': 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    'font-weight': '500'
                  }}
                  onClick={addLineItem}
                >
                  + Add Item
                </button>
              )}
            </div>

            <div style={{ 'overflow-x': 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Quantity</th>
                    <th style={thStyle}>Unit Price</th>
                    <th style={thStyle}>Amount</th>
                    {isEditing() && <th style={thStyle}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  <For each={data().lineItems}>
                    {(item, index) => (
                      <tr>
                        <td style={tdStyle}>
                          <Show
                            when={isEditing()}
                            fallback={item.description}
                          >
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(index(), 'description', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': 'var(--border-radius-sm)'
                              }}
                            />
                          </Show>
                        </td>
                        <td style={tdStyle}>
                          <Show
                            when={isEditing()}
                            fallback={item.quantity}
                          >
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index(), 'quantity', parseFloat(e.target.value))}
                              style={{
                                width: '80px',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': 'var(--border-radius-sm)'
                              }}
                            />
                          </Show>
                        </td>
                        <td style={tdStyle}>
                          <Show
                            when={isEditing()}
                            fallback={formatCurrency(item.unitPrice)}
                          >
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(index(), 'unitPrice', parseFloat(e.target.value))}
                              style={{
                                width: '100px',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': 'var(--border-radius-sm)'
                              }}
                            />
                          </Show>
                        </td>
                        <td style={{ ...tdStyle, 'font-weight': '600' }}>
                          {formatCurrency(item.amount)}
                        </td>
                        {isEditing() && (
                          <td style={tdStyle}>
                            <button
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--error-color)',
                                cursor: 'pointer',
                                'font-size': '1.25rem'
                              }}
                              onClick={() => removeLineItem(index())}
                              title="Remove item"
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>

        {/* Summary Box */}
        <div style={summaryBoxStyle}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)' }}>Summary</h4>

          {data().subtotal !== undefined && (
            <div style={summaryRowStyle}>
              <span style={{ color: 'var(--text-primary)' }}>Subtotal</span>
              <span style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                {formatCurrency(data().subtotal!)}
              </span>
            </div>
          )}

          {data().tax !== undefined && (
            <div style={summaryRowStyle}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>Tax</span>
                <span style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '0.25rem 0.5rem',
                  'border-radius': '4px',
                  'font-size': '0.75rem',
                  'font-weight': '600'
                }}>
                  {data().taxRate ? `${data().taxRate}%` : 'TAX'}
                </span>
              </div>
              <span style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                {formatCurrency(data().tax!)}
              </span>
            </div>
          )}

          <div style={{
            ...summaryRowStyle,
            'border-top': '2px solid var(--primary-color)',
            'padding-top': '1rem',
            'margin-top': '1rem'
          }}>
            <span style={{ 'font-size': '1.125rem', 'font-weight': '600', color: 'var(--text-primary)' }}>
              Total
            </span>
            <span style={{
              'font-size': '1.5rem',
              'font-weight': '700',
              color: 'var(--primary-color)'
            }}>
              {formatCurrency(data().total)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <Show when={data().notes}>
          <div style={{ 'margin-top': '2rem' }}>
            <div style={labelStyle}>Notes</div>
            <div style={{
              'margin-top': '0.5rem',
              padding: '1rem',
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              color: 'var(--text-primary)'
            }}>
              {data().notes}
            </div>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default ExtractedDataView;
