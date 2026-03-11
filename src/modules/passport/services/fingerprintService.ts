/**
 * Unified Fingerprint Scanner Service
 *
 * This service provides a unified interface for multiple fingerprint scanner vendors.
 * Currently supports:
 * - SecuGen HU20-A Hamster Pro 20
 * - Digital Persona U.are.U series (4500, 5100, 5160, 5300)
 */

import {
  FingerprintVendor,
  FingerprintDeviceInfo,
  FingerprintCaptureResult,
  FingerprintCaptureOptions,
  FingerName,
  SecuGenConfig,
  DigitalPersonaConfig,
  VENDOR_INFO,
} from '../types/fingerprint';
import { IFingerprintService } from './fingerprintServiceInterface';
import { SecuGenService, getSecuGenService, resetSecuGenService } from './secugenService';
import { DigitalPersonaService, getDigitalPersonaService, resetDigitalPersonaService } from './digitalPersonaService';
import { devLog } from '../../../services/utils';

export interface FingerprintServiceConfig {
  preferredVendor?: FingerprintVendor;
  autoDetect?: boolean;
  secugenConfig?: Partial<SecuGenConfig>;
  digitalPersonaConfig?: Partial<DigitalPersonaConfig>;
}

const DEFAULT_CONFIG: FingerprintServiceConfig = {
  preferredVendor: 'secugen',
  autoDetect: true,
};

export class FingerprintService implements IFingerprintService {
  private config: FingerprintServiceConfig;
  private activeService: IFingerprintService | null = null;
  private activeVendor: FingerprintVendor | null = null;
  private services: Map<FingerprintVendor, IFingerprintService> = new Map();

