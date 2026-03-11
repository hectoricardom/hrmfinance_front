import { Component, For, Show, createSignal, onMount } from 'solid-js';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import { useTranslation } from '../../../translations';
import type { EventType } from '../types';
import { parseBookingParams, type BookingUrlParams } from '../utils/urlParams';
import { devLog } from '../../../services/utils';

/**
 * Public booking page that shows all available event types
 */
export const PublicBookingPage: Component = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string>('');
  
  // Parse URL parameters
  const [urlParams] = createSignal<BookingUrlParams>(parseBookingParams());

  onMount(async () => {
    try {
      setLoading(true);
      devLog('PublicBookingPage - Loading all event types...');
      
      // Get all active event types using simple query (no index required)
      const allEventTypes = await appointmentStore.getAllActiveEventTypesSimple();
      
      devLog('PublicBookingPage - Loaded event types:', allEventTypes.length);
      devLog('PublicBookingPage - Event types data:', allEventTypes);
      setLoading(false);
      
      // Check if we should auto-redirect to a specific service
      const params = urlParams();
      if (params.service || params.eventTypeId) {
        const eventTypes = appointmentStore.state.eventTypes;
        let targetEventType: EventType | undefined;
        
        if (params.eventTypeId) {
          targetEventType = eventTypes.find(et => et.id === params.eventTypeId);
        } else if (params.service) {
          targetEventType = eventTypes.find(et => 
            et.name.toLowerCase().includes(params.service!.toLowerCase())
          );
        }
        
        if (targetEventType) {
          devLog('Auto-redirecting to event type:', targetEventType.name);
          // Preserve URL parameters when redirecting
          const currentParams = new URLSearchParams(window.location.search);
          currentParams.delete('eventTypeId'); // Remove these as they're no longer needed
          currentParams.delete('service');
          const paramString = currentParams.toString();
          const redirectUrl = `/#/book/${targetEventType.createdBy}${paramString ? '?' + paramString : ''}`;
          window.location.href = redirectUrl;
        }
      }
    } catch (err) {
      devLog('PublicBookingPage - Error loading event types:', err);
      setError((err as Error).message);
      setLoading(false);
    }
  });

  const handleSelectEventType = (eventType: EventType) => {
    // Preserve URL parameters when navigating
    const currentParams = new URLSearchParams(window.location.search);
    const paramString = currentParams.toString();
    const redirectUrl = `/#/book/${eventType.createdBy}${paramString ? '?' + paramString : ''}`;
    window.location.href = redirectUrl;
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            {t('appointments.booking.bookAnAppointment', 'Book an Appointment')}
          </h1>
          <p class="text-lg text-gray-600">
            {t('appointments.booking.selectService', 'Select a service to schedule your appointment')}
          </p>
        </div>

        {/* Loading State */}
        <Show when={loading()}>
          <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Show>

        {/* Error State */}
        <Show when={error()}>
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p class="text-red-800">Error: {error()}</p>
            <button 
              onClick={() => window.location.reload()}
              class="mt-2 text-red-600 underline"
            >
              {t('appointments.booking.tryAgain', 'Try Again')}
            </button>
          </div>
        </Show>

        {/* Event Types Grid */}
        <Show when={!loading() && !error()}>
          <Show 
            when={appointmentStore.state.eventTypes.length > 0}
            fallback={
              <div class="text-center py-12">
                <div class="bg-gray-100 rounded-lg p-8">
                  <p class="text-gray-600 text-lg mb-4">
                    {t('appointments.booking.noEventTypesAvailable', 'No appointment types available at the moment.')}
                  </p>
                  <p class="text-gray-500">
                    {t('appointments.booking.checkBackLater', 'Please check back later or contact us directly.')}
                  </p>
                </div>
              </div>
            }
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <For each={appointmentStore.state.eventTypes.filter(et => et.isActive)}>
                {(eventType) => (
                  <div 
                    class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleSelectEventType(eventType)}
                  >
                    <div class="p-6">
                      {/* Color indicator */}
                      <div 
                        class="w-full h-2 rounded-t-lg -mt-6 -mx-6 mb-4"
                        style={{ 'background-color': eventType.color }}
                      />
                      
                      {/* Event Type Info */}
                      <h3 class="text-xl font-semibold text-gray-900 mb-2">
                        {eventType.name}
                      </h3>
                      
                      <p class="text-gray-600 mb-4">
                        {eventType.description}
                      </p>
                      
                      {/* Details */}
                      <div class="space-y-2 text-sm text-gray-500">
                        <div class="flex items-center gap-2">
                          <span>⏱️</span>
                          <span>{eventType.duration} {t('appointments.booking.minutes', 'minutes')}</span>
                        </div>
                        
                        <div class="flex items-center gap-2">
                          <span>📍</span>
                          <span class="capitalize">{t(`appointments.booking.locationType.${eventType.locationType}`, eventType.locationType.replace('-', ' '))}</span>
                        </div>
                        
                        <Show when={eventType.location}>
                          <div class="flex items-center gap-2">
                            <span>📌</span>
                            <span>{eventType.location}</span>
                          </div>
                        </Show>
                        
                        <Show when={eventType.requiresApproval}>
                          <div class="flex items-center gap-2">
                            <span>✓</span>
                            <span>{t('appointments.booking.requiresApproval', 'Requires approval')}</span>
                          </div>
                        </Show>
                      </div>
                      
                      {/* CTA Button */}
                      <button 
                        class="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        style={{ 'background-color': eventType.color }}
                      >
                        {t('appointments.booking.bookNow', 'Book Now')}
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>

        {/* Info Section */}
        <div class="mt-16 bg-blue-50 rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">
            {t('appointments.booking.howItWorks', 'How It Works')}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 text-2xl">
                1️⃣
              </div>
              <h3 class="font-semibold mb-2">{t('appointments.booking.step1', 'Select a Service')}</h3>
              <p class="text-gray-600">{t('appointments.booking.step1Description', 'Choose the appointment type that fits your needs')}</p>
            </div>
            <div class="text-center">
              <div class="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 text-2xl">
                2️⃣
              </div>
              <h3 class="font-semibold mb-2">{t('appointments.booking.step2', 'Pick a Date & Time')}</h3>
              <p class="text-gray-600">{t('appointments.booking.step2Description', 'Select from available time slots')}</p>
            </div>
            <div class="text-center">
              <div class="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 text-2xl">
                3️⃣
              </div>
              <h3 class="font-semibold mb-2">{t('appointments.booking.step3', 'Confirm Booking')}</h3>
              <p class="text-gray-600">{t('appointments.booking.step3Description', 'Enter your details and receive confirmation')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};