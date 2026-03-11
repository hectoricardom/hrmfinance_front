import { Component, Show, For, createMemo, createSignal, onMount, createEffect } from 'solid-js';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryStore } from '../../inventory';
//import { generateMinimalInvoicePDF } from '../../../utils/minimalPdfGenerator';
//import { testPdfGeneration } from '../../../utils/testPdf';
import { generatePrintablePDF } from '../../../utils/printToPdf';
import { generateProfessionalInvoicePDF } from '../../../utils/professionalPdfGenerator';
import {  deepClone, devLog } from '../../../services/utils';
import { parseInvoice } from '../utils/invoiceParser';
import { authStore } from '../../../stores/authStore';
import BulkItemGroup from './BulkItemGroup';
import invoiceStore from '../stores/invoiceStore';
import { invoiceStyledFormStore } from '../stores/invoiceStyledFormStore';
import { eventRulesApi } from '../../../services/api/eventRulesApi';
import { getShippingMethodDisplayName, isValidShippingMethod } from '../../../services/shippingMethodService';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { downloadInternationalShippingPDF } from '../../international-shipping/utils/internationalShippingPdfGenerator';
import InternationalShippingDisplay from '../../international-shipping/components/InternationalShippingDisplay';
import AIRuleGeneratorModal from '../../accounting/components/AIRuleGeneratorModal';
import ThermalReceipt from '../../pos/components/ThermalReceipt';
import { POSSale } from '../../pos/types/posTypes';
import { processAnyInput } from '../../accounting-flow/services/accountingFlowApi';
import EntryBookPreviewModal, { EntryBookPreviewData } from '../../accounting-flow/components/EntryBookPreviewModal';


interface InvoiceProduct {
  product: {
    id: string;
    code: string;
    label: string;
    price?: number;
  };
  qty: number;
  salePrice: number;
  total: number;
  bulkId?: string;
}

interface InvoiceReserva {
  type: string;
  qty: number;
  price: number;
  arancel: number;
  total: number;
  onlyTariff?: boolean;
  bulkId?: string;
}

interface PaymentMethod {
  cash: number;
  zelle: number;
  creditCard: number;
  discount?: number;
}

interface ShipperConsignee {
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
	phoneNumberS?: string;
  cid?: string;
  dob: string;
  idS: string;
  passport?: string;
  address?: string;
  addressS?: string;
  fullName?: string;
  ybstreetNo: string;
  ybstreet: string;
  ybbetwen1: string;
  ybbetwen2: string;
  ybapt: string;
  ybreparto: string;
  consigneeId: string;
  ssg_consignee_key: string;
  nacionality: string;
  ybcity: string;
  ybestate: string;
}



interface InvoiceProduct {
  product: {
    id: string;
    code: string;
    label: string;
    price?: number;
  };
  qty: number;
  salePrice: number;
  total: number;
  bulkId?: string;
}

interface InvoiceReserva {
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
  bulkId?: string;
}

interface PaymentMethod {
  cash: number;
  zelle: number;
  creditCard: number;
  discount?: number;
}



interface EnhancedInvoice {
  invoice: string;
  description: string;
  store: string;
  createDate: number;
  shipper_consignee: ShipperConsignee;
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  shippingMethod?: 'aereo' | 'maritimo' | '';
  taxPercent: number;
  taxOnTotal: boolean;
  exemptTaxOnCash: boolean;
  paymentMethods: PaymentMethod;
  productSubtotal: number;
  reservaSubtotal: number;
  subtotalBeforeTax: number;
  taxAmount: number;
  taxSavings?: number;
  total: number;
  cashPaymentRatio?: number;
}



interface InvoiceBulk {
  id: string;
  name: string;
  type: 'PERSONAL' | 'COMMERCIAL' | 'MIXED';
  maxWeight: number;
  currentWeight: number;
  transportCost?: number;
  shippingMethod: 'AEREO' | 'SEA';
  status: 'DRAFT' | 'READY';
  token?: string;
}

interface InvoiceData {
 
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
  services?: InvoiceService[];
  bulks?: InvoiceBulk[];
  isCompleted: boolean;
  taxAmount: number;
  total: number
  paymentMethods: any;
  subtotalBeforeTax: number;
  transportTotal?: number;
}

interface InvoiceDisplayProps {
  invoice: InvoiceData;
  onPrint?: () => void;
  onExport?: () => void;
  goBack?: () => void;
  onEdit?: () => void;
}

const parseFloat2 = (value: any): number => {
  return parseFloat(value?.toString() || '0') || 0;
};

