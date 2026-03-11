/**
 * Image Processing Utilities for Document Scanning
 *
 * Provides image preprocessing functions optimized for document scanning,
 * MRZ reading, and barcode detection using efficient typed array operations.
 */

import type { ImageProcessingOptions } from './types';

/**
 * Region definition for cropping operations
 */
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert an image to grayscale using luminosity method
 * Uses ITU-R BT.709 coefficients: 0.2126R + 0.7152G + 0.0722B
 *
 * @param imageData - Source ImageData to convert
 * @returns New ImageData with grayscale values
 */
export function convertToGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  const length = data.length;
  const output = new Uint8ClampedArray(length);

  for (let i = 0; i < length; i += 4) {
    // Luminosity method for better perceptual accuracy
    const gray = Math.round(
      data[i] * 0.2126 +     // Red
      data[i + 1] * 0.7152 + // Green
      data[i + 2] * 0.0722   // Blue
    );
    output[i] = gray;
    output[i + 1] = gray;
    output[i + 2] = gray;
    output[i + 3] = data[i + 3]; // Preserve alpha
  }

  return new ImageData(output, imageData.width, imageData.height);
}

/**
 * Adjust image contrast
 *
 * @param imageData - Source ImageData
 * @param contrast - Contrast factor (0.5 = low contrast, 1.0 = normal, 2.0 = high contrast)
 * @returns New ImageData with adjusted contrast
 */
export function adjustContrast(imageData: ImageData, contrast: number): ImageData {
  // Clamp contrast to valid range
  const clampedContrast = Math.max(0.5, Math.min(2.0, contrast));

  const data = imageData.data;
  const length = data.length;
  const output = new Uint8ClampedArray(length);

  // Precalculate factor for efficiency
  const factor = (259 * (clampedContrast * 255 + 255)) / (255 * (259 - clampedContrast * 255));

  for (let i = 0; i < length; i += 4) {
    output[i] = Math.round(factor * (data[i] - 128) + 128);
    output[i + 1] = Math.round(factor * (data[i + 1] - 128) + 128);
    output[i + 2] = Math.round(factor * (data[i + 2] - 128) + 128);
    output[i + 3] = data[i + 3]; // Preserve alpha
  }

  return new ImageData(output, imageData.width, imageData.height);
}

/**
 * Adjust image brightness
 *
 * @param imageData - Source ImageData
 * @param brightness - Brightness factor (0.5 = darker, 1.0 = normal, 2.0 = brighter)
 * @returns New ImageData with adjusted brightness
 */
export function adjustBrightness(imageData: ImageData, brightness: number): ImageData {
  // Clamp brightness to reasonable range
  const clampedBrightness = Math.max(0, Math.min(3.0, brightness));

  const data = imageData.data;
  const length = data.length;
  const output = new Uint8ClampedArray(length);

  for (let i = 0; i < length; i += 4) {
    output[i] = Math.round(data[i] * clampedBrightness);
    output[i + 1] = Math.round(data[i + 1] * clampedBrightness);
    output[i + 2] = Math.round(data[i + 2] * clampedBrightness);
    output[i + 3] = data[i + 3]; // Preserve alpha
  }

  return new ImageData(output, imageData.width, imageData.height);
}

/**
 * Calculate optimal threshold using Otsu's method
 * Finds the threshold that minimizes intra-class variance
 *
 * @param imageData - Source ImageData (should be grayscale for best results)
 * @returns Optimal threshold value (0-255)
 */
