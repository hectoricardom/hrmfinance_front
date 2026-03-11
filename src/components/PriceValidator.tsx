import { Component, createSignal, Show, For } from 'solid-js';
import { shippingOffersService, type ShippingMethod, type ItemCategory, type PriceValidationResult } from '../services/shippingOffersService';

interface PriceValidatorProps {
  method?: ShippingMethod;
  category?: ItemCategory;
  weight?: number;
  currentPrice?: number;
  tvSize?: string;
  insuredValue?: number;
  onValidate?: (result: PriceValidationResult) => void;
  compact?: boolean; // Modo compacto para mostrar inline
}

export const PriceValidator: Component<PriceValidatorProps> = (props) => {
  const [method, setMethod] = createSignal<ShippingMethod>(props.method || 'maritime');
  const [category, setCategory] = createSignal<ItemCategory>(props.category || 'miscellaneous');
  const [weight, setWeight] = createSignal<number>(props.weight || 0);
  const [currentPrice, setCurrentPrice] = createSignal<number>(props.currentPrice || 0);
  const [tvSize, setTvSize] = createSignal<string>(props.tvSize || '32"');
  const [insuredValue, setInsuredValue] = createSignal<number>(props.insuredValue || 0);
  const [validationResult, setValidationResult] = createSignal<PriceValidationResult | null>(null);

  const handleValidate = () => {
    const result = shippingOffersService.validatePrice({
      method: method(),
      category: category(),
      weight: weight(),
      currentPrice: currentPrice(),
      tvSize: category() === 'tv' ? tvSize() : undefined,
      insuredValue: insuredValue() > 0 ? insuredValue() : undefined
    });

    setValidationResult(result);
    props.onValidate?.(result);
  };

  const getStatusColor = (result: PriceValidationResult): string => {
    if (result.isValid) return '#10b981'; // green
    if (Math.abs(result.differencePercent) > 20) return '#ef4444'; // red
    return '#f59e0b'; // orange
  };

  const getStatusIcon = (result: PriceValidationResult): string => {
    if (result.isValid) return '✅';
    if (result.difference > 0) return '⚠️'; // Cobrando más
    return '⬇️'; // Cobrando menos
  };

  // Compact mode - for inline display in forms
  if (props.compact) {
    return (
      <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin: 0.5rem 0;">
        <Show when={validationResult()}>
          {(result) => (
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style={`font-size: 2rem;`}>
                {getStatusIcon(result())}
              </div>
              <div style="flex: 1;">
                <div style={`font-weight: 600; color: ${getStatusColor(result())};`}>
                  {result().recommendation}
                </div>
                <div style="display: flex; gap: 1.5rem; margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                  <span><strong>Actual:</strong> ${result().currentPrice.toFixed(2)}</span>
                  <span><strong>Sugerido:</strong> ${result().suggestedPrice.toFixed(2)}</span>
                  <span><strong>Diferencia:</strong> ${Math.abs(result().difference).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>
    );
  }

  // Full mode - standalone validator
  return (
    <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 800px;">
      <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem 0; color: #111827;">
        🔍 Validador de Precios de Envío
      </h3>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        {/* Shipping Method */}
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
            Método de Envío
          </label>
          <select
            value={method()}
            onChange={(e) => setMethod(e.currentTarget.value as ShippingMethod)}
            style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;"
          >
            <option value="maritime">🚢 Marítimo</option>
            <option value="air">✈️ Aéreo</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
            Categoría
          </label>
          <select
            value={category()}
            onChange={(e) => setCategory(e.currentTarget.value as ItemCategory)}
            style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;"
          >
            <option value="miscellaneous">📦 Misceláneas</option>
            <option value="durable">🔧 Duraderos</option>
            <option value="tv">📺 Televisores</option>
          </select>
        </div>

        {/* Weight */}
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
            Peso (lbs)
          </label>
          <input
            type="number"
            value={weight()}
            onInput={(e) => setWeight(parseFloat(e.currentTarget.value) || 0)}
            step="0.1"
            min="0"
            style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;"
          />
        </div>

        {/* Current Price */}
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
            Precio Actual ($)
          </label>
          <input
            type="number"
            value={currentPrice()}
            onInput={(e) => setCurrentPrice(parseFloat(e.currentTarget.value) || 0)}
            step="0.01"
            min="0"
            style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;"
          />
        </div>

        {/* TV Size (conditional) */}
        <Show when={category() === 'tv'}>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              Tamaño TV
            </label>
            <select
              value={tvSize()}
              onChange={(e) => setTvSize(e.currentTarget.value)}
              style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;"
            >
              <For each={shippingOffersService.getTVPricing(method())}>
                {(pricing) => <option value={pricing.size}>{pricing.size}</option>}
              </For>
            </select>
          </div>

          {/* Insured Value (optional) */}
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
              Valor Asegurado ($)
            </label>
            <input
              type="number"
              value={insuredValue()}
              onInput={(e) => setInsuredValue(parseFloat(e.currentTarget.value) || 0)}
              step="0.01"
              min="0"
              placeholder="Opcional"
              style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;"
            />
          </div>
        </Show>
      </div>

      {/* Validate Button */}
      <button
        onClick={handleValidate}
        style="
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1.125rem;
          cursor: pointer;
          transition: transform 0.2s;
        "
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        🔍 Validar Precio
      </button>

      {/* Validation Result */}
      <Show when={validationResult()}>
        {(result) => (
          <div
            style={`
              margin-top: 1.5rem;
              padding: 1.5rem;
              background: ${result().isValid ? '#f0fdf4' : '#fef2f2'};
              border: 2px solid ${getStatusColor(result())};
              border-radius: 8px;
            `}
          >
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
              <div style="font-size: 3rem;">
                {getStatusIcon(result())}
              </div>
              <div style="flex: 1;">
                <h4 style={`font-size: 1.25rem; font-weight: 700; margin: 0; color: ${getStatusColor(result())};`}>
                  {result().recommendation}
                </h4>
              </div>
            </div>

            {/* Price Comparison */}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div style="background: white; padding: 1rem; border-radius: 8px;">
                <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
                  Precio Actual
                </div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">
                  ${result().currentPrice.toFixed(2)}
                </div>
              </div>

              <div style="background: white; padding: 1rem; border-radius: 8px;">
                <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
                  Precio Sugerido
                </div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">
                  ${result().suggestedPrice.toFixed(2)}
                </div>
              </div>

              <div style="background: white; padding: 1rem; border-radius: 8px;">
                <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
                  Diferencia
                </div>
                <div style={`font-size: 1.5rem; font-weight: 700; color: ${getStatusColor(result())};`}>
                  {result().difference > 0 ? '+' : ''}${result().difference.toFixed(2)}
                </div>
                <div style="color: #6b7280; font-size: 0.875rem;">
                  ({result().difference > 0 ? '+' : ''}{result().differencePercent.toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <Show when={result().breakdown}>
              <div style="background: white; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                <h5 style="font-weight: 600; margin: 0 0 0.75rem 0; color: #374151;">
                  📊 Desglose del Precio
                </h5>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem;">
                  <Show when={result().breakdown?.range}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Rango:</span>
                      <span style="font-weight: 600;">{result().breakdown!.range}</span>
                    </div>
                  </Show>

                  <Show when={result().breakdown?.pricePerLb}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Precio por libra:</span>
                      <span style="font-weight: 600;">${result().breakdown!.pricePerLb?.toFixed(2)}/lb</span>
                    </div>
                  </Show>

                  <Show when={result().breakdown?.freeWeight}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Libras gratis:</span>
                      <span style="font-weight: 600; color: #10b981;">{result().breakdown!.freeWeight} lbs</span>
                    </div>
                  </Show>

                  <Show when={result().breakdown?.effectiveWeight}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Peso efectivo cobrado:</span>
                      <span style="font-weight: 600;">{result().breakdown!.effectiveWeight} lbs</span>
                    </div>
                  </Show>

                  <Show when={result().breakdown?.basePrice}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Precio base:</span>
                      <span style="font-weight: 600;">${result().breakdown!.basePrice?.toFixed(2)}</span>
                    </div>
                  </Show>

                  <Show when={result().breakdown?.tax}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Impuesto:</span>
                      <span style="font-weight: 600;">${result().breakdown!.tax?.toFixed(2)}</span>
                    </div>
                  </Show>

                  <Show when={result().breakdown?.transport}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Transporte:</span>
                      <span style="font-weight: 600;">${result().breakdown!.transport?.toFixed(2)}</span>
                    </div>
                  </Show>

                  <Show when={result().breakdown?.insurance}>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Seguro (30%):</span>
                      <span style="font-weight: 600;">${result().breakdown!.insurance?.toFixed(2)}</span>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Applied Offer Info */}
            <Show when={result().appliedOffer}>
              <div style="margin-top: 1rem; padding: 0.75rem; background: #f3f4f6; border-radius: 6px; font-size: 0.875rem; color: #6b7280;">
                <strong>Oferta aplicada:</strong> {result().appliedOffer!.method === 'maritime' ? 'Marítimo' : 'Aéreo'} - {result().appliedOffer!.category}
                {result().appliedOffer!.range && ` (${result().appliedOffer!.range})`}
              </div>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
};

export default PriceValidator;
