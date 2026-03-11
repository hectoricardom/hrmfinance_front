/**
 * SecuGen HU20-A Hamster Pro 20 Fingerprint Scanner Service
 *
 * This service communicates with the SecuGen WebAPI service running locally.
 * The WebAPI service must be installed and running on the client machine.
 *
 * SecuGen WebAPI Documentation: https://secugen.com/products/hamster-pro-20/
 */

import {
  SecuGenConfig,
  SecuGenDeviceInfo,
  FingerprintCaptureResult,
  FingerprintDeviceInfo,
  FingerprintCaptureOptions,
  FingerName,
  DEFAULT_SECUGEN_CONFIG,
  SecuGenCaptureOptions,
} from '../types/fingerprint';
import { IFingerprintService, toFingerprintDeviceInfo } from './fingerprintServiceInterface';
import { devLog } from '../../../services/utils';

export class SecuGenService implements IFingerprintService {
  private config: SecuGenConfig;
  private deviceInfo: SecuGenDeviceInfo | null = null;
  private isConnected: boolean = false;

  constructor(config: Partial<SecuGenConfig> = {}) {
    this.config = { ...DEFAULT_SECUGEN_CONFIG, ...config };
  }

  /**
   * Get the vendor type
   */
  getVendor(): 'secugen' {
    return 'secugen';
  }

  /**
   * Get the service URL
   */
  getServiceUrl(): string {
    return this.config.serviceUrl;
  }

  /**
   * Update the service configuration
   */
  updateConfig(config: Partial<SecuGenConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Initialize connection to the SecuGen WebAPI service
   */
  async initialize(): Promise<FingerprintDeviceInfo> {
    try {
      // Try to connect to the SecuGen WebAPI service
      const response = await this.callService('/SGIFPCapture', {
        Ession: true,
        TimeOut: 10000,
      });

      if (response && response.ErrorCode === 0) {
        this.deviceInfo = {
          connected: true,
          model: 'SecuGen HU20-A Hamster Pro 20',
          serial: response.DeviceSerial || undefined,
          firmwareVersion: response.FirmwareVersion || undefined,
          imageWidth: response.ImageWidth || 260,
          imageHeight: response.ImageHeight || 300,
          imageDPI: response.ImageDPI || 500,
          brightness: this.config.brightness,
          contrast: this.config.contrast,
        };
        this.isConnected = true;
        return toFingerprintDeviceInfo('secugen', this.deviceInfo);
      }

      throw new Error(response?.ErrorDescription || 'Failed to connect to SecuGen device');
    } catch (error) {
      // If WebAPI is not available, try alternative connection method
      return this.tryAlternativeConnection();
    }
  }

  /**
   * Try alternative connection methods (WebUSB or simulated for development)
   */
  private async tryAlternativeConnection(): Promise<FingerprintDeviceInfo> {
    // Check if WebUSB is available and try to connect
    if ('usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x1162 }, // SecuGen vendor ID
          ],
        });

