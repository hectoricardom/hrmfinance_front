import { Component, Show, onMount, createSignal } from 'solid-js';
import { authStore, validateToken } from '../stores/authStore';
import { Button } from '../modules/ui';
import { initializeGoogleSignIn, renderGoogleButton } from '../services/googleCloud';
import MagicLinkAuth from '../components/MagicLinkAuth';

const Login: Component = () => {
  let googleButtonRef: HTMLDivElement | undefined;
  const [showMagicLink, setShowMagicLink] = createSignal(false);


  const handleCredentialResponse = async (v:any) =>{

    let token  = v?.credential;


    let url = "https://ssgloghr.com/auth/verifyIdToken"
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Authorization': token,
      },
      body: JSON.stringify({
        token
      }),
    });

    const data = await response.json();

    if(data?.signature?.token){
      let _now = new Date().getTime();
      let _expire = new Date(_now + 60000 * 60 * 24 * 365);
      // Set cookie with proper attributes for persistence
      document.cookie = `ssgl_access_tkn=${data?.signature?.token}; expires=${_expire.toUTCString()}; path=/; SameSite=Lax`;
      console.log("✅ Session token saved to cookie");
    }


    await validateToken();
    console.log("✅ User authenticated successfully");
  }

    const initGoogle = () =>{
      let google = window.google;
      if(google ){
        google?.accounts.id.initialize({
          client_id: "195275085181-8ccjpgp8v1g80qhnlk6v4lpgid7n81gr.apps.googleusercontent.com",
          callback: handleCredentialResponse
        });
        google?.accounts.id.renderButton(
          document.getElementById("buttonDiv"),
          { theme: "outline", size: "large", "shape": "pill" }  // customization attributes
        );
      
      }
    }

  


  onMount(() => {
    // Initialize Google Cloud Sign-In
    initializeGoogleSignIn((credential) => {
      authStore.signInWithGoogleP(credential);
    });

    // Render the Google button after a short delay to ensure the container is ready
    setTimeout(() => {
      if (googleButtonRef) {
        renderGoogleButton('google-signin-button');
      }
       setTimeout(() => {
          initGoogle()
        }, 120);
        initGoogle( );
    }, 100);
  });





  const containerStyle = {
    'min-height': '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '2rem'
  };

  const cardStyle = {
    background: 'white',
    'border-radius': '1rem',
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    'max-width': '1200px',
    width: '100%',
    overflow: 'hidden'
  };

  const loginSectionStyle = {
    padding: '3rem',
    'text-align': 'center',
    'border-bottom': '1px solid #e2e8f0'
  };

  const titleStyle = {
    'font-size': '2.5rem',
    'font-weight': '800',
    color: '#1a202c',
    'margin-bottom': '1rem'
  };

  const subtitleStyle = {
    'font-size': '1.125rem',
    color: '#718096',
    'margin-bottom': '2rem'
  };

  const authOptionsStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1rem',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const dividerStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    margin: '1rem 0',
    width: '100%',
    'max-width': '300px'
  };

  const dividerLineStyle = {
    flex: '1',
    height: '1px',
    background: '#e2e8f0'
  };

  const dividerTextStyle = {
    padding: '0 1rem',
    color: '#718096',
    'font-size': '0.875rem',
    'font-weight': '500'
  };

  const featureGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    padding: '3rem'
  };

  const featureCardStyle = {
    'text-align': 'center',
    padding: '2rem',
    'border-radius': '0.5rem',
    background: '#f7fafc',
    transition: 'transform 0.2s',
    cursor: 'default'
  };

  const featureIconStyle = {
    'font-size': '3rem',
    'margin-bottom': '1rem'
  };

  const featureTitleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: '#2d3748',
    'margin-bottom': '0.5rem'
  };

  const featureDescStyle = {
    color: '#718096',
    'line-height': '1.6'
  };

  const googleButtonStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.75rem',
    background: 'white',
    color: '#4285f4',
    border: '2px solid #4285f4',
    padding: '0.75rem 2rem',
    'font-size': '1.125rem',
    'font-weight': '500',
    'border-radius': '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    'min-width': '250px',
    'justify-content': 'center'
  };

  const errorStyle = {
    color: '#e53e3e',
    'margin-top': '1rem',
    'font-size': '0.875rem'
  };

  const footerStyle = {
    background: '#f7fafc',
    padding: '2rem',
    'text-align': 'center',
    color: '#718096',
    'font-size': '0.875rem'
  };

  const authMethodLabelStyle = {
    'font-size': '0.75rem',
    color: '#718096',
    'margin-top': '0.25rem',
    'font-style': 'italic'
  };

  const handleGoogleSignIn = () => {
    authStore.signInWithGoogle();
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={loginSectionStyle}>
          <h1 style={titleStyle}>HRM Finance</h1>
          <p style={subtitleStyle}>
            Complete Business Management Solution
          </p>
          
          {/* Tab Toggle */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            'justify-content': 'center',
            'margin-bottom': '2rem',
            'border-bottom': '2px solid #e2e8f0',
            'padding-bottom': '0.5rem'
          }}>
            <button
              onClick={() => setShowMagicLink(false)}
              style={{
                padding: '0.5rem 1.5rem',
                background: !showMagicLink() ? 'var(--primary-color, #667eea)' : 'transparent',
                color: !showMagicLink() ? 'white' : '#718096',
                border: 'none',
                'border-radius': '0.5rem',
                cursor: 'pointer',
                'font-weight': '600',
                transition: 'all 0.2s'
              }}
            >
              Google Sign-In
            </button>
            <button
              onClick={() => setShowMagicLink(true)}
              style={{
                padding: '0.5rem 1.5rem',
                background: showMagicLink() ? 'var(--primary-color, #667eea)' : 'transparent',
                color: showMagicLink() ? 'white' : '#718096',
                border: 'none',
                'border-radius': '0.5rem',
                cursor: 'pointer',
                'font-weight': '600',
                transition: 'all 0.2s'
              }}
            >
              Magic Link
            </button>
          </div>

          <div style={authOptionsStyle}>
            <Show
              when={!showMagicLink()}
              fallback={
                <div style={{ width: '100%', 'max-width': '400px' }}>
                  <MagicLinkAuth />
                </div>
              }
            >
              {/* Firebase Google Sign-In Button */}
              <div>

                 <div id="buttonDiv"></div> 
                
              </div>
            </Show>
          </div>

          <Show when={authStore.state.error}>
            <p style={errorStyle}>{authStore.state.error}</p>
          </Show>
        </div>

        <div style={featureGridStyle}>
          <div style={featureCardStyle}>
            <div style={featureIconStyle}>💰</div>
            <h3 style={featureTitleStyle}>Financial Management</h3>
            <p style={featureDescStyle}>
              Complete chart of accounts, balance sheets, journal entries, and invoice management in one place.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={featureIconStyle}>👥</div>
            <h3 style={featureTitleStyle}>HR Management</h3>
            <p style={featureDescStyle}>
              Track employees, manage onboarding, and monitor your workforce with powerful analytics.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={featureIconStyle}>📦</div>
            <h3 style={featureTitleStyle}>Inventory Control</h3>
            <p style={featureDescStyle}>
              Real-time inventory tracking, product management, and movement history across multiple locations.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={featureIconStyle}>🏦</div>
            <h3 style={featureTitleStyle}>Banking Integration</h3>
            <p style={featureDescStyle}>
              Streamline bank reconciliation with CSV imports and automated consolidation features.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={featureIconStyle}>📊</div>
            <h3 style={featureTitleStyle}>Real-time Analytics</h3>
            <p style={featureDescStyle}>
              Get instant insights with dashboards showing revenue, cash flow, and business performance.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={featureIconStyle}>🌐</div>
            <h3 style={featureTitleStyle}>Multi-language Support</h3>
            <p style={featureDescStyle}>
              Available in multiple languages to support your global business operations.
            </p>
          </div>
        </div>

        <div style={footerStyle}>
          <p>Secure authentication powered by Google & Magic Link • Your data is encrypted and protected</p>
          <p style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem' }}>
            Choose your preferred authentication method above:
            <br />
            <strong>Google Sign-In</strong> (Firebase) or <strong>Magic Link</strong> (Email-based passwordless)
          </p>
          <Show when={import.meta.env.DEV}>
            <p style={{
              'margin-top': '1rem',
              padding: '0.5rem',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              'border-radius': '0.5rem',
              'font-size': '0.75rem',
              color: '#856404'
            }}>
              💡 <strong>Development Mode:</strong> Magic Link URLs appear in browser console
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default Login;




/*

<button
                  style={googleButtonStyle}
                  onClick={handleGoogleSignIn}
                  disabled={authStore.state.loading}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4285f4';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#4285f4';
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <Show when={authStore.state.loading} fallback="Sign in with Google">
                    Signing in...
                  </Show>
                </button>
                
                <p style={authMethodLabelStyle}>Firebase Authentication</p>sorry is no 

*/