import { Component, createSignal, Show, For } from 'solid-js';
import { Modal, Button, FormInput, Card } from '../../ui';
import { useTranslation } from '../../../translations';
import { 
  PurchaseRequest, 
  CreatePurchaseRequestInput, 
  UpdatePurchaseRequestInput,
  PURCHASE_REQUEST_STATUSES,
  PLATFORMS 
} from '../types/purchaseRequestTypes';
import { productInfoService, ProductInfo } from '../services/productInfoService';

interface PurchaseRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePurchaseRequestInput | UpdatePurchaseRequestInput) => Promise<void>;
  editingRequest?: PurchaseRequest | null;
  isLoading?: boolean;
}

const PurchaseRequestForm: Component<PurchaseRequestFormProps> = (props) => {
  const { t } = useTranslation();
  
  // Form state
  const [formData, setFormData] = createSignal<CreatePurchaseRequestInput>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    itemTitle: '',
    itemDescription: '',
    itemUrl: '',
    itemPrice: 0,
    itemCurrency: 'USD',
    platform: 'other',
    quantity: 1,
    notes: ''
  });
  
  // Update form state
  const [updateData, setUpdateData] = createSignal<UpdatePurchaseRequestInput>({
    weight: 0,
    deliveryCost: 0,
    totalCost: 0,
    paid: false,
    paymentMethod: '',
    trackingNumber: '',
    estimatedDelivery: '',
    notes: '',
    internalNotes: ''
  });
  
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [isFetchingProduct, setIsFetchingProduct] = createSignal(false);
  const [productFetchError, setProductFetchError] = createSignal('');
  const [fetchedProductInfo, setFetchedProductInfo] = createSignal<ProductInfo | null>(null);
  
  // Initialize form data when editing
  const initializeForm = () => {
    if (props.editingRequest) {
      const request = props.editingRequest;
      setFormData({
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        customerEmail: request.customerEmail || '',
        customerAddress: request.customerAddress,
        itemTitle: request.itemTitle,
        itemDescription: request.itemDescription || '',
        itemUrl: request.itemUrl,
        itemPrice: request.itemPrice,
        itemCurrency: request.itemCurrency,
        platform: request.platform,
        quantity: request.quantity,
        notes: request.notes || ''
      });
      
      setUpdateData({
        weight: request.weight || 0,
        deliveryCost: request.deliveryCost || 0,
        totalCost: request.totalCost,
        paid: request.paid,
        paymentMethod: request.paymentMethod || '',
        trackingNumber: request.trackingNumber || '',
        estimatedDelivery: request.estimatedDelivery || '',
        notes: request.notes || '',
        internalNotes: request.internalNotes || ''
      });
    }
  };
  
  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const data = formData();
    
    if (!data.customerName.trim()) {
      newErrors.customerName = 'El nombre del cliente es requerido';
    }
    
    if (!data.customerPhone.trim()) {
      newErrors.customerPhone = 'El teléfono del cliente es requerido';
    }
    
    if (!data.customerAddress.trim()) {
      newErrors.customerAddress = 'La dirección del cliente es requerida';
    }
    
    if (!data.itemTitle.trim()) {
      newErrors.itemTitle = 'El título del artículo es requerido';
    }
    
    if (!data.itemUrl.trim()) {
      newErrors.itemUrl = 'La URL del artículo es requerida';
    } else if (!isValidUrl(data.itemUrl)) {
      newErrors.itemUrl = 'Ingrese una URL válida';
    }
    
    if (data.itemPrice <= 0) {
      newErrors.itemPrice = 'El precio debe ser mayor a 0';
    }
    
    if (data.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  // Auto-detect platform from URL
  const detectPlatformFromUrl = (url: string) => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('temu.com')) return 'temu';
    if (urlLower.includes('shein.com')) return 'shein';
    if (urlLower.includes('amazon.com')) return 'amazon';
    if (urlLower.includes('walmart.com')) return 'walmart';
    return 'other';
  };
  
  // Handle URL change to auto-detect platform and fetch product info
  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({
      ...prev,
      itemUrl: url,
      platform: detectPlatformFromUrl(url)
    }));
    
    // Clear previous errors
    setProductFetchError('');
    
    // Auto-fetch product info if URL is valid
    if (url && isValidUrl(url)) {
      setIsFetchingProduct(true);
      try {
        const productInfo = await productInfoService.getProductInfo(url);
        
        // Store the fetched product info
        setFetchedProductInfo(productInfo);
        
        // Auto-fill form fields with fetched data
        setFormData(prev => ({
          ...prev,
          itemTitle: productInfo.title || prev.itemTitle,
          itemPrice: productInfo.price ? parseFloat(productInfo.price.replace(/[^\d.]/g, '')) : prev.itemPrice,
          itemCurrency: productInfo.currency || prev.itemCurrency,
          itemDescription: productInfo.description || prev.itemDescription
        }));
        
        console.log('Product info fetched:', productInfo);
      } catch (error) {
        console.error('Error fetching product info:', error);
        setProductFetchError('No se pudo obtener información del producto automáticamente');
      } finally {
        setIsFetchingProduct(false);
      }
    }
  };
  
  // Calculate delivery cost based on weight
  const calculateDeliveryCost = (weight: number) => {
    const baseRate = 5; // $5 per kg
    const minimumCost = 10; // Minimum $10
    return Math.max(weight * baseRate, minimumCost);
  };
  
  // Handle weight change to auto-calculate delivery cost
  const handleWeightChange = (weight: number) => {
    const deliveryCost = calculateDeliveryCost(weight);
    setUpdateData(prev => ({
      ...prev,
      weight,
      deliveryCost
    }));
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (props.editingRequest) {
        // Update existing request
        await props.onSubmit(updateData());
      } else {
        // Create new request
        await props.onSubmit(formData());
      }
      
      handleClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };
  
  const handleClose = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      itemTitle: '',
      itemDescription: '',
      itemUrl: '',
      itemPrice: 0,
      itemCurrency: 'USD',
      platform: 'other',
      quantity: 1,
      notes: ''
    });
    setUpdateData({
      weight: 0,
      deliveryCost: 0,
      totalCost: 0,
      paid: false,
      paymentMethod: '',
      trackingNumber: '',
      estimatedDelivery: '',
      notes: '',
      internalNotes: ''
    });
    setErrors({});
    setFetchedProductInfo(null);
    setProductFetchError('');
    props.onClose();
  };
  
  // Initialize form when opening for edit
  if (props.isOpen && props.editingRequest) {
    initializeForm();
  }
  
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title={props.editingRequest ? `Actualizar Solicitud ${props.editingRequest.requestNumber}` : 'Nueva Solicitud de Compra'}
      size="large"
    >
      <div style={{ 
        display: 'grid',
        'grid-template-columns': props.editingRequest ? '1fr 1fr' : '1fr',
        gap: '2rem',
        'max-height': '70vh',
        overflow: 'auto',
        padding: '1rem'
      }}>
        
        {/* Basic Information (always shown) */}
        <div>
          <h3 style={{ 'margin-bottom': '1rem', color: 'var(--primary-color)' }}>
            Información del Cliente
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <FormInput
              label="Nombre del Cliente *"
              value={formData().customerName}
              onChange={(value) => setFormData(prev => ({ ...prev, customerName: value }))}
              error={errors().customerName}
              placeholder="Nombre completo del cliente"
            />
            
            <FormInput
              label="Teléfono *"
              value={formData().customerPhone}
              onChange={(value) => setFormData(prev => ({ ...prev, customerPhone: value }))}
              error={errors().customerPhone}
              placeholder="+1 (809) 555-1234"
            />
            
            <FormInput
              label="Email"
              type="email"
              value={formData().customerEmail}
              onChange={(value) => setFormData(prev => ({ ...prev, customerEmail: value }))}
              placeholder="cliente@email.com"
            />
            
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'font-weight': '500' 
              }}>
                Dirección *
              </label>
              <textarea
                value={formData().customerAddress}
                onInput={(e) => setFormData(prev => ({ ...prev, customerAddress: e.currentTarget.value }))}
                placeholder="Dirección completa del cliente"
                style={{
                  width: '100%',
                  'min-height': '80px',
                  padding: '0.75rem',
                  border: `1px solid ${errors().customerAddress ? 'var(--error-color)' : 'var(--border-color)'}`,
                  'border-radius': 'var(--border-radius)',
                  'font-family': 'inherit',
                  resize: 'vertical'
                }}
              />
              <Show when={errors().customerAddress}>
                <div style={{ color: 'var(--error-color)', 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
                  {errors().customerAddress}
                </div>
              </Show>
            </div>
          </div>
          
          <h3 style={{ 'margin-top': '2rem', 'margin-bottom': '1rem', color: 'var(--primary-color)' }}>
            Información del Artículo
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <FormInput
                label="URL del Artículo *"
                value={formData().itemUrl}
                onChange={handleUrlChange}
                error={errors().itemUrl}
                placeholder="https://temu.com/producto..."
                disabled={isFetchingProduct()}
              />
              <Show when={isFetchingProduct()}>
                <div style={{ 
                  'margin-top': '0.5rem', 
                  'font-size': '0.875rem', 
                  color: 'var(--primary-color)' 
                }}>
                  🔄 Obteniendo información del producto...
                </div>
              </Show>
              <Show when={productFetchError()}>
                <div style={{ 
                  'margin-top': '0.5rem', 
                  'font-size': '0.875rem', 
                  color: 'var(--warning-color)' 
                }}>
                  ⚠️ {productFetchError()}
                </div>
              </Show>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'font-weight': '500' 
              }}>
                Plataforma
              </label>
              <select
                value={formData().platform}
                onChange={(e) => setFormData(prev => ({ ...prev, platform: e.currentTarget.value as any }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius)',
                  background: 'var(--surface-color)'
                }}
              >
                <For each={PLATFORMS}>
                  {(platform) => <option value={platform.value}>{platform.label}</option>}
                </For>
              </select>
            </div>
            
            <FormInput
              label="Título del Artículo *"
              value={formData().itemTitle}
              onChange={(value) => setFormData(prev => ({ ...prev, itemTitle: value }))}
              error={errors().itemTitle}
              placeholder="Descripción del artículo"
            />
            
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'font-weight': '500' 
              }}>
                Descripción Adicional
              </label>
              <textarea
                value={formData().itemDescription}
                onInput={(e) => setFormData(prev => ({ ...prev, itemDescription: e.currentTarget.value }))}
                placeholder="Detalles adicionales del artículo (color, talla, etc.)"
                style={{
                  width: '100%',
                  'min-height': '60px',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius)',
                  'font-family': 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem' }}>
              <FormInput
                label="Precio *"
                type="number"
                step="0.01"
                min="0"
                value={formData().itemPrice.toString()}
                onChange={(value) => setFormData(prev => ({ ...prev, itemPrice: parseFloat(value) || 0 }))}
                error={errors().itemPrice}
              />
              
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.5rem', 
                  'font-weight': '500' 
                }}>
                  Moneda
                </label>
                <select
                  value={formData().itemCurrency}
                  onChange={(e) => setFormData(prev => ({ ...prev, itemCurrency: e.currentTarget.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius)',
                    background: 'var(--surface-color)'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="DOP">DOP</option>
                </select>
              </div>
              
              <FormInput
                label="Cantidad *"
                type="number"
                min="1"
                value={formData().quantity.toString()}
                onChange={(value) => setFormData(prev => ({ ...prev, quantity: parseInt(value) || 1 }))}
                error={errors().quantity}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                'margin-bottom': '0.5rem', 
                'font-weight': '500' 
              }}>
                Notas
              </label>
              <textarea
                value={formData().notes}
                onInput={(e) => setFormData(prev => ({ ...prev, notes: e.currentTarget.value }))}
                placeholder="Notas adicionales o instrucciones especiales"
                style={{
                  width: '100%',
                  'min-height': '60px',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius)',
                  'font-family': 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
          
          {/* Product Preview Section */}
          <Show when={fetchedProductInfo()}>
            <div style={{ 
              'margin-top': '2rem', 
              'padding-top': '1.5rem',
              'border-top': '1px solid var(--border-color)'
            }}>
              <h4 style={{ 
                'margin-bottom': '1rem', 
                color: 'var(--primary-color)',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                🔍 Vista previa del producto
              </h4>
              
              <div style={{ 
                display: 'grid',
                'grid-template-columns': 'auto 1fr',
                gap: '1rem',
                background: 'var(--background-color)',
                padding: '1rem',
                'border-radius': 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}>
                {/* Product Image */}
                <Show when={fetchedProductInfo()?.image}>
                  <div style={{ width: '120px' }}>
                    <img
                      src={fetchedProductInfo()!.image}
                      alt="Product preview"
                      style={{
                        width: '100%',
                        height: '120px',
                        'object-fit': 'cover',
                        'border-radius': 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </Show>
                
                {/* Product Details */}
                <div style={{ 'min-width': '0' }}>
                  <Show when={fetchedProductInfo()?.title}>
                    <div style={{ 'margin-bottom': '0.5rem' }}>
                      <div style={{ 
                        'font-size': '0.75rem', 
                        color: 'var(--text-muted)',
                        'margin-bottom': '0.25rem'
                      }}>
                        Título:
                      </div>
                      <div style={{ 
                        'font-weight': '500',
                        'line-height': '1.3'
                      }}>
                        {fetchedProductInfo()!.title}
                      </div>
                    </div>
                  </Show>
                  
                  <div style={{ 
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '0.75rem',
                    'margin-top': '0.75rem'
                  }}>
                    <Show when={fetchedProductInfo()?.price}>
                      <div>
                        <div style={{ 
                          'font-size': '0.75rem', 
                          color: 'var(--text-muted)'
                        }}>
                          Precio:
                        </div>
                        <div style={{ 
                          'font-weight': '600',
                          color: 'var(--success-color)',
                          'font-size': '1.1rem'
                        }}>
                          {fetchedProductInfo()!.currency || 'USD'} {fetchedProductInfo()!.price}
                        </div>
                      </div>
                    </Show>
                    
                    <Show when={fetchedProductInfo()?.brand}>
                      <div>
                        <div style={{ 
                          'font-size': '0.75rem', 
                          color: 'var(--text-muted)'
                        }}>
                          Marca:
                        </div>
                        <div style={{ 'font-weight': '500' }}>
                          {fetchedProductInfo()!.brand}
                        </div>
                      </div>
                    </Show>
                    
                    <Show when={fetchedProductInfo()?.availability}>
                      <div>
                        <div style={{ 
                          'font-size': '0.75rem', 
                          color: 'var(--text-muted)'
                        }}>
                          Disponibilidad:
                        </div>
                        <div style={{ 
                          'font-weight': '500',
                          color: fetchedProductInfo()!.availability?.toLowerCase().includes('stock') ? 'var(--success-color)' : 'var(--warning-color)'
                        }}>
                          {fetchedProductInfo()!.availability}
                        </div>
                      </div>
                    </Show>
                    
                    <div>
                      <div style={{ 
                        'font-size': '0.75rem', 
                        color: 'var(--text-muted)'
                      }}>
                        Plataforma:
                      </div>
                      <div style={{ 
                        'font-weight': '500',
                        'text-transform': 'uppercase',
                        color: 'var(--primary-color)'
                      }}>
                        {fetchedProductInfo()!.platform}
                      </div>
                    </div>
                  </div>
                  
                  <Show when={fetchedProductInfo()?.description}>
                    <div style={{ 'margin-top': '0.75rem' }}>
                      <div style={{ 
                        'font-size': '0.75rem', 
                        color: 'var(--text-muted)',
                        'margin-bottom': '0.25rem'
                      }}>
                        Descripción:
                      </div>
                      <div style={{ 
                        'font-size': '0.875rem',
                        'line-height': '1.4',
                        color: 'var(--text-secondary)',
                        'max-height': '60px',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis'
                      }}>
                        {fetchedProductInfo()!.description}
                      </div>
                    </div>
                  </Show>
                  
                  {/* Additional Images */}
                  <Show when={fetchedProductInfo()?.images && fetchedProductInfo()!.images!.length > 1}>
                    <div style={{ 'margin-top': '0.75rem' }}>
                      <div style={{ 
                        'font-size': '0.75rem', 
                        color: 'var(--text-muted)',
                        'margin-bottom': '0.5rem'
                      }}>
                        Imágenes adicionales:
                      </div>
                      <div style={{ 
                        display: 'flex',
                        gap: '0.5rem',
                        overflow: 'auto',
                        'max-width': '100%'
                      }}>
                        <For each={fetchedProductInfo()!.images!.slice(1, 5)}>
                          {(imageUrl) => (
                            <img
                              src={imageUrl}
                              alt="Additional product image"
                              style={{
                                width: '40px',
                                height: '40px',
                                'object-fit': 'cover',
                                'border-radius': 'var(--border-radius-sm)',
                                border: '1px solid var(--border-color)',
                                'flex-shrink': '0',
                                cursor: 'pointer'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                              onClick={() => {
                                // Could open larger image view
                                window.open(imageUrl, '_blank');
                              }}
                            />
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                  
                  {/* Action buttons */}
                  <div style={{ 
                    'margin-top': '1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    'flex-wrap': 'wrap'
                  }}>
                    <button
                      style={{
                        padding: '0.25rem 0.75rem',
                        'font-size': '0.75rem',
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        'border-radius': 'var(--border-radius-sm)',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(fetchedProductInfo()!.originalUrl, '_blank')}
                    >
                      🔗 Ver Original
                    </button>
                    
                    <button
                      style={{
                        padding: '0.25rem 0.75rem',
                        'font-size': '0.75rem',
                        background: 'var(--surface-color)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setFetchedProductInfo(null);
                        setProductFetchError('');
                      }}
                    >
                      ✕ Limpiar Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>
        
        {/* Update Information (only when editing) */}
        <Show when={props.editingRequest}>
          <div>
            <h3 style={{ 'margin-bottom': '1rem', color: 'var(--primary-color)' }}>
              Información de Actualización
            </h3>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                <FormInput
                  label="Peso (kg)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={updateData().weight?.toString() || ''}
                  onChange={(value) => handleWeightChange(parseFloat(value) || 0)}
                />
                
                <FormInput
                  label="Costo de Envío"
                  type="number"
                  step="0.01"
                  min="0"
                  value={updateData().deliveryCost?.toString() || ''}
                  onChange={(value) => setUpdateData(prev => ({ ...prev, deliveryCost: parseFloat(value) || 0 }))}
                />
              </div>
              
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                <FormInput
                  label="Costo Total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={updateData().totalCost?.toString() || ''}
                  onChange={(value) => setUpdateData(prev => ({ ...prev, totalCost: parseFloat(value) || 0 }))}
                />
                
                <FormInput
                  label="Método de Pago"
                  value={updateData().paymentMethod || ''}
                  onChange={(value) => setUpdateData(prev => ({ ...prev, paymentMethod: value }))}
                  placeholder="Efectivo, transferencia, etc."
                />
              </div>
              
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="paid"
                  checked={updateData().paid}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, paid: e.currentTarget.checked }))}
                />
                <label for="paid" style={{ 'font-weight': '500' }}>
                  Marcado como pagado
                </label>
              </div>
              
              <FormInput
                label="Número de Rastreo"
                value={updateData().trackingNumber || ''}
                onChange={(value) => setUpdateData(prev => ({ ...prev, trackingNumber: value }))}
                placeholder="Número de seguimiento del envío"
              />
              
              <FormInput
                label="Entrega Estimada"
                type="date"
                value={updateData().estimatedDelivery || ''}
                onChange={(value) => setUpdateData(prev => ({ ...prev, estimatedDelivery: value }))}
              />
              
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.5rem', 
                  'font-weight': '500' 
                }}>
                  Notas Internas
                </label>
                <textarea
                  value={updateData().internalNotes || ''}
                  onInput={(e) => setUpdateData(prev => ({ ...prev, internalNotes: e.currentTarget.value }))}
                  placeholder="Notas internas (no visibles para el cliente)"
                  style={{
                    width: '100%',
                    'min-height': '80px',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius)',
                    'font-family': 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>
        </Show>
      </div>
      
      {/* Form Actions */}
      <div style={{ 
        display: 'flex', 
        'justify-content': 'flex-end', 
        gap: '1rem', 
        'margin-top': '2rem',
        'border-top': '1px solid var(--border-color)',
        'padding-top': '1rem'
      }}>
        <Button variant="outline" onClick={handleClose} disabled={props.isLoading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={props.isLoading}>
          {props.isLoading ? 'Guardando...' : (props.editingRequest ? 'Actualizar' : 'Crear Solicitud')}
        </Button>
      </div>
    </Modal>
  );
};

export default PurchaseRequestForm;