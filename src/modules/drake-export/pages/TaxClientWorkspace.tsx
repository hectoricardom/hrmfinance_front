/**
 * Tax Client Workspace Page
 * Main unified workspace for managing a single tax client
 * Includes: Documents, Tasks, AI Analysis, and Tax Prep sections
 */

import { Component, createSignal, createMemo, onMount, Show, For, createEffect } from 'solid-js';
import { useParams, useNavigate, useSearchParams } from '@solidjs/router';
import { Card, Button } from '../../ui';
import { getTaxPortalById, getDocumentRequestsByPortal, createDocumentRequest, getDocumentRequestByToken, createClientPortalRequest, getClientPortalRequestById } from '../services/taxPortalApi';
import { sendWAmsg } from '../../passport/services/pdfSignatureIntegration';
import { getClientTaxDocuments } from '../services/taxDocumentApi';
import type { TaxPortal, DrakeTaxDocument, TaxDocumentRequest, TaxYear } from '../types/drakeTypes';
import { DEFAULT_REQUESTED_DOCUMENTS } from '../types/drakeTypes';

// Import section components (to be created)
import DocumentsSection from '../components/workspace/DocumentsSection';
import TasksSection from '../components/workspace/TasksSection';
import AIAnalysisSection from '../components/workspace/AIAnalysisSection';
import TaxPrepSection from '../components/workspace/TaxPrepSection';
import ClientInfoSection from '../components/workspace/ClientInfoSection';
import StatusSection from '../components/workspace/StatusSection';
import StrategySection from '../components/workspace/StrategySection';
import MessagingSection from '../components/workspace/MessagingSection';
import DrakeQRCodePrintView from '../components/DrakeQRCodePrintView';
import { updateTaxPortal } from '../services/taxPortalApi';
import { devLog } from '../../../services/utils';
import { openClientQRCodesDocument } from '../services/clientQRCodesPdf';
import { generateForm1099NecPDF, generateForm1099NecCSV } from '../utils/form1099NecPdfGenerator';
import type { Form1099NecEntry } from '../utils/form1099NecPdfGenerator';
import { payerStore, type SavedPayer } from '../stores/payerStore';
import * as payerApi from '../services/payerApi';

// New imports for integrated components
import {
  getPreviousYearData,
  getChangesFromLastYear,
  detectReturningClient,
  type PreviousYearData,
  type ExpectedDocument,
  type YearOverYearChange,
} from '../services/recurringClientService';
import {
  calculateFeeEstimate,
  createDefaultFeeSchedule,
} from '../../tax-payments/services/feeCalculationService';
import type { FeeEstimate } from '../../tax-payments/types/paymentTypes';
import QuickMessageModal from '../../communications/components/QuickMessageModal';
// communicationStore not used — queries not available on server
import { createAutoTriggerHelper } from '../../communications/hooks/useAutoTriggers';

// Section types
type WorkspaceSection = 'info' | 'docs' | 'tasks' | 'ai' | 'tax' | 'status' | 'strategy' | 'messaging' | null;

// Section card configuration
interface SectionCardConfig {
  id: WorkspaceSection;
  title: string;
  icon: string;
  color: string;
  getLabel: () => string;
}

