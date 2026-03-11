import { createSignal, onMount, For, Show } from 'solid-js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

/**
 * Debug component to diagnose event types loading issues
 */
export function EventTypesDebug() {
  const [debugData, setDebugData] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [queryType, setQueryType] = createSignal('all');

  const loadEventTypesDirectly = async () => {
    setLoading(true);
    setError('');
    setDebugData([]);
    
    try {
      devLog('=== EventTypesDebug: Loading directly from Firebase ===');
      devLog('Current user:', authStore.currentUser?.email);
      devLog('Current businessId:', authStore.getBusinessId());
      devLog('Query type:', queryType());

      const eventTypesRef = collection(db, 'eventTypes');
      let q:any;

      switch (queryType()) {
        case 'all':
          // Get ALL documents without any filters
          q = query(eventTypesRef);
          break;
        case 'active':
          // Only filter by isActive
          q = query(eventTypesRef, where('isActive', '==', true));
          break;
        case 'byUser':
          // Only filter by createdBy
          const userId = authStore.currentUser?.uid;
          if (!userId) {
            throw new Error('No user logged in');
          }
          q = query(eventTypesRef, where('createdBy', '==', userId));
          break;
        case 'byBusiness':
          // Only filter by businessId
          const businessId = authStore.getBusinessId();
          q = query(eventTypesRef, where('businessId', '==', businessId));
          break;
      }

      const snapshot = await getDocs(q);
      const results: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          ...data,
          _meta: {
            hasBusinessId: !!data.businessId,
            hasCreatedBy: !!data.createdBy,
            hasIsActive: data.isActive !== undefined,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
          }
        });
      });

      devLog(`Found ${results.length} event types`);
      devLog('Results:', results);
      
      setDebugData(results);
    } catch (err) {
      devLog('Error loading event types:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testStoreMethod = async () => {
    setLoading(true);
    setError('');
    
    try {
      devLog('=== Testing Store Method ===');
      const eventTypes = await appointmentStore.getAllActiveEventTypesSimple();
      devLog('Store method returned:', eventTypes.length, 'event types');
      devLog('Store eventTypes:', eventTypes);
    } catch (err) {
      devLog('Store method error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadEventTypesDirectly();
  });

  return (
    <div class="p-6 max-w-6xl mx-auto">
      <div class="bg-white border rounded-lg p-6">
        <h2 class="text-2xl font-bold mb-4">Event Types Debug</h2>
        
        <div class="mb-6 space-y-4">
          <div class="flex gap-4 items-center">
            <select 
              value={queryType()} 
              onChange={(e) => setQueryType(e.currentTarget.value)}
              class="border rounded px-3 py-2"
            >
              <option value="all">All Documents (No Filter)</option>
              <option value="active">Active Only (where isActive == true)</option>
              <option value="byUser">By Current User (where createdBy == uid)</option>
              <option value="byBusiness">By Business (where businessId == businessId)</option>
            </select>
            
            <button
              onClick={loadEventTypesDirectly}
              disabled={loading()}
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Load Direct from Firebase
            </button>
            
            <button
              onClick={testStoreMethod}
              disabled={loading()}
              class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Test Store Method
            </button>
          </div>

          <div class="bg-gray-100 p-3 rounded">
            <div class="text-sm space-y-1">
              <div><strong>Current User:</strong> {authStore.currentUser?.email || 'Not logged in'}</div>
              <div><strong>User ID:</strong> {authStore.currentUser?.uid || 'N/A'}</div>
              <div><strong>Business ID:</strong> {authStore.getBusinessId()}</div>
            </div>
          </div>

          <Show when={error()}>
            <div class="bg-red-50 border border-red-200 rounded p-3 text-red-800">
              <strong>Error:</strong> {error()}
            </div>
          </Show>
        </div>

        <Show when={loading()}>
          <div class="text-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </Show>

        <Show when={!loading() && debugData().length > 0}>
          <div class="space-y-4">
            <h3 class="font-semibold">
              Found {debugData().length} Event Types:
            </h3>
            
            <div class="grid gap-4">
              <For each={debugData()}>
                {(eventType, index) => (
                  <div class="border rounded p-4 bg-gray-50">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <h4 class="font-semibold text-lg">{index() + 1}. {eventType.name || 'Unnamed'}</h4>
                        <p class="text-sm text-gray-600">ID: {eventType.id}</p>
                        <p class="text-sm">Description: {eventType.description || 'No description'}</p>
                        <p class="text-sm">Duration: {eventType.duration} minutes</p>
                        <p class="text-sm">Location Type: {eventType.locationType}</p>
                      </div>
                      
                      <div class="text-sm space-y-1">
                        <div class="grid grid-cols-2 gap-2">
                          <div><strong>Is Active:</strong></div>
                          <div class={eventType.isActive ? 'text-green-600' : 'text-red-600'}>
                            {eventType.isActive ? 'Yes' : 'No'}
                          </div>
                          
                          <div><strong>Business ID:</strong></div>
                          <div>{eventType.businessId || 'Not set'}</div>
                          
                          <div><strong>Created By:</strong></div>
                          <div>{eventType.createdBy || 'Not set'}</div>
                          
                          <div><strong>Has Business ID:</strong></div>
                          <div class={eventType._meta.hasBusinessId ? 'text-green-600' : 'text-red-600'}>
                            {eventType._meta.hasBusinessId ? 'Yes' : 'No'}
                          </div>
                          
                          <div><strong>Has Created By:</strong></div>
                          <div class={eventType._meta.hasCreatedBy ? 'text-green-600' : 'text-red-600'}>
                            {eventType._meta.hasCreatedBy ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <details class="mt-2">
                      <summary class="cursor-pointer text-blue-600 text-sm">View Raw Data</summary>
                      <pre class="mt-2 bg-black text-green-400 p-2 rounded text-xs overflow-auto">
{JSON.stringify(eventType, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        <Show when={!loading() && debugData().length === 0}>
          <div class="text-center py-8 bg-gray-50 rounded">
            <p class="text-gray-600">No event types found with current query.</p>
            <p class="text-sm text-gray-500 mt-2">
              Try changing the query type or creating an event type first.
            </p>
          </div>
        </Show>
      </div>
    </div>
  );
}