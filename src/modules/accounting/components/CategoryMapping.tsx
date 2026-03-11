import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { Modal, Button, Card, FormSelect } from '../../ui';
import { getAccounts, updateAccountTaxCategory, bulkUpdateTaxCategories } from '../services/accountingApi';
import { accountingStore } from '../stores/accountingStore';

interface Account {
  id: string;
  name: string;
  type: string;
  currentCategory?: string;
  transactionCount: number;
}

interface CategoryMappingProps {
  onClose: () => void;
}

const CategoryMapping: Component<CategoryMappingProps> = (props) => {
  const [accounts, setAccounts] = createSignal<Account[]>([]);
  const [selectedMappings, setSelectedMappings] = createSignal<Record<string, string>>({});
  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [selectedForBulk, setSelectedForBulk] = createSignal<string[]>([]);
  const [bulkCategory, setBulkCategory] = createSignal('');

  const taxCategories = [
    { value: '', label: 'Uncategorized' },
    { value: 'income-gross-receipts', label: 'Income - Gross Receipts (Line 1)' },
    { value: 'income-returns', label: 'Income - Returns & Allowances (Line 2)' },
    { value: 'expense-advertising', label: 'Expense - Advertising (Line 8)' },
    { value: 'expense-car-truck', label: 'Expense - Car & Truck (Line 9)' },
    { value: 'expense-commissions', label: 'Expense - Commissions & Fees (Line 10)' },
    { value: 'expense-contract-labor', label: 'Expense - Contract Labor (Line 11)' },
    { value: 'expense-depletion', label: 'Expense - Depletion (Line 12)' },
    { value: 'expense-depreciation', label: 'Expense - Depreciation (Line 13)' },
    { value: 'expense-employee-benefit', label: 'Expense - Employee Benefits (Line 14)' },
    { value: 'expense-insurance', label: 'Expense - Insurance (Line 15)' },
    { value: 'expense-interest-mortgage', label: 'Expense - Mortgage Interest (Line 16a)' },
    { value: 'expense-interest-other', label: 'Expense - Other Interest (Line 16b)' },
    { value: 'expense-legal', label: 'Expense - Legal & Professional (Line 17)' },
    { value: 'expense-office', label: 'Expense - Office Expense (Line 18)' },
    { value: 'expense-pension', label: 'Expense - Pension & Profit-Sharing (Line 19)' },
    { value: 'expense-rent-vehicles', label: 'Expense - Rent (Vehicles) (Line 20a)' },
    { value: 'expense-rent-property', label: 'Expense - Rent (Property) (Line 20b)' },
    { value: 'expense-repairs', label: 'Expense - Repairs & Maintenance (Line 21)' },
    { value: 'expense-supplies', label: 'Expense - Supplies (Line 22)' },
    { value: 'expense-taxes-licenses', label: 'Expense - Taxes & Licenses (Line 23)' },
    { value: 'expense-travel', label: 'Expense - Travel (Line 24a)' },
    { value: 'expense-meals', label: 'Expense - Meals (Line 24b)' },
    { value: 'expense-utilities', label: 'Expense - Utilities (Line 25)' },
    { value: 'expense-wages', label: 'Expense - Wages (Line 26)' },
    { value: 'expense-other', label: 'Expense - Other (Line 27a)' }
  ];

  createEffect(() => {
    loadAccounts();
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data);

      const initialMappings: Record<string, string> = {};
      data.forEach(account => {
        initialMappings[account.id] = account.currentCategory || '';
      });
      setSelectedMappings(initialMappings);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (accountId: string, category: string) => {
    setSelectedMappings(prev => ({
      ...prev,
      [accountId]: category
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(selectedMappings()).map(([accountId, category]) => ({
        accountId,
        taxCategory: category
      }));

      await bulkUpdateTaxCategories(updates);
      props.onClose();
    } catch (error) {
      console.error('Failed to save mappings:', error);
      alert('Failed to save category mappings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedForBulk(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleBulkUpdate = () => {
    if (!bulkCategory() || selectedForBulk().length === 0) {
      alert('Please select accounts and a category for bulk update');
      return;
    }

    const newMappings = { ...selectedMappings() };
    selectedForBulk().forEach(accountId => {
      newMappings[accountId] = bulkCategory();
    });
    setSelectedMappings(newMappings);
    setSelectedForBulk([]);
    setBulkCategory('');
  };

  const unmappedAccounts = () => accounts().filter(acc => !selectedMappings()[acc.id]);
  const mappedAccounts = () => accounts().filter(acc => selectedMappings()[acc.id]);

  const modalStyle = {
    'max-width': '1200px',
    width: '95vw'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0'
  };

  const bulkActionsStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'flex-end',
    padding: '1.5rem',
    background: '#e3f2fd',
    'border-radius': 'var(--border-radius)',
    border: '1px solid #2196f3',
    'margin-bottom': '2rem'
  };

  const warningBoxStyle = {
    padding: '1rem 1.5rem',
    background: '#fff3cd',
    border: '1px solid #ffc107',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '2rem',
    color: '#856404'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    overflow: 'hidden'
  };

  const tableHeaderStyle = {
    background: 'var(--background-color)',
    'text-align': 'left',
    padding: '1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'border-bottom': '2px solid var(--border-color)',
    'font-size': '0.875rem',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  const tableCellStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-secondary)'
  };

  const checkboxStyle = {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  };

  const accountTypeStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem'
  };

  const transactionCountStyle = {
    'font-size': '0.75rem',
    color: 'var(--primary-color)',
    background: 'var(--background-color)',
    padding: '0.25rem 0.5rem',
    'border-radius': '4px',
    display: 'inline-block'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem',
    padding: '1.5rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem'
  };

  return (
    <Modal isOpen={true} onClose={props.onClose} title="">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Tax Category Mapping</h2>
          <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            Map accounts to IRS Schedule C tax categories
          </div>
        </div>

        <Show when={loading()}>
          <div style={{ 'text-align': 'center', padding: '3rem' }}>
            <p>Loading accounts...</p>
          </div>
        </Show>

        <Show when={!loading()}>
          <Show when={unmappedAccounts().length > 0}>
            <div style={warningBoxStyle}>
              <strong>Warning:</strong> {unmappedAccounts().length} accounts are not categorized.
              These transactions will not be included in tax reports.
            </div>
          </Show>

          <Show when={selectedForBulk().length > 0}>
            <div style={bulkActionsStyle}>
              <div style={{ flex: '1' }}>
                <strong>{selectedForBulk().length} accounts selected</strong>
              </div>
              <div style={{ width: '350px' }}>
                <FormSelect
                  label="Bulk Category"
                  value={bulkCategory()}
                  onChange={setBulkCategory}
                  options={taxCategories}
                />
              </div>
              <Button onClick={handleBulkUpdate} size="md">
                Apply to Selected
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedForBulk([])}
                size="md"
              >
                Clear Selection
              </Button>
            </div>
          </Show>

          <Show when={unmappedAccounts().length > 0}>
            <div style={{ 'margin-bottom': '2rem' }}>
              <h3 style={sectionTitleStyle}>Unmapped Accounts</h3>
              <div style={{ overflow: 'auto', 'max-height': '300px' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderStyle, width: '40px' }}>
                        <input
                          type="checkbox"
                          style={checkboxStyle}
                          checked={unmappedAccounts().every(acc => selectedForBulk().includes(acc.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForBulk(unmappedAccounts().map(acc => acc.id));
                            } else {
                              setSelectedForBulk([]);
                            }
                          }}
                        />
                      </th>
                      <th style={tableHeaderStyle}>Account Name</th>
                      <th style={tableHeaderStyle}>Type</th>
                      <th style={tableHeaderStyle}>Transactions</th>
                      <th style={{ ...tableHeaderStyle, width: '350px' }}>Tax Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={unmappedAccounts()}>
                      {(account) => (
                        <tr>
                          <td style={tableCellStyle}>
                            <input
                              type="checkbox"
                              style={checkboxStyle}
                              checked={selectedForBulk().includes(account.id)}
                              onChange={() => toggleAccountSelection(account.id)}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                              {account.name}
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            <div style={accountTypeStyle}>{account.type}</div>
                          </td>
                          <td style={tableCellStyle}>
                            <span style={transactionCountStyle}>{account.transactionCount}</span>
                          </td>
                          <td style={tableCellStyle}>
                            <FormSelect
                              label=""
                              value={selectedMappings()[account.id] || ''}
                              onChange={(value) => handleCategoryChange(account.id, value)}
                              options={taxCategories}
                            />
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>

          <Show when={mappedAccounts().length > 0}>
            <div>
              <h3 style={sectionTitleStyle}>Mapped Accounts</h3>
              <div style={{ overflow: 'auto', 'max-height': '400px' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderStyle, width: '40px' }}>
                        <input
                          type="checkbox"
                          style={checkboxStyle}
                          checked={mappedAccounts().every(acc => selectedForBulk().includes(acc.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForBulk([...selectedForBulk(), ...mappedAccounts().map(acc => acc.id)]);
                            } else {
                              const mappedIds = mappedAccounts().map(acc => acc.id);
                              setSelectedForBulk(selectedForBulk().filter(id => !mappedIds.includes(id)));
                            }
                          }}
                        />
                      </th>
                      <th style={tableHeaderStyle}>Account Name</th>
                      <th style={tableHeaderStyle}>Type</th>
                      <th style={tableHeaderStyle}>Transactions</th>
                      <th style={{ ...tableHeaderStyle, width: '350px' }}>Tax Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={mappedAccounts()}>
                      {(account) => (
                        <tr>
                          <td style={tableCellStyle}>
                            <input
                              type="checkbox"
                              style={checkboxStyle}
                              checked={selectedForBulk().includes(account.id)}
                              onChange={() => toggleAccountSelection(account.id)}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                              {account.name}
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            <div style={accountTypeStyle}>{account.type}</div>
                          </td>
                          <td style={tableCellStyle}>
                            <span style={transactionCountStyle}>{account.transactionCount}</span>
                          </td>
                          <td style={tableCellStyle}>
                            <FormSelect
                              label=""
                              value={selectedMappings()[account.id] || ''}
                              onChange={(value) => handleCategoryChange(account.id, value)}
                              options={taxCategories}
                            />
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>

          <div style={buttonGroupStyle}>
            <Button variant="outline" onClick={props.onClose} disabled={saving()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving()}>
              {saving() ? 'Saving...' : 'Save Mappings'}
            </Button>
          </div>
        </Show>
      </div>
    </Modal>
  );
};

export default CategoryMapping;