        if (device) {
          this.deviceInfo = {
            connected: true,
            model: 'SecuGen HU20-A Hamster Pro 20',
            serial: device.serialNumber || undefined,
            imageWidth: 260,
            imageHeight: 300,
            imageDPI: 500,
            brightness: this.config.brightness,
            contrast: this.config.contrast,
          };
          this.isConnected = true;
          return toFingerprintDeviceInfo('secugen', this.deviceInfo);
        }
      } catch (usbError) {
        devLog('WebUSB connection failed:', usbError);
      }
    }

    // Return disconnected status if no connection method works
    this.deviceInfo = {
      connected: false,
      model: 'SecuGen HU20-A Hamster Pro 20',
      imageWidth: 260,
      imageHeight: 300,
      imageDPI: 500,
    };
    this.isConnected = false;

    throw new Error(
      'No se pudo conectar al lector de huellas SecuGen. ' +
      'Asegúrese de que el dispositivo esté conectado y el servicio WebAPI esté ejecutándose.'
    );
  }

  /**
   * Check if device is connected
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.callService('/SGIFPCapture', {
        Sess: true,
        TimeOut: 5000,
      });
      this.isConnected = response?.ErrorCode === 0;
      return this.isConnected;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get current device info
   */
  getDeviceInfo(): FingerprintDeviceInfo | null {
    return this.deviceInfo ? toFingerprintDeviceInfo('secugen', this.deviceInfo) : null;
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Capture a fingerprint from the scanner
   */
  async captureFingerprint(
    finger: FingerName,
    options: FingerprintCaptureOptions = {}
  ): Promise<FingerprintCaptureResult> {
    const timeout = options.timeout || this.config.timeout;
    const quality = options.quality || this.config.imageQuality;
    const imageFormat = (options.imageFormat as SecuGenConfig['imageFormat']) || this.config.imageFormat;

    try {
      // First attempt: Use SecuGen WebAPI
      const response = await this.callService('/SGIFPCapture', {
        Sess: false,
        TimeOut: timeout,
        Quality: quality,
        ImageFormat: imageFormat,
        TemplateFormat: this.config.templateFormat,
        Brightness: this.config.brightness,
        Contrast: this.config.contrast,
      });

      if (response?.ErrorCode === 0) {
        const captureQuality = this.calculateQuality(response);

        return {
          success: true,
          finger,
          imageDataUrl: response.BMPBase64
            ? `data:image/bmp;base64,${response.BMPBase64}`
            : response.ImageData
            ? `data:image/${imageFormat.toLowerCase()};base64,${response.ImageData}`
            : undefined,
          templateData: response.TemplateBase64 || response.Template,
          quality: captureQuality,
          nfiq: response.NFIQ || this.estimateNFIQ(captureQuality),
          deviceInfo: this.deviceInfo ? toFingerprintDeviceInfo('secugen', this.deviceInfo) : undefined,
        };
      }

      // Handle specific error codes
      const errorMessage = this.getErrorMessage(response?.ErrorCode);
      return {
        success: false,
        finger,
        error: errorMessage,
      };
    } catch (error) {
      // If WebAPI fails, check if we should use simulation mode
      if (this.config.serviceUrl.includes('localhost') && !this.isConnected) {
        return this.simulateCapture(finger);
      }

      return {
        success: false,
        finger,
        error: error instanceof Error ? error.message : 'Error desconocido al capturar huella',
      };
    }
  }

  /**
   * Simulate fingerprint capture for development/testing
   */
  private async simulateCapture(finger: FingerName): Promise<FingerprintCaptureResult> {
    // Simulate capture delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate a simulated fingerprint image
    const canvas = document.createElement('canvas');
    canvas.width = 260;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Dark background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 260, 300);

      // Simulate fingerprint ridges
      ctx.strokeStyle = '#3d3d5c';
      ctx.lineWidth = 1;

      // Draw concentric ellipses to simulate ridges
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.ellipse(
          130 + Math.sin(i * 0.3) * 5,
          150 + Math.cos(i * 0.2) * 5,
          30 + i * 3,
          35 + i * 3.5,
          Math.PI * 0.1,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      }

      // Add some variation for realism
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 260;
        const y = Math.random() * 300;
        ctx.fillStyle = `rgba(61, 61, 92, ${Math.random() * 0.5})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    const imageDataUrl = canvas.toDataURL('image/png');
    const simulatedQuality = 70 + Math.floor(Math.random() * 25);

    return {
      success: true,
      finger,
      imageDataUrl,
      quality: simulatedQuality,
      nfiq: this.estimateNFIQ(simulatedQuality),
      deviceInfo: {
        connected: false,
        vendor: 'secugen' as const,
        model: 'SecuGen HU20-A (Simulated)',
        imageWidth: 260,
        imageHeight: 300,
        imageDPI: 500,
      },
    };
  }

  /**
   * Call the SecuGen WebAPI service
   */
  private async callService(endpoint: string, params: Record<string, any>): Promise<any> {
    const url = new URL(endpoint, this.config.serviceUrl);

    // Add params to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Calculate quality score from response
   */
  private calculateQuality(response: any): number {
    if (response.Quality !== undefined) {
      return response.Quality;
    }
    if (response.NFIQ !== undefined) {
      // Convert NFIQ (1-5, 1=best) to percentage (100-0)
      return Math.max(0, 100 - (response.NFIQ - 1) * 25);
    }
    return 75; // Default quality if not provided
  }

  /**
   * Estimate NFIQ from quality percentage
   */
  private estimateNFIQ(quality: number): number {
    if (quality >= 80) return 1;
    if (quality >= 60) return 2;
    if (quality >= 40) return 3;
    if (quality >= 20) return 4;
    return 5;
  }

  /**
   * Get human-readable error message
   */
  private getErrorMessage(errorCode: number | undefined): string {
    const errorMessages: Record<number, string> = {
      0: 'Operación exitosa',
      1: 'Error de inicialización del dispositivo',
      2: 'Dispositivo no encontrado',
      3: 'Tiempo de espera agotado',
      4: 'Calidad de imagen insuficiente',
      5: 'Dedo no detectado',
      6: 'Error de comunicación con el dispositivo',
      7: 'Memoria insuficiente',
      8: 'Error interno del dispositivo',
      9: 'Operación cancelada',
      10: 'Parámetros inválidos',
      51: 'El usuario canceló la captura',
      52: 'El sensor está ocupado',
      53: 'Error de calibración',
      54: 'Error de hardware',
    };

    return errorMessages[errorCode || -1] || `Error desconocido (código: ${errorCode})`;
  }

  /**
   * Set device brightness
   */
  async setBrightness(brightness: number): Promise<boolean> {
    this.config.brightness = Math.max(0, Math.min(100, brightness));
    try {
      await this.callService('/SGISetBrightness', { Brightness: this.config.brightness });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set device contrast
   */
  async setContrast(contrast: number): Promise<boolean> {
    this.config.contrast = Math.max(0, Math.min(100, contrast));
    try {
      await this.callService('/SGISetContrast', { Contrast: this.config.contrast });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cancel ongoing capture operation
   */
  async cancelCapture(): Promise<void> {
    try {
      await this.callService('/SGIFPCancelCapture', {});
    } catch {
      // Ignore errors on cancel
    }
  }

  /**
   * Close connection to device
   */
  async close(): Promise<void> {
    await this.cancelCapture();
    this.isConnected = false;
    this.deviceInfo = null;
  }
}

// Singleton instance for global use
let secuGenServiceInstance: SecuGenService | null = null;

export function getSecuGenService(config?: Partial<SecuGenConfig>): SecuGenService {
  if (!secuGenServiceInstance) {
    secuGenServiceInstance = new SecuGenService(config);
  } else if (config) {
    secuGenServiceInstance.updateConfig(config);
  }
  return secuGenServiceInstance;
}

export function resetSecuGenService(): void {
  if (secuGenServiceInstance) {
    secuGenServiceInstance.close();
    secuGenServiceInstance = null;
  }
}
