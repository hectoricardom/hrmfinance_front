/**
 * Magic Link Authentication Service
 *
 * Provides email-based passwordless authentication as an alternative to Firebase/Google Auth
 *
 * Flow:
 * 1. User enters email
 * 2. System generates secure token and sends magic link email
 * 3. User clicks link which includes token
 * 4. Token is validated and user is authenticated
 */

import { authStore, validateTkn, validateToken } from "../stores/authStore";
import { devLog } from "./utils";

interface MagicLinkToken {
  email: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

interface MagicLinkResponse {
  success: boolean;
  message: string;
  token?: string;
}

interface MagicLinkVerifyResponse {
  success: boolean;
  message: string;
  user?: {
    uid: string;
    email: string;
    displayName: string | null;
    emailVerified: boolean;
  };
  token?: string; // Session token from backend
  signature?: {
    token: string;
  };
}

export class MagicLinkService {
  private static readonly API_BASE_URL = 'https://ssgloghr.com/auth'; // Your backend API
  private static readonly TOKEN_EXPIRY_MINUTES = 15; // Magic links expire after 15 minutes
  private static readonly STORAGE_KEY = 'magiclink_pending';

  /**
   * Request a magic link to be sent to the user's email
   */
  static async requestMagicLink(email: string): Promise<MagicLinkResponse> {
    try {
      if (!email || !this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Por favor ingrese un email válido'
        };
      }

      // Store pending request
      this.storePendingRequest(email);

      // Call backend to send magic link email
      const response = await fetch(`${this.API_BASE_URL}/send-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          redirectUrl: window.location.origin + '/auth/magic-link-verify'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        message: `Magic link enviado a ${email}. Revise su correo.`,
        token: data.token
      };

    } catch (error: any) {
      console.error('Error requesting magic link:', error);

      // Fallback to local development mode
      if (import.meta.env.DEV) {
        console.warn('Development mode: Using local magic link generation');
        return this.generateLocalMagicLink(email);
      }

      return {
        success: false,
        message: error.message || 'Error al enviar el magic link. Por favor intente nuevamente.'
      };
    }
  }

  /**
   * Verify magic link code and authenticate user
   */
  static async verifyCode(email: string, code: string): Promise<MagicLinkVerifyResponse> {
    try {
      if (!email || !code) {
        return {
          success: false,
          message: 'Email y código son requeridos'
        };
      }

      // Call backend to verify code
      const response = await fetch(`${this.API_BASE_URL}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: code.trim()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      //devLog({dataR})
      //const data = dataR?.data || null;
      devLog({data})
      if (data?.token && data?.user) {
        // Clear pending request
        this.clearPendingRequest();

        // Save session token to cookie (like Google auth does)
        
        devLog(data.token)

        if (data.token) {
          const sessionToken = data.token;
          const now = new Date().getTime();
          const expire = new Date(now + 60000 * 60 * 24 * 365); // 1 year
          let cookie = `ssgl_access_tkn=${sessionToken}; expires=${expire.toUTCString()}; path=/`;
          document.cookie = cookie;
          devLog(cookie)
          devLog('✅ Session token saved to cookie');
        }

        authStore.updateAuthState({
          user: data?.user,
          loading: false,
          error: null,
          authMethod: 'magic-link'
        })
      

        return {
          success: true,
          message: 'Autenticación exitosa',
          user: {
            uid: data.user.uid || this.generateUID(data.user.email),
            email: data.user.email,
            displayName: data.user.displayName || data.user.email.split('@')[0],
            emailVerified: true
          },
          token: data.token,
          signature: data.signature
        };


      }

      return {
        success: false,
        message: data.message || 'Código inválido o expirado'
      };

    } catch (error: any) {
      console.error('Error verifying code:', error);

      // Fallback to local development mode
      if (import.meta.env.DEV) {
        console.warn('Development mode: Using local code verification');
        return this.verifyLocalCode(email, code);
      }

      return {
        success: false,
        message: error.message || 'Error al verificar el código'
      };
    }
  }

