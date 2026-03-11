import { devLog } from '../services/utils';

export const generateSimplePDF = () => {
  devLog('Testing simple PDF generation...');
  
  try {
    // Dynamic import to handle potential loading issues
    import('jspdf').then(({ default: jsPDF }) => {
      devLog('jsPDF loaded successfully');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      devLog('PDF instance created');
      
      // Add simple text
      pdf.setFontSize(20);
      pdf.text('Invoice Test', 20, 20);
      
      // Save
      pdf.save('test-invoice.pdf');
      devLog('PDF saved successfully');
    }).catch(error => {
      console.error('Error loading jsPDF:', error);
      alert('Error loading PDF library. Please try again.');
    });
  } catch (error) {
    console.error('Error in generateSimplePDF:', error);
    alert('Error generating PDF: ' + error.message);
  }
};