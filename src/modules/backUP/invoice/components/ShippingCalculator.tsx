import { Component, createSignal, createMemo, createEffect, Show, For } from 'solid-js';
import {
  calculateAirShippingCost,
  calculateMaritimeShippingCost,
  YABA_AIR_SHIPPING,
  YABA_MARITIME_SHIPPING
} from '../config/yabaGlobalTariffs';

// ============================================
// TYPES
// ============================================

export interface ShippingBreakdown {
  subtotal: number;
  freeLbs: number;
  billableWeight: number;
  pricePerLb: number;
  total: number;
  promotionApplied: boolean;
  tierUsed?: string;
  weight: number;
  method: 'aereo' | 'maritimo' | '';
}

export interface ShippingCalculatorProps {
  onCostCalculated: (breakdown: ShippingBreakdown) => void;
  // Optional external control
  maritimeDeparture?: 'weekly' | 'monthly';
  maritimeItemType?: 'miscellaneous' | 'durable';
  onMaritimeDepartureChange?: (type: 'weekly' | 'monthly') => void;
  onMaritimeItemTypeChange?: (type: 'miscellaneous' | 'durable') => void;
  onWeightChange?: (weight: number) => void;
  onMethodChange?: (method: 'aereo' | 'maritimo') => void;
  initialWeight?: number;
  initialMethod?: 'aereo' | 'maritimo';
}

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    background: 'var(--surface-color, #ffffff)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '8px',
    padding: '1.25rem'
  },
  weightInputContainer: {
    'margin-bottom': '1rem'
  },
  label: {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary, #6b7280)',
    'margin-bottom': '0.5rem'
  },
  weightInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    'font-size': '1.25rem',
    'font-weight': '600',
    border: '2px solid var(--border-color, #e5e7eb)',
    'border-radius': '8px',
    background: 'var(--surface-color, #ffffff)',
    color: 'var(--text-primary, #1a1a2e)',
    'text-align': 'center' as const,
    transition: 'border-color 0.2s'
  },
  toggleContainer: {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1rem'
  },
  toggleButton: (isActive: boolean) => ({
    flex: '1',
    padding: '0.875rem',
    border: `2px solid ${isActive ? 'var(--primary-color, #3b82f6)' : 'var(--border-color, #e5e7eb)'}`,
    'border-radius': '8px',
    background: isActive ? 'var(--primary-color, #3b82f6)' : 'var(--surface-color, #ffffff)',
    color: isActive ? 'white' : 'var(--text-primary, #1a1a2e)',
    cursor: 'pointer',
    'font-size': '0.9rem',
    'font-weight': '600',
    transition: 'all 0.2s ease',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem'
  }),
  subToggleContainer: {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '0.75rem'
  },
  subToggleButton: (isActive: boolean) => ({
    flex: '1',
    padding: '0.5rem 0.75rem',
    border: `1px solid ${isActive ? 'var(--primary-color, #3b82f6)' : 'var(--border-color, #e5e7eb)'}`,
    'border-radius': '6px',
    background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface-color, #ffffff)',
    color: isActive ? 'var(--primary-color, #3b82f6)' : 'var(--text-primary, #1a1a2e)',
    cursor: 'pointer',
    'font-size': '0.8rem',
    'font-weight': '500',
    transition: 'all 0.2s ease'
  }),
  sectionTitle: {
    'font-size': '0.8rem',
    'font-weight': '600',
    color: 'var(--text-secondary, #6b7280)',
    'margin-bottom': '0.5rem',
    'margin-top': '0.75rem'
  },
  ratesTable: {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '0.75rem',
    'font-size': '0.75rem'
  },
  tableHeader: {
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    padding: '0.4rem 0.5rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    'font-size': '0.7rem'
  },
  tableCell: (isHighlighted: boolean = false) => ({
    padding: '0.4rem 0.5rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    background: isHighlighted ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    'font-weight': isHighlighted ? '600' : 'normal',
    'font-size': '0.75rem'
  }),
  promotionBanner: (isActive: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    'border-radius': '6px',
    background: isActive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6',
    border: isActive ? 'none' : '1px dashed var(--border-color, #e5e7eb)',
    color: isActive ? 'white' : 'var(--text-secondary, #6b7280)',
    'margin-bottom': '0.75rem',
    'font-size': '0.8rem'
  }),
  breakdownContainer: {
    background: '#f8fafc',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '8px',
    padding: '0.875rem',
    'margin-top': '0.75rem'
  },
  breakdownRow: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.35rem 0',
    'font-size': '0.8rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)'
  },
  breakdownRowLast: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'padding': '0.5rem 0 0 0',
    'font-size': '1rem',
    'font-weight': 'bold',
    color: 'var(--text-primary, #1a1a2e)'
  },
  discountRow: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.35rem 0',
    'font-size': '0.8rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    color: '#10b981'
  },
  totalAmount: {
    'font-size': '1.1rem',
    color: 'var(--primary-color, #3b82f6)'
  },
  noMethodSelected: {
    'text-align': 'center' as const,
    padding: '1.5rem',
    color: 'var(--text-secondary, #6b7280)',
    'font-size': '0.875rem'
  }
};

