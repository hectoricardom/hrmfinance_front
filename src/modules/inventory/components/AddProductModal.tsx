import { Component, createSignal } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { inventoryStore } from '../stores/inventoryStore';
import { productsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: (productId: string) => void; // Callback when product is successfully added
}

const AddProductModal: Component<AddProductModalProps> = (props) => {
  const { t } = useTranslation();
  const [name, setName] = createSignal('');
  const [sku, setSku] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [category, setCategory] = createSignal('');
  const [unitOfMeasure, setUnitOfMeasure] = createSignal('pcs');
  const [unitCost, setUnitCost] = createSignal(0);
  const [sellingPrice, setSellingPrice] = createSignal(0);
  const [minStockLevel, setMinStockLevel] = createSignal(10);
  const [maxStockLevel, setMaxStockLevel] = createSignal(100);
  const [validationError, setValidationError] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const resetForm = () => {
    setName('');
    setSku('');
    setDescription('');
    setCategory('');
    setUnitOfMeasure('pcs');
    setUnitCost(0);
    setSellingPrice(0);
    setMinStockLevel(10);
    setMaxStockLevel(100);
    setValidationError('');
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setValidationError('');

    // Basic validation
    if (!name().trim()) {
      setValidationError(t('forms.productNameRequired'));
      return;
    }

    if (!sku().trim()) {
      setValidationError(t('forms.skuRequired'));
      return;
    }

    if (!category().trim()) {
      setValidationError(t('forms.categoryRequired'));
      return;
    }

    if (unitCost() < 0) {
      setValidationError(t('forms.unitCostNotNegative'));
      return;
    }

    if (sellingPrice() < 0) {
      setValidationError(t('forms.sellingPriceNotNegative'));
      return;
    }

    if (minStockLevel() < 0) {
      setValidationError(t('forms.minStockNotNegative'));
      return;
    }

    if (maxStockLevel() <= minStockLevel()) {
      setValidationError(t('forms.maxStockGreaterThanMin'));
      return;
    }

    // Check if SKU already exists
    const existingProducts = inventoryStore.getProductsBySku(sku());
    if (existingProducts.length > 0) {
      setValidationError(t('forms.skuAlreadyExists'));
      return;
    }

    // Create the new product
    const newProductData = {
      name: name().trim(),
      sku: sku().trim().toUpperCase(),
      description: description().trim(),
      category: category().trim(),
      unitOfMeasure: unitOfMeasure(),
      unitCost: unitCost(),
      sellingPrice: sellingPrice(),
      minStockLevel: minStockLevel(),
      maxStockLevel: maxStockLevel(),
      isActive: true,
      businessId: authStore.getBusinessId() || 'default-business'
    };

    setIsSubmitting(true);

    try {
      // Create product via API
      const createdProduct = await productsApi.create(newProductData);

      // Also add to local store for immediate UI update
      inventoryStore.addProduct(createdProduct);

      // Call the callback if provided
      if (props.onProductAdded) {
        props.onProductAdded(createdProduct.id);
      }

      resetForm();
      props.onClose();
    } catch (error) {
      console.error('Error creating product:', error);
      setValidationError(
        error instanceof Error
          ? error.message
          : t('forms.errorCreatingProduct', 'Error creating product. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
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

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title={t('inventory.addNewProduct')}>
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('inventory.productName')} *</label>
          <input
            type="text"
            style={inputStyle}
            value={name()}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('inventory.enterProductName')}
            required
          />
        </div>

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>{t('inventory.sku')} *</label>
            <input
              type="text"
              style={inputStyle}
              value={sku()}
              onChange={(e) => setSku(e.target.value)}
              placeholder={t('inventory.enterSkuCode')}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>{t('inventory.category')} *</label>
            <input
              type="text"
              style={inputStyle}
              value={category()}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('inventory.enterCategory')}
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
              <option value="Alimentos" />
              <option value="Medicamentos" />
              <option value="Electrodomesticos" />
              
            </datalist>
          </div>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('common.description')}</label>
          <textarea
            style={{
              ...inputStyle,
              'min-height': '80px',
              resize: 'vertical'
            }}
            value={description()}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('inventory.enterProductDescription')}
          />
        </div>

        {/* Pricing and Measurements */}
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>{t('inventory.unitOfMeasure')}</label>
            <select
              style={selectStyle}
              value={unitOfMeasure()}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
            >
              <option value="pcs">{t('inventory.pieces')}</option>
              <option value="kg">{t('inventory.kilograms')}</option>
              <option value="lbs">{t('inventory.pounds')}</option>
              <option value="m">{t('inventory.meters')}</option>
              <option value="ft">{t('inventory.feet')}</option>
              <option value="l">{t('inventory.liters')}</option>
              <option value="gal">{t('inventory.gallons')}</option>
              <option value="box">{t('inventory.boxes')}</option>
              <option value="pack">{t('inventory.packs')}</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('inventory.unitCost')}</label>
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
            <label style={labelStyle}>{t('inventory.sellingPrice')}</label>
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
          <div></div>
        </div>

        {/* Stock Levels */}
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>{t('inventory.minimumStockLevel')}</label>
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
            <label style={labelStyle}>{t('inventory.maximumStockLevel')}</label>
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
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSubmitting()}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting()}>
            {isSubmitting() ? '⏳ ' + t('common.saving', 'Saving...') : '➕ ' + t('inventory.addProduct')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddProductModal;