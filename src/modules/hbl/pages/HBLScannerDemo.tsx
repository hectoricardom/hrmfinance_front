import { Component, createSignal, Show, For } from 'solid-js';
import { Layout, Card } from '../../ui';
import { HBLLocationScanner, HBLContinuousScanner, HBLFastContinuousScanner } from '../scanning';
import { HBLBulkStatusUpdateWithScanner, statusAllList } from '../status';

interface UpdateActivity {
  id: string;
  hbl: string;
  statusId: string;
  statusLabel: string;
  timestamp: number;
  method: 'single' | 'bulk';
}

const HBLScannerDemo: Component = () => {
  const [updateHistory, setUpdateHistory] = createSignal<UpdateActivity[]>([]);
  const [notifications, setNotifications] = createSignal<string[]>([]);
  const [activeDemo, setActiveDemo] = createSignal<'location' | 'bulk' | 'continuous' | 'fast'>('fast');

  // Add notification with auto-remove
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 5000);
  };

  // Handle single HBL update
  const handleHBLUpdated = (hbl: string, statusId: string, statusLabel: string) => {
    const activity: UpdateActivity = {
      id: Date.now().toString(),
      hbl,
      statusId,
      statusLabel,
      timestamp: Date.now(),
      method: 'single'
    };

    setUpdateHistory(prev => [activity, ...prev.slice(0, 19)]);
    addNotification(`✅ Updated ${hbl} to ${statusLabel}`);
  };

  // Handle bulk update success
  const handleBulkUpdateSuccess = (response: any) => {
    const successfulResults = response.results.filter((r: any) => r.success);
    
    const activities: UpdateActivity[] = successfulResults.map((result: any) => ({
      id: `${Date.now()}-${result.hbl}`,
      hbl: result.hbl,
      statusId: result.newStatus,
      statusLabel: statusAllList.find(s => s.id === result.newStatus)?.label || 'Unknown',
      timestamp: Date.now(),
      method: 'bulk' as const
    }));

    setUpdateHistory(prev => [...activities, ...prev.slice(0, 20 - activities.length)]);
    addNotification(`✅ Bulk update completed: ${response.totalSuccess} successful, ${response.totalFailed} failed`);
  };

  // Handle continuous scanner HBL list update
  const handleContinuousUpdate = (hbls: string[], statusId: string, statusLabel: string, results: any) => {
    const successfulResults = results.results?.filter((r: any) => r.success) || [];
    
    const activities: UpdateActivity[] = successfulResults.map((result: any) => ({
      id: `${Date.now()}-${result.hbl}`,
      hbl: result.hbl,
      statusId: statusId,
      statusLabel: statusLabel,
      timestamp: Date.now(),
      method: 'bulk' as const
    }));

    setUpdateHistory(prev => [...activities, ...prev.slice(0, 20 - activities.length)]);
    addNotification(`✅ Continuous update: ${results.totalSuccess || 0} successful, ${results.totalFailed || 0} failed`);
  };

  // Handle errors
  const handleError = (error: string) => {
    addNotification(`❌ ${error}`);
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Mobile-first responsive styles
  const containerStyle = {
    padding: '1rem',
    'max-width': '1200px',
    margin: '0 auto',
    '@media (min-width: 768px)': {
      padding: '2rem'
    }
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1rem',
    border: 'none',
    'background-color': isActive ? 'var(--primary-color)' : 'var(--gray-200)',
    color: isActive ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.9rem',
    transition: 'all 0.2s ease',
    'border-radius': '0',
    flex: '1',
    'min-height': '48px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'text-align': 'center'
  });

  const notificationStyle = (index: number) => ({
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'background-color': '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    'border-radius': '6px',
    opacity: 1 - (index * 0.15),
    transition: 'all 0.3s ease'
  });

  const activityItemStyle = (method: 'single' | 'bulk') => ({
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'background-color': method === 'single' ? '#e8f5e8' : '#e3f2fd',
    border: `1px solid ${method === 'single' ? '#c3e6cb' : '#bbdefb'}`,
    'border-radius': '6px'
  });

  const methodBadgeStyle = (method: 'single' | 'bulk') => ({
    padding: '0.25rem 0.5rem',
    'background-color': method === 'single' ? '#28a745' : '#007bff',
    color: 'white',
    'border-radius': '12px',
    'font-size': '0.75rem',
    'font-weight': '500'
  });

  return (
    <Layout title="📦 Demo del Escáner HBL">
      <div style={containerStyle}>
        {/* Page Header */}
        <div style={{ 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
          <h1 style={{ 'font-size': '1.75rem', margin: '0 0 0.5rem 0', 'line-height': '1.2' }}>
            📦 Demo del Escáner HBL
          </h1>
          <p style={{ 'font-size': '1rem', color: '#666', margin: '0', 'line-height': '1.4', padding: '0 0.5rem' }}>
            Prueba el escaneo de códigos de barras HBL y actualizaciones de ubicación con funcionalidad de cámara real
          </p>
        </div>

        {/* Notifications */}
        <Show when={notifications().length > 0}>
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <h3 style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>🔔 Notificaciones</h3>
            <For each={notifications()}>
              {(notification, index) => (
                <div style={notificationStyle(index())}>
                  {notification}
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Demo Mode Tabs */}
        <Card>
          <div style={{ padding: '0' }}>
            <div style={{ 
              display: 'flex', 
              'border-bottom': '1px solid #ddd',
              'border-radius': '8px 8px 0 0',
              overflow: 'hidden'
            }}>
              <button
                style={{ 
                  ...tabStyle(activeDemo() === 'fast'),
                  'border-top-left-radius': '8px'
                }}
                onClick={() => setActiveDemo('fast')}
              >
                ⚡ Escáner Rápido
              </button>
              <button
                style={{ 
                  ...tabStyle(activeDemo() === 'continuous')
                }}
                onClick={() => setActiveDemo('continuous')}
              >
                🔄 Escáner Continuo
              </button>
              <button
                style={{ 
                  ...tabStyle(activeDemo() === 'location')
                }}
                onClick={() => setActiveDemo('location')}
              >
                📍 Escáner Individual
              </button>
              <button
                style={{ 
                  ...tabStyle(activeDemo() === 'bulk'),
                  'border-top-right-radius': '8px'
                }}
                onClick={() => setActiveDemo('bulk')}
              >
                📋 Escáner Masivo
              </button>
            </div>

            <div style={{ padding: '1rem' }}>
              <Show when={activeDemo() === 'fast'}>
                <div>
                  <h2 style={{ margin: '0 0 1rem 0', color: '#333', 'font-size': '1.25rem' }}>
                    ⚡ Escáner HBL Rápido
                  </h2>
                  <p style={{ margin: '0 0 1.5rem 0', color: '#666', 'font-size': '0.95rem', 'line-height': '1.4' }}>
                    Escáner optimizado con detección múltiple simultánea, procesamiento por lotes y soporte para múltiples librerías.
                    Soluciona problemas de lentitud y mejora el seguimiento de códigos.
                  </p>
                  
                  <HBLFastContinuousScanner
                    onHBLListUpdated={handleContinuousUpdate}
                    onError={handleError}
                  />
                </div>
              </Show>

              <Show when={activeDemo() === 'continuous'}>
                <div>
                  <h2 style={{ margin: '0 0 1rem 0', color: '#333', 'font-size': '1.25rem' }}>
                    🔄 Escáner Continuo HBL
                  </h2>
                  <p style={{ margin: '0 0 1.5rem 0', color: '#666', 'font-size': '0.95rem', 'line-height': '1.4' }}>
                    Escanea múltiples HBLs de forma continua, agrégalos a una lista y envíalos todos a una ubicación específica.
                    Perfecto para uso móvil y procesamiento por lotes.
                  </p>
                  
                  <HBLContinuousScanner
                    onHBLListUpdated={handleContinuousUpdate}
                    onError={handleError}
                  />
                </div>
              </Show>

              <Show when={activeDemo() === 'location'}>
                <div>
                  <h2 style={{ margin: '0 0 1rem 0', color: '#333', 'font-size': '1.25rem' }}>
                    📍 Escáner de Ubicación HBL Individual
                  </h2>
                  <p style={{ margin: '0 0 1.5rem 0', color: '#666', 'font-size': '0.95rem', 'line-height': '1.4' }}>
                    Selecciona una ubicación y escanea códigos de barras HBL individuales para actualizar su estado uno por uno.
                    Esto es ideal para operaciones de almacén donde deseas rastrear elementos moviéndose entre ubicaciones.
                  </p>
                  
                  <HBLLocationScanner
                    onHBLUpdated={handleHBLUpdated}
                    onError={handleError}
                  />
                </div>
              </Show>

              <Show when={activeDemo() === 'bulk'}>
                <div>
                  <h2 style={{ margin: '0 0 1rem 0', color: '#333', 'font-size': '1.25rem' }}>
                    📋 Actualización Masiva de Estado HBL con Escáner
                  </h2>
                  <p style={{ margin: '0 0 1.5rem 0', color: '#666', 'font-size': '0.95rem', 'line-height': '1.4' }}>
                    Escanea múltiples códigos de barras HBL o pega texto que contenga números HBL para actualizaciones masivas de estado.
                    Perfecto para procesar grandes lotes de paquetes a la vez.
                  </p>
                  
                  <HBLBulkStatusUpdateWithScanner
                    onSuccess={handleBulkUpdateSuccess}
                  />
                </div>
              </Show>
            </div>
          </div>
        </Card>

        {/* Update History */}
        <Show when={updateHistory().length > 0}>
          <Card>
            <div style={{ padding: '1rem' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: '#333', 'font-size': '1.25rem' }}>
                📊 Actividad de Actualización Reciente ({updateHistory().length})
              </h2>
              
              <div style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
                <For each={updateHistory()}>
                  {(activity) => (
                    <div style={activityItemStyle(activity.method)}>
                      <div>
                        <div style={{ 'font-weight': '500', 'font-family': 'monospace', 'font-size': '1.1rem' }}>
                          HBL: {activity.hbl}
                        </div>
                        <div style={{ 'margin-top': '0.25rem', 'font-size': '0.9rem' }}>
                          Status: <strong>{activity.statusLabel}</strong>
                          <span style={{ 'margin-left': '0.5rem' }}>
                            <span style={methodBadgeStyle(activity.method)}>
                              {activity.method === 'single' ? '📍 Single' : '📋 Bulk'}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div style={{ 'font-size': '0.8rem', color: '#666', 'text-align': 'right' }}>
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                  )}
                </For>
              </div>

              {/* Summary Stats */}
              <div style={{
                'margin-top': '1rem',
                'padding-top': '1rem',
                'border-top': '1px solid #ddd',
                display: 'grid',
                'grid-template-columns': 'repeat(2, 1fr)',
                gap: '0.75rem',
                'text-align': 'center'
              }}>
                <div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#007bff' }}>
                    {updateHistory().length}
                  </div>
                  <div style={{ 'font-size': '0.8rem', color: '#666' }}>Actualizaciones Totales</div>
                </div>
                <div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#28a745' }}>
                    {updateHistory().filter(a => a.method === 'single').length}
                  </div>
                  <div style={{ 'font-size': '0.8rem', color: '#666' }}>Escaneos Individuales</div>
                </div>
                <div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#17a2b8' }}>
                    {updateHistory().filter(a => a.method === 'bulk').length}
                  </div>
                  <div style={{ 'font-size': '0.8rem', color: '#666' }}>Actualizaciones Masivas</div>
                </div>
                <div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#6f42c1' }}>
                    {new Set(updateHistory().map(a => a.hbl)).size}
                  </div>
                  <div style={{ 'font-size': '0.8rem', color: '#666' }}>HBL Únicos</div>
                </div>
              </div>
            </div>
          </Card>
        </Show>

        {/* Features Overview */}
        <Card>
          <div style={{ padding: '1rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.25rem' }}>✨ HBL Scanner Features</h2>
            
            <div style={{ display: 'grid', 'grid-template-columns': '1fr', gap: '1.5rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#dc3545', 'font-size': '1.1rem' }}>⚡ Escáner Rápido</h3>
                <ul style={{ 'padding-left': '1.5rem', margin: '0', 'line-height': '1.6' }}>
                  <li>Alto rendimiento con múltiples librerías de escaneo</li>
                  <li>Detección simultánea de múltiples códigos de barras</li>
                  <li>Auto-detección del mejor escáner para el dispositivo</li>
                  <li>Procesamiento por lotes optimizado</li>
                  <li>Métricas de rendimiento en tiempo real</li>
                </ul>
              </div>
              
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#6f42c1', 'font-size': '1.1rem' }}>🔄 Escáner Continuo</h3>
                <ul style={{ 'padding-left': '1.5rem', margin: '0', 'line-height': '1.6' }}>
                  <li>Diseño mobile-first optimizado para uso en dispositivos móviles</li>
                  <li>Escanea múltiples HBLs y agrégalos a una lista</li>
                  <li>Modo continuo para escaneos rápidos sin cerrar cámara</li>
                  <li>Detección automática de duplicados</li>
                  <li>Envío por lotes a ubicación seleccionada</li>
                </ul>
              </div>
              
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#007bff', 'font-size': '1.1rem' }}>📍 Escáner Individual</h3>
                <ul style={{ 'padding-left': '1.5rem', margin: '0', 'line-height': '1.6' }}>
                  <li>Selecciona ubicación de destino de lista de estados predefinida</li>
                  <li>Escanea códigos de barras HBL individuales con cámara</li>
                  <li>Actualización automática de estado para cada HBL escaneado</li>
                  <li>Retroalimentación de éxito/error en tiempo real</li>
                  <li>Ver actividad de escaneo reciente y estadísticas</li>
                </ul>
              </div>
              
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#28a745', 'font-size': '1.1rem' }}>📋 Escáner Masivo</h3>
                <ul style={{ 'padding-left': '1.5rem', margin: '0', 'line-height': '1.6' }}>
                  <li>Tres modos de entrada: Solo texto, Solo escáner, o Ambos</li>
                  <li>Analizar números HBL de texto pegado</li>
                  <li>Escanear múltiples códigos de barras con cámara</li>
                  <li>Combinar texto y HBL escaneados en una sola operación</li>
                  <li>Actualizaciones de estado por lotes con resultados detallados</li>
                </ul>
              </div>
            </div>

            <div style={{ 
              'margin-top': '1.5rem',
              'padding-top': '1.5rem',
              'border-top': '1px solid #eee'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.1rem' }}>🔧 Características Técnicas</h3>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr', gap: '1rem' }}>
                <div>
                  <strong>📷 Integración de Cámara:</strong>
                  <ul style={{ 'font-size': '0.9rem', 'padding-left': '1.25rem', margin: '0.25rem 0 0 0' }}>
                    <li>Detección de códigos de barras en tiempo real</li>
                    <li>Soporte para múltiples cámaras</li>
                    <li>Interfaz optimizada para móviles</li>
                  </ul>
                </div>
                <div>
                  <strong>🔍 Validación HBL:</strong>
                  <ul style={{ 'font-size': '0.9rem', 'padding-left': '1.25rem', margin: '0.25rem 0 0 0' }}>
                    <li>Validación de formato (230XXXXXX)</li>
                    <li>Detección de duplicados</li>
                    <li>Manejo y reporte de errores</li>
                  </ul>
                </div>
                <div>
                  <strong>📊 Gestión de Estado:</strong>
                  <ul style={{ 'font-size': '0.9rem', 'padding-left': '1.25rem', margin: '0.25rem 0 0 0' }}>
                    <li>Estados de ubicación predefinidos</li>
                    <li>Actualizaciones de estado basadas en flujo de trabajo</li>
                    <li>Seguimiento de notas y marcas de tiempo</li>
                  </ul>
                </div>
                <div>
                  <strong>🔄 Integración de Datos:</strong>
                  <ul style={{ 'font-size': '0.9rem', 'padding-left': '1.25rem', margin: '0.25rem 0 0 0' }}>
                    <li>Actualizaciones de API en tiempo real</li>
                    <li>Soporte para procesamiento por lotes</li>
                    <li>Recuperación de errores y reintento</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <div style={{
            padding: '1rem',
            'background-color': '#fff3cd',
            border: '1px solid #ffeaa7',
            'border-radius': '8px'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1.25rem' }}>📋 Cómo Usar los Escáneres HBL</h3>
            
            <div style={{ display: 'grid', 'grid-template-columns': '1fr', gap: '1.5rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404', 'font-size': '1.1rem' }}>⚡ Escáner Rápido (Mejor rendimiento):</h4>
                <ol style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
                  <li>Selecciona tipo de escáner (Auto/Quagga2/HTML5-QRCode)</li>
                  <li>Configura detección múltiple y tamaño de lote</li>
                  <li>Inicia el escáner optimizado</li>
                  <li>Escanea múltiples códigos simultáneamente</li>
                  <li>Monitorea métricas de rendimiento en tiempo real</li>
                  <li>Envía por lotes con procesamiento optimizado</li>
                </ol>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404', 'font-size': '1.1rem' }}>🔄 Escáner Continuo (Recomendado para móvil):</h4>
                <ol style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
                  <li>Selecciona la ubicación de destino</li>
                  <li>Inicia el escáner y activa modo continuo</li>
                  <li>Escanea múltiples HBLs de forma rápida</li>
                  <li>Revisa la lista de HBLs escaneados</li>
                  <li>Envía todos los HBLs a la ubicación seleccionada</li>
                </ol>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404', 'font-size': '1.1rem' }}>📍 Escáner Individual:</h4>
                <ol style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
                  <li>Selecciona la ubicación/estado objetivo</li>
                  <li>Haz clic en "Iniciar Escáner HBL"</li>
                  <li>Permite permisos de cámara cuando se solicite</li>
                  <li>Escanea códigos de barras HBL uno por uno</li>
                  <li>Monitorea resultados en tiempo real</li>
                </ol>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404', 'font-size': '1.1rem' }}>📋 Escáner Masivo:</h4>
                <ol style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
                  <li>Elige método de entrada (texto, escáner, o ambos)</li>
                  <li>Agrega HBLs escribiendo/pegando o escaneando</li>
                  <li>Selecciona el estado objetivo para todos los HBLs</li>
                  <li>Agrega notas opcionales</li>
                  <li>Ejecuta actualización masiva y revisa resultados</li>
                </ol>
              </div>
            </div>
            
            <div style={{ 
              'margin-top': '1rem', 
              'padding-top': '1rem', 
              'border-top': '1px solid #ffd32a'
            }}>
              <strong>💡 Pro Tips:</strong>
              <ul style={{ 'margin': '0.5rem 0 0 0', 'padding-left': '1.25rem' }}>
                <li>HBL numbers must follow format: <code>230XXXXXX</code></li>
                <li>Use good lighting for optimal barcode scanning</li>
                <li><strong>⚡ Escáner Rápido es la mejor opción</strong> - soluciona problemas de lentitud y mejora el seguimiento</li>
                <li><strong>🔄 Escáner Continuo es ideal para uso móvil básico</strong> - permite escanear múltiples HBLs rápidamente</li>
                <li>The scanner automatically validates HBL formats and detects duplicates</li>
                <li>Check the activity history to track all updates</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default HBLScannerDemo;