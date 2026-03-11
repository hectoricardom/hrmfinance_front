import { fetchGraphQLSS, convertObj2Array, generateRandomId, devLog } from '../utils';
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
 * Uses your existing GraphQL queries for appointment management
 */
export class AppointmentApiUpdated {
  
  // ============================================
  // APPOINTMENT QUERIES
  // ============================================
  
  /**
   * Get appointments with search
   */
  async getAppointments(query?: string, filters?: any): Promise<Appointment[]> {
    try {
      if (!(query && query?.trim())) {
        return [];
      }

      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
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

      devLog(body)
      devLog(response.data)

      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];
      //return appointments.map(this.normalizeAppointment);
      return appointments
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw new Error(`Failed to fetch appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointment by ID
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
      console.error('Error fetching appointment by ID:', error);
      throw new Error(`Failed to fetch appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all appointments
   */
  async getAllAppointments(): Promise<Appointment[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      let body = {
        query: "getAllAppointments",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];
      return appointments.map(this.normalizeAppointment);
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      throw new Error(`Failed to fetch all appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add new appointment
   */
  async addAppointment(appointmentData: any): Promise<Appointment> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      let body = {
        query: "addAppointment",
        params,
        form: appointmentData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointment) {
        return this.normalizeAppointment(response.appointment);
      }
      
      throw new Error('Failed to create appointment');
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw new Error(`Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add appointment with verification
   */
  async addAppointmentVerify(appointmentData: any): Promise<Appointment> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      let body = {
        query: "addAppointmentVerify",
        params,
        form: appointmentData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointment) {
        return this.normalizeAppointment(response.appointment);
      }
      
      throw new Error('Failed to create appointment with verification');
    } catch (error) {
      console.error('Error creating appointment with verification:', error);
      throw new Error(`Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(id: string, updates: any): Promise<Appointment> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      let body = {
        query: "updateAppointment",
        params,
        form: updates
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
   * Delete appointment
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
   * Search appointments
   */
  async searchAppointments(query: string): Promise<Appointment[]> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
      };

      // Split search terms
      query && query.split(" ").map((qry, inDq) => {
        if (qry) {
          params[":search" + inDq] = qry.trim();
        }
      });

      let body = {
        query: "searchAppointments",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];
      return appointments.map(this.normalizeAppointment);
    } catch (error) {
      console.error('Error searching appointments:', error);
      throw new Error(`Failed to search appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointments by status
   */
  async getAppointmentsByStatus(status: string): Promise<Appointment[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        status: status
      };

      let body = {
        query: "getAppointmentsByStatus",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];
      return appointments.map(this.normalizeAppointment);
    } catch (error) {
      console.error('Error fetching appointments by status:', error);
      throw new Error(`Failed to fetch appointments by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointments by date range
   */
  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };

      let body = {
        query: "getAppointmentsByDateRange",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];
      return appointments.map(this.normalizeAppointment);
    } catch (error) {
      console.error('Error fetching appointments by date range:', error);
      throw new Error(`Failed to fetch appointments by date range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointments by type
   */
  async getAppointmentsByType(typeId: string): Promise<Appointment[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        typeId: typeId
      };

      let body = {
        query: "getAppointmentsByType",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const appointments = response.data?.data || response.data || [];
      return appointments.map(this.normalizeAppointment);
    } catch (error) {
      console.error('Error fetching appointments by type:', error);
      throw new Error(`Failed to fetch appointments by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentsStats(): Promise<AppointmentStats> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      let body = {
        query: "getAppointmentsStats",
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

  // ============================================
  // APPOINTMENT TYPE QUERIES
  // ============================================

  /**
   * Get appointment types
   */
  async getAppointmentTypes(query?: string): Promise<EventType[]> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
      };

      if (query && query.trim()) {
        // Split search terms
        query.split(" ").map((qry, inDq) => {
          if (qry) {
            params[":search" + inDq] = qry.trim();
          }
        });
      }

      let body = {
        query: "getAppointmentTypes",
        queryString: query ? "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4" : undefined,
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
   * Get appointment type by ID
   */
  async getAppointmentTypeById(id: string): Promise<EventType | null> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      let body = {
        query: "getAppointmentTypeById",
        params
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointmentType) {
        return this.normalizeEventType(response.appointmentType);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching appointment type by ID:', error);
      throw new Error(`Failed to fetch appointment type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all appointment types
   */
  async getAllAppointmentTypes(): Promise<EventType[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      let body = {
        query: "getAllAppointmentTypes",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const eventTypes = response.data?.data || response.data || [];
      return eventTypes.map(this.normalizeEventType);
    } catch (error) {
      console.error('Error fetching all appointment types:', error);
      throw new Error(`Failed to fetch all appointment types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add appointment type
   */
  async addAppointmentType(typeData: any): Promise<EventType> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      let body = {
        query: "addAppointmentType",
        params,
        form: typeData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointmentType) {
        return this.normalizeEventType(response.appointmentType);
      }
      
      throw new Error('Failed to create appointment type');
    } catch (error) {
      console.error('Error creating appointment type:', error);
      throw new Error(`Failed to create appointment type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add appointment type with verification
   */
  async addAppointmentTypeVerify(typeData: any): Promise<EventType> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
      };

      let body = {
        query: "addAppointmentTypeVerify",
        params,
        form: typeData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointmentType) {
        return this.normalizeEventType(response.appointmentType);
      }
      
      throw new Error('Failed to create appointment type with verification');
    } catch (error) {
      console.error('Error creating appointment type with verification:', error);
      throw new Error(`Failed to create appointment type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update appointment type
   */
  async updateAppointmentType(id: string, updates: any): Promise<EventType> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      let body = {
        query: "updateAppointmentType",
        params,
        form: updates
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.appointmentType) {
        return this.normalizeEventType(response.appointmentType);
      }
      
      throw new Error('Failed to update appointment type');
    } catch (error) {
      console.error('Error updating appointment type:', error);
      throw new Error(`Failed to update appointment type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete appointment type
   */
  async deleteAppointmentType(id: string): Promise<void> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        id: id
      };

      let body = {
        query: "deleteAppointmentType",
        params
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error deleting appointment type:', error);
      throw new Error(`Failed to delete appointment type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search appointment types
   */
  async searchAppointmentTypes(query: string): Promise<EventType[]> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
      };

      // Split search terms
      query && query.split(" ").map((qry, inDq) => {
        if (qry) {
          params[":search" + inDq] = qry.trim();
        }
      });

      let body = {
        query: "searchAppointmentTypes",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const eventTypes = response.data?.data || response.data || [];
      return eventTypes.map(this.normalizeEventType);
    } catch (error) {
      console.error('Error searching appointment types:', error);
      throw new Error(`Failed to search appointment types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointment types by status
   */
  async getAppointmentTypesByStatus(status: string): Promise<EventType[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        status: status
      };

      let body = {
        query: "getAppointmentTypesByStatus",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const eventTypes = response.data?.data || response.data || [];
      return eventTypes.map(this.normalizeEventType);
    } catch (error) {
      console.error('Error fetching appointment types by status:', error);
      throw new Error(`Failed to fetch appointment types by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointment types by category
   */
  async getAppointmentTypesByCategory(category: string): Promise<EventType[]> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        category: category
      };

      let body = {
        query: "getAppointmentTypesByCategory",
        params
      };

      const response = await fetchGraphQLSS(body);
      // Handle nested response structure: { data: { success: true, data: [...] } }
      const eventTypes = response.data?.data || response.data || [];
      return eventTypes.map(this.normalizeEventType);
    } catch (error) {
      console.error('Error fetching appointment types by category:', error);
      throw new Error(`Failed to fetch appointment types by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * Cancel appointment (convenience method)
   */
  async cancelAppointment(id: string, cancelledBy: 'host' | 'guest', reason?: string): Promise<Appointment> {
    const updates = {
      status: 'cancelled',
      cancelledBy,
      cancellationReason: reason,
      cancelledAt: new Date().toISOString()
    };

    return await this.updateAppointment(id, updates);
  }

  /**
   * Get appointments for host (convenience method)
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
   * Get event types for user (convenience method for backward compatibility)
   */
  async getEventTypes(userId: string): Promise<EventType[]> {
    return await this.getAppointmentTypes(userId);
  }

  /**
   * Create event type (convenience method for backward compatibility)
   */
  async createEventType(eventTypeData: any): Promise<EventType> {
    return await this.addAppointmentType(eventTypeData);
  }

  /**
   * Create appointment (convenience method for backward compatibility)
   */
  async createAppointment(appointmentData: any): Promise<Appointment> {
    return await this.addAppointment(appointmentData);
  }

  /**
   * Get availability (convenience method for backward compatibility)
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
        return {
          ...response.availability,
          createdAt: this.parseDate(response.availability.createdAt),
          updatedAt: this.parseDate(response.availability.updatedAt)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching availability:', error);
      throw new Error(`Failed to fetch availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save availability (convenience method for backward compatibility)
   */
  async saveAvailability(availabilityData: AvailabilitySettings): Promise<AvailabilitySettings> {
    try {
      let params = {
        businessId: authStore.getBusinessId(),
        userId: availabilityData.userId
      };

      let body = {
        query: "saveAvailability",
        params,
        form: availabilityData
      };

      const response = await fetchGraphQLSS(body);
      
      if (response.availability) {
        return {
          ...response.availability,
          createdAt: this.parseDate(response.availability.createdAt),
          updatedAt: this.parseDate(response.availability.updatedAt)
        };
      }
      
      throw new Error('Failed to save availability');
    } catch (error) {
      console.error('Error saving availability:', error);
      throw new Error(`Failed to save availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Normalize appointment data from API response
   * Maps API fields to Appointment type fields:
   * - clientName → guestName
   * - clientPhone → guestPhone
   * - serviceType → eventTypeName
   * - date + startTime → startTime (Date)
   * - calculates endTime from duration
   */
  private normalizeAppointment(appointment: any): Appointment {
    // Parse start time from date and time strings (e.g., "01/16/2026" + "11:00")
    let startDateTime: Date;
    let endDateTime: Date;

    if (appointment.date && appointment.startTime && typeof appointment.startTime === 'string' && appointment.startTime.includes(':')) {
      // API format: date="01/16/2026", startTime="11:00"
      const [month, day, year] = appointment.date.split('/');
      const [hours, minutes] = appointment.startTime.split(':');
      startDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));

      // Calculate end time from duration
      const durationMinutes = appointment.duration || 30;
      endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
    } else {
      // Fallback to existing date parsing
      startDateTime = this.parseDate(appointment.startTime);
      endDateTime = appointment.endTime ? this.parseDate(appointment.endTime) : new Date(startDateTime.getTime() + 30 * 60000);
    }

    return {
      id: appointment.id,
      eventTypeId: appointment.eventTypeId || appointment.serviceType || '',
      eventTypeName: appointment.eventTypeName || appointment.serviceType || '',
      hostId: appointment.hostId || '',
      hostName: appointment.hostName || '',
      hostEmail: appointment.hostEmail || '',

      // Map client fields to guest fields
      guestName: appointment.guestName || appointment.clientName || '',
      guestEmail: appointment.guestEmail || appointment.clientEmail || '',
      guestPhone: appointment.guestPhone || appointment.clientPhone || '',
      guestTimezone: appointment.guestTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,

      // Scheduling details
      startTime: startDateTime,
      endTime: endDateTime,
      duration: appointment.duration || 30,
      timezone: appointment.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,

      // Status and metadata
      status: appointment.status || 'pending',
      cancellationReason: appointment.cancellationReason,
      cancelledBy: appointment.cancelledBy,
      cancelledAt: appointment.cancelledAt ? this.parseDate(appointment.cancelledAt) : undefined,

      // Communication
      confirmationSentAt: appointment.confirmationSentAt ? this.parseDate(appointment.confirmationSentAt) : undefined,
      reminderSentAt: appointment.reminderSentAt ? this.parseDate(appointment.reminderSentAt) : undefined,
      notes: appointment.notes || '',

      // Custom responses
      customResponses: appointment.customResponses,

      // Meeting details
      location: appointment.location || '',
      locationType: appointment.locationType || 'in-person',
      meetingLink: appointment.meetingLink,

      createdAt: this.parseDate(appointment.createdAt),
      updatedAt: this.parseDate(appointment.updatedAt)
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
   * Parse date from various formats
   */
  private parseDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    return new Date();
  }
}

// Export singleton instance
export const appointmentApiUpdated = new AppointmentApiUpdated();
export default appointmentApiUpdated;