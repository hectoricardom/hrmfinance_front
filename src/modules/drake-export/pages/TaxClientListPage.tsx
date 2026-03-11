/**
 * Tax Client List Page
 * Main view showing all tax clients as cards with search and filtering
 */

import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { Card, Button, FormInput, Modal } from '../../ui';
import { getTaxPortals, createTaxPortal } from '../services/taxPortalApi';
import type { TaxPortal, TaxPaymentStatus, TaxWorkflowStatus } from '../types/drakeTypes';
import { SmartQueuePage } from '../../smart-queue';
import {
  TAX_PAYMENT_STATUS_LABELS,
  TAX_PAYMENT_STATUS_COLORS,
  TAX_WORKFLOW_STATUS_LABELS,
  TAX_WORKFLOW_STATUS_COLORS
} from '../types/drakeTypes';
import type { NotaryCustomer, Residence } from '../../notary/types';
import CustomerSearchDropdown from '../../notary/components/CustomerSearchDropdown';
// ML-powered scanner for ID/Passport scanning
import {
  MLIDScanner,
  MLPassportScanner,
  type ScanResult,
  type AAMVAData,
  type MRZData
} from '../../scanner';
import { parseAAMVA, aamvaToTaxPortalIdInfo } from '../services/aamvaParser';
import { devLog, fetchGraphQLSS } from '../../../services/utils';
import { lookupZipCode } from '../utils/zipCodeLookup';

// Client status types for filtering (workflow-based)
type WorkflowFilter = 'all' | TaxWorkflowStatus;
type PaymentFilter = 'all' | TaxPaymentStatus;
type EntryMode = 'manual' | 'import' | 'scan';
type ViewMode = 'list' | 'queue';

// Extended TaxPortal with computed status
interface TaxClientCard extends TaxPortal {
  lastActivity?: number;
  requiredDocs?: number;
}

