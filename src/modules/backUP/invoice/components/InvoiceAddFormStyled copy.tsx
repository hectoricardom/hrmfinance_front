import { createSignal, createEffect, For, Show, Component, onMount, createMemo } from 'solid-js';
import { inventoryStore } from '../../inventory/stores/inventoryStore';
import { invoiceStore } from '../stores/invoiceStore';
import { invoiceStyledFormStore, type InvoiceStyledFormData } from '../stores/invoiceStyledFormStore';
import ApiSearchableProductDropdown from '../../inventory/components/ApiSearchableProductDropdown';
import SearchableLocationDropdown from '../../inventory/components/SearchableLocationDropdown';
import SearchableCustomerDropdown from './SearchableCustomerDropdown';
import { useTranslation } from '../../../translations';
import { devLog, generateShortCode, isNotEmpty } from '../../../services/utils';
import { apiAdapter, inventoryApi } from '../../../services/apiAdapter';
import SearchableShipperDropdown from './SearchableCustomerShipper';

// Types remain the same
interface InvoiceProduct {
  id: string;
  product: {
    id: string;
    code: string;
    label: string;
    price?: number;
  };
  qty: number;
  salePrice: number;
  total: number;
}

interface InvoiceReserva {
  id: string;
  type: string;
  qty: number;
  price: number;
  arancel: number;
  total: number;
}

interface InvoiceService {
  id: string;
  type: string;
  qty: number;
  price: number;
  arancel: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phoneNumberS?: string;
  dob?: string;
  cid?: string;
  passport?: string;
  email?: string;
  address?: string;
}

interface ShipperConsignee {
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  lastName2?: string;
  phoneNumberS: string;
  phoneNumber?: string;
  cid?: string;
  dob?: string;
  passport?: string;
  address?: string;
  email?: string;
}

interface PaymentMethod {
  cash: number;
  zelle: number;
  creditCard: number;
  taxPercent: number;
  taxOnTotal: boolean;
  exemptTaxOnCash?: boolean;
}

interface InvoiceForm {
  invoice: string;
  description: string;
  store: string;
  shipper_consignee: ShipperConsignee;
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  services: InvoiceService[];
  packagesOrder: boolean;
  shippingMethod: 'AEREO' | 'SEA' | '';
  createDate?: string;
  paymentMethods: PaymentMethod;
}



const SERVICE_TYPES = [
  '🚛 Transportación',
  '📦 Cajas',
  '🔧 Servicio de Rapeado',
  '🛠️ Otros Servicios'
];


// Common remesa types for dropdown suggestions
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
  
  // Food & Beverages
  '🍫 Alimentos',
  '🍞 Pan y Panaderia',
  '🥛 Lacteos',
  '🥫 Alimentos Enlatados',
  '🍝 Pasta y Granos',
  '☕ Cafe y Te',
  '🧂 Condimentos y Especias',
  '🍯 Miel y Mermeladas',
  '🍷 Bebidas Alcoholicas',
  '🥤 Bebidas y Refrescos',
  '🍬 Dulces y Golosinas',
  
  // Sports & Recreation
  '🏃 Articulos Deportivos',
  '⚽ Balones',
  '🏀 Equipos de Baloncesto',
  '🎾 Equipos de Tenis',
  '🏸 Badminton',
  '🏊 Articulos de Natacion',
  '🚴 Bicicletas y Accesorios',
  '🛴 Patinetas',
  '🎣 Equipos de Pesca',
  '🏕️ Equipos de Camping',
  '🎯 Juegos de Mesa',
  
  // Entertainment & Culture
  '🧸 Juguetes',
  '📚 Libros',
  '📰 Revistas y Periodicos',
  '🎮 Videojuegos',
  '🎵 Instrumentos Musicales',
  '🎸 Guitarras',
  '🎹 Teclados Musicales',
  '🥁 Instrumentos de Percusion',
  '🎨 Materiales de Arte',
  '✏️ Lapices y Boligrafos',
  '📝 Cuadernos y Papeleria',
  '🖍️ Crayones y Marcadores',
  '🎭 Disfraces',
  '🃏 Cartas y Juegos',
  
  // Automotive
  '🚗 Repuestos de Auto',
  '🛞 Llantas',
  '🔧 Herramientas Automotrices',
  '🛢️ Aceites y Lubricantes',
  '🚨 Accesorios para Auto',
  '🗝️ Llaves de Auto',
  '📻 Radios para Auto',
  '🪟 Vidrios para Auto',
  '💺 Asientos para Auto',
  
  // Professional & Tools
  '🔧 Herramientas',
  '🔨 Martillos',
  '🪚 Sierras',
  '🔩 Tornillos y Clavos',
  '⚙️ Repuestos Mecanicos',
  '🧰 Cajas de Herramientas',
  '📏 Instrumentos de Medicion',
  '🔬 Equipos de Laboratorio',
  '📊 Equipos de Oficina',
  '🖥️ Monitores',
  '📠 Fax',
  '📞 Telefonos',
  
  // Travel & Luggage
  '🧳 Maletas',
  '🎒 Mochilas',
  '👜 Bolsos y Carteras',
  '🛄 Equipaje',
  '🗺️ Mapas y Guias',
  '🧭 Brujulas',
  
  // Jewelry & Accessories
  '💍 Joyeria',
  '⌚ Relojes',
  '📿 Collares',
  '💎 Piedras Preciosas',
  '👑 Accesorios de Lujo',
  '🔗 Cadenas',
  '💍 Anillos',
  '👂 Aretes',
  
  // Services
  '♿ Sillas de Rueda',
  '🚛 Transportacion',
  '📦 Cajas',
  '🔧 Servicio de Rapeado',
  '🧼 Servicios de Aseo',
  '📋 Servicios Profesionales',
  '🛠️ Reparaciones',
  '📞 Servicios de Comunicacion',
  '💼 Servicios Empresariales',
  '🏗️ Servicios de Construccion',
  
  // Miscellaneous
  '🎁 Regalos',
  '🎉 Articulos de Fiesta',
  '🎈 Globos y Decoraciones',
  '🕯️ Articulos Religiosos',
  '📿 Articulos Espirituales',
  '🧿 Amuletos',
  '🔮 Articulos Misticos',
  '🎪 Articulos de Entretenimiento',
  '🎨 Manualidades',
  '🧵 Costura y Tejido',
  '✂️ Tijeras y Cortadores',
  '📐 Utiles Escolares',
  '🎓 Articulos Educativos',
  '🔍 Lupas y Microscopios',
  '🌡️ Instrumentos de Medicion',
  '📡 Equipos de Comunicacion',
  '⚖️ Balanzas',
  '🔒 Candados y Seguridad',
  '🚨 Alarmas',
  '📹 Sistemas de Vigilancia'
];


const inputStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--background-color)'
  };

