import { createSignal } from 'solid-js';
import { apiAdapter, inventoryApi, movementsApi } from '../../../services/apiAdapter';
import { devLog, fetchGraphQLSS, generateShortCode, getType } from '../../../services/utils';
import { AddSubAccountModal } from '../../accounts';
import { authStore } from '../../../stores/authStore';
import { db } from '../../../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { inventoryEventIntegration } from '../../events/integrations/inventoryIntegration';



export interface ProductOnInv {
  id: string;
  name?: string | undefined;
  label: string | undefined;
  sku?: string | undefined;
  UPC?: string | undefined;
  code?: string | undefined;
}

// Price override for a specific location
export interface LocationPrice {
  sellingPrice: number;
  effectiveDate?: string;
  notes?: string;
}

// Map of locationId to price override
export type PricesByLocation = Record<string, LocationPrice>;

export interface Product {
  id: string;
  name: string;
  sku: string;
  UPC?: string;
  code?: string;
  numCode?: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  unitCost: number;
  sellingPrice: number;
  minStockLevel: number;
  maxStockLevel: number;
  minStock?: number;
  isActive: boolean;
  createdDate: string;
  lastModified: string;
  businessId: string;
  productImageUrl?: string;
  location?: string;
  // Location-specific pricing
  pricesByLocation?: PricesByLocation;
}

// Default markup multiplier when no price is set
const DEFAULT_MARKUP_MULTIPLIER = 1.666;

/**
 * Get the effective selling price for a product at a specific location.
 * Priority:
 * 1. Location-specific price (pricesByLocation[locationId])
 * 2. Default product selling price (if > 0)
 * 3. Calculated price: unitCost * 1.666
 */
export function getEffectivePrice(product: Product | any, locationId?: string): number {
  // 1. Check for location-specific price
  if (locationId && product?.pricesByLocation?.[locationId]?.sellingPrice) {
    return product.pricesByLocation[locationId].sellingPrice;
  }

  // 2. Use default selling price if set and greater than 0
  if (product?.sellingPrice && product.sellingPrice > 0) {
    return product.sellingPrice;
  }

  // 3. Calculate from unit cost with default markup
  const unitCost = product?.unitCost || product?.costPrice || product?.price || 0;
  return unitCost * DEFAULT_MARKUP_MULTIPLIER;
}

/**
 * Get price info with breakdown for display purposes
 */
export function getPriceInfo(product: Product | any, locationId?: string): {
  price: number;
  source: 'location' | 'default' | 'calculated';
  locationName?: string;
} {
  // 1. Check for location-specific price
  if (locationId && product?.pricesByLocation?.[locationId]?.sellingPrice) {
    return {
      price: product.pricesByLocation[locationId].sellingPrice,
      source: 'location'
    };
  }

  // 2. Use default selling price if set
  if (product?.sellingPrice && product.sellingPrice > 0) {
    return {
      price: product.sellingPrice,
      source: 'default'
    };
  }

  // 3. Calculate from unit cost
  const unitCost = product?.unitCost || product?.costPrice || product?.price || 0;
  return {
    price: unitCost * DEFAULT_MARKUP_MULTIPLIER,
    source: 'calculated'
  };
}

export interface Location {
  id: string;
  name: string;
  code?: string;
  type?: 'warehouse' | 'store' | 'supplier' | 'customer';
  address?: string;
  isActive?: boolean;
  createdDate?: string;
  bussinesId?: string;
  businessId?: string; // Alternative spelling
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationName: string;
  movementType: 'in' | 'out' | 'transfer' | 'adjustment' | 'ENTRY' | "SALES";
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'ENTRY' | "SALES" | 'TRANSFER';
  quantity: number;
  unitCost: number;
  totalCost: number;
  minStock: number;
  location?: string;
  referenceNumber: string;
  notes: string;
  createdBy: string;
  createdDate: string;
  fromLocationId?: string;
  fromLocationName?: string;
  toLocationId?: string;
  toLocationName?: string;
  invoiceId?: string; // Link multiple movements to one invoice/transaction
  // Provider/Customer info
  entityId?: string;
  entityName?: string;
  entityType?: 'provider' | 'customer' | 'both';
}

export interface BulkMovementItem {
  productId: string;
  quantity?: number;
  qty: number;
  unitCost?: number;
  price?: number;
  salePrice?: number;
  costPrice?: number;
  notes?: string;
  product: ProductOnInv
  reason?: string;
}

export interface BulkMovementRequest {
  invoiceId: string;
  referenceNumber?: string;
  movementType: 'in' | 'out' | 'transfer' | 'adjustment';
  type: 'TRANSFER' | 'ENTRY' | 'SALES' | 'adjustment';
  locationId: string;
  fromLocationId?: string;
  items: BulkMovementItem[];
  generalNotes?: string;
  createdBy: string;
  description?: string,
  products?: BulkMovementItem[],
  invoice: string;
  store?: string,
  createDate?: string | number;
  ssg_inventory_key?: string;
  businessId?: string;
  // Provider/Customer info
  entityId?: string;
  entityName?: string;
  entityType?: 'provider' | 'customer' | 'both';
}