  constructor(config: FingerprintServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get available vendors info
   */
  static getAvailableVendors(): typeof VENDOR_INFO {
    return VENDOR_INFO;
  }

  /**
   * Get the active vendor type
   */
  getVendor(): FingerprintVendor {
    return this.activeVendor || this.config.preferredVendor || 'secugen';
  }

  /**
   * Get the service URL
   */
  getServiceUrl(): string {
    return this.activeService?.getServiceUrl() || '';
  }

  /**
   * Set preferred vendor
   */
  setPreferredVendor(vendor: FingerprintVendor): void {
    this.config.preferredVendor = vendor;
  }

  /**
   * Get service for a specific vendor
   */
  private getServiceForVendor(vendor: FingerprintVendor): IFingerprintService {
    let service = this.services.get(vendor);

    if (!service) {
      switch (vendor) {
        case 'secugen':
          service = getSecuGenService(this.config.secugenConfig);
          break;
        case 'digitalpersona':
          service = getDigitalPersonaService(this.config.digitalPersonaConfig);
          break;
        default:
          throw new Error(`Vendor desconocido: ${vendor}`);
      }
      this.services.set(vendor, service);
    }

    return service;
  }

  /**
   * Initialize connection to the fingerprint scanner
   * If autoDetect is enabled, will try all vendors until one connects
   */
  async initialize(): Promise<FingerprintDeviceInfo> {
    // Try preferred vendor first
    const preferredVendor = this.config.preferredVendor || 'secugen';

    try {
      const service = this.getServiceForVendor(preferredVendor);
      const deviceInfo = await service.initialize();

      if (deviceInfo.connected) {
        this.activeService = service;
        this.activeVendor = preferredVendor;
        return deviceInfo;
      }
    } catch (error) {
      devLog(`Failed to connect to ${preferredVendor}:`, error);
    }

    // If autoDetect is enabled, try other vendors
    if (this.config.autoDetect) {
      const vendors: FingerprintVendor[] = ['secugen', 'digitalpersona'];

      for (const vendor of vendors) {
        if (vendor === preferredVendor) continue; // Already tried

        try {
          const service = this.getServiceForVendor(vendor);
          const deviceInfo = await service.initialize();

          if (deviceInfo.connected) {
            this.activeService = service;
            this.activeVendor = vendor;
            return deviceInfo;
          }
        } catch (error) {
          devLog(`Failed to connect to ${vendor}:`, error);
        }
      }
    }

    // If no device connected, return the preferred vendor's service in disconnected state
    const service = this.getServiceForVendor(preferredVendor);
    this.activeService = service;
    this.activeVendor = preferredVendor;

    throw new Error(
      'No se pudo conectar a ningún lector de huellas. ' +
      'Asegúrese de que el dispositivo esté conectado y el servicio correspondiente esté ejecutándose.'
    );
  }

  /**
   * Initialize with a specific vendor
   */
  async initializeWithVendor(vendor: FingerprintVendor): Promise<FingerprintDeviceInfo> {
    const service = this.getServiceForVendor(vendor);
    const deviceInfo = await service.initialize();

    this.activeService = service;
    this.activeVendor = vendor;

    return deviceInfo;
  }

  /**
   * Check if device is connected
   */
  async checkConnection(): Promise<boolean> {
    if (!this.activeService) {
      return false;
    }
    return this.activeService.checkConnection();
  }

  /**
   * Get current device info
   */
  getDeviceInfo(): FingerprintDeviceInfo | null {
    return this.activeService?.getDeviceInfo() || null;
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.activeService?.getIsConnected() || false;
  }

  /**
   * Capture a fingerprint from the scanner
   */
  async captureFingerprint(
    finger: FingerName,
    options: FingerprintCaptureOptions = {}
  ): Promise<FingerprintCaptureResult> {
    if (!this.activeService) {
      // Try to initialize first
      try {
        await this.initialize();
      } catch {
        return {
          success: false,
          finger,
          error: 'No hay un lector de huellas conectado',
        };
      }
    }

    return this.activeService!.captureFingerprint(finger, options);
  }

  /**
   * Set device brightness (if supported)
   */
  async setBrightness(brightness: number): Promise<boolean> {
    if (this.activeService?.setBrightness) {
      return this.activeService.setBrightness(brightness);
    }
    return false;
  }

  /**
   * Set device contrast (if supported)
   */
  async setContrast(contrast: number): Promise<boolean> {
    if (this.activeService?.setContrast) {
      return this.activeService.setContrast(contrast);
    }
    return false;
  }

  /**
   * Cancel ongoing capture operation
   */
  async cancelCapture(): Promise<void> {
    if (this.activeService) {
      await this.activeService.cancelCapture();
    }
  }

  /**
   * Close connection to device
   */
  async close(): Promise<void> {
    if (this.activeService) {
      await this.activeService.close();
    }
    this.activeService = null;
    this.activeVendor = null;
  }

  /**
   * Switch to a different vendor
   */
  async switchVendor(vendor: FingerprintVendor): Promise<FingerprintDeviceInfo> {
    // Close current connection
    await this.close();

    // Initialize with new vendor
    return this.initializeWithVendor(vendor);
  }

  /**
   * Get active service instance (for advanced usage)
   */
  getActiveService(): IFingerprintService | null {
    return this.activeService;
  }
}

// Singleton instance for global use
let fingerprintServiceInstance: FingerprintService | null = null;

export function getFingerprintService(config?: FingerprintServiceConfig): FingerprintService {
  if (!fingerprintServiceInstance) {
    fingerprintServiceInstance = new FingerprintService(config);
  }
  return fingerprintServiceInstance;
}

export function resetFingerprintService(): void {
  if (fingerprintServiceInstance) {
    fingerprintServiceInstance.close();
    fingerprintServiceInstance = null;
  }
  // Also reset individual services
  resetSecuGenService();
  resetDigitalPersonaService();
}

// Re-export individual services for direct access if needed
export { SecuGenService, getSecuGenService, resetSecuGenService } from './secugenService';
export { DigitalPersonaService, getDigitalPersonaService, resetDigitalPersonaService } from './digitalPersonaService';