const styles = {
  container: {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
  },
  
  header: {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    'margin-bottom': '1.5rem'
  },

  grid: {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem'
  },

  section: {
    background: 'var(--background-color)',
    padding: '1.25rem',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  },

  sectionTitle: {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  },

  formGroup: {
    'margin-bottom': '1rem'
  },

  label: {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  },

  fieldDescription: {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-bottom': '0.5rem',
    'line-height': '1.4',
    'font-style': 'italic'
  },

  input: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    transition: 'border-color 0.2s',
    'outline': 'none'
  },

  textarea: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    resize: 'vertical',
    'min-height': '60px'
  },

  button: {
    padding: '0.625rem 1.25rem',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem'
  },

  primaryButton: {
    background: 'var(--primary-color)',
    color: 'white'
  },

  secondaryButton: {
    background: 'var(--secondary-color)',
    color: 'white'
  },

  successButton: {
    background: '#4CAF50',
    color: 'white'
  },

  alert: {
    padding: '0.75rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    'font-size': '0.875rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  },

  errorAlert: {
    background: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#d32f2f'
  },

  successAlert: {
    background: '#e8f5e9',
    border: '1px solid #c8e6c9',
    color: '#2e7d32'
  },

  productWrapItem: {
   
    padding: '0.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '0.5rem'
  },

  productItem: {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    'margin-bottom': '0.5rem'
  },

  
  searchBox: {
    position: 'relative',
    'margin-bottom': '1rem',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--surface-color)'
  },

  searchResults: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    'max-height': '200px',
    'overflow-y': 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '0.25rem',
    'z-index': '10',
    'box-shadow': 'var(--shadow-md)'
  },

  searchResultItem: {
    padding: '0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    transition: 'background 0.2s'
  },

  smallInput: {
    width: '70px',
    padding: '0.375rem 0.5rem',
    'font-size': '0.8125rem'
  },

  removeButton: {
    background: 'none',
    border: 'none',
    color: '#f44336',
    cursor: 'pointer',
    'font-size': '1.25rem',
    padding: '0.25rem'
  },

  totalSection: {
   
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'text-align': 'right'
  },

  gridTwo: {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  }
};