export interface InventoryStock {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  lastMovementDate: string;
  lastMovementType: string;
  locationName?: string;
}

// Legacy interface for backward compatibility
export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  description: string;
  sku: string;
  supplier: string;
  minStock: number;
  location: string;
  lastUpdated: string;
}

// Sample data
const sampleProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Wireless Headphones',
    sku: 'WH-001',
    description: 'High-quality wireless bluetooth headphones',
    category: 'Electronics',
    unitOfMeasure: 'pcs',
    unitCost: 45.00,
    sellingPrice: 89.99,
    minStockLevel: 10,
    maxStockLevel: 100,
    isActive: true,
    createdDate: '2024-01-15',
    lastModified: '2024-01-15',
    businessId: ""
  },
  {
    id: 'prod-002',
    name: 'USB-C Cable',
    sku: 'USB-001',
    description: '3ft USB-C charging cable',
    category: 'Accessories',
    unitOfMeasure: 'pcs',
    unitCost: 8.50,
    sellingPrice: 19.99,
    minStockLevel: 25,
    maxStockLevel: 200,
    isActive: true,
    createdDate: '2024-01-16',
    lastModified: '2024-01-16',
    businessId: ""
  },
  {
    id: 'prod-003',
    name: 'Laptop Stand',
    sku: 'LS-001',
    description: 'Adjustable aluminum laptop stand',
    category: 'Office',
    unitOfMeasure: 'pcs',
    unitCost: 25.00,
    sellingPrice: 49.99,
    minStockLevel: 5,
    maxStockLevel: 50,
    isActive: true,
    createdDate: '2024-01-17',
    lastModified: '2024-01-17',
    businessId: ""
  },
  {
    id: 'prod-004',
    name: 'Wireless Mouse',
    sku: 'WM-001',
    description: 'Ergonomic wireless optical mouse',
    category: 'Electronics',
    unitOfMeasure: 'pcs',
    unitCost: 12.00,
    sellingPrice: 24.99,
    minStockLevel: 15,
    maxStockLevel: 75,
    isActive: true,
    createdDate: '2024-01-18',
    lastModified: '2024-01-18',
    businessId: ""
  }
];










// Sample locations removed - now loaded from Firestore via loadLocationsFromFirestore()
// This ensures store data is always up-to-date and centrally managed

const sampleMovements: InventoryMovement[] = [

];

// Legacy data for backward compatibility
const initialInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'MacBook Pro 16"',
    price: 2399.00,
    quantity: 75,
    category: 'Electronics',
    description: 'Apple MacBook Pro 16-inch with M2 Pro chip',
    sku: 'MBP-16-M2P',
    supplier: 'Apple Inc.',
    minStock: 10,
    location: 'Warehouse A',
    lastUpdated: '2024-01-15'
  },
  {
    id: '2',
    name: 'Dell Monitor 27"',
    price: 299.00,
    quantity: 35,
    category: 'Electronics',
    description: 'Dell 27-inch 4K UHD Monitor',
    sku: 'DELL-MON-27-4K',
    supplier: 'Dell Technologies',
    minStock: 15,
    location: 'Warehouse B',
    lastUpdated: '2024-01-14'
  },
  {
    id: '3',
    name: 'Wireless Mouse',
    price: 49.99,
    quantity: 12,
    category: 'Accessories',
    description: 'Ergonomic wireless mouse with precision tracking',
    sku: 'MOUSE-WL-001',
    supplier: 'Logitech',
    minStock: 25,
    location: 'Warehouse A',
    lastUpdated: '2024-01-13'
  },

];

