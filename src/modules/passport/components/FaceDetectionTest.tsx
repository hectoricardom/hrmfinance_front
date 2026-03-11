import { Component, createSignal, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { devLog } from '../../../services/utils';

const FaceDetectionTest: Component = () => {
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [preview, setPreview] = createSignal<string>('');
  
  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    devLog('File selected:', file);
    
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        devLog('File read complete');
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      devLog('Invalid file type');
    }
  };
  
  return (
    <Card>
      <div style={{ padding: '2rem' }}>
        <h3>File Upload Test</h3>
        
        <div style={{
          padding: '2rem',
          border: '2px dashed #ccc',
          'text-align': 'center',
          'margin': '1rem 0'
        }}>
          <Show when={!selectedFile()} fallback={
            <div>
              <img 
                src={preview()} 
                style={{ 'max-width': '200px', 'margin-bottom': '1rem' }}
                alt="Preview" 
              />
              <p>File: {selectedFile()?.name}</p>
              <Button onClick={() => {
                setSelectedFile(null);
                setPreview('');
              }}>
                Remove
              </Button>
            </div>
          }>
            <p>Select a photo</p>
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
                Choose File
              </Button>
            </div>
          </Show>
        </div>
      </div>
    </Card>
  );
};

export default FaceDetectionTest;