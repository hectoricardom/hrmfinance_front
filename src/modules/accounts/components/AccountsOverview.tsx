import { Component } from 'solid-js';
import { Card } from '../../ui';
import { accountsStore } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';

const AccountsOverview: Component = () => {
  const { t } = useTranslation();
  const overviewGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const valueStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--primary-color)',
    'margin-bottom': '0.5rem'
  };

  const countStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalAssets = accountsStore.getTotalByType('Asset');
  const totalLiabilities = accountsStore.getTotalByType('Liability');
  const totalEquity = accountsStore.getTotalByType('Equity');
  const totalRevenue = accountsStore.getTotalByType('Revenue');
  const totalExpenses = accountsStore.getTotalByType('Expense');

  const assetCount = accountsStore.getAccountsByType('Asset').length;
  const liabilityCount = accountsStore.getAccountsByType('Liability').length;
  const equityCount = accountsStore.getAccountsByType('Equity').length;
  const revenueCount = accountsStore.getAccountsByType('Revenue').length;
  const expenseCount = accountsStore.getAccountsByType('Expense').length;

  return (
    <div style={overviewGridStyle}>
      <Card title={t('dashboard.totalAssets')} subtitle={t('dashboard.overview')}>
        <div style={valueStyle}>{formatCurrency(totalAssets)}</div>
        <div style={countStyle}>{assetCount} {t('navigation.accounts')}</div>
      </Card>
      
      <Card title={t('dashboard.totalLiabilities')} subtitle={t('dashboard.overview')}>
        <div style={valueStyle}>{formatCurrency(totalLiabilities)}</div>
        <div style={countStyle}>{liabilityCount} {t('navigation.accounts')}</div>
      </Card>
      
      <Card title={t('dashboard.totalEquity')} subtitle={t('accounts.categories.ownersEquity')}>
        <div style={valueStyle}>{formatCurrency(totalEquity)}</div>
        <div style={countStyle}>{equityCount} {t('navigation.accounts')}</div>
      </Card>
      
      <Card title={t('dashboard.totalRevenue')} subtitle={t('accounts.categories.operatingRevenue')}>
        <div style={valueStyle}>{formatCurrency(totalRevenue)}</div>
        <div style={countStyle}>{revenueCount} {t('navigation.accounts')}</div>
      </Card>
      
      <Card title={t('dashboard.totalExpenses')} subtitle={t('accounts.categories.operatingExpenses')}>
        <div style={valueStyle}>{formatCurrency(totalExpenses)}</div>
        <div style={countStyle}>{expenseCount} {t('navigation.accounts')}</div>
      </Card>
      
      <Card title={t('dashboard.netIncome')} subtitle={`${t('dashboard.totalRevenue')} - ${t('dashboard.totalExpenses')}`}>
        <div style={{
          ...valueStyle,
          color: totalRevenue - totalExpenses >= 0 ? '#4caf50' : '#f44336'
        }}>
          {formatCurrency(totalRevenue - totalExpenses)}
        </div>
        <div style={countStyle}>
          {totalRevenue - totalExpenses >= 0 ? t('dashboard.netIncome') : t('dashboard.netLoss')}
        </div>
      </Card>
    </div>
  );
};

export default AccountsOverview;