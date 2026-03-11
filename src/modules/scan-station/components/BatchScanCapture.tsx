/**
 * BatchScanCapture Component
 * Camera/file picker supporting batch mode with thumbnail grid,
 * drag-and-drop support, and processing status per item.
 */

import { Component, createSignal, createEffect, onCleanup, Show, For } from 'solid-js';
import { Button } from '../../ui';

export interface BatchScanCaptureProps {
  /** Called when files are selected/captured and ready for processing */
  onFilesReady: (files: File[]) => void;
  /** Whether processing is currently active */
  isProcessing: boolean;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Whether to allow camera capture */
  allowCamera?: boolean;
  /** Accepted file types */
  accept?: string;
}

interface CapturedFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
}

const BatchScanCapture: Component<BatchScanCaptureProps> = (props) => {
  const [files, setFiles] = createSignal<CapturedFile[]>([]);
  const [isDragging, setIsDragging] = createSignal(false);
  const [showCamera, setShowCamera] = createSignal(false);
  const [cameraError, setCameraError] = createSignal<string | null>(null);

  let fileInputRef: HTMLInputElement | undefined;
  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let streamRef: MediaStream | null = null;

  const maxFiles = () => props.maxFiles || 50;
  const acceptTypes = () => props.accept || 'image/*,application/pdf';

  // Cleanup camera stream on unmount
  onCleanup(() => {
    stopCamera();
  });

  // ============================================
  // File Selection
  // ============================================

  const handleFileInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      addFiles(Array.from(input.files));
    }
    // Reset the input so the same files can be selected again
    input.value = '';
  };

  const addFiles = async (newFiles: File[]) => {
    const currentCount = files().length;
    const availableSlots = maxFiles() - currentCount;
    const filesToAdd = newFiles.slice(0, availableSlots);

    const capturedFiles: CapturedFile[] = [];
    for (const file of filesToAdd) {
      const previewUrl = await createPreviewUrl(file);
      capturedFiles.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
      });
    }

    setFiles((prev) => [...prev, ...capturedFiles]);
  };

  const createPreviewUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        // Use a simple PDF icon placeholder for PDFs
        resolve('');
      } else {
        resolve('');
      }
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      // Revoke old preview URLs to free memory
      const removed = prev.find((f) => f.id === id);
      if (removed?.previewUrl && removed.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return updated;
    });
  };

  const clearAll = () => {
    files().forEach((f) => {
      if (f.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles([]);
  };

  const handleProcessAll = () => {
    const fileList = files().map((f) => f.file);
    if (fileList.length > 0) {
      props.onFilesReady(fileList);
    }
  };

  // ============================================
  // Drag and Drop
  // ============================================

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  // ============================================
  // Camera Capture
  // ============================================

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef = stream;
      if (videoRef) {
        videoRef.srcObject = stream;
        await videoRef.play();
      }
      setShowCamera(true);
    } catch (error: any) {
      setCameraError(error.message || 'Failed to access camera');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef) {
      streamRef.getTracks().forEach((track) => track.stop());
      streamRef = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef || !canvasRef) return;

    canvasRef.width = videoRef.videoWidth;
    canvasRef.height = videoRef.videoHeight;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef, 0, 0);
    canvasRef.toBlob(
      (blob) => {
        if (blob) {
          const file = new File(
            [blob],
            `scan_${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          addFiles([file]);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // ============================================
  // Utility
  // ============================================

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={{ width: '100%' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes()}
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera View */}
      <Show when={showCamera()}>
        <div style={{
          position: 'relative',
          width: '100%',
          'max-width': '600px',
          margin: '0 auto 16px',
          'border-radius': '12px',
          overflow: 'hidden',
          background: '#000',
        }}>
          <video
            ref={videoRef}
            autoplay
            muted
            playsinline
            style={{ width: '100%', display: 'block' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '0',
            right: '0',
            display: 'flex',
            'justify-content': 'center',
            gap: '12px',
          }}>
            <button
              onClick={capturePhoto}
              style={{
                width: '64px',
                height: '64px',
                'border-radius': '50%',
                border: '4px solid white',
                background: 'rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                'backdrop-filter': 'blur(4px)',
              }}
              title="Capture"
            />
            <button
              onClick={stopCamera}
              style={{
                padding: '12px 20px',
                'border-radius': '24px',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                'font-size': '14px',
                'font-weight': '600',
                cursor: 'pointer',
                'backdrop-filter': 'blur(4px)',
              }}
            >
              Close Camera
            </button>
          </div>
        </div>
      </Show>

      {/* Drop Zone */}
      <Show when={!showCamera()}>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging() ? '#1a73e8' : '#d1d5db'}`,
            'border-radius': '12px',
            padding: '32px 16px',
            'text-align': 'center',
            background: isDragging() ? 'rgba(26, 115, 232, 0.05)' : '#f9fafb',
            transition: 'all 0.2s',
            cursor: 'pointer',
            'min-height': '120px',
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            gap: '12px',
          }}
          onClick={() => fileInputRef?.click()}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDragging() ? '#1a73e8' : '#9ca3af'}
            style={{ width: '40px', height: '40px' }}
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div style={{ 'font-size': '15px', 'font-weight': '500', color: '#374151' }}>
            {isDragging() ? 'Drop files here' : 'Drag & drop documents here'}
          </div>
          <div style={{ 'font-size': '13px', color: '#6b7280' }}>
            or click to browse files (images & PDFs)
          </div>
        </div>
      </Show>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        'margin-top': '12px',
        'flex-wrap': 'wrap',
      }}>
        <Show when={!showCamera()}>
          <button
            onClick={() => fileInputRef?.click()}
            disabled={props.isProcessing || files().length >= maxFiles()}
            style={{
              padding: '10px 16px',
              'border-radius': '8px',
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              'font-size': '13px',
              'font-weight': '500',
              cursor: props.isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '6px',
              opacity: props.isProcessing ? 0.5 : 1,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Files
          </button>

          <Show when={props.allowCamera !== false}>
            <button
              onClick={startCamera}
              disabled={props.isProcessing}
              style={{
                padding: '10px 16px',
                'border-radius': '8px',
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                'font-size': '13px',
                'font-weight': '500',
                cursor: props.isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                'align-items': 'center',
                gap: '6px',
                opacity: props.isProcessing ? 0.5 : 1,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Camera
            </button>
          </Show>
        </Show>

        <div style={{ flex: 1 }} />

        <Show when={files().length > 0}>
          <button
            onClick={clearAll}
            disabled={props.isProcessing}
            style={{
              padding: '10px 16px',
              'border-radius': '8px',
              border: 'none',
              background: '#fee2e2',
              color: '#ef4444',
              'font-size': '13px',
              'font-weight': '500',
              cursor: props.isProcessing ? 'not-allowed' : 'pointer',
              opacity: props.isProcessing ? 0.5 : 1,
            }}
          >
            Clear All
          </button>

          <button
            onClick={handleProcessAll}
            disabled={props.isProcessing || files().length === 0}
            style={{
              padding: '10px 20px',
              'border-radius': '8px',
              border: 'none',
              background: props.isProcessing ? '#93c5fd' : '#1a73e8',
              color: 'white',
              'font-size': '13px',
              'font-weight': '600',
              cursor: props.isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '6px',
            }}
          >
            <Show when={props.isProcessing} fallback={
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Process All ({files().length})
              </>
            }>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Processing...
            </Show>
          </button>
        </Show>
      </div>

      {/* Camera Error */}
      <Show when={cameraError()}>
        <div style={{
          'margin-top': '8px',
          padding: '8px 12px',
          'border-radius': '6px',
          background: '#fef2f2',
          color: '#ef4444',
          'font-size': '13px',
        }}>
          Camera error: {cameraError()}
        </div>
      </Show>

      {/* Thumbnail Grid */}
      <Show when={files().length > 0}>
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
          'margin-top': '16px',
        }}>
          <For each={files()}>
            {(capturedFile) => (
              <div style={{
                position: 'relative',
                'border-radius': '8px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                background: 'white',
              }}>
                {/* Thumbnail */}
                <div style={{
                  width: '100%',
                  'aspect-ratio': '3/4',
                  background: '#f3f4f6',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  overflow: 'hidden',
                }}>
                  <Show when={capturedFile.previewUrl} fallback={
                    <div style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      'align-items': 'center',
                      gap: '4px',
                      color: '#9ca3af',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '32px', height: '32px' }}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span style={{ 'font-size': '10px' }}>PDF</span>
                    </div>
                  }>
                    <img
                      src={capturedFile.previewUrl}
                      alt={capturedFile.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        'object-fit': 'cover',
                      }}
                    />
                  </Show>
                </div>

                {/* File Info */}
                <div style={{ padding: '6px 8px' }}>
                  <div style={{
                    'font-size': '11px',
                    'font-weight': '500',
                    color: '#374151',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                  }}>
                    {capturedFile.name}
                  </div>
                  <div style={{ 'font-size': '10px', color: '#9ca3af' }}>
                    {formatFileSize(capturedFile.size)}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(capturedFile.id);
                  }}
                  disabled={props.isProcessing}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '24px',
                    height: '24px',
                    'border-radius': '50%',
                    border: 'none',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    'font-size': '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    opacity: props.isProcessing ? 0.3 : 1,
                  }}
                  title="Remove"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </For>
        </div>

        <div style={{
          'margin-top': '8px',
          'font-size': '12px',
          color: '#6b7280',
          'text-align': 'right',
        }}>
          {files().length} of {maxFiles()} files
        </div>
      </Show>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BatchScanCapture;