export function getOtsuThreshold(imageData: ImageData): number {
  const data = imageData.data;
  const length = data.length;

  // Build histogram (using red channel, assuming grayscale)
  const histogram = new Uint32Array(256);
  const totalPixels = length / 4;

  for (let i = 0; i < length; i += 4) {
    histogram[data[i]]++;
  }

  // Calculate total mean
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]; // Weight background
    if (wB === 0) continue;

    wF = totalPixels - wB; // Weight foreground
    if (wF === 0) break;

    sumB += t * histogram[t];

    const mB = sumB / wB; // Mean background
    const mF = (sum - sumB) / wF; // Mean foreground

    // Calculate between-class variance
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Apply binary threshold to image
 * Pixels above threshold become white (255), below become black (0)
 *
 * @param imageData - Source ImageData
 * @param threshold - Threshold value (0-255), or undefined for auto (Otsu's method)
 * @returns New ImageData with binary threshold applied
 */
export function applyThreshold(imageData: ImageData, threshold?: number): ImageData {
  // Use Otsu's method if threshold not specified
  const actualThreshold = threshold ?? getOtsuThreshold(imageData);

  const data = imageData.data;
  const length = data.length;
  const output = new Uint8ClampedArray(length);

  for (let i = 0; i < length; i += 4) {
    // Use luminosity for threshold comparison
    const luminosity = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    const value = luminosity > actualThreshold ? 255 : 0;

    output[i] = value;
    output[i + 1] = value;
    output[i + 2] = value;
    output[i + 3] = data[i + 3]; // Preserve alpha
  }

  return new ImageData(output, imageData.width, imageData.height);
}

/**
 * Apply sharpening kernel to image
 * Uses a 3x3 unsharp mask kernel
 *
 * @param imageData - Source ImageData
 * @returns New ImageData with sharpening applied
 */
export function sharpenImage(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);

  // Sharpening kernel (unsharp mask)
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  // Copy alpha channel and process RGB
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Handle edge pixels by copying original
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        output[idx] = data[idx];
        output[idx + 1] = data[idx + 1];
        output[idx + 2] = data[idx + 2];
        output[idx + 3] = data[idx + 3];
        continue;
      }

      // Apply kernel for each channel
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[pixelIdx] * kernel[ki++];
          }
        }

        output[idx + c] = Math.max(0, Math.min(255, Math.round(sum)));
      }
      output[idx + 3] = data[idx + 3]; // Preserve alpha
    }
  }

  return new ImageData(output, width, height);
}

/**
 * Apply simple noise reduction using a 3x3 median filter
 *
 * @param imageData - Source ImageData
 * @returns New ImageData with noise reduction applied
 */
export function denoiseImage(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Handle edge pixels by copying original
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        output[idx] = data[idx];
        output[idx + 1] = data[idx + 1];
        output[idx + 2] = data[idx + 2];
        output[idx + 3] = data[idx + 3];
        continue;
      }

      // Collect neighboring pixel values for each channel
      for (let c = 0; c < 3; c++) {
        const values: number[] = [];

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = ((y + ky) * width + (x + kx)) * 4 + c;
            values.push(data[pixelIdx]);
          }
        }

        // Sort and take median
        values.sort((a, b) => a - b);
        output[idx + c] = values[4]; // Middle value of 9 elements
      }
      output[idx + 3] = data[idx + 3]; // Preserve alpha
    }
  }

  return new ImageData(output, width, height);
}

/**
 * Convert canvas to ImageData
 *
 * @param canvas - Source HTMLCanvasElement
 * @returns ImageData from the canvas
 */
export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Convert ImageData to canvas
 *
 * @param imageData - Source ImageData
 * @returns New HTMLCanvasElement with the image data
 */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Crop a specific region from a canvas
 *
 * @param canvas - Source HTMLCanvasElement
 * @param region - Region to crop {x, y, width, height}
 * @returns New HTMLCanvasElement with the cropped region
 */
export function cropRegion(
  canvas: HTMLCanvasElement,
  region: CropRegion
): HTMLCanvasElement {
  const { x, y, width, height } = region;

  // Validate and clamp region bounds
  const clampedX = Math.max(0, Math.min(x, canvas.width));
  const clampedY = Math.max(0, Math.min(y, canvas.height));
  const clampedWidth = Math.min(width, canvas.width - clampedX);
  const clampedHeight = Math.min(height, canvas.height - clampedY);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = clampedWidth;
  croppedCanvas.height = clampedHeight;

  const ctx = croppedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  ctx.drawImage(
    canvas,
    clampedX,
    clampedY,
    clampedWidth,
    clampedHeight,
    0,
    0,
    clampedWidth,
    clampedHeight
  );

  return croppedCanvas;
}

/**
 * Preprocess image for MRZ (Machine Readable Zone) detection
 * Optimized for OCR of the MRZ zone at the bottom of passports/IDs
 *
 * Processing steps:
 * 1. Crop bottom 25% of image (where MRZ is typically located)
 * 2. Convert to grayscale
 * 3. Apply high contrast
 * 4. Apply binary threshold
 *
 * @param canvas - Source HTMLCanvasElement
 * @returns New HTMLCanvasElement optimized for MRZ reading
 */