// Calculate stock levels from movements
const calculateStockLevels = (): InventoryStock[] => {
  const stockMap = new Map<string, InventoryStock>();

  // devLog('=== Calculating Stock Levels ===');
  // devLog('Total movements to process:', movements()?.length);

  // Process all movements to calculate current stock
  movements().forEach((movement, idx) => {
    const locationId = movement?.store;
    const movementType = movement?.type;



    movement?.products?.forEach((product, pIdx) => {
      // Extract productId from various possible locations
      const extractedProductId = product.productId || product?.product?.id || product?.id;

      //devLog(product)
      if (!extractedProductId) {
        //console.warn('No productId found in product:', product);
        return; // Skip this product
      }

      const key = `${extractedProductId}-${locationId}`;



      let locationObj = inventoryStore.getLocationById(locationId)


      let stock = stockMap.get(key);
      if (!stock) {
        stock = {
          id: key,
          productId: extractedProductId,
          //locationId: movement.locationId,
          locationId: locationId,
          locationName: locationObj?.name,
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          averageCost: 0,
          lastMovementDate: movement?.createdDate || movement?.createdAt,
          lastMovementType: movementType
        };
        stockMap.set(key, stock);
      }

      const movementTypeLw = movementType?.toLowerCase();
      const productQty = (product.qty || product.quantity || 0) * 1;

      // Update quantity based on movement type
      if (movementTypeLw === 'entry' || movementTypeLw === 'in' || movementTypeLw === 'transfer') {
        if (locationId === movement.toLocationId || movementTypeLw === 'in' || movementTypeLw === 'entry') {
          stock.quantity += productQty;
        }
      } else if (movementTypeLw === 'out' || movementTypeLw === "sales") {
        stock.quantity -= productQty;
      } else if (movementTypeLw === 'adjustment') {
        stock.quantity = productQty; // Adjustment sets absolute quantity
      }

      // Update last movement info
      const movementDate = movement?.createdDate || movement?.createDate;
      if (movementDate && new Date(movementDate) > new Date(stock.lastMovementDate || 0)) {
        stock.lastMovementDate = movementDate;
        stock.lastMovementType = movementTypeLw || movement.movementType;
      }

      // Calculate average cost (simplified - would be more complex in real implementation)
      const productCost = (product.price || product.unitCost || 0) * 1;
      if (productCost > 0) {
        stock.averageCost = productCost;
      }
      stock.availableQuantity = stock.quantity * 1 - stock.reservedQuantity * 1;
    });
  });

  const result = Array.from(stockMap.values());
  devLog('=== Stock Levels Calculated ===');
  //devLog('Total stock entries:', result.length);
  if (result.length > 0) {
    //devLog('Sample stock entries:', result.slice(0, 3));
    // Log unique location IDs
    const uniqueLocations = [...new Set(result.map(s => s.locationId))];
    //devLog('Unique locations in stock:', uniqueLocations);
  }

  return result;
};

const [products, setProducts] = createSignal<Product[]>([]);
const [movements, setMovements] = createSignal<InventoryMovement[]>([]);

// Initialize stock levels after movements are set
const [stockLevels, setStockLevels] = createSignal<InventoryStock[]>([]);

// Calculate initial stock levels
const calculateInitialStockLevels = (): InventoryStock[] => {
  const stockMap = new Map<string, InventoryStock>();


  // Process all movements to calculate current stock
  movements().forEach(movement => {
    const key = `${movement.productId}-${movement.locationId}`;
    let stock = stockMap.get(key);
    let locationObj = inventoryStore.getLocationById(movement.locationId)

    if (!stock) {
      stock = {
        id: key,
        productId: movement.productId,
        locationId: movement.locationId,
        locationName: locationObj?.name,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        averageCost: 0,
        lastMovementDate: movement.createdDate,
        lastMovementType: movement.movementType
      };
      stockMap.set(key, stock);
    }

    // Update quantity based on movement type
    if (movement.movementType === 'in' || movement.movementType === 'transfer') {
      if (movement.locationId === movement.toLocationId || movement.movementType === 'in') {
        stock.quantity += movement.quantity * 1;
      }
    } else if (movement.movementType === 'out') {
      stock.quantity -= movement.quantity * 1;
    } else if (movement.movementType === 'adjustment') {
      stock.quantity = movement.quantity * 1; // Adjustment sets absolute quantity
    }

    // Update last movement info
    if (new Date(movement.createdDate) > new Date(stock.lastMovementDate)) {
      stock.lastMovementDate = movement.createdDate;
      stock.lastMovementType = movement.movementType;
    }

    // Calculate average cost (simplified - would be more complex in real implementation)
    stock.averageCost = movement.unitCost * 1;
    stock.availableQuantity = stock.quantity * 1 - stock.reservedQuantity * 1;
  });

  return Array.from(stockMap.values());
};

// Set initial stock levels
//setStockLevels(calculateInitialStockLevels());

// Legacy state for backward compatibility
const [inventory, setInventory] = createSignal<InventoryItem[]>(initialInventory);


const TRansfer: Record<string, any> = {
  "TRANSFER": 1,
  "transfer": 1
}

const nodate: number = 1734423840000;

