/**
 * Utilities to validate that signatures are properly stored as base64 in Firestore
 */

import { SignatureRequest } from '../services/signatureRequest';
import { devLog } from '../services/utils';

/**
 * Validate that a signature is stored as base64 data URL
 */
export const validateSignatureFormat = (signatureUrl: string): {
  isValid: boolean;
  format: 'base64' | 'firebase-storage' | 'unknown';
  size?: number;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!signatureUrl) {
    errors.push('Signature URL is empty');
    return { isValid: false, format: 'unknown', errors };
  }

  // Check if it's base64 data URL (correct format)
  if (signatureUrl.startsWith('data:image/')) {
    const base64Size = Math.round((signatureUrl.length * 3) / 4);
    
    // Additional validations for base64
    if (!signatureUrl.includes(';base64,')) {
      errors.push('Base64 data URL missing ";base64," identifier');
    }
    
    if (base64Size < 1000) {
      errors.push('Signature appears too small (< 1KB), might be invalid');
    }
    
    if (base64Size > 500000) { // 500KB
      errors.push('Signature is very large (> 500KB), consider optimizing');
    }

    return {
      isValid: errors.length === 0,
      format: 'base64',
      size: base64Size,
      errors
    };
  }
  
  // Check if it's Firebase Storage URL (should be migrated)
  if (signatureUrl.includes('firebasestorage.googleapis.com')) {
    errors.push('Signature is still stored as Firebase Storage URL - should be migrated to base64');
    return { isValid: false, format: 'firebase-storage', errors };
  }
  
  // Unknown format
  errors.push(`Unknown signature format: ${signatureUrl.substring(0, 50)}...`);
  return { isValid: false, format: 'unknown', errors };
};

/**
 * Validate a signature request to ensure proper base64 storage
 */
export const validateSignatureRequest = (request: SignatureRequest) => {
  const results = {
    requestId: request.id,
    clientName: request.clientName,
    status: request.status,
    hasSignature: !!request.signatureUrl,
    signature: null as ReturnType<typeof validateSignatureFormat> | null,
    summary: {
      isValid: true,
      warnings: [] as string[],
      errors: [] as string[]
    }
  };

  if (request.status === 'signed') {
    if (!request.signatureUrl) {
      results.summary.errors.push('Request marked as signed but has no signature URL');
      results.summary.isValid = false;
    } else {
      results.signature = validateSignatureFormat(request.signatureUrl);
      
      if (!results.signature.isValid) {
        results.summary.errors.push(...results.signature.errors);
        results.summary.isValid = false;
      }
      
      if (results.signature.format === 'firebase-storage') {
        results.summary.warnings.push('Signature needs migration from Firebase Storage to base64');
      }
    }
  }

  return results;
};

/**
 * Console utility to check signature storage format for debugging
 */
export const debugSignatureStorage = (request: SignatureRequest) => {
  console.group(`🔍 Signature Storage Debug: ${request.id}`);
  
  const validation = validateSignatureRequest(request);
  
  devLog('📄 Request Info:', {
    id: request.id,
    client: request.clientName,
    status: request.status,
    signedAt: request.signedAt?.toDate?.().toLocaleString()
  });
  
  if (validation.hasSignature && validation.signature) {
    const sig = validation.signature;
    devLog('🖋️  Signature Info:', {
      format: sig.format,
      isValid: sig.isValid,
      size: sig.size ? `${Math.round(sig.size / 1024)}KB` : 'Unknown',
      preview: request.signatureUrl?.substring(0, 80) + '...'
    });
    
    if (sig.errors.length > 0) {
      console.error('❌ Errors:', sig.errors);
    }
    
    if (sig.format === 'base64') {
      devLog('✅ Signature is properly stored as base64 in Firestore!');
    } else if (sig.format === 'firebase-storage') {
      console.warn('⚠️  Signature is stored as Firebase Storage URL - should be migrated');
    }
  } else {
    devLog('ℹ️  No signature data (status: ' + request.status + ')');
  }
  
  if (validation.summary.warnings.length > 0) {
    console.warn('⚠️  Warnings:', validation.summary.warnings);
  }
  
  console.groupEnd();
  return validation;
};

/**
 * Get summary of signature storage formats across multiple requests
 */
export const getSignatureStorageSummary = (requests: SignatureRequest[]) => {
  const summary = {
    total: requests.length,
    signed: 0,
    base64: 0,
    firebaseStorage: 0,
    invalid: 0,
    totalSize: 0,
    averageSize: 0
  };
  
  const signedRequests = requests.filter(r => r.status === 'signed' && r.signatureUrl);
  summary.signed = signedRequests.length;
  
  signedRequests.forEach(request => {
    const validation = validateSignatureFormat(request.signatureUrl!);
    
    if (validation.format === 'base64') {
      summary.base64++;
      if (validation.size) {
        summary.totalSize += validation.size;
      }
    } else if (validation.format === 'firebase-storage') {
      summary.firebaseStorage++;
    } else {
      summary.invalid++;
    }
  });
  
  if (summary.base64 > 0) {
    summary.averageSize = summary.totalSize / summary.base64;
  }
  
  return summary;
};