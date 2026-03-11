/**
 * YabaInvoiceSummary Component
 * A modern invoice summary for YABA Global Express
 * SolidJS with inline styles
 */

import { Component, For, Show, createMemo } from 'solid-js';
import {
  calculateAirShippingCost,
  calculateMaritimeShippingCost,
  TariffItem,
} from '../config/yabaGlobalTariffs';

// ============================================
// TYPES
// ============================================

export interface SelectedItem {
  item: TariffItem;
  qty: number;
  categoryIcon: string;
}

export interface ShippingInfo {
  method: 'air' | 'maritime';
  weight: number;
  maritimeType?: 'miscellaneous' | 'durable';
  maritimeDeparture?: 'weekly' | 'monthly';
}

export interface YabaInvoiceSummaryProps {
  items: SelectedItem[];
  shipping: ShippingInfo;
  onShippingChange: (shipping: ShippingInfo) => void;
  onGenerateInvoice: () => void;
  onClear: () => void;
  onRemoveItem?: (itemId: string) => void;
}

// ============================================
// CSS VARIABLES
// ============================================

const cssVars = {
  '--yaba-primary': '#2563eb',
  '--yaba-primary-hover': '#1d4ed8',
  '--yaba-secondary': '#64748b',
  '--yaba-secondary-hover': '#475569',
  '--yaba-danger': '#ef4444',
  '--yaba-danger-hover': '#dc2626',
  '--yaba-success': '#22c55e',
  '--yaba-warning': '#f59e0b',
  '--yaba-bg': '#ffffff',
  '--yaba-bg-secondary': '#f8fafc',
  '--yaba-border': '#e2e8f0',
  '--yaba-text': '#1e293b',
  '--yaba-text-muted': '#64748b',
  '--yaba-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '--yaba-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '--yaba-radius': '12px',
  '--yaba-radius-sm': '8px',
};

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    width: '380px',
    maxHeight: 'calc(100vh - 40px)',
    backgroundColor: 'var(--yaba-bg, #ffffff)',
    borderRadius: 'var(--yaba-radius, 12px)',
    boxShadow: 'var(--yaba-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
    border: '1px solid var(--yaba-border, #e2e8f0)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ...cssVars,
  },

  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--yaba-border, #e2e8f0)',
    backgroundColor: 'var(--yaba-primary, #2563eb)',
    color: '#ffffff',
  },

  headerTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 20px',
  },

  section: {
    marginBottom: '16px',
  },

  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--yaba-text-muted, #64748b)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },

  itemsList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    maxHeight: '150px',
    overflowY: 'auto' as const,
  },

  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--yaba-border, #e2e8f0)',
    fontSize: '14px',
  },

  itemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },

  itemIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },

  itemName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    color: 'var(--yaba-text, #1e293b)',
  },

  itemQty: {
    fontSize: '12px',
    color: 'var(--yaba-text-muted, #64748b)',
    marginLeft: '4px',
  },

  itemPrice: {
    fontWeight: 500,
    color: 'var(--yaba-text, #1e293b)',
    marginLeft: '12px',
    flexShrink: 0,
  },

  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--yaba-danger, #ef4444)',
    cursor: 'pointer',
    padding: '4px',
    marginLeft: '8px',
    borderRadius: '4px',
    fontSize: '14px',
    lineHeight: 1,
    transition: 'background-color 0.2s',
  },

  toggleGroup: {
    display: 'flex',
    borderRadius: 'var(--yaba-radius-sm, 8px)',
    overflow: 'hidden',
    border: '1px solid var(--yaba-border, #e2e8f0)',
  },

  toggleBtn: {
    flex: 1,
    padding: '10px 16px',
    border: 'none',
    background: 'var(--yaba-bg-secondary, #f8fafc)',
    color: 'var(--yaba-text-muted, #64748b)',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },

  toggleBtnActive: {
    background: 'var(--yaba-primary, #2563eb)',
    color: '#ffffff',
    fontWeight: 500,
  },

  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginTop: '12px',
  },

  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--yaba-text-muted, #64748b)',
  },

  input: {
    padding: '10px 12px',
    borderRadius: 'var(--yaba-radius-sm, 8px)',
    border: '1px solid var(--yaba-border, #e2e8f0)',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  },

  shippingDetails: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'var(--yaba-bg-secondary, #f8fafc)',
    borderRadius: 'var(--yaba-radius-sm, 8px)',
    fontSize: '13px',
  },

  shippingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    color: 'var(--yaba-text-muted, #64748b)',
  },

  promoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#fef3c7',
    color: '#b45309',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '8px',
  },

  divider: {
    height: '1px',
    backgroundColor: 'var(--yaba-border, #e2e8f0)',
    margin: '16px 0',
  },

  totalSection: {
    padding: '16px 20px',
    borderTop: '1px solid var(--yaba-border, #e2e8f0)',
    backgroundColor: 'var(--yaba-bg-secondary, #f8fafc)',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px',
    color: 'var(--yaba-text-muted, #64748b)',
  },

  grandTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--yaba-text, #1e293b)',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '2px solid var(--yaba-border, #e2e8f0)',
  },

  footer: {
    padding: '16px 20px',
    borderTop: '1px solid var(--yaba-border, #e2e8f0)',
    display: 'flex',
    gap: '12px',
  },

  btnPrimary: {
    flex: 2,
    padding: '12px 20px',
    borderRadius: 'var(--yaba-radius-sm, 8px)',
    border: 'none',
    backgroundColor: 'var(--yaba-primary, #2563eb)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },

  btnSecondary: {
    flex: 1,
    padding: '12px 20px',
    borderRadius: 'var(--yaba-radius-sm, 8px)',
    border: '1px solid var(--yaba-border, #e2e8f0)',
    backgroundColor: 'var(--yaba-bg, #ffffff)',
    color: 'var(--yaba-danger, #ef4444)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },

  emptyState: {
    textAlign: 'center' as const,
    padding: '24px',
    color: 'var(--yaba-text-muted, #64748b)',
    fontSize: '14px',
  },

  maritimeOptions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },

  miniToggle: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 'var(--yaba-radius-sm, 8px)',
    border: '1px solid var(--yaba-border, #e2e8f0)',
    background: 'var(--yaba-bg, #ffffff)',
    color: 'var(--yaba-text-muted, #64748b)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },

  miniToggleActive: {
    background: 'var(--yaba-primary, #2563eb)',
    color: '#ffffff',
    borderColor: 'var(--yaba-primary, #2563eb)',
  },
};

