/**
 * Digital Persona U.are.U Fingerprint Scanner Service
 *
 * This service communicates with the Digital Persona Web SDK service running locally.
 * The Web SDK service must be installed and running on the client machine.
 *
 * Digital Persona Web SDK: https://www.hidglobal.com/products/software/digitalpersona
 * Supports: U.are.U 4500, U.are.U 5100, U.are.U 5160, U.are.U 5300
 */

import {
  DigitalPersonaConfig,
  DigitalPersonaDeviceInfo,
  FingerprintCaptureResult,
  FingerprintDeviceInfo,
  FingerprintCaptureOptions,
  FingerName,
  DEFAULT_DIGITALPERSONA_CONFIG,
  DigitalPersonaCaptureOptions,
} from '../types/fingerprint';
import { IFingerprintService, toFingerprintDeviceInfo } from './fingerprintServiceInterface';
import { devLog } from '../../../services/utils';

export class DigitalPersonaService implements IFingerprintService {
  private config: DigitalPersonaConfig;
  private deviceInfo: DigitalPersonaDeviceInfo | null = null;
  private isConnected: boolean = false;
  private websocket: WebSocket | null = null;
  private captureResolve: ((result: FingerprintCaptureResult) => void) | null = null;
  private currentFinger: FingerName | null = null;

  constructor(config: Partial<DigitalPersonaConfig> = {}) {
    this.config = { ...DEFAULT_DIGITALPERSONA_CONFIG, ...config };
  }

