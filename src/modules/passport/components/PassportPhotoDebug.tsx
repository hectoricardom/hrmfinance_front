import { Component } from 'solid-js';
import { A } from '@solidjs/router';
import { authStore } from '../../../stores/authStore';

const PassportPhotoDebug: Component = () => {
  const user = authStore.state.user;
  const profile = authStore.state.profile;

  return (
    <div style={{ padding: '2rem', 'max-width': '600px', margin: '0 auto' }}>
      <h2>🔍 Passport Photo Debug Info</h2>
      
      <div style={{ 
        padding: '1rem', 
        background: '#f0f0f0', 
        'border-radius': '8px', 
        'margin-bottom': '1rem' 
      }}>
        <h3>User Info:</h3>
        <p><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
        <p><strong>Is Admin:</strong> {profile?.isAdmin ? 'Yes' : 'No'}</p>
        <p><strong>Has PassportAccess:</strong> {profile?.PassportAccess ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ 
        padding: '1rem', 
        background: '#e8f5e8', 
        'border-radius': '8px', 
        'margin-bottom': '1rem' 
      }}>
        <h3>Navigation Path:</h3>
        <ol>
          <li>Look for <strong>"Operations"</strong> in the main menu</li>
          <li>Click to expand the submenu</li>
          <li>Find <strong>"Passport Photo"</strong> with camera icon 📷</li>
        </ol>
      </div>

      <div style={{ 
        padding: '1rem', 
        background: '#fff3cd', 
        'border-radius': '8px', 
        'margin-bottom': '1rem' 
      }}>
        <h3>Direct Links:</h3>
        <ul>
          <li><A href="/passport-photo">Go to Passport Photo Page</A></li>
          <li><A href="/cuban-passport">Cuban Passport Form</A></li>
          <li><A href="/pdf-signature">PDF Signature</A></li>
          <li><A href="/signature-requests">Signature Requests</A></li>
        </ul>
      </div>

      <div style={{ 
        padding: '1rem', 
        background: '#d1ecf1', 
        'border-radius': '8px' 
      }}>
        <h3>Current URL:</h3>
        <p>{window.location.href}</p>
        <p><strong>Hash:</strong> {window.location.hash}</p>
      </div>
    </div>
  );
};

export default PassportPhotoDebug;