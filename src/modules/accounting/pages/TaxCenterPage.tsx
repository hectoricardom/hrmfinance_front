/**
 * Tax Center Page
 * Tax summary, analysis, and export
 */

import { Component, createSignal, createResource, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button, Modal } from '../../ui';
import { accountingApi } from '../services/accountingApi';

const TaxCenterPage: Component = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = createSignal(currentYear);
  const [showExportWizard, setShowExportWizard] = createSignal(false);
  const [exportStep, setExportStep] = createSignal(1);
  const [isExporting, setIsExporting] = createSignal(false);

  // Fetch tax data
  const [taxSummary] = createResource(
    selectedYear,
    (year) => accountingApi.tax.getSummary(year)
  );

  const [taxAnalysis] = createResource(
    selectedYear,
    (year) => accountingApi.tax.getAnalysis(year)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const yearOptions = [
    { value: currentYear, label: String(currentYear) },
    { value: currentYear - 1, label: String(currentYear - 1) },
    { value: currentYear - 2, label: String(currentYear - 2) }
  ];

  const handleExportDrake = async () => {
    setIsExporting(true);
    try {
      const blob = await accountingApi.tax.downloadDrakeExport(selectedYear());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drake-import-${selectedYear()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportWizard(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('accounting.exportFailed', 'Error al exportar'));
    } finally {
      setIsExporting(false);
    }
  };

  const cardStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    padding: '1.5rem'
  };

  const statCardStyle = (color: string) => ({
    ...cardStyle,
    'border-left': `4px solid ${color}`
  });

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem'
      }}>
        <div>
          <h1 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '0.25rem' }}>
            {t('accounting.taxCenter', 'Centro de Impuestos')}
          </h1>
          <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            {t('accounting.taxCenterSubtitle', 'Resumen fiscal y exportación para software de impuestos')}
          </p>
        </div>
        <select
          value={selectedYear()}
          onChange={(e) => setSelectedYear(parseInt(e.currentTarget.value))}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '1rem',
            'font-weight': '600',
            background: 'var(--surface-color)'
          }}
        >
          <For each={yearOptions}>
            {(opt) => <option value={opt.value}>{opt.label}</option>}
          </For>
        </select>
      </div>

      {/* Loading */}
      <Show when={taxSummary.loading}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          {t('common.loading', 'Cargando...')}
        </div>
      </Show>

      <Show when={!taxSummary.loading && taxSummary()}>
        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          'margin-bottom': '2rem'
        }}>
          <div style={statCardStyle('#22c55e')}>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
              {t('accounting.grossIncome', 'Ingresos Brutos')}
            </div>
            <div style={{ 'font-size': '1.75rem', 'font-weight': '700', color: '#22c55e' }}>
              {formatCurrency(taxSummary()!.grossIncome)}
            </div>
          </div>

          <div style={statCardStyle('#6b7280')}>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
              {t('accounting.deductibleExpenses', 'Gastos Deducibles')}
            </div>
            <div style={{ 'font-size': '1.75rem', 'font-weight': '700' }}>
              {formatCurrency(taxSummary()!.totalExpenses)}
            </div>
          </div>

          <div style={statCardStyle(taxSummary()!.netProfit >= 0 ? '#22c55e' : '#dc2626')}>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
              {t('accounting.netProfit', 'Ganancia Neta')}
            </div>
            <div style={{
              'font-size': '1.75rem',
              'font-weight': '700',
              color: taxSummary()!.netProfit >= 0 ? '#22c55e' : '#dc2626'
            }}>
              {formatCurrency(taxSummary()!.netProfit)}
            </div>
          </div>
        </div>

        {/* Uncategorized Warning */}
        <Show when={taxSummary()!.uncategorizedTotal > 0}>
          <div style={{
            padding: '1rem',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            'border-radius': 'var(--border-radius-sm)',
            color: '#92400e',
            'margin-bottom': '1.5rem',
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem'
          }}>
            <span style={{ 'font-size': '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ 'font-weight': '600' }}>
                {t('accounting.uncategorizedExpenses', 'Gastos sin categoría fiscal')}
              </div>
              <div style={{ 'font-size': '0.875rem' }}>
                {formatCurrency(taxSummary()!.uncategorizedTotal)} {t('accounting.needsCategorization', 'necesitan ser categorizados para la declaración de impuestos')}
              </div>
            </div>
          </div>
        </Show>

        {/* Category Breakdown */}
        <div style={{ ...cardStyle, 'margin-bottom': '1.5rem' }}>
          <h2 style={{ 'font-size': '1.1rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
            {t('accounting.categoryBreakdown', 'Desglose por Categoría Fiscal')}
          </h2>

          <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
            <thead>
              <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600', color: 'var(--text-muted)' }}>
                  {t('accounting.category', 'Categoría')}
                </th>
                <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600', color: 'var(--text-muted)' }}>
                  {t('accounting.scheduleCLine', 'Línea Schedule C')}
                </th>
                <th style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '600', color: 'var(--text-muted)' }}>
                  {t('accounting.amount', 'Monto')}
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={taxSummary()!.formLines}>
                {(line) => (
                  <tr style={{ 'border-bottom': '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>{line.taxCategory}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.5rem',
                        background: 'var(--surface-secondary)',
                        'border-radius': '4px',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        'margin-right': '0.5rem'
                      }}>
                        {line.line}
                      </span>
                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                        {line.lineName}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '500' }}>
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        {/* AI Analysis */}
        <Show when={taxAnalysis() && !taxAnalysis.loading}>
          <div style={{ ...cardStyle, 'margin-bottom': '1.5rem' }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '1rem' }}>
              <span style={{ 'font-size': '1.5rem' }}>🤖</span>
              <h2 style={{ 'font-size': '1.1rem', 'font-weight': '600' }}>
                {t('accounting.aiTaxAnalysis', 'Análisis AI de Optimización Fiscal')}
              </h2>
            </div>

            <div style={{
              'white-space': 'pre-wrap',
              'line-height': '1.6',
              color: 'var(--text-primary)'
            }}>
              {taxAnalysis()!.analysis}
            </div>

            <div style={{
              'margin-top': '1rem',
              padding: '0.75rem',
              background: 'var(--surface-secondary)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.75rem',
              color: 'var(--text-muted)'
            }}>
              ⚠️ {t('accounting.aiDisclaimer', 'Este análisis es informativo. Consulte con un contador público certificado (CPA) para asesoría fiscal profesional.')}
            </div>
          </div>
        </Show>

        {/* Export Section */}
        <div style={cardStyle}>
          <h2 style={{ 'font-size': '1.1rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
            {t('accounting.exportForTaxSoftware', 'Exportar para Software de Impuestos')}
          </h2>

          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
            <Button variant="primary" onClick={() => setShowExportWizard(true)}>
              📥 {t('accounting.exportDrake', 'Exportar para Drake')}
            </Button>
            <Button variant="secondary" disabled>
              TurboTax ({t('accounting.comingSoon', 'próximamente')})
            </Button>
            <Button variant="secondary" disabled>
              ProSeries ({t('accounting.comingSoon', 'próximamente')})
            </Button>
            <Button variant="secondary" disabled>
              Lacerte ({t('accounting.comingSoon', 'próximamente')})
            </Button>
          </div>
        </div>
      </Show>

      {/* Export Wizard Modal */}
      <Modal
        isOpen={showExportWizard()}
        onClose={() => { setShowExportWizard(false); setExportStep(1); }}
        title={t('accounting.exportWizard', 'Asistente de Exportación')}
      >
        <div>
          {/* Progress Steps */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'margin-bottom': '2rem',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '10%',
              right: '10%',
              height: '2px',
              background: 'var(--border-color)',
              'z-index': 0
            }} />
            <For each={[1, 2, 3]}>
              {(step) => (
                <div style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  'align-items': 'center',
                  'z-index': 1
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    'border-radius': '50%',
                    background: exportStep() >= step ? 'var(--primary-color)' : 'var(--surface-secondary)',
                    color: exportStep() >= step ? 'white' : 'var(--text-muted)',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'font-weight': '600',
                    'font-size': '0.875rem'
                  }}>
                    {step}
                  </div>
                  <div style={{ 'font-size': '0.75rem', 'margin-top': '0.5rem', color: 'var(--text-muted)' }}>
                    {step === 1 && t('accounting.selectYear', 'Año')}
                    {step === 2 && t('accounting.review', 'Revisar')}
                    {step === 3 && t('accounting.download', 'Descargar')}
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Step Content */}
          <Show when={exportStep() === 1}>
            <div style={{ 'text-align': 'center', padding: '1rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>
                {t('accounting.selectTaxYear', 'Seleccionar Año Fiscal')}
              </h3>
              <select
                value={selectedYear()}
                onChange={(e) => setSelectedYear(parseInt(e.currentTarget.value))}
                style={{
                  padding: '0.75rem 1.5rem',
                  'font-size': '1.25rem',
                  border: '2px solid var(--primary-color)',
                  'border-radius': 'var(--border-radius-sm)'
                }}
              >
                <For each={yearOptions}>
                  {(opt) => <option value={opt.value}>{opt.label}</option>}
                </For>
              </select>
            </div>
          </Show>

          <Show when={exportStep() === 2}>
            <div style={{ padding: '1rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>
                {t('accounting.reviewData', 'Revisar Datos')}
              </h3>

              <Show when={taxSummary()}>
                <div style={{
                  background: 'var(--surface-secondary)',
                  'border-radius': 'var(--border-radius-sm)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                    <span>{t('accounting.grossIncome', 'Ingresos Brutos')}</span>
                    <span style={{ 'font-weight': '600' }}>{formatCurrency(taxSummary()!.grossIncome)}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                    <span>{t('accounting.totalExpenses', 'Total Gastos')}</span>
                    <span style={{ 'font-weight': '600' }}>{formatCurrency(taxSummary()!.totalExpenses)}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                    <span>{t('accounting.netProfit', 'Ganancia Neta')}</span>
                    <span style={{ 'font-weight': '600' }}>{formatCurrency(taxSummary()!.netProfit)}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>{t('accounting.taxCategories', 'Categorías Fiscales')}</span>
                    <span style={{ 'font-weight': '600' }}>{taxSummary()!.formLines.length}</span>
                  </div>
                </div>

                <Show when={taxSummary()!.uncategorizedTotal > 0}>
                  <div style={{
                    'margin-top': '1rem',
                    padding: '0.75rem',
                    background: '#fef3c7',
                    'border-radius': 'var(--border-radius-sm)',
                    color: '#92400e',
                    'font-size': '0.875rem'
                  }}>
                    ⚠️ {formatCurrency(taxSummary()!.uncategorizedTotal)} {t('accounting.uncategorized', 'sin categorizar')}
                  </div>
                </Show>
              </Show>
            </div>
          </Show>

          <Show when={exportStep() === 3}>
            <div style={{ 'text-align': 'center', padding: '1rem' }}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📥</div>
              <h3 style={{ 'margin-bottom': '0.5rem' }}>
                {t('accounting.readyToDownload', 'Listo para Descargar')}
              </h3>
              <p style={{ color: 'var(--text-muted)', 'margin-bottom': '1.5rem' }}>
                {t('accounting.drakeInstructions', 'El archivo CSV será compatible con Drake Tax Software. Importe el archivo usando la opción "Import Schedule C Data".')}
              </p>

              <Button
                variant="primary"
                onClick={handleExportDrake}
                disabled={isExporting()}
              >
                {isExporting()
                  ? t('accounting.exporting', 'Exportando...')
                  : t('accounting.downloadCSV', 'Descargar CSV')
                }
              </Button>
            </div>
          </Show>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'margin-top': '2rem',
            'padding-top': '1rem',
            'border-top': '1px solid var(--border-color)'
          }}>
            <Button
              variant="secondary"
              onClick={() => setExportStep(Math.max(1, exportStep() - 1))}
              disabled={exportStep() === 1}
            >
              {t('common.back', 'Atrás')}
            </Button>
            <Show when={exportStep() < 3}>
              <Button
                variant="primary"
                onClick={() => setExportStep(Math.min(3, exportStep() + 1))}
              >
                {t('common.next', 'Siguiente')}
              </Button>
            </Show>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaxCenterPage;
