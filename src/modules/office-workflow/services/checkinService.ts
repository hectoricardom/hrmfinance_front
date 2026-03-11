/**
 * Check-In Service
 * Manages the client check-in queue, walk-ins, and wait time estimation
 */

import { fetchGraphQLSS, devLog } from '../../../services/utils';
import type {
  CheckInEntry,
  CheckInStatus,
  WaitTimeEstimate,
  PreVisitFormData,
} from '../types/workflowTypes';

// ============================================
// Queue Counter (in-memory for session)
// ============================================

let queueCounter = 0;

const getNextQueueNumber = (): number => {
  queueCounter += 1;
  return queueCounter;
};

/** Reset counter (called at start of day or on load) */
export const resetQueueCounter = (startFrom: number = 0): void => {
  queueCounter = startFrom;
};

// ============================================
// Check-In Service
// ============================================

class CheckInService {
  private readonly AVERAGE_PROCESSING_MINUTES = 35; // default fallback

  /**
   * Check in an existing client by their ID
   */
  async checkInClient(clientId: string, notes?: string): Promise<CheckInEntry> {
    try {
      devLog('CheckInService: checking in client', clientId);

      // TODO: Replace with actual GraphQL mutation when backend is ready
      const result = await fetchGraphQLSS({
        query: `mutation CheckInClient($clientId: String!, $notes: String) {
          checkInClient(clientId: $clientId, notes: $notes) {
            id
            queueNumber
            clientId
            clientName
            phone
            email
            checkInTime
            status
            estimatedWaitMinutes
            hasPreVisitForm
            isWalkIn
            appointmentId
            notes
          }
        }`,
        params: { clientId, notes },
      });

      if (result?.data?.checkInClient) {
        return result.data.checkInClient as CheckInEntry;
      }

      // Fallback: create a local entry if API not available
      const entry = this.createLocalEntry({
        clientId,
        clientName: 'Client ' + clientId,
        phone: '',
        isWalkIn: false,
        notes,
      });

      return entry;
    } catch (error) {
      devLog('CheckInService: error checking in client', error);
      throw error;
    }
  }

  /**
   * Check in a walk-in client without an existing record
   */
  async checkInWalkIn(name: string, phone: string, serviceType?: string): Promise<CheckInEntry> {
    try {
      devLog('CheckInService: checking in walk-in', name, phone);

      // TODO: Replace with actual GraphQL mutation when backend is ready
      const result = await fetchGraphQLSS({
        query: `mutation CheckInWalkIn($name: String!, $phone: String!, $serviceType: String) {
          checkInWalkIn(name: $name, phone: $phone, serviceType: $serviceType) {
            id
            queueNumber
            clientId
            clientName
            phone
            checkInTime
            status
            estimatedWaitMinutes
            isWalkIn
            serviceType
          }
        }`,
        params: { name, phone, serviceType },
      });

      if (result?.data?.checkInWalkIn) {
        return result.data.checkInWalkIn as CheckInEntry;
      }

      // Fallback: create local entry
      const entry = this.createLocalEntry({
        clientName: name,
        phone,
        isWalkIn: true,
        serviceType,
      });

      return entry;
    } catch (error) {
      devLog('CheckInService: error checking in walk-in', error);
      throw error;
    }
  }

  /**
   * Submit pre-visit form data and check in
   */
  async submitPreVisitForm(
    portalId: string,
    token: string,
    formData: PreVisitFormData
  ): Promise<{ success: boolean; queuePosition: number; estimatedWaitMinutes: number }> {
    try {
      devLog('CheckInService: submitting pre-visit form', portalId);

      // TODO: Replace with actual GraphQL mutation when backend is ready
      const result = await fetchGraphQLSS({
        query: `mutation SubmitPreVisitForm($portalId: String!, $token: String!, $formData: PreVisitFormInput!) {
          submitPreVisitForm(portalId: $portalId, token: $token, formData: $formData) {
            success
            queuePosition
            estimatedWaitMinutes
            entryId
          }
        }`,
        params: { portalId, token, formData },
      });

      if (result?.data?.submitPreVisitForm) {
        return result.data.submitPreVisitForm;
      }

      // Fallback response
      return {
        success: true,
        queuePosition: getNextQueueNumber(),
        estimatedWaitMinutes: this.AVERAGE_PROCESSING_MINUTES,
      };
    } catch (error) {
      devLog('CheckInService: error submitting pre-visit form', error);
      throw error;
    }
  }

