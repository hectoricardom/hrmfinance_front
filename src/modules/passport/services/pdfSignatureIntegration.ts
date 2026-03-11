import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import { fetchGraphQLSS, devLog } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

export interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex?: number; // Default to first page (0)
}

export interface PDFSignatureOptions {
  signatureDataUrl?: string;
  signatureBlob?: Blob;
  position: SignaturePosition;
  opacity?: number; // 0 to 1, default 1
  maintainAspectRatio?: boolean; // Default true
  centerInArea?: boolean; // Default true - center signature within position area
  fitToArea?: boolean; // Default true - scale down if signature is larger than area
}

/**
 * Add signature image to an existing PDF document
 */
export const addSignatureToPDF = async (
  pdfFile: File,
  options: PDFSignatureOptions
): Promise<Uint8Array> => {
  try {
    // Read the PDF file
    const pdfArrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    
    let signatureImage;
    
    // Prioritize blob data over URLs (no CORS issues)
    if (options.signatureBlob) {
     // console.log('Using blob data for PDF signature, size:', options.signatureBlob.size, 'bytes, type:', options.signatureBlob.type);
      // Convert blob to array buffer for pdf-lib
      const blobArrayBuffer = await options.signatureBlob.arrayBuffer();
      const uint8Array = new Uint8Array(blobArrayBuffer);
      
      // Embed based on blob type
      if (options.signatureBlob.type === 'image/jpeg' || options.signatureBlob.type === 'image/jpg') {
        signatureImage = await pdfDoc.embedJpg(uint8Array);
      } else {
        // Default to PNG for other formats (including 'image/png')
        signatureImage = await pdfDoc.embedPng(uint8Array);
      }
    } else if (options.signatureDataUrl) {
     // console.log('Using base64 data URL for PDF signature');
      
      // Detect format from data URL
      if (options.signatureDataUrl.startsWith('data:image/jpeg') || options.signatureDataUrl.startsWith('data:image/jpg')) {
        signatureImage = await pdfDoc.embedJpg(options.signatureDataUrl);
      } else {
        // Default to PNG for other formats
        signatureImage = await pdfDoc.embedPng(options.signatureDataUrl);
      }
    } else {
      throw new Error('No signature data provided (neither blob nor dataUrl)');
    }
    
    // Get the page to add signature to
    const pageIndex = options.position.pageIndex ?? 0;
    const pages = pdfDoc.getPages();
    
    if (pageIndex >= pages.length) {
      throw new Error(`Page index ${pageIndex} does not exist. PDF has ${pages.length} pages.`);
    }
    
    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    // Calculate optimal signature size and position
    const maxWidth = options.position.width;
    const maxHeight = options.position.height;
    const imageAspectRatio = signatureImage.width / signatureImage.height;
    const fitToArea = options.fitToArea !== false; // Default true
    const centerInArea = options.centerInArea !== false; // Default true
    
   // console.log(`📐 Image dimensions: ${signatureImage.width}x${signatureImage.height}, aspect ratio: ${imageAspectRatio.toFixed(3)}`);
   // console.log(`📋 Available space: ${maxWidth}x${maxHeight}`);
   // console.log(`⚙️  Options: fitToArea=${fitToArea}, centerInArea=${centerInArea}, maintainAspectRatio=${options.maintainAspectRatio !== false}`);
    
    // Calculate the signature size
    let signatureWidth: number;
    let signatureHeight: number;
    
    if (options.maintainAspectRatio !== false) {
      // Maintain aspect ratio
      if (fitToArea) {
        // Scale to fit within bounds while maintaining aspect ratio
        const scaleByWidth = maxWidth / signatureImage.width;
        const scaleByHeight = maxHeight / signatureImage.height;
        const scale = Math.min(scaleByWidth, scaleByHeight, 1.0); // Don't scale up beyond original size
        
        signatureWidth = signatureImage.width * scale;
        signatureHeight = signatureImage.height * scale;
        
       // console.log(`📏 Scale factors: width=${scaleByWidth.toFixed(3)}, height=${scaleByHeight.toFixed(3)}`);
       // console.log(`🔄 Using scale: ${scale.toFixed(3)} ${scale < 1 ? '(scaled down)' : scale > 1 ? '(scaled up)' : '(original size)'}`);
      } else {
        // Use original size (might overflow)
        signatureWidth = signatureImage.width;
        signatureHeight = signatureImage.height;
       // console.log(`🔧 Using original size (no fitting)`);
      }
    } else {
      // Stretch to fill the entire area (ignore aspect ratio)
      signatureWidth = maxWidth;
      signatureHeight = maxHeight;
     // console.log(`🔧 Stretching to fill entire area`);
    }
    
    // Calculate position (with centering if enabled)
    let finalX: number;
    let finalY: number;
    
    if (centerInArea) {
      // Center the signature within the available space
      const centerOffsetX = (maxWidth - signatureWidth) / 2;
      const centerOffsetY = (maxHeight - signatureHeight) / 2;
      
      finalX = options.position.x + centerOffsetX;
      finalY = options.position.y + centerOffsetY;
      
      //console.log(`🎯 Centering: offsets x=${centerOffsetX.toFixed(1)}, y=${centerOffsetY.toFixed(1)}`);
    } else {
      // Use position as-is (top-left alignment)
      finalX = options.position.x;
      finalY = options.position.y;
      //console.log(`📍 Using top-left alignment (no centering)`);
    }
    
   // console.log(`✅ Final signature: ${signatureWidth.toFixed(1)}x${signatureHeight.toFixed(1)} at (${finalX.toFixed(1)}, ${finalY.toFixed(1)})`);
    
    // Validate that signature fits on page
    if (finalX + signatureWidth > pageWidth || finalY + signatureHeight > pageHeight) {
      devLog(`⚠️  Signature may be clipped: signature extends to (${(finalX + signatureWidth).toFixed(1)}, ${(finalY + signatureHeight).toFixed(1)}) but page is ${pageWidth}x${pageHeight}`);
    }
    
    // Add signature to the page
    page.drawImage(signatureImage, {
      x: finalX,
      y: pageHeight - finalY - signatureHeight, // PDF coordinates are from bottom-left
      width: signatureWidth,
      height: signatureHeight,
      opacity: options.opacity ?? 1.0
    });
    
    // Return the modified PDF as bytes
    return await pdfDoc.save();
    
  } catch (error) {
    devLog('Error adding signature to PDF:', error);
    throw new Error(`Failed to add signature to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Preview PDF pages to help user select signature position
 */
export const getPDFPreview = async (pdfFile: File, pageIndex: number = 0): Promise<string> => {
  try {
    const pdfArrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const pages = pdfDoc.getPages();
    
    if (pageIndex >= pages.length) {
      throw new Error(`Page index ${pageIndex} does not exist. PDF has ${pages.length} pages.`);
    }
    
    // Create a new PDF with just the requested page for preview
    const previewDoc = await PDFDocument.create();
    const [copiedPage] = await previewDoc.copyPages(pdfDoc, [pageIndex]);
    previewDoc.addPage(copiedPage);
    
    const pdfBytes = await previewDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
    
  } catch (error) {
    devLog('Error creating PDF preview:', error);
    throw new Error(`Failed to create PDF preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get PDF information (number of pages, dimensions)
 */
export const getPDFInfo = async (pdfFile: File) => {
  try {
    const pdfArrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const pages = pdfDoc.getPages();
    
    return {
      pageCount: pages.length,
      pages: pages.map((page, index) => ({
        index,
        width: page.getSize().width,
        height: page.getSize().height
      }))
    };
    
  } catch (error) {
    devLog('Error getting PDF info:', error);
    throw new Error(`Failed to get PDF info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Common signature positions for passport documents
 * Note: These are now maximum areas - signatures will be automatically sized and centered within them
 */
export const PASSPORT_SIGNATURE_POSITIONS = {
  // US Passport Application (DS-11) - typical signature area
  DS11_SIGNATURE: {
    x: 50,
    y: 650,
    width: 220,
    height: 70,
    pageIndex: 0
  } as SignaturePosition,
  
  // Cuban Passport Application - typical signature area (enlarged for better fit)
  CUBAN_PASSPORT_SIGNATURE: {
    x: 176,
    y: 110,
    width: 260,
    height: 70,
    pageIndex: 0
  } as SignaturePosition,
  
  // Generic bottom right signature (enlarged for better visibility)
  BOTTOM_RIGHT: {
    x: 380,
    y: 740,
    width: 200,
    height: 60,
    pageIndex: 0
  } as SignaturePosition,
  
  // Generic bottom left signature (enlarged for better visibility)
  BOTTOM_LEFT: {
    x: 50,
    y: 740,
    width: 200,
    height: 60,
    pageIndex: 0
  } as SignaturePosition
};

/**
 * Download modified PDF with signature
 */
export const downloadPDFWithSignature = (pdfBytes: Uint8Array, filename: string = 'signed-document.pdf') => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};








  export const sendWAmsg = async (number?: string, msg?: string): Promise<any> => {
     if (!number) {
      //query += " "+filters.search;
      return "phoneNumber required"
    }

    if (!msg) {
      //query += " "+filters.search;
      return  "message is required"
    }
    

    

    let bdyq2 = {
      query: "sendWhatsAppMessage",
      number,
      message: msg
    } 
   
    const response = await fetchGraphQLSS(bdyq2)
    return response;

}



/// ffmpeg -i 14.mp4 -to 00:02:30 -c copy 14-1.mp4
/// ffmpeg -i 14.mp4 -ss 00:02:30 -c copy 14-2.mp4