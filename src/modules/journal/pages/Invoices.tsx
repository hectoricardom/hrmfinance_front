import { Component } from 'solid-js';
import { Layout } from '../../ui';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { useTranslation } from '../../../translations';

const Invoices: Component = () => {
  const { t } = useTranslation();
  const invoiceListStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1rem'
  };

  const invoiceRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const invoiceInfoStyle = {
    flex: '1'
  };

  const invoiceNumberStyle = {
    'font-weight': '600',
    'margin-bottom': '0.25rem'
  };

  const clientNameStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const invoiceAmountStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--primary-color)'
  };

  const statusBadgeStyle = (status: string) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    background: status === 'paid' ? '#d4edda' : status === 'pending' ? '#fff3cd' : '#f8d7da',
    color: status === 'paid' ? '#155724' : status === 'pending' ? '#856404' : '#721c24'
  });

  const summaryCardsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  return (
    <Layout title={t('invoices.title', 'Invoices')}>
      <div style={{ 'margin-bottom': '2rem' }}>
        <Button variant="primary">{t('invoices.createNew', 'Create New Invoice')}</Button>
      </div>

      <div style={summaryCardsStyle}>
        <Card title={t('invoices.totalOutstanding', 'Total Outstanding')} subtitle={t('invoices.unpaidInvoices', 'Unpaid invoices')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>$23,450</div>
        </Card>
        <Card title={t('invoices.thisMonth', 'This Month')} subtitle={t('invoices.revenueCollected', 'Revenue collected')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>$87,230</div>
        </Card>
        <Card title={t('invoices.overdue', 'Overdue')} subtitle={t('invoices.pastDueInvoices', 'Past due invoices')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>$5,670</div>
        </Card>
      </div>

      <Card title={t('invoices.recentInvoices', 'Recent Invoices')} subtitle={t('invoices.latestBillingActivity', 'Latest billing activity')}>
        <div style={invoiceListStyle}>
          <div style={invoiceRowStyle}>
            <div style={invoiceInfoStyle}>
              <div style={invoiceNumberStyle}>INV-2024-001</div>
              <div style={clientNameStyle}>Acme Corporation</div>
            </div>
            <div style={invoiceAmountStyle}>$5,250.00</div>
            <div style={statusBadgeStyle('paid')}>{t('invoices.paid', 'Paid')}</div>
          </div>

          <div style={invoiceRowStyle}>
            <div style={invoiceInfoStyle}>
              <div style={invoiceNumberStyle}>INV-2024-002</div>
              <div style={clientNameStyle}>Tech Solutions Inc.</div>
            </div>
            <div style={invoiceAmountStyle}>$3,750.00</div>
            <div style={statusBadgeStyle('pending')}>{t('invoices.pending', 'Pending')}</div>
          </div>

          <div style={invoiceRowStyle}>
            <div style={invoiceInfoStyle}>
              <div style={invoiceNumberStyle}>INV-2024-003</div>
              <div style={clientNameStyle}>Global Services Ltd.</div>
            </div>
            <div style={invoiceAmountStyle}>$8,900.00</div>
            <div style={statusBadgeStyle('overdue')}>{t('invoices.overdue', 'Overdue')}</div>
          </div>

          <div style={invoiceRowStyle}>
            <div style={invoiceInfoStyle}>
              <div style={invoiceNumberStyle}>INV-2024-004</div>
              <div style={clientNameStyle}>StartUp Co.</div>
            </div>
            <div style={invoiceAmountStyle}>$2,100.00</div>
            <div style={statusBadgeStyle('paid')}>{t('invoices.paid', 'Paid')}</div>
          </div>
        </div>
      </Card>
    </Layout>
  );
};

export default Invoices;