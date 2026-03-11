import { Component, createSignal, createMemo, Show } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { Card } from '../../ui';
import EditAccountModal from './EditAccountModal';
import MarkBankAccountModal from './MarkBankAccountModal';
import { AccountingAccount, accountsStore } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';

interface LayerOption {
  id: string;
  name: string;
  description: string;
  accountType: string;
  defaultSide: 'debit' | 'credit';
  criteriaFields: Array<{
    field: string;
    label: string;
    required: boolean;
    options: Array<{ value: string; label: string }>;
  }>;
}

interface AccountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountingAccount | null;
  layerOptions?: LayerOption[];
}

const AccountDetailModal: Component<AccountDetailModalProps> = (props) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<'details' | 'transactions'>('details');
  const [isEditModalOpen, setIsEditModalOpen] = createSignal(false);
  const [isMarkBankAccountModalOpen, setIsMarkBankAccountModalOpen] = createSignal(false);

  // Use a memo to always get the latest account data from the store
  const currentAccount = createMemo(() => {
    if (!props.account) return null;
    return accountsStore.getAccountById(props.account.id) || props.account;
  });

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const headerStyle = {
    'text-align': 'center',
    'margin-bottom': '2rem'
  };

  const nameStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0.5rem 0'
  };

  const balanceStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    'margin-bottom': '0.5rem'
  };

  const typeStyle = {
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    'margin-bottom': '1rem'
  };

  const badgeContainerStyle = {
    display: 'flex',
    gap: '0.5rem',
    'justify-content': 'center',
    'align-items': 'center',
    'flex-wrap': 'wrap'
  };

  const bankBadgeStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    background: '#e3f2fd',
    color: '#1565c0',
    'margin-bottom': '1rem'
  };

  const tabsStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '1.5rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    transition: 'all 0.2s ease'
  });

  const transactionRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const transactionInfoStyle = {
    flex: '1'
  };

  const transactionDateStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const transactionDescStyle = {
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const transactionAmountStyle = (type: 'debit' | 'credit') => ({
    'font-weight': '600',
    color: type === 'debit' ? '#4caf50' : '#f44336'
  });

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const getTypeColor = (type: AccountingAccount['type']) => {
    const colors = {
      'Asset': { bg: '#e8f5e8', color: '#2d7d32' },
      'Liability': { bg: '#fff3e0', color: '#f57c00' },
      'Equity': { bg: '#e3f2fd', color: '#1976d2' },
      'Revenue': { bg: '#e8f5e8', color: '#388e3c' },
      'Expense': { bg: '#ffebee', color: '#d32f2f' }
    };
    return colors[type] || { bg: '#f5f5f5', color: '#666' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  const removeItem = (v:string): void =>{
    if (authStore.isAdmin()){
      accountsStore.deleteAccount(currentAccount()?.accountId as string);
      props.onClose()
    }
   
  }

  
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('accounts.accountDetails')}>
      {!currentAccount() ? (
        <div style={{ 
          'text-align': 'center', 
          padding: '3rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ 'font-size': '1.5rem', 'margin-bottom': '1rem' }}>⚠️</div>
          <div style={{ 'font-size': '1.1rem', 'margin-bottom': '0.5rem' }}>{t('common.error')}</div>
          <div style={{ 'font-size': '0.875rem' }}>
            {t('common.noDataFound')}
          </div>
          <div style={{ 'margin-top': '2rem' }}>
            <Button variant="primary" onClick={props.onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      ) : (
        (() => {
          const typeColor = createMemo(() => getTypeColor(currentAccount()!.accountType));
          const transactions = createMemo(() => accountsStore.getAccountTransactions(currentAccount()!.id));

          return (
            <>
      <div style={headerStyle}>
        <div style={nameStyle}>{currentAccount()!.name}</div>
        <div style={balanceStyle}>{formatCurrency(currentAccount()!.balance || 0)}</div>
        <div style={badgeContainerStyle}>
          <Show when={currentAccount()!.accountType}>
            <div
              style={{
                ...typeStyle,
                background: typeColor().bg,
                color: typeColor().color
              }}
            >
              {t(`accounts.types.${currentAccount()!.accountType?.toLowerCase()}`)}
            </div>
          </Show>
          <Show when={currentAccount()!.isBankAccount}>
            <div style={bankBadgeStyle}>
              <span>🏦</span>
              <span>{t('accounts.bankAccount') || 'Bank Account'}</span>
            </div>
          </Show>
        </div>
      </div>

      <div style={tabsStyle}>
        <button 
          style={tabStyle(activeTab() === 'details')}
          onClick={() => setActiveTab('details')}
        >
          {t('accounts.accountDetails')}
        </button>
        <button 
          style={tabStyle(activeTab() === 'transactions')}
          onClick={() => setActiveTab('transactions')}
        >
          {t('accounts.transactions')} ({transactions().length})
        </button>
      </div>

      {activeTab() === 'details' && (
        <div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('accounts.accountNumber')}</span>
            <span style={valueStyle}>{currentAccount()!.accountNumber}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('accounts.category')}</span>
            <span style={valueStyle}>{currentAccount()!.category}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('common.description')}</span>
            <span style={valueStyle}>{currentAccount()!.description}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('common.status')}</span>
            <span style={valueStyle}>{currentAccount()!.isActive ? t('common.active') : t('common.inactive')}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('accounts.createdDate')}</span>
            <span style={valueStyle}>{formatDate(currentAccount()!.createdDate)}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('accounts.lastModified')}</span>
            <span style={valueStyle}>{formatDate(currentAccount()!.lastModified)}</span>
          </div>
        </div>
      )}

      {activeTab() === 'transactions' && (
        <div>
          {transactions().length === 0 ? (
            <div style={{ 'text-align': 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              {t('common.noDataFound')}
            </div>
          ) : (
            transactions().map(transaction => (
              <div style={transactionRowStyle}>
                <div style={transactionInfoStyle}>
                  <div style={transactionDescStyle}>{transaction.description}</div>
                  <div style={transactionDateStyle}>
                    {formatDate(transaction.date)} • {transaction.reference}
                  </div>
                </div>
                <div style={transactionAmountStyle(transaction.type)}>
                  {transaction.type === 'debit' ? '+' : '-'}{formatCurrency(
                    transaction.type === 'debit' ? transaction.debitAmount : transaction.creditAmount
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

        <div style={buttonGroupStyle}>
          <Button variant="secondary" onClick={props.onClose}>
            {t('common.close')}
          </Button>
          <Show when={authStore.state?.profile?.isAdmin}>
            <Button variant="primary" onClick={removeItem}>
              Remove
            </Button>
          </Show>
          <Button
            variant={currentAccount()!.isBankAccount ? "outline" : "primary"}
            onClick={() => setIsMarkBankAccountModalOpen(true)}
          >
            <Show when={currentAccount()!.isBankAccount} fallback={
              <>{t('accounts.markAsBankAccount') || 'Mark as Bank Account'}</>
            }>
              <span style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span>🏦</span>
                <span>{t('accounts.editBankInfo') || 'Edit Bank Info'}</span>
              </span>
            </Show>
          </Button>
          <Button variant="primary" onClick={() => setIsEditModalOpen(true)}>
            {t('accounts.editAccount')}
          </Button>
          
          </div>
            </>
          );
        })()
      )}
      
      {currentAccount() && (
        <>
          <EditAccountModal
            isOpen={isEditModalOpen()}
            onClose={() => {
              setIsEditModalOpen(false);
              // Keep the detail modal open to show updated data
            }}
            account={currentAccount()}
            layerOptions={props.layerOptions}
          />
          <MarkBankAccountModal
            isOpen={isMarkBankAccountModalOpen()}
            onClose={() => {
              setIsMarkBankAccountModalOpen(false);
              // Keep the detail modal open to show updated data
            }}
            account={currentAccount()}
          />
        </>
      )}
    </Modal>
  );
};

export default AccountDetailModal;