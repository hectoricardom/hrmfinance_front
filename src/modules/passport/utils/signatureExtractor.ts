import { SignatureExtractionResult } from '../types';
import { devLog } from '../../../services/utils';

/**
 * Extract signature from an image using canvas manipulation
 * This function processes an image to isolate the signature
 */
export const extractSignatureFromImage = async (
  imageFile: File | Blob
): Promise<SignatureExtractionResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          //devLog('Image loaded:', img.width, 'x', img.height);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            //devLog('Canvas context not available');
            resolve({
              success: false,
              error: 'Canvas context not available - your browser may not support this feature'
            });
            return;
          }

          // Validate image dimensions
          if (img.width === 0 || img.height === 0) {
            resolve({
              success: false,
              error: 'Invalid image dimensions'
            });
            return;
          }
          
          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Convert to grayscale and apply threshold
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate grayscale value
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Apply threshold (adjust value for better results)
            const threshold = 128;
            const value = gray < threshold ? 0 : 255;
            
            // Set all channels to the threshold value
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
            // Keep alpha channel unchanged
          }
          
          // Put processed image data back
          ctx.putImageData(imageData, 0, 0);
          
          devLog('Processing image data for signature detection...');
          
          // Find signature bounds
          const bounds = findSignatureBounds(imageData);
          //devLog('Signature bounds:', bounds);
          
          if (bounds) {
            // Create cropped canvas for signature only
            const signatureCanvas = document.createElement('canvas');
            const signatureCtx = signatureCanvas.getContext('2d');
            
            if (signatureCtx) {
              const padding = 20;
              const width = Math.max(bounds.maxX - bounds.minX + padding, 50); // Minimum width
              const height = Math.max(bounds.maxY - bounds.minY + padding, 30); // Minimum height
              
              signatureCanvas.width = width;
              signatureCanvas.height = height;
              
              //devLog('Creating signature canvas:', width, 'x', height);
              
              // Fill with white background
              signatureCtx.fillStyle = 'white';
              signatureCtx.fillRect(0, 0, width, height);
              
              // Calculate source coordinates with bounds checking
              const sourceX = Math.max(0, bounds.minX - 10);
              const sourceY = Math.max(0, bounds.minY - 10);
              const sourceWidth = Math.min(canvas.width - sourceX, width);
              const sourceHeight = Math.min(canvas.height - sourceY, height);
              
              // Draw cropped signature
              signatureCtx.drawImage(
                canvas,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                width,
                height
              );
              
             //devLog('Signature extracted, making background transparent...');
              
              // Convert to transparent background
              makeBackgroundTransparent(signatureCtx, width, height);
              
              const confidence = calculateConfidence(bounds, canvas.width, canvas.height);
              //devLog('Signature extraction completed with confidence:', confidence);
              
              resolve({
                success: true,
                signatureDataUrl: signatureCanvas.toDataURL('image/png'),
                confidence
              });
            } else {
              resolve({
                success: false,
                error: 'Could not create signature canvas context'
              });
            }
          } else {
            //devLog('No signature detected in image');
            resolve({
              success: false,
              error: 'No signature detected. Please ensure:\n- The signature is dark (black/blue ink)\n- The background is light (white/cream)\n- The signature is clearly visible'
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };
      
      img.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to load image'
        });
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file'
      });
    };
    
    reader.readAsDataURL(imageFile);
  });
};

/**
 * Find the bounds of the signature in the image
 */
const findSignatureBounds = (imageData: ImageData) => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let pixelCount = 0;
  
  // Scan for dark pixels that could be part of signature
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const alpha = data[idx + 3];
      
      // Skip transparent pixels
      if (alpha < 128) continue;
      
      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Consider as signature if dark enough
      if (luminance < 150) { // More lenient threshold
        pixelCount++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  // Validate signature bounds
  const signatureWidth = maxX - minX;
  const signatureHeight = maxY - minY;
  const hasValidSignature = pixelCount >= 50 && // Minimum pixel count
                           signatureWidth >= 20 && // Minimum width
                           signatureHeight >= 10;   // Minimum height

  
  return hasValidSignature ? { minX, minY, maxX, maxY } : null;
};

/**
 * Make white background transparent
 */
