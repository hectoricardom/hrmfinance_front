import { devLog } from '../services/utils';

export const testPdfGeneration = async () => {
  try {
    devLog('Testing PDF generation...');
    
    // Try to import jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    
    devLog('jsPDF imported successfully');
    
    // Create a simple PDF
    const doc = new jsPDF();
    
    devLog('PDF document created');
    
    // Add some text
    doc.setFontSize(20);
    doc.text('Test PDF', 20, 20);
    
    doc.setFontSize(12);
    doc.text('This is a test PDF to verify the library works.', 20, 40);
    
    devLog('Text added to PDF');
    
    // Save the PDF
    doc.save('test.pdf');
    
    devLog('PDF saved successfully');
    alert('Test PDF generated successfully!');
    
  } catch (error) {
    console.error('Test PDF generation failed:', error);
    alert(`Test PDF failed: ${error.message}`);
  }
};