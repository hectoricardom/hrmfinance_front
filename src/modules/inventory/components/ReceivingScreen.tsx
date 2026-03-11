/**
 * ReceivingScreen Component
 *
 * Main screen for inventory receiving with UPC/barcode scanning.
 *
 * Features:
 * - Manual UPC entry and camera scanning
 * - Automatic product lookup (local DB and external API)
 * - New product creation for unknown UPCs
 * - Quantity controls with +/- buttons
 * - Location and bin code selection
 * - Real-time session tracking
 * - List of today's received items
 *
 * Dependencies:
 * - receivingStore: Manages receiving sessions and lookup state
 * - inventoryStore: Product and location data
 * - ProductLookupResult: Displays lookup results
 * - NewProductForm: Modal for creating new products
 * - BarcodeScanner: Camera-based scanning
 *
 * Usage:
 * import { ReceivingScreen } from '../modules/inventory/components';
 * <ReceivingScreen />
 */

import { Component, createSignal, Show, For, onMount, createEffect } from 'solid-js';
import { receivingStore } from '../stores/receivingStore';
import { inventoryStore } from '../stores/inventoryStore';
import { Button, FormInput, FormSelect, Modal } from '../../ui';
import ProductLookupResult from './ProductLookupResult';
import NewProductForm from './NewProductForm';
import { BarcodeScanner } from '../../scanner';
import { NewProductData, ReceivingItem, SupplierInfo } from '../types/receiving';
import { useTranslation } from '../../../translations';
import { providersClientsStore } from '../../providers-clients/stores/providersClientsStore';
import { ProviderClient } from '../../providers-clients/types';
import SearchableLocationDropdown from './SearchableLocationDropdown';
import { devLog } from '../../../services/utils';

