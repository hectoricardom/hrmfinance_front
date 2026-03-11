import { Component, createSignal, Show } from 'solid-js';
import { Button } from '../modules/ui';
import { uploadImage, convertImageToBase64, formatFileSize, isImageFile, ImageUploadOptions, ImageUploadResponse } from '../services/imageUpload';
import Icon from './Icon';

interface ImageUploadProps {
  onImageUpload?: (base64: string, fileName: string, uploadResult?: ImageUploadResponse) => void;
  onError?: (error: string) => void;
  currentImage?: string; // Current base64 image or URL
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  uploadToServer?: boolean; // Whether to upload to server or just convert to base64
  options?: ImageUploadOptions;
  style?: any;
}

const ImageUpload: Component<ImageUploadProps> = (props) => {
  const [uploading, setUploading] = createSignal(false);
  const [dragOver, setDragOver] = createSignal(false);
  const [previewImage, setPreviewImage] = createSignal<string>(props.currentImage || '');

  const handleFileSelect = async (file: File) => {
    if (!isImageFile(file)) {
      props.onError?.('Por favor seleccione un archivo de imagen válido');
      return;
    }

    setUploading(true);
    
    try {
      let result;
      
      if (props.uploadToServer) {
        // Upload to server and get both URL and base64
        result = await uploadImage(file, props.options);
      } else {
        // Convert to base64 only
        result = await convertImageToBase64(file, props.options);
      }

      if (result.success && result.base64) {
        // For preview, prefer URL over base64 if available
        const previewImage = result.imageUrl || result.base64;
        setPreviewImage(previewImage);
        props.onImageUpload?.(result.base64, result.fileName || file.name, result);
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

export default ImageUpload;