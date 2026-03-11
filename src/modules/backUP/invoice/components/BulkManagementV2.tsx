import { createSignal, For, Show } from 'solid-js';

// Versión 2: Bultos Independientes con Reservas Integradas
// Los bultos se crean primero y las reservas se agregan directamente a cada bulto

interface ReservaInBulk {
  id: string;
  description: string;
  type: string;
  qty: number;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  value: number;
  fragile: boolean;
  customsCode?: string;
  notes?: string;
}

interface IndependentBulk {
  id: string;
  name: string;
  type: 'BAG' | 'BOX' | 'ENVELOPE' | 'PALLET' | 'CUSTOM';
  
  // Información física del bulto
  maxWeight: number;
  actualWeight: number;
  dimensions: { length: number; width: number; height: number };
  material: string;
  color?: string;
  
  // Costos
  transportCost: number;
  handlingFee: number;
  insuranceCost: number;
  customsFee: number;
  
  // Información de envío
  trackingNumber?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  shippingMethod: 'SEA' | 'AIR' | 'LAND';
  
  // Instrucciones especiales
  specialInstructions?: string;
  fragileHandling: boolean;
  signatureRequired: boolean;
  
  // Reservas dentro del bulto
  reservas: ReservaInBulk[];
  
  // Metadatos
  createdDate: Date;
  lastModified: Date;
  status: 'DRAFT' | 'READY' | 'SHIPPED' | 'DELIVERED';
}