const TaxClientListPage: Component = () => {
  const navigate = useNavigate();

  // View toggle state
  const [viewMode, setViewMode] = createSignal<ViewMode>('list');

  // State
  const [clients, setClients] = createSignal<TaxClientCard[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [workflowFilter, setWorkflowFilter] = createSignal<WorkflowFilter>('all');
  const [paymentFilter, setPaymentFilter] = createSignal<PaymentFilter>('all');
  const [showNewClientModal, setShowNewClientModal] = createSignal(false);

  // New client form state
  const [newClient, setNewClient] = createSignal({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    ssn: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    taxYear: 2024
  });
  const [isCreating, setIsCreating] = createSignal(false);

  // Entry mode state (manual, import from notary, scan ID)
  const [entryMode, setEntryMode] = createSignal<EntryMode>('manual');
  const [selectedNotaryClient, setSelectedNotaryClient] = createSignal<NotaryCustomer | null>(null);

  // ID Scanner state
  const [showIdScanner, setShowIdScanner] = createSignal(false);
  const [scannedIdInfo, setScannedIdInfo] = createSignal<TaxPortal['idInfo'] | null>(null);
  const [idScanMessage, setIdScanMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [externalScanInput, setExternalScanInput] = createSignal('');
  const [scannerMode, setScannerMode] = createSignal<'id' | 'passport'>('id');

  // Update KY clients
  const [seeding, setSeeding] = createSignal(false);
  const seedKYClients = async () => {
    const businessId = 'IQR20105436441124';
    const list = [
      { id: "1772068638255-anju883nm", ssn: "778-67-5926", phone: "", address: "3201 Dover Avenue, Louisville, KY", firstName: "Gladys", lastName: "Ramos Batista" },
      { id: "1772068638271-ez34pq0mo", ssn: "859-19-1380", phone: "", address: "6622 Evangeline Ave, Louisville, KY 40214", firstName: "José Fernando", lastName: "Mejia Funes" },
      { id: "1772068638277-oqgkx7vj8", ssn: "877-23-7872", phone: "502-302-9423", address: "6622 Evangeline Ave, Louisville, KY 40214", firstName: "Patrick", lastName: "Rivas" },
      { id: "1772068638283-cswqnc80f", ssn: "696-81-1673", phone: "346-308-0734", address: "3201 Dover Ave, Louisville, KY 40216", firstName: "Enildo", lastName: "Batista Perodin" },
      { id: "1772068638289-89p849qcf", ssn: "827-74-3663", phone: "502-919-0449", address: "5103 Christie Ave, Louisville, KY 40216", firstName: "Camila", lastName: "Cortes Trujillo" },
      { id: "1772068638296-f79uz5q4e", ssn: "877-71-6173", phone: "502-487-7603", address: "5103 Christie Ave, Louisville, KY 40216", firstName: "Anibal Ernesto", lastName: "Díaz Loyola" },
      { id: "1772068638302-tmrt8gt8f", ssn: "362-95-9100", phone: "502-616-6512", address: "4611 Grandview Dr, Louisville, KY 40216", firstName: "Rosselin Sofi", lastName: "Loyola" },
      { id: "1772068638310-qleano32m", ssn: "", phone: "502-615-0434", address: "4611 Grandview Dr, Louisville, KY 40216", firstName: "Yanet Josefa", lastName: "Ojeda Mestre" },
      { id: "1772068638316-kae4fnvr6", ssn: "165-63-1166", phone: "", address: "3203 Dover Avenue, Louisville, KY", firstName: "Yasel", lastName: "Gonzalez-Gonzalez" },
      { id: "1772068638322-hvgsmyaqv", ssn: "134-43-1600", phone: "", address: "413 Amy Ave, Louisville, KY 40212", firstName: "Inelvis", lastName: "Peña Machado" },
      { id: "1772068638329-mni03mm9u", ssn: "665-72-1465", phone: "", address: "2018 Peabody Ln, Apto 2, Louisville, KY 40218", firstName: "Anibal", lastName: "Diaz Arias" },
      { id: "1772068638338-b7aomgvri", ssn: "121-97-8862", phone: "", address: "5407 Carnae Ct, Apt 23, Louisville, KY 40216", firstName: "Adelaida", lastName: "Alpizar Forte" },
      { id: "1772068638346-89mz15lze", ssn: "423-86-7564", phone: "502-436-6203", address: "5114 Crafty Dr, Louisville, KY", firstName: "Elizabeth", lastName: "Tuy" },
      { id: "1772068638354-othne6ras", ssn: "831-04-3982", phone: "502-471-4765", address: "10506 Sedalia Ct, Louisville, KY", firstName: "Miguel Angel", lastName: "Cisnero Rodriguez" },
      { id: "1772068638361-5hidfx4kf", ssn: "975-94-1877", phone: "502-281-1642", address: "505 Denmark St, Louisville, KY 40215", firstName: "Karla Patricia", lastName: "Castillo Sandoval" },
      { id: "1772068638367-zcijk0gz0", ssn: "710-62-3427", phone: "", address: "84 Apple Tree Way, Louisville, KY", firstName: "Brayan Natanael", lastName: "Sandoval R." },
      { id: "1772068638374-5bqkgp3zb", ssn: "891-93-6548", phone: "", address: "2309 Mary Catherine Dr, Louisville, KY 40216", firstName: "Alejandro Felix", lastName: "Oliva Valle" },
      { id: "1772068638381-waeys5tav", ssn: "901-63-8170", phone: "", address: "3607 Manslick Rd, Louisville, KY", firstName: "Aldair A.", lastName: "Morales Sandoval" },
      { id: "1772068638387-asw4yr3i9", ssn: "597-41-1647", phone: "", address: "3611 Little Jond, Louisville, KY 40219", firstName: "Joel", lastName: "Pacheco Asencio" },
      { id: "1772068638393-insz8d37w", ssn: "888-23-4833", phone: "", address: "1220 Bicknell Ave, Louisville, KY 40215", firstName: "Darien", lastName: "Domínguez Perez" },
      { id: "1772068638400-ygzu1npp8", ssn: "879-14-8267", phone: "", address: "5001 Quail Hollow Rd, Apt 2, Louisville, KY 40213", firstName: "Jorge", lastName: "Rondon Torres" },
    ];
    setSeeding(true);
    let updated = 0;
    for (const c of list) {
      // Parse "street, city, ST zip" from address
      const parts = c.address.split(',').map(s => s.trim());
      const street = parts[0] || '';
      const city = parts.length >= 3 ? parts[parts.length - 2] : (parts[1]?.replace(/\s+[A-Z]{2}(\s+\d{5})?$/, '') || '');
      const lastPart = parts[parts.length - 1] || '';
      const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})?/);
      const state = stateZipMatch ? stateZipMatch[1] : '';
      const zipCode = stateZipMatch ? (stateZipMatch[2] || '') : '';
      try {
        await fetchGraphQLSS({
          query: 'updateTaxPortal',
          params: { businessId, id: c.id },
          form: { firstName: c.firstName, lastName: c.lastName, phone: c.phone, ssn: c.ssn, address: street, city, state, zipCode, taxYear: 2025, updatedAt: Date.now() },
        });
        updated++;
        devLog(`✅ ${updated}/${list.length} Updated: ${c.firstName} ${c.lastName}`);
      } catch (err) {
        devLog(`❌ Failed: ${c.firstName} ${c.lastName}`, err);
      }
    }
    const portals = await getTaxPortals();
    setClients(portals.map(p => ({ ...p, lastActivity: p.updatedAt || p.createdAt, requiredDocs: 8 })));
    setSeeding(false);
  };

  // Load clients from server (with optional search)
  const loadClients = async (search?: string) => {
    setIsLoading(true);
    try {
      const portals = await getTaxPortals(search || undefined);
      const clientCards: TaxClientCard[] = portals.map(portal => ({
        ...portal,
        lastActivity: portal.updatedAt || portal.createdAt,
        requiredDocs: 8
      }));
      setClients(clientCards);
    } catch (error) {
      devLog('Error loading tax clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount
  createEffect(() => {
    loadClients();
  });

  // Debounced server search when searchTerm changes
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  createEffect(() => {
    const term = searchTerm();
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadClients(term.trim() || undefined);
    }, 400);
  });

  // Filter clients by status (local, search is server-side)
  const filteredClients = () => {
    let result = clients();

    // Filter by workflow status
    if (workflowFilter() !== 'all') {
      result = result.filter(client => (client.workflowStatus || 'intake') === workflowFilter());
    }

    // Filter by payment status
    if (paymentFilter() !== 'all') {
      result = result.filter(client => (client.paymentStatus || 'pending') === paymentFilter());
    }

    return result;
  };

  // Helper to format timestamp to date string
  const formatDateFromTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  // Get current residence from notary customer
  const getCurrentResidence = (customer: NotaryCustomer): Residence | null => {
    if (!customer.residences) return null;
    const residences = Object.values(customer.residences);
    // Return the most recent residence (last one or one without toDate)
    return residences.find(r => !r.toDate) || residences[residences.length - 1] || null;
  };

  // Handle notary customer selection - map to form fields
  const handleNotaryCustomerSelect = (customer: NotaryCustomer) => {
    setSelectedNotaryClient(customer);
    const currentResidence = getCurrentResidence(customer);

    setNewClient({
      firstName: customer.firstName || '',
      middleName: customer.middleName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phoneNumber || '',
      ssn: customer.ss || '',
      dateOfBirth: formatDateFromTimestamp(customer.dateOfBirth || customer.dob),
      address: currentResidence?.addressLineOne || '',
      city: currentResidence?.city || '',
      state: currentResidence?.state || '',
      zipCode: currentResidence?.zipcode || '',
      taxYear: newClient().taxYear
    });
  };

  // Reset form when changing entry mode
  const handleChangeEntryMode = (mode: EntryMode) => {
    setEntryMode(mode);
    setSelectedNotaryClient(null);
    setScannedIdInfo(null);
    setIdScanMessage(null);
    setNewClient({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      ssn: '',
      dateOfBirth: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      taxYear: newClient().taxYear
    });

    // Open scanner automatically when scan mode is selected
    if (mode === 'scan') {
      //setShowIdScanner(true);
    }
  };

  // Handle ID barcode scan (from IDScanner component)
  const handleBarcodeScan = (text: string, format: string) => {
    devLog('Barcode scan received:', format, text.length, 'chars');

    // Parse the AAMVA barcode data
    const parsedData = parseAAMVA(text);

    if (!parsedData) {
      devLog('Failed to parse barcode data');
      setIdScanMessage({
        type: 'error',
        text: 'Could not read ID barcode. Please try again or enter manually.'
      });
      setTimeout(() => setIdScanMessage(null), 5000);
      return;
    }

    devLog('Parsed AAMVA data:', parsedData);

    // Convert to idInfo format
    const idInfo = aamvaToTaxPortalIdInfo(parsedData);
    devLog('Converted idInfo:', idInfo);

    // Store the ID info for later
    setScannedIdInfo(idInfo);

    // Fill in the form fields from scanned data
    setNewClient({
      firstName: parsedData.firstName || '',
      middleName: parsedData.middleName || '',
      lastName: parsedData.lastName || '',
      email: '', // Not on ID
      phone: '', // Not on ID
      ssn: '', // Not on ID (security)
      dateOfBirth: parsedData.dateOfBirth || '',
      address: parsedData.address || '',
      city: parsedData.city || '',
      state: parsedData.state || '',
      zipCode: parsedData.zipCode || '',
      taxYear: newClient().taxYear
    });

    // Close scanner and show success
    setShowIdScanner(false);
    setExternalScanInput('');
    setIdScanMessage({
      type: 'success',
      text: `ID scanned: ${parsedData.firstName} ${parsedData.lastName} (${parsedData.idState} ${parsedData.idNumber})`
    });
  };

  // Handle MRZ scan (from IDScanner component - passport/ID MRZ zone)
  const handleMRZScan = (mrzData: MRZData) => {
    devLog('MRZ scan received:', mrzData);

    // Build idInfo from MRZ data
    const idInfo: TaxPortal['idInfo'] = {
      idNumber: mrzData.documentNumber,
      idState: mrzData.issuingCountry,
      idType: mrzData.documentType === 'P' ? 'passport' : 'state_id',
      firstName: mrzData.firstName,
      middleName: mrzData.middleName,
      lastName: mrzData.lastName,
      dateOfBirth: mrzData.dateOfBirth,
      gender: mrzData.gender === 'unknown' ? undefined : mrzData.gender,
      expirationDate: mrzData.expirationDate,
      country: mrzData.nationality
    };

    // Store the ID info
    setScannedIdInfo(idInfo);

    // Fill in the form fields from MRZ data
    setNewClient({
      firstName: mrzData.firstName || '',
      middleName: mrzData.middleName || '',
      lastName: mrzData.lastName || '',
      email: '', // Not on MRZ
      phone: '', // Not on MRZ
      ssn: '', // Not on MRZ
      dateOfBirth: mrzData.dateOfBirth || '',
      address: '', // Not on MRZ
      city: '', // Not on MRZ
      state: '', // Not on MRZ
      zipCode: '', // Not on MRZ
      taxYear: newClient().taxYear
    });

    // Close scanner and show success
    setShowIdScanner(false);
    setExternalScanInput('');
    setIdScanMessage({
      type: 'success',
      text: `${mrzData.documentType === 'P' ? 'Passport' : 'ID'} scanned: ${mrzData.firstName} ${mrzData.lastName} (${mrzData.issuingCountry} ${mrzData.documentNumber})`
    });
  };

  // Handle ML Scanner result (unified handler for new MLIDScanner/MLPassportScanner)
  const handleMLScanResult = (result: ScanResult) => {
    devLog('ML Scanner result:', result);

    if (!result.parsed) {
      setIdScanMessage({
        type: 'error',
        text: 'Could not read document. Please try again or position the document better.'
      });
      setTimeout(() => setIdScanMessage(null), 5000);
      return;
    }

    if (result.type === 'ID') {
      // Handle AAMVA data from driver's license
      const aamvaData = result.parsed as AAMVAData;
      devLog('Parsed AAMVA data:', aamvaData);

      // Convert to idInfo format
      const idInfo: TaxPortal['idInfo'] = {
        idNumber: aamvaData.documentNumber,
        idState: aamvaData.state,
        idType: 'state_id',
        firstName: aamvaData.firstName,
        middleName: aamvaData.middleName,
        lastName: aamvaData.lastName,
        dateOfBirth: aamvaData.dateOfBirth,
        gender: aamvaData.gender === 'unknown' ? undefined : aamvaData.gender,
        expirationDate: aamvaData.expirationDate
      };

      setScannedIdInfo(idInfo);

      // Fill in the form fields from scanned data
      setNewClient({
        firstName: aamvaData.firstName || '',
        middleName: aamvaData.middleName || '',
        lastName: aamvaData.lastName || '',
        email: '', // Not on ID
        phone: '', // Not on ID
        ssn: '', // Not on ID (security)
        dateOfBirth: aamvaData.dateOfBirth || '',
        address: aamvaData.streetAddress || '',
        city: aamvaData.city || '',
        state: aamvaData.state || '',
        zipCode: aamvaData.postalCode || '',
        taxYear: newClient().taxYear
      });

      setShowIdScanner(false);
      setIdScanMessage({
        type: 'success',
        text: `ID scanned: ${aamvaData.firstName} ${aamvaData.lastName} (${aamvaData.state} ${aamvaData.documentNumber})`
      });
    } else if (result.type === 'PASSPORT') {
      // Handle MRZ data from passport
      const mrzData = result.parsed as MRZData;
      handleMRZScan(mrzData);
    }
  };

  // Handle external scanner input (USB scanner or paste)
  const handleExternalScanSubmit = () => {
    const input = externalScanInput().trim();
    if (!input) {
      setIdScanMessage({ type: 'error', text: 'Please scan or paste barcode data first.' });
      setTimeout(() => setIdScanMessage(null), 3000);
      return;
    }

    // Process as barcode scan
    handleBarcodeScan(input, 'EXTERNAL');
  };

  // Handle Enter key on external scan input
  const handleExternalInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExternalScanSubmit();
    }
  };

  // Handle creating new client
  const handleCreateClient = async () => {
    const form = newClient();
    if (!form.firstName.trim() || !form.lastName.trim()) return;

    setIsCreating(true);
    try {
      const portal = await createTaxPortal({
        firstName: form.firstName.trim(),
        middleName: form.middleName?.trim() || undefined,
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        ssn: form.ssn?.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        zipCode: form.zipCode?.trim() || undefined,
        taxYear: form.taxYear,
        // Include ID info if scanned
        idInfo: scannedIdInfo() || undefined
      });

      const clientCard: TaxClientCard = {
        ...portal,
        workflowStatus: portal.workflowStatus || 'intake',
        paymentStatus: portal.paymentStatus || 'pending',
        lastActivity: Date.now(),
        requiredDocs: 8
      };

      setClients([clientCard, ...clients()]);
      setShowNewClientModal(false);
      setNewClient({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        ssn: '',
        dateOfBirth: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        taxYear: 2024
      });
      setEntryMode('manual');
      setSelectedNotaryClient(null);
      setScannedIdInfo(null);
      setIdScanMessage(null);

      // Navigate to the new client
      navigate(`/tax-client/${portal.id}`);
    } catch (error) {
      devLog('Error creating client:', error);
      alert('Error creating client. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Navigate to client detail
  const handleClientClick = (clientId: string) => {
    navigate(`/tax-client/${clientId}`);
  };

  // Get initials from name
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get workflow status color
  const getWorkflowColor = (status?: TaxWorkflowStatus): string => {
    return TAX_WORKFLOW_STATUS_COLORS[status || 'intake'];
  };

  // Get workflow status label
  const getWorkflowLabel = (status?: TaxWorkflowStatus): string => {
    return TAX_WORKFLOW_STATUS_LABELS[status || 'intake'];
  };

  // Get payment status color
  const getPaymentColor = (status?: TaxPaymentStatus): string => {
    return TAX_PAYMENT_STATUS_COLORS[status || 'pending'];
  };

  // Get payment status label
  const getPaymentLabel = (status?: TaxPaymentStatus): string => {
    return TAX_PAYMENT_STATUS_LABELS[status || 'pending'];
  };

  // Format relative time
  const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return 'No activity';
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 30) return new Date(timestamp).toLocaleDateString();
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min ago`;
    return 'Just now';
  };

  // Workflow filter buttons data
  const workflowFilters: { value: WorkflowFilter; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: '#6b7280' },
    { value: 'intake', label: 'Intake', color: TAX_WORKFLOW_STATUS_COLORS.intake },
    { value: 'collecting_docs', label: 'Collecting', color: TAX_WORKFLOW_STATUS_COLORS.collecting_docs },
    { value: 'in_review', label: 'In Review', color: TAX_WORKFLOW_STATUS_COLORS.in_review },
    { value: 'ready_to_file', label: 'Ready', color: TAX_WORKFLOW_STATUS_COLORS.ready_to_file },
    { value: 'filed', label: 'Filed', color: TAX_WORKFLOW_STATUS_COLORS.filed },
    { value: 'completed', label: 'Completed', color: TAX_WORKFLOW_STATUS_COLORS.completed }
  ];

  // Payment filter buttons data
  const paymentFilters: { value: PaymentFilter; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: '#6b7280' },
    { value: 'pending', label: 'Pending', color: TAX_PAYMENT_STATUS_COLORS.pending },
    { value: 'partial', label: 'Partial', color: TAX_PAYMENT_STATUS_COLORS.partial },
    { value: 'paid', label: 'Paid', color: TAX_PAYMENT_STATUS_COLORS.paid }
  ];

  // Styles
  const containerStyle = {
    padding: '1.5rem',
    'max-width': '1400px',
    margin: '0 auto',
    'min-height': '100vh',
    background: 'var(--background-color)'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap',
    gap: '1rem'
  };

  const searchBarStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap',
    'align-items': 'center'
  };

  const searchInputContainerStyle = {
    flex: '1',
    'min-width': '250px',
    'max-width': '400px'
  };

  const filterButtonsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap'
  };

  const filterButtonStyle = (isActive: boolean, color: string) => ({
    padding: '0.5rem 1rem',
    border: `1px solid ${isActive ? color : 'var(--border-color)'}`,
    'border-radius': '9999px',
    background: isActive ? color : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'font-weight': '500',
    transition: 'all 0.2s',
    'white-space': 'nowrap'
  });

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem'
  };

  const clientCardStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    gap: '1rem',
    'align-items': 'flex-start'
  };

  const avatarStyle = (workflowStatus?: TaxWorkflowStatus) => ({
    width: '48px',
    height: '48px',
    'min-width': '48px',
    'border-radius': '50%',
    background: `linear-gradient(135deg, ${getWorkflowColor(workflowStatus)}, ${getWorkflowColor(workflowStatus)}dd)`,
    color: 'white',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-weight': '600',
    'font-size': '1rem'
  });

  const clientInfoStyle = {
    flex: '1',
    'min-width': '0'
  };

  const clientNameStyle = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'flex-wrap': 'wrap'
  };

  const taxYearBadgeStyle = {
    background: 'var(--primary-color)',
    color: 'white',
    padding: '0.125rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500'
  };

  const workflowBadgeStyle = (status?: TaxWorkflowStatus) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: `${getWorkflowColor(status)}20`,
    color: getWorkflowColor(status)
  });

  const paymentBadgeStyle = (status?: TaxPaymentStatus) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: `${getPaymentColor(status)}20`,
    color: getPaymentColor(status)
  });

  const statusDotStyle = (color: string) => ({
    width: '8px',
    height: '8px',
    'border-radius': '50%',
    background: color
  });

  const docCountStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'margin-top': '0.5rem'
  };

  const lastActivityStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem'
  };

  const emptyStateStyle = {
    'text-align': 'center',
    padding: '4rem 2rem',
    color: 'var(--text-muted)'
  };

  const formGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };

  const formActionsStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '1.5rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ 'font-size': '1.75rem', 'font-weight': '700', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Tax Clients
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, 'font-size': '0.875rem' }}>
            Manage your tax clients and their documents
          </p>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            'border-radius': '9999px',
            padding: '0.25rem'
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem 1.25rem',
                border: 'none',
                'border-radius': '9999px',
                background: viewMode() === 'list' ? 'var(--primary-color)' : 'transparent',
                color: viewMode() === 'list' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                'font-weight': viewMode() === 'list' ? '600' : '400',
                'font-size': '0.875rem',
                transition: 'all 0.2s ease'
              }}
            >
              Client List
            </button>
            <button
              onClick={() => setViewMode('queue')}
              style={{
                padding: '0.5rem 1.25rem',
                border: 'none',
                'border-radius': '9999px',
                background: viewMode() === 'queue' ? 'var(--primary-color)' : 'transparent',
                color: viewMode() === 'queue' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                'font-weight': viewMode() === 'queue' ? '600' : '400',
                'font-size': '0.875rem',
                transition: 'all 0.2s ease'
              }}
            >
              Smart Queue
            </button>
          </div>
          <Button onClick={() => setShowNewClientModal(true)}>
            + New Client
          </Button>
            {/*  */}
          <Button variant="secondary" disabled={seeding()} onClick={seedKYClients}>
            {seeding() ? 'Insertando...' : 'Insertar Clientes KY'}
          </Button>
          
        </div>
      </div>

      {/* Client List View */}
      <Show when={viewMode() === 'list'}>

      {/* Search and Filters */}
      <div style={searchBarStyle}>
        <div style={searchInputContainerStyle}>
          <FormInput
            label=""
            placeholder="Search clients by name, email, or phone..."
            value={searchTerm()}
            onChange={(value) => setSearchTerm(value)}
          />
        </div>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
          {/* Workflow Status Filters */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
            <span style={{ 'font-size': '0.75rem', 'font-weight': '600', color: 'var(--text-muted)', 'min-width': '60px' }}>Status:</span>
            <div style={filterButtonsStyle}>
              <For each={workflowFilters}>
                {(filter) => (
                  <button
                    style={filterButtonStyle(workflowFilter() === filter.value, filter.color)}
                    onClick={() => setWorkflowFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                )}
              </For>
            </div>
          </div>
          {/* Payment Status Filters */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
            <span style={{ 'font-size': '0.75rem', 'font-weight': '600', color: 'var(--text-muted)', 'min-width': '60px' }}>Payment:</span>
            <div style={filterButtonsStyle}>
              <For each={paymentFilters}>
                {(filter) => (
                  <button
                    style={filterButtonStyle(paymentFilter() === filter.value, filter.color)}
                    onClick={() => setPaymentFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>

      {/* Client Count */}
      <Show when={!isLoading() && clients().length > 0}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          padding: '0.5rem 0.75rem',
          'margin-bottom': '0.75rem',
          background: 'var(--bg-secondary, #f9fafb)',
          'border-radius': '0.5rem',
          'font-size': '0.8125rem',
          color: 'var(--text-secondary, #6b7280)',
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Show when={searchTerm() || workflowFilter() !== 'all' || paymentFilter() !== 'all'}
              fallback={
                <span>
                  <b style={{ color: 'var(--text-primary, #111827)', 'font-size': '0.9375rem' }}>{clients().length}</b> client{clients().length !== 1 ? 's' : ''}
                </span>
              }
            >
              <span>
                <b style={{ color: 'var(--text-primary, #111827)', 'font-size': '0.9375rem' }}>{filteredClients().length}</b>
                <span style={{ margin: '0 0.25rem' }}>/</span>
                <span>{clients().length}</span> client{clients().length !== 1 ? 's' : ''}
              </span>
              <button
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  'border-radius': '0.375rem',
                  padding: '0.125rem 0.5rem',
                  'font-size': '0.6875rem',
                  color: 'var(--text-muted, #9ca3af)',
                  cursor: 'pointer',
                }}
                onClick={() => { setSearchTerm(''); setWorkflowFilter('all'); setPaymentFilter('all'); }}
              >
                Clear filters
              </button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div style={emptyStateStyle}>
          <div style={{ 'font-size': '1.25rem', 'margin-bottom': '0.5rem' }}>Loading clients...</div>
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!isLoading() && filteredClients().length === 0}>
        <div style={emptyStateStyle}>
          <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem', opacity: 0.5 }}>
            {searchTerm() || workflowFilter() !== 'all' || paymentFilter() !== 'all' ? '(no results)' : '(empty)'}
          </div>
          <div style={{ 'font-size': '1.25rem', 'margin-bottom': '0.5rem' }}>
            {searchTerm() || workflowFilter() !== 'all' || paymentFilter() !== 'all'
              ? 'No clients match your search criteria'
              : 'No tax clients yet'}
          </div>
          <div style={{ 'margin-bottom': '1.5rem' }}>
            {searchTerm() || workflowFilter() !== 'all' || paymentFilter() !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Add your first client to get started'}
          </div>
          <Show when={!searchTerm() && workflowFilter() === 'all' && paymentFilter() === 'all'}>
            <Button onClick={() => setShowNewClientModal(true)}>
              + Add First Client
            </Button>
          </Show>
        </div>
      </Show>

      {/* Client Grid */}
      <Show when={!isLoading() && filteredClients().length > 0}>
        <div style={gridStyle}>
          <For each={filteredClients()}>
            {(client) => (
              <div
                style={clientCardStyle}
                onClick={() => handleClientClick(client.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                {/* Avatar with initials */}
                <div style={avatarStyle(client.workflowStatus)}>
                  {getInitials(client.firstName, client.lastName)}
                </div>

                {/* Client Info */}
                <div style={clientInfoStyle}>
                  {/* Name and Tax Year */}
                  <div style={clientNameStyle}>
                    <span style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                      {client.firstName} {client.lastName}
                    </span>
                    <Show when={client.taxYear}>
                      <span style={taxYearBadgeStyle}>{client.taxYear}</span>
                    </Show>
                  </div>

                  {/* Status Badges Row */}
                  <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap', 'margin-top': '0.25rem' }}>
                    {/* Workflow Status Badge */}
                    <div style={workflowBadgeStyle(client.workflowStatus)}>
                      <span style={statusDotStyle(getWorkflowColor(client.workflowStatus))} />
                      {getWorkflowLabel(client.workflowStatus)}
                    </div>

                    {/* Payment Status Badge */}
                    <div style={paymentBadgeStyle(client.paymentStatus)}>
                      <span style={statusDotStyle(getPaymentColor(client.paymentStatus))} />
                      {getPaymentLabel(client.paymentStatus)}
                    </div>
                  </div>


                  {/* Last Activity */}
                  <div style={lastActivityStyle}>
                    Last activity: {formatRelativeTime(client.lastActivity)}
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      </Show>

      {/* Smart Queue View */}
      <Show when={viewMode() === 'queue'}>
        <SmartQueuePage portals={clients()} />
      </Show>

      {/* New Client Modal */}
      <Modal
        isOpen={showNewClientModal()}
        onClose={() => setShowNewClientModal(false)}
        title="New Tax Client"
        maxWidth="90vw"
      >
        {/* Entry Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          'margin-bottom': '1.5rem',
          'padding-bottom': '1rem',
          'border-bottom': '1px solid var(--border-color)'
        }}>
          <button
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: `2px solid ${entryMode() === 'manual' ? 'var(--primary-color)' : 'var(--border-color)'}`,
              'border-radius': 'var(--border-radius-md)',
              background: entryMode() === 'manual' ? 'var(--primary-color)' : 'transparent',
              color: entryMode() === 'manual' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              'font-weight': '600',
              transition: 'all 0.2s'
            }}
            onClick={() => handleChangeEntryMode('manual')}
          >
            Manual Entry
          </button>
          <button
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: `2px solid ${entryMode() === 'scan' ? '#10b981' : 'var(--border-color)'}`,
              'border-radius': 'var(--border-radius-md)',
              background: entryMode() === 'scan' ? '#10b981' : 'transparent',
              color: entryMode() === 'scan' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              'font-weight': '600',
              transition: 'all 0.2s'
            }}
            onClick={() => handleChangeEntryMode('scan')}
          >
            Scan ID
          </button>
          <button
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: `2px solid ${entryMode() === 'import' ? 'var(--primary-color)' : 'var(--border-color)'}`,
              'border-radius': 'var(--border-radius-md)',
              background: entryMode() === 'import' ? 'var(--primary-color)' : 'transparent',
              color: entryMode() === 'import' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              'font-weight': '600',
              transition: 'all 0.2s'
            }}
            onClick={() => handleChangeEntryMode('import')}
          >
            Import from Notary
          </button>
        </div>

        {/* ID Scan Message */}
        <Show when={idScanMessage()}>
          <div style={{
            padding: '0.75rem 1rem',
            'margin-bottom': '1rem',
            'border-radius': 'var(--border-radius-md)',
            background: idScanMessage()?.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${idScanMessage()?.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: idScanMessage()?.type === 'success' ? '#059669' : '#dc2626',
            'font-size': '0.875rem'
          }}>
            {idScanMessage()?.text}
          </div>
        </Show>

        {/* Scan ID Section - show scanner options when in scan mode and no data yet */}
        <Show when={entryMode() === 'scan' && !scannedIdInfo()}>
          {/* Scanner Type Toggle */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            'margin-bottom': '1rem'
          }}>
            <button
              onClick={() => setScannerMode('id')}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                border: `2px solid ${scannerMode() === 'id' ? '#10b981' : 'var(--border-color)'}`,
                'border-radius': '8px',
                background: scannerMode() === 'id' ? '#10b981' : 'transparent',
                color: scannerMode() === 'id' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                'font-weight': '600',
                'font-size': '0.875rem'
              }}
            >
              Driver's License
            </button>
            <button
              onClick={() => setScannerMode('passport')}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                border: `2px solid ${scannerMode() === 'passport' ? '#3b82f6' : 'var(--border-color)'}`,
                'border-radius': '8px',
                background: scannerMode() === 'passport' ? '#3b82f6' : 'transparent',
                color: scannerMode() === 'passport' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                'font-weight': '600',
                'font-size': '0.875rem'
              }}
            >
              Passport
            </button>
          </div>

          {/* External Scanner Input (Primary Option) */}
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%)',
            'border-radius': '12px',
            border: '1px solid #e9d5ff'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.75rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" style={{ width: '20px', height: '20px' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span style={{ 'font-weight': '600', color: '#7c3aed' }}>Scan with External Scanner</span>
              <span style={{ 'font-size': '0.75rem', color: '#9333ea', background: '#f3e8ff', padding: '0.125rem 0.5rem', 'border-radius': '9999px' }}>Recommended</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'stretch' }}>
              <input
                type="text"
                value={externalScanInput()}
                onInput={(e) => setExternalScanInput(e.currentTarget.value)}
                onKeyDown={handleExternalInputKeyDown}
                placeholder={scannerMode() === 'id' ? "Click here and scan ID barcode..." : "Click here and scan passport MRZ..."}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  'font-size': '0.9375rem',
                  border: '2px solid #c4b5fd',
                  'border-radius': '8px',
                  background: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#c4b5fd'}
                autofocus
              />
              <button
                onClick={handleExternalScanSubmit}
                style={{
                  padding: '0.75rem 1.25rem',
                  'font-size': '0.9375rem',
                  'font-weight': '600',
                  'border-radius': '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  'white-space': 'nowrap'
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Process
              </button>
            </div>

            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-top': '0.75rem' }}>
              <span style={{ 'font-size': '0.75rem', color: '#7c3aed' }}>
                {scannerMode() === 'id' ? 'Scan the PDF417 barcode on the back of the ID' : 'Scan the MRZ zone at the bottom of the passport'}
              </span>
              <button
                onClick={() => setShowIdScanner(true)}
                style={{
                  padding: '0.375rem 0.75rem',
                  'font-size': '0.75rem',
                  'font-weight': '500',
                  'border-radius': '6px',
                  border: '1px solid #c4b5fd',
                  background: 'white',
                  color: '#7c3aed',
                  cursor: 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.375rem',
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                  <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                Use Camera Instead
              </button>
            </div>
          </div>

          {/* ML Camera Scanner */}
          <Show when={showIdScanner()}>
            <div style={{
              'margin-bottom': '1rem',
              'border-radius': '12px',
              overflow: 'hidden',
              border: '2px solid var(--primary-color)'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '0.75rem 1rem',
                background: 'var(--primary-color)',
                color: 'white'
              }}>
                <span style={{ 'font-weight': '600' }}>
                  {scannerMode() === 'id' ? 'Scanning Driver\'s License' : 'Scanning Passport'}
                </span>
                <button
                  onClick={() => setShowIdScanner(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    'border-radius': '4px',
                    padding: '0.25rem 0.5rem',
                    color: 'white',
                    cursor: 'pointer',
                    'font-size': '0.875rem'
                  }}
                >
                  Close
                </button>
              </div>
              <Show when={scannerMode() === 'id'}>
                <MLIDScanner
                  onScan={handleMLScanResult}
                  onError={(err) => {
                    devLog('Scanner error:', err);
                    setIdScanMessage({ type: 'error', text: err.message });
                  }}
                  autoStart={true}
                  showGuides={true}
                />
              </Show>
              <Show when={scannerMode() === 'passport'}>
                <MLPassportScanner
                  onScan={handleMLScanResult}
                  onError={(err) => {
                    devLog('Scanner error:', err);
                    setIdScanMessage({ type: 'error', text: err.message });
                  }}
                  autoStart={true}
                  showGuides={true}
                />
              </Show>
            </div>
          </Show>
        </Show>

        {/* Scanned ID Info Display */}
        <Show when={scannedIdInfo()}>
          <div style={{
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid #10b981',
            'border-radius': 'var(--border-radius-md)',
            'margin-bottom': '1.5rem'
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.75rem' }}>
              <div style={{ 'font-weight': '600', color: '#059669', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span>✓</span> ID Scanned Successfully
              </div>
              <button
                style={{
                  padding: '0.25rem 0.75rem',
                  border: '1px solid #10b981',
                  'border-radius': 'var(--border-radius-sm)',
                  background: 'transparent',
                  color: '#059669',
                  cursor: 'pointer',
                  'font-size': '0.75rem'
                }}
                onClick={() => setShowIdScanner(true)}
              >
                Rescan
              </button>
            </div>
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.5rem', 'font-size': '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ID Number:</span>{' '}
                <span style={{ 'font-weight': '500' }}>{scannedIdInfo()?.idNumber}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>State:</span>{' '}
                <span style={{ 'font-weight': '500' }}>{scannedIdInfo()?.idState}</span>
              </div>
              <Show when={scannedIdInfo()?.expirationDate}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Expires:</span>{' '}
                  <span style={{ 'font-weight': '500' }}>{scannedIdInfo()?.expirationDate}</span>
                </div>
              </Show>
              <Show when={scannedIdInfo()?.gender}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Gender:</span>{' '}
                  <span style={{ 'font-weight': '500' }}>{scannedIdInfo()?.gender}</span>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Notary Client Search - only show in import mode */}
        <Show when={entryMode() === 'import'}>
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <label style={{
              display: 'block',
              'font-weight': '500',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              Search Notary Client
            </label>
            <CustomerSearchDropdown
              placeholder="Search by name, email, or A#..."
              onSelect={handleNotaryCustomerSelect}
            />
            <Show when={selectedNotaryClient()}>
              <div style={{
                'margin-top': '0.75rem',
                padding: '0.75rem',
                background: 'var(--success-light, #d1fae5)',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem',
                color: 'var(--success-color, #059669)'
              }}>
                Client data loaded. Review and edit fields below before creating.
              </div>
            </Show>
          </div>
        </Show>

        {/* Client Label - Full Name + Tax Year */}
        <Show when={newClient().firstName || newClient().lastName}>
          <div style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            'border-radius': '8px',
            'margin-bottom': '1rem',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <svg viewBox="0 0 20 20" fill="white" style={{ width: '20px', height: '20px' }}>
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
              <span style={{
                color: 'white',
                'font-weight': '600',
                'font-size': '1.1rem',
                'text-transform': 'uppercase',
                'letter-spacing': '0.5px'
              }}>
                {[newClient().firstName, newClient().middleName, newClient().lastName].filter(Boolean).join(' ')}
              </span>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '0.25rem 0.75rem',
              'border-radius': '20px',
              color: 'white',
              'font-weight': '600',
              'font-size': '0.875rem'
            }}>
              Tax Return {newClient().taxYear}
            </div>
          </div>
        </Show>

        {/* Basic Info */}
        <div style={formGridStyle}>
          <FormInput
            label="First Name"
            value={newClient().firstName}
            onChange={(value) => setNewClient({ ...newClient(), firstName: value })}
            required
            placeholder="Enter first name"
          />
          <FormInput
            label="Middle Name"
            value={newClient().middleName}
            onChange={(value) => setNewClient({ ...newClient(), middleName: value })}
            placeholder="Enter middle name"
          />
          <FormInput
            label="Last Name"
            value={newClient().lastName}
            onChange={(value) => setNewClient({ ...newClient(), lastName: value })}
            required
            placeholder="Enter last name"
          />
          <FormInput
            label="SSN"
            value={newClient().ssn}
            onChange={(value) => setNewClient({ ...newClient(), ssn: value })}
            placeholder="XXX-XX-XXXX"
          />
        </div>

        {/* Contact Info */}
        <div style={{ ...formGridStyle, 'margin-top': '1rem' }}>
          <FormInput
            label="Email"
            type="email"
            value={newClient().email}
            onChange={(value) => setNewClient({ ...newClient(), email: value })}
            placeholder="client@email.com"
          />
          <FormInput
            label="Phone"
            type="tel"
            value={newClient().phone}
            onChange={(value) => setNewClient({ ...newClient(), phone: value })}
            placeholder="(555) 123-4567"
          />
          <FormInput
            label="Date of Birth"
            type="date"
            value={newClient().dateOfBirth}
            onChange={(value) => setNewClient({ ...newClient(), dateOfBirth: value })}
          />
        </div>

        {/* Address - show for imported or scanned clients */}
        <Show when={(entryMode() === 'import' && selectedNotaryClient()) || (entryMode() === 'scan' && scannedIdInfo())}>
          <div style={{ 'margin-top': '1rem' }}>
            <label style={{
              display: 'block',
              'font-weight': '500',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              Address {entryMode() === 'scan' ? '(from ID)' : '(from Notary)'}
            </label>
            <div style={formGridStyle}>
              <div style={{ 'grid-column': 'span 2' }}>
                <FormInput
                  label=""
                  value={newClient().address}
                  onChange={(value) => setNewClient({ ...newClient(), address: value })}
                  placeholder="Street address"
                />
              </div>
              <FormInput
                label=""
                value={newClient().city}
                onChange={(value) => setNewClient({ ...newClient(), city: value })}
                placeholder="City"
              />
              <FormInput
                label=""
                value={newClient().state}
                onChange={(value) => setNewClient({ ...newClient(), state: value })}
                placeholder="State"
              />
              <FormInput
                label=""
                value={newClient().zipCode}
                onChange={async (value) => {
                  setNewClient({ ...newClient(), zipCode: value });
                  // Auto-lookup city/state when ZIP is 5 digits
                  const cleanZip = value.replace(/\D/g, '');
                  if (cleanZip.length === 5) {
                    const result = await lookupZipCode(cleanZip);
                    if (result) {
                      setNewClient(prev => ({
                        ...prev,
                        city: result.city,
                        state: result.stateAbbreviation
                      }));
                    }
                  }
                }}
                placeholder="ZIP Code"
              />
            </div>
          </div>
        </Show>

        {/* Tax Year Selection */}
        <div style={{ 'margin-top': '1rem' }}>
          <label style={{
            display: 'block',
            'font-weight': '500',
            'margin-bottom': '0.5rem',
            color: 'var(--text-primary)'
          }}>
            Tax Year
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <For each={[2024, 2025]}>
              {(year) => (
                <button
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: `2px solid ${newClient().taxYear === year ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    'border-radius': 'var(--border-radius-md)',
                    background: newClient().taxYear === year ? 'var(--primary-color)' : 'transparent',
                    color: newClient().taxYear === year ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    'font-weight': '600',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setNewClient({ ...newClient(), taxYear: year })}
                >
                  {year}
                </button>
              )}
            </For>
          </div>
        </div>

        <div style={formActionsStyle}>
          <Button variant="secondary" onClick={() => setShowNewClientModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateClient}
            disabled={!newClient().firstName.trim() || !newClient().lastName.trim() || isCreating()}
          >
            {isCreating() ? 'Creating...' : 'Create Client'}
          </Button>
        </div>
      </Modal>

    </div>
  );
};

export default TaxClientListPage;
