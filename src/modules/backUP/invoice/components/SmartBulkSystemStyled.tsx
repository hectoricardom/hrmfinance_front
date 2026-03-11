import { createSignal, For, Show, createMemo } from 'solid-js';

// 📦 SISTEMA INTELIGENTE DE BULTOS - Estilo InvoiceAddForm
// Información de precios oculta por defecto

interface BulkItem {
  id: string;
  type: 'PRODUCT' | 'RESERVA' | 'EXTRA_SERVICE';
  description: string;
  category: string;
  qty: number;
  weight: number;
  dimensions?: { length: number; width: number; height: number };
  value: number;
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
  currentWeight: number;
  estimatedVolume: number;
  
  // Costos automáticos
  baseTransportCost: number; // mínimo $20
  itemsCost: number;
  totalCost: number;
  
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

// 💰 CONFIGURACIÓN DE PRECIOS AUTOMÁTICOS (OCULTA)
const PRICING_MATRIX = {
  CATEGORIES: {
    'ELECTRONICS': { basePrice: 4.50, weightMultiplier: 0.1, description: 'Electrónicos - Manejo especial' },
    'CLOTHING': { basePrice: 2.50, weightMultiplier: 0.05, description: 'Ropa - Peso ligero' },
    'BOOKS_DOCUMENTS': { basePrice: 2.00, weightMultiplier: 0.15, description: 'Libros/Documentos - Peso alto' },
    'FOOD_CONSUMABLES': { basePrice: 3.00, weightMultiplier: 0.08, description: 'Alimentos - Manejo cuidadoso' },
    'PERSONAL_ITEMS': { basePrice: 3.50, weightMultiplier: 0.07, description: 'Artículos personales' },
    'FRAGILE': { basePrice: 5.00, weightMultiplier: 0.12, description: 'Frágil - Embalaje especial' },
    'GENERAL': { basePrice: 3.00, weightMultiplier: 0.06, description: 'Mercancía general' }
  },
  
  WEIGHT_DISCOUNTS: [
    { minWeight: 0, maxWeight: 10, discount: 0, description: 'Sin descuento' },
    { minWeight: 10, maxWeight: 25, discount: 0.05, description: '5% descuento' },
    { minWeight: 25, maxWeight: 50, discount: 0.10, description: '10% descuento' },
    { minWeight: 50, maxWeight: 100, discount: 0.15, description: '15% descuento' },
    { minWeight: 100, maxWeight: Infinity, discount: 0.20, description: '20% descuento máximo' }
  ],
  
  SHIPPING_MULTIPLIERS: {
    'SEA': 1.0,
    'AIR': 1.8
  }
};

const BASE_TRANSPORT_COST = 20; // Mínimo $20 por bulto

export const SmartBulkSystemStyled = () => {
  const [bultos, setBultos] = createSignal<Bulto[]>([]);
  const [selectedBulto, setSelectedBulto] = createSignal<string>('');
  const [showPricingInfo, setShowPricingInfo] = createSignal(false);
  
  // Estados para agregar items (estilo InvoiceAddForm)
  const [showProductSearch, setShowProductSearch] = createSignal(false);
  const [productSearch, setProductSearch] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<any[]>([]);

  // 🧮 CALCULAR PRECIO RECOMENDADO AUTOMÁTICAMENTE
  const calculateRecommendedPrice = (item: BulkItem, totalBulkWeight: number, shippingMethod: 'SEA' | 'AIR') => {
    const category = PRICING_MATRIX.CATEGORIES[item.category] || PRICING_MATRIX.CATEGORIES.GENERAL;
    let pricePerPound = category.basePrice + (item.weight * category.weightMultiplier);
    
    if (item.fragile) {
      pricePerPound *= 1.3;
    }
    
    pricePerPound *= PRICING_MATRIX.SHIPPING_MULTIPLIERS[shippingMethod];
    
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
      totalCost: BASE_TRANSPORT_COST,
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
    const totalWeight = bulto.items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
    
    const totalVolume = bulto.items.reduce((sum, item) => {
      if (item.dimensions) {
        return sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height * item.qty);
      }
      return sum + (item.weight * 1000);
    }, 0);
    
    const updatedItems = bulto.items.map(item => {
      const recommendedPrice = calculateRecommendedPrice(item, totalWeight, bulto.shippingMethod);
      return {
        ...item,
        recommendedPricePerPound: recommendedPrice,
        totalPrice: (item.weight * item.qty) * recommendedPrice
      };
    });
    
    const itemsCost = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalCost = Math.max(BASE_TRANSPORT_COST, bulto.baseTransportCost) + itemsCost;
    
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
    <div class="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">📦 Gestión Inteligente de Bultos</h2>
      
      {/* Resumen General */}
      <div class="bg-blue-50 p-4 rounded-lg mb-6">
        <div class="grid grid-cols-5 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-blue-600">{getTotalStats().totalBultos}</div>
            <div class="text-sm text-gray-600">Bultos</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-600">{getTotalStats().totalItems}</div>
            <div class="text-sm text-gray-600">Items</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-600">{getTotalStats().totalWeight.toFixed(1)}</div>
            <div class="text-sm text-gray-600">lbs Total</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-600">${getTotalStats().totalTransportCost.toFixed(2)}</div>
            <div class="text-sm text-gray-600">Transporte</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-600">${getTotalStats().totalCost.toFixed(2)}</div>
            <div class="text-sm text-gray-600">Total General</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel Izquierdo - Lista de Bultos */}
        <div class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-semibold">📦 Mis Bultos ({bultos().length})</h3>
              <button
                onClick={createBulto}
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                + Crear Bulto
              </button>
            </div>

