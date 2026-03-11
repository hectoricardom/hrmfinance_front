import { Component, Show, Match, Switch } from 'solid-js';
import { UPCLookupResult, ReceivingLookupState } from '../types/receiving';
import { inventoryStore } from '../stores/inventoryStore';

interface ProductLookupResultProps {
  lookupResult: UPCLookupResult | null;
  lookupState: ReceivingLookupState;
}

const ProductLookupResult: Component<ProductLookupResultProps> = (props) => {
  const getStockInfo = () => {
    if (!props.lookupResult?.product) return null;
    const stock = inventoryStore.getTotalStockByProduct(props.lookupResult.product.id);
    return stock;
  };

  const containerStyle = {
    'margin-top': '1rem',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    border: '2px solid',
    'background-color': 'var(--surface-color)'
  };

  const loadingStyle = {
    ...containerStyle,
    'border-color': '#3498db',
    'text-align': 'center' as const,
    color: '#3498db'
  };

  const foundLocalStyle = {
    ...containerStyle,
    'border-color': '#27ae60',
    'background-color': '#f0f9f4'
  };

  const foundApiStyle = {
    ...containerStyle,
    'border-color': '#f39c12',
    'background-color': '#fef9e7'
  };

  const notFoundStyle = {
    ...containerStyle,
    'border-color': '#e74c3c',
    'background-color': '#fdecea'
  };

  const errorStyle = {
    ...containerStyle,
    'border-color': '#e74c3c',
    'background-color': '#fdecea',
    color: '#c0392b'
  };

  const productImageStyle = {
    width: '100px',
    height: '100px',
    'object-fit': 'cover' as const,
    'border-radius': 'var(--border-radius-sm)',
    'margin-right': '1rem'
  };

  const productInfoStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'flex-start'
  };

  const badgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    'border-radius': '12px',
    'font-size': '0.875rem',
    'font-weight': '600',
    'margin-top': '0.5rem'
  };

  const newProductBadgeStyle = {
    ...badgeStyle,
    background: '#f39c12',
    color: 'white'
  };

  const stockBadgeStyle = {
    ...badgeStyle,
    background: '#3498db',
    color: 'white'
  };

  const spinnerStyle = {
    border: '3px solid #f3f3f3',
    'border-top': '3px solid #3498db',
    'border-radius': '50%',
    width: '30px',
    height: '30px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  };

  return (
    <Switch>
      <Match when={props.lookupState === 'loading'}>
        <div style={loadingStyle}>
          <div style={spinnerStyle}></div>
          <p style={{ 'margin-top': '0.5rem' }}>Buscando producto...</p>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </Match>

      <Match when={props.lookupState === 'found-local' && props.lookupResult?.product}>
        <div style={foundLocalStyle}>
          <div style={productInfoStyle}>
            <Show when={props.lookupResult?.product?.productImageUrl}>
              <img
                src={props.lookupResult!.product!.productImageUrl}
                alt={props.lookupResult!.product!.name}
                style={productImageStyle}
              />
            </Show>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#27ae60' }}>
                {props.lookupResult!.product!.name}
              </h3>
              <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
                <strong>SKU:</strong> {props.lookupResult!.product!.sku}
              </p>
              <Show when={props.lookupResult!.product!.UPC}>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
                  <strong>UPC:</strong> {props.lookupResult!.product!.UPC}
                </p>
              </Show>
              <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
                <strong>Categoria:</strong> {props.lookupResult!.product!.category}
              </p>
              <Show when={getStockInfo() !== null}>
                <span style={stockBadgeStyle}>
                  Stock actual: {getStockInfo()} {props.lookupResult!.product!.unitOfMeasure}
                </span>
              </Show>
            </div>
          </div>
        </div>
      </Match>

      <Match when={props.lookupState === 'found-api' && props.lookupResult}>
        <div style={foundApiStyle}>
          <div style={productInfoStyle}>
            <Show when={props.lookupResult?.suggestedData?.productImageUrl}>
              <img
                src={props.lookupResult!.suggestedData!.productImageUrl}
                alt={props.lookupResult!.suggestedData!.name || 'Producto'}
                style={productImageStyle}
              />
            </Show>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#f39c12' }}>
                {props.lookupResult!.suggestedData?.name || 'Producto encontrado en API'}
              </h3>
              <Show when={props.lookupResult!.suggestedData?.description}>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
                  {props.lookupResult!.suggestedData!.description}
                </p>
              </Show>
              <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
                <strong>UPC:</strong> {props.lookupResult!.upc}
              </p>
              <Show when={props.lookupResult!.suggestedData?.category}>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
                  <strong>Categoria:</strong> {props.lookupResult!.suggestedData!.category}
                </p>
              </Show>
              <span style={newProductBadgeStyle}>
                Nuevo producto - Se creará
              </span>
            </div>
          </div>
        </div>
      </Match>

      <Match when={props.lookupState === 'not-found'}>
        <div style={notFoundStyle}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e74c3c' }}>
            Producto no encontrado
          </h3>
          <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
            El código UPC no se encontró en el sistema ni en la base de datos externa.
          </p>
          <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>
            Puede crear un nuevo producto o intentar con otro código.
          </p>
        </div>
      </Match>

      <Match when={props.lookupState === 'error'}>
        <div style={errorStyle}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            Error en la búsqueda
          </h3>
          <p style={{ margin: '0.25rem 0' }}>
            {props.lookupResult?.error || 'Ocurrió un error al buscar el producto.'}
          </p>
        </div>
      </Match>
    </Switch>
  );
};

export default ProductLookupResult;
