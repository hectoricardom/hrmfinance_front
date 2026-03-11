import { Component, createSignal, Show } from 'solid-js';
import BulkMovementModal from './BulkMovementModal';
import BulkMovementReport from './BulkMovementReport';
import { inventoryStore, InventoryMovement } from '../stores/inventoryStore';

interface BulkMovementWithReportProps {
  isOpen: boolean;
  onClose: () => void;
}

const BulkMovementWithReport: Component<BulkMovementWithReportProps> = (props) => {
  const [showModal, setShowModal] = createSignal(true);
  const [showReport, setShowReport] = createSignal(false);
  const [recentMovements, setRecentMovements] = createSignal<InventoryMovement[]>([]);
  const [lastReferenceNumber, setLastReferenceNumber] = createSignal<string>('');

  const handleMovementComplete = (referenceNumber: string) => {
    // Filter movements by the reference number just created
    const movements = inventoryStore.movements.filter(m => 
      m.referenceNumber === referenceNumber || 
      m.invoiceId === referenceNumber ||
      m.ssg_inventory_key === referenceNumber
    );
    
    setRecentMovements(movements);
    setLastReferenceNumber(referenceNumber);
    setShowModal(false);
    setShowReport(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    props.onClose();
  };

  const handleReportClose = () => {
    setShowReport(false);
    props.onClose();
  };

  return (
    <>
      <Show when={showModal()}>
        <BulkMovementModal
          isOpen={props.isOpen && showModal()}
          onClose={handleModalClose}
          onMovementComplete={handleMovementComplete}
        />
      </Show>
      
      <Show when={showReport()}>
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          'z-index': '1000',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            'border-radius': 'var(--border-radius)',
            width: '95%',
            'max-width': '1200px',
            'max-height': '90vh',
            'overflow-y': 'auto',
            position: 'relative'
          }}>
            <div style={{
              padding: '1rem 2rem',
              'border-bottom': '1px solid #e9ecef',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              background: '#f8f9fa'
            }}>
              <h2 style={{ margin: '0' }}>
                Bulk Movement Report - {lastReferenceNumber()}
              </h2>
              <button
                onClick={handleReportClose}
                style={{
                  background: 'none',
                  border: 'none',
                  'font-size': '1.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  'line-height': '1'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1rem' }}>
              <BulkMovementReport
                movements={recentMovements()}
                onClose={handleReportClose}
              />
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default BulkMovementWithReport;