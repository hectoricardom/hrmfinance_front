/**
 * Type definitions for Container Scanner module
 */

export interface Bulk {
  id: string;
  containerId: string;
  trackingNumber: string;
  name?: string;
  status: 'pending' | 'scanned' | 'received';
  scannedAt?: string;
}

export interface Container {
  id: string;
  containerNumber: string;
  bulkIds: string[];
  bulks?: Bulk[];
  status: 'in_transit' | 'arrived' | 'receiving' | 'received';
  arrivedAt?: string;
  receivedAt?: string;
  totalBulks: number;
}

export interface ScanResult {
  success: boolean;
  message: string;
  bulk?: Bulk;
  isDuplicate?: boolean;
}

export type ScannerState =
  | 'initial'           // Waiting for container scan
  | 'loading'           // Loading container data
  | 'scanning'          // Scanning bulks
  | 'completed'         // All bulks scanned
  | 'received'          // Container marked as received
  | 'error';            // Error state

export interface ContainerScannerState {
  state: ScannerState;
  container: Container | null;
  expectedBulks: Bulk[];
  scannedBulks: Set<string>;
  currentScan: string;
  error: string | null;
  successMessage: string | null;
}
