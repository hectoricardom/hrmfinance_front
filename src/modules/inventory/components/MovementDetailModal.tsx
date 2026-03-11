import { Component, Show, For, createSignal } from 'solid-js';
import { Modal } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryStore, InventoryMovement } from '../stores/inventoryStore';
import { processAnyInput } from '../../accounting-flow/services/accountingFlowApi';
import EntryBookPreviewModal, { EntryBookPreviewData } from '../../accounting-flow/components/EntryBookPreviewModal';

interface MovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: InventoryMovement | null;
  onEdit?: (movement: InventoryMovement) => void;
}

const MovementDetailModal: Component<MovementDetailModalProps> = (props) => {
  const { t } = useTranslation();
  const [isGeneratingEntryBook, setIsGeneratingEntryBook] = createSignal(false);
  const [showEntryBookPreview, setShowEntryBookPreview] = createSignal(false);
  const [entryBookPreviewData, setEntryBookPreviewData] = createSignal<EntryBookPreviewData | null>(null);
  const [entryBookResult, setEntryBookResult] = createSignal<{
    success: boolean;
    message: string;
    entryBookId?: string;
  } | null>(null);

  const handleGenerateEntryBook = async (mov: InventoryMovement) => {
    setIsGeneratingEntryBook(true);
    setEntryBookResult(null);

    try {
      // Prepare the movement raw data for processing
      const rawData = {
        id: mov.id,
        type: mov.type,
        invoice: mov.invoice,
        store: mov.store,
        products: mov.products,
        productSubtotal: mov.productSubtotal,
        description: mov.description,
        userId: mov.userId,
        createdAt: mov.createdAt,
        // Include any additional data
        ...mov
      };

      const result = await processAnyInput(rawData, {
        sourceType: 'inventory_movement_' + rawData.type,
        autoCreate: false // Don't auto-create, show preview first
      });

      if (result.success && result.entryBook) {
        // Build preview data from the result
        const entries = result.entryBook.entries || [];
        // Use totals from response or calculate from entries
        const totalDebit = result.entryBook.totalDebits || entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
        const totalCredit = result.entryBook.totalCredits || entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

        const previewData: EntryBookPreviewData = {
          entries: entries.map((e: any, idx: number) => ({
            id: e.id || e.scenarioId || `entry_${idx}`,
            accountCode: e.accountCode || '',
            accountName: e.accountName || '',
            accountId: e.accountId,
            debit: e.debit || 0,
            credit: e.credit || 0,
            description: e.description || e.layer || ''
          })),
          date: result.entryBook.date || new Date().toISOString().split('T')[0],
          reference: result.entryBook.reference || mov.invoice || mov.id,
          description: `Movimiento de inventario: ${mov.type} - ${mov.invoice || mov.id}`,
          sourceType: result.entryBook.source || 'inventory_movement_' + mov.type,
          sourceId: mov.id,
          totalDebit,
          totalCredit,
          isBalanced: result.entryBook.balanced ?? Math.abs(totalDebit - totalCredit) < 0.01
        };

        setEntryBookPreviewData(previewData);
        setShowEntryBookPreview(true);
      } else {
        // If no entries returned, create default entries based on movement type
        const total = mov.productSubtotal || 0;
        const defaultEntries = generateDefaultEntries(mov, total);

        const previewData: EntryBookPreviewData = {
          entries: defaultEntries,
          date: new Date().toISOString().split('T')[0],
          reference: mov.invoice || mov.id,
          description: `Movimiento de inventario: ${mov.type} - ${mov.invoice || mov.id}`,
          sourceType: 'inventory_movement_' + mov.type,
          sourceId: mov.id,
          totalDebit: total,
          totalCredit: total,
          isBalanced: true
        };

        setEntryBookPreviewData(previewData);
        setShowEntryBookPreview(true);
      }
    } catch (error) {
      console.error('Error generating entry book:', error);
      setEntryBookResult({
        success: false,
        message: (error as Error).message || t('inventory.entryBookError', 'Error al generar asiento contable')
      });
    } finally {
      setIsGeneratingEntryBook(false);
    }
  };

  // Generate default journal entries based on movement type
  const generateDefaultEntries = (mov: InventoryMovement, total: number) => {
    const entries = [];
    const movType = mov.type?.toUpperCase();

    if (movType === 'ENTRY' || movType === 'IN') {
      // Entrada de inventario: Debito Inventario, Credito Cuentas por Pagar
      entries.push({
        id: 'entry_1',
        accountCode: '1300',
        accountName: 'Inventario',
        debit: total,
        credit: 0,
        description: 'Entrada de mercancia'
      });
      entries.push({
        id: 'entry_2',
        accountCode: '2100',
        accountName: 'Cuentas por Pagar',
        debit: 0,
        credit: total,
        description: 'Compra de mercancia'
      });
    } else if (movType === 'SALES' || movType === 'OUT') {
      // Salida/Venta: Debito Costo de Ventas, Credito Inventario
      entries.push({
        id: 'entry_1',
        accountCode: '5100',
        accountName: 'Costo de Ventas',
        debit: total,
        credit: 0,
        description: 'Costo de mercancia vendida'
      });
      entries.push({
        id: 'entry_2',
        accountCode: '1300',
        accountName: 'Inventario',
        debit: 0,
        credit: total,
        description: 'Salida de mercancia'
      });
    } else if (movType === 'TRANSFER') {
      // Transferencia: Debito Inventario destino, Credito Inventario origen
      entries.push({
        id: 'entry_1',
        accountCode: '1300',
        accountName: 'Inventario (Destino)',
        debit: total,
        credit: 0,
        description: 'Recepcion de transferencia'
      });
      entries.push({
        id: 'entry_2',
        accountCode: '1300',
        accountName: 'Inventario (Origen)',
        debit: 0,
        credit: total,
        description: 'Envio de transferencia'
      });
    } else {
      // Ajuste generico
      entries.push({
        id: 'entry_1',
        accountCode: '1300',
        accountName: 'Inventario',
        debit: total,
        credit: 0,
        description: 'Ajuste de inventario'
      });
      entries.push({
        id: 'entry_2',
        accountCode: '5900',
        accountName: 'Ajustes de Inventario',
        debit: 0,
        credit: total,
        description: 'Contrapartida ajuste'
      });
    }

    return entries;
  };

  const handleEntryBookSaved = (savedEntry: any) => {
    setEntryBookResult({
      success: true,
      message: t('inventory.entryBookGenerated', 'Asiento contable guardado exitosamente'),
      entryBookId: savedEntry.entryNumber || savedEntry.id
    });
    setShowEntryBookPreview(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      'in': { bg: '#e8f5e8', color: '#2d7d32' },
      'ENTRY': { bg: '#e8f5e8', color: '#2d7d32' },
      'out': { bg: '#ffebee', color: '#d32f2f' },
      'SALES': { bg: '#ffebee', color: '#d32f2f' },
      'transfer': { bg: '#e3f2fd', color: '#1976d2' },
      'TRANSFER': { bg: '#e3f2fd', color: '#1976d2' },
      'adjustment': { bg: '#fff3e0', color: '#f57c00' }
    };
    return colors[type] || { bg: '#f5f5f5', color: '#666' };
  };

  const getMovementIcon = (type: string) => {
    const icons: Record<string, string> = {
      'in': '📦',
      'ENTRY': '📦',
      'out': '📤',
      'SALES': '📤',
      'transfer': '🔄',
      'TRANSFER': '🔄',
      'adjustment': '⚖️'
    };
    return icons[type] || '📋';
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'in': t('inventory.stockIn', 'Entrada de Stock'),
      'ENTRY': t('inventory.stockIn', 'Entrada de Stock'),
      'out': t('inventory.stockOut', 'Salida de Stock'),
      'SALES': t('inventory.stockOut', 'Salida de Stock'),
      'transfer': t('inventory.transfer', 'Transferencia'),
      'TRANSFER': t('inventory.transfer', 'Transferencia'),
      'adjustment': t('inventory.adjustment', 'Ajuste')
    };
    return labels[type] || type;
  };

  const movement = () => props.movement;

  // Calculate totals from products array
  const getProductsTotal = () => {
    const mov = movement();
    if (!mov?.products || !Array.isArray(mov.products)) return 0;
    return mov.products.reduce((sum: number, p: any) => {
      return sum + (parseFloat(p.total) || (parseFloat(p.qty || 0) * parseFloat(p.salePrice || p.price || 0)));
    }, 0);
  };

  const getTotalQuantity = () => {
    const mov = movement();
    if (!mov?.products || !Array.isArray(mov.products)) return 0;
    return mov.products.reduce((sum: number, p: any) => sum + parseFloat(p.qty || 0), 0);
  };

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)',
    'text-align': 'right' as const
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-weight': '600',
    'margin-bottom': '0.75rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const movementTypeStyle = (type: string) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    'border-radius': '9999px',
    'font-size': '0.875rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    background: getMovementTypeColor(type).bg,
    color: getMovementTypeColor(type).color
  });

  const productItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    background: 'var(--gray-50)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '0.5rem'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={t('inventory.movementDetails', 'Detalles del Movimiento')}
      size="lg"
      maxWidth='86vw'
    >
      <Show when={movement()} fallback={<div>{t('common.noDataFound', 'No se encontraron datos')}</div>}>
        {(mov) => (
          <div>
            {/* Header with Movement Type */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem',
              'padding-bottom': '1rem',
              'border-bottom': '2px solid var(--border-color)'
            }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.25rem' }}>
                  {mov().invoice || t('inventory.movement', 'Movimiento')}
                </h3>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  <Show when={mov().store}>
                    <span>{t('inventory.store', 'Tienda')}: {mov().store}</span>
                  </Show>
                </div>
              </div>
              <div style={movementTypeStyle(mov().type || '')} onClick={() => inventoryStore.generateMovementInvoice(mov().id, t)}>
                <span style={{ 'font-size': '1.2rem' }}>{getMovementIcon(mov().type || '')}</span>
                {getMovementTypeLabel(mov().type || '')}
              </div>
            </div>

            {/* Movement Information */}
            <div style={sectionStyle}>
              <h4 style={sectionTitleStyle}>{t('inventory.movementInformation', 'Información del Movimiento')}</h4>

              <Show when={mov().invoice}>
                <div style={detailRowStyle}>
                  <span style={labelStyle}>{t('common.invoice', 'Factura')}:</span>
                  <span style={{ ...valueStyle, color: 'var(--primary-color)' }}>{mov().invoice}</span>
                </div>
              </Show>

              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('inventory.store', 'Tienda')}:</span>
                <span style={valueStyle}>{mov().store}</span>
              </div>

              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('common.subtotal', 'Subtotal')}:</span>
                <span style={{ ...valueStyle, 'font-size': '1.1rem', color: 'var(--primary-color)' }}>
                  {formatCurrency(mov().productSubtotal || getProductsTotal())}
                </span>
              </div>
            </div>

            {/* Products List */}
            <Show when={mov().products && mov().products.length > 0}>
              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>
                  {t('inventory.products', 'Productos')} ({mov().products.length})
                  <span style={{ 'font-weight': 'normal', 'margin-left': '0.5rem', 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
                    - {getTotalQuantity()} {t('inventory.units', 'unidades')}
                  </span>
                </h4>

                <For each={mov().products}>
                  {(product: any) => (
                    <div style={productItemStyle}>
                      <div>
                        <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                          {product.product?.label || product.label || product.name || t('inventory.product', 'Producto')}
                        </div>
                        <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                          <Show when={product.product?.code || product.code || product.UPC || product.sdk }>
                            <span>{product.product?.code || product.code  || product.UPC || product.sdk}</span>
                          </Show>
                          <Show when={product.bulkId}>
                            <span style={{ 'margin-left': '0.5rem' }}>
                              • {t('inventory.bulk', 'Bulto')}: {product.bulkId.substring(0, 8)}...
                            </span>
                          </Show>
                        </div>
                      </div>
                      <div style={{ 'text-align': 'right' }}>
                        <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                          {formatCurrency(parseFloat(product.total) || (parseFloat(product.qty || 0) * parseFloat(product.salePrice || product.price || 0)))}
                        </div>
                        <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                          {product.qty} x {formatCurrency(parseFloat(product.salePrice || product.price || 0))}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* Additional Information */}
            <div style={sectionStyle}>
              <h4 style={sectionTitleStyle}>{t('common.details', 'Detalles')}</h4>

              <Show when={mov().userId}>
                <div style={detailRowStyle}>
                  <span style={labelStyle}>{t('common.createdBy', 'Creado Por')}:</span>
                  <span style={{ ...valueStyle, 'font-size': '0.85rem' }}>{mov().userId}</span>
                </div>
              </Show>

              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('common.created', 'Fecha de Creación')}:</span>
                <span style={valueStyle}>{formatDate(mov().createdAt)}</span>
              </div>

              <Show when={mov().description}>
                <div style={{ ...detailRowStyle, 'border-bottom': 'none' }}>
                  <span style={labelStyle}>{t('common.description', 'Descripción')}:</span>
                  <span style={{
                    ...valueStyle,
                    'font-style': 'italic',
                    'max-width': '60%',
                    'white-space': 'pre-wrap'
                  }}>
                    {mov().description}
                  </span>
                </div>
              </Show>
            </div>

            {/* Entry Book Result Message */}
            <Show when={entryBookResult()}>
              <div style={{
                'margin-top': '1rem',
                padding: '0.75rem 1rem',
                'border-radius': 'var(--border-radius-sm)',
                background: entryBookResult()?.success ? '#e8f5e9' : '#ffebee',
                color: entryBookResult()?.success ? '#2e7d32' : '#c62828',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                <span style={{ 'font-size': '1.2rem' }}>
                  {entryBookResult()?.success ? '✓' : '✗'}
                </span>
                <span>{entryBookResult()?.message}</span>
                <Show when={entryBookResult()?.entryBookId}>
                  <span style={{ 'font-size': '0.85rem', opacity: 0.8 }}>
                    (ID: {entryBookResult()?.entryBookId})
                  </span>
                </Show>
              </div>
            </Show>

            {/* Footer with Buttons */}
            <div style={{
              display: 'flex',
              'justify-content': 'flex-end',
              gap: '0.75rem',
              'margin-top': '1.5rem',
              'padding-top': '1rem',
              'border-top': '1px solid var(--border-color)'
            }}>
              {/* Generate Entry Book Button */}
              <button
                style={{
                  padding: '0.5rem 1.5rem',
                  'border-radius': 'var(--border-radius-sm)',
                  border: '1px solid #1976d2',
                  background: isGeneratingEntryBook() ? '#e3f2fd' : '#1976d2',
                  color: isGeneratingEntryBook() ? '#1976d2' : 'white',
                  cursor: isGeneratingEntryBook() ? 'not-allowed' : 'pointer',
                  'font-weight': '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  opacity: isGeneratingEntryBook() ? 0.7 : 1
                }}
                onClick={() => handleGenerateEntryBook(mov())}
                disabled={isGeneratingEntryBook()}
                onMouseEnter={(e) => {
                  if (!isGeneratingEntryBook()) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Show when={isGeneratingEntryBook()} fallback={<>📒 {t('inventory.generateEntryBook', 'Generar Asiento')}</>}>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid currentColor',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  {t('common.processing', 'Procesando...')}
                </Show>
              </button>

              {/* Edit Button */}
              <Show when={props.onEdit}>
                <button
                  style={{
                    padding: '0.5rem 1.5rem',
                    'border-radius': 'var(--border-radius-sm)',
                    border: '1px solid var(--primary-color)',
                    background: 'var(--primary-color)',
                    color: 'white',
                    cursor: 'pointer',
                    'font-weight': '500',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => props.onEdit?.(mov())}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {t('common.edit', 'Editar')} {t('inventory.movement', 'Movimiento')}
                </button>
              </Show>
            </div>
          </div>
        )}
      </Show>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Entry Book Preview Modal */}
      <EntryBookPreviewModal
        isOpen={showEntryBookPreview()}
        onClose={() => setShowEntryBookPreview(false)}
        previewData={entryBookPreviewData()}
        onSave={handleEntryBookSaved}
        sourceDocument={movement()}
      />
    </Modal>
  );
};

export default MovementDetailModal;