const makeBackgroundTransparent = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // If pixel is white or near white
    if (r > 240 && g > 240 && b > 240) {
      // Make it transparent
      data[i + 3] = 0;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Calculate confidence score based on signature size and position
 */
const calculateConfidence = (
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  imageWidth: number,
  imageHeight: number
): number => {
  const signatureWidth = bounds.maxX - bounds.minX;
  const signatureHeight = bounds.maxY - bounds.minY;
  const signatureArea = signatureWidth * signatureHeight;
  const imageArea = imageWidth * imageHeight;
  
  // Calculate area ratio
  const areaRatio = signatureArea / imageArea;
  
  // Ideal signature takes up 5-30% of image
  let confidence = 0;
  if (areaRatio >= 0.05 && areaRatio <= 0.3) {
    confidence = 0.9;
  } else if (areaRatio < 0.05) {
    confidence = 0.5; // Too small
  } else {
    confidence = 0.6; // Too large
  }
  
  // Check aspect ratio (signatures are typically wider than tall)
  const aspectRatio = signatureWidth / signatureHeight;
  if (aspectRatio >= 2 && aspectRatio <= 5) {
    confidence = Math.min(confidence + 0.1, 1);
  }
  
  return confidence;
};

/**
 * Clean and enhance signature image with AI-like smoothing
 */
export const enhanceSignature = async (
  signatureDataUrl: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(signatureDataUrl);
        return;
      }
      
      // Scale up for better processing
      const scale = 3;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Enable image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw scaled up image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Apply advanced signature enhancement
      enhanceSignatureData(data, canvas.width, canvas.height);
      
      // Put enhanced data back
      ctx.putImageData(imageData, 0, 0);
      
      // Apply vectorization-like smoothing
      applyVectorSmoothing(ctx, canvas.width, canvas.height);
      
      // Scale back down to original size with anti-aliasing
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      
      if (!finalCtx) {
        resolve(signatureDataUrl);
        return;
      }
      
      finalCanvas.width = img.width;
      finalCanvas.height = img.height;
      
      finalCtx.imageSmoothingEnabled = true;
      finalCtx.imageSmoothingQuality = 'high';
      finalCtx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
      
      resolve(finalCanvas.toDataURL('image/png'));
    };
    
    img.onerror = () => resolve(signatureDataUrl);
    img.src = signatureDataUrl;
  });
};

/**
 * Advanced signature data enhancement
 */
const enhanceSignatureData = (data: Uint8ClampedArray, width: number, height: number) => {
  // Convert to grayscale and enhance contrast
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    
    // Skip transparent pixels
    if (alpha < 128) continue;
    
    // Calculate luminance
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Apply adaptive threshold based on local context
    const threshold = getAdaptiveThreshold(data, i, width, height);
    
    let newValue;
    if (gray < threshold) {
      // Dark pixel (signature stroke)
      newValue = Math.max(0, gray - 50); // Make darker
    } else {
      // Light pixel (background)
      newValue = Math.min(255, gray + 30); // Make lighter
    }
    
    data[i] = newValue;     // R
    data[i + 1] = newValue; // G
    data[i + 2] = newValue; // B
  }
  
  // Apply noise reduction
  applyNoiseReduction(data, width, height);
  
  // Apply edge sharpening for signature strokes
  applyEdgeSharpening(data, width, height);
};

/**
 * Get adaptive threshold based on local pixel neighborhood
 */
const getAdaptiveThreshold = (
  data: Uint8ClampedArray, 
  pixelIndex: number, 
  width: number, 
  height: number
): number => {
  const x = (pixelIndex / 4) % width;
  const y = Math.floor((pixelIndex / 4) / width);
  
  let sum = 0;
  let count = 0;
  const radius = 5;
  
  // Sample neighborhood pixels
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ((ny * width + nx) * 4);
        if (idx < data.length) {
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sum += gray;
          count++;
        }
      }
    }
  }
  
  const localMean = count > 0 ? sum / count : 128;
  return localMean - 15; // Bias towards darker detection
};

/**
 * Apply noise reduction using median filter
 */
const applyNoiseReduction = (data: Uint8ClampedArray, width: number, height: number) => {
  const temp = new Uint8ClampedArray(data);
  const radius = 1;
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const centerIdx = (y * width + x) * 4;
      
      // Skip transparent pixels
      if (data[centerIdx + 3] < 128) continue;
      
      const neighborhood: number[] = [];
      
      // Collect neighborhood values
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const gray = 0.299 * temp[idx] + 0.587 * temp[idx + 1] + 0.114 * temp[idx + 2];
          neighborhood.push(gray);
        }
      }
      
      // Apply median filter
      neighborhood.sort((a, b) => a - b);
      const median = neighborhood[Math.floor(neighborhood.length / 2)];
      
      data[centerIdx] = median;
      data[centerIdx + 1] = median;
      data[centerIdx + 2] = median;
    }
  }
};

/**
 * Apply edge sharpening to signature strokes
 */
const applyEdgeSharpening = (data: Uint8ClampedArray, width: number, height: number) => {
  const temp = new Uint8ClampedArray(data);
  
  // Sharpening kernel
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const centerIdx = (y * width + x) * 4;
      
      // Skip transparent pixels
      if (data[centerIdx + 3] < 128) continue;
      
      let sum = 0;
      
      // Apply kernel
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
          const gray = 0.299 * temp[idx] + 0.587 * temp[idx + 1] + 0.114 * temp[idx + 2];
          sum += gray * kernel[ky][kx];
        }
      }
      
      // Clamp result
      const sharpened = Math.max(0, Math.min(255, sum));
      
      data[centerIdx] = sharpened;
      data[centerIdx + 1] = sharpened;
      data[centerIdx + 2] = sharpened;
    }
  }
};

