/**
 * KioskMode Component
 * Full-screen tablet mode for client self-check-in.
 * Extra large UI elements for touch interaction.
 * Auto-returns to welcome screen after 30 seconds of inactivity.
 */

import { Component, createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { checkinService } from '../services/checkinService';
import { devLog } from '../../../services/utils';
import type { SupportedLanguage, KioskConfig, KioskService } from '../types/workflowTypes';
import { DEFAULT_KIOSK_CONFIG, UI_LABELS } from '../types/workflowTypes';

interface KioskModeProps {
  config?: KioskConfig;
}

type KioskScreen =
  | 'welcome'
  | 'appointment_lookup'
  | 'appointment_found'
  | 'walkin_form'
  | 'confirmation';

const KioskMode: Component<KioskModeProps> = (props) => {
  const config = () => props.config || DEFAULT_KIOSK_CONFIG;

  // ============================================
  // State
  // ============================================

  const [lang, setLang] = createSignal<SupportedLanguage>('en');
  const [screen, setScreen] = createSignal<KioskScreen>('welcome');
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  // Appointment lookup
  const [lookupPhone, setLookupPhone] = createSignal('');
  const [appointmentInfo, setAppointmentInfo] = createSignal<{
    appointmentId: string;
    clientName: string;
    scheduledTime: string;
    serviceType: string;
  } | null>(null);

  // Walk-in form
  const [walkInName, setWalkInName] = createSignal('');
  const [walkInPhone, setWalkInPhone] = createSignal('');
  const [selectedService, setSelectedService] = createSignal('');

  // Confirmation
  const [queueNumber, setQueueNumber] = createSignal(0);
  const [estimatedWait, setEstimatedWait] = createSignal(0);

  // Inactivity timer
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  // ============================================
  // Helpers
  // ============================================

  const t = (key: string): string => {
    return UI_LABELS[key]?.[lang()] || key;
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (screen() !== 'welcome') {
      inactivityTimer = setTimeout(() => {
        resetToWelcome();
      }, (config().inactivityTimeoutSeconds || 30) * 1000);
    }
  };

  const resetToWelcome = () => {
    setScreen('welcome');
    setLookupPhone('');
    setAppointmentInfo(null);
    setWalkInName('');
    setWalkInPhone('');
    setSelectedService('');
    setQueueNumber(0);
    setEstimatedWait(0);
    setErrorMsg('');
    setIsLoading(false);
    if (inactivityTimer) clearTimeout(inactivityTimer);
  };

  const handleInteraction = () => {
    resetInactivityTimer();
  };

  // ============================================
  // Lifecycle
  // ============================================

  onMount(() => {
    // Request fullscreen if possible
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          devLog('KioskMode: fullscreen request denied');
        });
      }
    } catch (e) {
      devLog('KioskMode: fullscreen not available');
    }

    // Attach interaction listeners for inactivity detection
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
  });

  onCleanup(() => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);

    // Exit fullscreen
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      // noop
    }
  });

  // ============================================
  // Actions
  // ============================================

  const handleAppointmentLookup = async () => {
    if (!lookupPhone().trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    resetInactivityTimer();

    try {
      const result = await checkinService.lookupAppointmentByPhone(lookupPhone().replace(/\D/g, ''));
      if (result.found && result.appointmentId) {
        setAppointmentInfo({
          appointmentId: result.appointmentId,
          clientName: result.clientName || '',
          scheduledTime: result.scheduledTime || '',
          serviceType: result.serviceType || '',
        });
        setScreen('appointment_found');
      } else {
        setErrorMsg(t('appointmentNotFound'));
      }
    } catch (error: any) {
      devLog('KioskMode: lookup error', error);
      setErrorMsg(t('appointmentNotFound'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppointmentCheckIn = async () => {
    const info = appointmentInfo();
    if (!info) return;

    setIsLoading(true);
    resetInactivityTimer();

    try {
      const entry = await checkinService.checkInClient(info.appointmentId);
      setQueueNumber(entry.queueNumber);
      setEstimatedWait(entry.estimatedWaitMinutes);
      setScreen('confirmation');

      // Auto-return to welcome after 10 seconds on confirmation
      setTimeout(resetToWelcome, 10_000);
    } catch (error: any) {
      devLog('KioskMode: check-in error', error);
      setErrorMsg(error.message || 'Check-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalkInSubmit = async () => {
    if (!walkInName().trim() || !walkInPhone().trim()) return;

    setIsLoading(true);
    resetInactivityTimer();

    try {
      const entry = await checkinService.checkInWalkIn(
        walkInName().trim(),
        walkInPhone().trim(),
        selectedService() || undefined
      );
      setQueueNumber(entry.queueNumber);
      setEstimatedWait(entry.estimatedWaitMinutes);
      setScreen('confirmation');

      // Auto-return to welcome after 10 seconds on confirmation
      setTimeout(resetToWelcome, 10_000);
    } catch (error: any) {
      devLog('KioskMode: walk-in error', error);
      setErrorMsg(error.message || 'Check-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneKeypadPress = (digit: string) => {
    resetInactivityTimer();
    if (digit === 'del') {
      setLookupPhone((prev) => prev.slice(0, -1));
    } else if (digit === 'clear') {
      setLookupPhone('');
    } else if (lookupPhone().length < 10) {
      setLookupPhone((prev) => prev + digit);
    }
  };

  const formatPhoneDisplay = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // ============================================
  // Styles
  // ============================================

  const PRIMARY = config().primaryColor || '#1a73e8';

  const fullScreenStyle = {
    width: '100vw',
    height: '100vh',
    background: '#f8fafc',
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
    position: 'fixed' as const,
    top: '0',
    left: '0',
    'z-index': '9999',
  };

  const langBarStyle = {
    position: 'absolute' as const,
    top: '24px',
    right: '24px',
    display: 'flex',
    gap: '12px',
  };

  const langBtnStyle = (active: boolean) => ({
    padding: '14px 28px',
    'font-size': '20px',
    'font-weight': '600',
    border: `3px solid ${PRIMARY}`,
    'border-radius': '12px',
    background: active ? PRIMARY : '#ffffff',
    color: active ? '#ffffff' : PRIMARY,
    cursor: 'pointer',
    'min-height': '56px',
    transition: 'all 0.2s ease',
  });

  const welcomeTitleStyle = {
    'font-size': '42px',
    'font-weight': '700',
    color: '#111827',
    'text-align': 'center' as const,
    'margin-bottom': '48px',
    'max-width': '700px',
    'line-height': '1.2',
  };

  const bigButtonStyle = (variant: 'primary' | 'secondary') => ({
    width: '400px',
    padding: '32px',
    'font-size': '28px',
    'font-weight': '700',
    border: variant === 'primary' ? 'none' : `3px solid ${PRIMARY}`,
    'border-radius': '16px',
    background: variant === 'primary' ? PRIMARY : '#ffffff',
    color: variant === 'primary' ? '#ffffff' : PRIMARY,
    cursor: 'pointer',
    'min-height': '100px',
    transition: 'transform 0.1s ease',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.1)',
  });

  const screenContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    padding: '40px',
    'max-width': '600px',
    width: '100%',
  };

  const kioskInputStyle = {
    width: '100%',
    padding: '20px 24px',
    'font-size': '28px',
    border: `3px solid #d1d5db`,
    'border-radius': '12px',
    'text-align': 'center' as const,
    'min-height': '72px',
    outline: 'none',
    'letter-spacing': '2px',
    'font-family': 'monospace',
    'box-sizing': 'border-box' as const,
  };

  const keypadStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(3, 1fr)',
    gap: '12px',
    'max-width': '360px',
    width: '100%',
    'margin-top': '24px',
  };

  const keypadBtnStyle = {
    padding: '20px',
    'font-size': '32px',
    'font-weight': '600',
    border: '2px solid #d1d5db',
    'border-radius': '12px',
    background: '#ffffff',
    color: '#111827',
    cursor: 'pointer',
    'min-height': '72px',
    transition: 'background 0.1s ease',
  };

  const kioskActionBtnStyle = (disabled: boolean) => ({
    width: '100%',
    'max-width': '400px',
    padding: '24px',
    'font-size': '24px',
    'font-weight': '700',
    border: 'none',
    'border-radius': '12px',
    background: disabled ? '#9ca3af' : PRIMARY,
    color: '#ffffff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    'min-height': '72px',
    'margin-top': '24px',
    transition: 'background 0.2s ease',
  });

  const backBtnStyle = {
    position: 'absolute' as const,
    top: '24px',
    left: '24px',
    padding: '14px 28px',
    'font-size': '20px',
    'font-weight': '500',
    border: '2px solid #9ca3af',
    'border-radius': '12px',
    background: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    'min-height': '56px',
  };

  const errorStyle = {
    color: '#ef4444',
    'font-size': '20px',
    'margin-top': '16px',
    'text-align': 'center' as const,
  };

  const queueNumberLargeStyle = {
    'font-size': '120px',
    'font-weight': '700',
    color: PRIMARY,
    'line-height': '1',
    'margin': '24px 0',
  };

  const confirmationBadgeStyle = {
    background: '#f0f9ff',
    border: `3px solid ${PRIMARY}`,
    'border-radius': '16px',
    padding: '24px 40px',
    'text-align': 'center' as const,
    'margin-top': '24px',
  };

  const serviceCardStyle = (selected: boolean) => ({
    width: '100%',
    padding: '20px 24px',
    'font-size': '22px',
    'font-weight': selected ? '600' : '400',
    border: selected ? `3px solid ${PRIMARY}` : '2px solid #d1d5db',
    'border-radius': '12px',
    background: selected ? '#eff6ff' : '#ffffff',
    color: selected ? PRIMARY : '#374151',
    cursor: 'pointer',
    'min-height': '72px',
    'text-align': 'left' as const,
    'margin-bottom': '12px',
    transition: 'all 0.2s ease',
  });

  const walkInInputStyle = {
    width: '100%',
    padding: '20px 24px',
    'font-size': '24px',
    border: '3px solid #d1d5db',
    'border-radius': '12px',
    'min-height': '72px',
    outline: 'none',
    'margin-bottom': '16px',
    'box-sizing': 'border-box' as const,
  };

  const appointmentCardStyle = {
    background: '#ffffff',
    border: `3px solid ${PRIMARY}`,
    'border-radius': '16px',
    padding: '32px',
    'text-align': 'center' as const,
    width: '100%',
    'max-width': '500px',
    'margin-bottom': '24px',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.08)',
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={fullScreenStyle} onClick={handleInteraction}>
      {/* Language Bar (always visible) */}
      <div style={langBarStyle}>
        <button style={langBtnStyle(lang() === 'en')} onClick={() => setLang('en')}>
          English
        </button>
        <button style={langBtnStyle(lang() === 'es')} onClick={() => setLang('es')}>
          Espanol
        </button>
      </div>

      {/* Back Button (not on welcome or confirmation) */}
      <Show when={screen() !== 'welcome' && screen() !== 'confirmation'}>
        <button style={backBtnStyle} onClick={resetToWelcome}>
          {t('back')}
        </button>
      </Show>

      {/* ============================================ */}
      {/* WELCOME SCREEN */}
      {/* ============================================ */}
      <Show when={screen() === 'welcome'}>
        <div style={screenContainerStyle}>
          <h1 style={welcomeTitleStyle}>
            {config().welcomeMessage[lang()]}
          </h1>

          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '24px' }}>
            <Show when={config().enableAppointmentLookup}>
              <button
                style={bigButtonStyle('primary')}
                onClick={() => {
                  setScreen('appointment_lookup');
                  resetInactivityTimer();
                }}
              >
                {t('iHaveAppointment')}
              </button>
            </Show>

            <Show when={config().enableWalkIn}>
              <button
                style={bigButtonStyle('secondary')}
                onClick={() => {
                  setScreen('walkin_form');
                  resetInactivityTimer();
                }}
              >
                {t('walkIn')}
              </button>
            </Show>
          </div>
        </div>
      </Show>

      {/* ============================================ */}
      {/* APPOINTMENT LOOKUP SCREEN */}
      {/* ============================================ */}
      <Show when={screen() === 'appointment_lookup'}>
        <div style={screenContainerStyle}>
          <h2 style={{ 'font-size': '32px', color: '#111827', 'margin-bottom': '32px', 'text-align': 'center' }}>
            {t('enterPhone')}
          </h2>

          <div style={{ width: '100%', 'max-width': '400px' }}>
            <div style={kioskInputStyle}>
              {formatPhoneDisplay(lookupPhone()) || '\u00A0'}
            </div>

            <div style={keypadStyle}>
              <For each={['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del']}>
                {(key) => (
                  <button
                    style={{
                      ...keypadBtnStyle,
                      ...(key === 'clear' || key === 'del'
                        ? { 'font-size': '18px', color: '#6b7280' }
                        : {}),
                    }}
                    onClick={() => handlePhoneKeypadPress(key)}
                  >
                    {key === 'del' ? (lang() === 'en' ? 'Del' : 'Borr') : key === 'clear' ? (lang() === 'en' ? 'Clear' : 'Limp') : key}
                  </button>
                )}
              </For>
            </div>

            <button
              style={kioskActionBtnStyle(lookupPhone().length < 10 || isLoading())}
              onClick={handleAppointmentLookup}
              disabled={lookupPhone().length < 10 || isLoading()}
            >
              {isLoading() ? t('loading') : t('lookUpAppointment')}
            </button>

            <Show when={errorMsg()}>
              <p style={errorStyle}>{errorMsg()}</p>
            </Show>
          </div>
        </div>
      </Show>

      {/* ============================================ */}
      {/* APPOINTMENT FOUND SCREEN */}
      {/* ============================================ */}
      <Show when={screen() === 'appointment_found' && appointmentInfo()}>
        <div style={screenContainerStyle}>
          <div style={appointmentCardStyle}>
            <p style={{ 'font-size': '20px', color: '#6b7280', 'margin': '0 0 8px 0' }}>
              {lang() === 'en' ? 'Appointment Found' : 'Cita Encontrada'}
            </p>
            <h2 style={{ 'font-size': '36px', color: '#111827', margin: '0 0 16px 0' }}>
              {appointmentInfo()!.clientName}
            </h2>
            <p style={{ 'font-size': '24px', color: '#374151', margin: '0 0 8px 0' }}>
              {appointmentInfo()!.scheduledTime}
            </p>
            <p style={{ 'font-size': '20px', color: '#6b7280', margin: '0' }}>
              {appointmentInfo()!.serviceType}
            </p>
          </div>

          <button
            style={kioskActionBtnStyle(isLoading())}
            onClick={handleAppointmentCheckIn}
            disabled={isLoading()}
          >
            {isLoading() ? t('loading') : t('checkIn')}
          </button>

          <Show when={errorMsg()}>
            <p style={errorStyle}>{errorMsg()}</p>
          </Show>
        </div>
      </Show>

      {/* ============================================ */}
      {/* WALK-IN FORM SCREEN */}
      {/* ============================================ */}
      <Show when={screen() === 'walkin_form'}>
        <div style={screenContainerStyle}>
          <h2 style={{ 'font-size': '32px', color: '#111827', 'margin-bottom': '32px', 'text-align': 'center' }}>
            {t('walkIn')}
          </h2>

          <div style={{ width: '100%', 'max-width': '500px' }}>
            <label style={{ display: 'block', 'font-size': '20px', 'font-weight': '500', color: '#374151', 'margin-bottom': '8px' }}>
              {t('yourName')} *
            </label>
            <input
              type="text"
              style={walkInInputStyle}
              value={walkInName()}
              onInput={(e) => setWalkInName(e.currentTarget.value)}
              placeholder={t('yourName')}
              autocomplete="name"
            />

            <label style={{ display: 'block', 'font-size': '20px', 'font-weight': '500', color: '#374151', 'margin-bottom': '8px' }}>
              {t('phone')} *
            </label>
            <input
              type="tel"
              style={walkInInputStyle}
              value={walkInPhone()}
              onInput={(e) => setWalkInPhone(e.currentTarget.value)}
              placeholder="(555) 555-5555"
              autocomplete="tel"
            />

            <label style={{ display: 'block', 'font-size': '20px', 'font-weight': '500', color: '#374151', 'margin-bottom': '8px', 'margin-top': '8px' }}>
              {t('serviceNeeded')}
            </label>
            <For each={config().services}>
              {(service: KioskService) => (
                <button
                  style={serviceCardStyle(selectedService() === service.id)}
                  onClick={() => setSelectedService(service.id)}
                >
                  <div>{service.name[lang()]}</div>
                  <Show when={service.description?.[lang()]}>
                    <div style={{ 'font-size': '16px', color: '#6b7280', 'margin-top': '4px' }}>
                      {service.description![lang()]}
                    </div>
                  </Show>
                </button>
              )}
            </For>

            <button
              style={kioskActionBtnStyle(!walkInName().trim() || !walkInPhone().trim() || isLoading())}
              onClick={handleWalkInSubmit}
              disabled={!walkInName().trim() || !walkInPhone().trim() || isLoading()}
            >
              {isLoading() ? t('loading') : t('checkIn')}
            </button>

            <Show when={errorMsg()}>
              <p style={errorStyle}>{errorMsg()}</p>
            </Show>
          </div>
        </div>
      </Show>

      {/* ============================================ */}
      {/* CONFIRMATION SCREEN */}
      {/* ============================================ */}
      <Show when={screen() === 'confirmation'}>
        <div style={screenContainerStyle}>
          <div
            style={{
              width: '100px',
              height: '100px',
              'border-radius': '50%',
              background: '#22c55e',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 style={{ 'font-size': '36px', color: '#111827', 'margin-top': '24px' }}>
            {t('checkedIn')}
          </h2>

          <p style={{ 'font-size': '24px', color: '#6b7280' }}>
            {t('queueNumber')}
          </p>
          <div style={queueNumberLargeStyle}>#{queueNumber()}</div>

          <div style={confirmationBadgeStyle}>
            <p style={{ 'font-size': '24px', color: '#374151', margin: '0' }}>
              {t('estimatedWait')}: <strong>{estimatedWait()} {t('minutes')}</strong>
            </p>
          </div>

          <p style={{ 'font-size': '28px', color: '#374151', 'margin-top': '32px', 'font-weight': '600' }}>
            {t('thankYou')}
          </p>
        </div>
      </Show>
    </div>
  );
};

export default KioskMode;