// ============================================
// COMPONENT
// ============================================

const ShippingCalculator: Component<ShippingCalculatorProps> = (props) => {
  // Internal state
  const [weight, setWeight] = createSignal(props.initialWeight ?? 0);
  const [shippingMethod, setShippingMethod] = createSignal<'aereo' | 'maritimo' | ''>(props.initialMethod ?? '');
  const [departureType, setDepartureType] = createSignal<'weekly' | 'monthly'>(props.maritimeDeparture ?? 'weekly');
  const [itemType, setItemType] = createSignal<'miscellaneous' | 'durable'>(props.maritimeItemType ?? 'miscellaneous');

  // Sync external props if provided
  createEffect(() => {
    if (props.maritimeDeparture) setDepartureType(props.maritimeDeparture);
  });

  createEffect(() => {
    if (props.maritimeItemType) setItemType(props.maritimeItemType);
  });

  // Calculate shipping cost based on method and weight
  const shippingCalculation = createMemo(() => {
    const w = weight();
    const method = shippingMethod();

    if (!method || w <= 0) {
      return null;
    }

    if (method === 'aereo') {
      const result = calculateAirShippingCost(w);
      return {
        subtotal: result.subtotal,
        freeLbs: result.freeLbs,
        billableWeight: result.billableWeight,
        pricePerLb: result.pricePerLb,
        total: result.total,
        promotionApplied: result.promotionApplied,
        tierUsed: result.tierUsed,
        weight: w,
        method: method
      } as ShippingBreakdown;
    } else {
      const departure = departureType();
      const iType = itemType();
      const result = calculateMaritimeShippingCost(w, iType, departure);
      return {
        subtotal: result.subtotal,
        freeLbs: result.freeLbs,
        billableWeight: result.billableWeight,
        pricePerLb: result.pricePerLb,
        total: result.total,
        promotionApplied: result.promotionApplied,
        tierUsed: `${departure === 'weekly' ? 'Semanal' : 'Mensual'} - ${iType === 'durable' ? 'Duradero' : 'Miscelanea'}`,
        weight: w,
        method: method
      } as ShippingBreakdown;
    }
  });

  // Notify parent of cost changes
  createEffect(() => {
    const calc = shippingCalculation();
    if (calc) {
      props.onCostCalculated(calc);
    }
  });

  // Notify parent of weight changes
  createEffect(() => {
    const w = weight();
    props.onWeightChange?.(w);
  });

  // Notify parent of method changes
  createEffect(() => {
    const m = shippingMethod();
    if (m) {
      props.onMethodChange?.(m);
    }
  });

  // Handle departure type change
  const handleDepartureChange = (type: 'weekly' | 'monthly') => {
    setDepartureType(type);
    props.onMaritimeDepartureChange?.(type);
  };

  // Handle item type change
  const handleItemTypeChange = (type: 'miscellaneous' | 'durable') => {
    setItemType(type);
    props.onMaritimeItemTypeChange?.(type);
  };

  // Get current tier for air shipping highlighting
  const getCurrentAirTier = createMemo(() => {
    if (shippingMethod() !== 'aereo' || weight() <= 0) return null;
    return YABA_AIR_SHIPPING.tiers.find(
      t => weight() >= t.minLbs && weight() <= t.maxLbs
    );
  });

  // Air shipping promotion info
  const airPromotion = YABA_AIR_SHIPPING.promotion;
  const isAirPromoActive = createMemo(() =>
    shippingMethod() === 'aereo' && weight() > airPromotion.threshold
  );

  // Maritime promotion info
  const isMaritimePromoActive = createMemo(() => {
    if (shippingMethod() !== 'maritimo') return false;
    if (departureType() !== 'weekly') return false;
    const threshold = YABA_MARITIME_SHIPPING.weekly.promoThreshold || 0;
    return weight() > threshold;
  });

  return (
    <div style={styles.container}>
      {/* Weight Input */}
      <div style={styles.weightInputContainer}>
        <label style={styles.label}>Peso (lbs)</label>
        <input
          type="number"
          style={styles.weightInput}
          value={weight()}
          onInput={(e) => setWeight(parseFloat(e.currentTarget.value) || 0)}
          placeholder="0.00"
          min="0"
          step="0.1"
        />
      </div>

      {/* Shipping Method Toggle */}
      <div style={styles.label}>Tipo de Envío</div>
      <div style={styles.toggleContainer}>
        <button
          type="button"
          style={styles.toggleButton(shippingMethod() === 'aereo')}
          onClick={() => setShippingMethod('aereo')}
        >
          <span>✈️</span>
          <span>Aéreo</span>
        </button>
        <button
          type="button"
          style={styles.toggleButton(shippingMethod() === 'maritimo')}
          onClick={() => setShippingMethod('maritimo')}
        >
          <span>🚢</span>
          <span>Marítimo</span>
        </button>
      </div>

      {/* Air Shipping Section */}
      <Show when={shippingMethod() === 'aereo'}>
        {/* Air Promotion Banner */}
        <div style={styles.promotionBanner(isAirPromoActive())}>
          <span>{isAirPromoActive() ? '🎉' : '🎁'}</span>
          <div style={{ flex: '1' }}>
            <div style={{ 'font-weight': '600' }}>
              {isAirPromoActive() ? '¡PROMOCIÓN APLICADA!' : 'Promoción Disponible'}
            </div>
            <div style={{ 'font-size': '0.7rem', opacity: '0.9' }}>
              +{airPromotion.threshold} lbs = {airPromotion.freeLbs} lbs GRATIS
            </div>
          </div>
          <Show when={isAirPromoActive()}>
            <span style={{ 'font-weight': 'bold' }}>-{airPromotion.freeLbs} lbs</span>
          </Show>
        </div>

        {/* Air Rates Table */}
        <div style={styles.sectionTitle}>Tarifas Aéreo (por libra)</div>
        <table style={styles.ratesTable}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Rango</th>
              <th style={styles.tableHeader}>Precio/lb</th>
            </tr>
          </thead>
          <tbody>
            <For each={YABA_AIR_SHIPPING.tiers}>
              {(tier) => {
                const isCurrentTier = () => getCurrentAirTier()?.rangeLabel === tier.rangeLabel;
                return (
                  <tr>
                    <td style={styles.tableCell(isCurrentTier())}>
                      {tier.rangeLabel}
                      <Show when={isCurrentTier()}>
                        <span style={{ 'margin-left': '0.5rem', color: 'var(--primary-color, #3b82f6)' }}>◀</span>
                      </Show>
                    </td>
                    <td style={styles.tableCell(isCurrentTier())}>
                      ${tier.pricePerLb.toFixed(2)}
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </Show>

      {/* Maritime Shipping Section */}
      <Show when={shippingMethod() === 'maritimo'}>
        {/* Departure Type Toggle */}
        <div style={styles.sectionTitle}>Tipo de Salida</div>
        <div style={styles.subToggleContainer}>
          <button
            type="button"
            style={styles.subToggleButton(departureType() === 'weekly')}
            onClick={() => handleDepartureChange('weekly')}
          >
            Semanal
          </button>
          <button
            type="button"
            style={styles.subToggleButton(departureType() === 'monthly')}
            onClick={() => handleDepartureChange('monthly')}
          >
            Mensual
          </button>
        </div>

        {/* Item Type Toggle */}
        <div style={styles.sectionTitle}>Tipo de Carga</div>
        <div style={styles.subToggleContainer}>
          <button
            type="button"
            style={styles.subToggleButton(itemType() === 'miscellaneous')}
            onClick={() => handleItemTypeChange('miscellaneous')}
          >
            Miscelánea
          </button>
          <button
            type="button"
            style={styles.subToggleButton(itemType() === 'durable')}
            onClick={() => handleItemTypeChange('durable')}
          >
            Duradero
          </button>
        </div>

        {/* Maritime Promotion Banner (Weekly only) */}
        <Show when={departureType() === 'weekly'}>
          <div style={styles.promotionBanner(isMaritimePromoActive())}>
            <span>{isMaritimePromoActive() ? '🎉' : '🎁'}</span>
            <div style={{ flex: '1' }}>
              <div style={{ 'font-weight': '600' }}>
                {isMaritimePromoActive() ? '¡PROMOCIÓN APLICADA!' : 'Promoción Semanal'}
              </div>
              <div style={{ 'font-size': '0.7rem', opacity: '0.9' }}>
                +{YABA_MARITIME_SHIPPING.weekly.promoThreshold} lbs = {YABA_MARITIME_SHIPPING.weekly.freePromoLbs} lbs GRATIS
              </div>
            </div>
            <Show when={isMaritimePromoActive()}>
              <span style={{ 'font-weight': 'bold' }}>-{YABA_MARITIME_SHIPPING.weekly.freePromoLbs} lbs</span>
            </Show>
          </div>
        </Show>

        {/* Maritime Rates Table */}
        <div style={styles.sectionTitle}>Tarifas Marítimo (por libra)</div>
        <table style={styles.ratesTable}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Salida</th>
              <th style={styles.tableHeader}>Miscelánea</th>
              <th style={styles.tableHeader}>Duradero</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tableCell(departureType() === 'weekly')}>
                Semanal
                <Show when={departureType() === 'weekly'}>
                  <span style={{ 'margin-left': '0.5rem', color: 'var(--primary-color, #3b82f6)' }}>◀</span>
                </Show>
              </td>
              <td style={styles.tableCell(departureType() === 'weekly' && itemType() === 'miscellaneous')}>
                ${YABA_MARITIME_SHIPPING.weekly.miscellaneous.toFixed(2)}
              </td>
              <td style={styles.tableCell(departureType() === 'weekly' && itemType() === 'durable')}>
                ${YABA_MARITIME_SHIPPING.weekly.durable.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={styles.tableCell(departureType() === 'monthly')}>
                Mensual
                <Show when={departureType() === 'monthly'}>
                  <span style={{ 'margin-left': '0.5rem', color: 'var(--primary-color, #3b82f6)' }}>◀</span>
                </Show>
              </td>
              <td style={styles.tableCell(departureType() === 'monthly' && itemType() === 'miscellaneous')}>
                ${YABA_MARITIME_SHIPPING.monthly.miscellaneous.toFixed(2)}
              </td>
              <td style={styles.tableCell(departureType() === 'monthly' && itemType() === 'durable')}>
                ${YABA_MARITIME_SHIPPING.monthly.durable.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </Show>

      {/* No Method Selected Message */}
      <Show when={!shippingMethod()}>
        <div style={styles.noMethodSelected}>
          Seleccione un tipo de envío para ver el cálculo
        </div>
      </Show>

      {/* Cost Breakdown */}
      <Show when={shippingCalculation()}>
        {(calc) => (
          <div style={styles.breakdownContainer}>
            <div style={{ ...styles.sectionTitle, 'margin-top': '0' }}>Desglose de Costo</div>

            <div style={styles.breakdownRow}>
              <span>Peso Total:</span>
              <span>{weight().toFixed(2)} lbs</span>
            </div>

            <div style={styles.breakdownRow}>
              <span>Precio por Libra:</span>
              <span>${calc().pricePerLb.toFixed(2)}</span>
            </div>

            <Show when={calc().tierUsed}>
              <div style={styles.breakdownRow}>
                <span>Tarifa Aplicada:</span>
                <span>{calc().tierUsed}</span>
              </div>
            </Show>

            <div style={styles.breakdownRow}>
              <span>Subtotal:</span>
              <span>${calc().subtotal.toFixed(2)}</span>
            </div>

            <Show when={calc().promotionApplied && calc().freeLbs > 0}>
              <div style={styles.discountRow}>
                <span>🎉 Libras Gratis ({calc().freeLbs} lbs):</span>
                <span>-${(calc().freeLbs * calc().pricePerLb).toFixed(2)}</span>
              </div>
              <div style={styles.breakdownRow}>
                <span>Peso Facturable:</span>
                <span>{calc().billableWeight.toFixed(2)} lbs</span>
              </div>
            </Show>

            <div style={styles.breakdownRowLast}>
              <span>Total Envío:</span>
              <span style={styles.totalAmount}>${calc().total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default ShippingCalculator;
export { ShippingCalculator, ShippingBreakdown, ShippingCalculatorProps };