// ============================================
// COMPONENT
// ============================================

const YabaInvoiceSummary: Component<YabaInvoiceSummaryProps> = (props) => {
  // Calculate items subtotal
  const itemsSubtotal = createMemo(() => {
    return props.items.reduce((sum, selectedItem) => {
      const price = selectedItem.item.price ?? 0;
      return sum + price * selectedItem.qty;
    }, 0);
  });

  // Calculate shipping cost
  const shippingCalculation = createMemo(() => {
    const { method, weight, maritimeType, maritimeDeparture } = props.shipping;

    if (weight <= 0) {
      return {
        subtotal: 0,
        freeLbs: 0,
        billableWeight: 0,
        pricePerLb: 0,
        total: 0,
        tierUsed: '',
        promotionApplied: false,
      };
    }

    if (method === 'air') {
      return calculateAirShippingCost(weight);
    } else {
      const type = maritimeType || 'miscellaneous';
      const departure = maritimeDeparture || 'weekly';
      return {
        ...calculateMaritimeShippingCost(weight, type, departure),
        tierUsed: `${departure === 'weekly' ? 'Semanal' : 'Mensual'} - ${type === 'durable' ? 'Duradero' : 'Miscelanea'}`,
      };
    }
  });

  // Grand total
  const grandTotal = createMemo(() => {
    return itemsSubtotal() + shippingCalculation().total;
  });

  const handleMethodChange = (method: 'air' | 'maritime') => {
    props.onShippingChange({
      ...props.shipping,
      method,
    });
  };

  const handleWeightChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const weight = parseFloat(target.value) || 0;
    props.onShippingChange({
      ...props.shipping,
      weight,
    });
  };

  const handleMaritimeTypeChange = (type: 'miscellaneous' | 'durable') => {
    props.onShippingChange({
      ...props.shipping,
      maritimeType: type,
    });
  };

  const handleMaritimeDepartureChange = (departure: 'weekly' | 'monthly') => {
    props.onShippingChange({
      ...props.shipping,
      maritimeDeparture: departure,
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          <span>YABA</span>
          <span style={{ fontWeight: 400, opacity: 0.9 }}>Resumen de Factura</span>
        </h3>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Items Section */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Articulos Seleccionados</div>
          <Show
            when={props.items.length > 0}
            fallback={
              <div style={styles.emptyState}>
                No hay articulos seleccionados
              </div>
            }
          >
            <ul style={styles.itemsList}>
              <For each={props.items}>
                {(selectedItem) => (
                  <li style={styles.itemRow}>
                    <div style={styles.itemInfo}>
                      <span style={styles.itemIcon}>{selectedItem.categoryIcon}</span>
                      <span style={styles.itemName}>
                        {selectedItem.item.nameEs}
                        <span style={styles.itemQty}>x{selectedItem.qty}</span>
                      </span>
                    </div>
                    <span style={styles.itemPrice}>
                      {selectedItem.item.price !== null
                        ? formatCurrency(selectedItem.item.price * selectedItem.qty)
                        : 'Consultar'}
                    </span>
                    <Show when={props.onRemoveItem}>
                      <button
                        style={styles.removeBtn}
                        onClick={() => props.onRemoveItem?.(selectedItem.item.id)}
                        title="Eliminar"
                      >
                        X
                      </button>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div style={styles.divider} />

        {/* Shipping Section */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Envio</div>

          {/* Method Toggle */}
          <div style={styles.toggleGroup}>
            <button
              style={{
                ...styles.toggleBtn,
                ...(props.shipping.method === 'air' ? styles.toggleBtnActive : {}),
              }}
              onClick={() => handleMethodChange('air')}
            >
              Aereo
            </button>
            <button
              style={{
                ...styles.toggleBtn,
                ...(props.shipping.method === 'maritime' ? styles.toggleBtnActive : {}),
              }}
              onClick={() => handleMethodChange('maritime')}
            >
              Maritimo
            </button>
          </div>

          {/* Maritime Options */}
          <Show when={props.shipping.method === 'maritime'}>
            <div style={styles.maritimeOptions}>
              <button
                style={{
                  ...styles.miniToggle,
                  ...(props.shipping.maritimeType === 'miscellaneous' ? styles.miniToggleActive : {}),
                }}
                onClick={() => handleMaritimeTypeChange('miscellaneous')}
              >
                Miscelanea
              </button>
              <button
                style={{
                  ...styles.miniToggle,
                  ...(props.shipping.maritimeType === 'durable' ? styles.miniToggleActive : {}),
                }}
                onClick={() => handleMaritimeTypeChange('durable')}
              >
                Duradero
              </button>
            </div>
            <div style={styles.maritimeOptions}>
              <button
                style={{
                  ...styles.miniToggle,
                  ...(props.shipping.maritimeDeparture === 'weekly' ? styles.miniToggleActive : {}),
                }}
                onClick={() => handleMaritimeDepartureChange('weekly')}
              >
                Semanal
              </button>
              <button
                style={{
                  ...styles.miniToggle,
                  ...(props.shipping.maritimeDeparture === 'monthly' ? styles.miniToggleActive : {}),
                }}
                onClick={() => handleMaritimeDepartureChange('monthly')}
              >
                Mensual
              </button>
            </div>
          </Show>

          {/* Weight Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Peso (lbs)</label>
            <input
              type="number"
              style={styles.input}
              value={props.shipping.weight}
              onInput={handleWeightChange}
              min="0"
              step="0.1"
              placeholder="Ingrese el peso en libras"
            />
          </div>

          {/* Shipping Details */}
          <Show when={props.shipping.weight > 0}>
            <div style={styles.shippingDetails}>
              <div style={styles.shippingRow}>
                <span>Tarifa:</span>
                <span>{formatCurrency(shippingCalculation().pricePerLb)}/lb</span>
              </div>
              <div style={styles.shippingRow}>
                <span>Peso facturable:</span>
                <span>{shippingCalculation().billableWeight.toFixed(1)} lbs</span>
              </div>
              <Show when={shippingCalculation().tierUsed}>
                <div style={styles.shippingRow}>
                  <span>Nivel:</span>
                  <span>{shippingCalculation().tierUsed}</span>
                </div>
              </Show>
              <Show when={shippingCalculation().promotionApplied}>
                <div style={styles.promoBadge}>
                  +{shippingCalculation().freeLbs} lbs GRATIS!
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      {/* Totals Section */}
      <div style={styles.totalSection}>
        <div style={styles.totalRow}>
          <span>Subtotal Articulos:</span>
          <span>{formatCurrency(itemsSubtotal())}</span>
        </div>
        <div style={styles.totalRow}>
          <span>Costo de Envio:</span>
          <span>{formatCurrency(shippingCalculation().total)}</span>
        </div>
        <div style={styles.grandTotal}>
          <span>Total:</span>
          <span>{formatCurrency(grandTotal())}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={styles.footer}>
        <button
          style={styles.btnPrimary}
          onClick={props.onGenerateInvoice}
          disabled={props.items.length === 0 && props.shipping.weight <= 0}
        >
          Generar Factura
        </button>
        <button
          style={styles.btnSecondary}
          onClick={props.onClear}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
};

export default YabaInvoiceSummary;