export const inventoryStore = {
  // Getters
  get products() { return products(); },
  get locations() { return authStore.stores; },
  get movements() { return movements(); },
  get stockLevels() { return stockLevels(); },

  getMovements: () => {
    return movements()
  },
  // Load locations from Firestore
  loadLocationsFromFirestore: async (): Promise<void> => {
    try {
      const locationsData: Location[] = [];

      // Load from stores collection
      const storesCollection = collection(db, 'stores');
      const storesQuery = query(storesCollection, orderBy('name'));
      const storesSnapshot = await getDocs(storesQuery);

      storesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive) {
          const location: Location = {
            id: doc.id,
            name: data.name,
            code: data.code || doc.id,
            type: data.type || data.storeType || 'store',
            address: typeof data.address === 'object' ?
              `${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zipCode}` :
              data.address || '',
            isActive: data.isActive,
            createdDate: data.createdDate || data.createdAt,
            bussinesId: data.businessId || data.bussinesId
          };
          locationsData.push(location);
        }
      });

      // Also load from inventory_locations for backward compatibility
      try {
        const inventoryLocationsCollection = collection(db, 'inventory_locations');
        const inventoryQuery = query(inventoryLocationsCollection, orderBy('name'));
        const inventorySnapshot = await getDocs(inventoryQuery);

        inventorySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only add if not already in stores
          if (data.isActive && !locationsData.find(l => l.id === doc.id)) {
            const location: Location = {
              id: doc.id,
              name: data.name,
              code: data.code || doc.id,
              type: data.type || 'store',
              address: data.address || '',
              isActive: data.isActive,
              createdDate: data.createdDate,
              bussinesId: data.bussinesId || data.businessId
            };
            locationsData.push(location);
          }
        });
      } catch (error) {
        devLog('No inventory_locations collection found');
      }

      //setLocations(locationsData);
      devLog(`Loaded ${locationsData.length} locations from Firestore`);
    } catch (error) {
      console.error('Error loading locations from Firestore:', error);
      // Keep empty array if loading fails
    }
  },




  parseInventoryData: (apiResults: Record<string, any>): InventoryMovement[] => {


    const inventorysArr: string[] = apiResults.slice(0, 900);


    const preparingMov: InventoryMovement[] = [];



    const parseInventory = (itemId: string) => {
      let v = apiResults as Record<string, any>
      if (v[itemId]?.products) {
        //devLog(JSON.stringify( v[itemId], null, 4))
        v[itemId]?.products?.map(pr => {

          let movementType = getType(v[itemId]?.type);

          let unitCost = pr?.price * 1 || pr?.unitCost * 1;
          let quantity = pr?.qty * 1 || pr?.quantity * 1;

          unitCost = isNaN(unitCost) ? 0 : unitCost;
          quantity = isNaN(quantity) ? 0 : quantity;






          let InM: InventoryMovement = {
            id: v[itemId]?.ssg_inventory_key,
            productId: pr?.product?.id,
            productName: pr?.product?.label,
            productSku: pr?.product?.code,
            locationId: v[itemId]?.store,
            locationName: v[itemId]?.store,
            location: v[itemId]?.store,
            movementType,
            quantity: quantity,
            unitCost: unitCost,
            totalCost: unitCost * 1 * quantity,
            minStock: 10,
            referenceNumber: 'PO-001',
            notes: v[itemId]?.description || v[itemId]?.notes,
            createdBy: 'admin',
            createdDate: v[itemId]?.createDate ? (new Date(v[itemId]?.createDate)).toISOString() : (new Date(nodate)).toISOString(),
            invoiceId: v[itemId]?.invoice
          }
          preparingMov.push(InM)


          if (TRansfer[v[itemId].movementType] && v[itemId]?.fromLocationId) {
            let locationObj = inventoryStore.getLocationById(v[itemId]?.fromLocationId)
            const outboundMovement: InventoryMovement = {
              id: v[itemId]?.ssg_inventory_key,
              productId: pr?.product?.id,
              productName: pr?.product?.label,
              productSku: pr?.product?.code,
              locationId: v[itemId]?.fromLocationId,
              locationName: locationObj?.name || "",
              movementType: 'out',
              quantity: quantity * -1,
              unitCost: unitCost,
              totalCost: unitCost * -1 * quantity,
              minStock: 10,
              referenceNumber: v[itemId]?.referenceNumber,
              notes: `Transfer to ${v[itemId]?.locationName}` + (v[itemId].notes ? ` - ${v[itemId].notes}` : ''),
              createdBy: v[itemId].createdBy,
              createdDate: v[itemId]?.createDate ? (new Date(v[itemId]?.createDate)).toISOString() : (new Date(nodate)).toISOString(),

              invoiceId: v[itemId]?.invoiceId,
              toLocationId: v[itemId]?.locationId,
              toLocationName: v[itemId]?.locationName,

            };
            //preparingMov.push(InM)
            preparingMov.push(outboundMovement);
          }
          //inventoryStore.addInventoryMovement(InM);

        })

      }
    }


    inventorysArr.map(parseInventory);

    return preparingMov;


  },


  fecthInventory: async (query: string): Promise<any> => {

    const apiResults = await inventoryApi.getInventory(query);


    //const preparingMov: InventoryMovement[] = inventoryStore.parseInventoryData(apiResults);

    const invfil = apiResults.filter(m => m?.products?.length)
    inventoryStore.updMovements(invfil);
    return invfil
  },


  getStockLevels: async (query: string): Promise<any> => {
    const apiResults = await movementsApi.getStockLevels(query);
    //setStockLevels(apiResults);

  },



  fecthProduct: async (query: string): Promise<any> => {

    const prodResults = await inventoryApi.getProducts(query);
    // Convert API results to Product format

    const productsArr: string[] = Object.keys(prodResults);

    /**
 
     const parseProduct = (itemId: string): Product =>{
       let v = prodResults as Record<string, any>
       // devLog(v[itemId])
       return {
         id: itemId,
         name: v[itemId].name,
         businessId: v[itemId].businessId,
         sku: v[itemId].code,
         UPC: v[itemId].UPC,
         numCode: v[itemId].codeN,
         category: v[itemId].category,
         unitCost: v[itemId].unitCost || 0,
         unitOfMeasure: v[itemId].unitOfMeasure || v[itemId].unit,
         minStockLevel: v[itemId].minStockLevel,
         maxStockLevel: v[itemId].maxStockLevel,
         isActive: v[itemId].isActive,
         productImageUrl:  v[itemId].productImageUrl,
         description: v[itemId].description || '',
         createdDate: v[itemId].createdAt || new Date().toISOString(),
         lastModified: v[itemId].updatedAt || new Date().toISOString()
       } as Product
     }
 
     const products: Product[] = productsArr.map(parseProduct);
     */
    inventoryStore.updProduct(prodResults);
    return products;

  },

  // Product operations
  getProductById: (id: string): Product | undefined => {
    return products().find(product => product.id === id);
  },


  updProduct: (list: Product[]): void => {
    setProducts(list);
  },


  getProductsBySku: (sku: string): Product[] => {
    return products().filter(product =>
      product?.sku?.toLowerCase()?.includes?.(sku?.toLowerCase())
    );
  },

  getProductsByCategory: (category: string): Product[] => {
    return products().filter(product => product.category === category);
  },

  getActiveProducts: (): Product[] => {
    return products().filter(product => product.name);
  },

  // Location operations
  getLocationById: (id: string): Location | undefined => {
    // Get stores from authStore - these are the stores the user has access to
    const accessibleStores = authStore.stores || [];

    // Find the store by ID from the user's accessible stores
    const store = accessibleStores.find(location => location.id === id);

    if (store) {
      // Convert StoreInfo to Location format
      return {
        id: store.id,
        name: store.name,
        isActive: store.isActive,
        code: store.id,
        type: 'store'
      } as Location;
    }

    return undefined;
  },

  getLocationsByType: (type: Location['type']): Location[] => {
    const accessibleStores = authStore.stores || [];
    // Since StoreInfo doesn't have type, return all stores when filtering by 'store' type
    if (type === 'store') {
      return accessibleStores.map(store => ({
        id: store.id,
        name: store.name,
        isActive: store.isActive,
        code: store.id,
        type: 'store'
      } as Location));
    }
    return [];
  },

  getActiveLocations: (): Location[] => {
    // authStore.stores already contains only the stores the user has access to
    // (filtered by their profile.stores for non-admins, or all stores for admins)
    const accessibleStores = authStore.stores || [];

    if (!accessibleStores.length) {
      return [];
    }

    // Filter active stores and convert to Location format
    return accessibleStores
      .filter(store => store.isActive !== false)
      .map(store => ({
        id: store.id,
        name: store.name,
        isActive: store.isActive,
        code: store.id,
        type: 'store' as const
      }));
  },

  // Movement operations
  getMovementsByProduct: (productId: string): InventoryMovement[] => {
    return movements().filter(movement => movement.productId === productId);
  },

  updMovements: (newMovements: InventoryMovement[]) => {
    setMovements([...newMovements]);
    setStockLevels(calculateStockLevels());
  },

  getMovementsByLocation: (locationId: string): InventoryMovement[] => {
    return movements()?.filter(movement => movement.locationId === locationId);
  },

  getMovementsByDateRange: (startDate: string, endDate: string): InventoryMovement[] => {
    return movements()?.filter(movement =>
      movement.createdDate >= startDate && movement.createdDate <= endDate
    );
  },

  // Stock operations
  getStockByProduct: (productId: string): InventoryStock[] => {
    return stockLevels()?.filter(stock => stock.productId === productId);
  },

  getStockByLocation: (locationId: string): InventoryStock[] => {
    return stockLevels()?.filter(stock => stock.locationId === locationId);
  },

  getStockByProductAndLocation: (productId: string, locationId: string): InventoryStock | undefined => {
    return stockLevels()?.find(stock =>
      stock.productId === productId && stock.locationId === locationId
    );
  },

  getTotalStockByProduct: (productId: string): number => {
    return stockLevels()?.filter(stock => stock.productId === productId)
      .reduce((total, stock) => total * 1 + stock.quantity * 1, 0);
  },



  getLastLocationByProduct: (productId: string): Location | undefined => {
    const productMovements = movements()?.filter(movement => movement.productId === productId)
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    if (productMovements.length > 0) {
      return authStore.stores.find(location => location.id === productMovements[0].locationId);
    }
    return undefined;
  },

  getLowStockProducts: (): Array<Product & { currentStock: number }> => {

    return (products() || [])
      //?.filter(product => product.isActive)
      ?.map(product => {
        const currentStock = stockLevels()?.filter(stock => stock.productId === product.id)
          .reduce((total, stock) => total + stock.quantity, 0) || 0;
        return {
          ...product,
          currentStock
        };
      })
      .filter(product => product.currentStock <= product.minStockLevel);
  },

  // Movement invoice operations
  generateMovementInvoice: async (movementId: string, t?: any, language?: 'en' | 'es', style: 'classic' | 'modern' | 'compact' = 'compact') => {
    try {
      // Import the language utils
      const { getUserLanguage } = await import('../../../utils/languageUtils');

      // Use provided language or detect user preference
      const selectedLanguage = language || getUserLanguage();

      // Import the appropriate generator based on style preference
      let generatePDF;
      switch (style) {
        case 'compact':
          const { generateCompactModernInvoicePDF } = await import('../../../utils/compactModernInvoicePdfGenerator');
          generatePDF = generateCompactModernInvoicePDF;
          break;
        case 'modern':
          const { generateModernMovementInvoicePDF } = await import('../../../utils/modernMovementInvoicePdfGenerator');
          generatePDF = generateModernMovementInvoicePDF;
          break;
        case 'classic':
        default:
          const { generateMovementInvoicePDF } = await import('../../../utils/movementInvoicePdfGenerator');
          generatePDF = generateMovementInvoicePDF;
          break;
      }

      // Find movements with the same invoiceId or id
      const relatedMovements = movements().filter(movement =>
        movement.invoiceId === movementId || movement.id === movementId
      );

      if (relatedMovements.length === 0) {
        throw new Error(`No movements found with ID: ${movementId}`);
      }

      // Group movements by invoiceId or use single movement
      const movementGroups = relatedMovements.reduce((groups: any, movement) => {
        const key = movement.invoiceId || movement.id;
        if (!groups[key]) {
          groups[key] = {
            invoiceId: key,
            movementType: movement.movementType,
            referenceNumber: movement.referenceNumber,
            createdBy: movement.createdBy,
            createdDate: movement.createdDate,
            locationName: movement.locationName,
            fromLocationName: movement.fromLocationName,
            toLocationName: movement.toLocationName,
            notes: movement.notes,
            items: []
          };
        }

        // Add movement as an item
        groups[key].items.push({
          productSku: movement.productSku,
          productName: movement.productName,
          quantity: movement.quantity,
          unitCost: movement.unitCost,
          totalCost: movement.totalCost,
          receivedQuantity: movement.movementType === 'transfer' ? null : undefined
        });

        return groups;
      }, {});

      // Generate PDF for each group (typically just one)
      const filenames = [];
      for (const [groupId, groupData] of Object.entries(movementGroups)) {
        const filename = await generatePDF(groupData, t, selectedLanguage);
        filenames.push(filename);
      }

      return filenames;

    } catch (error) {
      console.error('Error generating movement invoice:', error);
      throw error;
    }
  },

  getMovementsByInvoiceId: (invoiceId: string): InventoryMovement[] => {
    return movements().filter(movement => movement.invoiceId === invoiceId);
  },

  // Generate compact movement invoice (convenience method) - Best for printing
  generateCompactMovementInvoice: async (movementId: string, t?: any, language?: 'en' | 'es') => {
    return inventoryStore.generateMovementInvoice(movementId, t, language, 'compact');
  },

  // Generate modern movement invoice (convenience method)
  generateModernMovementInvoice: async (movementId: string, t?: any, language?: 'en' | 'es') => {
    return inventoryStore.generateMovementInvoice(movementId, t, language, 'modern');
  },

  // Generate classic movement invoice (convenience method)  
  generateClassicMovementInvoice: async (movementId: string, t?: any, language?: 'en' | 'es') => {
    return inventoryStore.generateMovementInvoice(movementId, t, language, 'classic');
  },

  getMovementInvoiceData: (movementId: string) => {
    const relatedMovements = movements().filter(movement =>
      movement.invoiceId === movementId || movement.id === movementId
    );

    if (relatedMovements.length === 0) {
      return null;
    }

    const firstMovement = relatedMovements[0];
    const totalValue = relatedMovements.reduce((sum, movement) =>
      sum + (movement.totalCost || movement.quantity * movement.unitCost), 0
    );

    return {
      invoiceId: firstMovement.invoiceId || firstMovement.id,
      movementType: firstMovement.movementType,
      referenceNumber: firstMovement.referenceNumber,
      createdBy: firstMovement.createdBy,
      createdDate: firstMovement.createdDate,
      locationName: firstMovement.locationName,
      fromLocationName: firstMovement.fromLocationName,
      toLocationName: firstMovement.toLocationName,
      notes: firstMovement.notes,
      totalValue,
      itemCount: relatedMovements.length,
      items: relatedMovements.map(movement => ({
        productSku: movement.productSku,
        productName: movement.productName,
        quantity: movement.quantity,
        unitCost: movement.unitCost,
        totalCost: movement.totalCost || movement.quantity * movement.unitCost
      }))
    };
  },

  // Add inventory movement
  addInventoryMovement: (movement: Omit<InventoryMovement, 'id' | 'createdDate'>): void => {
    const newMovement: InventoryMovement = {
      ...movement,
      id: `mov-${Date.now()}`,
      createdDate: new Date().toISOString()
    };

    setMovements(prev => [...prev, newMovement]);
    setStockLevels(calculateStockLevels());

    // Trigger automation event
    inventoryEventIntegration.onInventoryMovement(newMovement).catch(err => {
      console.error('Failed to emit inventory event:', err);
    });
  },

  // Add bulk inventory movements (for invoices with multiple products)
  addBulkInventoryMovements: async (bulkRequest: BulkMovementRequest): Promise<{ success: boolean; errors: string[] }> => {
    const errors: string[] = [];
    const newMovements: InventoryMovement[] = [];
    const timestamp = new Date().toISOString();

    // Validate location
    const location = authStore.stores.find(loc => loc.id === bulkRequest.locationId);
    if (!location) {
      return { success: false, errors: ['Invalid location'] };
    }

    // Validate from location for transfers
    let fromLocation: Location | undefined;
    if (bulkRequest.movementType === 'transfer') {
      if (!bulkRequest.fromLocationId) {
        return { success: false, errors: ['From location required for transfers'] };
      }
      fromLocation = authStore.stores.find(loc => loc.id === bulkRequest.fromLocationId);
      if (!fromLocation) {
        return { success: false, errors: ['Invalid from location'] };
      }
      if (bulkRequest.fromLocationId === bulkRequest.locationId) {
        return { success: false, errors: ['From and to locations cannot be the same'] };
      }
    }

    let storeId = bulkRequest.locationId;
    if (bulkRequest.movementType === 'transfer') {
      storeId = bulkRequest.fromLocationId!;
    }

    const businessId = authStore.getBusinessId();

    const responsepws = await fetchGraphQLSS({
      query: "getProductsWithStock",
      params: {
        businessId,
        storeId
      }
    });

    let ProductsWithStock = []

    if (responsepws?.data) {
      // Handle both array and object responses
      ProductsWithStock = Array.isArray(responsepws.data?.products)
        ? responsepws.data?.products
        : Object.values(responsepws.data?.products);

    }



    // Process each item
    bulkRequest.items.forEach((item, index) => {


      const product = products().find(p => p.id === item.productId);

      if (!product) {
        //errors.push(`Item ${index + 1}: Product not found`);
        //return;
      }

      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        return;
      }




      // Check stock availability for outbound movements
      if (bulkRequest.movementType === 'out') {
        const currentStock = ProductsWithStock.filter(stock => stock.id === item.productId)
          .reduce((total, stock) => total + stock.currentStock, 0);

        if (item.quantity > currentStock) {
          errors.push(`Item ${index + 1}: Insufficient stock. Available: ${currentStock}, Requested: ${item.quantity}`);
          return;
        }
      }

      // Check stock availability for transfers (from location)
      if (bulkRequest.movementType === 'transfer') {
        const currentStock = ProductsWithStock.filter(stock => stock.id === item.productId)
          .reduce((total, stock) => total + stock.currentStock, 0);

        if (item.quantity > currentStock) {
          errors.push(`Item ${index + 1}: Insufficient stock at ${fromLocation?.name}. Available: ${currentStock}, Requested: ${item.quantity}`);
          return;
        }
      }

      const unitCost = item.unitCost || product.unitCost;
      const totalCost = item.quantity * unitCost;

      /** 
      // Create movement for destination location
      const movement: InventoryMovement = {
        id: `mov-${Date.now()}-${index}`,
        productId: product?.id,
        productName: product?.name,
        productSku: product?.sku,
        locationId: bulkRequest.locationId,
        store: bulkRequest.locationId,
        locationName: location.name,
        movementType: bulkRequest.movementType,
        quantity: item.quantity,
        unitCost,
        totalCost,
        minStock: 10,
        referenceNumber: bulkRequest.referenceNumber|| '',
        notes: item.notes || bulkRequest.generalNotes || '',
        createdBy: bulkRequest.createdBy,
        createdDate: timestamp,
        invoiceId: bulkRequest.invoiceId,
        fromLocationId: bulkRequest.fromLocationId,
        fromLocationName: fromLocation?.name
      };

      newMovements.push(movement);

      // For transfers, create corresponding outbound movement from source location
     */

    });

    


    if (bulkRequest.movementType === 'transfer' && bulkRequest.fromLocationId) {

      let trsOut = { ...bulkRequest };
      let parseItm = (item: any) => {
        let newItm = { ...item };
        newItm.quantity = item.quantity * -1;
        newItm.qty = item.quantity * -1;
        return newItm;
      }

      let itmsTrOut = bulkRequest?.items.map(parseItm) || [];
      let prodsTrOut = bulkRequest?.products?.map(parseItm) || [];

      trsOut.items = itmsTrOut;
      trsOut.products = prodsTrOut
      trsOut.locationId = bulkRequest.fromLocationId;
      trsOut.store = bulkRequest.fromLocationId;
      trsOut.fromLocationId = bulkRequest.locationId;

      const prodResultsOut = await inventoryApi.addInventory(trsOut);

      //devLog({trsOut})
    }



    // If there are errors, don't process any movements
    if (errors.length > 0) {
      return { success: false, errors };
    }



    // Add all movements
    //setMovements(prev => [...prev, ...newMovements]);
    //setStockLevels(calculateStockLevels());


    let parseItm = (item: any) => {
      let newItm = { ...item };
      newItm.qty = item.quantity;
      return newItm;
    }

    let itmsTrOut = bulkRequest?.items.map(parseItm) || [];
    let prodsTrOut = bulkRequest?.products?.map(parseItm) || [];

    bulkRequest.items = itmsTrOut;
    bulkRequest.products = prodsTrOut


    const prodResults = {}
    await inventoryApi.addInventory(bulkRequest);
    if (prodResults) {

    }

    return { success: true, errors: [] };
  },



  // Get movements by invoice ID
  getMovementsByInvoice: (invoiceId: string): InventoryMovement[] => {
    return movements().filter(movement => movement.invoiceId === invoiceId);
  },

  // Get invoice summary
  getInvoiceSummary: (invoiceId: string) => {
    const invoiceMovements = movements().filter(movement => movement.invoiceId === invoiceId);
    if (invoiceMovements.length === 0) return null;

    const totalValue = invoiceMovements.reduce((sum, movement) => sum + movement.totalCost, 0);
    const productCount = new Set(invoiceMovements.map(m => m.productId)).size;
    const firstMovement = invoiceMovements[0];

    return {
      invoiceId,
      referenceNumber: firstMovement.referenceNumber,
      movementType: firstMovement.movementType,
      location: firstMovement.locationName,
      fromLocation: firstMovement.fromLocationName,
      productCount,
      totalItems: invoiceMovements.reduce((sum, m) => sum + m.quantity, 0),
      totalValue,
      createdDate: firstMovement.createdDate,
      createdBy: firstMovement.createdBy
    };
  },

  // Add product
  addProduct: async (product: Omit<Product, 'id' | 'createdDate' | 'lastModified'>): void => {
    const newProduct: Product = {
      ...product,
      id: generateShortCode(16),
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    await inventoryApi.addProduct(newProduct)

    setProducts(prev => [...prev, newProduct]);
  },

  // Add location
  addLocation: (location: Omit<Location, 'id' | 'createdDate'>): void => {
    const newLocation: Location = {
      ...location,
      id: `loc-${Date.now()}`,
      createdDate: new Date().toISOString()
    };


    setLocations(prev => [...prev, newLocation]);
  },

  // Update product
  updateProduct: async (id: string, updates: Partial<Product>): void => {

    await inventoryApi.updProduct(id, updates)
    setProducts(prev => prev.map(product =>
      product.id === id
        ? { ...product, ...updates, lastModified: new Date().toISOString() }
        : product
    ));
  },

  // Update location
  updateLocation: (id: string, updates: Partial<Location>): void => {
    setLocations(prev => prev.map(location =>
      location.id === id ? { ...location, ...updates } : location
    ));
  },

  // Update movement
  updateMovement: async (id: string, updates: Partial<InventoryMovement>): Promise<void> => {
    try {
      // Prepare the update payload
      const updatedMovement = {
        ...updates,
        id,
        ssg_inventory_key: id,
        lastModified: new Date().toISOString()
      };

      // Call API to persist the update
      await inventoryApi.updInventory(updatedMovement);

      // Update local state after successful API call
      setMovements(prev => prev.map(movement =>
        movement.id === id
          ? { ...movement, ...updates, lastModified: new Date().toISOString() }
          : movement
      ));
      setStockLevels(calculateStockLevels());
    } catch (error) {
      console.error('Error updating movement:', error);
      throw error;
    }
  },

  // Legacy methods for backward compatibility
  get inventory() {
    return inventory();
  },

  addItem(item: Omit<InventoryItem, 'id'>) {
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setInventory([...inventory(), newItem]);
    return newItem;
  },

  updateItem(id: string, updates: Partial<InventoryItem>) {
    setInventory(inventory().map(item =>
      item.id === id ? {
        ...item,
        ...updates,
        lastUpdated: new Date().toISOString().split('T')[0]
      } : item
    ));
  },

  deleteItem(id: string) {
    setInventory(inventory().filter(item => item.id !== id));
  },







  getItemById(id: string) {
    return movements().find(item => item.id === id);
  },

  getLowStockItems() {
    return movements().filter(item => item.quantity * 1 <= item.minStock * 1);
  },

  getTotalValue() {
    return movements().reduce((total, item) => total * 1 + (item.unitCost * 1 * item.quantity * 1), 0);
  }
};