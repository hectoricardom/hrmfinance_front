import { Component, For, Show, createSignal, onMount } from 'solid-js';
import { appointmentStore } from '../stores/appointmentStore';
import { authStore } from '../../../stores/authStore';
import type { AvailabilityRule, DateOverride, DayOfWeek, TimeSlot } from '../types';

const AvailabilitySettings: Component = () => {
  const [showDateOverrideModal, setShowDateOverrideModal] = createSignal(false);
  const [overrideDate, setOverrideDate] = createSignal('');
  const [overrideAvailable, setOverrideAvailable] = createSignal(false);
  const [overrideReason, setOverrideReason] = createSignal('');

  onMount(() => {
    const userId = authStore.currentUser?.uid;
    if (userId) {
      appointmentStore.loadAvailability(userId);
    }
  });

  const handleUpdateWeeklyAvailability = async (dayOfWeek: DayOfWeek, updates: Partial<AvailabilityRule>) => {
    const availability = appointmentStore.state.availability;
    if (!availability) return;

    const updatedRules = availability.weeklyAvailability.map(rule =>
      rule.dayOfWeek === dayOfWeek ? { ...rule, ...updates } : rule
    );

    await appointmentStore.saveAvailability({
      ...availability,
      weeklyAvailability: updatedRules
    });
  };

  const handleAddTimeSlot = async (dayOfWeek: DayOfWeek) => {
    const availability = appointmentStore.state.availability;
    if (!availability) return;

    const updatedRules = availability.weeklyAvailability.map(rule => {
      if (rule.dayOfWeek === dayOfWeek) {
        return {
          ...rule,
          timeSlots: [...rule.timeSlots, { start: '09:00', end: '17:00' }]
        };
      }
      return rule;
    });

    await appointmentStore.saveAvailability({
      ...availability,
      weeklyAvailability: updatedRules
    });
  };

  const handleRemoveTimeSlot = async (dayOfWeek: DayOfWeek, index: number) => {
    const availability = appointmentStore.state.availability;
    if (!availability) return;

    const updatedRules = availability.weeklyAvailability.map(rule => {
      if (rule.dayOfWeek === dayOfWeek) {
        return {
          ...rule,
          timeSlots: rule.timeSlots.filter((_, i) => i !== index)
        };
      }
      return rule;
    });

    await appointmentStore.saveAvailability({
      ...availability,
      weeklyAvailability: updatedRules
    });
  };

  const handleUpdateTimeSlot = async (dayOfWeek: DayOfWeek, index: number, field: 'start' | 'end', value: string) => {
    const availability = appointmentStore.state.availability;
    if (!availability) return;

    const updatedRules = availability.weeklyAvailability.map(rule => {
      if (rule.dayOfWeek === dayOfWeek) {
        return {
          ...rule,
          timeSlots: rule.timeSlots.map((slot, i) =>
            i === index ? { ...slot, [field]: value } : slot
          )
        };
      }
      return rule;
    });

    await appointmentStore.saveAvailability({
      ...availability,
      weeklyAvailability: updatedRules
    });
  };

  const handleAddDateOverride = async () => {
    const userId = authStore.currentUser?.uid;
    if (!userId || !overrideDate()) return;

    await appointmentStore.addDateOverride(userId, {
      date: overrideDate(),
      isAvailable: overrideAvailable(),
      reason: overrideReason() || undefined
    });

    setShowDateOverrideModal(false);
    setOverrideDate('');
    setOverrideAvailable(false);
    setOverrideReason('');
  };

  const handleRemoveDateOverride = async (overrideId: string) => {
    const userId = authStore.currentUser?.uid;
    if (!userId) return;

    await appointmentStore.removeDateOverride(userId, overrideId);
  };

  const handleUpdateSettings = async (field: string, value: any) => {
    const availability = appointmentStore.state.availability;
    if (!availability) return;

    await appointmentStore.saveAvailability({
      ...availability,
      [field]: value
    });
  };

  const dayLabels: Record<DayOfWeek, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  return (
    <div style="padding: 2rem;">
      <h2 style="font-size: 1.875rem; font-weight: 700; margin: 0 0 2rem 0;">
        Availability Settings
      </h2>

      <Show when={appointmentStore.state.loading}>
        <div style="text-align: center; padding: 2rem;">Loading...</div>
      </Show>

      <Show when={!appointmentStore.state.loading && appointmentStore.state.availability}>
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          {/* General Settings */}
          <div style="background: white; border-radius: 0.75rem; padding: 2rem; border: 1px solid #e5e7eb;">
            <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 1.5rem 0;">
              General Settings
            </h3>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                  Minimum Notice (hours)
                </label>
                <input
                  type="number"
                  min="0"
                  value={appointmentStore.state.availability!.minimumNotice}
                  onChange={(e) => handleUpdateSettings('minimumNotice', parseInt(e.currentTarget.value))}
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                />
                <p style="color: #6b7280; font-size: 0.875rem; margin: 0.5rem 0 0 0;">
                  How much notice do you need before someone can book?
                </p>
              </div>

              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                  Maximum Advance (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={appointmentStore.state.availability!.maximumAdvance}
                  onChange={(e) => handleUpdateSettings('maximumAdvance', parseInt(e.currentTarget.value))}
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                />
                <p style="color: #6b7280; font-size: 0.875rem; margin: 0.5rem 0 0 0;">
                  How far in advance can people book?
                </p>
              </div>

              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                  Time Slot Interval (minutes)
                </label>
                <select
                  value={appointmentStore.state.availability!.slotInterval}
                  onChange={(e) => handleUpdateSettings('slotInterval', parseInt(e.currentTarget.value))}
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
                <p style="color: #6b7280; font-size: 0.875rem; margin: 0.5rem 0 0 0;">
                  Spacing between available time slots
                </p>
              </div>

              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                  Timezone
                </label>
                <input
                  type="text"
                  value={appointmentStore.state.availability!.timezone}
                  readOnly
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: #f9fafb;"
                />
              </div>
            </div>
          </div>

          {/* Weekly Availability */}
          <div style="background: white; border-radius: 0.75rem; padding: 2rem; border: 1px solid #e5e7eb;">
            <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 1.5rem 0;">
              Weekly Hours
            </h3>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <For each={appointmentStore.state.availability!.weeklyAvailability}>
                {(rule) => (
                  <div style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                      <div style="display: flex; align-items: center; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                          <input
                            type="checkbox"
                            checked={rule.isActive}
                            onChange={(e) => handleUpdateWeeklyAvailability(rule.dayOfWeek, { isActive: e.currentTarget.checked })}
                            style="width: 1.125rem; height: 1.125rem;"
                          />
                          <span style="font-weight: 600; min-width: 100px;">
                            {dayLabels[rule.dayOfWeek]}
                          </span>
                        </label>
                      </div>
                      
                      <Show when={rule.isActive}>
                        <button
                          onClick={() => handleAddTimeSlot(rule.dayOfWeek)}
                          style="padding: 0.5rem 1rem; background: #3B82F6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; font-weight: 600;"
                        >
                          + Add Hours
                        </button>
                      </Show>
                    </div>

                    <Show when={rule.isActive}>
                      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-left: 2rem;">
                        <Show when={rule.timeSlots.length === 0}>
                          <p style="color: #9ca3af; font-size: 0.875rem; margin: 0;">
                            Click "Add Hours" to set your available times
                          </p>
                        </Show>
                        
                        <For each={rule.timeSlots}>
                          {(slot, index) => (
                            <div style="display: flex; align-items: center; gap: 1rem;">
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) => handleUpdateTimeSlot(rule.dayOfWeek, index(), 'start', e.currentTarget.value)}
                                style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                              />
                              <span style="color: #6b7280;">to</span>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) => handleUpdateTimeSlot(rule.dayOfWeek, index(), 'end', e.currentTarget.value)}
                                style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                              />
                              <button
                                onClick={() => handleRemoveTimeSlot(rule.dayOfWeek, index())}
                                style="padding: 0.5rem; border: 1px solid #fecaca; background: white; color: #dc2626; border-radius: 0.375rem; cursor: pointer;"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Date Overrides */}
          <div style="background: white; border-radius: 0.75rem; padding: 2rem; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0;">
                Date Overrides
              </h3>
              <button
                onClick={() => setShowDateOverrideModal(true)}
                style="padding: 0.5rem 1rem; background: #3B82F6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600;"
              >
                + Add Override
              </button>
            </div>

            <p style="color: #6b7280; margin-bottom: 1rem;">
              Add specific dates when you're unavailable (holidays, vacations, etc.)
            </p>

            <Show when={appointmentStore.state.availability!.dateOverrides.length === 0}>
              <p style="color: #9ca3af; text-align: center; padding: 1rem;">
                No date overrides set
              </p>
            </Show>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <For each={appointmentStore.state.availability!.dateOverrides}>
                {(override) => (
                  <div style="display: flex; justify-content: between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600;">
                        {new Date(override.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div style="color: #6b7280; font-size: 0.875rem;">
                        {override.isAvailable ? 'Available' : 'Unavailable'}
                        {override.reason && ` - ${override.reason}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDateOverride(override.id)}
                      style="padding: 0.5rem 1rem; border: 1px solid #fecaca; background: white; color: #dc2626; border-radius: 0.375rem; cursor: pointer;"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Date Override Modal */}
      <Show when={showDateOverrideModal()}>
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
            if (e.target === e.currentTarget) setShowDateOverrideModal(false);
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
            <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem 0;">
              Add Date Override
            </h3>

            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={overrideDate()}
                  onInput={(e) => setOverrideDate(e.currentTarget.value)}
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                />
              </div>

              <div>
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                  <input
                    type="checkbox"
                    checked={overrideAvailable()}
                    onChange={(e) => setOverrideAvailable(e.currentTarget.checked)}
                    style="width: 1.125rem; height: 1.125rem;"
                  />
                  <span>Available on this date</span>
                </label>
                <p style="color: #6b7280; font-size: 0.875rem; margin: 0.5rem 0 0 1.625rem;">
                  Leave unchecked to mark as unavailable
                </p>
              </div>

              <div>
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={overrideReason()}
                  onInput={(e) => setOverrideReason(e.currentTarget.value)}
                  placeholder="e.g., Holiday, Vacation"
                  style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem;"
                />
              </div>

              <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                <button
                  onClick={() => {
                    setShowDateOverrideModal(false);
                    setOverrideDate('');
                    setOverrideAvailable(false);
                    setOverrideReason('');
                  }}
                  style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: white; cursor: pointer; font-weight: 600;"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDateOverride}
                  disabled={!overrideDate()}
                  style={`
                    padding: 0.75rem 1.5rem;
                    background: ${overrideDate() ? '#3B82F6' : '#e5e7eb'};
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: ${overrideDate() ? 'pointer' : 'not-allowed'};
                    font-weight: 600;
                  `}
                >
                  Add Override
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default AvailabilitySettings;