import { createSignal, For, Show } from 'solid-js';

// Versión 1: Bultos como Contenedores de Reservas
// Las reservas se crean independientemente y luego se asignan a bultos

interface Reserva {
  id: string;
  description: string;
  type: string;
  qty: number;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  value: number;
  fragile: boolean;
  bulkId?: string;
}

interface Bulk {
  id: string;
  name: string;
  type: 'BAG' | 'BOX' | 'ENVELOPE' | 'CUSTOM';
  maxWeight: number;
  maxDimensions: { length: number; width: number; height: number };
  transportCost: number;
  handlingFee: number;
  insuranceCost: number;
  trackingNumber?: string;
  specialInstructions?: string;
  reservas: string[]; // IDs de reservas
}

const styles = {
  container: { padding: '1rem', background: 'var(--surface-color)' },
  section: { background: 'var(--background-color)', padding: '1rem', marginBottom: '1rem', borderRadius: 'var(--border-radius)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' },
  input: { width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' },
  button: { padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer' },
  primaryButton: { background: 'var(--primary-color)', color: 'white' },
  item: { padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', marginBottom: '0.5rem' }
};

export const BulkManagementV1 = () => {
  const [reservas, setReservas] = createSignal<Reserva[]>([]);
  const [bulks, setBulks] = createSignal<Bulk[]>([]);
  const [selectedReservas, setSelectedReservas] = createSignal<string[]>([]);

  // Crear nueva reserva
  const addReserva = () => {
    const newReserva: Reserva = {
      id: Date.now().toString(),
      description: '',
      type: 'GENERAL',
      qty: 1,
      weight: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      value: 0,
      fragile: false
    };
    setReservas(prev => [...prev, newReserva]);
  };

  // Crear nuevo bulto
  const addBulk = () => {
    const newBulk: Bulk = {
      id: Date.now().toString(),
      name: `Bulto ${bulks().length + 1}`,
      type: 'BAG',
      maxWeight: 50,
      maxDimensions: { length: 60, width: 40, height: 30 },
      transportCost: 15,
      handlingFee: 5,
      insuranceCost: 0,
      reservas: []
    };
    setBulks(prev => [...prev, newBulk]);
  };

  // Asignar reservas seleccionadas a un bulto
  const assignReservasToBulk = (bulkId: string) => {
    const selected = selectedReservas();
    
    // Actualizar reservas
    setReservas(prev => prev.map(reserva => 
      selected.includes(reserva.id) ? { ...reserva, bulkId } : reserva
    ));

    // Actualizar bulto
    setBulks(prev => prev.map(bulk => 
      bulk?.id === bulkId 
        ? { ...bulk, reservas: [...bulk?.reservas.filter(id => !selected.includes(id)), ...selected] }
        : { ...bulk, reservas: bulk?.reservas.filter(id => !selected.includes(id)) }
    ));

    setSelectedReservas([]);
  };

  // Calcular totales del bulto
  const getBulkTotals = (bulk: Bulk) => {
    const bulkReservas = reservas().filter(r => bulk?.reservas.includes(r.id));
    const totalWeight = bulkReservas.reduce((sum, r) => sum + (r.weight * r.qty), 0);
    const totalValue = bulkReservas.reduce((sum, r) => sum + (r.value * r.qty), 0);
    const totalCost = bulk?.transportCost + bulk?.handlingFee + bulk?.insuranceCost;
    
    return { totalWeight, totalValue, totalCost, itemCount: bulkReservas.length };
  };

  return (
    <div style={styles.container}>
      <h2>📦 Gestión de Bultos - Versión 1: Contenedores</h2>
      
      <div style={styles.grid}>
        {/* Panel de Reservas */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📋 Reservas Individuales</h3>
            <button onClick={addReserva} style={{ ...styles.button, ...styles.primaryButton }}>
              + Agregar Reserva
            </button>
          </div>

          <For each={reservas()}>
            {(reserva) => (
              <div style={styles.item}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedReservas().includes(reserva.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedReservas(prev => [...prev, reserva.id]);
                      } else {
                        setSelectedReservas(prev => prev.filter(id => id !== reserva.id));
                      }
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={reserva.description}
                    style={{ ...styles.input, flex: 1 }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <select style={styles.input}>
                    <option value="GENERAL">General</option>
                    <option value="ELECTRONICS">Electrónicos</option>
                    <option value="CLOTHING">Ropa</option>
                    <option value="DOCUMENTS">Documentos</option>
                  </select>
                  
                  <input type="number" placeholder="Peso (lbs)" style={styles.input} />
                  <input type="number" placeholder="Valor ($)" style={styles.input} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="number" placeholder="Largo (cm)" style={styles.input} />
                  <input type="number" placeholder="Ancho (cm)" style={styles.input} />
                  <input type="number" placeholder="Alto (cm)" style={styles.input} />
                </div>
                
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" />
                    <span>🔍 Frágil</span>
                  </label>
                </div>
                
                <Show when={reserva.bulkId}>
                  <div style={{ marginTop: '0.5rem', padding: '0.25rem', background: '#e8f5e9', borderRadius: '4px', fontSize: '0.875rem' }}>
                    📦 Asignado a: {bulks().find(b => b.id === reserva.bulkId)?.name}
                  </div>
                </Show>
              </div>
            )}
          </For>

          <Show when={selectedReservas().length > 0}>
            <div style={{ padding: '0.5rem', background: '#e3f2fd', borderRadius: '4px', marginTop: '1rem' }}>
              <strong>{selectedReservas().length} reserva(s) seleccionada(s)</strong>
            </div>
          </Show>
        </div>

        {/* Panel de Bultos */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📦 Bultos</h3>
            <button onClick={addBulk} style={{ ...styles.button, ...styles.primaryButton }}>
              + Crear Bulto
            </button>
          </div>

          <For each={bulks()}>
            {(bulk) => {
              const totals = getBulkTotals(bulk);
              return (
                <div style={styles.item}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={bulk?.name}
                      style={{ ...styles.input, flex: 1, marginRight: '0.5rem' }}
                    />
                    <select style={styles.input}>
                      <option value="BAG">🎒 Bolsa</option>
                      <option value="BOX">📦 Caja</option>
                      <option value="ENVELOPE">📨 Sobre</option>
                      <option value="CUSTOM">🔧 Personalizado</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="number" placeholder="Peso máx (lbs)" style={styles.input} />
                    <input type="number" placeholder="Costo transporte" style={styles.input} />
                    <input type="number" placeholder="Tarifa manejo" style={styles.input} />
                  </div>

                  <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    <div>📊 {totals.itemCount} artículos | {totals.totalWeight.toFixed(1)} lbs | ${totals.totalValue.toFixed(2)}</div>
                    <div>💰 Costo total: ${totals.totalCost.toFixed(2)}</div>
                  </div>

                  <Show when={selectedReservas().length > 0}>
                    <button
                      onClick={() => assignReservasToBulk(bulk?.id)}
                      style={{ ...styles.button, background: '#4caf50', color: 'white', width: '100%' }}
                    >
                      ➕ Asignar {selectedReservas().length} reserva(s) a este bulto
                    </button>
                  </Show>

                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Artículos en este bulto:</strong>
                    <For each={reservas().filter(r => bulk?.reservas.includes(r.id))}>
                      {(reserva) => (
                        <div style={{ fontSize: '0.875rem', padding: '0.25rem', background: '#f5f5f5', margin: '0.25rem 0', borderRadius: '4px' }}>
                          {reserva.description || 'Sin descripción'} - {reserva.weight} lbs
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
    </div>
  );
};