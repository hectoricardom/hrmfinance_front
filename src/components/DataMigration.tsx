import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { migrationService, MigrationResult, MigrationProgress } from '../services/migrationService';
import { authStore } from '../stores/authStore';

interface MigrationStatus {
  businesses: { firestore: number; api: number; needsMigration: number };
  stores: { firestore: number; api: number; needsMigration: number };
}

const DataMigration: Component = () => {
  const [status, setStatus] = createSignal<MigrationStatus | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [migrating, setMigrating] = createSignal(false);
  const [progress, setProgress] = createSignal<MigrationProgress | null>(null);
  const [currentPhase, setCurrentPhase] = createSignal<'businesses' | 'stores' | null>(null);
  const [businessResult, setBusinessResult] = createSignal<MigrationResult | null>(null);
  const [storeResult, setStoreResult] = createSignal<MigrationResult | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);

  // Load migration status on mount
  createEffect(() => {
    loadStatus();
  });

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const migrationStatus = await migrationService.getMigrationStatus();
      setStatus(migrationStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to load migration status');
    } finally {
      setLoading(false);
    }
  };

  const migrateBusinesses = async () => {
    setMigrating(true);
    setCurrentPhase('businesses');
    setBusinessResult(null);
    setError(null);

    try {
      const result = await migrationService.migrateBusinesses((prog) => {
        setProgress(prog);
      });
      setBusinessResult(result);
      await loadStatus(); // Refresh status
    } catch (err: any) {
      setError(err.message || 'Migration failed');
    } finally {
      setMigrating(false);
      setCurrentPhase(null);
      setProgress(null);
    }
  };

  const migrateStores = async () => {
    setMigrating(true);
    setCurrentPhase('stores');
    setStoreResult(null);
    setError(null);

    try {
      const result = await migrationService.migrateStores((prog) => {
        setProgress(prog);
      });
      setStoreResult(result);
      await loadStatus(); // Refresh status
    } catch (err: any) {
      setError(err.message || 'Migration failed');
    } finally {
      setMigrating(false);
      setCurrentPhase(null);
      setProgress(null);
    }
  };

  const migrateAll = async () => {
    setMigrating(true);
    setBusinessResult(null);
    setStoreResult(null);
    setError(null);

    try {
      const results = await migrationService.migrateAll((prog) => {
        setCurrentPhase(prog.phase);
        setProgress(prog);
      });
      setBusinessResult(results.businesses);
      setStoreResult(results.stores);
      await loadStatus(); // Refresh status
    } catch (err: any) {
      setError(err.message || 'Migration failed');
    } finally {
      setMigrating(false);
      setCurrentPhase(null);
      setProgress(null);
    }
  };

  // Check if user is admin
  if (!authStore.isAdmin()) {
    return (
      <div style={{
        padding: '2rem',
        'text-align': 'center',
        color: '#d32f2f'
      }}>
        Only administrators can access the migration tool.
      </div>
    );
  }

  return (
    <div style={{
      padding: '1.5rem',
      'max-width': '800px',
      margin: '0 auto'
    }}>
      <h2 style={{
        margin: '0 0 1.5rem 0',
        color: '#202124',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        <span style={{ 'font-size': '1.5rem' }}>Data Migration</span>
        <span style={{
          'font-size': '0.75rem',
          padding: '0.25rem 0.5rem',
          background: '#fff3e0',
          color: '#e65100',
          'border-radius': '4px'
        }}>
          Firestore to API
        </span>
      </h2>

      {/* Error Display */}
      <Show when={error()}>
        <div style={{
          padding: '1rem',
          background: '#ffebee',
          'border-radius': '8px',
          'margin-bottom': '1rem',
          color: '#c62828',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <span>{error()}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              'font-size': '1.2rem'
            }}
          >
            x
          </button>
        </div>
      </Show>

      {/* Migration Status */}
      <div style={{
        background: '#fff',
        'border-radius': '8px',
        border: '1px solid #e8eaed',
        'margin-bottom': '1.5rem',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          'border-bottom': '1px solid #e8eaed',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <h3 style={{ margin: 0, 'font-size': '1rem' }}>Migration Status</h3>
          <button
            onClick={loadStatus}
            disabled={loading()}
            style={{
              padding: '0.5rem 1rem',
              background: '#f1f3f4',
              border: 'none',
              'border-radius': '4px',
              cursor: loading() ? 'not-allowed' : 'pointer',
              'font-size': '0.875rem'
            }}
          >
            {loading() ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <Show when={status()} fallback={
          <div style={{ padding: '2rem', 'text-align': 'center', color: '#5f6368' }}>
            {loading() ? 'Loading migration status...' : 'Click Refresh to load status'}
          </div>
        }>
          <div style={{ padding: '1rem' }}>
            {/* Businesses Status */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              padding: '0.75rem',
              background: '#f8f9fa',
              'border-radius': '6px',
              'margin-bottom': '0.5rem'
            }}>
              <div>
                <strong>Businesses</strong>
                <div style={{ 'font-size': '0.8rem', color: '#5f6368', 'margin-top': '0.25rem' }}>
                  Firestore: {status()?.businesses.firestore || 0} |
                  API: {status()?.businesses.api || 0} |
                  <span style={{ color: status()?.businesses.needsMigration ? '#e65100' : '#2e7d32' }}>
                    {' '}Pending: {status()?.businesses.needsMigration || 0}
                  </span>
                </div>
              </div>
              <button
                onClick={migrateBusinesses}
                disabled={migrating() || !status()?.businesses.needsMigration}
                style={{
                  padding: '0.5rem 1rem',
                  background: status()?.businesses.needsMigration ? '#1a73e8' : '#e8eaed',
                  color: status()?.businesses.needsMigration ? '#fff' : '#5f6368',
                  border: 'none',
                  'border-radius': '4px',
                  cursor: migrating() || !status()?.businesses.needsMigration ? 'not-allowed' : 'pointer',
                  'font-size': '0.875rem'
                }}
              >
                {currentPhase() === 'businesses' ? 'Migrating...' : 'Migrate'}
              </button>
            </div>

            {/* Stores Status */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              padding: '0.75rem',
              background: '#f8f9fa',
              'border-radius': '6px'
            }}>
              <div>
                <strong>Stores</strong>
                <div style={{ 'font-size': '0.8rem', color: '#5f6368', 'margin-top': '0.25rem' }}>
                  Firestore: {status()?.stores.firestore || 0} |
                  API: {status()?.stores.api || 0} |
                  <span style={{ color: status()?.stores.needsMigration ? '#e65100' : '#2e7d32' }}>
                    {' '}Pending: {status()?.stores.needsMigration || 0}
                  </span>
                </div>
              </div>
              <button
                onClick={migrateStores}
                disabled={migrating() || !status()?.stores.needsMigration}
                style={{
                  padding: '0.5rem 1rem',
                  background: status()?.stores.needsMigration ? '#1a73e8' : '#e8eaed',
                  color: status()?.stores.needsMigration ? '#fff' : '#5f6368',
                  border: 'none',
                  'border-radius': '4px',
                  cursor: migrating() || !status()?.stores.needsMigration ? 'not-allowed' : 'pointer',
                  'font-size': '0.875rem'
                }}
              >
                {currentPhase() === 'stores' ? 'Migrating...' : 'Migrate'}
              </button>
            </div>
          </div>
        </Show>
      </div>

      {/* Migrate All Button */}
      <div style={{
        'margin-bottom': '1.5rem',
        'text-align': 'center'
      }}>
        <button
          onClick={migrateAll}
          disabled={migrating() || (!status()?.businesses.needsMigration && !status()?.stores.needsMigration)}
          style={{
            padding: '0.75rem 2rem',
            background: (status()?.businesses.needsMigration || status()?.stores.needsMigration) ? '#2e7d32' : '#e8eaed',
            color: (status()?.businesses.needsMigration || status()?.stores.needsMigration) ? '#fff' : '#5f6368',
            border: 'none',
            'border-radius': '6px',
            cursor: migrating() || (!status()?.businesses.needsMigration && !status()?.stores.needsMigration) ? 'not-allowed' : 'pointer',
            'font-size': '1rem',
            'font-weight': '500'
          }}
        >
          {migrating() ? 'Migration in Progress...' : 'Migrate All Data'}
        </button>
      </div>

      {/* Progress Bar */}
      <Show when={migrating() && progress()}>
        <div style={{
          background: '#fff',
          'border-radius': '8px',
          border: '1px solid #e8eaed',
          padding: '1rem',
          'margin-bottom': '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'margin-bottom': '0.5rem'
          }}>
            <span style={{ 'font-weight': '500' }}>
              {currentPhase() === 'businesses' ? 'Migrating Businesses' : 'Migrating Stores'}
            </span>
            <span style={{ color: '#5f6368' }}>
              {progress()?.processed || 0} / {progress()?.total || 0}
            </span>
          </div>
          <div style={{
            background: '#e8eaed',
            'border-radius': '4px',
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#1a73e8',
              height: '100%',
              width: `${((progress()?.processed || 0) / (progress()?.total || 1)) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            'margin-top': '0.5rem',
            'font-size': '0.8rem',
            color: '#5f6368'
          }}>
            {progress()?.currentItem}
          </div>
        </div>
      </Show>

      {/* Migration Results */}
      <Show when={businessResult() || storeResult()}>
        <div style={{
          background: '#fff',
          'border-radius': '8px',
          border: '1px solid #e8eaed',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem',
            'border-bottom': '1px solid #e8eaed',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <h3 style={{ margin: 0, 'font-size': '1rem' }}>Migration Results</h3>
            <button
              onClick={() => setShowDetails(!showDetails())}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#f1f3f4',
                border: 'none',
                'border-radius': '4px',
                cursor: 'pointer',
                'font-size': '0.8rem'
              }}
            >
              {showDetails() ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div style={{ padding: '1rem' }}>
            {/* Business Results */}
            <Show when={businessResult()}>
              <div style={{
                padding: '0.75rem',
                background: businessResult()?.success ? '#e8f5e9' : '#ffebee',
                'border-radius': '6px',
                'margin-bottom': '0.5rem'
              }}>
                <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                  Businesses: {businessResult()?.success ? 'Success' : 'Completed with errors'}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#5f6368' }}>
                  Migrated: {businessResult()?.migrated} |
                  Skipped: {businessResult()?.skipped} |
                  Failed: {businessResult()?.failed}
                </div>
              </div>
            </Show>

            {/* Store Results */}
            <Show when={storeResult()}>
              <div style={{
                padding: '0.75rem',
                background: storeResult()?.success ? '#e8f5e9' : '#ffebee',
                'border-radius': '6px'
              }}>
                <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                  Stores: {storeResult()?.success ? 'Success' : 'Completed with errors'}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#5f6368' }}>
                  Migrated: {storeResult()?.migrated} |
                  Skipped: {storeResult()?.skipped} |
                  Failed: {storeResult()?.failed}
                </div>
              </div>
            </Show>

            {/* Detailed Results */}
            <Show when={showDetails()}>
              <div style={{ 'margin-top': '1rem' }}>
                <Show when={businessResult()?.details && businessResult()!.details.length > 0}>
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '0.9rem' }}>Business Details</h4>
                    <div style={{
                      'max-height': '200px',
                      'overflow-y': 'auto',
                      border: '1px solid #e8eaed',
                      'border-radius': '4px'
                    }}>
                      <For each={businessResult()?.details}>
                        {(item) => (
                          <div style={{
                            padding: '0.5rem',
                            'border-bottom': '1px solid #e8eaed',
                            display: 'flex',
                            'justify-content': 'space-between',
                            'font-size': '0.8rem'
                          }}>
                            <span>{item.name || item.id}</span>
                            <span style={{
                              color: item.status === 'migrated' ? '#2e7d32' :
                                     item.status === 'skipped' ? '#f57c00' : '#c62828'
                            }}>
                              {item.status}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <Show when={storeResult()?.details && storeResult()!.details.length > 0}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '0.9rem' }}>Store Details</h4>
                    <div style={{
                      'max-height': '200px',
                      'overflow-y': 'auto',
                      border: '1px solid #e8eaed',
                      'border-radius': '4px'
                    }}>
                      <For each={storeResult()?.details}>
                        {(item) => (
                          <div style={{
                            padding: '0.5rem',
                            'border-bottom': '1px solid #e8eaed',
                            display: 'flex',
                            'justify-content': 'space-between',
                            'font-size': '0.8rem'
                          }}>
                            <span>{item.name || item.id}</span>
                            <span style={{
                              color: item.status === 'migrated' ? '#2e7d32' :
                                     item.status === 'skipped' ? '#f57c00' : '#c62828'
                            }}>
                              {item.status}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Errors */}
                <Show when={(businessResult()?.errors?.length || 0) > 0 || (storeResult()?.errors?.length || 0) > 0}>
                  <div style={{ 'margin-top': '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '0.9rem', color: '#c62828' }}>Errors</h4>
                    <div style={{
                      background: '#ffebee',
                      padding: '0.5rem',
                      'border-radius': '4px',
                      'font-size': '0.8rem'
                    }}>
                      <For each={[...(businessResult()?.errors || []), ...(storeResult()?.errors || [])]}>
                        {(err) => (
                          <div style={{ padding: '0.25rem 0' }}>
                            <strong>{err.id}:</strong> {err.error}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Instructions */}
      <div style={{
        'margin-top': '1.5rem',
        padding: '1rem',
        background: '#e3f2fd',
        'border-radius': '8px',
        'font-size': '0.85rem',
        color: '#1565c0'
      }}>
        <strong>Migration Notes:</strong>
        <ul style={{ margin: '0.5rem 0 0 0', 'padding-left': '1.25rem' }}>
          <li>Migration will skip records that already exist in the API</li>
          <li>Original Firestore data is preserved (not deleted)</li>
          <li>After successful migration, the app will use API data first</li>
          <li>You can re-run migration safely - duplicates are automatically skipped</li>
        </ul>
      </div>
    </div>
  );
};

export default DataMigration;
