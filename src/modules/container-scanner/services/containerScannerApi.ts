/**
 * API service layer for Container Scanner
 * Handles all backend communication
 * Supports both real and mock APIs
 * Integrates with real GraphQL backend
 */

import { Container, Bulk } from '../types/containerScannerTypes';
import { getConfig } from '../config/scannerConfig';
import { fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import {
  fetchContainerMock,
  markBulkAsScannedMock,
  markContainerAsReceivedMock
} from './mockContainerApi';

const config = getConfig();
const API_BASE_URL = config.apiBaseUrl;

/**
 * Fetch container data with all associated bulks
 * Uses GraphQL query: getShippingContainerBy
 */
export async function fetchContainer(containerId: string): Promise<Container> {
  // Use mock API if configured
  if (config.useMockApi) {
    return fetchContainerMock(containerId);
  }

  try {
    const params: Record<string, any> = {
      id: containerId
    };

    const bdyq2 = {
      query: "getShippingContainers",
      params,
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND !* contain :search5 AND id contain id",
      
    };

    const response = await fetchGraphQLSS(bdyq2);
    const item = response.data?.[0] || response.data;

    if (!item) {
      throw new Error('Container not found. Please verify the QR code.');
    }

    // Transform response to Container format
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
 * Mark a bulk as scanned in the backend
 * Uses GraphQL mutation: updateInventory
 */
export async function markBulkAsScanned(bulkId: string): Promise<Bulk> {
  // Use mock API if configured
  if (config.useMockApi) {
    return markBulkAsScannedMock(bulkId);
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: bulkId,
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const form = {
      status: 'scanned',
      scannedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const bdyq2 = {
      query: "updateInventory",
      params,
      form
    };

    await fetchGraphQLSS(bdyq2);

    // Return updated bulk
    return {
      id: bulkId,
      status: 'scanned',
      scannedAt: form.scannedAt
    } as Bulk;
  } catch (error) {
    console.error('Error marking bulk as scanned:', error);
    throw error;
  }
}

/**
 * Mark entire container as received by distribution center
 * Uses GraphQL mutation: updateShippingContainer
 */
export async function markContainerAsReceived(containerId: string): Promise<Container> {
  // Use mock API if configured
  if (config.useMockApi) {
    return markContainerAsReceivedMock(containerId);
  }

  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: containerId,
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const form = {
      status: 'received',
      receivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const bdyq2 = {
      query: "updateShippingContainer",
      params,
      form
    };

    await fetchGraphQLSS(bdyq2);

    // Fetch updated container
    return await fetchContainer(containerId);
  } catch (error) {
    console.error('Error marking container as received:', error);
    throw error;
  }
}

/**
 * Validate a scanned QR code
 * Returns the bulk ID if valid, null otherwise
 */
export function parseQRCode(qrCode: string): string | null {
  if (!qrCode || qrCode.trim() === '') {
    return null;
  }

  // QR codes might have different formats, adjust parsing logic as needed
  // For now, assuming QR code contains the bulk ID directly
  return qrCode.trim();
}




//. ffmpeg -i 4444.mp4 -c:v libx264 -crf 28 -c:a aac -b:a 128k 444o.mp4
