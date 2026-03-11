/**
 * Accounts Page
 * Chart of Accounts management page with Templates and Rules
 */

import { Component, createSignal, createMemo, onMount, Show, For, lazy, Suspense } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button, Modal, FormInput, FormSelect } from '../../ui';
import { accountingStore } from '../stores/accountingStore';
import type { AccountingAccount } from '../types';

// Lazy load templates and rules components
const AccountTemplates = lazy(() => import('../components/AccountTemplates'));
const AccountingRules = lazy(() => import('../components/AccountingRules'));

const AccountsPage: Component = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<'accounts' | 'templates' | 'rules'>('accounts');
  const [isLoading, setIsLoading] = createSignal(true);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [editingAccount, setEditingAccount] = createSignal<AccountingAccount | null>(null);
  const [viewMode, setViewMode] = createSignal<'flat' | 'hierarchy'>('flat');
  const [filterType, setFilterType] = createSignal<string>('all');
  const [searchQuery, setSearchQuery] = createSignal('');

  // Form state
  const [formData, setFormData] = createSignal({
    code: '',
    name: '',
    accountType: 'expense' as AccountingAccount['accountType'],
    taxCategory: '',
    description: '',
    parentId: ''
  });
  const [formError, setFormError] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  onMount(async () => {
    try {
      await accountingStore.loadAccounts();
    } finally {
      setIsLoading(false);
    }
  });

  const filteredAccounts = createMemo(() => {
    let accounts = accountingStore.accounts;

    // Filter by type
    if (filterType() !== 'all') {
      accounts = accounts.filter(a => a.accountType === filterType());
    }

    // Filter by search
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      accounts = accounts.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.code.toLowerCase().includes(query) ||
        (a.description?.toLowerCase().includes(query))
      );
    }

    return accounts;
  });

  const groupedAccounts = createMemo(() => {
    const groups: Record<string, AccountingAccount[]> = {
      asset: [],
      liability: [],
      equity: [],
      revenue: [],
      expense: []
    };

    filteredAccounts().forEach(account => {
      if (groups[account.accountType]) {
        groups[account.accountType].push(account);
      }
    });

    return groups;
  });

  const accountTypeLabels: Record<string, string> = {
    asset: t('accounting.assets', 'Activos'),
    liability: t('accounting.liabilities', 'Pasivos'),
    equity: t('accounting.equity', 'Capital'),
    revenue: t('accounting.revenue', 'Ingresos'),
    expense: t('accounting.expenses', 'Gastos')
  };

  const accountTypeColors: Record<string, string> = {
    asset: '#3b82f6',
    liability: '#ef4444',
    equity: '#22c55e',
    revenue: '#10b981',
    expense: '#f59e0b'
  };

  const taxCategoryOptions = [
    { value: '', label: t('accounting.noCategory', 'Sin categoría') },
    { value: 'gross_receipts', label: t('accounting.grossReceipts', 'Ingresos Brutos') },
    { value: 'advertising', label: t('accounting.advertising', 'Publicidad') },
    { value: 'car_truck', label: t('accounting.carTruck', 'Vehículos') },
    { value: 'insurance', label: t('accounting.insurance', 'Seguros') },
    { value: 'rent', label: t('accounting.rent', 'Renta') },
    { value: 'supplies', label: t('accounting.supplies', 'Suministros') },
    { value: 'utilities', label: t('accounting.utilities', 'Servicios') },
    { value: 'wages', label: t('accounting.wages', 'Salarios') },
    { value: 'other_expenses', label: t('accounting.otherExpenses', 'Otros Gastos') }
  ];

  const accountTypeOptions = [
    { value: 'asset', label: t('accounting.asset', 'Activo') },
    { value: 'liability', label: t('accounting.liability', 'Pasivo') },
    { value: 'equity', label: t('accounting.equityType', 'Capital') },
    { value: 'revenue', label: t('accounting.revenueType', 'Ingreso') },
    { value: 'expense', label: t('accounting.expenseType', 'Gasto') }
  ];

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      accountType: 'expense',
      taxCategory: '',
      description: '',
      parentId: ''
    });
    setFormError('');
  };

  const openAddModal = () => {
    resetForm();
    setEditingAccount(null);
    setShowAddModal(true);
  };

  const openEditModal = (account: AccountingAccount) => {
    setFormData({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      taxCategory: account.taxCategory || '',
      description: account.description || '',
      parentId: account.parentId || ''
    });
    setEditingAccount(account);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setFormError('');

    const data = formData();
    if (!data.code.trim()) {
      setFormError(t('accounting.codeRequired', 'El código es requerido'));
      return;
    }
    if (!data.name.trim()) {
      setFormError(t('accounting.nameRequired', 'El nombre es requerido'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAccount()) {
        await accountingStore.updateAccount(editingAccount()!.id, data);
      } else {
        await accountingStore.addAccount(data);
      }
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || t('accounting.saveError', 'Error al guardar'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('accounting.confirmDelete', '¿Está seguro de eliminar esta cuenta?'))) {
      return;
    }
    try {
      await accountingStore.deleteAccount(id);
    } catch (err: any) {
      alert(err.message || t('accounting.deleteError', 'Error al eliminar'));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-color)',
    cursor: 'pointer',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': isActive ? '600' : '400',
    transition: 'all 0.2s ease',
    'font-size': '0.875rem'
  });

  const handleTemplateApplied = () => {
    accountingStore.loadAccounts();
    setActiveTab('accounts');
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header with Tabs */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'flex-start',
        'margin-bottom': '1.5rem'
      }}>
        <div>
          <h1 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '0.5rem' }}>
            {t('accounting.chartOfAccounts', 'Plan de Cuentas')}
          </h1>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            background: 'var(--surface-secondary)',
            padding: '0.25rem',
            'border-radius': 'var(--border-radius-md)',
            width: 'fit-content'
          }}>
            <button
              style={tabStyle(activeTab() === 'accounts')}
              onClick={() => setActiveTab('accounts')}
            >
              📊 {t('accounting.accounts', 'Cuentas')} ({filteredAccounts().length})
            </button>
            <button
              style={tabStyle(activeTab() === 'templates')}
              onClick={() => setActiveTab('templates')}
            >
              📋 {t('accounting.templates', 'Plantillas')}
            </button>
            <button
              style={tabStyle(activeTab() === 'rules')}
              onClick={() => setActiveTab('rules')}
            >
              🤖 {t('accounting.rules', 'Reglas')}
            </button>
          </div>
        </div>
        <Show when={activeTab() === 'accounts'}>
          <Button variant="primary" onClick={openAddModal}>
            + {t('accounting.newAccount', 'Nueva Cuenta')}
          </Button>
        </Show>
      </div>

      {/* Templates Tab */}
      <Show when={activeTab() === 'templates'}>
        <Suspense fallback={<div style={{ 'text-align': 'center', padding: '2rem' }}>Cargando plantillas...</div>}>
          <AccountTemplates onTemplateApplied={handleTemplateApplied} />
        </Suspense>
      </Show>

      {/* Rules Tab */}
      <Show when={activeTab() === 'rules'}>
        <Suspense fallback={<div style={{ 'text-align': 'center', padding: '2rem' }}>Cargando reglas...</div>}>
          <AccountingRules onRuleCreated={() => {}} />
        </Suspense>
      </Show>

      {/* Accounts Tab Content */}
      <Show when={activeTab() === 'accounts'}>
        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'margin-bottom': '1.5rem',
          'flex-wrap': 'wrap'
        }}>
          <input
            type="text"
            placeholder={t('accounting.searchAccounts', 'Buscar cuentas...')}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            style={{
            flex: '1',
            'min-width': '200px',
            padding: '0.5rem 1rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.875rem'
          }}
        />
        <select
          value={filterType()}
          onChange={(e) => setFilterType(e.currentTarget.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.875rem',
            background: 'var(--surface-color)'
          }}
        >
          <option value="all">{t('accounting.allTypes', 'Todos los tipos')}</option>
          <For each={accountTypeOptions}>
            {(opt) => <option value={opt.value}>{opt.label}</option>}
          </For>
        </select>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => setViewMode('flat')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm) 0 0 var(--border-radius-sm)',
              background: viewMode() === 'flat' ? 'var(--primary-color)' : 'var(--surface-color)',
              color: viewMode() === 'flat' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >
            {t('accounting.flatView', 'Lista')}
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              'border-radius': '0 var(--border-radius-sm) var(--border-radius-sm) 0',
              background: viewMode() === 'hierarchy' ? 'var(--primary-color)' : 'var(--surface-color)',
              color: viewMode() === 'hierarchy' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >
            {t('accounting.groupedView', 'Agrupado')}
          </button>
        </div>
        </div>
      </Show>
        {/* Loading */}
        <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div>{t('common.loading', 'Cargando...')}</div>
        </div>
      </Show>
      

      {/* Accounts List - Grouped View */}
      <Show when={!isLoading() && viewMode() === 'hierarchy'}>
        <For each={Object.entries(groupedAccounts()).filter(([_, accounts]) => accounts.length > 0)}>
          {([type, accounts]) => (
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                'margin-bottom': '0.75rem'
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  'border-radius': '9999px',
                  'font-size': '0.75rem',
                  'font-weight': '600',
                  background: accountTypeColors[type] + '20',
                  color: accountTypeColors[type]
                }}>
                  {accountTypeLabels[type]}
                </span>
                <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                  ({accounts.length})
                </span>
              </div>

              <div style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-md)',
                overflow: 'hidden'
              }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('accounting.code', 'Código')}</th>
                      <th style={thStyle}>{t('accounting.name', 'Nombre')}</th>
                      <th style={thStyle}>{t('accounting.taxCategory', 'Categoría Fiscal')}</th>
                      <th style={{ ...thStyle, 'text-align': 'right' }}>{t('accounting.balance', 'Balance')}</th>
                      <th style={{ ...thStyle, width: '100px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={accounts}>
                      {(account) => (
                        <tr style={{ ':hover': { background: 'var(--hover-color)' } }}>
                          <td style={{ ...tdStyle, 'font-family': 'monospace', 'font-size': '0.875rem' }}>
                            {account.code}
                          </td>
                          <td style={tdStyle}>{account.name}</td>
                          <td style={tdStyle}>
                            <Show when={account.taxCategory} fallback={<span style={{ color: 'var(--text-muted)' }}>-</span>}>
                              <span style={{
                                padding: '0.125rem 0.5rem',
                                'border-radius': '4px',
                                'font-size': '0.75rem',
                                background: 'var(--surface-secondary)',
                                color: 'var(--text-primary)'
                              }}>
                                {account.taxCategory}
                              </span>
                            </Show>
                          </td>
                          <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '500' }}>
                            {formatCurrency(account.balance || 0)}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                onClick={() => openEditModal(account)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--primary-color)',
                                  cursor: 'pointer',
                                  'font-size': '0.875rem'
                                }}
                              >
                                {t('common.edit', 'Editar')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </For>
      </Show>

      {/* Accounts List - Flat View */}
      <Show when={!isLoading() && viewMode() === 'flat'}>
        <div style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-md)',
          overflow: 'hidden'
        }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('accounting.code', 'Código')}</th>
                <th style={thStyle}>{t('accounting.name', 'Nombre')}</th>
                <th style={thStyle}>{t('accounting.type', 'Tipo')}</th>
                <th style={thStyle}>{t('accounting.taxCategory', 'Categoría Fiscal')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('accounting.balance', 'Balance')}</th>
                <th style={{ ...thStyle, width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredAccounts()}>
                {(account) => (
                  <tr>
                    <td style={{ ...tdStyle, 'font-family': 'monospace', 'font-size': '0.875rem' }}>
                      {account.code}
                    </td>
                    <td style={tdStyle}>{account.name}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        'border-radius': '9999px',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        background: accountTypeColors[account.accountType] + '20',
                        color: accountTypeColors[account.accountType]
                      }}>
                        {accountTypeLabels[account.accountType]}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <Show when={account.taxCategory} fallback={<span style={{ color: 'var(--text-muted)' }}>-</span>}>
                        {account.taxCategory}
                      </Show>
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '500' }}>
                      {formatCurrency(account.balance || 0)}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => openEditModal(account)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--primary-color)',
                          cursor: 'pointer',
                          'font-size': '0.875rem'
                        }}
                      >
                        {t('common.edit', 'Editar')}
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
     
      </Show> {/* End of Accounts Tab Content */}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        title={editingAccount() ? t('accounting.editAccount', 'Editar Cuenta') : t('accounting.newAccount', 'Nueva Cuenta')}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
            <FormInput
              label={t('accounting.code', 'Código')}
              value={formData().code}
              onChange={(value) => setFormData(prev => ({ ...prev, code: value }))}
              placeholder="1000"
            />
            <FormSelect
              label={t('accounting.type', 'Tipo')}
              value={formData().accountType}
              onChange={(value) => setFormData(prev => ({ ...prev, accountType: value as any }))}
              options={accountTypeOptions}
            />
          </div>

          <div style={{ 'margin-bottom': '1rem' }}>
            <FormInput
              label={t('accounting.name', 'Nombre')}
              value={formData().name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder={t('accounting.accountName', 'Nombre de la cuenta')}
            />
          </div>

          <div style={{ 'margin-bottom': '1rem' }}>
            <FormSelect
              label={t('accounting.taxCategory', 'Categoría Fiscal')}
              value={formData().taxCategory}
              onChange={(value) => setFormData(prev => ({ ...prev, taxCategory: value }))}
              options={taxCategoryOptions}
            />
          </div>

          <div style={{ 'margin-bottom': '1rem' }}>
            <FormInput
              label={t('accounting.description', 'Descripción')}
              value={formData().description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              placeholder={t('accounting.optionalDescription', 'Descripción opcional')}
            />
          </div>

          <Show when={formError()}>
            <div style={{
              padding: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              'border-radius': 'var(--border-radius-sm)',
              color: '#dc2626',
              'margin-bottom': '1rem',
              'font-size': '0.875rem'
            }}>
              {formError()}
            </div>
          </Show>

          <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting()}>
              {isSubmitting() ? t('common.saving', 'Guardando...') : (editingAccount() ? t('common.save', 'Guardar') : t('common.create', 'Crear'))}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AccountsPage;
