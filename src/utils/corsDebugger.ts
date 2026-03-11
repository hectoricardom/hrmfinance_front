/**
 * Debug utility to catch and report CORS issues with Firebase Storage
 */

import { devLog } from '../services/utils';

let corsDebugEnabled = true;

export const enableCorsDebug = () => {
  corsDebugEnabled = true;
};

export const disableCorsDebug = () => {
  corsDebugEnabled = false;
};

// Intercept fetch calls to Firebase Storage and warn
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input.url;
  
  if (corsDebugEnabled && url.includes('firebasestorage.googleapis.com')) {
    console.error(`🚨 CORS ISSUE DETECTED: fetch() called with Firebase Storage URL!
      
URL: ${url}
Stack trace:`, new Error().stack);
    
    console.error(`
❌ This WILL cause CORS errors!

✅ SOLUTIONS:
1. Use SignatureImage component: <SignatureImage src="${url}" />
2. Use signatureBlobCache service: getSignatureBlob("${url}")
3. Use Firebase SDK: getBlob(ref(storage, "path"))

🚫 DO NOT use fetch() with Firebase Storage URLs!
    `);
  }
  
  return originalFetch.call(this, input, init);
};

// Intercept image src assignments
export const watchImageSrcAssignments = () => {
  if (!corsDebugEnabled) return;
  
  // Override Image constructor
  const OriginalImage = window.Image;
  window.Image = function(width?: number, height?: number) {
    const img = new OriginalImage(width, height);
    
    // Watch for src assignments
    Object.defineProperty(img, 'src', {
      get() {
        return img.getAttribute('src');
      },
      set(value: string) {
        if (value && value.includes('firebasestorage.googleapis.com')) {
          console.warn(`⚠️  Image src assignment with Firebase Storage URL detected!
            
URL: ${value}
Element:`, img);
          
          console.warn(`
This may cause CORS errors in some browsers.

✅ RECOMMENDED: Use SignatureImage component instead:
<SignatureImage src="${value}" alt="..." />
          `);
        }
        img.setAttribute('src', value);
      }
    });
    
    return img;
  };
  
  // Copy static properties
  Object.setPrototypeOf(window.Image, OriginalImage);
  Object.setPrototypeOf(window.Image.prototype, OriginalImage.prototype);
};

// Log all Firebase Storage URL accesses
export const logFirebaseStorageAccess = (url: string, context: string, method: 'safe' | 'unsafe') => {
  if (!corsDebugEnabled) return;
  
  if (url.includes('firebasestorage.googleapis.com')) {
    const emoji = method === 'safe' ? '✅' : '❌';
    const color = method === 'safe' ? 'color: green' : 'color: red';
    
    devLog(`%c${emoji} Firebase Storage Access - ${context}`, color);
    devLog(`URL: ${url}`);
    devLog(`Method: ${method.toUpperCase()}`);
    
    if (method === 'unsafe') {
      console.warn('This may cause CORS issues!');
    }
  }
};

// Report current Firebase Storage CORS status
export const reportFirebaseStorageCorsStatus = async (testUrl?: string) => {
  console.group('🔍 Firebase Storage CORS Status Report');
  
  if (!testUrl) {
    devLog('ℹ️  No test URL provided. Cannot test CORS status.');
    devLog('💡 To test: reportFirebaseStorageCorsStatus("your-firebase-storage-url")');
    console.groupEnd();
    return;
  }
  
  devLog(`Testing URL: ${testUrl}`);
  
  // Test 1: fetch() - should fail with CORS
  try {
    devLog('🧪 Testing fetch() (should fail with CORS)...');
    const response = await fetch(testUrl, { method: 'HEAD' });
    devLog('❌ UNEXPECTED: fetch() succeeded - CORS may be misconfigured');
    devLog('Response status:', response.status);
  } catch (error) {
    devLog('✅ EXPECTED: fetch() failed with CORS error');
    devLog('Error:', error);
  }
  
  // Test 2: Firebase SDK - should work
  try {
    devLog('🧪 Testing Firebase SDK getBlob() (should work)...');
    const { getSignatureBlob } = await import('../services/signatureBlobCache');
    await getSignatureBlob(testUrl);
    devLog('✅ Firebase SDK getBlob() succeeded');
  } catch (error) {
    devLog('❌ Firebase SDK getBlob() failed');
    console.error('Error:', error);
  }
  
  console.groupEnd();
};

// Initialize debug monitoring
export const initializeCorsDebugger = () => {
  if (!corsDebugEnabled) return;
  
  devLog('🚨 Firebase Storage CORS Debugger initialized');
  devLog('Use reportFirebaseStorageCorsStatus("url") to test CORS status');
  
  watchImageSrcAssignments();
  
  // Add to window for easy debugging
  (window as any).corsDebugger = {
    reportFirebaseStorageCorsStatus,
    enableCorsDebug,
    disableCorsDebug,
    logFirebaseStorageAccess
  };
  
  devLog('💡 Debug commands available: window.corsDebugger');
};