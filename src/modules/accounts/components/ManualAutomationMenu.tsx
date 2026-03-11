import { Component, createSignal, Show } from 'solid-js';
import CustomAutomationPanel from './CustomAutomationPanel';
import AccountAutomationConfig from './AccountAutomationConfig';

const ManualAutomationMenu: Component = () => {
  const [currentView, setCurrentView] = createSignal<'menu' | 'custom' | 'config'>('menu');

  const menuItemStyle = {
    display: 'block',
    width: '100%',
    padding: '1rem',
    'margin-bottom': '0.5rem',
    'background-color': '#f9fafb',
    border: '1px solid #d1d5db',
    'border-radius': '0.5rem',
    'text-align': 'left' as const,
    cursor: 'pointer',
    'text-decoration': 'none',
    color: '#374151',
    transition: 'all 0.2s ease-in-out'
  };

  const backButtonStyle = {
    padding: '0.5rem 1rem',
    'background-color': '#6b7280',
    color: 'white',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500',
    'margin-bottom': '1rem'
  };


  return (
    <>
   
    <Show when={currentView() ==='custom'}>
      <div style={{ 'max-width': '1200px', margin: '0 auto', padding: '2rem' }}>
   
        <button style={backButtonStyle} onClick={() => setCurrentView('menu')}>
          ← Back to Menu
        </button>
        <CustomAutomationPanel />
      </div>
    </Show>
    <Show when={currentView() === 'config'}>
       <div style={{ 'max-width': '1200px', margin: '0 auto', padding: '2rem' }}>
   
        <button style={backButtonStyle} onClick={() => setCurrentView('menu')}>
          ← Back to Menu
        </button>
        <AccountAutomationConfig />
      </div>
    </Show>
    <Show when={currentView() ==='menu'}>
      <div style={{ 'max-width': '600px', margin: '0 auto', padding: '2rem' }}>
   
      <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '1rem' }}>
        Account Automation Menu
      </h2>
      <p style={{ color: '#6b7280', 'margin-bottom': '2rem' }}>
        Choose how you want to manage journal entries and account automation.
      </p>

      <div>
        <button
          style={menuItemStyle}
          onClick={() => setCurrentView('custom')}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          <div>
            <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              🎯 Manual Custom Automation
            </h3>
            <p style={{ color: '#6b7280', 'font-size': '0.875rem' }}>
              Create journal entries on-demand with custom parameters. Perfect for one-off transactions, 
              adjustments, and when you need full control over the entries.
            </p>
            <div style={{ 'margin-top': '0.75rem' }}>
              <span style={{ 
                'background-color': '#dbeafe', 
                color: '#1e40af', 
                padding: '0.25rem 0.5rem',
                'border-radius': '0.25rem',
                'font-size': '0.75rem',
                'font-weight': '500'
              }}>
                Recommended for custom transactions
              </span>
            </div>
          </div>
        </button>

        <button
          style={menuItemStyle}
          onClick={() => setCurrentView('config')}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          <div>
            <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              ⚙️ Automatic Automation Configuration
            </h3>
            <p style={{ color: '#6b7280', 'font-size': '0.875rem' }}>
              Configure rules that automatically create journal entries when certain events occur 
              (like completing invoices, receiving payments, etc.).
            </p>
            <div style={{ 'margin-top': '0.75rem' }}>
              <span style={{ 
                'background-color': '#ecfdf5', 
                color: '#065f46', 
                padding: '0.25rem 0.5rem',
                'border-radius': '0.25rem',
                'font-size': '0.75rem',
                'font-weight': '500'
              }}>
                Set up once, works automatically
              </span>
            </div>
          </div>
        </button>

        <div style={{ 
          'margin-top': '2rem', 
          padding: '1rem', 
          'background-color': '#fef7cd', 
          'border-radius': '0.5rem',
          border: '1px solid #f59e0b'
        }}>
          <h4 style={{ 'font-size': '1rem', 'font-weight': '600', color: '#92400e', 'margin-bottom': '0.5rem' }}>
            💡 Quick Guide:
          </h4>
          <ul style={{ color: '#92400e', 'font-size': '0.875rem', 'line-height': '1.5', 'margin-left': '1rem' }}>
            <li><strong>Manual Custom Automation:</strong> Use when you need to create specific entries with custom parameters</li>
            <li><strong>Automatic Configuration:</strong> Use to set up rules that trigger automatically during business operations</li>
            <li>Both systems work together - you can use automatic rules for common transactions and manual entries for exceptions</li>
          </ul>
        </div>
      </div>
      </div>
    </Show>
    </>
  );
};

export default ManualAutomationMenu;