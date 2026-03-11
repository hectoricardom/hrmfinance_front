import { 
  Shipper, 
  CreateShipperInput, 
  UpdateShipperInput 
} from '../types/shippingTypes';
import { devLog, fetchGraphQLSS, generateRandomId } from './utils';
import { authStore } from '../stores/authStore';

export class ShipperService {
  async createShipper(input: CreateShipperInput): Promise<Shipper> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = Date.now();
      const shipperData: Shipper = {
        id: generateRandomId(),
        name: input.name,
        companyName: input.companyName,
        address: input.address,
        contact: input.contact,
        taxId: input.taxId,
        licenseNumber: input.licenseNumber,
        insuranceInfo: input.insuranceInfo,
        notes: input.notes,
        isActive: input.isActive ?? true,
        createdBy: currentUser.uid,
        createdAt: now.toString(),
        updatedAt: now.toString(),
        businessId: authStore.getBusinessId()
      };

      const params = {
        businessId: authStore.getBusinessId()
      };

      const body = {
        query: "addShipper",
        params,
        form: shipperData
      };

      devLog('Creating shipper:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.shipper || shipperData;
    } catch (error) {
      console.error('Error creating shipper:', error);
      throw new Error(`Failed to create shipper: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getShippers(searchTerm?: string): Promise<Shipper[]> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      let params: Record<string, any> = {
        
      };

      // Add search terms if provided
      if (searchTerm && searchTerm.trim()) {
        searchTerm.split(" ").map((query, index) => {
          if (query) {
            params[`:search${index}`] = query.trim();
          }
        });
      }

      const body = {
        query: "getShipperYabaExpress",
        params,
        queryString: searchTerm ? "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND user = guia" : ""
      };

      devLog('Fetching shippers:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.data || [];
    } catch (error) {
      console.error('Error fetching shippers:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error?.message?.includes('CORS')) {
        console.warn('Using mock data due to CORS in development');
        return [];
      }
      
      throw new Error(`Failed to fetch shippers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getShipperById(id: string): Promise<Shipper | null> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      const body = {
        query: "getShipperById",
        params
      };

      devLog('Fetching shipper by id:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.shipper || null;
    } catch (error) {
      console.error('Error fetching shipper:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error?.message?.includes('CORS')) {
        console.warn('Using mock data due to CORS in development');
        return null;
      }
      
      throw new Error(`Failed to fetch shipper: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateShipper(
    id: string, 
    updates: UpdateShipperInput
  ): Promise<Shipper> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = Date.now();
      const updateData = {
        ...updates,
        updatedAt: now.toString(),
        updatedBy: currentUser.uid
      };

      const params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      const body = {
        query: "updateShipper",
        params,
        form: updateData
      };

      devLog('Updating shipper:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.shipper || { ...updateData, id } as Shipper;
    } catch (error) {
      console.error('Error updating shipper:', error);
      throw new Error(`Failed to update shipper: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteShipper(id: string): Promise<void> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      const body = {
        query: "deleteShipper",
        params
      };

      devLog('Deleting shipper:', body);
      const response = await fetchGraphQLSS(body);
      
      if (response?.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error deleting shipper:', error);
      throw new Error(`Failed to delete shipper: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async toggleShipperStatus(id: string, isActive: boolean): Promise<Shipper> {
    return this.updateShipper(id, { isActive });
  }
}

// Export singleton instance
export const shipperService = new ShipperService();
export default shipperService;