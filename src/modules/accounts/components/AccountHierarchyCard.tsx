import { Component, createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card, LazyList, LoadingBar } from '../../ui';
import { Button } from '../../ui';
import { AccountingAccount, accountsStore } from '../stores/accountsStore';
import { entryBookStore, JournalEntryLine } from '../../journal/stores/entryBookStore';
import { useTranslation } from '../../../translations';
import { accountsApi } from '../../../services/apiAdapter';

interface AccountWithSubAccounts extends AccountingAccount {
  subAccounts: AccountingAccount[];
}

interface AccountHierarchyCardProps {
  account: AccountWithSubAccounts;
  onAddSubAccount?: (parentAccount: AccountingAccount) => void;
  onViewDetails?: (account: AccountingAccount) => void;
}

interface SubledgerEntry {
  id: string;
  date: string;
  entryNumber: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

const AccountHierarchyCard: Component<AccountHierarchyCardProps> = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = createSignal(true);
  const [showSubledger, setShowSubledger] = createSignal<string | null>(null); // accountId to show subledger for
  const [subledgerEntries, setSubledgerEntries] = createSignal<SubledgerEntry[]>([]);

  // Get subledger entries for an account
  const loadSubledgerEntries = (accountId: string, accountNumber?: string) => {
    const entries = entryBookStore.journalEntries;
    const subledger: SubledgerEntry[] = [];
    let runningBalance = 0;

    // Get account type to determine normal balance
    const account = accountsStore.getAccountById(accountId);
    const accountType = account?.accountType || account?.type || account?.classification;
    const isDebitNormal = accountType === 'Asset' || accountType === 'Expense';

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedEntries.forEach(entry => {
      entry.lines?.forEach((line: JournalEntryLine) => {
        if (line.accountId === accountId || line.accountNumber === accountNumber) {
          const debit = line.debitAmount || (line.isDebit ? line.amount : 0) || 0;
          const credit = line.creditAmount || (!line.isDebit ? line.amount : 0) || 0;

          // Calculate running balance based on account type
          if (isDebitNormal) {
            runningBalance += debit - credit;
          } else {
            runningBalance += credit - debit;
          }

          subledger.push({
            id: `${entry.id}-${line.id || Math.random()}`,
            date: entry.date,
            entryNumber: entry.entryNumber,
            description: line.description || entry.description,
            reference: entry.reference,
            debit,
            credit,
            balance: runningBalance,
            status: entry.status
          });
        }
      });
    });

    setSubledgerEntries(subledger);
  };

  // Toggle subledger view
  const toggleSubledger = (accountId: string, accountNumber?: string) => {
    if (showSubledger() === accountId) {
      setShowSubledger(null);
      setSubledgerEntries([]);
    } else {
      setShowSubledger(accountId);
      loadSubledgerEntries(accountId, accountNumber);
    }
  };

  const cardStyle = {
    'margin-bottom': '1rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const accountInfoStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem'
  };

