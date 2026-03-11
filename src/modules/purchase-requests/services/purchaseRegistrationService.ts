import { 
  PurchaseRegistration, 
  CreatePurchaseRegistrationInput 
} from '../types/purchaseRequestTypes';
import { fetchGraphQLSS, generateRandomId } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

export class PurchaseRegistrationService {
  private generateRegistrationNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PC-${timestamp.toString().slice(-6)}${random}`;
  }

  private calculateNetTotal(totalPrice: number, bonus?: number, refund?: number): number {
    return totalPrice - (bonus || 0) - (refund || 0);
  }

  async createPurchaseRegistration(
    input: CreatePurchaseRegistrationInput, 
    createdBy?: string
  ): Promise<PurchaseRegistration> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = Date.now();
      const registrationData: PurchaseRegistration = {
        id: generateRandomId(),
        registrationNumber: this.generateRegistrationNumber(),
        store: input.store,
        platform: input.platform,
        totalProducts: input.totalProducts,
        totalPrice: input.totalPrice,
        currency: input.currency,
        bonus: input.bonus,
        refund: input.refund,
        netTotal: this.calculateNetTotal(input.totalPrice, input.bonus, input.refund),
        purchaseDate: input.purchaseDate,
        description: input.description,
        notes: input.notes,
        relatedRequests: input.relatedRequests || [],
        createdBy: createdBy || currentUser.uid,
        createdAt: now.toString(),
        updatedAt: now.toString()
      };

      const params = {
        businessId: authStore.getBusinessId()
      };

      const body = {
        query: "addPurchaseRecordYudith",
        params,
        form: registrationData
      };

      console.log('Creating purchase registration:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.purchaseRegistration || registrationData;
    } catch (error) {
      console.error('Error creating purchase registration:', error);
      throw new Error(`Failed to create purchase registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPurchaseRegistrations(): Promise<PurchaseRegistration[]> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const params = {
        businessId: authStore.getBusinessId(),
        ":search0": currentUser.uid
      };

      const body = {
        query: "getPurchaseRecordsYudith",
        params,
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND user = guia",
     
      };

      console.log('Fetching purchase registrations:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.data || [];
    } catch (error) {
      console.error('Error fetching purchase registrations:', error);
      
      // Development fallback - return mock data if needed
      if (import.meta.env.DEV && error.message?.includes('CORS')) {
        console.warn('Using mock data due to CORS in development');
        return [];
      }
      
      throw new Error(`Failed to fetch purchase registrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPurchaseRegistrationById(id: string): Promise<PurchaseRegistration | null> {
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
        query: "getPurchaseRegistrationById",
        params
      };

      console.log('Fetching purchase registration by id:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.purchaseRegistration || null;
    } catch (error) {
      console.error('Error fetching purchase registration:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error.message?.includes('CORS')) {
        console.warn('Using mock data due to CORS in development');
        return null;
      }
      
      throw new Error(`Failed to fetch purchase registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePurchaseRegistration(
    id: string, 
    updates: Partial<CreatePurchaseRegistrationInput>
  ): Promise<PurchaseRegistration> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Recalculate net total if financial data changed
      const netTotal = updates.totalPrice !== undefined || updates.bonus !== undefined || updates.refund !== undefined
        ? this.calculateNetTotal(
            updates.totalPrice || 0,
            updates.bonus,
            updates.refund
          )
        : undefined;
      
      const updateData = {
        ...updates,
        ...(netTotal !== undefined && { netTotal }),
        updatedAt: Date.now().toString()
      };

      const params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      const body = {
        query: "updatePurchaseRecordYudith",
        params,
        form: updateData
      };

      console.log('Updating purchase registration:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.purchaseRegistration || { id, ...updateData } as PurchaseRegistration;
    } catch (error) {
      console.error('Error updating purchase registration:', error);
      throw new Error(`Failed to update purchase registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePurchaseRegistration(id: string): Promise<void> {
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
        query: "deletePurchaseRecordYudith",
        params
      };

      console.log('Deleting purchase registration:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.success;
    } catch (error) {
      console.error('Error deleting purchase registration:', error);
      throw new Error(`Failed to delete purchase registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility method to get summary statistics
  async getPurchaseRegistrationSummary(): Promise<{
    totalRegistrations: number;
    totalAmount: number;
    totalProducts: number;
    totalBonus: number;
    totalRefunds: number;
    netAmount: number;
    platformBreakdown: Record<string, { count: number; amount: number; }>;
  }> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const params = {
        businessId: authStore.getBusinessId(),
       ":search0":  currentUser.uid
      };

      const body = {
        query: "getPurchaseRecordsYudith",
        params,
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
     
      };

      console.log('Fetching purchase registration summary:', body);
      const response = await fetchGraphQLSS(body);
      
      // If we get summary from API, return it
      if (response?.data) {
        return response.data;
      }

      // Otherwise calculate it from the registrations
      const registrations = await this.getPurchaseRegistrations();
      
      const summary = registrations.reduce((acc, registration) => {
        acc.totalRegistrations += 1;
        acc.totalAmount += registration.totalPrice;
        acc.totalProducts += registration.totalProducts;
        acc.totalBonus += registration.bonus || 0;
        acc.totalRefunds += registration.refund || 0;
        acc.netAmount += registration.netTotal;
        
        if (!acc.platformBreakdown[registration.platform]) {
          acc.platformBreakdown[registration.platform] = { count: 0, amount: 0 };
        }
        acc.platformBreakdown[registration.platform].count += 1;
        acc.platformBreakdown[registration.platform].amount += registration.totalPrice;
        
        return acc;
      }, {
        totalRegistrations: 0,
        totalAmount: 0,
        totalProducts: 0,
        totalBonus: 0,
        totalRefunds: 0,
        netAmount: 0,
        platformBreakdown: {} as Record<string, { count: number; amount: number; }>
      });
      
      return summary;
    } catch (error) {
      console.error('Error generating purchase registration summary:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error.message?.includes('CORS')) {
        console.warn('Using mock summary data due to CORS in development');
        return {
          totalRegistrations: 0,
          totalAmount: 0,
          totalProducts: 0,
          totalBonus: 0,
          totalRefunds: 0,
          netAmount: 0,
          platformBreakdown: {}
        };
      }
      
      throw new Error(`Failed to generate purchase registration summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const purchaseRegistrationService = new PurchaseRegistrationService();