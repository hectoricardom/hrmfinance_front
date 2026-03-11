import { CubanPassportForm } from '../types/cubanPassport';
import { fetchGraphQLSS, generateRandomId, devLog } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

export interface SavedPassportApplication {
  id: string;
  applicationNumber: string;
  applicationData: CubanPassportForm;
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  submissionDate?: string;
  processingNotes?: string;
  businessId?: string;
  storeId?: string; // Associated store/location
  storeName?: string; // Store name for display
}

export interface CreatePassportApplicationInput {
  applicationData: CubanPassportForm;
  status?: 'draft' | 'submitted';
  processingNotes?: string;
}

export class CubanPassportApiService {
  private generateApplicationNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CP-${timestamp.toString().slice(-6)}${random}`;
  }

  async createPassportApplication(
    input: CreatePassportApplicationInput
  ): Promise<SavedPassportApplication> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = Date.now();
      const applicationData: SavedPassportApplication = {
        id: generateRandomId(),
        applicationNumber: this.generateApplicationNumber(),
        applicationData: input.applicationData,
        status: input.status || 'draft',
        createdBy: currentUser.uid,
        createdAt: now.toString(),
        updatedAt: now.toString(),
        processingNotes: input.processingNotes,
        businessId: authStore.getBusinessId(),
        storeId: input.applicationData.storeId,
        storeName: input.applicationData.storeName,
        ...(input.status === 'submitted' && { submissionDate: now.toString() })
      };

      const params = {
        businessId: authStore.getBusinessId()
      };

      const body = {
        query: "addCubanPassport",
        params,
        form: applicationData
      };

      devLog('Creating Cuban passport application:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.passportApplication || applicationData;
    } catch (error) {
      devLog('Error creating passport application:', error);
      throw new Error(`Failed to create passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPassportApplications(searchTerm?: string): Promise<SavedPassportApplication[]> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
      };

      // Add search terms if provided
      if (searchTerm && searchTerm.trim()) {
        searchTerm.split(" ").map((query, index) => {
          if (query) {
            params[`:search${index + 1}`] = query.trim();
          }
        });
      }

      const body = {
        query: "getCubanPassport",
        params,
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND user = guia"
      };

      //devLog('Fetching passport applications:', body);
      const response = await fetchGraphQLSS(body);
      
      let applications = response?.data || [];
      
      // Filter applications by user's allowed stores (unless admin)
      if (!authStore.isAdmin() && applications.length > 0) {
        const allowedStoreIds = authStore.getAllowedStoreIds();
        applications = applications.filter((app: SavedPassportApplication) => {
          // If no store is specified, allow it (backward compatibility)
          if (!app.storeId) return true;
          // If user has access to the store, allow it
          return allowedStoreIds.includes(app.storeId);
        });
      }
      
      return applications;
    } catch (error) {
      devLog('Error fetching passport applications:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error?.message?.includes('CORS')) {
        devLog('Using mock data due to CORS in development');
        return [];
      }
      
      throw new Error(`Failed to fetch passport applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPassportApplicationById(id: string): Promise<SavedPassportApplication | null> {
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
        query: "getCubanPassportById",
        params
      };

      devLog('Fetching passport application by id:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.passportApplication || null;
    } catch (error) {
      devLog('Error fetching passport application:', error);
      
      // Development fallback
      if (import.meta.env.DEV && error?.message?.includes('CORS')) {
        devLog('Using mock data due to CORS in development');
        return null;
      }
      
      throw new Error(`Failed to fetch passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePassportApplication(
    id: string, 
    updates: Partial<CreatePassportApplicationInput>
  ): Promise<SavedPassportApplication> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = Date.now();
      const updateData = {
        ...updates,
        updatedAt: now.toString(),
        updatedBy: currentUser.uid,
        ...(updates.applicationData?.storeId && { storeId: updates.applicationData.storeId }),
        ...(updates.applicationData?.storeName && { storeName: updates.applicationData.storeName }),
        ...(updates.status === 'submitted' && { submissionDate: now.toString() })
      };

      const params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      const body = {
        query: "updateCubanPassport",
        params,
        form: updateData
      };

      devLog('Updating passport application:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.passportApplication || { ...updateData, id } as SavedPassportApplication;
    } catch (error) {
      devLog('Error updating passport application:', error);
      throw new Error(`Failed to update passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePassportApplication(id: string): Promise<void> {
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
        query: "deleteCubanPassport",
        params
      };

      devLog('Deleting passport application:', body);
      const response = await fetchGraphQLSS(body);
      
      if (response?.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      devLog('Error deleting passport application:', error);
      throw new Error(`Failed to delete passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async submitPassportApplication(id: string, notes?: string): Promise<SavedPassportApplication> {
    return this.updatePassportApplication(id, {
      status: 'submitted',
      processingNotes: notes
    });
  }

  async updatePassportSignature(
    id: string, 
    signatureData: {
      signatureUrl?: string;
      signatureBase64?: string;
      signatureRequestId?: string;
    }
  ): Promise<SavedPassportApplication> {
    try {
      // Get current application
      const application = await this.getPassportApplicationById(id);
      if (!application) {
        throw new Error('Passport application not found');
      }

      // Update the application data with signature
      const updatedApplicationData = {
        ...application.applicationData,
        firmaUrl: signatureData.signatureUrl,
        firmaBase64: signatureData.signatureBase64,
        signatureRequestId: signatureData.signatureRequestId
      };

      // Save the updated application
      return this.updatePassportApplication(id, {
        applicationData: updatedApplicationData,
        processingNotes: `Firma actualizada desde solicitud de firma ${signatureData.signatureRequestId || 'directa'}`
      });
    } catch (error) {
      devLog('Error updating passport signature:', error);
      throw new Error(`Failed to update passport signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getApplicationStats(): Promise<Record<string, number>> {
    try {
      const currentUser = authStore.state.user;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const params = {
        businessId: authStore.getBusinessId(),
        userId: currentUser.uid
      };

      const body = {
        query: "getCubanPassportStats",
        params
      };

      devLog('Fetching passport application stats:', body);
      const response = await fetchGraphQLSS(body);
      
      return response?.stats || {
        draft: 0,
        submitted: 0,
        processing: 0,
        completed: 0,
        rejected: 0,
        total: 0
      };
    } catch (error) {
      devLog('Error fetching application stats:', error);
      return {
        draft: 0,
        submitted: 0,
        processing: 0,
        completed: 0,
        rejected: 0,
        total: 0
      };
    }
  }
}

// Export singleton instance
export const cubanPassportApiService = new CubanPassportApiService();
export default cubanPassportApiService;