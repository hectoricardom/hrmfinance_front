import { ref, getBlob } from 'firebase/storage';
import { storage } from './firebase';
import { devLog } from './utils';

export interface CachedSignatureBlob {
  blob: Blob;
  base64: string;
  url: string;
  metadata: {
    size: number;
    type: string;
    cached: Date;
  };
}

// In-memory cache for signature blobs
const signatureBlobCache = new Map<string, CachedSignatureBlob>();

/**
 * Convert any signature URL/data to blob and cache it
 */
export const getSignatureBlob = async (signatureUrl: string): Promise<CachedSignatureBlob> => {
  // Check cache first
  if (signatureBlobCache.has(signatureUrl)) {
    const cached = signatureBlobCache.get(signatureUrl)!;
    devLog('Using cached signature blob:', cached.metadata.size, 'bytes');
    return cached;
  }

  devLog('Converting signature to blob:', signatureUrl);

  let blob: Blob;
  
  // If it's already base64 data URL, convert directly to blob
  if (signatureUrl.startsWith('data:')) {
    blob = await dataUrlToBlob(signatureUrl);
  }
  // If it's Firebase Storage URL, use Firebase SDK (NEVER use fetch for Firebase Storage)
  else if (signatureUrl.includes('firebasestorage.googleapis.com')) {
    blob = await convertFirebaseUrlToBlob(signatureUrl);
  }
  // For other URLs (non-Firebase), use fetch with error handling
  else {
    try {
      const response = await fetch(signatureUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      blob = await response.blob();
    } catch (fetchError) {
      throw new Error(`Failed to fetch signature from ${signatureUrl}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }
  }

  // Convert blob to base64 for display purposes
  const base64 = await blobToBase64(blob);

  // Create cached entry
  const cachedBlob: CachedSignatureBlob = {
    blob,
    base64,
    url: signatureUrl,
    metadata: {
      size: blob.size,
      type: blob.type,
      cached: new Date()
    }
  };

  // Cache it
  signatureBlobCache.set(signatureUrl, cachedBlob);
  devLog('Signature blob cached:', blob.size, 'bytes, type:', blob.type);

  return cachedBlob;
};

/**
 * Convert Firebase Storage URL to blob using Firebase SDK (no CORS issues)
 */
const convertFirebaseUrlToBlob = async (url: string): Promise<Blob> => {
  try {
    // Extract path from Firebase Storage URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const pathMatch = pathname.match(/\/o\/(.+)$/);
    
    if (!pathMatch) {
      throw new Error('Could not extract storage path from Firebase URL');
    }
    
    const storagePath = decodeURIComponent(pathMatch[1]);
    devLog('Using Firebase SDK to get blob for path:', storagePath);
    
    const storageRef = ref(storage, storagePath);
    const blob = await getBlob(storageRef);
    devLog('Successfully got blob from Firebase SDK:', blob.size, 'bytes');
    return blob;
    
  } catch (firebaseError) {
    console.error('Firebase SDK failed to get blob:', firebaseError);
    
    // For Firebase Storage URLs, we should NOT use fetch as it has CORS issues
    // Instead, throw a more descriptive error with troubleshooting info
    if (url.includes('firebasestorage.googleapis.com')) {
      const errorMessage = firebaseError instanceof Error ? firebaseError.message : 'Unknown error';
      throw new Error(`Firebase Storage access failed: ${errorMessage}. 
        
Possible solutions:
1. Check Firebase Storage rules (allow read access for signatures)
2. Verify the storage path exists: ${storagePath}
3. Ensure Firebase SDK is properly initialized
4. Check network connectivity

Note: CORS errors cannot be fixed by using fetch() - Firebase SDK is required.`);
    }
    
    // For other URLs, we can still try fetch (though this is rare)
    try {
      devLog('Attempting fetch for non-Firebase URL...');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (fetchError) {
      throw new Error(`Both Firebase SDK and fetch failed. Firebase: ${firebaseError instanceof Error ? firebaseError.message : 'Unknown'}, Fetch: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`);
    }
  }
};

/**
 * Convert data URL to blob
 */
const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return await response.blob();
};

/**
 * Convert blob to base64 data URL
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Get cached signature blob without fetching (returns null if not cached)
 */
export const getCachedSignatureBlob = (signatureUrl: string): CachedSignatureBlob | null => {
  return signatureBlobCache.get(signatureUrl) || null;
};

/**
 * Clear cache (useful for memory management)
 */
export const clearSignatureBlobCache = (): void => {
  signatureBlobCache.clear();
  devLog('Signature blob cache cleared');
};

/**
 * Get cache statistics
 */
export const getSignatureBlobCacheStats = () => {
  const entries = Array.from(signatureBlobCache.values());
  const totalSize = entries.reduce((sum, entry) => sum + entry.metadata.size, 0);
  
  return {
    count: entries.length,
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
    entries: entries.map(entry => ({
      url: entry.url,
      size: entry.metadata.size,
      sizeFormatted: formatFileSize(entry.metadata.size),
      type: entry.metadata.type,
      cached: entry.metadata.cached
    }))
  };
};

/**
 * Format file size in human readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};