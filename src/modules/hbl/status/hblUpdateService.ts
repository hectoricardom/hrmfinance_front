import { inventoryApi } from '../../../services/apiAdapter';
import { parseHBLNumbers, isValidHBL } from '../data/hblParser';

// Status list configuration
export const statusAllList = [
  { id: "YABA_09", label: "Recogida en Tienda", icon: "market", index: 0 },
  { id: "YABA_11", label: "En transito hacia YABA WH", icon: "truck-fast-outline", index: 1 },
  { id: "YABA_13", label: "YABA ALMACEN", icon: "store", index: 2 },
  { id: "YABA_14", label: "En transito hacia FL", icon: "truck-fast-outline", index: 3 },
  { id: "YABA_22", label: "Entrega a la aerolinea", icon: "airplane-takeoff", index: 4 },
  { id: "AERO_28", label: "LLegando a AeroVaradero", icon: "airplane-landing", index: 5 },
  { id: "AERO_33", label: "Recogida en AeroVaradero", icon: "dolly", index: 6 },
  { id: "YABA_46", label: "Transporte HAV", icon: "car-hatchback", tag: "HAV", index: 7 },
  { id: "YABA_40", label: "Transporte CAV", icon: "car-hatchback", tag: "CAV", index: 7 },
  { id: "YABA_41", label: "Transporte CMG", icon: "car-hatchback", tag: "CMG", index: 7 },
  { id: "YABA_42", label: "Transporte HLG", icon: "car-hatchback", tag: "HLG", index: 7 },
  { id: "YABA_50", label: "Almacen HAV", icon: "store", tag: "HAV", index: 8 },
  { id: "YABA_52", label: "Almacen CAV", icon: "store", tag: "CAV", index: 8 },
  { id: "YABA_54", label: "Almacen CMG", icon: "store", tag: "CMG", index: 8 },
  { id: "YABA_56", label: "Almacen HLG", icon: "store", tag: "HLG", index: 8 },
  { id: "YABA_70", label: "Escaneando por Locaciones", icon: "sort-numeric-ascending", index: 9 },
  { id: "YABA_78", label: "En reparto", icon: "moped", index: 10 },
  { id: "SSG_147", label: "SSG-47", icon: "sort-numeric-ascending", index: 11 },
  { id: "SSG_148", label: "SSG-48", icon: "sort-numeric-ascending", index: 12 },
  { id: "SSG_149", label: "SSG-49", icon: "sort-numeric-ascending", index: 13 },
  { id: "YABA_99", label: "Entregado", icon: "success", index: 99 },
];

export interface HBLUpdateResult {
  hbl: string;
  success: boolean;
  error?: string;
  previousStatus?: string;
  newStatus?: string;
  code?:number;
  msg?: string;
}

export interface BulkUpdateRequest {
  hbls: string[];
  statusId: string;
  notes?: string;
  scannedBy?: {
    userId: string;
    name: string;
    email: string;
  };
}

export interface BulkUpdateResponse {
  success: boolean;
  results: HBLUpdateResult[];
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
}

/**
 * Update the location status of a single HBL
 * @param hbl - HBL number
 * @param statusId - New status ID
 * @param notes - Optional notes for the update
 * @param scannedBy - Optional user who scanned
 * @returns Update result
 */
export const updateHBLStatus = async (
  hbl: string,
  statusId: string,
  notes?: string,
  scannedBy?: string
): Promise<HBLUpdateResult> => {
  try {
    if (!isValidHBL(hbl)) {
      return {
        hbl,
        success: false,
        error: 'Invalid HBL format. Expected 230XXXXXX'
      };
    }

    const status = getStatusById(statusId);
    const locationScan = {
      locationId: statusId,
      locationLabel: status?.label || 'Unknown',
      scannedAt: new Date(),
      ...(scannedBy && { scannedBy }), // This will be the formatted string "Name (email)"
      ...(notes && { notes })
    };

    const updateData = {
      idguidestate: statusId,
      locationScan, // Add location scan data
      ...(notes && { notes })
    };

    const response = await inventoryApi.updateHBLStatus(hbl, updateData);

    return {
      hbl,
      success: true,
      newStatus: statusId,
      code: response?.data?.code,
      msg: response?.data?.data?.consigneeInfo?.ybcity,
      previousStatus: response.previousStatus
    };
  } catch (error) {
    return {
      hbl,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Update multiple HBL statuses in bulk
 * @param request - Bulk update request
 * @returns Bulk update response
 */
export const updateHBLStatusBulk = async (
  request: BulkUpdateRequest
): Promise<BulkUpdateResponse> => {
  const results: HBLUpdateResult[] = [];
  let totalSuccess = 0;
  let totalFailed = 0;

  // Format scannedBy string if user info is provided
  const scannedByString = request.scannedBy
    ? `${request.scannedBy.name}${request.scannedBy.email ? ` (${request.scannedBy.email})` : ''}`
    : undefined;

  // Process HBLs sequentially to avoid overwhelming the server
  for (const hbl of request.hbls) {
    const result = await updateHBLStatus(
      hbl,
      request.statusId,
      request.notes,
      scannedByString
    );
    results.push(result);

    if (result.success) {
      totalSuccess++;
    } else {
      totalFailed++;
    }
  }

  return {
    success: totalFailed === 0,
    results,
    totalProcessed: request.hbls.length,
    totalSuccess,
    totalFailed
  };
};

/**
 * Parse text and update all found HBLs with new status
 * @param text - Text containing HBL numbers
 * @param statusId - New status ID
 * @param notes - Optional notes
 * @param scannedBy - Optional user who scanned
 * @returns Bulk update response
 */
export const parseAndUpdateHBLs = async (
  text: string,
  statusId: string,
  notes?: string,
  scannedBy?: {
    userId: string;
    name: string;
    email: string;
  }
): Promise<BulkUpdateResponse> => {
  const hbls = parseHBLNumbers(text);

  if (hbls.length === 0) {
    return {
      success: false,
      results: [],
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0
    };
  }

  return updateHBLStatusBulk({
    hbls,
    statusId,
    notes,
    scannedBy
  });
};

/**
 * Get status by ID
 * @param statusId - Status ID
 * @returns Status object or undefined
 */
export const getStatusById = (statusId: string) => {
  return statusAllList.find(status => status.id === statusId);
};

/**
 * Get statuses by tag
 * @param tag - Tag to filter by
 * @returns Array of statuses with the tag
 */
export const getStatusesByTag = (tag: string) => {
  return statusAllList.filter(status => status.tag === tag);
};

/**
 * Get next status in workflow
 * @param currentStatusId - Current status ID
 * @returns Next status or undefined if at end
 */
export const getNextStatus = (currentStatusId: string) => {
  const currentStatus = getStatusById(currentStatusId);
  if (!currentStatus) return undefined;
  
  const currentIndex = currentStatus.index;
  return statusAllList.find(status => status.index === currentIndex + 1);
};