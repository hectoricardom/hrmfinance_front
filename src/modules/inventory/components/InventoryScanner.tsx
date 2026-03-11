import { Component, createSignal, Show } from 'solid-js';
import { InventoryScannerIntegration } from '../../scanner';
import { inventoryStore } from '../stores/inventoryStore';
import { devLog } from '../../../services/utils';

interface InventoryScannerProps {
  onItemFound?: (item: any) => void;
  onItemNotFound?: (barcode: string) => void;
}

const InventoryScanner: Component<InventoryScannerProps> = (props) => {
  const [lastScannedItem, setLastScannedItem] = createSignal<any>(null);
  const [scanError, setScanError] = createSignal<string>('');
  const [isLookingUp, setIsLookingUp] = createSignal(false);

  // Handle successful scan
  const handleScanComplete = async (barcode: string) => {
    devLog('Inventory scan completed:', barcode);
    
    setIsLookingUp(true);
    setScanError('');
    
    try {
      // Look up the item in inventory
      const items = inventoryStore.state.items;
      const foundItem = items.find(item => 
        item.barcode === barcode || 
        item.sku === barcode || 
        item.code === barcode
      );
      
      if (foundItem) {
        setLastScannedItem(foundItem);
        if (props.onItemFound) {
          props.onItemFound(foundItem);
        }
      } else {
        setScanError(`Item not found in inventory: ${barcode}`);
        if (props.onItemNotFound) {
          props.onItemNotFound(barcode);
        }
      }
    } catch (error) {
      console.error('Error looking up inventory item:', error);
      setScanError('Error looking up item in inventory');
    } finally {
      setIsLookingUp(false);
    }
  };

  // Handle location update
  const handleLocationUpdate = async (barcode: string, newLocation: string) => {
    devLog('Updating inventory location:', { barcode, newLocation });
    
    try {
      // Here you would typically update the inventory item's location
      // For now, we'll just log it and update the local state
      if (lastScannedItem() && (lastScannedItem().barcode === barcode || lastScannedItem().sku === barcode)) {
        setLastScannedItem(prev => prev ? { ...prev, location: newLocation } : null);
      }
      
      // You could also call an API to update the location:
      // await inventoryApi.updateItemLocation(barcode, newLocation);
      
    } catch (error) {
      console.error('Error updating inventory location:', error);
      setScanError('Failed to update item location');
    }
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    console.error('Scanner error:', error);
    setScanError(error);
  };

  // Styles
  const containerStyle = {
    padding: '1rem',
    border: '1px solid #ddd',
    'border-radius': '8px',
    'background-color': '#f8f9fa'
  };

  const itemDisplayStyle = {
    padding: '1rem',
    'margin-top': '1rem',
    'background-color': 'white',
    border: '1px solid #28a745',
    'border-radius': '6px'
  };

  const errorStyle = {
    padding: '0.75rem',
    'margin-top': '1rem',
    'background-color': '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    'border-radius': '6px'
  };

  const loadingStyle = {
    'text-align': 'center' as const,
    padding: '1rem',
    color: '#666'
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 1rem 0' }}>📦 Inventory Scanner</h3>
      
      <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
        Scan items to look up inventory details and update locations
      </p>

      {/* Scanner Integration */}
      <InventoryScannerIntegration
        onScanComplete={handleScanComplete}
        onLocationUpdated={handleLocationUpdate}
        onError={handleScannerError}
      />

      {/* Loading State */}
      <Show when={isLookingUp()}>
        <div style={loadingStyle}>
          🔍 Looking up item in inventory...
        </div>
      </Show>

      {/* Error Display */}
      <Show when={scanError()}>
        <div style={errorStyle}>
          ⚠️ {scanError()}
        </div>
      </Show>

      {/* Scanned Item Display */}
      <Show when={lastScannedItem()}>
        <div style={itemDisplayStyle}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#155724' }}>
            ✅ Item Found
          </h4>
          
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.5rem', 'font-size': '0.9rem' }}>
            <div><strong>Name:</strong> {lastScannedItem()?.name || lastScannedItem()?.label}</div>
            <div><strong>SKU:</strong> {lastScannedItem()?.sku || lastScannedItem()?.code}</div>
            <div><strong>Barcode:</strong> {lastScannedItem()?.barcode}</div>
            <div><strong>Quantity:</strong> {lastScannedItem()?.quantity || 0}</div>
            <div><strong>Location:</strong> {lastScannedItem()?.location || 'Not specified'}</div>
            <div><strong>Price:</strong> ${lastScannedItem()?.price || 0}</div>
          </div>

          <Show when={lastScannedItem()?.description}>
            <div style={{ 'margin-top': '0.75rem', 'padding-top': '0.75rem', 'border-top': '1px solid #c3e6cb' }}>
              <strong>Description:</strong> {lastScannedItem()?.description}
            </div>
          </Show>
        </div>
      </Show>

      {/* Usage Instructions */}
      <div style={{ 
        'margin-top': '1rem', 
        'padding-top': '1rem', 
        'border-top': '1px solid #ddd',
        'font-size': '0.875rem',
        color: '#666'
      }}>
        <strong>📋 How to use:</strong>
        <ol style={{ 'margin': '0.5rem 0 0 0', 'padding-left': '1.25rem' }}>
          <li>Click "Scan Inventory Item" to open the camera</li>
          <li>Scan any barcode or QR code on inventory items</li>
          <li>View item details if found in inventory</li>
          <li>Update the item's location if needed</li>
        </ol>
      </div>
    </div>
  );
};

export default InventoryScanner;