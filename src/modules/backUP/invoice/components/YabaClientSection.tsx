import { Component, createMemo } from 'solid-js';

interface ClientInfo {
  name: string;
  phone?: string;
  id?: string;
  address?: string;
}

interface YabaClientSectionProps {
  sender: ClientInfo;
  recipient: ClientInfo;
  onSenderChange: (sender: ClientInfo) => void;
  onRecipientChange: (recipient: ClientInfo) => void;
}

const YabaClientSection: Component<YabaClientSectionProps> = (props) => {
  // Track touched fields for validation
  const senderNameTouched = { value: false };
  const recipientNameTouched = { value: false };

  // Validation helpers
  const isSenderNameInvalid = createMemo(() =>
    senderNameTouched.value && !props.sender.name.trim()
  );

  const isRecipientNameInvalid = createMemo(() =>
    recipientNameTouched.value && !props.recipient.name.trim()
  );

  // Styles
  const containerStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    width: '100%',
  };

  const containerResponsiveStyle = `
    @media (max-width: 768px) {
      .yaba-client-container {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  const panelStyle = {
    background: 'var(--surface-color, #ffffff)',
    border: '1px solid var(--border-color, #e0e0e0)',
    'border-radius': '12px',
    padding: '1rem',
    'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.06)',
    transition: 'box-shadow 0.2s ease',
  };

  const panelHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'margin-bottom': '1rem',
    'padding-bottom': '0.75rem',
    'border-bottom': '2px solid var(--primary-color, #3b82f6)',
  };

  const flagIconStyle = {
    'font-size': '1.5rem',
    'line-height': '1',
  };

  const headerTextStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    margin: '0',
  };

  const fieldsContainerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem',
  };

  const inputGroupStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    position: 'relative',
  };

  const iconStyle = {
    'font-size': '1rem',
    width: '24px',
    'text-align': 'center',
    'flex-shrink': '0',
    opacity: '0.7',
  };

  const inputBaseStyle = {
    flex: '1',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color, #e0e0e0)',
    'border-radius': '8px',
    'font-size': '0.875rem',
    background: 'var(--surface-color, #ffffff)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
    width: '100%',
    'min-width': '0',
  };

  const inputErrorStyle = {
    ...inputBaseStyle,
    border: '2px solid #dc3545',
    'box-shadow': '0 0 0 3px rgba(220, 53, 69, 0.1)',
  };

  const inputFocusStyle = `
    .yaba-input:focus {
      border-color: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .yaba-input::placeholder {
      color: #9ca3af;
    }
  `;

  const requiredMarkerStyle = {
    color: '#dc3545',
    'margin-left': '0.25rem',
    'font-size': '0.75rem',
  };

  const labelStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-secondary, #6b7280)',
    'margin-bottom': '0.125rem',
    display: 'flex',
    'align-items': 'center',
  };

  const fieldWrapperStyle = {
    display: 'flex',
    'flex-direction': 'column',
  };

  // Handler functions for sender
  const handleSenderChange = (field: keyof ClientInfo, value: string) => {
    props.onSenderChange({
      ...props.sender,
      [field]: value,
    });
  };

  // Handler functions for recipient
  const handleRecipientChange = (field: keyof ClientInfo, value: string) => {
    props.onRecipientChange({
      ...props.recipient,
      [field]: value,
    });
  };

  // Input field component
  const InputField = (fieldProps: {
    icon: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    required?: boolean;
    hasError?: boolean;
    label: string;
  }) => (
    <div style={fieldWrapperStyle}>
      <label style={labelStyle}>
        {fieldProps.label}
        {fieldProps.required && <span style={requiredMarkerStyle}>*</span>}
      </label>
      <div style={inputGroupStyle}>
        <span style={iconStyle}>{fieldProps.icon}</span>
        <input
          class="yaba-input"
          type="text"
          style={fieldProps.hasError ? inputErrorStyle : inputBaseStyle}
          value={fieldProps.value}
          onInput={(e) => fieldProps.onChange((e.target as HTMLInputElement).value)}
          onBlur={() => fieldProps.onBlur?.()}
          placeholder={fieldProps.placeholder}
        />
      </div>
    </div>
  );

  return (
    <>
      <style>{containerResponsiveStyle}</style>
      <style>{inputFocusStyle}</style>

      <div class="yaba-client-container" style={containerStyle}>
        {/* Sender Panel (USA) */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={flagIconStyle}>🇺🇸</span>
            <h4 style={headerTextStyle}>Remitente</h4>
          </div>

          <div style={fieldsContainerStyle}>
            <InputField
              icon="👤"
              label="Nombre"
              placeholder="Nombre completo"
              value={props.sender.name}
              onChange={(value) => handleSenderChange('name', value)}
              onBlur={() => { senderNameTouched.value = true; }}
              required
              hasError={isSenderNameInvalid()}
            />

            <InputField
              icon="📞"
              label="Telefono"
              placeholder="Telefono"
              value={props.sender.phone || ''}
              onChange={(value) => handleSenderChange('phone', value)}
            />

            <InputField
              icon="🆔"
              label="ID"
              placeholder="Numero de ID"
              value={props.sender.id || ''}
              onChange={(value) => handleSenderChange('id', value)}
            />

            <InputField
              icon="📍"
              label="Direccion"
              placeholder="Direccion"
              value={props.sender.address || ''}
              onChange={(value) => handleSenderChange('address', value)}
            />
          </div>
        </div>

        {/* Recipient Panel (Cuba) */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={flagIconStyle}>🇨🇺</span>
            <h4 style={headerTextStyle}>Destinatario</h4>
          </div>

          <div style={fieldsContainerStyle}>
            <InputField
              icon="👤"
              label="Nombre"
              placeholder="Nombre completo"
              value={props.recipient.name}
              onChange={(value) => handleRecipientChange('name', value)}
              onBlur={() => { recipientNameTouched.value = true; }}
              required
              hasError={isRecipientNameInvalid()}
            />

            <InputField
              icon="📞"
              label="Telefono"
              placeholder="Telefono"
              value={props.recipient.phone || ''}
              onChange={(value) => handleRecipientChange('phone', value)}
            />

            <InputField
              icon="🆔"
              label="CID"
              placeholder="Cedula de identidad"
              value={props.recipient.id || ''}
              onChange={(value) => handleRecipientChange('id', value)}
            />

            <InputField
              icon="📍"
              label="Direccion"
              placeholder="Direccion en Cuba"
              value={props.recipient.address || ''}
              onChange={(value) => handleRecipientChange('address', value)}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default YabaClientSection;
