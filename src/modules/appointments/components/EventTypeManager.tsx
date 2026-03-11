import { Component, For, Show, createSignal, onMount } from 'solid-js';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import type { EventType, CustomQuestion } from '../types';
import { devLog } from '../../../services/utils';

const EventTypeManager: Component = () => {
  const [showModal, setShowModal] = createSignal(false);
  const [editingEventType, setEditingEventType] = createSignal<EventType | null>(null);
  
  // Form state
  const [formData, setFormData] = createSignal<Partial<EventType>>({
    name: '',
    description: '',
    duration: 30,
    color: '#3B82F6',
    isActive: true,
    bufferTimeBefore: 0,
    bufferTimeAfter: 0,
    location: '',
    locationType: 'video',
    requiresApproval: false,
    reminderEnabled: true,
    questions: []
  });

  onMount(() => {
    const userId = authStore.currentUser?.uid;
    devLog('EventTypeManager onMount - userId:', userId);
    devLog('EventTypeManager onMount - businessId:', authStore.getBusinessId());
    
    if (userId) {
      // Use original Firebase method first to ensure it works
      appointmentStore.loadEventTypes(userId);
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const userId = authStore.currentUser?.uid;
    if (!userId) return;

    try {
      devLog('EventTypeManager handleSubmit - userId:', userId);
      devLog('EventTypeManager handleSubmit - formData:', formData());
      
      const data = formData();
      if (editingEventType()) {
        devLog('Updating event type:', editingEventType()!.id);
        await appointmentStore.updateEventType(editingEventType()!.id, data);
      } else {
        devLog('Creating new event type with Firebase...');
        // Add required fields for the original method
        const eventTypeData = {
          ...data,
          name: data.name || '',
          description: data.description || '',
          duration: data.duration || 30,
          color: data.color || '#3B82F6',
          isActive: data.isActive !== false,
          location: data.location || '',
          locationType: data.locationType || 'video',
          requiresApproval: data.requiresApproval || false,
          reminderEnabled: data.reminderEnabled !== false
        } as Omit<EventType, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;
        
        devLog('Final eventTypeData:', eventTypeData);
        await appointmentStore.createEventType(userId, eventTypeData);
        devLog('Event type created successfully');
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      devLog('Error saving event type:', error);
      alert('Error saving event type: ' + (error as Error).message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration: 30,
      color: '#3B82F6',
      isActive: true,
      bufferTimeBefore: 0,
      bufferTimeAfter: 0,
      location: '',
      locationType: 'video',
      requiresApproval: false,
      reminderEnabled: true,
      questions: []
    });
    setEditingEventType(null);
  };

  const openEditModal = (eventType: EventType) => {
    setEditingEventType(eventType);
    setFormData({ ...eventType });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event type?')) {
      await appointmentStore.deleteEventType(id);
    }
  };

  const toggleActive = async (eventType: EventType) => {
    await appointmentStore.updateEventType(eventType.id, {
      isActive: !eventType.isActive
    });
  };

  return (
    <div class="event-type-manager" style="padding: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
          <h2 style="font-size: 1.875rem; font-weight: 700; margin: 0;">Event Types</h2>
          <p style="color: #6b7280; margin-top: 0.5rem;">
            Create and manage the types of appointments you offer
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          style="background: #3B82F6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;"
        >
          + New Event Type
        </button>
      </div>

      <Show when={appointmentStore.state.loading}>
        <div style="text-align: center; padding: 2rem;">Loading...</div>
      </Show>

      <Show when={!appointmentStore.state.loading && appointmentStore.state.eventTypes.length === 0}>
        <div style="text-align: center; padding: 3rem; background: #f9fafb; border-radius: 0.5rem;">
          <p style="color: #6b7280; font-size: 1.125rem;">No event types yet</p>
          <p style="color: #9ca3af; margin-top: 0.5rem;">Create your first event type to start accepting appointments</p>
        </div>
      </Show>

      <div style="display: grid; gap: 1rem;">
        <For each={appointmentStore.state.eventTypes}>
          {(eventType) => (
            <div 
              style={`
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                padding: 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: start;
                opacity: ${eventType.isActive ? '1' : '0.6'};
              `}
            >
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                  <div 
                    style={`
                      width: 1rem;
                      height: 1rem;
                      border-radius: 0.25rem;
                      background: ${eventType.color};
                    `}
                  />
                  <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0;">{eventType.name}</h3>
                  <Show when={!eventType.isActive}>
                    <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;">
                      Inactive
                    </span>
                  </Show>
                </div>
                <p style="color: #6b7280; margin: 0.5rem 0;">{eventType.description}</p>
                <div style="display: flex; gap: 1.5rem; margin-top: 1rem; color: #6b7280; font-size: 0.875rem;">
                  <span>⏱️ {eventType.duration} min</span>
                  <span>📍 {eventType.locationType}</span>
                  <Show when={eventType.requiresApproval}>
                    <span>✓ Requires approval</span>
                  </Show>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button
                  onClick={() => toggleActive(eventType)}
                  style="padding: 0.5rem 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white; cursor: pointer; font-size: 0.875rem;"
                  title={eventType.isActive ? 'Deactivate' : 'Activate'}
                >
                  {eventType.isActive ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={() => openEditModal(eventType)}
                  style="padding: 0.5rem 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white; cursor: pointer; font-size: 0.875rem;"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(eventType.id)}
                  style="padding: 0.5rem 1rem; border: 1px solid #fecaca; border-radius: 0.375rem; background: white; color: #dc2626; cursor: pointer; font-size: 0.875rem;"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Modal */}
      <Show when={showModal()}>
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
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div 
            style="
              background: white;
              border-radius: 0.75rem;
              max-width: 600px;
              width: 100%;
              max-height: 90vh;
              overflow-y: auto;
              padding: 2rem;
            "
          >
            <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem 0;">
              {editingEventType() ? 'Edit Event Type' : 'Create Event Type'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                {/* Name */}
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData().name || ''}
                    onInput={(e) => setFormData({ ...formData(), name: e.currentTarget.value })}
                    placeholder="e.g., 30-Minute Consultation"
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                  />
                </div>

                {/* Description */}
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                    Description
                  </label>
                  <textarea
                    value={formData().description || ''}
                    onInput={(e) => setFormData({ ...formData(), description: e.currentTarget.value })}
                    placeholder="Describe what this appointment is for"
                    rows={3}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                  />
                </div>

                {/* Duration and Color */}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      value={formData().duration || 30}
                      onInput={(e) => setFormData({ ...formData(), duration: parseInt(e.currentTarget.value) })}
                      style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                    />
                  </div>
                  <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData().color || '#3B82F6'}
                      onInput={(e) => setFormData({ ...formData(), color: e.currentTarget.value })}
                      style="width: 100%; height: 48px; padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                    />
                  </div>
                </div>

                {/* Location Type */}
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                    Location Type *
                  </label>
                  <select
                    required
                    value={formData().locationType || 'video'}
                    onChange={(e) => setFormData({ ...formData(), locationType: e.currentTarget.value as any })}
                    style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                  >
                    <option value="video">Video Call</option>
                    <option value="phone">Phone Call</option>
                    <option value="in-person">In-Person</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Location Details */}
                <Show when={formData().locationType === 'in-person' || formData().locationType === 'custom'}>
                  <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                      Location Details
                    </label>
                    <input
                      type="text"
                      value={formData().location || ''}
                      onInput={(e) => setFormData({ ...formData(), location: e.currentTarget.value })}
                      placeholder="Enter location details"
                      style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                    />
                  </div>
                </Show>

                {/* Buffer Times */}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                      Buffer Before (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={formData().bufferTimeBefore || 0}
                      onInput={(e) => setFormData({ ...formData(), bufferTimeBefore: parseInt(e.currentTarget.value) })}
                      style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                    />
                  </div>
                  <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                      Buffer After (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={formData().bufferTimeAfter || 0}
                      onInput={(e) => setFormData({ ...formData(), bufferTimeAfter: parseInt(e.currentTarget.value) })}
                      style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                  <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input
                      type="checkbox"
                      checked={formData().requiresApproval || false}
                      onChange={(e) => setFormData({ ...formData(), requiresApproval: e.currentTarget.checked })}
                      style="width: 1.125rem; height: 1.125rem;"
                    />
                    <span>Require approval before booking</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input
                      type="checkbox"
                      checked={formData().reminderEnabled !== false}
                      onChange={(e) => setFormData({ ...formData(), reminderEnabled: e.currentTarget.checked })}
                      style="width: 1.125rem; height: 1.125rem;"
                    />
                    <span>Send reminder emails</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input
                      type="checkbox"
                      checked={formData().isActive !== false}
                      onChange={(e) => setFormData({ ...formData(), isActive: e.currentTarget.checked })}
                      style="width: 1.125rem; height: 1.125rem;"
                    />
                    <span>Active (accepting new bookings)</span>
                  </label>
                </div>

                {/* Buttons */}
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: white; cursor: pointer; font-weight: 600;"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style="padding: 0.75rem 1.5rem; background: #3B82F6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600;"
                  >
                    {editingEventType() ? 'Update' : 'Create'} Event Type
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default EventTypeManager;