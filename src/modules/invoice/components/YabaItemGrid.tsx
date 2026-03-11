import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { YABA_ITEM_TARIFFS, TariffCategory, TariffItem } from '../config/yabaGlobalTariffs';

// ============================================
// TYPES
// ============================================

interface SelectedItem {
  item: TariffItem;
  qty: number;
}

interface SelectedItemWithCategory extends SelectedItem {
  categoryIcon: string;
}

interface YabaItemGridProps {
  onItemsChange: (items: Array<{ item: TariffItem; qty: number; categoryIcon: string }>) => void;
  selectedItems?: Array<{ item: TariffItem; qty: number }>;
}

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1.5rem',
    padding: '1rem',
    'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as const,

  header: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem',
  } as const,

  title: {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a2e)',
    margin: '0',
  } as const,

  subtitle: {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    margin: '0.25rem 0 0 0',
  } as const,

  selectedCount: {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    'border-radius': '2rem',
    'font-size': '0.875rem',
    'font-weight': '500',
  } as const,

  categoryGrid: {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '1rem',
  } as const,

  categoryCard: {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.75rem',
    padding: '1.25rem 1rem',
    background: 'var(--surface-color, #ffffff)',
    border: '2px solid var(--border-color, #e5e7eb)',
    'border-radius': '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    'min-height': '120px',
  } as const,

  categoryCardHover: {
    transform: 'translateY(-2px)',
    'box-shadow': '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
    'border-color': 'var(--primary-color, #3b82f6)',
  } as const,

  categoryCardActive: {
    background: 'var(--primary-color, #3b82f6)',
    'border-color': 'var(--primary-color, #3b82f6)',
    color: 'white',
  } as const,

  categoryIcon: {
    'font-size': '2.5rem',
    'line-height': '1',
  } as const,

  categoryName: {
    'font-size': '0.8rem',
    'font-weight': '500',
    'text-align': 'center',
    color: 'inherit',
    'line-height': '1.3',
  } as const,

  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    'min-width': '24px',
    height: '24px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    'border-radius': '12px',
    'font-size': '0.75rem',
    'font-weight': '600',
    padding: '0 6px',
    'box-shadow': '0 2px 4px rgba(0,0,0,0.1)',
  } as const,

  itemsSection: {
    background: 'var(--surface-color, #ffffff)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '1rem',
    padding: '1.25rem',
    'margin-top': '0.5rem',
  } as const,

  itemsSectionHeader: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem',
    'padding-bottom': '0.75rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
  } as const,

  itemsSectionTitle: {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a2e)',
    margin: '0',
  } as const,

  closeButton: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '8px',
    cursor: 'pointer',
    color: 'var(--text-secondary, #6b7280)',
    'font-size': '1.25rem',
    transition: 'all 0.15s ease',
  } as const,

  itemsGrid: {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '0.75rem',
  } as const,

  itemCard: {
    display: 'flex',
    'flex-direction': 'column',
    padding: '1rem',
    background: 'var(--surface-color, #ffffff)',
    border: '2px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.75rem',
    transition: 'all 0.15s ease',
  } as const,

  itemCardSelected: {
    'border-color': 'var(--primary-color, #3b82f6)',
    background: 'rgba(59, 130, 246, 0.05)',
  } as const,

  itemHeader: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '0.5rem',
  } as const,

  itemName: {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-primary, #1a1a2e)',
    margin: '0',
    'line-height': '1.3',
    flex: '1',
  } as const,

  itemPrice: {
    'font-size': '0.9rem',
    'font-weight': '600',
    color: 'var(--primary-color, #3b82f6)',
    'white-space': 'nowrap',
    'margin-left': '0.5rem',
  } as const,

  itemNote: {
    'font-size': '0.75rem',
    color: 'var(--text-secondary, #6b7280)',
    'margin-top': '0.25rem',
    'font-style': 'italic',
  } as const,

  quantityControls: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem',
    'margin-top': '0.75rem',
    'padding-top': '0.75rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
  } as const,

  quantityButton: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    background: 'var(--surface-color, #ffffff)',
    border: '2px solid var(--border-color, #e5e7eb)',
    'border-radius': '8px',
    cursor: 'pointer',
    color: 'var(--text-primary, #1a1a2e)',
    'font-size': '1.25rem',
    'font-weight': '500',
    transition: 'all 0.15s ease',
  } as const,

  quantityButtonActive: {
    'border-color': 'var(--primary-color, #3b82f6)',
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
  } as const,

  quantityDisplay: {
    'min-width': '40px',
    'text-align': 'center',
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a2e)',
  } as const,

  addButton: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '100%',
    padding: '0.5rem',
    background: 'var(--primary-color, #3b82f6)',
    border: 'none',
    'border-radius': '8px',
    cursor: 'pointer',
    color: 'white',
    'font-size': '0.875rem',
    'font-weight': '500',
    transition: 'all 0.15s ease',
    'margin-top': '0.75rem',
  } as const,

  backButton: {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    cursor: 'pointer',
    color: 'var(--text-secondary, #6b7280)',
    'font-size': '0.875rem',
    transition: 'all 0.15s ease',
    'margin-bottom': '1rem',
  } as const,
};

// ============================================
// COMPONENT
// ============================================

