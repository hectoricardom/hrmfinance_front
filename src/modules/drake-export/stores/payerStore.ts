import { createSignal } from 'solid-js';

/**
 * Saved Payer Store
 * localStorage-backed store for managing custom payer/employer records
 * Used for generating 1099-NEC, W-2, and other tax forms
 */

// Document types that payers can be associated with
export type PayerDocumentType =
  | 'W-2'
  | '1099-NEC'
  | '1099-MISC'
  | '1099-INT'
  | '1099-DIV'
  | '1099-B'
  | '1099-R'
  | '1099-G'
  | '1099-K'
  | '1098'
  | 'other';

export interface SavedPayer {
  id: string;              // `payer_${Date.now()}`
  name: string;            // Legal business name
  dba?: string;            // Doing Business As (trade name)
  ein: string;             // Employer Identification Number (XX-XXXXXXX)
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  documentTypes: PayerDocumentType[];  // Types of documents associated with this payer
  taxYears: number[];      // Tax years this payer has been used
  notes?: string;          // Optional notes
  createdAt: number;
  updatedAt: number;
}

// Payer statistics interface
export interface PayerStats {
  totalPayers: number;
  payersByState: Record<string, number>;
  payersByDocumentType: Record<PayerDocumentType, number>;
  payersByTaxYear: Record<number, number>;
  recentlyAdded: SavedPayer[];
  recentlyUpdated: SavedPayer[];
}

// EIN validation result
export interface EINValidationResult {
  isValid: boolean;
  formatted: string | null;
  errors: string[];
  prefix?: string;
  prefixMeaning?: string;
}

// Payer data from W-2 or 1099 extraction
export interface ExtractedPayerData {
  name?: string;
  dba?: string;
  ein?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  documentType?: PayerDocumentType;
  taxYear?: number;
}

// Storage key for saved payers
const STORAGE_KEY = 'tax_saved_payers';

// EIN prefix meanings (first two digits indicate assignment)
const EIN_PREFIX_MAP: Record<string, string> = {
  '01': 'Campus - New York (NE region)',
  '02': 'Campus - New York (NE region)',
  '03': 'Campus - New York (NE region)',
  '04': 'Campus - New York (NE region)',
  '05': 'Campus - New York (NE region)',
  '06': 'Campus - New York (NE region)',
  '10': 'Campus - Andover (NE region)',
  '11': 'Campus - Andover (NE region)',
  '12': 'Campus - Andover (NE region)',
  '13': 'Campus - Andover (NE region)',
  '14': 'Campus - Andover (NE region)',
  '15': 'Campus - Andover (NE region)',
  '20': 'Internet / Third Party',
  '26': 'Internet / Third Party',
  '27': 'Internet / Third Party',
  '30': 'Campus - Atlanta (SE region)',
  '32': 'Campus - Atlanta (SE region)',
  '33': 'Campus - Austin (SW region)',
  '34': 'Campus - Austin (SW region)',
  '35': 'Campus - Philadelphia (NE region)',
  '36': 'Campus - Philadelphia (NE region)',
  '37': 'Campus - Philadelphia (NE region)',
  '38': 'Campus - Philadelphia (NE region)',
  '39': 'Campus - Philadelphia (NE region)',
  '40': 'Campus - Kansas City (Midwest)',
  '41': 'Campus - Kansas City (Midwest)',
  '42': 'Campus - Kansas City (Midwest)',
  '43': 'Campus - Kansas City (Midwest)',
  '44': 'Campus - Kansas City (Midwest)',
  '45': 'Campus - Kansas City (Midwest)',
  '46': 'Campus - Kansas City (Midwest)',
  '47': 'Campus - Kansas City (Midwest)',
  '48': 'Campus - Kansas City (Midwest)',
  '50': 'Campus - Cincinnati (Midwest)',
  '51': 'Campus - Cincinnati (Midwest)',
  '52': 'Campus - Cincinnati (Midwest)',
  '53': 'Campus - Cincinnati (Midwest)',
  '54': 'Campus - Cincinnati (Midwest)',
  '55': 'Campus - Cincinnati (Midwest)',
  '56': 'Campus - Cincinnati (Midwest)',
  '57': 'Campus - Cincinnati (Midwest)',
  '58': 'Campus - Cincinnati (Midwest)',
  '59': 'Campus - Cincinnati (Midwest)',
  '60': 'Campus - Ogden (Western)',
  '61': 'Campus - Ogden (Western)',
  '62': 'Campus - Fresno (Western)',
  '63': 'Campus - Fresno (Western)',
  '64': 'Campus - Fresno (Western)',
  '65': 'Campus - Fresno (Western)',
  '66': 'Campus - Fresno (Western)',
  '67': 'Campus - Fresno (Western)',
  '68': 'Campus - Memphis (SE region)',
  '71': 'Campus - Memphis (SE region)',
  '72': 'Campus - Memphis (SE region)',
  '73': 'Campus - Memphis (SE region)',
  '74': 'Campus - Memphis (SE region)',
  '75': 'Campus - Memphis (SE region)',
  '76': 'Campus - Memphis (SE region)',
  '77': 'Campus - Memphis (SE region)',
  '80': 'Internet / Third Party',
  '81': 'Internet / Third Party',
  '82': 'Internet / Third Party',
  '83': 'Internet / Third Party',
  '84': 'Internet / Third Party',
  '85': 'Internet / Third Party',
  '86': 'Internet / Third Party',
  '87': 'Internet / Third Party',
  '88': 'Internet / Third Party',
  '90': 'Campus - Ogden (Western)',
  '91': 'Campus - Ogden (Western)',
  '92': 'Campus - Ogden (Western)',
  '93': 'Campus - Ogden (Western)',
  '94': 'Campus - Ogden (Western)',
  '95': 'Campus - Ogden (Western)',
  '98': 'Campus - Ogden (Western)',
  '99': 'Campus - Ogden (Western)',
};

