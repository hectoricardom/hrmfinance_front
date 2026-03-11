import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { Card } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryStore, InventoryMovement } from '../stores/inventoryStore';

interface BulkMovementGroup {
  referenceNumber: string;
  invoiceId: string;
  ssg_inventory_key: string;
  movementType: string;
  locationId: string;
  locationName: string;
  totalItems: number;
  totalQuantity: number;
  createDate: string;
  description: string;
  generalNotes: string;
  movements: InventoryMovement[];
  totalValue: number;
}

interface BulkMovementReportProps {
  movements?: InventoryMovement[];
  onClose?: () => void;
}

const BulkMovementReport: Component<BulkMovementReportProps> = (props) => {
  const { t } = useTranslation();
  
  const [selectedGroup, setSelectedGroup] = createSignal<BulkMovementGroup | null>(null);
  const [sortBy, setSortBy] = createSignal<'date' | 'quantity' | 'value'>('date');
  
  // Group movements by reference number or inventory key
  const bulkMovementGroups = createMemo(() => {
    const movements = props.movements || inventoryStore.movements;
    const groups = new Map<string, BulkMovementGroup>();
    
    movements.forEach(movement => {
      // Use referenceNumber first, fallback to ssg_inventory_key, then invoiceId
      const groupKey = movement.referenceNumber || movement.ssg_inventory_key || movement.invoiceId || 'UNKNOWN';
      
      if (!groups.has(groupKey)) {
        const location = inventoryStore.getLocationById(movement.locationId);
        groups.set(groupKey, {
          referenceNumber: movement.referenceNumber || '',
          invoiceId: movement.invoiceId || '',
          ssg_inventory_key: movement.ssg_inventory_key || '',
          movementType: movement.movementType || 'unknown',
          locationId: movement.locationId || '',
          locationName: location?.name || 'Unknown Location',
          totalItems: 0,
          totalQuantity: 0,
          createDate: movement.createDate || new Date().toISOString(),
          description: movement.description || '',
          generalNotes: movement.generalNotes || '',
          movements: [],
          totalValue: 0
        });
      }
      
      const group = groups.get(groupKey)!;
      group.movements.push(movement);
      group.totalItems++;
      group.totalQuantity += Math.abs(movement.quantity || 0);
      
      // Calculate value if product price is available
      const product = inventoryStore.getProductById(movement.productId);
      if (product && product.unitCost) {
        group.totalValue += Math.abs(movement.quantity || 0) * product.unitCost;
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      switch (sortBy()) {
        case 'quantity':
          return b.totalQuantity - a.totalQuantity;
        case 'value':
          return b.totalValue - a.totalValue;
        case 'date':
        default:
          return new Date(b.createDate).getTime() - new Date(a.createDate).getTime();
      }
    });
  });
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const getMovementTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'in':
      case 'stock_in':
        return '#22c55e';
      case 'out':
      case 'stock_out':
        return '#ef4444';
      case 'transfer':
        return '#3b82f6';
      case 'adjustment':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };
  
  const getMovementTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'in':
      case 'stock_in':
        return '↗️';
      case 'out':
      case 'stock_out':
        return '↙️';
      case 'transfer':
        return '↔️';
      case 'adjustment':
        return '⚖️';
      default:
        return '📦';
    }
  };
  
  const printReport = (group?: BulkMovementGroup) => {
    const targetGroup = group || selectedGroup();
    if (!targetGroup) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Movement Report - ${targetGroup.referenceNumber || targetGroup.invoiceId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .group-info { background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .summary { background: #e8f4fd; padding: 15px; margin-top: 20px; border-radius: 5px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BULK MOVEMENT REPORT</h1>
          <h2>${targetGroup.referenceNumber || targetGroup.invoiceId}</h2>
          <p>Generated: ${formatDate(new Date().toISOString())}</p>
        </div>
        
        <div class="group-info">
          <div class="info-grid">
            <div>
              <strong>Reference Number:</strong> ${targetGroup.referenceNumber || 'N/A'}<br>
              <strong>Invoice ID:</strong> ${targetGroup.invoiceId || 'N/A'}<br>
              <strong>Movement Type:</strong> ${targetGroup.movementType.toUpperCase()}<br>
              <strong>Location:</strong> ${targetGroup.locationName}
            </div>
            <div>
              <strong>Date:</strong> ${formatDate(targetGroup.createDate)}<br>
              <strong>Total Items:</strong> ${targetGroup.totalItems}<br>
              <strong>Total Quantity:</strong> ${targetGroup.totalQuantity}<br>
              <strong>Estimated Value:</strong> ${formatCurrency(targetGroup.totalValue)}
            </div>
          </div>
          ${targetGroup.description ? `<p><strong>Description:</strong> ${targetGroup.description}</p>` : ''}
          ${targetGroup.generalNotes ? `<p><strong>Notes:</strong> ${targetGroup.generalNotes}</p>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product Code</th>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total Value</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${targetGroup.movements.map(movement => {
              const product = inventoryStore.getProductById(movement.productId);
              const unitCost = product?.unitCost || 0;
              const totalValue = Math.abs(movement.quantity || 0) * unitCost;
              
              return `
                <tr>
                  <td>${product?.code || movement.productId}</td>
                  <td>${product?.name || 'Unknown Product'}</td>
                  <td>${movement.quantity || 0}</td>
                  <td>${formatCurrency(unitCost)}</td>
                  <td>${formatCurrency(totalValue)}</td>
                  <td>${movement.notes || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <h3>SUMMARY</h3>
          <p><strong>Total Products:</strong> ${targetGroup.totalItems}</p>
          <p><strong>Total Quantity Moved:</strong> ${targetGroup.totalQuantity}</p>
          <p><strong>Total Estimated Value:</strong> ${formatCurrency(targetGroup.totalValue)}</p>
          <p><strong>Movement Impact:</strong> ${targetGroup.movementType === 'in' ? 'Increased' : targetGroup.movementType === 'out' ? 'Decreased' : 'Adjusted'} inventory</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };
  
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '2rem' }}>
        <h2>{t('inventory.bulkMovementReport', 'Bulk Movement Report')}</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={sortBy()}
            onChange={(e) => setSortBy(e.currentTarget.value as any)}
            style={{ padding: '0.5rem' }}
          >
            <option value="date">{t('common.sortByDate', 'Sort by Date')}</option>
            <option value="quantity">{t('common.sortByQuantity', 'Sort by Quantity')}</option>
            <option value="value">{t('common.sortByValue', 'Sort by Value')}</option>
          </select>
          
          <Show when={props.onClose}>
            <button 
              onClick={props.onClose}
              style={{
                padding: '0.5rem 1rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer'
              }}
            >
              {t('common.close', 'Close')}
            </button>
          </Show>
        </div>
      </div>
      
      {/* Bulk Movement Groups */}
      <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem', 'margin-bottom': '2rem' }}>
        <For each={bulkMovementGroups()}>
          {(group) => (
            <Card 
              style={{ 
                cursor: 'pointer',
                border: selectedGroup() === group ? '2px solid var(--primary-color)' : '1px solid #e9ecef',
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedGroup(group)}
            >
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.1rem' }}>
                    {group.referenceNumber || group.invoiceId || 'No Reference'}
                  </h3>
                  <div style={{ 'font-size': '0.875rem', color: '#6c757d' }}>
                    {formatDate(group.createDate)}
                  </div>
                </div>
                <div style={{ 'text-align': 'center' }}>
                  <span style={{ 'font-size': '1.5rem' }}>
                    {getMovementTypeIcon(group.movementType)}
                  </span>
                  <div style={{ 
                    'font-size': '0.75rem', 
                    'font-weight': 'bold',
                    color: getMovementTypeColor(group.movementType)
                  }}>
                    {group.movementType.toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.25rem' }}>
                  <strong>{t('inventory.location', 'Location')}:</strong> {group.locationName}
                </div>
                <Show when={group.description}>
                  <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.25rem' }}>
                    <strong>{t('common.description', 'Description')}:</strong> {group.description}
                  </div>
                </Show>
              </div>
              
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '0.5rem', 'margin-bottom': '1rem' }}>
                <div style={{ 'text-align': 'center', padding: '0.5rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius-sm)' }}>
                  <div style={{ 'font-weight': 'bold', color: '#3b82f6' }}>{group.totalItems}</div>
                  <div style={{ 'font-size': '0.75rem', color: '#6c757d' }}>{t('inventory.items', 'Items')}</div>
                </div>
                <div style={{ 'text-align': 'center', padding: '0.5rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius-sm)' }}>
                  <div style={{ 'font-weight': 'bold', color: '#22c55e' }}>{group.totalQuantity}</div>
                  <div style={{ 'font-size': '0.75rem', color: '#6c757d' }}>{t('inventory.quantity', 'Quantity')}</div>
                </div>
                <div style={{ 'text-align': 'center', padding: '0.5rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius-sm)' }}>
                  <div style={{ 'font-weight': 'bold', color: '#f59e0b' }}>{formatCurrency(group.totalValue)}</div>
                  <div style={{ 'font-size': '0.75rem', color: '#6c757d' }}>{t('common.value', 'Value')}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(group);
                  }}
                  style={{
                    flex: '1',
                    padding: '0.5rem',
                    background: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    'border-radius': 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    'font-size': '0.875rem'
                  }}
                >
                  {t('common.viewDetails', 'View Details')}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    printReport(group);
                  }}
                  style={{
                    padding: '0.5rem',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    'border-radius': 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    'font-size': '0.875rem'
                  }}
                >
                  🖨️
                </button>
              </div>
            </Card>
          )}
        </For>
      </div>
      
      {/* Detailed View */}
      <Show when={selectedGroup()}>
        <Card>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h3>{t('inventory.movementDetails', 'Movement Details')}</h3>
            <button 
              onClick={() => printReport()}
              style={{
                padding: '0.5rem 1rem',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer'
              }}
            >
              🖨️ {t('common.print', 'Print Report')}
            </button>
          </div>
          
          {/* Group Summary */}
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '1rem', 'margin-bottom': '2rem', padding: '1rem', background: '#f8f9fa', 'border-radius': 'var(--border-radius-sm)' }}>
            <div>
              <div><strong>{t('inventory.referenceNumber', 'Reference')}:</strong> {selectedGroup()?.referenceNumber || 'N/A'}</div>
              <div><strong>{t('inventory.invoiceId', 'Invoice ID')}:</strong> {selectedGroup()?.invoiceId || 'N/A'}</div>
              <div><strong>{t('inventory.movementType', 'Type')}:</strong> {selectedGroup()?.movementType.toUpperCase()}</div>
              <div><strong>{t('inventory.location', 'Location')}:</strong> {selectedGroup()?.locationName}</div>
            </div>
            <div>
              <div><strong>{t('common.date', 'Date')}:</strong> {selectedGroup() ? formatDate(selectedGroup()!.createDate) : ''}</div>
              <div><strong>{t('inventory.totalItems', 'Total Items')}:</strong> {selectedGroup()?.totalItems}</div>
              <div><strong>{t('inventory.totalQuantity', 'Total Quantity')}:</strong> {selectedGroup()?.totalQuantity}</div>
              <div><strong>{t('common.estimatedValue', 'Estimated Value')}:</strong> {selectedGroup() ? formatCurrency(selectedGroup()!.totalValue) : ''}</div>
            </div>
          </div>
          
          <Show when={selectedGroup()?.description || selectedGroup()?.generalNotes}>
            <div style={{ 'margin-bottom': '2rem', padding: '1rem', background: '#e8f4fd', 'border-radius': 'var(--border-radius-sm)' }}>
              <Show when={selectedGroup()?.description}>
                <div><strong>{t('common.description', 'Description')}:</strong> {selectedGroup()?.description}</div>
              </Show>
              <Show when={selectedGroup()?.generalNotes}>
                <div><strong>{t('common.notes', 'Notes')}:</strong> {selectedGroup()?.generalNotes}</div>
              </Show>
            </div>
          </Show>
          
          {/* Individual Movements */}
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
              <thead>
                <tr style={{ 'border-bottom': '2px solid #dee2e6' }}>
                  <th style={{ padding: '0.75rem', 'text-align': 'left' }}>{t('inventory.productCode', 'Code')}</th>
                  <th style={{ padding: '0.75rem', 'text-align': 'left' }}>{t('inventory.productName', 'Product')}</th>
                  <th style={{ padding: '0.75rem', 'text-align': 'center' }}>{t('inventory.quantity', 'Quantity')}</th>
                  <th style={{ padding: '0.75rem', 'text-align': 'right' }}>{t('inventory.unitCost', 'Unit Cost')}</th>
                  <th style={{ padding: '0.75rem', 'text-align': 'right' }}>{t('common.totalValue', 'Total Value')}</th>
                  <th style={{ padding: '0.75rem', 'text-align': 'left' }}>{t('common.notes', 'Notes')}</th>
                </tr>
              </thead>
              <tbody>
                <For each={selectedGroup()?.movements || []}>
                  {(movement) => {
                    const product = inventoryStore.getProductById(movement.productId);
                    const unitCost = product?.unitCost || 0;
                    const totalValue = Math.abs(movement.quantity || 0) * unitCost;
                    
                    return (
                      <tr style={{ 'border-bottom': '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem', 'font-family': 'monospace' }}>
                          {product?.code || movement.productId}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {product?.name || 'Unknown Product'}
                        </td>
                        <td style={{ 
                          padding: '0.75rem', 
                          'text-align': 'center',
                          'font-weight': 'bold',
                          color: (movement.quantity || 0) >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {movement.quantity || 0}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right' }}>
                          {formatCurrency(unitCost)}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': 'bold' }}>
                          {formatCurrency(totalValue)}
                        </td>
                        <td style={{ padding: '0.75rem', 'font-size': '0.875rem', color: '#6c757d' }}>
                          {movement.notes || '-'}
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export default BulkMovementReport;