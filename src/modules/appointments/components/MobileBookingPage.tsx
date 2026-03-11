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
import { devLog } from '../../../services/utils';

const MobileBookingPage: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedEventType, setSelectedEventType] = createSignal<EventType | null>(null);
  const [selectedDate, setSelectedDate] = createSignal<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = createSignal<ScheduleSlot | null>(null);
  const [availableSlots, setAvailableSlots] = createSignal<ScheduleSlot[]>([]);
  const [currentMonth, setCurrentMonth] = createSignal(new Date());
  const [step, setStep] = createSignal<'service' | 'datetime' | 'details' | 'confirmation'>('service');
  const [loading, setLoading] = createSignal(false);
  const [bookingConfirmed, setBookingConfirmed] = createSignal(false);
  const [bookingId, setBookingId] = createSignal<string>('');
  const [showDatePicker, setShowDatePicker] = createSignal(false);
  
  const [formData, setFormData] = createSignal<BookingFormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: '',
    customResponses: {}
  });

  // Parse URL parameters for pre-filling booking info
  const [urlParams] = createSignal<BookingUrlParams>(parseBookingParams());
  const [urlParamErrors, setUrlParamErrors] = createSignal<string[]>([]);

  onMount(async () => {
    const hostId = params.userId || params.username;
    
    // Validate URL parameters
    const paramErrors = validateBookingParams(urlParams());
    if (paramErrors.length > 0) {
      setUrlParamErrors(paramErrors);
      devLog('Invalid URL parameters:', paramErrors);
    }
    
    if (hostId) {
      try {
        await appointmentStore.loadEventTypesFirebase(hostId, false);
        await appointmentStore.loadAvailabilityFirebase(hostId);
        await appointmentStore.loadBookingPageSettingsFirebase(hostId);
        await appointmentStore.loadAppointmentsFirebase(hostId);
      } catch (error) {
        devLog('Error loading booking data:', error);
      }
    } else {
      try {
        await appointmentStore.getAllActiveEventTypesSimple();
        await appointmentStore.loadAllAppointmentsFirebase();
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
    const params = urlParams();
    if (params.name) newFormData.guestName = params.name;
    if (params.email) newFormData.guestEmail = params.email;
    if (params.phone) newFormData.guestPhone = params.phone;
    if (params.notes) newFormData.notes = params.notes;
    
    setFormData(newFormData);
    
    // Process URL parameters for auto-selection after data is loaded
    setTimeout(() => processUrlParameters(), 100);
  });

  // Process URL parameters for auto-selection
  const processUrlParameters = () => {
    const params = urlParams();
    const eventTypes = appointmentStore.state.eventTypes;
    
    // Auto-select event type
    if (params.eventTypeId) {
      const eventType = eventTypes.find(et => et.id === params.eventTypeId);
      if (eventType) {
        devLog('Auto-selecting event type from URL:', eventType.name);
        setSelectedEventType(eventType);
        if (params.autoAdvance !== 'false') {
          setStep('datetime');
        }
      }
    } else if (params.service) {
      const eventType = eventTypes.find(et => 
        et.name.toLowerCase().includes(params.service!.toLowerCase()) ||
        et.id === params.service
      );
      if (eventType) {
        devLog('Auto-selecting event type by name from URL:', eventType.name);
        setSelectedEventType(eventType);
        if (params.autoAdvance !== 'false') {
          setStep('datetime');
        }
      }
    }
    
    // Auto-select date
    if (params.date) {
      const date = parseDate(params.date);
      if (date) {
        devLog('Auto-selecting date from URL:', date);
        setSelectedDate(date);
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
    
    // Auto-select time (will be processed after slots are generated)
    if (params.time && selectedEventType()) {
      const timeObj = parseTime(params.time);
      if (timeObj && selectedDate()) {
        const targetDateTime = combineDateAndTime(selectedDate(), timeObj);
        devLog('Looking for time slot from URL:', targetDateTime);
        
        // Wait for slots to be generated, then find matching slot
        setTimeout(() => {
          const slots = availableSlots();
          const matchingSlot = slots.find(slot => 
            slot.available && 
            Math.abs(slot.datetime.getTime() - targetDateTime.getTime()) < 60000 // Within 1 minute
          );
          
          if (matchingSlot) {
            devLog('Auto-selecting time slot from URL:', matchingSlot.datetime);
            setSelectedSlot(matchingSlot);
            if (params.autoAdvance !== 'false') {
              setStep('details');
            }
          }
        }, 200);
      }
    }
    
    // Auto-advance to specific step
    if (params.step) {
      setStep(params.step);
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
      setAvailableSlots(slots);
    }
  });

  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setStep('datetime');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
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
        hostEmail: '',
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
      setStep('datetime');
    } else if (step() === 'datetime') {
      setStep('service');
      setSelectedEventType(null);
    }
  };

  const getCalendarDays = () => {
    const month = currentMonth();
    return schedulingService.getCalendarWeeks(month.getFullYear(), month.getMonth()).flat();
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

  const formatTimeForMobile = (date: Date) => {
    return date.toLocaleTimeString(t('common.locale', 'en-US'), { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* URL Parameter Errors */}
      <Show when={urlParamErrors().length > 0}>
        <div class="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div class="flex-1">
              <h3 class="text-sm font-medium text-amber-800">
                {t('appointments.booking.urlParamWarning', 'URL Parameter Issues')}
              </h3>
              <div class="mt-1 text-sm text-amber-700">
                <For each={urlParamErrors()}>
                  {(error) => <div>• {error}</div>}
                </For>
              </div>
            </div>
            <button
              onClick={() => setUrlParamErrors([])}
              class="ml-2 text-amber-400 hover:text-amber-500"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </Show>

      {/* Mobile Header */}
      <div class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div class="px-4 py-4">
          <div class="flex items-center justify-between">
            <Show when={step() !== 'service'}>
              <button
                onClick={goBack}
                class="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                {t('appointments.booking.back', 'Back')}
              </button>
            </Show>
            
            {/* Progress Indicator */}
            <div class="flex space-x-2">
              <div class={`w-3 h-3 rounded-full ${step() === 'service' ? 'bg-blue-600' : step() === 'datetime' || step() === 'details' || step() === 'confirmation' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div class={`w-3 h-3 rounded-full ${step() === 'datetime' ? 'bg-blue-600' : step() === 'details' || step() === 'confirmation' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div class={`w-3 h-3 rounded-full ${step() === 'details' ? 'bg-blue-600' : step() === 'confirmation' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div class={`w-3 h-3 rounded-full ${step() === 'confirmation' ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
          </div>
          
          {/* Step Title */}
          <h1 class="text-xl font-semibold text-gray-900 mt-3">
            {step() === 'service' && t('appointments.booking.selectService', 'Select a Service')}
            {step() === 'datetime' && t('appointments.booking.selectDateAndTime', 'Pick Date & Time')}
            {step() === 'details' && t('appointments.booking.enterYourDetails', 'Your Details')}
            {step() === 'confirmation' && t('appointments.booking.confirmation', 'Confirmation')}
          </h1>
        </div>
      </div>

      <div class="pb-20"> {/* Bottom padding for fixed button */}
        {/* Step 1: Select Service */}
        <Show when={step() === 'service'}>
          <div class="p-4 space-y-4">
            <For each={appointmentStore.state.eventTypes.filter(et => et.isActive)}>
              {(eventType) => (
                <button
                  onClick={() => handleEventTypeSelect(eventType)}
                  class="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left hover:shadow-md transition-shadow active:scale-95"
                >
                  <div class="flex items-start space-x-3">
                    <div 
                      class="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ 'background-color': eventType.color }}
                    />
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-medium text-gray-900 mb-1">
                        {eventType.name}
                      </h3>
                      <p class="text-gray-600 text-sm mb-3 line-clamp-2">
                        {eventType.description}
                      </p>
                      <div class="flex items-center space-x-4 text-sm text-gray-500">
                        <div class="flex items-center">
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {eventType.duration} {t('appointments.booking.minutes', 'min')}
                        </div>
                        <div class="flex items-center">
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {t(`appointments.booking.locationType.${eventType.locationType}`, eventType.locationType)}
                        </div>
                      </div>
                      <Show when={eventType.requiresApproval}>
                        <div class="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          {t('appointments.booking.requiresApproval', 'Requires approval')}
                        </div>
                      </Show>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Step 2: Select Date and Time */}
        <Show when={step() === 'datetime'}>
          <div class="p-4 space-y-6">
            {/* Selected Service Summary */}
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div class="flex items-center space-x-3">
                <div 
                  class="w-4 h-4 rounded-full"
                  style={{ 'background-color': selectedEventType()?.color }}
                />
                <div>
                  <h3 class="font-medium text-gray-900">{selectedEventType()?.name}</h3>
                  <p class="text-sm text-gray-600">
                    {selectedEventType()?.duration} {t('appointments.booking.minutes', 'minutes')}
                  </p>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
              <div class="p-4 border-b border-gray-100">
                <div class="flex items-center justify-between">
                  <button onClick={previousMonth} class="p-2 hover:bg-gray-50 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 class="text-lg font-medium">
                    {currentMonth().toLocaleDateString(t('common.locale', 'en-US'), { month: 'long', year: 'numeric' })}
                  </h3>
                  <button onClick={nextMonth} class="p-2 hover:bg-gray-50 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div class="p-4">
                <div class="grid grid-cols-7 gap-1 mb-2">
                  <For each={[t('common.days.sun', 'S'), t('common.days.mon', 'M'), t('common.days.tue', 'T'), t('common.days.wed', 'W'), t('common.days.thu', 'T'), t('common.days.fri', 'F'), t('common.days.sat', 'S')]}>
                    {(day) => (
                      <div class="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    )}
                  </For>
                </div>
                <div class="grid grid-cols-7 gap-1">
                  <For each={getCalendarDays()}>
                    {(date) => {
                      const isSelected = () => schedulingService.formatDate(date) === schedulingService.formatDate(selectedDate());
                      const isCurrentMonth = () => date.getMonth() === currentMonth().getMonth();
                      const isPast = () => date < new Date(new Date().setHours(0, 0, 0, 0));
                      const available = isDateAvailable(date);
                      
                      return (
                        <button
                          onClick={() => available && !isPast() && isCurrentMonth() && handleDateSelect(date)}
                          disabled={!available || !isCurrentMonth() || isPast()}
                          class={`
                            aspect-square flex items-center justify-center text-sm rounded-lg transition-colors
                            ${isSelected() ? 'bg-blue-600 text-white font-medium' : ''}
                            ${!isCurrentMonth() ? 'text-gray-300' : ''}
                            ${available && isCurrentMonth() && !isPast() && !isSelected() ? 'hover:bg-gray-100 text-gray-900' : ''}
                            ${!available || isPast() ? 'text-gray-400 cursor-not-allowed' : ''}
                          `}
                        >
                          {date.getDate()}
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
              <div class="p-4 border-b border-gray-100">
                <h3 class="font-medium text-gray-900">
                  {t('appointments.booking.availableTimesFor', 'Available times for')} {selectedDate().toLocaleDateString(t('common.locale', 'en-US'), { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <div class="p-4">
                <Show 
                  when={availableSlots().filter(s => s.available).length > 0}
                  fallback={
                    <div class="text-center py-8 text-gray-500">
                      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>{t('appointments.booking.noAvailableTimes', 'No available times on this date')}</p>
                    </div>
                  }
                >
                  <div class="grid grid-cols-2 gap-3">
                    <For each={availableSlots().filter(s => s.available)}>
                      {(slot) => {
                        const isSelected = () => selectedSlot()?.datetime.getTime() === slot.datetime.getTime();
                        return (
                          <button
                            onClick={() => handleSlotSelect(slot)}
                            class={`
                              py-3 px-4 rounded-lg border text-center font-medium transition-all
                              ${isSelected() 
                                ? 'border-blue-600 bg-blue-600 text-white shadow-md' 
                                : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                          >
                            {formatTimeForMobile(slot.datetime)}
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Fixed Continue Button */}
          <Show when={selectedSlot()}>
            <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
              <button
                onClick={handleContinueToDetails}
                class="w-full bg-blue-600 text-white py-4 rounded-lg font-medium text-lg shadow-lg hover:bg-blue-700 transition-colors"
              >
                {t('appointments.booking.continue', 'Continue')}
              </button>
            </div>
          </Show>
        </Show>

        {/* Step 3: Enter Details */}
        <Show when={step() === 'details'}>
          <div class="p-4 space-y-6">
            {/* Booking Summary */}
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 class="font-medium text-gray-900 mb-3">{t('appointments.booking.bookingSummary', 'Booking Summary')}</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">{t('appointments.booking.service', 'Service')}:</span>
                  <span class="font-medium">{selectedEventType()?.name}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">{t('appointments.booking.dateTime', 'Date & Time')}:</span>
                  <span class="font-medium">{schedulingService.formatDateTime(selectedSlot()!.datetime, 'short')}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">{t('appointments.booking.duration', 'Duration')}:</span>
                  <span class="font-medium">{selectedEventType()?.duration} {t('appointments.booking.minutes', 'min')}</span>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmitBooking} class="space-y-4">
              <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200 space-y-4">
                <h3 class="font-medium text-gray-900">{t('appointments.booking.contactInfo', 'Contact Information')}</h3>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    {t('appointments.booking.nameRequired', 'Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData().guestName}
                    onInput={(e) => setFormData({ ...formData(), guestName: e.currentTarget.value })}
                    placeholder={t('appointments.booking.yourFullName', 'Your full name')}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    {t('appointments.booking.emailRequired', 'Email *')}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData().guestEmail}
                    onInput={(e) => setFormData({ ...formData(), guestEmail: e.currentTarget.value })}
                    placeholder={t('appointments.booking.yourEmail', 'you@example.com')}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    {t('appointments.booking.phone', 'Phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData().guestPhone || ''}
                    onInput={(e) => setFormData({ ...formData(), guestPhone: e.currentTarget.value })}
                    placeholder={t('appointments.booking.yourPhone', '+1 (555) 123-4567')}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    {t('appointments.booking.additionalNotes', 'Additional Notes')}
                  </label>
                  <textarea
                    value={formData().notes || ''}
                    onInput={(e) => setFormData({ ...formData(), notes: e.currentTarget.value })}
                    placeholder={t('appointments.booking.notesPlaceholder', 'Share anything that will help prepare for our meeting')}
                    rows={3}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Fixed Submit Button */}
              <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                <button
                  type="submit"
                  disabled={loading()}
                  class={`
                    w-full py-4 rounded-lg font-medium text-lg transition-colors
                    ${loading() 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                    }
                  `}
                >
                  {loading() 
                    ? t('appointments.booking.scheduling', 'Scheduling...') 
                    : t('appointments.booking.scheduleEvent', 'Schedule Event')
                  }
                </button>
              </div>
            </form>
          </div>
        </Show>

        {/* Step 4: Confirmation */}
        <Show when={step() === 'confirmation' && bookingConfirmed()}>
          <div class="p-4">
            <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">
                {selectedEventType()?.requiresApproval 
                  ? t('appointments.booking.bookingRequestSent', 'Booking Request Sent!') 
                  : t('appointments.booking.youreScheduled', 'Youre Scheduled!')
                }
              </h2>
              <p class="text-gray-600 mb-6">
                {selectedEventType()?.requiresApproval 
                  ? t('appointments.booking.bookingRequestPending', 'Your booking request has been sent and is awaiting approval.')
                  : t('appointments.booking.confirmationEmailSent', 'A confirmation email has been sent to your email address.')
                }
              </p>

              {/* Booking Details */}
              <div class="bg-gray-50 rounded-lg p-4 text-left mb-6">
                <h4 class="font-medium text-gray-900 mb-3">{t('appointments.booking.bookingDetails', 'Booking Details')}</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">{t('appointments.booking.event', 'Event')}:</span>
                    <span class="font-medium">{selectedEventType()?.name}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">{t('appointments.booking.dateTime', 'Date & Time')}:</span>
                    <span class="font-medium">{schedulingService.formatDateTime(selectedSlot()!.datetime, 'long')}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">{t('appointments.booking.duration', 'Duration')}:</span>
                    <span class="font-medium">{schedulingService.formatDuration(selectedEventType()!.duration)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">{t('appointments.booking.location', 'Location')}:</span>
                    <span class="font-medium">{selectedEventType()?.locationType}</span>
                  </div>
                  <Show when={bookingId()}>
                    <div class="flex justify-between">
                      <span class="text-gray-600">{t('appointments.booking.bookingId', 'Booking ID')}:</span>
                      <span class="font-medium font-mono text-xs">{bookingId()}</span>
                    </div>
                  </Show>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {t('appointments.booking.bookAnother', 'Book Another Appointment')}
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MobileBookingPage;