export const InvoiceAddForm = () => {
  const { t } = useTranslation();
  // Use persistent form state from store
  const form = invoiceStyledFormStore.formData;
  const updateForm = (updates: Partial<InvoiceStyledFormData>) => invoiceStyledFormStore.updateForm(updates);

  // Enhanced states
  const [selectedCustomer, setSelectedCustomer] = createSignal<Customer | any>(null);
  const [selectedStore, setSelectedStore] = createSignal<string>('');
  const [autoSuggestedInvoiceId, setAutoSuggestedInvoiceId] = createSignal<string>('');


  const [selectedShipper, setSelectedShipper] = createSignal<any>(null);
  
  // Force load saved data on mount
  onMount(() => {
    // Force a re-render to ensure form fields are populated
    devLog('Styled invoice form mounted, loaded data:', form());
    
    // If there's saved data, show a message
    if (invoiceStyledFormStore.hasData()) {
      setSuccess('Form data restored from previous session');
      setTimeout(() => setSuccess(''), 3000);
    }
  });

  // Loading and error states
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal('');

  // State for created invoice
  const [createdInvoice, setCreatedInvoice] = createSignal<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = createSignal(false);

  // Auto-suggest invoice ID based on store
  const generateInvoiceId = (storeId: string) => {
    if (!storeId) return '';
    
    const store = inventoryStore.getLocationById(storeId);
    const storePrefix = store?.code || store?.name?.substring(0, 3).toUpperCase() || 'INV';
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = generateShortCode(6);
    
    return `${timeStr}-${storePrefix}-${dateStr}`;
  };

  // Watch store changes for auto-suggest
  createEffect(() => {
    const store = selectedStore();
    if (store && !form().invoice.trim()) {
      const suggestedId = generateInvoiceId(store);
      setAutoSuggestedInvoiceId(suggestedId);
      updateForm({ invoice: suggestedId });
    }
  });

  // Watch customer selection
  createEffect(() => {
    const customer = selectedCustomer();
    if (customer) {
      invoiceStyledFormStore.updateShipperConsignee({
        name: customer.name,
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        phoneNumber: customer.phoneNumber || '',
        cid: customer.cid || '',
        passport: customer.passport || '',
        address: customer.address || ''
      });
    }
  });


  createEffect(() => {
   // devLog(JSON.stringify(form()))
  });

  // Add product to invoice (now using product ID instead of full product object)
  const addProduct = (productId: string) => {
    // Get product details from store
    const product = inventoryStore.getProductById(productId);
    if (!product) return;

    const newProduct = {
      id: Date.now().toString(),
      product: {
        id: product.id,
        code: product.sku || '',
        label: product.name || '',
        price: product.unitCost || 0
      },
      qty: 1,
      salePrice: product.unitCost || 0,
      total: product.unitCost || 0
    };

    invoiceStyledFormStore.addProduct(newProduct);
  };

  // Handle store selection
  const handleStoreChange = (locationId: string) => {
    setSelectedStore(locationId);
    // const location = inventoryStore.getLocationById(locationId);
    updateForm({ store: locationId });
  };

  // Handle customer selection
  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(prev => ({
      ...prev,
      ...customer
    }));
  };

   // Handle shipper selection
   const handleShipperChange = (customer: Customer | null) => {
    
    setSelectedShipper({
      name: customer?.name
    })

    setSelectedCustomer(prev => ({
        ...prev,
        phoneNumberS: customer?.phoneNumberS,
        name: customer?.name, 
        dob: customer?.dob 
      }));
      
  };

  // Update product quantity or price
  const updateProduct = (id: string, field: 'qty' | 'salePrice', value: number) => {
    const products = form().products;
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      const updated = { ...products[index], [field]: value };
      updated.total = updated.qty * updated.salePrice;
      invoiceStyledFormStore.updateProduct(index, updated);
    }
  };

  // Remove product
  const removeProduct = (id: string) => {
    const index = form().products.findIndex(p => p.id === id);
    if (index !== -1) {
      invoiceStyledFormStore.removeProduct(index);
    }
  };

  // Add reserva
  const addReserva = () => {
    const newReserva = {
      id: Date.now().toString(),
      type: '',
      qty: 1,
      price: 0,
      arancel: 0,
      total: 0
    };
    invoiceStyledFormStore.addReserva(newReserva);
  };

  // Add service
  const addService = () => {
    const newService = {
      id: Date.now().toString(),
      type: '',
      qty: 0,
      price: 0,
      arancel: 0,
      total: 0
    };
    invoiceStyledFormStore.addService(newService);
  };

  // Update reserva
  const updateReserva = (id: string, field: keyof InvoiceReserva, value: string | number) => {
    const reservas = form().reservas;
    const index = reservas.findIndex(r => r.id === id);
    if (index !== -1) {
      const updated = { ...reservas[index], [field]: value };
      // Always recalculate total when any numeric field changes
      if (field === 'qty' || field === 'price' || field === 'arancel') {
        updated.total = (Number(updated.qty) * Number(updated.price)) + Number(updated.arancel);
      }
      invoiceStyledFormStore.updateReserva(index, updated);
    }
  };

  // Remove reserva
  const removeReserva = (id: string) => {
    const index = form().reservas.findIndex(r => r.id === id);
    if (index !== -1) {
      invoiceStyledFormStore.removeReserva(index);
    }
  };

  // Update service
  const updateService = (id: string, field: keyof InvoiceService, value: string | number) => {
    const services = form().services;
    const index = services.findIndex(s => s.id === id);
    if (index !== -1) {
      const updated = { ...services[index], [field]: value };
      // Always recalculate total when any numeric field changes
      if (field === 'qty' || field === 'arancel') {
        updated.total = Number(updated.qty) * Number(updated.arancel);
      }
      invoiceStyledFormStore.updateService(index, updated);
    }
  };

  // Remove service
  const removeService = (id: string) => {
    const index = form().services.findIndex(s => s.id === id);
    if (index !== -1) {
      invoiceStyledFormStore.removeService(index);
    }
  };

  // Calculate totals
  const productSubtotal = () => {
    return form().products.reduce((sum, product) => sum + product.total, 0);
  };

  const reservaSubtotal = () => {
    return form().reservas.reduce((sum, reserva) => sum + reserva.total, 0);
  };

  const serviceSubtotal = () => {
    return form().services.reduce((sum, service) => sum + service.total, 0);
  };

  const subtotalBeforeTax = () => {
    return productSubtotal() + reservaSubtotal() + serviceSubtotal();
  };

  const taxAmount = () => {
    if (form()?.paymentMethods.taxPercent === 0) return 0;
    
    // Check if tax should be exempted for cash payments
    if (form()?.paymentMethods.exemptTaxOnCash) {
      const cashRatio = totalPayments() > 0 ? form().paymentMethods.cash / totalPayments() : 0;
      const taxExemptionRatio = Math.min(cashRatio, 1); // Maximum 100% exemption
      
      let baseTaxAmount;
      if (form()?.paymentMethods.taxOnTotal) {
        // Tax as percentage of final total (reverse calculation)
        const totalWithTax = subtotalBeforeTax() / (1 - form()?.paymentMethods.taxPercent / 100);
        baseTaxAmount = totalWithTax - subtotalBeforeTax();
      } else {
        // Tax as percentage of subtotal (standard calculation)
        baseTaxAmount = subtotalBeforeTax() * (form()?.paymentMethods.taxPercent / 100);
      }
      
      // Apply cash exemption
      return baseTaxAmount * (1 - taxExemptionRatio);
    }
    
    // Normal tax calculation without exemption
    if (form()?.paymentMethods.taxOnTotal) {
      const totalWithTax = subtotalBeforeTax() / (1 - form()?.paymentMethods?.taxPercent / 100);
      return totalWithTax - subtotalBeforeTax();
    } else {
      return subtotalBeforeTax() * (form()?.paymentMethods?.taxPercent / 100);
    }
  };
  
  const taxSavings = () => {
    if (!form()?.paymentMethods.exemptTaxOnCash || form()?.paymentMethods.taxPercent === 0) return 0;
    
    const cashRatio = totalPayments() > 0 ? form().paymentMethods.cash / totalPayments() : 0;
    const taxExemptionRatio = Math.min(cashRatio, 1);
    
    let baseTaxAmount;
    if (form()?.paymentMethods.taxOnTotal) {
      const totalWithTax = subtotalBeforeTax() / (1 - form()?.paymentMethods?.taxPercent / 100);
      baseTaxAmount = totalWithTax - subtotalBeforeTax();
    } else {
      baseTaxAmount = subtotalBeforeTax() * (form()?.paymentMethods?.taxPercent / 100);
    }
    
    return baseTaxAmount * taxExemptionRatio;
  };

  const grandTotal = () => {
    return subtotalBeforeTax() + taxAmount();
  };

  const totalPayments = () => {
    const payments = form().paymentMethods;
    return payments.cash + payments.zelle + payments.creditCard;
  };

  const paymentBalance = () => {
    return grandTotal() - totalPayments();
  };

  // Update payment method
  const updatePaymentMethod = (method: keyof PaymentMethod, value: number) => {
    invoiceStyledFormStore.updatePaymentMethods({ [method]: value });
  };

  const updatePaymentMethodAny = (method: keyof PaymentMethod, value: any) => {
    invoiceStyledFormStore.updatePaymentMethods({ [method]: value });
  };

  // Auto-fill payment methods
  const autoFillPayment = (method: keyof PaymentMethod) => {
    const total = grandTotal();
    invoiceStyledFormStore.updatePaymentMethods({
      cash: method === 'cash' ? total : 0,
      zelle: method === 'zelle' ? total : 0,
      creditCard: method === 'creditCard' ? total : 0,
    });
  };

  const clearAllPayments = () => {
    invoiceStyledFormStore.updatePaymentMethods({
      cash: 0,
      zelle: 0,
      creditCard: 0,
    });
  };

  // Save invoice
  const saveInvoice = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!form().invoice.trim()) {
        throw new Error('Numero de factura es requerido');
      }
      if (!form().shipper_consignee.name.trim()) {
        throw new Error('Nombre del cliente es requerido');
      }
      if (form().products.length === 0 && form().reservas.length === 0 && form().services.length === 0) {
        throw new Error('Al menos un producto, reserva o servicio es requerido');
      }
      if (Math.round(paymentBalance()) > 0.01) {
        throw new Error(`El total de pagos (${totalPayments().toFixed()}) no coincide con el total de la factura (${grandTotal().toFixed()})`);
      }

      // Create invoice data
      const invoiceData = {
        ...form(),
        type: 'SALES',
        ssg_inventory_key: `INVOICE-${Date.now()}`,
        ssg_sorder_key: `SO-${Date.now()}`,
        createDate: form().createDate || Date.now(),
        businessId: 'YB100423253156428',
        isCompleted: true,
        productSubtotal: productSubtotal(),
        reservaSubtotal: reservaSubtotal(),
        serviceSubtotal: serviceSubtotal(),
        subtotalBeforeTax: subtotalBeforeTax(),
        taxAmount: taxAmount(),
        taxSavings: taxSavings(),
        total: grandTotal(),
        shippingMethod: form().shippingMethod,
        taxCalculationMethod: form()?.paymentMethods.taxOnTotal ? 'total' : 'subtotal',
        cashPaymentRatio: totalPayments() > 0 ? form().paymentMethods.cash / totalPayments() : 0,
        paymentMethods: form().paymentMethods,
      };


      devLog("createInvoice", JSON.stringify(invoiceData, null, 4))
      // Save to invoice store
      const result = await inventoryApi.addInventory(invoiceData);
      
      inventoryApi.addInvoice(result);
      setCreatedInvoice(result.data);

      setSuccess('✅ Invoice created successfully! You can now generate a PDF.');
      
      // Mark form as completed (clears storage)
      invoiceStyledFormStore.markCompleted();
      //invoiceStyledFormStore.markCompleted();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error creating invoice');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!createdInvoice()) return;

    setIsGeneratingPDF(true);
    setError('');

    try {
      // Import the enhanced PDF generator
      const { generateEnhancedInvoicePDF } = await import('../../../utils/enhancedInvoicePdfGenerator');
      
      devLog(JSON.stringify(form()))
      // Prepare enhanced invoice data


      let invoiceId = createdInvoice();

      const enhancedInvoiceData = {
        invoiceId,
        shippingMethod: form().shippingMethod,
        taxPercent: form()?.paymentMethods.taxPercent,
        taxOnTotal: form()?.paymentMethods.taxOnTotal,
        exemptTaxOnCash: form()?.paymentMethods.exemptTaxOnCash,
        paymentMethods: form().paymentMethods,
        productSubtotal: productSubtotal(),
        reservaSubtotal: reservaSubtotal(),
        subtotalBeforeTax: subtotalBeforeTax(),
        taxAmount: taxAmount(),
        taxSavings: form()?.paymentMethods.exemptTaxOnCash ? (subtotalBeforeTax() * form()?.paymentMethods.taxPercent / 100) - taxAmount() : 0,
        total: grandTotal(),
        cashPaymentRatio: totalPayments() > 0 ? form().paymentMethods.cash / totalPayments() : 0
      };
      
      devLog(JSON.stringify(enhancedInvoiceData))
      const filename = await generateEnhancedInvoicePDF({...form(), ...enhancedInvoiceData} as any, 'es', 'modern');
      setSuccess(`📄 PDF generated successfully: ${filename}`);
    } catch (err: any) {
      setError(err.message || 'Error generating PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Reset form (user action)
  const resetForm = () => {
    invoiceStyledFormStore.clearForm();
   
    setCreatedInvoice('');
    setSuccess('');
    setError('');
  };
  
  // Check if form has unsaved data
  const hasUnsavedData = () => {
    return invoiceStyledFormStore.hasData() && invoiceStyledFormStore.isDirty;
  };
  
  // Confirm reset if there's unsaved data
  const confirmReset = () => {
    if (hasUnsavedData()) {
      if (confirm('Are you sure you want to clear the form? All unsaved changes will be lost.')) {
        resetForm();
      }
    } else {
      resetForm();
    }
  };

  // Styles


  onMount(()=>{
  })


  const uniqueGuides = createMemo(() => {
      const guides = new Set([2516,2517,2518,2519, 2520, 2521, 2522, 2523].map(hbl => hbl));
      return Array.from(guides).sort((a, b) => a - b);
  });

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>📄 Crear Nueva Factura</h2>
    
      {/* Error/Success Messages */}
      <Show when={error()}>
        <div style={{ ...styles.alert, ...styles.errorAlert }}>
          ⚠️ {error()}
        </div>
      </Show>

      <Show when={success()}>
        <div style={{ ...styles.alert, ...styles.successAlert }}>
          {success()}
        </div>
      </Show>

      <div style={styles.grid}>
        {/* Left Column - Invoice Details */}
        <div>
          {/* Basic Invoice Info */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📋 Informacion de Factura</h3>
            
            <div style={styles.gridTwo}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Numero de Factura *</label>
                <input
                  type="text"
                  value={form().invoice}
                  onInput={(e) => updateForm({ invoice: e.target.value })}
                  style={styles.input}
                  placeholder={autoSuggestedInvoiceId() || "INV-20241201-1234"}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Ubicacion de Tienda *</label>
                <SearchableLocationDropdown
                  value={selectedStore()}
                  onChange={handleStoreChange}
                  placeholder={t('inventory.selectStoreLocation', 'Buscar y seleccionar ubicacion de tienda...')}
                  filterType="store"
                  required
                />
              </div>
            </div>

            {/* Shipping and Tax Options */}
            <div style={styles.gridTwo}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Metodo de Envio</label>
                <div style={styles.fieldDescription}>Seleccione el metodo de transporte para esta orden.</div>
                <select
                  value={form().shippingMethod}
                  onChange={(e) => updateForm({ shippingMethod: e.currentTarget.value as 'aereo' | 'maritimo' | '' })}
                  style={styles.input}
                >
                  <option value="">Seleccionar metodo...</option>
                  <option value="AEREO">✈️ Aereo (Avion)</option>
                  <option value="SEA">🚢 Maritimo (Barco)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>fecha</label>
                <div style={styles.fieldDescription}>Seleccione una fecha si es diferente al dia de hoy.</div>
              
                <input
                  type="date"
                  style={inputStyle}
                  value={form().createDate}
                  onChange={(e) => updateForm({ createDate: e.currentTarget.value })}
                  
                />
              </div>

          
              <div style={styles.formGroup}>
                <label style={styles.label}>No de Guia</label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={form().guide}
                  onChange={(e) => updateForm({ guide: e.currentTarget.value })}
               
                >
                  <option value="all">{t('common.all', 'All')}</option>
                  <For each={uniqueGuides()}>
                    {(guide) => <option value={guide}>{guide}</option>}
                  </For>
                </select>
              </div>
             

            </div>

         
         

            <div style={styles.formGroup}>
              <label style={styles.label}>Descripcion de Factura</label>
              <textarea
                value={form().description}
                onInput={(e) => updateForm({ description: e.target.value })}
                style={styles.textarea}
                placeholder="ej., Venta regular, pedido mayorista, descuento especial aplicado..."
              />
            </div>

          

            <label style={{ ...styles.label, display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form().packagesOrder}
                onChange={(e) => updateForm({ packagesOrder: e.target.checked })}
              />
              <div>
                <span>Orden de Paquete/Envio</span>
                <div style={styles.fieldDescription}>Marque esto si esta factura incluye servicios de envio o manejo de paquetes.</div>
              </div>
            </label>
          </div>

          <Show when={form().shippingMethod && form().invoice && form().guide && selectedStore()} >
        

          {/* Customer Information */}
          <div style={{ ...styles.section, 'margin-top': '1rem' }}>
            <h3 style={styles.sectionTitle}>👤 Informacion del Cliente</h3>
            
            {/* Customer Search */}
            <div style={styles.formGroup}>
              <SearchableShipperDropdown
                value={selectedShipper()}
                onChange={handleShipperChange}
                label="Buscar Cliente Existente"
                description="Busque clientes existentes por nombre, telefono o ID. Si no se encuentra, complete el formulario a continuacion para crear un nuevo cliente."
                placeholder="Escriba nombre del cliente, numero de telefono o ID para buscar..."
              />
            </div>
            
            <div style={styles.gridTwo}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre del Cliente/Empresa *</label>
                <input
                  type="text"
                  value={form().shipper_consignee.name}
                  onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ name: e.target.value })}
                  style={styles.input}
                  placeholder="ej., Juan Perez o Empresa ABC"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Numero de Telefono Principal</label>
                <input
                  type="tel"
                  value={form().shipper_consignee.phoneNumberS || ''}
                  onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ phoneNumberS: e.target.value })}
                  style={styles.input}
                  placeholder="ej., +53-5-123-4567"
                />
              </div>
            </div>
          </div>

            <div style={{ ...styles.section, 'margin-top': '1rem' }}>
              <h3 style={styles.sectionTitle}>👤 Informacion del Destinatario</h3>

              
              <div style={styles.formGroup}>
                <SearchableCustomerDropdown
                  value={selectedCustomer()}
                  onChange={handleCustomerChange}
                  label="Buscar Destinatario Existente"
                  description="Busque Destinatario existentes por telefono o ID. Si no se encuentra, complete el formulario a continuacion para crear un nuevo destinatario."
                  placeholder="Escriba nombre del destinatario, numero de telefono o ID para buscar..."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Primer Nombre</label>
                <input
                  type="text"
                  value={form().shipper_consignee.firstName || ''}
                  onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ firstName: e.target.value })}
                  style={styles.input}
                  placeholder="ej., Juan"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Apellido</label>
                <input
                  type="text"
                  value={form().shipper_consignee.lastName || ''}
                  onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ lastName: e.target.value })}
                  style={styles.input}
                  placeholder="ej., Perez"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Numero de Identificacion</label>
                <input
                  type="text"
                  value={form().shipper_consignee.cid || ''}
                  onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ cid: e.target.value })}
                  style={styles.input}
                  placeholder="ej., 12345678901 o A1234567"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Numero de Pasaporte</label>
               <input
                  type="text"
                  value={form().shipper_consignee.passport || ''}
                  onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ passport: e.target.value })}
                  style={styles.input}
                  placeholder="ej., AB1234567"
                />
              </div>
           
              <div style={styles.formGroup}>
                <label style={styles.label}>Numero de Telefono Principal</label>
                <input
                  type="tel"
                  value={form().shipper_consignee.phoneNumber || ''}
                  onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ phoneNumber: e.target.value })}
                  style={styles.input}
                  placeholder="ej., +53-5-123-4567"
                />
              </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Direccion de Entrega/Facturacion</label>
              <textarea
                value={form().shipper_consignee.address || ''}
                onInput={(e) => invoiceStyledFormStore.updateShipperConsignee({ address: e.target.value })}
                style={styles.textarea}
                placeholder="ej., Calle 23 #456, Apto 4B, Vedado, La Habana, 10400"
              />
            </div>
            </div>

            </Show>
          </div>


        {/* Right Column - Products and Reservas */}
        <div>


        <Show when={form().shippingMethod && form().invoice && form().shipper_consignee?.cid && form().shipper_consignee?.name} >
        
           {/* Reservas Section */}
           <div style={{ ...styles.section, 'margin-top': '1rem' }}>
            <div style={{ ...styles.sectionTitle, 'justify-content': 'space-between' }}>
              <span>🎫 Reservas y Servicios</span>
              <button
                onClick={addReserva}
                style={{ ...styles.button, ...styles.successButton }}
              >
                ➕ Agregar Servicio/Reserva
              </button>
            </div>
            
        
            <For each={form().reservas}>
              {(reserva) => (
                  <ReservaInvoice 
                    updateReserva={updateReserva}
                    reserva={reserva}
                    removeReserva={removeReserva}
                  />
              )}
            </For>

            <Show when={form().reservas.length > 0}>
              <div style={{ 'margin-top': '0.75rem', 'padding-top': '0.75rem', 'border-top': '1px solid var(--border-color)', 'text-align': 'right' }}>
                <strong>Subtotal: ${reservaSubtotal().toFixed()}</strong>
              </div>
            </Show>
          </div>

          {/* Services Section */}
          <div style={{ ...styles.section, 'margin-top': '1rem' }}>
            <div style={{ ...styles.sectionTitle, 'justify-content': 'space-between' }}>
              <span>🛠️ Servicios Adicionales</span>
              <button
                onClick={addService}
                style={{ ...styles.button, ...styles.successButton }}
              >
                ➕ Agregar Servicio
              </button>
            </div>
            
            <div style={styles.fieldDescription}>
              Servicios de transporte, cajas, rapeado y otros cargos adicionales.
            </div>
            
            <For each={form().services}>
              {(service) => (
                <ServiceInvoice 
                  updateService={updateService}
                  service={service}
                  removeService={removeService}
                />
              )}
            </For>

            <Show when={form().services.length > 0}>
              <div style={{ 'margin-top': '0.75rem', 'padding-top': '0.75rem', 'border-top': '1px solid var(--border-color)', 'text-align': 'right' }}>
                <strong>Subtotal Servicios: ${serviceSubtotal().toFixed(2)}</strong>
              </div>
            </Show>
          </div>

          {/* Products Section */}
          <div style={{...styles.section , 'margin-top': '1rem' }}>
            <div style={{ ...styles.sectionTitle, 'justify-content': 'space-between' }}>
              <span>📦 Productos y Articulos</span>
            </div>

            {/* Enhanced Product Search */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Agregar Productos a la Factura</label>
              <ApiSearchableProductDropdown
                value=""
                onChange={addProduct}
                placeholder={t('inventory.searchProductsToAdd', 'Buscar productos por nombre, SKU o categoria para agregar a la factura...')}
                searchDelay={300}
                maxResults={15}
              />
            </div>

            {/* Products List */}
            <For each={form().products}>
              {(product) => (
                <ProductsInvoice 
                  product={product} 
                  updateProduct={updateProduct}
                  removeProduct={removeProduct}
                />
              )}
            </For>

            <Show when={form().products.length > 0}>
              <div style={{ 'margin-top': '0.75rem', 'padding-top': '0.75rem', 'border-top': '1px solid var(--border-color)', 'text-align': 'right' }}>
                <strong>Subtotal: ${productSubtotal().toFixed()}</strong>
              </div>
            </Show>
          </div>

          <div style={{ ...styles.section, 'margin-top': '1rem' }}>
              
            <div style={styles.formGroup}>
                <label style={styles.label}>Impuesto (%)</label>
                <div style={styles.fieldDescription}>
                  Porcentaje de impuesto. Puede aplicarse sobre el subtotal o como porcentaje del total final.
                </div>
                
                {/* Tax Preview */}
                <Show when={form()?.paymentMethods.taxPercent > 0 && subtotalBeforeTax() > 0}>
                  <div style={{
                    'margin-top': '0.5rem',
                    padding: '0.5rem',
                    background: 'var(--strip-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.75rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                      Vista previa del calculo:
                    </div>
                    <div>Subtotal: ${subtotalBeforeTax().toFixed(2)}</div>
                    <div style={{ color: form()?.paymentMethods?.taxOnTotal ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                      • Del Subtotal: ${(subtotalBeforeTax() * form()?.paymentMethods?.taxPercent / 100).toFixed(2)} 
                      (Total: ${(subtotalBeforeTax() + subtotalBeforeTax() * form()?.paymentMethods?.taxPercent / 100).toFixed(2)})
                    </div>
                    <div style={{ color: form()?.paymentMethods?.taxOnTotal ? 'var(--text-muted)' : 'var(--primary-color)' }}>
                      • Del Total: ${taxAmount().toFixed(2)} 
                      (Total: ${grandTotal().toFixed(2)})
                    </div>
                  </div>
                </Show>
                <input
                  type="number"
                  value={form()?.paymentMethods?.taxPercent}
                  onInput={(e) =>  updatePaymentMethod('taxPercent', parseFloat(e.target.value) || 0)}
                    
                  style={styles.input}
                  placeholder="0"
                  min="0"
                  max="99"
                  step="0.01"
                />
                
                {/* Tax Calculation Method */}
                <div 
                  style={{ 'margin-top': '0.5rem', 
                    'align-items': 'center', 
                    gap: '0.5rem', 
                  }}
                >

                
                <div 
                  style={{ 'margin-top': '0.5rem'}}
                >
                  <label style={{ 
                    ...styles.label, 
                    display: 'flex', 
                    'align-items': 'center', 
                    gap: '0.5rem',
                    'font-size': '0.8rem',
                    'margin-bottom': '0.25rem'
                  }}>
                    <input
                      type="radio"
                      name="taxMethod"
                      checked={!form()?.paymentMethods?.taxOnTotal}
                      onChange={() => updatePaymentMethod('taxOnTotal', false)}
                    />
                    <span>Del Subtotal (tradicional)</span>
                  </label>

                  <div style={{ ...styles.fieldDescription, 'margin-left': '1.5rem', 'margin-bottom': '0.5rem' }}>
                    Impuesto = Subtotal × {form()?.paymentMethods?.taxPercent}%
                    {form()?.paymentMethods?.taxPercent > 0 && !form()?.paymentMethods?.taxOnTotal && (
                      <span style={{ color: 'var(--primary-color)' }}>
                        {' '}(${(subtotalBeforeTax() * form()?.paymentMethods?.taxPercent / 100).toFixed(2)})
                      </span>
                    )}
                  </div>
                  
                  <label style={{ 
                    ...styles.label, 
                    display: 'flex', 
                    'align-items': 'center', 
                    gap: '0.5rem',
                    'font-size': '0.8rem',
                    'margin-bottom': '0.25rem'
                  }}>
                    <input
                      type="radio"
                      name="taxMethod"
                      checked={form()?.paymentMethods?.taxOnTotal}
                     
                      onChange={() =>  updatePaymentMethod( 'taxOnTotal', true)}
                    />
                    <span>Del Total Final</span>
                  </label>
                  <div style={{ ...styles.fieldDescription, 'margin-left': '1.5rem' }}>
                    El impuesto representa el {form()?.paymentMethods?.taxPercent}% del total final
                    {form()?.paymentMethods?.taxPercent > 0 && form()?.paymentMethods?.taxOnTotal && (
                      <span style={{ color: 'var(--primary-color)' }}>
                        {' '}(${taxAmount().toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Tax Exemption for Cash Payments */}
                <Show when={form()?.paymentMethods?.taxPercent > 0}>
                  <div style={{ 'margin-top': '1rem', 'padding-top': '1rem', 'border-top': '1px solid var(--border-color)' }}>
                    <label style={{ 
                      ...styles.label, 
                      display: 'flex', 
                      'align-items': 'center', 
                      gap: '0.5rem',
                      'margin-bottom': '0.5rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={form()?.paymentMethods?.exemptTaxOnCash}
                        onChange={(e) => updatePaymentMethodAny( "exemptTaxOnCash", e.target.checked )}
                        
                      />
                      <span>💵 Exencion de Impuesto por Pago en Efectivo</span>
                    </label>
                    <div style={styles.fieldDescription}>
                      Los pagos en efectivo estaran exentos de impuestos. Mientras mayor sea el porcentaje pagado en efectivo, mayor sera la exencion.
                    </div>
                    
                    <Show when={form()?.paymentMethods?.exemptTaxOnCash && totalPayments() > 0}>
                      <div style={{
                        'margin-top': '0.5rem',
                        padding: '0.75rem',
                        background: '#e8f5e9',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem',
                        border: '1px solid #c8e6c9'
                      }}>
                        <div style={{ 'font-weight': '500', color: '#2e7d32', 'margin-bottom': '0.5rem' }}>
                          💰 Beneficio por Pago en Efectivo:
                        </div>
                        <div>Efectivo: ${form().paymentMethods?.cash?.toFixed(2)} ({((form().paymentMethods?.cash / totalPayments()) * 100)?.toFixed(1)}% del pago)</div>
                        <div style={{ color: '#4CAF50', 'font-weight': '500' }}>Ahorro en impuestos: ${taxSavings()?.toFixed(2)}</div>
                        <div style={{ 'font-size': '0.8rem', color: '#666', 'margin-top': '0.25rem' }}>
                          Impuesto original: ${(taxAmount() + taxSavings())?.toFixed(2)} → Impuesto final: ${taxAmount()?.toFixed(2)}
                        </div>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            </div>


          </div>

          {/* Payment Methods Section */}
          <div style={{ ...styles.section, 'margin-top': '1rem' }}>
            <div style={styles.sectionTitle}>
              <span>💳 Metodos de Pago</span>
            </div>
            
            <div style={styles.fieldDescription}>Distribuya el pago total entre los diferentes metodos de pago disponibles.</div>
            
            {/* Quick Payment Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              'margin-bottom': '1rem',
              'flex-wrap': 'wrap'
            }}>
              <button
                type="button"
                onClick={() => autoFillPayment('cash')}
                style={{ 
                  ...styles.button, 
                  ...(form()?.paymentMethods.exemptTaxOnCash && form()?.paymentMethods.taxPercent > 0 ? 
                    { background: '#4CAF50', color: 'white' } : 
                    styles.secondaryButton
                  ),
                  'font-size': '0.75rem',
                  padding: '0.5rem 0.75rem',
                  position: 'relative'
                }}
                title={form()?.paymentMethods.exemptTaxOnCash && form()?.paymentMethods.taxPercent > 0 ? 
                  `Pagar todo en efectivo (Ahorro: $${(subtotalBeforeTax() * form()?.paymentMethods.taxPercent / 100).toFixed(2)})` : 
                  "Pagar todo en efectivo"
                }
              >
                💵 Todo Efectivo
                <Show when={form()?.paymentMethods.exemptTaxOnCash && form()?.paymentMethods.taxPercent > 0}>
                  <span style={{ 
                    'font-size': '0.6rem', 
                    display: 'block',
                    'line-height': '1'
                  }}>
                    💰 Sin impuesto
                  </span>
                </Show>
              </button>
              <button
                type="button"
                onClick={() => autoFillPayment('zelle')}
                style={{ 
                  ...styles.button, 
                  ...styles.secondaryButton,
                  'font-size': '0.75rem',
                  padding: '0.5rem 0.75rem'
                }}
                title="Pagar todo por Zelle"
              >
                📱 Todo Zelle
              </button>
              <button
                type="button"
                onClick={() => autoFillPayment('creditCard')}
                style={{ 
                  ...styles.button, 
                  ...styles.secondaryButton,
                  'font-size': '0.75rem',
                  padding: '0.5rem 0.75rem'
                }}
                title="Pagar todo con tarjeta"
              >
                💳 Todo Tarjeta
              </button>
              <button
                type="button"
                onClick={clearAllPayments}
                style={{ 
                  ...styles.button, 
                  background: '#f44336',
                  color: 'white',
                  'font-size': '0.75rem',
                  padding: '0.5rem 0.75rem'
                }}
                title="Limpiar todos los pagos"
              >
                🗑️ Limpiar
              </button>
            </div>
            
            <div style={styles.gridTwo}>
              <div style={styles.formGroup}>
                <label style={styles.label}>💵 Efectivo</label>
                <input
                  type="text"
                  value={form().paymentMethods.cash}
                  onInput={(e) => updatePaymentMethod('cash', parseFloat(e.target.value) || 0)}
                  style={styles.input}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>📱 Zelle</label>
                <input
                  type="text"
                  value={form().paymentMethods.zelle}
                  onInput={(e) => updatePaymentMethod('zelle', parseFloat(e.target.value) || 0)}
                  style={styles.input}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>💳 Tarjeta de Credito</label>
              <input
                type="text"
                value={form().paymentMethods.creditCard}
                onInput={(e) => updatePaymentMethod('creditCard', parseFloat(e.target.value) || 0)}
                style={styles.input}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Payment Summary */}
            <div style={{
              'margin-top': '1rem',
              'padding-top': '1rem',
              'border-top': '1px solid var(--border-color)',
              display: 'grid',
              'grid-template-columns': '1fr 1fr',
              gap: '1rem',
              'font-size': '0.875rem'
            }}>
              <div>
                <div>Total de Pagos: <strong>${totalPayments().toFixed()}</strong></div>
                <div style={{ color: parseFloat(paymentBalance().toFixed()) === 0 ? '#4CAF50' : paymentBalance() > 0 ? '#f44336' : '#FF9800' }}>
                  Balance: <strong>${paymentBalance().toFixed()}</strong>
                </div>
              </div>
              <div style={{ 'text-align': 'right' }}>
                <div>Total a Pagar: <strong>${grandTotal().toFixed()}</strong></div>
                <div style={{
                  color: parseFloat(paymentBalance().toFixed()) === 0 ? '#4CAF50' : '#f44336',
                  'font-weight': '500'
                }}>
                  {Math.round(paymentBalance())=== 0 ? '✓ Pagado Completo' : paymentBalance() > 0 ? 'Falta Pagar' : 'Sobrepago'}
                </div>
              </div>
            </div>


          </div>

          {/* Total Section */}
          <div style={{ ...styles.section, 'margin-top': '1rem' }}>
         
            <div style={styles.totalSection}>
              <div style={{ 'font-size': '0.875rem', 'opacity': '0.9' }}>Productos: ${productSubtotal().toFixed()}</div>
              <div style={{ 'font-size': '0.875rem', 'opacity': '0.9' }}>Reservas: ${reservaSubtotal().toFixed()}</div>
              <Show when={serviceSubtotal() > 0}>
                <div style={{ 'font-size': '0.875rem', 'opacity': '0.9' }}>Servicios: ${serviceSubtotal().toFixed(2)}</div>
              </Show>
              <div style={{ 'font-size': '0.875rem', 'opacity': '0.9', 'border-top': '1px solid rgba(175,175,175,0.2)', 'padding-top': '0.5rem', 'margin-top': '0.5rem' }}>Subtotal: ${subtotalBeforeTax().toFixed(2)}</div>
              <Show when={form()?.paymentMethods?.taxPercent > 0}>
                <div style={{ 'font-size': '0.875rem', 'opacity': '0.9' }}>
                  Impuesto ({form()?.paymentMethods?.taxPercent}% {form()?.paymentMethods?.taxOnTotal ? 'del total' : 'del subtotal'}): ${taxAmount().toFixed(2)}
                  <Show when={form()?.paymentMethods?.exemptTaxOnCash && taxSavings() > 0}>
                    <span style={{ color: '#4CAF50', 'margin-left': '0.5rem' }}>
                      (Ahorro: ${taxSavings().toFixed(2)})
                    </span>
                  </Show>
                </div>
              </Show>
             
              <div style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-top': '0.5rem', 'border-top': '1px solid rgba(175,175,175,0.3)', 'padding-top': '0.5rem' }}>
                Total: ${grandTotal().toFixed(0)}
              </div>
            </div>
          </div>

          {/* Form Status */}
          <div style={{  'margin-top': '1rem' }}>
         </div>
          <Show when={invoiceStyledFormStore.isDirty || invoiceStyledFormStore.lastSaved}>
            <div style={{ 
              'margin-top': '1rem',
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              'border-radius': 'var(--border-radius-sm)',
              padding: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                'font-size': '0.875rem'
              }}>
                <Show when={invoiceStyledFormStore.isDirty}>
                  <span style={{
                    color: '#4CAF50',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      background: '#4CAF50',
                      'border-radius': '50%',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite'
                    }}></span>
                    Auto-guardando cambios...
                  </span>
                </Show>
                <Show when={!invoiceStyledFormStore.isDirty && invoiceStyledFormStore.lastSaved}>
                  <span style={{
                    color: '#4CAF50',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      background: '#4CAF50',
                      'border-radius': '50%',
                      display: 'inline-block'
                    }}></span>
                    Guardado: {invoiceStyledFormStore.lastSaved?.toLocaleTimeString()}
                  </span>
                </Show>
                <Show when={hasUnsavedData()}>
                  <button
                    onClick={confirmReset}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f44336',
                      cursor: 'pointer',
                      'font-size': '0.75rem',
                      'text-decoration': 'underline'
                    }}
                  >
                    Limpiar Formulario
                  </button>
                </Show>
              </div>
            </div>
          </Show>
          
          {/* Action Buttons */}

            <Show when={(!createdInvoice() && grandTotal()>0) && !(isSaving()  || !form().invoice.trim() || !form().shipper_consignee.name.trim() || Math.round(paymentBalance()) > 0.01)}>
              <button
                onClick={saveInvoice}
                disabled={isSaving() || !form().invoice.trim() || !form().shipper_consignee.name.trim() || Math.round(paymentBalance()) > 0.01}
                style={{ 
                  ...styles.button, 
                  ...styles.primaryButton,
                  width: '100%',
                  'justify-content': 'center',
                  padding: '0.875rem',
                  'font-size': '1rem',
                  opacity: (isSaving() || !form().invoice.trim() || !form().shipper_consignee.name.trim() || Math.round(paymentBalance()) > 0.01) ? '0.6' : '1'
                }}
                title={!form().invoice.trim() ? 'Por favor ingrese un numero de factura' : !form().shipper_consignee.name.trim() ? 'Por favor ingrese el nombre del cliente' : Math.abs(paymentBalance()) > 0.01 ? `El balance de pago debe ser $0.00 (actual: $${paymentBalance().toFixed(2)})` : 'Crear esta factura'}
              >
                {isSaving() ? '⏳ Creando Factura...' : '💾 Crear Factura'}
              </button>
            </Show>

            <Show when={createdInvoice()}>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.75rem' }}>
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF()}
                  style={{ 
                    ...styles.button, 
                    ...styles.successButton,
                    'justify-content': 'center',
                    opacity: isGeneratingPDF() ? '0.6' : '1'
                  }}
                >
                  {isGeneratingPDF() ? '⏳ Generando...' : '📄 Generar PDF'}
                </button>
                
                <button
                  onClick={confirmReset}
                  style={{ 
                    ...styles.button, 
                    ...styles.secondaryButton,
                    'justify-content': 'center'
                  }}
                >
                  🆕 Nueva Factura
                </button>
              </div>
            </Show>
            
         
          </Show>
        </div>
        
      </div>
    </div>
  );
};




// background: var(--text-secondary);




const ReservaInvoice: Component<any> = (props) => {
  let {reserva, updateReserva, removeReserva} = props;

  return (
    <div style={styles.productWrapItem}>
      <div style={{ ...styles.productItem, "justify-content": 'space-around' }}>
        <RemesaTypeDropdown
          value={reserva.type}
          onChange={(value) => updateReserva(reserva.id, 'type', value)}
          placeholder="ej., Ropa, Zapatos, TV, Utiles del Hogar..."
          width="80%"
          index={1}
        />

         <button
          onClick={() => removeReserva(reserva.id)}
          style={styles.removeButton}
        >
          ×
        </button>
      </div>
     

    
      <div style={styles.productItem}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Cant (lbs)</label>
          <InputOnFor
            type="number"
            value={reserva.qty}
            update={(value) => updateReserva(reserva.id, 'qty', parseFloat(value) || 0)}
            style={{ ...styles.input, ...styles.smallInput, width: '60px' }}
            placeholder="Cant"
            min="1"
            step="0.01"
            index={2}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Precio</label>
          <InputOnFor
            type="number"
            value={reserva.price}
            update={(value) => updateReserva(reserva.id, 'price', parseFloat(value) || 0)}
            style={{ ...styles.input, ...styles.smallInput }}
            placeholder="Precio"
            step="0.01"
            index={3}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Arancel</label>
          <InputOnFor
            type="number"
            value={reserva.arancel}
            update={(value) => updateReserva(reserva.id, 'arancel', parseFloat(value) || 0)}
            style={{ ...styles.input, ...styles.smallInput }}
            placeholder="Arancel"
            step="0.01"
            index={4}
          />
        </div>
        
        <div style={{ width: '80px', 'text-align': 'right', 'font-weight': '500' }}>
          ${reserva.total?.toFixed(2) || '0.00'}
          <Show when={import.meta.env.DEV}>
            <div style={{ 'font-size': '0.6rem', color: 'var(--text-muted)' }}>
              ({reserva.qty}×{reserva.price}+{reserva.arancel})
            </div>
          </Show>
        </div>
        
       
      </div>
    </div>
  )
}





const ProductsInvoice: Component<any> = (props) => {

  let {product, updateProduct, removeProduct} = props;

  
  return (
    <div style={styles.productWrapItem}>

      <div style={styles.productItem}>
        <div style={{ flex: '1' }}>
          <div style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>{product?.product.label}</div>
          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>{product?.product.code}</div>
        </div>
        <button
          onClick={() => removeProduct(product?.id)}
          style={styles.removeButton}
        >
          ×
        </button>
      </div>
      <div style={styles.productItem}>
        
        <InputOnFor
          type={"number"}
          value={product?.qty}
          placeholder="Cant"
          update={(e: string) => updateProduct(product?.id, 'qty', parseFloat(e) || 0)}
        />
        <InputOnFor
          type={"number"}
          value={product?.salePrice}
          placeholder="Precio"
          update={(e: string) => updateProduct(product?.id, 'salePrice', parseFloat(e) || 0)}
        />

        <div style={{ width: '80px', 'text-align': 'right', 'font-weight': '500' }}>
          ${product?.total.toFixed(2)}
        </div>
        
       
      </div>
    </div>
  )
}




const InputOnFor: Component<any> = (props) => {
  const [val, setVal] = createSignal("");

  // Update local value when props.value changes
  onMount(() => {
    if (props?.value !== undefined) {
      setVal(props.value.toString());
    }
  });

  const updateValue = (newValue: string) => {
    // setVal(newValue);
    // Update immediately for real-time calculation
    if (props.update) {
    //  props.update(newValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Handle Enter, Escape, and Tab for final update
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
      if (props.update && isNotEmpty(val())) {
        props.update(val());
      }
    }
  };

  const handleBlur = () => {
    // Final update on blur
    if (props.update && isNotEmpty(val())) {
      props.update(val());
    }
  };

  return (
    <input
      type={props?.type}
      value={val()}
      onInput={(e) => setVal(e.target.value)}
      style={{ ...styles.input, ...styles.smallInput, width: props?.width || '90px' }}
      step="0.01"
      placeholder={props.placeholder}
      title={props.title}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      tabindex={props?.index}
    />
  )
}








// RemesaTypeDropdown Component
const RemesaTypeDropdown: Component<any> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  const filteredTypes = () => {
    const term = searchTerm().toLowerCase();
    if (!term) return REMESA_TYPES;
    
    const filtered = REMESA_TYPES.filter(type => 
      type.toLowerCase().includes(term)
    );
    
    // If no matches found and user is typing, show option to add custom type
    if (filtered.length === 0 && term.length > 0) {
      return [`✏️ Agregar "${searchTerm()}"`];
    }
    
    return filtered;
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
    setIsOpen(value.length > 0); // Show dropdown when typing
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
        } else {
          // Accept the current input value as custom entry
          props.onChange(searchTerm() || props.value);
          setIsOpen(false);
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
      // Accept the current input value as custom entry if user was typing
      if (searchTerm() && searchTerm() !== props.value) {
        props.onChange(searchTerm());
      }
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

  const containerStyle = {
    position: 'relative' as const,
    width: props.width || '100%',
    flex: props.width ? undefined : '1'
  };

  const inputStyle = {
    ...styles.input,
    width: '100%',
    'padding-right': '2rem'
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
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    background: isHighlighted ? 'var(--strip-color)' : 'transparent',
    color: isHighlighted ? 'var(--primary-color)' : 'var(--text-primary)',
    transition: 'all 0.2s ease',
    'font-size': '0.875rem'
  });

  const dropdownIconStyle = {
    position: 'absolute' as const,
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    'pointer-events': 'none',
    color: 'var(--text-muted)',
    'font-size': '0.75rem'
  };

  return (
    <div style={containerStyle}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          style={inputStyle}
          value={displayValue()}
          onInput={handleInputChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={props.placeholder}
          autocomplete="off"
          tabindex={props?.index}
        />
        <div style={dropdownIconStyle}>
          {isOpen() ? '▲' : '▼'}
        </div>
      </div>
      
      <Show when={isOpen() && filteredTypes().length > 0}>
        <div style={dropdownStyle}>
          <For each={filteredTypes()}>
            {(type, index) => {
              const isCustomOption = type.startsWith('✏️ Agregar');
              return (
                <div
                  style={{
                    ...itemStyle(index() === focusedIndex()),
                    ...(isCustomOption && {
                      'font-style': 'italic',
                      'border-left': '3px solid var(--primary-color)',
                      'background': index() === focusedIndex() ? 'var(--primary-color)' : '#f0f8ff',
                      'color': index() === focusedIndex() ? 'white' : 'var(--primary-color)'
                    })
                  }}
                  onClick={() => handleTypeSelect(type)}
                  onMouseEnter={() => setFocusedIndex(index())}
                >
                  {type}
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};





/*

{
    "invoice": "YY_8803-20250802-6514",
    "description": "",
    "store": "BISSONNET",
    "shipper_consignee": {
        "name": "HECTOR FELIX RICARDO MIRANDA",
        "firstName": "ADIS",
        "middleName": "",
        "lastName": "MAILIN LABOUT",
        "lastName2": "",
        "phoneNumber": "55948765",
        "cid": "02012581719",
        "passport": "",
        "address": "Calle 19 # 2 ALTOS / 10 y CAMILO CIENFUEGOS, Rpto RODOLFO RODRIGUEZ, CONTRAMAESTRE, SANTIAGO DE CUBA",
        "phoneNumberS": "5023892075",
        "dob": "2024-09-28"
    },
    "products": [
        {
            "id": "1754176597417",
            "product": {
                "id": "AjlXorLU63dtPDrm",
                "code": "K89G06815",
                "label": "SAZON COMPLETO BADIA 7 OZ",
                "price": 0
            },
            "qty": 1,
            "salePrice": 8,
            "total": 8
        }
    ],
    "reservas": [
        {
            "id": "1754176571785",
            "type": "Utiles del Hogar",
            "qty": 14,
            "price": 4.5,
            "arancel": 15,
            "total": 78
        }
    ],
    "packagesOrder": false,
    "shippingMethod": "aereo",
    "paymentMethods": {
        "taxOnTotal": false,
        "taxPercent": 7,
        "exemptTaxOnCash": true,
        "cash": 80,
        "zelle": 6,
        "creditCard": 0
    },
    "type": "SALES",
    "ssg_inventory_key": "INVOICE-1754176953734",
    "ssg_sorder_key": "SO-1754176953734",
    "createDate": 1754176953734,
    "businessId": "YB100423253156428",
    "isCompleted": true,
    "productSubtotal": 8,
    "reservaSubtotal": 78,
    "subtotalBeforeTax": 86,
    "taxAmount": 0.4200000000000001,
    "taxSavings": 5.6000000000000005,
    "total": 86.42,
    "taxCalculationMethod": "subtotal",
    "cashPaymentRatio": 0.9302325581395349
}

*/

// Service Invoice Component
const ServiceInvoice: Component<any> = (props) => {
  let {service, updateService, removeService} = props;

  return (
    <div style={styles.productWrapItem}>
      <div style={{ ...styles.productItem, "justify-content": 'space-around' }}>
        <ServiceTypeDropdown
          value={service.type}
          onChange={(value) => updateService(service.id, 'type', value)}
          placeholder="Seleccionar tipo de servicio..."
          width="80%"
          index={1}
        />

        <button
          onClick={() => removeService(service.id)}
          style={styles.removeButton}
        >
          ×
        </button>
      </div>
      
      <div style={styles.productItem}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Cantidad</label>
          <InputOnFor
            type="number"
            value={service.qty}
            update={(value) => updateService(service.id, 'qty', parseFloat(value) || 0)}
            style={{ ...styles.input, ...styles.smallInput, width: '60px' }}
            placeholder="Cant"
            step="1"
            min="0"
            index={2}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Precio/Cargo</label>
          <InputOnFor
            type="number"
            value={service.arancel}
            update={(value) => updateService(service.id, 'arancel', parseFloat(value) || 0)}
            style={{ ...styles.input, ...styles.smallInput }}
            placeholder="Precio"
            step="0.01"
            index={3}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Total</label>
          <input
            type="text"
            value={`$${service.total.toFixed(2)}`}
            style={{ ...styles.input, ...styles.smallInput, background: 'var(--strip-color)' }}
            disabled
          />
        </div>
      </div>
    </div>
  );
};



// Service Type Dropdown Component
const ServiceTypeDropdown: Component<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string;
  index?: number;
}> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  const filteredTypes = () => {
    const term = searchTerm().toLowerCase();
    if (!term) return SERVICE_TYPES;
    
    return SERVICE_TYPES.filter(type => 
      type.toLowerCase().includes(term)
    );
  };

  const handleInputChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setSearchTerm(value);
    setIsOpen(true);
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
  };

  const handleSelect = (type: string) => {
    props.onChange(type);
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
        if (focusedIndex() >= 0 && focusedIndex() < types.length) {
          handleSelect(types[focusedIndex()]);
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

  const displayValue = () => {
    if (isOpen() && searchTerm()) {
      return searchTerm();
    }
    return props.value || '';
  };

  const containerStyle = {
    position: 'relative' as const,
    width: props.width || '100%',
    flex: props.width ? undefined : '1'
  };

  const inputStyle = {
    ...styles.input,
    width: '100%',
    'padding-right': '2rem'
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
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    background: isHighlighted ? 'var(--strip-color)' : 'transparent',
    color: isHighlighted ? 'var(--primary-color)' : 'var(--text-primary)',
    transition: 'all 0.2s ease',
    'font-size': '0.875rem'
  });

  const dropdownIconStyle = {
    position: 'absolute' as const,
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    'pointer-events': 'none',
    color: 'var(--text-muted)',
    'font-size': '0.75rem'
  };

  return (
    <div style={containerStyle}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          style={inputStyle}
          value={displayValue()}
          onInput={handleInputChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={props.placeholder}
          autocomplete="off"
          tabindex={props?.index}
        />
        <div style={dropdownIconStyle}>
          {isOpen() ? '▲' : '▼'}
        </div>
      </div>
      
      <Show when={isOpen() && filteredTypes().length > 0}>
        <div style={dropdownStyle}>
          <For each={filteredTypes()}>
            {(type, index) => {
              const isHighlighted = index() === focusedIndex();
              return (
                <div 
                  style={itemStyle(isHighlighted)}
                  onMouseDown={() => handleSelect(type)}
                  onMouseEnter={() => setFocusedIndex(index())}
                >
                  {type}
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};
