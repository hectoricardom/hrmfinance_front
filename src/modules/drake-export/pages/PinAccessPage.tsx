/**
 * PinAccessPage
 * Public access page for entering a 6-digit PIN to access tax document upload
 * No login required - validates PIN and redirects to upload page on success
 */

import { Component, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card, Button, FormInput } from '../../ui';
import { getDocumentRequestByPin } from '../services/taxPortalApi';
import { devLog } from '../../../services/utils';

const PinAccessPage: Component = () => {
  const navigate = useNavigate();

  const [pin, setPin] = createSignal('');
  const [error, setError] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

  // Page styles
  const pageContainerStyle = {
    width: '100%',
    'min-height': '100vh',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%)',
    padding: '1rem',
  };

  const cardContainerStyle = {
    width: '100%',
    'max-width': '400px',
  };

  const headerStyle = {
    'text-align': 'center',
    'margin-bottom': '2rem',
  };

  const titleStyle = {
    'font-size': '1.75rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0',
  };

  const subtitleStyle = {
    'font-size': '0.95rem',
    color: 'var(--text-muted)',
    margin: '0',
  };

  const formStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1.5rem',
  };

  const pinInputContainerStyle = {
    'text-align': 'center',
  };

  const pinInputStyle = {
    width: '100%',
    'font-size': '2rem',
    'text-align': 'center',
    'letter-spacing': '0.5rem',
    padding: '1rem',
    'font-weight': '600',
  };

  const errorContainerStyle = {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    'border-radius': 'var(--border-radius-sm)',
    padding: '0.75rem 1rem',
    'text-align': 'center',
  };

  const errorTextStyle = {
    color: '#dc2626',
    'font-size': '0.875rem',
    margin: '0',
  };

  const buttonContainerStyle = {
    'margin-top': '0.5rem',
  };

  const footerStyle = {
    'text-align': 'center',
    'margin-top': '1.5rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)',
  };

  const footerTextStyle = {
    'font-size': '0.8rem',
    color: 'var(--text-muted)',
  };

  // Handle PIN input - only allow digits and max 6 characters
  const handlePinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setPin(digitsOnly);
    // Clear error when user starts typing
    if (error()) {
      setError('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e?: Event) => {
    e?.preventDefault();

    const currentPin = pin();

    // Validate PIN format
    if (currentPin.length !== 6) {
      setError('Please enter a complete 6-digit PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const documentRequest = await getDocumentRequestByPin(currentPin);

      if (!documentRequest) {
        setError('Invalid PIN. Please check and try again.');
        setIsLoading(false);
        return;
      }

      // Check if request is expired
      if (documentRequest.status === 'expired' || documentRequest.expiresAt < Date.now()) {
        setError('This PIN has expired. Please contact your tax preparer for a new one.');
        setIsLoading(false);
        return;
      }

      // Check if request was cancelled
      if (documentRequest.status === 'cancelled') {
        setError('This document request has been cancelled.');
        setIsLoading(false);
        return;
      }

      // Success - redirect to upload page with the access token
      navigate(`/tax-upload/${documentRequest.accessToken}`);

    } catch (err) {
      devLog('Error validating PIN:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && pin().length === 6) {
      handleSubmit();
    }
  };

  return (
    <div style={pageContainerStyle}>
      <div style={cardContainerStyle}>
        <Card>
          <div style={headerStyle}>
            <h1 style={titleStyle}>Document Upload Portal</h1>
            <p style={subtitleStyle}>
              Enter the 6-digit PIN provided by your tax preparer
            </p>
          </div>

          <form style={formStyle} onSubmit={handleSubmit}>
            <div style={pinInputContainerStyle}>
              <FormInput
                label=""
                type="text"
                value={pin()}
                onChange={handlePinChange}
                placeholder="000000"
                disabled={isLoading()}
                style={pinInputStyle}
              />
            </div>

            {error() && (
              <div style={errorContainerStyle}>
                <p style={errorTextStyle}>{error()}</p>
              </div>
            )}

            <div style={buttonContainerStyle}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading() || pin().length !== 6}
                onClick={handleSubmit}
                style={{ width: '100%' }}
              >
                {isLoading() ? 'Validating...' : 'Access Portal'}
              </Button>
            </div>
          </form>

          <div style={footerStyle}>
            <p style={footerTextStyle}>
              Need help? Contact your tax preparer for assistance.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PinAccessPage;
