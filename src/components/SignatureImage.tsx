import { Component, createSignal, onMount, Show } from 'solid-js';
import { getSignatureBlob, getCachedSignatureBlob } from '../services/signatureBlobCache';
import { devLog } from '../services/utils';

interface SignatureImageProps {
  src: string;
  alt?: string;
  style?: any;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

/**
 * Smart signature image component that handles Firebase Storage URLs without CORS issues
 * Converts Firebase Storage URLs to blob URLs automatically
 */
const SignatureImage: Component<SignatureImageProps> = (props) => {
  const [blobUrl, setBlobUrl] = createSignal<string>('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string>('');

  onMount(async () => {
    if (!props.src) {
      setError('No image source provided');
      return;
    }

    // If it's already a blob URL or data URL, use directly
    if (props.src.startsWith('blob:') || props.src.startsWith('data:')) {
      setBlobUrl(props.src);
      props.onLoad?.();
      return;
    }

    // If it's not a Firebase Storage URL, use directly
    if (!props.src.includes('firebasestorage.googleapis.com')) {
      setBlobUrl(props.src);
      props.onLoad?.();
      return;
    }

    // Firebase Storage URL - convert to blob to avoid CORS
    setLoading(true);
    setError('');

    try {
      devLog('SignatureImage: Converting Firebase Storage URL to blob...');
      
      // Check cache first
      const cached = getCachedSignatureBlob(props.src);
      if (cached) {
        devLog('SignatureImage: Using cached blob');
        const objectUrl = URL.createObjectURL(cached.blob);
        setBlobUrl(objectUrl);
        props.onLoad?.();
        return;
      }

      // Convert to blob
      const cachedBlob = await getSignatureBlob(props.src);
      const objectUrl = URL.createObjectURL(cachedBlob.blob);
      setBlobUrl(objectUrl);
      devLog('SignatureImage: Blob URL created successfully');
      props.onLoad?.();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load signature image';
      console.error('SignatureImage: Error converting to blob:', errorMessage);
      setError(errorMessage);
      props.onError?.(errorMessage);
      
      // Fallback: try to use original URL (will likely fail with CORS, but worth trying)
      devLog('SignatureImage: Falling back to original URL (may have CORS issues)');
      setBlobUrl(props.src);
    } finally {
      setLoading(false);
    }
  });

  // Cleanup object URL when component unmounts
  const cleanup = () => {
    const url = blobUrl();
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  // Note: SolidJS doesn't have useEffect cleanup, so we rely on garbage collection
  // In a real app, you might want to track these URLs for manual cleanup

  return (
    <Show 
      when={!loading() && !error() && blobUrl()} 
      fallback={
        <Show when={loading()} fallback={
          <div style={{
            padding: '2rem',
            'text-align': 'center',
            color: 'var(--error-color)',
            border: '2px dashed var(--error-color)',
            'border-radius': 'var(--border-radius)',
            background: 'var(--error-light)'
          }}>
            <p style={{ margin: '0', 'font-size': '0.875rem' }}>
              ❌ Error loading signature: {error()}
            </p>
            <details style={{ 'margin-top': '0.5rem', 'text-align': 'left' }}>
              <summary style={{ cursor: 'pointer', 'font-size': '0.75rem' }}>
                Show technical details
              </summary>
              <pre style={{ 
                'font-size': '0.7rem', 
                'white-space': 'pre-wrap',
                'margin-top': '0.5rem',
                padding: '0.5rem',
                background: '#fff',
                'border-radius': '4px'
              }}>
                URL: {props.src}
                Error: {error()}
              </pre>
            </details>
          </div>
        }>
          <div style={{
            padding: '2rem',
            'text-align': 'center',
            color: 'var(--text-muted)',
            border: '2px dashed var(--border-color)',
            'border-radius': 'var(--border-radius)'
          }}>
            <p style={{ margin: '0', 'font-size': '0.875rem' }}>
              🔄 Converting signature to blob...
            </p>
            <p style={{ margin: '0.5rem 0 0 0', 'font-size': '0.75rem' }}>
              Avoiding CORS issues with Firebase Storage
            </p>
          </div>
        </Show>
      }
    >
      <img 
        src={blobUrl()}
        alt={props.alt || 'Signature'}
        style={props.style}
        onLoad={() => props.onLoad?.()}
        onError={() => {
          const errorMsg = 'Image failed to load even with blob URL';
          setError(errorMsg);
          props.onError?.(errorMsg);
        }}
      />
    </Show>
  );
};

export default SignatureImage;