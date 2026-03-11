/**
 * Universal Scanner Types
 *
 * Type definitions for the UniversalScanner component.
 */

import type { MRZData } from '../utils/mrzParser';

// Supported scan modes
export type ScanMode = 'barcode' | 'mrz' | 'both';

// Barcode formats supported by ZXing
export type BarcodeFormat =
  | 'QR_CODE'
  | 'PDF_417'
  | 'AZTEC'
  | 'CODABAR'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODE_128'
  | 'DATA_MATRIX'
  | 'EAN_8'
  | 'EAN_13'
  | 'ITF'
  | 'MAXICODE'
  | 'RSS_14'
  | 'RSS_EXPANDED'
  | 'UPC_A'
  | 'UPC_E'
  | 'UPC_EAN_EXTENSION';

// Scan result types
export interface BarcodeScanResult {
  type: 'barcode';
  format: string;
  text: string;
  rawBytes?: Uint8Array;
  timestamp: number;
}

export interface MRZScanResult {
  type: 'mrz';
  data: MRZData;
  rawText: string;
  confidence: number;
  timestamp: number;
}

export type ScanResult = BarcodeScanResult | MRZScanResult;

// Component props
export interface UniversalScannerProps {
  // Visibility control
  isOpen?: boolean;
  onClose?: () => void;

  // Scan mode configuration
  mode?: ScanMode;

  // Barcode configuration
  barcodeFormats?: BarcodeFormat[];

  // Callbacks
  onScan?: (result: ScanResult) => void;
  onBarcodeScan?: (text: string, format: string) => void;
  onMRZScan?: (data: MRZData) => void;
  onError?: (error: string) => void;

  // Multi-scan support
  multiScan?: boolean;
  keepOpenAfterScan?: boolean;

  // External scanner support
  showExternalInput?: boolean;
  externalInputPlaceholder?: string;

  // UI customization
  title?: string;
  scanInstructions?: string;
  showFormatSelector?: boolean;

  // MRZ specific
  mrzLanguages?: string[]; // Tesseract language codes
}

// Scanner state
export interface ScannerState {
  isScanning: boolean;
  hasPermission: boolean | null;
  error: string;
  lastResult: ScanResult | null;
  scanHistory: ScanResult[];
  selectedDeviceId: string;
  availableDevices: MediaDeviceInfo[];
  ocrProgress: number; // 0-100 for OCR progress
  ocrStatus: string;
}

// Camera configuration
export interface CameraConfig {
  facingMode: 'user' | 'environment';
  width: { ideal: number };
  height: { ideal: number };
  deviceId?: string;
}

// Default barcode formats for different use cases
export const BARCODE_PRESETS = {
  // All formats
  all: [
    'QR_CODE', 'PDF_417', 'AZTEC', 'CODABAR', 'CODE_39', 'CODE_93',
    'CODE_128', 'DATA_MATRIX', 'EAN_8', 'EAN_13', 'ITF', 'MAXICODE',
    'RSS_14', 'RSS_EXPANDED', 'UPC_A', 'UPC_E', 'UPC_EAN_EXTENSION'
  ] as BarcodeFormat[],

  // ID scanning (driver's license, passport)
  id: ['PDF_417', 'QR_CODE', 'AZTEC'] as BarcodeFormat[],

  // Inventory/retail
  inventory: ['CODE_128', 'CODE_39', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'QR_CODE'] as BarcodeFormat[],

  // Shipping/logistics
  shipping: ['CODE_128', 'CODE_39', 'QR_CODE', 'PDF_417', 'ITF'] as BarcodeFormat[],

  // QR only
  qr: ['QR_CODE'] as BarcodeFormat[],

  // 2D codes
  '2d': ['QR_CODE', 'PDF_417', 'AZTEC', 'DATA_MATRIX', 'MAXICODE'] as BarcodeFormat[],

  // 1D codes
  '1d': ['CODE_128', 'CODE_39', 'CODE_93', 'CODABAR', 'EAN_13', 'EAN_8', 'ITF', 'UPC_A', 'UPC_E'] as BarcodeFormat[]
};

// Export preset names for easier use
export type BarcodePreset = keyof typeof BARCODE_PRESETS;
