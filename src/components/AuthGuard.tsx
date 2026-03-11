import { Component, Show, JSX, createEffect, onMount } from 'solid-js';
import { authStore } from '../stores/authStore';
import Login from '../pages/Login';

interface AuthGuardProps {
  children: JSX.Element;
}

const AuthGuard: Component<AuthGuardProps> = (props) => {
  const loadingStyle = {
    'min-height': '100vh',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  };

  const spinnerStyle = {
    width: '50px',
    height: '50px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    'border-top-color': 'white',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite'
  };

  // Add CSS animation for spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);




  createEffect(async ()=>{

    if(authStore.state?.user?.uid){
      //authStore.getUserProfile(authStore.state?.user?.uid as string);
    }
  
  })


  onMount(()=>{

  
  })

  return (
    <Show
      when={!authStore.state.loading}
      fallback={
        <div style={loadingStyle}>
          <div style={spinnerStyle}></div>
        </div>
      }
    >
      <Show
        when={authStore.isAuthenticated}
        fallback={<Login />}
      >
        {props.children}
      </Show>
    </Show>
  );
};

export default AuthGuard;