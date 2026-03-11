/**
 * Signature Validation View Component
 * Displays signature validation information for fraud prevention
 * Used for reviewing engagement letter and e-filing PIN signatures
 */

import { Component, Show } from 'solid-js';
import type { TaxDocumentRequest, SignatureMetadata } from '../types/drakeTypes';

interface SignatureValidationViewProps {
  request: TaxDocumentRequest;
  type: 'engagement' | 'pin';
}

const SignatureValidationView: Component<SignatureValidationViewProps> = (props) => {
  // Get the signature data based on type
  const getSignatureData = () => {
    if (props.type === 'engagement') {
      return props.request.clientSignature;
    }
    return props.request.clientSigningPin;
  };

  // Get signer name
  const getSignerName = () => {
    const data = getSignatureData();
    if (!data) return null;
    if (props.type === 'engagement') {
      return (data as typeof props.request.clientSignature)?.name;
    }
    return (data as typeof props.request.clientSigningPin)?.signerName;
  };

  // Get signed timestamp
  const getSignedTimestamp = () => {
    const data = getSignatureData();
    if (!data) return null;
    if (props.type === 'engagement') {
      return (data as typeof props.request.clientSignature)?.signedAt;
    }
    return (data as typeof props.request.clientSigningPin)?.setAt;
  };

  // Get metadata
  const getMetadata = (): SignatureMetadata | undefined => {
    return getSignatureData()?.metadata;
  };

  // Get signature image
  const getSignatureImage = () => {
    return getSignatureData()?.signatureImage;
  };

  // Format timestamp nicely
  const formatTimestamp = (timestamp: number | undefined | null) => {
    if (!timestamp) return 'Not captured';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Format duration (ms to seconds)
  const formatDuration = (ms: number | undefined) => {
    if (!ms) return 'Not captured';
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds} seconds`;
  };

  // Format timezone offset
  const formatTimezoneOffset = (offset: number | undefined) => {
    if (offset === undefined) return 'Not captured';
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset <= 0 ? '+' : '-';
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem',
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': '12px',
    border: '1px solid var(--border-color)'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'padding-bottom': '1rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0'
  };

  const subtitleStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
    margin: '0'
  };

  const sectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem',
    padding: '1.25rem',
    background: 'var(--surface-alt)',
    'border-radius': '10px',
    border: '1px solid var(--border-color)'
  };

  const sectionHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem'
  };

  const fieldRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    padding: '0.625rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const fieldLabelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'min-width': '140px'
  };

  const fieldValueStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-primary)',
    'text-align': 'right' as const,
    'word-break': 'break-word' as const,
    'max-width': '60%'
  };

  const verifiedValueStyle = {
    ...fieldValueStyle,
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    color: '#22c55e'
  };

  const notCapturedStyle = {
    ...fieldValueStyle,
    color: 'var(--text-secondary)',
    'font-style': 'italic' as const
  };

  const signatureImageContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: 'white',
    'border-radius': '8px',
    border: '2px solid var(--border-color)'
  };

  const signatureImageStyle = {
    'max-width': '100%',
    'max-height': '200px',
    'object-fit': 'contain' as const,
    'border-radius': '4px'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  };

  // Checkmark icon component
  const CheckIcon = () => (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', color: '#22c55e', 'flex-shrink': '0' }}>
      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>
  );

  // Render a field with optional verification checkmark
  const renderField = (label: string, value: string | number | undefined | null, showCheck: boolean = true) => {
    const hasValue = value !== undefined && value !== null && value !== '';
    return (
      <div style={fieldRowStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <Show when={hasValue} fallback={<span style={notCapturedStyle}>Not captured</span>}>
          <span style={showCheck ? verifiedValueStyle : fieldValueStyle}>
            <Show when={showCheck}><CheckIcon /></Show>
            {value}
          </span>
        </Show>
      </div>
    );
  };

  const metadata = getMetadata();
  const signatureImage = getSignatureImage();
  const signerName = getSignerName();
  const signedAt = getSignedTimestamp();

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '28px', height: '28px', color: '#22c55e' }}>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <h2 style={titleStyle}>
            {props.type === 'engagement' ? 'Engagement Letter Signature' : 'E-Filing PIN Signature'}
          </h2>
          <p style={subtitleStyle}>Fraud prevention audit trail for {props.request.clientName}</p>
        </div>
      </div>

      {/* Signature Details Section */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#3b82f6' }}>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Signature Details
        </div>

        <Show when={signatureImage}>
          <div style={signatureImageContainerStyle}>
            <img
              src={signatureImage}
              alt="Client Signature"
              style={signatureImageStyle}
            />
            <span style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
              Captured digital signature
            </span>
          </div>
        </Show>

        {renderField('Signer Name', signerName)}
        {renderField('Date/Time Signed', formatTimestamp(signedAt))}
        <Show when={props.type === 'pin'}>
          {renderField('PIN Set', props.request.clientSigningPin?.pin ? 'Yes (hidden)' : undefined)}
          {renderField('PIN Confirmed', props.request.clientSigningPin?.confirmedAt ? formatTimestamp(props.request.clientSigningPin.confirmedAt) : undefined)}
        </Show>
      </div>

      <div style={gridStyle}>
        {/* Browser Information Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#8b5cf6' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Browser Information
          </div>

          {renderField('Browser', metadata?.browserName && metadata?.browserVersion
            ? `${metadata.browserName} ${metadata.browserVersion}`
            : metadata?.browserName || undefined)}
          {renderField('User Agent', metadata?.userAgent, false)}
          {renderField('Platform/OS', metadata?.platform)}
          {renderField('Language', metadata?.language)}
        </div>

        {/* Device Information Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#f59e0b' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Device Information
          </div>

          {renderField('Screen Resolution', metadata?.screenWidth && metadata?.screenHeight
            ? `${metadata.screenWidth} x ${metadata.screenHeight}`
            : undefined)}
          {renderField('Device Pixel Ratio', metadata?.devicePixelRatio?.toString())}
          {renderField('Touch Enabled', metadata?.touchEnabled !== undefined
            ? (metadata.touchEnabled ? 'Yes' : 'No')
            : undefined)}
        </div>

        {/* Location & Network Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#ef4444' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Location &amp; Network
          </div>

          {renderField('IP Address', metadata?.ipAddress)}
          {renderField('GPS Latitude', metadata?.gpsLatitude !== undefined ? metadata.gpsLatitude.toFixed(6) : undefined)}
          {renderField('GPS Longitude', metadata?.gpsLongitude !== undefined ? metadata.gpsLongitude.toFixed(6) : undefined)}
          {renderField('GPS Accuracy', metadata?.gpsAccuracy !== undefined ? `\u00B1${Math.round(metadata.gpsAccuracy)} meters` : undefined)}
        </div>

        {/* Session Information Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#22c55e' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Session Information
          </div>

          {renderField('Page URL', metadata?.pageUrl, false)}
          {renderField('Referrer', metadata?.referrer || undefined, false)}
          {renderField('Timezone', metadata?.timezone)}
          {renderField('Client Timestamp', formatTimestamp(metadata?.clientTimestamp))}
          {renderField('Timezone Offset', formatTimezoneOffset(metadata?.timezoneOffset))}
        </div>

        {/* Signature Analytics Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#ec4899' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Signature Analytics
          </div>

          {renderField('Canvas Dimensions', metadata?.canvasWidth && metadata?.canvasHeight
            ? `${metadata.canvasWidth} x ${metadata.canvasHeight} px`
            : undefined)}
          {renderField('Number of Strokes', metadata?.strokeCount?.toString())}
          {renderField('Signature Duration', formatDuration(metadata?.signatureDuration))}
        </div>
      </div>

      {/* Print-friendly footer */}
      <div style={{
        'margin-top': '1rem',
        'padding-top': '1rem',
        'border-top': '1px solid var(--border-color)',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'font-size': '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        <span>Generated for fraud prevention verification</span>
        <span>Request ID: {props.request.id}</span>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SignatureValidationView;
