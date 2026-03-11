import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  YABA_ITEM_TARIFFS,
  TariffItem,
  TariffCategory,
  searchTariffItems,
  formatTariffPrice
} from '../config/yabaGlobalTariffs';

interface ItemTariffSelectorProps {
  onSelect: (item: TariffItem & { categoryId: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ItemTariffSelector: Component<ItemTariffSelectorProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  const [language, setLanguage] = createSignal<'en' | 'es'>('es');

  // Filter items based on search term
  const filteredItems = createMemo(() => {
    const term = searchTerm().toLowerCase();

    if (!term) {
      // Return all items grouped by category when no search term
      return YABA_ITEM_TARIFFS;
    }

    // Use the searchTariffItems function for searching
    const searchResults = searchTariffItems(term, language());

    // Group search results by category
    const groupedResults: TariffCategory[] = [];
    const categoryMap = new Map<string, TariffItem[]>();

    searchResults.forEach(item => {
      const existing = categoryMap.get(item.categoryId) || [];
      existing.push({
        id: item.id,
        name: item.name,
        nameEs: item.nameEs,
        price: item.price,
        note: item.note
      });
      categoryMap.set(item.categoryId, existing);
    });

    // Reconstruct category structure from filtered results
    YABA_ITEM_TARIFFS.forEach(category => {
      const items = categoryMap.get(category.id);
      if (items && items.length > 0) {
        groupedResults.push({
          ...category,
          items
        });
      }
    });

    return groupedResults;
  });

  // Count total items for keyboard navigation
  const flattenedItems = createMemo(() => {
    const items: Array<{ item: TariffItem; categoryId: string; categoryIcon: string }> = [];
    filteredItems().forEach(category => {
      category.items.forEach(item => {
        items.push({
          item,
          categoryId: category.id,
          categoryIcon: category.icon
        });
      });
    });
    return items;
  });

  const handleInputClick = () => {
    if (!props.disabled) {
      setIsOpen(true);
      setSearchTerm('');
      setFocusedIndex(-1);
    }
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setSearchTerm(target.value);
    setIsOpen(true);
    setFocusedIndex(-1);
  };

  const handleItemSelect = (item: TariffItem, categoryId: string) => {
    props.onSelect({
      ...item,
      categoryId
    });
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const items = flattenedItems();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && items[focusedIndex()]) {
          const { item, categoryId } = items[focusedIndex()];
          handleItemSelect(item, categoryId);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    }, 150);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  const getItemName = (item: TariffItem) => {
    return language() === 'es' ? item.nameEs : item.name;
  };

  const getCategoryName = (category: TariffCategory) => {
    return language() === 'es' ? category.nameEs : category.name;
  };

  // Get current flat index for an item
  const getItemFlatIndex = (categoryId: string, itemId: string): number => {
    let index = 0;
    for (const category of filteredItems()) {
      for (const item of category.items) {
        if (category.id === categoryId && item.id === itemId) {
          return index;
        }
        index++;
      }
    }
    return -1;
  };

  // Styles
  const containerStyle = {
    position: 'relative' as const,
    width: '100%'
  };

  const inputContainerStyle = {
    position: 'relative' as const,
    display: 'flex',
    'align-items': 'center'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    'padding-right': '80px',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    cursor: props.disabled ? 'not-allowed' : 'text',
    opacity: props.disabled ? '0.6' : '1'
  };

  const languageToggleStyle = {
    position: 'absolute' as const,
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'font-weight': '500',
    'z-index': '10',
    transition: 'all 0.2s ease'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    'max-height': '300px',
    'overflow-y': 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'box-shadow': 'var(--shadow-md)',
    'z-index': 1000,
    'margin-top': '2px'
  };

  const categoryHeaderStyle = {
    padding: '0.5rem 0.75rem',
    background: 'var(--background-color)',
    'border-bottom': '1px solid var(--border-color)',
    'font-weight': '600',
    'font-size': '0.8125rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    position: 'sticky' as const,
    top: '0',
    'z-index': '1'
  };

  const itemStyle = (isHighlighted: boolean) => ({
    padding: '0.625rem 0.75rem',
    'padding-left': '1.5rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    background: isHighlighted ? 'var(--strip-color)' : 'transparent',
    color: isHighlighted ? 'var(--primary-color)' : 'var(--text-primary)',
    transition: 'all 0.15s ease',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  });

  const itemNameStyle = {
    flex: '1',
    'font-size': '0.875rem'
  };

  const itemPriceStyle = (price: number | null) => ({
    'font-weight': '600',
    'font-size': '0.875rem',
    color: price === 0 ? 'var(--success-color)' :
           price === null ? 'var(--warning-color)' :
           'var(--primary-color)',
    'white-space': 'nowrap' as const,
    'margin-left': '0.75rem'
  });

  const emptyStateStyle = {
    padding: '1.5rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    'font-style': 'italic',
    'font-size': '0.875rem'
  };

  const noteStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-left': '0.25rem'
  };

  return (
    <div style={containerStyle}>
      <div style={inputContainerStyle}>
        <input
          type="text"
          style={inputStyle}
          value={searchTerm()}
          onInput={handleInputChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={props.placeholder || (language() === 'es' ?
            'Buscar articulo por nombre...' :
            'Search item by name...')}
          disabled={props.disabled}
          autocomplete="off"
        />
        <button
          type="button"
          style={languageToggleStyle}
          onClick={toggleLanguage}
          title={language() === 'es' ? 'Switch to English' : 'Cambiar a Espanol'}
        >
          {language() === 'es' ? 'ES | EN' : 'EN | ES'}
        </button>
      </div>

      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          <Show
            when={filteredItems().length > 0}
            fallback={
              <div style={emptyStateStyle}>
                {language() === 'es' ?
                  'No se encontraron articulos' :
                  'No items found'}
              </div>
            }
          >
            <For each={filteredItems()}>
              {(category) => (
                <>
                  <div style={categoryHeaderStyle}>
                    <span>{category.icon}</span>
                    <span>{getCategoryName(category)}</span>
                  </div>
                  <For each={category.items}>
                    {(item) => {
                      const flatIndex = getItemFlatIndex(category.id, item.id);
                      return (
                        <div
                          style={itemStyle(flatIndex === focusedIndex())}
                          onClick={() => handleItemSelect(item, category.id)}
                          onMouseEnter={() => setFocusedIndex(flatIndex)}
                        >
                          <span style={itemNameStyle}>{getItemName(item)}</span>
                          <span style={itemPriceStyle(item.price)}>
                            {formatTariffPrice(item.price, item.note)}
                            <Show when={item.note && item.price !== null && item.price !== 0}>
                              <span style={noteStyle}>({item.note})</span>
                            </Show>
                          </span>
                        </div>
                      );
                    }}
                  </For>
                </>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ItemTariffSelector;
