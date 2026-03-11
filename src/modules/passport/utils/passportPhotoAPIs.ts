import { devLog } from '../../../services/utils';

export interface CompressedImageData {
  base64: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  metadata?: any;
}

export interface APIProvider {
  name: string;
  key: string;
  description: string;
  pricing: string;
  features: string[];
  limitations?: string[];
}

export interface BackgroundRemovalOptions {
  outputFormat?: 'png' | 'jpg' | 'webp';
  outputQuality?: number;
  backgroundColor?: string;
  cropToForeground?: boolean;
}

export interface FaceEnhancementOptions {
  enhanceEyes?: boolean;
  smoothSkin?: boolean;
  adjustLighting?: boolean;
  removeRedEye?: boolean;
  sharpenFace?: boolean;
  brightnessAdjustment?: number;
  contrastAdjustment?: number;
}

export interface PassportPhotoOptions {
  countryCode: 'US' | 'EU' | 'UK' | 'CA' | 'AU' | 'IN' | 'CU';
  backgroundColor?: string;
  removeBackground?: boolean;
  enhanceFace?: boolean;
  autoRotate?: boolean;
  outputSize?: { width: number; height: number };
}

export const API_PROVIDERS: Record<string, APIProvider> = {
  REMOVE_BG: {
    name: 'Remove.bg',
    key: 'remove.bg',
    description: 'High-quality background removal using AI',
    pricing: '50 free previews/month, then $0.20/image',
    features: [
      'Automatic background removal',
      'Hair detail preservation',
      'Edge refinement',
      'Batch processing',
      'API and plugins available'
    ],
    limitations: ['Preview images have watermark unless paid']
  },
  PHOTOROOM: {
    name: 'PhotoRoom API',
    key: 'photoroom',
    description: 'Professional background removal and photo editing',
    pricing: 'Free tier available, paid plans from $9/month',
    features: [
      'Background removal',
      'Background replacement',
      'Shadow generation',
      'Image enhancement',
      'Batch processing'
    ]
  },
  CLIPPING_MAGIC: {
    name: 'Clipping Magic',
    key: 'clippingmagic',
    description: 'Advanced background removal with manual corrections',
    pricing: '$3.99/month for 15 downloads',
    features: [
      'AI-powered background removal',
      'Manual touch-up tools',
      'Hair/fur handling',
      'Color adjustment',
      'Batch processing'
    ]
  },
  FACE_PLUS_PLUS: {
    name: 'Face++ (Megvii)',
    key: 'faceplusplus',
    description: 'Advanced face detection and analysis',
    pricing: 'Free tier with 1000 calls/month',
    features: [
      'Face detection with 106 landmarks',
      'Face attributes analysis',
      'Emotion detection',
      'Face comparison',
      'Beauty scoring'
    ]
  },
  MICROSOFT_FACE: {
    name: 'Microsoft Azure Face API',
    key: 'azure-face',
    description: 'Comprehensive face detection and analysis',
    pricing: '1000 free transactions/month',
    features: [
      'Face detection and landmarks',
      'Face verification',
      'Emotion recognition',
      'Age/gender detection',
      'Face grouping'
    ]
  },
  CLOUDINARY: {
    name: 'Cloudinary',
    key: 'cloudinary',
    description: 'Complete image management and transformation',
    pricing: 'Free tier with 25 credits/month',
    features: [
      'Automatic cropping',
      'Face detection',
      'Background removal',
      'Image enhancement',
      'Format optimization',
      'CDN delivery'
    ]
  },
  IMGIX: {
    name: 'imgix',
    key: 'imgix',
    description: 'Real-time image processing API',
    pricing: 'From $10/month',
    features: [
      'Face detection',
      'Automatic enhancement',
      'Smart cropping',
      'Format conversion',
      'Real-time transformations'
    ]
  },
  DEEP_AI: {
    name: 'DeepAI',
    key: 'deepai',
    description: 'AI-powered image enhancement',
    pricing: 'Pay-per-use starting at $5',
    features: [
      'Image colorization',
      'Super resolution',
      'Style transfer',
      'Face enhancement',
      'Background removal'
    ]
  },
  PICSART: {
    name: 'Picsart API',
    key: 'picsart',
    description: 'Creative image editing API',
    pricing: 'Free tier available',
    features: [
      'Background removal',
      'Face enhancement',
      'Filters and effects',
      'Image upscaling',
      'Style transfer'
    ]
  }
};

// Remove.bg API integration
export class RemoveBgAPI {
  private apiKey: string;
  private baseUrl = 'https://api.remove.bg/v1.0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async removeBackground(
    imageFile: File | Blob,
    options: BackgroundRemovalOptions = {}
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');
    formData.append('type', 'person');
    
    if (options.backgroundColor) {
      formData.append('bg_color', options.backgroundColor);
    }
    
    if (options.cropToForeground) {
      formData.append('crop', 'true');
    }

