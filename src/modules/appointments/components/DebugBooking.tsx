import { Component, onMount } from 'solid-js';
import { useParams } from '@solidjs/router';
import { appointmentStore } from '../stores/appointmentStore';
import { devLog } from '../../../services/utils';

const DebugBooking: Component = () => {
  const params = useParams();
  
  onMount(async () => {
    const hostId = params.userId || params.username;
    devLog('Debug: Host ID from URL:', hostId);
    
    if (hostId) {
      devLog('Loading data for host:', hostId);
      
      // Load event types
      await appointmentStore.loadEventTypes(hostId);
      devLog('Event Types loaded:', appointmentStore.state.eventTypes);
      devLog('Active Event Types:', appointmentStore.state.eventTypes.filter(et => et.isActive));
      
      // Load availability
      await appointmentStore.loadAvailability(hostId);
      devLog('Availability loaded:', appointmentStore.state.availability);
      
      // Load settings
      await appointmentStore.loadBookingPageSettings(hostId);
      devLog('Booking settings loaded:', appointmentStore.state.bookingPageSettings);
    }
  });

  return (
    <div style={{ padding: '2rem', 'font-family': 'monospace' }}>
      <h1>Booking Debug Page</h1>
      
      <div style={{ 'margin-top': '2rem' }}>
        <h2>URL Parameters</h2>
        <pre style={{ background: '#f5f5f5', padding: '1rem', 'border-radius': '4px' }}>
          {JSON.stringify(params, null, 2)}
        </pre>
      </div>
      
      <div style={{ 'margin-top': '2rem' }}>
        <h2>Event Types ({appointmentStore.state.eventTypes.length} total)</h2>
        <pre style={{ background: '#f5f5f5', padding: '1rem', 'border-radius': '4px', 'max-height': '400px', overflow: 'auto' }}>
          {JSON.stringify(appointmentStore.state.eventTypes, null, 2)}
        </pre>
      </div>
      
      <div style={{ 'margin-top': '2rem' }}>
        <h2>Active Event Types ({appointmentStore.state.eventTypes.filter(et => et.isActive).length} active)</h2>
        <pre style={{ background: '#f5f5f5', padding: '1rem', 'border-radius': '4px', 'max-height': '400px', overflow: 'auto' }}>
          {JSON.stringify(appointmentStore.state.eventTypes.filter(et => et.isActive), null, 2)}
        </pre>
      </div>
      
      <div style={{ 'margin-top': '2rem' }}>
        <h2>Availability</h2>
        <pre style={{ background: '#f5f5f5', padding: '1rem', 'border-radius': '4px', 'max-height': '400px', overflow: 'auto' }}>
          {JSON.stringify(appointmentStore.state.availability, null, 2)}
        </pre>
      </div>
      
      <div style={{ 'margin-top': '2rem' }}>
        <h2>Check Console for Detailed Logs</h2>
        <p>Press F12 to open browser console and see detailed loading information.</p>
      </div>
      
      <div style={{ 'margin-top': '2rem' }}>
        <h3>Quick Actions:</h3>
        <button 
          onClick={() => window.location.href = `/#/book/${params.userId || params.username}`}
          style={{ padding: '0.5rem 1rem', 'margin-right': '1rem' }}
        >
          Go to Booking Page
        </button>
        <button 
          onClick={() => window.location.href = '/#/event-types'}
          style={{ padding: '0.5rem 1rem' }}
        >
          Create Event Types
        </button>
      </div>
    </div>
  );
};

export default DebugBooking;