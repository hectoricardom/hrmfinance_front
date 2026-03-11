/**
 * PublicPreVisitPage
 * Public route wrapper for the PreVisitForm component.
 * No authentication required.
 * Validates portal token from URL params before rendering the form.
 * Clean, minimal layout without navigation.
 */

import { Component, createSignal, onMount, Show, Switch, Match } from 'solid-js';
import { useParams } from '@solidjs/router';
import { devLog, fetchGraphQLSS } from '../../../services/utils';
import PreVisitForm from '../components/PreVisitForm';
import type { SupportedLanguage } from '../types/workflowTypes';

const PublicPreVisitPage: Component = () => {
  const params = useParams<{ portalId: string; token: string }>();

  // ============================================
  // State
  // ============================================

  const [pageState, setPageState] = createSignal<'loading' | 'valid' | 'invalid' | 'error'>('loading');
  const [businessName, setBusinessName] = createSignal('Stephanie Solutions Tax Prep');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [lang, setLang] = createSignal<SupportedLanguage>('en');

  // ============================================
  // Token Validation
  // ============================================

  const validateToken = async () => {
    const portalId = params.portalId;
    const token = params.token;

    if (!portalId || !token) {
      setPageState('invalid');
      setErrorMessage(
        lang() === 'en'
          ? 'Invalid link. Please scan the QR code again or contact the office.'
          : 'Enlace invalido. Escanee el codigo QR nuevamente o contacte la oficina.'
      );
      return;
    }

    try {
      // TODO: Replace with actual GraphQL query when backend is ready
      const result = await fetchGraphQLSS({
        query: `query ValidatePreVisitToken($portalId: String!, $token: String!) {
          validatePreVisitToken(portalId: $portalId, token: $token) {
            valid
            businessName
            expired
          }
        }`,
        params: { portalId, token },
      });

      if (result?.data?.validatePreVisitToken?.valid) {
        setBusinessName(result.data.validatePreVisitToken.businessName || businessName());
        setPageState('valid');
      } else if (result?.data?.validatePreVisitToken?.expired) {
        setPageState('invalid');
        setErrorMessage(
          lang() === 'en'
            ? 'This link has expired. Please request a new one from the office.'
            : 'Este enlace ha expirado. Solicite uno nuevo en la oficina.'
        );
      } else {
        // If API is not available yet, allow access anyway for development
        devLog('PublicPreVisitPage: token validation returned no data, allowing access');
        setPageState('valid');
      }
    } catch (error: any) {
      devLog('PublicPreVisitPage: token validation error', error);
      // Allow access during development if API is not ready
      setPageState('valid');
    }
  };

  onMount(() => {
    validateToken();
  });

  // ============================================
  // Styles
  // ============================================

  const pageStyle = {
    'min-height': '100vh',
    background: '#f8fafc',
    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const brandHeaderStyle = {
    background: '#ffffff',
    'border-bottom': '3px solid #1a73e8',
    padding: '16px 20px',
    'text-align': 'center' as const,
  };

  const brandNameStyle = {
    'font-size': '20px',
    'font-weight': '700',
    color: '#1a73e8',
    margin: '0',
  };

  const loadingContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '60vh',
    padding: '24px',
  };

  const errorContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '60vh',
    padding: '24px',
    'text-align': 'center' as const,
    'max-width': '400px',
    margin: '0 auto',
  };

  const errorIconStyle = {
    width: '80px',
    height: '80px',
    'border-radius': '50%',
    background: '#fef2f2',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'margin-bottom': '24px',
  };

  return (
    <div style={pageStyle}>
      {/* Branded Header */}
      <div style={brandHeaderStyle}>
        <h1 style={brandNameStyle}>{businessName()}</h1>
      </div>

      <Switch>
        {/* ============================================ */}
        {/* LOADING STATE */}
        {/* ============================================ */}
        <Match when={pageState() === 'loading'}>
          <div style={loadingContainerStyle}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                'border-top-color': '#1a73e8',
                'border-radius': '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ 'font-size': '16px', color: '#6b7280', 'margin-top': '16px' }}>
              {lang() === 'en' ? 'Verifying link...' : 'Verificando enlace...'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </Match>

        {/* ============================================ */}
        {/* VALID - SHOW FORM */}
        {/* ============================================ */}
        <Match when={pageState() === 'valid'}>
          <PreVisitForm
            portalId={params.portalId}
            token={params.token}
          />
        </Match>

        {/* ============================================ */}
        {/* INVALID TOKEN */}
        {/* ============================================ */}
        <Match when={pageState() === 'invalid'}>
          <div style={errorContainerStyle}>
            <div style={errorIconStyle}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h2 style={{ 'font-size': '22px', color: '#111827', 'margin-bottom': '12px' }}>
              {lang() === 'en' ? 'Link Not Valid' : 'Enlace No Valido'}
            </h2>

            <p style={{ 'font-size': '16px', color: '#6b7280', 'line-height': '1.5' }}>
              {errorMessage()}
            </p>

            {/* Language toggle */}
            <div style={{ display: 'flex', gap: '8px', 'margin-top': '24px' }}>
              <button
                style={{
                  padding: '10px 20px',
                  'font-size': '14px',
                  'font-weight': '500',
                  border: `2px solid ${lang() === 'en' ? '#1a73e8' : '#d1d5db'}`,
                  'border-radius': '8px',
                  background: lang() === 'en' ? '#eff6ff' : '#ffffff',
                  color: lang() === 'en' ? '#1a73e8' : '#6b7280',
                  cursor: 'pointer',
                }}
                onClick={() => setLang('en')}
              >
                English
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  'font-size': '14px',
                  'font-weight': '500',
                  border: `2px solid ${lang() === 'es' ? '#1a73e8' : '#d1d5db'}`,
                  'border-radius': '8px',
                  background: lang() === 'es' ? '#eff6ff' : '#ffffff',
                  color: lang() === 'es' ? '#1a73e8' : '#6b7280',
                  cursor: 'pointer',
                }}
                onClick={() => setLang('es')}
              >
                Espanol
              </button>
            </div>
          </div>
        </Match>

        {/* ============================================ */}
        {/* ERROR STATE */}
        {/* ============================================ */}
        <Match when={pageState() === 'error'}>
          <div style={errorContainerStyle}>
            <div style={errorIconStyle}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 style={{ 'font-size': '22px', color: '#111827', 'margin-bottom': '12px' }}>
              {lang() === 'en' ? 'Something Went Wrong' : 'Algo Salio Mal'}
            </h2>

            <p style={{ 'font-size': '16px', color: '#6b7280', 'line-height': '1.5' }}>
              {lang() === 'en'
                ? 'We could not load the form. Please try again or contact the office.'
                : 'No pudimos cargar el formulario. Intente nuevamente o contacte la oficina.'}
            </p>

            <button
              style={{
                'margin-top': '24px',
                padding: '12px 24px',
                'font-size': '16px',
                'font-weight': '600',
                border: 'none',
                'border-radius': '8px',
                background: '#1a73e8',
                color: '#ffffff',
                cursor: 'pointer',
                'min-height': '48px',
              }}
              onClick={() => window.location.reload()}
            >
              {lang() === 'en' ? 'Try Again' : 'Intentar de Nuevo'}
            </button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default PublicPreVisitPage;
