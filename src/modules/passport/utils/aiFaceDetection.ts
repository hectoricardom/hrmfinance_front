import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { devLog } from '../../../services/utils';

export interface FaceDetection {
  topLeft: [number, number];
  bottomRight: [number, number];
  landmarks?: Array<[number, number]>;
  confidence: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

let model: blazeface.BlazeFaceModel | null = null;

export const loadFaceDetectionModel = async (): Promise<blazeface.BlazeFaceModel> => {
  if (model) return model;
  
  devLog('Loading BlazeFace model...');
  
  // Initialize TensorFlow.js backend
  await tf.ready();
  
  // Load the BlazeFace model
  model = await blazeface.load();
  devLog('BlazeFace model loaded successfully');
  
  return model;
};

export const detectFace = async (imageElement: HTMLImageElement): Promise<FaceDetection | null> => {
  try {
    const faceModel = await loadFaceDetectionModel();
    
    // Convert image to tensor
    const predictions = await faceModel.estimateFaces(imageElement, false);
    
    if (predictions.length === 0) {
      devLog('No faces detected in image');
      return null;
    }
    
    // Use the first (most confident) face detection
    const face = predictions[0];
    const [topLeftX, topLeftY] = face.topLeft as [number, number];
    const [bottomRightX, bottomRightY] = face.bottomRight as [number, number];
    
    const width = bottomRightX - topLeftX;
    const height = bottomRightY - topLeftY;
    const centerX = topLeftX + width / 2;
    const centerY = topLeftY + height / 2;
    
    const detection: FaceDetection = {
      topLeft: [topLeftX, topLeftY],
      bottomRight: [bottomRightX, bottomRightY],
      landmarks: face.landmarks as Array<[number, number]>,
      confidence: face.probability?.[0] || 0.9, // BlazeFace doesn't always provide probability
      centerX,
      centerY,
      width,
      height
    };
    
    devLog('Face detected:', detection);
    return detection;
    
  } catch (error) {
    devLog('Error detecting face:', error);
    return null;
  }
};

export const calculateOptimalCrop = (
  face: FaceDetection,
  imageWidth: number,
  imageHeight: number,
  targetSize: number = 900
): { x: number; y: number; size: number } => {
  // Calculate crop size based on face size
  // For passport photos, face should be about 70-80% of the final image
  const faceToImageRatio = 0.75;
  const cropSize = Math.max(face.width, face.height) / faceToImageRatio;
  
  // Ensure crop size doesn't exceed image bounds and has minimum size
  const maxCropSize = Math.min(imageWidth, imageHeight);
  const minCropSize = Math.max(face.width * 1.5, face.height * 1.8); // Minimum padding around face
  const finalCropSize = Math.min(maxCropSize, Math.max(minCropSize, cropSize));
  
  // Calculate crop position to center the face optimally for passport photo
  // Face should be slightly above center (eyes at about 40% from top)
  const eyeY = face.landmarks ? getEyeLevel(face.landmarks) : face.centerY - face.height * 0.2;
  
  // Position the crop so that eye level is at 40% from the top of the crop area
  const cropY = eyeY - finalCropSize * 0.4;
  const cropX = face.centerX - finalCropSize / 2;
  
  // Ensure crop stays within image bounds
  const boundedX = Math.max(0, Math.min(cropX, imageWidth - finalCropSize));
  const boundedY = Math.max(0, Math.min(cropY, imageHeight - finalCropSize));
  
  return {
    x: boundedX,
    y: boundedY,
    size: finalCropSize
  };
};

// Helper function to calculate eye level from landmarks
const getEyeLevel = (landmarks: Array<[number, number]>): number => {
  // BlazeFace provides 6 keypoints: [right_eye, left_eye, nose_tip, mouth_center, right_ear_tragion, left_ear_tragion]
  if (landmarks.length >= 2) {
    const rightEye = landmarks[0];
    const leftEye = landmarks[1];
    return (rightEye[1] + leftEye[1]) / 2; // Average Y coordinate of both eyes
  }
  return 0;
};

export const drawFaceDetectionMarkers = (
  ctx: CanvasRenderingContext2D,
  face: FaceDetection,
  cropInfo: { x: number; y: number; size: number },
  imageWidth: number,
  imageHeight: number
): void => {
  ctx.save();
  
  // Draw detected face boundary
  ctx.strokeStyle = '#00ff00'; // Green
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.strokeRect(face.topLeft[0], face.topLeft[1], face.width, face.height);
  
  // Draw face center point
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.arc(face.centerX, face.centerY, 5, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw crop area that was used
  ctx.strokeStyle = '#ff0000'; // Red
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(cropInfo.x, cropInfo.y, cropInfo.size, cropInfo.size);
  
  // Draw landmarks if available
  if (face.landmarks) {
    ctx.fillStyle = '#ffff00'; // Yellow
    face.landmarks.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Highlight eyes specifically
    if (face.landmarks.length >= 2) {
      ctx.fillStyle = '#ff00ff'; // Magenta for eyes
      for (let i = 0; i < 2; i++) {
        const [x, y] = face.landmarks[i];
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
  
  // Add info text
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 250, 100);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.fillText(`Face Confidence: ${(face.confidence * 100).toFixed(1)}%`, 15, 30);
  ctx.fillText(`Face Center: (${Math.round(face.centerX)}, ${Math.round(face.centerY)})`, 15, 50);
  ctx.fillText(`Face Size: ${Math.round(face.width)} x ${Math.round(face.height)}`, 15, 70);
  ctx.fillText(`Crop: (${Math.round(cropInfo.x)}, ${Math.round(cropInfo.y)}, ${Math.round(cropInfo.size)})`, 15, 90);
  
  ctx.restore();
};