/**
 * SignatureValidationPage
 * Public page to view and validate signature information for fraud prevention
 * Accessible via: /signature-validation/:requestId/:accessToken
 */

import { Component, createSignal, createEffect, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import SignatureValidationView from '../components/SignatureValidationView';
import { getSignatureRequest } from '../services/taxPortalApi';
import type { TaxDocumentRequest } from '../types/drakeTypes';
import { devLog } from '../../../services/utils';

const SignatureValidationPage: Component = () => {
  const params = useParams<{ id: string; accessToken: string; type?: string }>();

  const [request, setRequest] = createSignal<TaxDocumentRequest | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Determine signature type from URL or auto-detect
  const signatureType = (): 'engagement' | 'pin' => {
    if (params.type === 'pin' || params.type === 'e-filing') return 'pin';
    if (params.type === 'engagement' || params.type === 'letter') return 'engagement';

    // Auto-detect based on available data
    const req = request();
    if (req?.clientSigningPin?.pin) return 'pin';
    if (req?.clientSignature?.signedAt) return 'engagement';
    return 'engagement';
  };

  // Load request data on mount
  createEffect(async () => {
    const accessToken = params.accessToken;
    const id = params.id;

    if (!accessToken || !id) {
      setError('Invalid access link. Please check the URL.');
      setLoading(false);
      return;
    }

    try {
      const result = await getSignatureRequest(id, accessToken, true);
      if (result) {
        setRequest(result);

        // Check if signature data exists
        const hasEngagementSignature = !!result.clientSignature?.signedAt;
        const hasPinSignature = !!result.clientSigningPin?.pin;

        if (!hasEngagementSignature && !hasPinSignature) {
          setError('No signature data found for this document request.');
        }
      } else {
        setError('Document request not found or access denied.');
      }
    } catch (err) {
      devLog('Error loading document request:', err);
      setError('Error loading signature data. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // Styles
  const pageStyle = {
    'min-height': '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '2rem'
  };

  const containerStyle = {
    'max-width': '900px',
    margin: '0 auto'
  };

  const loadingStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '50vh',
    color: '#64748b'
  };

  const errorStyle = {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    'border-radius': '12px',
    padding: '2rem',
    'text-align': 'center' as const,
    color: '#dc2626'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: '#1e3a5f',
    'margin-bottom': '0.5rem'
  };

  const subtitleStyle = {
    color: '#64748b',
    'font-size': '0.875rem'
  };

  const tabsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'justify-content': 'center',
    'margin-bottom': '1.5rem'
  };

  const tabStyle = (active: boolean) => ({
    padding: '0.75rem 1.5rem',
    'border-radius': '8px',
    border: 'none',
    background: active ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : '#f1f5f9',
    color: active ? 'white' : '#64748b',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  const [activeTab, setActiveTab] = createSignal<'engagement' | 'pin'>(signatureType());

  // Update active tab when request loads
  createEffect(() => {
    const req = request();
    if (req) {
      setActiveTab(signatureType());
    }
  });

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Loading State */}
        <Show when={loading()}>
          <div style={loadingStyle}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              'border-top-color': '#8b5cf6',
              'border-radius': '50%',
              animation: 'spin 1s linear infinite',
              'margin-bottom': '1rem'
            }} />
            <p>Loading signature validation data...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </Show>

        {/* Error State */}
        <Show when={!loading() && error()}>
          <div style={errorStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '48px', height: '48px', 'margin-bottom': '1rem' }}>
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              Validation Error
            </h2>
            <p>{error()}</p>
          </div>
        </Show>

        {/* Success State */}
        <Show when={!loading() && !error() && request()}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '28px', height: '28px', 'vertical-align': 'middle', 'margin-right': '0.5rem', color: '#8b5cf6' }}>
                <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Signature Validation
            </h1>
            <p style={subtitleStyle}>
              Verify the authenticity of the electronic signature
            </p>
          </div>

          {/* Tab Selector (if both signatures exist) */}
          <Show when={request()?.clientSignature?.signedAt && request()?.clientSigningPin?.pin}>
            <div style={tabsStyle}>
              <button
                style={tabStyle(activeTab() === 'engagement')}
                onClick={() => setActiveTab('engagement')}
              >
                Engagement Letter
              </button>
              <button
                style={tabStyle(activeTab() === 'pin')}
                onClick={() => setActiveTab('pin')}
              >
                E-Filing PIN (Form 8879)
              </button>
            </div>
          </Show>

          {/* Validation View */}
          <SignatureValidationView
            request={request()!}
            type={activeTab()}
          />

          {/* Footer */}
          <div style={{
            'margin-top': '2rem',
            'text-align': 'center',
            color: '#94a3b8',
            'font-size': '0.75rem'
          }}>
            <p>This validation page provides an audit trail for electronic signatures.</p>
            <p style={{ 'margin-top': '0.25rem' }}>
              Request ID: {request()?.id} | Generated: {new Date().toLocaleString()}
            </p>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default SignatureValidationPage;
