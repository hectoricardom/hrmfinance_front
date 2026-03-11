import { createSignal, onMount, Show } from 'solid-js';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import type { Appointment, EventType, AvailabilitySettings } from '../types';
import { devLog } from '../../../services/utils';

/**
 * Ejemplo práctico de uso de la funcionalidad Firebase para citas
 * Este componente demuestra cómo usar todos los métodos Firebase disponibles
 */
export function FirebaseUsageExample() {
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal('');

  // Cargar datos al montar el componente
  onMount(async () => {
    const userId = authStore.currentUser?.uid;
    if (userId) {
      setLoading(true);
      setMessage('Cargando datos...');
      
      try {
        // Cargar todos los datos con Firebase
        await appointmentStore.loadAppointmentsFirebase(userId, true); // tiempo real habilitado
        await appointmentStore.loadEventTypesFirebase(userId, true); // tiempo real habilitado
        await appointmentStore.loadAvailabilityFirebase(userId);
        await appointmentStore.loadBookingPageSettingsFirebase(userId);
        
        setMessage('Datos cargados correctamente con Firebase');
      } catch (error) {
        devLog('Error loading data:', error);
        setMessage('Error cargando datos: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  });

  // Ejemplo: Crear un tipo de evento
  const createSampleEventType = async () => {
    setLoading(true);
    setMessage('Creando tipo de evento...');
    
    try {
      const eventTypeData = {
        name: 'Consulta Legal',
        description: 'Consulta legal personalizada de 60 minutos',
        duration: 60,
        color: '#3B82F6',
        isActive: true,
        location: 'Oficina Principal',
        locationType: 'in-person' as const,
        requiresApproval: false,
        reminderEnabled: true,
        createdBy: authStore.currentUser?.uid || ''
      };

      const eventTypeId = await appointmentStore.createEventTypeFirebase(eventTypeData);
      setMessage(`Tipo de evento creado con ID: ${eventTypeId}`);
    } catch (error) {
      devLog('Error creating event type:', error);
      setMessage('Error creando tipo de evento: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Ejemplo: Crear una cita
  const createSampleAppointment = async () => {
    const eventTypes = appointmentStore.state.eventTypes;
    if (eventTypes.length === 0) {
      setMessage('Primero crea un tipo de evento');
      return;
    }

    setLoading(true);
    setMessage('Creando cita...');
    
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // mañana
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hora

      const appointmentData = {
        eventTypeId: eventTypes[0].id,
        eventTypeName: eventTypes[0].name,
        hostId: authStore.currentUser?.uid || '',
        hostName: authStore.currentUser?.displayName || 'Usuario',
        hostEmail: authStore.currentUser?.email || '',
        guestName: 'Cliente de Ejemplo',
        guestEmail: 'cliente@example.com',
        guestPhone: '+1234567890',
        guestTimezone: 'America/Havana',
        startTime,
        endTime,
        duration: 60,
        timezone: 'America/Havana',
        status: 'pending' as const,
        location: 'Oficina Principal',
        locationType: 'in-person' as const,
        notes: 'Cita de ejemplo creada con Firebase'
      };

      const appointmentId = await appointmentStore.createAppointmentFirebase(appointmentData);
      setMessage(`Cita creada con ID: ${appointmentId}`);
    } catch (error) {
      devLog('Error creating appointment:', error);
      setMessage('Error creando cita: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Ejemplo: Configurar disponibilidad personalizada
  const setupCustomAvailability = async () => {
    setLoading(true);
    setMessage('Configurando disponibilidad...');
    
    try {
      const userId = authStore.currentUser?.uid;
      if (!userId) throw new Error('Usuario no autenticado');

      const customAvailability: AvailabilitySettings = {
        id: `${authStore.getBusinessId()}_${userId}`,
        userId: userId,
        timezone: 'America/Havana',
        weeklyAvailability: [
          {
            id: 'mon',
            dayOfWeek: 'monday',
            timeSlots: [{ start: '09:00', end: '17:00' }],
            isActive: true
          },
          {
            id: 'tue',
            dayOfWeek: 'tuesday',
            timeSlots: [{ start: '10:00', end: '16:00' }],
            isActive: true
          },
          {
            id: 'wed',
            dayOfWeek: 'wednesday',
            timeSlots: [{ start: '09:00', end: '17:00' }],
            isActive: true
          },
          {
            id: 'thu',
            dayOfWeek: 'thursday',
            timeSlots: [{ start: '10:00', end: '16:00' }],
            isActive: true
          },
          {
            id: 'fri',
            dayOfWeek: 'friday',
            timeSlots: [{ start: '09:00', end: '15:00' }],
            isActive: true
          },
          {
            id: 'sat',
            dayOfWeek: 'saturday',
            timeSlots: [],
            isActive: false
          },
          {
            id: 'sun',
            dayOfWeek: 'sunday',
            timeSlots: [],
            isActive: false
          }
        ],
        dateOverrides: [
          {
            id: 'holiday1',
            date: '2024-12-25',
            isAvailable: false,
            reason: 'Navidad'
          },
          {
            id: 'holiday2',
            date: '2024-01-01',
            isAvailable: false,
            reason: 'Año Nuevo'
          }
        ],
        minimumNotice: 24, // 24 horas de anticipación
        maximumAdvance: 90, // hasta 90 días de anticipación
        slotInterval: 30, // intervalos de 30 minutos
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await appointmentStore.saveAvailabilityFirebase(customAvailability);
      setMessage('Disponibilidad personalizada configurada');
    } catch (error) {
      devLog('Error setting up availability:', error);
      setMessage('Error configurando disponibilidad: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Ejemplo: Buscar citas por estado
  const searchAppointmentsByStatus = async () => {
    setLoading(true);
    setMessage('Buscando citas pendientes...');
    
    try {
      const pendingAppointments = await appointmentStore.getAppointmentsByStatusFirebase('pending');
      const confirmedAppointments = await appointmentStore.getAppointmentsByStatusFirebase('confirmed');
      
      setMessage(`Encontradas: ${pendingAppointments.length} pendientes, ${confirmedAppointments.length} confirmadas`);
    } catch (error) {
      devLog('Error searching appointments:', error);
      setMessage('Error buscando citas: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Ejemplo: Buscar citas por rango de fechas
  const searchAppointmentsByDateRange = async () => {
    setLoading(true);
    setMessage('Buscando citas de este mes...');
    
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const appointments = await appointmentStore.getAppointmentsByDateRangeFirebase(startOfMonth, endOfMonth);
      setMessage(`Encontradas ${appointments.length} citas este mes`);
    } catch (error) {
      devLog('Error searching appointments by date:', error);
      setMessage('Error buscando citas por fecha: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Ejemplo: Crear múltiples citas (batch)
  const createBatchAppointments = async () => {
    const eventTypes = appointmentStore.state.eventTypes;
    if (eventTypes.length === 0) {
      setMessage('Primero crea un tipo de evento');
      return;
    }

    setLoading(true);
    setMessage('Creando múltiples citas...');
    
    try {
      const now = new Date();
      const appointmentsData = [
        {
          eventTypeId: eventTypes[0].id,
          eventTypeName: eventTypes[0].name,
          hostId: authStore.currentUser?.uid || '',
          hostName: authStore.currentUser?.displayName || 'Usuario',
          hostEmail: authStore.currentUser?.email || '',
          guestName: 'Cliente 1',
          guestEmail: 'cliente1@example.com',
          guestTimezone: 'America/Havana',
          startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 25 * 60 * 60 * 1000),
          duration: 60,
          timezone: 'America/Havana',
          status: 'pending' as const,
          location: 'Oficina',
          locationType: 'in-person' as const
        },
        {
          eventTypeId: eventTypes[0].id,
          eventTypeName: eventTypes[0].name,
          hostId: authStore.currentUser?.uid || '',
          hostName: authStore.currentUser?.displayName || 'Usuario',
          hostEmail: authStore.currentUser?.email || '',
          guestName: 'Cliente 2',
          guestEmail: 'cliente2@example.com',
          guestTimezone: 'America/Havana',
          startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 49 * 60 * 60 * 1000),
          duration: 60,
          timezone: 'America/Havana',
          status: 'pending' as const,
          location: 'Oficina',
          locationType: 'in-person' as const
        }
      ];

      const appointmentIds = await appointmentStore.batchCreateAppointments(appointmentsData);
      setMessage(`Creadas ${appointmentIds.length} citas en batch`);
    } catch (error) {
      devLog('Error creating batch appointments:', error);
      setMessage('Error creando citas en batch: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="p-6 max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Ejemplo de Uso - Firebase Appointments</h1>
      
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 class="text-lg font-semibold text-blue-800 mb-2">Estado de la Aplicación</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="font-medium">Citas:</span> {appointmentStore.state.appointments.length}
          </div>
          <div>
            <span class="font-medium">Tipos de Evento:</span> {appointmentStore.state.eventTypes.length}
          </div>
          <div>
            <span class="font-medium">Disponibilidad:</span> {appointmentStore.state.availability ? 'Configurada' : 'No configurada'}
          </div>
          <div>
            <span class="font-medium">Loading:</span> {appointmentStore.state.loading ? 'Sí' : 'No'}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Gestión de Tipos de Evento */}
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-3">Tipos de Evento</h3>
          <button 
            onClick={createSampleEventType}
            disabled={loading()}
            class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Crear Tipo de Evento
          </button>
        </div>

        {/* Gestión de Citas */}
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-3">Citas</h3>
          <div class="space-y-2">
            <button 
              onClick={createSampleAppointment}
              disabled={loading()}
              class="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Crear Cita
            </button>
            <button 
              onClick={createBatchAppointments}
              disabled={loading()}
              class="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Crear Citas (Batch)
            </button>
          </div>
        </div>

        {/* Disponibilidad */}
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-3">Disponibilidad</h3>
          <button 
            onClick={setupCustomAvailability}
            disabled={loading()}
            class="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
          >
            Configurar Disponibilidad
          </button>
        </div>

        {/* Búsquedas */}
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-3">Búsquedas</h3>
          <div class="space-y-2">
            <button 
              onClick={searchAppointmentsByStatus}
              disabled={loading()}
              class="w-full bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              Buscar por Estado
            </button>
            <button 
              onClick={searchAppointmentsByDateRange}
              disabled={loading()}
              class="w-full bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 disabled:opacity-50"
            >
              Buscar por Fecha
            </button>
          </div>
        </div>
      </div>

      {/* Estado y Mensajes */}
      <div class="bg-gray-50 border rounded-lg p-4">
        <h3 class="font-semibold mb-2">Estado</h3>
        <Show when={loading()}>
          <div class="flex items-center text-blue-600">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Cargando...
          </div>
        </Show>
        <Show when={message()}>
          <p class="text-sm text-gray-700">{message()}</p>
        </Show>
      </div>

      {/* Lista de Citas */}
      <Show when={appointmentStore.state.appointments.length > 0}>
        <div class="mt-6 bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-3">Citas Recientes</h3>
          <div class="space-y-2">
            {appointmentStore.state.appointments.slice(0, 5).map((appointment) => (
              <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div class="font-medium">{appointment.guestName}</div>
                  <div class="text-sm text-gray-600">{appointment.eventTypeName}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm">{new Date(appointment.startTime).toLocaleDateString()}</div>
                  <div class="text-xs text-gray-500">{appointment.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Show>

      {/* Lista de Tipos de Evento */}
      <Show when={appointmentStore.state.eventTypes.length > 0}>
        <div class="mt-6 bg-white border rounded-lg p-4">
          <h3 class="font-semibold mb-3">Tipos de Evento</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {appointmentStore.state.eventTypes.map((eventType) => (
              <div class="p-2 bg-gray-50 rounded">
                <div class="font-medium">{eventType.name}</div>
                <div class="text-sm text-gray-600">{eventType.duration} min - {eventType.locationType}</div>
              </div>
            ))}
          </div>
        </div>
      </Show>
    </div>
  );
}