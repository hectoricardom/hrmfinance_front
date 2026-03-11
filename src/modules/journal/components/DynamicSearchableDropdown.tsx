import { Component, createSignal, For, Show, createMemo, onMount } from 'solid-js';
import { TemplateField } from '../types/journalTemplateTypes';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';
import SearchableProductDropdown from '../../inventory/components/SearchableProductDropdown';
import SearchableLocationDropdown from '../../inventory/components/SearchableLocationDropdown';
import SearchableCustomerDropdown from '../../invoice/components/SearchableCustomerDropdown';
import { FormSelect } from '../../ui';
import { providersClientsStore } from '../../providers-clients';
import { devLog } from '../../../services/utils';

interface DynamicSearchableDropdownProps {
  field: TemplateField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

// Simple Supplier Dropdown Component
const SearchableSupplierDropdown: Component<{
  value: string;
  onChange: (supplier: any) => void;
  placeholder?: string;
  dataSource?: any;
}> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [suppliers, setSuppliers] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(false);

  // Load suppliers on mount
  onMount(async () => {
    try {
      setLoading(true);
      await providersClientsStore.loadEntities({ type: 'provider' });
      const allEntities = providersClientsStore.entities();
      setSuppliers(allEntities.filter((e: any) => e.type === 'provider' || e.entityType === 'provider'));
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  });

  const filteredSuppliers = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) return suppliers().slice(0, 20);
    return suppliers().filter((s: any) =>
      s.name?.toLowerCase().includes(term) ||
      s.code?.toLowerCase().includes(term) ||
      s.taxId?.toLowerCase().includes(term)
    ).slice(0, 20);
  });

  const selectedSupplier = createMemo(() => {
    if (!props.value) return null;
    return suppliers().find((s: any) => s.id === props.value || s.name === props.value);
  });

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={isOpen() ? searchTerm() : (selectedSupplier()?.name || props.value || '')}
        onInput={(e) => {
          setSearchTerm(e.currentTarget.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={props.placeholder}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-sm)',
          'font-size': '1rem',
          background: 'var(--surface-color)'
        }}
      />

      <Show when={isOpen()}>
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          'max-height': '250px',
          'overflow-y': 'auto',
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-sm)',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
          'z-index': 1000
        }}>
          <Show when={loading()}>
            <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
              Cargando proveedores...
            </div>
          </Show>

          <Show when={!loading() && filteredSuppliers().length === 0}>
            <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
              No se encontraron proveedores
            </div>
          </Show>

          <For each={filteredSuppliers()}>
            {(supplier) => (
              <div
                style={{
                  padding: '0.75rem',
                  cursor: 'pointer',
                  'border-bottom': '1px solid var(--border-color)',
                  ':hover': { background: 'var(--strip-color)' }
                }}
                onMouseDown={() => {
                  props.onChange(supplier);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                <div style={{ 'font-weight': '500' }}>{supplier.name}</div>
                <Show when={supplier.taxId || supplier.code}>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                    {supplier.taxId || supplier.code}
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

const DynamicSearchableDropdown: Component<DynamicSearchableDropdownProps> = (props) => {
  
  const renderDropdown = () => {
    if (!props.field.dataSource) {
      return null;
    }

    const dataSource = props.field.dataSource;



    
    switch (dataSource.type) {
      case 'accounts':
        return (
          <SearchableAccountDropdown
            selectedAccountId={props.value}
            onSelect={(account) => {
              devLog('Account selected:', account); // Debug log
              // Guardar tanto el ID como datos adicionales si es necesario
              const value = dataSource.valueField === 'name' ? account.name : 
                          dataSource.valueField === 'accountNumber' ? account.accountNumber :
                          account.id;
              devLog('Saving value:', value); // Debug log
              props.onChange(value);
            }}
            placeholder={props.field.placeholder || 'Seleccionar cuenta...'}
          />
        );

      case 'products':
        return (
          <SearchableProductDropdown
            value={props.value}
            onChange={(product) => {
              if (product) {
                const value = dataSource.valueField === 'name' ? product.name : 
                            dataSource.valueField === 'sku' ? product.sku : 
                            product.id;
                props.onChange(value);
              } else {
                props.onChange('');
              }
            }}
            placeholder={props.field.placeholder || 'Seleccionar producto...'}
          />
        );

      case 'locations':
        return (
          <SearchableLocationDropdown
            value={props.value}
            onChange={(location) => {
              props.onChange(location);
            }}
            placeholder={props.field.placeholder || 'Seleccionar ubicación...'}
          />
        );

      case 'customers':
        return (
          <SearchableCustomerDropdown
            value={props.value ? { id: props.value, name: props.value, fullName: props.value } : null}
            onChange={(customer) => {
              if (customer) {
                const value = dataSource.valueField === 'name' ? customer.fullName || customer.name :
                            dataSource.valueField === 'cid' ? customer.cid :
                            customer.id;
                props.onChange(value);
              } else {
                props.onChange('');
              }
            }}
            placeholder={props.field.placeholder || 'Buscar cliente...'}
          />
        );

      case 'suppliers':
        return (
          <SearchableSupplierDropdown
            value={props.value}
            onChange={(supplier) => {
              if (supplier) {
                const value = dataSource.valueField === 'name' ? supplier.name :
                            dataSource.valueField === 'code' ? supplier.code :
                            supplier.id;
                props.onChange(value);
              } else {
                props.onChange('');
              }
            }}
            placeholder={props.field.placeholder || 'Buscar proveedor...'}
            dataSource={dataSource}
          />
        );

      case 'custom':
        if (!dataSource.customList || dataSource.customList.length === 0) {
          return (
            <div style={{ 
              padding: '1rem', 
              background: '#f8d7da', 
              'border-radius': '4px',
              color: '#721c24'
            }}>
              ⚠️ No hay elementos en la lista personalizada
            </div>
          );
        }
        
        return (
          <FormSelect
            label=""
            value={props.value || ''}
            onChange={props.onChange}
            options={[
              { value: '', label: props.field.placeholder || 'Seleccionar...' },
              ...dataSource.customList.map(item => ({
                value: item.value,
                label: item.label
              }))
            ]}
          />
        );

      default:
        return (
          <div style={{ 
            padding: '1rem', 
            background: '#f8d7da', 
            'border-radius': '4px',
            color: '#721c24'
          }}>
            ❌ Tipo de fuente de datos no soportado: {dataSource.type}
          </div>
        );
    }
  };

  return (
    <div>
      <label style={{ 
        display: 'block', 
        'font-weight': '500', 
        'margin-bottom': '0.5rem' 
      }}>
        {props.field.label}
        {props.field.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      
      {renderDropdown()}
      
      {props.error && (
        <div style={{
          color: '#dc3545',
          'font-size': '0.875rem',
          'margin-top': '0.25rem'
        }}>
          {props.error}
        </div>
      )}
      
      {/* Información adicional sobre la fuente de datos */}
      <Show when={props.field.dataSource?.type !== 'custom'}>
        <div style={{
          'font-size': '0.75rem',
          color: 'var(--text-muted)',
          'margin-top': '0.25rem'
        }}>
          Fuente: {
            props.field.dataSource?.type === 'accounts' ? 'Cuentas Contables' :
            props.field.dataSource?.type === 'products' ? 'Productos' :
            props.field.dataSource?.type === 'locations' ? 'Ubicaciones' :
            props.field.dataSource?.type === 'customers' ? 'Clientes' :
            props.field.dataSource?.type === 'suppliers' ? 'Proveedores' :
            'Desconocido'
          }
        </div>
      </Show>
    </div>
  );
};

export default DynamicSearchableDropdown;