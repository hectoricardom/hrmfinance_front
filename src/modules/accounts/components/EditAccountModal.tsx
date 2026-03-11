import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import { AccountingAccount, accountsStore } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';
import { compareJSON, fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

// Layer option types
interface CriteriaOption {
  value: string;
  label: string;
}

interface CriteriaField {
  field: string;
  label: string;
  required: boolean;
  options: CriteriaOption[];
}

interface LayerOption {
  id: string;
  name: string;
  description: string;
  accountType: string;
  defaultSide: 'debit' | 'credit';
  criteriaFields: CriteriaField[];
}

interface AccountLayerAssignment {
  layer: string;
  criteria: Record<string, string>;
}

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountingAccount | null;
  layerOptions?: LayerOption[]; // Pre-loaded layer options
}

const EditAccountModal: Component<EditAccountModalProps> = (props) => {
  const { t } = useTranslation();
  const [formData, setFormData] = createSignal({
    accountNumber: '',
    name: '',
    type: '' as AccountingAccount['type'] | '',
    accountType: '' as AccountingAccount['type'] | '',
    category: '',
    description: '',
    isActive: 'true',
    isPiggybank: false,
    piggybankLabel: '',
    isDefault: false,
    isShared: false
  });

  const [validationError, setValidationError] = createSignal<string | null>(null);

  // Layer assignment state
  const [layerOptions, setLayerOptions] = createSignal<LayerOption[]>([]);
  const [selectedLayer, setSelectedLayer] = createSignal<string>('');
  const [layerCriteria, setLayerCriteria] = createSignal<Record<string, string>>({});
  const [enableLayerAssignment, setEnableLayerAssignment] = createSignal(false);
  const [loadingLayers, setLoadingLayers] = createSignal(false);
  const [existingLayerAssignment, setExistingLayerAssignment] = createSignal<AccountLayerAssignment | null>(null);

  // Fetch layer options if not provided
  const fetchLayerOptions = async () => {
    if (props.layerOptions && props.layerOptions.length > 0) {
      setLayerOptions(props.layerOptions);
      return;
    }
    setLoadingLayers(true);
    try {
      const result = await fetchGraphQLSS({
        query: 'getLayerOptions',
        params: { businessId: authStore.getBusinessId() },
        businessId: authStore.getBusinessId()
      });
      const layers = result?.data?.layers || result?.layers || [];
      setLayerOptions(Array.isArray(layers) ? layers : []);
    } catch (error) {
      console.error('Error fetching layer options:', error);
      setLayerOptions([]);
    } finally {
      setLoadingLayers(false);
    }
  };

  // Fetch existing layer assignment for this account
  const fetchAccountLayerAssignment = async (accountId: string) => {
    try {
      const result = await fetchGraphQLSS({
        query: 'getAccountLayerAssignment',
        params: { businessId: authStore.getBusinessId(), accountId },
        businessId: authStore.getBusinessId()
      });
      const assignment = result?.data || result;
      if (assignment?.layer) {
        setExistingLayerAssignment(assignment);
        setSelectedLayer(assignment.layer);
        setLayerCriteria(assignment.criteria || {});
        setEnableLayerAssignment(true);
      } else {
        setExistingLayerAssignment(null);
        setSelectedLayer('');
        setLayerCriteria({});
        setEnableLayerAssignment(false);
      }
    } catch (error) {
      console.error('Error fetching account layer assignment:', error);
    }
  };

  // Get selected layer details
  const getSelectedLayerDetails = () => {
    return layerOptions().find(l => l.id === selectedLayer()) || null;
  };

  // Update criteria when layer changes
  const handleLayerChange = (layerId: string) => {
    setSelectedLayer(layerId);
    // Only reset criteria if changing to a different layer
    if (layerId !== existingLayerAssignment()?.layer) {
      setLayerCriteria({});
    }
  };

  // Update a criteria field
  const updateCriteria = (field: string, value: string) => {
    setLayerCriteria(prev => ({ ...prev, [field]: value }));
  };

  // Assign/Update layer for account
  const saveAccountLayer = async (accountId: string) => {
    if (!enableLayerAssignment()) {
      // If layer assignment is disabled but there was an existing one, remove it
      if (existingLayerAssignment()) {
        try {
          await fetchGraphQLSS({
            query: 'removeAccountLayer',
            params: { businessId: authStore.getBusinessId() },
            businessId: authStore.getBusinessId(),
            form: { accountId }
          });
        } catch (error) {
          console.error('Error removing layer:', error);
        }
      }
      return;
    }

    if (!selectedLayer()) return;

    try {
      await fetchGraphQLSS({
        query: 'assignAccountLayer',
        params: { businessId: authStore.getBusinessId() },
        businessId: authStore.getBusinessId(),
        form: {
          accountId,
          layer: selectedLayer(),
          criteria: layerCriteria(),
          reasoning: existingLayerAssignment() ? 'Updated by user' : 'Selected by user during account edit'
        }
      });
      console.log('Layer saved successfully');
    } catch (error) {
      console.error('Error saving layer:', error);
    }
  };

  // Initialize form when account changes
  createEffect(() => {
    if (props.account && props.isOpen) {
      setFormData({
        accountNumber: props.account.accountNumber,
        name: props.account.name,
        type: props.account.type,
        accountType: props.account.accountType,
        category: props.account.category,
        description: props.account.description,
        isActive: props.account.isActive.toString(),
        isPiggybank: props.account.isPiggybank || false,
        piggybankLabel: props.account.piggybankLabel || '',
        isDefault: props.account.isDefault || false,
        isShared: props.account.isShared || false
      });
      setValidationError(null);

      // Load layer options and existing assignment
      fetchLayerOptions();
      if (props.account.id || props.account.accountId) {
        fetchAccountLayerAssignment(props.account.accountId || props.account.id);
      }
    }
  });

  // Update layer options when provided via props
  createEffect(() => {
    if (props.layerOptions && props.layerOptions.length > 0) {
      setLayerOptions(props.layerOptions);
    }
  });


  const accountTypeOptions = [
    { value: 'Asset', label: t('accounts.types.asset'), type: "debit", classification: "real" },
    { value: 'Liability', label: t('accounts.types.liability'), type: "credit", classification: "real" },
    { value: 'Equity', label: t('accounts.types.equity'), type: "credit", classification: "real" },
    { value: 'Revenue', label: t('accounts.types.revenue'), type: "credit", classification: "nominal" },
    { value: 'Expense', label: t('accounts.types.expense'), type: "debit", classification: "nominal" }
  ];

  const getCategoryOptions = () => {
    const type = formData().accountType;
    if (!type) return [];

    const categoryMap: Record<AccountingAccount['accountType'], { value: string, label: string }[]> = {
      'Asset': [
        { value: 'Current Assets', label: t('accounts.categories.currentAssets') },
        { value: 'Fixed Assets', label: t('accounts.categories.fixedAssets') }
      ],
      'Liability': [
        { value: 'Current Liabilities', label: t('accounts.categories.currentLiabilities') },
        { value: 'Long-term Liabilities', label: t('accounts.categories.longTermLiabilities') }
      ],
      'Equity': [
        { value: 'Owner\'s Equity', label: t('accounts.categories.ownersEquity') }
      ],
      'Revenue': [
        { value: 'Operating Revenue', label: t('accounts.categories.operatingRevenue') }
      ],
      'Expense': [
        { value: 'Operating Expenses', label: t('accounts.categories.operatingExpenses') }
      ]
    };

    return categoryMap[type as AccountingAccount['accountType']] || [];
  };

  const activeOptions = [
    { value: 'true', label: t('common.active') },
    { value: 'false', label: t('common.inactive') }
  ];

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setValidationError(null);

    if (!props.account) return;

    const data = formData();

    if (!data.accountNumber || !data.name || !data.type || !data.category) {
      setValidationError(t('forms.requiredField'));
      return;
    }

    // Check if account number already exists (excluding current account)
    const existingAccount = accountsStore.accounts.find(
      account => account.accountNumber === data.accountNumber && account.id !== props.account!.id && !props.account!.parentAccountId
    );

    if (existingAccount) {
      setValidationError(t('forms.duplicateAccountNumber'));
      return;
    }

    const updatedAccount: Partial<AccountingAccount> = {
      accountNumber: data.accountNumber,
      name: data.name,
      type: data.type,
      accountType: data.accountType as AccountingAccount['type'],
      category: data.category,
      description: data.description,
      isActive: data.isActive === 'true',
      isPiggybank: data.isPiggybank,
      piggybankLabel: data.isPiggybank ? data.piggybankLabel : undefined,
      isDefault: data.isDefault,
      isShared: data.isShared
    };

    console.log(props.account?.accountId)
    console.log({ updatedAccount, account: props.account })

    let gt = compareJSON(Object.keys(updatedAccount), updatedAccount, props.account, {
      accountId: 1,
      id: 1
    });

    try {
      await accountsStore.updateAccountServer(props.account?.accountId, gt.data);

      // Save layer assignment
      const accountId = props.account?.accountId || props.account?.id;
      if (accountId) {
        await saveAccountLayer(accountId);
      }

      props.onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : t('forms.saveError'));
    }
  };

  const handleDelete = () => {

    if(authStore.isAdmin()){
      handleDeleteHold();
    }
  }

  const handleDeleteHold = () => {
    if (!props.account) return;

    // Check if account can be deleted
    const deleteCheck = accountsStore.canDeleteAccount(props.account.id);
    if (!deleteCheck.canDelete) {
      setValidationError(deleteCheck.reason || t('forms.deleteError'));
      return;
    }

    const confirmMessage = t('forms.confirmDelete');

    if (confirm(confirmMessage)) {
      try {
        accountsStore.deleteAccount(props.account.id);
        props.onClose();
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : t('forms.deleteError'));
      }
    }

  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Reset category when type changes
      if (field === 'type') {
        newData.category = '';
      }
      return newData;
    });
    // Clear validation error when user starts typing
    if (validationError()) {
      setValidationError(null);
    }
  };

  if (!props.account) return null;

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('accounts.editAccount')}>
      <form onSubmit={handleSubmit}>
        <FormInput
          label={t('accounts.accountNumber')}
          value={formData().accountNumber}
          onChange={(value) => updateFormData('accountNumber', value)}
          placeholder={t('accounts.accountNumber')}
          required
        />

        <FormInput
          label={t('accounts.accountName')}
          value={formData().name}
          onChange={(value) => updateFormData('name', value)}
          placeholder={t('accounts.accountName')}
          required
        />

        <FormSelect
          label={t('accounts.accountType')}
          value={formData().accountType}
          onChange={(value) => {
            updateFormData('accountType', value)
            let acT = accountTypeOptions.filter(d => d.value === value)?.[0];
            updateFormData('type', acT.type);
            updateFormData('classification', acT.classification);

          }}
          options={accountTypeOptions}
          required
        />

        <FormSelect
          label={t('accounts.category')}
          value={formData().category}
          onChange={(value) => updateFormData('category', value)}
          options={getCategoryOptions()}
          required
        />

        <FormInput
          label={t('common.description')}
          value={formData().description}
          onChange={(value) => updateFormData('description', value)}
          placeholder={t('common.description')}
        />


        <FormSelect
          label={t('common.status')}
          value={formData().isActive}
          onChange={(value) => updateFormData('isActive', value)}
          options={activeOptions}
          required
        />

        {/* Piggybank Option - for payment/collection accounts */}
        <div style={{
          'margin-top': '1.5rem',
          'padding': '1rem',
          'background': formData().isPiggybank ? '#e3f2fd' : 'var(--gray-50)',
          'border-radius': 'var(--border-radius-sm)',
          'border': formData().isPiggybank ? '2px solid #1976d2' : '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
            <input
              type="checkbox"
              id="isPiggybank"
              checked={formData().isPiggybank}
              onChange={(e) => setFormData(prev => ({ ...prev, isPiggybank: e.target.checked }))}
            />
            <label for="isPiggybank" style={{ 'font-weight': '600', cursor: 'pointer' }}>
              {t('accounts.isPiggybank', 'Cuenta de Caja/Banco (Piggybank)')}
            </label>
          </div>
          <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)', 'margin-bottom': '0.75rem' }}>
            {t('accounts.piggybankHint', 'Marcar esta cuenta para usarla en pagos y cobros (efectivo, bancos, cajas registradoras)')}
          </div>

          <Show when={formData().isPiggybank}>
            <FormInput
              label={t('accounts.piggybankLabel', 'Etiqueta para mostrar')}
              value={formData().piggybankLabel}
              onChange={(value) => setFormData(prev => ({ ...prev, piggybankLabel: value }))}
              placeholder={t('accounts.piggybankLabelPlaceholder', 'Ej: Caja Principal, Banco Popular, etc.')}
            />
          </Show>
        </div>

        {/* Account Capacity Options */}
        <div style={{
          'margin-top': '1.5rem',
          'padding': '1rem',
          'background': 'var(--gray-50)',
          'border-radius': 'var(--border-radius-sm)',
          'border': '1px solid var(--border-color)',
          'display': 'flex',
          'flex-direction': 'column',
          'gap': '0.75rem'
        }}>
          {/* Default Account */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="editIsDefault"
              checked={formData().isDefault}
              onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
            />
            <label for="editIsDefault" style={{ 'font-weight': '600', cursor: 'pointer' }}>
              {t('accounts.isDefault', 'Default Account')}
            </label>
          </div>
          <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)', 'margin-left': '1.75rem' }}>
            {t('accounts.defaultHint', 'Mark as default account for operations')}
          </div>

          {/* Shared Account */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="editIsShared"
              checked={formData().isShared}
              onChange={(e) => setFormData(prev => ({ ...prev, isShared: e.target.checked }))}
            />
            <label for="editIsShared" style={{ 'font-weight': '600', cursor: 'pointer' }}>
              {t('accounts.isShared', 'Shared Account')}
            </label>
          </div>
          <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)', 'margin-left': '1.75rem' }}>
            {t('accounts.sharedHint', 'Share this account across users/scopes')}
          </div>
        </div>

        {/* Layer Assignment Section */}
        <div style={{
          'margin-top': '1.5rem',
          'padding': '1rem',
          'background': enableLayerAssignment()
            ? 'linear-gradient(135deg, #6366f115 0%, #8b5cf615 100%)'
            : 'linear-gradient(135deg, #6366f108 0%, #8b5cf608 100%)',
          'border-radius': 'var(--border-radius-sm)',
          'border': enableLayerAssignment() ? '2px solid #6366f150' : '1px solid #6366f130'
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.75rem' }}>
            <input
              type="checkbox"
              id="editEnableLayerAssignment"
              checked={enableLayerAssignment()}
              onChange={(e) => setEnableLayerAssignment(e.target.checked)}
            />
            <label for="editEnableLayerAssignment" style={{ 'font-weight': '600', cursor: 'pointer', color: '#6366f1' }}>
              🎯 {t('accounts.assignToLayer', 'Assign to Accounting Layer')}
            </label>
            <Show when={existingLayerAssignment()}>
              <span style={{
                'padding': '2px 8px',
                'border-radius': '4px',
                'font-size': '10px',
                'font-weight': '600',
                'background': '#10b98120',
                'color': '#10b981'
              }}>
                ASSIGNED
              </span>
            </Show>
          </div>
          <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
            {t('accounts.layerHint', 'Link this account to the 9-layer accounting engine for automatic rule matching')}
          </div>

          <Show when={enableLayerAssignment()}>
            <Show when={loadingLayers()}>
              <div style={{ 'text-align': 'center', 'padding': '1rem', color: '#64748b' }}>
                Loading layers...
              </div>
            </Show>

            <Show when={!loadingLayers() && layerOptions().length > 0}>
              {/* Layer Selection */}
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={{ 'font-size': '0.85rem', 'font-weight': '600', 'margin-bottom': '0.5rem', display: 'block' }}>
                  Select Layer
                </label>
                <select
                  value={selectedLayer()}
                  onChange={(e) => handleLayerChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)',
                    'font-size': '0.9rem'
                  }}
                >
                  <option value="">-- Select a layer --</option>
                  <For each={layerOptions()}>
                    {(layer) => (
                      <option value={layer.id}>
                        {layer.name} - {layer.description}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              {/* Selected Layer Info */}
              <Show when={getSelectedLayerDetails()}>
                {(layer) => (
                  <div style={{
                    'background': '#fff',
                    'padding': '0.75rem',
                    'border-radius': '6px',
                    'margin-bottom': '1rem',
                    'border': '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                      <span style={{
                        'padding': '2px 8px',
                        'border-radius': '4px',
                        'font-size': '11px',
                        'font-weight': '600',
                        'background': layer().defaultSide === 'debit' ? '#3b82f615' : '#10b98115',
                        'color': layer().defaultSide === 'debit' ? '#3b82f6' : '#10b981'
                      }}>
                        {layer().defaultSide?.toUpperCase()}
                      </span>
                      <span style={{ 'font-size': '0.85rem', color: '#64748b' }}>
                        Account Type: <strong>{layer().accountType}</strong>
                      </span>
                    </div>

                    {/* Criteria Fields */}
                    <Show when={layer().criteriaFields?.length > 0}>
                      <div style={{ 'margin-top': '0.75rem' }}>
                        <div style={{ 'font-size': '0.8rem', 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#475569' }}>
                          Matching Criteria:
                        </div>
                        <For each={layer().criteriaFields}>
                          {(field) => (
                            <div style={{ 'margin-bottom': '0.5rem' }}>
                              <label style={{ 'font-size': '0.8rem', color: '#64748b', display: 'block', 'margin-bottom': '0.25rem' }}>
                                {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                              </label>
                              <select
                                value={layerCriteria()[field.field] || ''}
                                onChange={(e) => updateCriteria(field.field, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.4rem',
                                  'border-radius': '4px',
                                  border: '1px solid #e2e8f0',
                                  'font-size': '0.85rem'
                                }}
                              >
                                <option value="">-- Select --</option>
                                <For each={field.options}>
                                  {(opt) => (
                                    <option value={opt.value}>{opt.label}</option>
                                  )}
                                </For>
                              </select>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                )}
              </Show>
            </Show>

            <Show when={!loadingLayers() && layerOptions().length === 0}>
              <div style={{ 'text-align': 'center', 'padding': '1rem', color: '#94a3b8', 'font-size': '0.85rem' }}>
                No layer options available
              </div>
            </Show>
          </Show>
        </div>

        {validationError() && (
          <div style={{
            padding: '1rem',
            'border-radius': 'var(--border-radius-sm)',
            'margin-top': '1rem',
            background: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb'
          }}>
            {validationError()}
          </div>
        )}

        <div style={buttonGroupStyle}>
          <Button
            variant="outline"
            type="button"
            onClick={handleDelete}
            style={{
              color: '#dc3545',
              'border-color': '#dc3545',
              'margin-right': 'auto'
            }}
          >
            {t('accounts.deleteAccount')}
          </Button>
          <Button variant="secondary" type="button" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditAccountModal;