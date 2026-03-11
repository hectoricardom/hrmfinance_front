import { createSignal, createMemo } from 'solid-js';
import { HBL } from '../types';
import { inventoryApi } from '../../../services/apiAdapter';
import { cos } from '@tensorflow/tfjs';
import { consigneeService } from '../../../services/consigneeService';
import { devLog } from '../../../services/utils';

// HBL Store state
const [hbls, setHbls] = createSignal<HBL[]>([]);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [selectedHBLs, setSelectedHBLs] = createSignal<Set<string>>(new Set());

// Search and filter states
const [searchTerm, setSearchTerm] = createSignal('');
const [statusFilter, setStatusFilter] = createSignal<string>('all');
const [guideFilter, setGuideFilter] = createSignal<string>('all');
const [dateRange, setDateRange] = createSignal({ start: '', end: '' });

// Pagination
const [currentPage, setCurrentPage] = createSignal(1);
const [itemsPerPage, setItemsPerPage] = createSignal(20);

// Computed values
const filteredHBLs = createMemo(() => {
  let filtered = hbls();
  
  // Apply search filter
  if (searchTerm()) {
    const term = searchTerm().toLowerCase();
    filtered = filtered.filter(hbl => 
      hbl.hbl.toLowerCase().includes(term) ||
      hbl.idairguide.toLowerCase().includes(term) ||
      hbl.nameshipper.toLowerCase().includes(term) ||
      hbl.consigneeName.toLowerCase().includes(term) ||
      hbl.namegood.toLowerCase().includes(term) ||
      hbl.bagnumber.toLowerCase().includes(term) ||
      hbl.cidentity.toLowerCase().includes(term)
    );
  }
  
  // Apply status filter
  if (statusFilter() !== 'all') {
    filtered = filtered.filter(hbl => hbl.idguidestate === statusFilter());
  }
  
  // Apply guide filter
  if (guideFilter() !== 'all') {
    filtered = filtered.filter(hbl => hbl.guia === guideFilter());
  }
  
  // Apply date range filter
  if (dateRange().start || dateRange().end) {
    filtered = filtered.filter(hbl => {
      const hblDate = new Date(hbl.datereserve);
      const start = dateRange().start ? new Date(dateRange().start) : new Date('1900-01-01');
      const end = dateRange().end ? new Date(dateRange().end) : new Date('2100-12-31');
      return hblDate >= start && hblDate <= end;
    });
  }
  
  return filtered;
});

const paginatedHBLs = createMemo(() => {
  const start = (currentPage() - 1) * itemsPerPage();
  const end = start + itemsPerPage();
  return filteredHBLs().slice(start, end);
});

const totalPages = createMemo(() => 
  Math.ceil(filteredHBLs().length / itemsPerPage())
);

const uniqueGuides = createMemo(() => {
  const guides = new Set(hbls().map(hbl => hbl.guia));
  return Array.from(guides).sort();
});

const uniqueStatuses = createMemo(() => {
  const statuses = new Set(hbls().map(hbl => hbl.idguidestate));
  return Array.from(statuses).sort();
});