const YabaItemGrid: Component<YabaItemGridProps> = (props) => {
  // State
  const [activeCategory, setActiveCategory] = createSignal<TariffCategory | null>(null);
  const [hoveredCategory, setHoveredCategory] = createSignal<string | null>(null);
  const [itemQuantities, setItemQuantities] = createSignal<Record<string, number>>({});

  // Initialize quantities from props
  const initializeFromProps = () => {
    if (props.selectedItems) {
      const quantities: Record<string, number> = {};
      props.selectedItems.forEach(({ item, qty }) => {
        quantities[item.id] = qty;
      });
      setItemQuantities(quantities);
    }
  };

  // Run initialization
  initializeFromProps();

  // Computed: Get all selected items with their category info
  const selectedItemsWithCategories = createMemo((): SelectedItemWithCategory[] => {
    const quantities = itemQuantities();
    const result: SelectedItemWithCategory[] = [];

    for (const category of YABA_ITEM_TARIFFS) {
      for (const item of category.items) {
        const qty = quantities[item.id];
        if (qty && qty > 0) {
          result.push({
            item,
            qty,
            categoryIcon: category.icon,
          });
        }
      }
    }

    return result;
  });

  // Computed: Get count per category
  const categoryItemCounts = createMemo(() => {
    const quantities = itemQuantities();
    const counts: Record<string, number> = {};

    for (const category of YABA_ITEM_TARIFFS) {
      let count = 0;
      for (const item of category.items) {
        const qty = quantities[item.id];
        if (qty && qty > 0) {
          count += qty;
        }
      }
      counts[category.id] = count;
    }

    return counts;
  });

  // Computed: Total selected items count
  const totalSelectedCount = createMemo(() => {
    return selectedItemsWithCategories().reduce((sum, item) => sum + item.qty, 0);
  });

  // Notify parent of changes
  const notifyChange = () => {
    props.onItemsChange(selectedItemsWithCategories());
  };

  // Handle quantity change
  const updateQuantity = (itemId: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] || 0;
      const newQty = Math.max(0, current + delta);

      if (newQty === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [itemId]: newQty };
    });

    // Notify after state update
    setTimeout(notifyChange, 0);
  };

  // Set quantity directly
  const setQuantity = (itemId: string, qty: number) => {
    setItemQuantities((prev) => {
      if (qty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: qty };
    });

    setTimeout(notifyChange, 0);
  };

  // Format price display
  const formatPrice = (price: number | null, note?: string): string => {
    if (price === null) return note || 'Consultar';
    if (price === 0) return 'GRATIS';
    return `$${price.toFixed(2)}`;
  };

  // Get item quantity
  const getItemQty = (itemId: string): number => {
    return itemQuantities()[itemId] || 0;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Seleccionar Articulos</h3>
          <p style={styles.subtitle}>Tarifas YABA Global Express</p>
        </div>
        <Show when={totalSelectedCount() > 0}>
          <div style={styles.selectedCount}>
            <span>{totalSelectedCount()}</span>
            <span>items</span>
          </div>
        </Show>
      </div>

      {/* Category Grid or Items View */}
      <Show
        when={activeCategory()}
        fallback={
          <div style={styles.categoryGrid}>
            <For each={YABA_ITEM_TARIFFS}>
              {(category) => {
                const isHovered = () => hoveredCategory() === category.id;
                const itemCount = () => categoryItemCounts()[category.id] || 0;

                return (
                  <div
                    style={{
                      ...styles.categoryCard,
                      ...(isHovered() ? styles.categoryCardHover : {}),
                    }}
                    onMouseEnter={() => setHoveredCategory(category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => setActiveCategory(category)}
                  >
                    <Show when={itemCount() > 0}>
                      <div style={styles.badge}>{itemCount()}</div>
                    </Show>
                    <span style={styles.categoryIcon}>{category.icon}</span>
                    <span style={styles.categoryName}>{category.nameEs}</span>
                  </div>
                );
              }}
            </For>
          </div>
        }
      >
        {/* Items Section */}
        <div style={styles.itemsSection}>
          <div style={styles.itemsSectionHeader}>
            <h4 style={styles.itemsSectionTitle}>
              <span>{activeCategory()!.icon}</span>
              <span>{activeCategory()!.nameEs}</span>
            </h4>
            <button
              style={styles.closeButton}
              onClick={() => setActiveCategory(null)}
              title="Cerrar"
            >
              ×
            </button>
          </div>

          <div style={styles.itemsGrid}>
            <For each={activeCategory()!.items}>
              {(item) => {
                const qty = () => getItemQty(item.id);
                const isSelected = () => qty() > 0;

                return (
                  <div
                    style={{
                      ...styles.itemCard,
                      ...(isSelected() ? styles.itemCardSelected : {}),
                    }}
                  >
                    <div style={styles.itemHeader}>
                      <p style={styles.itemName}>{item.nameEs}</p>
                      <span style={styles.itemPrice}>
                        {formatPrice(item.price, item.note)}
                      </span>
                    </div>

                    <Show when={item.note && item.price !== null && item.price !== 0}>
                      <p style={styles.itemNote}>{item.note}</p>
                    </Show>

                    <div style={styles.quantityControls}>
                      <button
                        style={{
                          ...styles.quantityButton,
                          opacity: qty() === 0 ? 0.5 : 1,
                        }}
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={qty() === 0}
                      >
                        -
                      </button>
                      <span style={styles.quantityDisplay}>{qty()}</span>
                      <button
                        style={{
                          ...styles.quantityButton,
                          ...styles.quantityButtonActive,
                        }}
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>

                    <Show when={qty() === 0}>
                      <button
                        style={styles.addButton}
                        onClick={() => setQuantity(item.id, 1)}
                      >
                        + Agregar
                      </button>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Back button at bottom */}
          <button
            style={{ ...styles.backButton, marginTop: '1rem', marginBottom: '0' }}
            onClick={() => setActiveCategory(null)}
          >
            <span>←</span>
            <span>Ver todas las categorias</span>
          </button>
        </div>
      </Show>
    </div>
  );
};

export default YabaItemGrid;
export { YabaItemGrid };
export type { YabaItemGridProps, SelectedItem, SelectedItemWithCategory };
