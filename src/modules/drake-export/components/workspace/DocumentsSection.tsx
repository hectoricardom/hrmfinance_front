/**
 * DocumentsSection
 * Workspace component displaying documents table with status, actions, and upload area
 */

import { Component, createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { Card, Button } from '../../../ui';
import {
  uploadTaxDocument,
  processTaxDocument,
  deleteTaxDocument,
  verifyTaxDocument,
  updateTaxDocument,
} from '../../services/taxDocumentApi';

import { createDocumentRequest, getTaxPortals } from '../../services/taxPortalApi';
import type { DrakeTaxDocument, TaxPortal, DocumentCategory } from '../../types/drakeTypes';
import { DRAKE_FORM_LABELS, categorizeDocument, DOCUMENT_CATEGORY_CONFIG } from '../../types/drakeTypes';
import QRCodeViewer from '../../../../components/QRCodeViewer';
import { fetchGraphQLSS, fetchPublicSS, devLog, formatDateMMDDYYYY } from '../../../../services/utils';
import { authStore } from '../../../../stores/authStore';
import { QrButton } from './ClientInfoSection';
import MultiQRCodeViewer from '../../../../components/QRCodeViewerMulti';
import ExpectedDocumentsTracker from './ExpectedDocumentsTracker';
import { TaxFormViewer, PersonalDocViewer, BankDocViewer } from './doc-viewers';
import type { ExpectedDocument } from '../../services/recurringClientService';
import { BatchScanCapture, processScannedDocument } from '../../../scan-station';
import type { ScanResult } from '../../../scan-station';

interface DocumentsSectionProps {
  taxPortalId?: string;
  documents: DrakeTaxDocument[];
  spouseDocuments?: DrakeTaxDocument[];
  linkedSpouse?: TaxPortal | null;
  onRefresh?: () => void;
  taxPortal?: TaxPortal;
  client?: TaxPortal;
  taxYear?: number;
  onDocumentsChange?: (docs: DrakeTaxDocument[]) => void;
  expectedDocs?: ExpectedDocument[];
  isReturningClient?: boolean;
  /** When true, auto-expand the scan panel on mount */
  autoOpenScan?: boolean;
  /** Callback fired after a document is successfully uploaded/scanned */
  onDocumentUploaded?: (docType?: string) => void;
  /** Callback to update client info (used by personal doc auto-fill) */
  onClientChange?: (updates: Partial<TaxPortal>) => void;
}

type DocumentStatus = 'verified' | 'needs_review' | 'missing' | 'analyzing' | 'error';

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

const DocumentsSection: Component<DocumentsSectionProps> = (props) => {
  const [isDragOver, setIsDragOver] = createSignal(false);
  const [isUploading, setIsUploading] = createSignal(false);
  const [uploadError, setUploadError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  const [isRequestingFromClient, setIsRequestingFromClient] = createSignal(false);
  const [isSyncingPayers, setIsSyncingPayers] = createSignal(false);
  const [selectedDocument, setSelectedDocument] = createSignal<DrakeTaxDocument | null>(null);
  const [showQRCode, setShowQRCode] = createSignal(false);
  const [qrText, setQrText] = createSignal('');

  const [showQRCodeM, setShowQRCodeM] = createSignal(false);
  const [qrTextM, setQrTextM] = createSignal(['']);

  // Scan mode state
  const [showScanMode, setShowScanMode] = createSignal(false);
  const [isProcessingScan, setIsProcessingScan] = createSignal(false);
  const [scanProgress, setScanProgress] = createSignal('');

  // Auto-open scan panel from URL params
  createEffect(() => {
    if (props.autoOpenScan) {
      setShowScanMode(true);
    }
  });

  // Handle scanned files from BatchScanCapture
  const handleScanFilesReady = async (files: File[]) => {
    if (files.length === 0) return;

    setIsProcessingScan(true);
    setScanProgress(`Processing 0/${files.length} documents...`);

    try {
      const portalId = getPortalId();
      const year = getTaxYear();

      for (let i = 0; i < files.length; i++) {
        setScanProgress(`Processing ${i + 1}/${files.length}: ${files[i].name}`);

        try {
          // Run AI classification/extraction
          const scanResult = await processScannedDocument(
            files[i],
            portalId,
            year,
            (status, progress) => {
              setScanProgress(`${files[i].name}: ${status} (${Math.round(progress)}%)`);
            }
          );

          // Upload via existing API with pre-classified metadata
          const uploadResult = await uploadTaxDocument(
            files[i],
            portalId,
            year,
          );

          if (uploadResult.success && uploadResult.documentId) {
            await processTaxDocument(uploadResult.documentId);
            props.onDocumentUploaded?.(scanResult.classification?.documentType);
          }
        } catch (err) {
          devLog(`Error processing scanned file ${files[i].name}:`, err);
        }
      }

      setSuccessMessage(`Scanned and uploaded ${files.length} document(s)`);
      setTimeout(() => setSuccessMessage(null), 3000);
      handleRefresh();
    } catch (err) {
      setUploadError(`Scan processing error: ${(err as Error).message}`);
    } finally {
      setIsProcessingScan(false);
      setScanProgress('');
    }
  };

  // Document reassignment state
  const [showReassignModal, setShowReassignModal] = createSignal(false);
  const [reassignSearchQuery, setReassignSearchQuery] = createSignal('');
  const [reassignSearchResults, setReassignSearchResults] = createSignal<TaxPortal[]>([]);
  const [isSearchingClients, setIsSearchingClients] = createSignal(false);
  const [isReassigning, setIsReassigning] = createSignal(false);

  // Helper: Get portal/client ID
  const getPortalId = () => props.client?.id || props.taxPortal?.id || props.taxPortalId || '';

  // Helper: Get tax portal object
  const getTaxPortal = () => props.client || props.taxPortal;

  // Helper: Get tax year
  const getTaxYear = () => props.taxYear || new Date().getFullYear();

  // Helper: Get document validation warnings
  const getDocumentWarnings = (doc: DrakeTaxDocument): string[] => {
    const warnings: string[] = [];
    const expectedYear = getTaxYear();
    const portal = getTaxPortal();

    // Year mismatch
    if (doc.taxYear && doc.taxYear !== expectedYear) {
      warnings.push(`Year mismatch: document is ${doc.taxYear}, expected ${expectedYear}`);
    }

    // Get recipient info from extractedData (server) or fallback to extractedAmounts
    const recipientNameRaw = doc.extractedData?.recipientName || doc.extractedAmounts?.recipientName;
    const recipientSSNRaw = doc.extractedData?.recipientSSN || doc.extractedAmounts?.recipientSSN;

    // Recipient name mismatch
    if (recipientNameRaw && portal) {
      const recipientName = recipientNameRaw.toLowerCase().trim();
      const taxpayerName = `${portal.firstName} ${portal.lastName}`.toLowerCase().trim();
      const taxpayerNameReversed = `${portal.lastName} ${portal.firstName}`.toLowerCase().trim();
      let nameMatches = recipientName.includes(taxpayerName) || recipientName.includes(taxpayerNameReversed)
        || taxpayerName.includes(recipientName);

      if (!nameMatches && portal.spouse) {
        const spouseName = `${portal.spouse.firstName} ${portal.spouse.lastName}`.toLowerCase().trim();
        const spouseNameReversed = `${portal.spouse.lastName} ${portal.spouse.firstName}`.toLowerCase().trim();
        nameMatches = recipientName.includes(spouseName) || recipientName.includes(spouseNameReversed)
          || spouseName.includes(recipientName);
      }

      if (!nameMatches) {
        const expected = portal.spouse
          ? `${portal.firstName} ${portal.lastName} or ${portal.spouse.firstName} ${portal.spouse.lastName}`
          : `${portal.firstName} ${portal.lastName}`;
        warnings.push(`Name mismatch: "${recipientNameRaw}" doesn't match ${expected}`);
      }
    }

    // SSN mismatch (last 4 digits)
    if (recipientSSNRaw && portal) {
      const docSSN = recipientSSNRaw.replace(/\D/g, '').slice(-4);
      const taxpayerLast4 = portal.ssn?.replace(/\D/g, '').slice(-4);
      const spouseLast4 = portal.spouse?.ssn?.replace(/\D/g, '').slice(-4);
      const ssnMatches = (taxpayerLast4 && docSSN === taxpayerLast4) || (spouseLast4 && docSSN === spouseLast4);

      if (!ssnMatches) {
        warnings.push(`SSN mismatch: document SSN (***${docSSN}) doesn't match taxpayer${portal.spouse ? ' or spouse' : ''}`);
      }
    }

    return warnings;
  };

  // Helper: Call refresh callbacks
  const handleRefresh = () => {
    props.onRefresh?.();
  };
  let fileInputRef: HTMLInputElement | undefined;

  // Combined documents (taxpayer + spouse) with owner marker
  const allDocuments = createMemo(() => {
    const taxpayerDocs = props.documents.map(d => ({ ...d, _isSpouseDoc: false }));
    const spouseDocs = (props.spouseDocuments || []).map(d => ({ ...d, _isSpouseDoc: true }));
    return [...taxpayerDocs, ...spouseDocs];
  });

  // Category collapse state
  const [collapsedCategories, setCollapsedCategories] = createSignal<Record<DocumentCategory, boolean>>({
    tax: false, personal: false, bank: false, other: false
  });

  const toggleCategory = (cat: DocumentCategory) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group documents by category
  const groupedDocuments = createMemo(() => {
    const groups: Record<DocumentCategory, (DrakeTaxDocument & { _isSpouseDoc: boolean })[]> = {
      tax: [], personal: [], bank: [], other: []
    };
    for (const doc of allDocuments()) {
      const category = categorizeDocument(doc);
      groups[category].push(doc);
    }
    return groups;
  });

  // Extract personal info from personal documents for auto-fill
  const extractedPersonalInfo = createMemo(() => {
    const personalDocs = groupedDocuments().personal;
    const info: Record<string, string | undefined> = {};
    for (const doc of personalDocs) {
      const data = doc.extractedData || {};
      const ai = doc.aiAnalysis?.extractedData || {} as any;
      const amounts = doc.extractedAmounts || {};
      // Server nests detailed ID/passport data under identificationData
      const id = (data as any).identificationData || {} as any;
      const idAddr = id.address || {} as any;

      // Name: prefer identificationData (most detailed)
      const fullName =
        [id.firstName, id.middleName, id.lastName].filter(Boolean).join(' ') ||
        data.recipientName || amounts.recipientName
        || [data.firstName || ai.firstName, data.middleName || ai.middleName, data.lastName || ai.lastName].filter(Boolean).join(' ')
        || id.fullName || ai.recipientName || ai.fullName
        || '';
      if (fullName) info.name = fullName;
      // Preserve separate name parts when available
      if (id.firstName || data.firstName || ai.firstName) info.firstName = id.firstName || data.firstName || ai.firstName;
      if (id.middleName || data.middleName || ai.middleName) info.middleName = id.middleName || data.middleName || ai.middleName;
      if (id.lastName || data.lastName || ai.lastName) info.lastName = id.lastName || data.lastName || ai.lastName;
      if (id.dateOfBirth || data.dateOfBirth || ai.dateOfBirth || ai.dob) info.dateOfBirth = id.dateOfBirth || data.dateOfBirth || ai.dateOfBirth || ai.dob;
      if (id.socialSecurityNumber || data.ssn || data.recipientSSN || ai.ssn || ai.recipientSSN)
        info.ssn = id.socialSecurityNumber || data.ssn || data.recipientSSN || ai.ssn || ai.recipientSSN;
      if (idAddr.street || data.address || ai.address) info.address = idAddr.street || data.address || ai.address;
      if (idAddr.city || data.city || ai.city) info.city = idAddr.city || data.city || ai.city;
      if (idAddr.state || data.state || ai.state) info.state = idAddr.state || data.state || ai.state;
      if (idAddr.zipCode || data.zipCode || ai.zipCode) info.zipCode = idAddr.zipCode || data.zipCode || ai.zipCode;
      if (id.documentNumber || data.idNumber || data.documentNumber || ai.documentNumber || ai.idNumber || ai.passportNumber)
        info.idNumber = id.documentNumber || data.idNumber || data.documentNumber || ai.documentNumber || ai.idNumber || ai.passportNumber;
      if (id.expirationDate || data.expirationDate || ai.expirationDate || ai.expDate)
        info.expirationDate = id.expirationDate || data.expirationDate || ai.expirationDate || ai.expDate;
      if (id.issueDate || data.issueDate || ai.issueDate) info.issueDate = id.issueDate || data.issueDate || ai.issueDate;
      if (id.issuingState || data.idState || ai.issuingState) info.idState = id.issuingState || data.idState || ai.issuingState;
      if (id.gender || data.gender || ai.gender) info.gender = id.gender || data.gender || ai.gender;
      // Track document type for proper idType detection
      const docType = (doc.documentType as string) || id.idType || doc.aiAnalysis?.detectedType || doc.aiAnalysis?.documentType || '';
      if (docType) info._documentType = docType;
      // Country/nationality
      if (id.issuingCountry || ai.issuingCountry || ai.country || ai.nationality)
        info.country = id.issuingCountry || ai.issuingCountry || ai.country || ai.nationality;
      // Height, eye color
      if (id.height) info.height = id.height;
      if (id.eyeColor) info.eyeColor = id.eyeColor;
    }
    return info;
  });

  // Handle auto-fill client info from personal documents
  const handleAutoFillFromPersonalDocs = () => {
    const info = extractedPersonalInfo();
    if (!props.onClientChange) return;

    const updates: Partial<TaxPortal> = {};
    // Use separate name parts when available; fall back to splitting full name
    if (info.firstName || info.lastName) {
      if (info.firstName) updates.firstName = info.firstName;
      if (info.middleName) updates.middleName = info.middleName;
      if (info.lastName) updates.lastName = info.lastName;
    } else if (info.name) {
      const parts = info.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        updates.firstName = parts[0];
        updates.lastName = parts[parts.length - 1];
        if (parts.length > 2) updates.middleName = parts.slice(1, -1).join(' ');
      }
    }
    if (info.dateOfBirth) updates.dateOfBirth = info.dateOfBirth;
    if (info.ssn) updates.ssn = info.ssn;
    if (info.address) updates.address = info.address;
    if (info.city) updates.city = info.city;
    if (info.state) updates.state = info.state;
    if (info.zipCode) updates.zipCode = info.zipCode;
    if (info.idNumber || info.idState || info.expirationDate || info.issueDate) {
      // Detect ID type from the document type or infer from fields
      let docType = info._documentType || '';
      // If generic, infer from extracted data
      if (!docType || docType === 'other') {
        if (info.country) docType = 'passport';
        else if (info.idState) docType = 'driver_license';
      }
      let idType: 'drivers_license' | 'state_id' | 'passport' | 'other' = 'drivers_license';
      if (/passport/i.test(docType)) idType = 'passport';
      else if (/state.?id/i.test(docType)) idType = 'state_id';
      else if (/green.?card|visa|i-?94|i-?551/i.test(docType)) idType = 'other';

      updates.idInfo = {
        idNumber: info.idNumber || '',
        idState: info.idState || '',
        expirationDate: info.expirationDate,
        issueDate: info.issueDate,
        idType,
        gender: info.gender as any,
        country: info.country,
      };
    }

    props.onClientChange(updates);
    setSuccessMessage('Client info auto-filled from personal documents');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Get document status
  const getDocumentStatus = (doc: DrakeTaxDocument): DocumentStatus => {
    if (doc.uploadStatus === 'error') return 'error';
    if (doc.uploadStatus === 'analyzing' || doc.uploadStatus === 'uploading') return 'analyzing';
    if (doc.verified) return 'verified';
    if (doc.uploadStatus === 'analyzed') return 'needs_review';
    return 'needs_review';
  };

  // Group documents by status for summary (includes spouse docs)
  const documentStats = createMemo(() => {
    const docs = allDocuments();
    const spouseDocs = props.spouseDocuments || [];
    return {
      total: docs.length,
      verified: docs.filter(d => d.verified).length,
      needsReview: docs.filter(d => !d.verified && d.uploadStatus === 'analyzed').length,
      analyzing: docs.filter(d => d.uploadStatus === 'analyzing' || d.uploadStatus === 'uploading').length,
      errors: docs.filter(d => d.uploadStatus === 'error').length,
      taxpayerCount: props.documents.length,
      spouseCount: spouseDocs.length,
      yearMismatch: docs.filter(d => d.taxYear && d.taxYear !== getTaxYear()).length
    };
  });

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status config for display
  const getStatusConfig = (status: DocumentStatus) => {
    const configs = {
      verified: {
        label: 'Verified',
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.1)'
      },
      needs_review: {
        label: 'Needs Review',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.1)'
      },
      missing: {
        label: 'Missing',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.1)'
      },
      analyzing: {
        label: 'Analyzing...',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.1)'
      },
      error: {
        label: 'Error',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.1)'
      }
    };
    return configs[status];
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => ACCEPTED_FILE_TYPES.includes(f.type));

    if (fileArray.length === 0) {
      setUploadError('Please select PDF, JPG, or PNG files');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const file of fileArray) {
        const uploadResult = await uploadTaxDocument(
          file,
          getPortalId(),
          getTaxYear()
        );

        if (uploadResult.success && uploadResult.documentId) {
          // Process the uploaded document
          await processTaxDocument(uploadResult.documentId);
        } else {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      }

      setSuccessMessage(`Successfully uploaded ${fileArray.length} document(s)`);
      setTimeout(() => setSuccessMessage(null), 3000);
      handleRefresh();
      props.onDocumentUploaded?.();
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drop
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer?.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      handleFileUpload(input.files);
    }
    input.value = '';
  };

  // Handle view document - shows details panel
  const handleViewDocument = (doc: DrakeTaxDocument) => {
    setSelectedDocument(doc);
  };

  // Handle open document in new tab
  const handleOpenDocument = async (doc: DrakeTaxDocument) => {


      let metaD = await fetchGraphQLSS({
          query: "getSignedTaxDocumentUrl",
          params: { businessId: authStore.getBusinessId(), id: doc?.id }
      })

    if (doc.fileUrl) {
      window.open(metaD?.signedUrl, '_blank');
    }
  };

  // Close document details
  const handleCloseDetails = () => {
    setSelectedDocument(null);
  };






  // Generate QR text from document based on type
  const generateDocumentQRText = (doc: DrakeTaxDocument): string => {
    const amounts = doc.extractedAmounts || {};
    const payer = doc.payerInfo || {};

    switch (doc.drakeFormType) {
      case 'w2':
        // W-2 format: EIN|Employer Name|Address|City|State|Zip|Box1|Box2|Box3|Box4|Box5|Box6|Box16|Box17
        return [
          payer.ein?.split('-')?.[0] || '',
          payer.ein?.split('-')?.[1] || '','|', 
           payer.name || '', '|', 
          payer.address || '', '|', 
          '|', 
          payer.zip || '', '|', 
          '|', 
          '|', 
          '|', 
          '|', 
          amounts.wages || '', '|',  //Box1 
          amounts.wages || '', '|',  // Box1 Verify
          amounts.federalTaxWithheld || '', '|',  //Box2 
          amounts.federalTaxWithheld || '', '|',  // Box2 Verify
          amounts.socialSecurityWages || '','|', 
          amounts.socialSecurityTax || '','|', 
          amounts.medicareWages || '','|', 
          amounts.medicareTax || '','|', 
          '|','|','|','|','|','|','|',
          '|','|','|','|','|','|','|',
          '|','|','|','|','|','|','|',
          '|','|','|','|','|','|','|',
          '|','|','|','|','|','|','|',
          '|','|','|','|','|','|',
          amounts.stateWages || '','|', 
          amounts.stateWages || '','|', 
          amounts.stateTaxWithheld || '','|', 
          amounts.stateTaxWithheld || '','|', 


        ].join('');

      case '1099_nec':
        // 1099-NEC format: EIN|Payer Name|Address|City|State|Zip|Box1|Box4
        return [
          payer?.ein || '', '|',
           '|',
          payer?.name || '', '|',
           '|',
          payer?.address || '', '|',
          payer?.zip?.split('-')?.[0] || '', '|',
          '|','|','|','|','|',
           '|','|','|','|','|', 
           '|','|',
           amounts.nonEmployeeCompensation || '888', '|',
          '|',
          '|',
          '|',
          amounts.federalTaxWithheld || '','|',

        ].join('');

      case '1099_misc':
        // 1099-MISC format: EIN|Payer Name|Address|City|State|Zip|Box1|Box2|Box3|Box4
        return [
          payer.ein || '', '|',
          payer.name || '', '|',
          payer.address || '', '|',
          payer.zip || '', '|',
         
           
          amounts.rents || '','|',
          amounts.royalties || '','|',
          amounts.otherIncome || '','|',
          amounts.federalTaxWithheld || '', '|',
        ].join('');

      case '1099_int':
        // 1099-INT format: EIN|Payer Name|Address|City|State|Zip|Box1|Box4
        return [
          payer.ein || '',
          payer.name || '',
          payer.address || '',
          payer.city || '',
          payer.state || '',
          payer.zip || '',
          amounts.interestIncome || '',
          amounts.federalTaxWithheld || ''
        ].join('|');

      case '1099_div':
        // 1099-DIV format: EIN|Payer Name|Address|City|State|Zip|Box1a|Box1b|Box2a|Box4
        return [
          payer.ein || '',
          payer.name || '',
          payer.address || '',
          payer.city || '',
          payer.state || '',
          payer.zip || '',
          amounts.ordinaryDividends || '',
          amounts.qualifiedDividends || '',
          amounts.capitalGains || '',
          amounts.federalTaxWithheld || ''
        ].join('|');

      case '1098':
        // 1098 format: EIN|Lender Name|Address|City|State|Zip|Box1|Box5|Box10
        return [
          payer.ein || '',
          payer.name || '',
          payer.address || '',
          payer.city || '',
          payer.state || '',
          payer.zip || '',
          amounts.mortgageInterest || '',
          amounts.mortgageInsurance || '',
          amounts.propertyTaxes || ''
        ].join('|');

      case '1098_t':
        // 1098-T format: EIN|Institution Name|Address|City|State|Zip|Box1|Box5
        return [
          payer.ein || '',
          payer.name || '',
          payer.address || '',
          payer.city || '',
          payer.state || '',
          payer.zip || '',
          amounts.tuitionPaid || '',
          amounts.scholarshipsGrants || ''
        ].join('|');

      case '1099_k':
        // 1099-K format: EIN|PSE Name|Address|City|State|Zip|Box1a|Box1b|Box3|Box4
        return [
          payer.ein || '',
          payer.name || amounts.pseName || '',
          payer.address || '',
          payer.city || '',
          payer.state || '',
          payer.zip || '',
          amounts.grossAmount1099K || '',
          amounts.cardNotPresentTransactions || '',
          amounts.numberOfTransactions || '',
          amounts.federalTaxWithheld1099K || ''
        ].join('|');

      default:
        // Generic format for other document types
        const allAmounts = Object.entries(amounts)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([_, v]) => v);
        return [
          payer.ein || '',
          payer.name || '',
          ...allAmounts
        ].join('|');
    }
  };


  const handleQRMonthly = ():string => {
    let mnt=['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    let sst:any = []
    mnt.forEach((mn, index)=>{
      const premium = selectedDocument()?.extractedAmounts?.monthlyPremiums?.[index] || 0;
      const slcsp = selectedDocument()?.extractedAmounts?.monthlySlcsp?.[index] || 0;
      const aptc = selectedDocument()?.extractedAmounts?.monthlyAptc?.[index] || 0;
      sst.push(premium)
      sst.push(slcsp)
      sst.push(aptc)
    })
    return sst.join('|');
  }
  
  
  
  
  // Handle show QR code for document
  const handleShowDocumentQR = (doc: any) => {
    if (doc.taxYear && doc.taxYear !== getTaxYear()) {
      setUploadError(`Cannot generate QR: document year (${doc.taxYear}) doesn't match workspace year (${getTaxYear()}). Reassign this document to the correct client.`);
      return;
    }
    const text = generateDocumentQRText(doc);
    setQrText(text);
    setShowQRCode(true);
  };



  
  // Handle show QR code for document - generates multiple QR codes based on document type
  const handleShowMultiDocumentQR = (doc: DrakeTaxDocument) => {
    if (doc.taxYear && doc.taxYear !== getTaxYear()) {
      setUploadError(`Cannot generate QR: document year (${doc.taxYear}) doesn't match workspace year (${getTaxYear()}). Reassign this document to the correct client.`);
      return;
    }
    const amounts = doc.extractedAmounts || {};
    const payer = doc.payerInfo || {};

    devLog('Generating multi QR for document:', doc.drakeFormType, doc);

    // Common payer info QR
    const payerTxt = [
      payer.ein || '', '|',
      payer.name || '', '|',
      payer.address || '', '|', '|',
      payer.zip || '', '|',
    ].join('');

    let qrTexts: string[] = [];

    switch (doc.drakeFormType) {
      case 'w2': {
        // W-2: Payer, Federal amounts, State/Local amounts, Box 12, Box 14
        const federalTxt = [
          amounts.wages || '', '|',  //Box1
          amounts.wages || '', '|',  // Box1 Verify
          amounts.federalTaxWithheld || '', '|',  //Box2
          amounts.federalTaxWithheld || '', '|',  // Box2 Verify
          amounts.socialSecurityWages || '', '|', // Box3
          amounts.socialSecurityTax || '', '|', // Box4
          amounts.medicareWages || '', '|', // Box5
          amounts.medicareTax || '', '|', // Box6
          amounts.socialSecurityTips || '', '|', // Box7
          amounts.allocatedTips || '', '|', // Box8
          amounts.dependentCareBenefits || '', '|', // Box10
          amounts.nonqualifiedPlans || '', '|', // Box11
        ].join('');

        const localTxt = [
          amounts.employerStateId || '', '|',
          amounts.stateWages || '', '|',
          amounts.stateWages || '', '|',
          amounts.stateTaxWithheld || '', '|',
          amounts.stateTaxWithheld || '', '|',
          amounts.localWages || '', '|',
          amounts.localTaxWithheld || '', '|',
          amounts.localityName || '', '|',
        ].join('');

        // Box 12 codes (retirement contributions, health savings, etc.)
        const box12Txt = (amounts.box12Codes || []).map((item: any) =>
          `${item.code || ''}|${item.amount || ''}`
        ).join('|') || '';

        // Box 14 items (other deductions)
        const box14Txt = (amounts.box14Items || []).map((item: any) =>
          `${item.description || ''}|${item.amount || ''}`
        ).join('|') || '';

        qrTexts = [payerTxt, federalTxt, localTxt];
        if (box12Txt) qrTexts.push(box12Txt);
        if (box14Txt) qrTexts.push(box14Txt);
        break;
      }

      case '1099_nec': {
        // 1099-NEC: Full Drake import format
        // Payer EIN|Name|Address||Zip| then Box 1|Box 1 Verify|Box 4|
        const necFullTxt = [
          payer.ein || '', '|', '|',
          payer.name || '', '|', '|',
          payer.address || '', '|',
          payer.zip?.split('-')?.[0] || '', '|',
          '|', '|', '|', '|', '|', '|', '|', '|', '|',
          amounts.nonEmployeeCompensation || '', '|', // Box 1
          '|', '|', '|',
          amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|', // Box 4
        ].join('');

        const stateTxt = [
          payer.state || '', '|',
          amounts.stateIncome || amounts.nonEmployeeCompensation || '', '|',
          amounts.stateTaxWithheld || '', '|',
          amounts.payerStateNo || '', '|',
        ].join('');

        qrTexts = [necFullTxt, stateTxt];
        break;
      }

      case '1099_misc': {
        // 1099-MISC: Full format with all boxes
        const miscPayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|',
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const miscAmountsTxt = [
          amounts.rents || '', '|', // Box 1
          amounts.royalties || '', '|', // Box 2
          amounts.otherIncome || '', '|', // Box 3
          amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|', // Box 4
          amounts.fishingBoatProceeds || '', '|', // Box 5
          amounts.medicalPayments || '', '|', // Box 6
          amounts.substitutePayments || '', '|', // Box 8
          amounts.cropInsurance || '', '|', // Box 9
          amounts.grossProceeds || '', '|', // Box 10
          amounts.fishPurchased || '', '|', // Box 11
          amounts.section409ADeferrals || '', '|', // Box 12
          amounts.goldenParachute || '', '|', // Box 13
          amounts.nonqualifiedDeferred || '', '|', // Box 14
        ].join('');

        const miscStateTxt = [
          payer.state || '', '|',
          amounts.stateIncome || '', '|',
          amounts.stateTaxWithheld || '', '|',
        ].join('');

        qrTexts = [miscPayerTxt, miscAmountsTxt, miscStateTxt];
        break;
      }

      case '1099_int': {
        // 1099-INT: Full format with all boxes
        const intPayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|',
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const intAmountsTxt = [
          amounts.interestIncome || '', '|', // Box 1
          amounts.earlyWithdrawalPenalty || '', '|', // Box 2
          amounts.usSavingsBondInterest || '', '|', // Box 3
          amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|', // Box 4
          amounts.investmentExpenses || '', '|', // Box 5
          amounts.foreignTaxPaid || '', '|', // Box 6
          amounts.foreignCountry || '', '|', // Box 7
          amounts.taxExemptInterest || '', '|', // Box 8
          amounts.privateBondInterest || '', '|', // Box 9
          amounts.marketDiscount || '', '|', // Box 10
          amounts.bondPremium || '', '|', // Box 11
          amounts.bondPremiumTreasury || '', '|', // Box 12
          amounts.bondPremiumTaxExempt || '', '|', // Box 13
        ].join('');

        const intStateTxt = [
          payer.state || '', '|',
          amounts.stateIncome || amounts.interestIncome || '', '|',
          amounts.stateTaxWithheld || '', '|',
        ].join('');

        qrTexts = [intPayerTxt, intAmountsTxt, intStateTxt];
        break;
      }

      case '1099_div': {
        // 1099-DIV: Full format with all boxes
        const divPayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|',
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const divAmountsTxt = [
          amounts.ordinaryDividends || '', '|', // Box 1a
          amounts.qualifiedDividends || '', '|', // Box 1b
          amounts.capitalGainDistributions || amounts.capitalGains || '', '|', // Box 2a
          amounts.unrecaptured1250Gain || '', '|', // Box 2b
          amounts.section1202Gain || '', '|', // Box 2c
          amounts.collectiblesGain || '', '|', // Box 2d
          amounts.section897OrdinaryDividends || '', '|', // Box 2e
          amounts.section897CapitalGain || '', '|', // Box 2f
          amounts.nondividendDistributions || '', '|', // Box 3
          amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|', // Box 4
          amounts.section199ADividends || '', '|', // Box 5
          amounts.investmentExpenses || '', '|', // Box 6
          amounts.foreignTaxPaid || '', '|', // Box 7
          amounts.foreignCountry || '', '|', // Box 8
          amounts.cashLiquidation || '', '|', // Box 9
          amounts.noncashLiquidation || '', '|', // Box 10
          amounts.exemptInterestDividends || '', '|', // Box 12
          amounts.privateBondDividends || '', '|', // Box 13
        ].join('');

        const divStateTxt = [
          payer.state || '', '|',
          amounts.stateIncome || amounts.ordinaryDividends || '', '|',
          amounts.stateTaxWithheld || '', '|',
        ].join('');

        qrTexts = [divPayerTxt, divAmountsTxt, divStateTxt];
        break;
      }

      case '1099_g': {
        // 1099-G: Full format with all boxes
        // Box 1 - Unemployment, Box 2 - State refund, Box 4 - Fed withheld, Box 10 - Market gain, Box 11 - State tax withheld
        const gPayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|',
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const gAmountsTxt = [
          amounts.unemploymentCompensation || '', '|', // Box 1
          amounts.stateIncomeTaxRefund || '', '|', // Box 2
          amounts.taxYear || '', '|', // Box 3 - Tax Year
          amounts.federalIncomeTaxWithheld || amounts.federalTaxWithheld || '', '|', // Box 4
          amounts.rtaaPayments || '', '|', // Box 5
          amounts.taxableGrants || '', '|', // Box 6
          amounts.agriculturePayments || '', '|', // Box 7
          amounts.tradeAdjustmentAssistance || '', '|', // Box 9
          amounts.marketGain || '', '|', // Box 10a
          amounts.stateTaxWithheld || '', '|', // Box 11
        ].join('');

        qrTexts = [gPayerTxt, gAmountsTxt];
        break;
      }

      case '1098': {
        // 1098: Full Mortgage Interest Statement
        const mortgagePayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|',
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const mortgageAmountsTxt = [
          amounts.mortgageInterest || '', '|', // Box 1
          amounts.outstandingPrincipal || '', '|', // Box 2
          amounts.originationDate || '', '|', // Box 3
          amounts.refundOfOverpaid || '', '|', // Box 4
          amounts.mortgageInsurance || '', '|', // Box 5
          amounts.pointsPaid || '', '|', // Box 6
          amounts.propertyAddress || '', '|', // Box 7 - Property address
          amounts.propertyTaxes || '', '|', // Box 10
          amounts.acquisitionDate || '', '|', // Box 11
        ].join('');

        qrTexts = [mortgagePayerTxt, mortgageAmountsTxt];
        break;
      }

      case '1098_t': {
        // 1098-T: Full Tuition Statement
        const tuitionPayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|', // Institution name
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const tuitionAmountsTxt = [
          amounts.paymentsReceived || amounts.tuitionPaid || '', '|', // Box 1
          amounts.scholarshipsGrants || '', '|', // Box 5
          amounts.adjustmentsPriorYear || '', '|', // Box 4
          amounts.adjustmentsScholarships || '', '|', // Box 6
          amounts.includesJanMar || '', '|', // Box 7 checkbox
          amounts.atLeastHalfTime || '', '|', // Box 8 checkbox
          amounts.graduateStudent || '', '|', // Box 9 checkbox
          amounts.insuranceReimbursement || '', '|', // Box 10
        ].join('');

        qrTexts = [tuitionPayerTxt, tuitionAmountsTxt];
        break;
      }

      case '1099_r': {
        // 1099-R: Full Retirement Distribution
        const retPayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|',
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const retAmountsTxt = [
          amounts.grossDistribution || '', '|', // Box 1
          amounts.taxableAmount || '', '|', // Box 2a
          amounts.taxableAmountNotDetermined || '', '|', // Box 2b checkbox
          amounts.totalDistribution || '', '|', // Box 2b checkbox
          amounts.capitalGain || '', '|', // Box 3
          amounts.federalTaxWithheld || '', '|', // Box 4
          amounts.employeeContributions || '', '|', // Box 5
          amounts.netUnrealizedAppreciation || '', '|', // Box 6
          amounts.distributionCode || '', '|', // Box 7
          amounts.otherAmount || '', '|', // Box 8
          amounts.percentageTotalDistribution || '', '|', // Box 9a
          amounts.totalEmployeeContributions || '', '|', // Box 9b
          amounts.firstYearOfRoth || '', '|', // Box 11
          amounts.fatcaFiling || '', '|', // Box 12
          amounts.dateOfPayment || '', '|', // Box 13
        ].join('');

        const retStateTxt = [
          payer.state || '', '|',
          amounts.stateDistribution || amounts.grossDistribution || '', '|',
          amounts.stateTaxWithheld || '', '|',
          amounts.localDistribution || '', '|',
          amounts.localTaxWithheld || '', '|',
          amounts.localityName || '', '|',
        ].join('');

        qrTexts = [retPayerTxt, retAmountsTxt, retStateTxt];
        break;
      }

      case 'ssa_1099': {
        // SSA-1099: Full Social Security Benefit Statement
        const ssaPayerTxt = [
          'Social Security Administration', '|',
          amounts.claimNumber || '', '|',
        ].join('');

        const ssaAmountsTxt = [
          amounts.totalBenefits || '', '|', // Box 3 - Total benefits
          amounts.benefitsRepaid || '', '|', // Box 4 - Benefits repaid
          amounts.netBenefits || '', '|', // Box 5 - Net benefits
          amounts.federalTaxWithheld || '', '|', // Box 6 - Voluntary withholding
          amounts.medicarePartBDeducted || '', '|', // Medicare Part B premium
          amounts.description || '', '|', // Description of benefits
        ].join('');

        qrTexts = [ssaPayerTxt, ssaAmountsTxt];
        break;
      }

      case '1099_ssa': {
        // Alternative SSA-1099 key
        const ssaPayerTxt2 = [
          'Social Security Administration', '|',
          amounts.claimNumber || '', '|',
        ].join('');

        const ssaAmountsTxt2 = [
          amounts.totalBenefits || '', '|',
          amounts.benefitsRepaid || '', '|',
          amounts.netBenefits || '', '|',
          amounts.federalTaxWithheld || '', '|',
        ].join('');

        qrTexts = [ssaPayerTxt2, ssaAmountsTxt2];
        break;
      }

      case '1095_a': {
        // 1095-A: Health Insurance Marketplace Statement
        const healthPayerTxt = [
          payer.ein || '', '|',
          payer.name || '', '|', // Marketplace name
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
        ].join('');

        const healthAmountsTxt = [
          amounts.policyNumber || '', '|',
          amounts.policyStartDate || '', '|',
          amounts.policyEndDate || '', '|',
          amounts.annualPremium || '', '|',
          amounts.annualSlcsp || '', '|',
          amounts.annualAptc || '', '|',
        ].join('');

        // Monthly amounts if available
        const monthlyTxt = (amounts.monthlyPremiums || []).map((p: number, i: number) => {
          const slcsp = amounts.monthlySlcsp?.[i] || 0;
          const aptc = amounts.monthlyAptc?.[i] || 0;
          return `${p}|${slcsp}|${aptc}`;
        }).join('|') || '';

        qrTexts = [healthPayerTxt, healthAmountsTxt];
        if (monthlyTxt) qrTexts.push(monthlyTxt);
        break;
      }

      case '1099_k': {
        // 1099-K: Payment Card and Third Party Network Transactions
        const kPayerTxt = [
          payer.ein || '', '|',
          payer.name || amounts.pseName || '', '|', // PSE name
          payer.address || '', '|',
          (payer.city || '') + ' ' + (payer.state || ''), '|',
          payer.zip || '', '|',
          amounts.psePhone || '', '|',
        ].join('');

        const kAmountsTxt = [
          amounts.grossAmount1099K || '', '|', // Box 1a - Gross amount
          amounts.cardNotPresentTransactions || '', '|', // Box 1b
          amounts.merchantCategoryCode || '', '|', // Box 2
          amounts.numberOfTransactions || '', '|', // Box 3
          amounts.federalTaxWithheld1099K || '', '|', // Box 4
        ].join('');

        // Monthly gross amounts (Boxes 5a-5l)
        const monthly = amounts.monthlyGrossAmounts || {};
        const kMonthlyTxt = [
          monthly.january || '', '|',
          monthly.february || '', '|',
          monthly.march || '', '|',
          monthly.april || '', '|',
          monthly.may || '', '|',
          monthly.june || '', '|',
          monthly.july || '', '|',
          monthly.august || '', '|',
          monthly.september || '', '|',
          monthly.october || '', '|',
          monthly.november || '', '|',
          monthly.december || '', '|',
        ].join('');

        // State info
        const kStateTxt = [
          amounts.stateAbbreviation1099K || '', '|', // Box 6
          amounts.stateIdNumber1099K || '', '|', // Box 7
          amounts.stateTaxWithheld1099K || '', '|', // Box 8
        ].join('');

        qrTexts = [kPayerTxt, kAmountsTxt];
        if (kMonthlyTxt.replace(/\|/g, '').trim()) qrTexts.push(kMonthlyTxt);
        if (kStateTxt.replace(/\|/g, '').trim()) qrTexts.push(kStateTxt);
        break;
      }

      default: {
        // Generic: Payer and all amounts
        const allAmountsTxt = Object.entries(amounts)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${v}`)
          .join('|');

        qrTexts = [payerTxt, allAmountsTxt || 'No amounts'];
        break;
      }
    }

    setQrTextM(qrTexts.filter(t => t && t.length > 0));
    setShowQRCodeM(true);
  };

  // Handle verify document
  const handleVerifyDocument = async (doc: DrakeTaxDocument) => {
    try {
      const result = await verifyTaxDocument(doc.id);

      if (result.success) {
        // Update local state - mark document as verified
        const updatedDoc = { ...doc, verified: true, verifiedAt: Date.now() };
        setSelectedDocument(updatedDoc);

        // Show success message
        setSuccessMessage('Document verified successfully');
        setTimeout(() => setSuccessMessage(null), 3000);

        // Refresh the document list
        handleRefresh();
      } else {
        setUploadError(result.error || 'Failed to verify document');
      }
    } catch (error) {
      setUploadError((error as Error).message);
    }
  };



  // Handle verify document
  const handleArchiveDocument = async (doc: DrakeTaxDocument) => {
    try {
     
      //devLog(doc)

      const result = await fetchGraphQLSS({
            query: 'updateTaxDocument',
            params: { businessId: authStore.getBusinessId(), id: doc?.id },
            form: { taxPortalId: "archive_hrm", clientNotaryId: "archive_hrm" }
      });
      

      if (result.success) {
        // Update local state - mark document as verified
        //const updatedDoc = { ...doc, verified: true, verifiedAt: Date.now() };
        //setSelectedDocument(updatedDoc);

        // Show success message
        setSuccessMessage('Document verified successfully');
        setTimeout(() => setSuccessMessage(null), 3000);

        // Refresh the document list
        handleRefresh();
      } else {
        setUploadError(result.error || 'Failed to verify document');
      }
    } catch (error) {
      setUploadError((error as Error).message);
    }
  };


  // Search for clients to reassign document to
  const searchClientsForReassign = async (query: string) => {
    if (query.length < 2) {
      setReassignSearchResults([]);
      return;
    }
    setIsSearchingClients(true);
    try {
      const allClients = await getTaxPortals();
      // Filter by name, exclude current client
      const filtered = allClients.filter(c =>
        c.id !== getPortalId() &&
        (c.firstName?.toLowerCase().includes(query.toLowerCase()) ||
         c.lastName?.toLowerCase().includes(query.toLowerCase()) ||
         `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 10);
      setReassignSearchResults(filtered);
    } catch (err) {
      console.error('Error searching clients:', err);
    } finally {
      setIsSearchingClients(false);
    }
  };

  // Reassign document to another client
  const handleReassignDocument = async (targetClient: TaxPortal) => {
    const doc = selectedDocument();
    if (!doc) return;

    setIsReassigning(true);
    try {
      const result = await fetchGraphQLSS({
        query: 'updateTaxDocument',
        params: { businessId: authStore.getBusinessId(), id: doc.id },
        form: { taxPortalId: targetClient.id }
      });

      if (result.success) {
        setSuccessMessage(`Document reassigned to ${targetClient.firstName} ${targetClient.lastName}`);
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowReassignModal(false);
        setSelectedDocument(null);
        handleRefresh();
      } else {
        setUploadError(result.error || 'Failed to reassign document');
      }
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setIsReassigning(false);
      setReassignSearchQuery('');
      setReassignSearchResults([]);
    }
  };

  // Handle analyze document
  const handleAnalyzeDocument = async (doc: DrakeTaxDocument) => {
    try {
      await processTaxDocument(doc.id);
      handleRefresh();
      setSuccessMessage('Document sent for analysis');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setUploadError((error as Error).message);
    }
  };

  // Handle delete document
  const handleDeleteDocument = async (doc: DrakeTaxDocument) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteTaxDocument(doc.id);
      handleRefresh();
      setSuccessMessage('Document deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setUploadError((error as Error).message);
    }
  };

  // Handle request from client
  const handleRequestFromClient = async () => {
    const portal = getTaxPortal();
    if (!portal) {
      setUploadError('Tax portal information not available');
      return;
    }

    setIsRequestingFromClient(true);
    try {
      await createDocumentRequest(portal, {
        taxYear: getTaxYear() as any,
        instructions: 'Please upload the requested tax documents.'
      });
      setSuccessMessage('Document request sent to client');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setIsRequestingFromClient(false);
    }
  };


  const handleSyncPayers = async () => {
    const portal = getTaxPortal();
    if (!portal) {
      setUploadError('Tax portal information not available');
      return;
    }

    setIsSyncingPayers(true);
    try {
      const result = await fetchGraphQLSS({
        query: 'syncPayersFromTaxDocuments',
        params: { businessId: authStore.getBusinessId(), id: portal.id }
      });

      if (result?.success !== false) {
        setSuccessMessage('Payers synced successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        props.onRefresh?.();
      } else {
        setUploadError(result?.error || 'Error syncing payers');
      }
    } catch (error) {
      devLog('Error syncing payers:', error);
      setUploadError((error as Error).message);
    } finally {
      setIsSyncingPayers(false);
    }
  };

  const handleTextQR = (text: string) => {
    setQrText(text);
    setShowQRCode(true);
  };

  // Styles
  const sectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
    gap: '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    margin: '0'
  };

  const statsRowStyle = {
    display: 'flex',
    gap: '1.5rem',
    'flex-wrap': 'wrap' as const,
    'margin-top': '0.5rem'
  };

  const statItemStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.875rem'
  };

  const statDotStyle = (color: string) => ({
    width: '8px',
    height: '8px',
    'border-radius': '50%',
    background: color
  });

  const dropZoneStyle = (isDragging: boolean) => ({
    border: `2px dashed ${isDragging ? 'var(--primary-color, #3b82f6)' : 'var(--border-color, #e5e7eb)'}`,
    'border-radius': '12px',
    padding: '2rem',
    'text-align': 'center' as const,
    background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'var(--surface-alt, #f9fafb)',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  });

  const tableContainerStyle = {
    'overflow-x': 'auto' as const,
    'border-radius': '8px',
    border: '1px solid var(--border-color, #e5e7eb)'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '0.875rem'
  };

  const thStyle = {
    padding: '0.75rem 1rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    'font-size': '0.75rem',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
    color: 'var(--text-secondary, #6b7280)',
    background: 'var(--surface-alt, #f9fafb)',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)'
  };

  const tdStyle = {
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'vertical-align': 'middle' as const
  };

  const statusBadgeStyle = (config: ReturnType<typeof getStatusConfig>) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.625rem',
    'border-radius': '9999px',
    background: config.bg,
    color: config.color,
    'font-size': '0.75rem',
    'font-weight': '600'
  });

  const actionButtonStyle = {
    padding: '0.375rem 0.625rem',
    background: 'transparent',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '6px',
    cursor: 'pointer',
    'font-size': '0.75rem',
    color: 'var(--text-secondary, #6b7280)',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem'
  };

  const actionButtonPrimaryStyle = {
    ...actionButtonStyle,
    background: 'var(--primary-color, #3b82f6)',
    'border-color': 'var(--primary-color, #3b82f6)',
    color: 'white'
  };

  const messageStyle = (type: 'success' | 'error') => ({
    padding: '0.75rem 1rem',
    'border-radius': '8px',
    'font-size': '0.875rem',
    background: type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: type === 'success' ? '#22c55e' : '#ef4444',
    border: `1px solid ${type === 'success' ? '#22c55e' : '#ef4444'}`,
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  });

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '3rem',
    color: 'var(--text-secondary, #6b7280)'
  };

  const docIconStyle = {
    width: '32px',
    height: '32px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: 'var(--surface-alt, #f3f4f6)',
    'border-radius': '6px',
    'font-size': '0.75rem',
    'font-weight': '600'
  };

  const docNameStyle = {
    'font-weight': '500',
    color: 'var(--text-primary, #1f2937)',
    'max-width': '250px',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap' as const
  };

  const docTypeTagStyle = {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    background: 'var(--surface-alt, #f3f4f6)',
    'border-radius': '4px',
    'font-size': '0.75rem',
    color: 'var(--text-secondary, #6b7280)'
  };

  // Get icon for status
  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'verified':
        return <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>;
      case 'needs_review':
        return <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>;
      case 'analyzing':
        return <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }}>
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>;
      case 'error':
      case 'missing':
        return <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>;
      default:
        return null;
    }
  };

  // Get document icon based on type
  const getDocIcon = (mimeType?: string): string => {
    if (mimeType?.includes('pdf')) return 'PDF';
    if (mimeType?.includes('image')) return 'IMG';
    return 'DOC';
  };

  return (
    <div style={sectionStyle}>
      {/* Expected Documents Tracker for returning clients */}
      <Show when={props.isReturningClient && props.expectedDocs && props.expectedDocs.length > 0}>
        <ExpectedDocumentsTracker
          client={props.client || props.taxPortal as any}
          expectedDocs={props.expectedDocs!}
          currentDocs={props.documents}
          onRefresh={props.onRefresh}
        />
      </Show>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Documents</h3>
          <div style={statsRowStyle}>
            <div style={statItemStyle}>
              <div style={statDotStyle('#22c55e')} />
              <span>{documentStats().verified} Verified</span>
            </div>
            <div style={statItemStyle}>
              <div style={statDotStyle('#f59e0b')} />
              <span>{documentStats().needsReview} Needs Review</span>
            </div>
            <Show when={documentStats().analyzing > 0}>
              <div style={statItemStyle}>
                <div style={statDotStyle('#3b82f6')} />
                <span>{documentStats().analyzing} Analyzing</span>
              </div>
            </Show>
            <Show when={documentStats().errors > 0}>
              <div style={statItemStyle}>
                <div style={statDotStyle('#ef4444')} />
                <span>{documentStats().errors} Errors</span>
              </div>
            </Show>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
          <Show when={getTaxPortal()}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncPayers}
              disabled={isSyncingPayers()}
            >
              {isSyncingPayers() ? 'Syncing...' : 'Sync Payers'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRequestFromClient}
              disabled={isRequestingFromClient()}
            >
              {isRequestingFromClient() ? 'Sending...' : 'Request from Client'}
            </Button>
          </Show>
        </div>
      </div>

      {/* Messages */}
      <Show when={uploadError()}>
        <div style={messageStyle('error')}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          {uploadError()}
        </div>
      </Show>
      <Show when={successMessage()}>
        <div style={messageStyle('success')}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          {successMessage()}
        </div>
      </Show>

      {/* Scan Documents Panel */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '0.75rem',
      }}>
        <button
          onClick={() => setShowScanMode(!showScanMode())}
          style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            'border-radius': 'var(--border-radius-md)',
            border: showScanMode() ? '2px solid #3b82f6' : '2px solid var(--border-color)',
            background: showScanMode() ? '#eff6ff' : 'var(--surface-color)',
            color: showScanMode() ? '#1d4ed8' : 'var(--text-primary)',
            cursor: 'pointer',
            'font-weight': '600',
            'font-size': '0.875rem',
            transition: 'all 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {showScanMode() ? 'Hide Scanner' : 'Scan Documents'}
        </button>
      </div>

      <Show when={showScanMode()}>
        <div style={{
          background: 'var(--background-color)',
          border: '2px solid #3b82f6',
          'border-radius': 'var(--border-radius-lg)',
          padding: '1rem',
          'margin-bottom': '1rem',
        }}>
          <div style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            'margin-bottom': '0.75rem',
          }}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              'font-weight': '600',
              color: '#1d4ed8',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scan Station
            </div>
            <button
              onClick={() => setShowScanMode(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                'font-size': '1.25rem',
                padding: '0.25rem',
              }}
            >
              x
            </button>
          </div>

          <Show when={scanProgress()}>
            <div style={{
              padding: '0.5rem 0.75rem',
              background: '#eff6ff',
              'border-radius': 'var(--border-radius-md)',
              'font-size': '0.8125rem',
              color: '#1d4ed8',
              'margin-bottom': '0.75rem',
            }}>
              {scanProgress()}
            </div>
          </Show>

          <BatchScanCapture
            onFilesReady={handleScanFilesReady}
            isProcessing={isProcessingScan()}
            allowCamera={true}
            accept="image/*,application/pdf"
            maxFiles={20}
          />
        </div>
      </Show>

      {/* Drop Zone */}
      <div
        style={dropZoneStyle(isDragOver())}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div style={{ 'font-size': '2.5rem', 'margin-bottom': '0.75rem' }}>
          {isDragOver() ? 'Drop files here' : 'Upload Documents'}
        </div>
        <div style={{ color: 'var(--text-secondary)', 'margin-bottom': '1rem' }}>
          {isDragOver() ? 'Let go to upload' : 'Drag and drop your tax documents here, or click to browse'}
        </div>
        <Button variant="primary" disabled={isUploading()}>
          {isUploading() ? 'Uploading...' : 'Browse Files'}
        </Button>
        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.75rem' }}>
          Accepts PDF, JPG, PNG (W-2, 1099, 1098, K-1, receipts)
        </div>
      </div>

      {/* Spouse Documents Info Banner */}
      <Show when={props.linkedSpouse && (props.spouseDocuments?.length || 0) > 0}>
        <div style={{
          background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
          'border-radius': '8px',
          padding: '0.75rem 1rem',
          'margin-bottom': '1rem',
          display: 'flex',
          'align-items': 'center',
          gap: '0.75rem',
          color: 'white'
        }}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <div>
            <div style={{ 'font-weight': '600' }}>
              Documentos del Cónyuge Incluidos
            </div>
            <div style={{ 'font-size': '0.8125rem', opacity: 0.9 }}>
              {props.spouseDocuments?.length} documento(s) de {props.linkedSpouse?.firstName} {props.linkedSpouse?.lastName}
            </div>
          </div>
        </div>
      </Show>

      {/* Documents List - Grouped by Category */}
      <Show when={allDocuments().length > 0}>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
          <For each={(['tax', 'personal', 'bank', 'other'] as DocumentCategory[])}>
            {(category) => {
              const docs = () => groupedDocuments()[category];
              const config = DOCUMENT_CATEGORY_CONFIG[category];
              const isCollapsed = () => collapsedCategories()[category];

              return (
                <Show when={docs().length > 0}>
                  <div style={{
                    border: `1px solid var(--border-color, #e5e7eb)`,
                    'border-radius': '10px',
                    overflow: 'hidden',
                  }}>
                    {/* Category Header - Accordion toggle */}
                    <button
                      onClick={() => toggleCategory(category)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: config.bg,
                        border: 'none',
                        cursor: 'pointer',
                        'text-align': 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Chevron */}
                      <svg
                        width="16" height="16" viewBox="0 0 20 20" fill={config.color}
                        style={{
                          transition: 'transform 0.2s',
                          transform: isCollapsed() ? 'rotate(-90deg)' : 'rotate(0deg)',
                          'flex-shrink': '0',
                        }}
                      >
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>

                      {/* Category Icon */}
                      <Show when={category === 'tax'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={config.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </Show>
                      <Show when={category === 'personal'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={config.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </Show>
                      <Show when={category === 'bank'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={config.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                      </Show>
                      <Show when={category === 'other'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={config.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                          <polyline points="13 2 13 9 20 9" />
                        </svg>
                      </Show>

                      {/* Label + Count */}
                      <span style={{
                        'font-weight': '600',
                        'font-size': '0.9375rem',
                        color: config.color,
                        flex: '1',
                      }}>
                        {config.label}
                      </span>
                      <span style={{
                        'font-size': '0.75rem',
                        'font-weight': '600',
                        padding: '0.125rem 0.5rem',
                        'border-radius': '9999px',
                        background: config.color,
                        color: 'white',
                      }}>
                        {docs().length}
                      </span>
                    </button>

                    {/* Category Body */}
                    <Show when={!isCollapsed()}>
                      <div style={{ display: 'flex', 'flex-direction': 'column' }}>
                        {/* Personal Documents: Extracted info summary + auto-fill */}
                        <Show when={category === 'personal' && Object.keys(extractedPersonalInfo()).length > 0}>
                          <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(139, 92, 246, 0.04)',
                            'border-bottom': '1px solid var(--border-color, #e5e7eb)',
                          }}>
                            <div style={{
                              display: 'flex',
                              'align-items': 'center',
                              'justify-content': 'space-between',
                              'margin-bottom': '0.5rem',
                            }}>
                              <span style={{ 'font-weight': '600', 'font-size': '0.8125rem', color: '#8b5cf6' }}>
                                Extracted Information
                              </span>
                              <Show when={props.onClientChange}>
                                <button
                                  onClick={handleAutoFillFromPersonalDocs}
                                  style={{
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '0.375rem',
                                    padding: '0.375rem 0.75rem',
                                    background: '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    'border-radius': '6px',
                                    cursor: 'pointer',
                                    'font-size': '0.75rem',
                                    'font-weight': '600',
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#7c3aed'}
                                  onMouseOut={(e) => e.currentTarget.style.background = '#8b5cf6'}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="8.5" cy="7" r="4" />
                                    <polyline points="17 11 19 13 23 9" />
                                  </svg>
                                  Auto-fill Client Info
                                </button>
                              </Show>
                            </div>
                            <div style={{
                              display: 'grid',
                              'grid-template-columns': 'repeat(auto-fill, minmax(180px, 1fr))',
                              gap: '0.375rem',
                            }}>
                              <Show when={extractedPersonalInfo().name}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Name: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().name}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().dateOfBirth}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>DOB: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().dateOfBirth}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().ssn}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>SSN: </span>
                                  <span style={{ 'font-weight': '500' }}>***-**-{extractedPersonalInfo().ssn?.slice(-4)}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().address}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Address: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().address}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().idNumber}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>ID #: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().idNumber}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().issueDate}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Issued: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().issueDate}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().expirationDate}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Exp: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().expirationDate}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().gender}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Sex: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().gender}</span>
                                </div>
                              </Show>
                              <Show when={extractedPersonalInfo().country}>
                                <div style={{ 'font-size': '0.75rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Country: </span>
                                  <span style={{ 'font-weight': '500' }}>{extractedPersonalInfo().country}</span>
                                </div>
                              </Show>
                            </div>
                          </div>
                        </Show>

                        {/* Bank Documents: Show extracted routing/account info */}
                        <Show when={category === 'bank'}>
                          {(() => {
                            const bankDocs = docs();
                            // Check multiple possible field names for bank data
                            const bankData = bankDocs.find(d => {
                              const ed = d.extractedData || {} as any;
                              return ed.routingNumber || ed.routing_number || ed.routingTransitNumber
                                || ed.accountNumber || ed.account_number
                                || ed.bankName || ed.bank_name || ed.institutionName;
                            });
                            if (!bankData) return null;
                            const ed = bankData.extractedData || {} as any;
                            const bankName = ed.bankName || ed.bank_name || ed.institutionName || ed.financial_institution || '';
                            const routing = ed.routingNumber || ed.routing_number || ed.routingTransitNumber || ed.abaNumber || '';
                            const account = ed.accountNumber || ed.account_number || ed.acctNumber || '';
                            return (
                              <Show when={bankName || routing || account}>
                                <div style={{
                                  padding: '0.75rem 1rem',
                                  background: 'rgba(16, 185, 129, 0.04)',
                                  'border-bottom': '1px solid var(--border-color, #e5e7eb)',
                                }}>
                                  <span style={{ 'font-weight': '600', 'font-size': '0.8125rem', color: '#10b981', 'margin-bottom': '0.375rem', display: 'block' }}>
                                    Extracted Bank Info
                                  </span>
                                  <div style={{ display: 'flex', gap: '1.5rem', 'font-size': '0.75rem' }}>
                                    <Show when={bankName}>
                                      <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Bank: </span>
                                        <span style={{ 'font-weight': '500' }}>{bankName}</span>
                                      </div>
                                    </Show>
                                    <Show when={routing}>
                                      <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Routing: </span>
                                        <span style={{ 'font-weight': '500' }}>{routing}</span>
                                      </div>
                                    </Show>
                                    <Show when={account}>
                                      <div>
                                        <span style={{ color: 'var(--text-secondary)' }}>Account: </span>
                                        <span style={{ 'font-weight': '500' }}>****{account.slice(-4)}</span>
                                      </div>
                                    </Show>
                                  </div>
                                </div>
                              </Show>
                            );
                          })()}
                        </Show>

                        {/* Document cards */}
                        <div style={{ display: 'flex', 'flex-direction': 'column' }}>
                          <For each={docs()}>
                            {(doc) => {
                              const status = getDocumentStatus(doc);
                              const statusConfig = getStatusConfig(status);
                              const isSpouseDoc = (doc as any)._isSpouseDoc;
                              const warnings = getDocumentWarnings(doc);
                              return (
                                <div style={{
                                  padding: '0.75rem 1rem',
                                  'border-bottom': '1px solid var(--border-color, #e5e7eb)',
                                  background: isSpouseDoc
                                    ? 'rgba(236, 72, 153, 0.04)'
                                    : doc.verified
                                      ? 'rgba(34, 197, 94, 0.03)'
                                      : 'transparent',
                                  'border-left': warnings.length > 0
                                    ? '3px solid #d97706'
                                    : isSpouseDoc
                                      ? '3px solid #ec4899'
                                      : '3px solid transparent'
                                }}>
                                  {/* Row 1: Main info */}
                                  <div style={{
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '0.75rem',
                                    'margin-bottom': '0.5rem'
                                  }}>
                                    <div style={docIconStyle}>
                                      {getDocIcon(doc.mimeType)}
                                    </div>
                                    <div style={{ flex: '1', 'min-width': '0' }}>
                                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                                        <div style={{
                                          ...docNameStyle,
                                          'font-weight': '600',
                                          'font-size': '0.875rem',
                                          'white-space': 'nowrap',
                                          overflow: 'hidden',
                                          'text-overflow': 'ellipsis',
                                          'max-width': '280px'
                                        }} title={doc.originalFileName}>
                                          {doc.originalFileName}
                                        </div>
                                        <span style={docTypeTagStyle}>
                                          {DRAKE_FORM_LABELS[doc.drakeFormType || 'other']}
                                        </span>
                                      </div>
                                    </div>
                                    <Show when={doc.payerInfo?.name}>
                                      <div style={{ 'text-align': 'right', 'flex-shrink': '0' }}>
                                        <div style={{ 'font-size': '0.8125rem', 'font-weight': '500' }}>
                                          {doc.payerInfo?.name}
                                        </div>
                                        <Show when={doc.payerInfo?.zip}>
                                          <div style={{ 'font-size': '0.6875rem', color: 'var(--text-secondary)' }}>
                                            ZIP {doc.payerInfo?.zip}
                                          </div>
                                        </Show>
                                      </div>
                                    </Show>
                                    <div style={{ display: 'flex', gap: '0.375rem', 'flex-shrink': '0', 'margin-left': '0.25rem' }}>
                                      <button
                                        style={actionButtonPrimaryStyle}
                                        onClick={() => handleViewDocument(doc)}
                                        title="View document"
                                      >
                                        View
                                      </button>
                                      <Show when={status !== 'analyzing'}>
                                        <button
                                          style={actionButtonStyle}
                                          onClick={() => handleAnalyzeDocument(doc)}
                                          title="Re-analyze document"
                                        >
                                          Analyze
                                        </button>
                                      </Show>
                                      <button
                                        style={{ ...actionButtonStyle, color: '#ef4444' }}
                                        onClick={() => handleDeleteDocument(doc)}
                                        title="Delete document"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {/* Row 2: Metadata chips */}
                                  <div style={{
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '0.5rem',
                                    'flex-wrap': 'wrap',
                                    'padding-left': '2.25rem',
                                    'font-size': '0.75rem'
                                  }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      'align-items': 'center',
                                      gap: '0.2rem',
                                      padding: '0.125rem 0.5rem',
                                      'border-radius': '9999px',
                                      'font-weight': '500',
                                      background: isSpouseDoc ? '#fce7f3' : '#e0f2fe',
                                      color: isSpouseDoc ? '#be185d' : '#0369a1'
                                    }}>
                                      {isSpouseDoc ? (
                                        <>
                                          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '11px', height: '11px' }}>
                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                          </svg>
                                          Cónyuge
                                        </>
                                      ) : (
                                        <>
                                          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '11px', height: '11px' }}>
                                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                          </svg>
                                          Taxpayer
                                        </>
                                      )}
                                    </span>
                                    <span style={statusBadgeStyle(statusConfig)}>
                                      {getStatusIcon(status)}
                                      {statusConfig.label}
                                    </span>
                                    <Show when={doc.taxYear}>
                                      <span style={{
                                        display: 'inline-flex',
                                        'align-items': 'center',
                                        gap: '0.2rem',
                                        padding: '0.125rem 0.5rem',
                                        'border-radius': '4px',
                                        'font-weight': '500',
                                        background: doc.taxYear !== getTaxYear() ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface-alt, #f3f4f6)',
                                        color: doc.taxYear !== getTaxYear() ? '#d97706' : 'var(--text-secondary)'
                                      }}>
                                        {doc.taxYear}
                                        <Show when={doc.taxYear !== getTaxYear()}>
                                          <svg width="12" height="12" viewBox="0 0 20 20" fill="#d97706">
                                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                          </svg>
                                        </Show>
                                      </span>
                                    </Show>
                                    <span style={{ color: 'var(--text-secondary)', opacity: '0.4' }}>|</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      {formatFileSize(doc.fileSize)}
                                    </span>
                                    <span style={{ color: 'var(--text-secondary)', opacity: '0.4' }}>|</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      {formatDate(doc.uploadedAt)}
                                    </span>
                                  </div>

                                  {/* Row 3: Taxpayer mismatch alerts */}
                                  <Show when={warnings.length > 0}>
                                    <div style={{
                                      display: 'flex',
                                      'flex-direction': 'column',
                                      gap: '0.25rem',
                                      'margin-top': '0.5rem',
                                      'padding-left': '2.25rem'
                                    }}>
                                      <For each={warnings}>
                                        {(warning) => (
                                          <div style={{
                                            display: 'flex',
                                            'align-items': 'center',
                                            gap: '0.375rem',
                                            padding: '0.3rem 0.625rem',
                                            'border-radius': '6px',
                                            'font-size': '0.75rem',
                                            'font-weight': '500',
                                            background: warning.toLowerCase().includes('name mismatch') || warning.toLowerCase().includes('ssn mismatch')
                                              ? 'rgba(239, 68, 68, 0.08)'
                                              : 'rgba(245, 158, 11, 0.08)',
                                            color: warning.toLowerCase().includes('name mismatch') || warning.toLowerCase().includes('ssn mismatch')
                                              ? '#dc2626'
                                              : '#b45309',
                                            border: warning.toLowerCase().includes('name mismatch') || warning.toLowerCase().includes('ssn mismatch')
                                              ? '1px solid rgba(239, 68, 68, 0.2)'
                                              : '1px solid rgba(245, 158, 11, 0.2)'
                                          }}>
                                            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style={{ 'flex-shrink': '0' }}>
                                              {warning.toLowerCase().includes('name mismatch') || warning.toLowerCase().includes('ssn mismatch') ? (
                                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                              ) : (
                                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                              )}
                                            </svg>
                                            {warning}
                                          </div>
                                        )}
                                      </For>
                                    </div>
                                  </Show>

                                  {/* Compact personal doc card preview */}
                                  <Show when={category === 'personal'}>
                                    <PersonalDocViewer document={doc} compact />
                                  </Show>
                                </div>
                              );
                            }}
                          </For>
                        </div>
                      </div>
                    </Show>
                  </div>
                </Show>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Empty State */}
      <Show when={props.documents.length === 0}>
        <Card>
          <div style={emptyStateStyle}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>No documents yet</div>
            <div style={{ 'font-size': '1rem', 'margin-bottom': '0.5rem' }}>
              Upload tax documents using the drop zone above
            </div>
            <div style={{ 'font-size': '0.875rem' }}>
              Or request documents from your client
            </div>
          </div>
        </Card>
      </Show>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Document Details Modal */}
      <Show when={selectedDocument()}>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': 1000,
            padding: '1rem'
          }}
          onClick={handleCloseDetails}
        >
          <div
            style={{
              background: 'var(--surface-color, white)',
              'border-radius': '12px',
              'max-width': '900px',
              width: '100%',
              'max-height': '90vh',
              overflow: 'auto',
              'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              padding: '1.25rem 1.5rem',
              'border-bottom': '1px solid var(--border-color, #e5e7eb)'
            }}>
              <h3 style={{ margin: 0, 'font-size': '1.125rem', 'font-weight': '600' }}>
                Document Details
              </h3>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                {/* Multi QR Code Button */}
                <button
                  onClick={() => handleShowMultiDocumentQR(selectedDocument()!)}
                  style={{
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem 0.75rem',
                    'border-radius': '6px',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.375rem',
                    'font-size': '0.8125rem',
                    'font-weight': '500',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#7c3aed'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#8b5cf6'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Multi QR
                </button>
                <button
                  onClick={handleCloseDetails}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    'border-radius': '6px',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              {/* File Name */}
              <div style={{ 'margin-bottom': '1.5rem' }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    background: 'var(--surface-alt, #f3f4f6)',
                    'border-radius': '8px',
                    'font-weight': '600',
                    color: 'var(--primary-color, #3b82f6)'
                  }}>
                    {getDocIcon(selectedDocument()?.mimeType)}
                  </div>
                  <div>
                    <div style={{ 'font-weight': '600', 'font-size': '1rem' }}>
                      {selectedDocument()?.originalFileName}
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                      {formatFileSize(selectedDocument()?.fileSize)} • {formatDate(selectedDocument()?.uploadedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Type */}
              <div style={{
                display: 'grid',
                'grid-template-columns': '1fr 1fr',
                gap: '1rem',
                'margin-bottom': '1.5rem'
              }}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--surface-alt, #f9fafb)',
                  'border-radius': '8px'
                }}>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem', 'text-transform': 'uppercase' }}>
                    Status
                  </div>
                  <div style={{ 'font-weight': '500' }}>
                    <span style={statusBadgeStyle(getStatusConfig(getDocumentStatus(selectedDocument()!)))}>
                      {getStatusIcon(getDocumentStatus(selectedDocument()!))}
                      {getStatusConfig(getDocumentStatus(selectedDocument()!)).label}
                    </span>
                  </div>
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'var(--surface-alt, #f9fafb)',
                  'border-radius': '8px'
                }}>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem', 'text-transform': 'uppercase' }}>
                    Document Type
                  </div>
                  <div style={{ 'font-weight': '500' }}>
                    {(() => {
                      const doc = selectedDocument()!;
                      const drakeLabel = DRAKE_FORM_LABELS[doc.drakeFormType || 'other'];
                      if (drakeLabel !== 'Other Document') return drakeLabel;
                      // For personal docs, show a friendlier label from documentType
                      const dt = (doc.documentType as string) || '';
                      const PERSONAL_LABELS: Record<string, string> = {
                        'driver_license': 'Driver\'s License',
                        'state_id': 'State ID / Identification Card',
                        'passport': 'Passport',
                        'social_security_card': 'Social Security Card',
                        'green_card': 'Green Card / Permanent Resident',
                        'birth_certificate': 'Birth Certificate',
                        'cubanBirthCertificate': 'Cuban Birth Certificate',
                        'i94': 'I-94 / Arrival Record',
                        'visa': 'Visa',
                        'bank_statement': 'Bank Statement',
                      };
                      return PERSONAL_LABELS[dt] || drakeLabel;
                    })()}
                  </div>
                </div>
              </div>

              {/* Document Validation Warnings */}
              <Show when={selectedDocument() && getDocumentWarnings(selectedDocument()!).length > 0}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <For each={getDocumentWarnings(selectedDocument()!)}>
                    {(warning) => (
                      <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        'border-radius': '8px',
                        'margin-bottom': '0.5rem',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.5rem',
                        color: '#92400e',
                        'font-size': '0.875rem'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="#d97706" style={{ 'flex-shrink': '0' }}>
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        {warning}
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* AI Analysis Results */}
              <Show when={selectedDocument()?.aiAnalysis}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>AI Analysis</div>
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    'border-radius': '8px'
                  }}>
                    <Show when={selectedDocument()?.aiAnalysis?.confidence}>
                      <div style={{ 'margin-bottom': '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', 'font-size': '0.875rem' }}>Confidence: </span>
                        <span style={{ 'font-weight': '500' }}>
                          {Math.round((selectedDocument()?.aiAnalysis?.confidence || 0) * 100)}%
                        </span>
                      </div>
                    </Show>
                    <Show when={selectedDocument()?.aiAnalysis?.summary}>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                        {selectedDocument()?.aiAnalysis?.summary}
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>

              {/* Tax Form Details (W-2, 1099s, 1098s, etc.) */}
              <TaxFormViewer
                document={selectedDocument()!}
                onShowQR={handleShowMultiDocumentQR}
                onTextQR={handleTextQR}
                onQRMonthly={handleQRMonthly}
              />

              {/* Personal Document Visualization (ID, SSN, Passport) */}
              <PersonalDocViewer document={selectedDocument()!} />

              {/* Auto-fill client data button for personal docs */}
              <Show when={props.onClientChange && categorizeDocument(selectedDocument()!) === 'personal'}>
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(139, 92, 246, 0.06)',
                  'border-radius': '8px',
                  'margin-bottom': '1.5rem',
                }}>
                  <button
                    onClick={() => {
                      handleAutoFillFromPersonalDocs();
                      setSelectedDocument(null);
                    }}
                    style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 1rem',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      'border-radius': '6px',
                      cursor: 'pointer',
                      'font-size': '0.8125rem',
                      'font-weight': '600',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#7c3aed'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#8b5cf6'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <polyline points="17 11 19 13 23 9" />
                    </svg>
                    Fill Client Data from this Document
                  </button>
                  <span style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
                    Auto-fill name, address, SSN, and ID info into client record
                  </span>
                </div>
              </Show>

              {/* Raw extracted data for personal docs (debug/review) */}
              <Show when={categorizeDocument(selectedDocument()!) === 'personal' && selectedDocument()?.extractedData}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>Extracted Data</div>
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--surface-alt, #f9fafb)',
                    'border-radius': '8px',
                    'font-size': '0.8125rem',
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '0.375rem',
                  }}>
                    <For each={Object.entries(selectedDocument()?.extractedData || {}).filter(([k]) => k !== 'rawText')}>
                      {([key, val]) => (
                        <div>
                          <span style={{ color: 'var(--text-secondary)', 'font-size': '0.75rem' }}>{key}: </span>
                          <span style={{ 'font-weight': '500' }}>{typeof val === 'string' ? val : JSON.stringify(val)}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Bank Document Details */}
              <BankDocViewer document={selectedDocument()!} />


              {/* Error Message */}
              <Show when={false && selectedDocument()?.errorMessage}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  'border-radius': '8px',
                  color: '#ef4444',
                  'font-size': '0.875rem',
                  'margin-bottom': '1.5rem'
                }}>
                  <strong>Error:</strong> {selectedDocument()?.errorMessage}
                </div>
              </Show>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '1.25rem 1.5rem',
              'border-top': '1px solid var(--border-color, #e5e7eb)',
              'justify-content': 'flex-end'
            }}>
              <Button variant="secondary" onClick={handleCloseDetails}>
                Close
              </Button>
              <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#f59e0b',
                    border: 'none',
                    'border-radius': '6px',
                    color: 'white',
                    'font-weight': '500',
                    cursor: 'pointer',
                    'font-size': '0.875rem',
                    transition: 'background 0.2s ease'
                  }}
                  onClick={() => handleArchiveDocument(selectedDocument()!)}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f59e0b')}
                  onMouseOut={(e) => {  }}
                >
                  Archivar
              </button>
              <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#8b5cf6',
                    border: 'none',
                    'border-radius': '6px',
                    color: 'white',
                    'font-weight': '500',
                    cursor: 'pointer',
                    'font-size': '0.875rem',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.375rem'
                  }}
                  onClick={() => setShowReassignModal(true)}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#7c3aed')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#8b5cf6')}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                    <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                  </svg>
                  Reasignar
              </button>
             
              <Button
                variant="secondary"
                onClick={() => handleAnalyzeDocument(selectedDocument()!)}
              >
                Re-Analyze
              </Button>

            

              <Show when={getDocumentStatus(selectedDocument()!) !== 'verified'}>
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#22c55e',
                    border: 'none',
                    'border-radius': '6px',
                    color: 'white',
                    'font-weight': '500',
                    cursor: 'pointer',
                    'font-size': '0.875rem',
                    transition: 'background 0.2s ease'
                  }}
                  onClick={() => handleVerifyDocument(selectedDocument()!)}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#16a34a')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#22c55e')}
                >
                  Verify
                </button>
              </Show>
              <Button
                variant="primary"
                onClick={() => handleOpenDocument(selectedDocument()!)}
              >
                Open File
              </Button>
            </div>
          </div>
        </div>
      </Show>

      {/* Reassign Document Modal */}
      <Show when={showReassignModal()}>
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
          'z-index': 1001
        }}>
          <div style={{
            background: 'white',
            'border-radius': '12px',
            padding: '1.5rem',
            'max-width': '450px',
            width: '90%',
            'max-height': '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1rem'
            }}>
              <h3 style={{ margin: 0, 'font-size': '1.125rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 20 20" fill="#8b5cf6" style={{ width: '20px', height: '20px' }}>
                  <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                </svg>
                Reasignar Documento
              </h3>
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setReassignSearchQuery('');
                  setReassignSearchResults([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  'font-size': '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >×</button>
            </div>

            <p style={{ 'font-size': '0.875rem', color: '#6b7280', 'margin-bottom': '1rem' }}>
              Selecciona el cliente al que deseas mover este documento.
            </p>

            {/* Current document info */}
            <div style={{
              background: '#f3f4f6',
              padding: '0.75rem',
              'border-radius': '8px',
              'margin-bottom': '1rem',
              'font-size': '0.875rem'
            }}>
              <div style={{ 'font-weight': '500' }}>
                {DRAKE_FORM_LABELS[selectedDocument()?.drakeFormType || 'other']}
              </div>
              <div style={{ color: '#6b7280', 'font-size': '0.75rem' }}>
                {selectedDocument()?.originalFileName}
              </div>
            </div>

            {/* Search input */}
            <div style={{ position: 'relative', 'margin-bottom': '0.75rem' }}>
              <input
                type="text"
                placeholder="Buscar cliente por nombre..."
                value={reassignSearchQuery()}
                onInput={(e) => {
                  setReassignSearchQuery(e.currentTarget.value);
                  searchClientsForReassign(e.currentTarget.value);
                }}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #d1d5db',
                  'border-radius': '8px',
                  'font-size': '0.875rem'
                }}
              />
              <Show when={isSearchingClients()}>
                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <span style={{ color: '#9ca3af', 'font-size': '0.75rem' }}>Buscando...</span>
                </div>
              </Show>
            </div>

            {/* Search results */}
            <Show when={reassignSearchResults().length > 0}>
              <div style={{
                border: '1px solid #e5e7eb',
                'border-radius': '8px',
                'max-height': '250px',
                overflow: 'auto'
              }}>
                <For each={reassignSearchResults()}>
                  {(client) => (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        'border-bottom': '1px solid #f3f4f6',
                        cursor: isReassigning() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        opacity: isReassigning() ? 0.5 : 1
                      }}
                      onMouseOver={(e) => !isReassigning() && (e.currentTarget.style.background = '#f9fafb')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                      onClick={() => !isReassigning() && handleReassignDocument(client)}
                    >
                      <div>
                        <div style={{ 'font-weight': '500' }}>{client.firstName} {client.lastName}</div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          {client.email || 'Sin email'} • Tax Year {client.taxYear || 'N/A'}
                        </div>
                      </div>
                      <svg viewBox="0 0 20 20" fill="#8b5cf6" style={{ width: '20px', height: '20px' }}>
                        <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={reassignSearchQuery().length >= 2 && reassignSearchResults().length === 0 && !isSearchingClients()}>
              <div style={{
                'text-align': 'center',
                padding: '2rem',
                color: '#9ca3af'
              }}>
                No se encontraron clientes
              </div>
            </Show>

            <div style={{ 'margin-top': '1rem', display: 'flex', 'justify-content': 'flex-end' }}>
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setReassignSearchQuery('');
                  setReassignSearchResults([]);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  border: 'none',
                  'border-radius': '6px',
                  cursor: 'pointer',
                  'font-weight': '500'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* QR Code Viewer Modal */}
      <QRCodeViewer
        qrText={qrText()}
        isOpen={showQRCode()}
        onClose={() => setShowQRCode(false)}
        title={`${DRAKE_FORM_LABELS[selectedDocument()?.drakeFormType || 'other']} QR Code`}
        convertPipeToTab={true}
        toUpperCase={true}
      />

       {/* QR Code Viewer Modal */}
      <MultiQRCodeViewer
        qrText={qrTextM()}
        isOpen={showQRCodeM()}
        onClose={() => setShowQRCodeM(false)}
        title={`${DRAKE_FORM_LABELS[selectedDocument()?.drakeFormType || 'other']} QR Code`}
        convertPipeToTab={true}
        toUpperCase={true}
      />
    </div>
  );
};

export default DocumentsSection;



/** 


 cp -f ~/Downloads/tax2025/ .claude/tax-returns/pdfs/  

 rsync -av /Users/hectorssg/Downloads/tax2025/ .claude/tax-returns/pdfs/ 


 cp -rp /Users/hectorssg/Downloads/tax2025/* .claude/tax-returns/pdfs/ 

*/


