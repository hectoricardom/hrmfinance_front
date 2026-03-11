import { Component, createSignal, For, Show, onMount } from 'solid-js';
import { useTranslation } from '../../../translations';
import { accountsStore } from '../../accounts/stores/accountsStore';
import type { AccountingAccount } from '../../accounts/stores/accountsStore';
import Card from '../../ui/components/Card';
import Button from '../../ui/components/Button';
import Badge from '../../ui/components/Badge';
import Modal from '../../ui/components/Modal';
import AccountForm from './AccountForm';
import type { Account } from '../types';

const ChartOfAccounts: Component = () => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = createSignal<AccountingAccount[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [editingAccount, setEditingAccount] = createSignal<AccountingAccount | undefined>();
  const [selectedType, setSelectedType] = createSignal<string>('all');

  onMount(async () => {
    await loadAccounts();
  });

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      await accountsStore.reloadAccs();
      setAccounts(accountsStore.accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const accountTypes = [
    { value: 'all', label: 'All Accounts' },
    { value: 'Asset', label: 'Assets' },
    { value: 'Liability', label: 'Liabilities' },
    { value: 'Equity', label: 'Equity' },
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Expense', label: 'Expenses' }
  ];

  const filteredAccounts = () => {
    const allAccounts = accounts();
    if (selectedType() === 'all') {
      return allAccounts;
    }
    return accountsStore.getAccountsByType(selectedType() as any);
  };

  const groupedAccounts = () => {
    const groups: Record<string, AccountingAccount[]> = {
      'Asset': [],
      'Liability': [],
      'Equity': [],
      'Revenue': [],
      'Expense': []
    };

    filteredAccounts().forEach(account => {
      const type = account.accountType || account.type || account.classification;
      if (type && groups[type]) {
        groups[type].push(account);
      }
    });

    return groups;
  };

  const handleAddAccount = () => {
    setEditingAccount(undefined);
    setIsModalOpen(true);
  };

  const handleEditAccount = (account: AccountingAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleFormSuccess = async (accountData: Partial<Account>) => {
    try {
      if (editingAccount()) {
        await accountsStore.updateAccountServer(editingAccount()!.id, accountData);
      } else {
        await accountsStore.addAccount(accountData as any);
      }
      setIsModalOpen(false);
      await loadAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const canDelete = accountsStore.canDeleteAccount(accountId);
    if (!canDelete.canDelete) {
      alert(canDelete.reason);
      return;
    }

    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await accountsStore.deleteAccount(accountId);
        await loadAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const formatBalance = (balance?: number) => {
    if (balance === undefined || balance === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  const getAccountBalance = (accountId: string) => {
    const balances = accountsStore.accountsBalances as Record<string, number>;
    return balances[accountId] || 0;
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem'
  };

  const filterGroupStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-top': '1rem'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  const actionButtonStyle = {
    padding: '0.25rem 0.5rem',
    'font-size': '0.875rem',
    'margin-right': '0.5rem'
  };

  const sectionHeaderStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    'margin-top': '1.5rem',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)'
  };

  return (
    <div>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, 'font-size': '1.75rem', color: 'var(--text-primary)' }}>
          Chart of Accounts
        </h1>
        <Button onClick={handleAddAccount} variant="primary">
          Add Account
        </Button>
      </div>

      <div style={filterGroupStyle}>
        <For each={accountTypes}>
          {(type) => (
            <Button
              variant={selectedType() === type.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type.value)}
            >
              {type.label}
            </Button>
          )}
        </For>
      </div>

      <Card>
        <Show when={isLoading()} fallback={
          <Show when={accounts().length > 0} fallback={
            <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
              No accounts found. Click "Add Account" to create your first account.
            </div>
          }>
            <For each={Object.entries(groupedAccounts())}>
              {([type, typeAccounts]) => (
                <Show when={typeAccounts.length > 0}>
                  <div>
                    <h2 style={sectionHeaderStyle}>{type}</h2>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Code</th>
                          <th style={thStyle}>Name</th>
                          <th style={thStyle}>Tax Category</th>
                          <th style={thStyle}>Balance</th>
                          <th style={thStyle}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={typeAccounts}>
                          {(account) => (
                            <tr>
                              <td style={tdStyle}>
                                <strong>{account.code || account.accountNumber}</strong>
                              </td>
                              <td style={tdStyle}>{account.name}</td>
                              <td style={tdStyle}>
                                <Show when={account.category} fallback={
                                  <Badge variant="secondary" size="sm">None</Badge>
                                }>
                                  <Badge variant="info" size="sm">
                                    {account.category}
                                  </Badge>
                                </Show>
                              </td>
                              <td style={tdStyle}>
                                <strong>{formatBalance(account.balance || getAccountBalance(account.id))}</strong>
                              </td>
                              <td style={tdStyle}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditAccount(account)}
                                  style={actionButtonStyle}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteAccount(account.id)}
                                  style={actionButtonStyle}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              )}
            </For>
          </Show>
        }>
          <div style={{ padding: '2rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '1rem', color: 'var(--text-muted)' }}>
              Loading accounts...
            </div>
          </div>
        </Show>
      </Card>

      <Modal
        isOpen={isModalOpen()}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount() ? 'Edit Account' : 'Add New Account'}
        maxWidth="600px"
      >
        <AccountForm
          account={editingAccount() as any}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ChartOfAccounts;
