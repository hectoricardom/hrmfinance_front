import { Component, createSignal, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { Button } from '../modules/ui';
import { uploadImage, convertImageToBase64, isImageFile, ImageUploadOptions, ImageUploadResponse } from '../services/imageUpload';
import Icon from './Icon';
import { devLog } from '../services/utils';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageUploadWithCropProps {
  onImageUpload?: (base64: string, fileName: string, uploadResult?: ImageUploadResponse) => void;
  onError?: (error: string) => void;
  currentImage?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  uploadToServer?: boolean;
  options?: ImageUploadOptions;
  style?: any;
  aspectRatio?: number; // For passport photos, should be 1 (square)
  enableCrop?: boolean; // Enable/disable cropping
  minWidth?: number; // Minimum width for passport photos (default 300px)
  minHeight?: number; // Minimum height for passport photos (default 300px)
  autoScale?: boolean; // Auto-scale small images to meet minimum requirements
}

const ImageUploadWithCrop: Component<ImageUploadWithCropProps> = (props) => {
  const [uploading, setUploading] = createSignal(false);
  const [dragOver, setDragOver] = createSignal(false);
  const [previewImage, setPreviewImage] = createSignal<string>(props.currentImage || '');
  const [showCropper, setShowCropper] = createSignal(false);
  const [tempImage, setTempImage] = createSignal<string>('');
  const [tempFileName, setTempFileName] = createSignal<string>('');
  const [tempFile, setTempFile] = createSignal<File | null>(null);
  const [showOptions, setShowOptions] = createSignal(false);
  const [cropArea, setCropArea] = createSignal<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [resizeType, setResizeType] = createSignal<'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w'>('se');
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
  const [imageSize, setImageSize] = createSignal({ width: 0, height: 0 });
  const [displayedImageSize, setDisplayedImageSize] = createSignal({ width: 0, height: 0 });
  const [imageOffset, setImageOffset] = createSignal({ x: 0, y: 0 });
  const [currentAspectRatio, setCurrentAspectRatio] = createSignal(props.aspectRatio || 1);
  const [scalingInfo, setScalingInfo] = createSignal<string>('');
  const [showZoom, setShowZoom] = createSignal(false);
  const [zoomLevel, setZoomLevel] = createSignal(2); // 2x zoom by default
  const [zoomPreview, setZoomPreview] = createSignal<string>('');
  const aspectRatio = () => currentAspectRatio();
  


  // Dynamic zoom calculation based on crop area size
  const dynamicZoom = () => {
    const crop = cropArea();
    const baseSize = 200; // Base size for zoom calculation
    return Math.max(2, baseSize / Math.min(crop.width, crop.height));
  };

  let canvasRef: HTMLCanvasElement | undefined;
  let imageRef: HTMLImageElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let previewCanvasRef: HTMLCanvasElement | undefined;

  // Default minimum dimensions for passport photos (4.5cm x 4.5cm at 300 DPI ≈ 530x530px)
  const getMinDimensions = () => ({
    minWidth: props.minWidth || 300,
    minHeight: props.minHeight || 300,
    autoScale: props.autoScale !== false // Default to true
  });

  // Function to scale up image if it's smaller than minimum dimensions
  const scaleImageIfNeeded = async (file: File): Promise<File> => {
    const { minWidth, minHeight, autoScale } = getMinDimensions();
    
    if (!autoScale) return file;

    return new Promise((resolve) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        const { width, height } = img;
        
        // Check if scaling is needed
        const needsScaling = width < minWidth || height < minHeight;
        
        if (!needsScaling) {
          setScalingInfo('');
          resolve(file);
          return;
        }
        
        // Calculate scale factor to meet minimum requirements
        const scaleX = minWidth / width;
        const scaleY = minHeight / height;
        const scale = Math.max(scaleX, scaleY); // Use larger scale to ensure both dimensions meet minimum
        
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);
        
        //devLog(`📏 Scaling image from ${width}x${height} to ${newWidth}x${newHeight} (scale: ${scale.toFixed(2)}x)`);
        setScalingInfo(`Imagen escalada de ${width}×${height} a ${newWidth}×${newHeight} para cumplir requisitos mínimos`);
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Scale and draw image
        ctx!.imageSmoothingEnabled = true;
        ctx!.imageSmoothingQuality = 'high';
        ctx!.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert back to file
        canvas.toBlob((blob) => {
          if (blob) {
            const scaledFile = new File([blob], file.name, { 
              type: file.type,
              lastModified: file.lastModified 
            });
            resolve(scaledFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.95); // High quality for upscaled images
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  // Auto-hide zoom overlay after a delay when not resizing
  const hideZoomOverlayDelayed = () => {
    setTimeout(() => {
      if (!isResizing() && !isDragging()) {
        setShowZoom(false);
      }
    }, 2000); // Hide after 2 seconds
  };

  const updatePreviewCanvas = () => {
    if (!previewCanvasRef || !imageRef || !showZoom()) return;
    
    const ctx = previewCanvasRef.getContext('2d');
    if (!ctx) return;
    
    const crop = cropArea();
    const imgSize = imageSize();
    const displaySize = displayedImageSize();
    
    // Clear canvas
    ctx.clearRect(0, 0, 150, 150);
    
    // Calculate scale to convert displayed coordinates to natural image coordinates
    const scaleX = imgSize.width / displaySize.width;
    const scaleY = imgSize.height / displaySize.height;
    
    // Convert crop area to natural image coordinates
    const sourceCrop = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY
    };
    
    // Draw the cropped portion scaled to fit 150x150 preview
    ctx.drawImage(
      imageRef,
      sourceCrop.x,
      sourceCrop.y,
      sourceCrop.width,
      sourceCrop.height,
      0,
      0,
      150,
      150
    );
  };

  const getCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!canvasRef || !imageRef) {
        reject(new Error('Canvas or image not ready'));
        return;
      }

      const crop = cropArea();
      const imgSize = imageSize();
      const displaySize = displayedImageSize();
      const canvas = canvasRef;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }

      // Convert displayed coordinates to natural image coordinates
      const scaleX = imgSize.width / displaySize.width;
      const scaleY = imgSize.height / displaySize.height;
      
      const naturalCrop = {
        x: crop.x * scaleX,
        y: crop.y * scaleY,
        width: crop.width * scaleX,
        height: crop.height * scaleY
      };

      // Set canvas size to desired output (use natural dimensions)
      canvas.width = naturalCrop.width;
      canvas.height = naturalCrop.height;

      // Draw the cropped image using natural coordinates
      ctx.drawImage(
        imageRef,
        naturalCrop.x,
        naturalCrop.y,
        naturalCrop.width,
        naturalCrop.height,
        0,
        0,
        naturalCrop.width,
        naturalCrop.height
      );

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const handleImageLoad = () => {
    //devLog('🖼️ Image load triggered');
    if (!imageRef || !containerRef) {
      //devLog('❌ Missing refs:', { imageRef: !!imageRef, containerRef: !!containerRef });
      return;
    }

    const imgWidth = imageRef.naturalWidth;
    const imgHeight = imageRef.naturalHeight;
    //devLog('📐 Image natural dimensions:', { width: imgWidth, height: imgHeight });
    setImageSize({ width: imgWidth, height: imgHeight });

    // Calculate displayed image dimensions and position
    const containerWidth = containerRef.clientWidth;
    const containerHeight = containerRef.clientHeight;
    const imgAspectRatio = imgWidth / imgHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imgAspectRatio > containerAspectRatio) {
      // Image is wider than container
      displayWidth = containerWidth;
      displayHeight = containerWidth / imgAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Image is taller than container
      displayWidth = containerHeight * imgAspectRatio;
      displayHeight = containerHeight;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }

    setDisplayedImageSize({ width: displayWidth, height: displayHeight });
    setImageOffset({ x: offsetX, y: offsetY });

    // Calculate initial crop area - free aspect ratio
    const minDimension = Math.min(displayWidth, displayHeight);
    const width = Math.min(minDimension * 0.6, 300); // 60% of smallest dimension or 300px max
    const height = Math.min(minDimension * 0.6, 300); // Square by default, but freely resizable
    
    const x = (displayWidth - width) / 2;
    const y = (displayHeight - height) / 2;

    setCropArea({ x, y, width, height });
  };

  const handleMouseDown = (e: MouseEvent, action: 'move' | 'resize', direction?: 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w') => {
    e.preventDefault();
    if (action === 'move') {
      setIsDragging(true);
      setShowZoom(true);
    } else {
      setIsResizing(true);
      setResizeType(direction || 'se');
      setShowZoom(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Initial preview update
    setTimeout(() => {
      updatePreviewCanvas();
    }, 10);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging() && !isResizing()) return;
    if (!imageRef) return;

    const deltaX = e.clientX - dragStart().x;
    const deltaY = e.clientY - dragStart().y;
    const currentCrop = cropArea();
    const displaySize = displayedImageSize();
    
   
    if (isDragging()) {
      // Move the crop area within displayed image bounds
      const newX = Math.max(0, Math.min(displaySize.width - currentCrop.width, currentCrop.x + deltaX));
      const newY = Math.max(0, Math.min(displaySize.height - currentCrop.height, currentCrop.y + deltaY));
      
      setCropArea({
        ...currentCrop,
        x: newX,
        y: newY
      });
    } else if (isResizing()) {
      // Resize the crop area - free aspect ratio
      const type = resizeType();
      let newX = currentCrop.x;
      let newY = currentCrop.y;
      let newWidth = currentCrop.width;
      let newHeight = currentCrop.height;
      
      // Calculate new dimensions based on resize direction - FREE ASPECT RATIO
      switch (type) {
        case 'se': // Bottom-right
          newWidth = Math.max(50, currentCrop.width + deltaX);
          newHeight = Math.max(30, currentCrop.height + deltaY);
          break;
        case 'sw': // Bottom-left
          newWidth = Math.max(50, currentCrop.width - deltaX);
          newHeight = Math.max(30, currentCrop.height + deltaY);
          newX = currentCrop.x + currentCrop.width - newWidth;
          break;
        case 'ne': // Top-right
          newWidth = Math.max(50, currentCrop.width + deltaX);
          newHeight = Math.max(30, currentCrop.height - deltaY);
          newY = currentCrop.y + currentCrop.height - newHeight;
          break;
        case 'nw': // Top-left
          newWidth = Math.max(50, currentCrop.width - deltaX);
          newHeight = Math.max(30, currentCrop.height - deltaY);
          newX = currentCrop.x + currentCrop.width - newWidth;
          newY = currentCrop.y + currentCrop.height - newHeight;
          break;
        case 'n': // Top
          newHeight = Math.max(30, currentCrop.height - deltaY);
          newY = currentCrop.y + currentCrop.height - newHeight;
          break;
        case 's': // Bottom
          newHeight = Math.max(30, currentCrop.height + deltaY);
          break;
        case 'e': // Right
          newWidth = Math.max(50, currentCrop.width + deltaX);
          break;
        case 'w': // Left
          newWidth = Math.max(50, currentCrop.width - deltaX);
          newX = currentCrop.x + currentCrop.width - newWidth;
          break;
      }
      
      // Ensure the new crop area fits within displayed image bounds
      newX = Math.max(0, Math.min(displaySize.width - newWidth, newX));
      newY = Math.max(0, Math.min(displaySize.height - newHeight, newY));
      
      // Adjust width and height if they exceed bounds - NO RATIO CONSTRAINTS
      const maxWidth = displaySize.width - newX;
      const maxHeight = displaySize.height - newY;
      
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
      }
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
      }
      
      setCropArea({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
      
      // Zoom overlay removed for simplified UI
    }

    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Update preview canvas
    requestAnimationFrame(() => {
      updatePreviewCanvas();
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    // Hide zoom overlay after resizing
    hideZoomOverlayDelayed();
  };

  onMount(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  onCleanup(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });

  const handleFileSelect = async (file: File) => {
    if (!isImageFile(file)) {
      props.onError?.('Por favor seleccione un archivo de imagen válido');
      return;
    }

    setTempFileName(file.name);
    setTempFile(file);
    
    try {
      // Convert to base64 for preview
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result as string);
        if (props.enableCrop !== false) {
          // Show options to crop or use original
          setShowOptions(true);
        } else {
          // If cropping is disabled, process directly
          processImage(file);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      props.onError?.('Error al procesar la imagen');
    }
  };

  const handleCropChoice = async () => {
    const file = tempFile();
    if (!file) {
      console.error('❌ No file found in tempFile for cropping');
      return;
    }
    
    setShowOptions(false);
    
    try {
      // Scale image if needed before cropping
      const scaledFile = await scaleImageIfNeeded(file);
      
      // Set up for cropping
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result as string);
        setShowCropper(true);
        
        // Force crop area after a delay
        setTimeout(() => {
          if (cropArea().width === 200 && cropArea().height === 200) {
            setCropArea({ x: 100, y: 100, width: 300, height: 300 });
            setImageSize({ width: 800, height: 600 });
            setDisplayedImageSize({ width: 500, height: 400 });
            setImageOffset({ x: 50, y: 50 });
          }
        }, 500);
      };
      reader.readAsDataURL(scaledFile);
    } catch (error) {
      console.error('Error scaling image:', error);
      props.onError?.('Error al procesar la imagen');
    }
  };

  const handleOriginalChoice = async () => {
    const file = tempFile();
    const fileName = tempFileName();
    if (!file) {
      console.error('❌ No file found in tempFile');
      return;
    }
    
    setShowOptions(false);
    await processImage(file, fileName);
    
    // Clear temp states
    setTempImage('');
    setTempFileName('');
    setTempFile(null);
  };

  const processImage = async (file: File | Blob, fileName?: string) => {
    setUploading(true);

    try {
      let result;
      



      if (props.uploadToServer) {
        // Create a File object if we have a Blob
        const fileToUpload = file instanceof File ? file : new File([file], fileName || 'image.jpg', { type: 'image/jpeg' });
        result = await uploadImage(fileToUpload, props.options);
      } else {
        // Convert to base64 only
        const fileToProcess = file instanceof File ? file : new File([file], fileName || 'image.jpg', { type: 'image/jpeg' });
        result = await convertImageToBase64(fileToProcess, props.options);
      }
      
      if (result.success && result.base64) {
        const previewImage = result.imageUrl || result.base64;
        setPreviewImage(previewImage);
        props.onImageUpload?.(result.base64, result.fileName || fileName || 'image.jpg', result);
      } else {
        props.onError?.(result.error || 'Error al procesar la imagen');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      props.onError?.(error instanceof Error ? error.message : 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleCropComplete = async () => {
    if (!tempImage()) return;

    try {
      const croppedBlob = await getCroppedImage();
      await processImage(croppedBlob, tempFileName());
      
      setShowCropper(false);
      setTempImage('');
      setTempFileName('');
    } catch (error) {
      console.error('Crop error:', error);
      props.onError?.('Error al recortar la imagen');
    }
  };

  const handleFileInputChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const clearImage = () => {
    setPreviewImage('');
    props.onImageUpload?.('', '');
  };

  const openFileDialog = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleFileInputChange;
    input.click();
  };



  createEffect(()=>{
    if(props?.currentImage){
        setPreviewImage(props?.currentImage);
    }
    
  })

  const dropZoneStyle = {
    border: `2px dashed ${dragOver() ? 'var(--primary-color)' : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius)',
    padding: '2rem',
    'text-align': 'center' as const,
    background: dragOver() ? 'var(--primary-color-light)' : 'var(--background-color)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ...props.style
  };

  const previewStyle = {
    'max-width': '200px',
    'max-height': '200px',
    width: '100%',
    height: 'auto',
    'object-fit': 'cover' as const,
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  return (
    <div>
      <Show when={props.label}>
        <label style={{
          display: 'block',
          'margin-bottom': '0.5rem',
          'font-weight': '500',
          color: 'var(--text-primary)'
        }}>
          {props.label}
        </label>
      </Show>

      {/* Options Panel - Inline */}
      <Show when={showOptions()}>
        <div style={{
          'margin-top': '1rem',
          padding: '1.5rem',
          border: '2px solid var(--primary-color)',
          'border-radius': 'var(--border-radius)',
          background: 'var(--background-secondary)'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            'font-size': '1.1rem',
            color: 'var(--text-primary)'
          }}>
            ¿Cómo desea usar la imagen?
          </h3>
          
          {/* Image preview */}
          <div style={{
            'text-align': 'center',
            'margin-bottom': '1rem'
          }}>
            <img
              src={tempImage()}
              alt="Preview"
              style={{
                'max-width': '150px',
                'max-height': '150px',
                'border-radius': 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}
            />
          </div>
          
          {/* Options */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            'flex-wrap': 'wrap'
          }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCropChoice}
            >
              ✂️ Recortar
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOriginalChoice}
            >
              🖼️ Original
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowOptions(false);
                setTempImage('');
                setTempFileName('');
                setTempFile(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Show>

      {/* Inline Cropper */}
      <Show when={showCropper()}>
        <div style={{
          'margin-top': '1rem',
          padding: '1.5rem',
          border: '2px solid var(--primary-color)',
          'border-radius': 'var(--border-radius)',
          background: 'var(--background-secondary)'
        }}>
          <div style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            'margin-bottom': '1rem'
          }}>
            <h3 style={{ 
              margin: '0',
              color: 'var(--primary-color)',
              'font-size': '1.25rem'
            }}>
              ✂️ Recortar Imagen
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCropper(false);
                setTempImage('');
                setTempFileName('');
              }}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': '4px',
                background: 'white',
                cursor: 'pointer',
                'font-size': '1.2rem'
              }}
            >
              ✕
            </button>
          </div>

            {/* Free Crop Mode Info
            <div style={{
              'margin-bottom': '1rem',
              padding: '0.75rem',
              background: 'var(--warning-light)',
              'border-radius': 'var(--border-radius-sm)',
              border: '2px solid var(--warning-color)'
            }}>
              <p style={{
                'font-size': '0.85rem',
                color: 'var(--warning-dark)',
                margin: '0',
                'line-height': '1.4',
                'font-weight': '600'
              }}>
                🎯 <strong>BUSQUE LOS PUNTOS DE REDIMENSIÓN:</strong><br/>
                🔴 Esquinas naranjas (4 círculos) - redimensionar diagonalmente<br/>
                🟢 Lados verdes (4 rectángulos) - redimensionar horizontalmente/verticalmente
              </p>
            </div>
             */}

            {/* Scaling Information */}
            <Show when={scalingInfo()}>
              <div style={{
                'margin-bottom': '1rem',
                padding: '0.75rem',
                background: 'var(--info-light)',
                color: 'var(--info-dark)',
                'border-radius': 'var(--border-radius-sm)',
                border: '1px solid var(--info-color)',
                'font-size': '0.875rem'
              }}>
                <span style={{ 'margin-right': '0.5rem' }}>ℹ️</span>
                {scalingInfo()}
              </div>
            </Show>
            
            <div 
              ref={containerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '400px',
                background: '#f8f9fa',
                'margin-bottom': '1rem',
                //overflow: 'hidden',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                border: '2px dashed var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            >
              <img
                ref={imageRef}
                src={tempImage()}
                onLoad={handleImageLoad}
                style={{
                  'max-width': '100%',
                  'max-height': '100%',
                  display: 'block'
                }}
              />
              
              {/* ALWAYS show crop overlay for debugging */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                'pointer-events': 'none'
              }}>
                {/* Debug overlay /}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '5px 10px',
                  'border-radius': '4px',
                  'font-family': 'monospace',
                  'font-size': '12px',
                  'z-index': '1000'
                }}>
                  Crop: {cropArea().x},{cropArea().y} {cropArea().width}×{cropArea().height}<br/>
                  Image: {imageSize().width}×{imageSize().height}<br/>
                  Show: {imageSize().width > 0 ? 'YES' : 'NO'}
                </div>
                */}
                  {/* Semi-transparent overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)'
                  }} />
                  
                  {/* FORCE VISIBLE Crop area */}
                  <div
                    id="FORCE VISIBLE Crop area"
                    style={{
                      position: 'absolute',
                      left: `${imageOffset().x + cropArea().x}px`,
                      top: `${imageOffset().y + cropArea().y}px`,
                      width: `${Math.max(cropArea().width, 30)}px`,
                      height: `${Math.max(cropArea().height, 30)}px`,
                      border: '3px solid transparent',
                      'box-shadow': '0 0 0 1px rgba(255,255,255,1), 0 0 5px rgba(0,0,0,0.3)',
                      cursor: 'move',
                      'pointer-events': 'all',
                      'background-color': 'rgba(0,0,0,0.52)',
                      'z-index': '999',
                      display: 'block'
                    }}
                    onMouseDown={(e) => {
                      //devLog('🎯 Crop area clicked');
                      handleMouseDown(e, 'move');
                    }}
                  >
                    {/* Center label */}
                    <div 
                    id="Center label"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(255,255,255,0.39)',
                      padding: '5px 10px',
                      'border-radius': '4px',
                      'font-weight': 'bold',
                      'pointer-events': 'none',
                      color: '#000'
                    }}>
                     
                    </div>
                    {/* Clear window in overlay */}
                    <div 
                       id="Clear window in overlay"
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      right: '-2px',
                      bottom: '-2px',
                      background: 'rgba(255, 255, 255, 0.01)'
                    }} />
                    
                    {/* HUGE resize handle */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-10px',
                        right: '-10px',
                        width: '10px',
                        height: '10px',
                        background: '#00ff00',
                        border: '1px solid #000000',
                        'border-radius': '50%',
                        cursor: 'nwse-resize',
                        'z-index': '1000',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '20px',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        devLog('🟢 Resize handle clicked');
                        handleMouseDown(e, 'resize', 'se');
                      }}
                    >
                     
                    </div>
                    <div
                      title="Resize: Bottom-Left Corner"
                      style={{
                        position: 'absolute',
                        bottom: '-10px',
                        left: '-10px',
                        width: '10px',
                        height: '10px',
                        background: '#ff6600',
                        border: '1px solid #ffffff',
                        'border-radius': '50%',
                        cursor: 'nesw-resize',
                        'box-shadow': '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.9)',
                        'z-index': '1000',
                        transition: 'all 0.2s ease',
                        'pointer-events': 'all',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '16px',
                        color: 'white',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        //devLog('SW resize handle clicked');
                        handleMouseDown(e, 'resize', 'sw');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.3)';
                        e.target.style.background = '#ff8800';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.background = '#ff6600';
                      }}
                    >
                     
                    </div>
                    <div
                      title="Resize: Top-Right Corner"
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '10px',
                        height: '10px',
                        background: '#ff6600',
                        border: '1px solid #ffffff',
                        'border-radius': '50%',
                        cursor: 'nesw-resize',
                        'box-shadow': '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.9)',
                        'z-index': '1000',
                        transition: 'all 0.2s ease',
                        'pointer-events': 'all',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '16px',
                        color: 'white',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, 'resize', 'ne');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.3)';
                        e.target.style.background = '#ff8800';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.background = '#ff6600';
                      }}
                    >
                      
                    </div>
                    <div
                      title="Resize: Top-Left Corner"
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '-10px',
                        width: '10px',
                        height: '10px',
                        background: '#ff6600',
                        border: '1px solid #ffffff',
                        'border-radius': '50%',
                        cursor: 'nwse-resize',
                        'box-shadow': '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.9)',
                        'z-index': '1000',
                        transition: 'all 0.2s ease',
                        'pointer-events': 'all',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '16px',
                        color: 'white',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, 'resize', 'nw');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.3)';
                        e.target.style.background = '#ff8800';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.background = '#ff6600';
                      }}
                    >
                      
                    </div>
                    
                    {/* Side resize handles - VERY visible */}
                    <div
                      title="Resize: Top Side"
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '10px',
                        height: '10px',
                        background: '#00cc66',
                        border: '1px solid #ffffff',
                        'border-radius': '12px',
                        cursor: 'ns-resize',
                        'box-shadow': '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.9)',
                        'z-index': '1000',
                        transition: 'all 0.2s ease',
                        'pointer-events': 'all',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '14px',
                        color: 'white',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        //devLog('N resize handle clicked');
                        handleMouseDown(e, 'resize', 'n');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateX(-50%) scale(1.3)';
                        e.target.style.background = '#00ff77';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateX(-50%) scale(1)';
                        e.target.style.background = '#00cc66';
                      }}
                    >
                      ↑
                    </div>
                    <div
                      title="Resize: Bottom Side"
                      style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '10px',
                        height: '10px',
                        background: '#00cc66',
                        border: '1px solid #ffffff',
                        'border-radius': '12px',
                        cursor: 'ns-resize',
                        'box-shadow': '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.9)',
                        'z-index': '1000',
                        transition: 'all 0.2s ease',
                        'pointer-events': 'all',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '14px',
                        color: 'white',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        //devLog('S resize handle clicked');
                        handleMouseDown(e, 'resize', 's');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateX(-50%) scale(1.3)';
                        e.target.style.background = '#00ff77';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateX(-50%) scale(1)';
                        e.target.style.background = '#00cc66';
                      }}
                    >
                      ↓
                    </div>
                    <div
                      title="Resize: Left Side"
                      style={{
                        position: 'absolute',
                        left: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '10px',
                        height: '10px',
                        background: '#00cc66',
                        border: '2px solid #ffffff',
                        'border-radius': '12px',
                        cursor: 'ew-resize',
                        'box-shadow': '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.9)',
                        'z-index': '1000',
                        transition: 'all 0.2s ease',
                        'pointer-events': 'all',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '14px',
                        color: 'white',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        //devLog('W resize handle clicked');
                        handleMouseDown(e, 'resize', 'w');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-50%) scale(1.3)';
                        e.target.style.background = '#00ff77';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(-50%) scale(1)';
                        e.target.style.background = '#00cc66';
                      }}
                    >
                     
                    </div>
                    <div
                      title="Resize: Right Side"
                      style={{
                        position: 'absolute',
                        right: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '10px',
                        height: '10px',
                        background: '#00cc66',
                        border: '2px solid #ffffff',
                        'border-radius': '12px',
                        cursor: 'ew-resize',
                        'box-shadow': '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.9)',
                        'z-index': '1000',
                        transition: 'all 0.2s ease',
                        'pointer-events': 'all',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'font-size': '14px',
                        color: 'white',
                        'font-weight': 'bold'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        //devLog('E resize handle clicked');
                        handleMouseDown(e, 'resize', 'e');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-50%) scale(1.3)';
                        e.target.style.background = '#00ff77';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(-50%) scale(1)';
                        e.target.style.background = '#00cc66';
                      }}
                    >
                     
                    </div>
                    
                    {/* Grid lines */}
                    <div style={{
                      position: 'absolute',
                      top: '33.33%',
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      'pointer-events': 'none'
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '66.66%',
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      'pointer-events': 'none'
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: '33.33%',
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      'pointer-events': 'none'
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: '66.66%',
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      'pointer-events': 'none'
                    }} />
                  </div>
                  
                  {/* Dynamic Zoom Overlay */}
                  <Show when={showZoom() && (isResizing() || isDragging())}>
                    <div style={{
                      position: 'absolute',
                      top: '-30px',
                      right: '-30px',
                      width: '150px',
                      height: '150px',
                      border: '3px solid var(--primary-color)',
                      'border-radius': '8px',
                      background: 'rgba(0, 0, 0, 0.8)',
                      'backdrop-filter': 'blur(4px)',
                      'z-index': '20',
                      overflow: 'hidden',
                      'pointer-events': 'none'
                    }}>
                      {/* Zoom content - Show exact crop area */}
                      <canvas
                        ref={previewCanvasRef}
                        width={150}
                        height={150}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: '#000'
                        }}
                      />
                      {/* Border to show exact crop boundaries */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        border: '2px solid #00ff00',
                        'pointer-events': 'none'
                      }} />
                      
                     
                      
                    </div>
                  </Show>
              </div>
            </div>


            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              'justify-content': 'flex-end',
              'margin-top': '1rem'
            }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCropper(false);
                  setTempImage('');
                  setTempFileName('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCropComplete}
              >
                ✂️ Recortar y Usar
              </Button>
            </div>
        </div>
      </Show>

      <Show
        when={previewImage()}
        fallback={
          <div
            style={dropZoneStyle}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={props.disabled ? undefined : openFileDialog}
          >
            <Show when={uploading()} fallback={
              <>
                <Icon name="camera" size="2rem" style={{ 
                  color: 'var(--text-muted)', 
                  'margin-bottom': '1rem' 
                }} />
                <p style={{ 
                  color: 'var(--text-muted)', 
                  'margin-bottom': '0.5rem',
                  'font-size': '1rem'
                }}>
                  {props.placeholder || 'Arrastra una imagen aquí o haz clic para seleccionar'}
                </p>
                <p style={{ 
                  color: 'var(--text-muted)', 
                  'font-size': '0.875rem' 
                }}>
                  Formatos soportados: JPG, PNG, WebP (máx. 2MB)
                </p>
                <Show when={props.enableCrop !== false}>
                  <p style={{ 
                    color: 'var(--primary-color)', 
                    'font-size': '0.75rem',
                    'margin-top': '0.5rem'
                  }}>
                    ✂️ Podrá recortar la imagen después de seleccionarla
                  </p>
                </Show>
              </>
            }>
              <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--primary-color)',
                  'border-top-color': 'transparent',
                  'border-radius': '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Subiendo imagen...</span>
              </div>
            </Show>
          </div>
        }
      >
        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          gap: '1rem'
        }}>
          <img 
            src={previewImage()} 
            alt="Vista previa"
            style={previewStyle}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={openFileDialog}
              disabled={props.disabled || uploading()}
            >
              <Icon name="edit" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Cambiar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearImage}
              disabled={props.disabled || uploading()}
            >
              <Icon name="delete" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Eliminar
            </Button>
          </div>
        </div>
      </Show>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    
  );
};

export default ImageUploadWithCrop;