import { Component, For, createSignal, createMemo } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import AccountSelect from './AccountSelect';
import CurrencyInput from './CurrencyInput';
import type { Account, JournalLine } from '../types';

interface JournalEntryFormProps {
  accounts: Account[];
  onSubmit: (entry: JournalEntryFormData) => void;
  onCancel: () => void;
  initialData?: JournalEntryFormData;
}

export interface JournalEntryFormData {
  entryDate: string;
  reference: string;
  description: string;
  lines: JournalLineFormData[];
}

export interface JournalLineFormData {
  accountId: string;
  debit: number;
  credit: number;
  memo: string;
}

const JournalEntryForm: Component<JournalEntryFormProps> = (props) => {
  const [entryDate, setEntryDate] = createSignal(props.initialData?.entryDate || new Date().toISOString().split('T')[0]);
  const [reference, setReference] = createSignal(props.initialData?.reference || '');
  const [description, setDescription] = createSignal(props.initialData?.description || '');
  const [lines, setLines] = createSignal<JournalLineFormData[]>(
    props.initialData?.lines || [
      { accountId: '', debit: 0, credit: 0, memo: '' },
      { accountId: '', debit: 0, credit: 0, memo: '' }
    ]
  );

  const totalDebits = createMemo(() => {
    return lines().reduce((sum, line) => sum + (line.debit || 0), 0);
  });

  const totalCredits = createMemo(() => {
    return lines().reduce((sum, line) => sum + (line.credit || 0), 0);
  });

  const balanceDifference = createMemo(() => {
    return Math.abs(totalDebits() - totalCredits());
  });

  const isBalanced = createMemo(() => {
    return balanceDifference() < 0.01 && totalDebits() > 0;
  });

  const addLine = () => {
    setLines([...lines(), { accountId: '', debit: 0, credit: 0, memo: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines().length > 2) {
      setLines(lines().filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLineFormData, value: any) => {
    const updatedLines = [...lines()];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    setLines(updatedLines);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!isBalanced()) {
      return;
    }

    const formData: JournalEntryFormData = {
      entryDate: entryDate(),
      reference: reference(),
      description: description(),
      lines: lines().filter(line => line.accountId && (line.debit > 0 || line.credit > 0))
    };

    props.onSubmit(formData);
  };

  const formStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const headerGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr 2fr',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '1rem'
  };

  const thStyle = {
    padding: '0.75rem',
    'text-align': 'left' as const,
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'font-size': '0.875rem',
    'text-transform': 'uppercase' as const
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)',
    'vertical-align': 'top' as const
  };

  const totalsRowStyle = {
    'font-weight': '600',
    'background-color': 'var(--bg-muted, #f5f5f5)',
    'border-top': '2px solid var(--border-color)'
  };

  const balanceStatusStyle = (balanced: boolean) => ({
    display: 'inline-block',
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': '600',
    'font-size': '0.875rem',
    background: balanced ? 'var(--success-color, #28a745)' : 'var(--warning-color, #ffc107)',
    color: balanced ? 'white' : 'var(--text-primary)'
  });

  const actionButtonsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'center'
  };

  const buttonContainerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-top': '1.5rem'
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <Card title="Journal Entry Details">
        <div style={headerGridStyle}>
          <FormInput
            label="Date"
            type="date"
            value={entryDate()}
            onChange={setEntryDate}
            required
          />
          <FormInput
            label="Reference"
            type="text"
            value={reference()}
            onChange={setReference}
            placeholder="REF-001"
          />
          <FormInput
            label="Description"
            type="text"
            value={description()}
            onChange={setDescription}
            placeholder="Entry description"
            required
          />
        </div>
      </Card>

      <Card title="Line Items">
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Account</th>
              <th style={{ ...thStyle, width: '150px' }}>Debit</th>
              <th style={{ ...thStyle, width: '150px' }}>Credit</th>
              <th style={thStyle}>Memo</th>
              <th style={{ ...thStyle, width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={lines()}>
              {(line, index) => (
                <tr>
                  <td style={tdStyle}>
                    <AccountSelect
                      value={line.accountId}
                      onChange={(value) => updateLine(index(), 'accountId', value)}
                      accounts={props.accounts}
                      required
                    />
                  </td>
                  <td style={tdStyle}>
                    <CurrencyInput
                      value={line.debit}
                      onChange={(value) => {
                        updateLine(index(), 'debit', value);
                        if (value > 0) {
                          updateLine(index(), 'credit', 0);
                        }
                      }}
                      placeholder="0.00"
                    />
                  </td>
                  <td style={tdStyle}>
                    <CurrencyInput
                      value={line.credit}
                      onChange={(value) => {
                        updateLine(index(), 'credit', value);
                        if (value > 0) {
                          updateLine(index(), 'debit', 0);
                        }
                      }}
                      placeholder="0.00"
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={line.memo}
                      placeholder="Line memo"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '1rem',
                        'font-family': 'inherit',
                        background: 'var(--surface-color)',
                        color: 'var(--text-primary)'
                      }}
                      onInput={(e) => updateLine(index(), 'memo', e.currentTarget.value)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLine(index())}
                      disabled={lines().length <= 2}
                      type="button"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              )}
            </For>
            <tr style={totalsRowStyle}>
              <td style={{ ...tdStyle, 'font-weight': '600' }}>Totals:</td>
              <td style={{ ...tdStyle, 'font-weight': '600' }}>
                ${totalDebits().toFixed(2)}
              </td>
              <td style={{ ...tdStyle, 'font-weight': '600' }}>
                ${totalCredits().toFixed(2)}
              </td>
              <td style={tdStyle} colspan={2}></td>
            </tr>
          </tbody>
        </table>

        <div style={actionButtonsStyle}>
          <Button variant="secondary" size="sm" onClick={addLine} type="button">
            + Add Line
          </Button>
          <div style={balanceStatusStyle(isBalanced())}>
            {isBalanced()
              ? 'Balanced'
              : `Out of Balance: $${balanceDifference().toFixed(2)}`}
          </div>
        </div>
      </Card>

      <div style={buttonContainerStyle}>
        <Button variant="secondary" onClick={props.onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={!isBalanced()}>
          Create Journal Entry
        </Button>
      </div>
    </form>
  );
};

export default JournalEntryForm;
