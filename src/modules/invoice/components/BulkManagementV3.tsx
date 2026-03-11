import { createSignal, For, Show, createMemo } from 'solid-js';

// Versión 3: Sistema Híbrido Inteligente
// Permite crear reservas independientes Y bultos independientes
// Incluye sugerencias automáticas y optimización inteligente

interface SmartReserva {
  id: string;
  description: string;
  type: string;
  category: string;
  qty: number;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  value: number;
  fragile: boolean;
  customsCode?: string;
  notes?: string;
  bulkId?: string;
  
  // Metadatos inteligentes
  suggestedBulkType: string;
  compatibilityTags: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  handlingInstructions: string[];
}

interface SmartBulk {
  id: string;
  name: string;
  type: 'BAG' | 'BOX' | 'ENVELOPE' | 'PALLET' | 'CUSTOM';
  
  // Configuración física
  maxWeight: number;
  maxDimensions: { length: number; width: number; height: number };
  material: string;
  waterproof: boolean;
  
  // Configuración de costos
  baseCost: number;
  weightMultiplier: number;
  volumeMultiplier: number;
  handlingFee: number;
  insuranceRate: number;
  
  // Configuración de envío
  shippingMethod: 'SEA' | 'AIR' | 'LAND';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  trackingEnabled: boolean;
  signatureRequired: boolean;
  
  // Configuración inteligente
  autoOptimize: boolean;
  compatibilityRules: string[];
  restrictions: string[];
  
  // Estado
  status: 'DRAFT' | 'OPTIMIZING' | 'READY' | 'SHIPPED' | 'DELIVERED';
  reservas: string[]; // IDs de reservas
  
  // Metadatos
  createdDate: Date;
  lastOptimized?: Date;
  efficiency: number; // 0-100%
}

interface OptimizationSuggestion {
  id: string;
  type: 'REDISTRIBUTE' | 'CREATE_BULK' | 'MERGE_BULKS' | 'UPGRADE_BULK';
  title: string;
  description: string;
  impact: 'COST_SAVING' | 'SPACE_OPTIMIZATION' | 'RISK_REDUCTION';
  estimatedSaving: number;
  confidence: number;
  action: () => void;
}

