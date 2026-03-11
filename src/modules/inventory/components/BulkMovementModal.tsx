import { Component, createSignal, createMemo, For, onMount, Show, createEffect } from 'solid-js';
import { useTranslation } from '../../../translations';
import { FormInput, Modal } from '../../ui';
import { Button } from '../../ui';
import SearchableProductDropdown from './SearchableProductDropdown';
import SearchableProductDropdownWithStock from './SearchableProductDropdownWithStock';
import SearchableLocationDropdown from './SearchableLocationDropdown';
import AddProductModal from './AddProductModal';
import AddLocationModal from './AddLocationModal';
import { inventoryStore, BulkMovementRequest, BulkMovementItem } from '../stores/inventoryStore';
import { devLog, generateRandomId, getTypeFilter } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { providersClientsStore } from '../../providers-clients/stores/providersClientsStore';
import SearchableEntityDropdown from '../../providers-clients/components/SearchableEntityDropdown';
import { accountsStore } from '../../accounts';

interface BulkMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovementComplete?: (referenceNumber: string) => void;
}

const BulkMovementModal: Component<BulkMovementModalProps> = (props) => {
  const { t } = useTranslation();
  const [invoiceId, setInvoiceId] = createSignal(`INV-${Date.now()}`);
  const [referenceNumber, setReferenceNumber] = createSignal('');
  const [movementType, setMovementType] = createSignal<'in' | 'out' | 'transfer' | 'adjustment'>('in');
  const [locationId, setLocationId] = createSignal('');
  const [fromLocationId, setFromLocationId] = createSignal('');
  const [generalNotes, setGeneralNotes] = createSignal('');
  const [items, setItems] = createSignal<BulkMovementItem[]>([]);
  const [validationErrors, setValidationErrors] = createSignal<string[]>([]);
  const [entityId, setEntityId] = createSignal(''); // Provider (for purchases) or Customer (for sales)

  // Payment method and account selection
  const [paymentMethod, setPaymentMethod] = createSignal<'cash' | 'check' | 'transfer' | 'zelle' | 'credit' | 'other'>('cash');
  const [selectedPiggybankId, setSelectedPiggybankId] = createSignal('');
  const [paymentReference, setPaymentReference] = createSignal('');

  // Modal states
  const [isAddProductModalOpen, setIsAddProductModalOpen] = createSignal(false);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = createSignal(false);

  // Selected entity (provider/customer)
  const selectedEntity = createMemo(() => {
    if (!entityId()) return null;
    return providersClientsStore.getEntityById(entityId());
  });

  // Load providers/clients when modal opens
  createEffect(() => {
    if (props.isOpen) {
      providersClientsStore.loadEntities();
    }
  });

  // Get list based on movement type
  const entityOptions = createMemo(() => {
    if (movementType() === 'in') {
      return providersClientsStore.getProviders();
    } else if (movementType() === 'out') {
      return providersClientsStore.getClients();
    }
    return [];
  });

  // Get piggybank accounts for payment source/destination
  const piggybankAccounts = () => {
    return accountsStore.getPiggybankAccounts();
  };

  // Add initial empty item
  const addItem = () => {
    setItems(prev => [...prev, {
      productId: '',
      qty: 0,
      quantity: 0,
      unitCost: 0,
      price: 0,
      salePrice: 0,
      costPrice: 0,
      notes: ''
    }]);
  };

  // Update price based on movement type
  const updateItemPrice = (index: number, value: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      // Set price to the appropriate field based on movement type
      if (movementType() === 'out') {
        // Sales - use salePrice
        return { ...item, price: value, salePrice: value, unitCost: value };
      } else {
        // Entry/Transfer/Adjustment - use costPrice
        return { ...item, price: value, costPrice: value, unitCost: value };
      }
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BulkMovementItem, value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const resetForm = () => {
    setInvoiceId(`INV-${Date.now()}`);
    setReferenceNumber('');
    setMovementType('in');
    setLocationId('');
    setFromLocationId('');
    setGeneralNotes('');
    setItems([]);
    setValidationErrors([]);
    setEntityId('');
    setPaymentMethod('cash');
    setSelectedPiggybankId('');
    setPaymentReference('');
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setValidationErrors([]);

    // Basic validation
    const errors: string[] = [];
    
    if (!referenceNumber()) {
      errors.push(t('forms.referenceNumberRequired'));
    }
    
    if (!locationId()) {
      errors.push(t('forms.locationRequired'));
    }
    
    if (movementType() === 'transfer' && !fromLocationId()) {
      errors.push(t('forms.fromLocationRequired'));
    }
    
    if (items().length === 0) {
      errors.push(t('forms.atLeastOneProduct'));
    }
    devLog(items())
    // Validate items
    items().forEach((item, index) => {
     
      if (!item.productId) {
        errors.push(t('forms.itemProductRequired', 'Product is required for item {{index}}', { index: index + 1 }));
      }
      if (item.qty <= 0) {
        errors.push(t('forms.itemQuantityRequired', 'Quantity must be greater than 0 for item {{index}}', { index: index + 1 }));
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Create bulk movement request
    const entity = selectedEntity();
    const selectedAccount = piggybankAccounts().find(a => a.id === selectedPiggybankId());
    const bulkRequest: BulkMovementRequest = {
      ssg_inventory_key: generateRandomId(),
      invoiceId: invoiceId(),
      referenceNumber: referenceNumber(),
      document: referenceNumber(),
      businessId: authStore.getBusinessId(),
      movementType: movementType(),
      type: getTypeFilter(movementType()),
      locationId: locationId(),
      fromLocationId: movementType() === 'transfer' ? fromLocationId() : undefined,
      items: items(),
      products: items(),
      generalNotes: generalNotes(),
      description:  generalNotes(),
      invoice: referenceNumber(),
      store: locationId(),
      createdBy: 'admin',
      createDate:  new Date().toISOString(),
      // Provider/Customer info
      entityId: entity?.id,
      entityName: entity?.name,
      entityType: entity?.type,
      // Payment info
      paymentMethod: paymentMethod(),
      paymentReference: paymentReference(),
      paymentAccountId: selectedAccount?.accountId || selectedAccount?.id,
      paymentAccountName: selectedAccount?.name,
      paymentAccountNumber: selectedAccount?.accountNumber
    };


    const result = await inventoryStore.addBulkInventoryMovements(bulkRequest);
    devLog(result);
    if (result.success) {
      // Call the completion callback with the reference number
      if (props.onMovementComplete) {
        props.onMovementComplete(referenceNumber());
      } else {
        resetForm();
        props.onClose();
      }
    } else {
      setValidationErrors(result.errors);
    }
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const totalValue = createMemo(() => {
    return items().reduce((sum, item) => {
      const product = inventoryStore.getProductById(item.productId);
      const unitCost = item.unitCost || product?.unitCost || 0;
      return sum + (item.qty * unitCost);
    }, 0);
  });

  const totalItems = createMemo(() => {
    return items().reduce((sum, item) => sum + item.qty, 0);
  });


  const addBulk = async () => {
    return items().reduce((sum, item) => sum + item.qty, 0);
  };


  // Styles
  const formGroupStyle = {
    'margin-bottom': '1.5rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.5rem',
    'font-weight': '500',
    color: 'var(--text-primary)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const itemRowStyle = {
    display: 'grid',
    gap: '0.5rem',
    'align-items': 'end',
    'margin-bottom': '0.5rem',
    padding: '0.75rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };
  
  const itemRowStyle2 = {
    display: 'grid',
    'grid-template-columns': '2fr 1fr 1fr 2fr auto',
    gap: '0.5rem',
    'align-items': 'end',
    'margin-bottom': '0.5rem',
    padding: '0.75rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };
  const itemHeaderStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 1fr 1fr 2fr auto',
    gap: '0.5rem',
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'margin-bottom': '0.5rem',
    'padding-left': '0.75rem'
  };

  const summaryStyle = {
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '1rem'
  };

  const summaryRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'margin-bottom': '0.5rem'
  };

  const errorStyle = {
    color: '#f44336',
    'font-size': '0.875rem',
    'margin-bottom': '1rem'
  };

  const buttonGroupStyle = {
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

  const getMovementTypeLabel = (type: string) => {
    const labels = {
      'in': t('inventory.purchaseReceive'),
      'out': t('inventory.saleIssue'),
      'transfer': t('inventory.transfer'),
      'adjustment': t('inventory.adjustment')
    };
    return labels[type as keyof typeof labels] || type;
  };


  const Initialize = async (qry: string) => {
    await inventoryStore.fecthInventory(qry)
    await inventoryStore.fecthProduct(qry)
  }
  

  onMount(()=>{
    let qry = authStore.getBusinessId();
    Initialize(qry);
  })

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title={t('inventory.bulkMovement')} maxWidth='86vw'>
      <form onSubmit={handleSubmit}>
        {/* Header Information */}
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1.5rem' }}>
          <div>
            <label style={labelStyle}>{t('common.invoiceDocumentId')} *</label>
            <input
              type="text"
              style={inputStyle}
              value={invoiceId()}
              onChange={(e) => setInvoiceId(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>{t('taxPortal.document', 'Documento')} *</label>
            <input
              type="text"
              style={inputStyle}
              value={referenceNumber()}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={t('taxPortal.document')}
              required
            />
          </div>
        </div>

        {/* Movement Type */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('inventory.movementType')} *</label>
          <select
            style={selectStyle}
            value={movementType()}
            onChange={(e) => setMovementType(e.target.value as any)}
            required
          >
            <option value="in">{t('inventory.purchaseReceive')}</option>
            <option value="out">{t('inventory.saleIssue')}</option>
            <option value="transfer">{t('inventory.transfer')}</option>
            <option value="adjustment">{t('inventory.adjustment')}</option>
          </select>
        </div>

        {/* Provider/Customer Selection */}
        {(movementType() === 'in' || movementType() === 'out') && (
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {movementType() === 'in'
                ? t('inventory.provider', 'Proveedor')
                : t('inventory.customer', 'Cliente')}
            </label>
            <SearchableEntityDropdown
              value={entityId()}
              onChange={(entity) => setEntityId(entity?.id || '')}
              entityType={movementType() === 'in' ? 'provider' : 'customer'}
              placeholder={movementType() === 'in'
                ? t('inventory.searchProvider', 'Buscar proveedor...')
                : t('inventory.searchCustomer', 'Buscar cliente...')}
            />
            {selectedEntity() && (
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.875rem',
                color: 'var(--text-muted)',
                padding: '0.5rem',
                background: 'var(--background-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                {selectedEntity()?.email && <span style={{ 'margin-right': '1rem' }}>📧 {selectedEntity()?.email}</span>}
                {selectedEntity()?.phone && <span>📞 {selectedEntity()?.phone}</span>}
              </div>
            )}
          </div>
        )}

        {/* Payment Method & Destination Account - Only for in/out movements */}
        {(movementType() === 'in' || movementType() === 'out') && (
          <div style={{
            padding: '1rem',
            background: '#f5f5f5',
            'border-radius': 'var(--border-radius-md)',
            'margin-bottom': '1.5rem',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              'font-weight': '600',
              'margin-bottom': '0.75rem',
              'font-size': '0.9rem',
              color: 'var(--text-primary)'
            }}>
              {movementType() === 'in'
                ? t('inventory.paymentMethodAndSource', 'Método de Pago y Cuenta Origen')
                : t('inventory.paymentMethodAndDestination', 'Método de Pago y Cuenta Destino')
              }
            </div>

            {/* Payment Method Buttons */}
            <div style={{ 'margin-bottom': '1rem' }}>
              <label style={labelStyle}>{t('providersClients.paymentMethod', 'Método de Pago')}</label>
              <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                {[
                  { value: 'cash', label: t('providersClients.cash', 'Efectivo'), icon: '💵' },
                  { value: 'check', label: t('providersClients.check', 'Cheque'), icon: '📝' },
                  { value: 'transfer', label: t('providersClients.transfer', 'Transferencia'), icon: '🏦' },
                  { value: 'zelle', label: 'Zelle', icon: '⚡' },
                  { value: 'credit', label: t('providersClients.credit', 'Crédito'), icon: '📋' },
                ].map((method) => (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(method.value as any)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: paymentMethod() === method.value
                        ? '2px solid #1976d2'
                        : '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      background: paymentMethod() === method.value ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      'font-size': '0.875rem',
                      'font-weight': paymentMethod() === method.value ? '600' : '400',
                      color: paymentMethod() === method.value ? '#1565c0' : 'var(--text-primary)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.375rem'
                    }}
                  >
                    <span>{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Reference */}
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
              <div>
                <label style={labelStyle}>{t('providersClients.reference', 'Referencia')}</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={paymentReference()}
                  onInput={(e) => setPaymentReference(e.currentTarget.value)}
                  placeholder={paymentMethod() === 'check'
                    ? t('providersClients.checkNumberPlaceholder', 'No. de cheque')
                    : paymentMethod() === 'transfer' || paymentMethod() === 'zelle'
                    ? t('providersClients.confirmationPlaceholder', 'No. confirmación')
                    : t('providersClients.referencePlaceholder', 'Referencia (opcional)')
                  }
                />
              </div>
            </div>

            {/* Piggybank Account Selection */}
            <div style={{ 'margin-bottom': 0 }}>
              <label style={labelStyle}>
                {paymentMethod() === 'credit'
                  ? t('inventory.creditAccount', 'Cuenta de Crédito')
                  : paymentMethod() === 'cash'
                  ? t('providersClients.cashRegister', 'Caja / Cuenta Efectivo')
                  : paymentMethod() === 'check'
                  ? t('providersClients.bankForCheck', 'Banco')
                  : t('providersClients.bankAccount', 'Cuenta Bancaria')
                }
              </label>
              <Show
                when={piggybankAccounts().length > 0}
                fallback={
                  <div style={{
                    padding: '0.75rem',
                    background: '#fff3e0',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.8rem',
                    color: '#e65100'
                  }}>
                    {t('providersClients.noPiggybankAccounts', 'No hay cuentas de caja/banco configuradas. Configure cuentas como "Piggybank" en el módulo de cuentas.')}
                  </div>
                }
              >
                <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                  <For each={piggybankAccounts()}>
                    {(account) => (
                      <button
                        type="button"
                        onClick={() => setSelectedPiggybankId(account.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: selectedPiggybankId() === account.id
                            ? movementType() === 'in' ? '2px solid #d32f2f' : '2px solid #388e3c'
                            : '1px solid var(--border-color)',
                          'border-radius': 'var(--border-radius-sm)',
                          background: selectedPiggybankId() === account.id
                            ? movementType() === 'in' ? '#ffebee' : '#e8f5e9'
                            : 'white',
                          cursor: 'pointer',
                          'font-size': '0.875rem',
                          'font-weight': selectedPiggybankId() === account.id ? '600' : '400',
                          color: selectedPiggybankId() === account.id
                            ? movementType() === 'in' ? '#c62828' : '#2e7d32'
                            : 'var(--text-primary)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ 'font-weight': '500' }}>
                          {account.piggybankLabel || account.name}
                        </div>
                        <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                          {account.accountNumber}
                        </div>
                      </button>
                    )}
                  </For>
                </div>
                <Show when={!selectedPiggybankId() && paymentMethod() !== 'credit'}>
                  <div style={{ 'font-size': '0.75rem', color: '#ff9800', 'margin-top': '0.5rem' }}>
                    {movementType() === 'in'
                      ? t('inventory.selectPaymentSourceAccount', 'Seleccione la cuenta desde donde se realizará el pago')
                      : t('inventory.selectPaymentDestAccount', 'Seleccione la cuenta donde se recibirá el pago')
                    }
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        )}

        {/* Locations */}
        <div style={{ display: 'grid', 'grid-template-columns':(movementType() === 'transfer'  ) ? '1fr 1fr' : '1fr', gap: '1rem', 'margin-bottom': '1.5rem' }}>
          {(movementType() === 'transfer' )  && (
            <div>
              <label style={labelStyle}>{t('inventory.fromLocation')} *</label>
              <SearchableLocationDropdown
                value={fromLocationId()}
                onChange={(selectedLocationId) => {
                  // Clear items when source location changes (products may not have stock in new location)
                  if (fromLocationId() !== selectedLocationId && items().length > 0) {
                    if (confirm(t('inventory.clearItemsOnLocationChange', 'Changing source location will clear the current product list. Continue?'))) {
                      setItems([]);
                    } else {
                      return; // Don't change location if user cancels
                    }
                  }
                  setFromLocationId(selectedLocationId);
                }}
                placeholder={t('inventory.searchSourceLocation')}
                onAddNew={() => setIsAddLocationModalOpen(true)}
                required
              />
            </div>
          )}
          
          <div>
            <label style={labelStyle}>
              {(movementType() === 'transfer' ) ? t('inventory.toLocation') + ' *' : t('inventory.location') + ' *'}
            </label>
            <SearchableLocationDropdown
              value={locationId()}
              onChange={(selectedLocationId) => setLocationId(selectedLocationId)}
              placeholder={movementType() === 'transfer' ? t('inventory.searchDestinationLocation') : t('inventory.searchLocation')}
              onAddNew={() => setIsAddLocationModalOpen(true)}
              required
            />
          </div>
        </div>

        {/* Products Section */}
        <div style={formGroupStyle}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h3 style={{ margin: '0', 'font-size': '1.1rem' }}>{t('inventory.products')}</h3>
            <Button
              variant="outline"
              type="button"
              onClick={addItem}
              disabled={movementType() === 'transfer' && !fromLocationId()}
            >
              {t('inventory.addProduct')}
            </Button>
          </div>

          {/* Show message when transfer mode but no source location selected */}
          {movementType() === 'transfer' && !fromLocationId() && (
            <div style={{
              padding: '1rem',
              'margin-bottom': '1rem',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              'border-radius': 'var(--border-radius-sm)',
              color: '#856404',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <span style={{ 'font-size': '1.25rem' }}>⚠️</span>
              <span>{t('inventory.selectSourceLocationFirst', 'Please select a source location (From) first to see available products.')}</span>
            </div>
          )}

          {items().length > 0 && (
            <>
              <div style={itemHeaderStyle}>
                <div>{t('inventory.product')}</div>
                <div>{t('inventory.quantity')}</div>
                <div>{movementType() === 'out' ? t('inventory.salePrice', 'Precio Venta') : t('inventory.costPrice', 'Precio Costo')}</div>
                <div>{t('common.notes')}</div>
                <div></div>
              </div>

              <For each={items()}>
                {(item, index) => (
                  <>
                  <div style={itemRowStyle}>
                    {/* Use different dropdown for transfers vs other movement types */}
                    <Show
                      when={(movementType() === 'transfer'  || movementType() === 'out')}
                      fallback={
                        <SearchableProductDropdown
                          value={item.productId}
                          onChange={(selectedProductId) => {
                            updateItem(index(), 'productId', selectedProductId.id);
                            let prod = {
                              'id': selectedProductId.id,
                              'label': selectedProductId.name,
                              'code': selectedProductId.sku
                            }
                            updateItem(index(), 'product', prod);

                            // Auto-fill unit cost when product is selected
                            const product = inventoryStore.getProductById(selectedProductId.id);
                            if (product && !item.unitCost) {
                              updateItem(index(), 'unitCost', product.unitCost);
                            }
                          }}
                          placeholder={t('inventory.searchProduct')}
                          onAddNew={() => setIsAddProductModalOpen(true)}
                          required
                        />
                      }
                    >
                      {/* Transfer mode: Use dropdown that fetches products with stock from server */}
                      <SearchableProductDropdownWithStock
                        value={item.productId}
                        storeId={fromLocationId()}
                        onChange={(selectedProduct) => {
                          updateItem(index(), 'productId', selectedProduct.id);
                          let prod = {
                            'id': selectedProduct.id,
                            'label': selectedProduct.name,
                            'code': selectedProduct.sku || selectedProduct.code
                          }
                          updateItem(index(), 'product', prod);

                          // Auto-fill unit cost from selected product
                          if (selectedProduct.unitCost && !item.unitCost) {
                            updateItem(index(), 'unitCost', selectedProduct.unitCost);
                          }
                        }}
                        placeholder={t('inventory.searchProductFromLocation', 'Search products with stock in source location...')}
                        onAddNew={() => setIsAddProductModalOpen(true)}
                        required
                      />
                    </Show>
                  </div>
                  <div style={itemRowStyle2}>

                    <FormInput
                      type="number"
                      style={inputStyle}
                      value={item.quantity}
                      onChange={(e) => updateItem(index(), 'qty', Number(e))}
                      min="0"
                      step="1"
                      required
                    />

                    <FormInput
                      type="number"
                      style={inputStyle}
                      value={item.unitCost}
                      onChange={(e) => updateItemPrice(index(), Number(e))}
                      min="0"
                      step="0.01"
                      placeholder={movementType() === 'out'
                        ? t('inventory.salePrice', 'Precio Venta')
                        : t('inventory.costPrice', 'Precio Costo')}
                    />

                     <FormInput
                      type="text"
                      style={inputStyle}
                      value={item.notes}
                      onChange={(e) => updateItem(index(), 'notes', e)}
                      placeholder={t('common.optionalNotes')}
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => removeItem(index())}
                      style={{ color: '#f44336', 'border-color': '#f44336' }}
                    >
                      {t('common.remove')}
                    </Button>
                  </div>
                  </>
                )}
              </For>
            </>
          )}

          {items().length === 0 && (
            <div style={{ 
              'text-align': 'center', 
              padding: '2rem',
              background: 'var(--background-color)',
              'border-radius': 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)'
            }}>
              {t('inventory.noProductsAdded')}
            </div>
          )}
        </div>

        {/* Summary */}
        {items().length > 0 && (
          <div style={summaryStyle}>
            <h4 style={{ margin: '0 0 1rem 0', 'font-size': '1rem' }}>{t('common.summary')}</h4>
            <div style={summaryRowStyle}>
              <span>{t('inventory.totalProducts')}:</span>
              <span style={{ 'font-weight': '600' }}>{items().length}</span>
            </div>
            <div style={summaryRowStyle}>
              <span>{t('inventory.totalItems')}:</span>
              <span style={{ 'font-weight': '600' }}>{totalItems()}</span>
            </div>
            <div style={summaryRowStyle}>
              <span>{t('inventory.totalValue')}:</span>
              <span style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                {formatCurrency(totalValue())}
              </span>
            </div>
            <div style={summaryRowStyle}>
              <span>{t('inventory.movementType')}:</span>
              <span style={{ 'font-weight': '600' }}>{getMovementTypeLabel(movementType())}</span>
            </div>
          </div>
        )}

        {/* General Notes */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('common.generalNotes')}</label>
          <textarea
            style={{
              ...inputStyle,
              'min-height': '80px',
              resize: 'vertical'
            }}
            value={generalNotes()}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder={t('inventory.generalNotesPlaceholder')}
          />
        </div>

        {/* Validation Errors */}
        {validationErrors().length > 0 && (
          <div style={errorStyle}>
            <For each={validationErrors()}>
              {(error) => <div>• {error}</div>}
            </For>
          </div>
        )}

        <div style={buttonGroupStyle}>
          <Button variant="secondary" type="button" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('inventory.createMovement')}
          </Button>
        </div>
      </form>
      
      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen()}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductAdded={(productId) => {
          // Add the new product to the current item being edited
          setIsAddProductModalOpen(false);
        }}
      />
      
      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddLocationModalOpen()}
        onClose={() => setIsAddLocationModalOpen(false)}
        onLocationAdded={(locationId) => {
          if (movementType() === 'transfer' && !fromLocationId()) {
            setFromLocationId(locationId);
          } else {
            setLocationId(locationId);
          }
          setIsAddLocationModalOpen(false);
        }}
      />
    </Modal>
  );
};

export default BulkMovementModal;