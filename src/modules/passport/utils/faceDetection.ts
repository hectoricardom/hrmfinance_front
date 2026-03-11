/**
 * Face detection utilities for passport photo processing
 * Note: In production, you would need to install and import face-api.js
 * npm install face-api.js
 */

export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouth: { x: number; y: number };
  leftEar?: { x: number; y: number };
  rightEar?: { x: number; y: number };
  chin?: { x: number; y: number };
}

export interface FaceDetectionResult {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: FaceLandmarks;
  confidence: number;
  angle?: number; // Face rotation angle
}

/**
 * Calculate optimal crop area for passport photo based on face detection
 */
export const calculatePassportCrop = (
  faceBox: FaceDetectionResult['box'],
  imageWidth: number,
  imageHeight: number,
  outputSize: number = 900
): {
  x: number;
  y: number;
  size: number;
} => {
  // ICAO standards: face should be 70-80% of photo height
  const FACE_HEIGHT_RATIO = 0.75;
  const TOP_MARGIN_RATIO = 0.1; // 10% space above head
  
  // Calculate required crop size based on face height
  const requiredCropSize = faceBox.height / FACE_HEIGHT_RATIO;
  
  // Center horizontally on face
  const faceCenterX = faceBox.x + faceBox.width / 2;
  let cropX = faceCenterX - requiredCropSize / 2;
  
  // Position vertically with proper head room
  const topMargin = requiredCropSize * TOP_MARGIN_RATIO;
  let cropY = faceBox.y - topMargin;
  
  // Ensure crop stays within image bounds
  cropX = Math.max(0, Math.min(cropX, imageWidth - requiredCropSize));
  cropY = Math.max(0, Math.min(cropY, imageHeight - requiredCropSize));
  
  // If the calculated crop is larger than the image, scale down
  const maxCropSize = Math.min(imageWidth, imageHeight);
  const finalCropSize = Math.min(requiredCropSize, maxCropSize);
  
  return {
    x: cropX,
    y: cropY,
    size: finalCropSize
  };
};

/**
 * Validate if face position meets passport photo requirements
 */
export const validatePassportFace = (
  face: FaceDetectionResult,
  imageWidth: number,
  imageHeight: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check face size (should be at least 200px for good quality)
  if (face.box.height < 200) {
    errors.push('El rostro es muy pequeño. Acérquese a la cámara.');
  }
  
  // Check face position (should be roughly centered)
  const faceCenterX = face.box.x + face.box.width / 2;
  const imageCenterX = imageWidth / 2;
  const horizontalOffset = Math.abs(faceCenterX - imageCenterX) / imageWidth;
  
  if (horizontalOffset > 0.2) {
    warnings.push('El rostro no está centrado. Ajuste su posición.');
  }
  
  // Check if face is too close to edges
  const marginRatio = 0.1;
  const minMargin = Math.min(imageWidth, imageHeight) * marginRatio;
  
  if (face.box.x < minMargin || 
      face.box.x + face.box.width > imageWidth - minMargin ||
      face.box.y < minMargin) {
    warnings.push('El rostro está muy cerca del borde.');
  }
  
  // Check face angle if available
  if (face.angle !== undefined && Math.abs(face.angle) > 15) {
    errors.push('Mantenga la cabeza recta, sin inclinarla.');
  }
  
  // Check confidence
  if (face.confidence < 0.8) {
    warnings.push('Detección de rostro débil. Mejore la iluminación.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Apply passport photo color corrections
 */
export const applyPassportPhotoCorrections = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Calculate image statistics
  let totalBrightness = 0;
  let minBrightness = 255;
  let maxBrightness = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    totalBrightness += brightness;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }
  
  const avgBrightness = totalBrightness / (data.length / 4);
  
  // Auto-adjust brightness and contrast
  let brightnessAdjust = 0;
  let contrastAdjust = 1.0;
  
  // If image is too dark
  if (avgBrightness < 100) {
    brightnessAdjust = 20;
    contrastAdjust = 1.2;
  }
  // If image is too bright
  else if (avgBrightness > 180) {
    brightnessAdjust = -10;
    contrastAdjust = 1.1;
  }
  // If low contrast
  else if (maxBrightness - minBrightness < 100) {
    contrastAdjust = 1.3;
  }
  
  // Apply corrections
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast and brightness
    data[i] = clamp((data[i] - 128) * contrastAdjust + 128 + brightnessAdjust);
    data[i + 1] = clamp((data[i + 1] - 128) * contrastAdjust + 128 + brightnessAdjust);
    data[i + 2] = clamp((data[i + 2] - 128) * contrastAdjust + 128 + brightnessAdjust);
    
    // Slight warm tone for skin
    data[i] = clamp(data[i] * 1.02); // Red
    data[i + 2] = clamp(data[i + 2] * 0.98); // Blue
  }
  
  ctx.putImageData(imageData, 0, 0);
};

const clamp = (value: number): number => {
  return Math.max(0, Math.min(255, Math.round(value)));
};

/**
 * Draw face detection guides on canvas
 */
export const drawFaceGuides = (
  ctx: CanvasRenderingContext2D,
  face: FaceDetectionResult,
  isValid: boolean
) => {
  const { box } = face;
  
  // Draw face box
  ctx.strokeStyle = isValid ? '#4CAF50' : '#FF5252';
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  
  // Draw center crosshair
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  
  ctx.beginPath();
  ctx.moveTo(centerX - 20, centerY);
  ctx.lineTo(centerX + 20, centerY);
  ctx.moveTo(centerX, centerY - 20);
  ctx.lineTo(centerX, centerY + 20);
  ctx.stroke();
  
  // Draw landmarks if available
  if (face.landmarks) {
    ctx.fillStyle = isValid ? '#4CAF50' : '#FF5252';
    
    // Draw eyes
    drawPoint(ctx, face.landmarks.leftEye.x, face.landmarks.leftEye.y, 3);
    drawPoint(ctx, face.landmarks.rightEye.x, face.landmarks.rightEye.y, 3);
    
    // Draw nose
    drawPoint(ctx, face.landmarks.nose.x, face.landmarks.nose.y, 3);
    
    // Draw mouth
    drawPoint(ctx, face.landmarks.mouth.x, face.landmarks.mouth.y, 3);
  }
  
  // Draw confidence text
  ctx.fillStyle = isValid ? '#4CAF50' : '#FF5252';
  ctx.font = '14px Arial';
  ctx.fillText(
    `Confianza: ${Math.round(face.confidence * 100)}%`,
    box.x,
    box.y - 10
  );
};

const drawPoint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
};

/**
 * Passport photo specifications for different countries
 */
export const PASSPORT_SPECS = {
  USA: {
    width: 600,
    height: 600,
    dpi: 300,
    format: 'jpeg',
    background: '#FFFFFF',
    faceHeightRatio: 0.69
  },
  CUBA: {
    width: 900,
    height: 900,
    dpi: 300,
    format: 'jpeg',
    background: '#FFFFFF',
    faceHeightRatio: 0.75
  },
  EU: {
    width: 413,
    height: 531,
    dpi: 300,
    format: 'jpeg',
    background: '#EFEFEF',
    faceHeightRatio: 0.75
  }
};