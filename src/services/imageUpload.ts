/**
 * Image Upload Service
 * Handles uploading images to the API and converting them to base64
 */

export interface ImageUploadResponse {
  success: boolean;
  imageUrl?: string;
  base64?: string;
  error?: string;
  fileName?: string;
  size?: number;
}

export interface ImageUploadOptions {
  maxSizeKB?: number; // Maximum file size in KB (default 2MB)
  acceptedTypes?: string[]; // Accepted MIME types (default: jpg, png, webp)
  quality?: number; // Compression quality for JPEG (0-1, default 0.8)
  maxWidth?: number; // Maximum width for resizing (default 1024)
  maxHeight?: number; // Maximum height for resizing (default 1024)
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  maxSizeKB: 2048, // 2MB
  acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  quality: 0.8,
  maxWidth: 1024,
  maxHeight: 1024
};




const urlB = "https://ssgloghr.com"

/**
 * Resize image to fit within specified dimensions while maintaining aspect ratio
 */
const resizeImage = (
  file: File, 
  maxWidth: number, 
  maxHeight: number, 
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx!.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Convert file to base64 string
 */
const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Validate file before upload
 */
const validateFile = (file: File, options: Required<ImageUploadOptions>): void => {
  // Check file type
  if (!options.acceptedTypes.includes(file.type)) {
    throw new Error(`Tipo de archivo no permitido. Use: ${options.acceptedTypes.join(', ')}`);
  }
  
  // Check file size
  const fileSizeKB = file.size / 5000;
  if (fileSizeKB > options.maxSizeKB) {
    throw new Error(`El archivo es muy grande. Máximo permitido: ${options.maxSizeKB}KB`);
  }
};

/**
 * Upload image to API endpoint and return base64
 */
export const uploadImage = async (
  file: File, 
  options: ImageUploadOptions = {}
): Promise<ImageUploadResponse> => {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Validate file
    validateFile(file, opts);
    
    // Resize image if needed
    const resizedBlob = await resizeImage(file, opts.maxWidth, opts.maxHeight, opts.quality);
    
    // Convert to base64
    const base64 = await fileToBase64(resizedBlob);


    
    // Create FormData for API upload
    const formData = new FormData();
    formData.append('file', resizedBlob, file.name);
    formData.append('fileName', file.name);
    formData.append('originalSize', file.size.toString());
    formData.append('compressedSize', resizedBlob.size.toString());
    
    // Upload to API
    const response = await fetch(urlB+'/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      imageUrl: result?.data?.url ,
      base64: base64,
      fileName: file.name,
      size: resizedBlob.size
    };
    
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al subir la imagen'
    };
  }
};

/**
 * Upload image and return only base64 (for local storage)
 */
export const convertImageToBase64 = async (
  file: File,
  options: ImageUploadOptions = {}
): Promise<ImageUploadResponse> => {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Validate file
    validateFile(file, opts);
    
    // Resize image if needed
    const resizedBlob = await resizeImage(file, opts.maxWidth, opts.maxHeight, opts.quality);
    
    // Convert to base64
    const base64 = await fileToBase64(resizedBlob);
    
    return {
      success: true,
      base64: base64,
      fileName: file.name,
      size: resizedBlob.size
    };
    
  } catch (error) {
    console.error('Image conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar la imagen'
    };
  }
};

/**
 * Utility function to get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Utility function to check if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};