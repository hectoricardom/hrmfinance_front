import { createSignal, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { notificationService } from '../services/notificationService';
import { appointmentFirebaseService } from '../services/appointmentFirebaseService';
import { appointmentApiUpdated } from '../../../services/api/appointmentApiUpdated';
import { authStore } from '../../../stores/authStore';
import type {
  Appointment,
  EventType,
  AvailabilitySettings,
  BookingFormData,
  ScheduleSlot,
  AppointmentStats,
  BookingPageSettings,
  AvailabilityRule,
  DateOverride,
  CreateAppointmentRequest,
  UpdateAppointmentRequest
} from '../types';
import { devLog } from '../../../services/utils';

// Store state
interface AppointmentState {
  appointments: Appointment[];
  eventTypes: EventType[];
  availability: AvailabilitySettings | null;
  bookingPageSettings: BookingPageSettings | null;
  loading: boolean;
  error: string | null;
  selectedDate: Date;
  selectedEventType: EventType | null;
  availableSlots: ScheduleSlot[];
}

const [state, setState] = createStore<AppointmentState>({
  appointments: [],
  eventTypes: [],
  availability: null,
  bookingPageSettings: null,
  loading: false,
  error: null,
  selectedDate: new Date(),
  selectedEventType: null,
  availableSlots: []
});

const [stats, setStats] = createSignal<AppointmentStats>({
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
});

// Helper functions
const toFirestoreDate = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

const fromFirestoreDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

export const appointmentStore = {
  get state() {
    return state;
  },

  get stats() {
    return stats();
  },

  // ============================================
  // EVENT TYPES MANAGEMENT
  // ============================================

  async loadEventTypes(userId: string): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const eventTypesRef = collection(db, 'eventTypes');
      const q = query(
        eventTypesRef,
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const eventTypes: EventType[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        eventTypes.push({
          id: doc.id,
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt)
        } as EventType);
      });

      setState('eventTypes', eventTypes);
    } catch (error: any) {
      devLog('Error loading event types:', error);
      setState('error', error.message);
    } finally {
      setState('loading', false);
    }
  },

  async createEventType(userId: string, eventType: Omit<EventType, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      setState('loading', true);
      setState('error', null);

      const eventTypesRef = collection(db, 'eventTypes');
      const now = new Date();

      const newEventType = {
        ...eventType,
        createdBy: userId,
        createdAt: toFirestoreDate(now),
        updatedAt: toFirestoreDate(now)
      };

      const docRef = await addDoc(eventTypesRef, newEventType);
      
      // Add to local state
      setState('eventTypes', [...state.eventTypes, {
        id: docRef.id,
        ...newEventType,
        createdAt: now,
        updatedAt: now
      } as EventType]);

      return docRef.id;
    } catch (error: any) {
      devLog('Error creating event type:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  async updateEventType(eventTypeId: string, updates: Partial<EventType>): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const eventTypeRef = doc(db, 'eventTypes', eventTypeId);
      const now = new Date();

      await updateDoc(eventTypeRef, {
        ...updates,
        updatedAt: toFirestoreDate(now)
      });

      // Update local state
      setState('eventTypes', (eventTypes) =>
        eventTypes.map(et => 
          et.id === eventTypeId 
            ? { ...et, ...updates, updatedAt: now } 
            : et
        )
      );
    } catch (error: any) {
      devLog('Error updating event type:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  async deleteEventType(eventTypeId: string): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const eventTypeRef = doc(db, 'eventTypes', eventTypeId);
      await deleteDoc(eventTypeRef);

      // Remove from local state
      setState('eventTypes', state.eventTypes.filter(et => et.id !== eventTypeId));
    } catch (error: any) {
      devLog('Error deleting event type:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  // ============================================
  // AVAILABILITY MANAGEMENT
  // ============================================

  async loadAvailability(userId: string): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const availabilityRef = doc(db, 'availability', userId);
      const docSnap = await getDoc(availabilityRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setState('availability', {
          id: docSnap.id,
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt)
        } as AvailabilitySettings);
      } else {
        // Create default availability
        const defaultAvailability = appointmentStore.createDefaultAvailability(userId);
        await appointmentStore.saveAvailability(defaultAvailability);
      }
    } catch (error: any) {
      devLog('Error loading availability:', error);
      setState('error', error.message);
    } finally {
      setState('loading', false);
    }
  },

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
      id: userId,
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
  },

  async saveAvailability(availability: AvailabilitySettings): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const availabilityRef = doc(db, 'availability', availability.userId);
      const now = new Date();

      const dataToSave = {
        ...availability,
        updatedAt: toFirestoreDate(now),
        createdAt: availability.createdAt ? toFirestoreDate(availability.createdAt) : toFirestoreDate(now)
      };

      await setDoc(availabilityRef, dataToSave);

      setState('availability', {
        ...availability,
        updatedAt: now
      });
    } catch (error: any) {
      devLog('Error saving availability:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  async addDateOverride(userId: string, override: Omit<DateOverride, 'id'>): Promise<void> {
    try {
      const availability = state.availability;
      if (!availability) return;

      const newOverride: DateOverride = {
        id: Date.now().toString(),
        ...override
      };

      const updatedOverrides = [...availability.dateOverrides, newOverride];
      
      await appointmentStore.saveAvailability({
        ...availability,
        dateOverrides: updatedOverrides
      });
    } catch (error: any) {
      devLog('Error adding date override:', error);
      throw error;
    }
  },

  async removeDateOverride(userId: string, overrideId: string): Promise<void> {
    try {
      const availability = state.availability;
      if (!availability) return;

      const updatedOverrides = availability.dateOverrides.filter(o => o.id !== overrideId);
      
      await appointmentStore.saveAvailability({
        ...availability,
        dateOverrides: updatedOverrides
      });
    } catch (error: any) {
      devLog('Error removing date override:', error);
      throw error;
    }
  },

  // ============================================
  // APPOINTMENTS MANAGEMENT
  // ============================================

  async loadAppointments(userId: string): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('hostId', '==', userId),
        orderBy('startTime', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
          startTime: fromFirestoreDate(data.startTime),
          endTime: fromFirestoreDate(data.endTime),
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt),
          cancelledAt: data.cancelledAt ? fromFirestoreDate(data.cancelledAt) : undefined,
          confirmationSentAt: data.confirmationSentAt ? fromFirestoreDate(data.confirmationSentAt) : undefined,
          reminderSentAt: data.reminderSentAt ? fromFirestoreDate(data.reminderSentAt) : undefined
        } as Appointment);
      });

      setState('appointments', appointments);
      appointmentStore.calculateStats(appointments);
    } catch (error: any) {
      devLog('Error loading appointments:', error);
      setState('error', error.message);
    } finally {
      setState('loading', false);
    }
  },

  async createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      setState('loading', true);
      setState('error', null);

      const appointmentsRef = collection(db, 'appointments');
      const now = new Date();

      const newAppointment = {
        ...appointment,
        startTime: toFirestoreDate(appointment.startTime),
        endTime: toFirestoreDate(appointment.endTime),
        createdAt: toFirestoreDate(now),
        updatedAt: toFirestoreDate(now)
      };

      const docRef = await addDoc(appointmentsRef, newAppointment);
      
      const createdAppointment: Appointment = {
        id: docRef.id,
        ...appointment,
        createdAt: now,
        updatedAt: now
      };
      
      // Add to local state
      setState('appointments', [...state.appointments, createdAppointment]);

      // Recalculate stats
      appointmentStore.calculateStats(state.appointments);

      // Send notifications (async, don't wait)
      const eventType = state.eventTypes.find(et => et.id === appointment.eventTypeId);
      if (eventType) {
        notificationService.sendBookingConfirmation(createdAppointment, eventType).catch(devLog);
        notificationService.sendHostNotification(createdAppointment, eventType).catch(devLog);
      }

      return docRef.id;
    } catch (error: any) {
      devLog('Error creating appointment:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const appointmentRef = doc(db, 'appointments', appointmentId);
      const now = new Date();

      const updateData: any = {
        ...updates,
        updatedAt: toFirestoreDate(now)
      };

      // Convert Date fields to Firestore Timestamps
      if (updates.startTime) updateData.startTime = toFirestoreDate(updates.startTime);
      if (updates.endTime) updateData.endTime = toFirestoreDate(updates.endTime);
      if (updates.cancelledAt) updateData.cancelledAt = toFirestoreDate(updates.cancelledAt);

      await updateDoc(appointmentRef, updateData);

      // Update local state
      setState('appointments', (appointments) =>
        appointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, ...updates, updatedAt: now } 
            : apt
        )
      );

      appointmentStore.calculateStats(state.appointments);
    } catch (error: any) {
      devLog('Error updating appointment:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  async cancelAppointment(appointmentId: string, cancelledBy: 'host' | 'guest', reason?: string): Promise<void> {
    const now = new Date();
    const appointment = state.appointments.find(a => a.id === appointmentId);
    
    await appointmentStore.updateAppointment(appointmentId, {
      status: 'cancelled',
      cancelledBy,
      cancelledAt: now,
      cancellationReason: reason
    });

    // Send cancellation notification
    if (appointment) {
      const eventType = state.eventTypes.find(et => et.id === appointment.eventTypeId);
      if (eventType) {
        notificationService.sendCancellationNotification(appointment, eventType, cancelledBy).catch(devLog);
      }
    }
  },

  // ============================================
  // BOOKING PAGE SETTINGS
  // ============================================

  async loadBookingPageSettings(userId: string): Promise<void> {
    try {
      const settingsRef = doc(db, 'bookingPageSettings', userId);
      const docSnap = await getDoc(settingsRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setState('bookingPageSettings', {
          ...data,
          createdAt: fromFirestoreDate(data.createdAt),
          updatedAt: fromFirestoreDate(data.updatedAt)
        } as BookingPageSettings);
      }
    } catch (error: any) {
      devLog('Error loading booking page settings:', error);
    }
  },

  async saveBookingPageSettings(settings: BookingPageSettings): Promise<void> {
    try {
      const settingsRef = doc(db, 'bookingPageSettings', settings.userId);
      const now = new Date();

      const dataToSave = {
        ...settings,
        updatedAt: toFirestoreDate(now),
        createdAt: settings.createdAt ? toFirestoreDate(settings.createdAt) : toFirestoreDate(now)
      };

      await setDoc(settingsRef, dataToSave);

      setState('bookingPageSettings', {
        ...settings,
        updatedAt: now
      });
    } catch (error: any) {
      devLog('Error saving booking page settings:', error);
      throw error;
    }
  },

  // ============================================
  // STATISTICS
  // ============================================

  calculateStats(appointments: Appointment[]): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: AppointmentStats = {
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

    setStats(stats);
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  setSelectedEventType(eventType: EventType | null): void {
    setState('selectedEventType', eventType);
  },

  setSelectedDate(date: Date): void {
    setState('selectedDate', date);
  },

  getUpcomingAppointments(limit?: number): Appointment[] {
    const now = new Date();
    const upcoming = state.appointments
      .filter(a => a.startTime > now && (a.status === 'confirmed' || a.status === 'pending'))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    return limit ? upcoming.slice(0, limit) : upcoming;
  },

  getTodayAppointments(): Appointment[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    return state.appointments
      .filter(a => a.startTime >= today && a.startTime < tomorrow)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  },

  // ============================================
  // API-BASED METHODS (NEW)
  // ============================================

  async loadAppointmentsFromApi(userId?: string): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);
      
     

      const currentUserId = authStore.profile()?.id || authStore.profile()?.originalUserId;
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      
       devLog({profile: authStore.profile()})
      const appointments = await appointmentApiUpdated.getAppointments("2026");
      setState('appointments', appointments);
      
      // Recalculate stats
      appointmentStore.calculateStats(appointments);
    } catch (error) {
      devLog('Error loading appointments from API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to load appointments');
      
      // Fallback to Firebase if API fails
      devLog('Falling back to Firebase...');
      await appointmentStore.loadAppointments(userId);
    } finally {
      setState('loading', false);
    }
  },

  async createAppointmentViaApi(appointmentData: CreateAppointmentRequest): Promise<string> {
    try {
      setState('loading', true);
      
      const appointment = await appointmentApiUpdated.addAppointment(appointmentData);
      
      // Add to local state
      setState('appointments', [...state.appointments, appointment]);
      
      // Recalculate stats
      appointmentStore.calculateStats(state.appointments);

      // Send notifications (async, don't wait)
      const eventType = state.eventTypes.find(et => et.id === appointment.eventTypeId);
      if (eventType) {
        notificationService.sendBookingConfirmation(appointment, eventType).catch(devLog);
        notificationService.sendHostNotification(appointment, eventType).catch(devLog);
      }
      
      return appointment.id;
    } catch (error) {
      devLog('Error creating appointment via API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to create appointment');
      
      // Fallback to Firebase
      devLog('Falling back to Firebase for appointment creation...');
      const userId = authStore.state?.user?.uid;
      if (userId) {
        return await appointmentStore.createAppointment(appointmentData);
      }
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  async updateAppointmentViaApi(id: string, updates: UpdateAppointmentRequest): Promise<void> {
    try {
      setState('loading', true);
      
      const updatedAppointment = await appointmentApiUpdated.updateAppointment(id, updates);
      
      // Update local state
      setState('appointments', appointments => 
        appointments.map(apt => apt.id === id ? updatedAppointment : apt)
      );
      
      // Recalculate stats
      appointmentStore.calculateStats(state.appointments);
    } catch (error) {
      devLog('Error updating appointment via API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to update appointment');
      
      // Fallback to Firebase
      devLog('Falling back to Firebase for appointment update...');
      await appointmentStore.updateAppointment(id, updates);
    } finally {
      setState('loading', false);
    }
  },

  async cancelAppointmentViaApi(id: string, cancelledBy: 'host' | 'guest', reason?: string): Promise<void> {
    try {
      setState('loading', true);
      
      await appointmentApiUpdated.cancelAppointment(id, cancelledBy, reason);
      
      // Update local state
      setState('appointments', appointments => 
        appointments.map(apt => 
          apt.id === id 
            ? { 
                ...apt, 
                status: 'cancelled' as const, 
                cancelledBy, 
                cancellationReason: reason,
                cancelledAt: new Date(),
                updatedAt: new Date()
              } 
            : apt
        )
      );
      
      // Send cancellation notification
      const appointment = state.appointments.find(a => a.id === id);
      if (appointment) {
        const eventType = state.eventTypes.find(et => et.id === appointment.eventTypeId);
        if (eventType) {
          notificationService.sendCancellationNotification(appointment, eventType, cancelledBy).catch(devLog);
        }
      }
      
      // Recalculate stats
      appointmentStore.calculateStats(state.appointments);
    } catch (error) {
      devLog('Error cancelling appointment via API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to cancel appointment');
      
      // Fallback to Firebase
      devLog('Falling back to Firebase for appointment cancellation...');
      await appointmentStore.cancelAppointment(id, cancelledBy, reason);
    } finally {
      setState('loading', false);
    }
  },

  async loadEventTypesFromApi(userId: string): Promise<void> {
    try {
      setState('loading', true);
      
      const eventTypes = await appointmentApiUpdated.getAppointmentTypes(userId);
      setState('eventTypes', eventTypes);
    } catch (error) {
      devLog('Error loading event types from API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to load event types');
      
      // Fallback to Firebase
      devLog('Falling back to Firebase for event types...');
      await appointmentStore.loadEventTypes(userId);
    } finally {
      setState('loading', false);
    }
  },

  async createEventTypeViaApi(eventTypeData: Omit<EventType, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      setState('loading', true);
      
      const eventType = await appointmentApiUpdated.addAppointmentType(eventTypeData);
      
      // Add to local state
      setState('eventTypes', [...state.eventTypes, eventType]);
      
      return eventType.id;
    } catch (error) {
      devLog('Error creating event type via API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to create event type');
      
      // Fallback to Firebase
      devLog('Falling back to Firebase for event type creation...');
      const userId = authStore.state?.user?.uid;
      if (userId) {
        return await appointmentStore.createEventType(userId, eventTypeData);
      }
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  async loadAvailabilityFromApi(userId: string): Promise<void> {
    try {
      setState('loading', true);
      
      const availability = await appointmentApiUpdated.getAvailability(userId);
      setState('availability', availability);
    } catch (error) {
      devLog('Error loading availability from API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to load availability');
      
      // Fallback to Firebase
      devLog('Falling back to Firebase for availability...');
      await appointmentStore.loadAvailability(userId);
    } finally {
      setState('loading', false);
    }
  },

  async saveAvailabilityViaApi(availabilityData: AvailabilitySettings): Promise<void> {
    try {
      setState('loading', true);
      
      await appointmentApiUpdated.saveAvailability(availabilityData);
      setState('availability', availabilityData);
    } catch (error) {
      devLog('Error saving availability via API:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to save availability');
      
      // Fallback to Firebase
      devLog('Falling back to Firebase for availability save...');
      await appointmentStore.saveAvailability(availabilityData);
    } finally {
      setState('loading', false);
    }
  },

  // ============================================
  // ENHANCED FIREBASE METHODS
  // ============================================

  /**
   * Create appointment using Firebase service
   */
  async createAppointmentFirebase(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      setState('loading', true);
      setState('error', null);

      const appointmentId = await appointmentFirebaseService.createAppointment(appointmentData);
      
      // Add to local state
      const createdAppointment: Appointment = {
        id: appointmentId,
        ...appointmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setState('appointments', [...state.appointments, createdAppointment]);

      // Recalculate stats
      appointmentStore.calculateStats(state.appointments);

      // Send notifications (async, don't wait)
      const eventType = state.eventTypes.find(et => et.id === appointmentData.eventTypeId);
      if (eventType) {
        notificationService.sendBookingConfirmation(createdAppointment, eventType).catch(devLog);
        notificationService.sendHostNotification(createdAppointment, eventType).catch(devLog);
      }

      return appointmentId;
    } catch (error: any) {
      devLog('Error creating appointment via Firebase:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Load appointments using Firebase service with real-time updates
   */
  async loadAppointmentsFirebase(userId: string, enableRealTime: boolean = false): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      if (enableRealTime) {
        // Set up real-time listener
        appointmentFirebaseService.subscribeToAppointments(userId, (appointments) => {
          setState('appointments', appointments);
          appointmentStore.calculateStats(appointments);
          setState('loading', false);
        });
      } else {
        // One-time fetch
        const appointments = await appointmentFirebaseService.getAppointmentsByHost(userId);
        setState('appointments', appointments);
        appointmentStore.calculateStats(appointments);
      }
    } catch (error: any) {
      devLog('Error loading appointments from Firebase:', error);
      setState('error', error.message);
    } finally {
      if (!enableRealTime) {
        setState('loading', false);
      }
    }
  },


  async loadAllAppointmentsFirebase(): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);
      //  Get all appointments for the business to prevent double bookings
      const appointments = await appointmentFirebaseService.getAllAppointments();
      //  
      devLog(appointments)
      setState('appointments', appointments);
      appointmentStore.calculateStats(appointments);
      devLog('Loaded all appointments for conflict checking:', appointments.length);
    } catch (error: any) {
      devLog('Error loading all appointments from Firebase:', error);
      setState('error', error.message);
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Get appointments by status
   */
  async getAppointmentsByStatusFirebase(status: string): Promise<Appointment[]> {
    try {
      setState('loading', true);
      setState('error', null);

      const appointments = await appointmentFirebaseService.getAppointmentsByStatus(status);
      return appointments;
    } catch (error: any) {
      devLog('Error getting appointments by status:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Get appointments by date range
   */
  async getAppointmentsByDateRangeFirebase(startDate: Date, endDate: Date): Promise<Appointment[]> {
    try {
      setState('loading', true);
      setState('error', null);

      const appointments = await appointmentFirebaseService.getAppointmentsByDateRange(startDate, endDate);
      return appointments;
    } catch (error: any) {
      devLog('Error getting appointments by date range:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Create event type using Firebase service
   */
  async createEventTypeFirebase(eventTypeData: Omit<EventType, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      setState('loading', true);
      setState('error', null);

      const eventTypeId = await appointmentFirebaseService.createEventType(eventTypeData);
      
      // Add to local state
      const createdEventType: EventType = {
        id: eventTypeId,
        ...eventTypeData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setState('eventTypes', [...state.eventTypes, createdEventType]);

      return eventTypeId;
    } catch (error: any) {
      devLog('Error creating event type via Firebase:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Load event types using Firebase service with real-time updates
   */
  async loadEventTypesFirebase(createdBy: string, enableRealTime: boolean = false): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      if (enableRealTime) {
        // Set up real-time listener
        appointmentFirebaseService.subscribeToEventTypes(createdBy, (eventTypes) => {
          setState('eventTypes', eventTypes);
          setState('loading', false);
        });
      } else {
        // One-time fetch
        const eventTypes = await appointmentFirebaseService.getEventTypesByCreator(createdBy);
        setState('eventTypes', eventTypes);
      }
    } catch (error: any) {
      devLog('Error loading event types from Firebase:', error);
      setState('error', error.message);
    } finally {
      if (!enableRealTime) {
        setState('loading', false);
      }
    }
  },

  /**
   * Get all event types for business
   */
  async getAllEventTypesFirebase(): Promise<EventType[]> {
    try {
      setState('loading', true);
      setState('error', null);

      const eventTypes = await appointmentFirebaseService.getAllEventTypes();
      return eventTypes;
    } catch (error: any) {
      devLog('Error getting all event types:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Load availability using Firebase service
   */
  async loadAvailabilityFirebase(userId: string): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const availability = await appointmentFirebaseService.getAvailabilityByUserId(userId);
      
      if (availability) {
        setState('availability', availability);
      } else {
        // Create default availability if none exists
        const defaultAvailability = appointmentFirebaseService.createDefaultAvailability(userId);
        await appointmentFirebaseService.saveAvailability(defaultAvailability);
        setState('availability', defaultAvailability);
      }
    } catch (error: any) {
      devLog('Error loading availability from Firebase:', error);
      setState('error', error.message);
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Save availability using Firebase service
   */
  async saveAvailabilityFirebase(availabilityData: AvailabilitySettings): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      await appointmentFirebaseService.saveAvailability(availabilityData);
      setState('availability', {
        ...availabilityData,
        updatedAt: new Date()
      });
    } catch (error: any) {
      devLog('Error saving availability via Firebase:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Batch create multiple appointments
   */
  async batchCreateAppointments(appointmentsData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    try {
      setState('loading', true);
      setState('error', null);

      const appointmentIds = await appointmentFirebaseService.batchCreateAppointments(appointmentsData);
      
      // Add to local state
      const createdAppointments = appointmentsData.map((data, index) => ({
        id: appointmentIds[index],
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      setState('appointments', [...state.appointments, ...createdAppointments]);
      appointmentStore.calculateStats(state.appointments);

      return appointmentIds;
    } catch (error: any) {
      devLog('Error batch creating appointments:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Batch update multiple appointments
   */
  async batchUpdateAppointments(updates: { id: string; data: Partial<Appointment> }[]): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      await appointmentFirebaseService.batchUpdateAppointments(updates);
      
      // Update local state
      setState('appointments', appointments => 
        appointments.map(apt => {
          const update = updates.find(u => u.id === apt.id);
          return update ? { ...apt, ...update.data, updatedAt: new Date() } : apt;
        })
      );
      
      appointmentStore.calculateStats(state.appointments);
    } catch (error: any) {
      devLog('Error batch updating appointments:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Load booking page settings
   */
  async loadBookingPageSettingsFirebase(userId: string): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      const settings = await appointmentFirebaseService.getBookingPageSettings(userId);
      setState('bookingPageSettings', settings);
    } catch (error: any) {
      devLog('Error loading booking page settings:', error);
      setState('error', error.message);
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Save booking page settings
   */
  async saveBookingPageSettingsFirebase(settings: BookingPageSettings): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);

      await appointmentFirebaseService.saveBookingPageSettings(settings);
      setState('bookingPageSettings', {
        ...settings,
        updatedAt: new Date()
      });
    } catch (error: any) {
      devLog('Error saving booking page settings:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  },

  /**
   * Get all active event types without index requirements
   */
  async getAllActiveEventTypesSimple(): Promise<EventType[]> {
    try {
      setState('loading', true);
      setState('error', null);

      const eventTypes = await appointmentFirebaseService.getAllActiveEventTypes();
      // Update store with all active event types
      setState('eventTypes', eventTypes);
      return eventTypes;
    } catch (error: any) {
      devLog('Error getting all active event types:', error);
      setState('error', error.message);
      throw error;
    } finally {
      setState('loading', false);
    }
  }
};