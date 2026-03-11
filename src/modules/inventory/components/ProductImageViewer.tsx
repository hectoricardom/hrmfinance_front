import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Product } from '../stores/inventoryStore';
import ProductSearchInput from './ProductSearchInput';
import SearchableProductDropdown from './SearchableProductDropdown';
import { prod } from '@tensorflow/tfjs';
import { devLog } from '../../../services/utils';

interface ProductImageViewerProps {
  onProductSelect?: (product: Product) => void;
  showDetails?: boolean;
}

const ProductImageViewer: Component<ProductImageViewerProps> = (props) => {
  const { t } = useTranslation();
  const [selectedProduct, setSelectedProduct] = createSignal<Product | null>(null);
  const [searchResults, setSearchResults] = createSignal<Product[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    props.onProductSelect?.(product);
  };

  const clearProductSelect = () => {
    setSelectedProduct(null);
    props.onProductSelect?.(null);
    setSearchResults([]);
    setIsSearching(false);
   
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFldIM =  () => {
    return "YABABYSSolution"
  }
  
  const getDomainImg =  () => {
    return "https://qvamarkets.s3.us-east-2.amazonaws.com/V2_images/7258/"
  }
  
  // Get product image URL - placeholder or actual
  const getProductImage = (product: Product) => {
    // If product has imageUrl property, use it
    if ((product as any).productImageUrl) {
      //return (product as any).productImageUrl;
      return getDomainImg()  + getFldIM() + "/"+  product?.productImageUrl
    }
    
    // Generate placeholder based on category
    const categoryImages: Record<string, string> = {
      'Electronics': 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Electronics',
      'Furniture': 'https://via.placeholder.com/400x300/059669/FFFFFF?text=Furniture',
      'Food': 'https://via.placeholder.com/400x300/DC2626/FFFFFF?text=Food',
      'Clothing': 'https://via.placeholder.com/400x300/7C3AED/FFFFFF?text=Clothing',
      'Tools': 'https://via.placeholder.com/400x300/EA580C/FFFFFF?text=Tools',
      'General': 'https://via.placeholder.com/400x300/6B7280/FFFFFF?text=Product'
    };
    
    return categoryImages[product.category] || categoryImages['General'];


    
  };

  // Styles
  const containerStyle = {
    padding: '2rem'
  };

  const searchContainerStyle = {
    'max-width': '600px',
    margin: '0 auto 2rem',
    position: 'relative' as const
  };

  const resultsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const productCardStyle = {
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    overflow: 'hidden',
    'box-shadow': 'var(--shadow-sm)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const imageContainerStyle = {
    position: 'relative' as const,
    width: '100%',
    height: '200px',
    overflow: 'hidden',
    background: '#f5f5f5'
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    'object-fit': 'cover' as const,
    transition: 'transform 0.3s ease'
  };

  const productInfoStyle = {
    padding: '1rem'
  };

  const productNameStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap' as const
  };

  const productDetailStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'margin-bottom': '0.25rem'
  };

  const priceStyle = {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    'margin-top': '0.5rem'
  };

  const selectedProductStyle = {
    display: 'flex',
    gap: '2rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    padding: '2rem',
    'box-shadow': 'var(--shadow-md)',
    'margin-bottom': '2rem',
    position:'relative'
  };

  const selectedImageStyle = {
    width: '400px',
    height: '300px',
    'border-radius': 'var(--border-radius)',
    overflow: 'hidden',
    background: '#f5f5f5'
  };

  const selectedDetailsStyle = {
    flex: '1',
    display: 'flex',
    'flex-direction': 'column',
    gap: '1rem'
  };

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'padding-bottom': '0.5rem',
    'border-bottom': '1px solid var(--border-light)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const stockBadgeStyle = (inStock: boolean) => ({
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '600',
    background: inStock ? '#d4edda' : '#f8d7da',
    color: inStock ? '#155724' : '#721c24'
  });

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '4rem 2rem',
    color: 'var(--text-muted)'
  };

  const emptyIconStyle = {
    'font-size': '3rem',
    'margin-bottom': '1rem',
    opacity: '0.5'
  };

 
 

  return (
    <div style={containerStyle}>
      {/* Search Input */}
      <div style={searchContainerStyle}>
        
        <SearchableProductDropdown
          //value={item.productId}
          onChange={(results) => {
            devLog(results)
            let pro: Product = results as Product;
            
            //setSearchResults([pro]);
            setIsSearching(true);
            handleProductSelect(pro);
            /**
            updateItem(index(), 'productId', selectedProductId.id);
            let prod = {
              'id': selectedProductId.id,
              'label': selectedProductId.name,
              'code': selectedProductId.sku
            }
            updateItem(index(), 'product', prod);
            //id: 'DWE2AGqPBRhNxJ65', label: 'PULOVER MARATON HOMBRE', code: '1275301B1'
            //updateItem(index(), 'product', selectedProductId.id);

            // Auto-fill unit cost when product is selected
            const product = inventoryStore.getProductById(selectedProductId.id);
            if (product && !item.unitCost) {
              updateItem(index(), 'unitCost', product.unitCost);
            }

             */
          }}
          placeholder={t('inventory.searchProductsImages', 'Search products to view images...')}
          //onAddNew={() => setIsAddProductModalOpen(true)}
          //required
        />
      </div>

      

      {/* Selected Product Detail */}
      <Show when={selectedProduct() && props.showDetails !== false}>
        <div style={selectedProductStyle}>
          <div style={selectedImageStyle}>
            <img
              src={getProductImage(selectedProduct()!)}
              alt={selectedProduct()!.name}
              style={{
                width: '100%',
                height: '100%',
                //'object-fit': 'cover' as const,
                'object-fit': "contain" as const,
                "aspect-ratio": "1 / 1"
              }}
            />
          </div>
          <div
          onClick={()=>{
     
               clearProductSelect();
          }} 
          style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      //background: 'var(--primary-color)',
                      color: '#3d3d3d',
                      'border-radius': '50%',
                      width: '2rem',
                      height: '2rem',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'font-size': '1.25rem',
                      "box-shadow": 'var(--shadow-sm)',
                      cursor: "pointer"
                    }}>
                      X
                    </div>
          <div style={selectedDetailsStyle}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>
                {selectedProduct()!.name}
              </h2>
              <div style={stockBadgeStyle(true)}>
                {t('products.inStock', 'In Stock')}
              </div>
            </div>

            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('products.sku', 'SKU')}</span>
              <span style={valueStyle}>{selectedProduct()!.sku}</span>
            </div>

            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('inventory.category', 'Category')}</span>
              <span style={valueStyle}>{selectedProduct()!.category}</span>
            </div>

            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('inventory.unitOfMeasure', 'Unit')}</span>
              <span style={valueStyle}>{selectedProduct()!.unitOfMeasure}</span>
            </div>

            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('inventory.unitCost', 'Cost')}</span>
              <span style={valueStyle}>{formatCurrency(selectedProduct()!.unitCost)}</span>
            </div>

            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('inventory.UPC', 'UPC')}</span>
              <span style={valueStyle}>{selectedProduct()!.UPC}</span>
            </div>

            
            <Show when={selectedProduct()!.description}>
              <div style={{ 'margin-top': '1rem' }}>
                <div style={labelStyle}>{t('common.description', 'Description')}</div>
                <div style={{ 'margin-top': '0.5rem', color: 'var(--text-primary)' }}>
                  {selectedProduct()!.description}
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

