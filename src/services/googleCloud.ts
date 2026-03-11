import { jwtDecode } from 'jwt-decode';

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  sub: string;
  iat: number;
  exp: number;
}

// Google Cloud Identity Platform configuration
export const googleCloudConfig = {
  clientId: '195275085181-8ccjpgp8v1g80qhnlk6v4lpgid7n81gr.apps.googleusercontent.com',
};

// Initialize Google Sign-In
export const initializeGoogleSignIn = (onSuccess: (credential: string) => void) => {
  // Load the Google Identity Services library
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  
  script.onload = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: googleCloudConfig.clientId,
        callback: (response: any) => {
          onSuccess(response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    }
  };
  
  document.head.appendChild(script);
};

// Render Google Sign-In button
export const renderGoogleButton = (elementId: string) => {
  if (window.google) {
    window.google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        theme: 'outline',
        size: 'large',
        width: 250,
        text: 'signin_with',
        shape: 'rectangular',
      }
    );
  }
};

// Decode JWT token to get user info
export const decodeGoogleToken = (credential: string): GoogleUser => {
  return jwtDecode<GoogleUser>(credential);
};

// Sign out from Google
export const googleSignOut = () => {
  if (window.google) {
    window.google.accounts.id.disableAutoSelect();
  }
};

// Type declarations for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
          disableAutoSelect: () => void;
          prompt: () => void;
        };
      };
    };
  }
}