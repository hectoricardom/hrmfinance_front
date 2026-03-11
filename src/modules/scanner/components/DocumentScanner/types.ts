/**
 * DocumentScanner Types
 *
 * Type definitions for the ML-powered document scanner
 */

// Scan modes
export type ScanMode = 'id' | 'passport' | 'barcode';

// Document types
export type DocumentType = 'ID' | 'PASSPORT' | 'BARCODE';

// Barcode formats supported
export type BarcodeFormat =
  | 'PDF_417'
  | 'QR_CODE'
  | 'CODE_128'
  | 'CODE_39'
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'DATA_MATRIX'
  | 'AZTEC'
  | 'ITF';

// AAMVA Data (US Driver's License)
export interface AAMVAData {
  // Names
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName?: string;
  nameSuffix?: string;

  // Address
  streetAddress: string;
  streetAddress2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;

  // Document info
  documentNumber: string;
  documentClass?: string;
  documentRestrictions?: string;
  documentEndorsements?: string;

  // Personal info
  dateOfBirth: string; // YYYY-MM-DD
  expirationDate: string; // YYYY-MM-DD
  issueDate?: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'X' | 'unknown';

  // Physical description
  height?: string;
  weight?: string;
  eyeColor?: string;
  hairColor?: string;

  // Additional
  issuingJurisdiction?: string;
  jurisdictionSpecific?: Record<string, string>;

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

// MRZ Data (Passport/Travel Document)
export interface MRZData {
  // Document info
  documentType: 'P' | 'ID' | 'V' | 'unknown'; // Passport, ID, Visa
  documentCode: string;
  issuingCountry: string; // ISO 3166-1 alpha-3
  documentNumber: string;

  // Personal info
  lastName: string;
  firstName: string;
  middleName?: string;
  nationality: string; // ISO 3166-1 alpha-3
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'X' | 'unknown';

  // Validity
  expirationDate: string; // YYYY-MM-DD

  // Optional data
  personalNumber?: string;
  optionalData1?: string;
  optionalData2?: string;

  // MRZ format info
  format: 'TD1' | 'TD2' | 'TD3' | 'MRVA' | 'MRVB' | 'unknown';
  rawLines: string[];

  // Validation
  isValid: boolean;
  checkDigitsValid: boolean;
  validationErrors: string[];
}

// Barcode scan result
export interface BarcodeData {
  format: BarcodeFormat | string;
  text: string;
  rawBytes?: Uint8Array;
}

// Unified scan result
export interface ScanResult<T = AAMVAData | MRZData | BarcodeData> {
  type: DocumentType;
  raw: string;
  parsed: T | null;
  confidence?: number;
  debugImage?: string; // Base64 encoded
  timestamp: number;
  processingTime?: number;
}

// Model loading state
export interface ModelLoadingState {
  isLoading: boolean;
  progress: number; // 0-100
  status: string;
  error?: string;
}

// Scanner state
export interface ScannerState {
  isInitialized: boolean;
  isScanning: boolean;
  hasCamera: boolean;
  cameraPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  selectedDeviceId?: string;
  availableDevices: MediaDeviceInfo[];
  modelState: ModelLoadingState;
  lastResult?: ScanResult;
  error?: string;
}

// Component props
export interface DocumentScannerProps {
  // Mode
  mode: ScanMode;

  // Callbacks
  onScan: (result: ScanResult) => void;
  onError?: (error: Error) => void;
  onModelLoad?: (progress: number, status: string) => void;

  // Configuration
  continuous?: boolean; // Keep scanning after first result
  showDebug?: boolean; // Show processed image
  showGuides?: boolean; // Show alignment guides
  autoStart?: boolean; // Start scanning on mount

  // Barcode specific
  barcodeFormats?: BarcodeFormat[];

  // MRZ specific
  mrzLanguage?: string; // OCR language hint

  // UI customization
  width?: number | string;
  height?: number | string;
  className?: string;
  overlayColor?: string;
  accentColor?: string;

  // Advanced
  preferredCamera?: 'front' | 'back';
  enableSound?: boolean;
  enableVibration?: boolean;
  scanInterval?: number; // ms between scan attempts
  maxRetries?: number;
}

// Image processing options
export interface ImageProcessingOptions {
  grayscale?: boolean;
  contrast?: number; // 0.5 - 2.0
  brightness?: number; // 0.5 - 2.0
  threshold?: number; // 0-255 for binary threshold, 0 = auto
  sharpen?: boolean;
  denoise?: boolean;
  rotate?: number; // degrees
  cropRegion?: { x: number; y: number; width: number; height: number };
}

// Camera constraints
export interface CameraConstraints {
  facingMode?: 'user' | 'environment';
  width?: { ideal: number; min?: number; max?: number };
  height?: { ideal: number; min?: number; max?: number };
  deviceId?: string;
  frameRate?: { ideal: number; min?: number; max?: number };
}

// Scanner service interface
export interface IScannerService {
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  scanImage(imageData: ImageData | HTMLCanvasElement | string): Promise<ScanResult>;
  getModelState(): ModelLoadingState;
}

// Country codes for MRZ
export const ISO_COUNTRY_CODES: Record<string, string> = {
  USA: 'United States',
  MEX: 'Mexico',
  CAN: 'Canada',
  GBR: 'United Kingdom',
  FRA: 'France',
  DEU: 'Germany',
  ESP: 'Spain',
  ITA: 'Italy',
  JPN: 'Japan',
  CHN: 'China',
  BRA: 'Brazil',
  ARG: 'Argentina',
  COL: 'Colombia',
  PER: 'Peru',
  CHL: 'Chile',
  VEN: 'Venezuela',
  ECU: 'Ecuador',
  GTM: 'Guatemala',
  CUB: 'Cuba',
  DOM: 'Dominican Republic',
  HND: 'Honduras',
  SLV: 'El Salvador',
  NIC: 'Nicaragua',
  CRI: 'Costa Rica',
  PAN: 'Panama',
  // Add more as needed
};

// AAMVA field codes
export const AAMVA_FIELD_CODES: Record<string, string> = {
  // Required fields
  DCS: 'lastName',
  DCT: 'firstName',
  DAC: 'firstName',
  DAD: 'middleName',
  DBB: 'dateOfBirth',
  DBA: 'expirationDate',
  DAQ: 'documentNumber',
  DAG: 'streetAddress',
  DAI: 'city',
  DAJ: 'state',
  DAK: 'postalCode',
  DBC: 'gender',

  // Optional fields
  DAA: 'fullName',
  DAB: 'lastName',
  DAN: 'nameSuffix',
  DAH: 'streetAddress2',
  DAU: 'height',
  DAW: 'weight',
  DAY: 'eyeColor',
  DAZ: 'hairColor',
  DBD: 'issueDate',
  DCG: 'country',
  DCI: 'placeOfBirth',
  DCJ: 'auditInfo',
  DCK: 'inventoryControl',
  DCL: 'raceEthnicity',
  DCM: 'standardVehicleClass',
  DCN: 'standardEndorsements',
  DCO: 'standardRestrictions',
  DCP: 'vehicleClassDescription',
  DCQ: 'endorsementsDescription',
  DCR: 'restrictionsDescription',
  DDA: 'complianceType',
  DDB: 'cardRevisionDate',
  DDC: 'hazmatEndorsementDate',
  DDD: 'limitedDurationIndicator',
  DDE: 'familyNameTruncation',
  DDF: 'firstNameTruncation',
  DDG: 'middleNameTruncation',

  // Alternative codes
  DAE: 'nameSuffix',
  DAF: 'namePrefix',
  DBN: 'lastName',
  DBO: 'firstName',
};