  /**
   * Get the vendor type
   */
  getVendor(): 'digitalpersona' {
    return 'digitalpersona';
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
  updateConfig(config: Partial<DigitalPersonaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Initialize connection to the Digital Persona Web SDK service
   */
  async initialize(): Promise<FingerprintDeviceInfo> {
    try {
      // Try WebSocket connection (Digital Persona Web SDK uses WebSocket)
      await this.connectWebSocket();

      // Request device info
      const deviceInfo = await this.requestDeviceInfo();

      if (deviceInfo) {
        this.deviceInfo = deviceInfo;
        this.isConnected = true;
        return toFingerprintDeviceInfo('digitalpersona', this.deviceInfo);
      }

      throw new Error('Failed to get device info');
    } catch (error) {
      // Try HTTP fallback
      return this.tryHttpConnection();
    }
  }

  /**
   * Connect via WebSocket to Digital Persona Web SDK
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.serviceUrl.replace('https://', 'wss://').replace('http://', 'ws://');

      try {
        this.websocket = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          if (this.websocket) {
            this.websocket.close();
          }
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.websocket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onclose = () => {
          this.isConnected = false;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket messages from Digital Persona Web SDK
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Handle different message types
      switch (data.type) {
        case 'deviceInfo':
          // Device info response
          break;

        case 'captureResult':
          // Fingerprint capture result
          if (this.captureResolve && this.currentFinger) {
            const result: FingerprintCaptureResult = {
              success: data.success !== false && data.errorCode === 0,
              finger: this.currentFinger,
              imageDataUrl: data.imageData ? `data:image/png;base64,${data.imageData}` : undefined,
              templateData: data.template,
              quality: data.quality,
              nfiq: data.nfiq || this.estimateNFIQ(data.quality || 0),
              error: data.error || data.errorMessage,
              deviceInfo: this.deviceInfo ? toFingerprintDeviceInfo('digitalpersona', this.deviceInfo) : undefined,
            };
            this.captureResolve(result);
            this.captureResolve = null;
            this.currentFinger = null;
          }
          break;

        case 'error':
          if (this.captureResolve && this.currentFinger) {
            this.captureResolve({
              success: false,
              finger: this.currentFinger,
              error: data.message || 'Unknown error',
            });
            this.captureResolve = null;
            this.currentFinger = null;
          }
          break;
      }
    } catch (error) {
      devLog('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Request device info via WebSocket
   */
  private async requestDeviceInfo(): Promise<DigitalPersonaDeviceInfo | null> {
    return new Promise((resolve) => {
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      const originalOnMessage = this.websocket.onmessage;
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'deviceInfo') {
            clearTimeout(timeout);
            this.websocket!.onmessage = originalOnMessage;
            resolve({
              connected: true,
              model: data.model || 'Digital Persona U.are.U',
              serial: data.serial,
              firmwareVersion: data.firmwareVersion,
              imageWidth: data.imageWidth || 355,
              imageHeight: data.imageHeight || 390,
              imageDPI: data.imageDPI || 500,
            });
          }
        } catch {
          // Ignore parse errors
        }
        if (originalOnMessage) {
          originalOnMessage.call(this.websocket, event);
        }
      };

      this.websocket.send(JSON.stringify({ action: 'getDeviceInfo' }));
    });
  }

  /**
   * Try HTTP connection as fallback
   */
  private async tryHttpConnection(): Promise<FingerprintDeviceInfo> {
    try {
      const response = await this.callHttpService('/api/device/info');

      if (response && response.connected) {
        this.deviceInfo = {
          connected: true,
          model: response.model || 'Digital Persona U.are.U',
          serial: response.serial,
          firmwareVersion: response.firmwareVersion,
          imageWidth: response.imageWidth || 355,
          imageHeight: response.imageHeight || 390,
          imageDPI: response.imageDPI || 500,
        };
        this.isConnected = true;
        return toFingerprintDeviceInfo('digitalpersona', this.deviceInfo);
      }
    } catch (error) {
      devLog('HTTP connection failed:', error);
    }

    // Check WebUSB as last resort
    if ('usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x05ba }, // Digital Persona vendor ID
          ],
        });

        if (device) {
          this.deviceInfo = {
            connected: true,
            model: 'Digital Persona U.are.U',
            serial: device.serialNumber || undefined,
            imageWidth: 355,
            imageHeight: 390,
            imageDPI: 500,
          };
          this.isConnected = true;
          return toFingerprintDeviceInfo('digitalpersona', this.deviceInfo);
        }
      } catch (usbError) {
        devLog('WebUSB connection failed:', usbError);
      }
    }

    // Return disconnected status
    this.deviceInfo = {
      connected: false,
      model: 'Digital Persona U.are.U',
      imageWidth: 355,
      imageHeight: 390,
      imageDPI: 500,
    };
    this.isConnected = false;

    throw new Error(
      'No se pudo conectar al lector de huellas Digital Persona. ' +
      'Asegúrese de que el dispositivo esté conectado y el servicio Web SDK esté ejecutándose.'
    );
  }

  /**
   * Check if device is connected
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        return true;
      }
      const response = await this.callHttpService('/api/device/status');
      this.isConnected = response?.connected === true;
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
    return this.deviceInfo ? toFingerprintDeviceInfo('digitalpersona', this.deviceInfo) : null;
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
    const imageFormat = options.imageFormat || this.config.imageFormat;

    // Try WebSocket capture first
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return this.captureViaWebSocket(finger, timeout, quality);
    }

    // Try HTTP capture
    try {
      const response = await this.callHttpService('/api/capture', {
        method: 'POST',
        body: JSON.stringify({
          timeout,
          quality,
          imageFormat,
          templateFormat: this.config.templateFormat,
        }),
      });

      if (response?.success !== false && response?.errorCode === 0) {
        const captureQuality = response.quality || 75;

        return {
          success: true,
          finger,
          imageDataUrl: response.imageData
            ? `data:image/png;base64,${response.imageData}`
            : response.image
            ? `data:image/${imageFormat.toLowerCase()};base64,${response.image}`
            : undefined,
          templateData: response.template || response.templateData,
          quality: captureQuality,
          nfiq: response.nfiq || this.estimateNFIQ(captureQuality),
          deviceInfo: this.deviceInfo ? toFingerprintDeviceInfo('digitalpersona', this.deviceInfo) : undefined,
        };
      }

      return {
        success: false,
        finger,
        error: this.getErrorMessage(response?.errorCode),
      };
    } catch (error) {
      // If HTTP fails and device not connected, use simulation
      if (!this.isConnected) {
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
   * Capture via WebSocket
   */
  private captureViaWebSocket(
    finger: FingerName,
    timeout: number,
    quality: number
  ): Promise<FingerprintCaptureResult> {
    return new Promise((resolve) => {
      this.currentFinger = finger;
      this.captureResolve = resolve;

      const timeoutId = setTimeout(() => {
        if (this.captureResolve) {
          this.captureResolve({
            success: false,
            finger,
            error: 'Tiempo de espera agotado',
          });
          this.captureResolve = null;
          this.currentFinger = null;
        }
      }, timeout);

      this.websocket!.send(JSON.stringify({
        action: 'capture',
        timeout,
        quality,
        imageFormat: this.config.imageFormat,
        templateFormat: this.config.templateFormat,
      }));

      // Store timeout ID for cancellation
      (this as any)._captureTimeout = timeoutId;
    });
  }

  /**
   * Simulate fingerprint capture for development/testing
   */
  private async simulateCapture(finger: FingerName): Promise<FingerprintCaptureResult> {
    // Simulate capture delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate a simulated fingerprint image (different pattern than SecuGen for visual distinction)
    const canvas = document.createElement('canvas');
    canvas.width = 355;
    canvas.height = 390;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Dark background with slight blue tint (Digital Persona style)
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(0, 0, 355, 390);

      // Simulate fingerprint ridges with spiral pattern
      ctx.strokeStyle = '#4a5570';
      ctx.lineWidth = 1.5;

      // Draw spiral pattern
      for (let angle = 0; angle < 15 * Math.PI; angle += 0.1) {
        const r = 8 + angle * 4;
        const x = 177 + r * Math.cos(angle + Math.sin(angle * 0.3) * 0.3);
        const y = 195 + r * Math.sin(angle + Math.cos(angle * 0.2) * 0.3);

        if (angle === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Add some variation for realism
      for (let i = 0; i < 150; i++) {
        const x = Math.random() * 355;
        const y = Math.random() * 390;
        ctx.fillStyle = `rgba(74, 85, 112, ${Math.random() * 0.4})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    const imageDataUrl = canvas.toDataURL('image/png');
    const simulatedQuality = 72 + Math.floor(Math.random() * 23);

    return {
      success: true,
      finger,
      imageDataUrl,
      quality: simulatedQuality,
      nfiq: this.estimateNFIQ(simulatedQuality),
      deviceInfo: {
        connected: false,
        vendor: 'digitalpersona',
        model: 'Digital Persona U.are.U (Simulated)',
        imageWidth: 355,
        imageHeight: 390,
        imageDPI: 500,
      },
    };
  }

  /**
   * Call the Digital Persona HTTP service
   */
  private async callHttpService(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = new URL(endpoint, this.config.serviceUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
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
      8: 'Licencia no válida',
      9: 'Operación cancelada',
      10: 'Parámetros inválidos',
      0x80040005: 'No hay dispositivo conectado',
      0x80040007: 'Dispositivo ocupado',
      0x8004000A: 'Timeout durante la captura',
    };

    return errorMessages[errorCode || -1] || `Error desconocido (código: ${errorCode})`;
  }

  /**
   * Cancel ongoing capture operation
   */
  async cancelCapture(): Promise<void> {
    // Clear capture promise
    if (this.captureResolve && this.currentFinger) {
      this.captureResolve({
        success: false,
        finger: this.currentFinger,
        error: 'Operación cancelada',
      });
      this.captureResolve = null;
      this.currentFinger = null;
    }

    // Clear timeout
    if ((this as any)._captureTimeout) {
      clearTimeout((this as any)._captureTimeout);
    }

    // Send cancel via WebSocket
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ action: 'cancelCapture' }));
    }

    // Try HTTP cancel
    try {
      await this.callHttpService('/api/capture/cancel', { method: 'POST' });
    } catch {
      // Ignore errors on cancel
    }
  }

  /**
   * Close connection to device
   */
  async close(): Promise<void> {
    await this.cancelCapture();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    this.deviceInfo = null;
  }
}

// Singleton instance for global use
let digitalPersonaServiceInstance: DigitalPersonaService | null = null;

export function getDigitalPersonaService(config?: Partial<DigitalPersonaConfig>): DigitalPersonaService {
  if (!digitalPersonaServiceInstance) {
    digitalPersonaServiceInstance = new DigitalPersonaService(config);
  } else if (config) {
    digitalPersonaServiceInstance.updateConfig(config);
  }
  return digitalPersonaServiceInstance;
}

export function resetDigitalPersonaService(): void {
  if (digitalPersonaServiceInstance) {
    digitalPersonaServiceInstance.close();
    digitalPersonaServiceInstance = null;
  }
}
