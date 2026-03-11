import { RekognitionClient, DetectFacesCommand, type BoundingBox, type Landmark } from '@aws-sdk/client-rekognition';
import { devLog } from '../../../services/utils';

export interface RekognitionFaceDetails {
  boundingBox: BoundingBox;
  landmarks: Landmark[];
  confidence: number;
  pose: {
    roll?: number;
    yaw?: number;
    pitch?: number;
  };
  quality: {
    brightness?: number;
    sharpness?: number;
  };
}

export interface RekognitionConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface PassportCropCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  faceCenter: { x: number; y: number };
  eyeLevel: number;
}

export class AmazonRekognitionProcessor {
  private client: RekognitionClient;

  constructor(config: RekognitionConfig) {
    this.client = new RekognitionClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  async detectFaces(imageBytes: Uint8Array): Promise<RekognitionFaceDetails[]> {
    try {
      const command = new DetectFacesCommand({
        Image: {
          Bytes: imageBytes
        },
        Attributes: ['ALL'] // Get all face attributes including landmarks
      });

      const response = await this.client.send(command);
      
      if (!response.FaceDetails || response.FaceDetails.length === 0) {
        throw new Error('No faces detected in the image');
      }

      return response.FaceDetails.map(face => ({
        boundingBox: face.BoundingBox!,
        landmarks: face.Landmarks || [],
        confidence: face.Confidence || 0,
        pose: {
          roll: face.Pose?.Roll,
          yaw: face.Pose?.Yaw,
          pitch: face.Pose?.Pitch
        },
        quality: {
          brightness: face.Quality?.Brightness,
          sharpness: face.Quality?.Sharpness
        }
      }));
    } catch (error) {
      devLog('Amazon Rekognition error:', error);
      throw error;
    }
  }

  calculatePassportCrop(
    faceDetails: RekognitionFaceDetails,
    imageWidth: number,
    imageHeight: number,
    countryCode: string = 'US'
  ): PassportCropCoordinates {
    const { boundingBox, landmarks } = faceDetails;
    
    // Convert relative coordinates to absolute pixels
    const faceX = boundingBox.Left! * imageWidth;
    const faceY = boundingBox.Top! * imageHeight;
    const faceWidth = boundingBox.Width! * imageWidth;
    const faceHeight = boundingBox.Height! * imageHeight;
    
    // Calculate face center
    const faceCenterX = faceX + faceWidth / 2;
    const faceCenterY = faceY + faceHeight / 2;
    
    // Find eye level from landmarks
    let eyeLevel = faceCenterY - faceHeight * 0.2; // Default if no eye landmarks
    
    const leftEye = landmarks.find(l => l.Type === 'eyeLeft');
    const rightEye = landmarks.find(l => l.Type === 'eyeRight');
    
    if (leftEye && rightEye) {
      const leftEyeY = leftEye.Y! * imageHeight;
      const rightEyeY = rightEye.Y! * imageHeight;
      eyeLevel = (leftEyeY + rightEyeY) / 2;
    }
    
    // Calculate crop dimensions based on country requirements
    const cropSpecs = this.getCountryCropSpecs(countryCode);
    
    // For passport photos, face should occupy 70-80% of the frame
    const faceToPhotoRatio = cropSpecs.faceRatio;
    const requiredCropHeight = faceHeight / faceToPhotoRatio;
    const requiredCropWidth = requiredCropHeight * cropSpecs.aspectRatio;
    
    // Position crop so eyes are at the specified position from top
    const cropY = eyeLevel - (requiredCropHeight * cropSpecs.eyePosition);
    const cropX = faceCenterX - (requiredCropWidth / 2);
    
    // Ensure crop stays within image bounds
    const finalCropX = Math.max(0, Math.min(cropX, imageWidth - requiredCropWidth));
    const finalCropY = Math.max(0, Math.min(cropY, imageHeight - requiredCropHeight));
    
    // Adjust dimensions if they exceed image bounds
    const finalCropWidth = Math.min(requiredCropWidth, imageWidth - finalCropX);
    const finalCropHeight = Math.min(requiredCropHeight, imageHeight - finalCropY);
    
    return {
      x: Math.round(finalCropX),
      y: Math.round(finalCropY),
      width: Math.round(finalCropWidth),
      height: Math.round(finalCropHeight),
      faceCenter: { x: faceCenterX, y: faceCenterY },
      eyeLevel: eyeLevel
    };
  }

  private getCountryCropSpecs(countryCode: string) {
    const specs: Record<string, any> = {
      US: {
        aspectRatio: 1, // Square 2x2 inches
        faceRatio: 0.625, // Face should be 50-69% of height
        eyePosition: 0.38, // Eyes at 28-36% from top (using middle value)
        finalWidth: 600,
        finalHeight: 600
      },
      EU: {
        aspectRatio: 0.778, // 35x45mm
        faceRatio: 0.75, // Face 70-80% of height
        eyePosition: 0.40, // Eyes at 32-40% from top
        finalWidth: 413,
        finalHeight: 531
      },
      UK: {
        aspectRatio: 0.778, // 35x45mm
        faceRatio: 0.75,
        eyePosition: 0.40,
        finalWidth: 413,
        finalHeight: 531
      },
      CU: {
        aspectRatio: 1, // Square 30x30mm
        faceRatio: 0.75,
        eyePosition: 0.40,
        finalWidth: 900,
        finalHeight: 900
      },
      CA: {
        aspectRatio: 0.714, // 50x70mm
        faceRatio: 0.75,
        eyePosition: 0.40,
        finalWidth: 590,
        finalHeight: 826
      },
      IN: {
        aspectRatio: 1, // Square 35x35mm
        faceRatio: 0.75,
        eyePosition: 0.40,
        finalWidth: 413,
        finalHeight: 413
      },
      AU: {
        aspectRatio: 0.778, // 35x45mm
        faceRatio: 0.75,
        eyePosition: 0.40,
        finalWidth: 413,
        finalHeight: 531
      }
    };
    
    return specs[countryCode] || specs.US;
  }

  validateFaceForPassport(faceDetails: RekognitionFaceDetails): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check confidence
    if (faceDetails.confidence < 90) {
      warnings.push(`Low face detection confidence: ${faceDetails.confidence.toFixed(1)}%`);
    }
    
    // Check pose
    const { pose } = faceDetails;
    if (Math.abs(pose.yaw || 0) > 10) {
      errors.push('Face is turned too much to the side');
    }
    if (Math.abs(pose.pitch || 0) > 10) {
      errors.push('Face is tilted too much up or down');
    }
    if (Math.abs(pose.roll || 0) > 10) {
      errors.push('Head is tilted/rotated too much');
    }
    
    // Check quality
    const { quality } = faceDetails;
    if (quality.brightness && quality.brightness < 40) {
      warnings.push('Image may be too dark');
    }
    if (quality.brightness && quality.brightness > 80) {
      warnings.push('Image may be too bright');
    }
    if (quality.sharpness && quality.sharpness < 50) {
      warnings.push('Image may be blurry');
    }
    
    // Check for required landmarks
    const requiredLandmarks = ['eyeLeft', 'eyeRight', 'nose', 'mouthLeft', 'mouthRight'];
    const foundLandmarks = faceDetails.landmarks.map(l => l.Type);
    const missingLandmarks = requiredLandmarks.filter(l => !foundLandmarks.includes(l));
    
    if (missingLandmarks.length > 0) {
      warnings.push(`Some facial features not clearly detected: ${missingLandmarks.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async processPassportPhoto(
    imageFile: File,
    countryCode: string = 'US'
  ): Promise<{
    cropCoordinates: PassportCropCoordinates;
    faceDetails: RekognitionFaceDetails;
    validation: ReturnType<typeof this.validateFaceForPassport>;
    imageWidth: number;
    imageHeight: number;
  }> {
    // Convert file to bytes
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    
    // Get image dimensions
    const dimensions = await this.getImageDimensions(imageFile);
    
    // Detect faces
    const faces = await this.detectFaces(imageBytes);
    
    // Use the first (most prominent) face
    const primaryFace = faces[0];
    
    // Validate face for passport requirements
    const validation = this.validateFaceForPassport(primaryFace);
    
    // Calculate crop coordinates
    const cropCoordinates = this.calculatePassportCrop(
      primaryFace,
      dimensions.width,
      dimensions.height,
      countryCode
    );
    
    return {
      cropCoordinates,
      faceDetails: primaryFace,
      validation,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height
    };
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Helper to draw debug info on canvas
  drawDebugInfo(
    ctx: CanvasRenderingContext2D,
    faceDetails: RekognitionFaceDetails,
    cropCoordinates: PassportCropCoordinates,
    scale: number = 1
  ) {
    ctx.save();
    
    // Draw face bounding box
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      faceDetails.boundingBox.Left! * ctx.canvas.width * scale,
      faceDetails.boundingBox.Top! * ctx.canvas.height * scale,
      faceDetails.boundingBox.Width! * ctx.canvas.width * scale,
      faceDetails.boundingBox.Height! * ctx.canvas.height * scale
    );
    
    // Draw landmarks
    ctx.fillStyle = '#ffff00';
    faceDetails.landmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(
        landmark.X! * ctx.canvas.width * scale,
        landmark.Y! * ctx.canvas.height * scale,
        3,
        0,
        2 * Math.PI
      );
      ctx.fill();
      
      // Label important landmarks
      if (['eyeLeft', 'eyeRight', 'nose'].includes(landmark.Type!)) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(
          landmark.Type!,
          landmark.X! * ctx.canvas.width * scale + 5,
          landmark.Y! * ctx.canvas.height * scale - 5
        );
        ctx.fillStyle = '#ffff00';
      }
    });
    
    // Draw crop area
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      cropCoordinates.x * scale,
      cropCoordinates.y * scale,
      cropCoordinates.width * scale,
      cropCoordinates.height * scale
    );
    
    // Draw eye level line
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, cropCoordinates.eyeLevel * scale);
    ctx.lineTo(ctx.canvas.width, cropCoordinates.eyeLevel * scale);
    ctx.stroke();
    
    // Add info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 300, 120);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`Confidence: ${(faceDetails.confidence * 100).toFixed(1)}%`, 20, 30);
    ctx.fillText(`Pose - Yaw: ${faceDetails.pose.yaw?.toFixed(1)}° Pitch: ${faceDetails.pose.pitch?.toFixed(1)}° Roll: ${faceDetails.pose.roll?.toFixed(1)}°`, 20, 50);
    ctx.fillText(`Quality - Brightness: ${faceDetails.quality.brightness?.toFixed(1)} Sharpness: ${faceDetails.quality.sharpness?.toFixed(1)}`, 20, 70);
    ctx.fillText(`Crop: ${cropCoordinates.x},${cropCoordinates.y} ${cropCoordinates.width}x${cropCoordinates.height}`, 20, 90);
    ctx.fillText(`Eye Level: ${cropCoordinates.eyeLevel.toFixed(0)}px`, 20, 110);
    
    ctx.restore();
  }
}

// Utility function to convert base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const base64Data = base64.split(',')[1] || base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}