// Load payers from localStorage
const loadPayers = (): SavedPayer[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old payers without new fields
      return parsed.map((p: SavedPayer) => ({
        ...p,
        dba: p.dba || '',
        documentTypes: p.documentTypes || [],
        taxYears: p.taxYears || [],
        notes: p.notes || '',
      }));
    }
  } catch (error) {
    console.warn('Failed to load saved payers:', error);
  }
  return [];
};

// Save payers to localStorage
const savePayers = (payers: SavedPayer[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payers));
  } catch (error) {
    console.warn('Failed to save payers:', error);
  }
};

// Normalize EIN for comparison (remove dashes and spaces)
const normalizeEIN = (ein: string): string => {
  return ein.replace(/[-\s]/g, '').trim();
};

// Format EIN as XX-XXXXXXX
const formatEIN = (ein: string): string => {
  const normalized = normalizeEIN(ein);
  if (normalized.length === 9) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }
  return ein;
};

// Initialize payers signal
const [payers, setPayers] = createSignal<SavedPayer[]>(loadPayers());

export const payerStore = {
  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Reactive getter for all saved payers
   */
  get payers() {
    return payers();
  },

  /**
   * Get all payers (non-reactive snapshot)
   */
  getAllPayers(): SavedPayer[] {
    return [...payers()];
  },

  /**
   * Get a payer by internal ID
   */
  getPayerById(id: string): SavedPayer | undefined {
    return payers().find(payer => payer.id === id);
  },

  /**
   * Lookup payer by EIN (handles various formats)
   */
  getPayerByEIN(ein: string): SavedPayer | undefined {
    const normalized = normalizeEIN(ein);
    return payers().find(payer => normalizeEIN(payer.ein) === normalized);
  },

  /**
   * Add a new payer
   */
  addPayer(data: Omit<SavedPayer, 'id' | 'createdAt' | 'updatedAt'>): SavedPayer {
    const now = Date.now();
    const newPayer: SavedPayer = {
      ...data,
      ein: formatEIN(data.ein),
      documentTypes: data.documentTypes || [],
      taxYears: data.taxYears || [],
      id: `payer_${now}`,
      createdAt: now,
      updatedAt: now,
    };

    setPayers(prev => {
      const updated = [...prev, newPayer];
      savePayers(updated);
      return updated;
    });

    return newPayer;
  },

  /**
   * Add or update payer by EIN (upsert)
   * Useful when processing documents - if payer exists, update; otherwise create
   */
  upsertPayer(data: Omit<SavedPayer, 'id' | 'createdAt' | 'updatedAt'>): SavedPayer {
    const existing = this.getPayerByEIN(data.ein);

    if (existing) {
      // Merge document types and tax years
      const mergedDocTypes = Array.from(new Set([
        ...(existing.documentTypes || []),
        ...(data.documentTypes || [])
      ]));
      const mergedTaxYears = Array.from(new Set([
        ...(existing.taxYears || []),
        ...(data.taxYears || [])
      ])).sort((a, b) => b - a);

      this.updatePayer(existing.id, {
        ...data,
        documentTypes: mergedDocTypes,
        taxYears: mergedTaxYears,
      });
      return this.getPayerById(existing.id)!;
    } else {
      return this.addPayer(data);
    }
  },

  /**
   * Update an existing payer
   */
  updatePayer(id: string, updates: Partial<Omit<SavedPayer, 'id' | 'createdAt'>>): void {
    setPayers(prev => {
      const updated = prev.map(payer =>
        payer.id === id
          ? {
              ...payer,
              ...updates,
              ein: updates.ein ? formatEIN(updates.ein) : payer.ein,
              updatedAt: Date.now()
            }
          : payer
      );
      savePayers(updated);
      return updated;
    });
  },

  /**
   * Delete a payer by ID
   */
  deletePayer(id: string): void {
    setPayers(prev => {
      const updated = prev.filter(payer => payer.id !== id);
      savePayers(updated);
      return updated;
    });
  },

  // ============================================
  // Search Operations
  // ============================================

  /**
   * Search payers by name, DBA, EIN, city, or state (case-insensitive)
   */
  searchPayers(query: string): SavedPayer[] {
    if (!query.trim()) {
      return payers();
    }

    const lowerQuery = query.toLowerCase().trim();
    const normalizedQuery = normalizeEIN(query);

    return payers().filter(payer =>
      payer.name.toLowerCase().includes(lowerQuery) ||
      (payer.dba && payer.dba.toLowerCase().includes(lowerQuery)) ||
      normalizeEIN(payer.ein).includes(normalizedQuery) ||
      payer.city.toLowerCase().includes(lowerQuery) ||
      payer.state.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Filter payers by state
   */
  getPayersByState(state: string): SavedPayer[] {
    const upperState = state.toUpperCase().trim();
    return payers().filter(payer =>
      payer.state.toUpperCase() === upperState
    );
  },

  /**
   * Find payers by document type (W-2, 1099-NEC, etc.)
   */
  getPayersByDocumentType(docType: PayerDocumentType): SavedPayer[] {
    return payers().filter(payer =>
      payer.documentTypes?.includes(docType)
    );
  },

  /**
   * Filter payers by tax year
   */
  getPayersByTaxYear(year: number): SavedPayer[] {
    return payers().filter(payer =>
      payer.taxYears?.includes(year)
    );
  },

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Validate EIN format and prefix
   * Returns validation result with formatted EIN and any errors
   */
  validateEINFormat(ein: string): EINValidationResult {
    const errors: string[] = [];
    const normalized = normalizeEIN(ein);

    // Check length
    if (normalized.length !== 9) {
      errors.push(`EIN must be 9 digits (got ${normalized.length})`);
    }

    // Check if all digits
    if (!/^\d+$/.test(normalized)) {
      errors.push('EIN must contain only digits');
    }

    // Check for invalid patterns
    if (normalized === '000000000') {
      errors.push('EIN cannot be all zeros');
    }

    // Check prefix
    const prefix = normalized.slice(0, 2);
    const prefixMeaning = EIN_PREFIX_MAP[prefix];

    if (normalized.length >= 2 && !prefixMeaning && /^\d{2}$/.test(prefix)) {
      errors.push(`EIN prefix ${prefix} is not a valid IRS campus code`);
    }

    const isValid = errors.length === 0 && normalized.length === 9;

    return {
      isValid,
      formatted: isValid ? formatEIN(normalized) : null,
      errors,
      prefix: normalized.length >= 2 ? prefix : undefined,
      prefixMeaning,
    };
  },

  /**
   * Get statistics on all payers
   */
  getPayerStats(): PayerStats {
    const allPayers = payers();

    // Count by state
    const payersByState: Record<string, number> = {};
    allPayers.forEach(p => {
      const state = p.state.toUpperCase() || 'Unknown';
      payersByState[state] = (payersByState[state] || 0) + 1;
    });

    // Count by document type
    const payersByDocumentType: Record<PayerDocumentType, number> = {
      'W-2': 0,
      '1099-NEC': 0,
      '1099-MISC': 0,
      '1099-INT': 0,
      '1099-DIV': 0,
      '1099-B': 0,
      '1099-R': 0,
      '1099-G': 0,
      '1099-K': 0,
      '1098': 0,
      'other': 0,
    };
    allPayers.forEach(p => {
      (p.documentTypes || []).forEach(dt => {
        payersByDocumentType[dt] = (payersByDocumentType[dt] || 0) + 1;
      });
    });

    // Count by tax year
    const payersByTaxYear: Record<number, number> = {};
    allPayers.forEach(p => {
      (p.taxYears || []).forEach(year => {
        payersByTaxYear[year] = (payersByTaxYear[year] || 0) + 1;
      });
    });

    // Recently added (last 5)
    const recentlyAdded = [...allPayers]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    // Recently updated (last 5, excluding those just created)
    const recentlyUpdated = [...allPayers]
      .filter(p => p.updatedAt > p.createdAt)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    return {
      totalPayers: allPayers.length,
      payersByState,
      payersByDocumentType,
      payersByTaxYear,
      recentlyAdded,
      recentlyUpdated,
    };
  },

  /**
   * Auto-extract and store payer from W-2/1099 document data
   * Upserts the payer (updates if EIN exists, creates if new)
   */
  extractAndStorePayer(extractedData: ExtractedPayerData): SavedPayer | null {
    // Validate we have minimum required data
    if (!extractedData.ein || !extractedData.name) {
      console.warn('Cannot store payer: missing EIN or name');
      return null;
    }

    const validation = this.validateEINFormat(extractedData.ein);
    if (!validation.isValid) {
      console.warn('Cannot store payer: invalid EIN', validation.errors);
      return null;
    }

    const payerData: Omit<SavedPayer, 'id' | 'createdAt' | 'updatedAt'> = {
      name: extractedData.name,
      dba: extractedData.dba || '',
      ein: extractedData.ein,
      address: extractedData.address || '',
      city: extractedData.city || '',
      state: extractedData.state || '',
      zip: extractedData.zip || '',
      phone: extractedData.phone || '',
      documentTypes: extractedData.documentType ? [extractedData.documentType] : [],
      taxYears: extractedData.taxYear ? [extractedData.taxYear] : [],
    };

    return this.upsertPayer(payerData);
  },

  /**
   * Get stored payer info for auto-filling forms
   * Returns payer data formatted for form fields
   */
  lookupPayerForAutoFill(ein: string): ExtractedPayerData | null {
    const payer = this.getPayerByEIN(ein);
    if (!payer) return null;

    return {
      name: payer.name,
      dba: payer.dba,
      ein: payer.ein,
      address: payer.address,
      city: payer.city,
      state: payer.state,
      zip: payer.zip,
      phone: payer.phone,
      documentType: payer.documentTypes?.[0],
      taxYear: payer.taxYears?.[0],
    };
  },

  /**
   * Format EIN helper (exposed for external use)
   */
  formatEIN,

  /**
   * Normalize EIN helper (exposed for external use)
   */
  normalizeEIN,
};

export default payerStore;
