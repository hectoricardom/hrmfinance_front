import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal, Button } from '../../ui';
import BulkMovementReport from './BulkMovementReport';
import { inventoryStore, InventoryMovement } from '../stores/inventoryStore';

interface HistoricalBulkReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistoricalBulkReportsModal: Component<HistoricalBulkReportsModalProps> = (props) => {
  const { t } = useTranslation();
  const [selectedGroup, setSelectedGroup] = createSignal<string>('');
  const [showReport, setShowReport] = createSignal(false);

  // Group movements by reference number/ID
  const bulkMovementGroups = createMemo(() => {
    const movements = inventoryStore.movements;
    const groups = new Map<string, {
      referenceNumber: string;
      movements: InventoryMovement[];
      totalItems: number;
      totalValue: number;
      createdDate: string;
      movementType: string;
    }>();

    movements.forEach(movement => {
      const groupKey = movement.referenceNumber || movement.invoiceId || movement.ssg_inventory_key || 'UNKNOWN';
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          referenceNumber: groupKey,
          movements: [],
          totalItems: 0,
          totalValue: 0,
          createdDate: movement.createdDate,
          movementType: movement.movementType
        });
      }

      const group = groups.get(groupKey)!;
      group.movements.push(movement);
      group.totalItems += movement.quantity;
      group.totalValue += movement.totalCost;
      
      // Keep the earliest date
      if (new Date(movement.createdDate) < new Date(group.createdDate)) {
        group.createdDate = movement.createdDate;
      }
    });

    return Array.from(groups.values())
      .filter(group => group.movements.length > 1) // Only show bulk movements (multiple items)
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  });

  const selectedMovements = createMemo(() => {
    const group = bulkMovementGroups().find(g => g.referenceNumber === selectedGroup());
    return group ? group.movements : [];
  });

  const handleViewReport = (referenceNumber: string) => {
    setSelectedGroup(referenceNumber);
    setShowReport(true);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSelectedGroup('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getMovementTypeColor = (type: string) => {
    const colors = {
      'in': '#4caf50',
      'out': '#f44336',
      'transfer': '#2196f3',
      'adjustment': '#ff9800'
    };
    return colors[type as keyof typeof colors] || '#666';
  };

  return (
    <>
      <Modal 
        isOpen={props.isOpen && !showReport()} 
        onClose={props.onClose} 
        title={t('inventory.viewHistoricalReports')}
        size="large"
      >
        <div style={{ 'max-height': '70vh', 'overflow-y': 'auto' }}>
          <Show when={bulkMovementGroups().length === 0}>
            <div style={{
              'text-align': 'center',
              padding: '3rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>📊</div>
              <div style={{ 'font-size': '1.1rem', 'margin-bottom': '0.5rem' }}>
                {t('inventory.noBulkReportsFound', 'No bulk movement reports found')}
              </div>
              <div style={{ 'font-size': '0.9rem' }}>
                {t('inventory.bulkReportsAppearHere', 'Bulk movement reports will appear here after you create bulk movements')}
              </div>
            </div>
          </Show>

          <Show when={bulkMovementGroups().length > 0}>
            <div style={{
              display: 'grid',
              gap: '1rem'
            }}>
              <For each={bulkMovementGroups()}>
                {(group) => (
                  <div style={{
                    padding: '1.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius)',
                    background: 'var(--surface-color)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'flex-start',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{ flex: '1' }}>
                        <div style={{
                          display: 'flex',
                          'align-items': 'center',
                          gap: '1rem',
                          'margin-bottom': '0.5rem'
                        }}>
                          <h3 style={{
                            margin: '0',
                            'font-size': '1.1rem',
                            color: 'var(--text-primary)'
                          }}>
                            {group.referenceNumber}
                          </h3>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            'border-radius': '1rem',
                            'font-size': '0.75rem',
                            'font-weight': '500',
                            background: getMovementTypeColor(group.movementType) + '20',
                            color: getMovementTypeColor(group.movementType)
                          }}>
                            {getMovementTypeLabel(group.movementType)}
                          </span>
                        </div>
                        <div style={{
                          color: 'var(--text-muted)',
                          'font-size': '0.875rem'
                        }}>
                          {formatDate(group.createdDate)}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(group.referenceNumber)}
                      >
                        {t('common.view')}
                      </Button>
                    </div>

                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      'margin-bottom': '1rem'
                    }}>
                      <div>
                        <div style={{
                          'font-size': '0.75rem',
                          'font-weight': '500',
                          'text-transform': 'uppercase',
                          color: 'var(--text-muted)',
                          'margin-bottom': '0.25rem'
                        }}>
                          {t('inventory.totalProducts')}
                        </div>
                        <div style={{
                          'font-size': '1.25rem',
                          'font-weight': '600',
                          color: 'var(--primary-color)'
                        }}>
                          {group.movements.length}
                        </div>
                      </div>

                      <div>
                        <div style={{
                          'font-size': '0.75rem',
                          'font-weight': '500',
                          'text-transform': 'uppercase',
                          color: 'var(--text-muted)',
                          'margin-bottom': '0.25rem'
                        }}>
                          {t('inventory.totalItems')}
                        </div>
                        <div style={{
                          'font-size': '1.25rem',
                          'font-weight': '600',
                          color: 'var(--primary-color)'
                        }}>
                          {group.totalItems}
                        </div>
                      </div>

                      <div>
                        <div style={{
                          'font-size': '0.75rem',
                          'font-weight': '500',
                          'text-transform': 'uppercase',
                          color: 'var(--text-muted)',
                          'margin-bottom': '0.25rem'
                        }}>
                          {t('inventory.estimatedValue')}
                        </div>
                        <div style={{
                          'font-size': '1.25rem',
                          'font-weight': '600',
                          color: 'var(--primary-color)'
                        }}>
                          {formatCurrency(group.totalValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Modal>

      {/* Report Modal */}
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
                {t('inventory.bulkMovementReport')} - {selectedGroup()}
              </h2>
              <button
                onClick={handleCloseReport}
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
                movements={selectedMovements()}
                onClose={handleCloseReport}
              />
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default HistoricalBulkReportsModal;