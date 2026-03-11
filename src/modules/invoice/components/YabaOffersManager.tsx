import { Component, createSignal, For, Show, onMount, createMemo } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import type { ShippingMethod, ItemCategory, WeightRange, TVPricing, BoxFlatRateOption } from '../../../services/shippingOffersService';
import { yabaOffersApi, businessApi } from '../../../services/apiAdapter';
import { getActiveConfig, switchActiveOffer } from '../../../services/activeOffersService';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

interface WeightRangeFormData extends WeightRange {
  id?: string;
}

interface YabaOffersManagerProps {
  onClose?: () => void;
}

const YabaOffersManager: Component<YabaOffersManagerProps> = (props) => {
  const [selectedMethod, setSelectedMethod] = createSignal<ShippingMethod>('maritime');
  const [selectedCategory, setSelectedCategory] = createSignal<ItemCategory>('miscellaneous');
  const [editMode, setEditMode] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);

  // Configuration management
  const [availableConfigs, setAvailableConfigs] = createSignal<any[]>([]);
  const [currentConfigId, setCurrentConfigId] = createSignal<string | null>(null);
  const [currentConfigName, setCurrentConfigName] = createSignal<string>('Default');
  const [currentConfigCode, setCurrentConfigCode] = createSignal<string>('');
  const [currentConfigIsActive, setCurrentConfigIsActive] = createSignal<boolean>(true);
  const [currentConfigIsVisible, setCurrentConfigIsVisible] = createSignal<boolean>(true);
  const [currentConfigBusinessId, setCurrentConfigBusinessId] = createSignal<string>('YB100423253156428');
  const [originalConfigBusinessId, setOriginalConfigBusinessId] = createSignal<string>('YB100423253156428'); // Track original for updates
  const [systemActiveId, setSystemActiveId] = createSignal<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = createSignal(false);
  const [availableBusinesses, setAvailableBusinesses] = createSignal<Array<{id: string, name: string}>>([]);

  // Check if current user is admin
  const isAdmin = createMemo(() => authStore.isAdmin());



