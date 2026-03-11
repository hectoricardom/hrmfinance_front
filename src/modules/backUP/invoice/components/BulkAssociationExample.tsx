import { createSignal, For, Show, createMemo } from 'solid-js';

// EJEMPLO CLARO: Cómo se asocian las Reservas con los Bultos

interface Reserva {
  id: string;
  description: string;
  weight: number; // peso individual
  qty: number;
  bulkId?: string; // 🔗 AQUÍ ES LA ASOCIACIÓN - ID del bulto al que pertenece
  pricePerPound: number;
  totalPrice: number;
}

interface Bulto {
  id: string;
  name: string;
  type: 'SMALL' | 'MEDIUM' | 'LARGE';
  maxWeightLimit: number; // límite máximo de peso
  currentWeight: number; // peso actual calculado
  transportCost: number; // costo base del bulto
  
  // 💰 RESTRICCIONES DE PRECIO POR PESO
  pricingRules: {
    basePrice: number; // precio base
    ranges: Array<{
      minWeight: number;
      maxWeight: number;
      pricePerPound: number;
      description: string;
    }>;
  };
}

// 📊 CONFIGURACIÓN DE PRECIOS POR PESO
const BULK_PRICING_CONFIG = {
  SMALL: {
    basePrice: 10,
    ranges: [
      { minWeight: 0, maxWeight: 10, pricePerPound: 3.50, description: "0-10 lbs: Tarifa premium para bultos pequeños" },
      { minWeight: 10.1, maxWeight: 20, pricePerPound: 3.00, description: "10-20 lbs: Descuento por volumen" },
      { minWeight: 20.1, maxWeight: 30, pricePerPound: 2.50, description: "20-30 lbs: Máximo para bulto pequeño" }
    ]
  },
  MEDIUM: {
    basePrice: 15,
    ranges: [
      { minWeight: 0, maxWeight: 25, pricePerPound: 2.75, description: "0-25 lbs: Tarifa estándar" },
      { minWeight: 25.1, maxWeight: 50, pricePerPound: 2.25, description: "25-50 lbs: Descuento por volumen" },
      { minWeight: 50.1, maxWeight: 75, pricePerPound: 1.75, description: "50-75 lbs: Máximo descuento" }
    ]
  },
  LARGE: {
    basePrice: 25,
    ranges: [
      { minWeight: 0, maxWeight: 50, pricePerPound: 2.00, description: "0-50 lbs: Tarifa económica" },
      { minWeight: 50.1, maxWeight: 100, pricePerPound: 1.50, description: "50-100 lbs: Mejor valor" },
      { minWeight: 100.1, maxWeight: 150, pricePerPound: 1.25, description: "100-150 lbs: Máximo aprovechamiento" }
    ]
  }
};

