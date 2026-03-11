import { Component, createSignal, createMemo, For, Show, createEffect } from 'solid-js';
import { providersClientsStore } from '../stores/providersClientsStore';
import { ProviderClient } from '../types';
import { useTranslation } from '../../../translations';

interface SearchableEntityDropdownProps {
  value: string;
  onChange: (entity: ProviderClient) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: Record<string, string | number>;
  onAddNew?: () => void;
  entityType?: 'provider' | 'customer' | 'both' | 'all'; // Filter by entity type
}

const SearchableEntityDropdown: Component<SearchableEntityDropdownProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  // Load entities on mount
  createEffect(() => {
    if (providersClientsStore.entities.length === 0) {
      providersClientsStore.loadEntities();
    }
  });

  const selectedEntity = createMemo(() => {
    if (!props.value) return null;
    return providersClientsStore.getEntityById(props.value);
  });

  const filteredEntities = createMemo(() => {
    let entities = providersClientsStore.entities;

    // Filter by type if specified
    if (props.entityType && props.entityType !== 'all') {
      if (props.entityType === 'provider') {
        entities = providersClientsStore.getProviders();
      } else if (props.entityType === 'customer') {
        entities = providersClientsStore.getClients();
      }
    }

    const term = searchTerm().toLowerCase();
    if (!term) return entities;

    return entities.filter(entity =>
      entity.name?.toLowerCase().includes(term) ||
      entity.code?.toLowerCase().includes(term) ||
      entity.email?.toLowerCase().includes(term) ||
      entity.phone?.toLowerCase().includes(term)
    );
  });

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setSearchTerm(target.value);
    setIsOpen(true);
    setFocusedIndex(-1);
  };

  const handleEntitySelect = (entity: ProviderClient) => {
    props.onChange(entity);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const entities = filteredEntities();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, entities.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && entities[focusedIndex()]) {
          handleEntitySelect(entities[focusedIndex()]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleBlur = (e: FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('.entity-dropdown-container')) {
      setTimeout(() => {
        setIsOpen(false);
        setSearchTerm('');
      }, 200);
    }
  };

  const containerStyle = {
    position: 'relative' as const,
    width: '100%'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    'padding-right': '2.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: props.disabled ? 'var(--gray-100)' : 'var(--surface-color)',
    cursor: props.disabled ? 'not-allowed' : 'text',
    ...props.style
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'max-height': '250px',
    overflow: 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-top': 'none',
    'border-radius': '0 0 var(--border-radius-sm) var(--border-radius-sm)',
    'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.1)',
    'z-index': '100'
  };

  const itemStyle = (isFocused: boolean) => ({
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    background: isFocused ? 'var(--gray-100)' : 'transparent',
    'border-bottom': '1px solid var(--border-color)',
    transition: 'background 0.15s ease'
  });

  const clearButtonStyle = {
    position: 'absolute' as const,
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    'font-size': '1rem',
    padding: '0.25rem'
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'provider': 'Proveedor',
      'customer': 'Cliente',
      'both': 'Ambos'
    };
    return labels[type] || type;
  };

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'provider': '#3b82f6',
      'customer': '#10b981',
      'both': '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div class="entity-dropdown-container" style={containerStyle}>
      <input
        type="text"
        style={inputStyle}
        value={isOpen() ? searchTerm() : (selectedEntity()?.name || '')}
        onClick={handleInputClick}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={props.placeholder || t('providers.searchEntity', 'Buscar proveedor/cliente...')}
        disabled={props.disabled}
        required={props.required}
      />

      {/* Clear button */}
      <Show when={selectedEntity() && !props.disabled}>
        <button
          type="button"
          style={clearButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            props.onChange({ id: '' } as ProviderClient);
          }}
          tabIndex={-1}
        >
          ✕
        </button>
      </Show>

      {/* Dropdown */}
      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          <Show when={filteredEntities().length === 0}>
            <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
              {searchTerm()
                ? t('common.noResults', 'No se encontraron resultados')
                : t('providers.noEntities', 'No hay proveedores/clientes')}
            </div>
          </Show>

          <For each={filteredEntities()}>
            {(entity, index) => (
              <div
                style={itemStyle(focusedIndex() === index())}
                onClick={() => handleEntitySelect(entity)}
                onMouseEnter={() => setFocusedIndex(index())}
              >
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <div>
                    <div style={{ 'font-weight': '500' }}>{entity.name}</div>
                    <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                      {entity.code && <span style={{ 'margin-right': '0.5rem' }}>{entity.code}</span>}
                      {entity.email && <span>📧 {entity.email}</span>}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    'border-radius': '9999px',
                    'font-size': '0.7rem',
                    background: `${getEntityTypeColor(entity.type)}20`,
                    color: getEntityTypeColor(entity.type)
                  }}>
                    {getEntityTypeLabel(entity.type)}
                  </span>
                </div>
              </div>
            )}
          </For>

          {/* Add new option */}
          <Show when={props.onAddNew}>
            <div
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                background: 'var(--gray-50)',
                color: 'var(--primary-color)',
                'font-weight': '500',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}
              onClick={() => {
                setIsOpen(false);
                props.onAddNew?.();
              }}
            >
              <span>+</span>
              {t('providers.addNew', 'Agregar nuevo')}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default SearchableEntityDropdown;
