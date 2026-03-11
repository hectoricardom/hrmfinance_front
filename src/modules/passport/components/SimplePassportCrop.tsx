import { Component, createSignal, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { Card, Button } from '../../ui';
import {
  detectFace as blazeFaceDetect,
  type FaceDetection as BlazeFaceDetection
} from '../utils/aiFaceDetection';
import { devLog } from '../../../services/utils';

interface CropArea {
  x: number;
  y: number;
  size: number; // Square size
}

interface SimplePassportCropProps {
  onPhotoReady?: (photoUrl: string, metadata: any) => void;
}

const SimplePassportCrop: Component<SimplePassportCropProps> = (props) => {
  // Canvas refs
  let canvasRef: HTMLCanvasElement | undefined;
  let overlayCanvasRef: HTMLCanvasElement | undefined;
  
  // Core state
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [originalPreview, setOriginalPreview] = createSignal<string>('');
  const [processing, setProcessing] = createSignal(false);
  const [image, setImage] = createSignal<HTMLImageElement | null>(null);
  const [faceDetection, setFaceDetection] = createSignal<BlazeFaceDetection | null>(null);
  
  // Crop state (in ORIGINAL image coordinates)
  const [cropArea, setCropArea] = createSignal<CropArea>({ x: 0, y: 0, size: 200 });
  const [croppedPreview, setCroppedPreview] = createSignal<string>('');
  
  // Manual adjustment
  const [padding, setPadding] = createSignal(600); // Additional padding around face
  const [showGuidelines, setShowGuidelines] = createSignal(true); // Show measurement lines
  const [manualCropCenter, setManualCropCenter] = createSignal<{x: number, y: number} | null>(null); // Track manual position
  const moveStep = 10; // Pixels to move per arrow click

  // Convert original image coordinates to canvas display coordinates
  const toCanvasCoords = (originalCrop: CropArea) => {
    if (!image() || !canvasRef) return originalCrop;
    
    const img = image()!;
    const scaleX = canvasRef.width / img.width;
    const scaleY = canvasRef.height / img.height;
    const scale = Math.min(scaleX, scaleY); // Use uniform scale to maintain aspect ratio
    
    return {
      x: originalCrop.x * scale,
      y: originalCrop.y * scale,
      size: originalCrop.size * scale
    };
  };

  // Convert canvas coordinates to original image coordinates
  const toOriginalCoords = (canvasCrop: CropArea) => {
    if (!image() || !canvasRef) return canvasCrop;
    
    const img = image()!;
    const scaleX = canvasRef.width / img.width;
    const scaleY = canvasRef.height / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    return {
      x: canvasCrop.x / scale,
      y: canvasCrop.y / scale,
      size: canvasCrop.size / scale
    };
  };

  const updateCroppedPreview = () => {
    if (!image()) return;
    
    const img = image()!;
    const crop = cropArea(); // Already in original coordinates
    
    devLog('🖼️ CREATING PREVIEW:', {
      originalImageSize: { width: img.width, height: img.height },
      cropInOriginal: crop,
      outputSize: '600x600'
    });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Always output 600x600 square
    canvas.width = 600;
    canvas.height = 600;
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 600);
    
    // Draw cropped area from original image to 600x600 output
    ctx.drawImage(
      img,
      crop.x, crop.y, crop.size, crop.size, // Source (original image coordinates)
      0, 0, 600, 600 // Destination (always 600x600)
    );
    
    // Draw passport measurement guidelines if enabled
    if (showGuidelines()) {
      drawPassportGuidelines(ctx, 600, 600);
    }
    
    setCroppedPreview(canvas.toDataURL('image/jpeg', 0.95));
  };

  const generateCleanDownload = (resolution: number = 600, quality: number = 0.95) => {
    if (!image()) return '';
    
    const img = image()!;
    const crop = cropArea();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Output at specified resolution
    canvas.width = resolution;
    canvas.height = resolution;
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, resolution, resolution);
    
    // Enable high quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw ONLY the cropped image - NO guidelines
    ctx.drawImage(
      img,
      crop.x, crop.y, crop.size, crop.size, // Source (original image coordinates)
      0, 0, resolution, resolution // Destination at specified resolution
    );
    
    return canvas.toDataURL('image/jpeg', quality);
  };

  const generateOriginalQualityDownload = () => {
    if (!image()) return '';
    
    const img = image()!;
    const crop = cropArea();
    
    // Calculate the desired output size (2x2 inches at original DPI)
    // Standard passport is 2x2 inches, let's calculate based on crop area
    const outputSize = Math.round(crop.size); // Keep original pixel dimensions
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Output at original crop size (no scaling)
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    devLog('🎯 Original Quality Export:', {
      cropArea: crop,
      outputSize: outputSize,
      originalImageSize: { width: img.width, height: img.height }
    });
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputSize, outputSize);
    
    // Disable smoothing to preserve original pixels
    ctx.imageSmoothingEnabled = false;
    
    // Draw at 1:1 scale - no scaling, just cropping
    ctx.drawImage(
      img,
      crop.x, crop.y, crop.size, crop.size, // Source area
      0, 0, outputSize, outputSize // Destination - same size as source
    );
    
    // Use PNG for lossless quality or JPEG at maximum quality
    return canvas.toDataURL('image/png'); // PNG preserves all detail
  };

  const drawPassportGuidelines = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Passport photo guidelines based on 2 inch standard
    // 600px = 2 inches, so 1 inch = 300px
    
    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    
    // Based on passport specs: 600px total, eyes at 300-414px from top
    const eyeLevelTop = height * 0.5;     // 300px from top (50%)
    const eyeLevelBottom = height * 0.69;  // 414px from top (69%)
    
    // Draw eye level zone
    ctx.strokeStyle = 'rgb(45, 125, 50)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    
    ctx.beginPath();
    ctx.moveTo(0, eyeLevelTop);
    ctx.lineTo(width, eyeLevelTop);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, eyeLevelBottom);
    ctx.lineTo(width, eyeLevelBottom);
    ctx.stroke();
    
    // Face height zone (336-414px from top = 56-69% of height)
    const faceTop = height * 0.56;     // 336px from top
    const faceBottom = height * 0.69;  // 414px from top (same as eye bottom)
    
    // Draw face height indicators
    ctx.strokeStyle = 'rgb(200, 100, 50)';
    ctx.beginPath();
    ctx.moveTo(width - 40, faceTop);
    ctx.lineTo(width - 30, faceTop);
    ctx.moveTo(width - 40, faceBottom);
    ctx.lineTo(width - 30, faceBottom);
    ctx.stroke();
    
    // Vertical center lines (head should be centered horizontally)
    const centerX = width / 2;
    const leftGuide = width * 0.3;   // 30% from left
    const rightGuide = width * 0.7;  // 70% from left
    
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(leftGuide, 0);
    ctx.lineTo(leftGuide, height);
    ctx.moveTo(rightGuide, 0);
    ctx.lineTo(rightGuide, height);
    ctx.stroke();
    
    // Draw measurement labels
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    
    // Eye level labels
    ctx.fillText('Zona de Ojos', 5, eyeLevelTop - 5);
    ctx.fillText('300-414px', 5, eyeLevelTop + 15);
    
    // Face height labels  
    ctx.fillText('Altura de Cara', width - 120, faceTop + 20);
    ctx.fillText('336-414px', width - 120, faceTop + 35);
    
    // Dimension arrows and labels
    ctx.strokeStyle = '#0000ff';
    ctx.fillStyle = '#0000ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    // Top dimension line (2 inch width)
    const arrowSize = 8;
    ctx.beginPath();
    ctx.moveTo(50, 20);
    ctx.lineTo(width - 50, 20);
    ctx.stroke();
    
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(50, 20);
    ctx.lineTo(50 + arrowSize, 20 - arrowSize/2);
    ctx.lineTo(50 + arrowSize, 20 + arrowSize/2);
    ctx.closePath();
    ctx.fill();
    
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(width - 50, 20);
    ctx.lineTo(width - 50 - arrowSize, 20 - arrowSize/2);
    ctx.lineTo(width - 50 - arrowSize, 20 + arrowSize/2);
    ctx.closePath();
    ctx.fill();
    
    // Width label
    ctx.textAlign = 'center';
    ctx.fillText('2 pulgadas', width / 2, 15);
    
    // Left dimension line (2 inch height)
    ctx.beginPath();
    ctx.moveTo(20, 50);
    ctx.lineTo(20, height - 50);
    ctx.stroke();
    
    // Top arrow
    ctx.beginPath();
    ctx.moveTo(20, 50);
    ctx.lineTo(20 - arrowSize/2, 50 + arrowSize);
    ctx.lineTo(20 + arrowSize/2, 50 + arrowSize);
    ctx.closePath();
    ctx.fill();
    
    // Bottom arrow
    ctx.beginPath();
    ctx.moveTo(20, height - 50);
    ctx.lineTo(20 - arrowSize/2, height - 50 - arrowSize);
    ctx.lineTo(20 + arrowSize/2, height - 50 - arrowSize);
    ctx.closePath();
    ctx.fill();
    
    // Height label (rotated)
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('2 pulgadas', 0, 0);
    ctx.restore();
    
    ctx.restore();
  };

  const drawCanvas = () => {
    if (!canvasRef || !overlayCanvasRef || !image()) return;
    
    const ctx = canvasRef.getContext('2d');
    const overlayCtx = overlayCanvasRef.getContext('2d');
    
    if (!ctx || !overlayCtx) return;
    
    const img = image()!;
    
    // Clear canvases
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    overlayCtx.clearRect(0, 0, overlayCanvasRef.width, overlayCanvasRef.height);
    
    // Draw image to fit canvas while maintaining aspect ratio
    const scaleX = canvasRef.width / img.width;
    const scaleY = canvasRef.height / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    const displayWidth = img.width * scale;
    const displayHeight = img.height * scale;
    const offsetX = (canvasRef.width - displayWidth) / 2;
    const offsetY = (canvasRef.height - displayHeight) / 2;
    
    ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight);
    
    // Draw crop overlay
    const canvasCrop = toCanvasCoords(cropArea());
    const adjustedCrop = {
      x: canvasCrop.x + offsetX,
      y: canvasCrop.y + offsetY,
      size: canvasCrop.size
    };
    
    // Semi-transparent overlay
    overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    overlayCtx.fillRect(0, 0, overlayCanvasRef.width, overlayCanvasRef.height);
    
    // Clear crop area
    overlayCtx.globalCompositeOperation = 'destination-out';
    overlayCtx.fillRect(adjustedCrop.x, adjustedCrop.y, adjustedCrop.size, adjustedCrop.size);
    overlayCtx.globalCompositeOperation = 'source-over';
    
    // Draw crop border
    overlayCtx.strokeStyle = '#ffffff';
    overlayCtx.lineWidth = 3;
    overlayCtx.strokeRect(adjustedCrop.x, adjustedCrop.y, adjustedCrop.size, adjustedCrop.size);
    
    overlayCtx.strokeStyle = '#000000';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(adjustedCrop.x + 1, adjustedCrop.y + 1, adjustedCrop.size - 2, adjustedCrop.size - 2);
    
    // Draw face detection if available
    if (faceDetection()) {
      const detection = faceDetection()!;
      
      // Scale face detection to display coordinates
      const faceX = (detection.topLeft[0] * scale) + offsetX;
      const faceY = (detection.topLeft[1] * scale) + offsetY;
      const faceWidth = detection.width * scale;
      const faceHeight = detection.height * scale;
      const faceCenterX = faceX + faceWidth / 2;
      const faceCenterY = faceY + faceHeight / 2;
      
      // Draw face bounding box
      overlayCtx.strokeStyle = '#00ff00';
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(faceX, faceY, faceWidth, faceHeight);
      
      // Draw face center point
      overlayCtx.fillStyle = '#ff00ff';
      overlayCtx.beginPath();
      overlayCtx.arc(faceCenterX, faceCenterY, 2, 0, 2 * Math.PI);
      overlayCtx.fill();
      
      // Draw landmarks
      if (detection.landmarks) {
        detection.landmarks.forEach(landmark => {
          const x = (landmark[0] * scale) + offsetX;
          const y = (landmark[1] * scale) + offsetY;
          
          overlayCtx.fillStyle = '#ffff00';
          overlayCtx.beginPath();
          overlayCtx.arc(x, y, 1, 0, 2 * Math.PI);
          overlayCtx.fill();
        });
      }
    }
    
    // Draw crosshair cursor in center of crop
    const centerX = adjustedCrop.x + adjustedCrop.size / 2;
    const centerY = adjustedCrop.y + adjustedCrop.size / 2;
    const crossSize = 20;
    
    overlayCtx.strokeStyle = '#ff0000';
    overlayCtx.lineWidth = 2;
    overlayCtx.setLineDash([]);
    
    // Horizontal line
    overlayCtx.beginPath();
    overlayCtx.moveTo(centerX - crossSize, centerY);
    overlayCtx.lineTo(centerX + crossSize, centerY);
    overlayCtx.stroke();
    
    // Vertical line
    overlayCtx.beginPath();
    overlayCtx.moveTo(centerX, centerY - crossSize);
    overlayCtx.lineTo(centerX, centerY + crossSize);
    overlayCtx.stroke();
    
    // Draw info
    overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    overlayCtx.fillRect(10, 10, 220, 80);
    
    overlayCtx.fillStyle = '#ffffff';
    overlayCtx.font = '12px Arial';
    overlayCtx.textAlign = 'left';
    overlayCtx.fillText(`Tamaño: ${Math.round(cropArea().size)}px (cuadrado)`, 15, 30);
    overlayCtx.fillText(`Centro: (${Math.round(cropArea().x + cropArea().size/2)}, ${Math.round(cropArea().y + cropArea().size/2)})`, 15, 50);
    overlayCtx.fillText(`Padding: ${padding()}px alrededor del rostro`, 15, 70);
  };

  const initializeCanvas = () => {
    if (!canvasRef || !overlayCanvasRef || !image()) return;
    
    const img = image()!;
    const maxWidth = 600;
    const maxHeight = 400;
    
    // Calculate display size maintaining aspect ratio
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    
    canvasRef.width = img.width * scale;
    canvasRef.height = img.height * scale;
    overlayCanvasRef.width = canvasRef.width;
    overlayCanvasRef.height = canvasRef.height;
    
    devLog('Canvas initialized:', {
      originalImage: { width: img.width, height: img.height },
      canvasSize: { width: canvasRef.width, height: canvasRef.height },
      scale
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
        detectFaceAndSetCrop();
      }, 100);
    };
    img.onerror = (error) => {
      devLog('Error loading image:', error);
    };
    img.src = preview;
  };

  const detectFaceAndSetCrop = async () => {
    if (!image()) return;
    
    setProcessing(true);
    try {
      const detection = await blazeFaceDetect(image()!);
      
      if (detection) {
        devLog('✅ Face detected:', detection);
        setFaceDetection(detection);
        
        // Calculate face center in original image coordinates
        const faceCenterX = detection.topLeft[0] + detection.width / 2;
        const faceCenterY = detection.topLeft[1] + detection.height / 2;
        
        // Create square crop centered on face with padding
        const faceSize = Math.max(detection.width, detection.height);
        const cropSize = faceSize + padding() * 2; // Add padding around face
        
        const crop = {
          x: faceCenterX - cropSize / 2,
          y: faceCenterY - cropSize / 2,
          size: cropSize
        };
        
        // Ensure crop stays within image bounds
        const img = image()!;
        crop.x = Math.max(0, Math.min(img.width - crop.size, crop.x));
        crop.y = Math.max(0, Math.min(img.height - crop.size, crop.y));
        
        devLog('🎯 Initial crop calculated:', {
          faceCenter: { x: faceCenterX, y: faceCenterY },
          faceSize,
          cropSize,
          finalCrop: crop
        });
        
        setCropArea(crop);
      } else {
        devLog('No face detected, using center crop');
        const img = image()!;
        const size = Math.min(img.width, img.height) * 0.6;
        setCropArea({
          x: (img.width - size) / 2,
          y: (img.height - size) / 2,
          size
        });
      }
      
      drawCanvas();
      updateCroppedPreview();
    } catch (error) {
      devLog('Face detection failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Arrow controls to move crop area
  const moveCrop = (direction: 'up' | 'down' | 'left' | 'right') => {
    const crop = cropArea();
    const img = image()!;
    
    let newX = crop.x;
    let newY = crop.y;
    
    switch (direction) {
      case 'up':
        newY = Math.max(0, crop.y - moveStep);
        break;
      case 'down':
        newY = Math.min(img.height - crop.size, crop.y + moveStep);
        break;
      case 'left':
        newX = Math.max(0, crop.x - moveStep);
        break;
      case 'right':
        newX = Math.min(img.width - crop.size, crop.x + moveStep);
        break;
    }
    
    const newCrop = {
      x: newX,
      y: newY,
      size: crop.size
    };
    
    // Remember this manual position for future padding adjustments
    setManualCropCenter({
      x: newX + newCrop.size / 2,
      y: newY + newCrop.size / 2
    });
    
    devLog(`🔽 Moving ${direction}:`, {
      oldPosition: { x: crop.x, y: crop.y },
      newPosition: { x: newX, y: newY },
      newCenter: manualCropCenter(),
      imageSize: { width: img.width, height: img.height }
    });
    
    setCropArea(newCrop);
    drawCanvas();
    updateCroppedPreview();
  };

  const adjustPadding = (direction: 'increase' | 'decrease') => {
    const newPadding = direction === 'increase' ? 
      Math.min(800, padding() + 10) : 
      Math.max(10, padding() - 10);
    
    setPadding(newPadding);
    
    // Recalculate crop with new padding
    if (faceDetection()) {
      const detection = faceDetection()!;
      const faceCenterX = detection.topLeft[0] + detection.width / 2;
      const faceCenterY = detection.topLeft[1] + detection.height / 2;
      const faceSize = Math.max(detection.width, detection.height);
      const cropSize = faceSize + newPadding * 2;
      
      const img = image()!;
      const newCrop = {
        x: Math.max(0, Math.min(img.width - cropSize, faceCenterX - cropSize / 2)),
        y: Math.max(0, Math.min(img.height - cropSize, faceCenterY - cropSize / 2)),
        size: cropSize
      };
      
      devLog('📏 Padding adjusted:', {
        direction,
        newPadding,
        newCrop
      });
      
      setCropArea(newCrop);
      drawCanvas();
      updateCroppedPreview();
    }
  };

  const setupEventListeners = () => {
    // No mouse events needed - using arrow controls instead
  };

  const removeEventListeners = () => {
    // No mouse events to remove
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
    const cleanImage = generateCleanDownload();
    if (!cleanImage) return;
    
    const metadata = {
      method: 'simple_tensorflow_crop',
      confidence: faceDetection()?.confidence || 0,
      cropArea: cropArea(),
      padding: padding(),
      processingDate: new Date().toISOString()
    };
    
    props.onPhotoReady?.(cleanImage, metadata);
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
    // No event listeners needed for arrow controls
  });

  onCleanup(() => {
    // No cleanup needed
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
          📸 Recorte Simple de Pasaporte
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
          </div>
        </Show>

        {/* Processing State */}
        <Show when={processing()}>
          <div style={{
            'text-align': 'center',
            padding: '2rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1.5rem'
          }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>🔍</div>
            <p style={{ 'font-size': '1.1rem', 'font-weight': '500' }}>
              Detectando rostro y calculando centro...
            </p>
          </div>
        </Show>

        {/* Main Editor */}
        <Show when={selectedFile() && !processing() && image()}>
          {/* Controls */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            'margin-bottom': '1.5rem',
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)'
          }}>
          
            {/* Quick Actions */}
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'font-weight': '500' 
              }}>
                Acciones Rápidas
              </label>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                <Button
                  onClick={() => {
                    // Reset everything: padding and manual position
                    setPadding(50);
                    setManualCropCenter(null);
                    detectFaceAndSetCrop();
                  }}
                  variant="secondary"
                  size="sm"
                >
                  🔄 Reset Todo
                </Button>
              </div>
            </div>

            {/* Display Options */}
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'font-weight': '500' 
              }}>
                Opciones de Vista
              </label>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                <label style={{ 'font-size': '0.875rem', display: 'flex', 'align-items': 'center' }}>
                  <input
                    type="checkbox"
                    checked={showGuidelines()}
                    onChange={(e) => {
                      setShowGuidelines(e.target.checked);
                      updateCroppedPreview();
                    }}
                    style={{ 'margin-right': '0.5rem' }}
                  />
                  Mostrar guías de medida
                </label>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-left': '1.5rem' }}>
                  <div>Tamaño: {Math.round(cropArea().size)}×{Math.round(cropArea().size)}px</div>
                  <div>Centro: ({Math.round(cropArea().x + cropArea().size/2)}, {Math.round(cropArea().y + cropArea().size/2)})</div>
                  <Show when={faceDetection()}>
                    <div>Confianza: {((faceDetection()?.confidence || 0) * 100).toFixed(1)}%</div>
                  </Show>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Container */}
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr 2fr',
            gap: '1.5rem',
            'margin-bottom': '1.5rem'
          }}>
           

            {/* Live Preview */}
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Resultado 600×600</h4>
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
                  alt="Vista previa 600x600"
                />
              </Show>
            </div>
            <div style={{
              display: 'grid',
              'grid-template-columns': '1fr 1fr',
              gap: '1.5rem',
              'margin-bottom': '1.5rem'
            }}>
            
              {/* Padding Slider */}
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'font-weight': '500' 
              }}>
                Padding: {padding()}px
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                <Button
                  onClick={() => adjustPadding('decrease')}
                  variant="secondary"
                  size="sm"
                  style={{ 'min-width': '40px' }}
                >
                  ➖
                </Button>
                <input
                  type="range"
                  min="10"
                  max="800"
                  step="5"
                  value={padding()}
                  onInput={(e) => {
                    const newPadding = parseInt(e.currentTarget.value);
                    setPadding(newPadding);
                    
                    // Use manual center if available, otherwise face center
                    const manual = manualCropCenter();
                    let centerX, centerY;
                    
                    if (manual) {
                      // Use last manual position
                      centerX = manual.x;
                      centerY = manual.y;
                      devLog('📍 Using manual center:', manual);
                    } else if (faceDetection()) {
                      // Use face center
                      const detection = faceDetection()!;
                      centerX = detection.topLeft[0] + detection.width / 2;
                      centerY = detection.topLeft[1] + detection.height / 2;
                      devLog('🤖 Using face center:', { x: centerX, y: centerY });
                    } else {
                      return; // No reference point
                    }
                    
                    // Calculate new crop size with padding
                    const faceSize = faceDetection() ? 
                      Math.max(faceDetection()!.width, faceDetection()!.height) : 
                      200; // Fallback size
                    const cropSize = faceSize + newPadding * 2;
                    
                    const img = image()!;
                    const newCrop = {
                      x: Math.max(0, Math.min(img.width - cropSize, centerX - cropSize / 2)),
                      y: Math.max(0, Math.min(img.height - cropSize, centerY - cropSize / 2)),
                      size: cropSize
                    };
                    
                    setCropArea(newCrop);
                    drawCanvas();
                    updateCroppedPreview();
                  }}
                  style={{ flex: '1' }}
                />
                <Button
                  onClick={() => adjustPadding('increase')}
                  variant="secondary"
                  size="sm"
                  style={{ 'min-width': '40px' }}
                >
                  ➕
                </Button>
              </div>
              <div style={{ 
                'font-size': '0.75rem', 
                color: 'var(--text-muted)', 
                'margin-top': '0.25rem' 
              }}>
                10px = Muy ajustado | 150px = Más cabello
              </div>
            </div>

            {/* Movement Controls */}
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'margin-left': '0.5rem', 
                'font-weight': '500' 
              }}>
                Mover Recorte
              </label>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(3, 1fr)',
                gap: '0.25rem',
                'max-width': '120px'
              }}>
                {/* Top row */}
                <div></div>
                <Button
                  onClick={() => moveCrop('up')}
                  variant="secondary"
                  size="sm"
                  title="Mover arriba"
                >
                  ⬆️
                </Button>
                <div></div>
                
                {/* Middle row */}
                <Button
                  onClick={() => moveCrop('left')}
                  variant="secondary"
                  size="sm"
                  title="Mover izquierda"
                >
                  ⬅️
                </Button>
                <Button
                  onClick={() => {
                    // Reset manual position and recenter on face
                    setManualCropCenter(null);
                    detectFaceAndSetCrop();
                  }}
                  variant="primary"
                  size="sm"
                  title="Recentrar en rostro"
                >
                  🎯
                </Button>
                <Button
                  onClick={() => moveCrop('right')}
                  variant="secondary"
                  size="sm"
                  title="Mover derecha"
                >
                  ➡️
                </Button>
                
                {/* Bottom row */}
                <div></div>
                <Button
                  onClick={() => moveCrop('down')}
                  variant="secondary"
                  size="sm"
                  title="Mover abajo"
                >
                  ⬇️
                </Button>
                <div></div>
              </div>
              <div style={{ 
                'font-size': '0.75rem', 
                color: 'var(--text-muted)', 
                'margin-top': '0.5rem',
                'text-align': 'center'
              }}>
                Mueve {moveStep}px por clic
              </div>
            </div>
            </div>
          </div>

          {/* Download Info */}
          <div style={{
            padding: '1rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1rem',
            'text-align': 'center'
          }}>
            <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--info-dark)' }}>
              📐 Opciones de Descarga
            </h5>
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'font-size': '0.875rem',
              color: 'var(--info-dark)'
            }}>
              <div>
                <strong>📥 Estándar (600px)</strong>
                <div>2×2 pulgadas @ 300 PPI</div>
                <div>Web y documentos digitales</div>
              </div>
              <div>
                <strong>🖨️ HD (1800px)</strong>
                <div>2×2 pulgadas @ 900 PPI</div>
                <div>Impresión profesional</div>
              </div>
              <div>
                <strong>💎 Original</strong>
                <div>Resolución nativa</div>
                <div>Máxima calidad posible</div>
              </div>
            </div>
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
                const cleanImage = generateCleanDownload(600, 0.95);
                if (cleanImage) {
                  const link = document.createElement('a');
                  link.download = `pasaporte-600x600-${Date.now()}.jpg`;
                  link.href = cleanImage;
                  link.click();
                }
              }}
              variant="secondary"
              disabled={!croppedPreview()}
            >
              📥 Descargar (600px)
            </Button>
            
            <Button
              onClick={() => {
                // HD version: 1800x1800 pixels (2 inches at 900 PPI for ultra-quality printing)
                const hdImage = generateCleanDownload(1800, 1.0); // Quality 1.0 = maximum
                if (hdImage) {
                  const link = document.createElement('a');
                  link.download = `pasaporte-HD-1800x1800-${Date.now()}.jpg`;
                  link.href = hdImage;
                  link.click();
                }
              }}
              variant="secondary"
              disabled={!croppedPreview()}
              title="Alta resolución para impresión profesional"
            >
              🖨️ Descargar HD
            </Button>
            
            <Button
              onClick={() => {
                // Original quality version - no scaling, just crop
                const originalImage = generateOriginalQualityDownload();
                if (originalImage) {
                  const crop = cropArea();
                  const link = document.createElement('a');
                  link.download = `pasaporte-original-${Math.round(crop.size)}x${Math.round(crop.size)}-${Date.now()}.png`;
                  link.href = originalImage;
                  link.click();
                }
              }}
              variant="secondary"
              disabled={!croppedPreview()}
              title="Descarga en resolución original sin escalar"
            >
              💎 Original (PNG)
            </Button>
            
            <Button
              onClick={confirmFinalPhoto}
              variant="primary"
              disabled={!croppedPreview()}
            >
              ✅ Confirmar Foto
            </Button>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default SimplePassportCrop;