// Actions
const fetchHBLs = async (search?: string, filters?: any) => {
  setLoading(true);
  setError(null);

  try {
    const searchValue = search || searchTerm();
    if (!searchValue?.trim()) {
      setHbls([]);
      return;
    }

    // Combinar filtros del parámetro con los del store
    const combinedFilters: any = {
      guia: guideFilter() !== 'all' ? guideFilter() : undefined,
      ...filters
    };

    const result = await inventoryApi.getHBLS(searchValue.trim(), combinedFilters);

    if (result?.error) {
      setError(result.error);
      setHbls([]);
      return []
    } else {
      setHbls(Object.values(result || {}));
      return Object.values(result || {})?.[0]
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch HBLs');
    setHbls([]);
  } finally {
    setLoading(false);
  }
};

const fetchHBLsByIds = async (hblIds: string[], filters?: any) => {
  setLoading(true);
  setError(null);

  try {
    if (!hblIds || hblIds.length === 0) {
      setHbls([]);
      return;
    }

    // Combinar filtros del parámetro con los del store
    const combinedFilters: any = {
      guia: guideFilter() !== 'all' ? guideFilter() : undefined,
      ...filters
    };

    const result = await inventoryApi.hblsByMultIds(hblIds, combinedFilters);

    if (result?.error) {
      setError(result.error);
      setHbls([]);
    } else {
      setHbls(result);
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch HBLs by IDs');
    setHbls([]);
  } finally {
    setLoading(false);
  }
};

const addHBL = async (hbl: Partial<HBL>) => {
  try {
    // API call to add HBL
    // const newHBL = await inventoryApi.createHBL(hbl);
    // For now, just add to local state
    const newHBL = {
      ...hbl,
      referenceHId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } as HBL;
    
    setHbls([newHBL, ...hbls()]);
    return newHBL;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to add HBL');
    throw err;
  }
};

const updateHBL = async (hblId: string, updates: Partial<HBL>) => {
  try {
    // API call to update HBL
    // const updatedHBL = await inventoryApi.updateHBL(hblId, updates);
    
    // For now, update local state
    setHbls(hbls().map(hbl => 
      hbl.referenceHId === hblId ? { ...hbl, ...updates } : hbl
    ));
    
    return updates;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update HBL');
    throw err;
  }
};

const deleteHBL = async (hblId: string) => {
  try {
    // API call to delete HBL
    // await inventoryApi.deleteHBL(hblId);
    
    setHbls(hbls().filter(hbl => hbl.referenceHId !== hblId));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete HBL');
    throw err;
  }
};

const bulkUpdateStatus = async (hblIds: string[], status: string) => {
  try {
    // API call for bulk update
    // await inventoryApi.bulkUpdateHBLStatus(hblIds, status);
    
    // Update local state
    setHbls(hbls().map(hbl => 
      hblIds.includes(hbl.referenceHId) 
        ? { ...hbl, idguidestate: status } 
        : hbl
    ));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update HBL statuses');
    throw err;
  }
};

const toggleHBLSelection = (hblId: string) => {
  const newSelection = new Set(selectedHBLs());
  if (newSelection.has(hblId)) {
    newSelection.delete(hblId);
  } else {
    newSelection.add(hblId);
  }
  setSelectedHBLs(newSelection);
};





// Actions
const fetchScannedLocations = async (search?: string, filters?: any) => {
  setLoading(true);
  setError(null);

  try {
    const searchValue = search || searchTerm();
    if (!searchValue?.trim()) {
      //setHbls([]);
      return;
    }

    // Combinar filtros del parámetro con los del store
    const combinedFilters: any = {
      guia: guideFilter() !== 'all' ? guideFilter() : undefined,
      ...filters
    };

    const result = await inventoryApi.getScannedLocations(searchValue.trim(), combinedFilters);
   
    if (result?.error) {
      setError(result.error);
      return [];
    } else {
      return result;
      //setHbls(Object.values(result || {}));
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch HBLs');
    setHbls([]);
  } finally {
    setLoading(false);
  }
};

const selectAllHBLs = () => {
  const allIds = paginatedHBLs().map(hbl => hbl.referenceHId);
  setSelectedHBLs(new Set(allIds));
};

const clearSelection = () => {
  setSelectedHBLs(new Set());
};

/**
 * Check HBLs for missing consigneeName and fetch from ConsigneeYabaexpress
 * Updates HBLs with consignee full name when cidentity is available
 * @param hblList - List of HBLs to check
 * @returns Updated list of HBLs with consignee names filled in
 */
const checkAndUpdateConsigneeNames = async (hblList: HBL[]): Promise<HBL[]> => {
  if (!hblList || hblList.length === 0) {
    return hblList;
  }


  devLog(`Checking ${hblList.length} HBLs for missing consignee names...`);
 
  const updatedHBLs: HBL[] = [];
  let updateCount = 0;
  let errorCount = 0;

  for (const hbl of hblList) {
    // Check if consigneeName is missing or empty
    if (!hbl.consigneeName || hbl.consigneeName.trim() === '') {
      // Check if cidentity is available
      if (hbl.cidentity && hbl.cidentity.trim() !== '') {
        try {
          // Fetch consignee by cidentity
          const consignee = await consigneeService.getConsigneeByCid(hbl.cidentity);

          if (consignee && consignee.fullName) {
            // Update HBL with consignee name
            const updatedHBL = {
              ...hbl,
              consigneeName: consignee.fullName
            };

            if(consignee?.fullName?.trim()){
              await  inventoryApi.updateHBL(hbl.hbl,{ consigneeName: consignee.fullName.trim()})
            }
            devLog({consignee, updatedHBL})
            updatedHBLs.push(updatedHBL);
            updateCount++;
            devLog(`✓ Updated HBL ${hbl.hbl}: ${consignee.fullName} (cid: ${hbl.cidentity})`);
          } else {
            // Consignee not found, keep original HBL
            updatedHBLs.push(hbl);
            devLog(`⚠ Consignee not found for cid: ${hbl.cidentity} (HBL: ${hbl.hbl})`);
          }
        } catch (error) {
          // Error fetching consignee, keep original HBL
          updatedHBLs.push(hbl);
          errorCount++;
          devLog(`✗ Error fetching consignee for HBL ${hbl.hbl}:`, error);
        }
      } else {
        // No cidentity available, keep original HBL
        updatedHBLs.push(hbl);
        devLog(`⚠ HBL ${hbl.hbl} missing both consigneeName and cidentity`);
      }
    } else {
      // consigneeName already exists, keep original HBL
      updatedHBLs.push(hbl);
    }
  }

  devLog(`Consignee name update complete: ${updateCount} updated, ${errorCount} errors`);
  return updatedHBLs;
};

/**
 * Check and update consignee names for currently loaded HBLs in store
 * Updates the store with new consignee names
 */
const updateStoreConsigneeNames = async (): Promise<void> => {
  const currentHBLs = hbls();
  if (currentHBLs.length === 0) {
    devLog('No HBLs loaded to update');
    return;
  }

  setLoading(true);
  try {
    const updatedHBLs = await checkAndUpdateConsigneeNames(currentHBLs);
    setHbls(updatedHBLs);
    devLog('Store updated with consignee names');
  } catch (error) {
    devLog('Error updating store consignee names:', error);
    setError('Failed to update consignee names');
  } finally {
    setLoading(false);
  }
};

export const hblStore = {
  // State
  hbls,
  loading,
  error,
  selectedHBLs,
  searchTerm,
  statusFilter,
  guideFilter,
  dateRange,
  currentPage,
  itemsPerPage,

  // Computed
  filteredHBLs,
  paginatedHBLs,
  totalPages,
  uniqueGuides,
  uniqueStatuses,

  // Actions
  fetchHBLs,
  fetchHBLsByIds,
  addHBL,
  updateHBL,
  deleteHBL,
  bulkUpdateStatus,
  toggleHBLSelection,
  selectAllHBLs,
  clearSelection,
  fetchScannedLocations,
  checkAndUpdateConsigneeNames,
  updateStoreConsigneeNames,
  // Setters
  setSearchTerm,
  setStatusFilter,
  setGuideFilter,
  setDateRange,
  setCurrentPage,
  setItemsPerPage,
  setHbls
};