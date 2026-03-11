import { Component } from 'solid-js';

const DebugPage: Component = () => {
  console.log('DebugPage component rendered');
  
  return (
    <div style={{
      'min-height': '100vh',
      background: 'red',
      color: 'white',
      padding: '2rem',
      'font-size': '2rem',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'text-align': 'center'
    }}>
      <div>
        <h1>🔍 DEBUG PAGE WORKS!</h1>
        <p>If you see this, routing and components are working.</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default DebugPage;