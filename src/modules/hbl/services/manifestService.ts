/**
 * Delivery Manifest Service
 *
 * Groups HBL records by:
 * 1. State → City → Street → Street Number
 * 2. Customer ID (cidentity) at each address
 * 3. Bag Number for each customer
 *
 * Creates organized delivery manifests for drivers
 */

import { HBL } from '../types';
import { devLog } from '../../../services/utils';
import {
  DeliveryManifest,
  ManifestState,
  ManifestCity,
  ManifestRpto,
  ManifestAddress,
  ManifestCustomer,
  ManifestBag,
  ManifestHBLGroup,
  ManifestItem,
  ManifestFilterOptions
} from '../types/manifestTypes';

/**
 * Generate a unique manifest ID
 */
function generateManifestId(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MF-${date}-${random}`;
}

/**
 * Format a complete address string
 */
function formatAddress(hbl: HBL): string {
  const parts = [
    hbl.address?.streetName || hbl.street,
    hbl.address?.streetNo,
    hbl.address?.rpto,
    hbl.address?.city,
    hbl.address?.estate
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Create an address key for grouping
 * Groups by: State → City → Rpto → Street → StreetNo → Between
 */
function getAddressKey(hbl: HBL): string {
  const estate = hbl.address?.estate || '';
  const city = hbl.address?.city || '';
  const rpto = hbl.address?.rpto || '';
  const streetName = hbl.address?.streetName || hbl.street || '';
  const streetNo = hbl.address?.streetNo || '';
  const between = hbl.address?.betwen || '';

  return `${estate}|${city}|${rpto}|${streetName}|${streetNo}|${between}`.toLowerCase();
}

/**
 * Parse weight string to number
 */
function parseWeight(weight: string): number {
  const num = parseFloat(weight);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse quantity string to number
 */
function parseQuantity(quantity: string): number {
  const num = parseInt(quantity, 10);
  return isNaN(num) ? 1 : num;
}

/**
 * Generate delivery manifest from HBL records
 */
export function generateManifest(
  hbls: HBL[],
  options?: {
    guideNumber?: string;
    generatedBy?: string;
    filters?: ManifestFilterOptions;
  }
): DeliveryManifest {

  // Apply filters if provided
  let filteredHBLs = hbls;
  if (options?.filters) {
    filteredHBLs = applyFilters(hbls, options.filters);
  }

  // Group by state → city → street → streetNo
  const stateGroups = new Map<string, HBL[]>();

  filteredHBLs.forEach(hbl => {
    devLog(hbl.address)

    let state = (hbl.address?.estate || '').trim();

    if (!state){
      hbl.address = getAddressPSS(hbl.street);
      state = (hbl.address?.estate || '').trim();
    }
    //return; // Skip records without state



    if (!stateGroups.has(state)) {
      stateGroups.set(state, []);
    }
    stateGroups.get(state)!.push(hbl);
  });

  // Build manifest states
  const manifestStates: ManifestState[] = [];
  let totalAddresses = 0;
  let totalCustomers = 0;
  let totalBags = 0;
  let totalItems = 0;
  let totalWeight = 0;

  stateGroups.forEach((stateHBLs, stateName) => {
    // Group by city within state
    const cityGroups = new Map<string, HBL[]>();

    stateHBLs.forEach(hbl => {
      const city = (hbl.address?.city || 'Unknown').trim();
      if (!cityGroups.has(city)) {
        cityGroups.set(city, []);
      }
      cityGroups.get(city)!.push(hbl);
    });

    // Build manifest cities
    const manifestCities: ManifestCity[] = [];
    let stateTotalRptos = 0;
    let stateTotalAddresses = 0;
    let stateTotalCustomers = 0;
    let stateTotalBags = 0;
    let stateTotalItems = 0;

    cityGroups.forEach((cityHBLs, cityName) => {
      // Group by rpto within city
      const rptoGroups = new Map<string, HBL[]>();

      cityHBLs.forEach(hbl => {
        const rpto = (hbl.address?.rpto || hbl.address?.Rpto || 'Unknown').trim();
        if (!rptoGroups.has(rpto)) {
          rptoGroups.set(rpto, []);
        }
        rptoGroups.get(rpto)!.push(hbl);
      });


      // Build manifest rptos
      const manifestRptos: ManifestRpto[] = [];
      let cityTotalAddresses = 0;
      let cityTotalCustomers = 0;
      let cityTotalBags = 0;
      let cityTotalItems = 0;

      rptoGroups.forEach((rptoHBLs, rptoName) => {
        // Group by address within rpto
        const addressGroups = new Map<string, HBL[]>();

        rptoHBLs.forEach(hbl => {
          const addressKey = getAddressKey(hbl);
          if (!addressGroups.has(addressKey)) {
            addressGroups.set(addressKey, []);
          }
          addressGroups.get(addressKey)!.push(hbl);
        });

        // Build manifest addresses
        const manifestAddresses: ManifestAddress[] = [];
        let rptoTotalCustomers = 0;
        let rptoTotalBags = 0;
        let rptoTotalItems = 0;

    addressGroups.forEach((addressHBLs, addressKey) => {
      // Use first HBL for address info
      const firstHBL = addressHBLs[0];

      // Group by customer ID (cidentity) - this ensures all HBLs with the same CID
      // at the same address are consolidated into ONE customer entry
      const customerGroups = new Map<string, HBL[]>();

      addressHBLs.forEach(hbl => {
        // Normalize CID to ensure consistent grouping
        const cid = (hbl.cidentity?.trim() || 'UNKNOWN').toUpperCase();
        if (!customerGroups.has(cid)) {
          customerGroups.set(cid, []);
        }
        customerGroups.get(cid)!.push(hbl);
      });

      // Build manifest customers
      const manifestCustomers: ManifestCustomer[] = [];
      let addressTotalBags = 0;
      let addressTotalItems = 0;

      customerGroups.forEach((customerHBLs, cid) => {
        // Group by bag number
        const bagGroups = new Map<string, HBL[]>();

        customerHBLs.forEach(hbl => {
          const bagNumber = hbl.bagnumber?.trim() || 'N/A';
          if (!bagGroups.has(bagNumber)) {
            bagGroups.set(bagNumber, []);
          }
          bagGroups.get(bagNumber)!.push(hbl);
        });

        // Build manifest bags
        const manifestBags: ManifestBag[] = [];
        let customerTotalWeight = 0;
        let customerTotalItems = 0;

        bagGroups.forEach((bagHBLs, bagNumber) => {
          // Group by HBL within the bag
          const hblGroupsMap = new Map<string, HBL[]>();

          bagHBLs.forEach(hbl => {
            const hblNumber = hbl.hbl?.trim() || 'UNKNOWN';
            if (!hblGroupsMap.has(hblNumber)) {
              hblGroupsMap.set(hblNumber, []);
            }
            hblGroupsMap.get(hblNumber)!.push(hbl);
          });

          // Build HBL groups
          const hblGroups: ManifestHBLGroup[] = [];
          let bagWeight = 0;
          let bagQuantity = 0;
          let bagItemCount = 0;

          hblGroupsMap.forEach((hblItems, hblNumber) => {
            const items: ManifestItem[] = hblItems.map(hbl => ({
              hbl: hbl.hbl,
              namegood: hbl.namegood,
              quantity: hbl.quantity,
              weight: hbl.weight,
              idguidestate: hbl.idguidestate
            }));

            const hblWeight = hblItems.reduce((sum, hbl) => sum + parseWeight(hbl.weight), 0);
            const hblQuantity = hblItems.reduce((sum, hbl) => sum + parseQuantity(hbl.quantity), 0);

            hblGroups.push({
              hbl: hblNumber,
              items,
              itemCount: items.length,
              totalWeight: hblWeight,
              totalQuantity: hblQuantity
            });

            bagWeight += hblWeight;
            bagQuantity += hblQuantity;
            bagItemCount += items.length;
          });

          manifestBags.push({
            bagNumber,
            hblGroups,
            totalHBLs: hblGroups.length,
            totalWeight: bagWeight,
            totalQuantity: bagQuantity,
            itemCount: bagItemCount
          });

          customerTotalWeight += bagWeight;
          customerTotalItems += bagItemCount;
        });

        // Use first HBL for customer info
        const firstCustomerHBL = customerHBLs[0];

        manifestCustomers.push({
          cid,
          consigneeName: firstCustomerHBL.consigneeName,
          ctelephone: firstCustomerHBL.ctelephone,
          bags: manifestBags,
          totalBags: manifestBags.length,
          totalWeight: customerTotalWeight,
          totalItems: customerTotalItems
        });

        addressTotalBags += manifestBags.length;
        addressTotalItems += customerTotalItems;
      });

      const addressWeight = addressHBLs.reduce((sum, hbl) => sum + parseWeight(hbl.weight), 0);


      devLog(firstHBL)
      manifestAddresses.push({
        estate: firstHBL.address?.estate || '',
        city: firstHBL.address?.city || '',
        rpto:  firstHBL.address?.Rpto || firstHBL.address?.rpto || '',
        streetName: firstHBL.address?.streetName || firstHBL.street,
        streetNo: firstHBL.address?.streetNo || '',
        between: firstHBL.address?.betwen || '',
        fullAddress: firstHBL.street,
        customers: manifestCustomers,
        totalCustomers: manifestCustomers.length,
        totalBags: addressTotalBags,
        totalItems: addressTotalItems
      });

      totalAddresses++;
      totalCustomers += manifestCustomers.length;
      totalBags += addressTotalBags;
      totalItems += addressTotalItems;
      totalWeight += addressWeight;
      });

      // Sort addresses by street name and number
      manifestAddresses.sort((a, b) => {
        const streetCompare = a.streetName.localeCompare(b.streetName);
        if (streetCompare !== 0) return streetCompare;
        return a.streetNo.localeCompare(b.streetNo, undefined, { numeric: true });
      });

      // Build rpto object
      manifestRptos.push({
        rpto: rptoName,
        addresses: manifestAddresses,
        totalAddresses: manifestAddresses.length,
        totalCustomers: rptoTotalCustomers,
        totalBags: rptoTotalBags,
        totalItems: rptoTotalItems
      });

      // Accumulate city totals
      cityTotalAddresses += manifestAddresses.length;
      cityTotalCustomers += rptoTotalCustomers;
      cityTotalBags += rptoTotalBags;
      cityTotalItems += rptoTotalItems;
    });

    // Build city object
    manifestCities.push({
      city: cityName,
      rptos: manifestRptos,
      totalRptos: manifestRptos.length,
      totalAddresses: cityTotalAddresses,
      totalCustomers: cityTotalCustomers,
      totalBags: cityTotalBags,
      totalItems: cityTotalItems
    });

    // Accumulate state totals
    stateTotalRptos += manifestRptos.length;
    stateTotalAddresses += cityTotalAddresses;
    stateTotalCustomers += cityTotalCustomers;
    stateTotalBags += cityTotalBags;
    stateTotalItems += cityTotalItems;
  });

  // Build state object with cities
  manifestStates.push({
    state: stateName,
    cities: manifestCities,
    totalCities: manifestCities.length,
    totalRptos: stateTotalRptos,
    totalAddresses: stateTotalAddresses,
    totalCustomers: stateTotalCustomers,
    totalBags: stateTotalBags,
    totalItems: stateTotalItems
  });
});

  // Sort states alphabetically
  manifestStates.sort((a, b) => a.state.localeCompare(b.state));

  return {
    manifestId: generateManifestId(),
    generatedAt: new Date(),
    generatedBy: options?.generatedBy,
    guideNumber: options?.guideNumber,
    states: manifestStates,
    totalStates: manifestStates.length,
    totalAddresses,
    totalCustomers,
    totalBags,
    totalItems,
    totalWeight,
    status: 'ready'
  };
}

/**
 * Apply filters to HBL list
 */
function applyFilters(hbls: HBL[], filters: ManifestFilterOptions): HBL[] {
  let filtered = [...hbls];

  if (filters.state) {
    filtered = filtered.filter(hbl =>
      hbl.address?.estate?.toLowerCase().includes(filters.state!.toLowerCase())
    );
  }

  if (filters.city) {
    filtered = filtered.filter(hbl =>
      hbl.address?.city?.toLowerCase().includes(filters.city!.toLowerCase())
    );
  }

  if (filters.guideNumber) {
    filtered = filtered.filter(hbl =>
      hbl.guia?.toLowerCase().includes(filters.guideNumber!.toLowerCase())
    );
  }

  if (filters.status) {
    filtered = filtered.filter(hbl => hbl.idguidestate === filters.status);
  }

  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filtered = filtered.filter(hbl => new Date(hbl.datereserve) >= fromDate);
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    filtered = filtered.filter(hbl => new Date(hbl.datereserve) <= toDate);
  }

  if (filters.minWeight !== undefined) {
    filtered = filtered.filter(hbl => parseWeight(hbl.weight) >= filters.minWeight!);
  }

  if (filters.maxWeight !== undefined) {
    filtered = filtered.filter(hbl => parseWeight(hbl.weight) <= filters.maxWeight!);
  }

  return filtered;
}

/**
 * Get manifest summary statistics
 */
export function getManifestSummary(manifest: DeliveryManifest) {
  return {
    id: manifest.manifestId,
    generatedAt: manifest.generatedAt,
    states: manifest.totalStates,
    addresses: manifest.totalAddresses,
    customers: manifest.totalCustomers,
    bags: manifest.totalBags,
    items: manifest.totalItems,
    weight: manifest.totalWeight.toFixed(2) + ' kgs',
    status: manifest.status
  };
}

/**
 * Export manifest to simple data structure for printing
 */
export function exportManifestForPrint(manifest: DeliveryManifest, compact: boolean = true) {
  return manifest.states.map(state => ({
    state: state.state,
    cities: state.cities.map(city => ({
      city: city.city,
      rptos: city.rptos.map(rpto => ({
        rpto: rpto.rpto,
        addresses: rpto.addresses.map(address => ({
          address: address.fullAddress,
          customers: address.customers.map(customer => ({
            cid: customer.cid,
            name: customer.consigneeName,
            phone: customer.ctelephone,
            bags: customer.bags.map(bag => ({
              bagNumber: bag.bagNumber,
              totalHBLs: bag.totalHBLs,
              hbls: compact
                ? bag.hblGroups.map(g => g.hbl)
                : bag.hblGroups.map(g => ({
                    hbl: g.hbl,
                    items: g.items,
                    itemCount: g.itemCount,
                    weight: g.totalWeight.toFixed(2)
                  })),
              weight: bag.totalWeight.toFixed(2),
              quantity: bag.totalQuantity,
              itemCount: bag.itemCount
            })),
            totalBags: customer.totalBags,
            totalItems: customer.totalItems,
            signature: '_________________________'
          }))
        }))
      }))
    }))
  }));
}





  export const getAddressPSS = (v2: string) =>{
    let v = v2?.toUpperCase()
    let st1A =  v?.split(",");
    let city = st1A[st1A.length-2].trim();
  
    let sts = v?.split(", "+city)?.[0];
  

    let cord: any = {
  
    }
  
    let keys = ["CALLE", "#", "RPTO.","REPARTO", "E/", "APTO" , "APT"];
  
   
    if(sts.indexOf("REPARTO") === 0 ){
      sts = "CALLE "  + sts.slice(7,sts.length-1);
    }
    else if(sts.indexOf("CALLE") !== 0 ){
      sts = "CALLE "  + sts;
    }
    
  
    if(sts.indexOf("APTO")>=0 ){
      sts=  sts.split("APTO").join("APT")  ;
     // sts = a3[0] + "CALLE MODULO"  + a3[1];
    }
  
    keys.map(kf=>{
      let ind2 = sts?.indexOf(kf);
      if(ind2>=0){
        cord[ind2] = kf;
      }
    })
  
    let address: any = {
      estate: st1A[st1A.length-1].trim(),
      city
    };
  
    let fldadd: any = {
      "CALLE": "streetName", "#": "streetNo", "RPTO.": "Rpto", "REPARTO": "Rpto",  "E/":"betwen", "APT": "apt"
    }
  
  
    Object.keys(cord).map((h: any,ind)=>{
      let init: number = h *1;
      let next:any = parseInt(Object.keys(cord)[ind+1]) || sts.length;
      address[fldadd[cord[h]]] = sts?.slice(init, next)?.split(cord[h])?.join("")?.trim()
    })
    return address;
  }