const styles = {
  container: { padding: '1rem', fontFamily: 'Arial, sans-serif' },
  section: { background: '#f8f9fa', padding: '1rem', margin: '1rem 0', borderRadius: '8px', border: '1px solid #dee2e6' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' },
  item: { background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #dee2e6' },
  button: { padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', margin: '0.25rem' },
  primary: { backgroundColor: '#007bff', color: 'white' },
  success: { backgroundColor: '#28a745', color: 'white' },
  warning: { backgroundColor: '#ffc107', color: 'black' },
  danger: { backgroundColor: '#dc3545', color: 'white' },
  input: { width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', marginBottom: '0.5rem' },
  associationLine: { background: '#e3f2fd', border: '2px dashed #2196f3', borderRadius: '4px', padding: '0.5rem', margin: '0.5rem 0' }
};

export const BulkAssociationExample = () => {
  const [reservas, setReservas] = createSignal<Reserva[]>([
    {
      id: 'r1',
      description: 'Laptop Dell',
      weight: 5.5,
      qty: 1,
      bulkId: 'b1', // 🔗 Asociada al bulto b1
      pricePerPound: 3.50,
      totalPrice: 19.25
    },
    {
      id: 'r2', 
      description: 'Ropa (3 camisas)',
      weight: 2.0,
      qty: 1,
      bulkId: 'b1', // 🔗 También asociada al bulto b1
      pricePerPound: 3.50,
      totalPrice: 7.00
    },
    {
      id: 'r3',
      description: 'Libros universitarios',
      weight: 8.0,
      qty: 1,
      bulkId: undefined, // 🔗 SIN ASIGNAR a ningún bulto
      pricePerPound: 0,
      totalPrice: 0
    }
  ]);

  const [bultos, setBultos] = createSignal<Bulto[]>([
    {
      id: 'b1',
      name: 'Bulto Personal #1',
      type: 'SMALL',
      maxWeightLimit: 30,
      currentWeight: 0, // Se calcula automáticamente
      transportCost: 10,
      pricingRules: BULK_PRICING_CONFIG.SMALL
    },
    {
      id: 'b2',
      name: 'Bulto Comercial #1', 
      type: 'MEDIUM',
      maxWeightLimit: 75,
      currentWeight: 0,
      transportCost: 15,
      pricingRules: BULK_PRICING_CONFIG.MEDIUM
    }
  ]);

  // 🧮 CALCULAR PESO ACTUAL DE CADA BULTO
  const calculateBulkWeight = (bulkId: string) => {
    return reservas()
      .filter(reserva => reserva.bulkId === bulkId) // Filtrar reservas de este bulto
      .reduce((total, reserva) => total + (reserva.weight * reserva.qty), 0);
  };

  // 🧮 OBTENER PRECIO POR LIBRA SEGÚN EL PESO TOTAL DEL BULTO
  const getPricePerPound = (bulkType: 'SMALL' | 'MEDIUM' | 'LARGE', totalWeight: number) => {
    const config = BULK_PRICING_CONFIG[bulkType];
    
    // Buscar el rango de precio que corresponde al peso
    const range = config.ranges.find(r => totalWeight >= r.minWeight && totalWeight <= r.maxWeight);
    
    return range || config.ranges[config.ranges.length - 1]; // Si no encuentra, usa el último rango
  };

  // 🔗 ASIGNAR RESERVA A UN BULTO
  const assignReservaToBulk = (reservaId: string, bulkId: string) => {
    setReservas(prev => prev.map(reserva => {
      if (reserva.id === reservaId) {
        // 1. Asociar la reserva al bulto
        const updatedReserva = { ...reserva, bulkId };
        
        // 2. Calcular nuevo peso total del bulto
        const bulto = bultos().find(b => b.id === bulkId);
        if (bulto) {
          const newTotalWeight = calculateBulkWeight(bulkId) + (reserva.weight * reserva.qty);
          
          // 3. Obtener nuevo precio por libra basado en el peso total
          const priceRange = getPricePerPound(bulto.type, newTotalWeight);
          
          // 4. Actualizar precio de la reserva
          updatedReserva.pricePerPound = priceRange.pricePerPound;
          updatedReserva.totalPrice = (reserva.weight * reserva.qty) * priceRange.pricePerPound;
        }
        
        return updatedReserva;
      }
      return reserva;
    }));

    // Recalcular precios de todas las reservas del bulto (porque cambió el peso total)
    recalculateBulkPrices(bulkId);
  };

  // 🔄 RECALCULAR PRECIOS DE TODAS LAS RESERVAS EN UN BULTO
  const recalculateBulkPrices = (bulkId: string) => {
    const bulto = bultos().find(b => b.id === bulkId);
    if (!bulto) return;

    const totalWeight = calculateBulkWeight(bulkId);
    const priceRange = getPricePerPound(bulto.type, totalWeight);

    setReservas(prev => prev.map(reserva => {
      if (reserva.bulkId === bulkId) {
        return {
          ...reserva,
          pricePerPound: priceRange.pricePerPound,
          totalPrice: (reserva.weight * reserva.qty) * priceRange.pricePerPound
        };
      }
      return reserva;
    }));
  };

  // ❌ DESASIGNAR RESERVA DE UN BULTO
  const unassignReserva = (reservaId: string) => {
    const reserva = reservas().find(r => r.id === reservaId);
    if (!reserva || !reserva.bulkId) return;

    const oldBulkId = reserva.bulkId;

    // Quitar asociación
    setReservas(prev => prev.map(r => 
      r.id === reservaId 
        ? { ...r, bulkId: undefined, pricePerPound: 0, totalPrice: 0 }
        : r
    ));

    // Recalcular precios del bulto anterior
    recalculateBulkPrices(oldBulkId);
  };

  // 📊 OBTENER ESTADÍSTICAS DEL BULTO
  const getBulkStats = (bulto: Bulto) => {
    const bulkReservas = reservas().filter(r => r.bulkId === bulto.id);
    const currentWeight = calculateBulkWeight(bulto.id);
    const totalValue = bulkReservas.reduce((sum, r) => sum + r.totalPrice, 0);
    const priceRange = getPricePerPound(bulto.type, currentWeight);
    const weightUtilization = (currentWeight / bulto.maxWeightLimit) * 100;
    
    return {
      reservasCount: bulkReservas.length,
      currentWeight,
      totalValue,
      priceRange,
      weightUtilization,
      canAddMore: currentWeight < bulto.maxWeightLimit,
      totalCost: totalValue + bulto.transportCost
    };
  };

  // Crear nueva reserva
  const addReserva = () => {
    const newReserva: Reserva = {
      id: `r${Date.now()}`,
      description: '',
      weight: 0,
      qty: 1,
      bulkId: undefined,
      pricePerPound: 0,
      totalPrice: 0
    };
    setReservas(prev => [...prev, newReserva]);
  };

  // Crear nuevo bulto
  const addBulto = () => {
    const newBulto: Bulto = {
      id: `b${Date.now()}`,
      name: `Nuevo Bulto ${bultos().length + 1}`,
      type: 'MEDIUM',
      maxWeightLimit: 75,
      currentWeight: 0,
      transportCost: 15,
      pricingRules: BULK_PRICING_CONFIG.MEDIUM
    };
    setBultos(prev => [...prev, newBulto]);
  };

  return (
    <div style={styles.container}>
      <h1>🔗 Ejemplo: Asociación Reservas ↔ Bultos</h1>
      
      <div style={styles.section}>
        <h2>📋 Cómo Funciona la Asociación</h2>
        <div style={styles.associationLine}>
          <strong>🔗 ASOCIACIÓN:</strong> Cada reserva tiene un campo <code>bulkId</code> que la conecta con un bulto específico.
          <br/>
          <strong>💰 PRECIO DINÁMICO:</strong> El precio por libra cambia según el peso total del bulto.
          <br/>
          <strong>🔄 RECÁLCULO AUTOMÁTICO:</strong> Al agregar/quitar reservas, se recalculan todos los precios del bulto.
        </div>
      </div>

      <div style={styles.grid}>
        
        {/* PANEL DE RESERVAS */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📦 Reservas ({reservas().length})</h3>
            <button onClick={addReserva} style={{ ...styles.button, ...styles.primary }}>
              + Agregar Reserva
            </button>
          </div>

          <For each={reservas()}>
            {(reserva) => (
              <div style={styles.item}>
                <input
                  type="text"
                  placeholder="Descripción"
                  value={reserva.description}
                  onInput={(e) => setReservas(prev => prev.map(r => 
                    r.id === reserva.id ? { ...r, description: e.target.value } : r
                  ))}
                  style={styles.input}
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label>Peso (lbs):</label>
                    <input
                      type="number"
                      value={reserva.weight}
                      onInput={(e) => {
                        const newWeight = parseFloat(e.target.value) || 0;
                        setReservas(prev => prev.map(r => 
                          r.id === reserva.id ? { ...r, weight: newWeight } : r
                        ));
                        // Recalcular precios si está asignada a un bulto
                        if (reserva.bulkId) {
                          recalculateBulkPrices(reserva.bulkId);
                        }
                      }}
                      style={styles.input}
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <label>Cantidad:</label>
                    <input
                      type="number"
                      value={reserva.qty}
                      onInput={(e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        setReservas(prev => prev.map(r => 
                          r.id === reserva.id ? { ...r, qty: newQty } : r
                        ));
                        if (reserva.bulkId) {
                          recalculateBulkPrices(reserva.bulkId);
                        }
                      }}
                      style={styles.input}
                      min="1"
                    />
                  </div>
                </div>

                {/* MOSTRAR ASOCIACIÓN ACTUAL */}
                <div style={{ padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.875rem' }}>
                  <Show when={reserva.bulkId}>
                    <div style={{ color: '#28a745' }}>
                      🔗 <strong>Asignada a:</strong> {bultos().find(b => b.id === reserva.bulkId)?.name}
                      <br/>
                      💰 <strong>Precio:</strong> ${reserva.pricePerPound.toFixed(2)}/lb = ${reserva.totalPrice.toFixed(2)} total
                      <br/>
                      <button 
                        onClick={() => unassignReserva(reserva.id)}
                        style={{ ...styles.button, ...styles.danger, fontSize: '0.75rem' }}
                      >
                        ❌ Desasignar
                      </button>
                    </div>
                  </Show>
                  
                  <Show when={!reserva.bulkId}>
                    <div style={{ color: '#dc3545' }}>
                      ⚠️ <strong>SIN ASIGNAR</strong> - No tiene bulto asociado
                    </div>
                  </Show>
                </div>

                {/* BOTONES PARA ASIGNAR A BULTOS */}
                <Show when={!reserva.bulkId}>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Asignar a bulto:</div>
                    <For each={bultos()}>
                      {(bulto) => {
                        const stats = getBulkStats(bulto);
                        const wouldExceedLimit = (stats.currentWeight + (reserva.weight * reserva.qty)) > bulto.maxWeightLimit;
                        
                        return (
                          <button
                            onClick={() => assignReservaToBulk(reserva.id, bulto.id)}
                            disabled={wouldExceedLimit}
                            style={{
                              ...styles.button,
                              ...(wouldExceedLimit ? { backgroundColor: '#6c757d', cursor: 'not-allowed' } : styles.success),
                              fontSize: '0.75rem',
                              margin: '0.125rem'
                            }}
                          >
                            {bulto.name} 
                            {wouldExceedLimit ? ' (Excede límite)' : ` (${stats.currentWeight.toFixed(1)}/${bulto.maxWeightLimit}lbs)`}
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        {/* PANEL DE BULTOS */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📦 Bultos ({bultos().length})</h3>
            <button onClick={addBulto} style={{ ...styles.button, ...styles.primary }}>
              + Agregar Bulto
            </button>
          </div>

          <For each={bultos()}>
            {(bulto) => {
              const stats = getBulkStats(bulto);
              
              return (
                <div style={styles.item}>
                  <h4>{bulto.name}</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div><strong>Tipo:</strong> {bulto.type}</div>
                    <div><strong>Límite:</strong> {bulto.maxWeightLimit} lbs</div>
                    <div><strong>Peso actual:</strong> {stats.currentWeight.toFixed(1)} lbs</div>
                    <div><strong>Utilización:</strong> {stats.weightUtilization.toFixed(0)}%</div>
                    <div><strong>Reservas:</strong> {stats.reservasCount}</div>
                    <div><strong>Costo total:</strong> ${stats.totalCost.toFixed(2)}</div>
                  </div>

                  {/* BARRA DE PROGRESO DE PESO */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ 
                      width: '100%', 
                      height: '10px', 
                      backgroundColor: '#e9ecef', 
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(stats.weightUtilization, 100)}%`,
                        height: '100%',
                        backgroundColor: stats.weightUtilization > 90 ? '#dc3545' : 
                                        stats.weightUtilization > 70 ? '#ffc107' : '#28a745',
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* PRECIO ACTUAL POR LIBRA */}
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '4px' 
                  }}>
                    <strong>💰 Precio actual: ${stats.priceRange.pricePerPound}/lb</strong>
                    <br/>
                    <small>{stats.priceRange.description}</small>
                  </div>

                  {/* RESERVAS EN ESTE BULTO */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>📋 Reservas en este bulto:</strong>
                    <Show when={stats.reservasCount === 0}>
                      <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Sin reservas asignadas</div>
                    </Show>
                    
                    <For each={reservas().filter(r => r.bulkId === bulto.id)}>
                      {(reserva) => (
                        <div style={{ 
                          padding: '0.25rem', 
                          margin: '0.25rem 0', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}>
                          {reserva.description} - {(reserva.weight * reserva.qty).toFixed(1)}lbs - ${reserva.totalPrice.toFixed(2)}
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* PANEL DE CONFIGURACIÓN DE PRECIOS */}
      <div style={styles.section}>
        <h3>💰 Configuración de Precios por Peso</h3>
        <div style={styles.grid}>
          <For each={Object.entries(BULK_PRICING_CONFIG)}>
            {([type, config]) => (
              <div style={styles.item}>
                <h4>Bulto {type}</h4>
                <div><strong>Precio base:</strong> ${config.basePrice}</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Rangos de precio:</strong>
                  <For each={config.ranges}>
                    {(range) => (
                      <div style={{ 
                        padding: '0.25rem', 
                        margin: '0.25rem 0', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        <strong>{range.minWeight}-{range.maxWeight === Infinity ? '∞' : range.maxWeight} lbs:</strong> ${range.pricePerPound}/lb
                        <br/>
                        <small style={{ color: '#6c757d' }}>{range.description}</small>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};