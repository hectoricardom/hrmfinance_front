/**
 * Fingerprint Scanner Service Interface
 *
 * Abstract interface for fingerprint scanner services.
 * Implemented by SecuGenService and DigitalPersonaService.
 */

import {
  FingerprintVendor,
  FingerprintDeviceInfo,
  FingerprintCaptureResult,
  FingerprintCaptureOptions,
  FingerName,
} from '../types/fingerprint';

/**
 * Abstract interface for fingerprint scanner services
 */
export interface IFingerprintService {
  /**
   * Get the vendor type
   */
  getVendor(): FingerprintVendor;

  /**
   * Get the service URL
   */
  getServiceUrl(): string;

  /**
   * Initialize connection to the scanner device
   */
  initialize(): Promise<FingerprintDeviceInfo>;

  /**
   * Check if device is connected
   */
  checkConnection(): Promise<boolean>;

  /**
   * Get current device info
   */
  getDeviceInfo(): FingerprintDeviceInfo | null;

  /**
   * Check if connected
   */
  getIsConnected(): boolean;

  /**
   * Capture a fingerprint from the scanner
   */
  captureFingerprint(
    finger: FingerName,
    options?: FingerprintCaptureOptions
  ): Promise<FingerprintCaptureResult>;

  /**
   * Set device brightness (if supported)
   */
  setBrightness?(brightness: number): Promise<boolean>;

  /**
   * Set device contrast (if supported)
   */
  setContrast?(contrast: number): Promise<boolean>;

  /**
   * Cancel ongoing capture operation
   */
  cancelCapture(): Promise<void>;

  /**
   * Close connection to device
   */
  close(): Promise<void>;
}

/**
 * Base configuration shared by all fingerprint services
 */
export interface BaseFingerprintConfig {
  serviceUrl: string;
  timeout: number;
  imageFormat: string;
  imageQuality: number;
  templateFormat: string;
  autoCapture: boolean;
  minQuality: number;
}

/**
 * Helper function to convert vendor-specific device info to generic FingerprintDeviceInfo
 */
export function toFingerprintDeviceInfo(
  vendor: FingerprintVendor,
  deviceInfo: {
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
): FingerprintDeviceInfo {
  return {
    ...deviceInfo,
    vendor,
  };
}
