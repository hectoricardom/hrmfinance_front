import { Component, For, Show, createSignal } from 'solid-js';
import {
  YABA_ITEM_TARIFFS,
  TariffItem,
  TariffCategory,
  formatTariffPrice
} from '../config/yabaGlobalTariffs';
import { FormInput } from '../../ui';

interface TariffQuickAddProps {
  onAdd: (items: Array<{ item: TariffItem; qty: number }>) => void;
  disabled?: boolean;
}

// Styles
const categoryGridStyle = {
  display: 'grid',
  'grid-template-columns': 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '0.5rem',
  'margin-bottom': '1rem'
};

const categoryButtonStyle = (isActive: boolean) => ({
  display: 'flex',
  'flex-direction': 'column' as const,
  'align-items': 'center',
  padding: '0.75rem',
  border: `2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
  'border-radius': 'var(--border-radius-sm)',
  background: isActive ? 'var(--primary-color)' : 'var(--surface-color)',
  color: isActive ? 'white' : 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'all 0.2s',
  'font-size': '0.75rem',
  'text-align': 'center' as const
});

const itemsContainerStyle = {
  background: 'var(--background-color)',
  'border-radius': 'var(--border-radius-sm)',
  padding: '1rem',
  'margin-top': '0.5rem'
};

const itemRowStyle = {
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  padding: '0.5rem',
  'border-bottom': '1px solid var(--border-color)',
  gap: '0.5rem'
};

const categoryIconStyle = {
  'font-size': '1.5rem',
  'margin-bottom': '0.25rem'
};

const categoryNameStyle = {
  'font-weight': '500',
  'line-height': '1.2',
  'word-break': 'break-word' as const
};

const itemNameStyle = {
  flex: '1',
  'font-size': '0.875rem',
  color: 'var(--text-primary)'
};

const itemPriceStyle = {
  'font-size': '0.875rem',
  'font-weight': '600',
  color: 'var(--primary-color)',
  'white-space': 'nowrap' as const
};

const quantityInputStyle = {
  width: '60px',
  padding: '0.375rem 0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-sm)',
  'text-align': 'center' as const,
  'font-size': '0.875rem'
};

const addButtonStyle = (disabled: boolean) => ({
  padding: '0.375rem 0.75rem',
  background: disabled ? 'var(--text-muted)' : 'var(--primary-color)',
  color: 'white',
  border: 'none',
  'border-radius': 'var(--border-radius-sm)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  'font-size': '0.75rem',
  'font-weight': '500',
  transition: 'background 0.2s',
  'white-space': 'nowrap' as const
});

const sectionHeaderStyle = {
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'margin-bottom': '0.5rem',
  'padding-bottom': '0.5rem',
  'border-bottom': '1px solid var(--border-color)'
};

const sectionTitleStyle = {
  margin: 0,
  'font-size': '0.95rem',
  'font-weight': '600',
  color: 'var(--text-primary)',
  display: 'flex',
  'align-items': 'center',
  gap: '0.5rem'
};

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  'font-size': '1.25rem',
  color: 'var(--text-muted)',
  padding: '0.25rem',
  'line-height': 1
};

const itemNoteStyle = {
  'font-size': '0.7rem',
  color: 'var(--text-muted)',
  'font-style': 'italic'
};

const TariffQuickAdd: Component<TariffQuickAddProps> = (props) => {
  const [expandedCategoryId, setExpandedCategoryId] = createSignal<string | null>(null);
  const [quantities, setQuantities] = createSignal<Record<string, number>>({});

  const handleCategoryClick = (categoryId: string) => {
    if (props.disabled) return;

    if (expandedCategoryId() === categoryId) {
      // Collapse if clicking the same category
      setExpandedCategoryId(null);
    } else {
      // Expand the new category
      setExpandedCategoryId(categoryId);
    }
  };

  const getQuantity = (itemId: string): number => {
    return quantities()[itemId] ?? 1;
  };

  const setQuantity = (itemId: string, value: number) => {
    const qty = Math.max(1, Math.floor(value) || 1);
    setQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleAddItem = (item: TariffItem) => {
    if (props.disabled) return;

    const qty = getQuantity(item.id);
    props.onAdd([{ item, qty }]);

    // Reset quantity for this item after adding
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const expandedCategory = (): TariffCategory | undefined => {
    const catId = expandedCategoryId();
    if (!catId) return undefined;
    return YABA_ITEM_TARIFFS.find(c => c.id === catId);
  };

  return (
    <div style={{ opacity: props.disabled ? 0.6 : 1 }}>
      {/* Category Grid */}
      <div style={categoryGridStyle}>
        <For each={YABA_ITEM_TARIFFS}>
          {(category) => (
            <button
              type="button"
              style={categoryButtonStyle(expandedCategoryId() === category.id)}
              onClick={() => handleCategoryClick(category.id)}
              disabled={props.disabled}
              title={category.name}
            >
              <span style={categoryIconStyle}>{category.icon}</span>
              <span style={categoryNameStyle}>{category.nameEs}</span>
            </button>
          )}
        </For>
      </div>

      {/* Expanded Category Items */}
      <Show when={expandedCategory()}>
        {(category) => (
          <div style={itemsContainerStyle}>
            {/* Section Header */}
            <div style={sectionHeaderStyle}>
              <h4 style={sectionTitleStyle}>
                <span>{category().icon}</span>
                <span>{category().nameEs}</span>
              </h4>
              <button
                type="button"
                style={closeButtonStyle}
                onClick={() => setExpandedCategoryId(null)}
                title="Cerrar"
              >
                x
              </button>
            </div>

            {/* Items List */}
            <For each={category().items}>
              {(item) => (
                <div style={itemRowStyle}>
                  {/* Item Name */}
                  <div style={itemNameStyle}>
                    <div>{item.nameEs}</div>
                    <Show when={item.note}>
                      <div style={itemNoteStyle}>{item.note}</div>
                    </Show>
                  </div>

                  {/* Price */}
                  <div style={itemPriceStyle}>
                    {formatTariffPrice(item.price, item.note)}
                  </div>

                  {/* Quantity Input */}
                  <FormInput
                    type="number"
                    min="1"
                    value={getQuantity(item.id)}
                    onChange={(e) => setQuantity(item.id, parseInt(e, 10))}
                    style={quantityInputStyle}
                    disabled={props.disabled || item.price === null}
                  />

                  {/* Add Button */}
                  <button
                    type="button"
                    style={addButtonStyle(props.disabled || item.price === null)}
                    onClick={() => handleAddItem(item)}
                    disabled={props.disabled || item.price === null}
                  >
                    Agregar
                  </button>
                </div>
              )}
            </For>

            {/* Empty state */}
            <Show when={category().items.length === 0}>
              <div style={{
                'text-align': 'center',
                color: 'var(--text-muted)',
                'font-style': 'italic',
                padding: '1rem'
              }}>
                No hay articulos en esta categoria
              </div>
            </Show>
          </div>
        )}
      </Show>

      {/* Hint text when no category is selected */}
      <Show when={!expandedCategoryId()}>
        <div style={{
          'text-align': 'center',
          color: 'var(--text-muted)',
          'font-size': '0.8rem',
          padding: '0.5rem'
        }}>
          Seleccione una categoria para ver los articulos
        </div>
      </Show>
    </div>
  );
};

export default TariffQuickAdd;




// luismonteagudo78@gmail.com