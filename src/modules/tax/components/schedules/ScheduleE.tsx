import { Component, For, Show } from 'solid-js';
import { RentalProperty, PartnershipIncome, EstateIncome } from '../../types/taxTypes';

interface ScheduleEProps {
  rentalProperties: RentalProperty[];
  partnershipIncomes: PartnershipIncome[];
  estateIncomes: EstateIncome[];
}

const ScheduleE: Component<ScheduleEProps> = (props) => {
  // Part I - Income or Loss from Rental Real Estate and Royalties
  const calculatePropertyIncome = (property: RentalProperty) => {
    const totalIncome = property.rentsReceived + property.royaltiesReceived;

    const totalExpenses =
      property.advertising +
      property.auto +
      property.cleaning +
      property.commissions +
      property.insurance +
      property.legal +
      property.management +
      property.mortgageInterest +
      property.otherInterest +
      property.repairs +
      property.supplies +
      property.taxes +
      property.utilities +
      property.depreciation +
      property.otherExpenses;

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses
    };
  };

  const part1TotalIncome = props.rentalProperties.reduce((sum, prop) =>
    sum + calculatePropertyIncome(prop).totalIncome, 0);

  const part1TotalExpenses = props.rentalProperties.reduce((sum, prop) =>
    sum + calculatePropertyIncome(prop).totalExpenses, 0);

  const part1NetIncome = part1TotalIncome - part1TotalExpenses;

  // Part II - Income or Loss From Partnerships and S Corporations
  const part2PassiveIncome = props.partnershipIncomes.reduce((sum, p) =>
    sum + (p.isPassive ? p.ordinaryIncome : 0), 0);
  const part2NonpassiveIncome = props.partnershipIncomes.reduce((sum, p) =>
    sum + (!p.isPassive ? p.ordinaryIncome : 0), 0);
  const part2TotalIncome = part2PassiveIncome + part2NonpassiveIncome;

  // Part III - Income or Loss From Estates and Trusts
  const part3PassiveIncome = props.estateIncomes.reduce((sum, e) =>
    sum + (e.isPassive ? e.ordinaryIncome : 0), 0);
  const part3NonpassiveIncome = props.estateIncomes.reduce((sum, e) =>
    sum + (!e.isPassive ? e.ordinaryIncome : 0), 0);
  const part3TotalIncome = part3PassiveIncome + part3NonpassiveIncome;

  // Total supplemental income
  const totalSupplementalIncome = part1NetIncome + part2TotalIncome + part3TotalIncome;

  const lineStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const labelStyle = {
    flex: '1',
    'font-weight': '500'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--primary-color)',
    'min-width': '120px',
    'text-align': 'right'
  };

  const formulaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'font-style': 'italic',
    'margin-left': '1rem'
  };

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      'border-radius': 'var(--border-radius-sm)',
      'margin-bottom': '1.5rem',
      border: '2px solid #a855f7'
    }}>
      <h3 style={{
        'margin-top': '0',
        'margin-bottom': '1rem',
        color: '#9333ea',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        🏠 SCHEDULE E - Supplemental Income and Loss
      </h3>

      <div style={{
        background: '#faf5ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #a855f7'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
          ¿Qué es el Schedule E?
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>• Reporta ingresos suplementarios de inversiones pasivas y actividades de alquiler</div>
          <div>• <strong>Parte I:</strong> Ingresos/pérdidas de bienes raíces de alquiler y regalías</div>
          <div>• <strong>Parte II:</strong> Ingresos/pérdidas de sociedades (partnerships) y S corporations</div>
          <div>• <strong>Parte III:</strong> Ingresos/pérdidas de patrimonios (estates) y fideicomisos (trusts)</div>
          <div>• <strong>Parte IV:</strong> Ingresos de REMICs (Real Estate Mortgage Investment Conduits)</div>
        </div>
      </div>

      {/* Part I - Rental Real Estate and Royalties */}
      {props.rentalProperties.length > 0 && (
        <div style={sectionStyle}>
          <h4 style={{ color: '#9333ea', 'margin-bottom': '1rem' }}>
            Parte I - Ingresos o Pérdidas de Bienes Raíces de Alquiler y Regalías
          </h4>

          <For each={props.rentalProperties}>
            {(property, index) => {
              const propertyCalc = calculatePropertyIncome(property);

              return (
                <div style={{
                  background: '#faf5ff',
                  padding: '1rem',
                  'border-radius': '0.5rem',
                  'margin-bottom': '1rem',
                  border: '1px solid #a855f7'
                }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '1rem', color: '#9333ea' }}>
                    Propiedad {index() + 1}: {property.address}
                  </div>

                  <div style={{ 'font-size': '0.875rem', 'margin-bottom': '1rem' }}>
                    <div>Tipo: {property.type}</div>
                    <div>Días de Alquiler Justo: {property.fairRentalDays}</div>
                    <div>Días de Uso Personal: {property.daysPersonalUse}</div>
                    <div>Días Rentados: {property.daysRented}</div>
                  </div>

                  {/* Income Section */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>Ingresos</div>
                    <div style={lineStyle}>
                      <div style={labelStyle}>
                        <strong>Línea 3:</strong> Rentas Recibidas
                      </div>
                      <div style={valueStyle}>${property.rentsReceived.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}>
                        <strong>Línea 4:</strong> Regalías Recibidas
                      </div>
                      <div style={valueStyle}>${property.royaltiesReceived.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>Gastos</div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 5:</strong> Publicidad</div>
                      <div style={valueStyle}>${property.advertising.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 6:</strong> Auto y Viajes</div>
                      <div style={valueStyle}>${property.auto.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 7:</strong> Limpieza y Mantenimiento</div>
                      <div style={valueStyle}>${property.cleaning.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 8:</strong> Comisiones</div>
                      <div style={valueStyle}>${property.commissions.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 9:</strong> Seguro</div>
                      <div style={valueStyle}>${property.insurance.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 10:</strong> Servicios Legales y Profesionales</div>
                      <div style={valueStyle}>${property.legal.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 11:</strong> Honorarios de Administración</div>
                      <div style={valueStyle}>${property.management.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 12:</strong> Interés Hipotecario</div>
                      <div style={valueStyle}>${property.mortgageInterest.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 13:</strong> Otro Interés</div>
                      <div style={valueStyle}>${property.otherInterest.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 14:</strong> Reparaciones</div>
                      <div style={valueStyle}>${property.repairs.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 15:</strong> Suministros</div>
                      <div style={valueStyle}>${property.supplies.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 16:</strong> Impuestos</div>
                      <div style={valueStyle}>${property.taxes.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 17:</strong> Servicios Públicos</div>
                      <div style={valueStyle}>${property.utilities.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 18:</strong> Depreciación</div>
                      <div style={valueStyle}>${property.depreciation.toLocaleString()}</div>
                    </div>
                    <div style={lineStyle}>
                      <div style={labelStyle}><strong>Línea 19:</strong> Otros Gastos</div>
                      <div style={valueStyle}>${property.otherExpenses.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div style={{
                    background: '#fef3c7',
                    padding: '0.75rem',
                    'border-radius': '0.5rem',
                    'margin-bottom': '0.5rem'
                  }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                      <div style={{ 'font-weight': '600' }}><strong>Línea 20:</strong> Total de Gastos</div>
                      <div style={{ 'font-weight': '600', color: '#d97706' }}>
                        ${propertyCalc.totalExpenses.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: propertyCalc.netIncome >= 0 ? '#f0fdf4' : '#fef2f2',
                    padding: '0.75rem',
                    'border-radius': '0.5rem',
                    border: `1px solid ${propertyCalc.netIncome >= 0 ? '#10b981' : '#ef4444'}`
                  }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <div style={{ 'font-weight': '700' }}>
                        <strong>Línea 21:</strong> Ingreso/Pérdida Neta
                        <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)' }}>
                          Ingresos (${propertyCalc.totalIncome.toLocaleString()}) - Gastos (${propertyCalc.totalExpenses.toLocaleString()})
                        </div>
                      </div>
                      <div style={{
                        'font-weight': '700',
                        'font-size': '1.1rem',
                        color: propertyCalc.netIncome >= 0 ? '#059669' : '#dc2626'
                      }}>
                        {propertyCalc.netIncome >= 0 ? '$' : '($'}{Math.abs(propertyCalc.netIncome).toLocaleString()}{propertyCalc.netIncome < 0 ? ')' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>

          {/* Part I Summary */}
          <div style={{
            background: '#9333ea',
            color: 'white',
            padding: '1rem',
            'border-radius': '0.5rem',
            'margin-top': '1rem'
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '600' }}>Total de Ingresos (Todas las Propiedades)</div>
              <div style={{ 'font-weight': '600' }}>${part1TotalIncome.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '600' }}>Total de Gastos (Todas las Propiedades)</div>
              <div style={{ 'font-weight': '600' }}>${part1TotalExpenses.toLocaleString()}</div>
            </div>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'padding-top': '0.5rem',
              'border-top': '2px solid rgba(255,255,255,0.3)',
              'margin-top': '0.5rem'
            }}>
              <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
                <strong>Línea 26:</strong> Ingreso/Pérdida Neta Total - Parte I
              </div>
              <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
                {part1NetIncome >= 0 ? '$' : '($'}{Math.abs(part1NetIncome).toLocaleString()}{part1NetIncome < 0 ? ')' : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Part II - Partnerships and S Corporations */}
      {props.partnershipIncomes.length > 0 && (
        <div style={sectionStyle}>
          <h4 style={{ color: '#9333ea', 'margin-bottom': '1rem' }}>
            Parte II - Ingresos o Pérdidas de Sociedades y S Corporations
          </h4>

          <For each={props.partnershipIncomes}>
            {(partnership, index) => (
              <div style={{
                background: '#faf5ff',
                padding: '1rem',
                'border-radius': '0.5rem',
                'margin-bottom': '1rem',
                border: '1px solid #a855f7'
              }}>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#9333ea' }}>
                  {partnership.name}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
                  EIN: {partnership.ein}
                </div>

                <div style={lineStyle}>
                  <div style={labelStyle}><strong>Línea 28:</strong> Ingreso Ordinario (K-1 Box 1)</div>
                  <div style={valueStyle}>${partnership.ordinaryIncome.toLocaleString()}</div>
                </div>
                <div style={lineStyle}>
                  <div style={labelStyle}>Tipo de Actividad</div>
                  <div style={valueStyle}>{partnership.isPassive ? 'Pasiva' : 'No Pasiva (Activa)'}</div>
                </div>
                <Show when={partnership.description}>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.5rem' }}>
                    {partnership.description}
                  </div>
                </Show>
              </div>
            )}
          </For>

          <div style={{
            background: '#9333ea',
            color: 'white',
            padding: '1rem',
            'border-radius': '0.5rem',
            'margin-top': '1rem'
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '600' }}>Ingreso Pasivo Total</div>
              <div style={{ 'font-weight': '600' }}>${part2PassiveIncome.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '600' }}>Ingreso No Pasivo Total</div>
              <div style={{ 'font-weight': '600' }}>${part2NonpassiveIncome.toLocaleString()}</div>
            </div>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'padding-top': '0.5rem',
              'border-top': '2px solid rgba(255,255,255,0.3)',
              'margin-top': '0.5rem'
            }}>
              <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
                <strong>Línea 29:</strong> Ingreso Neto Total - Parte II
              </div>
              <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
                {part2TotalIncome >= 0 ? '$' : '($'}{Math.abs(part2TotalIncome).toLocaleString()}{part2TotalIncome < 0 ? ')' : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Part III - Estates and Trusts */}
      {props.estateIncomes.length > 0 && (
        <div style={sectionStyle}>
          <h4 style={{ color: '#9333ea', 'margin-bottom': '1rem' }}>
            Parte III - Ingresos o Pérdidas de Patrimonios y Fideicomisos
          </h4>

          <For each={props.estateIncomes}>
            {(estate, index) => (
              <div style={{
                background: '#faf5ff',
                padding: '1rem',
                'border-radius': '0.5rem',
                'margin-bottom': '1rem',
                border: '1px solid #a855f7'
              }}>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#9333ea' }}>
                  {estate.name}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
                  EIN: {estate.ein}
                </div>

                <div style={lineStyle}>
                  <div style={labelStyle}><strong>Línea 32-37:</strong> Ingreso Ordinario (1041 K-1)</div>
                  <div style={valueStyle}>${estate.ordinaryIncome.toLocaleString()}</div>
                </div>
                <div style={lineStyle}>
                  <div style={labelStyle}>Tipo de Actividad</div>
                  <div style={valueStyle}>{estate.isPassive ? 'Pasiva' : 'No Pasiva (Activa)'}</div>
                </div>
                <Show when={estate.description}>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.5rem' }}>
                    {estate.description}
                  </div>
                </Show>
              </div>
            )}
          </For>

          <div style={{
            background: '#9333ea',
            color: 'white',
            padding: '1rem',
            'border-radius': '0.5rem',
            'margin-top': '1rem'
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '600' }}>Ingreso Pasivo Total</div>
              <div style={{ 'font-weight': '600' }}>${part3PassiveIncome.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '600' }}>Ingreso No Pasivo Total</div>
              <div style={{ 'font-weight': '600' }}>${part3NonpassiveIncome.toLocaleString()}</div>
            </div>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'padding-top': '0.5rem',
              'border-top': '2px solid rgba(255,255,255,0.3)',
              'margin-top': '0.5rem'
            }}>
              <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
                <strong>Línea 37:</strong> Ingreso Neto Total - Parte III
              </div>
              <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
                ${part3TotalIncome.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Total */}
      <div style={{
        background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
        color: 'white',
        padding: '1.5rem',
        'border-radius': 'var(--border-radius-sm)',
        'margin-top': '1.5rem'
      }}>
        <div style={{ 'font-weight': '700', 'font-size': '1.2rem', 'margin-bottom': '1rem' }}>
          Total de Ingresos Suplementarios (Schedule E)
        </div>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
          <div>Parte I - Bienes Raíces y Regalías:</div>
          <div style={{ 'font-weight': '600' }}>
            {part1NetIncome >= 0 ? '$' : '($'}{Math.abs(part1NetIncome).toLocaleString()}{part1NetIncome < 0 ? ')' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
          <div>Parte II - Sociedades y S Corps:</div>
          <div style={{ 'font-weight': '600' }}>
            {part2TotalIncome >= 0 ? '$' : '($'}{Math.abs(part2TotalIncome).toLocaleString()}{part2TotalIncome < 0 ? ')' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
          <div>Parte III - Patrimonios y Fideicomisos:</div>
          <div style={{ 'font-weight': '600' }}>${part3TotalIncome.toLocaleString()}</div>
        </div>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'padding-top': '1rem',
          'border-top': '3px solid rgba(255,255,255,0.3)',
          'margin-top': '1rem',
          'font-size': '1.3rem'
        }}>
          <div style={{ 'font-weight': '700' }}>
            <strong>Línea 41:</strong> Total del Schedule E
          </div>
          <div style={{ 'font-weight': '700' }}>
            {totalSupplementalIncome >= 0 ? '$' : '($'}{Math.abs(totalSupplementalIncome).toLocaleString()}{totalSupplementalIncome < 0 ? ')' : ''}
          </div>
        </div>
        <div style={{ 'font-size': '0.875rem', 'margin-top': '1rem', opacity: '0.9' }}>
          ⮕ Ingrese esta cantidad en Form 1040, línea 8 (como parte del ingreso total)
        </div>
      </div>

      {/* Summary Box */}
      <div style={{
        background: '#faf5ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1.5rem',
        border: '1px solid #a855f7'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#9333ea' }}>
          📋 Resumen del Schedule E
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Propiedades de Alquiler:</strong> {props.rentalProperties.length}
          </div>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Sociedades/S Corps:</strong> {props.partnershipIncomes.length}
          </div>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Patrimonios/Fideicomisos:</strong> {props.estateIncomes.length}
          </div>
          <div style={{
            'margin-top': '1rem',
            'padding-top': '0.5rem',
            'border-top': '2px solid #a855f7',
            'font-weight': '700',
            color: '#9333ea'
          }}>
            Total de Ingresos Suplementarios: {totalSupplementalIncome >= 0 ? '$' : '($'}{Math.abs(totalSupplementalIncome).toLocaleString()}{totalSupplementalIncome < 0 ? ')' : ''}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div style={{
        background: '#eff6ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1rem',
        border: '1px solid #3b82f6'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#3b82f6' }}>
          💡 Información Importante
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Ingresos Pasivos vs No Pasivos:</strong>
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • <strong>Pasivos:</strong> Ingresos de actividades en las que no participa materialmente (ej: alquileres, sociedades limitadas)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '1rem' }}>
            • <strong>No Pasivos:</strong> Ingresos de actividades en las que participa activamente
          </div>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Limitaciones de Pérdidas Pasivas:</strong>
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Las pérdidas pasivas generalmente solo pueden compensar ingresos pasivos
          </div>
          <div style={{ 'margin-left': '1rem' }}>
            • Excepción: Profesionales de bienes raíces y excepción de $25,000 para participantes activos en alquileres
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleE;
