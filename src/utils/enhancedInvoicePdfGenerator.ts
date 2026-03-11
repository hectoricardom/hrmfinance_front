import jsPDF from 'jspdf';

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
}

interface PaymentMethod {
  cash: number;
  zelle: number;
  creditCard: number;
}

interface ShipperConsignee {
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
	phoneNumberS?: string;
  cid?: string;
  passport?: string;
  address?: string;
  fullName?: string
}

interface EnhancedInvoice {
  invoice: string;
  description: string;
  store: string;
  createDate: number;
  shipper_consignee: ShipperConsignee;
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  services?: InvoiceService[];
  shippingMethod?: 'aereo' | 'maritimo' | '';
  taxPercent: number;
  taxOnTotal: boolean;
  exemptTaxOnCash: boolean;
  paymentMethods: PaymentMethod;
  productSubtotal: number;
  reservaSubtotal: number;
  serviceSubtotal?: number;
  subtotalBeforeTax: number;
  taxAmount: number;
  taxSavings?: number;
  total: number;
  cashPaymentRatio?: number;
}

const translations = {
  es: {
    invoice: 'FACTURA',
    invoiceNumber: 'Número de Factura',
    date: 'Fecha',
    customer: 'Cliente',
    store: 'Tienda',
    phone: 'Teléfono',
    id: 'Identificación',
    address: 'Dirección',
    shippingMethod: 'Método de Envío',
    aerial: 'Aéreo',
    maritime: 'Marítimo',
    products: 'PRODUCTOS',
    services: 'SERVICIOS Y RESERVAS',
    item: 'Artículo',
    code: 'Código',
    qty: 'Cant.',
    price: 'Precio',
    arancel: 'Arancel',
    total: 'Total',
    subtotal: 'Subtotal',
    subtotalProducts: 'Subtotal Productos',
    subtotalServices: 'Subtotal Servicios',
    tax: 'Impuesto',
    taxSavings: 'Ahorro Impuesto',
    grandTotal: 'TOTAL GENERAL',
    paymentMethods: 'MÉTODOS DE PAGO',
    cash: 'Efectivo',
    zelle: 'Zelle',
    creditCard: 'Tarjeta',
    totalPaid: 'Total Pagado',
    taxExemption: 'Exención por Efectivo',
    thankYou: '¡Gracias por su compra!',
    footer: 'Esta factura es válida como comprobante de compra',
    originalTax: 'Impuesto Original',
    finalTax: 'Impuesto Final',
    cashBenefit: 'Beneficio por Pago en Efectivo'
  },
  en: {
    invoice: 'INVOICE',
    invoiceNumber: 'Invoice Number',
    date: 'Date',
    customer: 'Customer',
    store: 'Store',
    phone: 'Phone',
    id: 'ID',
    address: 'Address',
    shippingMethod: 'Shipping Method',
    aerial: 'Air',
    maritime: 'Sea',
    products: 'PRODUCTS',
    services: 'SERVICES & RESERVATIONS',
    item: 'Item',
    code: 'Code',
    qty: 'Qty',
    price: 'Price',
    arancel: 'Tariff',
    total: 'Total',
    subtotal: 'Subtotal',
    subtotalProducts: 'Products Subtotal',
    subtotalServices: 'Services Subtotal',
    tax: 'Tax',
    taxSavings: 'Tax Savings',
    grandTotal: 'GRAND TOTAL',
    paymentMethods: 'PAYMENT METHODS',
    cash: 'Cash',
    zelle: 'Zelle',
    creditCard: 'Credit Card',
    totalPaid: 'Total Paid',
    taxExemption: 'Cash Exemption',
    thankYou: 'Thank you for your purchase!',
    footer: 'This invoice is valid as proof of purchase',
    originalTax: 'Original Tax',
    finalTax: 'Final Tax',
    cashBenefit: 'Cash Payment Benefit'
  }
};