const ReceivingScreen: Component = () => {
  const { t } = useTranslation();

  const [showScanner, setShowScanner] = createSignal(false);
  const [showNewProductForm, setShowNewProductForm] = createSignal(false);
  const [manualUpcInput, setManualUpcInput] = createSignal('');
  const [showInvoiceSection, setShowInvoiceSection] = createSignal(false);
  const [suppliers, setSuppliers] = createSignal<ProviderClient[]>([]);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

  // Initialize session on mount and load suppliers
  onMount(async () => {
    if (!receivingStore.currentSession) {
      receivingStore.startSession();
    }
    // Load providers (suppliers)
    try {
      await providersClientsStore.loadEntities();
      const providersList = providersClientsStore.getProviders();
      setSuppliers(providersList);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  });

  // Auto-set location from active locations if only one available
  createEffect(() => {
    if (!receivingStore.selectedLocationId) {
      const activeLocations = inventoryStore.getActiveLocations();
      if (activeLocations.length === 1) {
        receivingStore.setSelectedLocationId(activeLocations[0].id);
      }
    }
  });

  const handleManualUpcSubmit = async () => {
    const upc = manualUpcInput().trim();
    if (!upc) return;
    
    await receivingStore.handleUPCScanned(upc);
    setManualUpcInput('');
  };

  const handleScanComplete = async (upc2: string) => {
    setShowScanner(false);
    const upc = upc2.trim();
    if (!upc) return;
    setManualUpcInput(upc);
    await receivingStore.handleUPCScanned(upc);
    setManualUpcInput('');
  };

  const handleConfirmReceiving = async () => {
    if (receivingStore.lookupState === 'found-api') {
      // Show new product form for API results
      setShowNewProductForm(true);
      return;
    }

    const result = await receivingStore.confirmReceiving(
      receivingStore.quantity,
      receivingStore.selectedLocationId,
      receivingStore.selectedBinCode,
      receivingStore.unitCost > 0 ? receivingStore.unitCost : undefined
    );

    if (result) {
      // Successfully received
      devLog('Item received:', result);
    }
  };

  const handleNewProductSubmit = async (data: NewProductData) => {
    // Update the lookup result with the new product data
    const currentResult = receivingStore.currentLookupResult;
    if (currentResult) {
      currentResult.suggestedData = {
        ...currentResult.suggestedData,
        ...data
      };
    }

    setShowNewProductForm(false);

    // Confirm receiving with the new product data
    const result = await receivingStore.confirmReceiving(
      receivingStore.quantity,
      receivingStore.selectedLocationId,
      receivingStore.selectedBinCode,
      data.unitCost
    );

    if (result) {
      devLog('New product received:', result);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = receivingStore.quantity + delta;
    if (newQty > 0) {
      receivingStore.setQuantity(newQty);
    }
  };

  const handleCreateEntryMovements = async () => {
    setSuccessMessage(null);
    const result = await receivingStore.createEntryMovements();
    if (result.success) {
      setSuccessMessage(result.message);
      // Clear after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      receivingStore.setError(result.message);
    }
  };

  const handleFinalizeSession = async () => {
    setSuccessMessage(null);
    const result = await receivingStore.finalizeSession();
    if (result.success) {
      setSuccessMessage(result.message + ' - Sesión finalizada.');
      // Start a new session
      receivingStore.startSession();
    } else {
      receivingStore.setError(result.message);
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const supplierOptions = () => {
    return [
      { value: '', label: 'Seleccionar proveedor (opcional)' },
      ...suppliers().map(supplier => ({
        value: supplier.id,
        label: supplier.name
      }))
    ];
  };

  const handleSupplierChange = (supplierId: string) => {
    if (!supplierId) {
      receivingStore.setSessionSupplier(null);
      return;
    }
    const supplier = suppliers().find(s => s.id === supplierId);
    if (supplier) {
      const supplierInfo: SupplierInfo = {
        id: supplier.id,
        name: supplier.name,
        taxId: supplier.taxId
      };
      receivingStore.setSessionSupplier(supplierInfo);
    }
  };

  // Update unit cost when product is found
  createEffect(() => {
    const result = receivingStore.currentLookupResult;
    if (result?.product?.unitCost) {
      receivingStore.setUnitCost(result.product.unitCost);
    } else if (result?.suggestedData?.unitCost) {
      receivingStore.setUnitCost(result.suggestedData.unitCost);
    }
  });

  // Styles
  const containerStyle = {
    padding: '2rem',
    'max-width': '1200px',
    margin: '0 auto'
  };

  const headerStyle = {
    'margin-bottom': '2rem',
    'border-bottom': '2px solid var(--border-color)',
    'padding-bottom': '1rem'
  };

  const scannerSectionStyle = {
    padding: '1.5rem',
    'background-color': 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    'box-shadow': 'var(--shadow-sm)',
    'margin-bottom': '1.5rem'
  };

  const inputGroupStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'flex-end',
    'margin-bottom': '1rem'
  };

  const quantityControlsStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const quantityButtonStyle = {
    width: '40px',
    height: '40px',
    'font-size': '1.5rem',
    'border-radius': '50%',
    border: '2px solid var(--primary-color)',
    background: 'white',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-weight': 'bold'
  };

  const quantityDisplayStyle = {
    'font-size': '1.5rem',
    'font-weight': 'bold',
    'min-width': '60px',
    'text-align': 'center' as const
  };

  const confirmButtonStyle = {
    width: '100%',
    padding: '1rem',
    'font-size': '1.125rem',
    'font-weight': 'bold',
    'margin-top': '1rem',
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    color: 'white',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    'box-shadow': 'var(--shadow-sm)'
  };

  const itemsListStyle = {
    'margin-top': '2rem',
    padding: '1.5rem',
    'background-color': 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    'box-shadow': 'var(--shadow-sm)'
  };

  const itemCardStyle = {
    padding: '1rem',
    'margin-bottom': '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'white',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const errorStyle = {
    padding: '0.75rem',
    'margin-top': '0.5rem',
    'background-color': '#fdecea',
    color: '#c0392b',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid #e74c3c'
  };

  const sessionSummaryStyle = {
    padding: '1rem',
    'background-color': '#e8f5e9',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    display: 'flex',
    gap: '2rem',
    'justify-content': 'space-around'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>Recepción de Inventario</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Escanee o ingrese códigos UPC para recibir productos
        </p>
      </div>

      <Show when={receivingStore.currentSession}>
        <div style={sessionSummaryStyle}>
          <div>
            <strong>Items:</strong> {receivingStore.sessionItems.length}
          </div>
          <div>
            <strong>Cantidad Total:</strong> {receivingStore.sessionItems.reduce((sum, item) => sum + item.quantity, 0)}
          </div>
          <div>
            <strong>Sesión:</strong> {formatDateTime(receivingStore.currentSession!.startedAt)}
          </div>
        </div>
      </Show>

      {/* Supplier & Invoice Section */}
      <div style={{
        padding: '1rem',
        'background-color': 'var(--surface-color)',
        'border-radius': 'var(--border-radius-sm)',
        'box-shadow': 'var(--shadow-sm)',
        'margin-bottom': '1rem',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Datos del Proveedor / Factura</h3>
          <Button
            variant="secondary"
            onClick={() => setShowInvoiceSection(!showInvoiceSection())}
          >
            {showInvoiceSection() ? 'Ocultar' : 'Mostrar'} Detalles
          </Button>
        </div>

        {/* Always show supplier selection */}
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <FormSelect
            label="Proveedor"
            value={receivingStore.selectedSupplier?.id || ''}
            onChange={handleSupplierChange}
            options={supplierOptions()}
          />
          <FormInput
            label="No. Factura"
            type="text"
            value={receivingStore.invoiceNumber}
            onChange={(value) => receivingStore.setInvoiceNumber(value)}
            placeholder="Ej: FAC-001234"
          />
        </div>

        <Show when={showInvoiceSection()}>
          <div style={{ 'margin-top': '1rem', display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <FormInput
              label="Fecha de Factura"
              type="date"
              value={receivingStore.invoiceDate}
              onChange={(value) => receivingStore.setInvoiceDate(value)}
            />
            <FormInput
              label="Fecha de Vencimiento"
              type="date"
              value={receivingStore.invoiceDueDate}
              onChange={(value) => receivingStore.setInvoiceDueDate(value)}
            />
            <div style={{ 'grid-column': '1 / -1' }}>
              <FormInput
                label="Notas de la Factura"
                type="text"
                value={receivingStore.invoiceNotes}
                onChange={(value) => receivingStore.setInvoiceNotes(value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
        </Show>
      </div>

      {/* Scanner Input Section */}
      <div style={scannerSectionStyle}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Escanear Producto</h3>

        <div style={inputGroupStyle}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={manualUpcInput()}
              onInput={(e) => setManualUpcInput(e.currentTarget.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualUpcSubmit();
                }
              }}
              placeholder="Ingrese código o use la cámara"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '1rem',
                'font-family': 'inherit',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <Button
            variant="primary"
            onClick={handleManualUpcSubmit}
            disabled={!manualUpcInput().trim()}
          >
            Buscar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowScanner(true)}
          >
            📷 Cámara
          </Button>
        </div>

        {/* Product Lookup Result */}
        <ProductLookupResult
          lookupResult={receivingStore.currentLookupResult}
          lookupState={receivingStore.lookupState}
        />

        <Show when={receivingStore.error}>
          <div style={errorStyle}>
            {receivingStore.error}
          </div>
        </Show>

        {/* Receiving Controls */}
        <Show when={receivingStore.lookupState === 'found-local' || receivingStore.lookupState === 'found-api'}>
          <div style={{ 'margin-top': '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)' }}>
            
            <div style={{ 
              display: 'flex',     
              'align-items': 'center',
              'background-repeat': 'no-repeat',
              'justify-content': 'space-around'
            }}>
              {/* Quantity Controls */}
              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                  Cantidad
                </label>
                <div style={quantityControlsStyle}>
                
              
                
                  <input
                    type="number"
                    min="1"
                    value={receivingStore.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        receivingStore.setQuantity(val);
                      }
                    }}
                    style={{
                      width: '100px',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '1.14rem'
                    }}
                  />
                </div>
              </div>


              {/* Unit Cost Input */}
              <div >
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                  Costo Unitario ($)
                </label>
                <div style={quantityControlsStyle}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receivingStore.unitCost}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        receivingStore.setUnitCost(val);
                      }
                    }}
                    style={{
                      width: '100px',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '1.14rem'
                    }}
                    placeholder="0.00"
                  />
                  <Show when={receivingStore.unitCost > 0 && receivingStore.quantity > 0}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.875rem' }}>
                      Total: <strong>${(receivingStore.unitCost * receivingStore.quantity).toFixed(2)}</strong>
                    </span>
                  </Show>
                </div>
              </div>

            </div>

            {/* Location Dropdown - Searchable for all users */}
            <div style={{ 'margin-bottom': '1rem' }}>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Ubicación <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <SearchableLocationDropdown
                value={receivingStore.selectedLocationId}
                onChange={(value) => receivingStore.setSelectedLocationId(value)}
                placeholder="Buscar ubicación por nombre o código..."
                required
              />
            </div>

            {/* Bin Code Input */}
            <FormInput
              label="Código de Bin (Opcional)"
              type="text"
              value={receivingStore.selectedBinCode}
              onChange={(value) => receivingStore.setSelectedBinCode(value)}
              placeholder="Ej: A-1-5"
            />


            {/* Confirm Button */}
            <button
              onClick={handleConfirmReceiving}
              disabled={
                receivingStore.isSubmitting ||
                !receivingStore.selectedLocationId ||
                receivingStore.quantity <= 0
              }
              style={confirmButtonStyle}
            >
              {receivingStore.isSubmitting ? 'Procesando...' : 'CONFIRMAR RECEPCIÓN'}
            </button>
          </div>
        </Show>

        {/* Show New Product Form option for not-found */}
        <Show when={receivingStore.lookupState === 'not-found'}>
          <div style={{ 'margin-top': '1rem' }}>
            <Button
              variant="primary"
              onClick={() => setShowNewProductForm(true)}
            >
              Crear Nuevo Producto
            </Button>
          </div>
        </Show>
      </div>

      {/* Today's Received Items */}
      <div style={itemsListStyle}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Items Recibidos Hoy</h3>

        <Show when={receivingStore.sessionItems.length === 0}>
          <p style={{ color: 'var(--text-secondary)', 'text-align': 'center', padding: '2rem' }}>
            No hay items recibidos todavía
          </p>
        </Show>

        <For each={receivingStore.sessionItems}>
          {(item: ReceivingItem) => (
            <div style={itemCardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {item.product.name}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                  SKU: {item.product.sku} | Cantidad: {item.quantity} | Ubicación: {item.locationName}
                  {item.binCode && ` | Bin: ${item.binCode}`}
                </div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                  {formatDateTime(item.receivedAt)}
                  {item.isNewProduct && <span style={{ 'margin-left': '0.5rem', color: '#f39c12', 'font-weight': '600' }}>NUEVO</span>}
                </div>
              </div>
              <div style={{ 'text-align': 'right' }}>
                <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                  ${((item.unitCost || 0) * item.quantity).toFixed(2)}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                  ${(item.unitCost || 0).toFixed(2)} c/u
                </div>
              </div>
            </div>
          )}
        </For>

        {/* Success Message */}
        <Show when={successMessage()}>
          <div style={{
            padding: '1rem',
            'margin-top': '1rem',
            'background-color': '#d4edda',
            color: '#155724',
            'border-radius': 'var(--border-radius-sm)',
            border: '1px solid #c3e6cb',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            <span style={{ 'font-size': '1.25rem' }}>✓</span>
            <span>{successMessage()}</span>
          </div>
        </Show>

        {/* Action Buttons */}
        <Show when={receivingStore.sessionItems.length > 0}>
          <div style={{
            'margin-top': '1.5rem',
            padding: '1rem',
            'background-color': '#f8f9fa',
            'border-radius': 'var(--border-radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ 'margin-bottom': '1rem' }}>
              <strong>Resumen de la Sesión:</strong>
              <span style={{ 'margin-left': '1rem' }}>
                {receivingStore.sessionItems.length} productos |
                {receivingStore.sessionItems.reduce((sum, item) => sum + item.quantity, 0)} unidades |
                Total: ${receivingStore.sessionItems.reduce((sum, item) => sum + (item.unitCost || 0) * item.quantity, 0).toFixed(2)}
              </span>
              <Show when={receivingStore.selectedSupplier}>
                <span style={{ 'margin-left': '1rem', color: 'var(--primary-color)' }}>
                  | Proveedor: {receivingStore.selectedSupplier?.name}
                </span>
              </Show>
              <Show when={receivingStore.invoiceNumber}>
                <span style={{ 'margin-left': '0.5rem', color: 'var(--text-secondary)' }}>
                  | Factura: {receivingStore.invoiceNumber}
                </span>
              </Show>
            </div>

            <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
              

              <Button
                variant="primary"
                onClick={handleFinalizeSession}
                disabled={receivingStore.isSubmitting}
              >
                Finalizar Sesión y Crear Entradas
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm('¿Está seguro de cancelar la sesión? Se perderán todos los items.')) {
                    receivingStore.cancelSession();
                    receivingStore.startSession();
                  }
                }}
                disabled={receivingStore.isSubmitting}
              >
                Cancelar Sesión
              </Button>
            </div>
          </div>
        </Show>
      </div>

      {/* Barcode Scanner Modal */}
      <Show when={showScanner()}>
        <Modal
          isOpen={showScanner()}
          onClose={() => setShowScanner(false)}
          title="Escanear Código de Barras"
          maxWidth="600px"
        >
          <BarcodeScanner
            onScan={handleScanComplete}
            onError={(error) => {
              console.error('Scanner error:', error);
              receivingStore.setError(error);
            }}
            isOpen={showScanner()}
            onClose={() => setShowScanner(false)}
          />
        </Modal>
      </Show>

      {/* New Product Form Modal */}
      <Show when={showNewProductForm()}>
        <Modal
          isOpen={showNewProductForm()}
          onClose={() => setShowNewProductForm(false)}
          title="Crear Nuevo Producto"
          maxWidth="600px"
        >
          <NewProductForm
            suggestedData={receivingStore.currentLookupResult?.suggestedData}
            onSubmit={handleNewProductSubmit}
            onCancel={() => setShowNewProductForm(false)}
          />
        </Modal>
      </Show>
    </div>
  );
};

export default ReceivingScreen;
