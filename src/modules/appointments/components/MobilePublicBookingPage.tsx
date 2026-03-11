import { Component, For, Show, createSignal, onMount } from 'solid-js';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import { useTranslation } from '../../../translations';
import type { EventType } from '../types';
import { devLog } from '../../../services/utils';

/**
 * Mobile-first public booking page that shows all available event types
 */
export const MobilePublicBookingPage: Component = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string>('');
  const [searchTerm, setSearchTerm] = createSignal('');

  onMount(async () => {
    try {
      setLoading(true);
      devLog('MobilePublicBookingPage - Loading all event types...');
      
      // Get all active event types using simple query (no index required)
      const allEventTypes = await appointmentStore.getAllActiveEventTypesSimple();
      
      devLog('MobilePublicBookingPage - Loaded event types:', allEventTypes.length);
      devLog('MobilePublicBookingPage - Event types data:', allEventTypes);
      setLoading(false);
    } catch (err) {
      devLog('MobilePublicBookingPage - Error loading event types:', err);
      setError((err as Error).message);
      setLoading(false);
    }
  });

  const handleSelectEventType = (eventType: EventType) => {
    // Navigate to the mobile booking page with the host's ID
    window.location.href = `/#/mobile-book/${eventType.createdBy}`;
  };

  const filteredEventTypes = () => {
    const term = searchTerm().toLowerCase();
    if (!term) return appointmentStore.state.eventTypes.filter(et => et.isActive);
    
    return appointmentStore.state.eventTypes.filter(et => 
      et.isActive && (
        et.name.toLowerCase().includes(term) ||
        et.description.toLowerCase().includes(term) ||
        et.locationType.toLowerCase().includes(term)
      )
    );
  };

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div class="bg-white shadow-sm">
        <div class="px-4 py-6">
          <h1 class="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('appointments.booking.bookAnAppointment', 'Book an Appointment')}
          </h1>
          <p class="text-gray-600 text-center">
            {t('appointments.booking.selectService', 'Select a service to schedule your appointment')}
          </p>
        </div>
        
        {/* Search Bar */}
        <div class="px-4 pb-4">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              placeholder={t('appointments.booking.searchServices', 'Search services...')}
              class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      <Show when={loading()}>
        <div class="flex flex-col items-center justify-center py-16">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </Show>

      {/* Error State */}
      <Show when={error()}>
        <div class="mx-4 mt-4">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 class="text-sm font-medium text-red-800">
                  {t('common.error', 'Error')}
                </h3>
                <p class="text-sm text-red-700 mt-1">{error()}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              class="mt-3 text-sm text-red-600 underline"
            >
              {t('appointments.booking.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </Show>

      {/* Event Types List */}
      <Show when={!loading() && !error()}>
        <Show 
          when={filteredEventTypes().length > 0}
          fallback={
            <div class="px-4 py-16 text-center">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0v-3a4 4 0 014-4h4a4 4 0 014 4v3a4 4 0 01-4 4z" />
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                {searchTerm() 
                  ? t('appointments.booking.noSearchResults', 'No services found')
                  : t('appointments.booking.noEventTypesAvailable', 'No appointment types available at the moment.')
                }
              </h3>
              <p class="text-gray-600">
                {searchTerm()
                  ? t('appointments.booking.tryDifferentSearch', 'Try a different search term')
                  : t('appointments.booking.checkBackLater', 'Please check back later or contact us directly.')
                }
              </p>
              <Show when={searchTerm()}>
                <button
                  onClick={() => setSearchTerm('')}
                  class="mt-4 text-blue-600 underline"
                >
                  {t('appointments.booking.clearSearch', 'Clear search')}
                </button>
              </Show>
            </div>
          }
        >
          <div class="px-4 py-4 space-y-4">
            <For each={filteredEventTypes()}>
              {(eventType) => (
                <button
                  class="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-shadow active:scale-95"
                  onClick={() => handleSelectEventType(eventType)}
                >
                  <div class="flex items-start space-x-4">
                    {/* Color indicator */}
                    <div 
                      class="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ 'background-color': eventType.color }}
                    />
                    
                    <div class="flex-1 min-w-0">
                      {/* Event Type Info */}
                      <h3 class="text-lg font-medium text-gray-900 mb-1">
                        {eventType.name}
                      </h3>
                      
                      <p class="text-gray-600 text-sm mb-3 line-clamp-2">
                        {eventType.description}
                      </p>
                      
                      {/* Details */}
                      <div class="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                        <div class="flex items-center">
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{eventType.duration} {t('appointments.booking.minutes', 'min')}</span>
                        </div>
                        
                        <div class="flex items-center">
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{t(`appointments.booking.locationType.${eventType.locationType}`, eventType.locationType.replace('-', ' '))}</span>
                        </div>
                        
                        <Show when={eventType.location}>
                          <div class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span class="truncate">{eventType.location}</span>
                          </div>
                        </Show>
                      </div>
                      
                      <Show when={eventType.requiresApproval}>
                        <div class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 mb-2">
                          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          {t('appointments.booking.requiresApproval', 'Requires approval')}
                        </div>
                      </Show>
                      
                      {/* CTA */}
                      <div class="flex items-center justify-between mt-3">
                        <span 
                          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ 'background-color': eventType.color }}
                        >
                          {t('appointments.booking.bookNow', 'Book Now')}
                        </span>
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* How It Works Section - Only show when not searching and has results */}
      <Show when={!loading() && !error() && !searchTerm() && filteredEventTypes().length > 0}>
        <div class="mx-4 my-8 bg-blue-50 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 text-center">
            {t('appointments.booking.howItWorks', 'How It Works')}
          </h2>
          <div class="space-y-4">
            <div class="flex items-start space-x-3">
              <div class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">
                1
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{t('appointments.booking.step1', 'Select a Service')}</h3>
                <p class="text-gray-600 text-sm">{t('appointments.booking.step1Description', 'Choose the appointment type that fits your needs')}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">
                2
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{t('appointments.booking.step2', 'Pick a Date & Time')}</h3>
                <p class="text-gray-600 text-sm">{t('appointments.booking.step2Description', 'Select from available time slots')}</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">
                3
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{t('appointments.booking.step3', 'Confirm Booking')}</h3>
                <p class="text-gray-600 text-sm">{t('appointments.booking.step3Description', 'Enter your details and receive confirmation')}</p>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default MobilePublicBookingPage;