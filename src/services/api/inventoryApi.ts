import { apiService } from '../api';
import { InventoryItem } from '../../modules/inventory/stores/inventoryStore';
import {
  GET_INVENTORY,
  GET_INVENTORY_BY_ID,
  CREATE_INVENTORY_ITEM,
  UPDATE_INVENTORY_ITEM,
  DELETE_INVENTORY_ITEM
} from '../graphql/queries';
import { fetchGraphQL } from '../utils';
import { apiAdapter, inventoryApi as fakeInventoryApi } from '../apiAdapter';

export interface CreateInventoryItemInput {
  productCode: string;
  productName: string;
  sku: string;
  description?: string;
  category: string;
  unitOfMeasure: string;
  unitCost: number;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  locationId: string;
  locationName: string;
  isActive?: boolean;
}

export interface UpdateInventoryItemInput extends Partial<CreateInventoryItemInput> {}

export interface InventoryFilter {
  category?: string;
  locationId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  search?: string;
}

export interface InventorySort {
  field: 'productCode' | 'productName' | 'category' | 'quantity' | 'unitCost' | 'createdAt';
  direction: 'asc' | 'desc';
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unitCost?: number;
  reference?: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export class InventoryApi {
  // Get all inventory items
  async getInventory(query: string = "",  filter?: InventoryFilter, sort?: InventorySort): Promise<any[]> {
  
    console.log("getInventory", query)
    try {
      // Use fake API if in fake mode
     
      if(!query.trim()){
        return []
      } 
    
      // Real API implementation
      let  params: Record<string, any> = {
        businessId: "YB100423253156428",
      }
      

       query && query?.split(" ")?.map((qry,inDq)=>{
        if(qry){
            params[":search"+inDq] = qry.trim();
        }
      })

        let bdyq2 = {
          query: "getScanYabaInventory",
          queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
          params
        }
        console.log('Real API bdyq2:', bdyq2)
        const response = await fetchGraphQL(bdyq2)
        console.log('Real API response:', response)
        return response || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      // Fallback to fake API in hybrid mode
      
      throw error;
    }
  }



  async getProducts(query: string = "", sort?: InventorySort): Promise<Record<string, any>[]> {
    try {
      // Use fake API if in fake mode
      
      // Real API implementation
      let  params: Record<string, any> = {
        businessId: "YB100423253156428",
      }
      
      if(!query.trim()){
        return []
      } 

      query && query.split(" ").map((qry,inDq)=>{
        if(qry){
            params[":search"+inDq] = qry.trim();
        }
      })

      let bdyq2 = {
        query: "getScanYabaProducts",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
        params
      }
        
      const response = await fetchGraphQL(bdyq2)
      console.log('Real API products response:', response)
      return response || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to fake API in hybrid mode
      if (apiAdapter.isHybridMode()) {
        console.warn('Falling back to fake API for products');
        return await fakeInventoryApi.getProducts(query);
      }
      throw error;
    }
  }

  // Get inventory item by ID
  async getInventoryById(id: string): Promise<InventoryItem | null> {
    try {
      const response = await apiService.graphql<{ inventoryItem: InventoryItem }>({
        query: GET_INVENTORY_BY_ID,
        variables: { id }
      });
      return response.inventoryItem;
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      throw error;
    }
  }

  // Create new inventory item
  async createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    try {
      this.validateInventoryItem(input);

      const response = await apiService.graphql<{ createInventoryItem: InventoryItem }>({
        query: CREATE_INVENTORY_ITEM,
        variables: { input }
      });
      return response.createInventoryItem;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  // Update inventory item
  async updateInventoryItem(id: string, input: UpdateInventoryItemInput): Promise<InventoryItem> {
    try {
      const response = await apiService.graphql<{ updateInventoryItem: InventoryItem }>({
        query: UPDATE_INVENTORY_ITEM,
        variables: { id, input }
      });
      return response.updateInventoryItem;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  // Delete inventory item
  async deleteInventoryItem(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.graphql<{ deleteInventoryItem: { success: boolean; message: string } }>({
        query: DELETE_INVENTORY_ITEM,
        variables: { id }
      });
      return response.deleteInventoryItem;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  // Get inventory by category
  async getInventoryByCategory(category: string): Promise<InventoryItem[]> {
    return this.getInventory({ category });
  }

  // Get inventory by location
  async getInventoryByLocation(locationId: string): Promise<InventoryItem[]> {
    return this.getInventory({ locationId });
  }

  // Get low stock items
  async getLowStockItems(): Promise<InventoryItem[]> {
    return this.getInventory({ lowStock: true });
  }

  // Search inventory
  async searchInventory(query: string): Promise<InventoryItem[]> {
    return this.getInventory({ search: query });
  }

  // Adjust stock
  async adjustStock(id: string, quantity: number, type: 'in' | 'out' | 'adjustment', reference?: string): Promise<InventoryItem> {
    try {
      const item = await this.getInventoryById(id);
      if (!item) {
        throw new Error('Inventory item not found');
      }

      let newQuantity: number;
      switch (type) {
        case 'in':
          newQuantity = item.quantity + quantity;
          break;
        case 'out':
          newQuantity = item.quantity - quantity;
          break;
        case 'adjustment':
          newQuantity = quantity;
          break;
        default:
          throw new Error('Invalid stock movement type');
      }

      if (newQuantity < 0) {
        throw new Error('Insufficient stock');
      }

      const updatedItem = await this.updateInventoryItem(id, { quantity: newQuantity });
      
      // Log stock movement (if API supports it)
      await this.logStockMovement({
        inventoryItemId: id,
        type,
        quantity: type === 'adjustment' ? quantity - item.quantity : quantity,
        reference,
        description: `Stock ${type} - ${reference || 'Manual adjustment'}`
      });

      return updatedItem;
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

  // Generate inventory report
  async generateInventoryReport(filter?: InventoryFilter): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    categories: Record<string, number>;
    locations: Record<string, number>;
  }> {
    try {
      const inventory = await this.getInventory(filter);
      
      const report = {
        totalItems: inventory.length,
        totalValue: 0,
        lowStockItems: 0,
        categories: {} as Record<string, number>,
        locations: {} as Record<string, number>
      };

      inventory.forEach(item => {
        // Total value
        report.totalValue += item.quantity * item.unitCost;

        // Low stock items
        if (item.quantity <= item.minStockLevel) {
          report.lowStockItems++;
        }

        // Categories
        if (!report.categories[item.category]) {
          report.categories[item.category] = 0;
        }
        report.categories[item.category]++;

        // Locations
        if (!report.locations[item.locationName]) {
          report.locations[item.locationName] = 0;
        }
        report.locations[item.locationName]++;
      });

      return report;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw error;
    }
  }

  // Log stock movement
  private async logStockMovement(movement: Omit<StockMovement, 'id' | 'createdAt' | 'createdBy'>): Promise<void> {
    // This would typically call a separate API endpoint for stock movements
    // For now, we'll just log it
    console.log('Stock movement:', movement);
  }

  // Validate inventory item
  private validateInventoryItem(input: CreateInventoryItemInput): void {
    if (!input.productCode.trim()) {
      throw new Error('Product code is required');
    }
    
    if (!input.productName.trim()) {
      throw new Error('Product name is required');
    }
    
    if (!input.sku.trim()) {
      throw new Error('SKU is required');
    }
    
    if (!input.category.trim()) {
      throw new Error('Category is required');
    }
    
    if (!input.unitOfMeasure.trim()) {
      throw new Error('Unit of measure is required');
    }
    
    if (input.unitCost < 0) {
      throw new Error('Unit cost cannot be negative');
    }
    
    if (input.quantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    
    if (input.minStockLevel < 0) {
      throw new Error('Minimum stock level cannot be negative');
    }
    
    if (input.maxStockLevel < input.minStockLevel) {
      throw new Error('Maximum stock level must be greater than minimum stock level');
    }
    
    if (!input.locationId.trim()) {
      throw new Error('Location is required');
    }
  }

  // Generate next product code
  async generateNextProductCode(category: string): Promise<string> {
    try {
      const items = await this.getInventoryByCategory(category);
      const categoryPrefix = category.toUpperCase().slice(0, 3);
      
      if (items.length === 0) {
        return `${categoryPrefix}001`;
      }

      const categoryItems = items.filter(item => 
        item.productCode.startsWith(categoryPrefix)
      );

      if (categoryItems.length === 0) {
        return `${categoryPrefix}001`;
      }

      const lastItem = categoryItems.sort((a, b) => 
        b.productCode.localeCompare(a.productCode)
      )[0];

      const lastNumber = parseInt(lastItem.productCode.slice(-3));
      const nextNumber = lastNumber + 1;

      return `${categoryPrefix}${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating product code:', error);
      const categoryPrefix = category.toUpperCase().slice(0, 3);
      return `${categoryPrefix}${Date.now().toString().slice(-3)}`;
    }
  }
}

// Export singleton instance
export const inventoryApi = new InventoryApi();