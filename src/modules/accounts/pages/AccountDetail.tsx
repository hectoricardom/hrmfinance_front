import { Component, createSignal, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { Layout, Card, Button } from '../../ui';
import { accountsStore, AccountingAccount } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';

const AccountDetail: Component = () => {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = createSignal<AccountingAccount | null>(null);
  const [activeTab, setActiveTab] = createSignal<'overview' | 'transactions'>('overview');

  onMount(() => {
    const accountData = accountsStore.getAccountById(params.id);
    if (accountData) {
      setAccount(accountData);
    } else {
      navigate('/accounts');
    }
  });

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const backButtonStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'margin-bottom': '1rem'
  };

  const accountHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const accountNumberStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase'
  };

  const balanceStyle = {
    'font-size': '2.5rem',
    'font-weight': '700',
    color: 'var(--primary-color)'
  };

  const typeStyle = {
    padding: '0.5rem 1rem',
    'border-radius': '9999px',
    'font-size': '0.875rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  const tabsStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '2rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '1rem 2rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    transition: 'all 0.2s ease'
  });

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const detailsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  };

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

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

  const transactionDescStyle = {
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const transactionDateStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const transactionAmountStyle = (type: 'debit' | 'credit') => ({
    'font-weight': '600',
    color: type === 'debit' ? '#4caf50' : '#f44336'
  });

  if (!account()) {
    return (
      <Layout title={t('accounts.accountDetails')}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <h2>{t('common.error')}</h2>
          <Button variant="primary" onClick={() => navigate('/accounts')}>
            {t('common.back')} {t('navigation.accounts')}
          </Button>
        </div>
      </Layout>
    );
  }

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
      month: 'long',
      day: 'numeric'
    });
  };

  const typeColor = getTypeColor(account()!.accountType);
  const transactions = accountsStore.getAccountTransactions(account()!.id);

  return (
    <Layout title={account()!.name}>
      <div style={backButtonStyle}>
        <Button variant="secondary" onClick={() => navigate('/accounts')}>
          ← {t('common.back')} {t('navigation.accounts')}
        </Button>
      </div>

      <div style={accountHeaderStyle}>
        <div>
          <div style={accountNumberStyle}>{account()!.accountNumber}</div>
          <h1 style={{ margin: '0.5rem 0', 'font-size': '2rem' }}>{account()!.name}</h1>
          <div style={balanceStyle}>{formatCurrency(account()!.balance)}</div>
        </div>
        <div 
          style={{
            ...typeStyle,
            background: typeColor.bg,
            color: typeColor.color
          }}
        >
          {account()!.accountType}
        </div>
      </div>

      <div style={tabsStyle}>
        <button 
          style={tabStyle(activeTab() === 'overview')}
          onClick={() => setActiveTab('overview')}
        >
          {t('dashboard.overview')}
        </button>
        <button 
          style={tabStyle(activeTab() === 'transactions')}
          onClick={() => setActiveTab('transactions')}
        >
          {t('accounts.transactions')} ({transactions.length})
        </button>
      </div>

      {activeTab() === 'overview' && (
        <div>
          <div style={statsGridStyle}>
            <Card title={t('accounts.balance')} subtitle={t('dashboard.overview')}>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {formatCurrency(account()!.balance)}
              </div>
            </Card>
            <Card title={t('accounts.accountType')} subtitle={t('accounts.category')}>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {t(`accounts.types.${account()!.accountType?.toLowerCase()}`)}
              </div>
            </Card>
            <Card title={t('common.status')} subtitle={t('accounts.accountDetails')}>
              <div style={{ 
                'font-size': '1.5rem', 
                'font-weight': '600', 
                color: account()!.isActive ? '#4caf50' : '#f44336' 
              }}>
                {account()!.isActive ? t('common.active') : t('common.inactive')}
              </div>
            </Card>
            <Card title={t('accounts.transactions')} subtitle={t('common.total')}>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {transactions.length}
              </div>
            </Card>
          </div>

          <div style={detailsGridStyle}>
            <Card title={t('accounts.accountDetails')} subtitle={t('dashboard.overview')}>
              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('accounts.accountNumber')}</span>
                <span style={valueStyle}>{account()!.accountNumber}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('accounts.category')}</span>
                <span style={valueStyle}>{account()!.category}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('common.date')}</span>
                <span style={valueStyle}>{formatDate(account()!.createdDate)}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('common.date')}</span>
                <span style={valueStyle}>{formatDate(account()!.lastModified)}</span>
              </div>
            </Card>

            <Card title={t('common.description')} subtitle={t('accounts.accountDetails')}>
              <p style={{ margin: '0', color: 'var(--text-secondary)' }}>
                {account()!.description || t('common.noDataFound')}
              </p>
            </Card>
          </div>
        </div>
      )}

      {activeTab() === 'transactions' && (
        <Card title={t('accounts.accountHistory')} subtitle={t('accounts.transactions')}>
          {transactions.length === 0 ? (
            <div style={{ 'text-align': 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              {t('common.noDataFound')}
            </div>
          ) : (
            transactions.map(transaction => (
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
        </Card>
      )}
      
    </Layout>
  );
};

export default AccountDetail;