const InvoiceDisplay: Component<InvoiceDisplayProps> = (props) => {
  const { t } = useTranslation();
	// State for created invoice
	const [createdInvoice, setCreatedInvoice] = createSignal<string>('');
	const [isGeneratingPDF, setIsGeneratingPDF] = createSignal(false);
	const [isEditingStore, setIsEditingStore] = createSignal(false);
	const [selectedStore, setSelectedStore] = createSignal(props.invoice.store);
	const [isSavingStore, setIsSavingStore] = createSignal(false);
	const [showEditModal, setShowEditModal] = createSignal(false);
  const [showShippingLabels, setShowShippingLabels] = createSignal(false);
  const [qrCodeUrls, setQrCodeUrls] = createSignal<Map<string, string>>(new Map());
  const [labelSize, setLabelSize] = createSignal<'4x6' | '2.3x4' | '2.31x4' | '1x2.5'>('4x6');
  const [showLabelSizeModal, setShowLabelSizeModal] = createSignal(false);
  const [showLabelPreview, setShowLabelPreview] = createSignal(false);
  const [showAIRuleModal, setShowAIRuleModal] = createSignal(false);
  const [isGeneratingEntryBook, setIsGeneratingEntryBook] = createSignal(false);
  const [showEntryBookPreview, setShowEntryBookPreview] = createSignal(false);
  const [entryBookPreviewData, setEntryBookPreviewData] = createSignal<EntryBookPreviewData | null>(null);
  const [entryBookResult, setEntryBookResult] = createSignal<{
    success: boolean;
    message: string;
    entryBookId?: string;
  } | null>(null);

  // Check if this is an express shipping invoice
  const isExpressShipping = () => {
    const method = props.invoice?.shippingMethod?.toString()?.toUpperCase() || '';
    return method.includes('EXPRESS') || method === 'AEREO_EXPRESS';
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  // Calculate totals
  const totals = createMemo(() => {
    let productSubtotal = 0;
    let reservaSubtotal = 0;
    let serviceSubtotal = 0;
    let otherSubtotal = 0;
    let tariffSubtotal = 0;



    props.invoice?.products?.forEach(item => {
      const qty = Math.abs(item?.qty);
      const prSl = parseFloat(item?.salePrice?.toString()) || 1
      productSubtotal += qty * prSl;

    });

    // Process reservas
    props.invoice?.reservas?.forEach(item => {
      let qty = parseFloat(item?.qty?.toString());


      if(isNaN(qty)){
        qty = 0;
      }

      let others: any = {
        "TRANSPORTACION": 1,
        "OTROS SERVICIO": 1,
        "OTROS": 1,
        "SERVICIO DE RAPEADO": 1,
        "CAJAS": 1
      }

      if(others[item.type] ||  item?.onlyTariff){
        qty = parseFloat(item.arancel?.toString()) || (parseFloat(item.qty?.toString()) * parseFloat(item.price?.toString()));
        otherSubtotal += qty;
      }else{

        if (item?.arancel) {
          tariffSubtotal += parseFloat(item?.arancel?.toString());
        }

        reservaSubtotal += qty * parseFloat(item?.price?.toString());

      }
    })

    // Process services
    props.invoice?.services?.forEach(item => {
      serviceSubtotal += parseFloat2(item.qty) * parseFloat2(item.price || item.arancel);
    });



    var subtotal = productSubtotal + reservaSubtotal + serviceSubtotal + tariffSubtotal + otherSubtotal;

    // Get discount from payment methods
    const discount = parseFloat2(props.invoice?.paymentMethods?.discount) || 0;

    // Apply discount to subtotal
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);

    var tax = 0; // Add tax calculation if needed
    var total = subtotalAfterDiscount + tax;

    if(props.invoice?.paymentMethods){
      tax = props.invoice?.taxAmount;
      total = props.invoice?.total;
      subtotal = props.invoice?.subtotalBeforeTax;
    }



    return {
      productSubtotal,
      reservaSubtotal,
      serviceSubtotal,
      tariffSubtotal,
      subtotal,
      discount,
      subtotalAfterDiscount,
      tax,
      total
    };
  });

  // Styles
  const invoiceContainerStyle = {
    'max-width': '800px',
    margin: '0 auto',
    padding: '2rem',
    background: 'white',
    'box-shadow': '0 0 20px rgba(0,0,0,0.1)',
    'border-radius': 'var(--border-radius)'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '2rem',
    'padding-bottom': '2rem',
    'border-bottom': '2px solid #e0e0e0'
  };

  const logoSectionStyle = {
    flex: '1'
  };

  const invoiceInfoStyle = {
    'text-align': 'right',
    flex: '1'
  };

  const statusBadgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    background: props.invoice.isCompleted ? '#d4edda' : '#fff3cd',
    color: props.invoice.isCompleted ? '#155724' : '#856404',
    'margin-bottom': '0.5rem'
  };

  const sectionStyle = {
    'margin-bottom': '2rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.1rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: '#333'
  };

  const infoGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1.5rem'
  };

  const infoBoxStyle = {
    background: '#f8f9fa',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid #e9ecef'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    color: '#666',
    'margin-bottom': '0.25rem'
  };

  const valueStyle = {
    'font-size': '1rem',
    color: '#333',
    'font-weight': '500'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse',
    'margin-top': '1rem'
  };

  const thStyle = {
    'text-align': 'left',
    padding: '0.75rem',
    'border-bottom': '2px solid #dee2e6',
    'font-weight': '600',
    color: '#495057',
    'font-size': '0.875rem',
    'text-transform': 'uppercase'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid #dee2e6',
    color: '#212529'
  };

  const totalRowStyle = {
    'font-weight': '600',
    'font-size': '1.1rem'
  };

  const actionButtonsStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'center',
    'margin-top': '2rem',
    'padding-top': '2rem',
    'border-top': '2px solid #e0e0e0'
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    'border-radius': 'var(--border-radius-sm)',
    border: 'none',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const printButtonStyle = {
    ...buttonStyle,
    background: 'var(--primary-color)',
    color: 'white'
  };

  const exportButtonStyle = {
    ...buttonStyle,
    background: 'white',
    color: 'var(--primary-color)',
    border: '2px solid var(--primary-color)'
  };

  const storeInfo = createMemo(()=>{
    return inventoryStore.getLocationById(props.invoice.store)
  })

  // Handle PDF export
  const handleExportPDF = async () => {
    devLog('Starting PDF export...');
    try {
      // Validate invoice data
      if (!props.invoice) {
        console.error('No invoice data available');
        alert('No invoice data available');
        return;
      }

      // Check if this is an international shipping invoice
      if (props.invoice.type === 'INTERNATIONAL_SHIPPING') {
        devLog('Generating international shipping PDF (professional)...');
        try {
          // Use the international shipping PDF generator
          downloadInternationalShippingPDF(props.invoice as any, undefined, 'es');
          devLog('International shipping PDF generated successfully');
        } catch (pdfError) {
          console.error('International shipping PDF generation failed:', pdfError);
          alert('Error generating international shipping PDF: ' + pdfError.message);
        }
        return;
      }

      // Regular invoice PDF generation
      let invoiceData = parseInvoice(props.invoice as any);

      // Use the minimal ink PDF generator for maximum savings
      devLog('Using minimal ink PDF generator...');
      try {
        //generatePrintablePDF(inv, t);
        await generateProfessionalInvoicePDF(invoiceData, t);
        devLog('Minimal ink PDF generation completed successfully');
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        devLog('Trying printable PDF fallback...');
        generatePrintablePDF(invoiceData, t);
        devLog('Printable PDF fallback completed');
      }
    } catch (error) {
      console.error('Error in handleExportPDF:', error);
      console.error('Error stack:', error.stack);
      alert(`Error generating PDF: ${error.message}`);
    }
  };



  // Handle PDF export
  const generatePDF = async () => {
    devLog('Starting PDF export...');
    try {
      // Validate invoice data
      if (!props.invoice) {
        console.error('No invoice data available');
        alert('No invoice data available');
        return;
      }

      // Check if this is an international shipping invoice
      if (props.invoice.type === 'INTERNATIONAL_SHIPPING') {
        devLog('Generating international shipping PDF...');
        try {
          // Use the international shipping PDF generator
          downloadInternationalShippingPDF(props.invoice as any, undefined, 'es');
          devLog('International shipping PDF generated successfully');
        } catch (pdfError) {
          console.error('International shipping PDF generation failed:', pdfError);
          alert('Error generating international shipping PDF: ' + pdfError.message);
        }
        return;
      }

      // Regular invoice PDF generation
      let invoiceData = parseInvoice(props.invoice as any);

      // devLog(JSON.stringify(props.invoice, null, 4))
      // Use the minimal ink PDF generator for maximum savings
      devLog('Using minimal ink PDF generator...');
      try {
        generatePrintablePDF(invoiceData, t);
        //await generateProfessionalInvoicePDF(invoiceData, t);
        devLog('Minimal ink PDF generation completed successfully');
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        devLog('Trying printable PDF fallback...');
        generatePrintablePDF(invoiceData, t);
        devLog('Printable PDF fallback completed');
      }
    } catch (error) {
      console.error('Error in handleExportPDF:', error);
      console.error('Error stack:', error.stack);
      alert(`Error generating PDF: ${error.message}`);
    }
  };


  
  const parse2Fl = (v: any):number =>{
				return parseFloat(v?.toString()) || 0;
		}

    const removeItem = async (v:string): Promise<void> =>{
      try {
        // Check for linked inventory movements
        const { inventoryApi } = await import('../../../services/apiAdapter');
        const movements = await inventoryApi.getInventory(props.invoice.id);

        
        const linkedMovements = movements?.filter((m: any) =>
          m?.data?.invoiceId === props.invoice.id ||
          m?.invoiceId === props.invoice.id ||
          m?.data?.ssg_sorder_key === props.invoice.id ||
          m?.ssg_sorder_key === props.invoice.id
        ) || [];

        if (linkedMovements.length > 0) {
          const confirmed = window.confirm(
            `This invoice has ${linkedMovements.length} linked inventory movement(s).\n\n` +
            `If you delete this invoice, those movements will be marked as "orphaned" ` +
            `(the stock levels will remain unchanged, but the movements will lose their invoice reference).\n\n` +
            `Do you want to proceed?`
          );

          if (!confirmed) {
            return;
          }
        }

        // Proceed with deletion
        await invoiceStore.deleteInvoice(props.invoice.id);
        props.goBack();
      } catch (err) {
        console.error('Error deleting invoice:', err);
        alert('Error deleting invoice. Please try again.');
      }
		}
		
		const totalRese = (v: any):string =>{
			let qty = parse2Fl(v.qty);
			let price = parse2Fl(v.price);
			let arancel = parse2Fl(v.arancel);
				
			let amount = qty*price+arancel;
			return `${amount?.toFixed(2)}`
		}
	
	const totalSubProd = (v: any):string =>{
			let qty = Math.abs(v.qty);
			let price = parse2Fl(v.salePrice);
			let amount = qty*price;
     
			return `${amount?.toFixed(2)}`
		}
	
  const handleEditInvoice = () => {
   // devLog('Edit invoice clicked, invoice data:', props.invoice);

    // Enter edit mode in the styled form store
    invoiceStyledFormStore.enterEditMode(props.invoice);

    // Navigate to the form (callback to parent)
    if (props.onEdit) {
      props.onEdit();
    }
  };

  const handleGenerateEntryBook = async () => {
    setIsGeneratingEntryBook(true);
    setEntryBookResult(null);

    try {
      // Prepare the invoice raw data for processing
      const rawData = {
        id: props.invoice.ssg_sorder_key || props.invoice.invoice,
        type: props.invoice.type || 'invoice',
        invoice: props.invoice.invoice,
        store: props.invoice.store,
        products: props.invoice.products,
        reservas: props.invoice.reservas,
        services: props.invoice.services,
        shipper_consignee: props.invoice.shipper_consignee,
        productSubtotal: props.invoice.productSubtotal,
        reservaSubtotal: props.invoice.reservaSubtotal,
        subtotalBeforeTax: props.invoice.subtotalBeforeTax,
        taxAmount: props.invoice.taxAmount,
        total: props.invoice.total,
        paymentMethods: props.invoice.paymentMethods,
        shippingMethod: props.invoice.shippingMethod,
        createDate: props.invoice.createDate,
        description: props.invoice.description,
        // Include any additional data
        ...props.invoice
      };

      const result = await processAnyInput(rawData, {
        sourceType: 'invoice_' + (props.invoice.type || 'standard'),
        autoCreate: false // Don't auto-create, show preview first
      });

      if (result.success && result.entryBook) {
        // Build preview data from the result
        const entries = result.entryBook.entries || [];
        // Use totals from response or calculate from entries
        const totalDebit = result.entryBook.totalDebits || entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
        const totalCredit = result.entryBook.totalCredits || entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

        const previewData: EntryBookPreviewData = {
          entries: entries.map((e: any, idx: number) => ({
            id: e.id || e.scenarioId || `entry_${idx}`,
            accountCode: e.accountCode || '',
            accountName: e.accountName || '',
            accountId: e.accountId,
            debit: e.debit || 0,
            credit: e.credit || 0,
            description: e.description || e.layer || ''
          })),
          date: result.entryBook.date || new Date().toISOString().split('T')[0],
          reference: result.entryBook.reference || props.invoice.invoice,
          description: `Factura: ${props.invoice.invoice}`,
          sourceType: result.entryBook.source || 'invoice_' + (props.invoice.type || 'standard'),
          sourceId: props.invoice.ssg_sorder_key || props.invoice.invoice,
          totalDebit,
          totalCredit,
          isBalanced: result.entryBook.balanced ?? Math.abs(totalDebit - totalCredit) < 0.01
        };

        setEntryBookPreviewData(previewData);
        setShowEntryBookPreview(true);
      } else {
        // If no entries returned, create default entries based on invoice type
        const total = props.invoice.total || 0;
        const taxAmount = props.invoice.taxAmount || 0;
        const subtotal = props.invoice.subtotalBeforeTax || (total - taxAmount);
        const defaultEntries = generateInvoiceDefaultEntries(total, taxAmount, subtotal);

        const previewData: EntryBookPreviewData = {
          entries: defaultEntries,
          date: new Date().toISOString().split('T')[0],
          reference: props.invoice.invoice,
          description: `Factura: ${props.invoice.invoice}`,
          sourceType: 'invoice_' + (props.invoice.type || 'standard'),
          sourceId: props.invoice.ssg_sorder_key || props.invoice.invoice,
          totalDebit: total,
          totalCredit: total,
          isBalanced: true
        };

        setEntryBookPreviewData(previewData);
        setShowEntryBookPreview(true);
      }
    } catch (error) {
      console.error('Error generating entry book:', error);
      setEntryBookResult({
        success: false,
        message: (error as Error).message || t('invoices.entryBookError', 'Error al generar asiento contable')
      });
    } finally {
      setIsGeneratingEntryBook(false);
    }
  };

  // Generate default journal entries for invoices
  const generateInvoiceDefaultEntries = (total: number, taxAmount: number, subtotal: number) => {
    const entries = [];
    const paymentMethods = props.invoice.paymentMethods || {};
    const cashAmount = parseFloat(paymentMethods.cash?.toString() || '0') || 0;
    const zelleAmount = parseFloat(paymentMethods.zelle?.toString() || '0') || 0;
    const cardAmount = parseFloat(paymentMethods.creditCard?.toString() || '0') || 0;

    // Debitos - Metodos de pago
    if (cashAmount > 0) {
      entries.push({
        id: 'entry_cash',
        accountCode: '1001',
        accountName: 'Caja',
        debit: cashAmount,
        credit: 0,
        description: 'Pago en efectivo'
      });
    }
    if (zelleAmount > 0) {
      entries.push({
        id: 'entry_zelle',
        accountCode: '1002',
        accountName: 'Banco - Zelle',
        debit: zelleAmount,
        credit: 0,
        description: 'Pago por Zelle'
      });
    }
    if (cardAmount > 0) {
      entries.push({
        id: 'entry_card',
        accountCode: '1003',
        accountName: 'Banco - Tarjeta',
        debit: cardAmount,
        credit: 0,
        description: 'Pago con tarjeta'
      });
    }
    // Si no hay metodos de pago especificos, usar cuentas por cobrar
    if (entries.length === 0) {
      entries.push({
        id: 'entry_receivable',
        accountCode: '1100',
        accountName: 'Cuentas por Cobrar',
        debit: total,
        credit: 0,
        description: 'Venta a credito'
      });
    }

    // Creditos - Ingresos
    if (subtotal > 0) {
      entries.push({
        id: 'entry_revenue',
        accountCode: '4000',
        accountName: 'Ingresos por Ventas',
        debit: 0,
        credit: subtotal,
        description: 'Venta de productos/servicios'
      });
    }

    // Impuestos
    if (taxAmount > 0) {
      entries.push({
        id: 'entry_tax',
        accountCode: '2200',
        accountName: 'Impuestos por Pagar',
        debit: 0,
        credit: taxAmount,
        description: 'IVA/Impuesto sobre venta'
      });
    }

    return entries;
  };

  const handleEntryBookSaved = (savedEntry: any) => {
    setEntryBookResult({
      success: true,
      message: t('invoices.entryBookGenerated', 'Asiento contable guardado exitosamente'),
      entryBookId: savedEntry.entryNumber || savedEntry.id
    });
    setShowEntryBookPreview(false);
  };

  const handleStoreUpdate = async () => {
    if (selectedStore() === props.invoice.store) {
      setIsEditingStore(false);
      return;
    }

    setIsSavingStore(true);
    try {
      // Update the invoice with the new store
      const updateData = {
        ...props.invoice,
        store: selectedStore()
      };

      // Use the inventoryApi to update the invoice
      const { inventoryApi } = await import('../../../services/apiAdapter');
      await inventoryApi.updateInvoice(props.invoice?.id, {store: selectedStore()});

     // devLog(props.invoice)

      // Update the local invoice data
      props.invoice.store = selectedStore();
      
      setIsEditingStore(false);
      // Show success message
      alert(t('invoices.storeUpdatedSuccessfully') || 'Store updated successfully');
    } catch (error) {
      console.error('Error updating store:', error);
      alert(t('invoices.errorUpdatingStore') || 'Error updating store');
      // Reset to original value
      setSelectedStore(props.invoice.store);
    } finally {
      setIsSavingStore(false);
    }
  };

  const generate2PDF = async () => {
    if (!props.invoice) return;

    setIsGeneratingPDF(true);
    //setError('');

    try {
      // Import the enhanced PDF generator
      const { generateEnhancedInvoicePDF } = await import('../../../utils/enhancedInvoicePdfGenerator');
      
			
      let inv: any =  deepClone(props.invoice);


			
			if(!(inv?.paymentMethods && inv?.productSubtotal && inv?.total)){
      

        let reservaSubtotal = 0;
        inv?.reservas.forEach((re: any)=>{
          reservaSubtotal += parseFloat(totalRese(re))
        })

        let productSubtotal = 0;
        inv?.products?.forEach((re: any)=>{
          productSubtotal += parseFloat(totalSubProd(re))
        })

        inv.reservaSubtotal = reservaSubtotal.toFixed(2);
        inv.productSubtotal = productSubtotal.toFixed(2);
        inv.subtotalBeforeTax = (productSubtotal+reservaSubtotal).toFixed(2);
        //let taxAmount = has
        inv.total = inv.subtotalBeforeTax;

       

			}
			
      // generatePrintablePDF(inv, t);
      //const filename = await generateEnhancedInvoicePDF(inv, 'es', 'modern');
      //setSuccess(`📄 PDF generated successfully: ${filename}`);
    } catch (err: any) {
      devLog(err)
      //setError(err.message || 'Error generating PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };





  const testRule = async () => {

    let testQ =  { inputData: props.invoice, ruleEventType: "invoice_created", connectorName:"Invoice" }
    const res = await eventRulesApi.testRule("invoice_created", testQ)
  }

  // Generate QR codes for all bulks
  const generateQRCodes = async () => {
    if (!props.invoice?.bulks?.length) return;

    const qrMap = new Map<string, string>();

    for (const bulk of props.invoice.bulks) {
      try {
        const qrData = `${props.invoice.invoice}_${bulk.id}`;
        const qrCodeUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        qrMap.set(bulk.id, qrCodeUrl);
      } catch (error) {
        console.error(`Error generating QR code for bulk ${bulk.id}:`, error);
      }
    }

    setQrCodeUrls(qrMap);
  };

  // Handle print shipping labels - show size selection modal
  const handlePrintShippingLabels = () => {
    setShowLabelSizeModal(true);
  };

  // Prepare invoice data for AI rule generator
  const getInvoiceDataForAI = () => {
    const invoice = props.invoice;
    const calculatedTotals = totals();

    return JSON.stringify({
      invoiceNumber: invoice.invoice,
      date: formatDate(invoice.createDate),
      store: invoice.store,
      shippingMethod: invoice.shippingMethod,
      customer: {
        name: invoice.shipper_consignee?.name || invoice.shipper_consignee?.fullName,
        city: invoice.shipper_consignee?.ybcity,
        state: invoice.shipper_consignee?.ybestate
      },
      products: invoice.products?.map((p: any) => ({
        code: p.product?.code,
        label: p.product?.label,
        qty: p.qty,
        price: p.salePrice,
        total: p.total
      })),
      reservas: invoice.reservas?.map((r: any) => ({
        type: r.type,
        qty: r.qty,
        price: r.price,
        total: r.total
      })),
      services: invoice.services?.map((s: any) => ({
        type: s.type,
        qty: s.qty,
        price: s.price,
        total: s.total
      })),
      totals: {
        productSubtotal: calculatedTotals.productSubtotal,
        reservaSubtotal: calculatedTotals.reservaSubtotal,
        serviceSubtotal: calculatedTotals.serviceSubtotal,
        taxAmount: calculatedTotals.taxAmount,
        total: calculatedTotals.total
      },
      payment: invoice.paymentMethods
    }, null, 2);
  };

  // Execute print with selected size
  const executePrintLabels = async (size: '4x6' | '2.3x4' | '2.31x4' | '1x2.5') => {
    setLabelSize(size);
    setShowLabelSizeModal(false);
    await generateQRCodes();
    setShowShippingLabels(true);

    // Wait for render and then print
    setTimeout(() => {
      window.print();
      setShowShippingLabels(false);
    }, 500);
  };

  // Generate PDF with exact label dimensions using direct rendering
  const generateLabelPDF = async (size: '4x6' | '2.3x4' | '2.31x4' | '1x2.5') => {
    setShowLabelSizeModal(false);

    try {
      // Generate QR codes first
      await generateQRCodes();

      // For express labels, use direct PDF generation
      if (size === '2.31x4' || size === '1x2.5') {
        await generateExpressLabelPDF(size);
        return;
      }

      // For regular labels, use html2canvas method
      // Show labels for rendering
      setLabelSize(size);
      setShowShippingLabels(true);

      // Wait for DOM to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get all label elements based on size
      let labelSelector = '.label-4x6';
      if (size === '2.3x4') labelSelector = '.label-2x4';

      const labelElements = document.querySelectorAll(labelSelector);

      if (labelElements.length === 0) {
        throw new Error('No labels found to generate PDF');
      }

      // Set up PDF dimensions based on label size
      let pdfWidth: number, pdfHeight: number;
      if (size === '4x6') {
        pdfWidth = 152.4; // 6 inches in mm
        pdfHeight = 101.6; // 4 inches in mm
      } else {
        pdfWidth = 101.6; // 4 inches in mm
        pdfHeight = 58.42; // 2.3 inches in mm
      }

      // Create PDF with first page
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      // Process each label
      for (let i = 0; i < labelElements.length; i++) {
        const labelElement = labelElements[i] as HTMLElement;

        // Capture label as canvas with high quality
        const canvas = await html2canvas(labelElement, {
          scale: 3,
          backgroundColor: '#ffffff',
          logging: false,
          width: labelElement.offsetWidth,
          height: labelElement.offsetHeight
        });

        // Convert canvas to image
        const imgData = canvas.toDataURL('image/png');

        // Add new page for each label after the first
        if (i > 0) {
          pdf.addPage([pdfWidth, pdfHeight], 'landscape');
        }

        // Add image to PDF (fill entire page)
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      // Generate filename
      const filename = `shipping-labels-${props.invoice.invoice}-${size}-${Date.now()}.pdf`;

      // Save PDF
      pdf.save(filename);

      devLog(`✅ PDF generated successfully: ${filename}`);

      // Hide labels after PDF generation
      setShowShippingLabels(false);

      // Show success message
      alert(`PDF generado exitosamente con ${labelElements.length} etiqueta(s)`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error al generar PDF: ${error.message}`);
      setShowShippingLabels(false);
    }
  };

  // Direct PDF generation for express labels with proper horizontal layout
  const generateExpressLabelPDF = async (size: '2.31x4' | '1x2.5') => {
    try {
      if (!props.invoice?.bulks?.length) {
        alert('No hay bultos para generar etiquetas');
        return;
      }

      // Set dimensions for landscape orientation
      let pdfWidth: number, pdfHeight: number;
      if (size === '2.31x4') {
        pdfWidth = 101.6; // 4 inches in mm (landscape width)
        pdfHeight = 58.67; // 2.31 inches in mm (landscape height)
      } else {
        pdfWidth = 63.5; // 2.5 inches in mm (landscape width)
        pdfHeight = 25.4; // 1 inch in mm (landscape height)
      }

      // Create PDF in landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfHeight, pdfWidth] // [height, width] for landscape
      });

      // Process each bulk
      for (let i = 0; i < props.invoice.bulks.length; i++) {
        const bulk = props.invoice.bulks[i];
        const qrCodeUrl = qrCodeUrls().get(bulk.id);

        // Add new page for each label after the first
        if (i > 0) {
          pdf.addPage([pdfHeight, pdfWidth], 'landscape');
        }

        // Calculate sizes based on label size
        const padding = size === '2.31x4' ? 4 : 2;
        const qrSize = size === '2.31x4' ? 40 : 16;
        const fontSize = size === '2.31x4' ? 19 : 12;

         const left = size === '2.31x4' ? 10 : 6;
        const borderWidth = 1;

        // Draw border
        pdf.setLineWidth(borderWidth);
        //pdf.rect(borderWidth, borderWidth, pdfWidth - (borderWidth * 2), pdfHeight - (borderWidth * 2));

        // Add QR code on the left
        if (qrCodeUrl) {
          const qrX = padding + 2;
          const qrY = (pdfHeight - qrSize) / 2;
          pdf.addImage(qrCodeUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        }

        // Add bulk name on the right
        const textX = padding + qrSize + 8;
        const textY = pdfHeight / 2;
        const textWidth = pdfWidth - textX - padding - 4;

        // Draw text background
        //pdf.setFillColor(240, 240, 240);
        //pdf.rect(textX, padding + 2, textWidth, pdfHeight - (padding * 2) - 4, 'F');

        // Draw text border
        //pdf.setLineWidth(1);
        //pdf.rect(textX, padding + 2, textWidth, pdfHeight - (padding * 2) - 4);

        // Add bulk name text
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);

        // Center text vertically and horizontally
        const textLines = pdf.splitTextToSize(bulk.name, textWidth - 4);
        const textHeight = textLines.length * (fontSize * 0.35);
        let currentY = textY - (textHeight / 2);

        textLines.forEach((line: string) => {
          const lineWidth = pdf.getTextWidth(line);
          const lineX = textX + (textWidth - lineWidth) / 2;
          pdf.text(line, lineX , currentY);
          currentY += fontSize * 0.35;
        });
      }

      // Generate filename
      const filename = `express-labels-${props.invoice.invoice}-${size}-${Date.now()}.pdf`;

      // Save PDF
      pdf.save(filename);

      devLog(`✅ Express PDF generated successfully: ${filename}`);
      alert(`PDF generado exitosamente con ${props.invoice.bulks.length} etiqueta(s) express`);

    } catch (error) {
      console.error('Error generating express PDF:', error);
      alert(`Error al generar PDF express: ${error.message}`);
    }
  };


  if(authStore.isAdmin()){
     devLog(JSON.stringify(props.invoice))
  }
 

  // If international shipping invoice, use specialized display
  if (props.invoice.type === 'INTERNATIONAL_SHIPPING') {
    return (
      <InternationalShippingDisplay
        invoice={props.invoice}
        onPrint={props.onPrint}
        onExport={props.onExport}
        goBack={props.goBack}
        onEdit={props.onEdit}
      />
    );
  }

  // If POS sales invoice, use thermal receipt display
  if (props.invoice.type === 'POS_SALES' || props.invoice.type === 'POS_SALE') {
    // Convert invoice data to POSSale format for ThermalReceipt
    const posSale: POSSale = {
      id: props.invoice.ssg_sorder_key || props.invoice.invoice,
      saleNumber: props.invoice.invoice,
      timestamp: props.invoice.createDate ? new Date(props.invoice.createDate).toISOString() : new Date().toISOString(),
      cashier: {
        id: props.invoice.userId || 'unknown',
        name: props.invoice.cashierName || props.invoice.userId || 'Cajero'
      },
      customer: props.invoice.shipper_consignee ? {
        id: props.invoice.shipper_consignee.consigneeId || '',
        name: props.invoice.shipper_consignee.name || props.invoice.shipper_consignee.fullName || '',
        phoneNumber: props.invoice.shipper_consignee.phoneNumber || '',
        email: '',
        cid: props.invoice.shipper_consignee.cid || ''
      } : undefined,
      products: (props.invoice.products || []).map((p: any, idx: number) => ({
        id: `prod_${idx}`,
        product: {
          id: p.product?.id || `item_${idx}`,
          code: p.product?.code || '',
          label: p.product?.label || p.product?.name || 'Product',
          price: parseFloat(p.salePrice?.toString() || '0')
        },
        qty: Math.abs(p.qty || 0),
        unitPrice: parseFloat(p.salePrice?.toString() || '0'),
        discount: 0,
        discountPercent: 0,
        total: parseFloat(p.total?.toString() || '0')
      })),
      services: (props.invoice.services || []).map((s: any, idx: number) => ({
        id: `svc_${idx}`,
        type: s.type || 'service',
        name: s.name || s.type || 'Service',
        qty: s.qty || 1,
        unitPrice: parseFloat(s.price?.toString() || '0'),
        discount: 0,
        total: parseFloat(s.total?.toString() || '0')
      })),
      subtotal: parseFloat(props.invoice.subtotalBeforeTax?.toString() || props.invoice.total?.toString() || '0'),
      discounts: [],
      totalDiscount: parseFloat(props.invoice.paymentMethods?.discount?.toString() || '0'),
      taxes: [{
        name: 'Tax',
        rate: 0,
        amount: parseFloat(props.invoice.taxAmount?.toString() || '0'),
        applyToTotal: true
      }],
      totalTax: parseFloat(props.invoice.taxAmount?.toString() || '0'),
      total: parseFloat(props.invoice.total?.toString() || '0'),
      paymentMethods: {
        cash: parseFloat(props.invoice.paymentMethods?.cash?.toString() || '0'),
        creditCard: parseFloat(props.invoice.paymentMethods?.creditCard?.toString() || '0'),
        debitCard: 0,
        zelle: parseFloat(props.invoice.paymentMethods?.zelle?.toString() || '0'),
        bankTransfer: parseFloat(props.invoice.paymentMethods?.bankTransfer?.toString() || '0'),
        check: 0,
        giftCard: 0,
        googlePay: 0,
        other: 0
      },
      totalPaid: parseFloat(props.invoice.total?.toString() || '0'),
      change: parseFloat(props.invoice.paymentMethods?.change?.toString() || '0'),
      status: props.invoice.isCompleted ? 'COMPLETED' : 'PENDING',
      storeId: props.invoice.store,
      storeName: storeInfo()?.name || props.invoice.store
    };

    return (
      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        padding: '1rem',
        background: 'var(--background-primary)',
        'min-height': '100vh'
      }}>
        {/* Back Button */}
        <Show when={props.goBack}>
          <div style={{
            width: '100%',
            'max-width': '400px',
            'margin-bottom': '1rem'
          }}>
            <Button variant="outline" onClick={props.goBack}>
              ← {t('common.back', 'Volver')}
            </Button>
          </div>
        </Show>

        {/* POS Receipt Header */}
        <div style={{
          background: 'var(--primary-color)',
          color: 'white',
          padding: '1rem 2rem',
          'border-radius': 'var(--border-radius)',
          'margin-bottom': '1rem',
          'text-align': 'center'
        }}>
          <h2 style={{ margin: 0, 'font-size': '1.25rem' }}>
            🧾 {t('pos.receipt', 'Recibo de Venta')}
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, 'font-size': '0.9rem' }}>
            {props.invoice.invoice}
          </p>
        </div>

        {/* Thermal Receipt */}
        <ThermalReceipt
          sale={posSale}
          onClose={props.goBack}
        />
      </div>
    );
  }

  // Regular invoice display
  return (
    <div style={invoiceContainerStyle} class="invoice-display">
      {/* Header */}
      <div style={headerStyle}>
      <div style={{}}>
        <div style={{ color: '#666', 'margin-top': '0.25rem' }}>
          {t(`inventory.${storeInfo()?.type}Type`)}:
          <Show when={!isEditingStore()} fallback={
            <div style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.5rem', 'margin-left': '0.5rem' }}>
              <select
                value={selectedStore()}
                onChange={(e) => setSelectedStore(e.target.value)}
                disabled={isSavingStore()}
                style={{
                  padding: '0.25rem 0.5rem',
                  'border-radius': '4px',
                  border: '1px solid #ccc',
                  'font-size': '1rem',
                  'font-weight': '600',
                  color: '#444'
                }}
              >
                <For each={inventoryStore.getActiveLocations().filter(loc => loc.type === 'store')}>
                  {(location) => (
                    <option value={location.id}>{location.name}</option>
                  )}
                </For>
              </select>
              <button
                onClick={handleStoreUpdate}
                disabled={isSavingStore()}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  'border-radius': '4px',
                  cursor: isSavingStore() ? 'not-allowed' : 'pointer',
                  opacity: isSavingStore() ? '0.7' : '1'
                }}
              >
                {isSavingStore() ? '...' : '✓'}
              </button>
              <button
                onClick={() => {
                  setIsEditingStore(false);
                  setSelectedStore(props.invoice.store);
                }}
                disabled={isSavingStore()}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  'border-radius': '4px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          }>
            <span style={{ 
              'font-size': '1.1rem', 
              'font-weight': '600', 
              color: '#444',
              cursor: authStore.state?.profile?.isAdmin ? 'pointer' : 'default',
              'text-decoration': authStore.state?.profile?.isAdmin ? 'underline' : 'none',
              'text-decoration-style': 'dotted',
              'margin-left': '0.5rem'
            }}
            onClick={() => authStore.state?.profile?.isAdmin && setIsEditingStore(true)}
            title={authStore.state?.profile?.isAdmin ? 'Click to edit store' : ''}
            >
              {storeInfo()?.name}
            </span>
          </Show>
        </div>
     
        <div style={{ 'font-size': '.91rem', 'font-weight': '400', color: '#666' }}>
          {t('invoices.id')}: 
          <span style={{ 'font-size': '1.1rem', 'font-weight': '600', color: '#444' }}>
          {props.invoice.ssg_sorder_key}
          </span> 
        </div>
      </div>
      
        
        <div style={invoiceInfoStyle}>
          
            <div style={statusBadgeStyle} >
              {props.invoice.isCompleted ? t('invoices.completed').toUpperCase() : t('invoices.pending').toUpperCase()}
            </div>
           
          
          <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>
            {t('invoices.invoice').toUpperCase()}
          </h2>
          <div style={{ 'font-size': '1.1rem', 'font-weight': '600', color: '#333' }}>
            {props.invoice.invoice}
          </div>
          <div style={{ color: '#666', 'margin-top': '0.5rem' }}>
            {formatDate(props.invoice.createDate)}
          </div>

          <Show when={props.invoice.shippingMethod}>
            <div style={{
              'margin-top': '0.75rem',
              display: 'inline-block',
              padding: '0.35rem 0.85rem',
              'border-radius': '6px',
              'font-size': '0.85rem',
              'font-weight': '600',
              background: isValidShippingMethod(props.invoice.shippingMethod) ? '#e3f2fd' : '#fff3cd',
              color: isValidShippingMethod(props.invoice.shippingMethod) ? '#1565c0' : '#856404',
              border: isValidShippingMethod(props.invoice.shippingMethod) ? '1px solid #90caf9' : '1px solid #ffc107'
            }}>
              {getShippingMethodDisplayName(props.invoice.shippingMethod)}
            </div>
          </Show>
        </div>
      </div>

      {/* Customer Information */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>{t('invoices.senderInformation')}</h3>
        <div style={infoGridStyle}>
          <div style={infoBoxStyle}>
            <div style={labelStyle}>{t('invoices.customerName')}</div>
            <div style={valueStyle}>{props.invoice.shipper_consignee.name}</div>
           
            <Show when={props.invoice.shipper_consignee.phoneNumberS}>
              <br />{t('invoices.phoneNumber')}: {props.invoice.shipper_consignee.phoneNumberS}
            </Show>
            <Show when={props.invoice.shipper_consignee.dob}>
              <br />{t('invoices.dob')}: {props.invoice.shipper_consignee.dob}
            </Show>
            <Show when={props.invoice.shipper_consignee.phoneNumberS}>
              <br />{t('invoices.id')}: {props.invoice.shipper_consignee.idS}
            </Show>
          </div>
        </div>
        <Show when={props.invoice.shipper_consignee.cid} >
        <div style={{margin: "20px"}}/>
        <h3 style={sectionTitleStyle}>{t('invoices.receiptInformation')}</h3>
        <div style={infoGridStyle}>
        
          <div style={infoBoxStyle}>
            <div style={labelStyle}>{t('invoices.customerName')}</div>
            <div style={valueStyle}>
              {props.invoice.shipper_consignee.firstName} {props.invoice.shipper_consignee.middleName} {props.invoice.shipper_consignee.lastName} {props.invoice.shipper_consignee.lastName2}
            </div>
            
            <div style={{ ...labelStyle, 'margin-top': '0.75rem' }}>{t('invoices.id')}</div>
            <div style={valueStyle}>
              {props.invoice.shipper_consignee.cid} 
            </div>
            <Show when={props.invoice.shipper_consignee.passport}>
              <div style={{ ...labelStyle, 'margin-top': '0.75rem' }}>{t('invoices.passport')}</div>
              <div style={valueStyle}>
                {props.invoice.shipper_consignee.passport}
              </div>
           </Show>
          </div>
          
          <div style={infoBoxStyle}>
            <div style={labelStyle}>{t('invoices.contactInformation')}</div>
            <div style={{ ...labelStyle, 'margin-top': '0.75rem' }}>{t('invoices.phoneNumber')}</div>
            <div style={valueStyle}>
               {props.invoice.shipper_consignee.phoneNumber}
            </div>

            <Show when={props.invoice.shipper_consignee.altPhoneNumber}>
              <div style={{ ...labelStyle, 'margin-top': '0.75rem' }}>{t('invoices.altPhone')}</div>
              <div style={valueStyle}>
                {props.invoice.shipper_consignee.altPhoneNumber}
              </div>
            </Show>
            
            <div style={{ ...labelStyle, 'margin-top': '0.75rem' }}>{t('invoices.address')}</div>
            <div style={valueStyle}>
              {props.invoice.shipper_consignee.ybstreet} #{props.invoice.shipper_consignee.ybstreetNo}
              <br />
              {t('invoices.between')} {props.invoice.shipper_consignee.ybbetwen1} {t('invoices.and')} {props.invoice.shipper_consignee.ybbetwen2}
              <br />
              {props.invoice.shipper_consignee.ybreparto}, {props.invoice.shipper_consignee.ybcity}
              <br />
              {props.invoice.shipper_consignee.ybestate}, {props.invoice.shipper_consignee.nacionality}
            </div>
          </div>
        </div>
        </Show>
      </div>

      {/* Bulk Information Section */}
      <Show when={props.invoice?.bulks?.length > 0}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('invoices.bulkInformation')}</h3>
          <For each={props.invoice.bulks}>
            {(bulk) => (
              <BulkItemGroup
                bulk={bulk}
                products={props.invoice.products || []}
                reservas={props.invoice.reservas || []}
                services={props.invoice.services || []}
                showDetails={true}
                compact={false}
                formatCurrency={formatCurrency}
                parseFloat2={parseFloat2}
                t={t}
                tableStyle={tableStyle}
                tdStyle={tdStyle}
                thStyle={thStyle}
              />
            )}
          </For>
        </div>
      </Show>

    <Show when={!props.invoice?.bulks?.length}>
      {/* Products Section */}
    
      <Show when={ props.invoice?.products?.length > 0}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('invoices.products')}</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('invoices.code')}</th>
                <th style={thStyle}>{t('invoices.description')}</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>{t('invoices.qty')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.unitPrice')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.invoice?.products}>
                {(item) => (
                  <tr>
                    <td style={tdStyle}>{item.product.code}</td>
                    <td style={tdStyle}>{item.product.label}</td>
                    <td style={{ ...tdStyle, 'text-align': 'center' }}>{Math.abs(item.qty)}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>{formatCurrency(item.salePrice)}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency(Math.abs(item.qty) * parseFloat2(item.salePrice) )}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Reservas Section */}
      <Show when={props.invoice?.reservas?.length > 0}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('invoices.reservations')}</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('invoices.type')}</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>{t('invoices.qty')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.unitPrice')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.arancel')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.invoice?.reservas}>
                {(item) => (
                  <tr>
                    <td style={tdStyle}>{item.type}</td>
                    <td style={{ ...tdStyle, 'text-align': 'center' }}>{item.qty}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>{formatCurrency(item.price)}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>{item.arancel || '-'}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency((parseFloat2(item.qty) || 0) * (parseFloat2(item.price)|| 0) + (item.arancel ? parseFloat2(item.arancel) : 0))}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Services Section */}
      <Show when={props.invoice?.services?.length > 0}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('invoices.services')}</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('invoices.type')}</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>{t('invoices.qty')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.arancel')}</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>{t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.invoice?.services}>
                {(item) => (
                  <tr>
                    <td style={tdStyle}>{item.type}</td>
                    <td style={{ ...tdStyle, 'text-align': 'center' }}>{parseFloat2(item.qty).toFixed(2)}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>{(item.arancel || item?.price )? formatCurrency(item.arancel || item?.price) : '-'}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency((parseFloat2(item.qty) || 0) * ((item.arancel || item?.price ) ? parseFloat2((item.arancel || item?.price )) : 0))}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

</Show>
      {/* Totals Section */}
      <div style={{ ...sectionStyle, 'text-align': 'right' }}>
        <div style={{ display: 'inline-block', 'min-width': '350px' }}>
          <Show when={props.invoice?.products?.length > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span>{t('invoices.productsSubtotal')}:</span>
              <span>{formatCurrency(props?.parseData?.productSubtotal)}</span>
            </div>
          </Show>
          
          <Show when={props.invoice?.reservas?.length > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span>{t('invoices.reservationsSubtotal')}:</span>
              <span>{formatCurrency(props?.parseData?.reservaSubtotal)}</span>
            </div>
          </Show>
          
          <Show when={props.invoice?.services?.length > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span>{t('invoices.servicesSubtotal')}:</span>
              <span>{formatCurrency(props?.parseData?.serviceSubtotal)}</span>
            </div>
          </Show>
          
          <Show when={props.parseData?.transportTotal}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span>{t('invoices.transportTotal')}:</span>
              <span>{formatCurrency(props.parseData.transportTotal)}</span>
            </div>
          </Show>
          
          <div style={{ ...totalRowStyle, display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.75rem', 'border-top': '2px solid #dee2e6' }}/>
        
          <Show when={props?.parseData?.subtotalBeforeTax}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span>{t('common.subtotal')}:</span>
              <span>{formatCurrency(props?.parseData?.subtotalBeforeTax)}</span>
            </div>
          </Show>

          <Show when={totals().discount > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem', color: '#28a745' }}>
              <span>🏷️ {t('pos.discount') || 'Descuento'}:</span>
              <span>-{formatCurrency(totals().discount)}</span>
            </div>
          </Show>

           <Show when={props?.parseData?.taxAmount}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span>{t('invoiceReport.tax')} (${props?.parseData.paymentMethods?.taxPercent || 7}%):</span>
              <span>{formatCurrency(props?.parseData?.taxAmount)}</span>
            </div>
          </Show>

          
          <div style={{ ...totalRowStyle, display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.75rem', 'border-top': '2px solid #dee2e6' }}>
            <span>{t('invoices.total')}:</span>
            <span style={{ color: 'var(--primary-color)' }}>{formatCurrency(totals().total)}</span>
          </div>
        </div>
      </div>

      {/* Store Information */}
      <div style={{ ...sectionStyle, 'text-align': 'center', color: '#666', 'font-size': '0.875rem' }}>
      </div>

      {/* Action Buttons */}
      <div style={actionButtonsStyle}>
        <button
          style={printButtonStyle}
          onClick={generatePDF}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          🖨️ {t('invoices.printInvoice')}
        </button>

        <Show when={props.invoice?.bulks?.length > 0}>
          <button
            style={{...printButtonStyle, background: '#6f42c1'}}
            onClick={handlePrintShippingLabels}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            🏷️ { 'Imprimir Etiquetas'}
          </button>
        </Show>

        
        <Show when={authStore.state?.profile?.isAdmin}>
          <button 
            style={{...exportButtonStyle, background: '#17a2b8', 'border-color': '#17a2b8'}}
            onClick={handleEditInvoice}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#138496';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#17a2b8';
              e.currentTarget.style.color = 'white';
            }}
          >
            ✏️ {t('common.edit') || 'Edit'}
          </button>
        
         <button 
         style={{...printButtonStyle, background: '#dc3545'}}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          onClick={removeItem}
        >
          🗑️ {t('common.delete') || 'Delete'}
        </button>
        </Show>

        {/* AI Rule Generator Button */}
        <button
          style={{...printButtonStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}
          onClick={() => setShowAIRuleModal(true)}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          ✨ Crear Regla IA
        </button>

        {/* Generate Entry Book Button */}
        <button
          style={{
            ...printButtonStyle,
            background: isGeneratingEntryBook() ? '#90caf9' : '#1976d2',
            cursor: isGeneratingEntryBook() ? 'not-allowed' : 'pointer',
            opacity: isGeneratingEntryBook() ? 0.7 : 1,
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}
          onClick={handleGenerateEntryBook}
          disabled={isGeneratingEntryBook()}
          onMouseEnter={(e) => {
            if (!isGeneratingEntryBook()) e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            if (!isGeneratingEntryBook()) e.currentTarget.style.opacity = '1';
          }}
        >
          <Show when={isGeneratingEntryBook()} fallback={<>📒 {t('invoices.generateEntryBook', 'Generar Asiento')}</>}>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: '2px solid white',
              'border-top-color': 'transparent',
              'border-radius': '50%',
              animation: 'spin 1s linear infinite'
            }} />
            {t('common.processing', 'Procesando...')}
          </Show>
        </button>
      </div>

      {/* Entry Book Result Message */}
      <Show when={entryBookResult()}>
        <div style={{
          margin: '1rem 0',
          padding: '0.75rem 1rem',
          'border-radius': '8px',
          background: entryBookResult()?.success ? '#e8f5e9' : '#ffebee',
          color: entryBookResult()?.success ? '#2e7d32' : '#c62828',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          'font-weight': '500'
        }}>
          <span style={{ 'font-size': '1.2rem' }}>
            {entryBookResult()?.success ? '✓' : '✗'}
          </span>
          <span>{entryBookResult()?.message}</span>
          <Show when={entryBookResult()?.entryBookId}>
            <span style={{ 'font-size': '0.85rem', opacity: 0.8 }}>
              (ID: {entryBookResult()?.entryBookId})
            </span>
          </Show>
        </div>
      </Show>

      {/* Label Size Selection Modal */}
      <Show when={showLabelSizeModal()}>
        <div class="modal-overlay" onClick={() => setShowLabelSizeModal(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()} style={{ 'max-width': '700px' }}>
            <h3 style={{ 'margin-top': '0', 'text-align': 'center' }}>
              {isExpressShipping() ? '⚡ Express Shipping Labels' : 'Seleccionar Tamaño y Formato de Etiqueta'}
            </h3>
            <p style={{ 'text-align': 'center', color: '#666', 'margin-bottom': '2rem' }}>
              {isExpressShipping()
                ? 'Etiquetas simplificadas para envío express'
                : 'Escoja el tamaño y si desea imprimir directamente o generar PDF'
              }
            </p>

            {/* Express Shipping Labels - Minimal Design */}
            <Show when={isExpressShipping()}>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem' }}>
                {/* 2.31x4 Preview */}
                <button
                  onClick={async () => {
                    await generateQRCodes();
                    setLabelSize('2.31x4');
                    setShowLabelSizeModal(false);
                    setShowLabelPreview(true);
                  }}
                  style={{
                    padding: '1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: 'pointer',
                    'font-size': '1rem',
                    'font-weight': '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#5a67d8'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                >
                  👁️ Vista Previa 2.31" x 4"
                  <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                    Ver antes de imprimir
                  </div>
                </button>

                {/* 2.31x4 Express Label */}
                <button
                  onClick={() => executePrintLabels('2.31x4')}
                  style={{
                    padding: '1.5rem',
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: 'pointer',
                    'font-size': '1rem',
                    'font-weight': '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#ee5a52'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ff6b6b'}
                >
                  🖨️ Imprimir 2.31" x 4"
                  <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                    Express - QR + Nombre
                  </div>
                </button>

                {/* 2.31x4 PDF */}
                <button
                  onClick={() => generateLabelPDF('2.31x4')}
                  style={{
                    padding: '1.5rem',
                    background: '#ff8787',
                    color: 'white',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: 'pointer',
                    'font-size': '1rem',
                    'font-weight': '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fa7070'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ff8787'}
                >
                  📄 PDF 2.31" x 4"
                  <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                    Express - Descargar
                  </div>
                </button>

                {/* 1x2.5 Preview */}
                <button
                  onClick={async () => {
                    await generateQRCodes();
                    setLabelSize('1x2.5');
                    setShowLabelSizeModal(false);
                    setShowLabelPreview(true);
                  }}
                  style={{
                    padding: '1.5rem',
                    background: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: 'pointer',
                    'font-size': '1rem',
                    'font-weight': '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#6d28d9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#7c3aed'}
                >
                  👁️ Vista Previa 1" x 2.5"
                  <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                    Express Compact
                  </div>
                </button>

                {/* 1x2.5 Express Label */}
                <button
                  onClick={() => executePrintLabels('1x2.5')}
                  style={{
                    padding: '1.5rem',
                    background: '#4ecdc4',
                    color: 'white',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: 'pointer',
                    'font-size': '1rem',
                    'font-weight': '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#45b8b0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#4ecdc4'}
                >
                  🖨️ Imprimir 1" x 2.5"
                  <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                    Express Compact
                  </div>
                </button>

                {/* 1x2.5 PDF */}
                <button
                  onClick={() => generateLabelPDF('1x2.5')}
                  style={{
                    padding: '1.5rem',
                    background: '#95e1d3',
                    color: '#333',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: 'pointer',
                    'font-size': '1rem',
                    'font-weight': '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#7dd3c0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#95e1d3'}
                >
                  📄 PDF 1" x 2.5"
                  <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                    Express Compact - PDF
                  </div>
                </button>
              </div>
            </Show>

            {/* Regular Shipping Labels - Full Design */}
            <Show when={!isExpressShipping()}>
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem' }}>
              {/* 4x6 Preview */}
              <button
                onClick={async () => {
                  await generateQRCodes();
                  setLabelSize('4x6');
                  setShowLabelSizeModal(false);
                  setShowLabelPreview(true);
                }}
                style={{
                  padding: '1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#5a67d8'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
              >
                👁️ Vista Previa 4" x 6"
                <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                  Ver antes de imprimir
                </div>
              </button>

              {/* 4x6 Print */}
              <button
                onClick={() => executePrintLabels('4x6')}
                style={{
                  padding: '1.5rem',
                  background: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#5a32a3'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#6f42c1'}
              >
                🖨️ Imprimir 4" x 6"
                <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                  Impresión directa
                </div>
              </button>

              {/* 4x6 PDF */}
              <button
                onClick={() => generateLabelPDF('4x6')}
                style={{
                  padding: '1.5rem',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#218838'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#28a745'}
              >
                📄 PDF 4" x 6"
                <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                  Descargar PDF
                </div>
              </button>

              {/* 2.3x4 Preview */}
              <button
                onClick={async () => {
                  await generateQRCodes();
                  setLabelSize('2.3x4');
                  setShowLabelSizeModal(false);
                  setShowLabelPreview(true);
                }}
                style={{
                  padding: '1.5rem',
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#6d28d9'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#7c3aed'}
              >
                👁️ Vista Previa 2.3" x 4"
                <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                  Ver antes de imprimir
                </div>
              </button>

              {/* 2.3x4 Print */}
              <button
                onClick={() => executePrintLabels('2.3x4')}
                style={{
                  padding: '1.5rem',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#138496'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#17a2b8'}
              >
                🖨️ Imprimir 2.3" x 4"
                <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                  Impresión directa
                </div>
              </button>

              {/* 2.3x4 PDF */}
              <button
                onClick={() => generateLabelPDF('2.3x4')}
                style={{
                  padding: '1.5rem',
                  background: '#ffc107',
                  color: '#000',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e0a800'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ffc107'}
              >
                📄 PDF 2.3" x 4"
                <div style={{ 'font-size': '0.8rem', 'margin-top': '0.5rem', opacity: '0.9' }}>
                  Descargar PDF
                </div>
              </button>
            </div>
            </Show>

            <button
              onClick={() => setShowLabelSizeModal(false)}
              style={{
                padding: '0.75rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                'border-radius': '8px',
                cursor: 'pointer',
                'font-size': '0.95rem',
                'margin-top': '1.5rem',
                width: '100%'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </Show>

      {/* Label Preview Modal */}
      <Show when={showLabelPreview()}>
        <div class="modal-overlay" onClick={() => setShowLabelPreview(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()} style={{ 'max-width': '900px', 'max-height': '90vh', overflow: 'auto' }}>
            <div style={{ 'text-align': 'center', 'margin-bottom': '2rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Vista Previa de Etiquetas</h3>
              <p style={{ color: '#666', 'font-size': '0.875rem', margin: '0' }}>
                Tamaño: {
                  labelSize() === '4x6' ? '4" x 6" (10.16 x 15.24 cm)' :
                  labelSize() === '2.3x4' ? '2.3" x 4" (5.84 x 10.16 cm)' :
                  labelSize() === '2.31x4' ? '2.31" x 4" (5.87 x 10.16 cm)' :
                  '1" x 2.5" (2.54 x 6.35 cm)'
                }
              </p>
              <p style={{ color: '#999', 'font-size': '0.75rem', 'margin-top': '0.5rem' }}>
                {isExpressShipping() ? '⚡ Express Shipping - Diseño simplificado' : '📦 Regular Shipping - Diseño completo'}
              </p>
            </div>

            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '2rem',
              'align-items': 'center',
              padding: '2rem',
              background: '#f5f5f5',
              'border-radius': '8px',
              'min-height': '400px'
            }}>
              {/* 2.31x4 Express Label Preview */}
              <Show when={labelSize() === '2.31x4'}>
                <For each={props.invoice.bulks}>
                  {(bulk) => {
                    const qrCodeUrl = qrCodeUrls().get(bulk.id);
                    return (
                      <div class="label-2-31x4" style={{
                        'box-shadow': '0 4px 6px rgba(0,0,0,0.1)',
                        margin: '1rem 0'
                      }}>
                        <div class="label-express-qr-container">
                          <Show when={qrCodeUrl}>
                            <img src={qrCodeUrl} alt="QR Code" class="label-express-qr" />
                          </Show>
                        </div>
                        <div class="label-express-bulk-name">{bulk.name}</div>
                      </div>
                    );
                  }}
                </For>
              </Show>

              {/* 1x2.5 Express Label Preview */}
              <Show when={labelSize() === '1x2.5'}>
                <For each={props.invoice.bulks}>
                  {(bulk) => {
                    const qrCodeUrl = qrCodeUrls().get(bulk.id);
                    return (
                      <div class="label-1x2-5" style={{
                        'box-shadow': '0 4px 6px rgba(0,0,0,0.1)',
                        margin: '1rem 0'
                      }}>
                        <div class="label-express-compact-qr-container">
                          <Show when={qrCodeUrl}>
                            <img src={qrCodeUrl} alt="QR Code" class="label-express-compact-qr" />
                          </Show>
                        </div>
                        <div class="label-express-compact-bulk-name">{bulk.name}</div>
                      </div>
                    );
                  }}
                </For>
              </Show>

              {/* 4x6 Regular Label Preview */}
              <Show when={labelSize() === '4x6'}>
                <For each={props.invoice.bulks}>
                  {(bulk) => {
                    const consignee = props.invoice.shipper_consignee;
                    const qrCodeUrl = qrCodeUrls().get(bulk.id);
                    const consigneeName = consignee.cid
                      ? `${consignee.firstName || ''} ${consignee.lastName || ''}`.trim()
                      : consignee.name;

                    return (
                      <div class="label-4x6" style={{
                        'box-shadow': '0 4px 6px rgba(0,0,0,0.1)',
                        margin: '1rem 0',
                        position: 'relative'
                      }}>
                        <div class="label-4x6-header">
                          <h2>YABA Express</h2>
                          <div class="label-4x6-subtitle">Shipping Label / Etiqueta de Envío</div>
                        </div>

                        <div class="label-4x6-content">
                          <div class="label-4x6-left">
                            <Show when={qrCodeUrl}>
                              <div class="label-4x6-qr-container">
                                <img src={qrCodeUrl} alt="QR Code" class="label-4x6-qr" />
                              </div>
                            </Show>

                            <div class="label-4x6-tracking">
                              <div class="label-4x6-tracking-label">Tracking Number:</div>
                              <div class="label-4x6-tracking-number">{props.invoice.invoice}-{bulk.id}</div>
                            </div>
                          </div>

                          <div class="label-4x6-right">
                            <div class="label-4x6-section-title">CONSIGNEE / DESTINATARIO</div>
                            <div class="label-4x6-consignee-name">{consigneeName}</div>

                            <Show when={consignee.cid}>
                              <div class="label-4x6-detail">
                                <span class="label-4x6-detail-label">CI/ID:</span>
                                <span class="label-4x6-detail-value">{consignee.cid}</span>
                              </div>
                            </Show>

                            <div class="label-4x6-detail">
                              <span class="label-4x6-detail-label">Phone:</span>
                              <span class="label-4x6-detail-value">{consignee.phoneNumber || consignee.phoneNumberS}</span>
                            </div>

                            <div class="label-4x6-bulk-info">
                              <div class="label-4x6-info-row">
                                <span class="label-4x6-info-label">Bulk:</span>
                                <span class="label-4x6-info-value">{bulk.name}</span>
                              </div>
                              <div class="label-4x6-info-row">
                                <span class="label-4x6-info-label">Weight:</span>
                                <span class="label-4x6-info-value">{bulk.currentWeight} lbs</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="label-4x6-footer">
                          <div>Invoice: {props.invoice.invoice}</div>
                          <div>{new Date(props.invoice.createDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>

              {/* 2.3x4 Regular Label Preview */}
              <Show when={labelSize() === '2.3x4'}>
                <For each={props.invoice.bulks}>
                  {(bulk) => {
                    const consignee = props.invoice.shipper_consignee;
                    const qrCodeUrl = qrCodeUrls().get(bulk.id);
                    const consigneeName = consignee.cid
                      ? `${consignee.firstName || ''} ${consignee.lastName || ''}`.trim()
                      : consignee.name;

                    return (
                      <div class="label-2x4" style={{
                        'box-shadow': '0 4px 6px rgba(0,0,0,0.1)',
                        margin: '1rem 0'
                      }}>
                        <div class="label-2x4-top">
                          <div class="label-2x4-brand">YABA Express</div>

                          <div class="label-2x4-main">
                            <div class="label-2x4-qr-section">
                              <Show when={qrCodeUrl}>
                                <img src={qrCodeUrl} alt="QR" class="label-2x4-qr" />
                              </Show>
                            </div>
                            <div class="label-2x4-info-section">
                              <div class="label-2x4-tracking">{props.invoice.invoice}</div>
                              <div class="label-2x4-tracking">{bulk.id}</div>
                            </div>
                          </div>
                        </div>

                        <div class="label-2x4-address-section">
                          <Show when={consignee.ybstreet}>
                            <div class="label-2x4-address">
                              {consignee.ybstreet} #{consignee.ybstreetNo}, {consignee.ybcity}
                            </div>
                          </Show>
                          <Show when={!consignee.ybstreet}>
                            <div class="label-2x4-address">{consignee.address || consignee.addressS}</div>
                          </Show>
                        </div>

                        <div class="label-2x4-info-section">
                          <div class="label-2x4-consignee">{consigneeName}</div>
                          <Show when={consignee.cid}>
                            <div class="label-2x4-ci">CI: {consignee.cid}</div>
                          </Show>
                          <div class="label-2x4-phone">{consignee.phoneNumber || consignee.phoneNumberS}</div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              'margin-top': '2rem',
              'justify-content': 'center'
            }}>
              <button
                onClick={() => {
                  setShowLabelPreview(false);
                  executePrintLabels(labelSize());
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600'
                }}
              >
                🖨️ Imprimir
              </button>

              <button
                onClick={() => {
                  setShowLabelPreview(false);
                  generateLabelPDF(labelSize());
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600'
                }}
              >
                📄 Generar PDF
              </button>

              <button
                onClick={() => setShowLabelPreview(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '1rem',
                  'font-weight': '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Shipping Labels - Only visible when printing */}
      <Show when={showShippingLabels()}>
        <div class="shipping-labels-container">
          {/* 4x6 Label Design */}
          <Show when={labelSize() === '4x6'}>
            <For each={props.invoice.bulks}>
              {(bulk) => {
                const consignee = props.invoice.shipper_consignee;
                const qrCodeUrl = qrCodeUrls().get(bulk.id);
                const consigneeName = consignee.cid
                  ? `${consignee.firstName || ''} ${consignee.lastName || ''}`.trim()
                  : consignee.name;
                const address = consignee.cid
                  ? `${consignee.ybstreet || ''} #${consignee.ybstreetNo || ''}, ${consignee.ybreparto || ''}, ${consignee.ybcity || ''}, ${consignee.ybestate || ''}`
                  : consignee.address || consignee.addressS || '';

                return (
                  <div class="label-4x6">
                    <div class="label-4x6-header">
                      <h2>YABA Express</h2>
                      <div class="label-4x6-subtitle">Shipping Label / Etiqueta de Envío</div>
                    </div>

                    <div class="label-4x6-content">
                      <div class="label-4x6-left">
                        <Show when={qrCodeUrl}>
                          <div class="label-4x6-qr-container">
                            <img src={qrCodeUrl} alt="QR Code" class="label-4x6-qr" />
                          </div>
                        </Show>

                        <div class="label-4x6-tracking">
                          <div class="label-4x6-tracking-label">Tracking Number:</div>
                          <div class="label-4x6-tracking-number">{props.invoice.invoice}-{bulk.id}</div>
                        </div>

                       
                      </div>

                      <div class="label-4x6-right">
                        <div class="label-4x6-section-title">CONSIGNEE / DESTINATARIO</div>
                        <div class="label-4x6-consignee-name">{consigneeName}</div>

                        <Show when={consignee.cid}>
                          <div class="label-4x6-detail">
                            <span class="label-4x6-detail-label">CI/ID:</span>
                            <span class="label-4x6-detail-value">{consignee.cid}</span>
                          </div>
                        </Show>

                        <div class="label-4x6-detail">
                          <span class="label-4x6-detail-label">Phone:</span>
                          <span class="label-4x6-detail-value">{consignee.phoneNumber || consignee.phoneNumberS}</span>
                        </div>
                         <div class="label-4x6-bulk-info">
                          <div class="label-4x6-info-row">
                            <span class="label-4x6-info-label">Bulk:</span>
                            <span class="label-4x6-info-value">{bulk.name}</span>
                          </div>
                          <div class="label-4x6-info-row">
                            <span class="label-4x6-info-label">Weight:</span>
                            <span class="label-4x6-info-value">{bulk.currentWeight} lbs</span>
                          </div>
                          <div class="label-4x6-info-row">
                            <span class="label-4x6-info-label">Method:</span>
                            <span class="label-4x6-info-value">{bulk.shippingMethod}</span>
                          </div>
                        </div>
                       
                      </div>
                    </div>

                    <div class="label-4x6-footer">
                      <div>

                    
                        <div class="label-4x6-section-title">ADDRESS / DIRECCIÓN</div>
                       

                        <Show when={consignee.address}>
                           <div class="label-4x6-address">{consignee.address}</div>
                        </Show>

                        <Show when={consignee.ybapt!}>
                          <div class="label-4x6-address-extra">Apt: {consignee.ybapt}</div>
                        </Show>
                      </div>
                    </div>
                    <div class="label-4x6-footer">
                      <div>Invoice: {props.invoice.invoice}</div>
                      <div>{new Date(props.invoice.createDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>

          {/* 2.3x4 Label Design - Compact version */}
          <Show when={labelSize() === '2.3x4'}>
            <For each={props.invoice.bulks}>
              {(bulk) => {
                const consignee = props.invoice.shipper_consignee;
                const qrCodeUrl = qrCodeUrls().get(bulk.id);
                const consigneeName = consignee.cid
                  ? `${consignee.firstName || ''} ${consignee.lastName || ''}`.trim()
                  : consignee.name;

                return (
                  <div class="label-2x4">
                    <div class="label-2x4-top">
                      <div class="label-2x4-brand">YABA Express</div>

                      <div class="label-2x4-main">
                        <div class="label-2x4-qr-section">
                          <Show when={qrCodeUrl}>
                            <img src={qrCodeUrl} alt="QR" class="label-2x4-qr" />
                          </Show>
                        </div>
                       <div class="label-2x4-info-section">
                        <div class="label-2x4-tracking">{props.invoice.invoice}</div>
                        <div class="label-2x4-tracking">{bulk.id}</div>
                       </div>
                      </div>
                    </div>

                    <div class="label-2x4-address-section">
                      <Show when={consignee.ybstreet}>
                        <div class="label-2x4-address">
                          {consignee.ybstreet} #{consignee.ybstreetNo}, {consignee.ybcity}
                        </div>
                      </Show>
                      <Show when={!consignee.ybstreet}>
                      
                        <div class="label-2x4-address">{consignee.address || consignee.addressS}</div>
                      </Show>
                    </div>
                    <div class="label-2x4-info-section">
                        <div class="label-2x4-consignee">{consigneeName}</div>
                        <Show when={consignee.cid}>
                          <div class="label-2x4-ci">CI: {consignee.cid}</div>
                        </Show>
                        <div class="label-2x4-phone">{consignee.phoneNumber || consignee.phoneNumberS}</div>
                      </div>
                  </div>
                );
              }}
            </For>
          </Show>

          {/* 2.31x4 Express Label Design - Minimal (QR + Bulk Name only) */}
          <Show when={labelSize() === '2.31x4'}>
            <For each={props.invoice.bulks}>
              {(bulk) => {
                const qrCodeUrl = qrCodeUrls().get(bulk.id);

                return (
                  <div class="label-2-31x4">
                    <div class="label-express-qr-container">
                      <Show when={qrCodeUrl}>
                        <img src={qrCodeUrl} alt="QR Code" class="label-express-qr" />
                      </Show>
                    </div>
                    <div class="label-express-bulk-name">{bulk.name}</div>
                  </div>
                );
              }}
            </For>
          </Show>

          {/* 1x2.5 Express Label Design - Ultra Compact (QR + Bulk Name only) */}
          <Show when={labelSize() === '1x2.5'}>
            <For each={props.invoice.bulks}>
              {(bulk) => {
                const qrCodeUrl = qrCodeUrls().get(bulk.id);

                return (
                  <div class="label-1x2-5">
                    <div class="label-express-compact-qr-container">
                      <Show when={qrCodeUrl}>
                        <img src={qrCodeUrl} alt="QR Code" class="label-express-compact-qr" />
                      </Show>
                    </div>
                    <div class="label-express-compact-bulk-name">{bulk.name}</div>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>
      </Show>

      <style>{`
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        /* Shipping Labels Styles */
        .shipping-labels-container {
          display: none;
        }

        @media print {
          /* Hide everything except labels when printing */
          body * {
            visibility: hidden;
          }

          .shipping-labels-container,
          .shipping-labels-container *,
          .label-4x6,
          .label-4x6 *,
          .label-2x4,
          .label-2x4 *,
          .label-2-31x4,
          .label-2-31x4 *,
          .label-1x2-5,
          .label-1x2-5 * {
            visibility: visible !important;
          }

          .shipping-labels-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }

          /* Hide all invoice content */
          .invoice-display > *:not(.shipping-labels-container) {
            display: none !important;
          }

          /* Remove all margins and padding from body and html */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100%;
            height: 100%;
          }

          .invoice-display {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
          }

          /* ==================== 4x6 LABEL DESIGN ==================== */
          .label-4x6 {
            width: 6in;
            height: 4in;
            page-break-after: always;
            padding: 0;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            font-family: 'Arial', sans-serif;
            margin: 0;
            background: white;
            border: 0px solid #000;
          }

          .label-4x6:last-child {
            page-break-after: auto;
          }

          .label-4x6-header {
            color: #000;
            text-align: center;
            padding: 0.15in 0;
          }

          .label-4x6-header h2 {
            margin: 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 3px;
          }

          .label-4x6-subtitle {
            font-size: 9px;
            margin-top: 4px;
            opacity: 0.9;
            letter-spacing: 1px;
          }

          .label-4x6-content {
            display: flex;
            flex: 1;
          }

          .label-4x6-left {
            width: 2.6in;
            background: #f8f8f8;
            padding: 0.15in;
            border-right: 3px solid #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .label-4x6-right {
            flex: 1;
            padding: 0.15in;
            display: flex;
            flex-direction: column;
          }

          .label-4x6-qr-container {
            background: white;
            padding: 0.1in;
            border: 0px solid #000;
            margin-bottom: 0.12in;
          }

          .label-4x6-qr {
            display: block;
            width: 1.6in;
            height: 1.6in;
          }

          .label-4x6-tracking {
            color:  #000;
            padding: 0.1in;
            text-align: center;
            margin-bottom: 0.12in;
            width: 100%;
          }

          .label-4x6-tracking-label {
            font-size: 7px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .label-4x6-tracking-number {
            font-size: 10px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            word-break: break-all;
            line-height: 1.3;
          }

          .label-4x6-bulk-info {
            width: 100%;
          }

          .label-4x6-info-row {
            background: white;
            padding: 0.06in;
            margin-bottom: 0.04in;
            border-left: 0px solid #000;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
          }

          .label-4x6-info-label {
            font-size: 11px;
            font-weight: 600;
            color: #000;
          }

          .label-4x6-info-value {
            font-size: 17px;
            font-weight: bold;
            color: #000;
          }

          .label-4x6-section-title {
           
            color:  #000;
            padding: 0.08in;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.1in;
          }

          .label-4x6-consignee-name {
            font-size: 18px;
            font-weight: bold;
            padding: 0.1in;
            background: #f0f0f0;
            border-left: 3px solid #000;
            margin-bottom: 0.12in;
            line-height: 1.2;
          }

          .label-4x6-detail {
            display: flex;
            padding: 0.06in 0;
            border-bottom: 0px solid #ddd;
            gap: 0.1in;
          }

          .label-4x6-detail-label {
            font-weight: bold;
            font-size: 10px;
            color: #000;
            min-width: 0.6in;
          }

          .label-4x6-detail-value {
            font-size: 19px;
            font-weight: 600;
            color: #000;
          }

          .label-4x6-address {
            background: #f8f8f8;
            padding: 0.12in;
            border-left: 0px solid #000;
            font-size: 11px;
            line-height: 1.5;
            font-weight: 500;
            margin-top: 0.05in;
          }

          .label-4x6-address-extra {
            padding-left: 0.12in;
            margin-top: 0.04in;
            font-size: 10px;
            color: #000;
            font-style: italic;
          }

          .label-4x6-footer {
            background: #f0f0f0;
            border-top: 3px solid #000;
            padding: 0.08in 0.15in;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            font-weight: bold;
          }

          /* ==================== 2.3x4 COMPACT LABEL DESIGN ==================== */
          .label-2x4 {
            width: 4in;
            height: 2.3in;
            page-break-after: always;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
            margin: 0;
            background: white;
            border: 0px solid #000;
            display: flex;
            flex-direction: column;
          }

          .label-2x4:last-child {
            page-break-after: auto;
          }

          .label-2x4-top {
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .label-2x4-brand {
            background: #000;
            color: white;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
            padding: 0.08in 0;
          }

          .label-2x4-main {
            display: flex;
            flex: 1;
          }

          .label-2x4-qr-section {
            width: 1.9in;
            background: #f8f8f8;
            padding: 0.1in;
            border-right: 0px solid #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .label-2x4-qr {
            width: 1.95in;
            height: 1.95in;
            background: white;
            padding: 0.05in;
            border: 0px solid #000;
            margin-bottom: 0.06in;
          }

          .label-2x4-tracking {
            font-size: 11px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            text-align: center;
            color: #000;
            padding: 0.04in;
            word-break: break-all;
            line-height: 1.2;
            width: 100%;
          }

          .label-2x4-info-section {
            flex: 1;
            padding: 0.1in;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
          }

          .label-2x4-consignee {
            font-size: 13px;
            font-weight: bold;
            padding-bottom: 0.04in;
            border-bottom: 1px solid #000;
            margin-bottom: 0.04in;
            line-height: 1.1;
          }

          .label-2x4-ci {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 0.02in;
          }

          .label-2x4-phone {
            font-size: 15px;
            font-weight: 600;
            color: #000;
            margin-bottom: 0.04in;
          }

          .label-2x4-weight {
            font-size: 9px;
            font-weight: bold;
            background: #000;
            color: white;
            padding: 0.03in 0.06in;
            display: inline-block;
          }

          .label-2x4-address-section {
            background: #f8f8f8;
            border-top: 0px solid #000;
            padding: 0.08in;
          }

          .label-2x4-address {
            font-size: 7px;
            font-weight: 600;
            line-height: 1.4;
            color: #000;
          }

          /* ==================== 2.31x4 EXPRESS LABEL DESIGN ==================== */
          .label-2-31x4 {
            width: 2.31in;
            height: 4in;
            page-break-after: always;
            padding: 0.15in;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
            margin: 0;
            background: white;
            border: 2px solid #000;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 0.15in;
            transform: rotate(90deg);
            transform-origin: center center;
            position: relative;
            left: 0.845in;
          }

          .label-2-31x4:last-child {
            page-break-after: auto;
          }

          .label-express-qr-container {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .label-express-qr {
            width: 1.8in;
            height: 1.8in;
            display: block;
          }

          .label-express-bulk-name {
            flex: 1;
            font-size: 24px;
            font-weight: bold;
            color: #000;
            padding: 0.15in;
            background: #f0f0f0;
            border: 2px solid #000;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            word-wrap: break-word;
            line-height: 1.3;
          }

          /* ==================== 1x2.5 EXPRESS COMPACT LABEL DESIGN ==================== */
          .label-1x2-5 {
            width: 1in;
            height: 2.5in;
            page-break-after: always;
            padding: 0.08in;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
            margin: 0;
            background: white;
            border: 2px solid #000;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 0.08in;
            transform: rotate(90deg);
            transform-origin: center center;
            position: relative;
            left: 0.75in;
          }

          .label-1x2-5:last-child {
            page-break-after: auto;
          }

          .label-express-compact-qr-container {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .label-express-compact-qr {
            width: 0.75in;
            height: 0.75in;
            display: block;
          }

          .label-express-compact-bulk-name {
            flex: 1;
            font-size: 16px;
            font-weight: bold;
            color: #000;
            text-align: center;
            padding: 0.08in;
            background: #f0f0f0;
            border: 2px solid #000;
            word-wrap: break-word;
            line-height: 1.2;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Set page size based on label size */
          @page {
            margin: 0;
            size: auto;
          }

          /* Page size for 2.31x4 labels - portrait page to allow rotation */
          .label-2-31x4 {
            page: label-2-31x4-page;
          }

          @page label-2-31x4-page {
            size: 2.31in 4in portrait;
            margin: 0;
          }

          /* Page size for 1x2.5 labels - portrait page to allow rotation */
          .label-1x2-5 {
            page: label-1x2-5-page;
          }

          @page label-1x2-5-page {
            size: 1in 2.5in portrait;
            margin: 0;
          }
        }

        /* Screen styles for all labels */

        /* 4x6 Label */
        .label-4x6 {
          width: 6in;
          height: 4in;
          padding: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          font-family: 'Arial', sans-serif;
          margin: 1rem auto;
          background: white;
          border: 2px solid #000;
        }

        .label-4x6-header {
          color: #000;
          text-align: center;
          padding: 0.15in 0;
        }

        .label-4x6-header h2 {
          margin: 0;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 3px;
        }

        .label-4x6-subtitle {
          font-size: 9px;
          margin-top: 4px;
          opacity: 0.9;
          letter-spacing: 1px;
        }

        .label-4x6-content {
          display: flex;
          flex: 1;
        }

        .label-4x6-left {
          width: 2.6in;
          background: #f8f8f8;
          padding: 0.15in;
          border-right: 3px solid #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .label-4x6-right {
          flex: 1;
          padding: 0.15in;
          display: flex;
          flex-direction: column;
        }

        .label-4x6-qr-container {
          background: white;
          padding: 0.1in;
          margin-bottom: 0.12in;
        }

        .label-4x6-qr {
          display: block;
          width: 1.6in;
          height: 1.6in;
        }

        .label-4x6-tracking {
          color: #000;
          padding: 0.1in;
          text-align: center;
          margin-bottom: 0.12in;
          width: 100%;
        }

        .label-4x6-tracking-label {
          font-size: 7px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .label-4x6-tracking-number {
          font-size: 10px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          word-break: break-all;
          line-height: 1.3;
        }

        .label-4x6-section-title {
          color: #000;
          padding: 0.08in;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.1in;
        }

        .label-4x6-consignee-name {
          font-size: 18px;
          font-weight: bold;
          padding: 0.1in;
          background: #f0f0f0;
          border-left: 3px solid #000;
          margin-bottom: 0.12in;
          line-height: 1.2;
        }

        .label-4x6-detail {
          display: flex;
          padding: 0.06in 0;
          gap: 0.1in;
        }

        .label-4x6-detail-label {
          font-weight: bold;
          font-size: 10px;
          color: #000;
          min-width: 0.6in;
        }

        .label-4x6-detail-value {
          font-size: 19px;
          font-weight: 600;
          color: #000;
        }

        .label-4x6-bulk-info {
          width: 100%;
        }

        .label-4x6-info-row {
          background: white;
          padding: 0.06in;
          margin-bottom: 0.04in;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
        }

        .label-4x6-info-label {
          font-size: 11px;
          font-weight: 600;
          color: #000;
        }

        .label-4x6-info-value {
          font-size: 17px;
          font-weight: bold;
          color: #000;
        }

        .label-4x6-footer {
          background: #f0f0f0;
          border-top: 3px solid #000;
          padding: 0.08in 0.15in;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          font-weight: bold;
        }

        /* 2.3x4 Label */
        .label-2x4 {
          width: 4in;
          height: 2.3in;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
          margin: 1rem auto;
          background: white;
          border: 2px solid #000;
          display: flex;
          flex-direction: column;
        }

        .label-2x4-top {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .label-2x4-brand {
          background: #000;
          color: white;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 2px;
          padding: 0.08in 0;
        }

        .label-2x4-main {
          display: flex;
          flex: 1;
        }

        .label-2x4-qr-section {
          width: 1.9in;
          background: #f8f8f8;
          padding: 0.1in;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .label-2x4-qr {
          width: 1.95in;
          height: 1.95in;
          background: white;
          padding: 0.05in;
          margin-bottom: 0.06in;
        }

        .label-2x4-tracking {
          font-size: 11px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          text-align: center;
          color: #000;
          padding: 0.04in;
          word-break: break-all;
          line-height: 1.2;
          width: 100%;
        }

        .label-2x4-info-section {
          flex: 1;
          padding: 0.1in;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
        }

        .label-2x4-consignee {
          font-size: 13px;
          font-weight: bold;
          padding-bottom: 0.04in;
          border-bottom: 1px solid #000;
          margin-bottom: 0.04in;
          line-height: 1.1;
        }

        .label-2x4-ci {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.02in;
        }

        .label-2x4-phone {
          font-size: 15px;
          font-weight: 600;
          color: #000;
          margin-bottom: 0.04in;
        }

        .label-2x4-address-section {
          background: #f8f8f8;
          padding: 0.08in;
        }

        .label-2x4-address {
          font-size: 7px;
          font-weight: 600;
          line-height: 1.4;
          color: #000;
        }

        /* Express labels - horizontal layout */
        .label-2-31x4 {
          width: 4in;
          height: 2.31in;
          padding: 0.15in;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
          margin: 1rem auto;
          background: white;
          border: 2px solid #000;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 0.15in;
        }

        .label-express-qr-container {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .label-express-qr {
          width: 1.8in;
          height: 1.8in;
          display: block;
        }

        .label-express-bulk-name {
          flex: 1;
          font-size: 24px;
          font-weight: bold;
          color: #000;
          padding: 0.15in;
          background: #f0f0f0;
          border: 2px solid #000;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          word-wrap: break-word;
          line-height: 1.3;
        }

        .label-1x2-5 {
          width: 2.5in;
          height: 1in;
          padding: 0.08in;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
          margin: 1rem auto;
          background: white;
          border: 2px solid #000;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 0.08in;
        }

        .label-express-compact-qr-container {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .label-express-compact-qr {
          width: 0.75in;
          height: 0.75in;
          display: block;
        }

        .label-express-compact-bulk-name {
          flex: 1;
          font-size: 16px;
          font-weight: bold;
          color: #000;
          text-align: center;
          padding: 0.08in;
          background: #f0f0f0;
          border: 2px solid #000;
          word-wrap: break-word;
          line-height: 1.2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media screen {
          .invoice-display {
            box-shadow: none !important;
            padding: 0 !important;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* AI Rule Generator Modal */}
      <AIRuleGeneratorModal
        isOpen={showAIRuleModal()}
        onClose={() => setShowAIRuleModal(false)}
        initialData={getInvoiceDataForAI()}
        initialEventType="invoice_generated"
        dataSource="invoice"
        sourceId={props.invoice?.invoice}
        onRuleCreated={(rule) => {
          devLog('Rule created from invoice:', rule);
          setShowAIRuleModal(false);
        }}
      />

      {/* Entry Book Preview Modal */}
      <EntryBookPreviewModal
        isOpen={showEntryBookPreview()}
        onClose={() => setShowEntryBookPreview(false)}
        previewData={entryBookPreviewData()}
        onSave={handleEntryBookSaved}
        sourceDocument={props.invoice}
      />
    </div>
  );
};

export default InvoiceDisplay;


