import { Component, createSignal, createEffect, Show, Setter } from 'solid-js';
import { inventoryApi } from '../../../services/apiAdapter';
import { formatFloat } from '../../../services/utils';

interface ProductStockBadgeProps {
  productId: string;
  storeId?: string;
  showQuantity?: boolean;
  size?: 'sm' | 'md' | 'lg';
  minStockLevel?: number;
  updStockByStores?:  Setter<any>;
}

interface StockLevel {
  product_id: string;
  product_name: string;
  store_id: string;
  current_qty: number;
  available_qty: number;
  reserved_qty: number;
}

const ProductStockBadge: Component<ProductStockBadgeProps> = (props) => {
  const [stock, setStock] = createSignal<StockLevel[] | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Load stock data
  createEffect(async () => {

   
    if (!props.productId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await inventoryApi.getStockLevel(props.productId);

      
      const stockData = Array.isArray(data) ? data : [];
      setStock(stockData || []);
      props?.updStockByStores?.(data);
    } catch (err) {
      console.error('Error loading stock:', err);
      setError('Failed to load stock');
    } finally {
      setIsLoading(false);
    }
  });

  const getStockStatus = () => {
    const s = stock();

    if (!s) return { color: '#9ca3af', bg: '#f3f4f6', label: 'No data', icon: '?' };





    const qty = s.reduce((sum, st) => sum +  (st.available_qty ? formatFloat(st.available_qty)*1 : 0), 0)  ;

  
   


    const lowStockThreshold = props.minStockLevel ?? 10;




    if (qty <= 0) {
      return { color: '#dc2626', bg: '#fef2f2', label: 'Out of Stock', icon: '!' };
    }
    if (qty <= lowStockThreshold) {
      return { color: '#f59e0b', bg: '#fffbeb', label: `Low: ${qty}`, icon: '⚠' };
    }
    return { color: '#22c55e', bg: '#f0fdf4', label: `${qty} in stock`, icon: '✓' };
  };

  const sizeStyles = {
    sm: { padding: '0.125rem 0.5rem', fontSize: '0.7rem' },
    md: { padding: '0.25rem 0.75rem', fontSize: '0.8rem' },
    lg: { padding: '0.375rem 1rem', fontSize: '0.875rem' },
  };

  const size = props.size || 'md';
 
  return (
    <Show when={!isLoading()} fallback={
      <span style={{
        ...sizeStyles[size],
        background: '#f3f4f6',
        color: '#9ca3af',
        'border-radius': '999px',
        display: 'inline-flex',
        'align-items': 'center',
        gap: '0.25rem',
      }}>
        Loading...
      </span>
    }>
      <Show when={!error()} fallback={
        <span style={{
          ...sizeStyles[size],
          background: '#fef2f2',
          color: '#dc2626',
          'border-radius': '999px',
        }}>
          Error
        </span>
      }>
        <div style={{
          ...sizeStyles[size],
          background: getStockStatus()?.bg,
          color: getStockStatus()?.color,
          'border-radius': '999px',
          'font-weight': '500',
          display: 'inline-flex',
          'align-items': 'center',
          gap: '0.25rem',
          "min-width": '156px',
        }}>
          
          <Show when={props.showQuantity !== false}>
            <span>{getStockStatus()?.icon}</span>
          </Show>
          <Show when={props.showQuantity !== false}>
            {getStockStatus()?.label}
          </Show>
        </div>
      </Show>
    </Show>
  );
};

export default ProductStockBadge;
