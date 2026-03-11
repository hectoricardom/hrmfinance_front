import { apiAdapter } from '../../../services/apiAdapter';

export interface ScannedLocationUpdate {
  barcode: string;
  newLocation: string;
  timestamp?: number;
  userId?: string;
  notes?: string;
}

export interface ScannedLocationRecord {
  id: string;
  barcode: string;
  location: string;
  previousLocation?: string;
  lastScanned: number;
  lastUpdated: number;
  updatedBy?: string;
  scanCount: number;
  notes?: string;
}

export interface ScannerAPIResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class ScannerService {
  private readonly baseEndpoint = '/scanned-locations';

  /**
   * Update the location of a scanned barcode
   */
  async updateScannedLocation(update: ScannedLocationUpdate): Promise<ScannerAPIResponse> {
    try {
      const payload = {
        ...update,
        timestamp: update.timestamp || Date.now(),
      };

      console.log('Updating scanned location:', payload);

      const response = await apiAdapter.post(`${this.baseEndpoint}/update`, payload);
      
      return {
        success: true,
        message: `Location updated successfully for barcode ${update.barcode}`,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error updating scanned location:', error);
      return {
        success: false,
        message: 'Failed to update scanned location',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get location history for a specific barcode
   */
  async getLocationHistory(barcode: string): Promise<ScannerAPIResponse> {
    try {
      console.log('Getting location history for barcode:', barcode);

      const response = await apiAdapter.get(`${this.baseEndpoint}/history/${barcode}`);
      
      return {
        success: true,
        message: 'Location history retrieved successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error getting location history:', error);
      return {
        success: false,
        message: 'Failed to get location history',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current location of a scanned barcode
   */
  async getCurrentLocation(barcode: string): Promise<ScannerAPIResponse> {
    try {
      console.log('Getting current location for barcode:', barcode);

      const response = await apiAdapter.get(`${this.baseEndpoint}/current/${barcode}`);
      
      return {
        success: true,
        message: 'Current location retrieved successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error getting current location:', error);
      return {
        success: false,
        message: 'Failed to get current location',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all scanned locations with optional filtering
   */
  async getAllScannedLocations(filters?: {
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScannerAPIResponse> {
    try {
      console.log('Getting all scanned locations with filters:', filters);

      const queryParams = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = `${this.baseEndpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiAdapter.get(url);
      
      return {
        success: true,
        message: 'Scanned locations retrieved successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error getting scanned locations:', error);
      return {
        success: false,
        message: 'Failed to get scanned locations',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Bulk update multiple scanned locations
   */
  async bulkUpdateLocations(updates: ScannedLocationUpdate[]): Promise<ScannerAPIResponse> {
    try {
      console.log('Bulk updating scanned locations:', updates);

      const payload = {
        updates: updates.map(update => ({
          ...update,
          timestamp: update.timestamp || Date.now()
        }))
      };

      const response = await apiAdapter.post(`${this.baseEndpoint}/bulk-update`, payload);
      
      return {
        success: true,
        message: `Successfully updated ${updates.length} scanned locations`,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error bulk updating scanned locations:', error);
      return {
        success: false,
        message: 'Failed to bulk update scanned locations',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a scanned location record
   */
  async deleteScannedLocation(barcode: string): Promise<ScannerAPIResponse> {
    try {
      console.log('Deleting scanned location for barcode:', barcode);

      const response = await apiAdapter.delete(`${this.baseEndpoint}/${barcode}`);
      
      return {
        success: true,
        message: `Scanned location deleted successfully for barcode ${barcode}`,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error deleting scanned location:', error);
      return {
        success: false,
        message: 'Failed to delete scanned location',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Record a scan event (without updating location)
   */
  async recordScan(barcode: string, location?: string, notes?: string): Promise<ScannerAPIResponse> {
    try {
      const payload = {
        barcode,
        location,
        notes,
        timestamp: Date.now()
      };

      console.log('Recording scan event:', payload);

      const response = await apiAdapter.post(`${this.baseEndpoint}/scan`, payload);
      
      return {
        success: true,
        message: `Scan recorded successfully for barcode ${barcode}`,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error recording scan:', error);
      return {
        success: false,
        message: 'Failed to record scan',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get scan statistics
   */
  async getScanStatistics(dateFrom?: string, dateTo?: string): Promise<ScannerAPIResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);

      const url = `${this.baseEndpoint}/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('Getting scan statistics:', url);

      const response = await apiAdapter.get(url);
      
      return {
        success: true,
        message: 'Scan statistics retrieved successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error getting scan statistics:', error);
      return {
        success: false,
        message: 'Failed to get scan statistics',
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}

// Create and export a singleton instance
export const scannerService = new ScannerService();
export default scannerService;