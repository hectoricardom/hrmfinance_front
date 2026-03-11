import { createSignal, For, Show, createMemo } from 'solid-js';

// 📦 SISTEMA INTELIGENTE DE BULTOS
// Crear bulto → Agregar todo tipo de contenido → Precios automáticos

interface BulkItem {
  id: string;
  type: 'PRODUCT' | 'RESERVA' | 'EXTRA_SERVICE';
  description: string;
  category: string; // Para recomendaciones de precio
  qty: number;
  weight: number; // peso individual
  dimensions?: { length: number; width: number; height: number };
  value: number; // valor declarado
  fragile: boolean;
  
  // Precios calculados automáticamente
  recommendedPricePerPound: number;
  totalPrice: number;
  
  // Metadatos
  notes?: string;
  customsCode?: string;
}

interface Bulto {
  id: string;
  name: string;
  type: 'PERSONAL' | 'COMMERCIAL' | 'DOCUMENTS' | 'MIXED';
  
  // Contenido del bulto
  items: BulkItem[];
  
  // Información física
  maxWeight: number;
  currentWeight: number; // calculado automáticamente
  estimatedVolume: number; // calculado automáticamente
  
  // Costos automáticos
  baseTransportCost: number; // mínimo $20
  itemsCost: number; // suma de todos los items
  totalCost: number; // transporte + items
  
  // Configuración de envío
  shippingMethod: 'SEA' | 'AIR';
  priority: 'NORMAL' | 'EXPRESS';
  destination: string;
  
  // Estados
  status: 'DRAFT' | 'READY' | 'SHIPPED';
  createdDate: Date;
  
  // Recomendaciones automáticas
  suggestedOptimizations: string[];
  priceAlerts: string[];
}

// 💰 CONFIGURACIÓN DE PRECIOS AUTOMÁTICOS POR CATEGORÍA Y PESO
const PRICING_MATRIX = {
  // Precios por categoría de mercancía
  CATEGORIES: {
    'ELECTRONICS': {
      basePrice: 4.50,
      weightMultiplier: 0.1,
      description: 'Electrónicos - Manejo especial'
    },
    'CLOTHING': {
      basePrice: 2.50,
      weightMultiplier: 0.05,
      description: 'Ropa - Peso ligero'
    },
    'BOOKS_DOCUMENTS': {
      basePrice: 2.00,
      weightMultiplier: 0.15,
      description: 'Libros/Documentos - Peso alto'
    },
    'FOOD_CONSUMABLES': {
      basePrice: 3.00,
      weightMultiplier: 0.08,
      description: 'Alimentos - Manejo cuidadoso'
    },
    'PERSONAL_ITEMS': {
      basePrice: 3.50,
      weightMultiplier: 0.07,
      description: 'Artículos personales'
    },
    'FRAGILE': {
      basePrice: 5.00,
      weightMultiplier: 0.12,
      description: 'Frágil - Embalaje especial'
    },
    'GENERAL': {
      basePrice: 3.00,
      weightMultiplier: 0.06,
      description: 'Mercancía general'
    }
  },
  
  // Descuentos por peso total del bulto
  WEIGHT_DISCOUNTS: [
    { minWeight: 0, maxWeight: 10, discount: 0, description: 'Sin descuento' },
    { minWeight: 10, maxWeight: 25, discount: 0.05, description: '5% descuento' },
    { minWeight: 25, maxWeight: 50, discount: 0.10, description: '10% descuento' },
    { minWeight: 50, maxWeight: 100, discount: 0.15, description: '15% descuento' },
    { minWeight: 100, maxWeight: Infinity, discount: 0.20, description: '20% descuento máximo' }
  ],
  
  // Multiplicadores por método de envío
  SHIPPING_MULTIPLIERS: {
    'SEA': 1.0,
    'AIR': 1.8
  }
};

// Configuración de transporte base
const BASE_TRANSPORT_COST = 20; // Mínimo $20 por bulto

