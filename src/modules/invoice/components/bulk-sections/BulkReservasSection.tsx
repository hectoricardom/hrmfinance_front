import { Component, For, Show } from 'solid-js';
import { InvoiceBulk, InvoiceReserva } from '../../types/invoiceTypes';
import ReservaTypeDropdown from '../ReservaTypeDropdown';
import { FormInput } from '../../../ui';
import Icon from '../../../../components/Icon';
import { shippingOffersService, type PriceValidationResult } from '../../../../services/shippingOffersService';
import { roundTo2Decimals } from '../../../../services/utils';

interface BulkReservasSectionProps {
  bulk: InvoiceBulk;
  reservas: InvoiceReserva[];
  showPricing: boolean;
  autoCalculation: boolean;
  validationResults: Map<string, PriceValidationResult>;
  shippingMethod: 'aereo' | 'maritimo' | 'express' | '';
  reservaRecomendation: any;
  onUpdateReserva: (index: number, updates: Partial<InvoiceReserva>) => void;
  handleRecomendationReserva: (index: number, updates: Partial<InvoiceReserva>) => void;
  onRemoveReserva: (index: number) => void;
  onBulkChange: () => void; // Trigger bulk update
  onApplySuggestedPrice: (index: number) => void;
  getBulkTotals: (bulkId: string) => void // Trigger bulk update
}




