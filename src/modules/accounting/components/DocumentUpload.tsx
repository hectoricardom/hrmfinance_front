import { Component, createSignal, For, Show } from 'solid-js';
import Button from '../../ui/components/Button';
import Card from '../../ui/components/Card';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  extractedAmount?: number;
  error?: string;
}

interface DocumentUploadProps {
  onUploaded: (files: UploadedFile[]) => void;
}

const DocumentUpload: Component<DocumentUploadProps> = (props) => {
  const [isDragging, setIsDragging] = createSignal(false);
  const [uploadedFiles, setUploadedFiles] = createSignal<UploadedFile[]>([]);
  let fileInputRef: HTMLInputElement | undefined;

  const acceptedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

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

    const files = Array.from(e.dataTransfer?.files || []);
    processFiles(files);
  };

  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    processFiles(files);
    target.value = ''; // Reset input
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => acceptedTypes.includes(file.type));

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles([...uploadedFiles(), ...newFiles]);

    // Simulate upload and processing
    newFiles.forEach(uploadedFile => {
      simulateUpload(uploadedFile.id);
    });
  };

  const simulateUpload = (fileId: string) => {
    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setUploadedFiles(files =>
        files.map(f => {
          if (f.id === fileId && f.status === 'uploading') {
            const newProgress = Math.min(f.progress + 10, 100);
            if (newProgress === 100) {
              clearInterval(uploadInterval);
              // Start processing
              setTimeout(() => simulateProcessing(fileId), 500);
              return { ...f, progress: newProgress, status: 'processing' as const };
            }
            return { ...f, progress: newProgress };
          }
          return f;
        })
      );
    }, 200);
  };

  const simulateProcessing = (fileId: string) => {
    // Simulate AI processing
    setTimeout(() => {
      setUploadedFiles(files =>
        files.map(f => {
          if (f.id === fileId) {
            // Randomly succeed or fail
            const success = Math.random() > 0.1;
            if (success) {
              const extractedAmount = Math.random() * 1000 + 100;
              const updatedFile = {
                ...f,
                status: 'completed' as const,
                extractedAmount: Math.round(extractedAmount * 100) / 100
              };
              // Notify parent
              setTimeout(() => props.onUploaded([updatedFile]), 100);
              return updatedFile;
            } else {
              return {
                ...f,
                status: 'failed' as const,
                error: 'Failed to extract data from document'
              };
            }
          }
          return f;
        })
      );
    }, 2000);
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return '⬆️';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📄';
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(files => files.filter(f => f.id !== fileId));
  };

  const dropZoneStyle = () => ({
    border: `2px dashed ${isDragging() ? 'var(--primary-color)' : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius)',
    padding: '3rem 2rem',
    'text-align': 'center' as const,
    background: isDragging() ? 'var(--primary-color-10)' : 'var(--surface-color)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    'margin-bottom': '1.5rem'
  });

  const fileItemStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '0.75rem',
    background: 'var(--surface-color)'
  };

  const progressBarStyle = (progress: number) => ({
    height: '6px',
    background: 'var(--border-color)',
    'border-radius': '3px',
    overflow: 'hidden',
    'margin-top': '0.5rem'
  });

  const progressFillStyle = (progress: number) => ({
    height: '100%',
    width: `${progress}%`,
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    transition: 'width 0.3s ease'
  });

  return (
    <Card title="Upload Documents">
      <div>
        {/* Drop Zone */}
        <div
          style={dropZoneStyle()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef?.click()}
        >
          <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📤</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            {isDragging() ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p style={{ color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
            or click to browse
          </p>
          <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Accepts PDF, PNG, JPG files
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* Uploaded Files List */}
        <Show when={uploadedFiles().length > 0}>
          <div style={{ 'margin-top': '2rem' }}>
            <h4 style={{ 'margin-bottom': '1rem', color: 'var(--text-primary)' }}>
              Upload Progress ({uploadedFiles().length})
            </h4>
            <For each={uploadedFiles()}>
              {(file) => (
                <div style={fileItemStyle}>
                  <div style={{ flex: '1', 'min-width': '0' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                      <span style={{ 'font-size': '1.5rem' }}>{getStatusIcon(file.status)}</span>
                      <div style={{ flex: '1', 'min-width': '0' }}>
                        <div style={{
                          'font-weight': '500',
                          color: 'var(--text-primary)',
                          'white-space': 'nowrap',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis'
                        }}>
                          {file.file.name}
                        </div>
                        <div style={{
                          'font-size': '0.875rem',
                          color: 'var(--text-muted)',
                          'margin-top': '0.25rem'
                        }}>
                          {getStatusText(file.status)}
                          {file.status === 'completed' && file.extractedAmount && (
                            <span style={{ 'margin-left': '0.5rem', color: 'var(--primary-color)', 'font-weight': '600' }}>
                              ${file.extractedAmount.toFixed(2)}
                            </span>
                          )}
                          {file.status === 'failed' && file.error && (
                            <span style={{ 'margin-left': '0.5rem', color: 'var(--error-color)' }}>
                              {file.error}
                            </span>
                          )}
                        </div>
                        {file.status === 'uploading' && (
                          <div style={progressBarStyle(file.progress)}>
                            <div style={progressFillStyle(file.progress)} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      'font-size': '1.25rem',
                      'margin-left': '1rem'
                    }}
                    onClick={() => removeFile(file.id)}
                  >
                    ×
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default DocumentUpload;