  /**
   * Get the current waiting list sorted by check-in time
   */
  async getWaitingList(): Promise<CheckInEntry[]> {
    try {
      devLog('CheckInService: fetching waiting list');

      // TODO: Replace with actual GraphQL query when backend is ready
      const result = await fetchGraphQLSS({
        query: `query GetWaitingList {
          getWaitingList {
            id
            queueNumber
            clientId
            clientName
            phone
            email
            checkInTime
            status
            serviceType
            notes
            assignedPreparerId
            assignedPreparerName
            estimatedWaitMinutes
            startedAt
            completedAt
            hasPreVisitForm
            isWalkIn
            appointmentId
          }
        }`,
      });

      if (result?.data?.getWaitingList) {
        const list = result.data.getWaitingList as CheckInEntry[];
        return list.sort((a, b) => a.checkInTime - b.checkInTime);
      }

      return [];
    } catch (error) {
      devLog('CheckInService: error fetching waiting list', error);
      throw error;
    }
  }

  /**
   * Call the next client from the queue
   */
  async callNextClient(): Promise<CheckInEntry | null> {
    try {
      devLog('CheckInService: calling next client');

      // TODO: Replace with actual GraphQL mutation when backend is ready
      const result = await fetchGraphQLSS({
        query: `mutation CallNextClient {
          callNextClient {
            id
            queueNumber
            clientName
            phone
            status
            assignedPreparerId
            assignedPreparerName
          }
        }`,
      });

      if (result?.data?.callNextClient) {
        return result.data.callNextClient as CheckInEntry;
      }

      return null;
    } catch (error) {
      devLog('CheckInService: error calling next client', error);
      throw error;
    }
  }

  /**
   * Mark a check-in entry as in progress and assign a preparer
   */
  async markInProgress(entryId: string, preparerId: string, preparerName?: string): Promise<CheckInEntry> {
    try {
      devLog('CheckInService: marking in progress', entryId, preparerId);

      // TODO: Replace with actual GraphQL mutation when backend is ready
      const result = await fetchGraphQLSS({
        query: `mutation MarkInProgress($entryId: String!, $preparerId: String!, $preparerName: String) {
          markInProgress(entryId: $entryId, preparerId: $preparerId, preparerName: $preparerName) {
            id
            status
            assignedPreparerId
            assignedPreparerName
            startedAt
          }
        }`,
        params: { entryId, preparerId, preparerName },
      });

      if (result?.data?.markInProgress) {
        return result.data.markInProgress as CheckInEntry;
      }

      throw new Error('Failed to mark entry as in progress');
    } catch (error) {
      devLog('CheckInService: error marking in progress', error);
      throw error;
    }
  }

  /**
   * Mark a check-in entry as completed
   */
  async markCompleted(entryId: string): Promise<CheckInEntry> {
    try {
      devLog('CheckInService: marking completed', entryId);

      // TODO: Replace with actual GraphQL mutation when backend is ready
      const result = await fetchGraphQLSS({
        query: `mutation MarkCompleted($entryId: String!) {
          markCompleted(entryId: $entryId) {
            id
            status
            completedAt
          }
        }`,
        params: { entryId },
      });

      if (result?.data?.markCompleted) {
        return result.data.markCompleted as CheckInEntry;
      }

      throw new Error('Failed to mark entry as completed');
    } catch (error) {
      devLog('CheckInService: error marking completed', error);
      throw error;
    }
  }

  /**
   * Mark a check-in entry as no-show
   */
  async markNoShow(entryId: string): Promise<CheckInEntry> {
    try {
      devLog('CheckInService: marking no-show', entryId);

      // TODO: Replace with actual GraphQL mutation when backend is ready
      const result = await fetchGraphQLSS({
        query: `mutation MarkNoShow($entryId: String!) {
          markNoShow(entryId: $entryId) {
            id
            status
            completedAt
          }
        }`,
        params: { entryId },
      });

      if (result?.data?.markNoShow) {
        return result.data.markNoShow as CheckInEntry;
      }

      throw new Error('Failed to mark entry as no-show');
    } catch (error) {
      devLog('CheckInService: error marking no-show', error);
      throw error;
    }
  }

  /**
   * Estimate wait time based on queue position and average processing time
   */
  async estimateWaitTime(): Promise<WaitTimeEstimate> {
    try {
      // TODO: Replace with actual GraphQL query when backend is ready
      const result = await fetchGraphQLSS({
        query: `query EstimateWaitTime {
          estimateWaitTime {
            estimatedMinutes
            queuePosition
            activePreparers
            averageProcessingMinutes
            confidence
          }
        }`,
      });

      if (result?.data?.estimateWaitTime) {
        return result.data.estimateWaitTime as WaitTimeEstimate;
      }

      // Fallback: calculate locally
      return this.calculateLocalWaitEstimate(0, 1);
    } catch (error) {
      devLog('CheckInService: error estimating wait time', error);
      return this.calculateLocalWaitEstimate(0, 1);
    }
  }