const BulkReservasSection: Component<BulkReservasSectionProps> = (props) => {
  
  const handleUpdateReserva = (index: number, updates: Partial<InvoiceReserva>) => {
   
    props.onUpdateReserva(index, updates);
    props.handleRecomendationReserva(index, updates);
    props.onBulkChange(); // Trigger bulk update
  };

  const handleRemoveReserva = (index: number, reserva: InvoiceReserva) => {
    const confirmed = confirm(`¿Eliminar reserva "${reserva.type || 'sin tipo'}"?\n\nEsta acción no se puede deshacer.`);
    if (confirmed) {
      props.onRemoveReserva(index);
      props.onBulkChange(); // Trigger bulk update
    }
  };

  const itemStyle = {
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1rem',
    'margin-bottom': '0.5rem',
    background: 'white'
  };

  const itemHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem'
  };

  const removeButtonStyle = {
    background: '#fff',
    color: 'red',
    border: 'none',
    'border-sradius': '50%',
    width: '1.8em',
    height: '1.8em',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    cursor: 'pointer',
    'font-size': '0.75rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem'
  };

  const inputGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.5rem'
  };

  const totals = props?.getBulkTotals(props?.bulk?.id)

  const readOnly = (reserva: any) => (props.autoCalculation && reserva.autoCalculate !== false) || reserva.category === "OFFERS_FREE"


 
  const parseOffer = (reserva: any) =>{
    
    let pricePerLb = props?.reservaRecomendation?.[reserva.category]?.breakdown?.pricePerLb || 0;
  
    let tariffPerLb = props?.reservaRecomendation?.[reserva.category]?.breakdown?.tariffPerLb || 0;
    let needBePay = props?.reservaRecomendation?.[reserva.category]?.breakdown?.needBePay || 0;
    let totalWeight = props?.reservaRecomendation?.[reserva.category]?.totalWeight || 0;
    let offergift =   props?.reservaRecomendation?.[reserva.category]?.breakdown?.offergift;
    let giftdiff =   totalWeight - needBePay;
   
    let needGiftReserva =  needBePay && totalWeight - needBePay >0 && roundTo2Decimals(totalWeight - needBePay, 1) !==roundTo2Decimals(offergift,1)

     
    let appliedOffer = `${props?.reservaRecomendation?.[reserva.category]?.appliedOffer!.method === 'maritime' ? 'Marítimo' : 'Aéreo'} - ${props?.reservaRecomendation?.[reserva.category]?.appliedOffer!.category} | ${props?.reservaRecomendation?.[reserva.category]?.breakdown?.range}`;

  

    return {
      needGiftReserva,
      appliedOffer,
      needBePay,
      totalWeight,
      offergift,
      giftdiff,
      tariffPerLb,
      pricePerLb
    }
  }





  return (
    <>
      <Show when={props.reservas.length > 0}>
        <h4 style={{ 
          'font-size': '1rem', 
          'font-weight': 'bold', 
          color: 'var(--primary-color)',
          'margin': '1.9rem 0 0.75rem 0 ',
          'border-bottom': '1px solid var(--border-color)',
          'padding-bottom': '0.5rem'
        }}>
          <Icon name="inventory" size="1em" style={{ "margin-right": "0.5rem" }} />
          Reservas ({props.reservas.length})  
          <Show when={(props?.bulk?.pricingMode === 'box_flat_rate' && props?.bulk?.boxSize) && props.reservas.length > 1}>
            <strong style={"color: var(--error-color);"}>{"Tarifa por Caja no debe contener mas de una reserva"}</strong>
          </Show>
        </h4>
      </Show>

      <For each={props.reservas}>
        {(reserva, reservaIndex) => (
          <div style={itemStyle}>
            <div style={itemHeaderStyle}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
                <span style={{ 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                  <Icon name="inventory" size="1em" style={{ "margin-right": "0.3rem" }} />
                  Reserva: {reserva.type || 'Sin tipo'}
                </span>
                <Show when={reserva.category}>
                  <span style={{ 
                    'font-size': '0.75rem', 
                    color: 'var(--text-muted)',
                    background: 'var(--strip-color)',
                    padding: '2px 6px',
                    'border-radius': '3px'
                  }}>
                    {reserva.category}
                  </span>
                </Show>
                <Show when={props.autoCalculation}>
                  <button
                    type="button"
                    style={{
                     
                      border: 'none',
                      'border-radius': 'var(--border-radius-sm)',
                      padding: '2px 8px',
                      'font-size': '0.7rem',
                      cursor: 'pointer',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.25rem'
                    }}
                    onClick={() => handleUpdateReserva(reservaIndex(), { 
                      autoCalculate: reserva.autoCalculate === false ? true : false 
                    })}
                    title={reserva.autoCalculate !== false ? 
                      'Auto-cálculo activo para esta reserva. Click para desactivar' : 
                      'Auto-cálculo inactivo para esta reserva. Click para activar'
                    }
                  >
                   
                    <span>{reserva.autoCalculate !== false ? '🤖 Auto' : '✋ Manual'}</span>
                  </button>
                </Show>
              </div>
              <button
                type="button"
                style={removeButtonStyle}
                onClick={() => handleRemoveReserva(reservaIndex(), reserva)}
                title="Eliminar reserva"
              >
                🗑️
              </button>
            </div>
            <div style={inputGroupStyle}>
              <Show when={props?.shippingMethod !== "express"}>
              <div>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                  Tipo de Reserva
                </label>
                <ReservaTypeDropdown

                  value={reserva.type}
                  onChange={(type) => handleUpdateReserva(reservaIndex(), { type })}
                  onWeightChange={(qty) => handleUpdateReserva(reservaIndex(), { qty })}
                  placeholder="Buscar tipo de reserva..."
                  showWeight={reserva.category === 'MISCELANEAS'}
                  weight={reserva.qty}
                  style={{ 'margin-bottom': '0' }}
                />
              </div>
              </Show>
              <div>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                  Categoría
                </label>

                <Show when={props?.shippingMethod === "express"}>
                  <select
                    style={inputStyle}
                    value={reserva.category}
                    onChange={(e) => {
                      handleUpdateReserva(reservaIndex(), { type: e.target.value });
                      handleUpdateReserva(reservaIndex(), { 
                        category: e.target.value
                      });
                    }}
                  >
                    <option value="Comida">Comida</option>
                    <option value="Medicina">Medicina</option>
                     <option value="Aseo">Aseo</option>
                  </select>
                </Show>
                <Show when={props?.shippingMethod !== "express"}>
                  <select
                    style={inputStyle}
                    value={reserva.category}
                    onChange={(e) => {
                      handleUpdateReserva(reservaIndex(), { 
                        category: (e.target as HTMLSelectElement).value as 'MISCELANEAS' | 'DURADEROS' | 'LITHIUM_BATTERIES'
                      });
                    }}
                  >

                    <option value="MISCELANEAS">Miscelaneas</option>
                    <option value="DURADEROS">Duraderos</option>
                    <option value="LITHIUM_BATTERIES">Baterías Litio</option>
                    <option value="EXCLUSIVE">Exclusivos</option>
                    <option value="DOCUMENTS">Documentos</option>
                    <option value="OFFERS_FREE">Regalo en Ofertas</option>
                  </select>
                </Show>
              </div>

            </div>


            <Show when={props?.bulk?.pricingMode !== 'box_flat_rate' && props?.reservaRecomendation?.[reserva.category]?.breakdown?.range}>
              <div style="margin: .65rem; padding: .25rem .5rem; background: rgb(240, 253, 244); border: 2px solid rgb(16, 185, 129); border-radius: 8px;">
                <div style="display:flex;align-items:center;gap:1rem;">
                  <Show when={parseOffer(reserva)?.pricePerLb}>
                    <div style="background: white; padding: 1rem; border-radius: 8px;">
                      <div style="color: #6b7280; font-size: 0.875rem;">
                        Precio Sugerido por Libra
                      </div>
                      <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;text-align: center;">
                        ${parseOffer(reserva)?.pricePerLb?.toFixed(2)}
                      </div>
                    </div>
                  </Show>
                  <Show when={reserva.category === "OFFERS_FREE"}>
                    <div style="background: white; padding: .21rem; border-radius: 8px;">
                      <div style="color: #6b7280; font-size: 1.875rem;">
                        🎉
                      </div>
                    </div>
                  </Show>
                  <Show when={parseOffer(reserva)?.tariffPerLb}>
                    <div style="background: white; padding: 1rem; border-radius: 8px;">
                      <div style="color: #6b7280; font-size: 0.875rem;">
                        Arancel Sugerido
                      </div>
                      <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;text-align: center;">
                        ${(parseOffer(reserva)?.totalWeight * parseOffer(reserva)?.tariffPerLb)?.toFixed()}
                      </div>
                    </div>
                  </Show>

                  <div style="margin:.61rem;padding:0.75rem;background:#f3f4f6;border-radius:6px;font-size:0.875rem;color:#6b7280;">
                    
                    <strong>Oferta aplicada:</strong>  {parseOffer(reserva)?.appliedOffer}
                    <Show when={parseOffer(reserva)?.needGiftReserva}>
                      <p style="margin: 0.1rem">
                        Debe crear o actualizar una reserva tipo Regalo de Ofertas para agregar las 
                      <strong>{parseOffer(reserva)?.giftdiff}</strong> libras de regalo 
                      </p>
                    </Show>
                  </div>
                </div>
              </div>
            </Show>
            

            {/* Box flat rate info */}
            <Show when={props?.bulk?.pricingMode === 'box_flat_rate' && props?.bulk?.boxSize}>
              <div style={{
                background: '#e7f5ff',
                border: '1px solid #3b82f6',
                'border-radius': 'var(--border-radius-sm)',
                padding: '0.75rem',
                'margin-top': '0.5rem',
                'font-size': '0.875rem'
              }}>
                {(() => {
                  const calculation = shippingOffersService.calculateSuggestedPrice({
                    method: 'maritime',
                    category: 'box_flat_rate',
                    weight:  totals?.totalQty || 0,
                    boxSize: props?.bulk.boxSize
                  });




                  if (!calculation) return null;

                  const boxInfo = calculation?.breakdown;
                  const isOverweight = boxInfo?.overweight > 0;

                  return (
                    <div>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#1e40af' }}>
                        📦 Información de la Caja
                      </div>
                      <div><strong>Caja:</strong> {boxInfo.boxSize}</div>
                      <div><strong>Precio base:</strong> ${boxInfo.boxPrice?.toFixed(2)}</div>
                      <div><strong>Capacidad:</strong> {boxInfo?.maxWeight} lbs</div>
                      
                      <Show when={boxInfo?.actualWeight}>
                        <div><strong>Peso actual:</strong> {boxInfo?.actualWeight?.toFixed(2)} lbs</div>
                     
                      </Show>
                       <Show when={isOverweight}>
                        <div style={{ color: '#dc2626', 'font-weight': '600', 'margin-top': '0.5rem' }}>
                          ⚠️ Sobrepeso: {boxInfo?.overweight?.toFixed(2)} lbs
                          <Show when={boxInfo?.overweightCharge > 0}>
                            <div>Cargo adicional: ${boxInfo.overweightCharge?.toFixed(2)}</div>
                          </Show>
                        </div>
                      </Show>
                      <Show when={!isOverweight}>
                        <div style={{ color: '#16a34a', 'margin-top': '0.5rem' }}>
                          ✓ Espacio disponible: {(boxInfo?.maxWeight - boxInfo?.actualWeight)?.toFixed(2)} lbs
                        </div>
                      </Show>
                    </div>
                  );
                })()}
              </div>
            </Show>

            <div style={inputGroupStyle}>    
              <div>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                  Cantidad
                </label>
                <FormInput
                  type="number"
                  style={inputStyle}
                  value={reserva.qty.toString()}
                  min="1"
                  onChange={(e) => handleUpdateReserva(reservaIndex(), { 
                    qty: Number(e) || 1 
                  })}
                />
              </div>

           
                <div>
                  <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                    Precio ($) 
                    <Show when={!(props?.bulk?.pricingMode === 'box_flat_rate' && props?.bulk?.boxSize) && props?.reservaRecomendation?.[reserva.category]?.breakdown?.pricePerLb !== reserva.price }>
                      <strong style={"color: var(--error-color);"}>{"el precio es incorrecto"}</strong>
                    </Show>
                  </label>
                  <FormInput
                    type="number"
                    style={{ 
                      ...inputStyle, 
                      background:(props?.bulk?.pricingMode === 'box_flat_rate' && props?.bulk?.boxSize) || readOnly(reserva) ? 'var(--strip-color)' : 'var(--surface-color)',
                      cursor:(props?.bulk?.pricingMode === 'box_flat_rate' && props?.bulk?.boxSize) || readOnly(reserva) ? 'not-allowed' : 'text'
                    }}
                    value={reserva.price.toString()}
                    step="0.01"
                    readOnly={ (props?.bulk?.pricingMode === 'box_flat_rate' && props?.bulk?.boxSize) || readOnly(reserva)}
                    onChange={(value) => {
                      if (!props.autoCalculation || reserva.autoCalculate === false) {
                        const price = Number(value) || 0;
                        handleUpdateReserva(reservaIndex(), { price });
                      }
                    }}
                    title={(props.autoCalculation && reserva.autoCalculate !== false) ? 
                      'Precio calculado automáticamente' : 
                      'Ingrese precio manualmente'
                    }
                  />
                </div>
                <Show when={props?.shippingMethod !== "express"}>
                <div>
                  <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                    Arancel ($) 
                    <Show when={props?.reservaRecomendation?.[reserva.category]?.breakdown?.tariffPerLb &&  ((props?.reservaRecomendation?.[reserva.category]?.totalWeight * props?.reservaRecomendation?.[reserva.category]?.breakdown?.tariffPerLb)?.toFixed() !== reserva.arancel.toFixed()) }>
                      <strong style={"color: var(--error-color);"}>{"el arancel necesita revision"}</strong>
                    </Show>
                  </label>
                  <FormInput
                    type="number"
                    style={{ 
                      ...inputStyle, 
                      background: readOnly(reserva)? 'var(--strip-color)' : 'var(--surface-color)',
                      cursor: readOnly(reserva) ? 'not-allowed' : 'text'
                    }}
                    value={reserva.arancel.toString()}
                    step="0.01"
                    readOnly={readOnly(reserva)}
                    onChange={(value) => {
                      if (!props.autoCalculation || reserva.autoCalculate === false) {
                        const arancel = Number(value) || 0;
                        handleUpdateReserva(reservaIndex(), { arancel });
                      }
                    }}
                    title={(props.autoCalculation && reserva.autoCalculate !== false) ? 
                      'Arancel calculado automáticamente' : 
                      'Ingrese arancel manualmente'
                    }
                  />
                </div>
              </Show>



             </div>

             {/* Price Validation Display */}
             <Show when={props.validationResults.get(reserva.id) && (reserva.category === 'MISCELANEAS' || reserva.category === 'DURADEROS')}>
               {() => {
                 const validation = props.validationResults.get(reserva.id);
                 if (!validation) return null;

                 const isValid = validation.isValid;
                 const bgColor = isValid
                   ? '#f0fdf4'
                   : Math.abs(validation.differencePercent) > 10 ? '#fef2f2' : '#fefce8';
                 const borderColor = isValid
                   ? '#10b981'
                   : Math.abs(validation.differencePercent) > 10 ? '#ef4444' : '#f59e0b';
                 const textColor = isValid
                   ? '#065f46'
                   : Math.abs(validation.differencePercent) > 10 ? '#991b1b' : '#92400e';

                 return (
                   <div style={{
                     'margin-top': '0.75rem',
                     padding: '0.75rem',
                     background: bgColor,
                     border: `1px solid ${borderColor}`,
                     'border-radius': 'var(--border-radius-sm)',
                     'font-size': '0.875rem'
                   }}>
                     <div style={{
                       display: 'flex',
                       'justify-content': 'space-between',
                       'align-items': 'flex-start',
                       'margin-bottom': '0.5rem'
                     }}>
                       <div style={{ flex: 1 }}>
                         <div style={{ 'font-weight': 'bold', color: textColor, 'margin-bottom': '0.25rem' }}>
                           {validation.recommendation}
                         </div>
                         <div style={{ color: textColor, 'font-size': '0.8rem' }}>
                           <Show when={!isValid}>
                             <div>Precio actual: <strong>${validation.currentPrice.toFixed(2)}</strong></div>
                             <div>Precio sugerido: <strong>${validation.suggestedPrice.toFixed(2)}</strong></div>
                             <div>Diferencia: <strong>${Math.abs(validation.difference).toFixed(2)}</strong> ({Math.abs(validation.differencePercent).toFixed(1)}%)</div>
                           </Show>
                           <Show when={validation.breakdown}>
                             <div style={{ 'margin-top': '0.5rem', 'padding-top': '0.5rem', 'border-top': `1px solid ${borderColor}` }}>
                               <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Desglose:</div>
                               <Show when={validation.breakdown?.pricePerLb}>
                                 <div>• Precio/lb: ${validation.breakdown!.pricePerLb!.toFixed(2)}</div>
                               </Show>
                               <Show when={validation.breakdown?.effectiveWeight}>
                                 <div>• Peso efectivo: {validation.breakdown!.effectiveWeight} lbs</div>
                               </Show>
                               <Show when={validation.breakdown?.freeWeight}>
                                 <div>• Libras gratis: {validation.breakdown!.freeWeight}</div>
                               </Show>
                               <Show when={validation.breakdown?.transport}>
                                 <div>• Transporte: ${validation.breakdown!.transport!.toFixed(2)}</div>
                               </Show>
                             </div>
                           </Show>
                         </div>
                       </div>
                       <Show when={!isValid}>
                         <button
                           type="button"
                           style={{
                             background: borderColor,
                             color: 'white',
                             border: 'none',
                             'border-radius': 'var(--border-radius-sm)',
                             padding: '0.5rem 0.75rem',
                             cursor: 'pointer',
                             'font-size': '0.75rem',
                             'font-weight': '600',
                             'white-space': 'nowrap',
                             'margin-left': '0.5rem'
                           }}
                           onClick={() => props.onApplySuggestedPrice(reservaIndex())}
                           title="Usar precio sugerido"
                         >
                           💡 Usar Sugerido
                         </button>
                       </Show>
                     </div>
                   </div>
                 );
               }}
             </Show>
          </div>
        )}
      </For>
    </>
  );
};

export default BulkReservasSection;






