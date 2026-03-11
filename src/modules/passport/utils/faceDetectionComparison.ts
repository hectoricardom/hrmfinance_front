import { 
  detectFace as blazeFaceDetect, 
  calculateOptimalCrop as blazeCalculateCrop,
  type FaceDetection as BlazeFaceDetection 
} from './aiFaceDetection';
import { 
  ClientSideFaceRecognition,
  type FaceRecognitionResult 
} from './clientSideFaceRecognition';
import { 
  AmazonRekognitionProcessor,
  type PassportCropCoordinates,
  type RekognitionFaceDetails 
} from './amazonRekognition';

export interface DetectionMethod {
  name: string;
  key: string;
  description: string;
  type: 'local' | 'api';
  requiresConfig: boolean;
  privacy: 'high' | 'medium' | 'low';
  cost: 'free' | 'paid' | 'freemium';
  accuracy: 'basic' | 'good' | 'excellent';
}

export interface DetectionResult {
  method: string;
  success: boolean;
  confidence: number;
  processingTime: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: Array<{ x: number; y: number; type: string }>;
  cropCoordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  validation: {
    score: number;
    issues: string[];
    warnings: string[];
  };
  metadata?: any;
  error?: string;
}

export interface ComparisonResults {
  originalImage: string;
  imageWidth: number;
  imageHeight: number;
  results: DetectionResult[];
  bestResult?: DetectionResult;
  processingTime: number;
}

export const DETECTION_METHODS: Record<string, DetectionMethod> = {
  blazeface: {
    name: 'BlazeFace (TensorFlow.js)',
    key: 'blazeface',
    description: 'Google\'s lightweight face detection model running locally',
    type: 'local',
    requiresConfig: false,
    privacy: 'high',
    cost: 'free',
    accuracy: 'good'
  },
  client: {
    name: 'Enhanced Client-Side',
    key: 'client',
    description: 'Advanced client-side recognition with pose and quality analysis',
    type: 'local',
    requiresConfig: false,
    privacy: 'high',
    cost: 'free',
    accuracy: 'good'
  },
  aws: {
    name: 'Amazon Rekognition',
    key: 'aws',
    description: 'AWS cloud-based face detection with 100+ landmarks',
    type: 'api',
    requiresConfig: true,
    privacy: 'low',
    cost: 'freemium',
    accuracy: 'excellent'
  },
  facepp: {
    name: 'Face++ API',
    key: 'facepp',
    description: 'Professional face detection with detailed analysis',
    type: 'api',
    requiresConfig: true,
    privacy: 'low',
    cost: 'freemium',
    accuracy: 'excellent'
  }
};

export class FaceDetectionComparison {
  private clientSideRecognition: ClientSideFaceRecognition;
  private awsProcessor?: AmazonRekognitionProcessor;
  
