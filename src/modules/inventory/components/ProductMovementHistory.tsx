import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { Card } from '../../ui';
import { inventoryApi } from '../../../services/apiAdapter';
import { useTranslation } from '../../../translations';
import { inventoryStore } from '../stores/inventoryStore';

interface ProductMovementHistoryProps {
  productId: string;
  storeId?: string;
  limit?: number;
}

interface MovementEntry {
  id: string;
  movement_type: string;
  invoice_ref: string | null;
  invoice_id: string | null;
  store: string;
  created_at: string;
  qty: number;
  price: number;
  total: number;
  product_label: string;
  product_code: string;
  guide?: string;
}

// Transform invoice-based response to movement entries
// Only processes invoices that have products (ignores reservas-only invoices)
const transformInvoiceToMovements = (invoices: any[], productId?: string): MovementEntry[] => {
  const movements: MovementEntry[] = [];


  for (const invoice of invoices) {
    // Only process invoices that have products array with items
    const hasProducts = invoice.product_entries && Array.isArray(invoice.product_entries) && invoice.product_entries.length > 0;

    if (!hasProducts) continue;


         
    // Process each product in the invoice
    for (const product of invoice.product_entries) {
      const prodId = product.product?.id || product.productId || product.id;
      // If productId is provided, filter by it; otherwise include all products
      if (!productId || prodId === productId || product.product?.code === productId) {
       
        movements.push({
          id: `${invoice.id}-prod-${product.id || movements.length}`,
          movement_type: invoice.movement_type || 'SALES',
          invoice_ref: invoice.invoice || null,
          invoice_id: invoice.id,
          store: invoice.store || '',
          created_at:  invoice.created_at ||  invoice.createdAt || invoice.createDate || new Date().toISOString(),
          qty: parseFloat(product.qty) || 0,
          price: parseFloat(product.salePrice || product.price || product.unitCost) || 0,
          total: parseFloat(product.total) || 0,
          product_label: product.product?.label || product.label || product.name || '',
          product_code: product.product?.code || product.code || '',
          guide: invoice.guide || '',
        });
      }
    }
  }

  // Sort by date descending
  movements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return movements;
};

const ProductMovementHistory: Component<ProductMovementHistoryProps> = (props) => {
  const { t } = useTranslation();
  const [movements, setMovements] = createSignal<MovementEntry[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    if (!props.productId) return;

    setIsLoading(true);
    setError(null);

    try {


      const data = await inventoryApi.getProductMovementHistory(
        props.productId,
        props.storeId,
        props.limit || 50
      );

      

      // Transform invoice-based data to movement entries
      const rawData = Array.isArray(data) ? data : ((data as any)?.data || []);
      
      const transformedMovements = transformInvoiceToMovements(rawData, props.productId);

      // Apply limit after transformation
      const limitedMovements = transformedMovements.slice(0, props.limit || 20);
      setMovements(limitedMovements);
    } catch (err) {
      console.error('Error loading movement history:', err);
      setError('Failed to load movement history');
    } finally {
      setIsLoading(false);
    }
  });

  const getMovementTypeStyle = (type: string) => {
    const styles: Record<string, { color: string; bg: string; icon: string }> = {
      SALES: { color: '#dc2626', bg: '#fef2f2', icon: '↓' },
      ENTRY: { color: '#22c55e', bg: '#f0fdf4', icon: '↑' },
      TRANSFER: { color: '#3b82f6', bg: '#eff6ff', icon: '↔' },
      adjustment: { color: '#f59e0b', bg: '#fffbeb', icon: '±' },
    };
    return styles[type] || { color: '#6b7280', bg: '#f3f4f6', icon: '•' };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <div style={{ padding: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem', 'font-weight': '600', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          📜 {t('inventory.movementHistory', 'Historial de Movimientos')}
        </h4>

        <Show when={isLoading()}>
          <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            {t('common.loading', 'Cargando...')}
          </div>
        </Show>

        <Show when={error()}>
          <div style={{ padding: '1rem', background: '#fef2f2', color: '#dc2626', 'border-radius': '8px' }}>
            {t('inventory.errorLoadingMovements', 'Error al cargar el historial de movimientos')}
          </div>
        </Show>

        <Show when={!isLoading() && !error() && movements().length === 0}>
          <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            {t('inventory.noMovementsForProduct', 'No se encontró historial de movimientos para este producto.')}
          </div>
        </Show>

        <Show when={!isLoading() && !error() && movements().length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
            <For each={movements()}>
              {(movement) => {

                if(!movement.qty){
                  return null
                }
                const typeStyle = getMovementTypeStyle(movement.movement_type);
               
                let locationObj = inventoryStore.getLocationById(movement.store);
               
                return (
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '0.75rem',
                    background: 'var(--gray-50)',
                    'border-radius': '8px',
                    'border-left': `4px solid ${typeStyle.color}`,
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      'border-radius': '50%',
                      background: typeStyle.bg,
                      color: typeStyle.color,
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'font-weight': '700',
                      'flex-shrink': 0,
                    }}>
                      {typeStyle.icon}
                    </div>


                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.25rem' }}>
                        <span style={{ 'font-weight': '600' }}>{movement.movement_type}</span>
                        {/* Quantity badge */}
                        <span style={{
                          'font-size': '0.75rem',
                          'font-weight': '600',
                          color: movement.movement_type === 'ENTRY' ? '#22c55e' : movement.qty 
                          >0 ?  '#22c55e' :  '#dc2626',
                          background: movement.movement_type === 'ENTRY' ? '#f0fdf4' :  movement.qty 
                          >0 ?  '#f0fdf4' :  '#fef2f2',
                          padding: '0.15rem 0.5rem',
                          'border-radius': '999px',
                        }}>
                          {movement.movement_type === 'ENTRY' ? '+' : ''}{movement.qty}
                        </span>
                      </div>

                      <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(movement.created_at)}
                      </div>

                      <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                       
                        <Show when={movement.invoice_id}>
                          <span> {t('inventory.invoice', 'Factura')}: {movement.invoice_id}</span>
                        </Show>
                        <Show when={movement.guide}>
                          <span> • {t('inventory.guide', 'Guía')}: {movement.guide}</span>
                        </Show>
                        <Show when={movement.store}>
                          <span> • {t('inventory.store', 'Tienda')}: ( {movement.store} ) {locationObj?.name}</span>
                        </Show>
                      </div>

                      {/* Product info 
                      <div style={{ 'margin-top': '0.5rem', 'font-size': '0.8rem', color: 'var(--text-secondary)' }}>
                        <Show when={movement.product_label}>
                          <span>{movement.product_label}</span>
                        </Show>
                        <Show when={movement.product_code}>
                          <span style={{ color: 'var(--text-muted)', 'margin-left': '0.5rem' }}>
                            ({movement.product_code})
                          </span>
                        </Show>
                      </div>
                      */}

                      {/* Price/Total info */}
                      <Show when={movement.price > 0 || movement.total > 0}>
                        <div style={{ 'margin-top': '0.25rem', 'font-size': '0.8rem', color: 'var(--primary-color)', 'font-weight': '500' }}>
                          <Show when={movement.price > 0}>
                            <span>@ ${movement.price.toFixed(2)}</span>
                          </Show>
                          <Show when={movement.total > 0}>
                            <span style={{ 'margin-left': '0.5rem' }}>
                              = ${movement.total.toFixed(2)}
                            </span>
                          </Show>
                        </div>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default ProductMovementHistory;