    const response = await fetch(`${this.baseUrl}/removebg`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Remove.bg API error: ${error.errors?.[0]?.title || 'Unknown error'}`);
    }

    return await response.blob();
  }
}

// Face++ API integration
export class FacePlusPlusAPI {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api-us.faceplusplus.com/facepp/v3';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async detectFace(imageFile: File | Blob) {
    const formData = new FormData();
    formData.append('api_key', this.apiKey);
    formData.append('api_secret', this.apiSecret);
    formData.append('image_file', imageFile);
    formData.append('return_landmark', '2'); // 106 landmarks
    formData.append('return_attributes', 'gender,age,smiling,headpose,facequality,blur,eyestatus,emotion,beauty,mouthstatus,eyegaze,skinstatus');

    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Face++ API error: ${error.error_message || 'Unknown error'}`);
    }

    return await response.json();
  }

  async beautifyFace(imageFile: File | Blob, options: FaceEnhancementOptions = {}) {
    const formData = new FormData();
    formData.append('api_key', this.apiKey);
    formData.append('api_secret', this.apiSecret);
    formData.append('image_file', imageFile);
    
    // Beautification parameters
    if (options.smoothSkin) {
      formData.append('whitening', '50');
      formData.append('smoothing', '70');
    }
    
    if (options.removeRedEye) {
      formData.append('remove_red_eye', '1');
    }

    const response = await fetch(`${this.baseUrl}/beautify`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Face++ API error: ${error.error_message || 'Unknown error'}`);
    }

    return await response.json();
  }
}

// Cloudinary API integration
export class CloudinaryAPI {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;
  private uploadPreset?: string;

  constructor(cloudName: string, apiKey: string, apiSecret: string, uploadPreset?: string) {
    this.cloudName = cloudName;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.uploadPreset = uploadPreset;
  }

  async uploadAndTransform(
    imageFile: File | Blob,
    transformations: string[]
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    if (this.uploadPreset) {
      formData.append('upload_preset', this.uploadPreset);
    } else {
      formData.append('api_key', this.apiKey);
      // Note: For signed uploads, you'd need to generate a signature
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cloudinary API error: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    // Apply transformations to the URL
    const baseUrl = result.secure_url;
    const transformationString = transformations.join(',');
    const transformedUrl = baseUrl.replace('/upload/', `/upload/${transformationString}/`);
    
    return transformedUrl;
  }

  // Helper method to generate passport photo transformations
  getPassportPhotoTransformations(countryCode: string): string[] {
    const transformations: string[] = [];
    
    // Face-based cropping
    transformations.push('g_face', 'c_thumb');
    
    // Country-specific dimensions
    switch (countryCode) {
      case 'US':
        transformations.push('w_600', 'h_600');
        break;
      case 'EU':
        transformations.push('w_413', 'h_531'); // 35x45mm at 300dpi
        break;
      case 'UK':
        transformations.push('w_413', 'h_531'); // 35x45mm
        break;
      case 'CU':
        transformations.push('w_900', 'h_900'); // Cuban requirements
        break;
      default:
        transformations.push('w_600', 'h_600');
    }
    
    // Enhancement
    transformations.push('e_improve:50', 'e_sharpen:30');
    
    // Background removal (requires Cloudinary AI Background Removal add-on)
    transformations.push('e_background_removal');
    
    return transformations;
  }
}

// Microsoft Azure Face API integration
export class AzureFaceAPI {
  private endpoint: string;
  private subscriptionKey: string;

  constructor(endpoint: string, subscriptionKey: string) {
    this.endpoint = endpoint;
    this.subscriptionKey = subscriptionKey;
  }

  async detectFace(imageFile: File | Blob) {
    const params = new URLSearchParams({
      returnFaceId: 'true',
      returnFaceLandmarks: 'true',
      returnFaceAttributes: 'age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise',
      recognitionModel: 'recognition_04',
      detectionModel: 'detection_03'
    });

    const response = await fetch(`${this.endpoint}/face/v1.0/detect?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'Content-Type': 'application/octet-stream'
      },
      body: imageFile
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Azure Face API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }
}

// Combined passport photo processor using multiple APIs
export class EnhancedPassportPhotoProcessor {
  private removeBgAPI?: RemoveBgAPI;
  private facePlusPlusAPI?: FacePlusPlusAPI;
  private cloudinaryAPI?: CloudinaryAPI;
  private azureFaceAPI?: AzureFaceAPI;

  constructor(apiConfigs: {
    removeBg?: { apiKey: string };
    facePlusPlus?: { apiKey: string; apiSecret: string };
    cloudinary?: { cloudName: string; apiKey: string; apiSecret: string; uploadPreset?: string };
    azureFace?: { endpoint: string; subscriptionKey: string };
  }) {
    if (apiConfigs.removeBg) {
      this.removeBgAPI = new RemoveBgAPI(apiConfigs.removeBg.apiKey);
    }
    if (apiConfigs.facePlusPlus) {
      this.facePlusPlusAPI = new FacePlusPlusAPI(
        apiConfigs.facePlusPlus.apiKey,
        apiConfigs.facePlusPlus.apiSecret
      );
    }
    if (apiConfigs.cloudinary) {
      this.cloudinaryAPI = new CloudinaryAPI(
        apiConfigs.cloudinary.cloudName,
        apiConfigs.cloudinary.apiKey,
        apiConfigs.cloudinary.apiSecret,
        apiConfigs.cloudinary.uploadPreset
      );
    }
    if (apiConfigs.azureFace) {
      this.azureFaceAPI = new AzureFaceAPI(
        apiConfigs.azureFace.endpoint,
        apiConfigs.azureFace.subscriptionKey
      );
    }
  }

  async processPassportPhoto(
    imageFile: File | Blob,
    options: PassportPhotoOptions
  ): Promise<CompressedImageData> {
    try {
      let processedImage = imageFile;
      const metadata: any = {
        originalSize: imageFile.size,
        processingSteps: []
      };

      // Step 1: Face detection (using available API)
      if (this.azureFaceAPI) {
        const faceData = await this.azureFaceAPI.detectFace(imageFile);
        metadata.faceDetection = faceData;
        metadata.processingSteps.push('Azure Face Detection');
      } else if (this.facePlusPlusAPI) {
        const faceData = await this.facePlusPlusAPI.detectFace(imageFile);
        metadata.faceDetection = faceData;
        metadata.processingSteps.push('Face++ Detection');
      }

      // Step 2: Background removal (if requested)
      if (options.removeBackground && this.removeBgAPI) {
        processedImage = await this.removeBgAPI.removeBackground(processedImage, {
          backgroundColor: options.backgroundColor || '#FFFFFF',
          cropToForeground: true
        });
        metadata.processingSteps.push('Background Removal');
      }

      // Step 3: Face enhancement (if requested)
      if (options.enhanceFace && this.facePlusPlusAPI) {
        const enhanced = await this.facePlusPlusAPI.beautifyFace(processedImage, {
          smoothSkin: true,
          adjustLighting: true,
          removeRedEye: true
        });
        if (enhanced.result) {
          // Convert base64 result to blob
          const base64Data = enhanced.result.split(',')[1];
          const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          processedImage = new Blob([byteArray], { type: 'image/jpeg' });
          metadata.processingSteps.push('Face Enhancement');
        }
      }

      // Step 4: Final processing with Cloudinary (if available)
      if (this.cloudinaryAPI) {
        const transformations = this.cloudinaryAPI.getPassportPhotoTransformations(options.countryCode);
        const cloudinaryUrl = await this.cloudinaryAPI.uploadAndTransform(processedImage, transformations);
        
        // Download the processed image
        const response = await fetch(cloudinaryUrl);
        processedImage = await response.blob();
        metadata.processingSteps.push('Cloudinary Processing');
        metadata.cloudinaryUrl = cloudinaryUrl;
      }

      // Convert final blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(processedImage);
      });

      const base64 = await base64Promise;

      return {
        base64,
        mimeType: processedImage.type || 'image/jpeg',
        size: processedImage.size,
        width: options.outputSize?.width || 600,
        height: options.outputSize?.height || 600,
        metadata
      };

    } catch (error) {
      devLog('Error processing passport photo:', error);
      throw error;
    }
  }
}

// Utility function to validate API keys
export const validateAPIKeys = (provider: string, keys: Record<string, string>): boolean => {
  switch (provider) {
    case 'remove.bg':
      return !!keys.apiKey;
    case 'faceplusplus':
      return !!keys.apiKey && !!keys.apiSecret;
    case 'cloudinary':
      return !!keys.cloudName && (!!keys.uploadPreset || (!!keys.apiKey && !!keys.apiSecret));
    case 'azure-face':
      return !!keys.endpoint && !!keys.subscriptionKey;
    default:
      return false;
  }
};

// Helper function to estimate API costs
export const estimateAPICost = (provider: string, imageCount: number): string => {
  switch (provider) {
    case 'remove.bg':
      const freeTier = 50;
      const paidImages = Math.max(0, imageCount - freeTier);
      const cost = paidImages * 0.20;
      return `$${cost.toFixed(2)} (${freeTier} free images included)`;
    
    case 'faceplusplus':
      const freeCallsPerMonth = 1000;
      if (imageCount <= freeCallsPerMonth) return 'Free';
      return `Exceeds free tier (${freeCallsPerMonth} calls/month)`;
    
    case 'cloudinary':
      const freeCredits = 25;
      if (imageCount <= freeCredits) return 'Free';
      return `May exceed free tier (${freeCredits} credits/month)`;
    
    case 'azure-face':
      const freeTransactions = 1000;
      if (imageCount <= freeTransactions) return 'Free';
      const paidTransactions = imageCount - freeTransactions;
      const costPerThousand = 1.00;
      const cost = (paidTransactions / 1000) * costPerThousand;
      return `$${cost.toFixed(2)}`;
    
    default:
      return 'Unknown';
  }
};