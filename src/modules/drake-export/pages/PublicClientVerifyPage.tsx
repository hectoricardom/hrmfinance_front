/**
 * PublicClientVerifyPage
 * Public page for clients to verify their personal information without requiring login
 * Accessed via magic link with access token: /tax-verify/:id/:accessToken
 */

import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Button } from '../../ui';
import { getDocumentRequestByToken, updateDocumentRequestPublic, getTaxPortalByRequest } from '../services/taxPortalApi';
import type { TaxDocumentRequest, TaxPortal, TaxDependent, FilingStatus } from '../types/drakeTypes';
import { devLog } from '../../../services/utils';

// Filing status labels
const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married Filing Jointly',
  married_separate: 'Married Filing Separately',
  head_of_household: 'Head of Household',
  qualifying_widow: 'Qualifying Widow(er)'
};

// Relationship labels
const RELATIONSHIP_LABELS: Record<string, string> = {
  son: 'Son',
  daughter: 'Daughter',
  stepson: 'Stepson',
  stepdaughter: 'Stepdaughter',
  foster_child: 'Foster Child',
  brother: 'Brother',
  sister: 'Sister',
  half_brother: 'Half Brother',
  half_sister: 'Half Sister',
  stepbrother: 'Stepbrother',
  stepsister: 'Stepsister',
  parent: 'Parent',
  grandparent: 'Grandparent',
  grandchild: 'Grandchild',
  niece: 'Niece',
  nephew: 'Nephew',
  aunt: 'Aunt',
  uncle: 'Uncle',
  other: 'Other'
};