  /**
   * Get historical average processing time
   */
  async getAverageProcessingTime(): Promise<number> {
    try {
      // TODO: Replace with actual GraphQL query when backend is ready
      const result = await fetchGraphQLSS({
        query: `query GetAverageProcessingTime {
          getAverageProcessingTime {
            averageMinutes
            sampleSize
          }
        }`,
      });

      if (result?.data?.getAverageProcessingTime) {
        return result.data.getAverageProcessingTime.averageMinutes;
      }

      return this.AVERAGE_PROCESSING_MINUTES;
    } catch (error) {
      devLog('CheckInService: error getting average processing time', error);
      return this.AVERAGE_PROCESSING_MINUTES;
    }
  }

  /**
   * Look up appointment by phone number (for kiosk check-in)
   */
  async lookupAppointmentByPhone(phone: string): Promise<{
    found: boolean;
    appointmentId?: string;
    clientName?: string;
    scheduledTime?: string;
    serviceType?: string;
  }> {
    try {
      devLog('CheckInService: looking up appointment by phone', phone);

      // TODO: Replace with actual GraphQL query when backend is ready
      const result = await fetchGraphQLSS({
        query: `query LookupAppointmentByPhone($phone: String!) {
          lookupAppointmentByPhone(phone: $phone) {
            found
            appointmentId
            clientName
            scheduledTime
            serviceType
          }
        }`,
        params: { phone },
      });

      if (result?.data?.lookupAppointmentByPhone) {
        return result.data.lookupAppointmentByPhone;
      }

      return { found: false };
    } catch (error) {
      devLog('CheckInService: error looking up appointment', error);
      return { found: false };
    }
  }

  /**
   * Get today's appointments for the assistant dashboard
   */
  async getTodayAppointments(): Promise<Array<{
    id: string;
    clientName: string;
    scheduledTime: string;
    serviceType: string;
    status: string;
    phone: string;
  }>> {
    try {
      // TODO: Replace with actual GraphQL query when backend is ready
      const result = await fetchGraphQLSS({
        query: `query GetTodayAppointments {
          getTodayAppointments {
            id
            clientName
            scheduledTime
            serviceType
            status
            phone
          }
        }`,
      });

      if (result?.data?.getTodayAppointments) {
        return result.data.getTodayAppointments;
      }

      return [];
    } catch (error) {
      devLog('CheckInService: error getting today appointments', error);
      return [];
    }
  }

  /**
   * Get missing document alerts
   */
  async getMissingDocumentAlerts(): Promise<Array<{
    clientId: string;
    clientName: string;
    missingDocuments: string[];
    daysWaiting: number;
  }>> {
    try {
      // TODO: Replace with actual GraphQL query when backend is ready
      const result = await fetchGraphQLSS({
        query: `query GetMissingDocumentAlerts {
          getMissingDocumentAlerts {
            clientId
            clientName
            missingDocuments
            daysWaiting
          }
        }`,
      });

      if (result?.data?.getMissingDocumentAlerts) {
        return result.data.getMissingDocumentAlerts;
      }

      return [];
    } catch (error) {
      devLog('CheckInService: error getting missing document alerts', error);
      return [];
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Create a local check-in entry (fallback when API is unavailable)
   */
  private createLocalEntry(params: {
    clientId?: string;
    clientName: string;
    phone: string;
    isWalkIn: boolean;
    serviceType?: string;
    notes?: string;
    preVisitData?: PreVisitFormData;
  }): CheckInEntry {
    const queueNumber = getNextQueueNumber();
    const now = Date.now();

    return {
      id: `local_${now}_${queueNumber}`,
      queueNumber,
      clientId: params.clientId,
      clientName: params.clientName,
      phone: params.phone,
      checkInTime: now,
      status: 'waiting',
      serviceType: params.serviceType,
      notes: params.notes,
      estimatedWaitMinutes: this.AVERAGE_PROCESSING_MINUTES,
      hasPreVisitForm: !!params.preVisitData,
      preVisitData: params.preVisitData,
      isWalkIn: params.isWalkIn,
    };
  }

  /**
   * Calculate wait estimate locally
   */
  private calculateLocalWaitEstimate(
    queuePosition: number,
    activePreparers: number
  ): WaitTimeEstimate {
    const avgProcessing = this.AVERAGE_PROCESSING_MINUTES;
    const preparers = Math.max(activePreparers, 1);
    const estimatedMinutes = Math.ceil((queuePosition * avgProcessing) / preparers);

    return {
      estimatedMinutes,
      queuePosition,
      activePreparers: preparers,
      averageProcessingMinutes: avgProcessing,
      confidence: queuePosition <= 3 ? 'high' : queuePosition <= 6 ? 'medium' : 'low',
    };
  }
}

export const checkinService = new CheckInService();
