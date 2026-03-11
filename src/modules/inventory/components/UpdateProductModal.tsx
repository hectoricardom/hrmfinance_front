import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { inventoryStore, Product, PricesByLocation } from '../stores/inventoryStore';
import { authStore } from '../../../stores/authStore';

interface UpdateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onProductUpdated?: (productId: string) => void;
}

const DEFAULT_MARKUP = 1.666;

const UpdateProductModal: Component<UpdateProductModalProps> = (props) => {
  const { t } = useTranslation();

  // Form state
  const [name, setName] = createSignal('');
  const [sku, setSku] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [category, setCategory] = createSignal('');
  const [unitOfMeasure, setUnitOfMeasure] = createSignal('pcs');
  const [unitCost, setUnitCost] = createSignal(0);
  const [sellingPrice, setSellingPrice] = createSignal(0);
  const [minStockLevel, setMinStockLevel] = createSignal(10);
  const [maxStockLevel, setMaxStockLevel] = createSignal(100);
  const [isActive, setIsActive] = createSignal(true);
  const [validationError, setValidationError] = createSignal('');

  // Location-specific pricing state
  const [pricesByLocation, setPricesByLocation] = createSignal<PricesByLocation>({});
  const [showLocationPricing, setShowLocationPricing] = createSignal(false);

  // Get available stores/locations
  const locations = () => authStore.stores || [];

  // Calculate suggested price based on markup
  const suggestedPrice = () => (unitCost() * DEFAULT_MARKUP).toFixed(2);

  // Update form when product changes
  createEffect(() => {
    if (props.product) {
      setName(props.product.name);
      setSku(props.product.sku);
      setDescription(props.product.description || '');
      setCategory(props.product.category);
      setUnitOfMeasure(props.product.unitOfMeasure);
      setUnitCost(props.product.unitCost);
      setSellingPrice(props.product.sellingPrice);
      setMinStockLevel(props.product.minStockLevel);
      setMaxStockLevel(props.product.maxStockLevel);
      setIsActive(props.product.isActive);
      setPricesByLocation(props.product.pricesByLocation || {});
      setShowLocationPricing(Object.keys(props.product.pricesByLocation || {}).length > 0);
      setValidationError('');
    }
  });

  // Update location-specific price
  const updateLocationPrice = (locationId: string, price: number) => {
    setPricesByLocation(prev => {
      const updated = { ...prev };
      if (price > 0) {
        updated[locationId] = {
          sellingPrice: price,
          effectiveDate: new Date().toISOString()
        };
      } else {
        delete updated[locationId];
      }
      return updated;
    });
  };

  // Get price for a specific location
  const getLocationPrice = (locationId: string): number => {
    return pricesByLocation()[locationId]?.sellingPrice || 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setValidationError('');

    if (!props.product) return;

    // Basic validation
    if (!name().trim()) {
      setValidationError(t('forms.productNameRequired', 'Product name is required'));
      return;
    }

    if (!sku().trim()) {
      setValidationError(t('forms.skuRequired', 'SKU is required'));
      return;
    }

    if (!category().trim()) {
      setValidationError(t('forms.categoryRequired', 'Category is required'));
      return;
    }

    if (unitCost() < 0) {
      setValidationError(t('forms.unitCostNotNegative', 'Unit cost cannot be negative'));
      return;
    }

    if (sellingPrice() < 0) {
      setValidationError(t('forms.sellingPriceNotNegative', 'Selling price cannot be negative'));
      return;
    }

    if (minStockLevel() < 0) {
      setValidationError(t('forms.minStockNotNegative', 'Min stock level cannot be negative'));
      return;
    }

    if (maxStockLevel() <= minStockLevel()) {
      setValidationError(t('forms.maxStockGreaterThanMin', 'Max stock level must be greater than min stock level'));
      return;
    }

    // Check if SKU already exists (excluding current product)
    const existingProducts = inventoryStore.getProductsBySku(sku());
    if (existingProducts.length > 0 && existingProducts[0].id !== props.product.id) {
      setValidationError(t('forms.skuAlreadyExists', 'SKU already exists'));
      return;
    }

    // Update the product with location-specific pricing
    const updatedProduct: Product = {
      ...props.product,
      name: name().trim(),
      sku: sku().trim().toUpperCase(),
      description: description().trim(),
      category: category().trim(),
      unitOfMeasure: unitOfMeasure(),
      unitCost: unitCost(),
      sellingPrice: sellingPrice(),
      minStockLevel: minStockLevel(),
      maxStockLevel: maxStockLevel(),
      isActive: isActive(),
      pricesByLocation: showLocationPricing() ? pricesByLocation() : undefined,
      lastModified: new Date().toISOString()
    };

    inventoryStore.updateProduct(props.product.id, updatedProduct);
    
    // Call the callback if provided
    if (props.onProductUpdated) {
      props.onProductUpdated(props.product.id);
    }

    props.onClose();
  };

  const handleClose = () => {
    setValidationError('');
    props.onClose();
  };

  // Calculate profit margin
  const profitMargin = () => {
    if (unitCost() === 0) return 0;
    return ((sellingPrice() - unitCost()) / unitCost() * 100).toFixed(2);
  };

  // Styles
  const formGroupStyle = {
    'margin-bottom': '1.5rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.5rem',
    'font-weight': '500',
    color: 'var(--text-primary)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const errorStyle = {
    color: '#f44336',
    'font-size': '0.875rem',
    'margin-bottom': '1rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  };

  const profitInfoStyle = {
    padding: '1rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin': '1.5rem 0',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const toggleStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    cursor: 'pointer'
  };

  return (
    <Modal 
      isOpen={props.isOpen} 
      onClose={handleClose} 
      title={t('products.updateProduct', 'Update Product')}
      size="large"
    >
      <Show when={props.product} fallback={
        <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          {t('products.noProductSelected', 'No product selected')}
        </div>
      }>
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('inventory.productName', 'Product Name')} *</label>
            <input
              type="text"
              style={inputStyle}
              value={name()}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inventory.enterProductName', 'Enter product name')}
              required
            />
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>{t('inventory.sku', 'SKU')} *</label>
              <input
                type="text"
                style={inputStyle}
                value={sku()}
                onChange={(e) => setSku(e.target.value)}
                placeholder={t('inventory.enterSkuCode', 'Enter SKU code')}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{t('inventory.category', 'Category')} *</label>
              <input
                type="text"
                style={inputStyle}
                value={category()}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t('inventory.enterCategory', 'Enter category')}
                list="categories"
                required
              />
              <datalist id="categories">
                <option value="Electronics" />
                <option value="Accessories" />
                <option value="Office" />
                <option value="Furniture" />
                <option value="Software" />
                <option value="Hardware" />
              </datalist>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.description', 'Description')}</label>
            <textarea
              style={{
                ...inputStyle,
                'min-height': '80px',
                resize: 'vertical'
              }}
              value={description()}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('inventory.enterProductDescription', 'Enter product description')}
            />
          </div>

          {/* Status Toggle */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('products.status', 'Status')}</label>
            <div style={toggleStyle}>
              <input
                type="checkbox"
                id="activeStatus"
                checked={isActive()}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label for="activeStatus" style={{ cursor: 'pointer' }}>
                {isActive() ? 
                  <span style={{ color: '#2e7d32' }}>✓ {t('common.active', 'Active')}</span> : 
                  <span style={{ color: '#d32f2f' }}>✗ {t('common.inactive', 'Inactive')}</span>
                }
              </label>
            </div>
          </div>

          {/* Pricing and Measurements */}
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>{t('inventory.unitOfMeasure', 'Unit of Measure')}</label>
              <select
                style={selectStyle}
                value={unitOfMeasure()}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
              >
                <option value="pcs">{t('inventory.pieces', 'Pieces')}</option>
                <option value="kg">{t('inventory.kilograms', 'Kilograms')}</option>
                <option value="lbs">{t('inventory.pounds', 'Pounds')}</option>
                <option value="m">{t('inventory.meters', 'Meters')}</option>
                <option value="ft">{t('inventory.feet', 'Feet')}</option>
                <option value="l">{t('inventory.liters', 'Liters')}</option>
                <option value="gal">{t('inventory.gallons', 'Gallons')}</option>
                <option value="box">{t('inventory.boxes', 'Boxes')}</option>
                <option value="pack">{t('inventory.packs', 'Packs')}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('inventory.unitCost', 'Unit Cost')}</label>
              <input
                type="number"
                style={inputStyle}
                value={unitCost()}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>{t('inventory.sellingPrice', 'Selling Price')}</label>
              <input
                type="number"
                style={inputStyle}
                value={sellingPrice()}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div>
              {/* Empty cell for grid alignment */}
            </div>
          </div>

          {/* Profit Information */}
          <div style={profitInfoStyle}>
            <div>
              <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                {t('products.profit', 'Profit')}:
              </span>
              <span style={{ 'margin-left': '0.5rem', 'font-weight': '600' }}>
                ${(sellingPrice() - unitCost()).toFixed(2)}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                {t('products.profitMargin', 'Profit Margin')}:
              </span>
              <span style={{ 'margin-left': '0.5rem', 'font-weight': '600' }}>
                {profitMargin()}%
              </span>
            </div>
          </div>

          {/* Suggested Price Info */}
          <Show when={sellingPrice() === 0 || !sellingPrice()}>
            <div style={{
              padding: '0.75rem 1rem',
              background: '#fff8e1',
              border: '1px solid #ffc107',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1rem',
              'font-size': '0.875rem',
              color: '#856404'
            }}>
              <strong>{t('products.noSellingPrice', 'No selling price set')}:</strong>{' '}
              {t('products.suggestedPriceInfo', 'System will use')} <strong>${suggestedPrice()}</strong>{' '}
              ({t('products.costMultiplier', 'cost × 1.666')})
            </div>
          </Show>

          {/* Location-specific Pricing Section */}
          <div style={{
            'margin-bottom': '1.5rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            overflow: 'hidden'
          }}>
            <button
              type="button"
              onClick={() => setShowLocationPricing(!showLocationPricing())}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: showLocationPricing() ? 'var(--primary-color)' : 'var(--surface-color)',
                color: showLocationPricing() ? 'white' : 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'font-weight': '500'
              }}
            >
              <span>
                📍 {t('products.locationPricing', 'Location-specific Pricing')}
                {Object.keys(pricesByLocation()).length > 0 && (
                  <span style={{
                    'margin-left': '0.5rem',
                    background: showLocationPricing() ? 'rgba(255,255,255,0.2)' : 'var(--primary-color)',
                    color: 'white',
                    padding: '0.125rem 0.5rem',
                    'border-radius': '9999px',
                    'font-size': '0.75rem'
                  }}>
                    {Object.keys(pricesByLocation()).length}
                  </span>
                )}
              </span>
              <span>{showLocationPricing() ? '▼' : '▶'}</span>
            </button>

            <Show when={showLocationPricing()}>
              <div style={{ padding: '1rem' }}>
                <p style={{
                  'font-size': '0.8rem',
                  color: 'var(--text-muted)',
                  'margin-bottom': '1rem',
                  'line-height': '1.4'
                }}>
                  {t('products.locationPricingHelp', 'Set different prices for each store. Leave empty to use the default selling price or calculated price (cost × 1.666).')}
                </p>

                <Show when={locations().length > 0} fallback={
                  <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '1rem' }}>
                    {t('products.noLocationsAvailable', 'No stores/locations available')}
                  </div>
                }>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                    <For each={locations()}>
                      {(location) => {
                        const locationPrice = getLocationPrice(location.id);
                        const effectivePrice = locationPrice || (sellingPrice() > 0 ? sellingPrice() : unitCost() * DEFAULT_MARKUP);

                        return (
                          <div style={{
                            display: 'grid',
                            'grid-template-columns': '1fr 150px 80px',
                            gap: '0.75rem',
                            'align-items': 'center',
                            padding: '0.5rem',
                            background: locationPrice > 0 ? '#e8f5e9' : 'var(--surface-color)',
                            'border-radius': 'var(--border-radius-sm)',
                            border: '1px solid var(--border-color)'
                          }}>
                            <div>
                              <div style={{ 'font-weight': '500', 'font-size': '0.9rem' }}>
                                {location.name}
                              </div>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                {locationPrice > 0 ? (
                                  <span style={{ color: '#2e7d32' }}>✓ {t('products.customPrice', 'Custom price')}</span>
                                ) : sellingPrice() > 0 ? (
                                  <span>{t('products.usingDefaultPrice', 'Using default price')}</span>
                                ) : (
                                  <span>{t('products.usingCalculatedPrice', 'Using calculated price')}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <span style={{
                                position: 'absolute',
                                left: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                              }}>$</span>
                              <input
                                type="number"
                                style={{
                                  ...inputStyle,
                                  'padding-left': '1.5rem',
                                  'font-size': '0.9rem'
                                }}
                                value={locationPrice || ''}
                                onChange={(e) => updateLocationPrice(location.id, Number(e.target.value))}
                                placeholder={effectivePrice.toFixed(2)}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div style={{
                              'text-align': 'right',
                              'font-size': '0.8rem',
                              color: 'var(--text-muted)'
                            }}>
                              <Show when={locationPrice > 0}>
                                <button
                                  type="button"
                                  onClick={() => updateLocationPrice(location.id, 0)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#d32f2f',
                                    cursor: 'pointer',
                                    'font-size': '0.8rem',
                                    'text-decoration': 'underline'
                                  }}
                                >
                                  {t('common.clear', 'Clear')}
                                </button>
                              </Show>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>

                {/* Apply to all button */}
                <Show when={locations().length > 1 && sellingPrice() > 0}>
                  <div style={{ 'margin-top': '1rem', 'text-align': 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrices: PricesByLocation = {};
                        locations().forEach(loc => {
                          newPrices[loc.id] = {
                            sellingPrice: sellingPrice(),
                            effectiveDate: new Date().toISOString()
                          };
                        });
                        setPricesByLocation(newPrices);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--primary-color)',
                        color: 'var(--primary-color)',
                        padding: '0.5rem 1rem',
                        'border-radius': 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        'font-size': '0.85rem'
                      }}
                    >
                      {t('products.applyDefaultToAll', 'Apply default price to all locations')}
                    </button>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          {/* Stock Levels */}
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>{t('inventory.minimumStockLevel', 'Minimum Stock Level')}</label>
              <input
                type="number"
                style={inputStyle}
                value={minStockLevel()}
                onChange={(e) => setMinStockLevel(Number(e.target.value))}
                min="0"
                step="1"
              />
            </div>
            <div>
              <label style={labelStyle}>{t('inventory.maximumStockLevel', 'Maximum Stock Level')}</label>
              <input
                type="number"
                style={inputStyle}
                value={maxStockLevel()}
                onChange={(e) => setMaxStockLevel(Number(e.target.value))}
                min="1"
                step="1"
              />
            </div>
          </div>

          {/* Validation Errors */}
          {validationError() && (
            <div style={errorStyle}>{validationError()}</div>
          )}

          <div style={buttonGroupStyle}>
            <Button variant="secondary" type="button" onClick={handleClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" type="submit">
              {t('common.update', 'Update')}
            </Button>
          </div>
        </form>
      </Show>
    </Modal>
  );
};

export default UpdateProductModal;