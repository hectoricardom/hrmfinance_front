import { Component, For, Show } from 'solid-js';
import { InvoiceBulk, InvoiceProduct, InvoiceReserva, InvoiceService } from '../types/invoiceTypes';

interface BulkItemGroupProps {
  bulk: InvoiceBulk;
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  services: InvoiceService[];
  showDetails?: boolean;
  compact?: boolean;
  formatCurrency: (amount: number) => string;
  parseFloat2: (value: any) => number;
  t: (key: string) => string;
  tableStyle?: any;
  tdStyle?: any;
  thStyle?: any;
}

const BulkItemGroup: Component<BulkItemGroupProps> = (props) => {
  // Filter items for this bulk
  const bulkProducts = () => props.products.filter(p => p.bulkId === props.bulk?.id);
  const bulkReservas = () => props.reservas.filter(r => r.bulkId === props.bulk?.id);
  const bulkServices = () => props.services.filter(s => s.bulkId === props.bulk?.id);
  
  // Calculate bulk totals
  const bulkTotals = () => {
    const productsTotal = bulkProducts().reduce((sum, p) => sum + (Math.abs(p.qty) * props.parseFloat2(p.salePrice)), 0);
    const reservasTotal = bulkReservas().reduce((sum, r) => sum + ((props.parseFloat2(r.qty) || 0) * (props.parseFloat2(r.price) || 0) + (r.arancel ? props.parseFloat2(r.arancel) : 0)), 0);
    const servicesTotal = bulkServices().reduce((sum, s) => sum + ((props.parseFloat2(s.qty) || 0) * ((s.arancel || s.price) ? props.parseFloat2(s.arancel || s.price) : 0)), 0);
    const itemsTotal = productsTotal + reservasTotal + servicesTotal;
    const grandTotal = itemsTotal + (props.bulk?.transportCost || 20);
    
    return {
      productsTotal,
      reservasTotal,
      servicesTotal,
      itemsTotal,
      grandTotal
    };
  };

  // Styles
  const bulkContainerStyle = () => ({
    border: '1px solid var(--border-color)',
    'border-radius': props.compact ? 'var(--border-radius-sm)' : 'var(--border-radius)',
    padding: props.compact ? '0.75rem' : '1rem',
    'margin-bottom': props.compact ? '0.75rem' : '1rem',
    background: 'var(--strip-color)'
  });

  const bulkHeaderStyle = () => ({
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': props.compact ? '0.5rem' : '1rem',
    'padding-bottom': props.compact ? '0.25rem' : '0.5rem',
    'border-bottom': '1px solid var(--border-color)'
  });

  const bulkTitleStyle = () => ({
    margin: 0,
    'font-size': props.compact ? '1rem' : '1.1rem',
    'font-weight': 'bold',
    color: 'var(--text-primary)'
  });

  const bulkInfoStyle = () => ({
    'font-size': props.compact ? '0.75rem' : '0.875rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem'
  });

  const bulkTotalStyle = () => ({
    'text-align': 'right',
    'font-weight': 'bold',
    'font-size': props.compact ? '1rem' : '1.1rem',
    color: 'var(--primary-color)'
  });

  const bulkSubtotalStyle = () => ({
    'font-size': props.compact ? '0.65rem' : '0.75rem',
    color: 'var(--text-muted)',
    'margin-top': '0.125rem'
  });

  const sectionTitleStyle = () => ({
    margin: '0 0 0.5rem 0',
    'font-size': props.compact ? '0.85rem' : '0.95rem',
    color: 'var(--text-secondary)',
    'font-weight': '500'
  });

  const compactTableStyle = () => ({
    ...props.tableStyle,
    'font-size': props.compact ? '0.8rem' : '0.875rem',
    'margin-bottom': props.compact ? '0.5rem' : '0.75rem'
  });

  const compactTdStyle = () => ({
    ...props.tdStyle,
    padding: props.compact ? '0.375rem' : '0.5rem'
  });

  return (
    <div style={bulkContainerStyle()}>
      {/* Bulk Header */}
      <div style={bulkHeaderStyle()}>
        <div>
          <h4 style={bulkTitleStyle()}>📦 {props.bulk?.name}</h4>
          <Show when={props.showDetails}>
            {props.bulk?.shippingMethod}
            <div style={bulkInfoStyle()}>
              {props.t('invoices.type')}: <strong>{props.bulk?.type}</strong> | 
              {props.t('invoices.shippingMethod')}: <strong>{props.bulk?.shippingMethod === 'aereo' ? '🛩️ Aéreo' : props.bulk?.shippingMethod === 'maritimo' ? '🚢 Marítimo' :  props.bulk?.shippingMethod === 'express' ? '⚡ Aéreo Express' : ""}</strong>
              {props.bulk?.currentWeight && props.bulk?.maxWeight && (
                <> | {props.t('invoices.weight')}: <strong>{props.bulk?.currentWeight}/{props.bulk?.maxWeight} lbs</strong></>
              )}
            </div>
          </Show>
        </div>
        <div style={{ 'text-align': 'right' }}>
          <div style={bulkTotalStyle()}>
            {props.formatCurrency(bulkTotals().grandTotal)}
          </div>
          <Show when={props.showDetails}>
            <div style={bulkSubtotalStyle()}>
              {props.t('invoices.items')}: {props.formatCurrency(bulkTotals().itemsTotal)} + {props.t('invoiceReport.transport')}: {props.formatCurrency(props.bulk?.transportCost || 20)}
            </div>
          </Show>
        </div>
      </div>

      {/* Bulk Products */}
      <Show when={bulkProducts().length > 0}>
        <div style={{ 'margin-bottom': props.compact ? '0.5rem' : '0.75rem' }}>
          <h5 style={sectionTitleStyle()}>
            {props.t('invoices.products')} ({bulkProducts().length})
          </h5>
          <table style={compactTableStyle()}>
            <Show when={!props.compact}>
              <thead>
                <tr>
                  <th style={props.thStyle}>{props.t('invoices.code')}</th>
                  <th style={props.thStyle}>{props.t('invoices.description')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'center' }}>{props.t('invoices.qty')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'right' }}>{props.t('invoices.unitPrice')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'right' }}>{props.t('invoices.total')}</th>
                </tr>
              </thead>
            </Show>
            <tbody>
              <For each={bulkProducts()}>
                {(item) => (
                  <tr>
                    <td style={compactTdStyle()}>{item.product.code}</td>
                    <td style={compactTdStyle()}>{item.product.label}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'center' }}>{Math.abs(item.qty)}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'right' }}>{props.formatCurrency(item.salePrice)}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'right' }}>
                      {props.formatCurrency(Math.abs(item.qty) * props.parseFloat2(item.salePrice))}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Bulk Reservas */}
      <Show when={bulkReservas().length > 0}>
        <div style={{ 'margin-bottom': props.compact ? '0.5rem' : '0.75rem' }}>
          <h5 style={sectionTitleStyle()}>
            {props.t('invoices.reservations')} ({bulkReservas().length})
          </h5>
          <table style={compactTableStyle()}>
            <Show when={!props.compact}>
              <thead>
                <tr>
                  <th style={props.thStyle}>{props.t('invoices.type')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'center' }}>{props.t('invoices.qty')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'right' }}>{props.t('invoices.unitPrice')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'right' }}>{props.t('invoices.arancel')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'right' }}>{props.t('invoices.total')}</th>
                </tr>
              </thead>
            </Show>
            <tbody>
              <For each={bulkReservas()}>
                {(item) => (
                  <tr>
                    <td style={compactTdStyle()}>{item.type}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'center' }}>{item.qty}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'right' }}>{props.formatCurrency(item.price)}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'right' }}>{item.arancel || '-'}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'right' }}>
                      {props.formatCurrency((props.parseFloat2(item.qty) || 0) * (props.parseFloat2(item.price) || 0) + (item.arancel ? props.parseFloat2(item.arancel) : 0))}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Bulk Services */}
      <Show when={bulkServices().length > 0}>
        <div>
          <h5 style={sectionTitleStyle()}>
            {props.t('invoices.services')} ({bulkServices().length})
          </h5>
          <table style={compactTableStyle()}>
            <Show when={!props.compact}>
              <thead>
                <tr>
                  <th style={props.thStyle}>{props.t('invoices.type')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'center' }}>{props.t('invoices.qty')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'right' }}>{props.t('invoices.arancel')}</th>
                  <th style={{ ...props.thStyle, 'text-align': 'right' }}>{props.t('invoices.total')}</th>
                </tr>
              </thead>
            </Show>
            <tbody>
              <For each={bulkServices()}>
                {(item) => (
                  <tr>
                    <td style={compactTdStyle()}>{item.type}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'center' }}>{props.parseFloat2(item.qty).toFixed(2)}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'right' }}>{(item.arancel || item.price) ? props.formatCurrency(item.arancel || item.price) : '-'}</td>
                    <td style={{ ...compactTdStyle(), 'text-align': 'right' }}>
                      {props.formatCurrency((props.parseFloat2(item.qty) || 0) * ((item.arancel || item.price) ? props.parseFloat2(item.arancel || item.price) : 0))}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Empty state */}
      <Show when={bulkProducts().length === 0 && bulkReservas().length === 0 && bulkServices().length === 0}>
        <div style={{
          'text-align': 'center',
          color: 'var(--text-muted)',
          'font-style': 'italic',
          padding: props.compact ? '1rem' : '1.5rem',
          'font-size': props.compact ? '0.8rem' : '0.875rem'
        }}>
          {props.t('invoices.emptyBulk')}
        </div>
      </Show>
    </div>
  );
};

export default BulkItemGroup;