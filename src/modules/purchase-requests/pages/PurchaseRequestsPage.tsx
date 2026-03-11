import { Component, createSignal, onMount, Show } from 'solid-js';
import { Layout } from '../../ui';
import { useTranslation } from '../../../translations';
import PurchaseRequestList from '../components/PurchaseRequestList';
import PurchaseRequestForm from '../components/PurchaseRequestForm';
import PurchaseRequestStatusManager from '../components/PurchaseRequestStatus';
import { 
  PurchaseRequest, 
  CreatePurchaseRequestInput, 
  UpdatePurchaseRequestInput,
  PurchaseRequestStatus 
} from '../types/purchaseRequestTypes';

// Sample data for demonstration
const sampleRequests: PurchaseRequest[] = [
  {
    id: '1',
    requestNumber: 'PR-001',
    customerId: 'CUST-001',
    customerName: 'María González',
    customerPhone: '+1 (809) 555-1234',
    customerEmail: 'maria@email.com',
    customerAddress: 'Calle Principal #123, Santo Domingo',
    itemTitle: 'Wireless Bluetooth Headphones',
    itemDescription: 'Color: Black, Size: One Size',
    itemUrl: 'https://temu.com/wireless-headphones-123',
    itemPrice: 29.99,
    itemCurrency: 'USD',
    platform: 'temu',
    quantity: 1,
    status: 'pending',
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date().toISOString(),
        updatedBy: 'Sistema',
        notes: 'Solicitud creada por el cliente'
      }
    ],
    totalCost: 29.99,
    paid: false,
    requestDate: new Date().toISOString(),
    createdBy: 'maria@email.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    requestNumber: 'PR-002',
    customerId: 'CUST-002',
    customerName: 'Carlos Rodríguez',
    customerPhone: '+1 (829) 987-6543',
    customerAddress: 'Av. Winston Churchill #456, Piantini',
    itemTitle: 'Summer Dress Collection',
    itemDescription: 'Size: M, Color: Blue',
    itemUrl: 'https://shein.com/summer-dress-collection',
    itemPrice: 45.50,
    itemCurrency: 'USD',
    platform: 'shein',
    quantity: 2,
    status: 'purchased',
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        updatedBy: 'Sistema',
        notes: 'Solicitud creada'
      },
      {
        status: 'quote_sent',
        timestamp: new Date(Date.now() - 72000000).toISOString(),
        updatedBy: 'Admin',
        notes: 'Cotización enviada al cliente'
      },
      {
        status: 'approved',
        timestamp: new Date(Date.now() - 36000000).toISOString(),
        updatedBy: 'Cliente',
        notes: 'Cliente aprobó la cotización'
      },
      {
        status: 'purchased',
        timestamp: new Date().toISOString(),
        updatedBy: 'Admin',
        notes: 'Artículo comprado en SHEIN'
      }
    ],
    totalCost: 91.00,
    deliveryCost: 15.00,
    finalTotal: 106.00,
    paid: true,
    paymentMethod: 'Transferencia',
    weight: 0.8,
    trackingNumber: 'SH123456789',
    requestDate: new Date(Date.now() - 86400000).toISOString(),
    purchaseDate: new Date().toISOString(),
    createdBy: 'carlos@email.com',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    requestNumber: 'PR-003',
    customerId: 'CUST-003',
    customerName: 'Ana Martínez',
    customerPhone: '+1 (849) 123-4567',
    customerAddress: 'Calle 27 de Febrero #789, Villa Mella',
    itemTitle: 'Smart Phone Case with Stand',
    itemUrl: 'https://amazon.com/phone-case-stand',
    itemPrice: 15.99,
    itemCurrency: 'USD',
    platform: 'amazon',
    quantity: 1,
    status: 'delivered',
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        updatedBy: 'Sistema',
        notes: 'Solicitud creada'
      },
      {
        status: 'purchased',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        updatedBy: 'Admin',
        notes: 'Comprado en Amazon'
      },
      {
        status: 'shipped_to_us',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        updatedBy: 'Sistema',
        notes: 'Enviado a nuestro almacén'
      },
      {
        status: 'received',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        updatedBy: 'Almacén',
        notes: 'Recibido en almacén'
      },
      {
        status: 'shipped_to_customer',
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        updatedBy: 'Admin',
        notes: 'Enviado al cliente'
      },
      {
        status: 'delivered',
        timestamp: new Date().toISOString(),
        updatedBy: 'Cliente',
        notes: 'Entregado exitosamente'
      }
    ],
    totalCost: 15.99,
    deliveryCost: 10.00,
    finalTotal: 25.99,
    paid: true,
    paymentMethod: 'Efectivo',
    weight: 0.2,
    trackingNumber: 'AMZ987654321',
    requestDate: new Date(Date.now() - 259200000).toISOString(),
    purchaseDate: new Date(Date.now() - 172800000).toISOString(),
    deliveryDate: new Date().toISOString(),
    createdBy: 'ana@email.com',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const PurchaseRequestsPage: Component = () => {
  const { t } = useTranslation();
  
  const [requests, setRequests] = createSignal<PurchaseRequest[]>(sampleRequests);
  const [filteredRequests, setFilteredRequests] = createSignal<PurchaseRequest[]>(sampleRequests);
  const [selectedRequest, setSelectedRequest] = createSignal<PurchaseRequest | null>(null);
  const [editingRequest, setEditingRequest] = createSignal<PurchaseRequest | null>(null);
  
  // Modal states
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [showEditForm, setShowEditForm] = createSignal(false);
  const [showStatusManager, setShowStatusManager] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  
  // Stats
  const getStats = () => {
    const allRequests = requests();
    const totalRequests = allRequests.length;
    const pendingRequests = allRequests.filter(r => ['pending', 'quote_sent', 'approved'].includes(r.status)).length;
    const activeRequests = allRequests.filter(r => ['purchasing', 'purchased', 'processing', 'shipped_to_us', 'received', 'ready_to_ship', 'shipped_to_customer'].includes(r.status)).length;
    const deliveredRequests = allRequests.filter(r => r.status === 'delivered').length;
    const totalRevenue = allRequests.filter(r => r.paid).reduce((sum, r) => sum + (r.finalTotal || r.totalCost), 0);
    const unpaidAmount = allRequests.filter(r => !r.paid).reduce((sum, r) => sum + (r.finalTotal || r.totalCost), 0);
    
    return {
      totalRequests,
      pendingRequests,
      activeRequests,
      deliveredRequests,
      totalRevenue,
      unpaidAmount
    };
  };
  
  // Handle request selection
  const handleRequestSelect = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setShowStatusManager(true);
  };
  
  // Handle create request
  const handleCreateRequest = async (data: CreatePurchaseRequestInput) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newRequest: PurchaseRequest = {
        id: Date.now().toString(),
        requestNumber: `PR-${String(requests().length + 1).padStart(3, '0')}`,
        customerId: `CUST-${Date.now()}`,
        ...data,
        status: 'pending',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date().toISOString(),
            updatedBy: 'Sistema',
            notes: 'Solicitud creada'
          }
        ],
        totalCost: data.itemPrice * data.quantity,
        paid: false,
        requestDate: new Date().toISOString(),
        createdBy: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setRequests(prev => [newRequest, ...prev]);
      console.log('Purchase request created:', newRequest);
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle update request
  const handleUpdateRequest = async (data: UpdatePurchaseRequestInput) => {
    if (!editingRequest()) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRequests(prev => prev.map(request => 
        request.id === editingRequest()!.id 
          ? { ...request, ...data, updatedAt: new Date().toISOString() }
          : request
      ));
      
      console.log('Purchase request updated:', data);
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle status update
  const handleStatusUpdate = async (requestId: string, newStatus: PurchaseRequestStatus, notes?: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRequests(prev => prev.map(request => {
        if (request.id === requestId) {
          const newHistoryItem = {
            status: newStatus,
            timestamp: new Date().toISOString(),
            updatedBy: 'Admin',
            notes: notes || ''
          };
          
          return {
            ...request,
            status: newStatus,
            statusHistory: [...(request.statusHistory || []), newHistoryItem],
            updatedAt: new Date().toISOString()
          };
        }
        return request;
      }));
      
      console.log('Status updated:', { requestId, newStatus, notes });
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle weight update
  const handleWeightUpdate = async (requestId: string, weight: number, deliveryCost: number) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRequests(prev => prev.map(request => {
        if (request.id === requestId) {
          const finalTotal = request.totalCost + deliveryCost;
          return {
            ...request,
            weight,
            deliveryCost,
            finalTotal,
            updatedAt: new Date().toISOString()
          };
        }
        return request;
      }));
      
      console.log('Weight updated:', { requestId, weight, deliveryCost });
    } catch (error) {
      console.error('Error updating weight:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const stats = getStats();
  
  return (
    <Layout title="Solicitudes de Compra">
      <div style={{ padding: '1rem' }}>
        {/* Header */}
        <div style={{ 
          'margin-bottom': '2rem',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <div>
            <h1 style={{ 
              'font-size': '1.5rem',
              'font-weight': '600',
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0'
            }}>
              Gestión de Solicitudes de Compra
            </h1>
            <p style={{ 
              color: 'var(--text-muted)',
              margin: '0'
            }}>
              Rastrea pedidos de clientes desde Temu, SHEIN, Amazon, Walmart y más
            </p>
          </div>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-weight': '500'
            }}
            onClick={() => setShowCreateForm(true)}
          >
            + Nueva Solicitud
          </button>
        </div>
        
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          'margin-bottom': '2rem'
        }}>
          <div style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            padding: '1.5rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: 'var(--primary-color)' }}>
              {stats.totalRequests}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Total Solicitudes
            </div>
          </div>
          
          <div style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            padding: '1.5rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#ffc107' }}>
              {stats.pendingRequests}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Pendientes
            </div>
          </div>
          
          <div style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            padding: '1.5rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#17a2b8' }}>
              {stats.activeRequests}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              En Proceso
            </div>
          </div>
          
          <div style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            padding: '1.5rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#28a745' }}>
              {stats.deliveredRequests}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Entregados
            </div>
          </div>
          
          <div style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            padding: '1.5rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#198754' }}>
              ${stats.totalRevenue.toFixed(2)}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Ingresos Totales
            </div>
          </div>
          
          <div style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            padding: '1.5rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#dc3545' }}>
              ${stats.unpaidAmount.toFixed(2)}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Por Cobrar
            </div>
          </div>
        </div>
        
        {/* Purchase Requests List */}
        <PurchaseRequestList
          requests={requests()}
          onFilterChange={setFilteredRequests}
          onRequestSelect={handleRequestSelect}
        />
        
        {/* Create Request Modal */}
        <PurchaseRequestForm
          isOpen={showCreateForm()}
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateRequest}
          isLoading={isLoading()}
        />
        
        {/* Edit Request Modal */}
        <PurchaseRequestForm
          isOpen={showEditForm()}
          onClose={() => {
            setShowEditForm(false);
            setEditingRequest(null);
          }}
          onSubmit={handleUpdateRequest}
          editingRequest={editingRequest()}
          isLoading={isLoading()}
        />
        
        {/* Status Manager Modal */}
        <PurchaseRequestStatusManager
          isOpen={showStatusManager()}
          onClose={() => {
            setShowStatusManager(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest()}
          onStatusUpdate={handleStatusUpdate}
          onWeightUpdate={handleWeightUpdate}
          isLoading={isLoading()}
        />
      </div>
    </Layout>
  );
};

export default PurchaseRequestsPage;