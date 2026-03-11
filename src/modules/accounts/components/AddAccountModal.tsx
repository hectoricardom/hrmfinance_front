import { Component, createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import { AccountingAccount, accountsStore } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';
import { fetchGraphQLSS } from '../../../services/utils';
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

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  layerOptions?: LayerOption[];
}

const AddAccountModal: Component<AddAccountModalProps> = (props) => {
  const { t } = useTranslation();
  const [formData, setFormData] = createSignal({
    accountNumber: '',
    name: '',
    accountType: '' as AccountingAccount['type'] | '',
    category: '',
    type: '',
    classification: '',
    description: '',
    balance: '0',
    isActive: 'true',
    isDefault: false,
    isShared: false
  });

  // Layer assignment state
  const [layerOptions, setLayerOptions] = createSignal<LayerOption[]>([]);
  const [selectedLayer, setSelectedLayer] = createSignal<string>('');
  const [layerCriteria, setLayerCriteria] = createSignal<Record<string, string>>({});
  const [enableLayerAssignment, setEnableLayerAssignment] = createSignal(false);
  const [loadingLayers, setLoadingLayers] = createSignal(false);

  // Fetch layer options (use props if available)
  const fetchLayerOptions = async () => {
    // Use preloaded options if available
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

  // Load layers when modal opens
  createEffect(() => {
    if (props.isOpen && layerOptions().length === 0) {
      fetchLayerOptions();
    }
  });

  // Update layer options when props change
  createEffect(() => {
    if (props.layerOptions && props.layerOptions.length > 0) {
      setLayerOptions(props.layerOptions);
    }
  });

  // Get selected layer details
  const getSelectedLayerDetails = () => {
    return layerOptions().find(l => l.id === selectedLayer()) || null;
  };

  // Update criteria when layer changes
  const handleLayerChange = (layerId: string) => {
    setSelectedLayer(layerId);
    setLayerCriteria({}); // Reset criteria when layer changes
  };

  // Update a criteria field
  const updateCriteria = (field: string, value: string) => {
    setLayerCriteria(prev => ({ ...prev, [field]: value }));
  };

  // Assign layer to account
  const assignAccountLayer = async (accountId: string) => {
    if (!selectedLayer() || !enableLayerAssignment()) return;

    try {
      await fetchGraphQLSS({
        query: 'assignAccountLayer',
        params: { businessId: authStore.getBusinessId() },
        businessId: authStore.getBusinessId(),
        form: {
          accountId,
          layer: selectedLayer(),
          criteria: layerCriteria(),
          reasoning: 'Selected by user during account creation'
        }
      });
      console.log('Layer assigned successfully');
    } catch (error) {
      console.error('Error assigning layer:', error);
    }
  };



  const accountTypeOptions = [
    { value: 'Asset', label: t('accounts.types.asset'), type: "debit", classification: "real" },
    { value: 'Liability', label: t('accounts.types.liability'), type: "credit", classification: "real" },
    { value: 'Equity', label: t('accounts.types.equity'), type: "credit", classification: "real" },
    { value: 'Revenue', label: t('accounts.types.revenue'), type: "credit", classification: "nominal" },
    { value: 'Expense', label: t('accounts.types.expense'), type: "debit", classification: "nominal" }
  ];



  /*

  10550 NW 78th ST, APT 6-511, Doral, FL 33178  
  
    Sales Revenue - Physical products
Service Revenue - Professional services
Subscription Revenue - Recurring fees
Rental Revenue - Property/equipment leasing
Commission Revenue - Agent/broker fees
Franchise Revenue - Franchise fees
Licensing Revenue - IP/brand usage
  
  */

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
        { value: 'Operating Revenue', label: t('accounts.categories.operatingRevenue') },
        { value: 'Sales Revenue', label: t('accounts.categories.salesRevenue') },
        { value: 'Service Revenue', label: t('accounts.categories.servicesRevenue') },
        { value: 'Subscription Revenue', label: t('accounts.categories.subscriptionRevenue') },
        { value: 'Rental Revenue', label: t('accounts.categories.rentalRevenue') },
        { value: 'Commission Revenue', label: t('accounts.categories.commissionRevenue') },
        { value: 'Franchise Revenue', label: t('accounts.categories.franchiseRevenue') },
        { value: 'Licensing Revenue', label: t('accounts.categories.licensingRevenue') },

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
    const data = formData();

    if (!data.accountNumber || !data.name || !data.accountType || !data.category) {
      alert(t('forms.requiredField'));
      return;
    }

    // Check if account number already exists
    const existingAccount = accountsStore.accounts.find(
      account => account.accountNumber === data.accountNumber
    );

    const findType = accountTypeOptions.find(
      type => type.value === data.accountType
    );

    if (existingAccount) {
      alert(t('forms.duplicateAccountNumber'));
      return;
    }

    const newAccount: Omit<AccountingAccount, 'id' | 'createdDate' | 'lastModified'> = {
      accountNumber: data.accountNumber,
      code: data.accountNumber,
      name: data.name,
      accountType: '' as AccountingAccount['accountType'] | '',
      classification: findType?.classification,
      type: findType?.type,
      category: data.category,
      description: data.description,
      balance: parseFloat(data.balance) || 0,
      isActive: data.isActive === 'true',
      isDefault: data.isDefault,
      isShared: data.isShared
    };

    const createdAccount = await accountsStore.addAccount(newAccount);

    // Assign layer if enabled
    if (enableLayerAssignment() && selectedLayer() && createdAccount?.id) {
      await assignAccountLayer(createdAccount.id);
    }

    // Reset form
    setFormData({
      accountNumber: '',
      name: '',
      accountType: '',
      type: '',
      category: '',
      description: '',
      classification: '',
      balance: '0',
      isActive: 'true',
      isDefault: false,
      isShared: false
    });
    setSelectedLayer('');
    setLayerCriteria({});
    setEnableLayerAssignment(false);

    props.onClose();
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
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('accounts.addAccount')}>
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

        <FormInput
          label={t('accounts.balance')}
          type="number"
          value={formData().balance}
          onChange={(value) => updateFormData('balance', value)}
          placeholder={t('accounts.balance')}
        />

        <FormSelect
          label={t('common.status')}
          value={formData().isActive}
          onChange={(value) => updateFormData('isActive', value)}
          options={activeOptions}
          required
        />

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
              id="isDefault"
              checked={formData().isDefault}
              onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
            />
            <label for="isDefault" style={{ 'font-weight': '600', cursor: 'pointer' }}>
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
              id="isShared"
              checked={formData().isShared}
              onChange={(e) => setFormData(prev => ({ ...prev, isShared: e.target.checked }))}
            />
            <label for="isShared" style={{ 'font-weight': '600', cursor: 'pointer' }}>
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
          'background': 'linear-gradient(135deg, #6366f108 0%, #8b5cf608 100%)',
          'border-radius': 'var(--border-radius-sm)',
          'border': '1px solid #6366f130'
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.75rem' }}>
            <input
              type="checkbox"
              id="enableLayerAssignment"
              checked={enableLayerAssignment()}
              onChange={(e) => setEnableLayerAssignment(e.target.checked)}
            />
            <label for="enableLayerAssignment" style={{ 'font-weight': '600', cursor: 'pointer', color: '#6366f1' }}>
              🎯 {t('accounts.assignToLayer', 'Assign to Accounting Layer')}
            </label>
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

        <div style={buttonGroupStyle}>
          <Button variant="secondary" type="button" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('accounts.addAccount')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAccountModal;