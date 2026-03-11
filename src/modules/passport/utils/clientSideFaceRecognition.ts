import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { devLog } from '../../../services/utils';

export interface FaceRecognitionResult {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: Array<{ x: number; y: number; type: string }>;
  confidence: number;
  pose: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  quality: {
    brightness: number;
    sharpness: number;
    blur: number;
  };
  expressions: {
    neutral: number;
    smile: number;
    eyesClosed: number;
  };
}

export interface PassportValidation {
  isValid: boolean;
  score: number;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export class ClientSideFaceRecognition {
  private blazeFaceModel: blazeface.BlazeFaceModel | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      devLog('Loading TensorFlow.js models...');
      
      // Initialize TensorFlow backend
      await tf.ready();
      devLog('TensorFlow.js backend initialized');
      
      // Load BlazeFace model
      this.blazeFaceModel = await blazeface.load();
      devLog('BlazeFace model loaded');
      
      this.initialized = true;
    } catch (error) {
      devLog('Failed to initialize face recognition:', error);
      throw error;
    }
  }

  async detectFace(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<FaceRecognitionResult | null> {
    if (!this.initialized || !this.blazeFaceModel) {
      await this.initialize();
    }

    try {
      const predictions = await this.blazeFaceModel!.estimateFaces(imageElement, false);
      
      if (predictions.length === 0) {
        return null;
      }

      // Use the most confident face
      const face = predictions[0];
      const [x1, y1] = face.topLeft as [number, number];
      const [x2, y2] = face.bottomRight as [number, number];
      
      const width = x2 - x1;
      const height = y2 - y1;
      
      // Convert BlazeFace landmarks to named landmarks
      const landmarks = this.convertBlazeFaceLandmarks(face.landmarks as number[][]);
      
      // Calculate pose estimation from landmarks
      const pose = this.estimatePose(landmarks);
      
      // Analyze image quality
      const quality = this.analyzeImageQuality(imageElement, { x: x1, y: y1, width, height });
      
      // Detect expressions
      const expressions = this.detectExpressions(landmarks);

      return {
        boundingBox: {
          x: x1,
          y: y1,
          width,
          height
        },
        landmarks,
        confidence: face.probability?.[0] || 0.95,
        pose,
        quality,
        expressions
      };
    } catch (error) {
      devLog('Face detection error:', error);
      return null;
    }
  }

  private convertBlazeFaceLandmarks(landmarks: number[][]): Array<{ x: number; y: number; type: string }> {
    // BlazeFace provides 6 keypoints: [right_eye, left_eye, nose_tip, mouth_center, right_ear_tragion, left_ear_tragion]
    const landmarkTypes = ['rightEye', 'leftEye', 'noseTip', 'mouthCenter', 'rightEar', 'leftEar'];
    
    return landmarks.map((point, index) => ({
      x: point[0],
      y: point[1],
      type: landmarkTypes[index] || `landmark_${index}`
    }));
  }

  private estimatePose(landmarks: Array<{ x: number; y: number; type: string }>): { yaw: number; pitch: number; roll: number } {
    const leftEye = landmarks.find(l => l.type === 'leftEye');
    const rightEye = landmarks.find(l => l.type === 'rightEye');
    const nose = landmarks.find(l => l.type === 'noseTip');
    const mouth = landmarks.find(l => l.type === 'mouthCenter');

    let yaw = 0, pitch = 0, roll = 0;

    if (leftEye && rightEye) {
      // Calculate roll (head tilt) from eye line angle
      const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
      roll = (eyeAngle * 180) / Math.PI;
      
      // Estimate yaw from eye symmetry
      const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
      if (nose) {
        const noseOffset = nose.x - eyeCenter.x;
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        yaw = (noseOffset / eyeDistance) * 30; // Rough estimation
      }
      
      // Estimate pitch from eye-mouth vertical relationship
      if (mouth) {
        const expectedMouthY = eyeCenter.y + Math.abs(rightEye.x - leftEye.x) * 0.7;
        const mouthOffset = mouth.y - expectedMouthY;
        pitch = (mouthOffset / Math.abs(rightEye.x - leftEye.x)) * 20;
      }
    }

    return { yaw, pitch, roll };
  }

  private analyzeImageQuality(
    imageElement: HTMLImageElement | HTMLCanvasElement,
    faceBox: { x: number; y: number; width: number; height: number }
  ): { brightness: number; sharpness: number; blur: number } {
    // Create canvas to analyze face region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return { brightness: 50, sharpness: 50, blur: 50 };
    }

    canvas.width = faceBox.width;
    canvas.height = faceBox.height;
    
    // Draw face region
    ctx.drawImage(
      imageElement,
      faceBox.x, faceBox.y, faceBox.width, faceBox.height,
      0, 0, faceBox.width, faceBox.height
    );

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate brightness (average luminance)
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Calculate luminance using standard weights
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += luminance;
    }
    const brightness = totalBrightness / (data.length / 4);

    // Calculate sharpness using Laplacian variance
    const sharpness = this.calculateLaplacianVariance(imageData);
    
    // Estimate blur (inverse of sharpness)
    const blur = Math.max(0, 100 - sharpness);

    return {
      brightness: Math.round((brightness / 255) * 100),
      sharpness: Math.round(Math.min(100, sharpness / 10)),
      blur: Math.round(blur)
    };
  }

  private calculateLaplacianVariance(imageData: ImageData): number {
    const { data, width, height } = imageData;
    
    // Convert to grayscale first
    const gray = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const grayValue = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[i / 4] = grayValue;
    }

    // Apply Laplacian kernel
    const laplacian = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const value = 
          -1 * gray[idx - width - 1] + -1 * gray[idx - width] + -1 * gray[idx - width + 1] +
          -1 * gray[idx - 1] + 8 * gray[idx] + -1 * gray[idx + 1] +
          -1 * gray[idx + width - 1] + -1 * gray[idx + width] + -1 * gray[idx + width + 1];
        laplacian.push(value);
      }
    }

    // Calculate variance
    const mean = laplacian.reduce((a, b) => a + b, 0) / laplacian.length;
    const variance = laplacian.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / laplacian.length;
    
    return Math.sqrt(variance);
  }

  private detectExpressions(landmarks: Array<{ x: number; y: number; type: string }>): { neutral: number; smile: number; eyesClosed: number } {
    const leftEye = landmarks.find(l => l.type === 'leftEye');
    const rightEye = landmarks.find(l => l.type === 'rightEye');
    const mouth = landmarks.find(l => l.type === 'mouthCenter');

    // Simple heuristics for expression detection
    let smile = 0;
    let eyesClosed = 0;
    let neutral = 80; // Default to mostly neutral

    // Basic smile detection (would need more sophisticated analysis in real implementation)
    if (mouth && leftEye && rightEye) {
      const eyeLevel = (leftEye.y + rightEye.y) / 2;
      const mouthDistance = Math.abs(mouth.y - eyeLevel);
      const eyeDistance = Math.abs(rightEye.x - leftEye.x);
      
      // If mouth is relatively high compared to eyes, might be smiling
      const mouthRatio = mouthDistance / eyeDistance;
      if (mouthRatio > 0.8) {
        smile = 20;
        neutral = 60;
      }
    }

    return { neutral, smile, eyesClosed };
  }

  validateForPassport(faceResult: FaceRecognitionResult): PassportValidation {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check confidence
    if (faceResult.confidence < 0.85) {
      issues.push('Face detection confidence too low');
      score -= 20;
    } else if (faceResult.confidence < 0.95) {
      warnings.push('Face detection confidence could be higher');
      score -= 5;
    }

    // Check pose
    if (Math.abs(faceResult.pose.yaw) > 15) {
      issues.push('Head turned too much to the side');
      score -= 25;
    } else if (Math.abs(faceResult.pose.yaw) > 8) {
      warnings.push('Head slightly turned - try to face camera directly');
      score -= 10;
    }

    if (Math.abs(faceResult.pose.pitch) > 15) {
      issues.push('Head tilted too much up/down');
      score -= 25;
    } else if (Math.abs(faceResult.pose.pitch) > 8) {
      warnings.push('Head slightly tilted - keep level');
      score -= 10;
    }

    if (Math.abs(faceResult.pose.roll) > 10) {
      issues.push('Head rotated too much');
      score -= 20;
    } else if (Math.abs(faceResult.pose.roll) > 5) {
      warnings.push('Head slightly rotated');
      score -= 5;
    }

    // Check image quality
    if (faceResult.quality.brightness < 30) {
      issues.push('Image too dark');
      score -= 20;
      recommendations.push('Increase lighting or use flash');
    } else if (faceResult.quality.brightness > 85) {
      issues.push('Image too bright/overexposed');
      score -= 20;
      recommendations.push('Reduce lighting or move away from bright light');
    } else if (faceResult.quality.brightness < 40 || faceResult.quality.brightness > 75) {
      warnings.push('Brightness not optimal');
      score -= 5;
    }

    if (faceResult.quality.sharpness < 30) {
      issues.push('Image too blurry');
      score -= 25;
      recommendations.push('Ensure camera is focused and steady');
    } else if (faceResult.quality.sharpness < 50) {
      warnings.push('Image could be sharper');
      score -= 10;
      recommendations.push('Ensure good focus and minimize movement');
    }

    if (faceResult.quality.blur > 70) {
      issues.push('Excessive motion blur detected');
      score -= 30;
      recommendations.push('Keep very still during capture');
    }

    // Check expressions
    if (faceResult.expressions.smile > 30) {
      warnings.push('Slight smile detected - maintain neutral expression');
      score -= 5;
    }

    if (faceResult.expressions.eyesClosed > 20) {
      issues.push('Eyes appear closed or partially closed');
      score -= 30;
      recommendations.push('Keep eyes open and look directly at camera');
    }

    // Check face size (should be prominent in image)
    const imageArea = faceResult.boundingBox.width * faceResult.boundingBox.height;
    const totalArea = 1; // Normalized to image area
    const faceRatio = Math.sqrt(imageArea / totalArea);
    
    if (faceRatio < 0.15) {
      issues.push('Face too small in image');
      score -= 20;
      recommendations.push('Move closer to camera');
    } else if (faceRatio > 0.8) {
      issues.push('Face too large in image');
      score -= 15;
      recommendations.push('Move further from camera');
    } else if (faceRatio < 0.25 || faceRatio > 0.6) {
      warnings.push('Face size not optimal for passport photo');
      score -= 5;
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues,
      warnings,
      recommendations
    };
  }

  calculatePassportCrop(
    faceResult: FaceRecognitionResult,
    imageWidth: number,
    imageHeight: number,
    countryCode: string = 'US'
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  } {
    const specs = this.getCountrySpecs(countryCode);
    const { boundingBox, landmarks } = faceResult;
    
    // Find eye landmarks
    const leftEye = landmarks.find(l => l.type === 'leftEye');
    const rightEye = landmarks.find(l => l.type === 'rightEye');
    
    let eyeLevel = boundingBox.y + boundingBox.height * 0.3; // Default
    if (leftEye && rightEye) {
      eyeLevel = (leftEye.y + rightEye.y) / 2;
    }
    
    // Calculate required crop size based on face size and passport requirements
    const faceHeight = boundingBox.height;
    const requiredCropHeight = faceHeight / specs.faceHeightRatio;
    const requiredCropWidth = requiredCropHeight * specs.aspectRatio;
    
    // Position crop so eyes are at proper position from top
    const cropY = eyeLevel - (requiredCropHeight * specs.eyePosition);
    const cropX = (boundingBox.x + boundingBox.width / 2) - (requiredCropWidth / 2);
    
    // Ensure crop stays within bounds
    const finalX = Math.max(0, Math.min(cropX, imageWidth - requiredCropWidth));
    const finalY = Math.max(0, Math.min(cropY, imageHeight - requiredCropHeight));
    const finalWidth = Math.min(requiredCropWidth, imageWidth - finalX);
    const finalHeight = Math.min(requiredCropHeight, imageHeight - finalY);
    
    return {
      x: Math.round(finalX),
      y: Math.round(finalY),
      width: Math.round(finalWidth),
      height: Math.round(finalHeight),
      scale: specs.outputWidth / finalWidth
    };
  }

  private getCountrySpecs(countryCode: string) {
    const specs: Record<string, any> = {
      US: {
        aspectRatio: 1,
        faceHeightRatio: 0.625,
        eyePosition: 0.35,
        outputWidth: 600,
        outputHeight: 600
      },
      EU: {
        aspectRatio: 0.778,
        faceHeightRatio: 0.75,
        eyePosition: 0.38,
        outputWidth: 413,
        outputHeight: 531
      },
      UK: {
        aspectRatio: 0.778,
        faceHeightRatio: 0.75,
        eyePosition: 0.38,
        outputWidth: 413,
        outputHeight: 531
      },
      CU: {
        aspectRatio: 1,
        faceHeightRatio: 0.75,
        eyePosition: 0.4,
        outputWidth: 900,
        outputHeight: 900
      },
      CA: {
        aspectRatio: 0.714,
        faceHeightRatio: 0.75,
        eyePosition: 0.38,
        outputWidth: 590,
        outputHeight: 826
      },
      IN: {
        aspectRatio: 1,
        faceHeightRatio: 0.75,
        eyePosition: 0.4,
        outputWidth: 413,
        outputHeight: 413
      },
      AU: {
        aspectRatio: 0.778,
        faceHeightRatio: 0.75,
        eyePosition: 0.38,
        outputWidth: 413,
        outputHeight: 531
      }
    };
    
    return specs[countryCode] || specs.US;
  }

  drawDebugOverlay(
    ctx: CanvasRenderingContext2D,
    faceResult: FaceRecognitionResult,
    cropInfo: { x: number; y: number; width: number; height: number }
  ): void {
    ctx.save();
    
    // Draw face bounding box
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      faceResult.boundingBox.x,
      faceResult.boundingBox.y,
      faceResult.boundingBox.width,
      faceResult.boundingBox.height
    );
    
    // Draw landmarks
    ctx.fillStyle = '#ffff00';
    faceResult.landmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(landmark.x, landmark.y, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Label important landmarks
      if (['leftEye', 'rightEye', 'noseTip', 'mouthCenter'].includes(landmark.type)) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(landmark.type, landmark.x + 5, landmark.y - 5);
        ctx.fillStyle = '#ffff00';
      }
    });
    
    // Draw crop area
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(cropInfo.x, cropInfo.y, cropInfo.width, cropInfo.height);
    
    // Draw center lines
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(cropInfo.x + cropInfo.width / 2, cropInfo.y);
    ctx.lineTo(cropInfo.x + cropInfo.width / 2, cropInfo.y + cropInfo.height);
    ctx.stroke();
    
    // Eye level guideline (at 35-40% from top)
    const eyeGuideline = cropInfo.y + cropInfo.height * 0.375;
    ctx.beginPath();
    ctx.moveTo(cropInfo.x, eyeGuideline);
    ctx.lineTo(cropInfo.x + cropInfo.width, eyeGuideline);
    ctx.stroke();
    
    // Info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 280, 140);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Arial';
    let y = 25;
    ctx.fillText(`Confidence: ${(faceResult.confidence * 100).toFixed(1)}%`, 15, y);
    y += 15;
    ctx.fillText(`Pose: Y:${faceResult.pose.yaw.toFixed(1)}° P:${faceResult.pose.pitch.toFixed(1)}° R:${faceResult.pose.roll.toFixed(1)}°`, 15, y);
    y += 15;
    ctx.fillText(`Quality: B:${faceResult.quality.brightness} S:${faceResult.quality.sharpness} Blur:${faceResult.quality.blur}`, 15, y);
    y += 15;
    ctx.fillText(`Expression: N:${faceResult.expressions.neutral}% S:${faceResult.expressions.smile}%`, 15, y);
    y += 15;
    ctx.fillText(`Face Size: ${faceResult.boundingBox.width.toFixed(0)}×${faceResult.boundingBox.height.toFixed(0)}px`, 15, y);
    y += 15;
    ctx.fillText(`Crop Area: ${cropInfo.width}×${cropInfo.height}px`, 15, y);
    y += 15;
    ctx.fillText(`Landmarks: ${faceResult.landmarks.length} detected`, 15, y);
    
    ctx.restore();
  }

  // Real-time validation for live camera feed
  async validateLiveFeed(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<{
    faceDetected: boolean;
    validation?: PassportValidation;
    faceResult?: FaceRecognitionResult;
  }> {
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return { faceDetected: false };

    // Draw current video frame
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    // Detect face
    const faceResult = await this.detectFace(canvasElement);
    
    if (!faceResult) {
      return { faceDetected: false };
    }

    // Validate for passport
    const validation = this.validateForPassport(faceResult);
    
    return {
      faceDetected: true,
      validation,
      faceResult
    };
  }
}