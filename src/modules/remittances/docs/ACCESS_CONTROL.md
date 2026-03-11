# Remittance Access Control Documentation

## Overview
The remittance module implements a comprehensive role-based access control system to ensure secure management of remittances based on user permissions.

## Permission Structure

### 1. **RemittanceAccess Permission**
- A new permission added to the system
- Required to access the remittance functionality
- Can be assigned to users via Admin Panel

### 2. **User Roles & Capabilities**

#### **Regular Users (with RemittanceAccess)**
- ✅ Create new remittances
- ✅ View their own remittances only
- ✅ Edit their own remittances
- ✅ Delete their own remittances
- ✅ Update status of their own remittances
- ❌ Cannot see other users' remittances
- ❌ Cannot see "Created by" column

#### **Read/Write Users (with read_write permission)**
- ✅ All regular user permissions
- ✅ View ALL remittances in the system
- ✅ Edit/Delete any remittance
- ✅ Update status of any remittance
- ✅ See "Created by" column

#### **Admin Users (with isAdmin permission)**
- ✅ Full unrestricted access
- ✅ View ALL remittances
- ✅ Edit/Delete any remittance
- ✅ See "Created by" column
- ✅ Manage user permissions

## Implementation Details

### 1. **Navigation Access**
```typescript
// In Navigation.tsx
{ 
  path: '/remittances', 
  label: 'Remittances', 
  permission: 'RemittanceAccess',
  icon: 'money-transfer'
}
```

### 2. **Route Protection**
```typescript
// In App.tsx
<Route path="/remittances" component={() => (
  <ProtectedLayout permission="RemittanceAccess" featureName="Remittances">
    <Remittances />
  </ProtectedLayout>
)} />
```

### 3. **API Filtering**
The API automatically filters remittances based on user role:
```typescript
// Regular users only see their own remittances
if (profile && !profile.isAdmin && !profile.read_write) {
  params[':createdBy'] = authStore.currentUser?.uid || 'unknown';
  queryParts.push('createdBy = :createdBy');
}
```

### 4. **UI Permissions**
- Edit/Delete buttons only show for:
  - The creator of the remittance
  - Users with read_write permission
  - Admin users
  
- Status dropdown is read-only for users who cannot edit

### 5. **List View Differences**
- Admin/Read-Write users see "Created by" column
- Regular users don't see this column

## How to Grant Access

### For Admin Users:
1. Go to Admin Panel (Admin → Users)
2. Find the user you want to grant access
3. Check the "Remittance Access" permission
4. Save changes

### Permission Combinations:
- **RemittanceAccess only**: Basic access (own remittances)
- **RemittanceAccess + read_write**: Full read/write access to all remittances
- **RemittanceAccess + isAdmin**: Full admin access

## Security Features

1. **Server-side filtering**: API filters data based on user role
2. **Client-side UI protection**: Buttons and actions are hidden based on permissions
3. **Double verification**: Both client and server validate permissions
4. **Audit trail**: All remittances track who created them via `createdBy` field

## Testing Access Levels

### Test as Regular User:
1. Create a user with only RemittanceAccess
2. Login and verify:
   - Can create remittances
   - Can only see own remittances
   - Can edit/delete own remittances

### Test as Read/Write User:
1. Add read_write permission to a user with RemittanceAccess
2. Login and verify:
   - Can see all remittances
   - Can edit/delete any remittance
   - Can see "Created by" column

### Test as Admin:
1. Set isAdmin = true for a user
2. Login and verify full unrestricted access

## Database Fields
Each remittance includes:
- `createdBy`: User ID of the creator
- `businessId`: Business context
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp