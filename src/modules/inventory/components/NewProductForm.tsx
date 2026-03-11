import { Component, createSignal, Show } from 'solid-js';
import { NewProductData } from '../types/receiving';
import { Product } from '../stores/inventoryStore';
import { Button, FormInput, FormSelect, Modal } from '../../ui';
import { useTranslation } from '../../../translations';

interface NewProductFormProps {
  suggestedData?: Partial<Product>;
  onSubmit: (data: NewProductData) => void;
  onCancel: () => void;
}

const NewProductForm: Component<NewProductFormProps> = (props) => {
  const { t } = useTranslation();

  const [name, setName] = createSignal(props.suggestedData?.name || '');
  const [sku, setSku] = createSignal(props.suggestedData?.sku || '');
  const [description, setDescription] = createSignal(props.suggestedData?.description || '');
  const [category, setCategory] = createSignal(props.suggestedData?.category || '');
  const [unitOfMeasure, setUnitOfMeasure] = createSignal(props.suggestedData?.unitOfMeasure || 'pcs');
  const [unitCost, setUnitCost] = createSignal(props.suggestedData?.unitCost?.toString() || '0');
  const [validationError, setValidationError] = createSignal('');

  const categoryOptions = [
    { value: '', label: 'Seleccionar categoria' },
    { value: 'Electronics', label: 'Electrónica' },
    { value: 'Accessories', label: 'Accesorios' },
    { value: 'Office', label: 'Oficina' },
    { value: 'Furniture', label: 'Muebles' },
    { value: 'Supplies', label: 'Suministros' },
    { value: 'Food', label: 'Alimentos' },
    { value: 'Beverage', label: 'Bebidas' },
    { value: 'Other', label: 'Otro' }
  ];

  const unitOfMeasureOptions = [
    { value: 'pcs', label: 'Piezas' },
    { value: 'box', label: 'Cajas' },
    { value: 'kg', label: 'Kilogramos' },
    { value: 'lbs', label: 'Libras' },
    { value: 'ltr', label: 'Litros' },
    { value: 'gal', label: 'Galones' },
    { value: 'unit', label: 'Unidades' }
  ];

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setValidationError('');

    // Validation
    if (!name().trim()) {
      setValidationError('El nombre del producto es requerido');
      return;
    }

    if (!unitOfMeasure()) {
      setValidationError('La unidad de medida es requerida');
      return;
    }

    const cost = parseFloat(unitCost());
    if (isNaN(cost) || cost < 0) {
      setValidationError('El costo unitario debe ser un número válido y no negativo');
      return;
    }

    const productData: NewProductData = {
      name: name().trim(),
      sku: sku().trim(),
      UPC: props.suggestedData?.UPC,
      description: description().trim(),
      category: category(),
      unitOfMeasure: unitOfMeasure(),
      unitCost: cost,
      productImageUrl: props.suggestedData?.productImageUrl
    };

    props.onSubmit(productData);
  };

  const formStyle = {
    padding: '1.5rem',
    'max-width': '600px'
  };

  const errorStyle = {
    padding: '0.75rem',
    'margin-bottom': '1rem',
    'background-color': '#fdecea',
    color: '#c0392b',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid #e74c3c'
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '1.5rem'
  };

  const imagePreviewStyle = {
    width: '150px',
    height: '150px',
    'object-fit': 'cover' as const,
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    border: '2px solid var(--border-color)'
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
        Crear Nuevo Producto
      </h3>

      <Show when={validationError()}>
        <div style={errorStyle}>
          {validationError()}
        </div>
      </Show>

      <Show when={props.suggestedData?.productImageUrl}>
        <div style={{ 'text-align': 'center' }}>
          <img
            src={props.suggestedData!.productImageUrl}
            alt="Vista previa"
            style={imagePreviewStyle}
          />
        </div>
      </Show>

      <FormInput
        label="Nombre del Producto"
        type="text"
        value={name()}
        onChange={setName}
        placeholder="Ej: Cable USB-C"
        required
      />

      <FormInput
        label="SKU (Opcional)"
        type="text"
        value={sku()}
        onChange={setSku}
        placeholder="Ej: USB-001"
      />

      <FormInput
        label="Descripción (Opcional)"
        type="text"
        value={description()}
        onChange={setDescription}
        placeholder="Breve descripción del producto"
      />

      <FormSelect
        label="Categoría"
        value={category()}
        onChange={setCategory}
        options={categoryOptions}
      />

      <FormSelect
        label="Unidad de Medida"
        value={unitOfMeasure()}
        onChange={setUnitOfMeasure}
        options={unitOfMeasureOptions}
        required
      />

      <FormInput
        label="Costo Unitario"
        type="number"
        step="0.01"
        min="0"
        value={unitCost()}
        onChange={setUnitCost}
        placeholder="0.00"
        required
      />

      <Show when={props.suggestedData?.UPC}>
        <div style={{
          padding: '0.75rem',
          'background-color': '#e8f5e9',
          'border-radius': 'var(--border-radius-sm)',
          'margin-bottom': '1rem'
        }}>
          <strong>UPC:</strong> {props.suggestedData!.UPC}
        </div>
      </Show>

      <div style={buttonContainerStyle}>
        <Button
          type="button"
          variant="secondary"
          onClick={props.onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
        >
          Crear Producto
        </Button>
      </div>
    </form>
  );
};

export default NewProductForm;
