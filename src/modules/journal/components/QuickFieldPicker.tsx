import { Component, For, Show, createMemo } from 'solid-js';
import {
  COMMON_FIELDS,
  FIELD_CATEGORIES,
  CommonFieldId,
  FieldCategoryType,
  CommonField,
  getFieldsByCategoryType
} from '../constants/commonFields';

interface QuickFieldPickerProps {
  selectedFields: string[];
  onFieldAdd: (fieldId: string) => void;
  onFieldRemove: (fieldId: string) => void;
  suggestedFields?: string[];
}

const QuickFieldPicker: Component<QuickFieldPickerProps> = (props) => {
  // Check if a field is already selected
  const isFieldSelected = (fieldId: string): boolean => {
    return props.selectedFields.includes(fieldId);
  };

  // Check if a field is suggested
  const isFieldSuggested = (fieldId: string): boolean => {
    return props.suggestedFields?.includes(fieldId) || false;
  };

  // Handle field click
  const handleFieldClick = (fieldId: string) => {
    if (isFieldSelected(fieldId)) {
      props.onFieldRemove(fieldId);
    } else {
      props.onFieldAdd(fieldId);
    }
  };

  // Get icon for field (using emoji from common fields or a default)
  const getFieldIcon = (field: CommonField): string => {
    const iconMap: Record<string, string> = {
      document: '📄',
      date: '📅',
      provider: '🏢',
      customer: '👤',
      amount: '💰',
      subtotal: '➕',
      taxAmount: '📊',
      paymentMethod: '💳',
      bankAccount: '🏦',
      description: '📝',
      notes: '📌'
    };
    return iconMap[field.id] || '📋';
  };

  // Styles
  const containerStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const headerStyle = {
    margin: '0 0 1.5rem 0',
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const categoryStyle = {
    'margin-bottom': '1.5rem'
  };

  const categoryHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    margin: '0 0 1rem 0',
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-secondary)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em'
  };

  const categoryIconStyle = {
    'font-size': '1rem'
  };

  const fieldsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '0.75rem'
  };

  const getFieldCardStyle = (fieldId: string) => {
    const isSelected = isFieldSelected(fieldId);
    const isSuggested = isFieldSuggested(fieldId);

    return {
      display: 'flex',
      'align-items': 'center',
      gap: '0.75rem',
      padding: '0.875rem 1rem',
      border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
      'border-radius': 'var(--border-radius-sm)',
      background: isSelected
        ? 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))'
        : isSuggested
        ? 'var(--blue-ribbon-50)'
        : 'var(--surface-color)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      opacity: isSelected ? '1' : '1',
      color: isSelected ? 'white' : 'var(--text-primary)',
      'box-shadow': isSelected ? 'var(--shadow-sm)' : 'none',
      position: 'relative' as const,
      overflow: 'hidden' as const
    };
  };

  const fieldIconStyle = {
    'font-size': '1.25rem',
    'flex-shrink': '0'
  };

  const fieldLabelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    'line-height': '1.3',
    flex: '1'
  };

  const suggestedBadgeStyle = {
    position: 'absolute' as const,
    top: '0',
    right: '0',
    'font-size': '0.625rem',
    'font-weight': '600',
    padding: '0.125rem 0.375rem',
    background: 'var(--warning-color)',
    color: 'white',
    'border-radius': '0 var(--border-radius-sm) 0 var(--border-radius-sm)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em'
  };

  const selectedCheckStyle = {
    'font-size': '1rem',
    'margin-left': 'auto'
  };

  // Get category icon
  const getCategoryIcon = (categoryId: FieldCategoryType): string => {
    const iconMap: Record<FieldCategoryType, string> = {
      document: '📄',
      date: '📅',
      entity: '👥',
      amount: '💰',
      payment: '💳',
      info: '📝'
    };
    return iconMap[categoryId] || '📋';
  };

  // Render field card
  const renderFieldCard = (field: CommonField) => {
    const fieldId = field.id;
    const isSelected = isFieldSelected(fieldId);
    const isSuggested = isFieldSuggested(fieldId);

    return (
      <div
        style={getFieldCardStyle(fieldId)}
        onClick={() => handleFieldClick(fieldId)}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.borderColor = 'var(--primary-light)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }
        }}
      >
        <Show when={isSuggested && !isSelected}>
          <div style={suggestedBadgeStyle}>Sugerido</div>
        </Show>

        <div style={fieldIconStyle}>{getFieldIcon(field)}</div>

        <div style={fieldLabelStyle}>{field.label}</div>

        <Show when={isSelected}>
          <div style={selectedCheckStyle}>✓</div>
        </Show>
      </div>
    );
  };

  // Render category section
  const renderCategory = (category: typeof FIELD_CATEGORIES[number]) => {
    const fields = createMemo(() => getFieldsByCategoryType(category.id));

    return (
      <Show when={fields().length > 0}>
        <div style={categoryStyle}>
          <div style={categoryHeaderStyle}>
            <span style={categoryIconStyle}>{getCategoryIcon(category.id)}</span>
            <span>{category.label}</span>
          </div>

          <div style={fieldsGridStyle}>
            <For each={fields()}>
              {(field) => renderFieldCard(field)}
            </For>
          </div>
        </div>
      </Show>
    );
  };

  return (
    <div style={containerStyle}>
      <h3 style={headerStyle}>Campos Rápidos</h3>

      <div>
        <For each={FIELD_CATEGORIES}>
          {(category) => renderCategory(category)}
        </For>
      </div>

      <Show when={props.selectedFields.length > 0}>
        <div style={{
          'margin-top': '1.5rem',
          'padding-top': '1.5rem',
          'border-top': '1px solid var(--border-color)',
          'font-size': '0.875rem',
          color: 'var(--text-muted)',
          'text-align': 'center'
        }}>
          {props.selectedFields.length} campo{props.selectedFields.length !== 1 ? 's' : ''} seleccionado{props.selectedFields.length !== 1 ? 's' : ''}
        </div>
      </Show>
    </div>
  );
};

export default QuickFieldPicker;
