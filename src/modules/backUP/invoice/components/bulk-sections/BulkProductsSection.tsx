import { Component, For, Show } from 'solid-js';
import { InvoiceProduct } from '../../types/invoiceTypes';
import ApiSearchableProductDropdown from '../../../inventory/components/ApiSearchableProductDropdown';
import { inventoryStore, getEffectivePrice } from '../../../inventory';
import { FormInput } from '../../../ui';
import { authStore } from '../../../../stores/authStore';
import { devLog } from '../../../../services/utils';

interface BulkProductsSectionProps {
  products: InvoiceProduct[];
  showPricing: boolean;
  onUpdateProduct: (index: number, updates: Partial<InvoiceProduct>) => void;
  onRemoveProduct: (index: number) => void;
  onBulkChange: () => void; // Trigger bulk update
}

const BulkProductsSection: Component<BulkProductsSectionProps> = (props) => {
  
  const handleUpdateProduct = (index: number, updates: Partial<InvoiceProduct>) => {
    // Calculate total when qty or salePrice changes
    let finalUpdates = { ...updates };
    
    const product = props.products[index];
    if (product && (updates.qty !== undefined || updates.salePrice !== undefined)) {
      const newQty = updates.qty ?? product.qty;
      const newSalePrice = updates.salePrice ?? product.salePrice;
      finalUpdates = { ...finalUpdates, total: newQty * newSalePrice };
    }
    
    props.onUpdateProduct(index, finalUpdates);
    props.onBulkChange(); // Trigger bulk update
  };

  const handleRemoveProduct = (index: number, product: InvoiceProduct) => {
    const confirmed = confirm(`¿Eliminar producto "${product.product.label || 'sin nombre'}"?\n\nEsta acción no se puede deshacer.`);
    if (confirmed) {
      props.onRemoveProduct(index);
      props.onBulkChange(); // Trigger bulk update
    }
  };


 

   const handleSelectProduct = (productId: string, index: number) => {
    // Get product details from store
    const productM = inventoryStore.getProductById(productId);
    if (!productM) return;

    // Get current store/location for location-specific pricing
    const currentStoreId = authStore.state?.currentStore?.id || authStore.getBusinessId();

    // Get effective price based on location (fallback: sellingPrice or cost * 1.666)
    const effectiveSalePrice = getEffectivePrice(productM, currentStoreId);

    const productK = props.products[index] || {};
    const product = {
      product: {
        id: productM.id,
        code: productM?.sku || '',
        label: productM.name || '',
        price: productM.unitCost || 0
      },
      salePrice: effectiveSalePrice,
      costPrice: productM.unitCost || 0
    }


    const newProduct = {...productK, ...product}
    devLog('Product with effective price:', newProduct)

    handleUpdateProduct(index, newProduct)

  };

  const itemStyle = {
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1rem',
    'margin-bottom': '0.5rem',
    background: 'white'
  };

  const itemHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem'
  };

  const removeButtonStyle = {
    /**background: 'var(--error-color)',*/
    color: 'white',
    border: 'none',
    'border-radius': '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    cursor: 'pointer',
    'font-size': '0.75rem'
  };

  const inputStyle = {
    width: '100%',
    'max-width': '120px',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem'
  };

  const inputGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.5rem'
  };

  return (
    <>
      <Show when={props.products.length > 0}>
        <h4 style={{ 
          'font-size': '1rem', 
          'font-weight': 'bold', 
          color: 'var(--success-color)',
          'margin': '1.9rem 0 0.75rem 0 ',
          'border-bottom': '1px solid var(--border-color)',
          'padding-bottom': '0.5rem'
        }}>
          📦 Productos ({props.products.length})
        </h4>
      </Show>

      <For each={props.products}>
        {(product, productIndex) => (
          <div style={itemStyle}>
            <div style={itemHeaderStyle}>
              <span style={{ 'font-weight': 'bold', color: 'var(--success-color)' }}>
                📦 Producto: {product.product.label || 'Sin nombre'}
              </span>
              <button
                type="button"
                style={removeButtonStyle}
                onClick={() => handleRemoveProduct(productIndex(), product)}
                title="Eliminar producto"
              >
                🗑️
              </button>
            </div>
            <div style={inputGroupStyle}>
              <div>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                  Cantidad
                </label>
                <div  style={{ 'margin': '.6rem 0' }}>
                  <ApiSearchableProductDropdown
                    value=""
                    onChange={(e)=>handleSelectProduct(e, productIndex())}
                    placeholder={'Buscar productos por nombre, SKU o categoria para agregar a la factura...'}
                    searchDelay={300}
                    maxResults={15}
                  />
                </div>
              </div>
              
              
              
              <div style={{  "text-align": "center" }}>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '500', "text-align": "right" }}>
                  Cantidad
                </label>
                <FormInput
                  type="number"
                  style={{"max-width": "120px"}}
                  value={product.qty.toString()}
                  min="1"
                  onChange={(e) => handleUpdateProduct(productIndex(), { 
                    qty: Number(e) || 1 
                  })}
                />
              </div>
              
             
              <div style={{  "text-align": "center" }}>
                  <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                    Precio Venta ($)
                  </label>
                  <FormInput
                    type="number"
                    style={{"max-width": "120px"}}
                    value={product.salePrice.toString()}
                    step="0.01"
                    onChange={(e) => handleUpdateProduct(productIndex(), { 
                      salePrice: Number(e) || 0 
                    })}
                  />
                </div>
             
            </div>
          </div>
        )}
      </For>
    </>
  );
};

export default BulkProductsSection;