/**
 * Account Templates Component
 * Allows users to browse, preview, and apply account templates
 */

import { Component, createSignal, createResource, Show, For } from 'solid-js';
import { Card, Button, Modal } from '../../ui';
import { accountingApi, AccountTemplate, AccountTemplatePreview } from '../services/accountingApi';

interface AccountTemplatesProps {
  onTemplateApplied?: () => void;
}

const AccountTemplates: Component<AccountTemplatesProps> = (props) => {
  const [selectedTemplate, setSelectedTemplate] = createSignal<AccountTemplate | null>(null);
  const [showPreview, setShowPreview] = createSignal(false);
  const [isApplying, setIsApplying] = createSignal(false);
  const [applyResult, setApplyResult] = createSignal<{ success: boolean; message: string } | null>(null);

  // Demo templates (will be replaced by API data when available)
  const demoTemplates: AccountTemplate[] = [
    {
      id: 'retail-basic',
      name: 'Comercio Minorista',
      description: 'Plan de cuentas básico para tiendas y comercios',
      industry: 'retail',
      accounts: [
        { accountNumber: '1000', accountName: 'Caja', accountType: 'asset' },
        { accountNumber: '1100', accountName: 'Bancos', accountType: 'asset' },
        { accountNumber: '1200', accountName: 'Cuentas por Cobrar', accountType: 'asset' },
        { accountNumber: '1300', accountName: 'Inventario', accountType: 'asset' },
        { accountNumber: '2000', accountName: 'Cuentas por Pagar', accountType: 'liability' },
        { accountNumber: '2100', accountName: 'Impuestos por Pagar', accountType: 'liability' },
        { accountNumber: '3000', accountName: 'Capital Social', accountType: 'equity' },
        { accountNumber: '4000', accountName: 'Ventas', accountType: 'revenue' },
        { accountNumber: '5000', accountName: 'Costo de Ventas', accountType: 'expense' },
        { accountNumber: '6000', accountName: 'Gastos de Operación', accountType: 'expense' },
        { accountNumber: '6100', accountName: 'Salarios', accountType: 'expense' },
        { accountNumber: '6200', accountName: 'Renta', accountType: 'expense' },
      ]
    },
    {
      id: 'services-basic',
      name: 'Servicios Profesionales',
      description: 'Ideal para consultores, abogados, contadores',
      industry: 'services',
      accounts: [
        { accountNumber: '1000', accountName: 'Efectivo', accountType: 'asset' },
        { accountNumber: '1100', accountName: 'Banco Operativo', accountType: 'asset' },
        { accountNumber: '1200', accountName: 'Clientes', accountType: 'asset' },
        { accountNumber: '2000', accountName: 'Proveedores', accountType: 'liability' },
        { accountNumber: '3000', accountName: 'Capital', accountType: 'equity' },
        { accountNumber: '4000', accountName: 'Ingresos por Servicios', accountType: 'revenue' },
        { accountNumber: '5000', accountName: 'Gastos Profesionales', accountType: 'expense' },
        { accountNumber: '5100', accountName: 'Honorarios', accountType: 'expense' },
      ]
    },
    {
      id: 'restaurant-basic',
      name: 'Restaurante',
      description: 'Para restaurantes, cafeterías y servicios de comida',
      industry: 'restaurant',
      accounts: [
        { accountNumber: '1000', accountName: 'Caja Registradora', accountType: 'asset' },
        { accountNumber: '1100', accountName: 'Banco', accountType: 'asset' },
        { accountNumber: '1300', accountName: 'Inventario Alimentos', accountType: 'asset' },
        { accountNumber: '1310', accountName: 'Inventario Bebidas', accountType: 'asset' },
        { accountNumber: '2000', accountName: 'Proveedores', accountType: 'liability' },
        { accountNumber: '3000', accountName: 'Capital', accountType: 'equity' },
        { accountNumber: '4000', accountName: 'Ventas Comida', accountType: 'revenue' },
        { accountNumber: '4100', accountName: 'Ventas Bebidas', accountType: 'revenue' },
        { accountNumber: '5000', accountName: 'Costo Alimentos', accountType: 'expense' },
        { accountNumber: '5100', accountName: 'Costo Bebidas', accountType: 'expense' },
        { accountNumber: '6000', accountName: 'Salarios Cocina', accountType: 'expense' },
        { accountNumber: '6100', accountName: 'Salarios Servicio', accountType: 'expense' },
      ]
    },
    {
      id: 'transport-basic',
      name: 'Transporte y Logística',
      description: 'Para empresas de transporte y envíos',
      industry: 'transport',
      accounts: [
        { accountNumber: '1000', accountName: 'Efectivo', accountType: 'asset' },
        { accountNumber: '1100', accountName: 'Bancos', accountType: 'asset' },
        { accountNumber: '1500', accountName: 'Vehículos', accountType: 'asset' },
        { accountNumber: '1510', accountName: 'Depreciación Acumulada', accountType: 'asset' },
        { accountNumber: '2000', accountName: 'Préstamos Vehículos', accountType: 'liability' },
        { accountNumber: '3000', accountName: 'Capital', accountType: 'equity' },
        { accountNumber: '4000', accountName: 'Ingresos por Fletes', accountType: 'revenue' },
        { accountNumber: '5000', accountName: 'Combustible', accountType: 'expense' },
        { accountNumber: '5100', accountName: 'Mantenimiento Vehículos', accountType: 'expense' },
        { accountNumber: '5200', accountName: 'Seguros', accountType: 'expense' },
      ]
    }
  ];

  // Fetch available templates (fallback to demo data)
  const [templates] = createResource(async () => {
    try {
      const result = await accountingApi.templates.getAll();
      return result && result.length > 0 ? result : demoTemplates;
    } catch {
      return demoTemplates;
    }
  });

  // Fetch preview when template is selected
  const [preview] = createResource(
    () => selectedTemplate()?.id,
    async (templateId) => {
      if (!templateId) return null;
      return accountingApi.templates.preview(templateId);
    }
  );

  const handleSelectTemplate = (template: AccountTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
    setApplyResult(null);
  };

  const handleApplyTemplate = async () => {
    const template = selectedTemplate();
    if (!template) return;

    setIsApplying(true);
    setApplyResult(null);

    try {
      const result = await accountingApi.templates.apply(template.id, {
        skipConflicts: true
      });

      if (result.success) {
        setApplyResult({
          success: true,
          message: `Se crearon ${result.accountsCreated} cuentas exitosamente`
        });
        props.onTemplateApplied?.();
      } else {
        setApplyResult({
          success: false,
          message: result.errors?.join(', ') || 'Error al aplicar la plantilla'
        });
      }
    } catch (error: any) {
      setApplyResult({
        success: false,
        message: error.message || 'Error al aplicar la plantilla'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const industryIcons: Record<string, string> = {
    retail: '🏪',
    services: '💼',
    manufacturing: '🏭',
    technology: '💻',
    healthcare: '🏥',
    restaurant: '🍽️',
    construction: '🏗️',
    transport: '🚚',
    general: '📊'
  };

  const accountTypeColors: Record<string, { bg: string; color: string }> = {
    asset: { bg: '#dbeafe', color: '#1d4ed8' },
    liability: { bg: '#fee2e2', color: '#dc2626' },
    equity: { bg: '#d1fae5', color: '#059669' },
    revenue: { bg: '#fef3c7', color: '#d97706' },
    expense: { bg: '#f3e8ff', color: '#7c3aed' }
  };

  const cardStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  return (
    <div>
      {/* Header */}
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
          Plantillas de Cuentas
        </h2>
        <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
          Selecciona una plantilla para configurar rápidamente tu plan de cuentas
        </p>
      </div>

      {/* Loading State */}
      <Show when={templates.loading}>
        <div style={{ display: 'flex', 'justify-content': 'center', padding: '2rem' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '3px solid var(--border-color)',
            'border-top-color': 'var(--primary-color)',
            'border-radius': '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </Show>

      {/* Templates Grid */}
      <Show when={!templates.loading && templates()}>
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          <For each={templates()}>
            {(template) => (
              <div
                style={cardStyle}
                onClick={() => handleSelectTemplate(template)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                  <span style={{ 'font-size': '2rem' }}>
                    {industryIcons[template.industry] || industryIcons.general}
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                      {template.name}
                    </h3>
                    <p style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'margin-bottom': '0.5rem'
                    }}>
                      {template.description}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                      <span style={{
                        'font-size': '0.7rem',
                        padding: '0.125rem 0.5rem',
                        background: 'var(--surface-secondary)',
                        'border-radius': '9999px',
                        color: 'var(--text-muted)'
                      }}>
                        {template.accounts.length} cuentas
                      </span>
                      <span style={{
                        'font-size': '0.7rem',
                        padding: '0.125rem 0.5rem',
                        background: 'var(--surface-secondary)',
                        'border-radius': '9999px',
                        color: 'var(--text-muted)'
                      }}>
                        {template.industry}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!templates.loading && (!templates() || templates()?.length === 0)}>
        <div style={{
          'text-align': 'center',
          padding: '3rem',
          color: 'var(--text-muted)'
        }}>
          <span style={{ 'font-size': '3rem', display: 'block', 'margin-bottom': '1rem' }}>📋</span>
          <p>No hay plantillas disponibles</p>
        </div>
      </Show>

      {/* Preview Modal */}
      <Show when={showPreview() && selectedTemplate()}>
        <Modal
          isOpen={showPreview()}
          onClose={() => {
            setShowPreview(false);
            setSelectedTemplate(null);
            setApplyResult(null);
          }}
          title={`Plantilla: ${selectedTemplate()?.name}`}
        >
          <div style={{ 'max-height': '60vh', overflow: 'auto' }}>
            {/* Template Info */}
            <div style={{
              padding: '1rem',
              background: 'var(--surface-secondary)',
              'border-radius': 'var(--border-radius-md)',
              'margin-bottom': '1rem'
            }}>
              <p style={{ 'margin-bottom': '0.5rem' }}>{selectedTemplate()?.description}</p>
              <div style={{ display: 'flex', gap: '1rem', 'font-size': '0.875rem' }}>
                <span><strong>Industria:</strong> {selectedTemplate()?.industry}</span>
                <span><strong>Cuentas:</strong> {selectedTemplate()?.accounts.length}</span>
              </div>
            </div>

            {/* Preview Loading */}
            <Show when={preview.loading}>
              <div style={{ 'text-align': 'center', padding: '1rem' }}>
                Analizando compatibilidad...
              </div>
            </Show>

            {/* Preview Results */}
            <Show when={!preview.loading && preview()}>
              {/* Conflicts Warning */}
              <Show when={preview()?.existingConflicts && preview()!.existingConflicts.length > 0}>
                <div style={{
                  padding: '1rem',
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  'border-radius': 'var(--border-radius-md)',
                  'margin-bottom': '1rem'
                }}>
                  <h4 style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#92400e' }}>
                    ⚠️ Conflictos detectados
                  </h4>
                  <ul style={{ 'font-size': '0.875rem', 'padding-left': '1rem' }}>
                    <For each={preview()?.existingConflicts}>
                      {(conflict) => (
                        <li style={{ 'margin-bottom': '0.25rem' }}>
                          Cuenta {conflict.accountNumber}: "{conflict.existingName}" ya existe
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </Show>

              {/* Accounts to Create */}
              <div style={{ 'margin-bottom': '1rem' }}>
                <h4 style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
                  Cuentas a crear ({preview()?.accountsToCreate || selectedTemplate()?.accounts.length})
                </h4>
                <div style={{
                  'max-height': '300px',
                  overflow: 'auto',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)'
                }}>
                  <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-secondary)' }}>
                        <th style={{ padding: '0.5rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>Código</th>
                        <th style={{ padding: '0.5rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>Nombre</th>
                        <th style={{ padding: '0.5rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={selectedTemplate()?.accounts}>
                        {(account) => (
                          <tr>
                            <td style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)', 'font-family': 'monospace' }}>
                              {account.accountNumber}
                            </td>
                            <td style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                              {account.accountName}
                            </td>
                            <td style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                              <span style={{
                                padding: '0.125rem 0.5rem',
                                'border-radius': '9999px',
                                'font-size': '0.75rem',
                                background: accountTypeColors[account.accountType]?.bg || '#e5e7eb',
                                color: accountTypeColors[account.accountType]?.color || '#374151'
                              }}>
                                {account.accountType}
                              </span>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Estimated Time */}
              <Show when={preview()?.estimatedSetupTime}>
                <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
                  ⏱️ Tiempo estimado: {preview()?.estimatedSetupTime}
                </p>
              </Show>
            </Show>

            {/* Result Message */}
            <Show when={applyResult()}>
              <div style={{
                padding: '1rem',
                background: applyResult()?.success ? '#d1fae5' : '#fee2e2',
                border: `1px solid ${applyResult()?.success ? '#10b981' : '#ef4444'}`,
                'border-radius': 'var(--border-radius-md)',
                'margin-bottom': '1rem',
                color: applyResult()?.success ? '#065f46' : '#991b1b'
              }}>
                {applyResult()?.success ? '✅' : '❌'} {applyResult()?.message}
              </div>
            </Show>

            {/* Actions */}
            <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.75rem', 'margin-top': '1rem' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPreview(false);
                  setSelectedTemplate(null);
                  setApplyResult(null);
                }}
              >
                Cancelar
              </Button>
              <Show when={!applyResult()?.success}>
                <Button
                  variant="primary"
                  onClick={handleApplyTemplate}
                  disabled={isApplying()}
                >
                  {isApplying() ? 'Aplicando...' : 'Aplicar Plantilla'}
                </Button>
              </Show>
              <Show when={applyResult()?.success}>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedTemplate(null);
                    setApplyResult(null);
                  }}
                >
                  Cerrar
                </Button>
              </Show>
            </div>
          </div>
        </Modal>
      </Show>
    </div>
  );
};

export default AccountTemplates;
