import { Component, createSignal, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { Card, Button } from '../../ui';
import { devLog } from '../../../services/utils';
import { 
  detectFace as blazeFaceDetect, 
  calculateOptimalCrop as blazeCalculateCrop,
  type FaceDetection as BlazeFaceDetection 
} from '../utils/aiFaceDetection';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PassportPhotoFinalProps {
  onPhotoReady?: (photoUrl: string, metadata: any) => void;
  countryCode?: string;
}

const PassportPhotoFinal: Component<PassportPhotoFinalProps> = (props) => {
  // Canvas refs
  let canvasRef: HTMLCanvasElement | undefined;
  let overlayCanvasRef: HTMLCanvasElement | undefined;
  
  // Core state
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [originalPreview, setOriginalPreview] = createSignal<string>('');
  const [processing, setProcessing] = createSignal(false);
  const [image, setImage] = createSignal<HTMLImageElement | null>(null);
  const [faceDetection, setFaceDetection] = createSignal<BlazeFaceDetection | null>(null);
  
  // Crop state
  const [cropArea, setCropArea] = createSignal<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [zoom, setZoom] = createSignal(1);
  const [panOffset, setPanOffset] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = createSignal<string>('');
  const [croppedPreview, setCroppedPreview] = createSignal<string>('');
  
  // Controls
  const [showGuides, setShowGuides] = createSignal(true);
  const [showLandmarks, setShowLandmarks] = createSignal(true);
  const [cropPadding, setCropPadding] = createSignal(20);
  
  const countryCode = props.countryCode || 'CU';
  const minCropSize = 100;

  const getCountryOutputSize = () => {
    const specs: Record<string, { width: number; height: number }> = {
      US: { width: 600, height: 600 },
      EU: { width: 600, height: 600 }, // Force square for now
      CU: { width: 600, height: 600 },
      UK: { width: 600, height: 600 }, // Force square for now
      CA: { width: 600, height: 600 }, // Force square for now
      IN: { width: 600, height: 600 },
      AU: { width: 600, height: 600 }  // Force square for now
    };
    return specs[countryCode] || { width: 600, height: 600 };
  };

  const getOriginalCoordinates = (canvasCrop: CropArea): CropArea => {
    if (!image() || !canvasRef) return canvasCrop;
    
    const img = image()!;
    const scaleX = img.width / canvasRef.width;
    const scaleY = img.height / canvasRef.height;
    
    return {
      x: canvasCrop.x * scaleX,
      y: canvasCrop.y * scaleY,
      width: canvasCrop.width * scaleX,
      height: canvasCrop.height * scaleY
    };
  };

  const updateCroppedPreview = () => {
    if (!image() || !canvasRef) return;
    
    const img = image()!;
    const originalCrop = getOriginalCoordinates(cropArea());
    
    devLog('🖼️ CROP PREVIEW UPDATE:', {
      originalImageSize: { width: img.width, height: img.height },
      canvasSize: { width: canvasRef.width, height: canvasRef.height },
      canvasCrop: cropArea(),
      originalCrop: originalCrop,
      scaleFactors: {
        x: img.width / canvasRef.width,
        y: img.height / canvasRef.height
      }
    });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const outputSize = getCountryOutputSize();
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;
    
    devLog('📐 OUTPUT CANVAS:', outputSize);
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cropped image from ORIGINAL image coordinates
    ctx.drawImage(
      img,
      originalCrop.x, originalCrop.y, originalCrop.width, originalCrop.height,
      0, 0, canvas.width, canvas.height
    );
    
    devLog('✂️ CROP APPLIED:', {
      source: { x: originalCrop.x, y: originalCrop.y, width: originalCrop.width, height: originalCrop.height },
      destination: { x: 0, y: 0, width: canvas.width, height: canvas.height }
    });
    
    setCroppedPreview(canvas.toDataURL('image/jpeg', 0.95));
  };

  const drawCropOverlay = (ctx: CanvasRenderingContext2D) => {
    const crop = cropArea();
    const canvas = ctx.canvas;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(crop.x, crop.y, crop.width, crop.height);
    ctx.globalCompositeOperation = 'source-over';
    
    // Crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(crop.x + 1, crop.y + 1, crop.width - 2, crop.height - 2);
    
    // Guidelines
    if (showGuides()) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      const thirdWidth = crop.width / 3;
      const thirdHeight = crop.height / 3;
      
      // Rule of thirds
      ctx.beginPath();
      ctx.moveTo(crop.x + thirdWidth, crop.y);
      ctx.lineTo(crop.x + thirdWidth, crop.y + crop.height);
      ctx.moveTo(crop.x + thirdWidth * 2, crop.y);
      ctx.lineTo(crop.x + thirdWidth * 2, crop.y + crop.height);
      
      ctx.moveTo(crop.x, crop.y + thirdHeight);
      ctx.lineTo(crop.x + crop.width, crop.y + thirdHeight);
      ctx.moveTo(crop.x, crop.y + thirdHeight * 2);
      ctx.lineTo(crop.x + crop.width, crop.y + thirdHeight * 2);
      ctx.stroke();
      
      // Eye level guideline
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      const eyeLevel = crop.y + crop.height * 0.375;
      ctx.beginPath();
      ctx.moveTo(crop.x, eyeLevel);
      ctx.lineTo(crop.x + crop.width, eyeLevel);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Face landmarks
    if (showLandmarks() && faceDetection()) {
      const detection = faceDetection()!;
      const img = image()!;
      const scaleX = canvasRef!.width / img.width;
      const scaleY = canvasRef!.height / img.height;
      
      // Draw face bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        detection.topLeft[0] * scaleX,
        detection.topLeft[1] * scaleY,
        detection.width * scaleX,
        detection.height * scaleY
      );
      
      // Draw landmarks
      if (detection.landmarks) {
        detection.landmarks.forEach((landmark, index) => {
          const x = landmark[0] * scaleX;
          const y = landmark[1] * scaleY;
          
          // Different colors for different landmark types
          const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
          ctx.fillStyle = colors[index % colors.length];
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // White border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
      
      // Center point
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(detection.centerX * scaleX, detection.centerY * scaleY, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Resize handles
    const handleSize = 12;
    const handles = [
      { x: crop.x - handleSize/2, y: crop.y - handleSize/2, type: 'nw' },
      { x: crop.x + crop.width - handleSize/2, y: crop.y - handleSize/2, type: 'ne' },
      { x: crop.x - handleSize/2, y: crop.y + crop.height - handleSize/2, type: 'sw' },
      { x: crop.x + crop.width - handleSize/2, y: crop.y + crop.height - handleSize/2, type: 'se' },
      { x: crop.x + crop.width/2 - handleSize/2, y: crop.y - handleSize/2, type: 'n' },
      { x: crop.x + crop.width/2 - handleSize/2, y: crop.y + crop.height - handleSize/2, type: 's' },
      { x: crop.x - handleSize/2, y: crop.y + crop.height/2 - handleSize/2, type: 'w' },
      { x: crop.x + crop.width - handleSize/2, y: crop.y + crop.height/2 - handleSize/2, type: 'e' }
    ];
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
    
    // Info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(crop.x + 10, crop.y + 10, 220, 120);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Tamaño: ${Math.round(crop.width)}×${Math.round(crop.height)}`, crop.x + 15, crop.y + 30);
    ctx.fillText(`Posición: (${Math.round(crop.x)}, ${Math.round(crop.y)})`, crop.x + 15, crop.y + 50);
    ctx.fillText(`Zoom: ${(zoom() * 100).toFixed(0)}%`, crop.x + 15, crop.y + 70);
    
    if (faceDetection()) {
      const detection = faceDetection()!;
      ctx.fillText(`Confianza: ${(detection.confidence * 100).toFixed(1)}%`, crop.x + 15, crop.y + 90);
      ctx.fillText(`Puntos: ${detection.landmarks?.length || 0}`, crop.x + 15, crop.y + 110);
    }
  };

  const drawCanvas = () => {
    if (!canvasRef || !overlayCanvasRef || !image()) {
      devLog('DrawCanvas failed:', { canvasRef: !!canvasRef, overlayCanvasRef: !!overlayCanvasRef, image: !!image() });
      return;
    }
    
    const ctx = canvasRef.getContext('2d');
    const overlayCtx = overlayCanvasRef.getContext('2d');
    
    if (!ctx || !overlayCtx) {
      devLog('Canvas context failed');
      return;
    }
    
    devLog('Drawing canvas...');
    
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    overlayCtx.clearRect(0, 0, overlayCanvasRef.width, overlayCanvasRef.height);
    
    const img = image()!;
    const offset = panOffset();
    const currentZoom = zoom();
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(currentZoom, currentZoom);
    ctx.drawImage(img, 0, 0, canvasRef.width, canvasRef.height);
    ctx.restore();
    
    drawCropOverlay(overlayCtx);
    
    devLog('Canvas drawn successfully');
  };

  const initializeCanvas = () => {
    if (!canvasRef || !overlayCanvasRef || !image()) {
      devLog('Canvas initialization failed:', { canvasRef: !!canvasRef, overlayCanvasRef: !!overlayCanvasRef, image: !!image() });
      return;
    }
    
    const img = image()!;
    const containerWidth = canvasRef.parentElement?.clientWidth || 800;
    const maxCanvasWidth = Math.min(containerWidth - 40, 800);
    
    const scale = Math.min(maxCanvasWidth / img.width, 600 / img.height);
    
    canvasRef.width = img.width * scale;
    canvasRef.height = img.height * scale;
    overlayCanvasRef.width = canvasRef.width;
    overlayCanvasRef.height = canvasRef.height;
    
    devLog('Canvas initialized:', { 
      width: canvasRef.width, 
      height: canvasRef.height, 
      scale,
      imageSize: { width: img.width, height: img.height }
    });
  };

  const loadImage = () => {
    const preview = originalPreview();
    if (!preview) return;
    
    const img = new Image();
    img.onload = () => {
      devLog('Image loaded:', img.width, img.height);
      setImage(img);
      setTimeout(() => {
        initializeCanvas();
        drawCanvas();
        detectAndCrop();
      }, 50);
    };
    img.onerror = (error) => {
      devLog('Error loading image:', error);
    };
    img.src = preview;
  };

  const detectAndCrop = async () => {
    if (!image() || !canvasRef) return;
    
    setProcessing(true);
    try {
      const detection = await blazeFaceDetect(image()!);
      
      if (detection) {
        devLog('Face detection successful:', detection);
        setFaceDetection(detection);
        
        // Calculate better passport crop - face should be 70-80% of image height
        const img = image()!;
        const scaleX = canvasRef.width / img.width;
        const scaleY = canvasRef.height / img.height;
        
        // Scale face detection to canvas coordinates
        const faceWidth = detection.width * scaleX;
        const faceHeight = detection.height * scaleY;
        const faceCenterX = (detection.topLeft[0] + detection.width / 2) * scaleX;
        const faceCenterY = (detection.topLeft[1] + detection.height / 2) * scaleY;
        
        // For passport: face should be ~75% of final image height
        // So crop size = face height / 0.75
        const cropSize = Math.max(faceHeight / 0.75, faceWidth / 0.6); // Ensure face fits
        
        // Position crop so face is centered horizontally and eyes at ~40% from top
        const eyeY = detection.landmarks ? 
          (detection.landmarks.reduce((sum, pt) => sum + pt[1], 0) / detection.landmarks.length) * scaleY :
          faceCenterY - faceHeight * 0.2; // Approximate eye level
          
        const cropX = faceCenterX - cropSize / 2;
        const cropY = eyeY - cropSize * 0.4; // Eyes at 40% from top
        
        devLog('🎯 PASSPORT CROP CALCULATION:', {
          faceSize: { width: faceWidth, height: faceHeight },
          faceCenter: { x: faceCenterX, y: faceCenterY },
          eyeY,
          cropSize,
          cropPosition: { x: cropX, y: cropY }
        });
        
        setCropArea({
          x: Math.max(0, Math.min(canvasRef.width - cropSize, cropX)),
          y: Math.max(0, Math.min(canvasRef.height - cropSize, cropY)),
          width: cropSize,
          height: cropSize
        });
      } else {
        devLog('No face detected, using default crop');
        // Default crop in center if no face detected
        const defaultSize = Math.min(canvasRef.width, canvasRef.height) * 0.6;
        setCropArea({
          x: (canvasRef.width - defaultSize) / 2,
          y: (canvasRef.height - defaultSize) / 2,
          width: defaultSize,
          height: defaultSize
        });
      }
      
      drawCanvas();
      updateCroppedPreview();
    } catch (error) {
      devLog('Detección facial falló:', error);
      // Fallback to default crop
      const defaultSize = Math.min(canvasRef!.width, canvasRef!.height) * 0.6;
      setCropArea({
        x: (canvasRef!.width - defaultSize) / 2,
        y: (canvasRef!.height - defaultSize) / 2,
        width: defaultSize,
        height: defaultSize
      });
      drawCanvas();
      updateCroppedPreview();
    } finally {
      setProcessing(false);
    }
  };

  // Event handlers
  const getMousePosition = (event: MouseEvent) => {
    const rect = overlayCanvasRef!.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const getResizeHandle = (mousePos: { x: number; y: number }) => {
    const crop = cropArea();
    const handleSize = 12;
    const tolerance = handleSize / 2;
    
    const handles = [
      { x: crop.x, y: crop.y, type: 'nw' },
      { x: crop.x + crop.width, y: crop.y, type: 'ne' },
      { x: crop.x, y: crop.y + crop.height, type: 'sw' },
      { x: crop.x + crop.width, y: crop.y + crop.height, type: 'se' },
      { x: crop.x + crop.width/2, y: crop.y, type: 'n' },
      { x: crop.x + crop.width/2, y: crop.y + crop.height, type: 's' },
      { x: crop.x, y: crop.y + crop.height/2, type: 'w' },
      { x: crop.x + crop.width, y: crop.y + crop.height/2, type: 'e' }
    ];
    
    for (const handle of handles) {
      if (Math.abs(mousePos.x - handle.x) <= tolerance && 
          Math.abs(mousePos.y - handle.y) <= tolerance) {
        return handle.type;
      }
    }
    
    return null;
  };

  const isInsideCrop = (mousePos: { x: number; y: number }) => {
    const crop = cropArea();
    return mousePos.x >= crop.x && mousePos.x <= crop.x + crop.width &&
           mousePos.y >= crop.y && mousePos.y <= crop.y + crop.height;
  };

  const handleMouseDown = (event: MouseEvent) => {
    const mousePos = getMousePosition(event);
    const handle = getResizeHandle(mousePos);
    
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else if (isInsideCrop(mousePos)) {
      setIsDragging(true);
    }
    
    setDragStart(mousePos);
  };

  const handleMouseMove = (event: MouseEvent) => {
    const mousePos = getMousePosition(event);
    
    if (isDragging()) {
      const delta = {
        x: mousePos.x - dragStart().x,
        y: mousePos.y - dragStart().y
      };
      
      const crop = cropArea();
      const newCrop = {
        x: Math.max(0, Math.min(canvasRef!.width - crop.width, crop.x + delta.x)),
        y: Math.max(0, Math.min(canvasRef!.height - crop.height, crop.y + delta.y)),
        width: crop.width,
        height: crop.height
      };
      
      setCropArea(newCrop);
      setDragStart(mousePos);
      drawCanvas();
      updateCroppedPreview();
      
    } else if (isResizing()) {
      const delta = {
        x: mousePos.x - dragStart().x,
        y: mousePos.y - dragStart().y
      };
      
      const crop = cropArea();
      let newCrop = { ...crop };
      
      switch (resizeHandle()) {
        case 'nw':
          newCrop.x = crop.x + delta.x;
          newCrop.y = crop.y + delta.y;
          newCrop.width = crop.width - delta.x;
          newCrop.height = crop.height - delta.y;
          break;
        case 'ne':
          newCrop.y = crop.y + delta.y;
          newCrop.width = crop.width + delta.x;
          newCrop.height = crop.height - delta.y;
          break;
        case 'sw':
          newCrop.x = crop.x + delta.x;
          newCrop.width = crop.width - delta.x;
          newCrop.height = crop.height + delta.y;
          break;
        case 'se':
          newCrop.width = crop.width + delta.x;
          newCrop.height = crop.height + delta.y;
          break;
        case 'n':
          newCrop.y = crop.y + delta.y;
          newCrop.height = crop.height - delta.y;
          break;
        case 's':
          newCrop.height = crop.height + delta.y;
          break;
        case 'w':
          newCrop.x = crop.x + delta.x;
          newCrop.width = crop.width - delta.x;
          break;
        case 'e':
          newCrop.width = crop.width + delta.x;
          break;
      }
      
      // Maintain square aspect ratio
      const avgSize = (newCrop.width + newCrop.height) / 2;
      newCrop.width = avgSize;
      newCrop.height = avgSize;
      
      // Constrain bounds
      newCrop.width = Math.max(minCropSize, Math.min(canvasRef!.width - newCrop.x, newCrop.width));
      newCrop.height = Math.max(minCropSize, Math.min(canvasRef!.height - newCrop.y, newCrop.height));
      newCrop.x = Math.max(0, Math.min(canvasRef!.width - newCrop.width, newCrop.x));
      newCrop.y = Math.max(0, Math.min(canvasRef!.height - newCrop.height, newCrop.y));
      
      setCropArea(newCrop);
      setDragStart(mousePos);
      drawCanvas();
      updateCroppedPreview();
      
    } else {
      // Update cursor
      const handle = getResizeHandle(mousePos);
      if (handle) {
        overlayCanvasRef!.style.cursor = `${handle}-resize`;
      } else if (isInsideCrop(mousePos)) {
        overlayCanvasRef!.style.cursor = 'move';
      } else {
        overlayCanvasRef!.style.cursor = 'default';
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom() * delta));
    setZoom(newZoom);
    
    drawCanvas();
  };

  const setupEventListeners = () => {
    if (!overlayCanvasRef) return;
    
    overlayCanvasRef.addEventListener('mousedown', handleMouseDown);
    overlayCanvasRef.addEventListener('mousemove', handleMouseMove);
    overlayCanvasRef.addEventListener('mouseup', handleMouseUp);
    overlayCanvasRef.addEventListener('wheel', handleWheel, { passive: false });
  };

  const removeEventListeners = () => {
    if (!overlayCanvasRef) return;
    
    overlayCanvasRef.removeEventListener('mousedown', handleMouseDown);
    overlayCanvasRef.removeEventListener('mousemove', handleMouseMove);
    overlayCanvasRef.removeEventListener('mouseup', handleMouseUp);
    overlayCanvasRef.removeEventListener('wheel', handleWheel);
  };

  const adjustCropPadding = (direction: 'increase' | 'decrease', factor = 5) => {
    const currentPadding = cropPadding();
    const newPadding = direction === 'increase' ? 
      Math.min(100, currentPadding + factor) : 
      Math.max(0, currentPadding - factor);
    
    setCropPadding(newPadding);
    
    // Get current crop and calculate center
    const crop = cropArea();
    const centerX = crop.x + crop.width / 2;
    const centerY = crop.y + crop.height / 2;
    
    devLog('🔍 BEFORE PADDING:', {
      direction,
      currentPadding,
      newPadding,
      originalCrop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
      center: { x: centerX, y: centerY }
    });
    
    // Calculate size change based on current crop size (not arbitrary pixels)
    const sizeChange = direction === 'increase' ? factor * 2 : -factor * 2; // Direct pixel change
    const currentSize = Math.min(crop.width, crop.height); // Use smaller dimension to maintain square
    const newSize = Math.max(minCropSize, currentSize + sizeChange);
    
    devLog('📐 SIZE CALCULATION:', {
      currentSize,
      sizeChange,
      newSize
    });
    
    // Create new SQUARE crop centered on same point
    const newCrop = {
      x: centerX - newSize / 2,
      y: centerY - newSize / 2,
      width: newSize,
      height: newSize // FORCE SQUARE
    };
    
    devLog('🎯 BEFORE BOUNDS CHECK:', newCrop);
    
    // Ensure crop stays within canvas bounds
    const maxX = canvasRef!.width - newSize;
    const maxY = canvasRef!.height - newSize;
    
    if (newCrop.x < 0) {
      newCrop.x = 0;
      devLog('⚠️ X too small, adjusted to 0');
    } else if (newCrop.x > maxX) {
      newCrop.x = maxX;
      devLog('⚠️ X too large, adjusted to', maxX);
    }
    
    if (newCrop.y < 0) {
      newCrop.y = 0;
      devLog('⚠️ Y too small, adjusted to 0');
    } else if (newCrop.y > maxY) {
      newCrop.y = maxY;
      devLog('⚠️ Y too large, adjusted to', maxY);
    }
    
    // If crop is too big for canvas, reduce size
    const maxCanvasSize = Math.min(canvasRef!.width, canvasRef!.height);
    if (newSize > maxCanvasSize) {
      newCrop.width = maxCanvasSize;
      newCrop.height = maxCanvasSize;
      newCrop.x = (canvasRef!.width - maxCanvasSize) / 2;
      newCrop.y = (canvasRef!.height - maxCanvasSize) / 2;
      devLog('⚠️ Crop too big, resized and centered');
    }
    
    devLog('✅ FINAL CROP:', newCrop);
    devLog('-------------------');
    
    setCropArea(newCrop);
    drawCanvas();
    updateCroppedPreview();
  };

  const resetToAutoDetection = () => {
    detectAndCrop();
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setCropPadding(20);
  };

  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        devLog('File read complete');
        setOriginalPreview(e.target?.result as string);
        setFaceDetection(null);
        setCroppedPreview('');
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmFinalPhoto = () => {
    if (!croppedPreview()) return;
    
    const metadata = {
      method: 'tensorflow_blazeface',
      confidence: faceDetection()?.confidence || 0,
      cropCoordinates: getOriginalCoordinates(cropArea()),
      countryCode,
      outputSize: getCountryOutputSize(),
      processingDate: new Date().toISOString()
    };
    
    props.onPhotoReady?.(croppedPreview(), metadata);
  };

  // Watch for preview changes
  createEffect(() => {
    const preview = originalPreview();
    if (preview) {
      devLog('Preview changed, loading image...');
      loadImage();
    }
  });

  // Lifecycle
  onMount(() => {
    setupEventListeners();
  });

  onCleanup(() => {
    removeEventListeners();
  });

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{
          'font-size': '1.5rem',
          'font-weight': '600',
          'margin-bottom': '1.5rem',
          'text-align': 'center'
        }}>
          📸 Foto de Pasaporte Final - TensorFlow.js
        </h3>

        {/* File Upload */}
        <Show when={!selectedFile()}>
          <div style={{
            padding: '3rem',
            border: '3px dashed var(--border-color)',
            'border-radius': 'var(--border-radius)',
            'text-align': 'center',
            'margin-bottom': '2rem',
            background: 'var(--background-secondary)'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📷</div>
            <p style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>
              Selecciona una foto para procesar
            </p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{
                  position: 'absolute',
                  opacity: '0',
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer'
                }}
              />
              <Button variant="primary" style={{ 'pointer-events': 'none' }}>
                📁 Elegir Foto
              </Button>
            </div>
            <p style={{ 
              'margin-top': '1rem', 
              'font-size': '0.875rem', 
              color: 'var(--text-muted)' 
            }}>
              Formatos soportados: JPG, PNG, WEBP
            </p>
          </div>
        </Show>

        {/* Processing State */}
        <Show when={selectedFile() && processing()}>
          <div style={{
            'text-align': 'center',
            padding: '2rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1.5rem'
          }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>🔍</div>
            <p style={{ 'font-size': '1.1rem', 'font-weight': '500' }}>
              Detectando rostro con TensorFlow.js...
            </p>
            <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Esto puede tomar unos segundos
            </p>
          </div>
        </Show>

        {/* Main Editor */}
        <Show when={selectedFile() && !processing() && image()}>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            'margin-bottom': '1.5rem',
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)'
          }}>
            {/* Zoom Controls */}
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                Zoom: {(zoom() * 100).toFixed(0)}%
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                <Button
                  onClick={() => {
                    setZoom(Math.max(0.5, zoom() - 0.1));
                    drawCanvas();
                  }}
                  variant="secondary"
                  size="sm"
                >
                  -
                </Button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom()}
                  onInput={(e) => {
                    setZoom(parseFloat(e.currentTarget.value));
                    drawCanvas();
                  }}
                  style={{ flex: '1' }}
                />
                <Button
                  onClick={() => {
                    setZoom(Math.min(3, zoom() + 0.1));
                    drawCanvas();
                  }}
                  variant="secondary"
                  size="sm"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Hair Padding */}
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                Espacio para Cabello: {cropPadding()}px
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  onClick={() => adjustCropPadding('decrease')}
                  variant="secondary"
                  size="sm"
                >
                  Más Ajustado
                </Button>
                <Button
                  onClick={() => adjustCropPadding('increase')}
                  variant="secondary"
                  size="sm"
                >
                  Más Cabello
                </Button>
              </div>
            </div>

            {/* Display Options */}
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                Opciones de Vista
              </label>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
                <label style={{ 'font-size': '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={showGuides()}
                    onChange={(e) => {
                      setShowGuides(e.target.checked);
                      drawCanvas();
                    }}
                    style={{ 'margin-right': '0.5rem' }}
                  />
                  Mostrar guías y línea de ojos
                </label>
                <label style={{ 'font-size': '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={showLandmarks()}
                    onChange={(e) => {
                      setShowLandmarks(e.target.checked);
                      drawCanvas();
                    }}
                    style={{ 'margin-right': '0.5rem' }}
                  />
                  Mostrar puntos faciales
                </label>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                Acciones Rápidas
              </label>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
                <Button
                  onClick={resetToAutoDetection}
                  variant="secondary"
                  size="sm"
                >
                  🔄 Redetectar Automático
                </Button>
                <Button
                  onClick={() => {
                    setZoom(1);
                    setPanOffset({ x: 0, y: 0 });
                    drawCanvas();
                  }}
                  variant="secondary"
                  size="sm"
                >
                  🎯 Centrar y Ajustar
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas Container */}
          <div style={{
            display: 'grid',
            'grid-template-columns': '2fr 1fr',
            gap: '1.5rem',
            'margin-bottom': '1.5rem'
          }}>
            {/* Main Editor */}
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Editor de Recorte</h4>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                border: '2px solid var(--border-color)',
                'border-radius': 'var(--border-radius)'
              }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    display: 'block',
                    'border-radius': 'var(--border-radius)'
                  }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    'border-radius': 'var(--border-radius)'
                  }}
                />
              </div>
              <p style={{
                'margin-top': '0.5rem',
                'font-size': '0.875rem',
                color: 'var(--text-muted)'
              }}>
                💡 Arrastra para mover, redimensiona con las esquinas, scroll para zoom
              </p>
            </div>

            {/* Live Preview */}
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Vista Previa en Vivo</h4>
              <Show when={croppedPreview()}>
                <img
                  src={croppedPreview()}
                  style={{
                    width: '100%',
                    'max-width': '300px',
                    'border-radius': 'var(--border-radius)',
                    border: '2px solid var(--success)',
                    'box-shadow': '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  alt="Vista previa del recorte"
                />
                <div style={{
                  'margin-top': '0.5rem',
                  'font-size': '0.875rem',
                  'text-align': 'center'
                }}>
                  <div style={{ 'font-weight': '600' }}>
                    {getCountryOutputSize().width}×{getCountryOutputSize().height}px
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Especificación de Pasaporte {countryCode}
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* Detection Info */}
          <Show when={faceDetection()}>
            <div style={{
              padding: '1rem',
              background: 'var(--success-light)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1.5rem'
            }}>
              <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--success-dark)' }}>
                ✅ Detección Facial Exitosa - TensorFlow.js
              </h5>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.5rem',
                'font-size': '0.875rem'
              }}>
                <div>
                  <strong>Confianza:</strong> {((faceDetection()?.confidence || 0) * 100).toFixed(1)}%
                </div>
                <div>
                  <strong>Puntos Detectados:</strong> {faceDetection()?.landmarks?.length || 0}
                </div>
                <div>
                  <strong>Centro Facial:</strong> ({Math.round(faceDetection()?.centerX || 0)}, {Math.round(faceDetection()?.centerY || 0)})
                </div>
                <div>
                  <strong>Tamaño:</strong> {Math.round(faceDetection()?.width || 0)}×{Math.round(faceDetection()?.height || 0)}px
                </div>
              </div>
            </div>
          </Show>

          {/* Guidelines */}
          <div style={{
            padding: '1rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1.5rem'
          }}>
            <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--info-dark)' }}>
              📋 Guías para Foto de Pasaporte
            </h5>
            <ul style={{
              margin: '0',
              'padding-left': '1.5rem',
              'font-size': '0.875rem',
              color: 'var(--info-dark)'
            }}>
              <li>Los ojos deben estar en la línea cian (35-40% desde arriba)</li>
              <li>El rostro debe ocupar 70-80% de la altura de la foto</li>
              <li>Incluir suficiente espacio arriba de la cabeza para el cabello</li>
              <li>Asegurar que las orejas sean visibles (si no están cubiertas por cabello)</li>
              <li>Mantener expresión neutral y mirada directa</li>
              <li>Fondo blanco o claro sin sombras</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            'justify-content': 'center',
            'flex-wrap': 'wrap'
          }}>
            <Button
              onClick={() => {
                setSelectedFile(null);
                setOriginalPreview('');
                setFaceDetection(null);
                setCroppedPreview('');
              }}
              variant="secondary"
            >
              🔄 Nueva Foto
            </Button>
            
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `foto-pasaporte-${countryCode}-${Date.now()}.jpg`;
                link.href = croppedPreview();
                link.click();
              }}
              variant="secondary"
              disabled={!croppedPreview()}
            >
              📥 Descargar Foto
            </Button>
            
            <Button
              onClick={confirmFinalPhoto}
              variant="primary"
              disabled={!croppedPreview()}
            >
              ✅ Confirmar Foto Final
            </Button>
          </div>

          {/* Quality Indicators */}
          <Show when={faceDetection()}>
            <div style={{
              'margin-top': '1.5rem',
              padding: '1rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius)'
            }}>
              <h5 style={{ 'margin-bottom': '0.75rem' }}>📊 Indicadores de Calidad</h5>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {/* Confidence Score */}
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <span>Confianza de Detección:</span>
                  <span style={{ 
                    'font-weight': '600',
                    color: (faceDetection()?.confidence || 0) > 0.8 ? 'var(--success)' : 
                           (faceDetection()?.confidence || 0) > 0.6 ? 'var(--warning)' : 'var(--error)'
                  }}>
                    {((faceDetection()?.confidence || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                
                {/* Face Size */}
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <span>Tamaño del Rostro:</span>
                  <span style={{ 'font-weight': '600' }}>
                    {Math.round(faceDetection()?.width || 0)} × {Math.round(faceDetection()?.height || 0)}px
                  </span>
                </div>
                
                {/* Centering */}
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <span>Centrado:</span>
                  <span style={{ 
                    'font-weight': '600',
                    color: (() => {
                      if (!image() || !faceDetection()) return 'var(--text-muted)';
                      const img = image()!;
                      const detection = faceDetection()!;
                      const centerX = detection.centerX / img.width;
                      const centerY = detection.centerY / img.height;
                      const horizontalOk = Math.abs(centerX - 0.5) < 0.15;
                      const verticalOk = centerY > 0.3 && centerY < 0.7;
                      return (horizontalOk && verticalOk) ? 'var(--success)' : 'var(--warning)';
                    })()
                  }}>
                    {(() => {
                      if (!image() || !faceDetection()) return 'N/A';
                      const img = image()!;
                      const detection = faceDetection()!;
                      const centerX = detection.centerX / img.width;
                      const centerY = detection.centerY / img.height;
                      const horizontalOk = Math.abs(centerX - 0.5) < 0.15;
                      const verticalOk = centerY > 0.3 && centerY < 0.7;
                      return (horizontalOk && verticalOk) ? 'Excelente' : 'Necesita Ajuste';
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </Card>
  );
};

export default PassportPhotoFinal;