const styles = {
  container: { padding: '1.5rem', background: 'var(--surface-color)', fontFamily: 'system-ui' },
  section: { background: 'var(--background-color)', padding: '1.25rem', margin: '1rem 0', borderRadius: '8px', border: '1px solid var(--border-color)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' },
  item: { background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' },
  input: { width: '100%', padding: '0.625rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' },
  select: { width: '100%', padding: '0.625rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' },
  button: { padding: '0.625rem 1.25rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
  primaryButton: { background: 'var(--primary-color)', color: 'white' },
  successButton: { background: '#10b981', color: 'white' },
  warningButton: { background: '#f59e0b', color: 'white' },
  label: { fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' },
  priceBox: { background: '#f0f9ff', border: '1px solid #0ea5e9', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' },
  alertBox: { background: '#fef3c7', border: '1px solid #f59e0b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' },
  statsBox: { background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }
};

export const SmartBulkSystem = () => {
  const [bultos, setBultos] = createSignal<Bulto[]>([]);
  const [selectedBulto, setSelectedBulto] = createSignal<string>('');

  // 🧮 CALCULAR PRECIO RECOMENDADO AUTOMÁTICAMENTE
  const calculateRecommendedPrice = (item: BulkItem, totalBulkWeight: number, shippingMethod: 'SEA' | 'AIR') => {
    // 1. Obtener precio base por categoría
    const category = PRICING_MATRIX.CATEGORIES[item.category] || PRICING_MATRIX.CATEGORIES.GENERAL;
    let pricePerPound = category.basePrice + (item.weight * category.weightMultiplier);
    
    // 2. Ajustar por si es frágil
    if (item.fragile) {
      pricePerPound *= 1.3; // 30% extra por frágil
    }
    
    // 3. Aplicar multiplicador por método de envío
    pricePerPound *= PRICING_MATRIX.SHIPPING_MULTIPLIERS[shippingMethod];
    
    // 4. Aplicar descuento por peso total del bulto
    const weightDiscount = PRICING_MATRIX.WEIGHT_DISCOUNTS.find(d => 
      totalBulkWeight >= d.minWeight && totalBulkWeight < d.maxWeight
    );
    if (weightDiscount) {
      pricePerPound *= (1 - weightDiscount.discount);
    }
    
    return pricePerPound;
  };

  // 📦 CREAR NUEVO BULTO
  const createBulto = () => {
    const newBulto: Bulto = {
      id: `bulk_${Date.now()}`,
      name: `Bulto #${bultos().length + 1}`,
      type: 'MIXED',
      items: [],
      maxWeight: 100,
      currentWeight: 0,
      estimatedVolume: 0,
      baseTransportCost: BASE_TRANSPORT_COST,
      itemsCost: 0,
      totalCost: BASE_TRANSPORT_COST, // Mínimo $20
      shippingMethod: 'SEA',
      priority: 'NORMAL',
      destination: '',
      status: 'DRAFT',
      createdDate: new Date(),
      suggestedOptimizations: [],
      priceAlerts: []
    };
    
    setBultos(prev => [...prev, newBulto]);
    setSelectedBulto(newBulto.id);
  };

  // ➕ AGREGAR ITEM AL BULTO
  const addItemToBulto = (bulkId: string, type: 'PRODUCT' | 'RESERVA' | 'EXTRA_SERVICE') => {
    const newItem: BulkItem = {
      id: `item_${Date.now()}`,
      type,
      description: '',
      category: 'GENERAL',
      qty: 1,
      weight: 0,
      value: 0,
      fragile: false,
      recommendedPricePerPound: 0,
      totalPrice: 0
    };
    
    setBultos(prev => prev.map(bulto => {
      if (bulto.id === bulkId) {
        const updatedBulto = {
          ...bulto,
          items: [...bulto.items, newItem]
        };
        return recalculateBulkPrices(updatedBulto);
      }
      return bulto;
    }));
  };

  // 🔄 RECALCULAR PRECIOS DEL BULTO AUTOMÁTICAMENTE
  const recalculateBulkPrices = (bulto: Bulto): Bulto => {
    // Calcular peso total
    const totalWeight = bulto.items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
    
    // Calcular volumen estimado
    const totalVolume = bulto.items.reduce((sum, item) => {
      if (item.dimensions) {
        return sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height * item.qty);
      }
      return sum + (item.weight * 1000); // Estimación: 1 lb = 1000 cm³
    }, 0);
    
    // Recalcular precios de todos los items
    const updatedItems = bulto.items.map(item => {
      const recommendedPrice = calculateRecommendedPrice(item, totalWeight, bulto.shippingMethod);
      return {
        ...item,
        recommendedPricePerPound: recommendedPrice,
        totalPrice: (item.weight * item.qty) * recommendedPrice
      };
    });
    
    // Calcular costos totales
    const itemsCost = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalCost = Math.max(BASE_TRANSPORT_COST, bulto.baseTransportCost) + itemsCost;
    
    // Generar recomendaciones y alertas
    const suggestedOptimizations = [];
    const priceAlerts = [];
    
    if (totalWeight > bulto.maxWeight * 0.9) {
      priceAlerts.push('⚠️ Bulto cerca del límite de peso');
    }
    
    if (totalWeight < 10) {
      suggestedOptimizations.push('💡 Agregar más peso para obtener descuentos');
    }
    
    if (bulto.items.some(item => item.fragile) && bulto.shippingMethod === 'SEA') {
      priceAlerts.push('🔍 Items frágiles - considerar envío aéreo');
    }
    
    return {
      ...bulto,
      items: updatedItems,
      currentWeight: totalWeight,
      estimatedVolume: totalVolume,
      itemsCost,
      totalCost,
      suggestedOptimizations,
      priceAlerts
    };
  };

  // 🔄 ACTUALIZAR ITEM Y RECALCULAR
  const updateItem = (bulkId: string, itemId: string, updates: Partial<BulkItem>) => {
    setBultos(prev => prev.map(bulto => {
      if (bulto.id === bulkId) {
        const updatedBulto = {
          ...bulto,
          items: bulto.items.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        };
        return recalculateBulkPrices(updatedBulto);
      }
      return bulto;
    }));
  };

  // ❌ ELIMINAR ITEM
  const removeItem = (bulkId: string, itemId: string) => {
    setBultos(prev => prev.map(bulto => {
      if (bulto.id === bulkId) {
        const updatedBulto = {
          ...bulto,
          items: bulto.items.filter(item => item.id !== itemId)
        };
        return recalculateBulkPrices(updatedBulto);
      }
      return bulto;
    }));
  };

  // 🔄 ACTUALIZAR CONFIGURACIÓN DEL BULTO
  const updateBulto = (bulkId: string, updates: Partial<Bulto>) => {
    setBultos(prev => prev.map(bulto => {
      if (bulto.id === bulkId) {
        const updatedBulto = { ...bulto, ...updates };
        return recalculateBulkPrices(updatedBulto);
      }
      return bulto;
    }));
  };

  // 📊 OBTENER ESTADÍSTICAS TOTALES
  const getTotalStats = createMemo(() => {
    const totalBultos = bultos().length;
    const totalWeight = bultos().reduce((sum, bulto) => sum + bulto.currentWeight, 0);
    const totalCost = bultos().reduce((sum, bulto) => sum + bulto.totalCost, 0);
    const totalItems = bultos().reduce((sum, bulto) => sum + bulto.items.length, 0);
    const totalTransportCost = bultos().reduce((sum, bulto) => sum + Math.max(BASE_TRANSPORT_COST, bulto.baseTransportCost), 0);
    
    return { totalBultos, totalWeight, totalCost, totalItems, totalTransportCost };
  });

  const selectedBultoData = createMemo(() => {
    return bultos().find(b => b.id === selectedBulto());
  });

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>📦 Sistema Inteligente de Bultos</h1>
        <button onClick={createBulto} style={{ ...styles.button, ...styles.primaryButton }}>
          + Crear Nuevo Bulto
        </button>
      </div>

      {/* ESTADÍSTICAS GENERALES */}
      <div style={styles.statsBox}>
        <h3>📊 Resumen General</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
          <div><strong>Bultos:</strong> {getTotalStats().totalBultos}</div>
          <div><strong>Items:</strong> {getTotalStats().totalItems}</div>
          <div><strong>Peso Total:</strong> {getTotalStats().totalWeight.toFixed(1)} lbs</div>
          <div><strong>Transporte:</strong> ${getTotalStats().totalTransportCost.toFixed(2)}</div>
          <div><strong>Total General:</strong> ${getTotalStats().totalCost.toFixed(2)}</div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* PANEL DE BULTOS */}
        <div style={styles.section}>
          <h3>📦 Mis Bultos ({bultos().length})</h3>
          
          <For each={bultos()}>
            {(bulto) => (
              <div 
                style={{
                  ...styles.item,
                  border: selectedBulto() === bulto.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedBulto(bulto.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0' }}>{bulto.name}</h4>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {bulto.items.length} items • {bulto.currentWeight.toFixed(1)} lbs • {bulto.shippingMethod}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '600' }}>${bulto.totalCost.toFixed(2)}</div>
                    <div style={{ color: '#6b7280' }}>
                      Transp: ${Math.max(BASE_TRANSPORT_COST, bulto.baseTransportCost).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {/* Barra de progreso de peso */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '6px', 
                    background: '#e5e7eb', 
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min((bulto.currentWeight / bulto.maxWeight) * 100, 100)}%`,
                      height: '100%',
                      background: bulto.currentWeight > bulto.maxWeight * 0.9 ? '#ef4444' : 
                                 bulto.currentWeight > bulto.maxWeight * 0.7 ? '#f59e0b' : '#10b981',
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {bulto.currentWeight.toFixed(1)} / {bulto.maxWeight} lbs
                  </div>
                </div>

                {/* Alertas y optimizaciones */}
                <Show when={bulto.priceAlerts.length > 0}>
                  <div style={{ ...styles.alertBox, marginTop: '0.5rem' }}>
                    <For each={bulto.priceAlerts}>
                      {(alert) => <div>{alert}</div>}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        {/* PANEL DE CONFIGURACIÓN DEL BULTO SELECCIONADO */}
        <Show when={selectedBultoData()}>
          {(bulto) => (
            <div style={styles.section}>
              <h3>⚙️ Configuración: {bulto().name}</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={styles.label}>Nombre del Bulto</label>
                <input
                  type="text"
                  value={bulto().name}
                  onInput={(e) => updateBulto(bulto().id, { name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={styles.label}>Tipo de Bulto</label>
                  <select
                    value={bulto().type}
                    onChange={(e) => updateBulto(bulto().id, { type: e.target.value as any })}
                    style={styles.select}
                  >
                    <option value="PERSONAL">📱 Personal</option>
                    <option value="COMMERCIAL">🏢 Comercial</option>
                    <option value="DOCUMENTS">📄 Documentos</option>
                    <option value="MIXED">🔀 Mixto</option>
                  </select>
                </div>
                
                <div>
                  <label style={styles.label}>Método de Envío</label>
                  <select
                    value={bulto().shippingMethod}
                    onChange={(e) => updateBulto(bulto().id, { shippingMethod: e.target.value as any })}
                    style={styles.select}
                  >
                    <option value="SEA">🚢 Marítimo (más económico)</option>
                    <option value="AIR">✈️ Aéreo (+80% costo)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={styles.label}>Peso Máximo (lbs)</label>
                  <input
                    type="number"
                    value={bulto().maxWeight}
                    onInput={(e) => updateBulto(bulto().id, { maxWeight: parseFloat(e.target.value) || 100 })}
                    style={styles.input}
                  />
                </div>
                
                <div>
                  <label style={styles.label}>Destino</label>
                  <input
                    type="text"
                    value={bulto().destination}
                    onInput={(e) => updateBulto(bulto().id, { destination: e.target.value })}
                    style={styles.input}
                    placeholder="Ciudad, País"
                  />
                </div>
              </div>

              {/* Costos del bulto */}
              <div style={styles.priceBox}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>💰 Costos del Bulto</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>Transporte base: ${Math.max(BASE_TRANSPORT_COST, bulto().baseTransportCost).toFixed(2)}</div>
                  <div>Costo items: ${bulto().itemsCost.toFixed(2)}</div>
                  <div style={{ gridColumn: 'span 2', fontWeight: '600', borderTop: '1px solid #0ea5e9', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    Total: ${bulto().totalCost.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Optimizaciones sugeridas */}
              <Show when={bulto().suggestedOptimizations.length > 0}>
                <div style={{ ...styles.priceBox, background: '#f0fdf4', borderColor: '#10b981', marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>💡 Optimizaciones Sugeridas</h4>
                  <For each={bulto().suggestedOptimizations}>
                    {(suggestion) => <div>{suggestion}</div>}
                  </For>
                </div>
              </Show>
            </div>
          )}
        </Show>

        {/* PANEL DE ITEMS DEL BULTO */}
        <Show when={selectedBultoData()}>
          {(bulto) => (
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>📋 Items en {bulto().name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => addItemToBulto(bulto().id, 'PRODUCT')}
                    style={{ ...styles.button, ...styles.primaryButton, fontSize: '0.75rem' }}
                  >
                    + Producto
                  </button>
                  <button
                    onClick={() => addItemToBulto(bulto().id, 'RESERVA')}
                    style={{ ...styles.button, ...styles.successButton, fontSize: '0.75rem' }}
                  >
                    + Reserva
                  </button>
                  <button
                    onClick={() => addItemToBulto(bulto().id, 'EXTRA_SERVICE')}
                    style={{ ...styles.button, ...styles.warningButton, fontSize: '0.75rem' }}
                  >
                    + Servicio Extra
                  </button>
                </div>
              </div>

              <Show when={bulto().items.length === 0}>
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                  <div>Bulto vacío - Agrega productos, reservas o servicios extra</div>
                </div>
              </Show>

              <For each={bulto().items}>
                {(item) => (
                  <div style={styles.item}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1, marginRight: '1rem' }}>
                        <input
                          type="text"
                          placeholder="Descripción del item"
                          value={item.description}
                          onInput={(e) => updateItem(bulto().id, item.id, { description: e.target.value })}
                          style={styles.input}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: item.type === 'PRODUCT' ? '#dbeafe' : 
                                     item.type === 'RESERVA' ? '#dcfce7' : '#fef3c7',
                          color: item.type === 'PRODUCT' ? '#1d4ed8' : 
                                 item.type === 'RESERVA' ? '#166534' : '#92400e'
                        }}>
                          {item.type === 'PRODUCT' ? '📦 Producto' : 
                           item.type === 'RESERVA' ? '📋 Reserva' : '⚙️ Servicio'}
                        </span>
                        <button
                          onClick={() => removeItem(bulto().id, item.id)}
                          style={{ ...styles.button, background: '#ef4444', color: 'white', padding: '0.25rem 0.5rem' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={styles.label}>Categoría</label>
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(bulto().id, item.id, { category: e.target.value })}
                          style={styles.select}
                        >
                          <option value="GENERAL">General</option>
                          <option value="ELECTRONICS">📱 Electrónicos</option>
                          <option value="CLOTHING">👕 Ropa</option>
                          <option value="BOOKS_DOCUMENTS">📚 Libros/Docs</option>
                          <option value="FOOD_CONSUMABLES">🍕 Alimentos</option>
                          <option value="PERSONAL_ITEMS">👜 Personal</option>
                          <option value="FRAGILE">🔍 Frágil</option>
                        </select>
                      </div>
                      
                      <div>
                        <label style={styles.label}>Cantidad</label>
                        <input
                          type="number"
                          value={item.qty}
                          onInput={(e) => updateItem(bulto().id, item.id, { qty: parseInt(e.target.value) || 1 })}
                          style={styles.input}
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label style={styles.label}>Peso (lbs)</label>
                        <input
                          type="number"
                          value={item.weight}
                          onInput={(e) => updateItem(bulto().id, item.id, { weight: parseFloat(e.target.value) || 0 })}
                          style={styles.input}
                          step="0.1"
                        />
                      </div>
                      
                      <div>
                        <label style={styles.label}>Valor ($)</label>
                        <input
                          type="number"
                          value={item.value}
                          onInput={(e) => updateItem(bulto().id, item.id, { value: parseFloat(e.target.value) || 0 })}
                          style={styles.input}
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={item.fragile}
                          onChange={(e) => updateItem(bulto().id, item.id, { fragile: e.target.checked })}
                        />
                        <span style={{ fontSize: '0.875rem' }}>🔍 Frágil</span>
                      </label>
                      
                      <div style={{ fontSize: '0.875rem', textAlign: 'right' }}>
                        <div>
                          <strong>Precio:</strong> ${item.recommendedPricePerPound.toFixed(2)}/lb
                        </div>
                        <div style={{ fontWeight: '600', color: '#059669' }}>
                          <strong>Total:</strong> ${item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <Show when={item.notes}>
                      <div style={{ marginTop: '0.5rem' }}>
                        <textarea
                          placeholder="Notas adicionales"
                          value={item.notes || ''}
                          onInput={(e) => updateItem(bulto().id, item.id, { notes: e.target.value })}
                          style={{ ...styles.input, minHeight: '60px' }}
                        />
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          )}
        </Show>
      </div>

      {/* PANEL DE INFORMACIÓN DE PRECIOS */}
      <div style={styles.section}>
        <h3>💰 Información de Precios Automáticos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <h4>📊 Precios por Categoría</h4>
            <For each={Object.entries(PRICING_MATRIX.CATEGORIES)}>
              {([key, config]) => (
                <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <strong>{key}:</strong> ${config.basePrice}/lb + {(config.weightMultiplier * 100).toFixed(1)}%/lb
                </div>
              )}
            </For>
          </div>
          
          <div>
            <h4>🎯 Descuentos por Peso</h4>
            <For each={PRICING_MATRIX.WEIGHT_DISCOUNTS}>
              {(discount) => (
                <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <strong>{discount.minWeight}-{discount.maxWeight === Infinity ? '∞' : discount.maxWeight} lbs:</strong> {discount.description}
                </div>
              )}
            </For>
          </div>
          
          <div>
            <h4>🚛 Costos de Transporte</h4>
            <div style={{ fontSize: '0.875rem' }}>
              <div><strong>Mínimo por bulto:</strong> ${BASE_TRANSPORT_COST}</div>
              <div><strong>Marítimo:</strong> Tarifa base</div>
              <div><strong>Aéreo:</strong> +80% sobre marítimo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};