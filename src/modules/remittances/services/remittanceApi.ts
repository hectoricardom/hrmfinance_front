import { fetchGraphQL, fetchGraphQLSS, generateRandomId } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { RemittanceData, CreateRemittanceRequest, UpdateRemittanceRequest, RemittanceFilter, RemittanceListResponse } from '../types/remittanceTypes';
import { generateRemittanceNumber } from '../utils/remittanceNumberGenerator';

/**
 * Remittance API Service
 * Handles CRUD operations for remittances
 */
export const remittanceApi = {
  /**
   * Get all remittances with optional filtering and pagination
   */
  async getAll(
    filter?: RemittanceFilter, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<RemittanceListResponse> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        page,
        pageSize
      };

      // Build query string based on filters
      let queryParts: string[] = ['businessId = businessId'];

      // Add user filtering if not admin
      const profile = authStore.state?.profile;
      if (profile && !profile.isAdmin && !profile.read_write) {
        // Regular users can only see their own remittances
        params[':createdBy'] = authStore.currentUser?.uid || 'unknown';
        queryParts.push('createdBy = :createdBy');
      }

      if (filter?.search) {
        filter.search.split(' ').forEach((term, index) => {
          const paramKey = `search${index}`;
          params[`:${paramKey}`] = term.trim();
          queryParts.push(`(remittanceNumber contain :${paramKey} OR customerName contain :${paramKey} OR reference contain :${paramKey})`);
        });
      }

      if (filter?.status) {
        params[':status'] = filter.status;
        queryParts.push('status = :status');
      }

      if (filter?.currency) {
        params[':currency'] = filter.currency;
        queryParts.push('currency = :currency');
      }

      if (filter?.dateFrom) {
        params[':dateFrom'] = filter.dateFrom.toISOString();
        queryParts.push('createdAt >= :dateFrom');
      }

      if (filter?.dateTo) {
        params[':dateTo'] = filter.dateTo.toISOString();
        queryParts.push('createdAt <= :dateTo');
      }

      if (filter?.customerId) {
        params[':customerId'] = filter.customerId;
        queryParts.push('customerId = :customerId');
      }

      const queryString = queryParts.join(' AND ');

      const body = {
        query: 'getRemittance',
        queryString,
        params
      };

      const response = await fetchGraphQLSS(body);
      
      return {
        remittances: response.data || [],
        total: response.total || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Error fetching remittances:', error);
      return {
        remittances: [],
        total: 0,
        page,
        pageSize
      };
    }
  },

  /**
   * Get a single remittance by ID
   */
  async getById(id: string): Promise<RemittanceData | null> {
    try {
      const params = {
        // businessId: authStore.getBusinessId(),
        id
      };

       

      const body = {
        query: 'getRemittance',
        queryString: '!* contain id',
        params: {
         // 'businessId': params.businessId,
          'id': params.id
        }
      };

      const response = await fetchGraphQLSS(body);
      console.log(body)
      console.log(response)
      if (response.data && response.data.length > 0) {
        return response.data[0] as RemittanceData;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching remittance by ID:', error);
      return null;
    }
  },

  /**
   * Create a new remittance
   */
  async create(remittanceRequest: CreateRemittanceRequest): Promise<RemittanceData> {
    try {
      const remittanceNumber = generateRemittanceNumber();
      
      const newRemittance: Omit<RemittanceData, 'id'> = {
        ...remittanceRequest,
        remittanceNumber,
        id: generateRandomId(),
        date: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        businessId: authStore.getBusinessId(),
        createdBy: authStore.currentUser?.uid || 'unknown'
      };

      const params = {
        businessId: authStore.getBusinessId()
      };

      const body = {
        query: 'addRemittance',
        params,
        form: newRemittance
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return {
        ...newRemittance
      } as RemittanceData;
    } catch (error) {
      console.error('Error creating remittance:', error);
      throw new Error('Error al crear la remesa');
    }
  },

  /**
   * Update an existing remittance
   */
  async update(updateRequest: UpdateRemittanceRequest): Promise<RemittanceData> {
    try {
      const updateData = {
        ...updateRequest,
        updatedAt: new Date()
      };

      const params = {
        businessId:  updateRequest.businessId,
        id: updateRequest.id
      };

      const body = {
        query: 'updateRemittance',
        params,
        form: updateData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Fetch the updated remittance
      const updatedRemittance = await this.getById(updateRequest.id);
      if (!updatedRemittance) {
        throw new Error('No se pudo recuperar la remesa actualizada');
      }

      return updatedRemittance;
    } catch (error) {
      console.error('Error updating remittance:', error);
      throw new Error('Error al actualizar la remesa');
    }
  },

  /**
   * Delete a remittance
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const params = {
        businessId: authStore.getBusinessId(),
        id
      };

      const body = {
        query: 'deleteRemittance',
        params
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return {
        success: true,
        message: 'Remesa eliminada exitosamente'
      };
    } catch (error) {
      console.error('Error deleting remittance:', error);
      return {
        success: false,
        message: 'Error al eliminar la remesa'
      };
    }
  },

  /**
   * Update remittance status
   */
  async updateStatus(id: string, status: string): Promise<RemittanceData> {
    return this.update({ id, status: status as any });
  },

  /**
   * Get remittances by customer
   */
  async getByCustomer(customerId: string): Promise<RemittanceData[]> {
    try {
      const filter: RemittanceFilter = {
        customerId
      };
      
      const response = await this.getAll(filter, 1, 100);
      return response.remittances;
    } catch (error) {
      console.error('Error fetching remittances by customer:', error);
      return [];
    }
  },

  /**
   * Get remittances statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCurrency: Record<string, number>;
    totalAmount: Record<string, number>;
  }> {
    try {
      const params = {
        businessId: authStore.getBusinessId()
      };

      const body = {
        query: 'getRemittanceStatistics',
        params
      };

      const response = await fetchGraphQLSS(body);
      
      return response.data || {
        total: 0,
        byStatus: {},
        byCurrency: {},
        totalAmount: {}
      };
    } catch (error) {
      console.error('Error fetching remittance statistics:', error);
      return {
        total: 0,
        byStatus: {},
        byCurrency: {},
        totalAmount: {}
      };
    }
  }
};

// Utility function to format remittance data
export const formatRemittanceForDisplay = (remittance: RemittanceData) => {
  return {
    ...remittance,
    formattedAmount: `${remittance.currency} ${remittance.amount.toFixed(2)}`,
    formattedDate: remittance.date.toLocaleDateString('es-ES'),
    customerName: remittance.customer.fullName || remittance.customer.name,
    statusLabel: getStatusLabel(remittance.status),
    statusColor: getStatusColor(remittance.status)
  };
};

// Get status label in Spanish
export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completada',
    cancelled: 'Cancelada'
  };
  return statusMap[status] || status;
};

// Get status color
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    cancelled: '#ef4444'
  };
  return colorMap[status] || '#6b7280';
};