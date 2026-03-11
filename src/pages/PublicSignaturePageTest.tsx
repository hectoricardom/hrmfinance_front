import { Component, createSignal, onMount } from 'solid-js';
import { useParams } from '@solidjs/router';

const PublicSignaturePageTest: Component = () => {
  const params = useParams();
  const [status, setStatus] = createSignal('Initializing...');

  onMount(() => {
    console.log('TEST PAGE - onMount fired!');
    setStatus('onMount fired!');
    
    setTimeout(() => {
      setStatus(`Request ID: ${params.id || 'No ID'}`);
    }, 1000);
    
    setTimeout(() => {
      setStatus('Test complete - component working');
    }, 2000);
  });

  return (
    <div style={{
      'min-height': '100vh',
      background: '#f0f0f0',
      padding: '2rem',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        'border-radius': '8px',
        'text-align': 'center',
        'max-width': '400px',
        width: '100%'
      }}>
        <h1>Test Page</h1>
        <p>Status: {status()}</p>
        <p>Params: {JSON.stringify(params)}</p>
      </div>
    </div>
  );
};

export default PublicSignaturePageTest;