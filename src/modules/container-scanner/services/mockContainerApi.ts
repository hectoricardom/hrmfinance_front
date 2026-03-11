/**
 * Mock API Service for Testing Container Scanner
 * Use this for development and testing without a backend
 */

import { Container, Bulk } from '../types/containerScannerTypes';

// Mock database
const mockContainers: Map<string, Container> = new Map();
const mockBulks: Map<string, Bulk> = new Map();

// Initialize mock data
function initializeMockData() {
  // Create test containers
  const testContainers = [
    {
      id: 'container-test-001',
      containerNumber: 'CONT-2024-001',
      bulkIds: ['bulk-test-001', 'bulk-test-002', 'bulk-test-003'],
      status: 'arrived' as const,
      arrivedAt: new Date().toISOString(),
      totalBulks: 3
    },
    {
      id: 'container-test-002',
      containerNumber: 'CONT-2024-002',
      bulkIds: ['bulk-test-004', 'bulk-test-005'],
      status: 'arrived' as const,
      arrivedAt: new Date().toISOString(),
      totalBulks: 2
    }
  ];

  // Create test bulks
  const testBulks = [
    {
      id: 'bulk-test-001',
      containerId: 'container-test-001',
      trackingNumber: 'TRACK-001',
      name: 'Electronics Package',
      status: 'pending' as const
    },
    {
      id: 'bulk-test-002',
      containerId: 'container-test-001',
      trackingNumber: 'TRACK-002',
      name: 'Clothing Bundle',
      status: 'pending' as const
    },
    {
      id: 'bulk-test-003',
      containerId: 'container-test-001',
      trackingNumber: 'TRACK-003',
      name: 'Food Items',
      status: 'pending' as const
    },
    {
      id: 'bulk-test-004',
      containerId: 'container-test-002',
      trackingNumber: 'TRACK-004',
      name: 'Documents',
      status: 'pending' as const
    },
    {
      id: 'bulk-test-005',
      containerId: 'container-test-002',
      trackingNumber: 'TRACK-005',
      name: 'Medical Supplies',
      status: 'pending' as const
    }
  ];

  // Store in mock database
  testContainers.forEach(container => {
    mockContainers.set(container.id, container);
  });

  testBulks.forEach(bulk => {
    mockBulks.set(bulk.id, bulk);
  });
}

// Initialize on module load
initializeMockData();

/**
 * Mock: Fetch container with bulks
 */
export async function fetchContainerMock(containerId: string): Promise<Container> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const container = mockContainers.get(containerId);

  if (!container) {
    throw new Error('Container not found. Please verify the QR code.');
  }

  // Attach bulk details
  const bulks = container.bulkIds
    .map(bulkId => mockBulks.get(bulkId))
    .filter(Boolean) as Bulk[];

  return {
    ...container,
    bulks
  };
}

/**
 * Mock: Mark bulk as scanned
 */
export async function markBulkAsScannedMock(bulkId: string): Promise<Bulk> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const bulk = mockBulks.get(bulkId);

  if (!bulk) {
    throw new Error('Bulk not found');
  }

  // Update status
  const updatedBulk = {
    ...bulk,
    status: 'scanned' as const,
    scannedAt: new Date().toISOString()
  };

  mockBulks.set(bulkId, updatedBulk);

  return updatedBulk;
}

/**
 * Mock: Mark container as received
 */
export async function markContainerAsReceivedMock(containerId: string): Promise<Container> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const container = mockContainers.get(containerId);

  if (!container) {
    throw new Error('Container not found');
  }

  // Update status
  const updatedContainer = {
    ...container,
    status: 'received' as const,
    receivedAt: new Date().toISOString()
  };

  mockContainers.set(containerId, updatedContainer);

  return updatedContainer;
}

/**
 * Reset mock data (useful for testing)
 */
export function resetMockData() {
  mockContainers.clear();
  mockBulks.clear();
  initializeMockData();
}

/**
 * Get current mock data (for debugging)
 */
export function getMockData() {
  return {
    containers: Array.from(mockContainers.values()),
    bulks: Array.from(mockBulks.values())
  };
}