  constructor(awsConfig?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }) {
    this.clientSideRecognition = new ClientSideFaceRecognition();
    
    if (awsConfig) {
      this.awsProcessor = new AmazonRekognitionProcessor(awsConfig);
    }
  }

  async compareAllMethods(
    imageFile: File,
    selectedMethods: string[] = ['blazeface', 'client', 'aws'],
    countryCode: string = 'CU'
  ): Promise<ComparisonResults> {
    const startTime = performance.now();
    const results: DetectionResult[] = [];
    
    // Create image element for processing
    const img = await this.createImageFromFile(imageFile);
    const originalDataUrl = await this.fileToDataUrl(imageFile);
    
    // Test each selected method
    for (const methodKey of selectedMethods) {
      try {
        const result = await this.testDetectionMethod(methodKey, imageFile, img, countryCode);
        results.push(result);
      } catch (error) {
        results.push({
          method: methodKey,
          success: false,
          confidence: 0,
          processingTime: 0,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          landmarks: [],
          cropCoordinates: { x: 0, y: 0, width: 0, height: 0 },
          validation: { score: 0, issues: [], warnings: [] },
          error: error.message
        });
      }
    }
    
    const totalTime = performance.now() - startTime;
    
    // Determine best result
    const bestResult = results
      .filter(r => r.success)
      .sort((a, b) => b.validation.score - a.validation.score)[0];
    
    return {
      originalImage: originalDataUrl,
      imageWidth: img.width,
      imageHeight: img.height,
      results,
      bestResult,
      processingTime: totalTime
    };
  }

  private async testDetectionMethod(
    methodKey: string,
    imageFile: File,
    imageElement: HTMLImageElement,
    countryCode: string
  ): Promise<DetectionResult> {
    const startTime = performance.now();
    
    switch (methodKey) {
      case 'blazeface':
        return await this.testBlazeFace(imageElement, countryCode, startTime);
      
      case 'client':
        return await this.testClientSide(imageElement, countryCode, startTime);
      
      case 'aws':
        return await this.testAWSRekognition(imageFile, imageElement, countryCode, startTime);
      
      default:
        throw new Error(`Unknown detection method: ${methodKey}`);
    }
  }

  private async testBlazeFace(
    imageElement: HTMLImageElement,
    countryCode: string,
    startTime: number
  ): Promise<DetectionResult> {
    const blazeResult = await blazeFaceDetect(imageElement);
    
    if (!blazeResult) {
      throw new Error('No face detected by BlazeFace');
    }
    
    const cropInfo = blazeCalculateCrop(
      blazeResult,
      imageElement.width,
      imageElement.height,
      900 // Default size
    );
    
    // Convert BlazeFace landmarks to standard format
    const landmarks = blazeResult.landmarks?.map((point, index) => ({
      x: point[0],
      y: point[1],
      type: `landmark_${index}`
    })) || [];
    
    // Simple validation for BlazeFace
    const validation = this.validateBasicFace(blazeResult, imageElement.width, imageElement.height);
    
    return {
      method: 'blazeface',
      success: true,
      confidence: blazeResult.confidence,
      processingTime: performance.now() - startTime,
      boundingBox: {
        x: blazeResult.topLeft[0],
        y: blazeResult.topLeft[1],
        width: blazeResult.width,
        height: blazeResult.height
      },
      landmarks,
      cropCoordinates: {
        x: cropInfo.x,
        y: cropInfo.y,
        width: cropInfo.size,
        height: cropInfo.size
      },
      validation,
      metadata: {
        centerX: blazeResult.centerX,
        centerY: blazeResult.centerY,
        method: 'Google BlazeFace'
      }
    };
  }

  private async testClientSide(
    imageElement: HTMLImageElement,
    countryCode: string,
    startTime: number
  ): Promise<DetectionResult> {
    await this.clientSideRecognition.initialize();
    
    const clientResult = await this.clientSideRecognition.detectFace(imageElement);
    
    if (!clientResult) {
      throw new Error('No face detected by client-side recognition');
    }
    
    const validation = this.clientSideRecognition.validateForPassport(clientResult);
    const cropInfo = this.clientSideRecognition.calculatePassportCrop(
      clientResult,
      imageElement.width,
      imageElement.height,
      countryCode
    );
    
    return {
      method: 'client',
      success: true,
      confidence: clientResult.confidence,
      processingTime: performance.now() - startTime,
      boundingBox: clientResult.boundingBox,
      landmarks: clientResult.landmarks,
      cropCoordinates: {
        x: cropInfo.x,
        y: cropInfo.y,
        width: cropInfo.width,
        height: cropInfo.height
      },
      validation: {
        score: validation.score,
        issues: validation.issues,
        warnings: validation.warnings
      },
      metadata: {
        pose: clientResult.pose,
        quality: clientResult.quality,
        expressions: clientResult.expressions,
        method: 'Enhanced Client-Side'
      }
    };
  }

  private async testAWSRekognition(
    imageFile: File,
    imageElement: HTMLImageElement,
    countryCode: string,
    startTime: number
  ): Promise<DetectionResult> {
    if (!this.awsProcessor) {
      throw new Error('AWS Rekognition not configured');
    }
    
    const awsResult = await this.awsProcessor.processPassportPhoto(imageFile, countryCode);
    
    // Convert AWS landmarks to standard format
    const landmarks = awsResult.faceDetails.landmarks.map(landmark => ({
      x: landmark.X! * imageElement.width,
      y: landmark.Y! * imageElement.height,
      type: landmark.Type!
    }));
    
    // Convert AWS validation to standard format
    const validation = {
      score: awsResult.validation.isValid ? 85 : 45,
      issues: awsResult.validation.errors,
      warnings: awsResult.validation.warnings
    };
    
    return {
      method: 'aws',
      success: true,
      confidence: awsResult.faceDetails.confidence / 100,
      processingTime: performance.now() - startTime,
      boundingBox: {
        x: awsResult.faceDetails.boundingBox.Left! * imageElement.width,
        y: awsResult.faceDetails.boundingBox.Top! * imageElement.height,
        width: awsResult.faceDetails.boundingBox.Width! * imageElement.width,
        height: awsResult.faceDetails.boundingBox.Height! * imageElement.height
      },
      landmarks,
      cropCoordinates: {
        x: awsResult.cropCoordinates.x,
        y: awsResult.cropCoordinates.y,
        width: awsResult.cropCoordinates.width,
        height: awsResult.cropCoordinates.height
      },
      validation,
      metadata: {
        pose: awsResult.faceDetails.pose,
        quality: awsResult.faceDetails.quality,
        landmarkCount: landmarks.length,
        method: 'Amazon Rekognition'
      }
    };
  }

  private validateBasicFace(
    blazeResult: BlazeFaceDetection,
    imageWidth: number,
    imageHeight: number
  ): { score: number; issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 85; // Base score for BlazeFace
    
    // Check confidence
    if (blazeResult.confidence < 0.8) {
      warnings.push('Low detection confidence');
      score -= 10;
    }
    
    // Check face size
    const faceArea = blazeResult.width * blazeResult.height;
    const imageArea = imageWidth * imageHeight;
    const faceRatio = faceArea / imageArea;
    
    if (faceRatio < 0.02) {
      issues.push('Face too small in image');
      score -= 20;
    } else if (faceRatio > 0.6) {
      issues.push('Face too large in image');
      score -= 15;
    } else if (faceRatio < 0.05 || faceRatio > 0.4) {
      warnings.push('Face size not optimal');
      score -= 5;
    }
    
    // Check position
    const centerX = blazeResult.centerX / imageWidth;
    const centerY = blazeResult.centerY / imageHeight;
    
    if (Math.abs(centerX - 0.5) > 0.2) {
      warnings.push('Face not horizontally centered');
      score -= 5;
    }
    
    if (centerY < 0.3 || centerY > 0.7) {
      warnings.push('Face position not optimal for passport');
      score -= 5;
    }
    
    return { score: Math.max(0, score), issues, warnings };
  }

  private async createImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Create visual comparison of all detection results
  createComparisonCanvas(
    originalImage: HTMLImageElement,
    results: DetectionResult[]
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Canvas context not available');
    
    // Calculate layout (grid of images)
    const cols = Math.ceil(Math.sqrt(results.length + 1)); // +1 for original
    const rows = Math.ceil((results.length + 1) / cols);
    
    const cellWidth = 450;
    const cellHeight = 500;
    
    canvas.width = cols * cellWidth;
    canvas.height = rows * cellHeight;
    
    // Fill background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let currentCol = 0;
    let currentRow = 0;
    
    // Draw original image
    this.drawComparisonCell(
      ctx,
      originalImage,
      null,
      currentCol * cellWidth,
      currentRow * cellHeight,
      cellWidth,
      cellHeight,
      'Original Image'
    );
    
    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentRow++;
    }
    
    // Draw each detection result
    results.forEach(result => {
      if (result.success) {
        this.drawComparisonCell(
          ctx,
          originalImage,
          result,
          currentCol * cellWidth,
          currentRow * cellHeight,
          cellWidth,
          cellHeight,
          DETECTION_METHODS[result.method]?.name || result.method
        );
      } else {
        this.drawErrorCell(
          ctx,
          currentCol * cellWidth,
          currentRow * cellHeight,
          cellWidth,
          cellHeight,
          DETECTION_METHODS[result.method]?.name || result.method,
          result.error || 'Detection failed'
        );
      }
      
      currentCol++;
      if (currentCol >= cols) {
        currentCol = 0;
        currentRow++;
      }
    });
    
    return canvas;
  }

  private drawComparisonCell(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    result: DetectionResult | null,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string
  ) {
    ctx.save();
    
    // Draw cell background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Calculate image scaling to fit cell
    const padding = 40;
    const maxImageWidth = width - padding * 2;
    const maxImageHeight = height - padding * 2 - 60; // Space for title and info
    
    const scale = Math.min(
      maxImageWidth / image.width,
      maxImageHeight / image.height
    );
    
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const imageX = x + (width - scaledWidth) / 2;
    const imageY = y + padding + 40; // Space for title
    
    // Draw image
    ctx.drawImage(image, imageX, imageY, scaledWidth, scaledHeight);
    
    // Draw detection results if available
    if (result) {
      // Scale coordinates to match displayed image
      const scaleX = scaledWidth / image.width;
      const scaleY = scaledHeight / image.height;
      
      // Draw face bounding box
      ctx.strokeStyle = result.success ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        imageX + result.boundingBox.x * scaleX,
        imageY + result.boundingBox.y * scaleY,
        result.boundingBox.width * scaleX,
        result.boundingBox.height * scaleY
      );
      
      // Draw landmarks with different colors based on type
      result.landmarks.forEach(landmark => {
        const landmarkColor = this.getLandmarkColor(landmark.type, result.method);
        const landmarkSize = this.getLandmarkSize(landmark.type);
        
        ctx.fillStyle = landmarkColor;
        ctx.beginPath();
        ctx.arc(
          imageX + landmark.x * scaleX,
          imageY + landmark.y * scaleY,
          landmarkSize,
          0,
          2 * Math.PI
        );
        ctx.fill();
        
        // Add white border for visibility
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Label important landmarks
        if (this.isImportantLandmark(landmark.type)) {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 9px Arial';
          ctx.textAlign = 'center';
          const labelX = imageX + landmark.x * scaleX;
          const labelY = imageY + landmark.y * scaleY - landmarkSize - 2;
          
          // Draw background for text
          const textWidth = ctx.measureText(landmark.type).width + 4;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(labelX - textWidth/2, labelY - 10, textWidth, 12);
          
          // Draw text
          ctx.fillStyle = '#000000';
          ctx.fillText(landmark.type, labelX, labelY);
        }
      });
      
      // Draw crop area
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(
        imageX + result.cropCoordinates.x * scaleX,
        imageY + result.cropCoordinates.y * scaleY,
        result.cropCoordinates.width * scaleX,
        result.cropCoordinates.height * scaleY
      );
      ctx.setLineDash([]);
      
      // Draw face center point
      const faceCenterX = imageX + (result.boundingBox.x + result.boundingBox.width / 2) * scaleX;
      const faceCenterY = imageY + (result.boundingBox.y + result.boundingBox.height / 2) * scaleY;
      
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(faceCenterX, faceCenterY, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw coordinate system lines
      if (result.landmarks.length > 0) {
        const eyeLandmarks = result.landmarks.filter(l => 
          l.type.includes('Eye') || l.type.includes('eye')
        );
        
        if (eyeLandmarks.length >= 2) {
          // Draw eye line
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(
            imageX + eyeLandmarks[0].x * scaleX,
            imageY + eyeLandmarks[0].y * scaleY
          );
          ctx.lineTo(
            imageX + eyeLandmarks[1].x * scaleX,
            imageY + eyeLandmarks[1].y * scaleY
          );
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    
    // Draw title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + width / 2, y + 25);
    
    // Draw stats if available
    if (result && result.success) {
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      const statsY = y + height - 35;
      
      ctx.fillStyle = result.validation.score >= 80 ? '#28a745' : 
                     result.validation.score >= 60 ? '#ffc107' : '#dc3545';
      ctx.fillText(`Score: ${result.validation.score}/100`, x + 10, statsY);
      
      ctx.fillStyle = '#666666';
      ctx.fillText(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, x + 10, statsY + 12);
      ctx.fillText(`Time: ${result.processingTime.toFixed(0)}ms`, x + 10, statsY + 24);
      
      // Draw landmarks count
      ctx.textAlign = 'right';
      ctx.fillText(`${result.landmarks.length} landmarks`, x + width - 10, statsY);
    }
    
    ctx.restore();
  }

  private drawErrorCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    error: string
  ) {
    ctx.save();
    
    // Draw cell background
    ctx.fillStyle = '#fff5f5';
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + width / 2, y + 25);
    
    // Draw error icon and message
    ctx.fillStyle = '#ff0000';
    ctx.font = '48px Arial';
    ctx.fillText('❌', x + width / 2, y + height / 2 - 10);
    
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    const lines = this.wrapText(error, width - 40);
    lines.forEach((line, index) => {
      ctx.fillText(line, x + width / 2, y + height / 2 + 30 + (index * 15));
    });
    
    ctx.restore();
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (testLine.length * 7 <= maxWidth) { // Rough character width estimation
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Generate side-by-side cropped images for comparison
  async generateCroppedComparison(
    originalImage: HTMLImageElement,
    results: DetectionResult[],
    countryCode: string
  ): Promise<string[]> {
    const croppedImages: string[] = [];
    const specs = this.getCountrySpecs(countryCode);
    
    for (const result of results) {
      if (!result.success) continue;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) continue;
      
      canvas.width = specs.width;
      canvas.height = specs.height;
      
      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw cropped image
      ctx.drawImage(
        originalImage,
        result.cropCoordinates.x,
        result.cropCoordinates.y,
        result.cropCoordinates.width,
        result.cropCoordinates.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      // Add method label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, 25);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        DETECTION_METHODS[result.method]?.name || result.method,
        canvas.width / 2,
        17
      );
      
      croppedImages.push(canvas.toDataURL('image/jpeg', 0.95));
    }
    
    return croppedImages;
  }

  private getCountrySpecs(countryCode: string) {
    const specs: Record<string, { width: number; height: number }> = {
      US: { width: 600, height: 600 },
      EU: { width: 413, height: 531 },
      UK: { width: 413, height: 531 },
      CA: { width: 590, height: 826 },
      CU: { width: 900, height: 900 },
      IN: { width: 413, height: 413 },
      AU: { width: 413, height: 531 }
    };
    return specs[countryCode] || specs.CU;
  }

  private getLandmarkColor(landmarkType: string, method: string): string {
    // Color coding based on landmark importance and detection method
    const colors: Record<string, string> = {
      // Eyes - most important for passport photos
      'leftEye': '#ff0000',
      'rightEye': '#ff0000', 
      'eyeLeft': '#ff0000',
      'eyeRight': '#ff0000',
      
      // Nose - secondary importance
      'nose': '#00ff00',
      'noseTip': '#00ff00',
      'noseBase': '#00ff00',
      
      // Mouth - tertiary importance
      'mouth': '#0000ff',
      'mouthCenter': '#0000ff',
      'mouthLeft': '#0080ff',
      'mouthRight': '#0080ff',
      'upperLip': '#4040ff',
      'lowerLip': '#4040ff',
      
      // Ears
      'leftEar': '#ff8000',
      'rightEar': '#ff8000',
      
      // Eyebrows
      'leftEyebrow': '#800080',
      'rightEyebrow': '#800080',
      
      // Chin and face outline
      'chin': '#ffff00',
      'jawline': '#ffff00',
      
      // Default for unknown landmarks
      'default': '#ffffff'
    };
    
    // Method-specific color adjustments
    if (method === 'aws') {
      // AWS has more landmarks, use more varied colors
      return colors[landmarkType.toLowerCase()] || colors[landmarkType] || '#ff69b4';
    } else if (method === 'client') {
      // Enhanced client-side, use brighter colors
      const baseColor = colors[landmarkType.toLowerCase()] || colors[landmarkType] || '#00ffff';
      return baseColor;
    } else {
      // BlazeFace - simpler color scheme
      return colors[landmarkType] || '#ffff00';
    }
  }

  private getLandmarkSize(landmarkType: string): number {
    // Size based on landmark importance
    const importantLandmarks = ['leftEye', 'rightEye', 'eyeLeft', 'eyeRight', 'nose', 'noseTip'];
    const secondaryLandmarks = ['mouth', 'mouthCenter', 'mouthLeft', 'mouthRight'];
    
    if (importantLandmarks.some(type => landmarkType.toLowerCase().includes(type.toLowerCase()))) {
      return 5; // Larger for eyes and nose
    } else if (secondaryLandmarks.some(type => landmarkType.toLowerCase().includes(type.toLowerCase()))) {
      return 4; // Medium for mouth
    } else {
      return 3; // Smaller for other landmarks
    }
  }

  private isImportantLandmark(landmarkType: string): boolean {
    const important = [
      'leftEye', 'rightEye', 'eyeLeft', 'eyeRight', 
      'nose', 'noseTip', 'mouth', 'mouthCenter'
    ];
    return important.some(type => 
      landmarkType.toLowerCase().includes(type.toLowerCase())
    );
  }
}