// Fingerprint capture types for multiple scanner vendors
// Supported: SecuGen HU20-A Hamster Pro 20, Digital Persona U.are.U series

// Scanner vendor types
export type FingerprintVendor = 'secugen' | 'digitalpersona';

export type FingerName =
  | 'rightThumb'
  | 'rightIndex'
  | 'rightMiddle'
  | 'rightRing'
  | 'rightLittle'
  | 'leftThumb'
  | 'leftIndex'
  | 'leftMiddle'
  | 'leftRing'
  | 'leftLittle';

export interface FingerData {
  name: FingerName;
  label: string;
  labelEs: string;
  hand: 'left' | 'right';
  position: number; // 1-10 position on the hand diagram
  captured: boolean;
  imageDataUrl?: string;
  quality?: number; // 0-100
  capturedAt?: string;
  templateData?: string; // Base64 encoded fingerprint template
  nfiq?: number; // NIST Fingerprint Image Quality (1-5, 1 is best)
}

export const FINGER_DEFINITIONS: Record<FingerName, Omit<FingerData, 'captured' | 'imageDataUrl' | 'quality' | 'capturedAt' | 'templateData' | 'nfiq'>> = {
  rightThumb: { name: 'rightThumb', label: 'Right Thumb', labelEs: 'Pulgar Derecho', hand: 'right', position: 1 },
  rightIndex: { name: 'rightIndex', label: 'Right Index', labelEs: 'Índice Derecho', hand: 'right', position: 2 },
  rightMiddle: { name: 'rightMiddle', label: 'Right Middle', labelEs: 'Medio Derecho', hand: 'right', position: 3 },
  rightRing: { name: 'rightRing', label: 'Right Ring', labelEs: 'Anular Derecho', hand: 'right', position: 4 },
  rightLittle: { name: 'rightLittle', label: 'Right Little', labelEs: 'Meñique Derecho', hand: 'right', position: 5 },
  leftThumb: { name: 'leftThumb', label: 'Left Thumb', labelEs: 'Pulgar Izquierdo', hand: 'left', position: 6 },
  leftIndex: { name: 'leftIndex', label: 'Left Index', labelEs: 'Índice Izquierdo', hand: 'left', position: 7 },
  leftMiddle: { name: 'leftMiddle', label: 'Left Middle', labelEs: 'Medio Izquierdo', hand: 'left', position: 8 },
  leftRing: { name: 'leftRing', label: 'Left Ring', labelEs: 'Anular Izquierdo', hand: 'left', position: 9 },
  leftLittle: { name: 'leftLittle', label: 'Left Little', labelEs: 'Meñique Izquierdo', hand: 'left', position: 10 },
};

// Capture order for enrollment (standard FBI order)
export const CAPTURE_ORDER: FingerName[] = [
  'rightThumb',
  'rightIndex',
  'rightMiddle',
  'rightRing',
  'rightLittle',
  'leftThumb',
  'leftIndex',
  'leftMiddle',
  'leftRing',
  'leftLittle',
];

export interface FingerprintCaptureResult {
  success: boolean;
  finger: FingerName;
  imageDataUrl?: string;
  templateData?: string;
  quality?: number;
  nfiq?: number;
  error?: string;
  deviceInfo?: FingerprintDeviceInfo;
}

// Vendor-agnostic device info
export interface FingerprintDeviceInfo {
  connected: boolean;
  vendor: FingerprintVendor;
  model: string;
  serial?: string;
  firmwareVersion?: string;
  imageWidth: number;
  imageHeight: number;
  imageDPI: number;
  brightness?: number;
  contrast?: number;
}

export interface FingerprintSetData {
  id?: string;
  applicantId?: string;
  fingers: Record<FingerName, FingerData>;
  completedCount: number;
  totalCount: number;
  captureStartedAt: string;
  captureCompletedAt?: string;
  deviceSerial?: string;
  deviceModel: string;
  deviceVendor?: FingerprintVendor;
}

export interface SecuGenDeviceInfo {
  connected: boolean;
  model: string;
  serial?: string;
  firmwareVersion?: string;
  imageWidth: number;
  imageHeight: number;
  imageDPI: number;
  brightness?: number;
  contrast?: number;
}

export interface SecuGenConfig {
  serviceUrl: string;
  timeout: number;
  imageFormat: 'BMP' | 'WSQ' | 'JPEG' | 'PNG';
  imageQuality: number;
  templateFormat: 'ISO' | 'ANSI' | 'SGI';
  autoCapture: boolean;
  brightness: number;
  contrast: number;
  minQuality: number;
}

export const DEFAULT_SECUGEN_CONFIG: SecuGenConfig = {
  serviceUrl: 'https://localhost:8443', // SecuGen WebAPI default
  timeout: 30000,
  imageFormat: 'PNG',
  imageQuality: 80,
  templateFormat: 'ISO',
  autoCapture: true,
  brightness: 50,
  contrast: 50,
  minQuality: 60,
};

export interface SecuGenCaptureOptions {
  timeout?: number;
  quality?: number;
  imageFormat?: SecuGenConfig['imageFormat'];
}

// Digital Persona types
export interface DigitalPersonaDeviceInfo {
  connected: boolean;
  model: string;
  serial?: string;
  firmwareVersion?: string;
  imageWidth: number;
  imageHeight: number;
  imageDPI: number;
}

export interface DigitalPersonaConfig {
  serviceUrl: string;
  timeout: number;
  imageFormat: 'PNG' | 'RAW' | 'BMP';
  imageQuality: number;
  templateFormat: 'ISO' | 'ANSI';
  autoCapture: boolean;
  minQuality: number;
}

export const DEFAULT_DIGITALPERSONA_CONFIG: DigitalPersonaConfig = {
  serviceUrl: 'https://localhost:9500', // Digital Persona Web SDK default
  timeout: 30000,
  imageFormat: 'PNG',
  imageQuality: 80,
  templateFormat: 'ISO',
  autoCapture: true,
  minQuality: 60,
};

export interface DigitalPersonaCaptureOptions {
  timeout?: number;
  quality?: number;
  imageFormat?: DigitalPersonaConfig['imageFormat'];
}

// Vendor-agnostic capture options
export interface FingerprintCaptureOptions {
  timeout?: number;
  quality?: number;
  imageFormat?: string;
}

// Vendor info for display
export const VENDOR_INFO: Record<FingerprintVendor, { name: string; description: string; models: string[] }> = {
  secugen: {
    name: 'SecuGen',
    description: 'SecuGen Hamster Pro 20 (HU20-A)',
    models: ['HU20-A Hamster Pro 20', 'HU10 Hamster Plus', 'HU20-AP Hamster Pro 20 AP'],
  },
  digitalpersona: {
    name: 'Digital Persona',
    description: 'Digital Persona U.are.U Series',
    models: ['U.are.U 4500', 'U.are.U 5100', 'U.are.U 5160', 'U.are.U 5300'],
  },
};