  const expandButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-size': '1.2rem',
    color: 'var(--text-muted)',
    padding: '0.25rem',
    'border-radius': 'var(--border-radius-sm)',
    transition: 'all 0.2s ease'
  };

  const accountNumberStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase'
  };

  const accountNameStyle = {
    'font-size': '1.1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0'
  };

  const balanceStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--primary-color)'
  };

  const typeStyle = {
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  const subAccountsStyle = {
    'margin-left': '1rem',
    'border-left': '2px solid var(--border-color)',
    'padding-left': '1rem',
    'margin-top': '1rem'
  };

  const subAccountRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const subAccountInfoStyle = {
    flex: '1'
  };

  const subAccountNameStyle = {
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const subAccountDetailsStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const subAccountBalanceStyle = {
    'font-weight': '600',
    color: 'var(--primary-color)'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.5rem'
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
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleViewAccount = (account: AccountingAccount) => {
    if (props.onViewDetails) {
      props.onViewDetails(account);
    } else {
      navigate(`/accounts/${account.id}`);
    }
  };

  const handleAddSubAccount = () => {
    if (props.onAddSubAccount) {
      props.onAddSubAccount(props.account);
    }
  };

  const totalBalance = accountsStore.accountsBalances?.accountMapIDs?.[props?.account.id]?.balance  || 0;
  const typeColor = getTypeColor(props.account.accountType);


  return (
    <Card className="account-hierarchy-card" style={cardStyle}>
      <div style={headerStyle} data-id={`${props.account.id}`}>
        <div style={accountInfoStyle}>
          {props.account.subAccounts.length > 0 && (
            <button
              style={expandButtonStyle}
              onClick={() => setIsExpanded(!isExpanded())}
              onMouseEnter={(e) => e.target.style.background = 'var(--background-color)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              {isExpanded() ? '▼' : '▶'}
            </button>
          )}
          <div onClick={() => handleViewAccount(props.account)} style={{ cursor: 'pointer' }}>
            <div style={accountNumberStyle}>{props.account.accountNumber}</div>
            <h3 style={accountNameStyle}>{props.account.name}</h3>
          </div>
        </div>
        <Show when={props?.account?.accountType}>
        <div style={{ 'text-align': 'right' }}>
          <div style={balanceStyle}>{formatCurrency(totalBalance || 0)}</div>
          <div
            style={{
              ...typeStyle,
              background: typeColor.bg,
              color: typeColor.color
            }}
          >
            {t(`accounts.types.${props?.account?.accountType?.toLowerCase()}`)}
          </div>
        </div>
        </Show>
      </div>

      <div style={actionsStyle}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleViewAccount(props.account)}
        >
          {t('common.view')} {t('accounts.accountDetails')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSubAccount}
        >
          {t('common.add')} {t('accounts.subAccounts')}
        </Button>
        <Button
          variant={showSubledger() === props.account.id ? 'primary' : 'outline'}
          size="sm"
          onClick={() => toggleSubledger(props.account.id, props.account.accountNumber)}
        >
          📊 {t('accounts.subledger', 'Submayor')}
        </Button>
      </div>

      {/* Subledger for main account */}
      <Show when={showSubledger() === props.account.id}>
       
          <SubledgerTable accountId={props.account.id} account={props.account} t={t} />
        
      </Show>

      {isExpanded() && props.account.subAccounts.length > 0 && (
        <div style={subAccountsStyle}>
          <h4 style={{ margin: '0 0 1rem 0', 'font-size': '1rem', color: 'var(--text-muted)' }}>
            {t('accounts.subAccounts')} ({props.account.subAccounts.length})
          </h4>
          {props.account.subAccounts.map(subAccount => (
            <div  data-id={`${subAccount.id}`}>
              <div

                style={subAccountRowStyle}
                onClick={() => handleViewAccount(subAccount)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-color)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--background-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={subAccountInfoStyle}>
                  <div style={subAccountNameStyle}>{subAccount.name}</div>
                  <div style={subAccountDetailsStyle}>
                    {subAccount.accountNumber || subAccount.accountId} • {subAccount.description}
                  </div>
                </div>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubledger(subAccount.id, subAccount.accountNumber);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: showSubledger() === subAccount.id ? 'var(--primary-color)' : 'var(--gray-100)',
                      color: showSubledger() === subAccount.id ? 'white' : 'var(--text-secondary)',
                      border: 'none',
                      'border-radius': 'var(--border-radius-sm)',
                      cursor: 'pointer',
                      'font-size': '0.75rem'
                    }}
                  >
                    📊 {t('accounts.subledger', 'Submayor')}
                  </button>
                  <div style={subAccountBalanceStyle}>
                    {formatCurrency(accountsStore.accountsBalances?.accountMapIDs?.[subAccount.id]?.balance || 0)}
                  </div>
                </div>
              </div>

              {/* Subledger for sub-account */}
              <Show when={showSubledger() === subAccount.id}>
                
                  <SubledgerTable accountId={subAccount.id} account={subAccount} t={t} />
                
              </Show>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AccountHierarchyCard;






  // Subledger table component
const SubledgerTable = (props: { accountId: string; account?: any, t:any  }) => {
    //const entries = subledgerEntries();
    const [entries, setEntries] = createSignal([]);
     const [loading, setLoading] = createSignal(false);
    let t = props.t;


    createEffect(async ()=>{
        setLoading(true)
       let hh = await accountsApi.getLedger(props?.accountId)
       setEntries(hh?.transactions);
       setLoading(false)
    })

  const subledgerContainerStyle = {
    'margin-top': '0.75rem',
    'margin-bottom': '0.75rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden'
  };

  const subledgerHeaderStyle = {
    display: 'grid',
    'grid-template-columns': '100px 150px 150px 1fr 100px 100px 110px',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'var(--gray-100)',
    'font-weight': '600',
    'font-size': '0.75rem',
    'text-transform': 'uppercase',
    color: 'var(--text-muted)',
    'border-bottom': '1px solid var(--border-color)'
  };

  const subledgerRowStyle = {
    display: 'grid',
    'grid-template-columns': '100px 150px 150px 1fr 100px 100px 110px',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    'font-size': '0.85rem',
    'border-bottom': '1px solid var(--border-color)',
    'align-items': 'center'
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string | number) => {

   
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

    
    // Calculate totals
    const totalDebit =() => entries().reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = () => entries().reduce((sum, e) => sum + e.credit, 0);

    // Download CSV function
    const downloadCSV = () => {
      const data = entries();
      if (!data.length) return;

      // CSV headers
      const headers = [
        t('common.date', 'Fecha'),
        t('journal.entryNumber', 'Asiento'),
        t('journal.document', 'Documento'),
        t('common.description', 'Descripción'),
        t('journal.debit', 'Débito'),
        t('journal.credit', 'Crédito'),
        t('accounts.balance', 'Saldo')
      ];

      // Format date for CSV
      const formatDateCSV = (dateStr: string | number) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      };

      // Build CSV rows
      const rows = data.map(entry => [
        formatDateCSV(entry.date),
        entry.entryId || '',
        entry.document || entry.reference || '',
        `"${(entry.description || '').replace(/"/g, '""')}"`,
        entry.debit?.toFixed(2) || '0.00',
        entry.credit?.toFixed(2) || '0.00',
        entry.balance?.toFixed(2) || '0.00'
      ]);

      // Add totals row
      rows.push([
        '',
        '',
        '',
        'TOTAL',
        totalDebit().toFixed(2),
        totalCredit().toFixed(2),
        (data[data.length - 1]?.balance || 0).toFixed(2)
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `submayor_${props.account?.accountNumber || props.accountId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (

     
      <Show when={entries().length} fallback={
        <>
        <Show when={loading()} fallback={
          <div style={{ padding: '1.5rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
            {t('accounts.noTransactions', 'No hay movimientos registrados')}
          </div>
          }
          >
         
          <LoadingBar 
            height="2px" 
          />
        </Show>  

        </>
      }>

        <div style={{
                  'margin-left': '1rem',
                  'margin-bottom': '0.75rem',
                  'padding-left': '0.75rem',
                  'border-left': '2px solid var(--primary-color)'
                }}>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-bottom': '0.5rem',
                    'margin-top': '0.5rem'
                  }}>
                    <h5 style={{ margin: '0', 'font-size': '0.85rem', color: 'var(--text-secondary)' }}>
                      📋 {t('accounts.subledgerFor', 'Submayor de')} {props?.account?.name}
                    </h5>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                      <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {entries().length} {t('accounts.transactions', 'movimientos')}
                      </span>
                      <button
                        onClick={downloadCSV}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          'border-radius': '4px',
                          'font-size': '0.7rem',
                          cursor: 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.25rem'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                      >
                        📥 CSV
                      </button>
                    </div>
                  </div>

      
      <div style={subledgerContainerStyle}>
        {/* Header */}
        <div style={subledgerHeaderStyle}>
          <span>{t('common.date', 'Fecha')}</span>
          <span>{t('journal.entryNumber', 'Asiento')}</span>
          <span>{t('journal.document', 'Documento')}</span>
          <span>{t('common.description', 'Descripción')}</span>
          <span style={{ 'text-align': 'right' }}>{t('journal.debit', 'Débito')}</span>
          <span style={{ 'text-align': 'right' }}>{t('journal.credit', 'Crédito')}</span>
          <span style={{ 'text-align': 'right' }}>{t('accounts.balance', 'Saldo')}</span>
        </div>

        {/* Entries */}
        <div style={{ 'max-height': '300px', overflow: 'auto' }}>
          <For each={entries()}>
            {(entry) => (
              <div style={{
                ...subledgerRowStyle,
                background: entry.status === 'draft' ? '#fffde7' : 'white'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{formatDate(entry.date)}</span>
                <span>
                  <span style={{
                    padding: '0.15rem 0.4rem',
                    background: entry.status === 'posted' ? '#e8f5e9' : '#fff3e0',
                    'border-radius': '4px',
                    'font-size': '0.75rem'
                  }}>
                    {entry.entryId}
                  </span>
                </span>

                 <span>
                  <span style={{
                    padding: '0.15rem 0.4rem',
                   
                    'border-radius': '4px',
                    'font-size': '0.75rem'
                  }}>
                   {entry.document || entry.reference } 
                  </span>
                </span>

                <span style={{
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis',
                  'white-space': 'nowrap'
                }} title={entry.description}>
                  {entry.description}
                  {entry.reference && (
                    <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                      {' '}• {entry.reference}
                    </span>
                  )}
                </span>

                
               

                <span style={{
                  'text-align': 'right',
                  color: entry.debit > 0 ? '#2e7d32' : 'var(--text-muted)',
                  'font-weight': entry.debit > 0 ? '500' : 'normal'
                }}>
                  {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                </span>
                <span style={{
                  'text-align': 'right',
                  color: entry.credit > 0 ? '#d32f2f' : 'var(--text-muted)',
                  'font-weight': entry.credit > 0 ? '500' : 'normal'
                }}>
                  {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                </span>
                <span style={{
                  'text-align': 'right',
                  'font-weight': '600',
                  color: entry.balance >= 0 ? 'var(--primary-color)' : '#d32f2f'
                }}>
                  {formatCurrency(entry.balance)}
                </span>
              </div>
            )}
          </For>
        </div>

        {/* Totals */}
        <div style={{
          ...subledgerRowStyle,
          background: 'var(--gray-50)',
          'font-weight': '600',
          'border-bottom': 'none'
        }}>
          <span></span>
          <span></span>
          <span style={{ 'text-align': 'right' }}>{t('common.total', 'TOTAL')}</span>
          <span style={{ 'text-align': 'right', color: '#2e7d32' }}>{formatCurrency(totalDebit())}</span>
          <span style={{ 'text-align': 'right', color: '#d32f2f' }}>{formatCurrency(totalCredit())}</span>
          <span style={{
            'text-align': 'right',
            color: entries()[entries().length - 1]?.balance >= 0 ? 'var(--primary-color)' : '#d32f2f'
          }}>
            {formatCurrency(entries()[entries().length - 1]?.balance || 0)}
          </span>
        </div>
      </div>
      </div>
      </Show>
    );
  };