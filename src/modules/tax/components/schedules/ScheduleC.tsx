import { Component } from 'solid-js';
import { TaxFormData } from '../../types/taxTypes';

interface ScheduleCProps {
  formData: TaxFormData;
}

const ScheduleC: Component<ScheduleCProps> = (props) => {
  // Calculate totals from business expenses
  const getTotalMileageExpense = () => {
    return props.formData.businessExpenses
      .filter(e => e.category === 'mileage')
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getTotalExpensesByCategory = (category: string) => {
    return props.formData.businessExpenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getOtherExpenses = () => {
    return props.formData.businessExpenses
      .filter(e => !['mileage', 'insurance', 'phone', 'depreciation', 'supplies', 'rent', 'utilities', 'advertising', 'professional_services'].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);
  };

  // Calculate gross income from 1099s
  const getGrossReceipts = () => {
    return props.formData.form1099s
      .filter(f => f.type === '1099-NEC' || f.type === '1099-MISC')
      .reduce((sum, f) => sum + f.amount, 0);
  };

  const grossReceipts = getGrossReceipts();
  const returnsAndAllowances = 0; // Line 2
  const line3 = grossReceipts - returnsAndAllowances;
  const costOfGoodsSold = 0; // Line 4 (not applicable for service business)
  const grossProfit = line3 - costOfGoodsSold; // Line 5
  const otherIncome = 0; // Line 6
  const grossIncome = grossProfit + otherIncome; // Line 7

  // Part II - Expenses
  const advertising = getTotalExpensesByCategory('advertising');
  const carAndTruck = getTotalMileageExpense();
  const commissionsAndFees = getTotalExpensesByCategory('professional_services');
  const contractLabor = 0;
  const depletion = 0;
  const depreciation = getTotalExpensesByCategory('depreciation');
  const employeeBenefits = 0;
  const insurance = getTotalExpensesByCategory('insurance');
  const interestMortgage = 0;
  const interestOther = 0;
  const legalAndProfessional = 0;
  const officeExpense = 0;
  const pensionPlans = 0;
  const rentVehicles = 0;
  const rentOther = getTotalExpensesByCategory('rent');
  const repairsAndMaintenance = 0;
  const supplies = getTotalExpensesByCategory('supplies');
  const taxesAndLicenses = 0;
  const travel = 0;
  const deductibleMeals = 0;
  const utilities = getTotalExpensesByCategory('utilities');
  const wages = 0;
  const otherExpenses = getOtherExpenses();

  const totalExpenses = advertising + carAndTruck + commissionsAndFees + contractLabor +
    depletion + depreciation + employeeBenefits + insurance + interestMortgage + interestOther +
    legalAndProfessional + officeExpense + pensionPlans + rentVehicles + rentOther +
    repairsAndMaintenance + supplies + taxesAndLicenses + travel + deductibleMeals +
    utilities + wages + otherExpenses;

  const tentativeProfit = grossIncome - totalExpenses; // Line 29
  const expensesForHomeUse = 0; // Line 30
  const netProfit = tentativeProfit - expensesForHomeUse; // Line 31

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
      border: '2px solid #10b981'
    }}>
      <h3 style={{
        'margin-top': '0',
        'margin-bottom': '1rem',
        color: '#059669',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        📊 SCHEDULE C - Profit or Loss From Business (Sole Proprietorship)
      </h3>

      <div style={{
        background: '#f0fdf4',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #10b981'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>Información del Negocio</div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>Nombre del Propietario: {props.formData.customerInfo.firstName} {props.formData.customerInfo.lastName}</div>
          <div>Principal Negocio: Delivery Driver (Conductor de Entregas)</div>
          <div>Método Contable: Efectivo (Cash)</div>
        </div>
      </div>

      {/* Part I - Income */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#059669', 'margin-bottom': '1rem' }}>Parte I - Ingresos (Income)</h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 1:</strong> Ingresos Brutos o Ventas
            <span style={formulaStyle}>
              Suma de todos los Form 1099-NEC y 1099-MISC
            </span>
          </div>
          <div style={valueStyle}>${grossReceipts.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 2:</strong> Devoluciones y Descuentos
          </div>
          <div style={valueStyle}>${returnsAndAllowances.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 3:</strong> Ingresos Netos
            <span style={formulaStyle}>Línea 1 - Línea 2 = ${grossReceipts.toLocaleString()} - $0</span>
          </div>
          <div style={valueStyle}>${line3.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 4:</strong> Costo de Mercancías Vendidas
            <span style={formulaStyle}>No aplica para negocio de servicios</span>
          </div>
          <div style={valueStyle}>${costOfGoodsSold.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 5:</strong> Ganancia Bruta
            <span style={formulaStyle}>Línea 3 - Línea 4 = ${line3.toLocaleString()} - $0</span>
          </div>
          <div style={valueStyle}>${grossProfit.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 6:</strong> Otros Ingresos
          </div>
          <div style={valueStyle}>${otherIncome.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#f0fdf4',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none'
        }}>
          <div style={labelStyle}>
            <strong>Línea 7:</strong> Ingreso Bruto Total
            <span style={formulaStyle}>Línea 5 + Línea 6 = ${grossProfit.toLocaleString()} + $0</span>
          </div>
          <div style={{ ...valueStyle, color: '#059669' }}>${grossIncome.toLocaleString()}</div>
        </div>
      </div>

      {/* Part II - Expenses */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#059669', 'margin-bottom': '1rem' }}>Parte II - Gastos (Expenses)</h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 8:</strong> Publicidad
          </div>
          <div style={valueStyle}>${advertising.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 9:</strong> Gastos de Auto y Camión
            <span style={formulaStyle}>
              Millas de negocio × $0.67/milla (2024 IRS rate)
            </span>
          </div>
          <div style={valueStyle}>${carAndTruck.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 10:</strong> Comisiones y Honorarios
          </div>
          <div style={valueStyle}>${commissionsAndFees.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 11:</strong> Trabajo Contratado
          </div>
          <div style={valueStyle}>${contractLabor.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 12:</strong> Agotamiento
          </div>
          <div style={valueStyle}>${depletion.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 13:</strong> Depreciación y Deducción Sección 179
          </div>
          <div style={valueStyle}>${depreciation.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 14:</strong> Beneficios para Empleados
          </div>
          <div style={valueStyle}>${employeeBenefits.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 15:</strong> Seguro (excepto salud)
          </div>
          <div style={valueStyle}>${insurance.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 16a:</strong> Interés Hipotecario
          </div>
          <div style={valueStyle}>${interestMortgage.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 16b:</strong> Otro Interés
          </div>
          <div style={valueStyle}>${interestOther.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 17:</strong> Servicios Legales y Profesionales
          </div>
          <div style={valueStyle}>${legalAndProfessional.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 18:</strong> Gastos de Oficina
          </div>
          <div style={valueStyle}>${officeExpense.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 19:</strong> Planes de Pensión y Participación en Ganancias
          </div>
          <div style={valueStyle}>${pensionPlans.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 20a:</strong> Alquiler - Vehículos, Maquinaria y Equipo
          </div>
          <div style={valueStyle}>${rentVehicles.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 20b:</strong> Alquiler - Otra Propiedad Comercial
          </div>
          <div style={valueStyle}>${rentOther.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 21:</strong> Reparaciones y Mantenimiento
          </div>
          <div style={valueStyle}>${repairsAndMaintenance.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 22:</strong> Suministros
          </div>
          <div style={valueStyle}>${supplies.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 23:</strong> Impuestos y Licencias
          </div>
          <div style={valueStyle}>${taxesAndLicenses.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 24a:</strong> Viajes
          </div>
          <div style={valueStyle}>${travel.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 24b:</strong> Comidas Deducibles
          </div>
          <div style={valueStyle}>${deductibleMeals.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 25:</strong> Servicios Públicos
          </div>
          <div style={valueStyle}>${utilities.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 26:</strong> Salarios (menos créditos de empleo)
          </div>
          <div style={valueStyle}>${wages.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 27a:</strong> Otros Gastos
            <span style={formulaStyle}>Ver Parte V para detalles</span>
          </div>
          <div style={valueStyle}>${otherExpenses.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#fef3c7',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none',
          'margin-top': '1rem'
        }}>
          <div style={labelStyle}>
            <strong>Línea 28:</strong> Gastos Totales
            <span style={formulaStyle}>
              Suma de Líneas 8-27a
            </span>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${totalExpenses.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#f0fdf4',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none',
          'margin-top': '0.5rem'
        }}>
          <div style={labelStyle}>
            <strong>Línea 29:</strong> Ganancia o (Pérdida) Tentativa
            <span style={formulaStyle}>
              Línea 7 - Línea 28 = ${grossIncome.toLocaleString()} - ${totalExpenses.toLocaleString()}
            </span>
          </div>
          <div style={{ ...valueStyle, color: '#059669' }}>${tentativeProfit.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 30:</strong> Gastos por Uso del Hogar para Negocios
          </div>
          <div style={valueStyle}>${expensesForHomeUse.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#059669',
          color: 'white',
          padding: '1rem',
          'border-radius': '0.5rem',
          'font-weight': '700',
          'font-size': '1.1rem',
          'border-bottom': 'none',
          'margin-top': '1rem'
        }}>
          <div style={{ flex: '1' }}>
            <strong>Línea 31:</strong> Ganancia o (Pérdida) Neta
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Línea 29 - Línea 30 = ${tentativeProfit.toLocaleString()} - $0
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Schedule 1 (Form 1040), línea 3
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Schedule SE, línea 2 (para calcular impuesto de trabajo por cuenta propia)
            </div>
          </div>
          <div style={{ 'min-width': '120px', 'text-align': 'right', 'font-size': '1.25rem' }}>
            ${netProfit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Part V - Other Expenses */}
      {otherExpenses > 0 && (
        <div style={sectionStyle}>
          <h4 style={{ color: '#059669', 'margin-bottom': '1rem' }}>Parte V - Otros Gastos (Other Expenses)</h4>
          {props.formData.businessExpenses
            .filter(e => e.category === 'other')
            .map(expense => (
              <div style={lineStyle}>
                <div style={labelStyle}>{expense.description}</div>
                <div style={valueStyle}>${expense.amount.toLocaleString()}</div>
              </div>
            ))}
          <div style={{
            ...lineStyle,
            background: '#f0fdf4',
            padding: '0.75rem',
            'border-radius': '0.5rem',
            'font-weight': '600',
            'border-bottom': 'none',
            'margin-top': '0.5rem'
          }}>
            <div style={labelStyle}>
              <strong>Línea 48:</strong> Total de Otros Gastos
            </div>
            <div style={{ ...valueStyle, color: '#059669' }}>${otherExpenses.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Summary Box */}
      <div style={{
        background: '#f0fdf4',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1.5rem',
        border: '1px solid #10b981'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#059669' }}>
          📋 Resumen del Schedule C
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Ingresos Brutos Totales:</span>
            <strong>${grossIncome.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Gastos Totales:</span>
            <strong>${totalExpenses.toLocaleString()}</strong>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'border-top': '2px solid #10b981',
            'margin-top': '0.5rem',
            'font-weight': '700',
            color: '#059669'
          }}>
            <span>Ganancia Neta del Negocio:</span>
            <span>${netProfit.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleC;