{JSON.stringify(searchResults())}
      {/* Search Results Grid */}
      <Show when={searchResults().length > 0}>
        <div style={resultsGridStyle}>
          <For each={searchResults()}>
            {(product) => (
              <div
                style={productCardStyle}
                onClick={() => handleProductSelect(product)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                }}
              >
                 
                <div style={imageContainerStyle}>
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    style={imageStyle}
                    loading="lazy"
                  />
                  <Show when={product === selectedProduct()}>
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'var(--primary-color)',
                      color: 'white',
                      'border-radius': '50%',
                      width: '2rem',
                      height: '2rem',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'font-size': '1.25rem'
                    }}>
                      ✓
                    </div>
                  </Show>
                </div>
                
                <div style={productInfoStyle}>
                  <div style={productNameStyle} title={product.name}>
                    {product.name}
                  </div>
                  <div style={productDetailStyle}>
                    {product.sku} • {product.category}
                  </div>
                  <div style={productDetailStyle}>
                    {product.unitOfMeasure}
                  </div>
                  <div style={priceStyle}>
                    {formatCurrency(product.sellingPrice)}
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

    

      {/* No Results State */}
      <Show when={!selectedProduct()}>
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>📦</div>
          <h3 style={{ 'margin-bottom': '0.5rem' }}>
            {t('inventory.noProductsFound', 'No Products Found')}
          </h3>
          <p>
            {t('inventory.tryDifferentSearch', 'Try a different search term')}
          </p>
        </div>
      </Show>
    </div>
  );
};

export default ProductImageViewer;




  {/* Empty State 
  <Show when={!isSearching() && searchResults().length === 0}>
  <div style={emptyStateStyle}>
    <div style={emptyIconStyle}>🔍</div>
    <h3 style={{ 'margin-bottom': '0.5rem' }}>
      {t('inventory.searchForProducts', 'Search for Products')}
    </h3>
    <p>
      {t('inventory.startTypingToSearch', 'Start typing to search and view product images')}
    </p>
  </div>
</Show>
*/}