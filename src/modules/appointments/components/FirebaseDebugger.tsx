import { createSignal, onMount, Show } from 'solid-js';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

/**
 * Component for debugging Firebase functionality
 */
export function FirebaseDebugger() {
  const [debugInfo, setDebugInfo] = createSignal<string[]>([]);
  const [testing, setTesting] = createSignal(false);

  const addDebugLog = (message: string) => {
    devLog('[Firebase Debug]', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFirebaseConnection = async () => {
    setTesting(true);
    setDebugInfo([]);
    
    try {
      // Test 1: Check auth
      addDebugLog('Testing authentication...');
      const user = authStore.currentUser;
      if (!user) {
        addDebugLog('❌ No user authenticated');
        setTesting(false);
        return;
      }
      addDebugLog(`✅ User authenticated: ${user.email}`);
      
      // Test 2: Check business ID
      addDebugLog('Testing business ID...');
      const businessId = authStore.getBusinessId();
      addDebugLog(`✅ Business ID: ${businessId}`);
      
      // Test 3: Try to create a simple event type
      addDebugLog('Testing event type creation...');
      
      const testEventType = {
        name: 'Test Event Type',
        description: 'This is a test event type created for debugging',
        duration: 30,
        color: '#FF5722',
        isActive: true,
        location: 'Test Location',
        locationType: 'video' as const,
        requiresApproval: false,
        reminderEnabled: true,
        createdBy: user.uid
      };
      
      const eventTypeId = await appointmentStore.createEventTypeFirebase(testEventType);
      addDebugLog(`✅ Event type created successfully with ID: ${eventTypeId}`);
      
      // Test 4: Try to load event types
      addDebugLog('Testing event types loading...');
      await appointmentStore.loadEventTypesFirebase(user.uid);
      const eventTypes = appointmentStore.state.eventTypes;
      addDebugLog(`✅ Loaded ${eventTypes.length} event types`);
      
      addDebugLog('🎉 All tests passed! Firebase is working correctly.');
      
    } catch (error) {
      addDebugLog(`❌ Error: ${(error as Error).message}`);
      devLog('Firebase test error:', error);
    } finally {
      setTesting(false);
    }
  };

  const clearLogs = () => {
    setDebugInfo([]);
  };

  return (
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white border rounded-lg p-6">
        <h2 class="text-2xl font-bold mb-4">Firebase Debugger</h2>
        
        <div class="space-y-4">
          <div class="flex gap-4">
            <button
              onClick={testFirebaseConnection}
              disabled={testing()}
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {testing() ? 'Testing...' : 'Test Firebase Connection'}
            </button>
            
            <button
              onClick={clearLogs}
              class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Clear Logs
            </button>
          </div>

          <div class="bg-gray-50 border rounded p-4">
            <h3 class="font-semibold mb-2">Current State:</h3>
            <div class="text-sm space-y-1">
              <div>User: {authStore.currentUser?.email || 'Not authenticated'}</div>
              <div>Business ID: {authStore.getBusinessId()}</div>
              <div>Event Types: {appointmentStore.state.eventTypes.length}</div>
              <div>Appointments: {appointmentStore.state.appointments.length}</div>
              <div>Loading: {appointmentStore.state.loading ? 'Yes' : 'No'}</div>
              <div>Error: {appointmentStore.state.error || 'None'}</div>
            </div>
          </div>

          <Show when={debugInfo().length > 0}>
            <div class="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
              <h3 class="text-white font-bold mb-2">Debug Log:</h3>
              {debugInfo().map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}