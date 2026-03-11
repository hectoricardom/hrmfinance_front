import { Component, For, Show, createSignal, onMount } from 'solid-js';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';
import { sendWAmsg } from '../../passport/services/pdfSignatureIntegration';

// API Response type (raw format from API)
interface ApiAppointment {
  id: string;
  date: string; // "01/16/2026"
  startTime: string; // "11:00"
  duration: number;
  status: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceType: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  // Also support normalized fields
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  eventTypeName?: string;
  locationType?: string;
}

const AppointmentDashboard: Component = () => {
  const [view, setView] = createSignal<'upcoming' | 'past' | 'all'>('upcoming');
  const [displayMode, setDisplayMode] = createSignal<'list' | 'days'>('days'); // New: toggle between list and days view
  const [selectedAppointment, setSelectedAppointment] = createSignal<ApiAppointment | null>(null);
  const [showCancelModal, setShowCancelModal] = createSignal(false);
  const [cancellationReason, setCancellationReason] = createSignal('');
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [creating, setCreating] = createSignal(false);
  const [timeConflict, setTimeConflict] = createSignal<ApiAppointment | null>(null);
  const [newAppointment, setNewAppointment] = createSignal({
    clientName: '',
    clientPhone: '',
    date: '',
    startTime: '',
    duration: 30,
    serviceType: '',
    notes: ''
  });

  // WhatsApp reminder state
  const [sendingWhatsApp, setSendingWhatsApp] = createSignal<string | null>(null); // appointment id being sent

  // Edit modal state
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [editingAppointment, setEditingAppointment] = createSignal<ApiAppointment | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [editForm, setEditForm] = createSignal({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    date: '',
    startTime: '',
    duration: 30,
    notes: ''
  });

  // Open edit modal
  const openEditModal = (appointment: ApiAppointment) => {
    setEditingAppointment(appointment);
    // Parse date from MM/DD/YYYY to YYYY-MM-DD for input
    let dateValue = '';
    if (appointment.date) {
      const [month, day, year] = appointment.date.split('/');
      dateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    setEditForm({
      clientName: getClientName(appointment),
      clientPhone: getClientPhone(appointment) || '',
      clientEmail: getClientEmail(appointment) || '',
      date: dateValue,
      startTime: appointment.startTime || '',
      duration: appointment.duration || 30,
      notes: appointment.notes || ''
    });
    setShowEditModal(true);
  };

  // Save edited appointment
  const handleSaveEdit = async () => {
    const apt = editingAppointment();
    if (!apt) return;

    setSaving(true);
    try {
      // Convert date back to MM/DD/YYYY format for API
      let dateForApi = '';
      if (editForm().date) {
        const [year, month, day] = editForm().date.split('-');
        dateForApi = `${month}/${day}/${year}`;
      }

      // Build update object with all editable fields
      const updates: Record<string, any> = {
        clientName: editForm().clientName,
        clientPhone: editForm().clientPhone,
        clientEmail: editForm().clientEmail,
        guestName: editForm().clientName, // Also update guest fields
        guestPhone: editForm().clientPhone,
        guestEmail: editForm().clientEmail,
        notes: editForm().notes,
        duration: editForm().duration,
      };

      // Only include date/time if changed
      if (dateForApi) {
        updates.date = dateForApi;
      }
      if (editForm().startTime) {
        updates.startTime = editForm().startTime;
      }

      devLog('Updating appointment:', apt.id, updates);

      await appointmentStore.updateAppointmentViaApi(apt.id, updates as any);

      devLog('Appointment updated successfully:', apt.id);

      // Close modal first
      setShowEditModal(false);
      setEditingAppointment(null);
      setSaving(false);

      // Then reload appointments in background
      appointmentStore.loadAppointmentsViaApi().catch(err => {
        devLog('Error reloading appointments:', err);
      });
    } catch (error) {
      devLog('Error saving appointment:', error);
      setSaving(false);
      // Still close modal on error since the update might have worked
      setShowEditModal(false);
      setEditingAppointment(null);
      // Reload to see current state
      appointmentStore.loadAppointmentsViaApi().catch(() => {});
    }
  };

  // Send WhatsApp reminder
  const sendWhatsAppReminder = async (appointment: ApiAppointment) => {
    const phone = getClientPhone(appointment);
    if (!phone) {
      devLog('No phone number available for WhatsApp');
      return;
    }

    setSendingWhatsApp(appointment.id);

    try {
      const clientName = getClientName(appointment);
      const serviceType = getServiceType(appointment);
      const dateTime = formatDateTime(appointment);
      const duration = formatDuration(appointment.duration);
      const location = "5520 Fern Valley Rd, Suite 108, Louisville KY 40228";

      // Build reminder message
      const message = `📅 *Recordatorio de Cita*

Hola ${clientName}!

Le recordamos su cita:

📋 *Servicio:* ${serviceType}
📆 *Fecha y Hora:* ${dateTime}
⏱️ *Duración:* ${duration}
📍 *Ubicación:* ${location}
${appointment.notes ? `\n📝 *Notas:* ${appointment.notes}` : ''}

Por favor confirme su asistencia.

¡Gracias!`;

      const result = await sendWAmsg(phone, message);
      devLog('WhatsApp sent:', result);
    } catch (error) {
      devLog('Error sending WhatsApp:', error);
    } finally {
      setSendingWhatsApp(null);
    }
  };

  // Helper to parse date from API format
  const parseAppointmentDate = (apt: ApiAppointment): Date => {
    if (apt.date && apt.startTime && typeof apt.startTime === 'string' && apt.startTime.includes(':')) {
      // API format: date="01/16/2026", startTime="11:00"
      const [month, day, year] = apt.date.split('/');
      const [hours, minutes] = apt.startTime.split(':');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    }
    // Fallback: if startTime is already a Date or ISO string
    return new Date(apt.startTime || apt.createdAt);
  };

  // Check for time conflicts with existing appointments
  const checkTimeConflict = (date: string, startTime: string, duration: number): ApiAppointment | null => {
    if (!date || !startTime) return null;

    // Convert input date (YYYY-MM-DD) and time (HH:mm) to start/end timestamps
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    const newStart = new Date(year, month - 1, day, hours, minutes);
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    const all = appointmentStore.state.appointments as unknown as ApiAppointment[];

    for (const apt of all) {
      // Skip cancelled/completed appointments
      if (apt.status === 'cancelled' || apt.status === 'completed' || apt.status === 'no-show') continue;

      const aptStart = parseAppointmentDate(apt);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000);

      // Check overlap: newStart < aptEnd && newEnd > aptStart
      if (newStart < aptEnd && newEnd > aptStart) {
        return apt;
      }
    }
    return null;
  };

  const validateNewAppointment = () => {
    const data = newAppointment();
    const conflict = checkTimeConflict(data.date, data.startTime, data.duration);
    setTimeConflict(conflict);
  };

  // Generate available time slots for a given date (every 30 min, 8:00 AM - 6:00 PM)
  const getAvailableSlots = (): { time: string; label: string; available: boolean; conflict?: ApiAppointment }[] => {
    const date = newAppointment().date;
    const duration = newAppointment().duration;
    if (!date) return [];

    const slots: { time: string; label: string; available: boolean; conflict?: ApiAppointment }[] = [];
    const startHour = 8; // 8:00 AM
    const endHour = 18; // 6:00 PM

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;

        const conflict = checkTimeConflict(date, time, duration);
        slots.push({ time, label, available: !conflict, conflict: conflict || undefined });
      }
    }
    return slots;
  };

  // Helper to get display values (handles both API and normalized formats)
  const getClientName = (apt: ApiAppointment) => apt.clientName || apt.guestName || 'N/A';
  const getClientPhone = (apt: ApiAppointment) => apt.clientPhone || apt.guestPhone || '';
  const getClientEmail = (apt: ApiAppointment) => apt.clientEmail || apt.guestEmail || '';
  const getServiceType = (apt: ApiAppointment) => apt.serviceType || apt.eventTypeName || 'Appointment';
  const getLocationType = (apt: ApiAppointment) => apt.locationType || 'in-person';

  // Format date for display
  const formatDateTime = (apt: ApiAppointment): string => {
    const date = parseAppointmentDate(apt);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  onMount(async () => {
    const userId = authStore.profile()?.id || authStore.profile()?.originalUserId;
    devLog('=== AppointmentDashboard onMount ===');
    devLog('Current user ID:', userId);
    devLog('Is authenticated:', authStore.isAuthenticated);

    try {
      devLog('Starting to load appointments via API...');

      // Load appointments via API
      await appointmentStore.loadAppointmentsFromApi(userId);

      devLog('✓ Loaded appointments:', appointmentStore.state.appointments.length);
      devLog('=== Dashboard loading complete ===');
    } catch (error) {
      devLog('❌ Error loading dashboard data:', error);
      if (error instanceof Error) {
        devLog('Error message:', error.message);
        devLog('Error stack:', error.stack);
      }
    }
  });

  const getFilteredAppointments = (): ApiAppointment[] => {
    const now = new Date();
    const all = appointmentStore.state.appointments as unknown as ApiAppointment[];

    switch (view()) {
      case 'upcoming':
        return all.filter(apt => {
          const aptDate = parseAppointmentDate(apt);
          return aptDate > now && (apt.status === 'confirmed' || apt.status === 'pending');
        }).sort((a, b) => parseAppointmentDate(a).getTime() - parseAppointmentDate(b).getTime());

      case 'past':
        return all.filter(apt => {
          const aptDate = parseAppointmentDate(apt);
          return aptDate <= now || apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'no-show';
        }).sort((a, b) => parseAppointmentDate(b).getTime() - parseAppointmentDate(a).getTime());

      case 'all':
      default:
        return all.sort((a, b) => parseAppointmentDate(b).getTime() - parseAppointmentDate(a).getTime());
    }
  };

  // Calculate stats from appointments
  const getStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const all = appointmentStore.state.appointments as unknown as ApiAppointment[];

    const upcoming = all.filter(apt => {
      const aptDate = parseAppointmentDate(apt);
      return aptDate > now && (apt.status === 'confirmed' || apt.status === 'pending');
    }).length;

    const todayCount = all.filter(apt => {
      const aptDate = parseAppointmentDate(apt);
      return aptDate >= today && aptDate < new Date(today.getTime() + 86400000);
    }).length;

    const thisWeek = all.filter(apt => {
      const aptDate = parseAppointmentDate(apt);
      return aptDate >= weekStart;
    }).length;

    return {
      upcoming,
      today: todayCount,
      thisWeek,
      total: all.length
    };
  };

  const handleCancelAppointment = async () => {
    const appointment = selectedAppointment();
    if (!appointment) return;

    try {
      await appointmentStore.cancelAppointmentViaApi(
        appointment.id,
        'host',
        cancellationReason()
      );

      // Close modal and reset state first
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancellationReason('');

      // Reload appointments to refresh data
      const userId = authStore.profile()?.id || authStore.profile()?.originalUserId;
      await appointmentStore.loadAppointmentsFromApi(userId);
    } catch (error) {
      devLog('Error cancelling appointment:', error);
      // Still close modal on error
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancellationReason('');
    }
  };

  const handleConfirmAppointment = async (appointment: ApiAppointment) => {
    try {
      await appointmentStore.updateAppointmentViaApi(appointment.id, {
        status: 'confirmed'
      });
      // Reload appointments to refresh data
      const userId = authStore.profile()?.id || authStore.profile()?.originalUserId;
      await appointmentStore.loadAppointmentsFromApi(userId);
    } catch (error) {
      devLog('Error confirming appointment:', error);
    }
  };

  const handleCompleteAppointment = async (appointment: ApiAppointment) => {
    try {
      await appointmentStore.updateAppointmentViaApi(appointment.id, {
        status: 'completed'
      });
      // Reload appointments to refresh data
      const userId = authStore.profile()?.id || authStore.profile()?.originalUserId;
      await appointmentStore.loadAppointmentsFromApi(userId);
    } catch (error) {
      devLog('Error completing appointment:', error);
    }
  };

  const handleCreateAppointment = async () => {
    const data = newAppointment();
    if (!data.clientName || !data.date || !data.startTime) return;
    if (timeConflict()) return;

    try {
      setCreating(true);
      // Convert YYYY-MM-DD to MM/DD/YYYY for API
      const [year, month, day] = data.date.split('-');
      const apiDate = `${month}/${day}/${year}`;
      const formData = {
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        date: apiDate,
        startTime: data.startTime,
        duration: data.duration,
        serviceType: data.serviceType || 'General',
        notes: data.notes,
        status: 'confirmed'
      };

      await appointmentStore.createAppointmentViaApi(formData as any);

      // Reset form and close modal first
      setNewAppointment({
        clientName: '',
        clientPhone: '',
        date: '',
        startTime: '',
        duration: 30,
        serviceType: '',
        notes: ''
      });
      setTimeConflict(null);
      setShowCreateModal(false);

      // Reload appointments to refresh data
      const userId = authStore.profile()?.id || authStore.profile()?.originalUserId;
      await appointmentStore.loadAppointmentsFromApi(userId);
    } catch (error) {
      devLog('Error creating appointment:', error);
      // Close modal even on error to prevent UI being stuck
      setShowCreateModal(false);
      setNewAppointment({
        clientName: '',
        clientPhone: '',
        date: '',
        startTime: '',
        duration: 30,
        serviceType: '',
        notes: ''
      });
      setTimeConflict(null);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      case 'completed': return '#6366f1';
      case 'no-show': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  // Get the next upcoming appointment (first confirmed/pending after now)
  const getNextAppointment = (): ApiAppointment | null => {
    const now = new Date();
    const all = appointmentStore.state.appointments as unknown as ApiAppointment[];
    const upcoming = all
      .filter(apt => {
        const aptDate = parseAppointmentDate(apt);
        return aptDate > now && (apt.status === 'confirmed' || apt.status === 'pending');
      })
      .sort((a, b) => parseAppointmentDate(a).getTime() - parseAppointmentDate(b).getTime());
    return upcoming[0] || null;
  };

  // Group appointments by day
  interface DayGroup {
    dateKey: string; // YYYY-MM-DD
    dateLabel: string; // "Monday, January 16, 2026"
    dayName: string; // "Monday"
    dayNumber: string; // "16"
    monthName: string; // "Jan"
    isToday: boolean;
    isTomorrow: boolean;
    isPast: boolean;
    appointments: ApiAppointment[];
  }

  const getAppointmentsByDay = (): DayGroup[] => {
    const appointments = getFilteredAppointments();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    // Group by date
    const groups: Record<string, ApiAppointment[]> = {};
    appointments.forEach(apt => {
      const aptDate = parseAppointmentDate(apt);
      const dateKey = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}-${String(aptDate.getDate()).padStart(2, '0')}`;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(apt);
    });

    // Convert to array and sort
    const dayGroups: DayGroup[] = Object.entries(groups).map(([dateKey, apts]) => {
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const isToday = date.getTime() === today.getTime();
      const isTomorrow = date.getTime() === tomorrow.getTime();
      const isPast = date < today;

      // Sort appointments within the day by time
      apts.sort((a, b) => parseAppointmentDate(a).getTime() - parseAppointmentDate(b).getTime());

      return {
        dateKey,
        dateLabel: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: String(day),
        monthName: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday,
        isTomorrow,
        isPast,
        appointments: apts
      };
    });

    // Sort by date (ascending for upcoming, descending for past)
    if (view() === 'past') {
      dayGroups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    } else {
      dayGroups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }

    return dayGroups;
  };

  // Format time only
  const formatTime = (apt: ApiAppointment): string => {
    const date = parseAppointmentDate(apt);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div style="padding: 2rem;">
      {/* Header with Stats */}
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="font-size: 1.875rem; font-weight: 700; margin: 0;">
            Appointments
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            style="
              padding: 0.625rem 1.25rem;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 0.875rem;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 0.5rem;
              transition: all 0.2s;
            "
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style="width: 18px; height: 18px;">
              <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            New Appointment
          </button>
        </div>

        {/* Stats Cards */}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div style="background: white; border-radius: 0.5rem; padding: 1.5rem; border: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">Upcoming</p>
            <p style="font-size: 2rem; font-weight: 700; margin: 0.5rem 0 0 0;">
              {getStats().upcoming}
            </p>
          </div>
          <div style="background: white; border-radius: 0.5rem; padding: 1.5rem; border: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">Today</p>
            <p style="font-size: 2rem; font-weight: 700; margin: 0.5rem 0 0 0;">
              {getStats().today}
            </p>
          </div>
          <div style="background: white; border-radius: 0.5rem; padding: 1.5rem; border: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">This Week</p>
            <p style="font-size: 2rem; font-weight: 700; margin: 0.5rem 0 0 0;">
              {getStats().thisWeek}
            </p>
          </div>
          <div style="background: white; border-radius: 0.5rem; padding: 1.5rem; border: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">Total</p>
            <p style="font-size: 2rem; font-weight: 700; margin: 0.5rem 0 0 0;">
              {getStats().total}
            </p>
          </div>
        </div>

        {/* View Tabs and Display Mode Toggle */}
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb;">
          <div style="display: flex; gap: 0.5rem;">
            <button
              onClick={() => setView('upcoming')}
              style={`
                padding: 0.75rem 1.5rem;
                border: none;
                background: none;
                cursor: pointer;
                font-weight: 600;
                border-bottom: 3px solid ${view() === 'upcoming' ? '#3B82F6' : 'transparent'};
                color: ${view() === 'upcoming' ? '#3B82F6' : '#6b7280'};
                margin-bottom: -2px;
              `}
            >
              Upcoming ({getStats().upcoming})
            </button>
            <button
              onClick={() => setView('past')}
              style={`
                padding: 0.75rem 1.5rem;
                border: none;
                background: none;
                cursor: pointer;
                font-weight: 600;
                border-bottom: 3px solid ${view() === 'past' ? '#3B82F6' : 'transparent'};
                color: ${view() === 'past' ? '#3B82F6' : '#6b7280'};
                margin-bottom: -2px;
              `}
            >
              Past
            </button>
            <button
              onClick={() => setView('all')}
              style={`
                padding: 0.75rem 1.5rem;
                border: none;
                background: none;
                cursor: pointer;
                font-weight: 600;
                border-bottom: 3px solid ${view() === 'all' ? '#3B82F6' : 'transparent'};
                color: ${view() === 'all' ? '#3B82F6' : '#6b7280'};
                margin-bottom: -2px;
              `}
            >
              All ({getStats().total})
            </button>
          </div>

          {/* Display Mode Toggle */}
          <div style="display: flex; gap: 0.25rem; background: #f3f4f6; border-radius: 0.5rem; padding: 0.25rem; margin-bottom: 0.5rem;">
            <button
              onClick={() => setDisplayMode('days')}
              style={`
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 0.375rem;
                cursor: pointer;
                font-weight: 500;
                font-size: 0.875rem;
                display: flex;
                align-items: center;
                gap: 0.375rem;
                background: ${displayMode() === 'days' ? 'white' : 'transparent'};
                color: ${displayMode() === 'days' ? '#1f2937' : '#6b7280'};
                box-shadow: ${displayMode() === 'days' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
                transition: all 0.2s;
              `}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px;">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
              </svg>
              Por Días
            </button>
            <button
              onClick={() => setDisplayMode('list')}
              style={`
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 0.375rem;
                cursor: pointer;
                font-weight: 500;
                font-size: 0.875rem;
                display: flex;
                align-items: center;
                gap: 0.375rem;
                background: ${displayMode() === 'list' ? 'white' : 'transparent'};
                color: ${displayMode() === 'list' ? '#1f2937' : '#6b7280'};
                box-shadow: ${displayMode() === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};
                transition: all 0.2s;
              `}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px;">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
              </svg>
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <Show when={appointmentStore.state.loading}>
        <div style="text-align: center; padding: 2rem;">Loading appointments...</div>
      </Show>

      <Show when={!appointmentStore.state.loading && getFilteredAppointments().length === 0}>
        <div style="text-align: center; padding: 3rem; background: white; border-radius: 0.5rem; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 1.125rem;">No appointments found</p>
          <p style="color: #9ca3af; margin-top: 0.5rem;">
            {view() === 'upcoming' ? 'You don\'t have any upcoming appointments' : 'No appointments in this view'}
          </p>
        </div>
      </Show>

      {/* Days View */}
      <Show when={displayMode() === 'days' && !appointmentStore.state.loading && getFilteredAppointments().length > 0}>
        <div style="display: grid; gap: 1.5rem;">
          <For each={getAppointmentsByDay()}>
            {(dayGroup) => {
              const nextApt = getNextAppointment();
              return (
                <div style={`
                  background: white;
                  border: 1px solid ${dayGroup.isToday ? '#3b82f6' : '#e5e7eb'};
                  border-radius: 0.75rem;
                  overflow: hidden;
                  ${dayGroup.isToday ? 'box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);' : ''}
                `}>
                  {/* Day Header */}
                  <div style={`
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.5rem;
                    background: ${dayGroup.isToday ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : dayGroup.isTomorrow ? '#f0fdf4' : dayGroup.isPast ? '#f9fafb' : '#fafafa'};
                    border-bottom: 1px solid ${dayGroup.isToday ? 'transparent' : '#e5e7eb'};
                  `}>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                      {/* Date Badge */}
                      <div style={`
                        width: 56px;
                        height: 56px;
                        background: ${dayGroup.isToday ? 'rgba(255,255,255,0.2)' : 'white'};
                        border-radius: 0.5rem;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        ${!dayGroup.isToday ? 'border: 1px solid #e5e7eb;' : ''}
                      `}>
                        <span style={`font-size: 0.75rem; font-weight: 600; color: ${dayGroup.isToday ? 'rgba(255,255,255,0.8)' : '#6b7280'}; text-transform: uppercase;`}>
                          {dayGroup.monthName}
                        </span>
                        <span style={`font-size: 1.5rem; font-weight: 700; color: ${dayGroup.isToday ? 'white' : '#111827'}; line-height: 1;`}>
                          {dayGroup.dayNumber}
                        </span>
                      </div>

                      <div>
                        <div style={`font-size: 1.125rem; font-weight: 600; color: ${dayGroup.isToday ? 'white' : '#111827'};`}>
                          {dayGroup.isToday ? 'Hoy' : dayGroup.isTomorrow ? 'Mañana' : dayGroup.dayName}
                        </div>
                        <div style={`font-size: 0.875rem; color: ${dayGroup.isToday ? 'rgba(255,255,255,0.8)' : '#6b7280'};`}>
                          {dayGroup.dateLabel}
                        </div>
                      </div>
                    </div>

                    {/* Appointment Count Badge */}
                    <div style={`
                      display: flex;
                      align-items: center;
                      gap: 0.5rem;
                      padding: 0.5rem 1rem;
                      background: ${dayGroup.isToday ? 'rgba(255,255,255,0.2)' : dayGroup.isTomorrow ? '#dcfce7' : '#f3f4f6'};
                      border-radius: 9999px;
                    `}>
                      <span style={`font-size: 1.25rem; font-weight: 700; color: ${dayGroup.isToday ? 'white' : dayGroup.isTomorrow ? '#166534' : '#374151'};`}>
                        {dayGroup.appointments.length}
                      </span>
                      <span style={`font-size: 0.875rem; color: ${dayGroup.isToday ? 'rgba(255,255,255,0.9)' : dayGroup.isTomorrow ? '#166534' : '#6b7280'};`}>
                        {dayGroup.appointments.length === 1 ? 'cita' : 'citas'}
                      </span>
                    </div>
                  </div>

                  {/* Appointments for this day */}
                  <div style="padding: 0.75rem;">
                    <For each={dayGroup.appointments}>
                      {(appointment, index) => {
                        const isNext = nextApt?.id === appointment.id;
                        return (
                          <div style={`
                            display: flex;
                            align-items: center;
                            gap: 1rem;
                            padding: 1rem;
                            background: ${isNext ? '#fef3c7' : index() % 2 === 0 ? '#fafafa' : 'white'};
                            border-radius: 0.5rem;
                            margin-bottom: ${index() < dayGroup.appointments.length - 1 ? '0.5rem' : '0'};
                            border: ${isNext ? '2px solid #f59e0b' : '1px solid #e5e7eb'};
                            position: relative;
                          `}>
                            {/* Next Appointment Badge */}
                            <Show when={isNext}>
                              <div style="position: absolute; top: -8px; left: 1rem; background: #f59e0b; color: white; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.625rem; font-weight: 700; text-transform: uppercase;">
                                Próxima
                              </div>
                            </Show>

                            {/* Time */}
                            <div style="min-width: 80px; text-align: center;">
                              <div style={`font-size: 1.125rem; font-weight: 700; color: ${isNext ? '#92400e' : '#111827'};`}>
                                {formatTime(appointment)}
                              </div>
                              <div style="font-size: 0.75rem; color: #6b7280;">
                                {formatDuration(appointment.duration)}
                              </div>
                            </div>

                            {/* Divider */}
                            <div style="width: 3px; height: 40px; background: linear-gradient(to bottom, #e5e7eb, #d1d5db); border-radius: 9999px;" />

                            {/* Client Info */}
                            <div style="flex: 1;">
                              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                <span style="font-weight: 600; color: #111827;">
                                  {getClientName(appointment)}
                                </span>
                                <span style={`
                                  padding: 0.125rem 0.5rem;
                                  border-radius: 9999px;
                                  font-size: 0.625rem;
                                  font-weight: 600;
                                  background: ${getStatusColor(appointment.status)}20;
                                  color: ${getStatusColor(appointment.status)};
                                `}>
                                  {getStatusLabel(appointment.status)}
                                </span>
                              </div>
                              <div style="font-size: 0.875rem; color: #6b7280;">
                                {getServiceType(appointment)}
                                <Show when={getClientPhone(appointment)}>
                                  <span style="margin-left: 0.75rem;">📞 {getClientPhone(appointment)}</span>
                                </Show>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div style="display: flex; gap: 0.375rem;">
                              {/* Edit Button */}
                              <button
                                onClick={() => openEditModal(appointment)}
                                style="padding: 0.375rem 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 600;"
                                title="Editar cita"
                              >
                                ✏️
                              </button>
                              {/* WhatsApp Reminder */}
                              <Show when={getClientPhone(appointment) && appointment.status !== 'cancelled' && appointment.status !== 'completed'}>
                                <button
                                  onClick={() => sendWhatsAppReminder(appointment)}
                                  disabled={sendingWhatsApp() === appointment.id}
                                  style={`padding: 0.375rem 0.75rem; background: ${sendingWhatsApp() === appointment.id ? '#86efac' : '#22c55e'}; color: white; border: none; border-radius: 0.375rem; cursor: ${sendingWhatsApp() === appointment.id ? 'wait' : 'pointer'}; font-size: 0.75rem; font-weight: 600;`}
                                  title="Enviar recordatorio por WhatsApp"
                                >
                                  {sendingWhatsApp() === appointment.id ? '...' : 'WA'}
                                </button>
                              </Show>
                              <Show when={appointment.status === 'pending'}>
                                <button
                                  onClick={() => handleConfirmAppointment(appointment)}
                                  style="padding: 0.375rem 0.75rem; background: #10b981; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 600;"
                                >
                                  ✓
                                </button>
                              </Show>
                              <Show when={appointment.status === 'confirmed' && parseAppointmentDate(appointment) < new Date()}>
                                <button
                                  onClick={() => handleCompleteAppointment(appointment)}
                                  style="padding: 0.375rem 0.75rem; background: #6366f1; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 600;"
                                >
                                  ✓✓
                                </button>
                              </Show>
                              <Show when={appointment.status !== 'cancelled' && appointment.status !== 'completed'}>
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setShowCancelModal(true);
                                  }}
                                  style="padding: 0.375rem 0.75rem; border: 1px solid #fecaca; background: white; color: #dc2626; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; font-weight: 600;"
                                >
                                  ✕
                                </button>
                              </Show>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* List View */}
      <Show when={displayMode() === 'list' && !appointmentStore.state.loading && getFilteredAppointments().length > 0}>
        <div style="display: grid; gap: 1rem;">
          <For each={getFilteredAppointments()}>
            {(appointment) => {
              const nextApt = getNextAppointment();
              const isNext = nextApt?.id === appointment.id;
              return (
                <div
                  style={`
                    background: ${isNext ? '#fef3c7' : 'white'};
                    border: ${isNext ? '2px solid #f59e0b' : '1px solid #e5e7eb'};
                    border-radius: 0.5rem;
                    padding: 1.5rem;
                    position: relative;
                  `}
                >
                  {/* Next Appointment Badge */}
                  <Show when={isNext}>
                    <div style="position: absolute; top: -10px; left: 1.5rem; background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
                      Próxima Cita
                    </div>
                  </Show>

                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                        <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">
                          {getServiceType(appointment)}
                        </h3>
                        <span
                          style={`
                            padding: 0.25rem 0.75rem;
                            border-radius: 9999px;
                            font-size: 0.75rem;
                            font-weight: 600;
                            background: ${getStatusColor(appointment.status)}20;
                            color: ${getStatusColor(appointment.status)};
                          `}
                        >
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>

                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; color: #6b7280; font-size: 0.875rem;">
                        <div>
                          <p style="margin: 0 0 0.25rem 0;">
                            <strong style="color: #111827;">Client:</strong> {getClientName(appointment)}
                          </p>
                          <Show when={getClientEmail(appointment)}>
                            <p style="margin: 0;">
                              <strong style="color: #111827;">Email:</strong> {getClientEmail(appointment)}
                            </p>
                          </Show>
                          <Show when={getClientPhone(appointment)}>
                            <p style="margin: 0.25rem 0 0 0;">
                              <strong style="color: #111827;">Phone:</strong> {getClientPhone(appointment)}
                            </p>
                          </Show>
                        </div>

                        <div>
                          <p style="margin: 0 0 0.25rem 0;">
                            <strong style="color: #111827;">Date & Time:</strong><br />
                            {formatDateTime(appointment)}
                          </p>
                          <p style="margin: 0.25rem 0 0 0;">
                            <strong style="color: #111827;">Duration:</strong> {formatDuration(appointment.duration)}
                          </p>
                          <p style="margin: 0.25rem 0 0 0;">
                            <strong style="color: #111827;">Location:</strong> {getLocationType(appointment)}
                          </p>
                        </div>

                        <Show when={appointment.notes}>
                          <div>
                            <p style="margin: 0;">
                              <strong style="color: #111827;">Notes:</strong><br />
                              {appointment.notes}
                            </p>
                          </div>
                        </Show>
                      </div>

                      <Show when={appointment.status === 'cancelled' && appointment.cancellationReason}>
                        <div style="margin-top: 1rem; padding: 0.75rem; background: #fef2f2; border-radius: 0.375rem;">
                          <p style="color: #991b1b; font-size: 0.875rem; margin: 0;">
                            <strong>Cancellation Reason:</strong> {appointment.cancellationReason}
                          </p>
                        </div>
                      </Show>
                    </div>

                    {/* Actions */}
                    <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(appointment)}
                        style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 600;"
                        title="Editar cita"
                      >
                        ✏️ Editar
                      </button>

                      {/* WhatsApp Reminder */}
                      <Show when={getClientPhone(appointment) && appointment.status !== 'cancelled' && appointment.status !== 'completed'}>
                        <button
                          onClick={() => sendWhatsAppReminder(appointment)}
                          disabled={sendingWhatsApp() === appointment.id}
                          style={`padding: 0.5rem 1rem; background: ${sendingWhatsApp() === appointment.id ? '#86efac' : '#22c55e'}; color: white; border: none; border-radius: 0.375rem; cursor: ${sendingWhatsApp() === appointment.id ? 'wait' : 'pointer'}; font-size: 0.875rem; font-weight: 600;`}
                          title="Enviar recordatorio por WhatsApp"
                        >
                          {sendingWhatsApp() === appointment.id ? 'Enviando...' : 'WhatsApp'}
                        </button>
                      </Show>

                      <Show when={appointment.status === 'pending'}>
                        <button
                          onClick={() => handleConfirmAppointment(appointment)}
                          style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 600;"
                        >
                          Confirm
                        </button>
                      </Show>

                      <Show when={appointment.status === 'confirmed' && parseAppointmentDate(appointment) < new Date()}>
                        <button
                          onClick={() => handleCompleteAppointment(appointment)}
                          style="padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 600;"
                        >
                          Complete
                        </button>
                      </Show>

                      <Show when={appointment.status !== 'cancelled' && appointment.status !== 'completed'}>
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowCancelModal(true);
                          }}
                          style="padding: 0.5rem 1rem; border: 1px solid #fecaca; background: white; color: #dc2626; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 600;"
                        >
                          Cancel
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Cancel Modal */}
      <Show when={showCancelModal()}>
        <div
          style="
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            padding: 1rem;
          "
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCancelModal(false);
              setSelectedAppointment(null);
            }
          }}
        >
          <div
            style="
              background: white;
              border-radius: 0.75rem;
              max-width: 500px;
              width: 100%;
              padding: 2rem;
            "
          >
            <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 1rem 0;">
              Cancel Appointment
            </h3>

            <p style="color: #6b7280; margin-bottom: 1.5rem;">
              Are you sure you want to cancel this appointment with {getClientName(selectedAppointment()!)}?
            </p>

            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancellationReason()}
                onInput={(e) => setCancellationReason(e.currentTarget.value)}
                placeholder="Let the client know why you're cancelling"
                rows={3}
                style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
              />
            </div>

            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedAppointment(null);
                  setCancellationReason('');
                }}
                style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: white; cursor: pointer; font-weight: 600;"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelAppointment}
                style="padding: 0.75rem 1.5rem; background: #dc2626; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600;"
              >
                Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Edit Appointment Modal */}
      <Show when={showEditModal() && editingAppointment()}>
        <div
          style="
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            padding: 1rem;
          "
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setEditingAppointment(null);
            }
          }}
        >
          <div
            style="
              background: white;
              border-radius: 0.75rem;
              max-width: 540px;
              width: 100%;
              padding: 2rem;
              max-height: 90vh;
              overflow-y: auto;
            "
          >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0;">
                Editar Cita
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAppointment(null);
                }}
                style="padding: 0.375rem; background: none; border: none; cursor: pointer; color: #6b7280;"
              >
                ✕
              </button>
            </div>

            {/* Current Status Badge */}
            <div style="margin-bottom: 1.5rem;">
              <span style={`
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.875rem;
                font-weight: 600;
                background: ${getStatusColor(editingAppointment()!.status)}20;
                color: ${getStatusColor(editingAppointment()!.status)};
              `}>
                {getStatusLabel(editingAppointment()!.status)}
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
              {/* Client Name */}
              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={editForm().clientName}
                  onInput={(e) => setEditForm({ ...editForm(), clientName: e.currentTarget.value })}
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem;"
                  placeholder="Nombre completo"
                />
              </div>

              {/* Client Phone & Email */}
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={editForm().clientPhone}
                    onInput={(e) => setEditForm({ ...editForm(), clientPhone: e.currentTarget.value })}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem;"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm().clientEmail}
                    onInput={(e) => setEditForm({ ...editForm(), clientEmail: e.currentTarget.value })}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem;"
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={editForm().date}
                    onInput={(e) => setEditForm({ ...editForm(), date: e.currentTarget.value })}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem;"
                  />
                </div>
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={editForm().startTime}
                    onInput={(e) => setEditForm({ ...editForm(), startTime: e.currentTarget.value })}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem;"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                  Duración (minutos)
                </label>
                <select
                  value={editForm().duration}
                  onChange={(e) => setEditForm({ ...editForm(), duration: parseInt(e.currentTarget.value) })}
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem; background: white;"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1.5 horas</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">
                  Notas
                </label>
                <textarea
                  value={editForm().notes}
                  onInput={(e) => setEditForm({ ...editForm(), notes: e.currentTarget.value })}
                  placeholder="Notas adicionales sobre la cita..."
                  rows={3}
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem; resize: vertical;"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAppointment(null);
                }}
                style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: white; cursor: pointer; font-weight: 600;"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving()}
                style={`padding: 0.75rem 1.5rem; background: ${saving() ? '#93c5fd' : '#3b82f6'}; color: white; border: none; border-radius: 0.375rem; cursor: ${saving() ? 'wait' : 'pointer'}; font-weight: 600;`}
              >
                {saving() ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Create Appointment Modal */}
      <Show when={showCreateModal()}>
        <div
          style="
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            padding: 1rem;
          "
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            style="
              background: white;
              border-radius: 0.75rem;
              max-width: 540px;
              width: 100%;
              padding: 2rem;
              max-height: 90vh;
              overflow-y: auto;
            "
          >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0;">
                New Appointment
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style="padding: 0.375rem; background: none; border: none; cursor: pointer; color: #6b7280;"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style="width: 20px; height: 20px;">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
              {/* Client Name */}
              <div>
                <label style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; color: #374151;">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newAppointment().clientName}
                  onInput={(e) => setNewAppointment(prev => ({ ...prev, clientName: e.currentTarget.value }))}
                  placeholder="Full name"
                  style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; outline: none; transition: border-color 0.2s;"
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Phone */}
              <div>
                <label style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; color: #374151;">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newAppointment().clientPhone}
                  onInput={(e) => setNewAppointment(prev => ({ ...prev, clientPhone: e.currentTarget.value }))}
                  placeholder="(555) 123-4567"
                  style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; outline: none; transition: border-color 0.2s;"
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Date & Duration Row */}
              <div style="display: grid; grid-template-columns: 1fr 120px; gap: 1rem;">
                <div>
                  <label style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; color: #374151;">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newAppointment().date}
                    onInput={(e) => {
                      setNewAppointment(prev => ({ ...prev, date: e.currentTarget.value, startTime: '' }));
                      setTimeConflict(null);
                    }}
                    style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; outline: none; transition: border-color 0.2s;"
                    onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                </div>
                <div>
                  <label style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; color: #374151;">
                    Duration
                  </label>
                  <select
                    value={newAppointment().duration}
                    onChange={(e) => {
                      setNewAppointment(prev => ({ ...prev, duration: parseInt(e.currentTarget.value), startTime: '' }));
                      setTimeConflict(null);
                    }}
                    style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; outline: none; background: white;"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hr</option>
                    <option value={90}>1.5 hr</option>
                    <option value={120}>2 hr</option>
                  </select>
                </div>
              </div>

              {/* Available Time Slots */}
              <Show when={newAppointment().date}>
                <div>
                  <label style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; color: #374151;">
                    Available Times *
                    <span style="font-weight: 400; color: #6b7280; margin-left: 0.5rem;">
                      ({getAvailableSlots().filter(s => s.available).length} available)
                    </span>
                  </label>
                  <div style="
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.375rem;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 0.5rem;
                    background: #f9fafb;
                    border-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                  ">
                    <For each={getAvailableSlots().filter(s => s.available)}>
                      {(slot) => (
                        <button
                          onClick={() => {
                            setNewAppointment(prev => ({ ...prev, startTime: slot.time }));
                            setTimeConflict(null);
                          }}
                          style={`
                            padding: 0.5rem 0.25rem;
                            border-radius: 0.375rem;
                            border: 1.5px solid ${newAppointment().startTime === slot.time ? '#3b82f6' : '#e5e7eb'};
                            background: ${newAppointment().startTime === slot.time ? '#eff6ff' : 'white'};
                            color: ${newAppointment().startTime === slot.time ? '#1d4ed8' : '#374151'};
                            font-size: 0.8125rem;
                            font-weight: ${newAppointment().startTime === slot.time ? '600' : '500'};
                            cursor: pointer;
                            transition: all 0.15s;
                          `}
                        >
                          {slot.label}
                        </button>
                      )}
                    </For>
                  </div>
                  <Show when={getAvailableSlots().filter(s => s.available).length === 0}>
                    <div style="text-align: center; padding: 1rem; color: #dc2626; font-size: 0.875rem;">
                      No available times for this date
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={!newAppointment().date}>
                <div style="
                  padding: 1rem;
                  text-align: center;
                  color: #6b7280;
                  font-size: 0.875rem;
                  background: #f9fafb;
                  border-radius: 0.5rem;
                  border: 1px dashed #d1d5db;
                ">
                  Select a date to see available times
                </div>
              </Show>

              {/* Service Type */}
              <div>
                <label style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; color: #374151;">
                  Service Type
                </label>
                <input
                  type="text"
                  value={newAppointment().serviceType}
                  onInput={(e) => setNewAppointment(prev => ({ ...prev, serviceType: e.currentTarget.value }))}
                  placeholder="e.g. Tax Prep, Consultation"
                  style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; outline: none; transition: border-color 0.2s;"
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Notes */}
              <div>
                <label style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.375rem; color: #374151;">
                  Notes
                </label>
                <textarea
                  value={newAppointment().notes}
                  onInput={(e) => setNewAppointment(prev => ({ ...prev, notes: e.currentTarget.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                  style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; outline: none; resize: vertical; transition: border-color 0.2s;"
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            {/* Actions */}
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
              <button
                onClick={() => setShowCreateModal(false)}
                style="padding: 0.625rem 1.25rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: white; cursor: pointer; font-weight: 600; font-size: 0.875rem;"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAppointment}
                disabled={creating() || !newAppointment().clientName || !newAppointment().date || !newAppointment().startTime}
                style={`
                  padding: 0.625rem 1.25rem;
                  background: ${(!newAppointment().clientName || !newAppointment().date || !newAppointment().startTime) ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
                  color: white;
                  border: none;
                  border-radius: 0.5rem;
                  cursor: ${(!newAppointment().clientName || !newAppointment().date || !newAppointment().startTime) ? 'not-allowed' : 'pointer'};
                  font-weight: 600;
                  font-size: 0.875rem;
                  opacity: ${creating() ? '0.7' : '1'};
                `}
              >
                {creating() ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default AppointmentDashboard;
