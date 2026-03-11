import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { Card, Button } from '../../ui';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AdjustableCropEditorProps {
  imageUrl: string;
  initialCrop: CropArea;
  aspectRatio?: number; // width/height ratio (1 for square)
  onCropChange?: (crop: CropArea) => void;
  onCropConfirm?: (crop: CropArea, croppedImageUrl: string) => void;
  minCropSize?: number;
  showGrid?: boolean;
  countryCode?: string;
}

const AdjustableCropEditor: Component<AdjustableCropEditorProps> = (props) => {
  // Canvas refs
  let canvasRef: HTMLCanvasElement | undefined;
  let overlayCanvasRef: HTMLCanvasElement | undefined;
  
  // State
  const [cropArea, setCropArea] = createSignal<CropArea>(props.initialCrop);
  const [zoom, setZoom] = createSignal(1);
  const [panOffset, setPanOffset] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = createSignal<string>('');
  const [image, setImage] = createSignal<HTMLImageElement | null>(null);
  const [croppedPreview, setCroppedPreview] = createSignal<string>('');
  
  // Controls
  const [showGuides, setShowGuides] = createSignal(true);
  const [showLandmarks, setShowLandmarks] = createSignal(false);
  const [cropPadding, setCropPadding] = createSignal(20); // Extra padding around face
  
  const aspectRatio = props.aspectRatio || 1; // Default to square
  const minCropSize = props.minCropSize || 100;
  
  // Helper functions first
  const getCountryOutputSize = () => {
    const specs: Record<string, { width: number; height: number }> = {
      US: { width: 600, height: 600 },
      EU: { width: 413, height: 531 },
      CU: { width: 900, height: 900 },
      UK: { width: 413, height: 531 },
      CA: { width: 590, height: 826 },
      IN: { width: 413, height: 413 },
      AU: { width: 413, height: 531 }
    };
    return specs[props.countryCode || 'CU'] || { width: 900, height: 900 };
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
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set output size based on country
    const outputSize = getCountryOutputSize();
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cropped image
    ctx.drawImage(
      img,
      originalCrop.x, originalCrop.y, originalCrop.width, originalCrop.height,
      0, 0, canvas.width, canvas.height
    );
    
    setCroppedPreview(canvas.toDataURL('image/jpeg', 0.95));
  };

  const drawCropOverlay = (ctx: CanvasRenderingContext2D) => {
    const crop = cropArea();
    const canvas = ctx.canvas;
    
    // Draw semi-transparent overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear the crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(crop.x, crop.y, crop.width, crop.height);
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    
    // Draw inner border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(crop.x + 1, crop.y + 1, crop.width - 2, crop.height - 2);
    
    // Draw grid lines if enabled
    if (showGuides()) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Rule of thirds
      const thirdWidth = crop.width / 3;
      const thirdHeight = crop.height / 3;
      
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(crop.x + thirdWidth, crop.y);
      ctx.lineTo(crop.x + thirdWidth, crop.y + crop.height);
      ctx.moveTo(crop.x + thirdWidth * 2, crop.y);
      ctx.lineTo(crop.x + thirdWidth * 2, crop.y + crop.height);
      
      // Horizontal lines
      ctx.moveTo(crop.x, crop.y + thirdHeight);
      ctx.lineTo(crop.x + crop.width, crop.y + thirdHeight);
      ctx.moveTo(crop.x, crop.y + thirdHeight * 2);
      ctx.lineTo(crop.x + crop.width, crop.y + thirdHeight * 2);
      ctx.stroke();
      
      // Eye level guideline (at 35-40% from top)
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
    
    // Draw resize handles
    const handleSize = 12;
    const handles = [
      { x: crop.x - handleSize/2, y: crop.y - handleSize/2, cursor: 'nw-resize', type: 'nw' },
      { x: crop.x + crop.width - handleSize/2, y: crop.y - handleSize/2, cursor: 'ne-resize', type: 'ne' },
      { x: crop.x - handleSize/2, y: crop.y + crop.height - handleSize/2, cursor: 'sw-resize', type: 'sw' },
      { x: crop.x + crop.width - handleSize/2, y: crop.y + crop.height - handleSize/2, cursor: 'se-resize', type: 'se' },
      // Side handles
      { x: crop.x + crop.width/2 - handleSize/2, y: crop.y - handleSize/2, cursor: 'n-resize', type: 'n' },
      { x: crop.x + crop.width/2 - handleSize/2, y: crop.y + crop.height - handleSize/2, cursor: 's-resize', type: 's' },
      { x: crop.x - handleSize/2, y: crop.y + crop.height/2 - handleSize/2, cursor: 'w-resize', type: 'w' },
      { x: crop.x + crop.width - handleSize/2, y: crop.y + crop.height/2 - handleSize/2, cursor: 'e-resize', type: 'e' }
    ];
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
    
    // Draw crop info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(crop.x + 10, crop.y + 10, 200, 100);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Size: ${Math.round(crop.width)}×${Math.round(crop.height)}`, crop.x + 15, crop.y + 30);
    ctx.fillText(`Position: (${Math.round(crop.x)}, ${Math.round(crop.y)})`, crop.x + 15, crop.y + 50);
    ctx.fillText(`Zoom: ${(zoom() * 100).toFixed(0)}%`, crop.x + 15, crop.y + 70);
    
    // Show aspect ratio status
    const currentRatio = crop.width / crop.height;
    const ratioText = `Ratio: ${currentRatio.toFixed(2)} ${Math.abs(currentRatio - aspectRatio) < 0.01 ? '✓' : '⚠️'}`;
    ctx.fillText(ratioText, crop.x + 15, crop.y + 90);
  };

  const drawCanvas = () => {
    if (!canvasRef || !overlayCanvasRef || !image()) return;
    
    const ctx = canvasRef.getContext('2d');
    const overlayCtx = overlayCanvasRef.getContext('2d');
    
    if (!ctx || !overlayCtx) return;
    
    // Clear canvases
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    overlayCtx.clearRect(0, 0, overlayCanvasRef.width, overlayCanvasRef.height);
    
    // Draw image
    const img = image()!;
    const offset = panOffset();
    const currentZoom = zoom();
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(currentZoom, currentZoom);
    ctx.drawImage(img, 0, 0, canvasRef.width, canvasRef.height);
    ctx.restore();
    
    // Draw overlay
    drawCropOverlay(overlayCtx);
  };

  const initializeCanvas = () => {
    if (!canvasRef || !overlayCanvasRef || !image()) return;
    
    const img = image()!;
    const containerWidth = canvasRef.parentElement?.clientWidth || 800;
    const maxCanvasWidth = Math.min(containerWidth - 40, 800);
    
    // Calculate canvas size maintaining aspect ratio
    const scale = Math.min(maxCanvasWidth / img.width, 600 / img.height);
    
    canvasRef.width = img.width * scale;
    canvasRef.height = img.height * scale;
    overlayCanvasRef.width = canvasRef.width;
    overlayCanvasRef.height = canvasRef.height;
    
    // Scale initial crop to canvas coordinates
    const crop = cropArea();
    setCropArea({
      x: crop.x * scale,
      y: crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale
    });
  };

  const loadImage = () => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      initializeCanvas();
      drawCanvas();
      updateCroppedPreview();
    };
    img.src = props.imageUrl;
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
      // Move crop area
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
      props.onCropChange?.(getOriginalCoordinates(newCrop));
      
    } else if (isResizing()) {
      // Resize crop area
      const delta = {
        x: mousePos.x - dragStart().x,
        y: mousePos.y - dragStart().y
      };
      
      const crop = cropArea();
      let newCrop = { ...crop };
      
      // Handle resizing based on which handle is being dragged
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
      
      // Maintain square aspect ratio for passport photos
      if (aspectRatio === 1) {
        const avgSize = (newCrop.width + newCrop.height) / 2;
        newCrop.width = avgSize;
        newCrop.height = avgSize;
      }
      
      // Constrain to canvas bounds and minimum size
      newCrop.width = Math.max(minCropSize, Math.min(canvasRef!.width - newCrop.x, newCrop.width));
      newCrop.height = Math.max(minCropSize, Math.min(canvasRef!.height - newCrop.y, newCrop.height));
      newCrop.x = Math.max(0, Math.min(canvasRef!.width - newCrop.width, newCrop.x));
      newCrop.y = Math.max(0, Math.min(canvasRef!.height - newCrop.height, newCrop.y));
      
      setCropArea(newCrop);
      setDragStart(mousePos);
      drawCanvas();
      updateCroppedPreview();
      props.onCropChange?.(getOriginalCoordinates(newCrop));
      
    } else {
      // Update cursor based on hover position
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
    
    // Expand crop area by padding amount
    const crop = cropArea();
    const centerX = crop.x + crop.width / 2;
    const centerY = crop.y + crop.height / 2;
    
    const paddingPixels = newPadding * (Math.min(canvasRef!.width, canvasRef!.height) / 500);
    const newSize = Math.max(minCropSize, crop.width + (direction === 'increase' ? paddingPixels : -paddingPixels));
    
    const newCrop = {
      x: Math.max(0, centerX - newSize / 2),
      y: Math.max(0, centerY - newSize / 2),
      width: newSize,
      height: newSize
    };
    
    // Ensure crop doesn't exceed canvas bounds
    if (newCrop.x + newCrop.width > canvasRef!.width) {
      newCrop.x = canvasRef!.width - newCrop.width;
    }
    if (newCrop.y + newCrop.height > canvasRef!.height) {
      newCrop.y = canvasRef!.height - newCrop.height;
    }
    
    setCropArea(newCrop);
    drawCanvas();
    updateCroppedPreview();
    props.onCropChange?.(getOriginalCoordinates(newCrop));
  };
  
  const resetToAutoDetection = () => {
    setCropArea(props.initialCrop);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setCropPadding(20);
    drawCanvas();
    updateCroppedPreview();
  };
  
  const confirmCrop = () => {
    const finalCrop = getOriginalCoordinates(cropArea());
    props.onCropConfirm?.(finalCrop, croppedPreview());
  };

  // Lifecycle
  onMount(() => {
    loadImage();
    setupEventListeners();
  });
  
  onCleanup(() => {
    removeEventListeners();
  });
  
  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{
          'font-size': '1.25rem',
          'font-weight': '600',
          'margin-bottom': '1.5rem'
        }}>
          ✂️ Adjustable Crop Editor
        </h3>
        
        {/* Controls */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
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
          
          {/* Crop Padding */}
          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              Hair/Head Padding: {cropPadding()}px
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                onClick={() => adjustCropPadding('decrease')}
                variant="secondary"
                size="sm"
                title="Reduce padding (tighter crop)"
              >
                Tighter
              </Button>
              <Button
                onClick={() => adjustCropPadding('increase')}
                variant="secondary"
                size="sm"
                title="Increase padding (include more hair)"
              >
                More Hair
              </Button>
            </div>
          </div>
          
          {/* Display Options */}
          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              Display Options
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
                Show guides & eye line
              </label>
              <label style={{ 'font-size': '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={showLandmarks()}
                  onChange={(e) => setShowLandmarks(e.target.checked)}
                  style={{ 'margin-right': '0.5rem' }}
                />
                Show face landmarks
              </label>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div>
            <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
              Quick Actions
            </label>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
              <Button
                onClick={resetToAutoDetection}
                variant="secondary"
                size="sm"
              >
                🔄 Reset to Auto
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
                🎯 Center & Fit
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
            <h4 style={{ 'margin-bottom': '0.5rem' }}>Crop Editor</h4>
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
              💡 Drag to move, resize using handles, scroll to zoom
            </p>
          </div>
          
          {/* Live Preview */}
          <div>
            <h4 style={{ 'margin-bottom': '0.5rem' }}>Live Preview</h4>
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
                alt="Crop preview"
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
                  {props.countryCode || 'CU'} Passport Specification
                </div>
              </div>
            </Show>
          </div>
        </div>
        
        {/* Instructions */}
        <div style={{
          padding: '1rem',
          background: 'var(--info-light)',
          'border-radius': 'var(--border-radius)',
          'margin-bottom': '1.5rem'
        }}>
          <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--info-dark)' }}>
            📋 Passport Photo Guidelines
          </h5>
          <ul style={{
            margin: '0',
            'padding-left': '1.5rem',
            'font-size': '0.875rem',
            color: 'var(--info-dark)'
          }}>
            <li>Eyes should be at the cyan guideline (35-40% from top)</li>
            <li>Face should occupy 70-80% of the photo height</li>
            <li>Include enough space above head for hair</li>
            <li>Ensure ears are visible (if not covered by hair)</li>
            <li>Maintain neutral expression and direct gaze</li>
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'justify-content': 'center'
        }}>
          <Button
            onClick={() => {
              const link = document.createElement('a');
              link.download = `passport-photo-adjusted-${Date.now()}.jpg`;
              link.href = croppedPreview();
              link.click();
            }}
            variant="secondary"
            disabled={!croppedPreview()}
          >
            📥 Download Adjusted Photo
          </Button>
          
          <Button
            onClick={confirmCrop}
            variant="primary"
            disabled={!croppedPreview()}
          >
            ✅ Confirm Crop
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AdjustableCropEditor;