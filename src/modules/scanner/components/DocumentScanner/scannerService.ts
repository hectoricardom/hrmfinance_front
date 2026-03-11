/**
 * Document Scanner Service
 *
 * ML-powered document scanning service using Hugging Face Transformers.js for OCR
 * and ZXing for barcode detection. Supports passport MRZ reading, driver's license
 * PDF417 scanning, and general barcode detection.
 */

import { pipeline, env } from '@huggingface/transformers';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat as ZXingBarcodeFormat } from '@zxing/library';

import type {
  ScanMode,
  ScanResult,
  BarcodeData,
  AAMVAData,
  MRZData,
  ModelLoadingState,
  BarcodeFormat,
} from './types';

import { parseAAMVA, isAAMVAFormat } from './aamvaParser';
import { parseMRZ, isMRZLike, extractMRZLines } from './mrzParser';
import {
  preprocessForMRZ,
  preprocessForBarcode,
  canvasToImageData,
  imageDataToCanvas,
} from './imageProcessing';

// Configure Transformers.js
// Prefer WebGPU when available, fallback to WASM
env.backends.onnx.wasm.numThreads = 4;

// Try to enable WebGPU if available
if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
  // @ts-ignore - WebGPU support in transformers.js
  env.backends.onnx.preferredBackend = 'webgpu';
} else {
  // @ts-ignore - Fallback to WASM
  env.backends.onnx.preferredBackend = 'wasm';
}

// Enable model caching in IndexedDB
env.cacheDir = '.cache';
env.allowLocalModels = false;

// Model configuration
const TROCR_MODEL = 'Xenova/trocr-base-printed';

// Map our barcode format types to ZXing formats
const BARCODE_FORMAT_MAP: Record<BarcodeFormat, ZXingBarcodeFormat> = {
  PDF_417: ZXingBarcodeFormat.PDF_417,
  QR_CODE: ZXingBarcodeFormat.QR_CODE,
  CODE_128: ZXingBarcodeFormat.CODE_128,
  CODE_39: ZXingBarcodeFormat.CODE_39,
  EAN_13: ZXingBarcodeFormat.EAN_13,
  EAN_8: ZXingBarcodeFormat.EAN_8,
  UPC_A: ZXingBarcodeFormat.UPC_A,
  UPC_E: ZXingBarcodeFormat.UPC_E,
  DATA_MATRIX: ZXingBarcodeFormat.DATA_MATRIX,
  AZTEC: ZXingBarcodeFormat.AZTEC,
  ITF: ZXingBarcodeFormat.ITF,
};

// Reverse map for getting our format from ZXing format
const ZXING_TO_FORMAT_MAP: Map<ZXingBarcodeFormat, BarcodeFormat> = new Map(
  Object.entries(BARCODE_FORMAT_MAP).map(([k, v]) => [v, k as BarcodeFormat])
);

/**
 * Document Scanner Service Class
 *
 * Provides ML-powered document scanning capabilities using:
 * - TrOCR for text recognition (MRZ)
 * - ZXing for barcode detection (PDF417, QR, etc.)
 */
export class DocumentScannerService {
  private ocrPipeline: any = null;
  private barcodeReader: BrowserMultiFormatReader | null = null;
  private modelState: ModelLoadingState = {
    isLoading: false,
    progress: 0,
    status: 'idle',
  };
  private initPromise: Promise<void> | null = null;

  /**
   * Get the current model loading state
   */
  getModelState(): ModelLoadingState {
    return { ...this.modelState };
  }

  /**
   * Initialize the scanner service
   * Loads ML models and prepares the barcode reader
   */
  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already initialized
    if (this.ocrPipeline && this.barcodeReader) {
      return Promise.resolve();
    }

