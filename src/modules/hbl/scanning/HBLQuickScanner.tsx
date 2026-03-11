import { Component, createSignal, Show } from 'solid-js';
import { EnhancedBarcodeScanner } from '../../scanner';
import { updateHBLStatus, statusAllList } from '../status/hblUpdateService';
import { isValidHBL } from '../data/hblParser';
import { devLog } from '../../../services/utils';

interface HBLQuickScannerProps {
  defaultStatusId?: string;
  onHBLScanned?: (hbl: string, success: boolean, statusLabel?: string) => void;
  buttonStyle?: any;
}

const HBLQuickScanner: Component<HBLQuickScannerProps> = (props) => {
  const [isScannerOpen, setIsScannerOpen] = createSignal(false);
  const [selectedStatusId, setSelectedStatusId] = createSignal(props.defaultStatusId || '');
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [lastResult, setLastResult] = createSignal<string>('');

  // Handle scan completion
  const handleScanComplete = async (scannedCode: string) => {
    devLog('HBL quick scan completed:', scannedCode);

    if (!isValidHBL(scannedCode)) {
      setLastResult(`❌ Formato HBL inválido: ${scannedCode}`);
      if (props.onHBLScanned) {
        props.onHBLScanned(scannedCode, false);
      }
      return;
    }

    if (!selectedStatusId()) {
      setLastResult('❌ Ningún estado seleccionado');
      if (props.onHBLScanned) {
        props.onHBLScanned(scannedCode, false);
      }
      return;
    }

    setIsUpdating(true);

    try {
      const result = await updateHBLStatus(
        scannedCode,
        selectedStatusId(),
        `Actualización de escaneo rápido en ${new Date().toLocaleString()}`
      );

      const statusLabel = statusAllList.find(s => s.id === selectedStatusId())?.label || 'Desconocido';

      if (result.success) {
        setLastResult(`✅ ${scannedCode} → ${statusLabel}`);
        if (props.onHBLScanned) {
          props.onHBLScanned(scannedCode, true, statusLabel);
        }
      } else {
        setLastResult(`❌ Error: ${result.error}`);
        if (props.onHBLScanned) {
          props.onHBLScanned(scannedCode, false);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setLastResult(`❌ Error: ${errorMessage}`);
      if (props.onHBLScanned) {
        props.onHBLScanned(scannedCode, false);
      }
    } finally {
      setIsUpdating(false);
      setIsScannerOpen(false);
    }
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    setLastResult(`❌ Error del escáner: ${error}`);
  };

  // Default button style
  const defaultButtonStyle = {
    padding: '0.5rem 1rem',
    'background-color': selectedStatusId() ? '#28a745' : '#6c757d',
    color: 'white',
    border: 'none',
    'border-radius': '6px',
    cursor: selectedStatusId() ? 'pointer' : 'not-allowed',
    'font-size': '0.875rem',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
    ...props.buttonStyle
  };

  const selectStyle = {
    padding: '0.5rem',
    border: '1px solid #ddd',
    'border-radius': '6px',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem',
    width: '100%',
    'max-width': '250px'
  };

  return (
    <div style={{ display: 'inline-block' }}>
      {/* Status Selection */}
      <Show when={!props.defaultStatusId}>
        <select
          style={selectStyle}
          value={selectedStatusId()}
          onChange={(e) => setSelectedStatusId(e.currentTarget.value)}
        >
          <option value="">-- Seleccionar Estado --</option>
          {statusAllList.map(status => (
            <option value={status.id}>
              {status.label} {status.tag ? `(${status.tag})` : ''}
            </option>
          ))}
        </select>
      </Show>

      {/* Quick Scan Button */}
      <button
        style={defaultButtonStyle}
        onClick={() => setIsScannerOpen(true)}
        disabled={!selectedStatusId() || isUpdating()}
      >
        <span style={{ 'font-size': '1.1em' }}>📷</span>
        {isUpdating() ? 'Actualizando...' : 'Escaneo Rápido HBL'}
      </button>

      {/* Last Result Display */}
      <Show when={lastResult()}>
        <div style={{
          'margin-top': '0.5rem',
          padding: '0.5rem',
          'background-color': lastResult().startsWith('✅') ? '#d4edda' : '#f8d7da',
          color: lastResult().startsWith('✅') ? '#155724' : '#721c24',
          border: `1px solid ${lastResult().startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          'border-radius': '4px',
          'font-size': '0.875rem',
          'font-family': 'monospace'
        }}>
          {lastResult()}
        </div>
      </Show>

      {/* Enhanced Barcode Scanner Modal */}
      <EnhancedBarcodeScanner
        isOpen={isScannerOpen()}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanComplete}
        onError={handleScannerError}
        autoLookupLocation={false}
        showHistory={false}
      />
    </div>
  );
};

export default HBLQuickScanner;