// Agency mapping data extracted from the datalist
// Maps agency ID to its corresponding name

export interface Agency {
  name: string;
  id: number;
}

export const AGENCY_MAP: Record<number, string> = {
  1: 'YABA SUR',
  2: 'YABASUR01',
  3: 'YABASUR02',
  4: 'YABASURDALLAS01',
  5: 'YABASUR03',
  6: 'KRATOS',
  7: 'SHELSY',
  8: 'YABASURFLORIDA',
  10: 'MORENOCARGO',
  11: 'PARADISE',
  12: 'PRESTON_MARKET',
  13: 'YABASUR KY',
  14: 'YABASUR OR',
  15: 'FASHIONCONNECTION',
  16: 'YABAGLOBAL',
  17: 'AMUNDOTRAVEL',
  18: 'YABASURAUSTIN',
  19: 'YABASURSANANTONIO',
  20: 'YABASURDALLAS0R',
  22: 'CUBANFAHION',
  25: 'YABASUR/AS',
  26: 'CUBANACARGO',
  27: 'DIXIEHWY',
  28: 'SLENVIOS',
  29: 'SLENVIOS/PMC',
  30: 'VANYFLORES',
  31: 'AIME/KENTUKY',
  32: 'YABA MESQUITE',
  33: 'YABASUR ARIZONA',
  34: 'YABA DALLAS REC 03',
  35: 'YABA_CUBANITA_DALLAS',
  36: 'CAPECORAL',
  37: 'CONTROL AEROVARADERO',
  38: 'YABA TX DALLAS RECOLECTOR',
  39: 'PRECALEX EXPORT',
  40: 'YABA TUCSON AZ',
  41: 'YABAOFICIAL',
  42: 'STEPHANIE SOLUTION',
  43: 'OHIO ENVIOS',
  44: 'YABANEBRASKA',
  45: 'YABA/DALLAS/R01',
  46: 'MIGUEL/HOUSTON/R',
  47: 'YABAOFICINA AZ',
  48: 'PRINCESS CARGO',
  49: 'BOWLING GREEB KY',
  50: 'FL/STORE',
  51: 'VITO',
  52: 'PARADAISE/CHiNO',
  53: 'MK/AVENTURE',
  54: 'YABA YAIMA',
  55: 'VANYFLORES02',
  56: 'L&A DALLA',
  57: 'FAMILY A MULTISERVICES',
  58: 'YABA MIAMI 01',
  59: 'PL MULTISERVICES',
  60: 'CUBA MULTISERVICES',
  61: 'YABAFLORIDAD29',
  62: 'VENTURA'
};

// Array of agencies for dropdowns and lists
export const AGENCIES: Agency[] = Object.entries(AGENCY_MAP).map(([id, name]) => ({
  name,
  id: Number(id)
}));

// Get agency name by ID
export const getAgencyNameById = (id: number | string): string | undefined => {
  return AGENCY_MAP[Number(id)];
};

// Get agency ID by name
export const getAgencyIdByName = (name: string): number | undefined => {
  const entry = Object.entries(AGENCY_MAP).find(([_, agencyName]) => agencyName === name);
  return entry ? Number(entry[0]) : undefined;
};

// Agency categories for grouping
export const AGENCY_CATEGORIES = {
  YABA: AGENCIES.filter(a => a.name.toUpperCase().includes('YABA')),
  CARGO: AGENCIES.filter(a => 
    a.name.toUpperCase().includes('CARGO') || 
    a.name.toUpperCase().includes('ENVIOS')
  ),
  MULTISERVICES: AGENCIES.filter(a => a.name.toUpperCase().includes('MULTISERVICES')),
  FASHION: AGENCIES.filter(a => 
    a.name.toUpperCase().includes('FASHION') || 
    a.name.toUpperCase().includes('FASHIONCONNECTION')
  ),
  OTHER: AGENCIES.filter(a => 
    !a.name.toUpperCase().includes('YABA') &&
    !a.name.toUpperCase().includes('CARGO') &&
    !a.name.toUpperCase().includes('ENVIOS') &&
    !a.name.toUpperCase().includes('MULTISERVICES') &&
    !a.name.toUpperCase().includes('FASHION')
  )
};

// Sorted agencies by name
export const SORTED_AGENCIES = [...AGENCIES].sort((a, b) => 
  a.name.localeCompare(b.name)
);

// Agencies grouped by first letter for alphabetical navigation
export const AGENCIES_BY_LETTER = SORTED_AGENCIES.reduce((acc, agency) => {
  const firstLetter = agency.name[0].toUpperCase();
  if (!acc[firstLetter]) {
    acc[firstLetter] = [];
  }
  acc[firstLetter].push(agency);
  return acc;
}, {} as Record<string, Agency[]>);