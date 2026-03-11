import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { Card, Button, FormSelect } from '../../ui';
import { getTaxSummary } from '../services/accountingApi';
import { accountingStore } from '../stores/accountingStore';
import TaxSummary from './TaxSummary';
import AIAnalysis from './AIAnalysis';
import ExportWizard from './ExportWizard';
import CategoryMapping from './CategoryMapping';

interface TaxDashboard {
  year: number;
  grossIncome: number;
  totalExpenses: number;
  netProfit: number;
  uncategorizedCount: number;
  categories: {
    name: string;
    scheduleLine: string;
    amount: number;
  }[];
  aiAnalysis?: string;
}

const TaxDashboard: Component = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = createSignal(currentYear);
  const [taxData, setTaxData] = createSignal<TaxDashboard | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [showExportWizard, setShowExportWizard] = createSignal(false);
  const [showCategoryMapping, setShowCategoryMapping] = createSignal(false);

  const yearOptions = [
    { value: currentYear.toString(), label: currentYear.toString() },
    { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
    { value: (currentYear - 2).toString(), label: (currentYear - 2).toString() }
  ];

  createEffect(() => {
    loadTaxData(selectedYear());
  });

  const loadTaxData = async (year: number) => {
    setLoading(true);
    try {
      const data = await getTaxSummary(year);
      setTaxData(data);
    } catch (error) {
      console.error('Failed to load tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    padding: '2rem',
    'max-width': '1400px',
    margin: '0 auto'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const titleStyle = {
    'font-size': '2rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0'
  };

  const controlsStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'center'
  };

  const summaryCardsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const statCardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    'box-shadow': 'var(--shadow-sm)'
  };

  const statLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    'font-weight': '500',
    'margin-bottom': '0.5rem'
  };

  const statValueStyle = (isNegative?: boolean) => ({
    'font-size': '2.5rem',
    'font-weight': '600',
    color: isNegative ? 'var(--danger-color)' : 'var(--success-color)',
    margin: '0'
  });

  const warningBannerStyle = {
    padding: '1rem 1.5rem',
    background: '#fff3cd',
    border: '1px solid #ffc107',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '2rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const warningTextStyle = {
    color: '#856404',
    'font-weight': '500'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    overflow: 'hidden'
  };

  const tableHeaderStyle = {
    background: 'var(--background-color)',
    'text-align': 'left',
    padding: '1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'border-bottom': '2px solid var(--border-color)'
  };

  const tableCellStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-secondary)'
  };

  const exportButtonsStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Tax Center</h1>
        <div style={controlsStyle}>
          <div style={{ width: '150px' }}>
            <FormSelect
              label=""
              value={selectedYear().toString()}
              onChange={(value) => setSelectedYear(parseInt(value))}
              options={yearOptions}
            />
          </div>
          <Button variant="outline" onClick={() => setShowCategoryMapping(true)}>
            Category Mapping
          </Button>
        </div>
      </div>

      <Show when={loading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <p>Loading tax data...</p>
        </div>
      </Show>

      <Show when={!loading() && taxData()}>
        <Show when={taxData()!.uncategorizedCount > 0}>
          <div style={warningBannerStyle}>
            <span style={warningTextStyle}>
              Warning: {taxData()!.uncategorizedCount} transactions are not categorized for tax purposes
            </span>
            <Button size="sm" variant="outline" onClick={() => setShowCategoryMapping(true)}>
              Fix Now
            </Button>
          </div>
        </Show>

        <div style={summaryCardsStyle}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Gross Income</div>
            <div style={statValueStyle()}>
              {formatCurrency(taxData()!.grossIncome)}
            </div>
          </div>

          <div style={statCardStyle}>
            <div style={statLabelStyle}>Total Expenses</div>
            <div style={statValueStyle(true)}>
              {formatCurrency(taxData()!.totalExpenses)}
            </div>
          </div>

          <div style={statCardStyle}>
            <div style={statLabelStyle}>Net Profit</div>
            <div style={statValueStyle(taxData()!.netProfit < 0)}>
              {formatCurrency(taxData()!.netProfit)}
            </div>
          </div>
        </div>

        <Card title="Schedule C Breakdown" subtitle="Categories mapped to IRS Schedule C lines">
          <div style={{ overflow: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Category</th>
                  <th style={tableHeaderStyle}>Schedule C Line</th>
                  <th style={{ ...tableHeaderStyle, 'text-align': 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <For each={taxData()!.categories}>
                  {(category) => (
                    <tr>
                      <td style={tableCellStyle}>{category.name}</td>
                      <td style={tableCellStyle}>{category.scheduleLine}</td>
                      <td style={{ ...tableCellStyle, 'text-align': 'right', 'font-weight': '600' }}>
                        {formatCurrency(category.amount)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Card>

        <Show when={taxData()!.aiAnalysis}>
          <div style={{ 'margin-top': '2rem' }}>
            <AIAnalysis analysis={taxData()!.aiAnalysis!} />
          </div>
        </Show>

        <div style={exportButtonsStyle}>
          <Button variant="outline" onClick={() => window.print()}>
            Print Summary
          </Button>
          <Button onClick={() => setShowExportWizard(true)}>
            Export for Tax Software
          </Button>
        </div>
      </Show>

      <Show when={showExportWizard()}>
        <ExportWizard
          year={selectedYear()}
          onClose={() => setShowExportWizard(false)}
        />
      </Show>

      <Show when={showCategoryMapping()}>
        <CategoryMapping
          onClose={() => {
            setShowCategoryMapping(false);
            loadTaxData(selectedYear());
          }}
        />
      </Show>
    </div>
  );
};

export default TaxDashboard;