const styles = {
  container: { padding: '1rem', background: 'var(--surface-color)' },
  section: { background: 'var(--background-color)', padding: '1rem', marginBottom: '1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' },
  gridSmall: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' },
  input: { width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem' },
  button: { padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontSize: '0.875rem' },
  primaryButton: { background: 'var(--primary-color)', color: 'white' },
  successButton: { background: '#4caf50', color: 'white' },
  warningButton: { background: '#ff9800', color: 'white' },
  item: { padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', marginBottom: '0.5rem', background: 'var(--surface-color)' },
  suggestionCard: { background: '#e8f5e9', border: '1px solid #c8e6c9', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1rem' },
  riskLow: { background: '#e8f5e9', color: '#2e7d32' },
  riskMedium: { background: '#fff3e0', color: '#f57c00' },
  riskHigh: { background: '#ffebee', color: '#d32f2f' },
  efficiencyBar: { height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' },
  tab: { padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  activeTab: { background: 'var(--primary-color)', color: 'white' },
  inactiveTab: { background: '#f5f5f5', color: 'var(--text-secondary)' }
};

export const BulkManagementV3 = () => {
  const [reservas, setReservas] = createSignal<SmartReserva[]>([]);
  const [bulks, setBulks] = createSignal<SmartBulk[]>([]);
  const [activeTab, setActiveTab] = createSignal<'reservas' | 'bulks' | 'optimization'>('reservas');
  const [unassignedReservas, setUnassignedReservas] = createSignal<string[]>([]);

  // Sugerencias de optimización calculadas
  const optimizationSuggestions = createMemo<OptimizationSuggestion[]>(() => {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Sugerir crear bulto para reservas sin asignar
    const unassigned = reservas().filter(r => !r.bulkId);
    if (unassigned.length >= 3) {
      suggestions.push({
        id: 'create-bulk-unassigned',
        type: 'CREATE_BULK',
        title: `Crear bulto para ${unassigned.length} reservas sin asignar`,
        description: 'Agrupar reservas similares puede reducir costos de envío',
        impact: 'COST_SAVING',
        estimatedSaving: unassigned.length * 2.5,
        confidence: 85,
        action: () => autoCreateBulkForUnassigned()
      });
    }
    
    // Sugerir redistribuir por peso
    bulks().forEach(bulk => {
      const bulkReservas = reservas().filter(r => bulk?.reservas.includes(r.id));
      const totalWeight = bulkReservas.reduce((sum, r) => sum + r.weight * r.qty, 0);
      
      if (totalWeight > bulk?.maxWeight * 0.9) {
        suggestions.push({
          id: `redistribute-${bulk?.id}`,
          type: 'REDISTRIBUTE',
          title: `Redistribuir ${bulk?.name} (sobrecargado)`,
          description: `Peso actual: ${totalWeight.toFixed(1)}lbs de ${bulk?.maxWeight}lbs máximo`,
          impact: 'RISK_REDUCTION',
          estimatedSaving: 0,
          confidence: 95,
          action: () => redistributeBulk(bulk?.id)
        });
      }
    });
    
    return suggestions;
  });

  // Agregar reserva inteligente
  const addSmartReserva = () => {
    const newReserva: SmartReserva = {
      id: Date.now().toString(),
      description: '',
      type: 'GENERAL',
      category: 'MISC',
      qty: 1,
      weight: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      value: 0,
      fragile: false,
      suggestedBulkType: 'BAG',
      compatibilityTags: [],
      riskLevel: 'LOW',
      handlingInstructions: []
    };
    setReservas(prev => [...prev, newReserva]);
  };

  // Agregar bulto inteligente
  const addSmartBulk = () => {
    const newBulk: SmartBulk = {
      id: Date.now().toString(),
      name: `Bulto Inteligente ${bulks().length + 1}`,
      type: 'BAG',
      
      maxWeight: 50,
      maxDimensions: { length: 60, width: 40, height: 30 },
      material: 'Plástico reforzado',
      waterproof: false,
      
      baseCost: 15,
      weightMultiplier: 0.5,
      volumeMultiplier: 0.002,
      handlingFee: 5,
      insuranceRate: 0.02,
      
      shippingMethod: 'SEA',
      priority: 'NORMAL',
      trackingEnabled: true,
      signatureRequired: false,
      
      autoOptimize: true,
      compatibilityRules: [],
      restrictions: [],
      
      status: 'DRAFT',
      reservas: [],
      
      createdDate: new Date(),
      efficiency: 0
    };
    setBulks(prev => [...prev, newBulk]);
  };

  // Optimización automática
  const autoCreateBulkForUnassigned = () => {
    const unassigned = reservas().filter(r => !r.bulkId);
    if (unassigned.length === 0) return;

    // Agrupar por tipo y compatibilidad
    const groups = unassigned.reduce((groups, reserva) => {
      const key = `${reserva.type}-${reserva.riskLevel}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(reserva);
      return groups;
    }, {} as Record<string, SmartReserva[]>);

    // Crear bultos optimizados para cada grupo
    Object.entries(groups).forEach(([key, groupReservas]) => {
      const totalWeight = groupReservas.reduce((sum, r) => sum + r.weight * r.qty, 0);
      const suggestedType = totalWeight > 30 ? 'BOX' : 'BAG';
      
      const optimizedBulk: SmartBulk = {
        id: Date.now().toString() + key,
        name: `Auto-Bulto ${key}`,
        type: suggestedType as any,
        
        maxWeight: Math.max(totalWeight * 1.2, 50),
        maxDimensions: { length: 60, width: 40, height: 30 },
        material: groupReservas.some(r => r.fragile) ? 'Plástico acolchado' : 'Plástico reforzado',
        waterproof: groupReservas.some(r => r.type === 'ELECTRONICS'),
        
        baseCost: suggestedType === 'BOX' ? 20 : 15,
        weightMultiplier: 0.5,
        volumeMultiplier: 0.002,
        handlingFee: groupReservas.some(r => r.fragile) ? 10 : 5,
        insuranceRate: 0.02,
        
        shippingMethod: 'SEA',
        priority: groupReservas.some(r => r.riskLevel === 'HIGH') ? 'HIGH' : 'NORMAL',
        trackingEnabled: true,
        signatureRequired: groupReservas.some(r => r.value > 100),
        
        autoOptimize: true,
        compatibilityRules: [],
        restrictions: [],
        
        status: 'OPTIMIZING',
        reservas: groupReservas.map(r => r.id),
        
        createdDate: new Date(),
        lastOptimized: new Date(),
        efficiency: 85
      };

      setBulks(prev => [...prev, optimizedBulk]);
      
      // Asignar reservas al bulto
      setReservas(prev => prev.map(reserva => 
        groupReservas.find(gr => gr.id === reserva.id) 
          ? { ...reserva, bulkId: optimizedbulk?.id }
          : reserva
      ));
    });
  };

  // Redistribuir bulto sobrecargado
  const redistributeBulk = (bulkId: string) => {
    const bulk = bulks().find(b => b.id === bulkId);
    if (!bulk) return;

    const bulkReservas = reservas().filter(r => bulk?.reservas.includes(r.id));
    const totalWeight = bulkReservas.reduce((sum, r) => sum + r.weight * r.qty, 0);
    
    if (totalWeight <= bulk?.maxWeight) return;

    // Crear nuevo bulto para el exceso
    const newBulk: SmartBulk = {
      ...bulk,
      id: Date.now().toString(),
      name: `${bulk?.name} - Redistributed`,
      reservas: [],
      efficiency: 0
    };

    // Redistribuir reservas por peso
    let currentWeight = 0;
    const redistributed: SmartReserva[] = [];
    const remaining: SmartReserva[] = [];

    bulkReservas.forEach(reserva => {
      const reservaWeight = reserva.weight * reserva.qty;
      if (currentWeight + reservaWeight <= bulk?.maxWeight * 0.8) {
        currentWeight += reservaWeight;
        remaining.push(reserva);
      } else {
        redistributed.push(reserva);
      }
    });

    // Actualizar bultos
    setBulks(prev => [
      ...prev.filter(b => b.id !== bulkId),
      { ...bulk, reservas: remaining.map(r => r.id) },
      { ...newBulk, reservas: redistributed.map(r => r.id) }
    ]);

    // Actualizar reservas
    setReservas(prev => prev.map(reserva => {
      if (redistributed.find(r => r.id === reserva.id)) {
        return { ...reserva, bulkId: newbulk?.id };
      }
      return reserva;
    }));
  };

  // Calcular eficiencia del bulto
  const calculateBulkEfficiency = (bulk: SmartBulk) => {
    const bulkReservas = reservas().filter(r => bulk?.reservas.includes(r.id));
    if (bulkReservas.length === 0) return 0;

    const totalWeight = bulkReservas.reduce((sum, r) => sum + r.weight * r.qty, 0);
    const weightEfficiency = (totalWeight / bulk?.maxWeight) * 100;
    
    const totalVolume = bulkReservas.reduce((sum, r) => 
      sum + (r.dimensions.length * r.dimensions.width * r.dimensions.height * r.qty), 0
    );
    const maxVolume = bulk?.maxDimensions.length * bulk?.maxDimensions.width * bulk?.maxDimensions.height;
    const volumeEfficiency = (totalVolume / maxVolume) * 100;
    
    return Math.min((weightEfficiency + volumeEfficiency) / 2, 100);
  };

  // Calcular costo total del bulto
  const calculateBulkCost = (bulk: SmartBulk) => {
    const bulkReservas = reservas().filter(r => bulk?.reservas.includes(r.id));
    const totalWeight = bulkReservas.reduce((sum, r) => sum + r.weight * r.qty, 0);
    const totalValue = bulkReservas.reduce((sum, r) => sum + r.value * r.qty, 0);
    
    const weightCost = totalWeight * bulk?.weightMultiplier;
    const insuranceCost = totalValue * bulk?.insuranceRate;
    
    return bulk?.baseCost + weightCost + bulk?.handlingFee + insuranceCost;
  };

  return (
    <div style={styles.container}>
      <h2>🤖 Sistema Inteligente de Gestión de Bultos - Versión 3</h2>
      
      {/* Navegación por pestañas */}
      <div style={{ display: 'flex', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('reservas')}
          style={{
            ...styles.tab,
            ...(activeTab() === 'reservas' ? styles.activeTab : styles.inactiveTab)
          }}
        >
          📋 Reservas ({reservas().length})
        </button>
        <button
          onClick={() => setActiveTab('bulks')}
          style={{
            ...styles.tab,
            ...(activeTab() === 'bulks' ? styles.activeTab : styles.inactiveTab)
          }}
        >
          📦 Bultos ({bulks().length})
        </button>
        <button
          onClick={() => setActiveTab('optimization')}
          style={{
            ...styles.tab,
            ...(activeTab() === 'optimization' ? styles.activeTab : styles.inactiveTab)
          }}
        >
          🎯 Optimización ({optimizationSuggestions().length})
        </button>
      </div>

      {/* Panel de Reservas */}
      <Show when={activeTab() === 'reservas'}>
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📋 Gestión Inteligente de Reservas</h3>
            <button onClick={addSmartReserva} style={{ ...styles.button, ...styles.primaryButton }}>
              + Agregar Reserva Inteligente
            </button>
          </div>

          <div style={styles.grid}>
            <For each={reservas()}>
              {(reserva) => (
                <div style={styles.item}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Descripción detallada del artículo"
                      value={reserva.description}
                      style={{ ...styles.input, flex: 1, marginRight: '0.5rem' }}
                    />
                    <span style={{
                      ...styles.button,
                      ...(reserva.riskLevel === 'LOW' ? styles.riskLow : 
                         reserva.riskLevel === 'MEDIUM' ? styles.riskMedium : styles.riskHigh),
                      fontSize: '0.75rem'
                    }}>
                      {reserva.riskLevel}
                    </span>
                  </div>

                  <div style={styles.gridSmall}>
                    <div>
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tipo</div>
                      <select style={styles.input}>
                        <option value="GENERAL">General</option>
                        <option value="ELECTRONICS">Electrónicos</option>
                        <option value="CLOTHING">Ropa</option>
                        <option value="DOCUMENTS">Documentos</option>
                        <option value="FRAGILE">Frágil</option>
                        <option value="LIQUID">Líquido</option>
                        <option value="PERISHABLE">Perecedero</option>
                      </select>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Categoría</div>
                      <select style={styles.input}>
                        <option value="PERSONAL">Personal</option>
                        <option value="COMMERCIAL">Comercial</option>
                        <option value="GIFT">Regalo</option>
                        <option value="SAMPLE">Muestra</option>
                      </select>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Cantidad</div>
                      <input type="number" style={styles.input} min="1" />
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Peso (lbs)</div>
                      <input type="number" style={styles.input} step="0.1" />
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Valor ($)</div>
                      <input type="number" style={styles.input} step="0.01" />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      <strong>Bulto sugerido:</strong> {reserva.suggestedBulkType}
                    </div>
                    
                    <Show when={reserva.bulkId}>
                      <div style={{ fontSize: '0.875rem', color: '#2e7d32' }}>
                        📦 Asignado: {bulks().find(b => b.id === reserva.bulkId)?.name}
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Panel de Bultos */}
      <Show when={activeTab() === 'bulks'}>
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📦 Gestión Inteligente de Bultos</h3>
            <button onClick={addSmartBulk} style={{ ...styles.button, ...styles.primaryButton }}>
              + Crear Bulto Inteligente
            </button>
          </div>

          <div style={styles.grid}>
            <For each={bulks()}>
              {(bulk) => {
                const efficiency = calculateBulkEfficiency(bulk);
                const cost = calculateBulkCost(bulk);
                const bulkReservas = reservas().filter(r => bulk?.reservas.includes(r.id));
                
                return (
                  <div style={styles.item}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        value={bulk?.name}
                        style={{ ...styles.input, flex: 1, marginRight: '0.5rem', fontWeight: '600' }}
                      />
                      <div style={{ fontSize: '0.75rem', textAlign: 'right' }}>
                        <div>Eficiencia: {efficiency.toFixed(0)}%</div>
                        <div style={styles.efficiencyBar}>
                          <div style={{
                            width: `${efficiency}%`,
                            height: '100%',
                            background: efficiency > 70 ? '#4caf50' : efficiency > 40 ? '#ff9800' : '#f44336',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    </div>

                    <div style={styles.gridSmall}>
                      <div>
                        <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tipo</div>
                        <select style={styles.input}>
                          <option value="BAG">🎒 Bolsa</option>
                          <option value="BOX">📦 Caja</option>
                          <option value="ENVELOPE">📨 Sobre</option>
                          <option value="PALLET">🏗️ Pallet</option>
                          <option value="CUSTOM">🔧 Personalizado</option>
                        </select>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Prioridad</div>
                        <select style={styles.input}>
                          <option value="LOW">🟢 Baja</option>
                          <option value="NORMAL">🔵 Normal</option>
                          <option value="HIGH">🟡 Alta</option>
                          <option value="URGENT">🔴 Urgente</option>
                        </select>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Método</div>
                        <select style={styles.input}>
                          <option value="SEA">🚢 Marítimo</option>
                          <option value="AIR">✈️ Aéreo</option>
                          <option value="LAND">🚛 Terrestre</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '4px', margin: '0.5rem 0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <div><strong>📊 Artículos:</strong> {bulkReservas.length}</div>
                        <div><strong>💰 Costo:</strong> ${cost.toFixed(2)}</div>
                        <div><strong>⚖️ Peso:</strong> {bulkReservas.reduce((sum, r) => sum + r.weight * r.qty, 0).toFixed(1)} lbs</div>
                        <div><strong>📏 Eficiencia:</strong> {efficiency.toFixed(0)}%</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <input type="checkbox" checked={bulk?.autoOptimize} />
                        <span>🤖 Auto-optimizar</span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <input type="checkbox" checked={bulk?.trackingEnabled} />
                        <span>📍 Seguimiento</span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <input type="checkbox" checked={bulk?.waterproof} />
                        <span>💧 Impermeable</span>
                      </label>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Panel de Optimización */}
      <Show when={activeTab() === 'optimization'}>
        <div style={styles.section}>
          <h3>🎯 Optimización Inteligente</h3>
          
          <Show when={optimizationSuggestions().length > 0}>
            <For each={optimizationSuggestions()}>
              {(suggestion) => (
                <div style={styles.suggestionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>{suggestion.title}</h4>
                      <p style={{ margin: '0', fontSize: '0.875rem', color: '#666' }}>{suggestion.description}</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                      <div><strong>Confianza:</strong> {suggestion.confidence}%</div>
                      <Show when={suggestion.estimatedSaving > 0}>
                        <div style={{ color: '#2e7d32' }}><strong>Ahorro:</strong> ${suggestion.estimatedSaving.toFixed(2)}</div>
                      </Show>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: suggestion.impact === 'COST_SAVING' ? '#e8f5e9' : 
                                        suggestion.impact === 'SPACE_OPTIMIZATION' ? '#e3f2fd' : '#fff3e0',
                        color: suggestion.impact === 'COST_SAVING' ? '#2e7d32' : 
                               suggestion.impact === 'SPACE_OPTIMIZATION' ? '#1976d2' : '#f57c00'
                      }}>
                        {suggestion.impact === 'COST_SAVING' ? '💰 Ahorro de costos' :
                         suggestion.impact === 'SPACE_OPTIMIZATION' ? '📏 Optimización de espacio' : '🛡️ Reducción de riesgo'}
                      </span>
                    </div>
                    
                    <button
                      onClick={suggestion.action}
                      style={{ ...styles.button, ...styles.successButton }}
                    >
                      ✨ Aplicar Sugerencia
                    </button>
                  </div>
                </div>
              )}
            </For>
          </Show>
          
          <Show when={optimizationSuggestions().length === 0}>
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h3>¡Excelente optimización!</h3>
              <p>No hay sugerencias de mejora en este momento. Tu configuración actual es eficiente.</p>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};