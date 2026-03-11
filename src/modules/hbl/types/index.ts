export interface HBLAddress {
  estate: string;
  city: string;
  rpto?: string;        // Reparto (neighborhood)
  streetName: string;
  streetNo: string;
  betwen: string;
}

export interface HBLLocationScan {
  locationId: string;
  locationLabel: string;
  scannedAt: Date;
  scannedBy?: string;
  notes?: string;
}

export interface HBL {
  idreserve: string;
  idreservestate?: string;
  idairnumber: string;
  idairguide: string;
  idclasification?: string;
  datereserve: string;
  hbl: string;
  cidentity: string;
  street: string;
  ctelephone: string;
  nameshipper: string;
  quantity: string;
  weight: string;
  idguidestate: string;
  namegood: string;
  bagnumber: string;
  agency: string;
  guia: string;
  consigneeName: string;
  phoneshipper: string;
  address: HBLAddress;
  referenceHId?: string;
  scannedLocations?: HBLLocationScan[];
}

export interface HBLFilter {
  searchTerm?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  guide?: string;
  agency?: string;
}

export interface HBLStatusUpdate {
  hbl: string;
  status: string;
  timestamp: Date;
  user?: string;
  notes?: string;
}

export interface HBLScanResult {
  hbl: string;
  scannedAt: Date;
  location?: string;
  type: 'single' | 'bulk' | 'continuous';
}

export type HBLStatus = 'PENDIENTE' | 'EN BODEGA' | 'ENVIADO' | 'ENTREGADO' | 'DEVUELTO';

export interface HBLPrintOptions {
  title?: string;
  includeDetails?: boolean;
  pageSize?: 'letter' | 'a4';
  orientation?: 'portrait' | 'landscape';
}