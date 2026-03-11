import { Component, createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import POSCheckout from '../components/POSCheckout';
import { POSSale, POSSettings } from '../types/posTypes';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

const POSPage: Component = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [loading, setLoading] = createSignal(true);

  // POS Settings - these would typically come from a settings API
  const posSettings: POSSettings = {
    taxRates: [
      { name: 'Sales Tax', rate: 8.5, amount: 0, applyToTotal: true }
    ],
    defaultPaymentMethod: 'cash',
    allowNegativeInventory: false,
    requireCustomerForSale: false,
    autoPrintReceipt: true,
    currency: 'USD',
    receiptHeader: 'HRM Finance POS',
    receiptFooter: 'Thank you for your business!'
  };

  // Handle sale completion
  const handleSaleComplete = async (sale: POSSale) => {
    devLog('Sale completed:', sale);
    
    try {
      // Here you would typically:
      // 1. Save the sale to the database
      // 2. Update inventory
      // 3. Print receipt if auto-print is enabled
      // 4. Send to accounting system
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      devLog('Sale saved successfully');
      
      // Optional: Navigate to receipt or sales history
      // navigate(`/pos/receipt/${sale.id}`);
      
    } catch (error) {
      devLog('Error saving sale:', error);
      // Handle error - maybe show a retry option
    }
  };

  // Check authentication and permissions
  onMount(() => {
    setLoading(true);
    
    // Check if user is authenticated and has POS access
    const user = authStore.state.user;
    const profile = authStore.state.profile;
    
    if (!user) {
      navigate('/login');
      return;
    }

 

    setIsAuthenticated(true);
    setLoading(false);
  });

  return (
    <Show when={!loading()} fallback={
      <div style={{
        display: 'flex',
        'justify-content': 'center',
        'align-items': 'center',
        height: '100vh',
        'flex-direction': 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border-color)',
          'border-top-color': 'var(--primary-color)',
          'border-radius': '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading POS System...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <Show when={isAuthenticated()}>
        <POSCheckout
          onSaleComplete={handleSaleComplete}
          settings={posSettings}
        />
      </Show>
    </Show>
  );
};

export default POSPage;