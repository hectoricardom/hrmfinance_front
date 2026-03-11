/**
 * YabaInvoiceCreator Component
 * Main standalone YABA Global Express invoice creator
 * SolidJS with inline styles
 */

import { Component, createSignal, createMemo, Show } from 'solid-js';
import YabaClientSection from './YabaClientSection';
import YabaItemGrid from './YabaItemGrid';
import YabaInvoiceSummary, { SelectedItem, ShippingInfo } from './YabaInvoiceSummary';
import { YABA_GLOBAL_CONFIG, YABA_LOCATIONS, TariffItem } from '../config/yabaGlobalTariffs';
import invoiceStore from '../stores/invoiceStore';

// ============================================
// TYPES
// ============================================

interface ClientInfo {
  name: string;
  phone?: string;
  id?: string;
  address?: string;
}

interface GeneratedInvoice {
  invoiceNumber: string;
  date: Date;
  sender: ClientInfo;
  recipient: ClientInfo;
  items: SelectedItem[];
  shipping: ShippingInfo;
  totals: {
    itemsSubtotal: number;
    shippingCost: number;
    grandTotal: number;
  };
}

// ============================================
// CSS VARIABLES
// ============================================

const cssVariables = `
  :root {
    --yaba-primary: #2563eb;
    --yaba-primary-hover: #1d4ed8;
    --yaba-secondary: #fbbf24;
    --yaba-secondary-hover: #f59e0b;
    --yaba-bg: #f8fafc;
    --yaba-surface: #ffffff;
    --yaba-border: #e2e8f0;
    --yaba-text: #1e293b;
    --yaba-text-muted: #64748b;
    --yaba-success: #22c55e;
    --yaba-danger: #ef4444;
    --yaba-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --yaba-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --yaba-radius: 12px;
    --yaba-radius-sm: 8px;
  }
`;

// ============================================
// STYLES
// ============================================

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: 'var(--yaba-bg, #f8fafc)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '2rem',
  } as const,

  header: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
    color: '#ffffff',
    padding: '1.5rem 2rem',
    boxShadow: 'var(--yaba-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
    position: 'relative' as const,
    overflow: 'hidden',
  } as const,

  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative' as const,
    zIndex: 1,
  } as const,

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  } as const,

  logo: {
    display: 'flex',
    flexDirection: 'column' as const,
  } as const,

  logoMain: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '2px',
    lineHeight: 1,
  } as const,

  logoSub: {
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '1px',
    opacity: 0.9,
    marginTop: '0.25rem',
  } as const,

  headerAccent: {
    width: '4px',
    height: '50px',
    backgroundColor: '#fbbf24',
    borderRadius: '2px',
  } as const,

  headerRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '0.5rem',
  } as const,

  coverageText: {
    fontSize: '0.875rem',
    opacity: 0.9,
    maxWidth: '300px',
    textAlign: 'right' as const,
    lineHeight: 1.4,
  } as const,

  locationsList: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.75rem',
    opacity: 0.85,
  } as const,

  locationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '0.375rem 0.75rem',
    borderRadius: '20px',
  } as const,

  headerPattern: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    width: '40%',
    height: '100%',
    background: 'radial-gradient(circle at 70% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 60%)',
    pointerEvents: 'none' as const,
  } as const,

  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem',
    paddingRight: 'calc(400px + 2rem)',
  } as const,

  section: {
    backgroundColor: 'var(--yaba-surface, #ffffff)',
    borderRadius: 'var(--yaba-radius, 12px)',
    boxShadow: 'var(--yaba-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
    border: '1px solid var(--yaba-border, #e2e8f0)',
    overflow: 'hidden',
  } as const,

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--yaba-border, #e2e8f0)',
    backgroundColor: 'var(--yaba-bg, #f8fafc)',
  } as const,

  sectionIcon: {
    fontSize: '1.25rem',
  } as const,

  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--yaba-text, #1e293b)',
    margin: 0,
  } as const,

  sectionContent: {
    padding: '1.5rem',
  } as const,

  successOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease',
  } as const,

  successModal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    textAlign: 'center' as const,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    animation: 'slideUp 0.3s ease',
  } as const,

  successIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  } as const,

  successTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.5rem',
  } as const,

  successInvoiceNumber: {
    fontSize: '1.125rem',
    color: '#2563eb',
    fontWeight: 600,
    marginBottom: '1rem',
  } as const,

  successDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem',
    textAlign: 'left' as const,
  } as const,

  successDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.875rem',
  } as const,

  successDetailLabel: {
    color: '#64748b',
  } as const,

  successDetailValue: {
    fontWeight: 500,
    color: '#1e293b',
  } as const,

  successActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  } as const,

  btnPrimary: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as const,

  btnSecondary: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as const,

  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '1rem',
    color: '#dc2626',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  } as const,

  loadingOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  } as const,

  loadingSpinner: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  } as const,

  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } as const,

  loadingText: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: 500,
  } as const,
};

