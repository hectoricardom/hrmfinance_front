import { fetchGraphQLSS, devLog } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { HBL, HBLLocationScan } from '../types';
import { statusAllList } from '../status/hblUpdateService';

export interface LocationSummary {
  locationId: string;
  locationLabel: string;
  hblCount: number;
  hbls: Array<{
    hbl: string;
    lastScannedAt: Date;
    scannedBy?: string;
  }>;
}

export interface LocationSummaryReport {
  totalHBLs: number;
  locations: LocationSummary[];
  lastUpdated: Date;
}

export interface SummaryFilters {
  guia?: string;
  searchTerm?: string;
}

/**
 * Fetch all HBLs from the system with optional filters
 * @param filters - Optional filters for guide and search
 */
async function fetchAllHBLs(filters?: SummaryFilters): Promise<HBL[]> {
  try {
    // Use a common search term to get many HBLs
    const params: Record<string, any> = {
      ":search0": filters?.searchTerm || "230" // Use search term or default prefix
    };

    // Add guide filter if provided
    if (filters?.guia && filters.guia !== 'all') {
      params.guia = filters.guia;
    }

    const bdyq2 = {
      query: "getScanYabaHbls",
      queryString: "!* contain :search0 AND guia = guia",
      params,
      limit: 10000 // Get many records
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  } catch (error) {
    devLog('Error fetching all HBLs:', error);
    return [];
  }
}

/**
 * Get the last scanned location from an HBL's scannedLocations array
 */
function getLastScannedLocation(hbl: HBL): HBLLocationScan | null {
  if (!hbl.scannedLocations || hbl.scannedLocations.length === 0) {
    return null;
  }

  // Sort by scannedAt date and get the most recent
  const sorted = [...hbl.scannedLocations].sort((a, b) => {
    const dateA = new Date(a.scannedAt).getTime();
    const dateB = new Date(b.scannedAt).getTime();
    return dateB - dateA; // Descending order (most recent first)
  });

  return sorted[0];
}

/**
 * Get location label by ID from statusAllList
 */
function getLocationLabel(locationId: string): string {
  const status = statusAllList.find(s => s.id === locationId);
  return status?.label || locationId;
}

/**
 * Group HBLs by their last scanned location
 * @param filters - Optional filters for guide and search
 */
export async function groupHBLsByLastLocation(filters?: SummaryFilters): Promise<LocationSummaryReport> {
  try {
    devLog('📊 Fetching all HBLs for location summary...', filters);

    // Fetch all HBLs with filters
   devLog(filters)
    let query = ""



    let  params: Record<string, any> = {
      
    }


    if(filters?.guia){
       query += " "+ filters?.guia;
    }

    if(filters?.searchTerm){
       query += " "+ filters?.searchTerm;
    }

    query && query.split(" ").map((qry,inDq)=>{
      if(qry){
          params[":search"+inDq] = qry.trim();
      }
    })

		
    let bdyq2 = {
      query: "getScannedLocations",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND !* contain :search5",
      params
    } 
    const response = await fetchGraphQLSS(bdyq2)
    devLog(bdyq2)
    devLog(response)

    let allHBLs:any = []
    devLog(`✅ Fetched ${allHBLs.length} HBLs`);

    // Group by last location
    const locationMap = new Map<string, LocationSummary>();

    for (const hbl of allHBLs) {
      const lastScan = getLastScannedLocation(hbl);

      if (!lastScan) {
        // HBL has no scanned locations, skip or add to "unscanned" category
        continue;
      }

      const locationId = lastScan.locationId;

      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          locationId,
          locationLabel: getLocationLabel(locationId),
          hblCount: 0,
          hbls: []
        });
      }

      const locationSummary = locationMap.get(locationId)!;
      locationSummary.hblCount++;
      locationSummary.hbls.push({
        hbl: hbl.hbl,
        lastScannedAt: new Date(lastScan.scannedAt),
        scannedBy: lastScan.scannedBy
      });
    }

    // Convert map to array and sort by count (descending)
    const locations = Array.from(locationMap.values()).sort((a, b) => b.hblCount - a.hblCount);

    const report: LocationSummaryReport = {
      totalHBLs: allHBLs.length,
      locations,
      lastUpdated: new Date()
    };

    devLog('✅ Location summary generated:', {
      totalHBLs: report.totalHBLs,
      totalLocations: locations.length
    });

    return report;
  } catch (error) {
    devLog('❌ Error grouping HBLs by location:', error);
    throw error;
  }
}

/**
 * Get HBLs for a specific location
 * @param locationId - The location ID to get HBLs for
 * @param filters - Optional filters for guide and search
 */
export async function getHBLsForLocation(
  locationId: string,
  filters?: SummaryFilters
): Promise<Array<{
  hbl: string;
  lastScannedAt: Date;
  scannedBy?: string;
}>> {
  try {
    const allHBLs = await fetchAllHBLs(filters);

    const hblsForLocation: Array<{
      hbl: string;
      lastScannedAt: Date;
      scannedBy?: string;
    }> = [];

    for (const hbl of allHBLs) {
      const lastScan = getLastScannedLocation(hbl);

      if (lastScan && lastScan.locationId === locationId) {
        hblsForLocation.push({
          hbl: hbl.hbl,
          lastScannedAt: new Date(lastScan.scannedAt),
          scannedBy: lastScan.scannedBy
        });
      }
    }

    // Sort by scanned date (most recent first)
    hblsForLocation.sort((a, b) => b.lastScannedAt.getTime() - a.lastScannedAt.getTime());

    return hblsForLocation;
  } catch (error) {
    devLog(`Error getting HBLs for location ${locationId}:`, error);
    return [];
  }
}
