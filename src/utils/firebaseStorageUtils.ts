/**
 * Utilities for handling Firebase Storage URLs safely without CORS issues
 */

/**
 * Check if a URL is a Firebase Storage URL
 */
export const isFirebaseStorageUrl = (url: string): boolean => {
  return url.includes('firebasestorage.googleapis.com');
};

/**
 * Extract storage path from Firebase Storage URL
 */
export const extractStoragePath = (firebaseUrl: string): string | null => {
  try {
    const urlObj = new URL(firebaseUrl);
    const pathname = urlObj.pathname;
    const pathMatch = pathname.match(/\/o\/(.+)$/);
    
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract storage path from URL:', firebaseUrl, error);
    return null;
  }
};

/**
 * Create a safe download link for Firebase Storage files
 * This creates a blob URL that can be used for downloads without CORS issues
 */
export const createSafeDownloadLink = async (
  firebaseUrl: string, 
  filename: string,
  onError?: (error: string) => void
): Promise<void> => {
  try {
    const { getSignatureBlob } = await import('../services/signatureBlobCache');
    const cachedBlob = await getSignatureBlob(firebaseUrl);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(cachedBlob.blob);
    link.click();
    
    // Clean up the object URL after download
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    
  } catch (error) {
    const errorMessage = `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    onError?.(errorMessage);
  }
};

/**
 * Log warning when Firebase Storage URL is used directly in img tag or fetch
 */
export const warnDirectFirebaseStorageUsage = (url: string, context: string): void => {
  if (isFirebaseStorageUrl(url)) {
    console.warn(`⚠️  Direct Firebase Storage URL usage detected in ${context}:
      URL: ${url}
      Issue: This may cause CORS errors
      Solution: Use SignatureImage component or signatureBlobCache service
      Context: ${context}`);
  }
};

/**
 * Safe way to display Firebase Storage images - returns blob URL or original URL
 */
export const getSafeImageUrl = async (url: string): Promise<string> => {
  if (!isFirebaseStorageUrl(url)) {
    return url; // Not Firebase Storage, safe to use directly
  }
  
  try {
    const { getSignatureBlob } = await import('../services/signatureBlobCache');
    const cachedBlob = await getSignatureBlob(url);
    return URL.createObjectURL(cachedBlob.blob);
  } catch (error) {
    console.error('Failed to convert Firebase Storage URL to safe blob URL:', error);
    // Return original URL as fallback (may still cause CORS)
    return url;
  }
};