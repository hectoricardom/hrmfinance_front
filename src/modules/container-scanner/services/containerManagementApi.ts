/**
 * Container Management API
 * CRUD operations for managing containers and bulks
 * Integrates with real GraphQL backend
 */

import { Container, Bulk } from '../types/containerScannerTypes';
import { getConfig } from '../config/scannerConfig';
import { fetchGraphQLSS, generateShortCode } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

const config = getConfig();
const API_BASE_URL = config.apiBaseUrl;

// Mock database for management
const mockContainers: Map<string, Container> = new Map();
const mockBulks: Map<string, Bulk> = new Map();

// Initialize with existing mock data
let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    // Import existing mock data
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

    testContainers.forEach(container => mockContainers.set(container.id, container));
    testBulks.forEach(bulk => mockBulks.set(bulk.id, bulk));
    initialized = true;
  }
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * List all containers
 * Uses GraphQL query: getAllShippingContainers
 */
export async function listContainers(): Promise<Container[]> {
  if (config.useMockApi) {
    ensureInitialized();
    await new Promise(resolve => setTimeout(resolve, 300));

    return Array.from(mockContainers.values()).map(container => {
      const bulks = container.bulkIds
        .map(bulkId => mockBulks.get(bulkId))
        .filter(Boolean) as Bulk[];

      return {
        ...container,
        bulks
      };
    });
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "getAllShippingContainers",
      params,
      limit: 1000
    };

    const response = await fetchGraphQLSS(bdyq2);

    // Transform response to Container format
    const containers = response.data?.map((item: any) => ({
      id: item.id || item.containerId,
      containerNumber: item.containerNumber || item.containerNo,
      bulkIds: item.bulkIds || [],
      bulks: item.bulks || [],
      status: item.status || 'in_transit',
      arrivedAt: item.arrivedAt,
      receivedAt: item.receivedAt,
      totalBulks: item.totalBulks || (item.bulks?.length || 0)
    })) || [];

    return containers;
  } catch (error) {
    console.error('Error fetching containers:', error);
    throw error;
  }
}

/**
 * Get single container by ID
 * Uses GraphQL query: getShippingContainerById
 */
export async function getContainer(id: string): Promise<Container> {
  if (config.useMockApi) {
    ensureInitialized();
    await new Promise(resolve => setTimeout(resolve, 200));

    const container = mockContainers.get(id);
    if (!container) {
      throw new Error('Container not found');
    }

    const bulks = container.bulkIds
      .map(bulkId => mockBulks.get(bulkId))
      .filter(Boolean) as Bulk[];

    return { ...container, bulks };
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: id
    };

    const bdyq2 = {
      query: "getShippingContainerBy",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    const item = response.data?.[0] || response.data;

    if (!item) {
      throw new Error('Container not found');
    }

    return {
      id: item.id || item.containerId,
      containerNumber: item.containerNumber || item.containerNo,
      bulkIds: item.bulkIds || [],
      bulks: item.bulks || [],
      status: item.status || 'in_transit',
      arrivedAt: item.arrivedAt,
      receivedAt: item.receivedAt,
      totalBulks: item.totalBulks || (item.bulks?.length || 0)
    };
  } catch (error) {
    console.error('Error fetching container:', error);
    throw error;
  }
}

/**
 * Create new container
 * Uses GraphQL query: addShippingContainer
 */
export async function createContainer(data: {
  containerNumber: string;
  status?: Container['status'];
}): Promise<Container> {
  if (false && config.useMockApi) {
    ensureInitialized();
    await new Promise(resolve => setTimeout(resolve, 400));

    const newContainer: Container = {
      id: generateId('container'),
      containerNumber: data.containerNumber,
      bulkIds: [],
      status: data.status || 'in_transit',
      totalBulks: 0
    };

    mockContainers.set(newContainer.id, newContainer);
    return { ...newContainer, bulks: [] };
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const form = {
      id: generateShortCode(16),
      containerNumber: data.containerNumber,
      status: data.status || 'in_transit',
      bulkIds: [],
      totalBulks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const bdyq2 = {
      query: "addShippingContainer",
      params,
      form
    };

    const response = await fetchGraphQLSS(bdyq2);

    return {
      id: form.id,
      containerNumber: form.containerNumber,
      bulkIds: [],
      bulks: [],
      status: form.status,
      totalBulks: 0
    };
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
  }
}

/**
 * Update container
 * Uses GraphQL query: updateShippingContainer
 */
export async function updateContainer(
  id: string,
  data: Partial<Omit<Container, 'id' | 'bulks'>>
): Promise<any> {


  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: id,
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const form = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    const bdyq2 = {
      query: "updateShippingContainer",
      params,
      form
    };

    const response = await fetchGraphQLSS(bdyq2);
    await listContainers()
    // Fetch updated container
    return {id};
  } catch (error) {
    console.error('Error updating container:', error);
    throw error;
  }
}

