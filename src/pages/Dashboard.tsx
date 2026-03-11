import { Component, Show } from 'solid-js';
import { Layout, Card, Button } from '../modules/ui';
import { useTranslation } from '../i18n';
import { InvoiceDashboardExample } from '../modules/invoice';
import { authStore } from '../stores/authStore';
import { DetailedBankAnalyzer } from '../modules';
import AccessPermissionsSummary from '../components/AccessPermissionsSummary';
import { A } from '@solidjs/router';

const Dashboard: Component = () => {
  const { t } = useTranslation();
  const statsCardStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const actionCardStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  };

  const statValueStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    margin: '0.5rem 0'
  };

  const statLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  return (
    <Layout title={t('dashboard.title')}>
      

      <div style={{ 'margin-bottom': '2rem' }}>
        <AccessPermissionsSummary />
      </div>

      {/* Notary Customers Quick Access */}
      <Show when={authStore.hasPermission('NotaryAccess')}>
        <Card
          title="🔷 Clientes Notariales"
          subtitle="Gestión de clientes y plantillas PDF"
          style={{ 'margin-bottom': '2rem', 'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
        >
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
            <p style={{ margin: '0.5rem 0', opacity: '0.95' }}>
              Administra tus clientes notariales y crea plantillas PDF reutilizables con mapeo automático de campos.
            </p>
            <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
              <A href="/notary-customers">
                <Button
                  variant="primary"
                  style={{
                    background: 'white',
                    color: '#667eea',
                    'font-weight': '600',
                    border: 'none',
                    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  👥 Administrar Clientes
                </Button>
              </A>
              <A href="/notary-customers">
                <Button
                  variant="outline"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    'border-color': 'white',
                    'font-weight': '600'
                  }}
                >
                  📋 Ver Plantillas PDF
                </Button>
              </A>
            </div>
          </div>
        </Card>
      </Show>

      <Show when={authStore.state?.profile?.isAdmin}>

      <div style={statsCardStyle}>
        <Card title={t('dashboard.totalRevenue')} subtitle={t('dashboard.overview')}>
          <div style={statValueStyle}>$124,350</div>
          <div style={statLabelStyle}>+12% from last month</div>
        </Card>
        <Card title={t('dashboard.employeeCount')} subtitle={t('dashboard.current')}>
          <div style={statValueStyle}>247</div>
          <div style={statLabelStyle}>{t('dashboard.newHires')}</div>
        </Card>
        <Card title={t('dashboard.pendingInvoices')} subtitle={t('dashboard.outstanding')}>
          <div style={statValueStyle}>18</div>
          <div style={statLabelStyle}>{t('dashboard.totalOutstanding')}</div>
        </Card>
        <Card title={t('dashboard.cashBalance')} subtitle={t('accounts.title')}>
          <div style={statValueStyle}>$89,250</div>
          <div style={statLabelStyle}>{t('dashboard.lastUpdatedToday')}</div>
        </Card>
      </div>

      <div style={actionCardStyle}>
        <Card title={t('dashboard.quickActions')} subtitle={t('dashboard.commonTasks')}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
            <Button variant="primary">{t('invoices.createNew')}</Button>
            <Button variant="secondary">{t('employees.addEmployee')}</Button>
            <Button variant="outline">{t('dashboard.generateReport')}</Button>
          </div>
        </Card>
        <Card title={t('dashboard.recentActivity')} subtitle={t('dashboard.latestUpdates')}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
            <div style={{ 'border-bottom': '1px solid var(--border-color)', 'padding-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '500' }}>{t('dashboard.invoicePaid')}</div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>{t('dashboard.hoursAgo')}</div>
            </div>
            <div style={{ 'border-bottom': '1px solid var(--border-color)', 'padding-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': '500' }}>{t('dashboard.newEmployeeOnboarded')}</div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>{t('dashboard.dayAgo')}</div>
            </div>
            <div>
              <div style={{ 'font-weight': '500' }}>{t('dashboard.monthlyReportGenerated')}</div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>{t('dashboard.daysAgo')}</div>
            </div>
          </div>
        </Card>
      </div>
      <Show when={authStore.hasPermission("invoiceAccess")}>

       
        <DetailedBankAnalyzer />
      </Show>
      </Show>
    </Layout>
  );
};

export default Dashboard;