const styles = {
  container: { padding: '1rem', background: 'var(--surface-color)' },
  section: { background: 'var(--background-color)', padding: '1rem', marginBottom: '1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' },
  gridSmall: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' },
  input: { width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem' },
  button: { padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontSize: '0.875rem' },
  primaryButton: { background: 'var(--primary-color)', color: 'white' },
  successButton: { background: '#4caf50', color: 'white' },
  item: { padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', marginBottom: '0.5rem', background: 'var(--surface-color)' },
  subItem: { padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', marginBottom: '0.5rem', background: '#fafafa' },
  label: { fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem', color: 'var(--text-secondary)' },
  badge: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: '500' },
  statusBadge: { background: '#e8f5e9', color: '#2e7d32' },
  priorityBadge: { background: '#fff3e0', color: '#f57c00' }
};

export const BulkManagementV2 = () => {
  const [bulks, setBulks] = createSignal<IndependentBulk[]>([]);
  const [expandedBulk, setExpandedBulk] = createSignal<string | null>(null);

  // Crear nuevo bulto independiente
  const addBulk = () => {
    const newBulk: IndependentBulk = {
      id: Date.now().toString(),
      name: `Bulto ${bulks().length + 1}`,
      type: 'BAG',
      
      // Información física
      maxWeight: 50,
      actualWeight: 0,
      dimensions: { length: 60, width: 40, height: 30 },
      material: 'Plástico reforzado',
      color: 'Negro',
      
      // Costos
      transportCost: 15,
      handlingFee: 5,
      insuranceCost: 0,
      customsFee: 0,
      
      // Información de envío
      priority: 'NORMAL',
      shippingMethod: 'SEA',
      fragileHandling: false,
      signatureRequired: false,
      
      // Reservas
      reservas: [],
      
      // Metadatos
      createdDate: new Date(),
      lastModified: new Date(),
      status: 'DRAFT'
    };
    setBulks(prev => [...prev, newBulk]);
  };

  // Agregar reserva a un bulto específico
  const addReservaToBulk = (bulkId: string) => {
    const newReserva: ReservaInBulk = {
      id: Date.now().toString(),
      description: '',
      type: 'GENERAL',
      qty: 1,
      weight: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      value: 0,
      fragile: false
    };

    setBulks(prev => prev.map(bulk => 
      bulk?.id === bulkId 
        ? { 
            ...bulk, 
            reservas: [...bulk?.reservas, newReserva],
            lastModified: new Date()
          }
        : bulk
    ));
  };

  // Actualizar bulto
  const updateBulk = (bulkId: string, updates: Partial<IndependentBulk>) => {
    setBulks(prev => prev.map(bulk => 
      bulk?.id === bulkId 
        ? { ...bulk, ...updates, lastModified: new Date() }
        : bulk
    ));
  };

  // Actualizar reserva en bulto
  const updateReservaInBulk = (bulkId: string, reservaId: string, updates: Partial<ReservaInBulk>) => {
    setBulks(prev => prev.map(bulk => 
      bulk?.id === bulkId 
        ? {
            ...bulk,
            reservas: bulk?.reservas.map(reserva =>
              reserva.id === reservaId ? { ...reserva, ...updates } : reserva
            ),
            lastModified: new Date()
          }
        : bulk
    ));
  };

  // Calcular totales del bulto
  const getBulkTotals = (bulk: IndependentBulk) => {
    const totalWeight = bulk?.reservas.reduce((sum, r) => sum + (r.weight * r.qty), 0);
    const totalValue = bulk?.reservas.reduce((sum, r) => sum + (r.value * r.qty), 0);
    const totalCost = bulk?.transportCost + bulk?.handlingFee + bulk?.insuranceCost + bulk?.customsFee;
    const totalVolume = bulk?.reservas.reduce((sum, r) => 
      sum + (r.dimensions.length * r.dimensions.width * r.dimensions.height * r.qty), 0
    );
    
    return { totalWeight, totalValue, totalCost, totalVolume, itemCount: bulk?.reservas.length };
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return '#757575';
      case 'READY': return '#2196f3';
      case 'SHIPPED': return '#ff9800';
      case 'DELIVERED': return '#4caf50';
      default: return '#757575';
    }
  };

  // Obtener color de prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return '#4caf50';
      case 'NORMAL': return '#2196f3';
      case 'HIGH': return '#ff9800';
      case 'URGENT': return '#f44336';
      default: return '#2196f3';
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>📦 Gestión de Bultos - Versión 2: Independientes</h2>
        <button onClick={addBulk} style={{ ...styles.button, ...styles.primaryButton }}>
          + Crear Nuevo Bulto
        </button>
      </div>
      
      <div style={styles.grid}>
        <For each={bulks()}>
          {(bulk) => {
            const totals = getBulkTotals(bulk);
            const isExpanded = expandedBulk() === bulk?.id;
            
            return (
              <div style={styles.section}>
                {/* Header del Bulto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={bulk?.name}
                      onInput={(e) => updateBulk(bulk?.id, { name: e.target.value })}
                      style={{ ...styles.input, fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}
                    />
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ ...styles.badge, backgroundColor: getStatusColor(bulk?.status), color: 'white' }}>
                        {bulk?.status}
                      </span>
                      <span style={{ ...styles.badge, backgroundColor: getPriorityColor(bulk?.priority), color: 'white' }}>
                        {bulk?.priority}
                      </span>
                      <span style={{ ...styles.badge, ...styles.statusBadge }}>
                        {bulk?.shippingMethod}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setExpandedBulk(isExpanded ? null : bulk?.id)}
                    style={{ ...styles.button, background: '#f5f5f5' }}
                  >
                    {isExpanded ? '🔼 Contraer' : '🔽 Expandir'}
                  </button>
                </div>

                {/* Información Básica del Bulto */}
                <div style={styles.gridSmall}>
                  <div>
                    <div style={styles.label}>Tipo</div>
                    <select 
                      value={bulk?.type}
                      onChange={(e) => updateBulk(bulk?.id, { type: e.target.value as any })}
                      style={styles.input}
                    >
                      <option value="BAG">🎒 Bolsa</option>
                      <option value="BOX">📦 Caja</option>
                      <option value="ENVELOPE">📨 Sobre</option>
                      <option value="PALLET">🏗️ Pallet</option>
                      <option value="CUSTOM">🔧 Personalizado</option>
                    </select>
                  </div>
                  
                  <div>
                    <div style={styles.label}>Peso Máx (lbs)</div>
                    <input
                      type="number"
                      value={bulk?.maxWeight}
                      onInput={(e) => updateBulk(bulk?.id, { maxWeight: parseFloat(e.target.value) || 0 })}
                      style={styles.input}
                    />
                  </div>
                  
                  <div>
                    <div style={styles.label}>Costo Transporte</div>
                    <input
                      type="number"
                      value={bulk?.transportCost}
                      onInput={(e) => updateBulk(bulk?.id, { transportCost: parseFloat(e.target.value) || 0 })}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Resumen del Bulto */}
                <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div><strong>📊 Artículos:</strong> {totals.itemCount}</div>
                    <div><strong>⚖️ Peso:</strong> {totals.totalWeight.toFixed(1)} / {bulk?.maxWeight} lbs</div>
                    <div><strong>💰 Valor:</strong> ${totals.totalValue.toFixed(2)}</div>
                    <div><strong>🚚 Costo Total:</strong> ${totals.totalCost.toFixed(2)}</div>
                  </div>
                </div>

                {/* Sección Expandible */}
                <Show when={isExpanded}>
                  <div>
                    {/* Configuración Detallada del Bulto */}
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>🔧 Configuración Detallada</h4>
                      
                      <div style={styles.gridSmall}>
                        <div>
                          <div style={styles.label}>Material</div>
                          <input
                            type="text"
                            value={bulk?.material}
                            onInput={(e) => updateBulk(bulk?.id, { material: e.target.value })}
                            style={styles.input}
                          />
                        </div>
                        
                        <div>
                          <div style={styles.label}>Color</div>
                          <input
                            type="text"
                            value={bulk?.color || ''}
                            onInput={(e) => updateBulk(bulk?.id, { color: e.target.value })}
                            style={styles.input}
                          />
                        </div>
                        
                        <div>
                          <div style={styles.label}>Prioridad</div>
                          <select
                            value={bulk?.priority}
                            onChange={(e) => updateBulk(bulk?.id, { priority: e.target.value as any })}
                            style={styles.input}
                          >
                            <option value="LOW">🟢 Baja</option>
                            <option value="NORMAL">🔵 Normal</option>
                            <option value="HIGH">🟡 Alta</option>
                            <option value="URGENT">🔴 Urgente</option>
                          </select>
                        </div>
                        
                        <div>
                          <div style={styles.label}>Estado</div>
                          <select
                            value={bulk?.status}
                            onChange={(e) => updateBulk(bulk?.id, { status: e.target.value as any })}
                            style={styles.input}
                          >
                            <option value="DRAFT">📝 Borrador</option>
                            <option value="READY">✅ Listo</option>
                            <option value="SHIPPED">🚚 Enviado</option>
                            <option value="DELIVERED">📬 Entregado</option>
                          </select>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={styles.label}>Instrucciones Especiales</div>
                        <textarea
                          value={bulk?.specialInstructions || ''}
                          onInput={(e) => updateBulk(bulk?.id, { specialInstructions: e.target.value })}
                          style={{ ...styles.input, minHeight: '60px' }}
                          placeholder="Instrucciones especiales para el manejo del bulto..."
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={bulk?.fragileHandling}
                            onChange={(e) => updateBulk(bulk?.id, { fragileHandling: e.target.checked })}
                          />
                          <span>🔍 Manejo Frágil</span>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={bulk?.signatureRequired}
                            onChange={(e) => updateBulk(bulk?.id, { signatureRequired: e.target.checked })}
                          />
                          <span>✍️ Firma Requerida</span>
                        </label>
                      </div>
                    </div>

                    {/* Reservas del Bulto */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4>📋 Reservas en este Bulto</h4>
                        <button
                          onClick={() => addReservaToBulk(bulk?.id)}
                          style={{ ...styles.button, ...styles.successButton }}
                        >
                          + Agregar Reserva
                        </button>
                      </div>

                      <For each={bulk?.reservas}>
                        {(reserva) => (
                          <div style={styles.subItem}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <input
                                type="text"
                                placeholder="Descripción del artículo"
                                value={reserva.description}
                                onInput={(e) => updateReservaInBulk(bulk?.id, reserva.id, { description: e.target.value })}
                                style={{ ...styles.input, flex: 1 }}
                              />
                              
                              <select
                                value={reserva.type}
                                onChange={(e) => updateReservaInBulk(bulk?.id, reserva.id, { type: e.target.value })}
                                style={styles.input}
                              >
                                <option value="GENERAL">General</option>
                                <option value="ELECTRONICS">Electrónicos</option>
                                <option value="CLOTHING">Ropa</option>
                                <option value="DOCUMENTS">Documentos</option>
                                <option value="FOOD">Alimentos</option>
                                <option value="FRAGILE">Frágil</option>
                              </select>
                            </div>
                            
                            <div style={styles.gridSmall}>
                              <div>
                                <div style={styles.label}>Cantidad</div>
                                <input
                                  type="number"
                                  value={reserva.qty}
                                  onInput={(e) => updateReservaInBulk(bulk?.id, reserva.id, { qty: parseInt(e.target.value) || 0 })}
                                  style={styles.input}
                                  min="1"
                                />
                              </div>
                              
                              <div>
                                <div style={styles.label}>Peso (lbs)</div>
                                <input
                                  type="number"
                                  value={reserva.weight}
                                  onInput={(e) => updateReservaInBulk(bulk?.id, reserva.id, { weight: parseFloat(e.target.value) || 0 })}
                                  style={styles.input}
                                  step="0.1"
                                />
                              </div>
                              
                              <div>
                                <div style={styles.label}>Valor ($)</div>
                                <input
                                  type="number"
                                  value={reserva.value}
                                  onInput={(e) => updateReservaInBulk(bulk?.id, reserva.id, { value: parseFloat(e.target.value) || 0 })}
                                  style={styles.input}
                                  step="0.01"
                                />
                              </div>
                              
                              <div>
                                <div style={styles.label}>Largo (cm)</div>
                                <input
                                  type="number"
                                  value={reserva.dimensions.length}
                                  onInput={(e) => updateReservaInBulk(bulk?.id, reserva.id, { 
                                    dimensions: { ...reserva.dimensions, length: parseFloat(e.target.value) || 0 }
                                  })}
                                  style={styles.input}
                                />
                              </div>
                              
                              <div>
                                <div style={styles.label}>Ancho (cm)</div>
                                <input
                                  type="number"
                                  value={reserva.dimensions.width}
                                  onInput={(e) => updateReservaInBulk(bulk?.id, reserva.id, { 
                                    dimensions: { ...reserva.dimensions, width: parseFloat(e.target.value) || 0 }
                                  })}
                                  style={styles.input}
                                />
                              </div>
                              
                              <div>
                                <div style={styles.label}>Alto (cm)</div>
                                <input
                                  type="number"
                                  value={reserva.dimensions.height}
                                  onInput={(e) => updateReservaInBulk(bulk?.id, reserva.id, { 
                                    dimensions: { ...reserva.dimensions, height: parseFloat(e.target.value) || 0 }
                                  })}
                                  style={styles.input}
                                />
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  checked={reserva.fragile}
                                  onChange={(e) => updateReservaInBulk(bulk?.id, reserva.id, { fragile: e.target.checked })}
                                />
                                <span>🔍 Frágil</span>
                              </label>
                              
                              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                                Total: {(reserva.qty * reserva.weight).toFixed(1)} lbs | ${(reserva.qty * reserva.value).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};