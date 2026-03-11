import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';
import type {
  Appointment,
  EventType,
  AvailabilitySettings,
  BookingPageSettings,
  AppointmentStats,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AvailabilityRule,
  DateOverride
} from '../types';

/**
 * Firebase service for Appointment Management
 * Handles all Firebase operations for appointments, event types, and availability
 */
export class AppointmentFirebaseService {
  
  // Helper functions for Firestore date conversion
  private toFirestoreDate(date: Date): Timestamp {
    return Timestamp.fromDate(date);
  }

  private fromFirestoreDate(timestamp: any): Date {
    if (timestamp?.toDate) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  }

  // ============================================
  // APPOINTMENTS CRUD OPERATIONS
  // ============================================

  /**
   * Create a new appointment in Firebase
   */
  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const now = new Date();
      const businessId = authStore.getBusinessId();

      const newAppointment = {
        ...appointmentData,
        businessId,
        startTime: this.toFirestoreDate(appointmentData.startTime),
        endTime: this.toFirestoreDate(appointmentData.endTime),
        createdAt: this.toFirestoreDate(now),
        updatedAt: this.toFirestoreDate(now)
      };

      const docRef = await addDoc(appointmentsRef, newAppointment);
      return docRef.id;
    } catch (error) {
      devLog('Error creating appointment in Firebase:', error);
      throw new Error(`Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const docSnap = await getDoc(appointmentRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          startTime: this.fromFirestoreDate(data.startTime),
          endTime: this.fromFirestoreDate(data.endTime),
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt),
          cancelledAt: data.cancelledAt ? this.fromFirestoreDate(data.cancelledAt) : undefined,
          confirmationSentAt: data.confirmationSentAt ? this.fromFirestoreDate(data.confirmationSentAt) : undefined,
          reminderSentAt: data.reminderSentAt ? this.fromFirestoreDate(data.reminderSentAt) : undefined
        } as Appointment;
      }

      return null;
    } catch (error) {
      //devLog('Error getting appointment by ID:', error);
      throw new Error(`Failed to get appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointments by host ID
   */
  async getAppointmentsByHost(hostId: string): Promise<Appointment[]> {
    try {
      const businessId = authStore.getBusinessId();
      const appointmentsRef = collection(db, 'appointments');
      
      devLog('getAppointmentsByHost - hostId:', hostId, 'businessId:', businessId);
      
      // Build query based on whether businessId is available
      let q;
      if (businessId && businessId !== 'all') {
        q = query(
          appointmentsRef,
          where('businessId', '==', businessId),
          where('hostId', '==', hostId),
          orderBy('startTime', 'desc')
        );
      } else {
        // Fallback: query only by hostId if businessId is not available
        q = query(
          appointmentsRef,
          where('hostId', '==', hostId),
          orderBy('startTime', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          startTime: this.fromFirestoreDate(data.startTime),
          endTime: this.fromFirestoreDate(data.endTime),
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt),
          cancelledAt: data.cancelledAt ? this.fromFirestoreDate(data.cancelledAt) : undefined,
          confirmationSentAt: data.confirmationSentAt ? this.fromFirestoreDate(data.confirmationSentAt) : undefined,
          reminderSentAt: data.reminderSentAt ? this.fromFirestoreDate(data.reminderSentAt) : undefined
        } as Appointment);
      });

      devLog('getAppointmentsByHost - found appointments:', appointments.length);
      return appointments;
    } catch (error) {
      devLog('Error getting appointments by host:', error);
      throw new Error(`Failed to get appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all appointments for business
   * Simplified to avoid index requirements - loads all and filters in memory
   */
  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const businessId = authStore.getBusinessId();
      devLog('getAllAppointments - businessId:', businessId);
      
      const appointmentsRef = collection(db, 'appointments');
      
      // Simple query without businessId to avoid index issues
      const snapshot = await getDocs(appointmentsRef);
      const appointments: Appointment[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filter by businessId in memory if it exists
        if (!businessId || businessId === 'all' || !data.businessId || data.businessId === businessId) {}
          appointments.push({
            id: doc.id,
            ...data,
            startTime: this.fromFirestoreDate(data.startTime),
            endTime: this.fromFirestoreDate(data.endTime),
            createdAt: this.fromFirestoreDate(data.createdAt),
            updatedAt: this.fromFirestoreDate(data.updatedAt),
            cancelledAt: data.cancelledAt ? this.fromFirestoreDate(data.cancelledAt) : undefined,
            confirmationSentAt: data.confirmationSentAt ? this.fromFirestoreDate(data.confirmationSentAt) : undefined,
            reminderSentAt: data.reminderSentAt ? this.fromFirestoreDate(data.reminderSentAt) : undefined
          } as Appointment);
        
      });

      // Sort by startTime in memory
      appointments.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
      devLog('getAllAppointments - found total appointments:', appointments.length);
      return appointments;
    } catch (error) {
      devLog('Error getting all appointments:', error);
      throw new Error(`Failed to get appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<void> {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const now = new Date();

      const updateData: any = {
        ...updates,
        updatedAt: this.toFirestoreDate(now)
      };

      // Convert Date fields to Firestore Timestamps
      if (updates.startTime) updateData.startTime = this.toFirestoreDate(updates.startTime);
      if (updates.endTime) updateData.endTime = this.toFirestoreDate(updates.endTime);
      if (updates.cancelledAt) updateData.cancelledAt = this.toFirestoreDate(updates.cancelledAt);
      if (updates.confirmationSentAt) updateData.confirmationSentAt = this.toFirestoreDate(updates.confirmationSentAt);
      if (updates.reminderSentAt) updateData.reminderSentAt = this.toFirestoreDate(updates.reminderSentAt);

      await updateDoc(appointmentRef, updateData);
    } catch (error) {
      devLog('Error updating appointment:', error);
      throw new Error(`Failed to update appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await deleteDoc(appointmentRef);
    } catch (error) {
      devLog('Error deleting appointment:', error);
      throw new Error(`Failed to delete appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointments by status
   */
  async getAppointmentsByStatus(status: string): Promise<Appointment[]> {
    try {
      const businessId = authStore.getBusinessId();
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('businessId', '==', businessId),
        where('status', '==', status),
        orderBy('startTime', 'desc')
      );

      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          startTime: this.fromFirestoreDate(data.startTime),
          endTime: this.fromFirestoreDate(data.endTime),
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt),
          cancelledAt: data.cancelledAt ? this.fromFirestoreDate(data.cancelledAt) : undefined,
          confirmationSentAt: data.confirmationSentAt ? this.fromFirestoreDate(data.confirmationSentAt) : undefined,
          reminderSentAt: data.reminderSentAt ? this.fromFirestoreDate(data.reminderSentAt) : undefined
        } as Appointment);
      });

      return appointments;
    } catch (error) {
      devLog('Error getting appointments by status:', error);
      throw new Error(`Failed to get appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get appointments by date range
   */
  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    try {
      const businessId = authStore.getBusinessId();
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('businessId', '==', businessId),
        where('startTime', '>=', this.toFirestoreDate(startDate)),
        where('startTime', '<=', this.toFirestoreDate(endDate)),
        orderBy('startTime', 'asc')
      );

      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          startTime: this.fromFirestoreDate(data.startTime),
          endTime: this.fromFirestoreDate(data.endTime),
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt),
          cancelledAt: data.cancelledAt ? this.fromFirestoreDate(data.cancelledAt) : undefined,
          confirmationSentAt: data.confirmationSentAt ? this.fromFirestoreDate(data.confirmationSentAt) : undefined,
          reminderSentAt: data.reminderSentAt ? this.fromFirestoreDate(data.reminderSentAt) : undefined
        } as Appointment);
      });

      return appointments;
    } catch (error) {
      devLog('Error getting appointments by date range:', error);
      throw new Error(`Failed to get appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // EVENT TYPES CRUD OPERATIONS
  // ============================================

  /**
   * Create a new event type
   */
  async createEventType(eventTypeData: Omit<EventType, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const eventTypesRef = collection(db, 'eventTypes');
      const now = new Date();
      const businessId = authStore.getBusinessId();

      const newEventType = {
        ...eventTypeData,
        businessId,
        createdAt: this.toFirestoreDate(now),
        updatedAt: this.toFirestoreDate(now)
      };

      const docRef = await addDoc(eventTypesRef, newEventType);
      return docRef.id;
    } catch (error) {
      devLog('Error creating event type:', error);
      throw new Error(`Failed to create event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event types by creator
   */
  async getEventTypesByCreator(createdBy: string): Promise<EventType[]> {
    try {
      const businessId = authStore.getBusinessId();
      //devLog('getEventTypesByCreator - createdBy:', createdBy, 'businessId:', businessId);
      
      const eventTypesRef = collection(db, 'eventTypes');
      
      // Simplified query - only by createdBy to avoid composite index
      const q = query(
        eventTypesRef,
        where('createdBy', '==', createdBy)
      );

      const snapshot = await getDocs(q);
      const eventTypes: EventType[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter by businessId in memory if needed
        if (!businessId || businessId === 'all' || data.businessId === businessId) {
          eventTypes.push({
            id: doc.id,
            ...data,
            createdAt: this.fromFirestoreDate(data.createdAt),
            updatedAt: this.fromFirestoreDate(data.updatedAt)
          } as EventType);
        }
      });
      
      return eventTypes;
    } catch (error) {
      devLog('Error getting event types by creator:', error);
      throw new Error(`Failed to get event types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all active event types (simple query without index requirements)
   */
  async getAllActiveEventTypes(): Promise<EventType[]> {
    try {
    
      const eventTypesRef = collection(db, 'eventTypes');
      
      // Very simple query - just get all documents
      const snapshot = await getDocs(eventTypesRef);
      const eventTypes: EventType[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter in memory to avoid composite indexes
        if (data.isActive) {
          eventTypes.push({
            id: doc.id,
            ...data,
            createdAt: this.fromFirestoreDate(data.createdAt),
            updatedAt: this.fromFirestoreDate(data.updatedAt)
          } as EventType);
        }
      });
      
      // Sort by createdAt in memory
      eventTypes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      devLog('getAllActiveEventTypes - found active eventTypes:', eventTypes.length);
      return eventTypes;
    } catch (error) {
      devLog('Error getting all active event types:', error);
      throw new Error(`Failed to get event types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all event types for business
   */
  async getAllEventTypes(): Promise<EventType[]> {
    try {
      const businessId = authStore.getBusinessId();
      devLog('getAllEventTypes - businessId:', businessId);
      
      const eventTypesRef = collection(db, 'eventTypes');
      
      // Simple query to avoid composite index requirements
      const q = query(
        eventTypesRef,
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      const eventTypes: EventType[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter by businessId in memory if needed
        if (businessId === 'all' || !businessId || data.businessId === businessId) {
          eventTypes.push({
            id: doc.id,
            ...data,
            createdAt: this.fromFirestoreDate(data.createdAt),
            updatedAt: this.fromFirestoreDate(data.updatedAt)
          } as EventType);
        }
      });
      
      // Sort by createdAt in memory
      eventTypes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      devLog('getAllEventTypes - found eventTypes:', eventTypes.length);
      return eventTypes;
    } catch (error) {
      devLog('Error getting all event types:', error);
      throw new Error(`Failed to get event types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event type by ID
   */
  async getEventTypeById(eventTypeId: string): Promise<EventType | null> {
    try {
      const eventTypeRef = doc(db, 'eventTypes', eventTypeId);
      const docSnap = await getDoc(eventTypeRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt)
        } as EventType;
      }

      return null;
    } catch (error) {
      devLog('Error getting event type by ID:', error);
      throw new Error(`Failed to get event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update event type
   */
  async updateEventType(eventTypeId: string, updates: Partial<EventType>): Promise<void> {
    try {
      const eventTypeRef = doc(db, 'eventTypes', eventTypeId);
      const now = new Date();

      await updateDoc(eventTypeRef, {
        ...updates,
        updatedAt: this.toFirestoreDate(now)
      });
    } catch (error) {
      devLog('Error updating event type:', error);
      throw new Error(`Failed to update event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete event type
   */
  async deleteEventType(eventTypeId: string): Promise<void> {
    try {
      const eventTypeRef = doc(db, 'eventTypes', eventTypeId);
      await deleteDoc(eventTypeRef);
    } catch (error) {
      devLog('Error deleting event type:', error);
      throw new Error(`Failed to delete event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // AVAILABILITY CRUD OPERATIONS
  // ============================================

  /**
   * Get availability settings by user ID
   */
  async getAvailabilityByUserId(userId: string): Promise<AvailabilitySettings | null> {
    try {
      const businessId = authStore.getBusinessId();
      const availabilityRef = doc(db, 'availability', `${businessId}_${userId}`);
      const docSnap = await getDoc(availabilityRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt)
        } as AvailabilitySettings;
      }

      return null;
    } catch (error) {
      devLog('Error getting availability:', error);
      throw new Error(`Failed to get availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save availability settings
   */
  async saveAvailability(availabilityData: AvailabilitySettings): Promise<void> {
    try {
      const businessId = authStore.getBusinessId();
      const availabilityRef = doc(db, 'availability', `${businessId}_${availabilityData.userId}`);
      const now = new Date();

      const dataToSave = {
        ...availabilityData,
        businessId,
        updatedAt: this.toFirestoreDate(now),
        createdAt: availabilityData.createdAt ? this.toFirestoreDate(availabilityData.createdAt) : this.toFirestoreDate(now)
      };

      await setDoc(availabilityRef, dataToSave);
    } catch (error) {
      devLog('Error saving availability:', error);
      throw new Error(`Failed to save availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create default availability settings
   */
  createDefaultAvailability(userId: string): AvailabilitySettings {
    const now = new Date();
    const defaultWeeklyAvailability: AvailabilityRule[] = [
      { id: 'mon', dayOfWeek: 'monday', timeSlots: [{ start: '09:00', end: '17:00' }], isActive: true },
      { id: 'tue', dayOfWeek: 'tuesday', timeSlots: [{ start: '09:00', end: '17:00' }], isActive: true },
      { id: 'wed', dayOfWeek: 'wednesday', timeSlots: [{ start: '09:00', end: '17:00' }], isActive: true },
      { id: 'thu', dayOfWeek: 'thursday', timeSlots: [{ start: '09:00', end: '17:00' }], isActive: true },
      { id: 'fri', dayOfWeek: 'friday', timeSlots: [{ start: '09:00', end: '17:00' }], isActive: true },
      { id: 'sat', dayOfWeek: 'saturday', timeSlots: [], isActive: false },
      { id: 'sun', dayOfWeek: 'sunday', timeSlots: [], isActive: false }
    ];

    return {
      id: `${authStore.getBusinessId()}_${userId}`,
      userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      weeklyAvailability: defaultWeeklyAvailability,
      dateOverrides: [],
      minimumNotice: 24, // 24 hours
      maximumAdvance: 60, // 60 days
      slotInterval: 30, // 30 minutes
      createdAt: now,
      updatedAt: now
    };
  }

  // ============================================
  // BOOKING PAGE SETTINGS CRUD OPERATIONS
  // ============================================

  /**
   * Get booking page settings by user ID
   */
  async getBookingPageSettings(userId: string): Promise<BookingPageSettings | null> {
    try {
      const businessId = authStore.getBusinessId();
      const settingsRef = doc(db, 'bookingPageSettings', `${businessId}_${userId}`);
      const docSnap = await getDoc(settingsRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt)
        } as BookingPageSettings;
      }

      return null;
    } catch (error) {
      devLog('Error getting booking page settings:', error);
      throw new Error(`Failed to get booking page settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save booking page settings
   */
  async saveBookingPageSettings(settings: BookingPageSettings): Promise<void> {
    try {
      const businessId = authStore.getBusinessId();
      const settingsRef = doc(db, 'bookingPageSettings', `${businessId}_${settings.userId}`);
      const now = new Date();

      const dataToSave = {
        ...settings,
        businessId,
        updatedAt: this.toFirestoreDate(now),
        createdAt: settings.createdAt ? this.toFirestoreDate(settings.createdAt) : this.toFirestoreDate(now)
      };

      await setDoc(settingsRef, dataToSave);
    } catch (error) {
      devLog('Error saving booking page settings:', error);
      throw new Error(`Failed to save booking page settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // REAL-TIME LISTENERS
  // ============================================

  /**
   * Listen to appointments changes in real-time
   */
  subscribeToAppointments(hostId: string, callback: (appointments: Appointment[]) => void): Unsubscribe {
    const businessId = authStore.getBusinessId();
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('businessId', '==', businessId),
      where('hostId', '==', hostId),
      orderBy('startTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const appointments: Appointment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          startTime: this.fromFirestoreDate(data.startTime),
          endTime: this.fromFirestoreDate(data.endTime),
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt),
          cancelledAt: data.cancelledAt ? this.fromFirestoreDate(data.cancelledAt) : undefined,
          confirmationSentAt: data.confirmationSentAt ? this.fromFirestoreDate(data.confirmationSentAt) : undefined,
          reminderSentAt: data.reminderSentAt ? this.fromFirestoreDate(data.reminderSentAt) : undefined
        } as Appointment);
      });
      callback(appointments);
    });
  }

  /**
   * Listen to event types changes in real-time
   */
  subscribeToEventTypes(createdBy: string, callback: (eventTypes: EventType[]) => void): Unsubscribe {
    const businessId = authStore.getBusinessId();
    const eventTypesRef = collection(db, 'eventTypes');
    const q = query(
      eventTypesRef,
      where('businessId', '==', businessId),
      where('createdBy', '==', createdBy),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const eventTypes: EventType[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        eventTypes.push({
          id: doc.id,
          ...data,
          createdAt: this.fromFirestoreDate(data.createdAt),
          updatedAt: this.fromFirestoreDate(data.updatedAt)
        } as EventType);
      });
      callback(eventTypes);
    });
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Batch create multiple appointments
   */
  async batchCreateAppointments(appointmentsData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const appointmentIds: string[] = [];
      const now = new Date();
      const businessId = authStore.getBusinessId();

      for (const appointmentData of appointmentsData) {
        const appointmentRef = doc(collection(db, 'appointments'));
        const newAppointment = {
          ...appointmentData,
          businessId,
          startTime: this.toFirestoreDate(appointmentData.startTime),
          endTime: this.toFirestoreDate(appointmentData.endTime),
          createdAt: this.toFirestoreDate(now),
          updatedAt: this.toFirestoreDate(now)
        };

        batch.set(appointmentRef, newAppointment);
        appointmentIds.push(appointmentRef.id);
      }

      await batch.commit();
      return appointmentIds;
    } catch (error) {
      devLog('Error batch creating appointments:', error);
      throw new Error(`Failed to batch create appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch update multiple appointments
   */
  async batchUpdateAppointments(updates: { id: string; data: Partial<Appointment> }[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const now = new Date();

      for (const update of updates) {
        const appointmentRef = doc(db, 'appointments', update.id);
        const updateData: any = {
          ...update.data,
          updatedAt: this.toFirestoreDate(now)
        };

        // Convert Date fields to Firestore Timestamps
        if (update.data.startTime) updateData.startTime = this.toFirestoreDate(update.data.startTime);
        if (update.data.endTime) updateData.endTime = this.toFirestoreDate(update.data.endTime);
        if (update.data.cancelledAt) updateData.cancelledAt = this.toFirestoreDate(update.data.cancelledAt);

        batch.update(appointmentRef, updateData);
      }

      await batch.commit();
    } catch (error) {
      devLog('Error batch updating appointments:', error);
      throw new Error(`Failed to batch update appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // STATISTICS AND ANALYTICS
  // ============================================

  /**
   * Calculate appointment statistics
   */
  calculateStats(appointments: Appointment[]): AppointmentStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      totalAppointments: appointments.length,
      confirmedAppointments: appointments.filter(a => a.status === 'confirmed').length,
      cancelledAppointments: appointments.filter(a => a.status === 'cancelled').length,
      completedAppointments: appointments.filter(a => a.status === 'completed').length,
      pendingAppointments: appointments.filter(a => a.status === 'pending').length,
      noShowAppointments: appointments.filter(a => a.status === 'no-show').length,
      upcomingAppointments: appointments.filter(a => 
        a.startTime > now && (a.status === 'confirmed' || a.status === 'pending')
      ).length,
      todayAppointments: appointments.filter(a => {
        const aptDate = new Date(a.startTime);
        return aptDate >= today && aptDate < new Date(today.getTime() + 86400000);
      }).length,
      thisWeekAppointments: appointments.filter(a => a.startTime >= weekStart && a.startTime < now).length,
      thisMonthAppointments: appointments.filter(a => a.startTime >= monthStart && a.startTime < now).length
    };
  }
}

// Export singleton instance
export const appointmentFirebaseService = new AppointmentFirebaseService();
export default appointmentFirebaseService;