const TaxClientWorkspace: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-trigger helper for document_received events
  const triggerHelper = createAutoTriggerHelper();

  // State
  const [client, setClient] = createSignal<TaxPortal | null>(null);
  const [documents, setDocuments] = createSignal<DrakeTaxDocument[]>([]);
  const [documentRequests, setDocumentRequests] = createSignal<TaxDocumentRequest[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [activeSection, setActiveSection] = createSignal<WorkspaceSection>(null);
  const [pendingTasks, setPendingTasks] = createSignal(0);
  const [isSaving, setIsSaving] = createSignal(false);
  const [pendingClientUpdates, setPendingClientUpdates] = createSignal<Partial<TaxPortal>>({});
  const [showPrintView, setShowPrintView] = createSignal(false);
  const [showLabelPrint, setShowLabelPrint] = createSignal(false);
  const [show1099Modal, setShow1099Modal] = createSignal(false);
  const [selected1099Docs, setSelected1099Docs] = createSignal<Set<string>>(new Set());

  // Saved payer management state
  const [showAddPayerForm, setShowAddPayerForm] = createSignal(false);
  const [editingPayerId, setEditingPayerId] = createSignal<string | null>(null);
  const [payerSearchTerm, setPayerSearchTerm] = createSignal('');
  const [selectedSavedPayers, setSelectedSavedPayers] = createSignal<Set<string>>(new Set());
  const [savedPayerAmounts, setSavedPayerAmounts] = createSignal<Record<string, number>>({});

  // Document amounts - user enters the amount manually for each document
  const [documentAmounts, setDocumentAmounts] = createSignal<Record<string, number>>({});

  // Recurring client & payment integration state
  const [previousYearData, setPreviousYearData] = createSignal<PreviousYearData | null>(null);
  const [yearOverYearChanges, setYearOverYearChanges] = createSignal<YearOverYearChange[]>([]);
  const [expectedDocs, setExpectedDocs] = createSignal<ExpectedDocument[]>([]);
  const [isReturningClient, setIsReturningClient] = createSignal(false);
  const [feeEstimate, setFeeEstimate] = createSignal<FeeEstimate | null>(null);
  const [showQuickMessage, setShowQuickMessage] = createSignal(false);

  // Payer list state (loaded from API once)
  const [apiPayers, setApiPayers] = createSignal<SavedPayer[]>([]);
  const [isSearchingPayers, setIsSearchingPayers] = createSignal(false);

  // Payer form fields
  const [payerName, setPayerName] = createSignal('');
  const [payerEin, setPayerEin] = createSignal('');
  const [payerAddress, setPayerAddress] = createSignal('');
  const [payerCity, setPayerCity] = createSignal('');
  const [payerState, setPayerState] = createSignal('');
  const [payerZip, setPayerZip] = createSignal('');
  const [payerPhone, setPayerPhone] = createSignal('');

  // Load initial payers when modal opens
  const loadPayers = async (searchQuery: string = '') => {
    setIsSearchingPayers(true);
    try {
      const result = searchQuery.trim()
        ? await payerApi.searchPayers(searchQuery.trim())
        : await payerApi.getAllPayers();
      setApiPayers(result.payers);
    } catch (err) {
      devLog('Error loading payers:', err);
      setApiPayers([]);
    } finally {
      setIsSearchingPayers(false);
    }
  };

  // Parse address string into street, city, state, zip
  const parsePayerAddress = (fullAddress: string, existingCity?: string, existingState?: string, existingZip?: string) => {
    let street = existingCity ? fullAddress : fullAddress;
    let city = existingCity || '';
    let state = existingState || '';
    let zip = existingZip || '';

    if (!city || !state) {
      // Try to parse "street, city, ST zip" or "street, city, ST"
      const parts = fullAddress.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const stateZipMatch = lastPart.match(/^([A-Z]{2})\s*(\d{5})?$/);
        if (stateZipMatch) {
          street = parts.slice(0, -2).concat(parts[parts.length - 2] ? [] : []).join(', ') || parts[0];
          if (parts.length >= 3) {
            street = parts.slice(0, -2).join(', ');
            city = city || parts[parts.length - 2];
          } else {
            street = parts[0];
          }
          state = state || stateZipMatch[1];
          zip = zip || stateZipMatch[2] || '';
        } else {
          // Try "street, city state zip" in last part
          const cityStateZip = lastPart.match(/^(.+?)\s+([A-Z]{2})\s*(\d{5})?$/);
          if (cityStateZip) {
            street = parts.slice(0, -1).join(', ');
            city = city || cityStateZip[1];
            state = state || cityStateZip[2];
            zip = zip || cityStateZip[3] || '';
          }
        }
      }
    }

    return { street: street.trim(), city: city.trim(), state: state.trim(), zip: zip.trim() };
  };

  // Sync payers from documents to database (compare by EIN)
  const syncPayersFromDocuments = async (docs: DrakeTaxDocument[]) => {
    // Get documents with valid EIN in payerInfo
    const docsWithEin = docs.filter(d => {
      const ein = d.payerInfo?.ein;
      if (!ein) return false;
      // Normalize EIN - remove non-digits
      const digits = ein.replace(/\D/g, '');
      return digits.length === 9;
    });

    if (docsWithEin.length === 0) return;

    devLog(`[Payer Sync] Found ${docsWithEin.length} documents with valid EIN`);

    // Track which EINs we've already processed to avoid duplicates
    const processedEins = new Set<string>();
    let addedCount = 0;

    for (const doc of docsWithEin) {
      const ein = doc.payerInfo?.ein;
      if (!ein) continue;

      // Normalize EIN (remove dashes and non-digits)
      const normalizedEin = ein.replace(/\D/g, '');

      // Skip if we've already processed this EIN
      if (processedEins.has(normalizedEin)) continue;
      processedEins.add(normalizedEin);

      try {
        // Check if payer exists in database by EIN
        const existingPayer = await payerApi.getPayerByEIN(normalizedEin);

        // Parse address to extract city/state/zip if missing
        const parsed = parsePayerAddress(
          doc.payerInfo?.address || '',
          doc.payerInfo?.city,
          doc.payerInfo?.state,
          doc.payerInfo?.zip
        );

        if (!existingPayer) {
          // Payer doesn't exist, create it from document data
          const payerName = doc.payerInfo?.name || 'Unknown Payer';
          devLog(`[Payer Sync] Adding new payer: ${payerName} (EIN: ${normalizedEin})`, parsed);

          await payerApi.createPayer({
            name: payerName,
            ein: normalizedEin,
            address: parsed.street,
            city: parsed.city,
            state: parsed.state,
            zip: parsed.zip,
            phone: doc.payerInfo?.phone || '',
            documentTypes: [doc.drakeFormType === '1099_nec' ? '1099-NEC' :
                          doc.drakeFormType === 'w2' ? 'W-2' :
                          doc.drakeFormType === '1099_misc' ? '1099-MISC' : 'other'],
            taxYears: doc.taxYear ? [doc.taxYear] : [taxYear()],
          });
          addedCount++;
        } else {
          // Update existing payer with missing fields from document
          const updates: Record<string, any> = {};
          if (!existingPayer.city && parsed.city) updates.city = parsed.city;
          if (!existingPayer.state && parsed.state) updates.state = parsed.state;
          if (!existingPayer.zip && parsed.zip) updates.zip = parsed.zip;
          if (!existingPayer.address && parsed.street) updates.address = parsed.street;
          if (!existingPayer.phone && doc.payerInfo?.phone) updates.phone = doc.payerInfo.phone;
          if (!existingPayer.name && doc.payerInfo?.name) updates.name = doc.payerInfo.name;

          if (Object.keys(updates).length > 0) {
            devLog(`[Payer Sync] Updating payer: ${existingPayer.name} (EIN: ${normalizedEin}) with:`, updates);
            await payerApi.updatePayer(existingPayer.id, updates);
            addedCount++;
          } else {
            devLog(`[Payer Sync] Payer already complete: ${existingPayer.name} (EIN: ${normalizedEin})`);
          }
        }
      } catch (err) {
        devLog(`[Payer Sync] Error checking/adding payer with EIN ${normalizedEin}:`, err);
      }
    }

    if (addedCount > 0) {
      devLog(`[Payer Sync] Added ${addedCount} new payers from documents`);
      // Reload payers to show newly added ones
      await loadPayers(payerSearchTerm());
    }
  };

  // Track if initial load has been done for the modal
  const [modalInitialized, setModalInitialized] = createSignal(false);

  // Load payers when modal opens (only once)
  createEffect(() => {
    const modalOpen = show1099Modal();
    if (modalOpen && !modalInitialized()) {
      setModalInitialized(true);
      loadPayers('');
      // Sync payers from documents to database
      const allDocs = documents();
      if (allDocs.length > 0) {
        syncPayersFromDocuments(allDocs);
      }
    } else if (!modalOpen) {
      setModalInitialized(false);
    }
  });

  // Search by EIN via API when local search has no results
  const searchPayerByEin = async (einQuery: string) => {
    const normalizedEin = einQuery.replace(/\D/g, '');
    if (normalizedEin.length < 5) return; // Need at least 5 digits to search

    // Check if already in the list
    const existing = apiPayers().find(p => p.ein.replace(/\D/g, '').includes(normalizedEin));
    if (existing) return;

    // Try to find by EIN via API
    setIsSearchingPayers(true);
    try {
      const payer = await payerApi.getPayerByEIN(normalizedEin);
      if (payer) {
        // Add to apiPayers if not already there
        setApiPayers(prev => {
          const exists = prev.some(p => p.id === payer.id);
          if (exists) return prev;
          return [...prev, payer];
        });
      }
    } catch (err) {
      devLog('Error searching payer by EIN:', err);
    } finally {
      setIsSearchingPayers(false);
    }
  };

  // Effect to search by EIN when typing digits
  createEffect(() => {
    const term = payerSearchTerm().trim();
    if (!modalInitialized()) return;

    // If search term has digits, try to find by EIN
    const digits = term.replace(/\D/g, '');
    if (digits.length >= 5) {
      searchPayerByEin(term);
    }
  });

  // Filtered saved payers - client-side filtering
  const filteredSavedPayers = createMemo(() => {
    const payers = apiPayers();
    const term = payerSearchTerm().trim().toLowerCase();

    // If no search term, return all payers
    if (!term) return payers;

    // Client-side filter by name, DBA, or EIN
    return payers.filter(payer => {
      const nameMatch = payer.name.toLowerCase().includes(term);
      const dbaMatch = payer.dba?.toLowerCase().includes(term) || false;
      const einMatch = payer.ein.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
      return nameMatch || dbaMatch || einMatch;
    });
  });

  // Reset payer form fields
  const resetPayerForm = () => {
    setPayerName('');
    setPayerEin('');
    setPayerAddress('');
    setPayerCity('');
    setPayerState('');
    setPayerZip('');
    setPayerPhone('');
    setEditingPayerId(null);
  };

  // Handle save/update payer (async API call)
  const handleSavePayer = async () => {
    const editId = editingPayerId();
    try {
      if (editId) {
        await payerApi.updatePayer(editId, {
          name: payerName(),
          ein: payerEin(),
          address: payerAddress(),
          city: payerCity(),
          state: payerState(),
          zip: payerZip(),
          phone: payerPhone(),
        });
      } else {
        await payerApi.createPayer({
          name: payerName(),
          ein: payerEin(),
          address: payerAddress(),
          city: payerCity(),
          state: payerState(),
          zip: payerZip(),
          phone: payerPhone(),
          documentTypes: ['1099-NEC'],
          taxYears: [taxYear()],
        });
      }
      // Reload payers after save
      await loadPayers(payerSearchTerm());
    } catch (err) {
      devLog('Error saving payer:', err);
    }
    resetPayerForm();
    setShowAddPayerForm(false);
  };

  // Handle edit payer - populate form
  const handleEditPayer = (payer: SavedPayer) => {
    setPayerName(payer.name);
    setPayerEin(payer.ein);
    setPayerAddress(payer.address);
    setPayerCity(payer.city);
    setPayerState(payer.state);
    setPayerZip(payer.zip);
    setPayerPhone(payer.phone);
    setEditingPayerId(payer.id);
    setShowAddPayerForm(true);
  };

  // Build 1099-NEC entries from selected documents and payers
  const build1099Entries = (): Form1099NecEntry[] => {
    const c = client();
    if (!c) return [];

    const entries: Form1099NecEntry[] = [];
    const recipientStreetAddress = c.address || '';
    const recipientName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
    const recipientSSN = c.ssn || '';
    const year = c.taxYear || taxYear();

    // Add entries from selected documents (only those with amounts > 0)
    const selectedDocs = nec1099Documents().filter(d => selected1099Docs().has(d.id));
    const docAmounts = documentAmounts();
    for (const doc of selectedDocs) {
      const manualAmount = docAmounts[doc.id] || 0;
      if (manualAmount > 0) {
        entries.push({
          payerInfo: {
            name: doc.payerInfo?.name,
            ein: doc.payerInfo?.ein,
            address: doc.payerInfo?.address,
            city: doc.payerInfo?.city,
            state: doc.payerInfo?.state,
            zip: doc.payerInfo?.zip,
            phone: doc.payerInfo?.phone
          },
          recipientName,
          recipientSSN,
          recipientAddress: recipientStreetAddress,
          recipientCity: c.city || '',
          recipientState: c.state || '',
          recipientZip: c.zipCode || '',
          nonEmployeeCompensation: manualAmount,
          federalTaxWithheld: doc.extractedAmounts?.federalTaxWithheld1099,
          stateTaxWithheld: doc.extractedAmounts?.stateTaxWithheld,
          stateIncome: doc.extractedAmounts?.stateWages,
          taxYear: year,
          accountNumber: undefined
        });
      }
    }

    // Add entries from selected saved payers (only those with amounts > 0)
    const selectedPayerIds = Array.from(selectedSavedPayers());
    const currentPayers = apiPayers();
    for (const payerId of selectedPayerIds) {
      const amount = savedPayerAmounts()[payerId] || 0;
      if (amount > 0) {
        const payer = currentPayers.find(p => p.id === payerId);
        if (payer) {
          entries.push({
            payerInfo: {
              name: payer.name,
              ein: payer.ein,
              address: payer.address,
              city: payer.city,
              state: payer.state,
              zip: payer.zip,
              phone: payer.phone
            },
            recipientName,
            recipientSSN,
            recipientAddress: recipientStreetAddress,
            recipientCity: c.city || '',
            recipientState: c.state || '',
            recipientZip: c.zipCode || '',
            nonEmployeeCompensation: amount,
            federalTaxWithheld: undefined,
            stateTaxWithheld: undefined,
            stateIncome: undefined,
            taxYear: year,
            accountNumber: undefined
          });
        }
      }
    }

    return entries;
  };

  // Handle delete payer (async API call)
  const handleDeletePayer = async (id: string) => {
    try {
      await payerApi.deletePayer(id);
      // Reload payers after delete
      await loadPayers(payerSearchTerm());
    } catch (err) {
      devLog('Error deleting payer:', err);
    }
    // Remove from selection if selected
    setSelectedSavedPayers(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Remove amount
    setSavedPayerAmounts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Toggle saved payer selection
  const toggleSavedPayerSelection = (id: string) => {
    setSelectedSavedPayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Update saved payer amount
  const updateSavedPayerAmount = (id: string, amount: number) => {
    setSavedPayerAmounts(prev => ({ ...prev, [id]: amount }));
  };

  // Ready saved payers count (selected with amounts > 0)
  const readyPayersCount = createMemo(() => {
    return Array.from(selectedSavedPayers()).filter(id =>
      (savedPayerAmounts()[id] || 0) > 0
    ).length;
  });

  // Pending payers (selected but no amount)
  const pendingPayersCount = createMemo(() => {
    return Array.from(selectedSavedPayers()).filter(id =>
      (savedPayerAmounts()[id] || 0) <= 0
    ).length;
  });

  // Update document amount
  const updateDocumentAmount = (docId: string, amount: number) => {
    setDocumentAmounts(prev => ({ ...prev, [docId]: amount }));
  };

  // Ready documents count (selected with amounts > 0)
  const readyDocumentsCount = createMemo(() => {
    return Array.from(selected1099Docs()).filter(id =>
      (documentAmounts()[id] || 0) > 0
    ).length;
  });

  // Pending documents (selected but no amount)
  const pendingDocumentsCount = createMemo(() => {
    return Array.from(selected1099Docs()).filter(id =>
      (documentAmounts()[id] || 0) <= 0
    ).length;
  });

  // Total amount from selected documents (using manually entered amounts)
  const totalDocumentsAmount = createMemo(() => {
    return Array.from(selected1099Docs()).reduce((sum, docId) => {
      const amount = documentAmounts()[docId] || 0;
      return sum + (amount > 0 ? amount : 0);
    }, 0);
  });

  // Total amount from saved payers
  const totalSavedPayersAmount = createMemo(() => {
    return Array.from(selectedSavedPayers()).reduce((sum, id) => {
      const amount = savedPayerAmounts()[id] || 0;
      return sum + (amount > 0 ? amount : 0);
    }, 0);
  });

  // Total ready count (documents with amounts + saved payers with amounts)
  const totalSelectedCount = createMemo(() => {
    return readyDocumentsCount() + readyPayersCount();
  });

  // Grand total amount for 1099 generation
  const totalAmount1099 = createMemo(() => {
    return totalDocumentsAmount() + totalSavedPayersAmount();
  });

  // Linked spouse data
  const [linkedSpouse, setLinkedSpouse] = createSignal<TaxPortal | null>(null);
  const [spouseDocuments, setSpouseDocuments] = createSignal<DrakeTaxDocument[]>([]);

  // Combined data (taxpayer + linked spouse)
  const allDocuments = createMemo(() => {
    const taxpayerDocs = documents().map(d => ({ ...d, _owner: 'taxpayer' as const }));
    const spouseDocs = spouseDocuments().map(d => ({ ...d, _owner: 'spouse' as const }));
    return [...taxpayerDocs, ...spouseDocs];
  });

  const allDependents = createMemo(() => {
    const taxpayerDeps = client()?.dependents || [];
    const spouseDeps = linkedSpouse()?.dependents || [];
    // Combine and remove duplicates by SSN if present
    const combined = [...taxpayerDeps];
    for (const dep of spouseDeps) {
      const exists = combined.some(d => d.ssn && dep.ssn && d.ssn === dep.ssn);
      if (!exists) {
        combined.push(dep);
      }
    }
    return combined;
  });

  // 1099-NEC documents from all documents
  const nec1099Documents = createMemo(() =>
    allDocuments().filter(d => d.drakeFormType === '1099_nec')
  );

  // Current tax year
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = createSignal(currentYear);

  // Load client data
  const loadClientData = async (clientId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      devLog('Loading client data for ID:', clientId);
      const [clientData, docsData, requestsData] = await Promise.all([
        getTaxPortalById(clientId),
        getClientTaxDocuments(clientId),
        getDocumentRequestsByPortal(clientId)
      ]);

      //devLog('Client data received:', clientData);
      //devLog('Docs data received:', docsData);

      if (!clientData) {
        setError('Client not found');
        setIsLoading(false);
        return;
      }


      devLog(docsData)
      setClient(clientData);
      setDocuments(docsData || []);
      setDocumentRequests(requestsData || []);

      // Use client's tax year if set, otherwise use current year
      if (clientData.taxYear) {
        setTaxYear(clientData.taxYear);
        devLog('Using client tax year:', clientData.taxYear);
      }

      // Load linked spouse data if exists
      if (clientData.linkedSpouseId) {
        devLog('Loading linked spouse data:', clientData.linkedSpouseId);
        try {
          const [spouseData, spouseDocsData] = await Promise.all([
            getTaxPortalById(clientData.linkedSpouseId),
            getClientTaxDocuments(clientData.linkedSpouseId)
          ]);
          if (spouseData) {
            setLinkedSpouse(spouseData);
            setSpouseDocuments(spouseDocsData || []);
            devLog('Linked spouse loaded:', spouseData.firstName, spouseData.lastName);
            devLog('Spouse documents:', spouseDocsData?.length || 0);
          }
        } catch (spouseErr) {
          devLog('Error loading linked spouse:', spouseErr);
        }
      } else {
        setLinkedSpouse(null);
        setSpouseDocuments([]);
      }

      // Calculate pending tasks (documents needing verification) - include spouse docs
      const allDocs = [...(docsData || [])];
      const pending = allDocs.filter(d => !d.verified && d.uploadStatus !== 'error').length;
      setPendingTasks(pending);

      // Non-blocking: load recurring client data and fee estimate
      Promise.allSettled([
        // Recurring client data
        (async () => {
          try {
            const result = await detectReturningClient(clientData);
            setIsReturningClient(result.isReturning);
            if (result.isReturning && result.previousYearData) {
              setPreviousYearData(result.previousYearData);
              const changes = getChangesFromLastYear(clientData, result.previousYearData);
              setYearOverYearChanges(changes);
            }
            // getExpectedDocuments query not available on server — skipped
          } catch (err) {
            devLog('Non-critical: Failed to load recurring client data:', err);
          }
        })(),
        // Fee estimate
        (async () => {
          try {
            const feeSchedule = createDefaultFeeSchedule(clientData.taxYear);
            const estimate = calculateFeeEstimate(clientData, docsData || [], feeSchedule, false);
            setFeeEstimate(estimate);
          } catch (err) {
            devLog('Non-critical: Failed to calculate fee estimate:', err);
          }
        })(),
      ]);
    } catch (err) {
      devLog('Error loading client data:', err);
      setError('Failed to load client data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount
  onMount(() => {
    const clientId = params.id;
    if (!clientId) {
      setError('No client ID provided');
      setIsLoading(false);
      return;
    }
    loadClientData(clientId);

    // communicationStore settings/templates queries not available on server — skipped
  });

  // Handle URL search params to auto-open sections/actions
  createEffect(() => {
    const c = client();
    if (!c || isLoading()) return;

    const section = searchParams.section as WorkspaceSection | undefined;
    const scan = searchParams.scan;
    const action = searchParams.action;

    if (section && ['info', 'docs', 'tasks', 'ai', 'tax', 'status', 'strategy'].includes(section)) {
      setActiveSection(section);
    }

    if (action === 'message') {
      setShowQuickMessage(true);
    }
  });

  // Handle section toggle
  const handleSectionClick = (section: WorkspaceSection) => {
    if (activeSection() === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/tax-clients');
  };

  // Send client-portal link via WhatsApp (server-side API)
  const [isSendingPortalLink, setIsSendingPortalLink] = createSignal(false);
  const [portalLinkResult, setPortalLinkResult] = createSignal<'success' | 'error' | null>(null);
  const handleSendPortalWhatsApp = async () => {
    const currentClient = client();
    if (!currentClient) return;
    if (!currentClient.phone) {
      setPortalLinkResult('error');
      setTimeout(() => setPortalLinkResult(null), 3000);
      return;
    }

    setIsSendingPortalLink(true);
    setPortalLinkResult(null);
    try {
      const clientName = `${currentClient.firstName || ''} ${currentClient.lastName || ''}`.trim();
      const year = currentClient.taxYear || taxYear();


      // Create client portal request using the new Client Portal API
      const portalData = await createClientPortalRequest({
        title: `Portal Pre-Cita - ${clientName}`,
        description: `Complete your pre-appointment portal for tax year ${year}`,
        recipientName: clientName,
        recipientEmail: currentClient.email || undefined,
        recipientPhone: currentClient.phone || undefined,
        recipientId: currentClient.id, // Link portal to tax client
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        tags: ['pre-cita', `tax-${year}`],
        customFields: {
          taxPortalId: currentClient.id,
          taxYear: year,
          source: 'whatsapp',
        },
        steps: [
          {
            type: 'upload_documents',
            title: 'Sube tus documentos',
            description: 'Sube todos los documentos de trabajo, banco, gobierno, etc.',
            required: true,
            acceptedFileTypes: ['image/*', 'application/pdf'],
            maxFiles: 20,
          },
          {
            type: 'sign_document',
            title: 'Firmar autorizacion',
            required: true,
          },
          {
            type: 'enter_pin',
            title: 'Crear PIN de firma electronica',
            description: 'Elija 5 numeros para autorizar el envio electronico de su declaracion al IRS',
            required: true,
          },
          {
            type: 'verify_info',
            title: 'Verificar informacion personal',
            required: true,
            fields: [
              { key: 'ssn', label: 'Numero de Seguro Social', type: 'text', required: true },
              { key: 'filingStatus', label: 'Estado civil', type: 'select', options: ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household'], required: true },
              { key: 'phone', label: 'Telefono', type: 'phone', required: false },
              { key: 'address', label: 'Direccion', type: 'text', required: false },
              { key: 'city', label: 'Ciudad', type: 'text', required: false },
              { key: 'state', label: 'Estado', type: 'text', required: false },
              { key: 'zipCode', label: 'Codigo postal', type: 'text', required: false },
            ],
          },
        ],
      });

      devLog('[Portal WhatsApp] Portal created:', portalData);

      // Server returns portalUrl directly — validate it
      const portalUrl = portalData.portalUrl;
      if (!portalUrl) {
        devLog('[Portal WhatsApp] No portalUrl returned from server');
        setPortalLinkResult('error');
        setTimeout(() => setPortalLinkResult(null), 4000);
        return;
      }

      // Validate the record was saved
      const validated = await getClientPortalRequestById(portalData.id);
      if (!validated) {
        devLog('[Portal WhatsApp] Record validation FAILED - not saved');
        setPortalLinkResult('error');
        setTimeout(() => setPortalLinkResult(null), 4000);
        return;
      }
      devLog('[Portal WhatsApp] Record validated OK:', validated.id);

      // Build message body
      const messageBody = `📋 *Portal Pre-Cita*\n\nHola ${currentClient.firstName || ''}!\n\nPor favor complete su portal para sus impuestos del ${year} antes de su cita:\n\n✍️ Firmar autorizacion\n📄 Subir documentos\n🔢 Crear PIN electronico\n✅ Verificar informacion\n\n👉 ${portalUrl}\n\n¡Gracias!`;

      // Send via server-side WhatsApp API (same pattern as appointment reminders)
      let phone = currentClient.phone?.replace(/\D/g, '') || '';
      // Add US country code if 10 digits (no country code)
      if (phone.length === 10) phone = '1' + phone;
      const result = await sendWAmsg(phone, messageBody);

      if (result && result !== 'phoneNumber required' && result !== 'message is required') {
        setPortalLinkResult('success');
      } else {
        setPortalLinkResult('error');
      }
      setTimeout(() => setPortalLinkResult(null), 4000);
    } catch (err) {
      devLog('Error sending portal link:', err);
      setPortalLinkResult('error');
      setTimeout(() => setPortalLinkResult(null), 4000);
    } finally {
      setIsSendingPortalLink(false);
    }
  };

  // Handle client info updates (local state)
  const handleClientChange = (updates: Partial<TaxPortal>) => {
    // Update local client state immediately for UI responsiveness
    setClient(prev => prev ? { ...prev, ...updates } : null);
    // Track pending changes for save
    setPendingClientUpdates(prev => ({ ...prev, ...updates }));

    // If spouse is being unlinked, clear spouse data
    if ('linkedSpouseId' in updates && (updates.linkedSpouseId === undefined || updates.linkedSpouseId === null)) {
      setLinkedSpouse(null);
      setSpouseDocuments([]);
      devLog('Spouse unlinked - cleared spouse data and documents');
    }
  };

  // Handle saving client info to server
  const handleSaveClient = async () => {
    const currentClient = client();
    if (!currentClient) return;

    setIsSaving(true);
    try {
      await updateTaxPortal(currentClient.id, pendingClientUpdates());
      setPendingClientUpdates({});
    } finally {
      setIsSaving(false);
    }
  };

  // One-click complete: mark as completed, paid in full, assign business
  const [isCompleting, setIsCompleting] = createSignal(false);
  const handleCompleteClient = async () => {
    const currentClient = client();
    if (!currentClient) return;

    setIsCompleting(true);
    try {
      const updates: Partial<TaxPortal> = {
        workflowStatus: 'completed',
        workflowStatusDate: Date.now(),
        paymentStatus: 'paid',
        paymentDate: Date.now(),
        businessId: 'LMR470531564CT28',
      };

      await updateTaxPortal(currentClient.id, updates);
      setClient(prev => prev ? { ...prev, ...updates } : null);
      setPendingClientUpdates({});
      handleBack();
    } finally {
      setIsCompleting(false);
    }
  };

  const isClientCompleted = () => {
    const c = client();
    return c?.workflowStatus === 'completed' && c?.paymentStatus === 'paid' && c?.businessId === 'LMR470531564CT28';
  };

  // Get status label for the status card
  const getStatusLabel = () => {
    const c = client();
    if (!c) return 'Track Progress';
    const workflow = c.workflowStatus || 'intake';
    const payment = c.paymentStatus || 'pending';
    if (payment === 'paid') return 'Paid';
    if (payment === 'partial') return 'Partial Pay';
    return workflow.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Section card configurations
  const sectionCards: SectionCardConfig[] = [
    {
      id: 'info',
      title: 'INFO',
      icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z',
      color: '#ec4899',
      getLabel: () => 'Client Details'
    },
    {
      id: 'status',
      title: 'STATUS',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: '#22c55e',
      getLabel: getStatusLabel
    },
    {
      id: 'docs',
      title: 'DOCS',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      color: '#3b82f6',
      getLabel: () => `${documents().length} files`
    },
    {
      id: 'tasks',
      title: 'TASKS',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      color: '#f59e0b',
      getLabel: () => `${pendingTasks()} pending`
    },
   
    {
      id: 'tax',
      title: 'TAX',
      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',

      color: '#8b5cf6',
      getLabel: () => 'Prepare'
    },
    {
      id: 'strategy',
      title: 'STRATEGY',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      color: '#06b6d4',
      getLabel: () => 'Checklist'
    },
    {
      id: 'messaging',
      title: 'MSG',
      icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
      color: '#0ea5e9',
      getLabel: () => 'Message'
    }
  ];

  /**
   
 {
      id: 'ai',
      title: 'AI',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      color: '#8b5cf6',
      color: '#22c55e',
       color: '#10b981',
      getLabel: () => 'Analyze'
    },

   */
  // Styles
  const containerStyle = {
    padding: '1.5rem',
    'max-width': '1400px',
    margin: '0 auto',
    'min-height': '100vh'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const backButtonStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    color: 'var(--text-primary)',
    transition: 'all 0.2s'
  };

  const clientInfoStyle = {
    flex: 1
  };

  const clientNameStyle = {
    'font-size': '1.75rem',
    'font-weight': '700',
    margin: 0,
    color: 'var(--text-primary)'
  };

  const taxYearBadgeStyle = {
    display: 'inline-block',
    background: 'var(--primary-color)',
    color: 'white',
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.875rem',
    'font-weight': '600',
    'margin-left': '0.75rem'
  };

  const clientMetaStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.875rem',
    'margin-top': '0.25rem'
  };

  const sectionCardsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(7, 1fr)',
    gap: '1.25rem',
    'margin-bottom': '2rem'
  };

  const getSectionCardStyle = (section: SectionCardConfig, isActive: boolean) => ({
    background: isActive ? section.color : 'var(--surface-color)',
    border: `2px solid ${isActive ? section.color : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius-lg)',
    padding: '2rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    'text-align': 'center' as const,
    transform: isActive ? 'translateY(-4px)' : 'none',
    'box-shadow': isActive
      ? `0 8px 25px ${section.color}40`
      : '0 2px 8px rgba(0,0,0,0.05)'
  });

  const iconContainerStyle = (color: string, isActive: boolean) => ({
    width: '64px',
    height: '64px',
    'border-radius': '50%',
    background: isActive ? 'rgba(255,255,255,0.2)' : `${color}15`,
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    margin: '0 auto 1rem auto'
  });

  const sectionTitleStyle = (isActive: boolean) => ({
    'font-size': '1.25rem',
    'font-weight': '700',
    margin: '0 0 0.5rem 0',
    color: isActive ? 'white' : 'var(--text-primary)'
  });

  const sectionLabelStyle = (isActive: boolean) => ({
    'font-size': '0.875rem',
    color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
  });

  const expandedSectionStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-lg)',
    padding: '1.5rem',
    'margin-top': '0.5rem',
    animation: 'slideDown 0.2s ease-out'
  };

  const loadingStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '400px',
    'font-size': '1.25rem',
    color: 'var(--text-muted)'
  };

  const errorStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '400px',
    gap: '1rem'
  };

  

  return (

    <Show when={!error()} 
      fallback={<div style={containerStyle}>
        <div style={errorStyle}>
          <div style={{ 'font-size': '1.25rem', color: 'var(--error-color)' }}>
            {error()}
          </div>
          <Button onClick={handleBack}>
            Back to Tax Portal
          </Button>
        </div>
      </div>}
    >

    <Show when={!isLoading()} 
      fallback={<div style={containerStyle}>
        <div style={loadingStyle}>
          Loading client workspace...
        </div>
      </div>}
    >

    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onClick={handleBack}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--hover-color)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--surface-color)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div style={clientInfoStyle}>
          <h1 style={clientNameStyle}>
            {client()?.firstName} {client()?.lastName}
            <button style={taxYearBadgeStyle}>
              <span  onClick={() => setShowLabelPrint(true)} >Tax Year {taxYear()}</span>
            </button>
          </h1>
          <div style={clientMetaStyle}>
            {client()?.email && <span>{client()?.email}</span>}
            {client()?.email && client()?.phone && <span> | </span>}
            {client()?.phone && <span>{client()?.phone}</span>}
          </div>
          <div style={clientMetaStyle}>
            {client()?.ssn ? `SSN: ***-**-${client()?.ssn?.slice(-4)}` : ''}
            {client()?.ssn && client()?.dateOfBirth ? ' • ' : ''}
            {client()?.dateOfBirth ? `DOB: ${client()?.dateOfBirth}` : ''}
          </div>
        </div>

        </div>
        <div style={headerStyle}>

       

        {/* Print QR Codes Button */}
        <button
          style={{
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            'border-radius': 'var(--border-radius-md)',
            padding: '0.75rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem',
            'font-weight': '600',
            'font-size': '0.875rem',
            transition: 'all 0.2s'
          }}
          onClick={() => {
            const c = client();
            if (c) openClientQRCodesDocument(c, allDocuments(), 'en', linkedSpouse(), spouseDocuments());
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#7c3aed';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#8b5cf6';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Print QR Codes
        </button>

        {/* Message Client Button */}
        <button
          style={{
            background: '#0ea5e9',
            color: 'white',
            border: 'none',
            'border-radius': 'var(--border-radius-md)',
            padding: '0.75rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem',
            'font-weight': '600',
            'font-size': '0.875rem',
            transition: 'all 0.2s'
          }}
          onClick={() => setShowQuickMessage(true)}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#0284c7';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#0ea5e9';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Message Client
        </button>

        {/* Send Portal Link via WhatsApp */}
        <button
          style={{
            background: portalLinkResult() === 'success' ? '#22c55e'
              : portalLinkResult() === 'error' ? '#ef4444'
              : '#25D366',
            color: 'white',
            border: 'none',
            'border-radius': 'var(--border-radius-md)',
            padding: '0.75rem 1.25rem',
            cursor: isSendingPortalLink() ? 'wait' : 'pointer',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem',
            'font-weight': '600',
            'font-size': '0.875rem',
            transition: 'all 0.2s',
            opacity: isSendingPortalLink() ? '0.7' : '1'
          }}
          onClick={handleSendPortalWhatsApp}
          disabled={isSendingPortalLink()}
          onMouseOver={(e) => {
            if (!isSendingPortalLink() && !portalLinkResult()) e.currentTarget.style.background = '#1ebe5d';
          }}
          onMouseOut={(e) => {
            if (!portalLinkResult()) e.currentTarget.style.background = '#25D366';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {isSendingPortalLink() ? 'Enviando...'
            : portalLinkResult() === 'success' ? 'Enviado!'
            : portalLinkResult() === 'error' ? (client()?.phone ? 'Error' : 'Sin telefono')
            : 'Portal WhatsApp'}
        </button>

        {/* Generate 1099-NEC Button - always visible to allow adding payers */}
          <button
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-md)',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              'font-weight': '600',
              'font-size': '0.875rem',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              setSelected1099Docs(new Set<string>());
              setSelectedSavedPayers(new Set<string>());
              setSavedPayerAmounts({});
              setShowAddPayerForm(false);
              resetPayerForm();
              setPayerSearchTerm('');
              setShow1099Modal(true);
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#047857';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#059669';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate 1099
          </button>

          {/* Complete Client Button */}
          <button
            style={{
              background: isClientCompleted() ? '#16a34a' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: 'white',
              border: isClientCompleted() ? '2px solid #15803d' : 'none',
              'border-radius': 'var(--border-radius-md)',
              padding: '0.75rem 1.25rem',
              cursor: isCompleting() || isClientCompleted() ? 'default' : 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              'font-weight': '700',
              'font-size': '0.875rem',
              transition: 'all 0.2s',
              opacity: isCompleting() ? 0.7 : 1,
              'box-shadow': isClientCompleted() ? 'none' : '0 2px 8px rgba(34,197,94,0.4)',
            }}
            onClick={() => { if (!isCompleting() && !isClientCompleted()) handleCompleteClient(); }}
            onMouseOver={(e) => { if (!isClientCompleted()) e.currentTarget.style.opacity = '0.9'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = isCompleting() ? '0.7' : '1'; }}
            disabled={isCompleting() || isClientCompleted()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              {isClientCompleted()
                ? <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path d="M5 13l4 4L19 7" />
              }
            </svg>
            {isCompleting() ? 'Saving...' : isClientCompleted() ? 'Completed' : 'Complete'}
          </button>
      </div>


      {/* Client Name Label Banner
      <div style={{
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        'border-radius': '12px',
        'margin-bottom': '1.5rem',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'box-shadow': '0 4px 12px rgba(30, 64, 175, 0.3)'
      }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            'border-radius': '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center'
          }}
          onClick={() => setShowLabelPrint(true)}
          >
            <svg viewBox="0 0 20 20" fill="white" style={{ width: '28px', height: '28px' }}>
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <div style={{
              color: 'white',
              'font-weight': '700',
              'font-size': '1.5rem',
              'text-transform': 'uppercase',
              'letter-spacing': '1px'
            }}>
              {[client()?.firstName, client()?.middleName, client()?.lastName].filter(Boolean).join(' ')}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.8)',
              'font-size': '0.875rem',
              'margin-top': '0.25rem'
            }}>
              {client()?.ssn ? `SSN: ***-**-${client()?.ssn?.slice(-4)}` : ''}
              {client()?.ssn && client()?.dateOfBirth ? ' • ' : ''}
              {client()?.dateOfBirth ? `DOB: ${client()?.dateOfBirth}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
         
         
          {(() => {
            const c = client();
            const payStatus = c?.paymentStatus;
            const totalFee = c?.paymentAmount || 0;
            const paidAmount = c?.paymentPaidAmount || 0;
            const remaining = totalFee - paidAmount;
            const badgeBg = payStatus === 'paid' ? 'rgba(34,197,94,0.3)'
              : payStatus === 'partial' ? 'rgba(245,158,11,0.3)'
              : 'rgba(255,255,255,0.2)';
            const badgeText = payStatus === 'paid' ? 'PAID'
              : payStatus === 'partial' ? `Partial: $${paidAmount.toLocaleString()}`
              : totalFee > 0 ? `Fee: $${totalFee.toLocaleString()}`
              : '';

            return badgeText ? (
              <div style={{
                background: badgeBg,
                padding: '0.375rem 0.875rem',
                'border-radius': '25px',
                color: 'white',
                'font-weight': '700',
                'font-size': '0.8125rem',
                display: 'flex',
                'align-items': 'center',
                gap: '0.375rem',
                'white-space': 'nowrap',
              }}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
                </svg>
                {badgeText}
              </div>
            ) : null;
          })()}

          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '0.5rem 1.25rem',
            'border-radius': '25px',
            color: 'white',
            'font-weight': '700',
            'font-size': '1.125rem',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
            </svg>
            Tax Return {taxYear()}
          </div>
        </div>
      </div>


      */}

      {/* Section Cards */}
      <div style={{"overflow-x": 'auto', "max-width": '90vw', padding: '9px'}}>
      <div style={sectionCardsGridStyle}>
        {sectionCards.map((section) => {
          const isActive = activeSection() === section.id;
          return (
            <div
              style={getSectionCardStyle(section, isActive)}
              onClick={() => handleSectionClick(section.id)}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = section.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 15px ${section.color}20`;
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                }
              }}
            >
              <div style={iconContainerStyle(section.color, isActive)}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isActive ? 'white' : section.color}
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d={section.icon} />
                </svg>
              </div>
              <h3 style={sectionTitleStyle(isActive)}>{section.title}</h3>
              <div style={sectionLabelStyle(isActive)}>{section.getLabel()}</div>
            </div>
          );
        })}
      </div>
      </div>

      {/* Expanded Section Content */}
      <Show when={activeSection()}>
        <div style={expandedSectionStyle}>
          <Show when={activeSection() === 'info'}>
            <ClientInfoSection
              client={client()!}
              onClientChange={handleClientChange}
              onSave={handleSaveClient}
              isSaving={isSaving()}
              linkedSpouse={linkedSpouse()}
              previousYearData={previousYearData()}
              yearOverYearChanges={yearOverYearChanges()}
              isReturningClient={isReturningClient()}
            />
          </Show>

          <Show when={activeSection() === 'status'}>
            <StatusSection
              client={client()!}
              onClientChange={handleClientChange}
              onSave={handleSaveClient}
              isSaving={isSaving()}
              documents={documents()}
              feeEstimate={feeEstimate()}
              isReturningClient={isReturningClient()}
            />
          </Show>

          <Show when={activeSection() === 'docs'}>
            <DocumentsSection
              client={client()!}
              taxPortal={client()!}
              documents={documents()}
              spouseDocuments={spouseDocuments()}
              linkedSpouse={linkedSpouse()}
              taxYear={taxYear()}
              onDocumentsChange={setDocuments}
              onRefresh={() => loadClientData(params.id)}
              expectedDocs={expectedDocs()}
              isReturningClient={isReturningClient()}
              autoOpenScan={searchParams.scan === 'true'}
              onClientChange={handleClientChange}
              onDocumentUploaded={(docType) => {
                const c = client();
                if (c) {
                  triggerHelper.evaluateEvent('document_received', c, {
                    documentType: docType,
                  });
                }
              }}
            />
          </Show>

          <Show when={activeSection() === 'tasks'}>
            <TasksSection
              client={client()!}
              taxPortal={client()!}
              documents={documents()}
              documentRequests={documentRequests()}
              onTasksChange={(count) => setPendingTasks(count)}
            />
          </Show>
          {/** 
          <Show when={activeSection() === 'ai'}>
            <AIAnalysisSection
              client={client()!}
              documents={documents()}
              taxYear={taxYear()}
            />
          </Show>
          */}
          <Show when={activeSection() === 'tax'}>
            <TaxPrepSection
              client={client()!}
              documents={documents()}
              spouseDocuments={spouseDocuments()}
              linkedSpouse={linkedSpouse()}
              taxYear={taxYear()}
              onClientChange={handleClientChange}
              previousYearData={previousYearData()}
            />
          </Show>

          <Show when={activeSection() === 'strategy'}>
            <StrategySection
              client={client()!}
              documents={documents()}
              onClientChange={handleClientChange}
              onSave={handleSaveClient}
              isSaving={isSaving()}
              previousYearData={previousYearData()}
            />
          </Show>

          <Show when={activeSection() === 'messaging'}>
            <MessagingSection
              client={client()!}
              onClientChange={handleClientChange}
              onSave={handleSaveClient}
              isSaving={isSaving()}
            />
          </Show>
        </div>
      </Show>

      {/* CSS Animation for slide down */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Print QR Codes Modal */}
      <DrakeQRCodePrintView
        client={client()!}
        documents={documents()}
        dependents={client()?.dependents || []}
        isOpen={showPrintView()}
        onClose={() => setShowPrintView(false)}
      />

      {/* Print Label Modal (2.3" x 4") */}
      <Show when={showLabelPrint()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000
        }}>
          <div style={{
            background: 'white',
            'border-radius': '12px',
            padding: '1.5rem',
            'max-width': '500px',
            width: '90%'
          }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1rem'
            }}>
              <h3 style={{ margin: 0, 'font-size': '1.25rem' }}>Print Client Label</h3>
              <button
                onClick={() => setShowLabelPrint(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  'font-size': '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >×</button>
            </div>

            {/* Label Preview - Thermal Printer (B&W) */}
            <div style={{
              border: '2px dashed #ccc',
              padding: '1rem',
              'margin-bottom': '1rem',
              display: 'flex',
              'justify-content': 'center',
              background: '#f8fafc'
            }}>
              <div
                id="printable-label"
                style={{
                  width: '4in',
                  height: '2.3in',
                  background: 'white',
                  border: '4px solid #000',
                  display: 'flex',
                  'flex-direction': 'column',
                  'justify-content': 'center',
                  'align-items': 'center',
                  padding: '0.2in 0.3in',
                  'box-sizing': 'border-box',
                  'font-family': "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
                }}
              >
                <div style={{
                  'font-size': '14pt',
                  'font-weight': '600',
                  'text-transform': 'uppercase',
                  'text-align': 'center',
                  'line-height': '1.2',
                  color: '#000',
                  'letter-spacing': '2px',
                  'margin-bottom': '0.08in'
                }}>
                  {client()?.firstName} {client()?.lastName}
                </div>
                <div style={{
                  'font-size': '48pt',
                  'font-weight': '900',
                  'text-align': 'center',
                  color: '#000',
                  'line-height': '1',
                  'margin-bottom': '0.05in'
                }}>
                  {taxYear()}
                </div>
                <div style={{
                  'font-size': '16pt',
                  'font-weight': '700',
                  'text-align': 'center',
                  color: '#000',
                  'letter-spacing': '6px',
                  'text-transform': 'uppercase'
                }}>
                  TAX RETURN
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'flex-end' }}>
              <button
                onClick={() => setShowLabelPrint(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-weight': '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Tax Client Label</title>
                        <style>
                          @page {
                            size: 4in 2.3in;
                            margin: 0;
                          }
                          * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                          }
                          body {
                            width: 4in;
                            height: 2.3in;
                            font-family: Arial, sans-serif;
                          }
                          .label {
                            width: 4in;
                            height: 2.3in;
                            background: white;
                            
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            padding: 0.15in 0.25in;
                            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                          }
                          .name {
                            font-size: 13pt;
                            font-weight: 600;
                            text-transform: uppercase;
                            text-align: center;
                            line-height: 1.2;
                            color: #000;
                            letter-spacing: 2px;
                            margin-bottom: 0.06in;
                          }
                          .year {
                            font-size: 44pt;
                            font-weight: 900;
                            text-align: center;
                            color: #000;
                            line-height: 1;
                            margin-bottom: 0.064in;
                          }
                          .tax-label {
                            font-size: 14pt;
                            font-weight: 700;
                            text-align: center;
                            color: #000;
                            letter-spacing: 6px;
                            text-transform: uppercase;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="label">
                          <div class="name">${client()?.firstName} ${client()?.lastName}</div>
                          <div class="year">${taxYear()}</div>
                          <div class="tax-label">TAX RETURN</div>
                        </div>
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }
                  setShowLabelPrint(false);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1e40af',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-weight': '600',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clip-rule="evenodd" />
                </svg>
                Print Label
              </button>
            </div>
          </div>
        </div>
      </Show>










      {/* Generate 1099-NEC Modal with Saved Payers */}
      <Show when={show1099Modal()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000
        }}>
          <div style={{
            background: 'white',
            'border-radius': '12px',
            padding: '1.5rem',
            'max-width': '700px',
            width: '95%',
            'max-height': '85vh',
            display: 'flex',
            'flex-direction': 'column'
          }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1rem'
            }}>
              <h3 style={{ margin: 0, 'font-size': '1.25rem' }}>Generate 1099-NEC</h3>
              <button
                onClick={() => setShow1099Modal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  'font-size': '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >×</button>
            </div>

            {/* Search saved payers */}
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              'margin-bottom': '1rem',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              'border-radius': '8px',
              padding: '0.5rem 0.75rem'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search payers by name or EIN..."
                value={payerSearchTerm()}
                onInput={(e) => setPayerSearchTerm(e.currentTarget.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  'font-size': '0.9rem'
                }}
              />
              <Show when={isSearchingPayers()}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #e5e7eb',
                  'border-top-color': '#3b82f6',
                  'border-radius': '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
              </Show>
            </div>

            {/* Scrollable content */}
            <div style={{
              'overflow-y': 'auto',
              flex: 1,
              'margin-bottom': '1rem'
            }}>
              {/* Saved Payers Section */}
              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  'margin-bottom': '0.5rem',
                  'padding-bottom': '0.5rem',
                  'border-bottom': '1px solid #e5e7eb'
                }}>
                  <span style={{ 'font-weight': '600', 'font-size': '0.875rem', color: '#374151' }}>
                    Saved Payers ({filteredSavedPayers().length})
                  </span>
                  <button
                    onClick={() => {
                      resetPayerForm();
                      setShowAddPayerForm(!showAddPayerForm());
                    }}
                    style={{
                      background: showAddPayerForm() ? '#fef2f2' : '#f0fdf4',
                      color: showAddPayerForm() ? '#dc2626' : '#059669',
                      border: `1px solid ${showAddPayerForm() ? '#fecaca' : '#86efac'}`,
                      'border-radius': '6px',
                      padding: '0.375rem 0.75rem',
                      cursor: 'pointer',
                      'font-size': '0.8rem',
                      'font-weight': '500',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {showAddPayerForm() ? (
                      <>
                        <span style={{ 'font-size': '1rem' }}>×</span> Cancel
                      </>
                    ) : (
                      <>
                        <span style={{ 'font-size': '1rem' }}>+</span> Add New Payer
                      </>
                    )}
                  </button>
                </div>

                {/* Add/Edit Payer Form */}
                <Show when={showAddPayerForm()}>
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    'border-radius': '8px',
                    padding: '1rem',
                    'margin-bottom': '0.75rem'
                  }}>
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ 'font-size': '0.75rem', 'font-weight': '500', color: '#374151', display: 'block', 'margin-bottom': '0.25rem' }}>
                          Payer Name *
                        </label>
                        <input
                          type="text"
                          value={payerName()}
                          onInput={(e) => setPayerName(e.currentTarget.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            'border-radius': '6px',
                            'font-size': '0.875rem',
                            'box-sizing': 'border-box'
                          }}
                          placeholder="Company Name"
                        />
                      </div>
                      <div>
                        <label style={{ 'font-size': '0.75rem', 'font-weight': '500', color: '#374151', display: 'block', 'margin-bottom': '0.25rem' }}>
                          EIN *
                        </label>
                        <input
                          type="text"
                          value={payerEin()}
                          onInput={(e) => setPayerEin(e.currentTarget.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            'border-radius': '6px',
                            'font-size': '0.875rem',
                            'box-sizing': 'border-box'
                          }}
                          placeholder="12-3456789"
                        />
                      </div>
                      <div style={{ 'grid-column': 'span 2' }}>
                        <label style={{ 'font-size': '0.75rem', 'font-weight': '500', color: '#374151', display: 'block', 'margin-bottom': '0.25rem' }}>
                          Address
                        </label>
                        <input
                          type="text"
                          value={payerAddress()}
                          onInput={(e) => setPayerAddress(e.currentTarget.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            'border-radius': '6px',
                            'font-size': '0.875rem',
                            'box-sizing': 'border-box'
                          }}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <label style={{ 'font-size': '0.75rem', 'font-weight': '500', color: '#374151', display: 'block', 'margin-bottom': '0.25rem' }}>
                          City
                        </label>
                        <input
                          type="text"
                          value={payerCity()}
                          onInput={(e) => setPayerCity(e.currentTarget.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            'border-radius': '6px',
                            'font-size': '0.875rem',
                            'box-sizing': 'border-box'
                          }}
                          placeholder="City"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ width: '80px' }}>
                          <label style={{ 'font-size': '0.75rem', 'font-weight': '500', color: '#374151', display: 'block', 'margin-bottom': '0.25rem' }}>
                            State
                          </label>
                          <input
                            type="text"
                            value={payerState()}
                            onInput={(e) => setPayerState(e.currentTarget.value)}
                            maxLength={2}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              'border-radius': '6px',
                              'font-size': '0.875rem',
                              'box-sizing': 'border-box',
                              'text-transform': 'uppercase'
                            }}
                            placeholder="TX"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ 'font-size': '0.75rem', 'font-weight': '500', color: '#374151', display: 'block', 'margin-bottom': '0.25rem' }}>
                            ZIP
                          </label>
                          <input
                            type="text"
                            value={payerZip()}
                            onInput={(e) => setPayerZip(e.currentTarget.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              'border-radius': '6px',
                              'font-size': '0.875rem',
                              'box-sizing': 'border-box'
                            }}
                            placeholder="12345"
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ 'font-size': '0.75rem', 'font-weight': '500', color: '#374151', display: 'block', 'margin-bottom': '0.25rem' }}>
                          Phone
                        </label>
                        <input
                          type="text"
                          value={payerPhone()}
                          onInput={(e) => setPayerPhone(e.currentTarget.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            'border-radius': '6px',
                            'font-size': '0.875rem',
                            'box-sizing': 'border-box'
                          }}
                          placeholder="(555) 555-5555"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '0.75rem', 'justify-content': 'flex-end' }}>
                      <button
                        onClick={() => {
                          resetPayerForm();
                          setShowAddPayerForm(false);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#f3f4f6',
                          border: 'none',
                          'border-radius': '6px',
                          cursor: 'pointer',
                          'font-size': '0.875rem'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePayer}
                        disabled={!payerName().trim() || !payerEin().trim()}
                        style={{
                          padding: '0.5rem 1rem',
                          background: (!payerName().trim() || !payerEin().trim()) ? '#d1d5db' : '#059669',
                          color: 'white',
                          border: 'none',
                          'border-radius': '6px',
                          cursor: (!payerName().trim() || !payerEin().trim()) ? 'not-allowed' : 'pointer',
                          'font-size': '0.875rem',
                          'font-weight': '500'
                        }}
                      >
                        {editingPayerId() ? 'Update Payer' : 'Save Payer'}
                      </button>
                    </div>
                  </div>
                </Show>

                {/* Saved Payers List */}
                <Show when={filteredSavedPayers().length > 0} fallback={
                  <div style={{
                    padding: '1.5rem',
                    'text-align': 'center',
                    color: '#6b7280',
                    'font-size': '0.875rem',
                    background: '#f9fafb',
                    'border-radius': '8px',
                    border: '1px dashed #d1d5db'
                  }}>
                    {payerSearchTerm() ? 'No payers match your search' : (
                      <div>
                        <p style={{ margin: '0 0 0.5rem 0' }}>No saved payers yet</p>
                        <p style={{ margin: 0, 'font-size': '0.8rem', color: '#9ca3af' }}>
                          Click "+ Add New Payer" to create one
                        </p>
                      </div>
                    )}
                  </div>
                }>
                  <For each={filteredSavedPayers()}>
                    {(payer) => {
                      // Make these reactive functions
                      const isSelected = () => selectedSavedPayers().has(payer.id);
                      const amount = () => savedPayerAmounts()[payer.id] || 0;
                      const isReady = () => isSelected() && amount() > 0;

                      return (
                        <div style={{
                          display: 'flex',
                          'flex-direction': 'column',
                          gap: '0.5rem',
                          padding: '0.875rem',
                          'border-radius': '8px',
                          background: isReady() ? '#f0fdf4' : isSelected() ? '#fffbeb' : '#fff',
                          border: `2px solid ${isReady() ? '#22c55e' : isSelected() ? '#fbbf24' : '#e5e7eb'}`,
                          'margin-bottom': '0.5rem',
                          transition: 'all 0.2s'
                        }}>
                          <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected()}
                              onChange={() => toggleSavedPayerSelection(payer.id)}
                              style={{ width: '20px', height: '20px', cursor: 'pointer', 'flex-shrink': '0', 'margin-top': '2px', 'accent-color': '#22c55e' }}
                            />
                            <div style={{ flex: 1, 'min-width': 0 }}>
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                                <span style={{ 'font-weight': '600', 'font-size': '0.95rem', color: '#111827' }}>
                                  {payer.name}
                                </span>
                                <Show when={isReady()}>
                                  <span style={{
                                    background: '#22c55e',
                                    color: 'white',
                                    padding: '0.125rem 0.5rem',
                                    'border-radius': '9999px',
                                    'font-size': '0.7rem',
                                    'font-weight': '600'
                                  }}>Ready</span>
                                </Show>
                              </div>
                              <div style={{ 'font-size': '0.8rem', color: '#6b7280', 'margin-top': '0.125rem' }}>
                                EIN: {payer.ein}
                                {payer.city && payer.state && ` • ${payer.city}, ${payer.state}`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem', 'flex-shrink': '0' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditPayer(payer); }}
                                title="Edit payer"
                                style={{
                                  background: '#f3f4f6',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.375rem',
                                  'border-radius': '6px'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePayer(payer.id); }}
                                title="Delete payer"
                                style={{
                                  background: '#fef2f2',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.375rem',
                                  'border-radius': '6px'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Amount input - always visible when selected */}
                          <Show when={isSelected()}>
                            <div style={{
                              display: 'flex',
                              'align-items': 'center',
                              gap: '0.75rem',
                              'padding-left': '2rem',
                              'margin-top': '0.25rem'
                            }}>
                              <label style={{
                                'font-size': '0.8rem',
                                'font-weight': '600',
                                color: amount() > 0 ? '#166534' : '#92400e'
                              }}>
                                Compensation (Box 1):
                              </label>
                              <div style={{ position: 'relative', display: 'flex', 'align-items': 'center' }}>
                                <span style={{
                                  position: 'absolute',
                                  left: '10px',
                                  color: '#374151',
                                  'font-size': '0.9rem',
                                  'font-weight': '600'
                                }}>$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={amount() || ''}
                                  onInput={(e) => updateSavedPayerAmount(payer.id, parseFloat(e.currentTarget.value) || 0)}
                                  style={{
                                    width: '140px',
                                    padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                                    border: `2px solid ${amount() > 0 ? '#22c55e' : '#fbbf24'}`,
                                    'border-radius': '8px',
                                    'font-size': '0.95rem',
                                    'font-weight': '600',
                                    background: amount() > 0 ? '#f0fdf4' : '#fffbeb',
                                    outline: 'none'
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                              <Show when={amount() <= 0}>
                                <span style={{ 'font-size': '0.75rem', color: '#92400e' }}>
                                  Enter amount to generate
                                </span>
                              </Show>
                              <Show when={amount() > 0}>
                                <span style={{ 'font-size': '0.8rem', color: '#166534', 'font-weight': '500' }}>
                                  ${amount().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </Show>
                            </div>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </Show>
              </div>

              {/* From Client Documents Section */}
              <Show when={nec1099Documents().length > 0}>
                <div>
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem',
                    'margin-bottom': '0.5rem',
                    'padding-bottom': '0.5rem',
                    'border-bottom': '1px solid #e5e7eb'
                  }}>
                    <input
                      type="checkbox"
                      checked={selected1099Docs().size === nec1099Documents().length && nec1099Documents().length > 0}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          setSelected1099Docs(new Set<string>(nec1099Documents().map(d => d.id)));
                        } else {
                          setSelected1099Docs(new Set<string>());
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ 'font-weight': '600', 'font-size': '0.875rem', color: '#374151' }}>
                      From Client Documents ({nec1099Documents().length})
                    </span>
                  </div>

                  <For each={nec1099Documents()}>
                    {(doc) => {
                      const isSelected = () => selected1099Docs().has(doc.id);
                      const amount = () => documentAmounts()[doc.id] || 0;
                      const extractedAmount = doc.extractedAmounts?.nonEmployeeCompensation || 0;

                      return (
                        <div style={{
                          display: 'flex',
                          'flex-direction': 'column',
                          padding: '0.75rem',
                          'border-radius': '8px',
                          transition: 'background 0.15s',
                          background: isSelected()
                            ? amount() > 0 ? '#f0fdf4' : '#fefce8'
                            : '#f9fafb',
                          border: `1px solid ${isSelected()
                            ? amount() > 0 ? '#86efac' : '#fde047'
                            : '#e5e7eb'}`,
                          'margin-bottom': '0.5rem'
                        }}>
                          <label style={{
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.75rem',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="checkbox"
                              checked={isSelected()}
                              onChange={() => {
                                const current = new Set(selected1099Docs());
                                if (current.has(doc.id)) {
                                  current.delete(doc.id);
                                } else {
                                  current.add(doc.id);
                                  // Pre-fill with extracted amount if available
                                  if (extractedAmount > 0 && !documentAmounts()[doc.id]) {
                                    updateDocumentAmount(doc.id, extractedAmount);
                                  }
                                }
                                setSelected1099Docs(current);
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', 'flex-shrink': '0' }}
                            />
                            <div style={{ flex: 1, 'min-width': 0 }}>
                              <div style={{ 'font-weight': '600', 'font-size': '0.9rem', color: '#111827' }}>
                                {doc.payerInfo?.name || 'Unknown Payer'}
                              </div>
                              <div style={{ 'font-size': '0.8rem', color: '#6b7280', 'margin-top': '0.125rem' }}>
                                {doc.payerInfo?.ein ? `EIN: ${doc.payerInfo.ein}` : 'No EIN'}
                                {(doc as any)._owner === 'spouse' ? ' (Spouse)' : ''}
                                {extractedAmount > 0 && (
                                  <span style={{ 'margin-left': '0.5rem', color: '#9ca3af' }}>
                                    (Extracted: ${extractedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                  </span>
                                )}
                              </div>
                            </div>
                            <Show when={amount() > 0}>
                              <span style={{
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '0.125rem 0.5rem',
                                'border-radius': '9999px',
                                'font-size': '0.7rem',
                                'font-weight': '600'
                              }}>
                                Ready
                              </span>
                            </Show>
                          </label>

                          {/* Amount input - show when selected */}
                          <Show when={isSelected()}>
                            <div style={{
                              display: 'flex',
                              'align-items': 'center',
                              gap: '0.5rem',
                              'margin-top': '0.5rem',
                              'padding-top': '0.5rem',
                              'border-top': '1px dashed #e5e7eb',
                              'margin-left': '2rem'
                            }}>
                              <label style={{ 'font-size': '0.8rem', color: '#374151', 'font-weight': '500' }}>
                                Amount (Box 1):
                              </label>
                              <div style={{ position: 'relative', flex: 1, 'max-width': '150px' }}>
                                <span style={{
                                  position: 'absolute',
                                  left: '0.5rem',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#6b7280',
                                  'font-size': '0.9rem'
                                }}>$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={amount() || ''}
                                  onInput={(e) => updateDocumentAmount(doc.id, parseFloat(e.currentTarget.value) || 0)}
                                  placeholder="0.00"
                                  style={{
                                    width: '100%',
                                    padding: '0.375rem 0.5rem 0.375rem 1.25rem',
                                    border: '1px solid #d1d5db',
                                    'border-radius': '6px',
                                    'font-size': '0.9rem',
                                    'box-sizing': 'border-box'
                                  }}
                                />
                              </div>
                              <Show when={amount() > 0}>
                                <span style={{ 'font-size': '0.85rem', color: '#166534', 'font-weight': '600' }}>
                                  ${amount().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </Show>
                              <Show when={amount() <= 0}>
                                <span style={{ 'font-size': '0.75rem', color: '#92400e' }}>
                                  Enter amount
                                </span>
                              </Show>
                            </div>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>

            {/* Footer with summary and buttons */}
            <div style={{ 'border-top': '1px solid #e5e7eb', 'padding-top': '1rem' }}>
              {/* Summary info */}
              <Show when={totalSelectedCount() > 0 || pendingPayersCount() > 0 || pendingDocumentsCount() > 0}>
                <div style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '0.5rem',
                  'margin-bottom': '0.75rem',
                  'padding': '0.75rem',
                  background: '#f9fafb',
                  'border-radius': '8px',
                  'font-size': '0.85rem'
                }}>
                  {/* Selection counts */}
                  <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '1rem' }}>
                    <Show when={readyDocumentsCount() > 0}>
                      <span style={{ color: '#166534' }}>
                        <strong>{readyDocumentsCount()}</strong> from documents
                        <span style={{ 'margin-left': '0.25rem', color: '#059669', 'font-weight': '600' }}>
                          (${totalDocumentsAmount().toLocaleString('en-US', { minimumFractionDigits: 2 })})
                        </span>
                      </span>
                    </Show>
                    <Show when={readyPayersCount() > 0}>
                      <span style={{ color: '#166534' }}>
                        <strong>{readyPayersCount()}</strong> from saved payers
                        <span style={{ 'margin-left': '0.25rem', color: '#059669', 'font-weight': '600' }}>
                          (${totalSavedPayersAmount().toLocaleString('en-US', { minimumFractionDigits: 2 })})
                        </span>
                      </span>
                    </Show>
                    <Show when={pendingDocumentsCount() > 0}>
                      <span style={{ color: '#92400e' }}>
                        <strong>{pendingDocumentsCount()}</strong> document(s) need amount
                      </span>
                    </Show>
                    <Show when={pendingPayersCount() > 0}>
                      <span style={{ color: '#92400e' }}>
                        <strong>{pendingPayersCount()}</strong> payer(s) need amount
                      </span>
                    </Show>
                  </div>
                  {/* Total amount */}
                  <Show when={totalAmount1099() > 0}>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      'padding-top': '0.5rem',
                      'border-top': '1px dashed #d1d5db',
                      'margin-top': '0.25rem'
                    }}>
                      <span style={{ 'font-weight': '600', color: '#374151' }}>
                        Total 1099-NEC Amount:
                      </span>
                      <span style={{
                        'font-weight': '700',
                        'font-size': '1.1rem',
                        color: '#059669'
                      }}>
                        ${totalAmount1099().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </Show>
                </div>
              </Show>

              <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'flex-end' }}>
                <button
                  onClick={() => setShow1099Modal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: 'pointer',
                    'font-weight': '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={totalSelectedCount() === 0}
                  onClick={() => {
                    const entries = build1099Entries();
                    if (entries.length > 0) {
                      generateForm1099NecCSV(entries, client()?.id);
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: totalSelectedCount() === 0 ? '#d1d5db' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: totalSelectedCount() === 0 ? 'not-allowed' : 'pointer',
                    'font-weight': '600',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                  Download CSV
                </button>
                <button
                  disabled={totalSelectedCount() === 0}
                  onClick={() => {
                    const entries = build1099Entries();
                    if (entries.length > 0) {
                      generateForm1099NecPDF(entries);
                      setShow1099Modal(false);
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: totalSelectedCount() === 0 ? '#d1d5db' : '#059669',
                    color: 'white',
                    border: 'none',
                    'border-radius': '8px',
                    cursor: totalSelectedCount() === 0 ? 'not-allowed' : 'pointer',
                    'font-weight': '600',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
                  </svg>
                  Generate PDF ({totalSelectedCount()})
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Quick Message Modal */}
      <Show when={showQuickMessage() && client()}>
        <QuickMessageModal
          isOpen={showQuickMessage()}
          onClose={() => setShowQuickMessage(false)}
          client={client()!}
        />
      </Show>
    </div>
    </Show>
    </Show>
  );
};

export default TaxClientWorkspace;
