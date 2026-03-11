import { Component, For } from 'solid-js';
import { InvoiceBulk, InvoiceProduct, InvoiceReserva, InvoiceService } from '../types/invoiceTypes';
import { useTranslation } from '../../../translations';
import BulkItemGroup from './BulkItemGroup';

interface BulkSummaryProps {
  bulks: InvoiceBulk[];
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  services: InvoiceService[];
}

const BulkSummary: Component<BulkSummaryProps> = (props) => {
  const { t } = useTranslation();

  // Utility functions
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const parseFloat2 = (value: any): number => {
    return parseFloat(value?.toString() || '0') || 0;
  };

  // Styles
  const containerStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1rem',
    'margin-bottom': '1rem'
  };

  const headerStyle = {
    'font-size': '1.1rem',
    'font-weight': 'bold',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--primary-color)'
  };

  const summaryStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
    'margin-bottom': '1rem',
    padding: '0.75rem',
    background: 'var(--strip-color)',
    'border-radius': 'var(--border-radius-sm)'
  };

  const statStyle = {
    'text-align': 'center',
    'font-size': '0.875rem'
  };

  const statValueStyle = {
    'font-size': '1.25rem',
    'font-weight': 'bold',
    color: 'var(--primary-color)',
    display: 'block'
  };

  // Calculate summary statistics
  const totalBulks = () => props.bulks.length;
  const totalItems = () => props.products.length + props.reservas.length + props.services.length;
  const totalTransportCost = () => props.bulks.reduce((sum, bulk) => sum + (bulk?.transportCost || 20), 0);
  
  const totalValue = () => {
    return props.products.reduce((sum, p) => sum + (Math.abs(p.qty) * parseFloat2(p.salePrice)), 0) +
           props.reservas.reduce((sum, r) => sum + ((parseFloat2(r.qty) || 0) * (parseFloat2(r.price) || 0) + (r.arancel ? parseFloat2(r.arancel) : 0)), 0) +
           props.services.reduce((sum, s) => sum + ((parseFloat2(s.qty) || 0) * ((s.arancel || s.price) ? parseFloat2(s.arancel || s.price) : 0)), 0) +
           totalTransportCost();
  };

  return (
    <div style={containerStyle}>
      <h3 style={headerStyle}>📦 {t('invoices.bulkSummary')}</h3>
      
      {/* Summary Statistics */}
      <div style={summaryStyle}>
        <div style={statStyle}>
          <span style={statValueStyle}>{totalBulks()}</span>
          {t('invoices.totalBulks')}
        </div>
        <div style={statStyle}>
          <span style={statValueStyle}>{totalItems()}</span>
          {t('invoices.totalItems')}
        </div>
        <div style={statStyle}>
          <span style={statValueStyle}>{formatCurrency(totalTransportCost())}</span>
          {t('invoices.totalTransport')}
        </div>
        <div style={statStyle}>
          <span style={statValueStyle}>{formatCurrency(totalValue())}</span>
          {t('invoices.totalValue')}
        </div>
      </div>

      {/* Compact Bulk List */}
      <For each={props.bulks}>
        {(bulk) => (
          <BulkItemGroup
            bulk={bulk}
            products={props.products}
            reservas={props.reservas}
            services={props.services}
            showDetails={false}
            compact={true}
            formatCurrency={formatCurrency}
            parseFloat2={parseFloat2}
            t={t}
            tableStyle={{
              width: '100%',
              'border-collapse': 'collapse',
              'margin-top': '0.5rem'
            }}
            tdStyle={{
              border: '1px solid var(--border-color)',
              padding: '0.375rem',
              color: 'var(--text-primary)'
            }}
            thStyle={{
              border: '1px solid var(--border-color)',
              padding: '0.375rem',
              'background-color': 'var(--strip-color)',
              'font-weight': '600',
              color: 'var(--text-secondary)',
              'font-size': '0.75rem'
            }}
          />
        )}
      </For>
    </div>
  );
};

export default BulkSummary;