/*
  // Maritime Miscellaneous Offers
  const [maritimeMiscRanges, setMaritimeMiscRanges] = createSignal<WeightRangeFormData[]>([
    {
      id: '1',
      min: 6.6,
      max: 44,
      pricePerLb: 3.99,
      description: '6.6 - 44 libras'
    },
    {
      id: '2',
      min: 45,
      max: 60,
      pricePerLb: 3.49,
      freeWeight: 10,
      effectivePricePerLb: 2.9,
      needBePay: 50,
      description: '45 - 60 libras (10 libras gratis)'
    },
    {
      id: '3',
      min: 61,
      max: 70,
      pricePerLb: 2.99,
      freeWeight: 15,
      effectivePricePerLb: 2.3,
      needBePay: 55,
      description: '61 - 70 libras (15 libras gratis)'
    },
    {
      id: '4',
      min: 71,
      max: 80,
      pricePerLb: 2.10,
      freeWeight: 20,
      effectivePricePerLb: 1.57,
      needBePay: 60,
      description: '71 - 80 libras (20 libras gratis)'
    },
    {
      id: '5',
      min: 81,
      max: 120,
      pricePerLb: 1.99,
      freeWeight: 30,
      effectivePricePerLb: 1.49,
      needBePay: 90,
      description: '81 - 120 libras (30 libras gratis)'
    }
  ]);

  // Maritime Durable Goods Offers
  const [maritimeDurableRanges, setMaritimeDurableRanges] = createSignal<WeightRangeFormData[]>([
    {
      id: '1',
      min: 6.6,
      max: 44,
      pricePerLb: 4.50,
      tariffPerLb: 0,
      description: '6.6 - 44 libras'
    },
    {
      id: '2',
      min: 45,
      max: 60,
      pricePerLb: 3.99,
      tariffPerLb: 0,
      description: '45 - 60 libras'
    },
    {
      id: '3',
      min: 61,
      max: 70,
      pricePerLb: 3.69,
      tariffPerLb: 0,
      description: '61 - 70 libras'
    },
    {
      id: '4',
      min: 71,
      max: 80,
      pricePerLb: 3.15,
      tariffPerLb: 0,
      description: '71 - 80 libras'
    },
    {
      id: '5',
      min: 81,
      max: 120,
      pricePerLb: 3,
      tariffPerLb: 0,
      description: '81 - 120 libras'
    }
  ]);

  // Air Miscellaneous Offers
  const [airMiscRanges, setAirMiscRanges] = createSignal<WeightRangeFormData[]>([
    {
      id: '1',
      min: 6.6,
      max: 49,
      pricePerLb: 4.50,
      description: '6.6 - 49 libras'
    },
    {
      id: '2',
      min: 50,
      max: 60,
      pricePerLb: 3.99,
      freeWeight: 5,
      effectivePricePerLb: 2.9,
      needBePay: 55,
      description: '50 - 60 libras (5 libras gratis)'
    },
    {
      id: '3',
      min: 61,
      max: 70,
      pricePerLb: 3.79,
      freeWeight: 7,
      effectivePricePerLb: 2.3,
      needBePay: 63,
      description: '61 - 70 libras (7 libras gratis)'
    },
    {
      id: '4',
      min: 71,
      max: 80,
      pricePerLb: 4.50,
      freeWeight: 20,
      effectivePricePerLb: 1.57,
      needBePay: 60,
      description: '71 - 80 libras (20 libras gratis)'
    },
    {
      id: '5',
      min: 81,
      max: 120,
      pricePerLb: 4.29,
      freeWeight: 30,
      effectivePricePerLb: 1.49,
      needBePay: 90,
      description: '81 - 120 libras (30 libras gratis)'
    }
  ]);

  // Air Durable Goods Offers
  const [airDurableRanges, setAirDurableRanges] = createSignal<WeightRangeFormData[]>([
    {
      id: '1',
      min: 6.6,
      max: 49,
      pricePerLb: 4.80,
      tariffPerLb: 0,
      description: '6.6 - 49 libras'
    },
    {
      id: '2',
      min: 50,
      max: 60,
      pricePerLb: 4.49,
      tariffPerLb: 0.39,
      description: '50 - 60 libras'
    },
    {
      id: '3',
      min: 61,
      max: 70,
      pricePerLb: 3.99,
      tariffPerLb: 0.37,
      description: '61 - 70 libras'
    },
    {
      id: '4',
      min: 71,
      max: 80,
      pricePerLb: 3.60,
      tariffPerLb: 0.35,
      description: '71 - 80 libras'
    },
    {
      id: '5',
      min: 81,
      max: 120,
      pricePerLb: 3.50,
      tariffPerLb: 0.125,
      description: '81 - 120 libras'
    }
  ]);

  // Box Flat Rate Options
  const [boxOptions, setBoxOptions] = createSignal<(BoxFlatRateOption & { id: string })[]>([
    {
      id: '1',
      size: '12x12x12',
      price: 37.99,
      maxWeight: 40,
      description: 'Caja 12x12x12 - $37.99 hasta 40 lbs'
    },
    {
      id: '2',
      size: '14x14x14',
      price: 57.99,
      maxWeight: 60,
      description: 'Caja 14x14x14 - $57.99 hasta 60 lbs'
    },
    {
      id: '3',
      size: '16x16x16',
      price: 79.99,
      maxWeight: 78,
      description: 'Caja 16x16x16 - $79.99 hasta 78 lbs'
    }
  ]);


  /* */



  // Maritime Miscellaneous Offers
  const [maritimeMiscRanges, setMaritimeMiscRanges] = createSignal<WeightRangeFormData[]>([]);

  // Maritime Durable Goods Offers
  const [maritimeDurableRanges, setMaritimeDurableRanges] = createSignal<WeightRangeFormData[]>([]);

  // Air Miscellaneous Offers
  const [airMiscRanges, setAirMiscRanges] = createSignal<WeightRangeFormData[]>([]);

  // Air Durable Goods Offers
  const [airDurableRanges, setAirDurableRanges] = createSignal<WeightRangeFormData[]>([]);

  // Box Flat Rate Options
  const [boxOptions, setBoxOptions] = createSignal<(BoxFlatRateOption & { id: string })[]>([ ]);


  // Get current ranges based on selection
  const getCurrentRanges = () => {
    const method = selectedMethod();
    const category = selectedCategory();

    if (method === 'maritime' && category === 'miscellaneous') {
      return maritimeMiscRanges();
    } else if (method === 'maritime' && category === 'durable') {
      return maritimeDurableRanges();
    } else if (method === 'air' && category === 'miscellaneous') {
      return airMiscRanges();
    } else if (method === 'air' && category === 'durable') {
      return airDurableRanges();
    }
    return [];
  };

  // Update range value
  const updateRange = (id: string, field: keyof WeightRangeFormData, value: any) => {
    const method = selectedMethod();
    const category = selectedCategory();

    const updater = (ranges: WeightRangeFormData[]) =>
      ranges.map(r => r.id === id ? { ...r, [field]: value } : r);

    if (method === 'maritime' && category === 'miscellaneous') {
      setMaritimeMiscRanges(updater);
    } else if (method === 'maritime' && category === 'durable') {
      setMaritimeDurableRanges(updater);
    } else if (method === 'air' && category === 'miscellaneous') {
      setAirMiscRanges(updater);
    } else if (method === 'air' && category === 'durable') {
      setAirDurableRanges(updater);
    }
  };

  // Add new range
  const addNewRange = () => {
    const newRange: WeightRangeFormData = {
      id: Date.now().toString(),
      min: 0,
      max: 0,
      pricePerLb: 0,
      description: 'Nueva oferta'
    };

    const method = selectedMethod();
    const category = selectedCategory();

    if (method === 'maritime' && category === 'miscellaneous') {
      setMaritimeMiscRanges([...maritimeMiscRanges(), newRange]);
    } else if (method === 'maritime' && category === 'durable') {
      setMaritimeDurableRanges([...maritimeDurableRanges(), newRange]);
    } else if (method === 'air' && category === 'miscellaneous') {
      setAirMiscRanges([...airMiscRanges(), newRange]);
    } else if (method === 'air' && category === 'durable') {
      setAirDurableRanges([...airDurableRanges(), newRange]);
    }
  };

  // Delete range
  const deleteRange = (id: string) => {
    if (!confirm('¿Eliminar esta oferta?')) return;

    const method = selectedMethod();
    const category = selectedCategory();

    const filter = (ranges: WeightRangeFormData[]) => ranges.filter(r => r.id !== id);

    if (method === 'maritime' && category === 'miscellaneous') {
      setMaritimeMiscRanges(filter);
    } else if (method === 'maritime' && category === 'durable') {
      setMaritimeDurableRanges(filter);
    } else if (method === 'air' && category === 'miscellaneous') {
      setAirMiscRanges(filter);
    } else if (method === 'air' && category === 'durable') {
      setAirDurableRanges(filter);
    }
  };

  // Load configuration into state
  const loadConfiguration = (offerRecord: any) => {
    try {
      const offer = JSON.parse(offerRecord.data);
      const ranges = JSON.parse(offer.offers);

      if (ranges && Array.isArray(ranges)) {
        ranges.forEach((to: any) => {
          const method = to.method as ShippingMethod;
          const category = to.category as ItemCategory;

          const rangesWithId = to?.ranges?.map?.((r: any, idx: number) => ({
            ...r,
            id: r.id || `${offer.id}-${idx}`
          }));

          if (method === 'maritime' && category === 'miscellaneous') {
            setMaritimeMiscRanges(rangesWithId || []);
          } else if (method === 'maritime' && category === 'durable') {
            setMaritimeDurableRanges(rangesWithId || []);
          } else if (method === 'air' && category === 'miscellaneous') {
            setAirMiscRanges(rangesWithId || []);
          } else if (method === 'air' && category === 'durable') {
            setAirDurableRanges(rangesWithId || []);
          }

          if (method === 'maritime' && category === 'box_flat_rate' && to.boxOptions) {
            const boxesWithId = to.boxOptions.map((b: any, idx: number) => ({
              ...b,
              id: b.id || `box-${idx}`
            }));
            setBoxOptions(boxesWithId);
          }
        });
      }

      // Set current config info
      setCurrentConfigId(offerRecord.id);
      setCurrentConfigName(offer.offerName || 'Default');
      setCurrentConfigCode(offer.offerCode || '');
      setCurrentConfigIsActive(offer.isActive ?? true);
      setCurrentConfigIsVisible(offer.isVisible ?? true);
      const loadedBusinessId = offer.businessId || 'YB100423253156428';
      setCurrentConfigBusinessId(loadedBusinessId);
      setOriginalConfigBusinessId(loadedBusinessId); // Store original for updates

      devLog('✅ Configuración cargada:', offer.offerName);
    } catch (error) {
      devLog('Error al cargar configuración:', error);
      throw error;
    }
  };

  // Load offers from API
  onMount(async () => {
    try {
      setLoading(true);

      // Load available businesses for admins
      if (isAdmin()) {
        const businesses = await businessApi.getBusinessByStatus(true);
        setAvailableBusinesses(businesses.filter((b: any) => b.isActive !== false).map((b: any) => ({ id: b.id, name: b.name })));
      }

      const offers = await yabaOffersApi.getAll();

      setAvailableConfigs(offers);

      // Get system active configuration
      const activeConfig = getActiveConfig();
      setSystemActiveId(activeConfig?.id || null);

      // Load the first configuration if available
      if (offers.length > 0) {
        loadConfiguration(offers[0]);
      }

      devLog('✅ Configuraciones disponibles:', offers.length);
      devLog('📌 Configuración activa del sistema:', activeConfig?.name);
    } catch (error) {
      devLog('Error al cargar ofertas:', error);
      setSaveMessage('⚠️ No se pudieron cargar las ofertas guardadas. Usando valores predeterminados.');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  });

  // Switch configuration
  const switchConfiguration = (configId: string) => {
    const config = availableConfigs().find(c => c.id === configId);
    if (config) {
      loadConfiguration(config);
    }
  };

  // Make configuration active in system
  const makeActive = async (configId: string) => {
    try {
      await switchActiveOffer(configId);
      setSystemActiveId(configId);
      setSaveMessage('✅ Configuración establecida como activa para facturas');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('❌ Error al establecer configuración activa');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Save offers
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage('💾 Guardando ofertas...');

      // Prepare offers data (all types in one array)
      const offersToSave = [
        {
          method: 'maritime',
          category: 'miscellaneous',
          ranges: maritimeMiscRanges().map(r => {
            const { id, ...rest } = r;
            return rest;
          })
        },
        {
          method: 'maritime',
          category: 'durable',
          ranges: maritimeDurableRanges().map(r => {
            const { id, ...rest } = r;
            return rest;
          })
        },
        {
          method: 'air',
          category: 'miscellaneous',
          ranges: airMiscRanges().map(r => {
            const { id, ...rest } = r;
            return rest;
          })
        },
        {
          method: 'air',
          category: 'durable',
          ranges: airDurableRanges().map(r => {
            const { id, ...rest } = r;
            return rest;
          })
        },
        {
          method: 'maritime',
          category: 'box_flat_rate',
          boxOptions: boxOptions().map(b => {
            const { id, ...rest } = b;
            return rest;
          })
        }
      ];

      // Prepare metadata
      const metadata = {
        name: currentConfigName(),
        isActive: currentConfigIsActive(),
        isVisible: currentConfigIsVisible(),
        businessId: currentConfigBusinessId(),
        originalBusinessId: originalConfigBusinessId() // Pass original businessId for updates
      };

      // Update existing config or create new
      if (currentConfigId()) {
        await yabaOffersApi.update(currentConfigId()!, offersToSave, metadata);
        devLog('✅ Configuración actualizada');
        // Update the original to the new value after successful update
        setOriginalConfigBusinessId(currentConfigBusinessId());
      } else {
        const newConfig = await yabaOffersApi.create(offersToSave, metadata);
        setCurrentConfigId(newConfig.id);
        // After creation, set the original businessId to current value
        setOriginalConfigBusinessId(currentConfigBusinessId());

        // Reload available configs
        const offers = await yabaOffersApi.getAll();
        setAvailableConfigs(offers);
        devLog('✅ Nueva configuración creada');
      }

      setSaveMessage('✅ Ofertas guardadas exitosamente');
      setEditMode(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      devLog('Error al guardar ofertas:', error);
      setSaveMessage('❌ Error al guardar ofertas. Intenta nuevamente.');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Create new configuration
  const createNewConfig = async () => {
    const name = prompt('Nombre para la nueva configuración:');
    if (!name) return;

    const code = prompt('Código para la configuración (opcional):') || `${name.toUpperCase().replace(/\s+/g, '_')}`;

    const defaultBusinessId = authStore.getBusinessId();
    setCurrentConfigId(null);
    setCurrentConfigName(name);
    setCurrentConfigCode(code);
    setCurrentConfigIsActive(true);
    setCurrentConfigIsVisible(true);
    // Set default businessId to current user's businessId (admins can change it later)
    setCurrentConfigBusinessId(defaultBusinessId);
    setOriginalConfigBusinessId(defaultBusinessId);

    // Clear all ranges to start fresh
    setMaritimeMiscRanges([]);
    setMaritimeDurableRanges([]);
    setAirMiscRanges([]);
    setAirDurableRanges([]);
    setBoxOptions([]);

    setSaveMessage('ℹ️ Nueva configuración creada. Agrega rangos y guarda.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Print report handler
  const handlePrintReport = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
      setShowPrintPreview(false);
    }, 500);
  };

  const inputStyle = {
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    width: '100%'
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Card>
        <div style={{ padding: '1.5rem' }}>
          {/* Loading State */}
          <Show when={loading()}>
            <div style={{
              padding: '2rem',
              'text-align': 'center',
              color: 'var(--text-muted)'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>⏳</div>
              <div>Cargando ofertas...</div>
            </div>
          </Show>

          <Show when={!loading()}>
          {/* Header */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'flex-start',
            'margin-bottom': '1.5rem'
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 'font-size': '1.5rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
                💰 Administrador de Ofertas
              </h2>

              {/* Configuration Metadata */}
              <Show when={!editMode()} fallback={
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(2, 1fr)',
                  gap: '1rem',
                  'max-width': '800px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      'font-weight': '600',
                      'margin-bottom': '0.25rem',
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      Nombre de Configuración:
                    </label>
                    <input
                      type="text"
                      value={currentConfigName()}
                      onInput={(e) => setCurrentConfigName(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="Ej: Ofertas 2024"
                    />
                  </div>

                  {/* BusinessID selector - Only visible to admins */}
                  <Show when={isAdmin()}>
                    <div>
                      <label style={{
                        display: 'block',
                        'font-weight': '600',
                        'margin-bottom': '0.25rem',
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        🏢 Business ID: <span style={{ color: 'var(--danger-color)', 'font-size': '0.65rem' }}>(Solo Admin)</span>
                      </label>
                      <select
                        style={inputStyle}
                        value={currentConfigBusinessId()}
                        onChange={(e) => setCurrentConfigBusinessId(e.currentTarget.value)}
                      >
                        <For each={availableBusinesses()}>
                          {(business) => <option value={business.id}>{business.name} ({business.id})</option>}
                        </For>
                      </select>
                    </div>
                  </Show>

                  <div>
                    <label style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={currentConfigIsActive()}
                        onChange={(e) => setCurrentConfigIsActive(e.currentTarget.checked)}
                      />
                      <span style={{ 'font-size': '0.875rem' }}>✓ Activa</span>
                    </label>
                  </div>
                  <div>
                    <label style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={currentConfigIsVisible()}
                        onChange={(e) => setCurrentConfigIsVisible(e.currentTarget.checked)}
                      />
                      <span style={{ 'font-size': '0.875rem' }}>👁️ Visible</span>
                    </label>
                  </div>
                </div>
              }>
                <div>
                  <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.25rem' }}>
                    Configuración actual: <strong>{currentConfigName()}</strong>
                  </p>
                  <p style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                    Código: {currentConfigCode()} •
                    {currentConfigIsActive() ? ' ✓ Activa' : ' ✗ Inactiva'} •
                    {currentConfigIsVisible() ? ' 👁️ Visible' : ' 👁️‍🗨️ Oculta'}
                    <Show when={isAdmin()}>
                      {' • 🏢 Business: '}{availableBusinesses().find(b => b.id === currentConfigBusinessId())?.name || currentConfigBusinessId()}
                    </Show>
                  </p>
                </div>
              </Show>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
              <Show when={editMode()}>
                <Button variant="primary" onClick={handleSave} disabled={saving()}>
                  {saving() ? '💾 Guardando...' : '💾 Guardar Cambios'}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving()}>
                  ✕ Cancelar
                </Button>
              </Show>
              <Show when={!editMode()}>
                <Button variant="primary" onClick={() => setEditMode(true)}>
                  ✏️ Editar Ofertas
                </Button>
                <Button variant="outline" onClick={createNewConfig}>
                  ➕ Nueva Configuración
                </Button>
                <Button variant="outline" onClick={handlePrintReport}>
                  🖨️ Imprimir
                </Button>
              </Show>
              <Show when={props.onClose}>
                <Button variant="outline" onClick={props.onClose}>
                  Cerrar
                </Button>
              </Show>
            </div>
          </div>

          {/* Save Message */}
          <Show when={saveMessage()}>
            <div style={{
              padding: '1rem',
              background: saveMessage()?.includes('❌') ? 'var(--danger-light)' :
                         saveMessage()?.includes('⚠️') ? 'var(--warning-light)' :
                         'var(--success-light)',
              color: saveMessage()?.includes('❌') ? 'var(--danger-color)' :
                     saveMessage()?.includes('⚠️') ? 'var(--warning-color)' :
                     'var(--success-color)',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1rem',
              border: `1px solid ${saveMessage()?.includes('❌') ? 'var(--danger-color)' :
                                   saveMessage()?.includes('⚠️') ? 'var(--warning-color)' :
                                   'var(--success-color)'}`
            }}>
              {saveMessage()}
            </div>
          </Show>

          {/* Configuration Selector */}
          <Show when={availableConfigs().length > 1 && !editMode()}>
            <div style={{
              'margin-bottom': '1.5rem',
              padding: '1rem',
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
                <label style={{
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  🔄 Cambiar Configuración:
                </label>
                <Show when={currentConfigId() !== systemActiveId()}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => makeActive(currentConfigId()!)}
                  >
                    ⭐ Hacer Activa
                  </Button>
                </Show>
                <Show when={currentConfigId() === systemActiveId()}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: 'var(--success-color)',
                    color: 'white',
                    'border-radius': '4px',
                    'font-size': '0.75rem',
                    'font-weight': '600'
                  }}>
                    ✓ ACTIVA EN SISTEMA
                  </span>
                </Show>
              </div>
              <select
                style={inputStyle}
                value={currentConfigId() || ''}
                onChange={(e) => switchConfiguration(e.currentTarget.value)}
              >
                <For each={availableConfigs()}>
                  {(config) => {
                    const configData = JSON.parse(config.data);
                    const isSystemActive = config.id === systemActiveId();
                    return (
                      <option value={config.id}>
                        {isSystemActive ? '⭐ ' : ''}{configData.offerName || config.id} ({configData.offerCode})
                      </option>
                    );
                  }}
                </For>
              </select>
              <Show when={systemActiveId()}>
                <div style={{
                  'margin-top': '0.5rem',
                  'font-size': '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  💡 La configuración activa se usa automáticamente en las facturas
                </div>
              </Show>
            </div>
          </Show>

          {/* Method & Category Selector */}
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '1rem',
            'margin-bottom': '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                'font-weight': '600',
                'margin-bottom': '0.5rem',
                'font-size': '0.875rem'
              }}>
                Método de Envío:
              </label>
              <select
                style={inputStyle}
                value={selectedMethod()}
                onChange={(e) => setSelectedMethod(e.currentTarget.value as ShippingMethod)}
              >
                <option value="maritime">🚢 Marítimo</option>
                <option value="air">✈️ Aéreo</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                'font-weight': '600',
                'margin-bottom': '0.5rem',
                'font-size': '0.875rem'
              }}>
                Categoría:
              </label>
              <select
                style={inputStyle}
                value={selectedCategory()}
                onChange={(e) => setSelectedCategory(e.currentTarget.value as ItemCategory)}
              >
                <option value="miscellaneous">📦 Misceláneas</option>
                <option value="durable">🔧 Duraderos</option>
                <option value="box_flat_rate">📐 Tarifa Plana (Cajas)</option>
              </select>
            </div>
          </div>

          {/* Weight Ranges Table */}
          <Show when={selectedCategory() !== 'box_flat_rate'}>
            <div style={{
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius-sm)',
              padding: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1rem'
              }}>
                <h3 style={{ 'font-weight': '600' }}>
                  Rangos de Peso y Precios
                </h3>
                <Show when={editMode()}>
                  <Button size="sm" variant="primary" onClick={addNewRange}>
                    ➕ Agregar Rango
                  </Button>
                </Show>
              </div>

              <div style={{ 'overflow-x': 'auto' }}>
                <table style={{
                  width: '100%',
                  'border-collapse': 'collapse',
                  background: 'white'
                }}>
                  <thead>
                    <tr style={{ 'background-color': 'var(--gray-100)' }}>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.875rem' }}>
                        Peso Min (lbs)
                      </th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.875rem' }}>
                        Peso Max (lbs)
                      </th>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.875rem' }}>
                        Precio/lb
                      </th>
                      <Show when={selectedCategory() === 'miscellaneous'}>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.875rem' }}>
                          Libras Gratis
                        </th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.875rem' }}>
                          Peso a Cobrar
                        </th>
                      </Show>
                      <Show when={selectedCategory() === 'durable'}>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.875rem' }}>
                          Arancel/lb
                        </th>
                      </Show>
                      <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.875rem' }}>
                        Descripción
                      </th>
                      <Show when={editMode()}>
                        <th style={{ padding: '0.75rem', 'text-align': 'center', 'font-size': '0.875rem' }}>
                          Acciones
                        </th>
                      </Show>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={getCurrentRanges()}>
                      {(range) => (
                        <tr style={{ 'border-bottom': '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <Show when={editMode()} fallback={range.min}>
                              <FormInput
                                type="number"
                                value={range.min}
                                onChange={(e) => updateRange(range.id!, 'min', parseFloat(e))}
                                style={{ ...inputStyle, width: '80px' }}
                                step="0.1"
                              />
                            </Show>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <Show when={editMode()} fallback={range.max}>
                              <FormInput
                                type="number"
                                value={range.max}
                                onChange={(e) => updateRange(range.id!, 'max', parseFloat(e))}
                                style={{ ...inputStyle, width: '80px' }}
                                step="0.1"
                              />
                            </Show>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <Show when={editMode()} fallback={`$${range.pricePerLb.toFixed(2)}`}>
                              <FormInput
                                type="number"
                                value={range.pricePerLb}
                                onChange={(e) => updateRange(range.id!, 'pricePerLb', parseFloat(e))}
                                style={{ ...inputStyle, width: '90px' }}
                                step="0.01"
                              />
                            </Show>
                          </td>
                          <Show when={selectedCategory() === 'miscellaneous'}>
                            <td style={{ padding: '0.75rem' }}>
                              <Show when={editMode()} fallback={range.freeWeight || '-'}>
                                <FormInput
                                  type="number"
                                  value={range.freeWeight || 0}
                                  onChange={(e) => updateRange(range.id!, 'freeWeight', parseFloat(e) || undefined)}
                                  style={{ ...inputStyle, width: '70px' }}
                                  step="0.1"
                                />
                              </Show>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <Show when={editMode()} fallback={range.needBePay || '-'}>
                                 <FormInput
                                  type="number"
                                  value={range.needBePay || 0}
                                  onChange={(e) => updateRange(range.id!, 'needBePay', parseFloat(e) || undefined)}
                                  style={{ ...inputStyle, width: '70px' }}
                                  step="0.1"
                                />
                              </Show>
                            </td>
                          </Show>
                          <Show when={selectedCategory() === 'durable'}>
                            <td style={{ padding: '0.75rem' }}>
                              <Show when={editMode()} fallback={`$${(range.tariffPerLb || 0).toFixed(2)}`}>
                                 <FormInput
                                  type="number"
                                  value={range.tariffPerLb || 0}
                                  onChange={(e) => updateRange(range.id!, 'tariffPerLb', parseFloat(e) || 0)}
                                  style={{ ...inputStyle, width: '80px' }}
                                  step="0.01"
                                />
                              </Show>
                            </td>
                          </Show>
                          <td style={{ padding: '0.75rem' }}>
                            <Show when={editMode()} fallback={range.description}>
                               <FormInput
                                type="text"
                                value={range.description || ''}
                                onChange={(e) => updateRange(range.id!, 'description', e)}
                                style={{ ...inputStyle, width: '200px' }}
                              />
                            </Show>
                          </td>
                          <Show when={editMode()}>
                            <td style={{ padding: '0.75rem', 'text-align': 'center' }}>
                              <button
                                onClick={() => deleteRange(range.id!)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'var(--danger-color)',
                                  color: 'white',
                                  border: 'none',
                                  'border-radius': 'var(--border-radius-sm)',
                                  cursor: 'pointer',
                                  'font-size': '0.75rem'
                                }}
                              >
                                🗑️
                              </button>
                            </td>
                          </Show>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>

          {/* Box Flat Rate Options */}
          <Show when={selectedCategory() === 'box_flat_rate'}>
            <div style={{
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius-sm)',
              padding: '1.5rem'
            }}>
              <h3 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>
                Opciones de Cajas (Tarifa Plana)
              </h3>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <For each={boxOptions()}>
                  {(box) => (
                    <div style={{
                      padding: '1rem',
                      background: 'white',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(4, 1fr)',
                        gap: '1rem',
                        'align-items': 'center'
                      }}>
                        <div>
                          <label style={{ display: 'block', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                            Tamaño
                          </label>
                          <Show when={editMode()} fallback={<strong>{box.size}</strong>}>
                            <input
                              type="text"
                              value={box.size}
                              style={inputStyle}
                              disabled
                            />
                          </Show>
                        </div>
                        <div>
                          <label style={{ display: 'block', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                            Precio
                          </label>
                          <Show when={editMode()} fallback={<strong>${box.price.toFixed(2)}</strong>}>
                            <input
                              type="number"
                              value={box.price}
                              style={inputStyle}
                              step="0.01"
                            />
                          </Show>
                        </div>
                        <div>
                          <label style={{ display: 'block', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                            Peso Máximo (lbs)
                          </label>
                          <Show when={editMode()} fallback={<strong>{box.maxWeight} lbs</strong>}>
                            <input
                              type="number"
                              value={box.maxWeight}
                              style={inputStyle}
                              step="1"
                            />
                          </Show>
                        </div>
                        <div>
                          <label style={{ display: 'block', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                            Descripción
                          </label>
                          <div style={{ 'font-size': '0.875rem' }}>
                            {box.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Info Panel */}
          <div style={{
            'margin-top': '1.5rem',
            padding: '1rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius-sm)',
            border: '1px solid var(--info-color)'
          }}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              ℹ️ Información
            </div>
            <ul style={{ margin: '0', 'padding-left': '1.5rem', 'font-size': '0.875rem' }}>
              <li>Las ofertas se aplican automáticamente al calcular precios en facturas</li>
              <li>Los rangos de peso determinan el precio por libra según el peso total</li>
              <li>Las "Libras Gratis" reducen el peso efectivo a cobrar</li>
              <li>Los cambios se reflejarán inmediatamente en nuevas facturas</li>
              <li>Los aranceles aplican solo a categoría "Duraderos"</li>
            </ul>
          </div>
          </Show>
        </div>
      </Card>

      {/* Print Preview */}
      <Show when={showPrintPreview()}>
        <div class="print-only">
          <div class="print-container">
            {/* Header */}
            <div class="print-header">
              <h1>YABA Express - Tarifas de Envío</h1>
              <div class="print-info">
                <div class="info-row">
                  <span class="label">Configuración:</span>
                  <span class="value">{currentConfigName()}</span>
                </div>
                <div class="info-row">
                  <span class="label">Código:</span>
                  <span class="value">{currentConfigCode()}</span>
                </div>
                <div class="info-row">
                  <span class="label">Fecha:</span>
                  <span class="value">{new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Maritime Section */}
            <div class="print-section">
              <div class="method-header maritime-header">
                <h2>🚢 ENVÍO MARÍTIMO</h2>
                <span class="delivery-time">Entrega: 6-8 semanas</span>
              </div>

              {/* Maritime Miscellaneous */}
              <Show when={maritimeMiscRanges().length > 0}>
                <div class="category-section">
                  <h3 class="category-title">📦 Misceláneos</h3>
                  <table class="offers-table">
                    <thead>
                      <tr>
                        <th>Peso (lbs)</th>
                        <th>Precio/lb</th>
                        <th>Lbs Gratis</th>
                        <th>Peso a Pagar</th>
                        <th>Precio Efectivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={maritimeMiscRanges()}>
                        {(range) => (
                          <tr>
                            <td>{range.min} - {range.max}</td>
                            <td class="price-col">${range.pricePerLb.toFixed(2)}</td>
                            <td class="center">{range.freeWeight || '—'}</td>
                            <td class="center">{range.needBePay || '—'}</td>
                            <td class="highlight-col">
                              {range.effectivePricePerLb ? `$${range.effectivePricePerLb.toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>

              {/* Maritime Durable */}
              <Show when={maritimeDurableRanges().length > 0}>
                <div class="category-section">
                  <h3 class="category-title">🔧 Duraderos</h3>
                  <table class="offers-table">
                    <thead>
                      <tr>
                        <th>Peso (lbs)</th>
                        <th>Precio/lb</th>
                        <th>Arancel/lb</th>
                        <th>Total/lb</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={maritimeDurableRanges()}>
                        {(range) => (
                          <tr>
                            <td>{range.min} - {range.max}</td>
                            <td class="price-col">${range.pricePerLb.toFixed(2)}</td>
                            <td class="tariff-col">${(range.tariffPerLb || 0).toFixed(2)}</td>
                            <td class="highlight-col">${(range.pricePerLb + (range.tariffPerLb || 0)).toFixed(2)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>

              {/* Box Flat Rate */}
              <Show when={boxOptions().length > 0}>
                <div class="category-section">
                  <h3 class="category-title">📐 Cajas Tarifa Plana</h3>
                  <table class="offers-table">
                    <thead>
                      <tr>
                        <th>Tamaño</th>
                        <th>Peso Máximo</th>
                        <th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={boxOptions()}>
                        {(box) => (
                          <tr>
                            <td class="box-size-col">{box.size}</td>
                            <td class="center">{box.maxWeight} lbs</td>
                            <td class="highlight-col">${box.price.toFixed(2)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </div>

            {/* Air Section */}
            <div class="print-section">
              <div class="method-header air-header">
                <h2>✈️ ENVÍO AÉREO</h2>
                <span class="delivery-time">Entrega: 7-10 días</span>
              </div>

              {/* Air Miscellaneous */}
              <Show when={airMiscRanges().length > 0}>
                <div class="category-section">
                  <h3 class="category-title">📦 Misceláneos</h3>
                  <table class="offers-table">
                    <thead>
                      <tr>
                        <th>Peso (lbs)</th>
                        <th>Precio/lb</th>
                        <th>Lbs Gratis</th>
                        <th>Peso a Pagar</th>
                        <th>Precio Efectivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={airMiscRanges()}>
                        {(range) => (
                          <tr>
                            <td>{range.min} - {range.max}</td>
                            <td class="price-col">${range.pricePerLb.toFixed(2)}</td>
                            <td class="center">{range.freeWeight || '—'}</td>
                            <td class="center">{range.needBePay || '—'}</td>
                            <td class="highlight-col">
                              {range.effectivePricePerLb ? `$${range.effectivePricePerLb.toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>

              {/* Air Durable */}
              <Show when={airDurableRanges().length > 0}>
                <div class="category-section">
                  <h3 class="category-title">🔧 Duraderos</h3>
                  <table class="offers-table">
                    <thead>
                      <tr>
                        <th>Peso (lbs)</th>
                        <th>Precio/lb</th>
                        <th>Arancel/lb</th>
                        <th>Total/lb</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={airDurableRanges()}>
                        {(range) => (
                          <tr>
                            <td>{range.min} - {range.max}</td>
                            <td class="price-col">${range.pricePerLb.toFixed(2)}</td>
                            <td class="tariff-col">${(range.tariffPerLb || 0).toFixed(2)}</td>
                            <td class="highlight-col">${(range.pricePerLb + (range.tariffPerLb || 0)).toFixed(2)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </div>

            {/* Footer */}
            <div class="print-footer">
              <p class="footer-text">
                Todos los precios en USD • Promociones aplicadas automáticamente •
                Tiempos de entrega estimados • Precios sujetos a cambio
              </p>
              <p class="footer-company"><strong>YABA Express</strong></p>
            </div>
          </div>

          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }

              .print-only,
              .print-only * {
                visibility: visible !important;
              }

              .print-only {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }

              @page {
                margin: 20mm;
                size: A4;
              }
            }

            .print-container {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background: white;
              color: #000;
            }

            .print-header {
              text-align: center;
              border-bottom: 3px solid #1a73e8;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }

            .print-header h1 {
              color: #1a73e8;
              font-size: 28px;
              margin: 0 0 15px 0;
              font-weight: bold;
            }

            .print-info {
              display: flex;
              justify-content: center;
              gap: 30px;
              flex-wrap: wrap;
            }

            .info-row {
              font-size: 13px;
            }

            .info-row .label {
              font-weight: bold;
              color: #555;
            }

            .info-row .value {
              color: #000;
              margin-left: 5px;
            }

            .print-section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }

            .method-header {
              padding: 12px 15px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-radius: 5px;
            }

            .maritime-header {
              background: #1e3a8a;
              color: white;
            }

            .air-header {
              background: #7c3aed;
              color: white;
            }

            .method-header h2 {
              margin: 0;
              font-size: 20px;
              font-weight: bold;
            }

            .delivery-time {
              font-size: 12px;
              opacity: 0.9;
            }

            .category-section {
              margin-bottom: 20px;
            }

            .category-title {
              color: #1a73e8;
              font-size: 16px;
              margin: 0 0 10px 0;
              padding-left: 8px;
              border-left: 3px solid #1a73e8;
              font-weight: bold;
            }

            .offers-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              font-size: 13px;
            }

            .offers-table thead {
              background: #f5f5f5;
            }

            .offers-table th {
              padding: 10px 8px;
              text-align: left;
              font-weight: bold;
              color: #333;
              border: 1px solid #ddd;
            }

            .offers-table td {
              padding: 8px;
              border: 1px solid #ddd;
            }

            .offers-table tbody tr:nth-child(even) {
              background: #fafafa;
            }

            .price-col {
              color: #1a73e8;
              font-weight: bold;
            }

            .tariff-col {
              color: #ea4335;
            }

            .highlight-col {
              background: #e8f5e9;
              color: #2e7d32;
              font-weight: bold;
            }

            .center {
              text-align: center;
            }

            .box-size-col {
              font-weight: bold;
            }

            .print-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #ddd;
              text-align: center;
            }

            .footer-text {
              font-size: 11px;
              color: #666;
              margin: 5px 0;
            }

            .footer-company {
              font-size: 14px;
              color: #1a73e8;
              margin: 10px 0 0 0;
            }
          `}</style>
        </div>
      </Show>
    </div>
  );
};

export default YabaOffersManager;
