import type { IClockingAdapter, AdapterConfig } from './IClockingAdapter';
import { FaceTimeAdapter } from './FaceTimeAdapter';
import { GenericCSVAdapter } from './GenericCSVAdapter';

export class AdapterFactory {
  private static adapters = new Map<string, IClockingAdapter>();
  private static initialized = false;

  /**
   * Initialize factory with default adapters
   */
  private static initialize(): void {
    if (this.initialized) return;

    // Register default adapters
    this.register(new FaceTimeAdapter());
    this.register(new GenericCSVAdapter());

    this.initialized = true;
  }

  /**
   * Register a new adapter
   */
  static register(adapter: IClockingAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Get adapter by ID
   */
  static get(id: string): IClockingAdapter | undefined {
    this.initialize();
    return this.adapters.get(id);
  }

  /**
   * Detect which adapter can handle the given file
   * Returns the first adapter that can handle the file
   */
  static async detectAdapter(file: File): Promise<IClockingAdapter | null> {
    this.initialize();

    // Check file extension first for quick filtering
    const extension = this.getFileExtension(file.name);
    const candidateAdapters: IClockingAdapter[] = [];

    for (const adapter of this.adapters.values()) {
      if (adapter.supportedFormats.some((fmt) => fmt === extension)) {
        candidateAdapters.push(adapter);
      }
    }

    // If no adapters match by extension, try all adapters
    if (candidateAdapters.length === 0) {
      candidateAdapters.push(...this.adapters.values());
    }

    // Try each candidate adapter
    for (const adapter of candidateAdapters) {
      try {
        const canHandle = await adapter.canHandle(file);
        if (canHandle) {
          return adapter;
        }
      } catch (error) {
        console.warn(`Adapter ${adapter.id} failed to check file:`, error);
      }
    }

    return null;
  }

  /**
   * Create a new adapter instance by type
   */
  static create(type: string, config?: AdapterConfig): IClockingAdapter {
    this.initialize();

    switch (type) {
      case 'facetime':
        return new FaceTimeAdapter(config);
      case 'generic-csv':
        return new GenericCSVAdapter(config);
      default:
        throw new Error(`Unknown adapter type: ${type}`);
    }
  }

  /**
   * Get list of all available adapters
   */
  static getAvailableAdapters(): Array<{
    id: string;
    name: string;
    formats: string[];
  }> {
    this.initialize();

    return Array.from(this.adapters.values()).map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      formats: adapter.supportedFormats,
    }));
  }

  /**
   * Reset factory (mainly for testing)
   */
  static reset(): void {
    this.adapters.clear();
    this.initialized = false;
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
  }

  /**
   * Create adapter from file auto-detection
   */
  static async createFromFile(
    file: File,
    config?: AdapterConfig
  ): Promise<IClockingAdapter | null> {
    const detectedAdapter = await this.detectAdapter(file);
    if (!detectedAdapter) return null;

    // Create new instance with config
    return this.create(detectedAdapter.id, config);
  }

  /**
   * Get adapter by file extension
   */
  static getByExtension(extension: string): IClockingAdapter | null {
    this.initialize();

    const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;

    for (const adapter of this.adapters.values()) {
      if (adapter.supportedFormats.includes(normalizedExt)) {
        return adapter;
      }
    }

    return null;
  }

  /**
   * Check if file type is supported
   */
  static isSupported(filename: string): boolean {
    this.initialize();

    const extension = this.getFileExtension(filename);

    for (const adapter of this.adapters.values()) {
      if (adapter.supportedFormats.includes(extension)) {
        return true;
      }
    }

    return false;
  }
}
