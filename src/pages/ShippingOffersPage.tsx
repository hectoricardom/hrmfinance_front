import { Component, For, Show } from 'solid-js';
import { shippingOffersService, type ShippingMethod } from '../services/shippingOffersService';
import PriceValidator from '../components/PriceValidator';

const ShippingOffersPage: Component = () => {
  const maritimeOffers = shippingOffersService.getOffersByMethod('maritime');
  const airOffers = shippingOffersService.getOffersByMethod('air');

  const renderWeightRanges = (method: ShippingMethod, category: 'miscellaneous' | 'durable') => {
    const ranges = shippingOffersService.getWeightRanges(method, category);

    return (
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Rango (lbs)</th>
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Precio/lb</th>
              <Show when={category !== "durable"}>
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Libras Gratis</th>
              </Show>
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Descripción</th>
            </tr>
          </thead>
          <tbody>
            <For each={ranges}>
              {(range) => (
                <tr>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                    {range.min} - {range.max}
                  </td>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb; font-weight: 600;">
                    ${range.pricePerLb.toFixed(2)}
                  </td>
                  <Show when={range.freeWeight}>
                    <td style="padding: 0.75rem; border: 1px solid #e5e7eb; color: #10b981; font-weight: 600;">
                      {range.freeWeight || '-'}
                    </td>
                  </Show>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb; font-size: 0.875rem; color: #6b7280;">
                    {range.description}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    );
  };

  const renderTVPricing = (method: ShippingMethod) => {
    const tvPricing = shippingOffersService.getTVPricing(method);

    return (
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Tamaño</th>
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Precio/lb</th>
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Impuesto</th>
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Transporte</th>
              <th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb;">Seguro</th>
            </tr>
          </thead>
          <tbody>
            <For each={tvPricing}>
              {(pricing) => (
                <tr>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb; font-weight: 600;">
                    {pricing.size}
                  </td>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb; font-weight: 600;">
                    ${pricing.pricePerLb.toFixed(2)}
                  </td>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                    ${pricing.tax.toFixed(2)}
                  </td>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                    ${pricing.transport.toFixed(2)}
                  </td>
                  <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                    {(pricing.insuranceRate * 100).toFixed(0)}% del valor
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border-radius: 6px; font-size: 0.875rem;">
          <strong>⚠️ Nota:</strong> El seguro es opcional y se calcula como el 30% del valor que el cliente quiera asegurar.
        </div>
      </div>
    );
  };

  const renderDurableFixed = (method: ShippingMethod) => {
    const offer = shippingOffersService.getOffer(method, 'durable');

    if (!offer?.durable || !offer.durable.pricePerLb) return null;

    return (
      <div style="margin-top: 1rem; padding: 1.5rem; background: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
              Precio por libra
            </div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">
              ${offer.durable.pricePerLb.toFixed(2)}/lb
            </div>
          </div>
          <div>
            <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
              Transporte
            </div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">
              ${offer.durable.transport?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
        <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border-radius: 6px; font-size: 0.875rem;">
          <strong>📝 Fórmula:</strong> Total = (Peso × ${offer.durable.pricePerLb.toFixed(2)}) + ${offer.durable.transport?.toFixed(2) || '0.00'} transporte
        </div>
      </div>
    );
  };

  return (
    <div style="padding: 2rem; background: #f9fafb; min-height: 100vh;">
      <div style="max-width: 1400px; margin: 0 auto;">
        {/* Header */}
        <div style="text-align: center; margin-bottom: 3rem;">
          <h1 style="font-size: 2.5rem; font-weight: 700; margin: 0 0 0.5rem 0; color: #111827;">
            📊 Ofertas de Envío
          </h1>
          <p style="color: #6b7280; font-size: 1.125rem;">
            Referencia de precios para envíos marítimos y aéreos
          </p>
        </div>

        {/* Price Validator */}
        <div style="margin-bottom: 3rem;">
          <PriceValidator />
        </div>

        {/* Maritime Shipping */}
        <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem;">
          <h2 style="font-size: 2rem; font-weight: 700; margin: 0 0 1.5rem 0; color: #111827; display: flex; align-items: center; gap: 0.5rem;">
            🚢 Envío Marítimo
          </h2>

          {/* Miscellaneous Maritime */}
          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1rem 0; color: #374151;">
              📦 Misceláneas
            </h3>
            {renderWeightRanges('maritime', 'miscellaneous')}
          </div>

          {/* Durable Maritime */}
          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1rem 0; color: #374151;">
              🔧 Duraderos
            </h3>
            {renderWeightRanges('maritime', 'durable')}
           
          </div>

        </div>

        {/* Air Shipping */}
        <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="font-size: 2rem; font-weight: 700; margin: 0 0 1.5rem 0; color: #111827; display: flex; align-items: center; gap: 0.5rem;">
            ✈️ Envío Aéreo
          </h2>

          {/* Miscellaneous Air */}
          <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1rem 0; color: #374151;">
              📦 Misceláneas
            </h3>
            {renderWeightRanges('air', 'miscellaneous')}
          </div>

          {/* Durable Air */}
          <div>
            <h3 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1rem 0; color: #374151;">
              🔧 Duraderos
            </h3>
            {renderWeightRanges('air', 'durable')}
            <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border-radius: 6px; font-size: 0.875rem;">
              <strong>⚠️ Nota:</strong> El seguro es opcional y se calcula como el 30% del valor que el cliente quiera asegurar.
            </div>
          </div>
        </div>

         {/* TV Maritime */}
        <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 2rem;">
      
          <div>
            <h3 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1rem 0; color: #374151;">
              📺 Televisores
            </h3>
            {renderTVPricing('maritime')}
          </div>
        </div>

        {/* Info Boxes */}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
          <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 1.5rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">💡</div>
            <h4 style="font-weight: 600; margin: 0 0 0.5rem 0; color: #1e40af;">
              Libras Gratis
            </h4>
            <p style="color: #1e40af; font-size: 0.875rem; margin: 0;">
              Algunos rangos de peso incluyen libras gratis. El precio efectivo es menor al precio base porque se cobran menos libras.
            </p>
          </div>

          <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 1.5rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
            <h4 style="font-weight: 600; margin: 0 0 0.5rem 0; color: #065f46;">
              Validación de Precios
            </h4>
            <p style="color: #065f46; font-size: 0.875rem; margin: 0;">
              Usa el validador arriba para verificar que los precios en tus invoices coincidan con las ofertas actuales.
            </p>
          </div>

          <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 1.5rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
            <h4 style="font-weight: 600; margin: 0 0 0.5rem 0; color: #92400e;">
              Seguro Opcional
            </h4>
            <p style="color: #92400e; font-size: 0.875rem; margin: 0;">
              El seguro es opcional para televisores y duraderos (aéreos) y se calcula como 30% del valor asegurado.
            </p>
          </div>
        </div>

        {/* How to Use */}
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 2rem; margin-top: 2rem; color: white;">
          <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 1rem 0;">
            🎯 Cómo Usar Este Sistema
          </h3>
          <ol style="margin: 0; padding-left: 1.5rem; line-height: 1.8;">
            <li>Selecciona el método de envío (Marítimo o Aéreo)</li>
            <li>Elige la categoría del producto (Misceláneas, Duraderos, TV)</li>
            <li>Ingresa el peso y el precio actual del invoice</li>
            <li>El sistema te dirá si el precio es correcto o si necesitas ajustarlo</li>
            <li>Revisa el desglose detallado para entender cómo se calcula</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ShippingOffersPage;
