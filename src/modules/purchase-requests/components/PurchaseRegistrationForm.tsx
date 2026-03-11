import { Component, createSignal, Show, createEffect } from 'solid-js';
import { Modal, Button, FormInput, Card, FormSelect } from '../../ui';
import { useTranslation } from '../../../translations';
import { 
  PurchaseRegistration,
  CreatePurchaseRegistrationInput,
  PLATFORMS 
} from '../types/purchaseRequestTypes';

interface PurchaseRegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePurchaseRegistrationInput) => Promise<void>;
  editingRegistration?: PurchaseRegistration | null;
  isLoading?: boolean;
}

const PurchaseRegistrationForm: Component<PurchaseRegistrationFormProps> = (props) => {
  const { t } = useTranslation();
  
  // Initialize form data based on whether we're editing or creating
  const getInitialFormData = (): CreatePurchaseRegistrationInput => {
    if (props.editingRegistration) {
      return {
        store: props.editingRegistration.store,
        platform: props.editingRegistration.platform,
        totalProducts: props.editingRegistration.totalProducts,
        totalPrice: props.editingRegistration.totalPrice,
        currency: props.editingRegistration.currency,
        bonus: props.editingRegistration.bonus || 0,
        refund: props.editingRegistration.refund || 0,
        purchaseDate: props.editingRegistration.purchaseDate,
        description: props.editingRegistration.description || '',
        notes: props.editingRegistration.notes || '',
        relatedRequests: props.editingRegistration.relatedRequests || []
      };
    }
    
    return {
      store: '',
      platform: 'other',
      totalProducts: 1,
      totalPrice: 0,
      currency: 'USD',
      bonus: 0,
      refund: 0,
      purchaseDate: new Date().toISOString().split('T')[0], // Today's date
      description: '',
      notes: '',
      relatedRequests: []
    };
  };
  
  // Form state
  const [formData, setFormData] = createSignal<CreatePurchaseRegistrationInput>(getInitialFormData());

  // Error state
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  // Effect to update form data when editing registration changes
  createEffect(() => {
    if (props.isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
    }
  });

  // Check if we're in edit mode
  const isEditMode = () => !!props.editingRegistration;

  // Calculate net total automatically
  const calculateNetTotal = () => {
    const data = formData();
    return data.totalPrice - (data.bonus || 0) - (data.refund || 0);
  };

  const validateForm = (): boolean => {
    const data = formData();
    const newErrors: Record<string, string> = {};

    if (!data.store.trim()) {
      newErrors.store = 'La tienda es requerida';
    }

    if (data.totalProducts <= 0) {
      newErrors.totalProducts = 'El número de productos debe ser mayor a 0';
    }

    if (data.totalPrice <= 0) {
      newErrors.totalPrice = 'El precio total debe ser mayor a 0';
    }

    if (!data.purchaseDate) {
      newErrors.purchaseDate = 'La fecha de compra es requerida';
    }

    if (data.bonus && data.bonus < 0) {
      newErrors.bonus = 'El bonus no puede ser negativo';
    }

    if (data.refund && data.refund < 0) {
      newErrors.refund = 'La devolución no puede ser negativa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await props.onSubmit(formData());
      handleClose();
    } catch (error) {
      console.error('Error submitting purchase registration:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      store: '',
      platform: 'other',
      totalProducts: 1,
      totalPrice: 0,
      currency: 'USD',
      bonus: 0,
      refund: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
      relatedRequests: []
    });
    setErrors({});
    props.onClose();
  };

  const updateField = <K extends keyof CreatePurchaseRegistrationInput>(
    field: K,
    value: CreatePurchaseRegistrationInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors()[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const containerStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const sectionStyle = {
    display: 'grid',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const calculationStyle = {
    'background-color': 'var(--surface-light)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-md)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '1rem'
  };

  const netTotalStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--primary-color)',
    'text-align': 'center' as const,
    'margin-top': '0.5rem'
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} size="large">
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ 
          'font-size': '1.5rem', 
          'font-weight': '600', 
          'margin-bottom': '1.5rem',
          color: 'var(--text-primary)'
        }}>
          {isEditMode() ? 'Editar Registro de Compra' : 'Registrar Nueva Compra'}
        </h2>

        {/* Store and Platform Info */}
        <Card style={{ 'margin-bottom': '1.5rem' }}>
          <h3 style={{ 
            'font-size': '1.125rem', 
            'font-weight': '500', 
            'margin-bottom': '1rem',
            color: 'var(--text-primary)'
          }}>
            Información de la Tienda
          </h3>
          
          <div style={containerStyle}>
            <FormInput
              label="Tienda *"
              value={formData().store}
              onChange={(value) => updateField('store', value)}
              placeholder="Ej: Amazon Store, Temu Official, etc."
              required
            />
            <Show when={errors().store}>
              <div style={{ color: 'var(--error-color)', 'font-size': '0.875rem' }}>
                {errors().store}
              </div>
            </Show>

            <FormSelect
              label="Plataforma"
              value={formData().platform}
              onChange={(value) => updateField('platform', value as any)}
              options={PLATFORMS.map(p => ({ value: p.value, label: p.label }))}
            />
          </div>
        </Card>

        {/* Purchase Details */}
        <Card style={{ 'margin-bottom': '1.5rem' }}>
          <h3 style={{ 
            'font-size': '1.125rem', 
            'font-weight': '500', 
            'margin-bottom': '1rem',
            color: 'var(--text-primary)'
          }}>
            Detalles de la Compra
          </h3>
          
          <div style={containerStyle}>
            <FormInput
              label="Total de Productos *"
              type="number"
              value={formData().totalProducts.toString()}
              onChange={(value) => updateField('totalProducts', parseInt(value) || 0)}
              placeholder="1"
              required
            />
            <Show when={errors().totalProducts}>
              <div style={{ color: 'var(--error-color)', 'font-size': '0.875rem' }}>
                {errors().totalProducts}
              </div>
            </Show>

            <FormInput
              label="Precio Total *"
              type="number"
              value={formData().totalPrice.toString()}
              onChange={(value) => updateField('totalPrice', parseFloat(value) || 0)}
              placeholder="0.00"
              required
            />
            <Show when={errors().totalPrice}>
              <div style={{ color: 'var(--error-color)', 'font-size': '0.875rem' }}>
                {errors().totalPrice}
              </div>
            </Show>

            <FormSelect
              label="Moneda"
              value={formData().currency}
              onChange={(value) => updateField('currency', value)}
              options={[
                { value: 'USD', label: 'USD - Dólar Americano' },
                { value: 'EUR', label: 'EUR - Euro' },
                { value: 'CAD', label: 'CAD - Dólar Canadiense' },
                { value: 'GBP', label: 'GBP - Libra Esterlina' }
              ]}
            />

            <FormInput
              label="Fecha de Compra *"
              type="date"
              value={formData().purchaseDate}
              onChange={(value) => updateField('purchaseDate', value)}
              required
            />
            <Show when={errors().purchaseDate}>
              <div style={{ color: 'var(--error-color)', 'font-size': '0.875rem' }}>
                {errors().purchaseDate}
              </div>
            </Show>
          </div>
        </Card>

        {/* Financial Details */}
        <Card style={{ 'margin-bottom': '1.5rem' }}>
          <h3 style={{ 
            'font-size': '1.125rem', 
            'font-weight': '500', 
            'margin-bottom': '1rem',
            color: 'var(--text-primary)'
          }}>
            Detalles Financieros
          </h3>
          
          <div style={containerStyle}>
            <FormInput
              label="Bonus"
              type="number"
              value={formData().bonus?.toString() || '0'}
              onChange={(value) => updateField('bonus', parseFloat(value) || 0)}
              placeholder="0.00"
            />
            <Show when={errors().bonus}>
              <div style={{ color: 'var(--error-color)', 'font-size': '0.875rem' }}>
                {errors().bonus}
              </div>
            </Show>

            <FormInput
              label="Devolución"
              type="number"
              value={formData().refund?.toString() || '0'}
              onChange={(value) => updateField('refund', parseFloat(value) || 0)}
              placeholder="0.00"
            />
            <Show when={errors().refund}>
              <div style={{ color: 'var(--error-color)', 'font-size': '0.875rem' }}>
                {errors().refund}
              </div>
            </Show>
          </div>

          {/* Calculation Summary */}
          <div style={calculationStyle}>
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': '1fr auto', 
              gap: '0.5rem',
              'margin-bottom': '0.5rem'
            }}>
              <span>Precio Total:</span>
              <span style={{ 'font-weight': '500' }}>
                {formData().currency} {formData().totalPrice.toFixed(2)}
              </span>
            </div>
            
            <Show when={(formData().bonus || 0) > 0}>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': '1fr auto', 
                gap: '0.5rem',
                'margin-bottom': '0.5rem'
              }}>
                <span>Menos Bonus:</span>
                <span style={{ color: 'var(--success-color)' }}>
                  -{formData().currency} {(formData().bonus || 0).toFixed(2)}
                </span>
              </div>
            </Show>

            <Show when={(formData().refund || 0) > 0}>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': '1fr auto', 
                gap: '0.5rem',
                'margin-bottom': '0.5rem'
              }}>
                <span>Menos Devolución:</span>
                <span style={{ color: 'var(--success-color)' }}>
                  -{formData().currency} {(formData().refund || 0).toFixed(2)}
                </span>
              </div>
            </Show>

            <hr style={{ 
              border: 'none', 
              height: '1px', 
              'background-color': 'var(--border-color)',
              margin: '0.5rem 0' 
            }} />

            <div style={netTotalStyle}>
              Total Neto: {formData().currency} {calculateNetTotal().toFixed(2)}
            </div>
          </div>
        </Card>

        {/* Additional Information */}
        <Card style={{ 'margin-bottom': '1.5rem' }}>
          <h3 style={{ 
            'font-size': '1.125rem', 
            'font-weight': '500', 
            'margin-bottom': '1rem',
            color: 'var(--text-primary)'
          }}>
            Información Adicional
          </h3>
          
          <div style={sectionStyle}>
            <FormInput
              label="Descripción"
              value={formData().description || ''}
              onChange={(value) => updateField('description', value)}
              placeholder="Descripción breve de la compra..."
            />

            <FormInput
              label="Notas"
              value={formData().notes || ''}
              onChange={(value) => updateField('notes', value)}
              placeholder="Notas adicionales..."
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          'justify-content': 'flex-end' 
        }}>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={props.isLoading}
          >
            Cancelar
          </Button>
          
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={props.isLoading}
          >
            {props.isLoading 
              ? 'Guardando...' 
              : (isEditMode() ? 'Actualizar Compra' : 'Registrar Compra')
            }
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseRegistrationForm;