import { Component, createSignal, Show } from 'solid-js';
import { Navigation, NavigationFiber } from '../modules/ui';

const NavigationExample: Component = () => {
  const [useFiberStyle, setUseFiberStyle] = createSignal(false);

  return (
    <>
      {/* Show the selected navigation */}
      <Show when={useFiberStyle()} fallback={<Navigation />}>
        <NavigationFiber />
      </Show>

      {/* Toggle Section */}
      <div style={{
        padding: '2rem',
        'max-width': '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          'font-size': '2rem',
          'margin-bottom': '1rem',
          color: 'var(--text-primary)'
        }}>
          Navigation Style Example
        </h1>
        
        <div style={{
          background: 'var(--surface-color)',
          padding: '2rem',
          'border-radius': 'var(--border-radius)',
          'box-shadow': 'var(--shadow-sm)'
        }}>
          <h2 style={{
            'font-size': '1.5rem',
            'margin-bottom': '1rem',
            color: 'var(--text-primary)'
          }}>
            Choose Navigation Style
          </h2>
          
          <p style={{
            'margin-bottom': '1.5rem',
            color: 'var(--text-secondary)'
          }}>
            Toggle between the original navigation and the Google Fiber-inspired navigation style.
          </p>

          <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: !useFiberStyle() ? 'var(--primary-color)' : 'transparent',
                color: !useFiberStyle() ? 'white' : 'var(--primary-color)',
                border: `2px solid var(--primary-color)`,
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-weight': '500',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setUseFiberStyle(false)}
            >
              Original Style
            </button>
            
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: useFiberStyle() ? '#1a73e8' : 'transparent',
                color: useFiberStyle() ? 'white' : '#1a73e8',
                border: `2px solid #1a73e8`,
                'border-radius': '4px',
                cursor: 'pointer',
                'font-weight': '500',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setUseFiberStyle(true)}
            >
              Google Fiber Style
            </button>
          </div>

          <div style={{
            'margin-top': '2rem',
            padding: '1rem',
            background: 'var(--background-color)',
            'border-radius': 'var(--border-radius-sm)'
          }}>
            <h3 style={{ 'font-size': '1.2rem', 'margin-bottom': '0.5rem' }}>
              Current Style: {useFiberStyle() ? 'Google Fiber' : 'Original'}
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {useFiberStyle() 
                ? 'The Google Fiber style features a clean, modern design with smooth animations and a professional look.'
                : 'The original style uses custom theme colors and integrates seamlessly with the existing design system.'}
            </p>
          </div>
        </div>

        <div style={{
          'margin-top': '2rem',
          background: 'var(--surface-color)',
          padding: '2rem',
          'border-radius': 'var(--border-radius)',
          'box-shadow': 'var(--shadow-sm)'
        }}>
          <h2 style={{
            'font-size': '1.5rem',
            'margin-bottom': '1rem',
            color: 'var(--text-primary)'
          }}>
            Implementation Instructions
          </h2>
          
          <h3 style={{ 'font-size': '1.2rem', 'margin-top': '1.5rem', 'margin-bottom': '0.5rem' }}>
            To use the Google Fiber navigation in your app:
          </h3>
          
          <pre style={{
            background: 'var(--background-color)',
            padding: '1rem',
            'border-radius': 'var(--border-radius-sm)',
            overflow: 'auto'
          }}>
{`// In App.tsx, replace:
import { Navigation } from './modules/ui';

// With:
import { NavigationFiber } from './modules/ui';

// Then in your AppHeader component, replace:
<Navigation />

// With:
<NavigationFiber />`}
          </pre>

          <h3 style={{ 'font-size': '1.2rem', 'margin-top': '1.5rem', 'margin-bottom': '0.5rem' }}>
            Features of Google Fiber Navigation:
          </h3>
          
          <ul style={{ 'line-height': '1.8', color: 'var(--text-secondary)' }}>
            <li>Clean, minimalist design inspired by Google's Material Design</li>
            <li>Smooth hover animations and transitions</li>
            <li>Responsive mobile menu with hamburger animation</li>
            <li>Dropdown menus for organized navigation</li>
            <li>Maintains all existing permissions and menu structure</li>
            <li>Compatible with existing authentication system</li>
            <li>Supports language switching via LanguageSelector</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default NavigationExample;