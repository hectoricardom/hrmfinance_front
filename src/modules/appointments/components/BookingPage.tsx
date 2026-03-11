import { Component, For, Show, createSignal, createEffect, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { appointmentStore } from '../stores/appointmentStore';
import { schedulingService } from '../services/schedulingService';
import { authStore } from '../../../stores/authStore';
import { useTranslation } from '../../../translations';
import type { EventType, ScheduleSlot, BookingFormData } from '../types';
import { 
  parseBookingParams, 
  parseDate, 
  parseTime, 
  combineDateAndTime, 
  validateBookingParams,
  type BookingUrlParams 
} from '../utils/urlParams';
import { useIsMobile } from '../../../hooks';
import { devLog } from '../../../services/utils';

const BookingPage: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedEventType, setSelectedEventType] = createSignal<EventType | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = createSignal(false);
  const [selectedDate, setSelectedDate] = createSignal<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = createSignal<ScheduleSlot | null>(null);
  const [availableSlots, setAvailableSlots] = createSignal<ScheduleSlot[]>([]);
  const [currentMonth, setCurrentMonth] = createSignal(new Date());
  const [step, setStep] = createSignal<'event-type' | 'date-time' | 'details' | 'confirmation'>('event-type');
  const [loading, setLoading] = createSignal(false);
  const [bookingConfirmed, setBookingConfirmed] = createSignal(false);
  const [bookingId, setBookingId] = createSignal<string>('');
  
  const [formData, setFormData] = createSignal<BookingFormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: '',
    customResponses: {}
  });

  // Parse URL parameters
  const [urlParams] = createSignal<BookingUrlParams>(parseBookingParams());
  const [urlParamErrors, setUrlParamErrors] = createSignal<string[]>([]);
  const [dataLoaded, setDataLoaded] = createSignal(false);

  // Load host's event types
  onMount(async () => {
    
    devLog('BookingPage onMount - params:', params);
    const hostId = params.userId || params.username;
    devLog('BookingPage - hostId:', hostId);
    
    // Validate URL parameters
    const paramErrors = validateBookingParams(urlParams());
    if (paramErrors.length > 0) {
      setUrlParamErrors(paramErrors);
      devLog('Invalid URL parameters:', paramErrors);
    }
    
    if (hostId) {
      try {
        devLog('Loading event types for host:', hostId);
        
        // Use Firebase methods to load data
        await appointmentStore.loadEventTypesFirebase(hostId, false);
        await appointmentStore.loadAvailabilityFirebase(hostId);
        await appointmentStore.loadBookingPageSettingsFirebase(hostId);
        await appointmentStore.loadAppointmentsFirebase(hostId);
        
        devLog('Event types loaded:', appointmentStore.state.eventTypes.length);
        devLog('Event types:', appointmentStore.state.eventTypes);
      } catch (error) {
        devLog('Error loading booking data:', error);
      }
    } else {
      devLog('No hostId provided, loading all public event types...');
      // Load all public event types using simple query
      try {
        const allEventTypes = await appointmentStore.getAllActiveEventTypesSimple();
        devLog('All public event types loaded:', allEventTypes.length);
        // Also load all appointments to prevent double bookings
        await appointmentStore.loadAllAppointmentsFirebase();
        devLog('All appointments loaded for conflict checking:', appointmentStore.state.appointments.length);
      } catch (error) {
        devLog('Error loading public event types:', error);
      }
    }

    // Pre-fill form data from URL parameters and user auth
    const newFormData = { ...formData() };
    
    // First, fill from auth if user is logged in
    if (authStore.isAuthenticated && authStore.currentUser) {
      newFormData.guestName = authStore.currentUser.displayName || '';
      newFormData.guestEmail = authStore.currentUser.email || '';
    }
    
    // Then override with URL parameters if provided
    const paramsQ = urlParams();
    if (paramsQ.name) newFormData.guestName = paramsQ.name;
    if (paramsQ.email) newFormData.guestEmail = paramsQ.email;
    if (paramsQ.phone) newFormData.guestPhone = paramsQ.phone;
    if (paramsQ.notes) newFormData.notes = paramsQ.notes;


    devLog(newFormData)
    
    setFormData(newFormData);
    
    // Signal that data is loaded
    setDataLoaded(true);
  });

  // Process URL parameters reactively when data is loaded
  createEffect(() => {
    if (dataLoaded() && appointmentStore.state.eventTypes.length > 0) {
      devLog('Data loaded, processing URL parameters...');
      processUrlParameters();
    }
  });

  // Process URL parameters for auto-selection
  const processUrlParameters = () => {
    const paramsQ = urlParams();
    const eventTypes = appointmentStore.state.eventTypes;
    
    // Auto-select event type
    if (paramsQ.eventTypeId) {
      const eventType = eventTypes.find(et => et.id === paramsQ.eventTypeId);
      if (eventType) {
        devLog('Auto-selecting event type from URL:', eventType.name);
        setSelectedEventType(eventType);
        if (paramsQ.autoAdvance !== 'false') {
          setStep('date-time');
        }
      }
    } else if (paramsQ.service) {
      const eventType = eventTypes.find(et => 
        et.name.toLowerCase().includes(paramsQ.service!.toLowerCase()) ||
        et.id === paramsQ.service
      );
      if (eventType) {
        devLog('Auto-selecting event type by name from URL:', eventType.name);
        setSelectedEventType(eventType);
        if (paramsQ.autoAdvance !== 'false') {
          setStep('date-time');
        }
      }
    }
    
    // Auto-select date
    if (paramsQ.date) {
      const date = parseDate(paramsQ.date);
      if (date) {
        devLog('Auto-selecting date from URL:', date);
        setSelectedDate(date);
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
    
    // Note: Time auto-selection is handled by a separate createEffect below
    // that waits for slots to be properly generated
    
    // Auto-advance to specific step
    if (paramsQ.step) {
      const stepMapping = {
        'service': 'event-type',
        'datetime': 'date-time',
        'details': 'details',
        'confirmation': 'confirmation'
      };
      const mappedStep = stepMapping[paramsQ.step] || paramsQ.step;
      setStep(mappedStep as any);
    }
  };

  // Update available slots when date or event type changes
  createEffect(() => {
    const eventType = selectedEventType();
    const date = selectedDate();
    const availability = appointmentStore.state.availability;
    
  
    
    if (eventType && availability) {
      const slots = schedulingService.generateTimeSlots(
        date,
        eventType,
        availability,
        appointmentStore.state.appointments
      );
      /**
      const availableCount = slots.filter(s => s.available).length;
      const unavailableCount = slots.filter(s => !s.available).length;
      
      
      devLog('📅 Slots generated:', {
        total: slots.length,
        available: availableCount,
        unavailable: unavailableCount,
        slots: slots.map(s => ({
          time: s.datetime.toISOString(),
          available: s.available,
          reason: s.reason
        }))
      });
       */
      setAvailableSlots(slots);
    }
  });

  // Auto-select time slot when slots are available and time param exists
  createEffect(() => {
    const paramsQ = urlParams();
    const slots = availableSlots();
    const currentDate = selectedDate();
    
    // Only run if we have a time parameter, slots are generated, and no slot is selected yet
    if (paramsQ.time && slots.length > 0 && !selectedSlot() && currentDate) {
      const timeObj = parseTime(paramsQ.time);
      if (timeObj) {
        const targetDateTime = combineDateAndTime(currentDate, timeObj);
        devLog('Auto-selecting time from URL parameter:', targetDateTime);
        
        const matchingSlot = slots.find(slot =>
          slot.available &&
          Math.abs(slot.datetime.getTime() - targetDateTime.getTime()) < 60000 // Within 1 minute
        );
        
        if (matchingSlot) {
          devLog('Found matching time slot:', matchingSlot.datetime);
          setSelectedSlot(matchingSlot);
          if (paramsQ.autoAdvance !== 'false') {
            setStep('details');
          }
        } else {
          devLog('No matching time slot found for:', targetDateTime);
          devLog('Available slots:', slots.filter(s => s.available).map(s => s.datetime));
        }
      }
    }
  });

  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setStep('date-time');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSlotSelect = (slot: ScheduleSlot) => {
    if (slot.available) {
      setSelectedSlot(slot);
    }
  };

  const handleContinueToDetails = () => {
    if (selectedSlot()) {
      setStep('details');
    }
  };

  const handleSubmitBooking = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventType = selectedEventType()!;
      const slot = selectedSlot()!;
      const data = formData();
      const hostId = params.userId || params.username;
      
      const appointment: Omit<import('../types').Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
        eventTypeId: eventType.id,
        eventTypeName: eventType.name,
        hostId: hostId,
        hostName: appointmentStore.state.bookingPageSettings?.displayName || 'Host',
        hostEmail: '', // This should come from the host's profile
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        guestTimezone: data.guestTimezone,
        startTime: slot.datetime,
        endTime: schedulingService.calculateEndTime(slot.datetime, eventType.duration),
        duration: eventType.duration,
        timezone: appointmentStore.state.availability?.timezone || 'UTC',
        status: (eventType.requiresApproval ? 'pending' : 'confirmed') as 'pending' | 'confirmed',
        notes: data.notes,
        customResponses: data.customResponses,
        location: eventType.location || '',
        locationType: eventType.locationType
      };

      // Use Firebase method to create appointment
      const id = await appointmentStore.createAppointmentFirebase(appointment);
      setBookingId(id);
      setBookingConfirmed(true);
      setStep('confirmation');
    } catch (error) {
      devLog('Error creating appointment:', error);
      alert(t('appointments.booking.failedToCreate', 'Failed to create appointment. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step() === 'details') {
      setStep('date-time');
    } else if (step() === 'date-time') {
      setStep('event-type');
      setSelectedEventType(null);
    }
  };

  const getCalendarWeeks = () => {
    const month = currentMonth();
    return schedulingService.getCalendarWeeks(month.getFullYear(), month.getMonth());
  };

  const previousMonth = () => {
    const newMonth = new Date(currentMonth());
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth());
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const isDateAvailable = (date: Date): boolean => {
    if (!appointmentStore.state.availability) return false;
    const dates = schedulingService.getAvailableDates(date, date, appointmentStore.state.availability);
    return dates.length > 0;
  };

  

  return (
    <div style={`min-height: 100vh; background: #f9fafb; padding:${ useIsMobile()?  '2rem': ""}`}>
      {/* URL Parameter Errors */}
      <Show when={urlParamErrors().length > 0}>
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; max-width: 1200px; margin-left: auto; margin-right: auto;">
          <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <svg style="width: 1.25rem; height: 1.25rem; color: #f59e0b; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div style="flex: 1;">
              <h3 style="font-weight: 600; color: #92400e; margin: 0 0 0.5rem 0;">
                {t('appointments.booking.urlParamWarning', 'URL Parameter Issues')}
              </h3>
              <ul style="margin: 0; padding-left: 1rem; color: #92400e;">
                <For each={urlParamErrors()}>
                  {(error) => <li>{error}</li>}
                </For>
              </ul>
            </div>
            <button
              onClick={() => setUrlParamErrors([])}
              style="padding: 0.25rem; background: transparent; border: none; cursor: pointer; color: #f59e0b;"
            >
              <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </Show>

      <div style="max-width: 1200px; margin: 0 auto;">
        {/* Header */}
        <div style="text-align: center; margin-bottom: 3rem; position: relative;">
          {/* Login/Profile in top right */}
          <div style="position: absolute; top: 0; right: 0;">
            <Show
              when={authStore.isAuthenticated}
              fallback={
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  style="padding: 0.5rem 1rem; background: white; border: 1px solid #d1d5db; border-radius: 0.375rem; cursor: pointer; font-weight: 500;"
                >
                  {t('appointments.booking.loginToAutofill', 'Login to autofill')}
                </button>
              }
            >
              <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 0.375rem;">
                <span style="color: #1e40af; font-weight: 500;">
                  {authStore.currentUser?.displayName || authStore.currentUser?.email}
                </span>
              </div>
            </Show>
          </div>

          <Show when={appointmentStore.state.bookingPageSettings}>
            <Show when={appointmentStore.state.bookingPageSettings?.profileImage}>
              <img
                src={appointmentStore.state.bookingPageSettings!.profileImage}
                alt="Profile"
                style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1rem;"
              />
            </Show>
            <h1 style="font-size: 2rem; font-weight: 700; margin: 0;">
              {appointmentStore.state.bookingPageSettings?.displayName || t('appointments.booking.bookAnAppointment', 'Book an Appointment')}
            </h1>
            <Show when={appointmentStore.state.bookingPageSettings?.welcomeMessage}>
              <p style="color: #6b7280; margin-top: 0.5rem;">
                {appointmentStore.state.bookingPageSettings!.welcomeMessage}
              </p>
            </Show>
          </Show>
        </div>

        {/* Step 1: Select Event Type */}
        <Show when={step() === 'event-type'}>
          <div style="background: white; border-radius: 0.75rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">
              {t('appointments.booking.selectEventType', 'Select an event type')}
            </h2>
            <div style="display: grid; gap: 1rem;">
              <For each={appointmentStore.state.eventTypes.filter(et => et.isActive)}>
                {(eventType) => (
                  <button
                    onClick={() => handleEventTypeSelect(eventType)}
                    style={`
                      background: white;
                      border: 2px solid #e5e7eb;
                      border-radius: 0.5rem;
                      padding: 1.5rem;
                      text-align: left;
                      cursor: pointer;
                      transition: all 0.2s;
                      &:hover { border-color: ${eventType.color}; }
                    `}
                  >
                    <div style="display: flex; align-items: start; gap: 1rem;">
                      <div 
                        style={`
                          width: 1.5rem;
                          height: 1.5rem;
                          border-radius: 0.375rem;
                          background: ${eventType.color};
                          flex-shrink: 0;
                        `}
                      />
                      <div style="flex: 1;">
                        <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">
                          {eventType.name}
                        </h3>
                        <p style="color: #6b7280; margin: 0.5rem 0;">
                          {eventType.description}
                        </p>
                        <div style="display: flex; gap: 1.5rem; margin-top: 0.75rem; color: #6b7280; font-size: 0.875rem;">
                          <span>⏱️ {schedulingService.formatDuration(eventType.duration)}</span>
                          <span>📍 {t(`appointments.booking.locationType.${eventType.locationType}`, eventType.locationType)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Step 2: Select Date and Time */}
        <Show when={step() === 'date-time'}>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            {/* Calendar */}
            <div style="background: white; border-radius: 0.75rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <button onClick={previousMonth} style="padding: 0.5rem; border: none; background: none; cursor: pointer; font-size: 1.5rem;">
                  ←
                </button>
                <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">
                  {currentMonth().toLocaleDateString(t('common.locale', 'en-US'), { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} style="padding: 0.5rem; border: none; background: none; cursor: pointer; font-size: 1.5rem;">
                  →
                </button>
              </div>

              {/* Calendar Grid */}
              <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem;">
                <For each={[t('common.days.sun', 'Sun'), t('common.days.mon', 'Mon'), t('common.days.tue', 'Tue'), t('common.days.wed', 'Wed'), t('common.days.thu', 'Thu'), t('common.days.fri', 'Fri'), t('common.days.sat', 'Sat')]}>
                  {(day) => (
                    <div style="text-align: center; font-weight: 600; color: #6b7280; padding: 0.5rem; font-size: 0.875rem;">
                      {day}
                    </div>
                  )}
                </For>
                <For each={getCalendarWeeks().flat()}>
                  {(date) => {
                    const isSelected = () =>schedulingService.formatDate(date) === schedulingService.formatDate(selectedDate());
                    const isCurrentMonth =() => date.getMonth() === currentMonth().getMonth();
                   // const isAvailable = isDateAvailable(date);
                    const isPast =() => date < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    return (
                      <button
                        onClick={() => isDateAvailable(date) && !isPast() && handleDateSelect(date)}
                        disabled={!isDateAvailable(date) || !isCurrentMonth || isPast()}
                        style={`
                          background:  'white';
                          cursor: ${isDateAvailable(date) && isCurrentMonth() && !isPast() ? 'pointer' : 'not-allowed'};
                          color: ${isSelected() ? 'white' : !isCurrentMonth || isPast() ? '#d1d5db' : isDateAvailable(date) ? '#111827' : '#9ca3af'};
                          font-weight: ${isSelected() ? '600' : '400'};
                          opacity: ${!isCurrentMonth ? '0.4' : '1'};
                          display: flex; 
                          border: ${isSelected() ? "1px solid #3B82F6"  :"none" };
                          background: ${isSelected() ? selectedEventType()?.color || '#3B82F6' : 'white'};
                          padding: 0.75rem 0.5rem;
                          border-radius: 0.375rem;
                        `}
                      >
                        <div style={`
                          align-items: center;
                          background-repeat: no-repeat;
                          display: flex;
                          
                          `}>
                          {date.getDate()}
                        </div>
                        
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>

            {/* Time Slots */}
            <div style="background: white; border-radius: 0.75rem; padding: 4rem 2rem 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 1.5rem 0;">
                {t('appointments.booking.availableTimesFor', 'Available times for')} {selectedDate().toLocaleDateString(t('common.locale', 'en-US'), { month: 'long', day: 'numeric' })}
              </h3>
              
              <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
                <Show when={availableSlots().filter(s => s.available).length === 0}>
                  <p style="color: #6b7280; text-align: center; padding: 2rem;">
                    {t('appointments.booking.noAvailableTimes', 'No available times on this date')}
                  </p>
                </Show>
                
                <For each={availableSlots().filter(s => s.available)}>
                  {(slot) => {
                    const isSelected = () => selectedSlot()?.datetime.getTime() === slot.datetime.getTime();
                    return (
                      <button
                        onClick={() => handleSlotSelect(slot)}
                        style={`
                          padding: 0.75rem 1rem;
                          border: 2px solid ${isSelected() ? selectedEventType()?.color || '#3B82F6' : '#e5e7eb'};
                          border-radius: 0.375rem;
                          background: ${isSelected() ? selectedEventType()?.color || '#3B82F6' : 'white'};
                          color: ${isSelected() ? 'white' : '#111827'};
                          cursor: pointer;
                          font-weight: ${isSelected() ? '600' : '400'};
                          text-align: left;
                        `}
                      >
                        {slot.datetime.toLocaleTimeString(t('common.locale', 'en-US'), { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </button>
                    );
                  }}
                </For>
              </div>

              <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                <button
                  onClick={goBack}
                  style="flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: white; cursor: pointer; font-weight: 600;"
                >
                  {t('appointments.booking.back', 'Back')}
                </button>
                <button
                  onClick={handleContinueToDetails}
                  disabled={!selectedSlot()}
                  style={`
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 0.375rem;
                    background: ${selectedSlot() ? selectedEventType()?.color || '#3B82F6' : '#e5e7eb'};
                    color: white;
                    cursor: ${selectedSlot() ? 'pointer' : 'not-allowed'};
                    font-weight: 600;
                  `}
                >
                  {t('appointments.booking.continue', 'Continue')}
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* Step 3: Enter Details */}
        <Show when={step() === 'details'}>
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 0.75rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">
              {t('appointments.booking.enterYourDetails', 'Enter your details')}
            </h2>

            {/* Summary */}
            <div style="background: #f9fafb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
              <h4 style="font-weight: 600; margin: 0 0 0.5rem 0;">{selectedEventType()?.name}</h4>
              <p style="color: #6b7280; margin: 0; font-size: 0.875rem;">
                {schedulingService.formatDateTime(selectedSlot()!.datetime, 'long')}
              </p>
              <p style="color: #6b7280; margin: 0; font-size: 0.875rem;">
                {t('appointments.booking.duration', 'Duration')}: {schedulingService.formatDuration(selectedEventType()!.duration)}
              </p>
            </div>

            <form onSubmit={handleSubmitBooking}>
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                    {t('appointments.booking.nameRequired', 'Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData().guestName}
                    onInput={(e) => setFormData({ ...formData(), guestName: e.currentTarget.value })}
                    placeholder={t('appointments.booking.yourFullName', 'Your full name')}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                  />
                </div>

                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                    {t('appointments.booking.emailRequired', 'Email *')}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData().guestEmail}
                    onInput={(e) => setFormData({ ...formData(), guestEmail: e.currentTarget.value })}
                    placeholder={t('appointments.booking.yourEmail', 'you@example.com')}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                  />
                </div>

                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                    {t('appointments.booking.phone', 'Phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData().guestPhone || ''}
                    onInput={(e) => setFormData({ ...formData(), guestPhone: e.currentTarget.value })}
                    placeholder={t('appointments.booking.yourPhone', '+1 (555) 123-4567')}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                  />
                </div>

                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                    {t('appointments.booking.additionalNotes', 'Additional Notes')}
                  </label>
                  <textarea
                    value={formData().notes || ''}
                    onInput={(e) => setFormData({ ...formData(), notes: e.currentTarget.value })}
                    placeholder={t('appointments.booking.notesPlaceholder', 'Share anything that will help prepare for our meeting')}
                    rows={4}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                  />
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                  <button
                    type="button"
                    onClick={goBack}
                    style="flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: white; cursor: pointer; font-weight: 600;"
                  >
                    {t('appointments.booking.back', 'Back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading()}
                    style={`
                      flex: 1;
                      padding: 0.75rem;
                      border: none;
                      border-radius: 0.375rem;
                      background: ${selectedEventType()?.color || '#3B82F6'};
                      color: white;
                      cursor: ${loading() ? 'not-allowed' : 'pointer'};
                      font-weight: 600;
                    `}
                  >
                    {loading() ? t('appointments.booking.scheduling', 'Scheduling...') : t('appointments.booking.scheduleEvent', 'Schedule Event')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Show>

        {/* Step 4: Confirmation */}
        <Show when={step() === 'confirmation' && bookingConfirmed()}>
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 0.75rem; padding: 3rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">✓</div>
            <h2 style="font-size: 1.875rem; font-weight: 700; margin: 0 0 1rem 0;">
              {selectedEventType()?.requiresApproval ? t('appointments.booking.bookingRequestSent', 'Booking Request Sent!') : t('appointments.booking.youreScheduled', 'You\'re Scheduled!')}
            </h2>
            <p style="color: #6b7280; font-size: 1.125rem; margin: 0 0 2rem 0;">
              {selectedEventType()?.requiresApproval 
                ? t('appointments.booking.bookingRequestPending', 'Your booking request has been sent and is awaiting approval.')
                : t('appointments.booking.confirmationEmailSent', 'A confirmation email has been sent to your email address.')
              }
            </p>

            <div style="background: #f9fafb; border-radius: 0.5rem; padding: 1.5rem; text-align: left; margin-bottom: 2rem;">
              <h4 style="font-weight: 600; margin: 0 0 1rem 0;">{t('appointments.booking.bookingDetails', 'Booking Details')}</h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem; color: #6b7280;">
                <div>
                  <strong style="color: #111827;">{t('appointments.booking.event', 'Event')}:</strong> {selectedEventType()?.name}
                </div>
                <div>
                  <strong style="color: #111827;">{t('appointments.booking.dateTime', 'Date & Time')}:</strong> {schedulingService.formatDateTime(selectedSlot()!.datetime, 'long')}
                </div>
                <div>
                  <strong style="color: #111827;">{t('appointments.booking.duration', 'Duration')}:</strong> {schedulingService.formatDuration(selectedEventType()!.duration)}
                </div>
                <div>
                  <strong style="color: #111827;">{t('appointments.booking.location', 'Location')}:</strong> {selectedEventType()?.locationType}
                </div>
                <Show when={bookingId()}>
                  <div>
                    <strong style="color: #111827;">{t('appointments.booking.bookingId', 'Booking ID')}:</strong> {bookingId()}
                  </div>
                </Show>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              style="padding: 0.75rem 2rem; background: #3B82F6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600;"
            >
              {t('appointments.booking.bookAnother', 'Book Another Appointment')}
            </button>
          </div>
        </Show>

        {/* Login Prompt Modal */}
        <Show when={showLoginPrompt()}>
          <div
            style="
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 50;
              padding: 1rem;
            "
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowLoginPrompt(false);
            }}
          >
            <div
              style="
                background: white;
                border-radius: 0.75rem;
                max-width: 400px;
                width: 100%;
                padding: 2rem;
                text-align: center;
              "
            >
              <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 1rem 0;">
                {t('appointments.booking.signInFaster', 'Sign in for faster booking')}
              </h3>
              <p style="color: #6b7280; margin-bottom: 2rem;">
                {t('appointments.booking.signInDescription', 'Sign in to automatically fill your information and manage your appointments.')}
              </p>
              
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <button
                  onClick={() => {
                    window.location.href = '/#/'; // Redirect to login
                  }}
                  style="padding: 0.75rem 1.5rem; background: #3B82F6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600;"
                >
                  {t('appointments.booking.signIn', 'Sign In')}
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; background: white; border-radius: 0.375rem; cursor: pointer; font-weight: 600;"
                >
                  {t('appointments.booking.continueAsGuest', 'Continue as Guest')}
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default BookingPage;




/// 8283495900  ext 5 ||  