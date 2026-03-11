import { Component, createSignal, For, Show } from 'solid-js';
import { FormInput } from '../../ui';

// Common reserva types for dropdown suggestions
const REMESA_TYPES = [
  // Clothing & Fashion
  '👕 Ropa y Zapatos',
  '👕 Ropa',
  '👞 Zapatos',
  '👒 Sombreros y Gorras',
  '🧥 Abrigos y Chaquetas',
  '👖 Pantalones y Jeans',
  '👗 Vestidos',
  '🩱 Ropa de Baño',
  '🧦 Calcetines y Medias',
  '🩲 Ropa Interior',
  '👶 Ropa de Bebe',
  
  // Electronics & Technology
  '📺 TV',
  '📱 Telefono Movil',
  '💻 Computadora/Laptop',
  '⌨️ Teclados',
  '🖱️ Mouse',
  '🎧 Audifonos',
  '🔌 Cables y Accesorios',
  '🔋 Baterias',
  '📷 Camaras',
  '🎥 Videocamaras',
  '📻 Radios',
  '💾 USB y Memorias',
  '🖨️ Impresoras',
  '📽️ Proyectores',
  '🕹️ Controles de Videojuegos',
  '🎮 Consolas de Videojuegos',
  '📡 Antenas',
  '💡 Bombillas LED',
  '🔦 Linternas',
  
  // Home & Living
  '🏠 Utiles del Hogar',
  '🛏️ Articulos para el Hogar',
  '🪑 Muebles',
  '🛋️ Sofas y Sillones',
  '🚪 Puertas y Ventanas',
  '🔑 Cerraduras y Llaves',
  '🧽 Articulos de Limpieza',
  '🧼 Productos de Limpieza',
  '🧴 Detergentes',
  '🕯️ Velas',
  '🖼️ Cuadros y Decoraciones',
  '🪴 Plantas y Macetas',
  '🔨 Herramientas de Casa',
  '⚡ Articulos Electricos',
  '🌀 Ventiladores',
  '❄️ Aires Acondicionados',
  '🔥 Calentadores',
  
  // Health & Beauty
  '💊 Medicamentos',
  '🧴 Productos de Belleza',
  '💄 Maquillaje',
  '🧴 Shampoo y Acondicionador',
  '🧼 Jabones',
  '🪥 Cepillos de Dientes',
  '🧻 Papel Higienico',
  '🧴 Aseo Personal',
  '💉 Equipos Medicos',
  '🏥 Suministros Medicos',
  '🩹 Vendas y Curitas',
  '🌡️ Termometros',
  '👓 Lentes Recetados',
  '🕶️ Lentes de Sol',
  
  // Sports & Recreation
  '⚽ Equipos Deportivos',
  '🏀 Balones',
  '🎾 Raquetas',
  '🏋️ Pesas',
  '🎣 Equipos de Pesca',
  '🎸 Instrumentos Musicales',
  '🎲 Juegos y Juguetes',
  '🧸 Peluches',
  '🎯 Juegos de Mesa',
  '🪀 Juguetes Clasicos',
  
  // Food & Kitchen
  '🍽️ Articulos de Cocina',
  '🔪 Cuchillos',
  '🥄 Cubiertos',
  '🍳 Sartenes y Ollas',
  '☕ Cafeteras',
  '🧊 Neveras Pequeñas',
  '🌶️ Condimentos',
  '🍫 Dulces y Chocolates',
  '🧂 Especias',
  '🥫 Alimentos Enlatados',
  
  // Books & Documents
  '📚 Libros',
  '📰 Revistas',
  '📄 Documentos',
  '📜 Certificados',
  '💿 CDs y DVDs',
  '📸 Fotos',
  '🗞️ Periodicos',
  
  // Tools & Hardware
  '🔧 Herramientas',
  '🔩 Tornillos y Clavos',
  '🪚 Sierras',
  '🔨 Martillos',
  '⚒️ Herramientas de Construccion',
  '🧰 Cajas de Herramientas',
  '🪜 Escaleras',
  '🔗 Cadenas y Candados',
  
  // Auto Parts
  '🚗 Repuestos de Carros',
  '⚙️ Partes de Motor',
  '🛞 Gomas y Rines',
  '🔋 Baterias de Carro',
  '🛢️ Aceites',
  '🚨 Alarmas de Carro',
  '🎵 Radios de Carro'
];

interface ReservaTypeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onWeightChange?: (weight: number) => void;
  placeholder?: string;
  style?: Record<string, any>;
  showWeight?: boolean;
  weight?: number;
}

const ReservaTypeDropdown: Component<ReservaTypeDropdownProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  const filteredTypes = () => {
    const [text, setText] = createSignal("");

    const term = searchTerm().toLowerCase();
    if (!term) return REMESA_TYPES.slice(0, 20); // Show first 20 by default
    
    const filtered = REMESA_TYPES.filter(type => 
      type.toLowerCase().includes(term)
    );
    
    // If no matches found and user is typing, show option to add custom type
    if (filtered.length === 0 && term.length > 0) {
      return [`✏️ Agregar "${searchTerm()}"`];
    }
    
    return filtered.slice(0, 15); // Limit results
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    setSearchTerm(value);
    //props.onChange(value); // Update immediately for custom entries
    setIsOpen(value.length >= 0); // Show dropdown when typing
    setFocusedIndex(-1);
  };

  const handleTypeSelect = (type: string) => {
    let cleanType;
    
    // Handle custom "Add" option
    if (type.startsWith('✏️ Agregar')) {
      cleanType = searchTerm(); // Use the search term as the custom type
    } else {
      cleanType = type.replace(/^[\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]\s*/u, ''); // Remove emoji
    }
    
    props.onChange(cleanType);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const types = filteredTypes();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, types.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && types[focusedIndex()]) {
          handleTypeSelect(types[focusedIndex()]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: FocusEvent) => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    }, 150);
  };

  const displayValue = () => {
    if (isOpen() && searchTerm()) {
      return searchTerm();
    }
    return props.value || '';
  };

  // Styles
  const containerStyle = {
    position: 'relative' as const,
    width: '100%',
    ...props.style
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem',
    background: 'var(--surface-color)'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'z-index': '1000',
    'max-height': '200px',
    'overflow-y': 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
    'margin-top': '2px'
  };

  const itemStyle = (isHighlighted: boolean) => ({
    padding: '0.5rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    background: isHighlighted ? 'var(--primary-color)' : 'transparent',
    color: isHighlighted ? 'white' : 'var(--text-primary)',
    transition: 'all 0.2s ease',
    'font-size': '0.875rem'
  });

  const emptyStateStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    'font-style': 'italic',
    'font-size': '0.875rem'
  };

  const weightInputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    'margin-top': '0.5rem'
  };

  return (
    <div style={containerStyle}>
      <input
        type="text"
        style={inputStyle}
        value={displayValue()}
        onInput={handleInputChange}
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={props.placeholder || "Buscar tipo de reserva..."}
        autocomplete="off"
      />
      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          <Show 
            when={filteredTypes().length > 0}
            fallback={
              <div style={emptyStateStyle}>
                No se encontraron tipos de reserva
              </div>
            }
          >
            <For each={filteredTypes()}>
              {(type, index) => (
                <div
                  style={itemStyle(index() === focusedIndex())}
                  onClick={() => handleTypeSelect(type)}
                  onMouseEnter={() => setFocusedIndex(index())}
                >
                  {type}
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ReservaTypeDropdown;