/**
 * Apply vector-like smoothing using multiple passes
 */
const applyVectorSmoothing = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Apply multiple blur passes with different radii for smooth effect
  const blurPasses = [
    { radius: 0.5, alpha: 0.3 },
    { radius: 1.0, alpha: 0.2 },
    { radius: 1.5, alpha: 0.1 }
  ];
  
  const originalImageData = ctx.getImageData(0, 0, width, height);
  
  blurPasses.forEach(pass => {
    ctx.save();
    ctx.globalAlpha = pass.alpha;
    ctx.filter = `blur(${pass.radius}px)`;
    ctx.putImageData(originalImageData, 0, 0);
    ctx.restore();
  });
  
  // Final contrast adjustment
  ctx.save();
  ctx.filter = 'contrast(120%) brightness(95%)';
  ctx.globalCompositeOperation = 'multiply';
  ctx.putImageData(originalImageData, 0, 0);
  ctx.restore();
};

/**
 * Advanced AI-like signature enhancement with vectorization
 */
export const vectorizeSignature = async (
  signatureDataUrl: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(signatureDataUrl);
          return;
        }
        
        // Use a more reasonable scale to prevent freezing
        const maxSize = 800; // Maximum dimension
        let { width, height } = img;
        
        // Scale down if image is too large
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw scaled image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Apply optimized vectorization (async with timeout)
        const result = await processSignatureWithTimeout(canvas, imageData, 3000); // 3 second timeout
        
        resolve(result);
      } catch (error) {
        devLog('Vectorization failed:', error);
        resolve(signatureDataUrl); // Fallback to original
      }
    };
    
    img.onerror = () => resolve(signatureDataUrl);
    img.src = signatureDataUrl;
  });
};

/**
 * Process signature with timeout to prevent freezing
 */
const processSignatureWithTimeout = (
  canvas: HTMLCanvasElement,
  imageData: ImageData, 
  timeoutMs: number
): Promise<string> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const ctx = canvas.getContext('2d')!;
    
    // Timeout fallback
    const timeoutId = setTimeout(() => {
      devLog('Vectorization timeout - using enhanced fallback');
      // Apply simple smoothing instead
      ctx.filter = 'blur(0.5px) contrast(150%) brightness(95%)';
      ctx.drawImage(canvas, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    }, timeoutMs);
    
    // Run vectorization in chunks to prevent blocking
    setTimeout(() => {
      try {
        // Apply lighter processing to prevent freezing
        const processedCanvas = applyLightVectorization(canvas, imageData);
        clearTimeout(timeoutId);
        resolve(processedCanvas.toDataURL('image/png'));
      } catch (error) {
        clearTimeout(timeoutId);
        devLog('Light vectorization failed:', error);
        // Final fallback - just smooth the original
        ctx.filter = 'blur(0.3px) contrast(120%)';
        ctx.drawImage(canvas, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      }
    }, 10); // Small delay to prevent immediate blocking
  });
};

/**
 * Apply lighter vectorization that won't freeze the browser
 */
const applyLightVectorization = (
  canvas: HTMLCanvasElement,
  imageData: ImageData
): HTMLCanvasElement => {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  
  // Create a new canvas for processing
  const processCanvas = document.createElement('canvas');
  const processCtx = processCanvas.getContext('2d')!;
  processCanvas.width = width;
  processCanvas.height = height;
  
  // Draw original
  processCtx.drawImage(canvas, 0, 0);
  
  // Apply multiple light filters instead of heavy computation
  const filters = [
    'contrast(130%)',
    'blur(0.3px)',
    'brightness(98%)',
    'contrast(110%)'
  ];
  
  filters.forEach((filter, index) => {
    processCtx.save();
    processCtx.filter = filter;
    processCtx.globalCompositeOperation = index === 0 ? 'source-over' : 'multiply';
    processCtx.drawImage(processCanvas, 0, 0);
    processCtx.restore();
  });
  
  // Apply simple path smoothing using built-in canvas features
  processCtx.save();
  processCtx.globalCompositeOperation = 'source-over';
  processCtx.lineCap = 'round';
  processCtx.lineJoin = 'round';
  processCtx.lineWidth = 1.5;
  processCtx.filter = 'blur(0.2px)';
  processCtx.drawImage(processCanvas, 0, 0);
  processCtx.restore();
  
  return processCanvas;
};

// Removed heavy computational functions that were causing browser freezing
// The new vectorizeSignature function uses optimized canvas filters instead