export function preprocessForMRZ(canvas: HTMLCanvasElement): HTMLCanvasElement {
  // Step 1: Crop bottom 25% of the image
  const mrzHeight = Math.floor(canvas.height * 0.25);
  const mrzY = canvas.height - mrzHeight;

  const croppedCanvas = cropRegion(canvas, {
    x: 0,
    y: mrzY,
    width: canvas.width,
    height: mrzHeight
  });

  // Step 2: Get image data and convert to grayscale
  let imageData = canvasToImageData(croppedCanvas);
  imageData = convertToGrayscale(imageData);

  // Step 3: Apply high contrast (1.8 for better text definition)
  imageData = adjustContrast(imageData, 1.8);

  // Step 4: Apply binary threshold using Otsu's method
  imageData = applyThreshold(imageData);

  // Convert back to canvas
  return imageDataToCanvas(imageData);
}

/**
 * Preprocess image for barcode detection
 * Optimized for detecting and reading barcodes (PDF417, QR codes, etc.)
 *
 * Processing steps:
 * 1. Convert to grayscale
 * 2. Apply moderate contrast enhancement
 * 3. Apply sharpening
 * 4. Apply light denoising
 *
 * @param canvas - Source HTMLCanvasElement
 * @returns New HTMLCanvasElement optimized for barcode reading
 */
export function preprocessForBarcode(canvas: HTMLCanvasElement): HTMLCanvasElement {
  // Step 1: Get image data and convert to grayscale
  let imageData = canvasToImageData(canvas);
  imageData = convertToGrayscale(imageData);

  // Step 2: Apply moderate contrast enhancement (1.3)
  imageData = adjustContrast(imageData, 1.3);

  // Step 3: Apply sharpening to enhance barcode edges
  imageData = sharpenImage(imageData);

  // Step 4: Light denoising to reduce artifacts
  imageData = denoiseImage(imageData);

  // Convert back to canvas
  return imageDataToCanvas(imageData);
}

/**
 * Apply all processing options to an image
 * Convenience function to apply multiple processing steps based on options
 *
 * @param imageData - Source ImageData
 * @param options - Processing options from ImageProcessingOptions
 * @returns Processed ImageData
 */
export function applyProcessingOptions(
  imageData: ImageData,
  options: ImageProcessingOptions
): ImageData {
  let processed = imageData;

  // Apply in optimal order for document scanning
  if (options.grayscale) {
    processed = convertToGrayscale(processed);
  }

  if (options.brightness !== undefined && options.brightness !== 1.0) {
    processed = adjustBrightness(processed, options.brightness);
  }

  if (options.contrast !== undefined && options.contrast !== 1.0) {
    processed = adjustContrast(processed, options.contrast);
  }

  if (options.sharpen) {
    processed = sharpenImage(processed);
  }

  if (options.denoise) {
    processed = denoiseImage(processed);
  }

  if (options.threshold !== undefined) {
    // Use auto threshold if 0, otherwise use specified value
    processed = applyThreshold(
      processed,
      options.threshold === 0 ? undefined : options.threshold
    );
  }

  return processed;
}

/**
 * Rotate canvas by specified degrees
 *
 * @param canvas - Source HTMLCanvasElement
 * @param degrees - Rotation angle in degrees
 * @returns New rotated HTMLCanvasElement
 */
export function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const radians = (degrees * Math.PI) / 180;

  // Calculate new dimensions
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const newWidth = Math.ceil(canvas.width * cos + canvas.height * sin);
  const newHeight = Math.ceil(canvas.width * sin + canvas.height * cos);

  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = newWidth;
  rotatedCanvas.height = newHeight;

  const ctx = rotatedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  // Translate to center, rotate, then draw
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotatedCanvas;
}

/**
 * Scale canvas to specified dimensions
 *
 * @param canvas - Source HTMLCanvasElement
 * @param width - Target width
 * @param height - Target height
 * @param maintainAspectRatio - Whether to maintain aspect ratio (default: true)
 * @returns New scaled HTMLCanvasElement
 */
export function scaleCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  maintainAspectRatio: boolean = true
): HTMLCanvasElement {
  let targetWidth = width;
  let targetHeight = height;

  if (maintainAspectRatio) {
    const aspectRatio = canvas.width / canvas.height;
    const targetAspectRatio = width / height;

    if (aspectRatio > targetAspectRatio) {
      // Source is wider, fit to width
      targetHeight = Math.round(width / aspectRatio);
    } else {
      // Source is taller, fit to height
      targetWidth = Math.round(height * aspectRatio);
    }
  }

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;

  const ctx = scaledCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  return scaledCanvas;
}