            <div class="space-y-3">
              <For each={bultos()}>
                {(bulto) => (
                  <div 
                    class={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedBulto() === bulto.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedBulto(bulto.id)}
                  >
                    <div class="flex justify-between items-start mb-2">
                      <div>
                        <h4 class="font-medium text-gray-800">{bulto.name}</h4>
                        <div class="text-sm text-gray-600">
                          {bulto.items.length} items • {bulto.currentWeight.toFixed(1)} lbs • {bulto.shippingMethod}
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-semibold text-green-600">${bulto.totalCost.toFixed(2)}</div>
                        <div class="text-xs text-gray-500">
                          Transp: ${Math.max(BASE_TRANSPORT_COST, bulto.baseTransportCost).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Barra de progreso de peso */}
                    <div class="mb-2">
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          class={`h-2 rounded-full ${
                            bulto.currentWeight > bulto.maxWeight * 0.9 ? 'bg-red-500' : 
                            bulto.currentWeight > bulto.maxWeight * 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((bulto.currentWeight / bulto.maxWeight) * 100, 100)}%` }}
                        />
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        {bulto.currentWeight.toFixed(1)} / {bulto.maxWeight} lbs
                      </div>
                    </div>

                    {/* Alertas */}
                    <Show when={bulto.priceAlerts.length > 0}>
                      <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-2 py-1 rounded text-xs">
                        {bulto.priceAlerts[0]}
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Información de Precios (Oculta por defecto) */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <button
              onClick={() => setShowPricingInfo(!showPricingInfo())}
              class="w-full flex justify-between items-center text-left font-medium text-gray-700 hover:text-gray-900"
            >
              <span>💰 Información de Precios</span>
              <span class="text-xl">{showPricingInfo() ? '▼' : '▶'}</span>
            </button>
            
            <Show when={showPricingInfo()}>
              <div class="mt-4 space-y-4">
                <div>
                  <h4 class="font-medium mb-2">📊 Precios por Categoría</h4>
                  <div class="space-y-1 text-sm">
                    <For each={Object.entries(PRICING_MATRIX.CATEGORIES)}>
                      {([key, config]) => (
                        <div class="flex justify-between">
                          <span>{key.replace('_', ' ')}:</span>
                          <span>${config.basePrice}/lb</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
                
                <div>
                  <h4 class="font-medium mb-2">🎯 Descuentos por Peso</h4>
                  <div class="space-y-1 text-sm">
                    <For each={PRICING_MATRIX.WEIGHT_DISCOUNTS}>
                      {(discount) => (
                        <div class="flex justify-between">
                          <span>{discount.minWeight}-{discount.maxWeight === Infinity ? '∞' : discount.maxWeight} lbs:</span>
                          <span>{(discount.discount * 100).toFixed(0)}% desc</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
                
                <div>
                  <h4 class="font-medium mb-2">🚛 Métodos de Envío</h4>
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between">
                      <span>🚢 Marítimo:</span>
                      <span>Precio base</span>
                    </div>
                    <div class="flex justify-between">
                      <span>✈️ Aéreo:</span>
                      <span>+80% sobre marítimo</span>
                    </div>
                    <div class="flex justify-between">
                      <span>📦 Mínimo por bulto:</span>
                      <span>${BASE_TRANSPORT_COST}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>

        {/* Panel Derecho - Configuración y Items del Bulto Seleccionado */}
        <div class="space-y-4">
          <Show when={selectedBultoData()}>
            {(bulto) => (
              <>
                {/* Configuración del Bulto */}
                <div class="bg-gray-50 p-4 rounded-lg">
                  <h3 class="text-lg font-semibold mb-3">⚙️ Configuración: {bulto().name}</h3>
                  
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Bulto
                      </label>
                      <input
                        type="text"
                        value={bulto().name}
                        onInput={(e) => updateBulto(bulto().id, { name: e.target.value })}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Bulto
                        </label>
                        <select
                          value={bulto().type}
                          onChange={(e) => updateBulto(bulto().id, { type: e.target.value as any })}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PERSONAL">📱 Personal</option>
                          <option value="COMMERCIAL">🏢 Comercial</option>
                          <option value="DOCUMENTS">📄 Documentos</option>
                          <option value="MIXED">🔀 Mixto</option>
                        </select>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          Método de Envío
                        </label>
                        <select
                          value={bulto().shippingMethod}
                          onChange={(e) => updateBulto(bulto().id, { shippingMethod: e.target.value as any })}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="SEA">🚢 Marítimo</option>
                          <option value="AIR">✈️ Aéreo</option>
                        </select>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          Peso Máximo (lbs)
                        </label>
                        <input
                          type="number"
                          value={bulto().maxWeight}
                          onInput={(e) => updateBulto(bulto().id, { maxWeight: parseFloat(e.target.value) || 100 })}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          Destino
                        </label>
                        <input
                          type="text"
                          value={bulto().destination}
                          onInput={(e) => updateBulto(bulto().id, { destination: e.target.value })}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ciudad, País"
                        />
                      </div>
                    </div>

                    {/* Costos del bulto */}
                    <div class="bg-blue-50 p-3 rounded-lg">
                      <h4 class="font-medium mb-2">💰 Costos del Bulto</h4>
                      <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="flex justify-between">
                          <span>Transporte:</span>
                          <span>${Math.max(BASE_TRANSPORT_COST, bulto().baseTransportCost).toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                          <span>Items:</span>
                          <span>${bulto().itemsCost.toFixed(2)}</span>
                        </div>
                        <div class="col-span-2 flex justify-between font-semibold pt-2 border-t border-blue-200">
                          <span>Total:</span>
                          <span>${bulto().totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Optimizaciones sugeridas */}
                    <Show when={bulto().suggestedOptimizations.length > 0}>
                      <div class="bg-green-50 p-3 rounded-lg">
                        <h4 class="font-medium mb-2">💡 Optimizaciones Sugeridas</h4>
                        <For each={bulto().suggestedOptimizations}>
                          {(suggestion) => (
                            <div class="text-sm text-green-700">{suggestion}</div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>

                {/* Items del Bulto */}
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold">📋 Items en {bulto().name}</h3>
                    <div class="flex gap-2">
                      <button
                        onClick={() => addItemToBulto(bulto().id, 'PRODUCT')}
                        class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                      >
                        + Producto
                      </button>
                      <button
                        onClick={() => addItemToBulto(bulto().id, 'RESERVA')}
                        class="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                      >
                        + Reserva
                      </button>
                      <button
                        onClick={() => addItemToBulto(bulto().id, 'EXTRA_SERVICE')}
                        class="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm"
                      >
                        + Servicio
                      </button>
                    </div>
                  </div>

                  <Show when={bulto().items.length === 0}>
                    <div class="text-center py-8 text-gray-500">
                      <div class="text-4xl mb-2">📦</div>
                      <div>Bulto vacío - Agrega productos, reservas o servicios</div>
                    </div>
                  </Show>

                  <div class="space-y-3">
                    <For each={bulto().items}>
                      {(item) => (
                        <div class="bg-white p-3 rounded-lg border border-gray-200">
                          <div class="flex justify-between items-start mb-3">
                            <div class="flex-1 mr-3">
                              <input
                                type="text"
                                placeholder="Descripción del item"
                                value={item.description}
                                onInput={(e) => updateItem(bulto().id, item.id, { description: e.target.value })}
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div class="flex items-center gap-2">
                              <span class={`px-2 py-1 rounded text-xs font-medium ${
                                item.type === 'PRODUCT' ? 'bg-blue-100 text-blue-800' : 
                                item.type === 'RESERVA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.type === 'PRODUCT' ? '📦' : item.type === 'RESERVA' ? '📋' : '⚙️'}
                                {item.type === 'PRODUCT' ? ' Producto' : item.type === 'RESERVA' ? ' Reserva' : ' Servicio'}
                              </span>
                              <button
                                onClick={() => removeItem(bulto().id, item.id)}
                                class="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                            <div>
                              <label class="block text-xs font-medium text-gray-700 mb-1">
                                Categoría
                              </label>
                              <select
                                value={item.category}
                                onChange={(e) => updateItem(bulto().id, item.id, { category: e.target.value })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              <label class="block text-xs font-medium text-gray-700 mb-1">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                value={item.qty}
                                onInput={(e) => updateItem(bulto().id, item.id, { qty: parseInt(e.target.value) || 1 })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                            </div>
                            
                            <div>
                              <label class="block text-xs font-medium text-gray-700 mb-1">
                                Peso (lbs)
                              </label>
                              <input
                                type="number"
                                value={item.weight}
                                onInput={(e) => updateItem(bulto().id, item.id, { weight: parseFloat(e.target.value) || 0 })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.1"
                              />
                            </div>
                            
                            <div>
                              <label class="block text-xs font-medium text-gray-700 mb-1">
                                Valor ($)
                              </label>
                              <input
                                type="number"
                                value={item.value}
                                onInput={(e) => updateItem(bulto().id, item.id, { value: parseFloat(e.target.value) || 0 })}
                                class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                              />
                            </div>
                          </div>

                          <div class="flex justify-between items-center">
                            <label class="flex items-center">
                              <input
                                type="checkbox"
                                checked={item.fragile}
                                onChange={(e) => updateItem(bulto().id, item.id, { fragile: e.target.checked })}
                                class="mr-2"
                              />
                              <span class="text-sm text-gray-700">🔍 Frágil</span>
                            </label>
                            
                            <div class="text-right text-sm">
                              <div class="text-gray-600">
                                ${item.recommendedPricePerPound.toFixed(2)}/lb
                              </div>
                              <div class="font-semibold text-green-600">
                                Total: ${item.totalPrice.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </>
            )}
          </Show>

          <Show when={!selectedBultoData()}>
            <div class="bg-gray-50 p-8 rounded-lg text-center">
              <div class="text-4xl mb-4">📦</div>
              <h3 class="text-lg font-medium text-gray-700 mb-2">Selecciona un Bulto</h3>
              <p class="text-gray-500">Elige un bulto de la lista para ver su configuración y contenido</p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};