const PublicClientVerifyPage: Component = () => {
  const params = useParams<{ id: string; accessToken: string }>();

  // State
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [request, setRequest] = createSignal<TaxDocumentRequest | null>(null);
  const [client, setClient] = createSignal<TaxPortal | null>(null);
  const [isVerified, setIsVerified] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [corrections, setCorrections] = createSignal('');
  const [hasIssues, setHasIssues] = createSignal(false);
  const [showSuccessMessage, setShowSuccessMessage] = createSignal(false);

  // Load data on mount
  onMount(async () => {
    await loadData();
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { id, accessToken } = params;

      if (!id || !accessToken) {
        setError('Invalid verification link. Please check your link and try again.');
        return;
      }

      // Get document request
      const requestData = await getDocumentRequestByToken(id, accessToken);

      if (!requestData) {
        setError('Verification link not found or has expired.');
        return;
      }

      // Check if expired
      if (requestData.expiresAt < Date.now()) {
        setError('This verification link has expired. Please contact your tax preparer for a new link.');
        return;
      }

      setRequest(requestData);

      // Get client data
      const clientData = await getTaxPortalByRequest(id, accessToken);

      if (!clientData) {
        setError('Unable to load your information. Please try again or contact your tax preparer.');
        return;
      }

      setClient(clientData);

      // Check if already verified
      if ((requestData as any).clientVerified) {
        setIsVerified(true);
      }

    } catch (err) {
      devLog('Error loading verification data:', err);
      setError('An error occurred while loading your information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification submission
  const handleVerify = async () => {
    setIsSubmitting(true);
    try {
      const { id, accessToken } = params;
      const req = request();

      if (!req) return;

      await updateDocumentRequestPublic(id, accessToken, {
        clientVerified: true,
        clientVerifiedAt: Date.now(),
        clientVerificationNotes: hasIssues() ? corrections() : 'Information verified as correct',
        clientHasCorrections: hasIssues()
      });

      setIsVerified(true);
      setShowSuccessMessage(true);

    } catch (err) {
      devLog('Error submitting verification:', err);
      setError('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mask SSN for display (show last 4 digits)
  const maskSSN = (ssn?: string): string => {
    if (!ssn) return 'Not provided';
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `***-**-${cleaned.slice(-4)}`;
    }
    return '***-**-****';
  };

  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Not provided';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Styles
  const containerStyle = {
    'min-height': '100vh',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    padding: '2rem 1rem'
  };

  const cardStyle = {
    'max-width': '800px',
    margin: '0 auto',
    background: 'white',
    'border-radius': '16px',
    'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden'
  };

  const headerStyle = {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '2rem',
    'text-align': 'center'
  };

  const contentStyle = {
    padding: '2rem'
  };

  const sectionStyle = {
    'margin-bottom': '2rem',
    'padding-bottom': '1.5rem',
    'border-bottom': '1px solid #e5e7eb'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: '#1f2937',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const fieldGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };

  const fieldStyle = {
    'margin-bottom': '0.5rem'
  };

  const labelStyle = {
    'font-size': '0.75rem',
    'font-weight': '500',
    color: '#6b7280',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    'margin-bottom': '0.25rem'
  };

  const valueStyle = {
    'font-size': '1rem',
    color: '#1f2937',
    'font-weight': '500'
  };

  const dependentCardStyle = {
    background: '#f9fafb',
    'border-radius': '8px',
    padding: '1rem',
    'margin-bottom': '1rem',
    border: '1px solid #e5e7eb'
  };

  const successCardStyle = {
    background: '#d1fae5',
    'border-radius': '12px',
    padding: '2rem',
    'text-align': 'center',
    'margin-bottom': '1.5rem'
  };

  const warningBoxStyle = {
    background: '#fef3c7',
    'border-radius': '8px',
    padding: '1rem',
    'margin-bottom': '1.5rem',
    border: '1px solid #f59e0b'
  };

  const checkboxLabelStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    'font-size': '1rem',
    color: '#374151'
  };

  const textareaStyle = {
    width: '100%',
    'min-height': '100px',
    padding: '0.75rem',
    border: '2px solid #e5e7eb',
    'border-radius': '8px',
    'font-size': '1rem',
    'font-family': 'inherit',
    resize: 'vertical' as const,
    'margin-top': '0.5rem'
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'center',
    'margin-top': '2rem'
  };

  const primaryButtonStyle = {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '1rem 2rem',
    'border-radius': '8px',
    border: 'none',
    'font-size': '1rem',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  };

  const loadingStyle = {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '4rem',
    color: '#6b7280'
  };

  const errorStyle = {
    'text-align': 'center',
    padding: '3rem',
    color: '#dc2626'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={{ 'font-size': '1.75rem', 'font-weight': '700', margin: '0 0 0.5rem 0' }}>
            Verify Your Information
          </h1>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Please review and confirm your tax filing information
          </p>
        </div>

        <div style={contentStyle}>
          {/* Loading State */}
          <Show when={isLoading()}>
            <div style={loadingStyle}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>...</div>
              <p>Loading your information...</p>
            </div>
          </Show>

          {/* Error State */}
          <Show when={error()}>
            <div style={errorStyle}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>!</div>
              <h2 style={{ 'font-size': '1.25rem', 'margin-bottom': '0.5rem' }}>Unable to Load</h2>
              <p>{error()}</p>
            </div>
          </Show>

          {/* Success Message */}
          <Show when={showSuccessMessage() && isVerified()}>
            <div style={successCardStyle}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>OK</div>
              <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#059669', 'margin-bottom': '0.5rem' }}>
                Verification Complete!
              </h2>
              <p style={{ color: '#065f46', margin: 0 }}>
                {hasIssues()
                  ? 'Your corrections have been submitted. Your tax preparer will review and contact you.'
                  : 'Your information has been verified. Your tax preparer will proceed with your return.'}
              </p>
            </div>
          </Show>

          {/* Client Information */}
          <Show when={!isLoading() && !error() && client()}>
            {/* Tax Year Banner */}
            <div style={{
              background: '#eff6ff',
              'border-radius': '8px',
              padding: '1rem',
              'margin-bottom': '1.5rem',
              'text-align': 'center',
              border: '1px solid #bfdbfe'
            }}>
              <span style={{ 'font-size': '0.875rem', color: '#1e40af' }}>Tax Year</span>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#1e40af' }}>
                {client()?.taxYear || request()?.taxYear || new Date().getFullYear()}
              </div>
            </div>

            {/* Personal Information Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                <span>Personal Information</span>
              </h3>
              <div style={fieldGridStyle}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Full Name</div>
                  <div style={valueStyle}>
                    {[client()?.firstName, client()?.middleName, client()?.lastName, client()?.suffix]
                      .filter(Boolean).join(' ') || 'Not provided'}
                  </div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Social Security Number</div>
                  <div style={valueStyle}>{maskSSN(client()?.ssn)}</div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Date of Birth</div>
                  <div style={valueStyle}>{formatDate(client()?.dateOfBirth)}</div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Occupation</div>
                  <div style={valueStyle}>{client()?.occupation || 'Not provided'}</div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Filing Status</div>
                  <div style={valueStyle}>
                    {client()?.filingStatus ? FILING_STATUS_LABELS[client()!.filingStatus!] : 'Not selected'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                <span>Contact Information</span>
              </h3>
              <div style={fieldGridStyle}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Email</div>
                  <div style={valueStyle}>{client()?.email || 'Not provided'}</div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Phone</div>
                  <div style={valueStyle}>{client()?.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                <span>Address</span>
              </h3>
              <div style={fieldGridStyle}>
                <div style={{ ...fieldStyle, 'grid-column': 'span 2' }}>
                  <div style={labelStyle}>Street Address</div>
                  <div style={valueStyle}>{client()?.address || 'Not provided'}</div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>City</div>
                  <div style={valueStyle}>{client()?.city || 'Not provided'}</div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>State</div>
                  <div style={valueStyle}>{client()?.state || 'Not provided'}</div>
                </div>
                <div style={fieldStyle}>
                  <div style={labelStyle}>ZIP Code</div>
                  <div style={valueStyle}>{client()?.zipCode || 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Spouse Information Section - Only if married */}
            <Show when={client()?.spouse && (client()?.filingStatus === 'married_joint' || client()?.filingStatus === 'married_separate')}>
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  <span>Spouse Information</span>
                </h3>
                <div style={fieldGridStyle}>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Full Name</div>
                    <div style={valueStyle}>
                      {[client()?.spouse?.firstName, client()?.spouse?.middleName, client()?.spouse?.lastName, client()?.spouse?.suffix]
                        .filter(Boolean).join(' ') || 'Not provided'}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Social Security Number</div>
                    <div style={valueStyle}>{maskSSN(client()?.spouse?.ssn)}</div>
                  </div>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Date of Birth</div>
                    <div style={valueStyle}>{formatDate(client()?.spouse?.dateOfBirth)}</div>
                  </div>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Occupation</div>
                    <div style={valueStyle}>{client()?.spouse?.occupation || 'Not provided'}</div>
                  </div>
                  <Show when={client()?.spouse?.email}>
                    <div style={fieldStyle}>
                      <div style={labelStyle}>Email</div>
                      <div style={valueStyle}>{client()?.spouse?.email}</div>
                    </div>
                  </Show>
                  <Show when={client()?.spouse?.phone}>
                    <div style={fieldStyle}>
                      <div style={labelStyle}>Phone</div>
                      <div style={valueStyle}>{client()?.spouse?.phone}</div>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Dependents Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                <span>Dependents</span>
              </h3>
              <Show when={client()?.hasNoDependents}>
                <p style={{ color: '#6b7280', 'font-style': 'italic' }}>
                  No dependents reported
                </p>
              </Show>
              <Show when={!client()?.hasNoDependents && (!client()?.dependents || client()!.dependents!.length === 0)}>
                <p style={{ color: '#6b7280', 'font-style': 'italic' }}>
                  No dependents listed
                </p>
              </Show>
              <Show when={client()?.dependents && client()!.dependents!.length > 0}>
                <For each={client()?.dependents}>
                  {(dependent, index) => (
                    <div style={dependentCardStyle}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#374151' }}>
                        Dependent {index() + 1}
                      </div>
                      <div style={fieldGridStyle}>
                        <div style={fieldStyle}>
                          <div style={labelStyle}>Name</div>
                          <div style={valueStyle}>
                            {[dependent.firstName, dependent.middleName, dependent.lastName]
                              .filter(Boolean).join(' ')}
                          </div>
                        </div>
                        <div style={fieldStyle}>
                          <div style={labelStyle}>Relationship</div>
                          <div style={valueStyle}>
                            {RELATIONSHIP_LABELS[dependent.relationship] || dependent.relationship}
                          </div>
                        </div>
                        <div style={fieldStyle}>
                          <div style={labelStyle}>SSN</div>
                          <div style={valueStyle}>{maskSSN(dependent.ssn)}</div>
                        </div>
                        <div style={fieldStyle}>
                          <div style={labelStyle}>Date of Birth</div>
                          <div style={valueStyle}>{formatDate(dependent.dateOfBirth)}</div>
                        </div>
                        <Show when={dependent.monthsLivedWithYou !== undefined}>
                          <div style={fieldStyle}>
                            <div style={labelStyle}>Months Lived with You</div>
                            <div style={valueStyle}>{dependent.monthsLivedWithYou}</div>
                          </div>
                        </Show>
                      </div>
                      <Show when={dependent.isStudent || dependent.isDisabled}>
                        <div style={{ 'margin-top': '0.75rem', 'font-size': '0.875rem', color: '#6b7280' }}>
                          <Show when={dependent.isStudent}>
                            <span style={{ 'margin-right': '1rem' }}>Full-time Student</span>
                          </Show>
                          <Show when={dependent.isDisabled}>
                            <span>Permanently Disabled</span>
                          </Show>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </Show>
            </div>

            {/* Bank Information Section - Only show if provided */}
            <Show when={client()?.bankInfo?.routingNumber || client()?.bankInfo?.accountNumber}>
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  <span>Bank Information (for Direct Deposit)</span>
                </h3>
                <div style={fieldGridStyle}>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Account Type</div>
                    <div style={valueStyle}>
                      {client()?.bankInfo?.accountType === 'checking' ? 'Checking' :
                       client()?.bankInfo?.accountType === 'savings' ? 'Savings' : 'Not specified'}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Routing Number</div>
                    <div style={valueStyle}>
                      {client()?.bankInfo?.routingNumber ? `***${client()?.bankInfo?.routingNumber.slice(-4)}` : 'Not provided'}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <div style={labelStyle}>Account Number</div>
                    <div style={valueStyle}>
                      {client()?.bankInfo?.accountNumber ? `***${client()?.bankInfo?.accountNumber.slice(-4)}` : 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* Verification Form - Only show if not already verified */}
            <Show when={!isVerified()}>
              <div style={{ ...sectionStyle, 'border-bottom': 'none' }}>
                <h3 style={sectionTitleStyle}>
                  <span>Confirm Your Information</span>
                </h3>

                <div style={warningBoxStyle}>
                  <p style={{ margin: 0, 'font-size': '0.875rem', color: '#92400e' }}>
                    <strong>Important:</strong> Please review all information above carefully.
                    Incorrect information on your tax return could cause delays or issues with the IRS.
                  </p>
                </div>

                {/* Issues checkbox */}
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={hasIssues()}
                    onChange={(e) => setHasIssues(e.currentTarget.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span>I found errors or need to make corrections</span>
                </label>

                {/* Corrections textarea - only show if has issues */}
                <Show when={hasIssues()}>
                  <div style={{ 'margin-top': '1rem' }}>
                    <label style={{ 'font-weight': '500', color: '#374151' }}>
                      Please describe the corrections needed:
                    </label>
                    <textarea
                      style={textareaStyle}
                      value={corrections()}
                      onInput={(e) => setCorrections(e.currentTarget.value)}
                      placeholder="Describe what information needs to be corrected..."
                    />
                  </div>
                </Show>

                {/* Submit buttons */}
                <div style={buttonContainerStyle}>
                  <button
                    style={{
                      ...primaryButtonStyle,
                      opacity: isSubmitting() || (hasIssues() && !corrections().trim()) ? 0.6 : 1,
                      cursor: isSubmitting() || (hasIssues() && !corrections().trim()) ? 'not-allowed' : 'pointer'
                    }}
                    onClick={handleVerify}
                    disabled={isSubmitting() || (hasIssues() && !corrections().trim())}
                  >
                    {isSubmitting() ? 'Submitting...' : hasIssues() ? 'Submit Corrections' : 'Confirm Information is Correct'}
                  </button>
                </div>
              </div>
            </Show>

            {/* Already Verified Message */}
            <Show when={isVerified() && !showSuccessMessage()}>
              <div style={successCardStyle}>
                <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>OK</div>
                <p style={{ color: '#065f46', margin: 0 }}>
                  You have already verified your information. Thank you!
                </p>
              </div>
            </Show>
          </Show>
        </div>

        {/* Footer */}
        <div style={{
          background: '#f9fafb',
          padding: '1rem 2rem',
          'text-align': 'center',
          'font-size': '0.75rem',
          color: '#6b7280',
          'border-top': '1px solid #e5e7eb'
        }}>
          <p style={{ margin: 0 }}>
            Your information is transmitted securely and encrypted.
          </p>
          <Show when={request()?.expiresAt}>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              This link expires on {new Date(request()!.expiresAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default PublicClientVerifyPage;
