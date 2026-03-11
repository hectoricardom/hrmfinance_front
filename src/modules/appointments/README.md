# Appointments Module - Calendly Clone

A comprehensive appointment scheduling system built with SolidJS, similar to Calendly. This module allows users to manage their availability, create event types, and accept bookings from clients.

## Features

### 1. **Event Types Management**
- Create multiple event types (consultations, meetings, etc.)
- Configure duration, location type (video, phone, in-person)
- Set buffer times before and after appointments
- Custom colors for visual organization
- Approval workflow for sensitive appointments
- Active/inactive toggle for each event type

### 2. **Availability Management**
- Set weekly recurring availability by day
- Multiple time slots per day
- Date overrides for holidays and special occasions
- Configurable minimum notice period
- Maximum advance booking window
- Customizable time slot intervals (15, 30, 60 minutes)

### 3. **Public Booking Page**
- Clean, user-friendly interface for clients
- Step-by-step booking flow:
  1. Select event type
  2. Choose date and time
  3. Enter contact details
  4. Confirmation
- Real-time availability checking
- Calendar view for date selection
- Mobile-responsive design

### 4. **Appointment Dashboard**
- View all appointments (upcoming, past, all)
- Real-time statistics:
  - Upcoming appointments
  - Today's appointments
  - Weekly totals
  - Overall statistics
- Appointment management:
  - Confirm pending bookings
  - Mark as completed
  - Cancel with reason
  - View guest details

### 5. **Scheduling Logic**
- Intelligent time slot generation
- Conflict detection with existing appointments
- Buffer time management
- Timezone support
- Date/time formatting utilities

## Usage

### Setting Up Your Availability

```typescript
import { appointmentStore } from './modules/appointments';

// Load user's availability settings
await appointmentStore.loadAvailability(userId);

// Update availability
await appointmentStore.saveAvailability({
  userId,
  timezone: 'America/New_York',
  weeklyAvailability: [...],
  dateOverrides: [...],
  minimumNotice: 24, // hours
  maximumAdvance: 60, // days
  slotInterval: 30 // minutes
});
```

### Creating Event Types

```typescript
import { appointmentStore } from './modules/appointments';

await appointmentStore.createEventType(userId, {
  name: '30-Minute Consultation',
  description: 'Quick consultation call',
  duration: 30,
  color: '#3B82F6',
  locationType: 'video',
  requiresApproval: false,
  reminderEnabled: true,
  isActive: true
});
```

### Managing Appointments

```typescript
import { appointmentStore } from './modules/appointments';

// Load all appointments
await appointmentStore.loadAppointments(userId);

// Get upcoming appointments
const upcoming = appointmentStore.getUpcomingAppointments();

// Get today's appointments
const today = appointmentStore.getTodayAppointments();

// Cancel an appointment
await appointmentStore.cancelAppointment(
  appointmentId,
  'host',
  'Schedule conflict'
);
```

### Using the Scheduling Service

```typescript
import { schedulingService } from './modules/appointments';

// Generate available time slots
const slots = schedulingService.generateTimeSlots(
  date,
  eventType,
  availability,
  existingAppointments
);

// Check if a specific slot is available
const isAvailable = schedulingService.isSlotAvailable(
  slotTime,
  eventType,
  existingAppointments
);

// Format date/time for display
const formatted = schedulingService.formatDateTime(date, 'long');
```

## Routes

Add these routes to your [`App.tsx`](../../App.tsx:368):

```typescript
// Protected routes (require authentication)
<Route path="/appointments" component={AppointmentDashboard} />
<Route path="/event-types" component={EventTypeManager} />
<Route path="/availability" component={AvailabilitySettings} />

// Public booking page (no authentication)
<Route path="/book/:userId" component={BookingPage} />
```

## Firestore Collections

The module uses these Firestore collections:

### `eventTypes`
```typescript
{
  id: string;
  name: string;
  description: string;
  duration: number;
  color: string;
  locationType: 'video' | 'phone' | 'in-person' | 'custom';
  location?: string;
  bufferTimeBefore?: number;
  bufferTimeAfter?: number;
  requiresApproval: boolean;
  reminderEnabled: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `availability`
```typescript
{
  id: string; // Same as userId
  userId: string;
  timezone: string;
  weeklyAvailability: AvailabilityRule[];
  dateOverrides: DateOverride[];
  minimumNotice: number;
  maximumAdvance: number;
  slotInterval: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `appointments`
```typescript
{
  id: string;
  eventTypeId: string;
  eventTypeName: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestTimezone: string;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: number;
  timezone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  location: string;
  locationType: string;
  notes?: string;
  cancellationReason?: string;
  cancelledBy?: 'host' | 'guest';
  cancelledAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `bookingPageSettings`
```typescript
{
  userId: string;
  customUrl: string;
  displayName: string;
  welcomeMessage?: string;
  profileImage?: string;
  brandColor?: string;
  showProfileImage: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Firestore Security Rules

Add these rules to your `firestore.rules`:

```
// Event Types - users can only manage their own
match /eventTypes/{eventTypeId} {
  allow read: if true; // Public for booking page
  allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.createdBy == request.auth.uid;
}

// Availability - users can only manage their own
match /availability/{userId} {
  allow read: if true; // Public for booking page
  allow write: if request.auth != null && request.auth.uid == userId;
}

// Appointments
match /appointments/{appointmentId} {
  allow read: if request.auth != null && 
    (resource.data.hostId == request.auth.uid || 
     resource.data.guestEmail == request.auth.token.email);
  allow create: if true; // Anyone can book
  allow update: if request.auth != null && resource.data.hostId == request.auth.uid;
  allow delete: if request.auth != null && resource.data.hostId == request.auth.uid;
}

// Booking Page Settings
match /bookingPageSettings/{userId} {
  allow read: if true; // Public for booking page
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Permissions

Add to user profile in Firestore:

```typescript
{
  // ... other permissions
  AppointmentAccess: boolean
}
```

## Components

### EventTypeManager
Manage all event types - create, edit, delete, and toggle active status.

### AvailabilitySettings
Configure weekly hours, date overrides, and booking settings.

### AppointmentDashboard
View and manage all appointments with statistics.

### BookingPage
Public-facing booking interface for clients (no authentication required).

## Future Enhancements

- [ ] Email notifications (confirmation, reminders)
- [ ] SMS notifications
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Video meeting link generation (Zoom, Meet)
- [ ] Custom booking form questions
- [ ] Payment integration
- [ ] Team scheduling
- [ ] Round-robin assignment
- [ ] Analytics and reporting
- [ ] Webhook support
- [ ] API endpoints
- [ ] Embedded booking widget
- [ ] Multiple timezone support in UI
- [ ] Recurring appointments
- [ ] Waitlist functionality

## License

Part of the HRM Finance application.