export const generateEnhancedInvoicePDF = async (
  invoiceData: EnhancedInvoice,
  language: 'es' | 'en' = 'es',
  style: 'modern' | 'classic' | 'compact' = 'modern'
): Promise<string> => {
  const t = translations[language];
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // PDF dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8; // Compact margins for better space usage
  const contentWidth = pageWidth - (margin * 2);
  const maxContentY = pageHeight - 15; // Leave space for footer
  
  let currentY = margin;
  
	console.log({invoiceData})
		
		try{
		// Colors
		const primaryColor = '#bcbcbc' || '#2563eb';
		const secondaryColor = '#64748b';
		const accentColor =  '#10b981';
		const warningColor = '#f59e0b';
		const paymentColor = '#bababa' || '#6366f1';

		
		
		// Helper functions
		const formatCurrency = (amount: any) => {
			if(!amount){
				return "-"
			}
			return	`$${parseFloat(amount.toString())?.toFixed(2)}`;
		};

		const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US');
		
		// Check if content will exceed page and add new page if needed
		const checkPageBreak = (requiredHeight: number) => {
			if (currentY + requiredHeight > maxContentY) {
				doc.addPage();
				currentY = margin;
				return true;
			}
			return false;
		};
		
		const isV = (v: string):string =>{
					return v? " "+v: "";
		}
		
		const trimString = (v: string):string =>{
					return isV(v).trim();
		}
		
		
		const parse2Fl = (v: any):number =>{
				return parseFloat(v?.toString()) || 0;
		}
		
		const totalRese = (v: any):string =>{
			let qty = parse2Fl(v.qty);
			let price = parse2Fl(v.price);
			let arancel = parse2Fl(v.arancel);
				
			let amount = qty*price+arancel
			return `${amount?.toFixed(2)}`
		}
		
		
		const totalSubProd = (v: any):string =>{
			let qty = Math.abs(v.qty);
			let price = parse2Fl(v.salePrice);
			let amount = qty*price;
     
			return `${amount?.toFixed(2)}`
		}
		
		const sanitazeShipperName = ():string => {
				let shp:any = invoiceData?.shipper_consignee;
				return isV(shp?.fullName).trim() || isV(shp?.name).trim();
		}
		const sanitazeConsigneeName = ():string => {
				let shp:any = invoiceData?.shipper_consignee;
				return `${isV(shp?.firstName)}${isV(shp?.middleName)}${isV(shp?.lastName)}${isV(shp?.lastName2)}`.trim();
		}
		const sanitazeConsigneeAddress = ():string => {
				let shp:any = invoiceData?.shipper_consignee;
				let  address = `Calle ${shp.ybstreet}${shp.ybstreetNo?" # " + shp.ybstreetNo: ""}${shp.ybbetwen1? " / "+shp.ybbetwen1 : ""}${shp.ybbetwen2?" y "+shp.ybbetwen2: ""}${shp.ybreparto?", Rpto "+shp.ybreparto: ""}, ${shp.ybcity?shp.ybcity:""}, ${shp.ybestate?shp.ybestate:""}`
      
				return isV(shp?.address)? isV(shp?.address) : address;
		}
		
		const addText = (text: string, x: number, y: number, options: any = {}) => {
			doc.setFontSize(options.fontSize || 8); // Smaller default font
			doc.setTextColor(options.color || '#000000');
			if (options.bold) doc.setFont('helvetica', 'bold');
			else doc.setFont('helvetica', 'normal');
			
			if (options.align === 'center') {
				doc.text(text, x, y, { align: 'center' });
			} else if (options.align === 'right') {
				doc.text(text, x, y, { align: 'right' });
			} else {
				doc.text(text, x, y);
			}
		};
		
		const addLine = (x1: number, y1: number, x2: number, y2: number, color: string = '#e2e8f0') => {
			doc.setDrawColor(color);
			doc.line(x1, y1, x2, y2);
		};
		
		const addBox = (x: number, y: number, width: number, height: number, fillColor?: string, borderColor?: string) => {
			if (fillColor) {
				doc.setFillColor(fillColor);
				doc.rect(x, y, width, height, 'F');
			}
			if (borderColor) {
				doc.setDrawColor(borderColor);
				doc.rect(x, y, width, height, 'S');
			}
		};
		
		// Header Section
		addBox(margin, currentY, contentWidth, 18, primaryColor);

		addText(t.invoice, pageWidth / 2, currentY + 12, { 
			fontSize: 16, 
			bold: true, 
			color: '#ffffff', 
			align: 'center' 
		});

		//currentY += 22;
		currentY += 6;
		
		// MSC2490746993
		// Invoice Info Section
		const leftCol = margin + 3;
		const rightCol = pageWidth - margin - 60;
		
		addText(`${t.invoiceNumber}:`, leftCol, currentY, { bold: true, fontSize: 8 });
		addText(invoiceData.invoice, leftCol + 30, currentY, { fontSize: 8 });
		addText(`${t.date}:`, rightCol, currentY, { bold: true, fontSize: 8 });
		addText(formatDate(invoiceData.createDate), rightCol + 20, currentY, { fontSize: 8 });
		currentY += 6;
		
		addText(`${t.store}:`, leftCol, currentY, { bold: true, fontSize: 8 });
		addText(trimString(invoiceData?.store), leftCol + 20, currentY, { fontSize: 8 });
		
		if (invoiceData.shippingMethod) {
			addText(`${t.shippingMethod}:`, rightCol, currentY, { bold: true, fontSize: 8 });
			const shippingText = trimString(invoiceData?.shippingMethod) === 'aereo' ? t.aerial : t.maritime;
			addText(shippingText, rightCol + 30, currentY, { fontSize: 8 });
		}
		currentY += 10;
		
		
		
		// Customer Info Section
		addBox(margin, currentY, contentWidth, 5, '#f8fafc');
		addText(`${t.customer.toUpperCase()}`, margin + 83, currentY + 3, { bold: true, fontSize: 9 });
		currentY += 8;

		let shipS = [sanitazeShipperName()]
		
		
		addText( shipS.join(' • '),  leftCol, currentY, { bold: true, fontSize: 8 });
		currentY += 4;
		
		const customerSInfo = [];
		if (invoiceData?.shipper_consignee?.phoneNumberS) {
			customerSInfo.push(`${t.phone}: ${invoiceData?.shipper_consignee?.phoneNumberS}`);
		}
		addText( customerSInfo.join(' • '),  leftCol, currentY, { bold: false, fontSize: 7 });
		currentY += 4;
		
		// Customer Info Section
		addBox(margin, currentY, contentWidth, 5, '#f8fafc');
		addText(`DESTINATARIO`, margin + 83, currentY + 3, { bold: true, fontSize: 9 });
		currentY += 8;
		
		let consNmS = [sanitazeConsigneeName()]
		
		addText(consNmS.join(' • '), leftCol, currentY, { bold: true, fontSize: 8 });
		currentY += 4;
		
		// Combine customer info on fewer lines
		const customerInfo = [];
		if (invoiceData?.shipper_consignee?.phoneNumber) {
			customerInfo.push(`${t.phone}: ${invoiceData?.shipper_consignee?.phoneNumber}`);
		}
		if (invoiceData?.shipper_consignee?.cid) {
			customerInfo.push(`${t.id}: ${invoiceData?.shipper_consignee?.cid}`);
		}
		
		if (customerInfo.length > 0) {
			addText(customerInfo.join(' • '), leftCol, currentY, { fontSize: 7 });
			currentY += 4;
		}
		
		if (sanitazeConsigneeAddress()) {
			addText(`${t.address}: ${sanitazeConsigneeAddress()}`, leftCol, currentY, { fontSize: 7 });
			currentY += 4;
		}
		currentY += 6;











		// Services/Reservas Section
		if (invoiceData?.reservas?.length > 0) {
			checkPageBreak(25); // Check if we need space for services section
			
			addBox(margin, currentY, contentWidth, 5, paymentColor);
			addText(t.services, margin + 3, currentY + 3, { bold: true, fontSize: 9, color: '#ffffff' });
			currentY += 8;
			
			// Services Table Header
			const serviceColPositions = [margin + 2, margin + 50, margin + 75, margin + 105, margin + 140, margin + 170];
			
			addText(t.item, serviceColPositions[0], currentY, { bold: true, fontSize: 7 });
			addText(t.qty, serviceColPositions[1]+ 13, currentY, { bold: true, fontSize: 7, align: 'center' });
			addText(t.price, serviceColPositions[2]+ 20, currentY, { bold: true, fontSize: 7, align: 'right' });
			addText(t.arancel, serviceColPositions[3]+ 20, currentY, { bold: true, fontSize: 7, align: 'right' });
			addText(t.total, serviceColPositions[4]+ 35, currentY, { bold: true, fontSize: 7, align: 'right' });
			currentY += 2;
			
			addLine(margin, currentY, margin + contentWidth, currentY);
			currentY += 3;
			
			// Services Data
			invoiceData?.reservas?.forEach((reserva, index) => {
				if (index > 0 && index % 8 === 0) checkPageBreak(4); // Page break every 8 items
				
				let totalRes = totalRese(reserva);
				addText(reserva.type.substring(0, 25), serviceColPositions[0], currentY, { fontSize: 7 });
				addText(reserva.qty.toString(), serviceColPositions[1] + 13, currentY, { fontSize: 7, align: 'center' });
				addText(formatCurrency(reserva?.price), serviceColPositions[2] + 20, currentY, { fontSize: 7, align: 'right' });
				addText(formatCurrency(reserva?.arancel), serviceColPositions[3] + 25, currentY, { fontSize: 7, align: 'right' });
				addText( totalRes, serviceColPositions[4] + 35, currentY, { fontSize: 7, align: 'right' });
				currentY += 4;
			});
			
			// Services Subtotal
			currentY += 2;
			addLine(margin + 75, currentY, margin + contentWidth, currentY);
			currentY += 3;
			addText(`${t.subtotalServices}:`, serviceColPositions[3] - 5, currentY, { bold: true, fontSize: 7 });
			addText(formatCurrency(invoiceData?.reservaSubtotal), serviceColPositions[4] + 35, currentY, { 
				bold: true, 
				fontSize: 7, 
				align: 'right' 
			});
			currentY += 6;
		}

		// Additional Services Section (separate from reservas)
		if (invoiceData?.services?.length > 0) {
			checkPageBreak(25); // Check if we need space for services section
			
			addBox(margin, currentY, contentWidth, 5, accentColor);
			addText('SERVICIOS ADICIONALES', margin + 3, currentY + 3, { bold: true, fontSize: 9, color: '#ffffff' });
			currentY += 8;
			
			// Services Table Header
			const additionalServiceColPositions = [margin + 2, margin + 50, margin + 75, margin + 105, margin + 140, margin + 170];
			
			addText(t.item, additionalServiceColPositions[0], currentY, { bold: true, fontSize: 7 });
			addText(t.qty, additionalServiceColPositions[1]+ 13, currentY, { bold: true, fontSize: 7, align: 'center' });
			addText(t.price, additionalServiceColPositions[2]+ 20, currentY, { bold: true, fontSize: 7, align: 'right' });
			addText(t.arancel, additionalServiceColPositions[3]+ 20, currentY, { bold: true, fontSize: 7, align: 'right' });
			addText(t.total, additionalServiceColPositions[4]+ 35, currentY, { bold: true, fontSize: 7, align: 'right' });
			currentY += 2;
			
			addLine(margin, currentY, margin + contentWidth, currentY);
			currentY += 3;
			
			// Services Data
			invoiceData?.services?.forEach((service, index) => {
				if (index > 0 && index % 8 === 0) checkPageBreak(4); // Page break every 8 items
				
				const qty = parse2Fl(service.qty);
				const price = parse2Fl(service.price);
				const arancel = parse2Fl(service.arancel);
				const total = qty * price + arancel;
				
				addText(service.type.substring(0, 25), additionalServiceColPositions[0], currentY, { fontSize: 7 });
				addText(qty.toFixed(2), additionalServiceColPositions[1] + 13, currentY, { fontSize: 7, align: 'center' });
				addText(formatCurrency(service?.price), additionalServiceColPositions[2] + 20, currentY, { fontSize: 7, align: 'right' });
				addText(arancel > 0 ? formatCurrency(service?.arancel) : '-', additionalServiceColPositions[3] + 25, currentY, { fontSize: 7, align: 'right' });
				addText(formatCurrency(total), additionalServiceColPositions[4] + 35, currentY, { fontSize: 7, align: 'right' });
				currentY += 4;
			});
			
			// Additional Services Subtotal
			currentY += 2;
			addLine(margin + 75, currentY, margin + contentWidth, currentY);
			currentY += 3;
			addText('Subtotal Servicios:', additionalServiceColPositions[3] - 5, currentY, { bold: true, fontSize: 7 });
			addText(formatCurrency(invoiceData?.serviceSubtotal || 0), additionalServiceColPositions[4] + 35, currentY, { 
				bold: true, 
				fontSize: 7, 
				align: 'right' 
			});
			currentY += 6;
		}






		
		// Products Section
		if (invoiceData?.products?.length > 0) {
			checkPageBreak(30); // Check if we need space for products section
			
			addBox(margin, currentY, contentWidth, 5, primaryColor);
			addText(t.products, margin + 3, currentY + 3, { bold: true, fontSize: 9, color: '#ffffff' });
			currentY += 8;
			
			// Products Table Header
			const colPositions = [margin + 2, margin + 70, margin + 90, margin + 115, margin + 150];
			
			addText(t.item, colPositions[0], currentY, { bold: true, fontSize: 7 });
			addText(t.code, colPositions[1], currentY, { bold: true, fontSize: 7 });
			addText(t.qty, colPositions[2] + 8, currentY, { bold: true, fontSize: 7, align: 'center' });
			addText(t.price, colPositions[3] + 20, currentY, { bold: true, fontSize: 7, align: 'right' });
			addText(t.total, colPositions[4] + 25, currentY, { bold: true, fontSize: 7, align: 'right' });
			currentY += 2;
			
			addLine(margin, currentY, margin + contentWidth, currentY);
			currentY += 3;
			
			// Products Data
			invoiceData?.products?.forEach((product, index) => {
				if (index > 0 && index % 10 === 0) checkPageBreak(4); // Page break every 10 items
				
				addText(product.product.label.substring(0, 35), colPositions[0], currentY, { fontSize: 7 });
				addText(product.product.code, colPositions[1], currentY, { fontSize: 7 });
				addText(Math.abs(product.qty).toString(), colPositions[2] + 8, currentY, { fontSize: 7, align: 'center' });
				addText(formatCurrency(product.salePrice), colPositions[3] + 20, currentY, { fontSize: 7, align: 'right' });
				addText(totalSubProd(product), colPositions[4] + 25, currentY, { fontSize: 7, align: 'right' });
				currentY += 4;
			});
			
			// Products Subtotal
			currentY += 2;
			addLine(margin + 90, currentY, margin + contentWidth, currentY);
			currentY += 3;
			addText(`${t.subtotalProducts}:`, colPositions[3] - 5, currentY, { bold: true, fontSize: 7 });
			addText(formatCurrency(invoiceData.productSubtotal), colPositions[4] + 25, currentY, { 
				bold: true, 
				fontSize: 7, 
				align: 'right' 
			});
			currentY += 6;
		}
		
		
		// Payment Methods Section
		const totalPayments = invoiceData?.paymentMethods?.cash + invoiceData?.paymentMethods?.zelle + invoiceData.paymentMethods?.creditCard;
		
		if (totalPayments > 0) {
			checkPageBreak(20); // Check space for payment section
			
			addBox(margin, currentY, contentWidth, 5, paymentColor);
			addText(t.paymentMethods, margin + 3, currentY + 3, { bold: true, fontSize: 9, color: '#ffffff' });
			currentY += 8;
			
			// Payment breakdown - more compact
			const payments = [];
			if (invoiceData.paymentMethods.cash > 0) {
				payments.push(`${t.cash}: ${formatCurrency(invoiceData.paymentMethods.cash)}`);
			}
			if (invoiceData.paymentMethods.zelle > 0) {
				payments.push(`${t.zelle}: ${formatCurrency(invoiceData.paymentMethods.zelle)}`);
			}
			if (invoiceData.paymentMethods.creditCard > 0) {
				payments.push(`${t.creditCard}: ${formatCurrency(invoiceData.paymentMethods.creditCard)}`);
			}
			
			payments.forEach(payment => {
				addText(payment, margin + 3, currentY, { fontSize: 8 });
				currentY += 4;
			});
			
			addLine(margin, currentY, margin + contentWidth, currentY);
			currentY += 3;
			addText(`${t.totalPaid}:`, margin + 3, currentY, { bold: true, fontSize: 8 });
			addText(formatCurrency(totalPayments), margin + contentWidth - 3, currentY, { 
				bold: true, 
				fontSize: 8, 
				align: 'right' 
			});
			currentY += 6;
		}
		
		// Totals Section
		checkPageBreak(25); // Ensure totals section fits
		
		addBox(margin, currentY, contentWidth, 20, '#fff', '#e2e8f0');
		//addBox(margin, currentY, contentWidth, 20, '#f8fafc', '#e2e8f0');
		currentY += 5;
		
		// Subtotal
		addText(`${t.subtotal}:`, margin + contentWidth - 80, currentY, { fontSize: 8 });
		addText(formatCurrency(invoiceData?.subtotalBeforeTax), margin + contentWidth - 3, currentY, { 
			fontSize: 8, 
			align: 'right' 
		});
		currentY += 4;
		
		// Tax Section
		if (invoiceData?.taxPercent > 0) {
			const taxMethodText = invoiceData.taxOnTotal ? 'del total' : 'del subtotal';
			addText(`${t.tax} (${invoiceData?.taxPercent}% ${taxMethodText}):`, margin + contentWidth - 80, currentY, { fontSize: 7 });
			addText(formatCurrency(invoiceData?.taxAmount), margin + contentWidth - 3, currentY, { 
				fontSize: 7, 
				align: 'right' 
			});
			currentY += 4;
			
			// Tax Savings (if applicable)
			if (invoiceData?.exemptTaxOnCash && invoiceData?.taxSavings && invoiceData?.taxSavings > 0) {
				addText(`${t.taxSavings}:`, margin + contentWidth - 80, currentY, { 
					fontSize: 7, 
					color: accentColor 
				});
				addText(`-${formatCurrency(invoiceData.taxSavings)}`, margin + contentWidth - 3, currentY, { 
					fontSize: 7, 
					color: accentColor, 
					align: 'right' 
				});
				currentY += 4;
				
				// Cash benefit explanation
				const cashPercentage = invoiceData?.cashPaymentRatio ? (invoiceData?.cashPaymentRatio * 100)?.toFixed(1) : '0';
				addText(`${t.cashBenefit} (${cashPercentage}%)`, margin + 3, currentY, { 
					fontSize: 6, 
					color: accentColor 
				});
				currentY += 4;
			}
		}
		
		// Grand Total
		currentY += 2;
		addLine(margin + contentWidth - 80, currentY, margin + contentWidth, currentY, primaryColor);
		currentY += 3;
		addText(t.grandTotal, margin + contentWidth - 80, currentY, { 
			fontSize: 10, 
			bold: true, 
			color: "#000",  
		});
		addText(formatCurrency(invoiceData?.total), margin + contentWidth - 3, currentY, { 
			fontSize: 10, 
			bold: true, 
			color: "#000", 
			align: 'right' 
		});
		currentY += 8;
		
		// Footer - Only if space allows
		if (currentY < maxContentY - 15) {
			currentY = Math.max(currentY + 5, pageHeight - 20);
			addText(t.thankYou, pageWidth / 2, currentY, { 
				fontSize: 9, 
				bold: true, 
				color: primaryColor, 
				align: 'center' 
			});
			currentY += 4;
			addText(t.footer, pageWidth / 2, currentY, { 
				fontSize: 6, 
				color: secondaryColor, 
				align: 'center' 
			});
		}
	}
	catch(e){
				console.log( e )
	}	
  
  // Save PDF
  const fileName = `Factura_${invoiceData.invoice}_${Date.now()}.pdf`;
  doc.save(fileName);
  
  return fileName;
};