  /**
   * Verify magic link token and authenticate user (legacy - supports old token links)
   */
  static async verifyMagicLink(token: string): Promise<MagicLinkVerifyResponse> {
    try {
      if (!token) {
        return {
          success: false,
          message: 'Token inválido'
        };
      }

      // Call backend to verify token
      const response = await fetch(`${this.API_BASE_URL}/magic-link/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Clear pending request
        this.clearPendingRequest();

        // Save session token to cookie (like Google auth does)
        if (data.signature?.token || data.token) {
          const sessionToken = data.signature?.token || data.token;
          const now = new Date().getTime();
          const expire = new Date(now + 60000 * 60 * 24 * 365); // 1 year
          //document.cookie = `ssgl_access_tkn=${sessionToken}; expires=${expire.toUTCString()}; path=/`;

          devLog('✅ Session token saved to cookie (legacy magic link)');
        }

        return {
          success: true,
          message: 'Autenticación exitosa',
          user: {
            uid: data.user.uid || this.generateUID(data.user.email),
            email: data.user.email,
            displayName: data.user.displayName || data.user.email.split('@')[0],
            emailVerified: true
          },
          token: data.signature?.token || data.token,
          signature: data.signature
        };
      }

      return {
        success: false,
        message: data.message || 'Token inválido o expirado'
      };

    } catch (error: any) {
      console.error('Error verifying magic link:', error);

      // Fallback to local development mode
      if (import.meta.env.DEV) {
        console.warn('Development mode: Using local token verification');
        return this.verifyLocalToken(token);
      }

      return {
        success: false,
        message: error.message || 'Error al verificar el token'
      };
    }
  }

  /**
   * Generate a secure random token
   */
  private static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a deterministic UID from email for consistency
   */
  private static generateUID(email: string): string {
    // Simple hash function for development
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'ml_' + Math.abs(hash).toString(36);
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Store pending magic link request (for UI feedback)
   */
  private static storePendingRequest(email: string): void {
    const pending: MagicLinkToken = {
      email,
      token: this.generateToken(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.TOKEN_EXPIRY_MINUTES * 60 * 1000)
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pending));
  }

  /**
   * Get pending magic link request
   */
  static getPendingRequest(): MagicLinkToken | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    try {
      const pending: MagicLinkToken = JSON.parse(stored);

      // Check if expired
      if (Date.now() > pending.expiresAt) {
        this.clearPendingRequest();
        return null;
      }

      return pending;
    } catch {
      return null;
    }
  }

  /**
   * Clear pending request
   */
  static clearPendingRequest(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Development/Fallback: Generate magic link locally
   */
  private static generateLocalMagicLink(email: string): MagicLinkResponse {
    const token = this.generateToken();
    const code = this.generateCode();
    const magicLink = `${window.location.origin}/auth/magic-link-verify?token=${token}`;

    // In development, we can't actually send emails, so we log to console
    devLog('='.repeat(80));
    devLog('🔐 MAGIC LINK (Development Mode)');
    devLog('='.repeat(80));
    devLog('Email:', email);
    devLog('Verification Code:', code);
    devLog('Magic Link:', magicLink);
    devLog('Token:', token);
    devLog('Expires in:', this.TOKEN_EXPIRY_MINUTES, 'minutes');
    devLog('='.repeat(80));
    devLog('⚠️  Option 1: Enter the code above on the verification page');
    devLog('⚠️  Option 2: Click the link above or copy it to authenticate');
    devLog('='.repeat(80));

    // Store token locally for verification
    const localTokens = this.getLocalTokens();
    localTokens[token] = {
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.TOKEN_EXPIRY_MINUTES * 60 * 1000)
    };
    localStorage.setItem('magiclink_dev_tokens', JSON.stringify(localTokens));

    // Store code locally for verification
    const localCodes = this.getLocalCodes();
    localCodes[email.toLowerCase()] = {
      code,
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.TOKEN_EXPIRY_MINUTES * 60 * 1000)
    };
    localStorage.setItem('magiclink_dev_codes', JSON.stringify(localCodes));

    return {
      success: true,
      message: `Magic link generado. Código: ${code} (Ver consola del navegador)`,
      token
    };
  }

  /**
   * Development/Fallback: Verify code locally
   */
  private static verifyLocalCode(email: string, code: string): MagicLinkVerifyResponse {
    const localCodes = this.getLocalCodes();
    const codeData = localCodes[email.toLowerCase()];

    if (!codeData || codeData.code !== code) {
      return {
        success: false,
        message: 'Código inválido o email no coincide'
      };
    }

    // Check expiry
    if (Date.now() > codeData.expiresAt) {
      delete localCodes[email.toLowerCase()];
      localStorage.setItem('magiclink_dev_codes', JSON.stringify(localCodes));
      return {
        success: false,
        message: 'Código expirado. Por favor solicite un nuevo código.'
      };
    }

    // Code is valid, remove it
    delete localCodes[email.toLowerCase()];
    localStorage.setItem('magiclink_dev_codes', JSON.stringify(localCodes));

    return {
      success: true,
      message: 'Autenticación exitosa',
      user: {
        uid: this.generateUID(email),
        email: email,
        displayName: email.split('@')[0],
        emailVerified: true
      }
    };
  }

  /**
   * Development/Fallback: Verify token locally
   */
  private static verifyLocalToken(token: string): MagicLinkVerifyResponse {
    const localTokens = this.getLocalTokens();
    const tokenData = localTokens[token];

    if (!tokenData) {
      return {
        success: false,
        message: 'Token no encontrado o inválido'
      };
    }

    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      delete localTokens[token];
      localStorage.setItem('magiclink_dev_tokens', JSON.stringify(localTokens));
      return {
        success: false,
        message: 'Token expirado. Por favor solicite un nuevo magic link.'
      };
    }

    // Token is valid, remove it
    delete localTokens[token];
    localStorage.setItem('magiclink_dev_tokens', JSON.stringify(localTokens));

    return {
      success: true,
      message: 'Autenticación exitosa',
      user: {
        uid: this.generateUID(tokenData.email),
        email: tokenData.email,
        displayName: tokenData.email.split('@')[0],
        emailVerified: true
      }
    };
  }

  /**
   * Get locally stored tokens (development only)
   */
  private static getLocalTokens(): Record<string, any> {
    try {
      const stored = localStorage.getItem('magiclink_dev_tokens');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Get locally stored codes (development only)
   */
  private static getLocalCodes(): Record<string, any> {
    try {
      const stored = localStorage.getItem('magiclink_dev_codes');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Generate a 6-digit verification code
   */
  private static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate stored session token and get user information
   */
  static async validateSessionToken(token: string): Promise<MagicLinkVerifyResponse> {
    try {
      if (!token) {
        return {
          success: false,
          message: 'No session token provided'
        };
      }


      devLog("validateSessionToken" , token)

      // Call backend to validate token and get user info
      const response = await fetch(`${this.API_BASE_URL}/verify-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.user) {
        return {
          success: true,
          message: 'Token válido',
          user: {
            uid: data.user.uid,
            email: data.user.email,
            displayName: data.user.displayName || data.user.email.split('@')[0],
            emailVerified: true
          },
          token: data.signature?.token || token
        };
      }

      return {
        success: false,
        message: data.message || 'Token inválido o expirado'
      };

    } catch (error: any) {
      console.error('Error validating session token:', error);
      return {
        success: false,
        message: error.message || 'Error al validar el token'
      };
    }
  }

  /**
   * Get session token from cookie
   */
  static getSessionToken(): string | null {
    const name = 'ssgl_access_tkn=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
    return null;
  }

  /**
   * Clear session token from cookie
   */
  static clearSessionToken(): void {
    //document.cookie = 'ssgl_access_tkn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  /**
   * Check if a magic link request is pending
   */
  static hasPendingRequest(): boolean {
    return this.getPendingRequest() !== null;
  }

  /**
   * Get time remaining for pending request
   */
  static getTimeRemaining(): number {
    const pending = this.getPendingRequest();
    if (!pending) return 0;

    const remaining = pending.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 1000)); // Return seconds
  }
}

export default MagicLinkService;
