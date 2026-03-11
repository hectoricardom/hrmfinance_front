import { fetchGraphQLSS, convertObj2Array, generateRandomId } from '../utils';
import { authStore } from '../../stores/authStore';
import type { 
  Appointment, 
  EventType, 
  AvailabilitySettings,
  BookingPageSettings,
  AppointmentStats,
  CreateAppointmentRequest,
  UpdateAppointmentRequest 
} from '../../modules/appointments/types';

/**
 * Appointment API Service
 * Handles all appointment-related API operations following the same patterns as invoice/inventory
 */
export class AppointmentApi {
  
  /**
   * Get appointments with optional search and filters
   */
  async getAppointments(query?: string, filters?: any): Promise<Appointment[]> {
    try {
      if (!(query && query?.trim())) {
        return [];
      }

      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        userId: authStore.state?.user?.uid
      };

      // Split search terms for flexible searching
      query && query.split(" ").map((qry, inDq) => {
        if (qry) {
          params[":search" + inDq] = qry.trim();
        }
      });

      let body = {
        query: "getAppointments",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];

      // Convert timestamps from Firestore format if needed
      return appointments.map(this.normalizeAppointment);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw new Error(`Failed to fetch appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all appointments for a specific user (host)
   */
  async getAppointmentsByHost(hostId: string): Promise<Appointment[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        hostId: hostId
      };

      let body = {
        query: "getAppointmentsByHost",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];

      return appointments.map(this.normalizeAppointment);
    } catch (error) {
      console.error('Error fetching appointments by host:', error);
      throw new Error(`Failed to fetch appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      let body = {
        query: "getAppointmentById",
        params
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointment) {
        return this.normalizeAppointment(response.appointment);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching appointment:', error);
      throw new Error(`Failed to fetch appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a new appointment
   */
  async addAppointment(appointmentData: CreateAppointmentRequest): Promise<Appointment> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      const formData = {
        ...appointmentData,
        id: generateRandomId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: appointmentData.status || 'pending'
      };

      let body = {
        query: "addAppointment",
        params,
        form: formData
      };

      const response = await fetchGraphQLSS(body);

      if (response.appointment) {
        return this.normalizeAppointment(response.appointment);
      }

      throw new Error('Failed to add appointment');
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw new Error(`Failed to add appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new appointment (alias for addAppointment for backwards compatibility)
   * @deprecated Use addAppointment instead
   */
  async createAppointment(appointmentData: CreateAppointmentRequest): Promise<Appointment> {
    return this.addAppointment(appointmentData);
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(id: string, updates: UpdateAppointmentRequest): Promise<Appointment> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      const formData = {
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: authStore.state?.user?.uid
      };

      let body = {
        query: "updateAppointment",
        params,
        form: formData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointment) {
        return this.normalizeAppointment(response.appointment);
      }
      
      throw new Error('Failed to update appointment');
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw new Error(`Failed to update appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(id: string, cancelledBy: 'host' | 'guest', reason?: string): Promise<Appointment> {
    try {
      const updates = {
        status: 'cancelled' as const,
        cancelledBy,
        cancellationReason: reason,
        cancelledAt: new Date().toISOString()
      };

      return await this.updateAppointment(id, updates);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw new Error(`Failed to cancel appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an appointment
   */
  async deleteAppointment(id: string): Promise<void> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      let body = {
        query: "deleteAppointment",
        params
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw new Error(`Failed to delete appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointment types for a user
   */
  async getAppointmentTypes(userId: string): Promise<EventType[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        userId: userId
      };

      let body = {
        query: "getAppointmentTypes",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const eventTypes = response.data?.data || response.data || [];

      return eventTypes.map(this.normalizeEventType);
    } catch (error) {
      console.error('Error fetching appointment types:', error);
      throw new Error(`Failed to fetch appointment types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event types for a user (alias for getAppointmentTypes for backwards compatibility)
   * @deprecated Use getAppointmentTypes instead
   */
  async getEventTypes(userId: string): Promise<EventType[]> {
    return this.getAppointmentTypes(userId);
  }

  /**
   * Create a new event type
   */
  async createEventType(eventTypeData: Omit<EventType, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventType> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      const formData = {
        ...eventTypeData,
        id: generateRandomId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let body = {
        query: "createEventType",
        params,
        form: formData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.eventType) {
        return this.normalizeEventType(response.eventType);
      }
      
      throw new Error('Failed to create event type');
    } catch (error) {
      console.error('Error creating event type:', error);
      throw new Error(`Failed to create event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an event type
   */
  async updateEventType(id: string, updates: Partial<EventType>): Promise<EventType> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      const formData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      let body = {
        query: "updateEventType",
        params,
        form: formData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.eventType) {
        return this.normalizeEventType(response.eventType);
      }
      
      throw new Error('Failed to update event type');
    } catch (error) {
      console.error('Error updating event type:', error);
      throw new Error(`Failed to update event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get availability settings for a user
   */
  async getAvailability(userId: string): Promise<AvailabilitySettings | null> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        userId: userId
      };

      let body = {
        query: "getAvailability",
        params
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.availability) {
        return this.normalizeAvailability(response.availability);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching availability:', error);
      throw new Error(`Failed to fetch availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save availability settings
   */
  async saveAvailability(availabilityData: AvailabilitySettings): Promise<AvailabilitySettings> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        userId: availabilityData.userId
      };

      const formData = {
        ...availabilityData,
        updatedAt: new Date().toISOString()
      };

      let body = {
        query: "saveAvailability",
        params,
        form: formData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.availability) {
        return this.normalizeAvailability(response.availability);
      }
      
      throw new Error('Failed to save availability');
    } catch (error) {
      console.error('Error saving availability:', error);
      throw new Error(`Failed to save availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get booking page settings
   */
  async getBookingPageSettings(userId: string): Promise<BookingPageSettings | null> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        userId: userId
      };

      let body = {
        query: "getBookingPageSettings",
        params
      };

      const response = await fetchGraphQLSS(body);
      
      return response.settings || null;
    } catch (error) {
      console.error('Error fetching booking page settings:', error);
      throw new Error(`Failed to fetch booking page settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(userId: string): Promise<AppointmentStats> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        userId: userId
      };

      let body = {
        query: "getAppointmentStats",
        params
      };

      const response = await fetchGraphQLSS(body);
      
      return response.stats || {
        totalAppointments: 0,
        confirmedAppointments: 0,
        cancelledAppointments: 0,
        completedAppointments: 0,
        pendingAppointments: 0,
        noShowAppointments: 0,
        upcomingAppointments: 0,
        todayAppointments: 0,
        thisWeekAppointments: 0,
        thisMonthAppointments: 0
      };
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      throw new Error(`Failed to fetch appointment stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize appointment data from API response
   */
  private normalizeAppointment(appointment: any): Appointment {
    return {
      ...appointment,
      startTime: this.parseDate(appointment.startTime),
      endTime: this.parseDate(appointment.endTime),
      createdAt: this.parseDate(appointment.createdAt),
      updatedAt: this.parseDate(appointment.updatedAt),
      cancelledAt: appointment.cancelledAt ? this.parseDate(appointment.cancelledAt) : undefined,
      confirmationSentAt: appointment.confirmationSentAt ? this.parseDate(appointment.confirmationSentAt) : undefined,
      reminderSentAt: appointment.reminderSentAt ? this.parseDate(appointment.reminderSentAt) : undefined
    };
  }

  /**
   * Normalize event type data from API response
   */
  private normalizeEventType(eventType: any): EventType {
    return {
      ...eventType,
      createdAt: this.parseDate(eventType.createdAt),
      updatedAt: this.parseDate(eventType.updatedAt)
    };
  }

  /**
   * Normalize availability data from API response
   */
  private normalizeAvailability(availability: any): AvailabilitySettings {
    return {
      ...availability,
      createdAt: this.parseDate(availability.createdAt),
      updatedAt: this.parseDate(availability.updatedAt)
    };
  }

  /**
   * Parse date from various formats (Firestore timestamp, ISO string, etc.)
   */
  private parseDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      // Firestore Timestamp
      return dateValue.toDate();
    }
    
    if (typeof dateValue === 'string') {
      // ISO string
      return new Date(dateValue);
    }
    
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Fallback to current date
    return new Date();
  }
}

// Export singleton instance
export const appointmentApi = new AppointmentApi();
export default appointmentApi;