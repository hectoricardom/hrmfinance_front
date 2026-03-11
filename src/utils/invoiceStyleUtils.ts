// Invoice style configuration utilities
export type InvoiceStyle = 'classic' | 'modern' | 'compact';

// Get user's preferred invoice style
export const getInvoiceStyle = (): InvoiceStyle => {
  const savedStyle = localStorage.getItem('invoiceStyle') as InvoiceStyle;
  if (savedStyle && ['classic', 'modern', 'compact'].includes(savedStyle)) {
    return savedStyle;
  }
  
  // Default to compact style for best printing efficiency
  return 'compact';
};

// Set user invoice style preference
export const setInvoiceStyle = (style: InvoiceStyle): void => {
  localStorage.setItem('invoiceStyle', style);
};

// Style names for UI display
export const styleNames = {
  classic: 'Classic',
  modern: 'Modern',
  compact: 'Compact'
};

// Style descriptions
export const styleDescriptions = {
  classic: 'Traditional invoice layout with standard formatting',
  modern: 'Professional layout with optimized colors for efficient printing',
  compact: 'Ultra-compact layout designed for maximum print efficiency and page space'
};