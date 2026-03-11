import { Component, createSignal, Show } from 'solid-js';
import { useTranslation } from '../../../translations';
import { createShareableLink, generateBookingUrl, type BookingUrlParams } from '../utils/urlParams';
import type { EventType } from '../types';
import { devLog } from '../../../services/utils';

interface ShareableBookingLinkProps {
  hostId: string;
  eventType?: EventType;
  suggestedDate?: Date;
  suggestedTime?: Date;
  preFilledName?: string;
  preFilledEmail?: string;
  className?: string;
}

export const ShareableBookingLink: Component<ShareableBookingLinkProps> = (props) => {
  const { t } = useTranslation();
  const [copied, setCopied] = createSignal(false);
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  
  // Advanced options
  const [customParams, setCustomParams] = createSignal<BookingUrlParams>({});

  const generateLink = () => {
    const params: BookingUrlParams = {
      ...customParams()
    };

    // Add basic params
    if (props.eventType) {
      params.eventTypeId = props.eventType.id;
    }
    
    if (props.suggestedDate) {
      params.date = props.suggestedDate.toISOString().split('T')[0];
    }
    
    if (props.suggestedTime) {
      params.time = props.suggestedTime.toTimeString().slice(0, 5);
    }
    
    if (props.preFilledName) {
      params.name = props.preFilledName;
    }
    
    if (props.preFilledEmail) {
      params.email = props.preFilledEmail;
    }

    const baseUrl = `${window.location.origin}/#/mobile-book/${props.hostId}`;
    return generateBookingUrl(baseUrl, params);
  };

  const copyToClipboard = async () => {
    try {
      const link = generateLink();
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      devLog('Failed to copy to clipboard:', error);
      // Fallback: select text for manual copying
      const link = generateLink();
      const tempInput = document.createElement('input');
      tempInput.value = link;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div class={props.className || 'bg-white border border-gray-200 rounded-lg p-4'}>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-medium text-gray-900">
          {t('appointments.booking.shareableLink', 'Shareable Booking Link')}
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced())}
          class="text-sm text-blue-600 hover:text-blue-700"
        >
          {showAdvanced() 
            ? t('appointments.booking.hideAdvanced', 'Hide Advanced') 
            : t('appointments.booking.showAdvanced', 'Advanced')
          }
        </button>
      </div>

      {/* Advanced Options */}
      <Show when={showAdvanced()}>
        <div class="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 class="text-sm font-medium text-gray-700">
            {t('appointments.booking.advancedOptions', 'Advanced Options')}
          </h4>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                {t('appointments.booking.autoAdvance', 'Auto Advance')}
              </label>
              <select 
                value={customParams().autoAdvance || 'true'}
                onChange={(e) => setCustomParams({ ...customParams(), autoAdvance: e.currentTarget.value as any })}
                class="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="true">{t('common.yes', 'Yes')}</option>
                <option value="false">{t('common.no', 'No')}</option>
              </select>
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                {t('appointments.booking.startStep', 'Start Step')}
              </label>
              <select 
                value={customParams().step || 'service'}
                onChange={(e) => setCustomParams({ ...customParams(), step: e.currentTarget.value as any })}
                class="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="service">{t('appointments.booking.selectService', 'Service')}</option>
                <option value="datetime">{t('appointments.booking.selectDateTime', 'Date/Time')}</option>
                <option value="details">{t('appointments.booking.enterDetails', 'Details')}</option>
              </select>
            </div>
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">
              {t('appointments.booking.preFilledNotes', 'Pre-filled Notes')}
            </label>
            <textarea
              value={customParams().notes || ''}
              onInput={(e) => setCustomParams({ ...customParams(), notes: e.currentTarget.value })}
              placeholder={t('appointments.booking.notesPlaceholder', 'Additional notes...')}
              rows={2}
              class="w-full text-sm border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </div>
      </Show>

      {/* Generated Link */}
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {t('appointments.booking.generatedLink', 'Generated Link')}
          </label>
          <div class="flex">
            <input
              type="text"
              value={generateLink()}
              readonly
              class="flex-1 text-sm border border-gray-300 rounded-l-lg px-3 py-2 bg-gray-50 font-mono text-xs"
            />
            <button
              onClick={copyToClipboard}
              class={`px-4 py-2 border border-l-0 border-gray-300 rounded-r-lg text-sm font-medium transition-colors ${
                copied() 
                  ? 'bg-green-600 text-white border-green-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {copied() 
                ? (
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {t('common.copied', 'Copied')}
                  </div>
                ) : (
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t('common.copy', 'Copy')}
                  </div>
                )
              }
            </button>
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div class="flex space-x-2">
          <button
            onClick={() => {
              const link = generateLink();
              const text = `${t('appointments.booking.bookWithMe', 'Book an appointment with me')}: ${link}`;
              if (navigator.share) {
                navigator.share({ title: 'Booking Link', text, url: link });
              } else {
                copyToClipboard();
              }
            }}
            class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            {t('common.share', 'Share')}
          </button>
          
          <button
            onClick={() => {
              const link = generateLink();
              window.open(`mailto:?subject=${encodeURIComponent(t('appointments.booking.bookingInvitation', 'Booking Invitation'))}&body=${encodeURIComponent(`${t('appointments.booking.bookWithMe', 'Book an appointment with me')}: ${link}`)}`, '_blank');
            }}
            class="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
          >
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('common.email', 'Email')}
          </button>
        </div>
      </div>

      {/* URL Parameters Info */}
      <Show when={showAdvanced()}>
        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 class="text-sm font-medium text-blue-900 mb-2">
            {t('appointments.booking.urlParametersHelp', 'URL Parameters Help')}
          </h4>
          <div class="text-xs text-blue-800 space-y-1">
            <div><code>?service=consultation</code> - Pre-select service by name</div>
            <div><code>&eventTypeId=abc123</code> - Pre-select service by ID</div>
            <div><code>&date=2024-01-15</code> - Pre-select date (YYYY-MM-DD)</div>
            <div><code>&time=10:30</code> - Pre-select time (HH:mm or H:mm AM/PM)</div>
            <div><code>&name=John%20Doe</code> - Pre-fill name</div>
            <div><code>&email=john@example.com</code> - Pre-fill email</div>
            <div><code>&phone=+1234567890</code> - Pre-fill phone</div>
            <div><code>&notes=Meeting%20notes</code> - Pre-fill notes</div>
            <div><code>&step=datetime</code> - Start at specific step</div>
            <div><code>&autoAdvance=false</code> - Disable auto-advance</div>
          </div>
        </div>
      </Show>
    </div>
  );
};