/**
 * Delete container
 * Uses GraphQL query: deleteShippingContainer
 */
export async function deleteContainer(id: string): Promise<void> {
  if (config.useMockApi) {
    ensureInitialized();
    await new Promise(resolve => setTimeout(resolve, 300));

    const container = mockContainers.get(id);
    if (!container) {
      throw new Error('Container not found');
    }

    // Delete associated bulks
    container.bulkIds.forEach(bulkId => mockBulks.delete(bulkId));

    mockContainers.delete(id);
    return;
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: id,
      userId: authStore.state?.user?.uid
    };

    const bdyq2 = {
      query: "deleteShippingContainer",
      params
    };

    await fetchGraphQLSS(bdyq2);
  } catch (error) {
    console.error('Error deleting container:', error);
    throw error;
  }
}

/**
 * Add bulk to container
 * Uses GraphQL query: addInventory
 */
export async function addBulk(data: {
  containerId: string;
  trackingNumber: string;
  name?: string;
}): Promise<Bulk> {
  if (config.useMockApi) {
    ensureInitialized();
    await new Promise(resolve => setTimeout(resolve, 400));

    const container = mockContainers.get(data.containerId);
    if (!container) {
      throw new Error('Container not found');
    }

    const newBulk: Bulk = {
      id: generateId('bulk'),
      containerId: data.containerId,
      trackingNumber: data.trackingNumber,
      name: data.name,
      status: 'pending'
    };

    mockBulks.set(newBulk.id, newBulk);

    // Update container
    container.bulkIds.push(newBulk.id);
    container.totalBulks = container.bulkIds.length;
    mockContainers.set(container.id, container);

    return newBulk;
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const form = {
      id: generateShortCode(16),
      containerId: data.containerId,
      trackingNumber: data.trackingNumber,
      name: data.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    };



    const bdyq2 = {
      query: "addInventory",
      params,
      form
    };

    console.log(bdyq2)
   // const response = await fetchGraphQLSS(bdyq2);

    return {
      id: form.id,
      containerId: form.containerId,
      trackingNumber: form.trackingNumber,
      name: form.name,
      status: form.status
    };
  } catch (error) {
    console.error('Error adding bulk:', error);
    throw error;
  }
}

/**
 * Update bulk
 * Uses GraphQL query: updateInventory
 */
export async function updateBulk(
  id: string,
  data: any
): Promise<Bulk> {


  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: id,
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const form = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    const bdyq2 = {
      query: "updateInventory",
      params,
      form
    };

    console.log(bdyq2)



    await fetchGraphQLSS(bdyq2);

    // Return updated bulk
    return {
      id,
      ...data
    } as Bulk;
  } catch (error) {
    console.error('Error updating bulk:', error);
    throw error;
  }
}

/**
 * Delete bulk
 * Uses GraphQL query: deleteInventory
 */
export async function deleteBulk(id: string): Promise<void> {
  if (config.useMockApi) {
    ensureInitialized();
    await new Promise(resolve => setTimeout(resolve, 300));

    const bulk = mockBulks.get(id);
    if (!bulk) {
      throw new Error('Bulk not found');
    }

    // Remove from container
    const container = mockContainers.get(bulk.containerId);
    if (container) {
      container.bulkIds = container.bulkIds.filter(bid => bid !== id);
      container.totalBulks = container.bulkIds.length;
      mockContainers.set(container.id, container);
    }

    mockBulks.delete(id);
    return;
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: id,
      userId: authStore.state?.user?.uid
    };

    const bdyq2 = {
      query: "deleteInventory",
      params
    };

    await fetchGraphQLSS(bdyq2);
  } catch (error) {
    console.error('Error deleting bulk:', error);
    throw error;
  }
}