    this.initPromise = this._initializeInternal();
    return this.initPromise;
  }

  /**
   * Internal initialization logic
   */
  private async _initializeInternal(): Promise<void> {
    try {
      this.modelState = {
        isLoading: true,
        progress: 0,
        status: 'Initializing scanner service...',
      };

      // Initialize ZXing barcode reader first (fast)
      this.modelState.status = 'Initializing barcode reader...';
      this.modelState.progress = 10;
      await this._initializeBarcodeReader();

      // Load OCR model (slower, requires download)
      this.modelState.status = 'Loading OCR model...';
      this.modelState.progress = 20;
      await this._loadOCRModel();

      this.modelState = {
        isLoading: false,
        progress: 100,
        status: 'Ready',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.modelState = {
        isLoading: false,
        progress: 0,
        status: 'Error',
        error: errorMessage,
      };
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Initialize the ZXing barcode reader with hints for all formats
   */
  private async _initializeBarcodeReader(): Promise<void> {
    const hints = new Map();

    // Enable all supported barcode formats
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      ZXingBarcodeFormat.PDF_417,
      ZXingBarcodeFormat.QR_CODE,
      ZXingBarcodeFormat.CODE_128,
      ZXingBarcodeFormat.CODE_39,
      ZXingBarcodeFormat.EAN_13,
      ZXingBarcodeFormat.EAN_8,
      ZXingBarcodeFormat.UPC_A,
      ZXingBarcodeFormat.UPC_E,
      ZXingBarcodeFormat.DATA_MATRIX,
      ZXingBarcodeFormat.AZTEC,
      ZXingBarcodeFormat.ITF,
    ]);

    // Improve scanning reliability
    hints.set(DecodeHintType.TRY_HARDER, true);

    this.barcodeReader = new BrowserMultiFormatReader(hints);
  }

  /**
   * Load the TrOCR model for text recognition
   */
  private async _loadOCRModel(): Promise<void> {
    try {
      // Load the image-to-text pipeline with progress callback
      this.ocrPipeline = await pipeline('image-to-text', TROCR_MODEL, {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            const pct = progress.progress || 0;
            this.modelState = {
              ...this.modelState,
              progress: 20 + Math.round(pct * 0.7), // 20-90%
              status: `Downloading model: ${Math.round(pct)}%`,
            };
          } else if (progress.status === 'loading') {
            this.modelState = {
              ...this.modelState,
              progress: 90,
              status: 'Loading model into memory...',
            };
          }
        },
      });

      this.modelState.progress = 95;
      this.modelState.status = 'Model loaded successfully';
    } catch (error) {
      console.error('[ScannerService] Failed to load OCR model:', error);
      throw new Error(`Failed to load OCR model: ${error}`);
    }
  }

  /**
   * Dispose of resources and cleanup
   */
  async dispose(): Promise<void> {
    try {
      // Cleanup OCR pipeline
      if (this.ocrPipeline) {
        // The pipeline doesn't have a dispose method, but we can clear the reference
        this.ocrPipeline = null;
      }

      // Cleanup barcode reader
      if (this.barcodeReader) {
        this.barcodeReader.reset();
        this.barcodeReader = null;
      }

      this.initPromise = null;
      this.modelState = {
        isLoading: false,
        progress: 0,
        status: 'Disposed',
      };
    } catch (error) {
      console.error('[ScannerService] Error during disposal:', error);
    }
  }

  /**
   * Scan for MRZ text using TrOCR
   *
   * @param imageData - Image data or canvas to scan
   * @returns OCR text result
   */
  async scanForMRZ(imageData: ImageData | HTMLCanvasElement): Promise<string> {
    if (!this.ocrPipeline) {
      await this.initialize();
    }

    try {
      // Convert to canvas if needed
      let canvas: HTMLCanvasElement;
      if (imageData instanceof ImageData) {
        canvas = imageDataToCanvas(imageData);
      } else {
        canvas = imageData;
      }

      // Preprocess image for MRZ detection
      const processedCanvas = preprocessForMRZ(canvas);

      // Convert to data URL for the pipeline
      const dataUrl = processedCanvas.toDataURL('image/png');

      // Run OCR
      const result = await this.ocrPipeline(dataUrl);

      if (result && result.length > 0) {
        // Join all generated text
        const text = result.map((r: any) => r.generated_text).join('\n');
        console.log('[ScannerService] OCR result:', text);
        return text;
      }

      return '';
    } catch (error) {
      console.error('[ScannerService] MRZ scan error:', error);
      throw error;
    }
  }

  /**
   * Scan for barcodes using ZXing
   *
   * @param canvas - Canvas element to scan
   * @param formats - Optional specific formats to scan for
   * @returns Barcode data if found
   */
  async scanForBarcode(
    canvas: HTMLCanvasElement,
    formats?: BarcodeFormat[]
  ): Promise<BarcodeData | null> {
    if (!this.barcodeReader) {
      await this.initialize();
    }

    try {
      // Use requestAnimationFrame to yield to the UI thread
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Preprocess image for barcode detection
      const processedCanvas = preprocessForBarcode(canvas);

      // Use the existing reader (don't create new ones each time)
      const reader = this.barcodeReader!;

      // Convert canvas to ImageData for decoding
      const ctx = processedCanvas.getContext('2d');
      if (!ctx) return null;

      const imageData = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);

      // Create an HTMLImageElement from the canvas for ZXing
      const dataUrl = processedCanvas.toDataURL('image/png');

      // Use a Promise with timeout to prevent hanging
      const result = await Promise.race([
        this._decodeFromDataUrl(reader, dataUrl),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)) // 2 second timeout
      ]);

      if (result) {
        const formatName =
          ZXING_TO_FORMAT_MAP.get(result.getBarcodeFormat()) ||
          result.getBarcodeFormat().toString();

        return {
          format: formatName,
          text: result.getText(),
          rawBytes: result.getRawBytes() || undefined,
        };
      }

      return null;
    } catch (error: any) {
      // ZXing throws when no barcode is found - this is expected behavior
      if (error.name === 'NotFoundException' || error.message?.includes('No MultiFormat Readers')) {
        return null;
      }
      // Don't log every failed scan attempt - it's too noisy
      // console.error('[ScannerService] Barcode scan error:', error);
      return null; // Return null instead of throwing to prevent app freezing
    }
  }

  /**
   * Helper to decode from data URL with proper error handling
   */
  private async _decodeFromDataUrl(reader: BrowserMultiFormatReader, dataUrl: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);

          try {
            const result = reader.decodeFromCanvas(canvas);
            resolve(result);
          } catch (e: any) {
            if (e.name === 'NotFoundException') {
              resolve(null);
            } else {
              resolve(null); // Don't reject, just return null
            }
          }
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  /**
   * Full document scanning pipeline
   *
   * @param canvas - Canvas element containing the document image
   * @param mode - Scan mode ('passport', 'id', 'barcode')
   * @returns Scan result with parsed data
   */
  async scanDocument(canvas: HTMLCanvasElement, mode: ScanMode): Promise<ScanResult> {
    const startTime = performance.now();

    try {
      let result: ScanResult;

      switch (mode) {
        case 'passport':
          result = await this._scanPassport(canvas);
          break;

        case 'id':
          result = await this._scanIdCard(canvas);
          break;

        case 'barcode':
          result = await this._scanBarcode(canvas);
          break;

        default:
          throw new Error(`Unknown scan mode: ${mode}`);
      }

      result.processingTime = performance.now() - startTime;
      return result;
    } catch (error) {
      const endTime = performance.now();
      return {
        type: mode === 'passport' ? 'PASSPORT' : mode === 'id' ? 'ID' : 'BARCODE',
        raw: '',
        parsed: null,
        confidence: 0,
        timestamp: Date.now(),
        processingTime: endTime - startTime,
      };
    }
  }

  /**
   * Scan passport MRZ
   */
  private async _scanPassport(canvas: HTMLCanvasElement): Promise<ScanResult<MRZData>> {
    // Preprocess and run OCR
    const ocrText = await this.scanForMRZ(canvas);

    if (!ocrText || !isMRZLike(ocrText)) {
      return {
        type: 'PASSPORT',
        raw: ocrText || '',
        parsed: null,
        confidence: 0,
        timestamp: Date.now(),
      };
    }

    // Parse MRZ data
    const mrzData = parseMRZ(ocrText);

    if (!mrzData) {
      return {
        type: 'PASSPORT',
        raw: ocrText,
        parsed: null,
        confidence: 0.3,
        timestamp: Date.now(),
      };
    }

    // Calculate confidence based on validation
    let confidence = 0.5;
    if (mrzData.isValid) {
      confidence = 0.95;
    } else if (mrzData.checkDigitsValid) {
      confidence = 0.8;
    } else if (mrzData.validationErrors.length <= 2) {
      confidence = 0.6;
    }

    // The new MRZ parser already returns MRZData in the correct format
    return {
      type: 'PASSPORT',
      raw: mrzData.rawLines.join('\n'),
      parsed: mrzData,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Scan ID card (driver's license) PDF417 barcode
   */
  private async _scanIdCard(canvas: HTMLCanvasElement): Promise<ScanResult<AAMVAData>> {
    // Scan for PDF417 barcode specifically
    const barcodeData = await this.scanForBarcode(canvas, ['PDF_417']);

    if (!barcodeData) {
      return {
        type: 'ID',
        raw: '',
        parsed: null,
        confidence: 0,
        timestamp: Date.now(),
      };
    }

    // Check if data is in AAMVA format
    if (!isAAMVAFormat(barcodeData.text)) {
      return {
        type: 'ID',
        raw: barcodeData.text,
        parsed: null,
        confidence: 0.3,
        timestamp: Date.now(),
      };
    }

    // Parse AAMVA data
    const aamvaData = parseAAMVA(barcodeData.text);

    // Calculate confidence
    let confidence = 0.5;
    if (aamvaData.isValid) {
      confidence = 0.95;
    } else if (aamvaData.validationErrors.length <= 2) {
      confidence = 0.7;
    } else if (aamvaData.validationErrors.length <= 5) {
      confidence = 0.5;
    }

    return {
      type: 'ID',
      raw: barcodeData.text,
      parsed: aamvaData,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Scan for any barcode
   */
  private async _scanBarcode(canvas: HTMLCanvasElement): Promise<ScanResult<BarcodeData>> {
    const barcodeData = await this.scanForBarcode(canvas);

    if (!barcodeData) {
      return {
        type: 'BARCODE',
        raw: '',
        parsed: null,
        confidence: 0,
        timestamp: Date.now(),
      };
    }

    return {
      type: 'BARCODE',
      raw: barcodeData.text,
      parsed: barcodeData,
      confidence: 0.9,
      timestamp: Date.now(),
    };
  }
}

// Singleton instance
let scannerServiceInstance: DocumentScannerService | null = null;

/**
 * Get the singleton scanner service instance
 */
export function getScannerService(): DocumentScannerService {
  if (!scannerServiceInstance) {
    scannerServiceInstance = new DocumentScannerService();
  }
  return scannerServiceInstance;
}

/**
 * Create a new scanner service instance
 * Use this if you need multiple independent instances
 */
export function createScannerService(): DocumentScannerService {
  return new DocumentScannerService();
}

// Export singleton as default
export default getScannerService();
