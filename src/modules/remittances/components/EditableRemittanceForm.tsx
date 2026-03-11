import { Component, createSignal, Show, For, createEffect, onMount } from 'solid-js';
import SearchableCustomerDropdown from '../../invoice/components/SearchableCustomerDropdown';
import { generateRemittancePDF, previewRemittancePDF } from '../utils/remittancePdfGenerator';
import { generateRemittanceNumber } from '../utils/remittanceNumberGenerator';
import { RemittanceData, CreateRemittanceRequest, UpdateRemittanceRequest, AVAILABLE_CURRENCIES } from '../types/remittanceTypes';
import { remittanceApi } from '../services/remittanceApi';
import { generateRandomId } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  cid?: string;
  passport?: string;
  email?: string;
  address?: string;
  fullName?: string;
}

interface EditableRemittanceFormProps {
  remittance?: RemittanceData | null; // If provided, we're editing; if null/undefined, we're creating
  onSubmit?: (isEdit: boolean) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

interface Business {
  id: string;
  name: string;
}

const EditableRemittanceForm: Component<EditableRemittanceFormProps> = (props) => {
  const [selectedCustomer, setSelectedCustomer] = createSignal<Customer | null>(null);
  const [amount, setAmount] = createSignal(0);
  const [currency, setCurrency] = createSignal('CUP');
  const [exchangeRate, setExchangeRate] = createSignal(395);
  const [reference, setReference] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [businessId, setBusinessId] = createSignal<string>(authStore.getBusinessId());
  const [availableBusinesses, setAvailableBusinesses] = createSignal<Business[]>([]);

  const isEditMode = () => !!props.remittance;
  const isAdmin = () => authStore.isAdmin();

  // Load available businesses for admin users
  onMount(async () => {
    if (isAdmin()) {
      const businesses = await authStore.getAvailableBusinesses();
      setAvailableBusinesses(businesses);
    }
  });

  // Initialize form with existing data when editing
  createEffect(() => {
    const remittance = props.remittance;
    if (remittance) {
      setSelectedCustomer(remittance.customer);
      setAmount(remittance.amount);
      setCurrency(remittance.currency);
      setExchangeRate(remittance.exchangeRate || 1);
      setReference(remittance.reference || '');
      setNotes(remittance.notes || '');
      if (remittance.businessId) {
        setBusinessId(remittance.businessId);
      }
    } else {
      // Reset form for create mode
      setSelectedCustomer(null);
      setAmount(0);
      setCurrency('CUP');
      setExchangeRate(395);
      setReference('');
      setNotes('');
      setBusinessId(authStore.getBusinessId());
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!selectedCustomer()) {
      alert('Por favor seleccione un cliente');
      return;
    }
    
    if (amount() <= 0) {
      alert('Por favor ingrese una cantidad válida');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isEditMode()) {
        // Update existing remittance
        const updateRequest: UpdateRemittanceRequest = {
          id: props.remittance!.id!,
          customer: selectedCustomer()!,
          amount: amount(),
          currency: currency(),
          exchangeRate: exchangeRate(),
          reference: reference(),
          notes: notes(),
          ...(isAdmin() && { businessId: businessId() })
        };

        await remittanceApi.update(updateRequest);
        alert('Remesa actualizada exitosamente');
      } else {
        // Create new remittance
        const createRequest: CreateRemittanceRequest = {
          customer: selectedCustomer()!,
          amount: amount(),
          currency: currency(),
          exchangeRate: exchangeRate(),
          reference: reference(),
          notes: notes(),
          ...(isAdmin() && { businessId: businessId() })
        };

        const newRemittance = await remittanceApi.create(createRequest);
        
        // Generate PDF for new remittance
        const pdfData = {
          ...newRemittance,
          date: new Date(),
          remittanceNumber: newRemittance.remittanceNumber
        };
        
        generateRemittancePDF(pdfData);
        alert('¡Remesa creada exitosamente! Se ha descargado el recibo PDF.');
      }
      
      props.onSubmit?.(isEditMode());
      
      // Reset form if not in edit mode
      if (!isEditMode()) {
        setSelectedCustomer(null);
        setAmount(0);
        setCurrency('USD');
        setExchangeRate(1);
        setReference('');
        setNotes('');
      }
      
    } catch (error) {
      console.error('Error submitting remittance:', error);
      const errorMessage = isEditMode() 
        ? 'Error al actualizar la remesa. Por favor intente de nuevo.'
        : 'Error al crear la remesa. Por favor intente de nuevo.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    if (!selectedCustomer() || amount() <= 0) {
      alert('Por favor complete cliente y cantidad para ver la vista previa');
      return;
    }

    const remittanceData = {
      customer: selectedCustomer()!,
      amount: amount(),
      currency: currency(),
      exchangeRate: exchangeRate(),
      reference: reference(),
      notes: notes(),
      date: new Date(),
      remittanceNumber: isEditMode() 
        ? props.remittance!.remittanceNumber 
        : generateRandomId(),
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    previewRemittancePDF(remittanceData);
  };

  const handleCancel = () => {
    if (!isEditMode()) {
      setSelectedCustomer(null);
      setAmount(0);
      setCurrency('CUP');
      setExchangeRate(395);
      setReference('');
      setNotes('');
    }
    props.onCancel?.();
  };

  // Styles
  const containerStyle = props.isModal ? {
    'max-width': '600px',
    margin: '0 auto',
    padding: '0'
  } : {
    'max-width': '600px',
    margin: '0 auto',
    padding: '2rem',
    'background-color': 'white',
    'border-radius': '8px',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    'margin-bottom': '1.5rem',
    'text-align': 'center' as const,
    color: 'var(--text-primary)'
  };

  const formGroupStyle = {
    'margin-bottom': '1.5rem'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.5rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    'font-size': '1rem',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const textareaStyle = {
    ...inputStyle,
    'min-height': '80px',
    resize: 'vertical' as const
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    'background-color': 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    'font-weight': '500',
    'margin-right': '0.5rem'
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--border-color)',
    color: 'var(--text-secondary)'
  };

  const previewButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--secondary-color, #6b7280)',
    color: 'white'
  };

  const buttonContainerStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const summaryStyle = {
    'background-color': 'var(--strip-color)',
    padding: '1rem',
    'border-radius': '4px',
    'margin-bottom': '1.5rem'
  };

  const summaryItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'margin-bottom': '0.5rem'
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>
        {isEditMode() ? 'Editar Remesa' : 'Crear Remesa'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <SearchableCustomerDropdown
            value={selectedCustomer()}
            onChange={setSelectedCustomer}
            label="Seleccionar Cliente"
            placeholder="Buscar clientes por nombre, teléfono, cédula..."
            required
          />
        </div>

        {/* Business Selector - Admin Only */}
        <Show when={isAdmin() && availableBusinesses().length > 0}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Negocio</label>
            <select
              style={selectStyle}
              value={businessId()}
              onChange={(e) => setBusinessId(e.target.value)}
            >
              <For each={availableBusinesses()}>
                {(business) => (
                  <option value={business.id}>{business.name}</option>
                )}
              </For>
            </select>
          </div>
        </Show>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Moneda</label>
          <select
            style={selectStyle}
            value={currency()}
            onChange={(e) => setCurrency(e.target.value)}
            required
          >
            <For each={AVAILABLE_CURRENCIES}>
              {(curr) => (
                <option value={curr.code}>
                  {curr.symbol} {curr.code} - {curr.name}
                </option>
              )}
            </For>
          </select>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Cantidad USD</label>
          <input
            type="number"
            style={inputStyle}
            value={amount()}
            onInput={(e) => setAmount(parseFloat(e.target.value) || 0)}
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </div>

        <Show when={currency() !== 'USD'}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Tasa de Cambio (a USD)</label>
            <input
              type="number"
              style={inputStyle}
              value={exchangeRate()}
              onInput={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
              step="0.0001"
              min="0"
              placeholder="1.0000"
            />
          </div>
        </Show>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Referencia (Opcional)</label>
          <input
            type="text"
            style={inputStyle}
            value={reference()}
            onInput={(e) => setReference(e.target.value)}
            placeholder="Número de referencia o descripción"
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Notas (Opcional)</label>
          <textarea
            style={textareaStyle}
            value={notes()}
            onInput={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales sobre esta remesa"
          />
        </div>

        <Show when={selectedCustomer() && amount() > 0}>
          <div style={summaryStyle}>
            <h3 style={{ 'margin-bottom': '0.75rem', 'font-weight': '600' }}>Resumen</h3>
            <div style={summaryItemStyle}>
              <span>Cliente:</span>
              <span>{selectedCustomer()?.fullName || selectedCustomer()?.name}</span>
            </div>
            <div style={summaryItemStyle}>
              <span>Cantidad:</span>
              <span>
                {AVAILABLE_CURRENCIES.find(c => c.code === currency())?.symbol}
                {amount().toFixed(2)} USD
              </span>
            </div>
            <Show when={currency() !== 'USD' && exchangeRate() !== 1}>
              <div style={summaryItemStyle}>
                <span>Equivalente:</span>
                <span>${(amount() * exchangeRate()).toFixed(2)} {currency()}</span>
              </div>
            </Show>
            <Show when={selectedCustomer()?.cid}>
              <div style={summaryItemStyle}>
                <span>Cédula:</span>
                <span>{selectedCustomer()?.cid}</span>
              </div>
            </Show>
            <Show when={selectedCustomer()?.phoneNumber}>
              <div style={summaryItemStyle}>
                <span>Teléfono:</span>
                <span>{selectedCustomer()?.phoneNumber}</span>
              </div>
            </Show>
          </div>
        </Show>

        <div style={buttonContainerStyle}>
          <button
            type="button"
            style={cancelButtonStyle}
            onClick={handleCancel}
            disabled={isSubmitting()}
          >
            Cancelar
          </button>
          <Show when={!isEditMode()}>
            <button
              type="button"
              style={previewButtonStyle}
              onClick={handlePreview}
              disabled={isSubmitting() || !selectedCustomer() || amount() <= 0}
            >
              Vista Previa
            </button>
          </Show>
          <button
            type="submit"
            style={buttonStyle}
            disabled={isSubmitting() || !selectedCustomer() || amount() <= 0}
          >
            {isSubmitting() 
              ? (isEditMode() ? 'Actualizando...' : 'Creando...')
              : (isEditMode() ? 'Actualizar Remesa' : 'Crear Remesa')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditableRemittanceForm;