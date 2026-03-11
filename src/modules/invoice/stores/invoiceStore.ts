import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import { inventoryApi } from '../../../services/apiAdapter';
import { convertObj2Array, devLog, fetchGraphQL, fetchGraphQLSS, generateRandomId } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { processInvoiceCompleted } from '../../accounts/services/automationService';
import { invoiceEventIntegration } from '../../events/integrations/invoiceIntegration';
import { logger } from '../../../utils/logger';

// Types
export interface InvoiceProduct {
  product: {
    id: string;
    label: string;
    code: string;
  };
  qty: number;
  price: number;
  salePrice: string;
}

export interface InvoiceReserva {
  type: string;
  qty: string;
  arancel: string;
  price: string;
  key: string;
  onlyTarrif?: boolean;
}

export interface ShipperConsignee {
  name: string;
  phoneNumberS: string;
  dob: string;
  firstName: string;
  lastName: string;
  lastName2: string;
  middleName: string;
  email: string;
  phoneNumber: string;
  altPhoneNumber: string;
  cid: string;
  ybstreetNo: string;
  ybstreet: string;
  ybbetwen1: string;
  ybbetwen2: string;
  ybapt: string;
  ybreparto: string;
  consigneeId: string;
  ssg_consignee_key: string;
  passport: string;
  nacionality: string;
  ybcity: string;
  ybestate: string;
  comment: string;
}

export interface Invoice {
  type: string;
  invoice: string;
  description: string;
  store: string;
  ssg_inventory_key: string;
  ssg_sorder_key: string;
  createDate: number;
  shipper_consignee: ShipperConsignee;
  packagesOrder: boolean;
  businessId: string;
  userId: string;
  reservas: InvoiceReserva[];
  products: InvoiceProduct[];
  isCompleted: boolean;
  shippingType?: 'SEA' | 'AEREO'; // New field for shipping type
}

// Store state
const [invoiceState, setInvoiceState] = createStore({
  invoices: [] as Invoice[],
  selectedInvoice: null as Invoice | null,
  loading: false,
  error: null as string | null,
  lastUpdated: null as Date | null
});

// Loading states for different operations
const [loadingStates, setLoadingStates] = createSignal({
  fetchAll: false,
  fetchById: false,
  create: false,
  update: false,
  delete: false,
  generatePDF: false
});

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';



// Store actions
export const invoiceStore = {
  // Getters
  get state() {
    return invoiceState;
  },

  get loadingStates() {
    return loadingStates();
  },

  // Get all invoices
  async fetchInvoices(filters?: {
    store?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    status?: 'completed' | 'pending' | 'all';
    type?: 'SALES' | 'INTERNATIONAL_SHIPPING'
  }) {
    try {

      setLoadingStates(prev => ({ ...prev, fetchAll: true }));
      setInvoiceState('loading', true);
      setInvoiceState('error', null);

      // Build query parameters
      let params = ""


      if (filters?.type) {
        params += " " + filters.type;
      }

      if (filters?.search) {
        params += " " + filters.search;
      }


      if (filters?.store && filters.store !== 'all') {
        params += " " + filters.store;
      }
      else {
        if (!authStore.state?.profile?.isAdmin) {
          params += " " + generateRandomId(64);
          setInvoiceState('invoices', []);
          setInvoiceState('lastUpdated', new Date());
          return []
        }
      }


      if (filters?.status && filters.status !== 'all') {
        params += " " + filters.status;
      }

      const queryString = params.toString();



      // const endpoint = `/invoices${queryString ? `?${queryString}` : ''}`;


      const apiResults: any = await inventoryApi.getInvoice(queryString);




      const pDt = (d: any) => {
        let dt = JSON.parse(d._rawData || d.data);
        return { id: d.id, ...dt }
      }

      //

      let data: Invoice[] = []
      if (filters?.dateFrom && filters?.dateTo) {
        // params += " "+filters.dateTo;

        let ffA: Invoice[] = []

        const comp = (d: any, d2: any) => {
          let a = new Date(d.createDate).getTime();
          let b = new Date(d2.createDate).getTime();
          return Math.abs(b) - Math.abs(a)
        }

        const compareDates = (itm: any) => {

          //let dt = JSON.parse( d._rawData || d.data);
          //let itm = {id: d.id, ...dt};

          let invDate = new Date(itm?.createDate || itm?.createdAt).getTime();

          let startDate = new Date(filters?.dateFrom as string).getTime();
          let endDate = new Date(filters?.dateTo as string).getTime();

          devLog(invDate, new Date(itm?.createDate || itm?.createdAt))
          if (invDate >= startDate && invDate <= endDate) {
            ffA.push(itm)
          }

        }

        apiResults.map(compareDates)
        const sortedResults = ffA.sort((a, b) => comp(a, b));


        data = sortedResults as Invoice[];


      }
      else {


        const comp = (d: any, d2: any) => {
          let a = new Date(d.createDate).getTime();
          let b = new Date(d2.createDate).getTime();
          return Math.abs(b) - Math.abs(a)
        }

        // Convert to array and sort
        const sortedResults = apiResults.sort((a, b) => comp(a, b));


        data = sortedResults as Invoice[];
      }



      // Ensure data is an array
      let invoices = Array.isArray(data) ? data : data || [];

      // Sort invoices by createDate in descending order (newest first)
      invoices = invoices.sort((a, b) => {
        const dateA = a.createDate || 0;
        const dateB = b.createDate || 0;
        return dateB - dateA; // Descending order
      });

      devLog('invoices', invoices)
      setInvoiceState('invoices', invoices as Invoice[]);
      setInvoiceState('lastUpdated', new Date());

      return invoices;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invoices';
      setInvoiceState('error', errorMessage);
      console.error('Error fetching invoices:', error);
      throw error;
    } finally {
      setInvoiceState('loading', false);
      setLoadingStates(prev => ({ ...prev, fetchAll: false }));
    }
  },

  fecthInventory: async (query: string): Promise<any> => {




    //inventoryStore.updMovements(preparingMov);

  },

  // Get invoice by ID
  async fetchInvoiceById(invoiceId: string) {
    try {
      setLoadingStates(prev => ({ ...prev, fetchById: true }));
      setInvoiceState('error', null);

      const apiResults: Invoice[] = await inventoryApi.getInvoice(invoiceId);
      const data = convertObj2Array(apiResults);
      setInvoiceState('selectedInvoice', data[0]);

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invoice';
      setInvoiceState('error', errorMessage);
      console.error('Error fetching invoice:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, fetchById: false }));
    }
  },

  // Create new invoice
  async createInvoice(invoiceData: any) {
    try {
      setLoadingStates(prev => ({ ...prev, create: true }));
      setInvoiceState('error', null);

      // Create the complete invoice object
      const invoice: Invoice = {
        type: invoiceData.type || 'SALES',
        invoice: invoiceData.invoice,
        description: invoiceData.description || '',
        store: invoiceData.store || '',
        ssg_inventory_key: invoiceData.ssg_inventory_key || `INV-${Date.now()}`,
        ssg_sorder_key: invoiceData.ssg_sorder_key || `SO-${Date.now()}`,
        createDate: invoiceData.createDate || Date.now(),
        shipper_consignee: invoiceData.shipper_consignee,
        packagesOrder: invoiceData.packagesOrder || false,
        businessId: invoiceData.businessId || 'YB100423253156428',
        userId: invoiceData.userId || 'current-user',
        reservas: invoiceData.reservas || [],
        products: invoiceData.products || [],
        isCompleted: invoiceData.isCompleted || true
      };

      // Add calculated totals if not provided
      if (invoice?.products && invoice?.products?.length > 0) {
        invoice.productSubtotal = invoice.products.reduce((sum, product) => sum + (product.qty * product.salePrice), 0);
      }

      if (invoice?.reservas && invoice?.reservas?.length > 0) {
        invoice.reservaSubtotal = invoice.reservas.reduce((sum, reserva) => sum + reserva.total, 0);
      }

      invoice.total = (invoice?.productSubtotal || 0) + (invoice?.reservaSubtotal || 0);

      // Here you would typically save to your backend API
      // For now, we'll add to local state

      // Add to local state
      setInvoiceState('invoices', prev => [invoice, ...prev]);
      setInvoiceState('lastUpdated', new Date());

      // Trigger automated journal entry creation if invoice is completed
      if (invoice.isCompleted) {
        try {
          // Legacy automation
          await processInvoiceCompleted(invoice);

          // New Event System
          await invoiceEventIntegration.onInvoiceCompleted(invoice);

          devLog('Automated journal entries processed for invoice:', invoice.invoice);
        } catch (automationError) {
          console.error('Error processing automated journal entries:', automationError);
          // Don't fail the invoice creation if automation fails
        }
      }

      // Emit creation event always
      await invoiceEventIntegration.onInvoiceCreated(invoice);

      return invoice;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice';
      setInvoiceState('error', errorMessage);
      console.error('Error creating invoice:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, create: false }));
    }
  },

  // Generate invoice PDF
  async generateInvoicePDF(invoiceId: string, style: 'classic' | 'modern' | 'compact' = 'compact', language: 'en' | 'es' = 'es') {
    try {
      setLoadingStates(prev => ({ ...prev, generatePDF: true }));
      setInvoiceState('error', null);

      // Find the invoice
      const invoice = invoiceState.invoices.find(inv => inv.invoice === invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Import the appropriate PDF generator
      let generatePDF;
      switch (style) {
        case 'compact':
          const { generateCompactModernInvoicePDF } = await import('../../../utils/compactModernInvoicePdfGenerator');
          generatePDF = generateCompactModernInvoicePDF;
          break;
        case 'modern':
          const { generateModernMovementInvoicePDF } = await import('../../../utils/modernMovementInvoicePdfGenerator');
          generatePDF = generateModernMovementInvoicePDF;
          break;
        case 'classic':
        default:
          const { generateWorkingInvoicePDF } = await import('../../../utils/workingPdfGenerator');
          generatePDF = generateWorkingInvoicePDF;
          break;
      }

      // Transform invoice data for PDF generation
      const pdfData = {
        ...invoice,
        movementType: 'sales', // Mark as sales invoice
        items: invoice.products || [],
        invoiceId: invoice.invoice,
        id: invoice.invoice
      };

      // Generate PDF
      const filename = await generatePDF(pdfData, null, language);

      return filename;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF';
      setInvoiceState('error', errorMessage);
      console.error('Error generating invoice PDF:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, generatePDF: false }));
    }
  },

  // Update invoice
  async updateInvoice(invoiceId: string, updates: Partial<Invoice>) {
    try {
      setLoadingStates(prev => ({ ...prev, update: true }));
      setInvoiceState('error', null);

      // Get current invoice to check previous status
      const currentInvoice = invoiceState.invoices.find(inv => inv.ssg_sorder_key === invoiceId);

      const data = {} as Invoice;

      // Update local state
      setInvoiceState('invoices', prev =>
        prev.map(invoice => invoice.invoice === invoiceId ? data : invoice)
      );

      if (invoiceState.selectedInvoice?.invoice === invoiceId) {
        setInvoiceState('selectedInvoice', data);
      }

      setInvoiceState('lastUpdated', new Date());

      // Trigger automated journal entry creation if invoice status changed to completed
      if (updates.isCompleted && !currentInvoice?.isCompleted) {
        try {
          // Legacy automation
          await processInvoiceCompleted(data);

          // New Event System
          await invoiceEventIntegration.onInvoiceCompleted(data);

          devLog('Automated journal entries processed for updated invoice:', data.invoice);
        } catch (automationError) {
          console.error('Error processing automated journal entries:', automationError);
          // Don't fail the update if automation fails
        }
      }

      // Always emit update event
      await invoiceEventIntegration.onInvoiceUpdated(data);

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice';
      setInvoiceState('error', errorMessage);
      console.error('Error updating invoice:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  },

  // Delete invoice
  async deleteInvoice(invoiceId: string) {
    try {
      setLoadingStates(prev => ({ ...prev, delete: true }));
      setInvoiceState('error', null);

      // Check for linked inventory movements before deletion
      try {
        const movements = await inventoryApi.getInventory(invoiceId);
        const linkedMovements = movements?.filter((m: any) =>
          m?.data?.invoiceId === invoiceId ||
          m?.invoiceId === invoiceId ||
          m?.data?.ssg_sorder_key === invoiceId ||
          m?.ssg_sorder_key === invoiceId
        ) || [];

        if (linkedMovements.length > 0) {
          const confirmed = window.confirm(
            `This invoice has ${linkedMovements.length} linked inventory movement(s).\n\n` +
            `If you delete this invoice, those movements will be marked as "orphaned" ` +
            `(the stock levels will remain unchanged, but the movements will lose their invoice reference).\n\n` +
            `Do you want to proceed?`
          );

          if (!confirmed) {
            return false;
          }
        }
      } catch (movementCheckError) {
        console.error('Error checking for linked movements:', movementCheckError);
        // Continue with deletion even if check fails, but log the error
      }

      // Remove from local state
      setInvoiceState('invoices', prev =>
        prev.filter(invoice => invoice.invoice !== invoiceId)
      );

      if (invoiceState.selectedInvoice?.invoice === invoiceId) {
        setInvoiceState('selectedInvoice', null);
      }

      setInvoiceState('lastUpdated', new Date());

      let params: Record<string, any> = {
        businessId: "YB100423253156428",
        id: invoiceId
      }
      let bdyq2 = {
        query: "deleteInvoice",
        params
      }

      //devLog(bdyq2)


      const response = await fetchGraphQLSS(bdyq2);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice';
      setInvoiceState('error', errorMessage);
      console.error('Error deleting invoice:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, delete: false }));
    }
  },

  // Get invoice statistics
  async fetchInvoiceStats(filters?: {
    store?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      setInvoiceState('error', null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.store && filters.store !== 'all') {
        params.append('store', filters.store);
      }
      if (filters?.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters?.dateTo) {
        params.append('dateTo', filters.dateTo);
      }

      const queryString = params.toString();
      //const endpoint = `/invoices/stats${queryString ? `?${queryString}` : ''}`;

      //const data = await apiCall(endpoint);
      const data = [] as Invoice[];
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invoice statistics';
      setInvoiceState('error', errorMessage);
      console.error('Error fetching invoice stats:', error);
      throw error;
    }
  },

  // Get stores list
  async fetchStores() {
    try {
      setInvoiceState('error', null);

      const data = [] as Invoice[];

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stores';
      setInvoiceState('error', errorMessage);
      console.error('Error fetching stores:', error);
      throw error;
    }
  },

  // Local state management
  setSelectedInvoice(invoice: Invoice | null) {
    setInvoiceState('selectedInvoice', invoice);
  },

  clearError() {
    setInvoiceState('error', null);
  },

  // Get filtered invoices from local state
  getFilteredInvoices(filters: {
    store?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: 'completed' | 'pending' | 'all';
  }) {
    let filtered = invoiceState.invoices;

    
    // Filter by store
    if (filters.store && filters.store !== 'all') {
      filtered = filtered.filter(invoice => invoice.store === filters.store);
    }

    // Filter by date range
    //devLog("filters.dateFrom", filtered)
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom).getTime();
      filtered = filtered.filter(invoice => invoice.createDate >= fromDate);
    }
    //devLog("filters.dateTo", filtered)
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(invoice => invoice.createDate <= toDate);
    }
    //devLog({filters, filtered})
    // Filter by status
    if (filters.status && filters.status !== 'all') {
      const isCompleted = filters.status === 'completed';
     // filtered = filtered.filter(invoice => invoice.isCompleted === isCompleted);
    }

    
    return filtered;
  },

  // Calculate summary statistics from local data
  calculateSummary(invoices: Invoice[]) {
    let totalInvoices = invoices.length;
    let completedInvoices = invoices.filter(inv => inv.isCompleted).length;
    let totalProducts = 0;
    let totalReservas = 0;
    let totalProductAmount = 0;
    let totalReservaAmount = 0;
    let totalAranceles = 0;
    let totalOther = 0;
    let uniqueCustomers = new Set<string>();
    let uniqueStores = new Set<string>();

    invoices?.forEach(invoice => {
      // Count unique customers and stores
      uniqueCustomers.add(invoice?.shipper_consignee?.cid);
      uniqueStores.add(invoice.store);

      // Process products

      if (invoice?.products?.length > 0) {
        invoice?.products?.forEach(item => {
          const qty = Math.abs(item?.qty);
          totalProducts += qty;
          totalProductAmount += qty * (parseFloat(item?.salePrice) || 1);
        });
      }

      // Process reservas
      if (invoice?.reservas?.length > 0) {
        invoice?.reservas?.forEach(item => {
          let qty = parseInt(item?.qty);


          if (isNaN(qty)) {
            qty = 0;
          }

          let others: any = {
            "TRANSPORTACION": 1,
            "OTROS SERVICIO": 1,
            "OTROS": 1,
            "SERVICIO DE RAPEADO": 1,
            "CAJAS": 1
          }

          if (others?.[item?.type] || item?.onlyTariff) {
            qty = parseFloat(item.arancel) || (parseFloat(item.qty) * parseFloat(item.price));
            totalOther += qty;
          } else {

            if (item?.arancel) {
              totalAranceles += parseFloat(item?.arancel);
            }
            totalReservas += qty;
            totalReservaAmount += qty * parseFloat(item?.price);

          }


        });
      }

    });

    const grandTotal = totalProductAmount + totalReservaAmount + totalOther;

    return {
      totalInvoices,
      completedInvoices,
      pendingInvoices: totalInvoices - completedInvoices,
      totalProducts,
      totalReservas,
      totalProductAmount,
      totalReservaAmount,
      totalAranceles,
      grandTotal,
      totalOther,
      uniqueCustomers: uniqueCustomers.size,
      uniqueStores: uniqueStores.size,
      avgInvoiceValue: totalInvoices > 0 ? grandTotal / totalInvoices : 0
    };
  },

  // Refresh data
  async refreshData(filters?: {
    store?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    type?: 'SALES' | 'INTERNATIONAL_SHIPPING';
    status?: 'completed' | 'pending' | 'all';
  }) {
    //devLog(" fetchInvoices {queryString}")
    return this.fetchInvoices(filters);
  }
};

export { invoiceStore as default };



