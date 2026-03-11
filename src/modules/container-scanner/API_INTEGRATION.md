# Container Scanner - API Integration Documentation

## Overview

The Container Scanner module has been integrated with real GraphQL backend endpoints for shipping containers and inventory management.

## API Queries Used

### Shipping Containers

| Operation | GraphQL Query | Parameters | Description |
|-----------|--------------|------------|-------------|
| **List All** | `getAllShippingContainers` | `businessId` | Fetch all containers for a business |
| **Get By ID** | `getShippingContainerById` | `businessId`, `id` | Fetch single container details |
| **Create** | `addShippingContainer` | `businessId`, `userId`, `timestamp` + form data | Create new container |
| **Update** | `updateShippingContainer` | `businessId`, `id`, `userId`, `timestamp` + form data | Update container details |
| **Delete** | `deleteShippingContainer` | `businessId`, `id`, `userId` | Delete container |

### Inventory (Bulks)

| Operation | GraphQL Query | Parameters | Description |
|-----------|--------------|------------|-------------|
| **Add Bulk** | `addInventory` | `businessId`, `userId`, `timestamp` + form data | Add bulk/item to container |
| **Update Bulk** | `updateInventory` | `businessId`, `id`, `userId`, `timestamp` + form data | Update bulk details |
| **Delete Bulk** | `deleteInventory` | `businessId`, `id`, `userId` | Delete bulk/item |

## File: containerManagementApi.ts

### Functions Implemented

#### 1. `listContainers(): Promise<Container[]>`
- **Mock Mode**: Returns mock data from in-memory store
- **Real Mode**: Uses `getAllShippingContainers` query
- **Response Transform**: Maps backend fields to Container type
```typescript
{
  id: item.id || item.containerId,
  containerNumber: item.containerNumber || item.containerNo,
  bulkIds: item.bulkIds || [],
  bulks: item.bulks || [],
  status: item.status || 'in_transit',
  arrivedAt: item.arrivedAt,
  receivedAt: item.receivedAt,
  totalBulks: item.totalBulks || (item.bulks?.length || 0)
}
```

#### 2. `getContainer(id: string): Promise<Container>`
- **Mock Mode**: Returns single container from mock store
- **Real Mode**: Uses `getShippingContainerById` query
- **Error Handling**: Throws "Container not found" if not exists

#### 3. `createContainer(data): Promise<Container>`
- **Mock Mode**: Generates ID and stores in mock database
- **Real Mode**: Uses `addShippingContainer` mutation
- **Generated Fields**:
  - `id`: Generated using `generateShortCode(16)`
  - `createdAt`: ISO timestamp
  - `updatedAt`: ISO timestamp
  - `bulkIds`: Empty array initially
  - `totalBulks`: 0 initially

#### 4. `updateContainer(id: string, data): Promise<Container>`
- **Mock Mode**: Updates mock store entry
- **Real Mode**: Uses `updateShippingContainer` mutation
- **Refresh**: Fetches updated container after mutation

#### 5. `deleteContainer(id: string): Promise<void>`
- **Mock Mode**: Removes from mock store and cascades delete to bulks
- **Real Mode**: Uses `deleteShippingContainer` mutation

#### 6. `addBulk(data): Promise<Bulk>`
- **Mock Mode**: Generates ID, adds to container's bulkIds
- **Real Mode**: Uses `addInventory` mutation
- **Generated Fields**:
  - `id`: Generated using `generateShortCode(16)`
  - `status`: 'pending' by default
  - `createdAt`: ISO timestamp

#### 7. `updateBulk(id: string, data): Promise<Bulk>`
- **Mock Mode**: Updates mock store entry
- **Real Mode**: Uses `updateInventory` mutation

#### 8. `deleteBulk(id: string): Promise<void>`
- **Mock Mode**: Removes from mock store and container's bulkIds
- **Real Mode**: Uses `deleteInventory` mutation

## Integration with authStore

All real API calls include:
- `businessId: authStore.getBusinessId()` - Current business context
- `userId: authStore.state?.user?.uid` - Current user ID for audit trail
- `timestamp: new Date().getTime()` - Operation timestamp

## Error Handling

All functions use try-catch blocks:
```typescript
try {
  // API call
} catch (error) {
  console.error('Error message:', error);
  throw error;
}
```

## Mock Mode

Controlled by `config.useMockApi` from scanner config:
- When `true`: Uses in-memory Map storage
- When `false`: Makes real GraphQL API calls via `fetchGraphQLSS`

## Data Transformation

Backend responses are transformed to match the TypeScript interfaces:

### Container Type
```typescript
interface Container {
  id: string;
  containerNumber: string;
  bulkIds: string[];
  bulks?: Bulk[];
  status: 'in_transit' | 'arrived' | 'receiving' | 'received';
  arrivedAt?: string;
  receivedAt?: string;
  totalBulks: number;
}
```

### Bulk Type
```typescript
interface Bulk {
  id: string;
  containerId: string;
  trackingNumber: string;
  name?: string;
  status: 'pending' | 'scanned' | 'received';
  scannedAt?: string;
}
```

## Usage Example

```typescript
// List containers
const containers = await listContainers();

// Create container
const newContainer = await createContainer({
  containerNumber: 'CONT-2024-001',
  status: 'in_transit'
});

// Add bulk to container
const bulk = await addBulk({
  containerId: newContainer.id,
  trackingNumber: 'TRACK-001',
  name: 'Electronics'
});

// Update container status
await updateContainer(newContainer.id, {
  status: 'arrived',
  arrivedAt: new Date().toISOString()
});

// Delete bulk
await deleteBulk(bulk.id);

// Delete container
await deleteContainer(newContainer.id);
```

## Backend Query Format

All queries follow this structure:
```typescript
const bdyq2 = {
  query: "queryName",           // GraphQL query name
  params: {                     // Query parameters
    businessId: "xxx",
    id: "xxx",
    userId: "xxx",
    timestamp: 123456789
  },
  form: {                       // Form data (for mutations)
    field1: "value",
    field2: "value"
  }
};

const response = await fetchGraphQLSS(bdyq2);
```

## Testing

### Mock Mode Testing
1. Set `useMockApi: true` in scanner config
2. Uses predefined test data:
   - `container-test-001` with 3 bulks
   - `container-test-002` with 2 bulks

### Real API Testing
1. Set `useMockApi: false` in scanner config
2. Ensure backend GraphQL queries are implemented
3. Verify business permissions for container management

## Future Enhancements

Potential GraphQL queries to implement:
- `searchShippingContainers` - Search with filters
- `getShippingContainersByStatus` - Filter by status
- `getShippingContainersByDateRange` - Date range filtering
- `getShippingContainersByVessel` - Filter by vessel
- `trackContainer` - Real-time tracking
- `getShippingContainerStats` - Analytics
- `updateContainerStatus` - Status-only updates
- `calculateContainerCost` - Cost calculations
- `getInventoryByLocation` - Location-based queries
- `getLowStockItems` - Stock alerts
- `adjustInventoryQuantity` - Quantity adjustments
- `transferInventory` - Transfer between locations
- `getInventoryStats` - Inventory analytics
- `getInventoryValuation` - Value calculations
- `checkInventoryAvailability` - Availability checks

## Notes

- All timestamps are in ISO 8601 format
- IDs are generated using `generateShortCode(16)` for unique identification
- Mock mode maintains data in memory (resets on page refresh)
- Real mode persists to database via GraphQL backend
- Cascade delete: Deleting a container removes all associated bulks (mock mode only - real API should handle cascade)
