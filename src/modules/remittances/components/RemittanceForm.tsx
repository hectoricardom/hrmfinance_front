import { Component, createSignal, Show, For } from 'solid-js';
import SearchableCustomerDropdown from '../../invoice/components/SearchableCustomerDropdown';
import { generateRemittancePDF, previewRemittancePDF } from '../utils/remittancePdfGenerator';
import { generateRemittanceNumber } from '../utils/remittanceNumberGenerator';
import { generateRandomId } from '../../../services/utils';

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

interface RemittanceFormProps {
  onSubmit?: (data: RemittanceData) => void;
  onCancel?: () => void;
}

interface RemittanceData {
  customer: Customer | null;
  amount: number;
  currency: string;
  exchangeRate?: number;
  reference?: string;
  notes?: string;
}

const RemittanceForm: Component<RemittanceFormProps> = (props) => {
  const [selectedCustomer, setSelectedCustomer] = createSignal<Customer | null>(null);
  const [amount, setAmount] = createSignal(0);
  const [currency, setCurrency] = createSignal('CUP');
  const [exchangeRate, setExchangeRate] = createSignal(395);
  const [reference, setReference] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const availableCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'CUP', name: 'Cuban Peso', symbol: '₱' },
    { code: 'CUC', name: 'Cuban Convertible Peso', symbol: 'CUC$' }
  ];

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
      const remittanceData: RemittanceData = {
        customer: selectedCustomer(),
        amount: amount(),
        currency: currency(),
        exchangeRate: exchangeRate(),
        reference: reference(),
        notes: notes()
      };

      // Generate unique remittance number
      const remittanceNumber = generateRemittanceNumber();
      
      const pdfData = {
        ...remittanceData,
        date: new Date(),
        remittanceNumber
      };

      props.onSubmit?.(remittanceData);
      
      // Generate PDF receipt
      generateRemittancePDF(pdfData);
      
      // Reset form
      setSelectedCustomer(null);
      setAmount(0);
      setCurrency('USD');
      setExchangeRate(1);
      setReference('');
      setNotes('');
      
    } catch (error) {
      console.error('Error submitting remittance:', error);
      alert('Error al crear la remesa. Por favor intente de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    if (!selectedCustomer() || amount() <= 0) {
      alert('Por favor complete cliente y cantidad para ver la vista previa');
      return;
    }

    const remittanceData: RemittanceData = {
      customer: selectedCustomer(),
      amount: amount(),
      currency: currency(),
      exchangeRate: exchangeRate(),
      reference: reference(),
      notes: notes()
    };

    const remittanceNumber = `${generateRandomId(6)}`;
    
    const pdfData = {
      ...remittanceData,
      date: new Date(),
      remittanceNumber
    };

    previewRemittancePDF(pdfData);
  };

  const handleCancel = () => {
    setSelectedCustomer(null);
    setAmount(0);
    setCurrency('USD');
    setExchangeRate(1);
    setReference('');
    setNotes('');
    props.onCancel?.();
  };

  const containerStyle = {
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
    'text-align': 'center',
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
    resize: 'vertical'
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
      <h2 style={titleStyle}>Crear Remesa</h2>
      
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

        <div style={formGroupStyle}>
          <label style={labelStyle}>Moneda</label>
          <select
            style={selectStyle}
            value={currency()}
            onChange={(e) => setCurrency(e.target.value)}
            required
          >
            <For each={availableCurrencies}>
              {(curr) => (
                <option value={curr.code}>
                  {curr.symbol} {curr.code} - {curr.name}
                </option>
              )}
            </For>
          </select>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>Cantidad</label>
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
                {availableCurrencies.find(c => c.code === currency())?.symbol}
                {amount().toFixed(2)} {currency()}
              </span>
            </div>
            <Show when={currency() !== 'USD' && exchangeRate() !== 1}>
              <div style={summaryItemStyle}>
                <span>Equivalente USD:</span>
                <span>${(amount() / exchangeRate()).toFixed(2)} USD</span>
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
          <button
            type="button"
            style={previewButtonStyle}
            onClick={handlePreview}
            disabled={isSubmitting() || !selectedCustomer() || amount() <= 0}
          >
            Vista Previa
          </button>
          <button
            type="submit"
            style={buttonStyle}
            disabled={isSubmitting() || !selectedCustomer() || amount() <= 0}
          >
            {isSubmitting() ? 'Creando...' : 'Crear Remesa'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RemittanceForm;