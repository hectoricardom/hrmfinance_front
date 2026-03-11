import { 
  Consignee, 
  CreateConsigneeInput, 
  UpdateConsigneeInput 
} from '../types/shippingTypes';
import { fetchGraphQLSS, generateRandomId } from './utils';
import { authStore } from '../stores/authStore';

export class ConsigneeService {
  async createConsignee(input: CreateConsigneeInput): Promise<Consignee> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = Date.now();
      const consigneeData: Consignee = {
        ...input,
        id: generateRandomId(),
        consigneeId: generateRandomId(),
        ssg_consignee_key: generateRandomId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        businessId: input.businessId || authStore.getBusinessId() || 'all'
      };

      const params = {
        businessId: input.businessId || authStore.getBusinessId() || 'all'
      };

      const body = {
        query: "addConsigneeYabaExpress",
        params,
        form: consigneeData
      };

      console.log('Creating consignee:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.consignee || consigneeData;
    } catch (error) {
      console.error('Error creating consignee:', error);
      throw new Error(`Failed to create consignee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConsignees(searchTerm?: string, businessId?: string): Promise<Consignee[]> {
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
        query: "getConsigneeYabaExpress",
        params,
        queryString: searchTerm ? "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND user = guia" : ""
      };

      const response = await fetchGraphQLSS(body);
      
      return response?.data || [];
    } catch (error) {
      console.error('Error fetching consignees:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error?.message?.includes('CORS')) {
        console.warn('Using mock data due to CORS in development');
        return [];
      }
      
      throw new Error(`Failed to fetch consignees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConsigneeById(id: string): Promise<Consignee | null> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const params = {
        businessId: authStore.getBusinessId() || "all",
        id: id
      };

      const body = {
        query: "getConsigneeYabaExpressById",
        params
      };

      console.log('Fetching consignee by id:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.consignee || null;
    } catch (error) {
      console.error('Error fetching consignee:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error?.message?.includes('CORS')) {
        console.warn('Using mock data due to CORS in development');
        return null;
      }
      
      throw new Error(`Failed to fetch consignee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateConsignee(
    id: string, 
    updates: UpdateConsigneeInput
  ): Promise<Consignee> {
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
        businessId: authStore.getBusinessId() || "all",
        id: id
      };

      const body = {
        query: "updateConsigneeYabaExpress",
        params,
        form: updateData
      };

      console.log('Updating consignee:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.consignee || { ...updateData, id } as Consignee;
    } catch (error) {
      console.error('Error updating consignee:', error);
      throw new Error(`Failed to update consignee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteConsignee(id: string): Promise<void> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const params = {
        businessId: authStore.getBusinessId() || "all",
        id: id
      };

      const body = {
        query: "deleteConsigneeYabaExpress",
        params
      };

      console.log('Deleting consignee:', body);
      const response = await fetchGraphQLSS(body);
      
      if (response?.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error deleting consignee:', error);
      throw new Error(`Failed to delete consignee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async toggleConsigneeStatus(id: string, isActive: boolean): Promise<Consignee> {
    return this.updateConsignee(id, { isActive });
  }

  /**
   * Get consignee by cid (Cuban ID / passport number)
   * @param cid - The cidentity field from HBL (Cuban ID or passport)
   * @returns Consignee data or null if not found
   */
  async getConsigneeByCid(cid: string): Promise<Consignee | null> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!cid || !cid.trim()) {
        return null;
      }

      const params = {
        ':cid': cid.trim()
      };

      const body = {
        query: "getConsigneeYabaExpress",
        params,
        queryString: "cid = :cid"
      };

      console.log('Fetching consignee by cid:', body);
      const response = await fetchGraphQLSS(body);

      // Return first match if found
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching consignee by cid:', error);

      // Development fallback
      if (import.meta.env.DEV && error?.message?.includes('CORS')) {
        console.warn('Using mock data due to CORS in development');
        return null;
      }

      // Don't throw error, just return null to allow processing to continue
      console.warn(`Failed to fetch consignee for cid ${cid}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const consigneeService = new ConsigneeService();
export default consigneeService;