// ============================================
// KEYFRAMES (injected via style tag)
// ============================================

const keyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1200px) {
    .yaba-main-content {
      padding-right: 2rem !important;
    }
    .yaba-summary-sidebar {
      position: relative !important;
      bottom: auto !important;
      right: auto !important;
      width: 100% !important;
      max-height: none !important;
    }
  }

  @media (max-width: 768px) {
    .yaba-header-content {
      flex-direction: column !important;
      gap: 1rem !important;
      text-align: center !important;
    }
    .yaba-header-right {
      align-items: center !important;
    }
    .yaba-coverage-text {
      text-align: center !important;
    }
    .yaba-locations-list {
      flex-wrap: wrap !important;
      justify-content: center !important;
    }
  }
`;

// ============================================
// COMPONENT
// ============================================

const YabaInvoiceCreator: Component = () => {
  // State
  const [sender, setSender] = createSignal<ClientInfo>({ name: '' });
  const [recipient, setRecipient] = createSignal<ClientInfo>({ name: '' });
  const [selectedItems, setSelectedItems] = createSignal<SelectedItem[]>([]);
  const [shipping, setShipping] = createSignal<ShippingInfo>({ method: 'air', weight: 0 });
  const [invoiceNumber, setInvoiceNumber] = createSignal('');
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [generatedInvoice, setGeneratedInvoice] = createSignal<GeneratedInvoice | null>(null);
  const [validationError, setValidationError] = createSignal<string | null>(null);

  // Generate unique invoice number
  const generateInvoiceNumber = (): string => {
    const prefix = 'YBX';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  // Calculate totals
  const calculateTotals = createMemo(() => {
    const items = selectedItems();
    const shippingInfo = shipping();

    // Items subtotal
    const itemsSubtotal = items.reduce((sum, item) => {
      const price = item.item.price ?? 0;
      return sum + price * item.qty;
    }, 0);

    // Shipping cost calculation (simplified - detailed calc in YabaInvoiceSummary)
    let shippingCost = 0;
    if (shippingInfo.weight > 0) {
      if (shippingInfo.method === 'air') {
        // Air shipping tiers
        if (shippingInfo.weight <= 50) {
          shippingCost = shippingInfo.weight * 3.50;
        } else if (shippingInfo.weight <= 70) {
          shippingCost = shippingInfo.weight * 2.99;
        } else {
          shippingCost = shippingInfo.weight * 2.49;
          // Apply promotion for 86+ lbs
          if (shippingInfo.weight > 86) {
            shippingCost = (shippingInfo.weight - 10) * 2.49;
          }
        }
      } else {
        // Maritime shipping
        const rate = shippingInfo.maritimeDeparture === 'weekly'
          ? (shippingInfo.maritimeType === 'durable' ? 2.00 : 1.70)
          : (shippingInfo.maritimeType === 'durable' ? 1.70 : 1.35);
        shippingCost = shippingInfo.weight * rate;
        // Apply weekly promo
        if (shippingInfo.maritimeDeparture === 'weekly' && shippingInfo.weight > 50) {
          shippingCost = (shippingInfo.weight - 10) * rate;
        }
      }
    }

    const grandTotal = itemsSubtotal + shippingCost;

    return {
      itemsSubtotal,
      shippingCost,
      grandTotal,
    };
  });

  // Handle items change from grid
  const handleItemsChange = (items: Array<{ item: TariffItem; qty: number; categoryIcon: string }>) => {
    setSelectedItems(items);
    setValidationError(null);
  };

  // Handle shipping change
  const handleShippingChange = (newShipping: ShippingInfo) => {
    setShipping(newShipping);
    setValidationError(null);
  };

  // Remove item from selection
  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.item.id !== itemId));
  };

  // Clear all data
  const handleClear = () => {
    setSender({ name: '' });
    setRecipient({ name: '' });
    setSelectedItems([]);
    setShipping({ method: 'air', weight: 0 });
    setInvoiceNumber('');
    setValidationError(null);
    setGeneratedInvoice(null);
  };

  // Generate invoice
  const handleGenerateInvoice = async () => {
    // Validate sender and recipient names
    if (!sender().name.trim()) {
      setValidationError('Por favor ingrese el nombre del remitente');
      return;
    }

    if (!recipient().name.trim()) {
      setValidationError('Por favor ingrese el nombre del destinatario');
      return;
    }

    // Validate that there's something to invoice
    if (selectedItems().length === 0 && shipping().weight <= 0) {
      setValidationError('Por favor agregue articulos o peso de envio');
      return;
    }

    setIsGenerating(true);
    setValidationError(null);

    try {
      const newInvoiceNumber = generateInvoiceNumber();
      const totals = calculateTotals();

      // Prepare invoice data for store
      const invoiceData = {
        type: 'INTERNATIONAL_SHIPPING',
        invoice: newInvoiceNumber,
        description: `YABA Global Express - Envio a Cuba`,
        store: 'YABA',
        createDate: Date.now(),
        shipper_consignee: {
          name: recipient().name,
          phoneNumberS: sender().phone || '',
          firstName: sender().name.split(' ')[0] || '',
          lastName: sender().name.split(' ').slice(1).join(' ') || '',
          phoneNumber: recipient().phone || '',
          cid: recipient().id || '',
          ybstreetNo: '',
          ybstreet: recipient().address || '',
          ybcity: '',
          ybestate: '',
          comment: `Remitente: ${sender().name}${sender().phone ? ` - Tel: ${sender().phone}` : ''}`,
        },
        reservas: [
          // Add shipping as a reserva if weight > 0
          ...(shipping().weight > 0 ? [{
            type: shipping().method === 'air' ? 'ENVIO AEREO' : 'ENVIO MARITIMO',
            qty: shipping().weight.toString(),
            arancel: '0',
            price: (totals.shippingCost / shipping().weight).toFixed(2),
            key: `ship-${Date.now()}`,
            total: totals.shippingCost,
          }] : []),
          // Add selected items as reservas
          ...selectedItems().map((item) => ({
            type: item.item.nameEs,
            qty: item.qty.toString(),
            arancel: (item.item.price ?? 0).toString(),
            price: (item.item.price ?? 0).toString(),
            key: item.item.id,
            total: (item.item.price ?? 0) * item.qty,
          })),
        ],
        products: [],
        isCompleted: true,
        shippingType: shipping().method === 'air' ? 'AEREO' : 'SEA',
      };

      // Create invoice using store
      await invoiceStore.createInvoice(invoiceData);

      // Create generated invoice object for success modal
      const invoice: GeneratedInvoice = {
        invoiceNumber: newInvoiceNumber,
        date: new Date(),
        sender: sender(),
        recipient: recipient(),
        items: selectedItems(),
        shipping: shipping(),
        totals,
      };

      setInvoiceNumber(newInvoiceNumber);
      setGeneratedInvoice(invoice);
    } catch (error) {
      console.error('Error generating invoice:', error);
      setValidationError('Error al generar la factura. Por favor intente de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Close success modal and start new invoice
  const handleNewInvoice = () => {
    handleClear();
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <>
      {/* Inject CSS variables and keyframes */}
      <style>{cssVariables}</style>
      <style>{keyframes}</style>

      <div style={styles.pageContainer}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerPattern} />
          <div class="yaba-header-content" style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.headerAccent} />
              <div style={styles.logo}>
                <span style={styles.logoMain}>{YABA_GLOBAL_CONFIG.company.split(' ')[0]}</span>
                <span style={styles.logoSub}>
                  {YABA_GLOBAL_CONFIG.company.split(' ').slice(1).join(' ')}
                </span>
              </div>
            </div>

            <div class="yaba-header-right" style={styles.headerRight}>
              <div class="yaba-coverage-text" style={styles.coverageText}>
                {YABA_GLOBAL_CONFIG.coverage}
              </div>
              <div class="yaba-locations-list" style={styles.locationsList}>
                {YABA_LOCATIONS.map((location) => (
                  <div style={styles.locationItem}>
                    <span>{location.city}</span>
                    <span style={{ opacity: 0.7 }}>|</span>
                    <span>{location.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main class="yaba-main-content" style={styles.mainContent}>
          {/* Validation Error */}
          <Show when={validationError()}>
            <div style={styles.errorMessage}>
              <span>!</span>
              <span>{validationError()}</span>
            </div>
          </Show>

          {/* Client Section */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>Informacion del Cliente</span>
              <h2 style={styles.sectionTitle}>Remitente y Destinatario</h2>
            </div>
            <div style={styles.sectionContent}>
              <YabaClientSection
                sender={sender()}
                recipient={recipient()}
                onSenderChange={setSender}
                onRecipientChange={setRecipient}
              />
            </div>
          </section>

          {/* Items Section */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>Seleccionar Articulos</span>
              <h2 style={styles.sectionTitle}>Tarifas de Articulos</h2>
            </div>
            <div style={styles.sectionContent}>
              <YabaItemGrid
                onItemsChange={handleItemsChange}
                selectedItems={selectedItems().map((item) => ({
                  item: item.item,
                  qty: item.qty,
                }))}
              />
            </div>
          </section>
        </main>

        {/* Summary Sidebar */}
        <YabaInvoiceSummary
          items={selectedItems()}
          shipping={shipping()}
          onShippingChange={handleShippingChange}
          onGenerateInvoice={handleGenerateInvoice}
          onClear={handleClear}
          onRemoveItem={handleRemoveItem}
        />

        {/* Loading Overlay */}
        <Show when={isGenerating()}>
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Generando factura...</span>
            </div>
          </div>
        </Show>

        {/* Success Modal */}
        <Show when={generatedInvoice()}>
          <div style={styles.successOverlay}>
            <div style={styles.successModal}>
              <div style={styles.successIcon}>Completado</div>
              <h2 style={styles.successTitle}>Factura Creada!</h2>
              <p style={styles.successInvoiceNumber}>
                {generatedInvoice()?.invoiceNumber}
              </p>

              <div style={styles.successDetails}>
                <div style={styles.successDetailRow}>
                  <span style={styles.successDetailLabel}>Remitente:</span>
                  <span style={styles.successDetailValue}>{generatedInvoice()?.sender.name}</span>
                </div>
                <div style={styles.successDetailRow}>
                  <span style={styles.successDetailLabel}>Destinatario:</span>
                  <span style={styles.successDetailValue}>{generatedInvoice()?.recipient.name}</span>
                </div>
                <div style={styles.successDetailRow}>
                  <span style={styles.successDetailLabel}>Articulos:</span>
                  <span style={styles.successDetailValue}>
                    {generatedInvoice()?.items.length || 0} items
                  </span>
                </div>
                <div style={styles.successDetailRow}>
                  <span style={styles.successDetailLabel}>Metodo de Envio:</span>
                  <span style={styles.successDetailValue}>
                    {generatedInvoice()?.shipping.method === 'air' ? 'Aereo' : 'Maritimo'}
                  </span>
                </div>
                <div style={{ ...styles.successDetailRow, borderBottom: 'none' }}>
                  <span style={styles.successDetailLabel}>Total:</span>
                  <span style={{ ...styles.successDetailValue, color: '#2563eb', fontSize: '1.125rem' }}>
                    {formatCurrency(generatedInvoice()?.totals.grandTotal || 0)}
                  </span>
                </div>
              </div>

              <div style={styles.successActions}>
                <button
                  style={styles.btnPrimary}
                  onClick={handleNewInvoice}
                >
                  Nueva Factura
                </button>
                <button
                  style={styles.btnSecondary}
                  onClick={() => setGeneratedInvoice(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </>
  );
};

export default YabaInvoiceCreator;
export { YabaInvoiceCreator };
