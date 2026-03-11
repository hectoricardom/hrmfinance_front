import { Component, createSignal, onMount, onCleanup, For, Show, createEffect } from 'solid-js';
import { useParams } from '@solidjs/router';
import { devLog } from '../../../services/utils';
import { Card, Button } from '../../ui';
import {
  TaxClientProfile,
  TaxDocument,
  ChecklistItem,
  DocumentChecklist,
  FILING_STATUS_LABELS,
  CLIENT_STATUS_LABELS,
} from '../types';
import { taxPortalService } from '../services/taxPortalService';
import { taxPortalStore } from '../stores/taxPortalStore';
import {
  DEV_TEST_TOKEN,
  DEV_CLIENTS,
  DEV_DOCUMENTS,
  DEV_MAGIC_LINKS,
} from '../services/devSeedData';
import { firebaseDocumentService, firebaseClientService } from '../services/taxPortalFirebaseService';
import { useTranslation } from '../../../translations';
import { authStore, validateToken } from '../../../stores/authStore';
import DocumentDataViewer from '../components/DocumentDataViewer';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  TAX_FORM_TYPES,
  AIDocumentAnalysis,
  ExtractedDocumentData,
  TaxFormExtractedData,
} from '../../notary/types/documents';

const ClientPortal: Component = () => {
  const params = useParams<{ token: string }>();
  const { t } = useTranslation();

  const [client, setClient] = createSignal<TaxClientProfile | null>(null);
  const [checklist, setChecklist] = createSignal<DocumentChecklist | null>(null);
  const [documents, setDocuments] = createSignal<TaxDocument[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [uploading, setUploading] = createSignal(false);
  const [uploadingItemId, setUploadingItemId] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = createSignal<string | null>(null);
  const [showGoogleLogin, setShowGoogleLogin] = createSignal(false);
  const [googleLoginLoading, setGoogleLoginLoading] = createSignal(false);
  const [viewingDocument, setViewingDocument] = createSignal<TaxDocument | null>(null);

  // AI Analysis State
  const [analyzingDocId, setAnalyzingDocId] = createSignal<string | null>(null);
  const [selectedDocForReview, setSelectedDocForReview] = createSignal<TaxDocument | null>(null);
  const [taxFormData, setTaxFormData] = createSignal<TaxFormExtractedData | null>(null);
  const [extractedData, setExtractedData] = createSignal<ExtractedDocumentData>({});
  const [documentType, setDocumentType] = createSignal<DocumentType>('other');

  // Firebase real-time subscription cleanup function
  let unsubscribeDocuments: (() => void) | null = null;

  // Google Sign-In credential handler (same as Login.tsx)
  const handleGoogleCredentialResponse = async (response: any) => {
    const token = response?.credential;
    if (!token) return;

    setGoogleLoginLoading(true);
    try {
      const url = "https://ssgloghr.com/auth/verifyIdToken";
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Authorization': token,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (data?.signature?.token) {
        const now = new Date().getTime();
        const expire = new Date(now + 60000 * 60 * 24 * 365);
        document.cookie = `ssgl_access_tkn=${data?.signature?.token}; expires=${expire.toUTCString()}; path=/; SameSite=Lax`;
        devLog("✅ Session token saved to cookie");
      }

      await validateToken();
      devLog("✅ User authenticated successfully");

      // After Google login, try to find client by userId or email
      const userId = authStore.state?.user?.id;

      devLog(authStore.state?.user)
      const userEmail = authStore.state?.user?.email;
      if (userId && userEmail) {
        await loadClientByUserIdOrEmail(userId, userEmail);
      } else if (userEmail) {
        // Fallback to email-only search if no userId
        await loadClientByUserIdOrEmail('', userEmail);
      }
    } catch (err) {
      devLog('Google sign-in error:', err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setGoogleLoginLoading(false);
    }
  };

  // Initialize Google Sign-In button
  const initGoogleSignIn = () => {
    const google = (window as any).google;
    if (google) {
      google.accounts.id.initialize({
        client_id: "195275085181-8ccjpgp8v1g80qhnlk6v4lpgid7n81gr.apps.googleusercontent.com",
        callback: handleGoogleCredentialResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("taxPortalGoogleBtn"),
        { theme: "outline", size: "large", shape: "pill", width: 280 }
      );
    }
  };

  // Load client by userId or email (for Google Sign-In users)
  const loadClientByUserIdOrEmail = async (userId: string, email: string) => {
    setIsLoading(true);
    const token = params.token;
    try {
      // First, check if this userId is already linked to a client
      let matchingClient: TaxClientProfile | null = null;

      
      if (userId) {
        matchingClient = await firebaseClientService.getClientByUserId(userId, token);
      }



      if (matchingClient) {
        devLog('✅ Found client by userId:', matchingClient.firstName, matchingClient.lastName);
      } else {
        // If not linked, try to find by email and link the userId
        matchingClient = await firebaseClientService.getClientByEmail(email);

        if (matchingClient && userId) {
          devLog('✅ Found client by email, linking userId:', matchingClient.firstName, matchingClient.lastName);
          // Link the userId to this client
          await firebaseClientService.linkUserIdToClient(matchingClient.id, userId);
          matchingClient.linkedUserId = userId;
        }
      }

      if (matchingClient) {
        setClient(matchingClient);
        setShowGoogleLogin(false);

        // Load documents
        const docs = await firebaseDocumentService.getClientDocuments(matchingClient.id);
        setDocuments(docs);

        // Subscribe to real-time updates
        unsubscribeDocuments = firebaseDocumentService.subscribeToClientDocuments(
          matchingClient.id,
          (updatedDocs) => {
            setDocuments(updatedDocs);
            updatedDocs.forEach(doc => {
              if (!taxPortalStore.state.documents.find(d => d.id === doc.id)) {
                taxPortalStore.addDocument(doc);
              }
            });
            const updatedChecklist = taxPortalStore.getClientChecklist(matchingClient!.id);
            setChecklist(updatedChecklist);
          }
        );

        // Generate checklist
        taxPortalStore.upsertClient(matchingClient);
        const clientChecklist = taxPortalStore.getClientChecklist(matchingClient.id);
        setChecklist(clientChecklist);
      } else {
        setError(t('taxPortal.noAccountFound'));
      }
    } catch (err) {
      devLog('Error loading client:', err);
      setError(t('taxPortal.unableToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  onMount(async () => {
    devLog('🚀 ClientPortal mounted');

    const token = params.token;

    // If no token provided, check if user is already authenticated
    
      if (authStore.isAuthenticated && authStore.state?.user?.email) {
        // User already logged in, load their client profile by userId or email
        const userId = authStore.state?.user?.id || '';
        const userEmail = authStore.state.user.email;
        await loadClientByUserIdOrEmail(userId, userEmail);
      } else {
        // Show Google login
        setShowGoogleLogin(true);
        setIsLoading(false);
        // Initialize Google button after a short delay
        setTimeout(() => initGoogleSignIn(), 200);
      }
    
  });

  // Cleanup Firebase subscription on unmount
  onCleanup(() => {
    if (unsubscribeDocuments) {
      devLog('🔌 ClientPortal: Cleaning up Firebase subscription');
      unsubscribeDocuments();
    }
  });

  const loadClientData = async () => {
    setIsLoading(true);
    setError(null);

    const token = params.token;
    devLog('🔍 ClientPortal: Loading with token:', token);

    try {
      // Check for dev test token directly first (for development testing)
      const devLink = DEV_MAGIC_LINKS.find(l => l.token === token);
      if (devLink) {
        devLog('🧪 ClientPortal: Dev token detected, loading fake data directly');
        const devClient = DEV_CLIENTS.find(c => c.id === devLink.clientId);

        if (devClient) {
          devLog('✅ ClientPortal: Dev client loaded:', devClient.firstName, devClient.lastName);
          setClient(devClient);

          // Load dev documents
          const devDocs = DEV_DOCUMENTS.filter(d => d.clientId === devClient.id);
          devLog('🔍 ClientPortal: Dev documents:', devDocs.length);
          setDocuments(devDocs);

          // Also add to store for checklist generation
          taxPortalStore.upsertClient(devClient);
          devDocs.forEach(doc => {
            if (!taxPortalStore.state.documents.find(d => d.id === doc.id)) {
              taxPortalStore.addDocument(doc);
            }
          });

          // Get checklist from store
          const clientChecklist = taxPortalStore.getClientChecklist(devClient.id);
          devLog('🔍 ClientPortal: Checklist items:', clientChecklist?.items?.length || 0);
          setChecklist(clientChecklist);

          setIsLoading(false);
          return;
        }
      }

      // For real tokens, use the service
      devLog('🔍 ClientPortal: Real token, using service...');
      taxPortalService.loadDevData();

      const validatedClient = await taxPortalService.validateMagicLink(token);
      devLog('🔍 ClientPortal: Validation result:', validatedClient);

      if (!validatedClient) {
        devLog('❌ ClientPortal: No client found for token:', token);
        setError(t('taxPortal.invalidLink') + '. ' + t('taxPortal.requestNewLink'));
        setIsLoading(false);
        return;
      }

      devLog('✅ ClientPortal: Client loaded:', validatedClient.firstName, validatedClient.lastName);
      setClient(validatedClient);

      // Get initial documents
      const storeDocs = taxPortalStore.getClientDocuments(validatedClient.id);
      setDocuments(storeDocs);

      // Subscribe to real-time document updates from Firebase
      try {
        devLog('🔥 ClientPortal: Setting up Firebase real-time subscription');
        unsubscribeDocuments = firebaseDocumentService.subscribeToClientDocuments(
          validatedClient.id,
          (updatedDocs) => {
            devLog('🔄 ClientPortal: Real-time update -', updatedDocs.length, 'documents');
            setDocuments(updatedDocs);

            // Update checklist based on new documents
            updatedDocs.forEach(doc => {
              if (!taxPortalStore.state.documents.find(d => d.id === doc.id)) {
                taxPortalStore.addDocument(doc);
              }
            });
            const updatedChecklist = taxPortalStore.getClientChecklist(validatedClient.id);
            setChecklist(updatedChecklist);
          }
        );
      } catch (err) {
        devLog('Could not set up Firebase real-time subscription:', err);
      }

      const clientChecklist = taxPortalStore.getClientChecklist(validatedClient.id);
      setChecklist(clientChecklist);

    } catch (err) {
      devLog('❌ ClientPortal: Error loading client data:', err);
      setError(t('taxPortal.unableToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload for a checklist item
  const handleFileUpload = async (file: File, checklistItem?: ChecklistItem) => {
    const currentClient = client();
    if (!currentClient) return;

    setUploading(true);
    if (checklistItem) {
      setUploadingItemId(checklistItem.id);
    }
    setError(null);

    try {
      const uploadedDoc = await taxPortalService.uploadDocument(
        currentClient.id,
        file,
        'client'
      );

      // Auto-analyze the document
      try {
        await taxPortalService.analyzeDocument(uploadedDoc);
      } catch (analyzeError) {
        devLog('Auto-analysis failed, will be analyzed by preparer');
      }

      // Refresh data
      const docs = await taxPortalService.getClientDocuments(currentClient.id);
      setDocuments(docs);

      const updatedChecklist = taxPortalStore.getClientChecklist(currentClient.id);
      setChecklist(updatedChecklist);

      setSuccessMessage(`"${file.name}" ${t('taxPortal.uploadSuccess')}`);
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      devLog('Error uploading file:', err);
      setError(t('taxPortal.uploadFailed'));
    } finally {
      setUploading(false);
      setUploadingItemId(null);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: DragEvent, item?: ChecklistItem) => {
    e.preventDefault();
    setDragOverItemId(null);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0], item);
    }
  };

  // Analyze document with AI - convert to tax form data
  const convertToTaxFormData = (analysis: AIDocumentAnalysis): TaxFormExtractedData => {
    const data = analysis.extractedData;
    const formType = analysis.documentType;

    const taxData: TaxFormExtractedData = {
      formType,
      taxYear: data.taxYear || new Date().getFullYear() - 1,
      confidence: analysis.confidence,
      taxpayerName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      taxpayerSSN: data.ssn
    };

    if (formType === 'form_w2' || formType === 'w2') {
      taxData.w2Data = {
        employer: data.employerName || '',
        ein: data.employerEIN || '',
        wages: data.wages || 0,
        federalTaxWithheld: data.federalTaxWithheld || data.federalTax || 0,
        socialSecurityWages: data.socialSecurityWages || 0,
        socialSecurityTaxWithheld: data.socialSecurityTaxWithheld || data.socialSecurityTax || 0,
        medicareWages: data.medicareWages || 0,
        medicareTaxWithheld: data.medicareTaxWithheld || data.medicareTax || 0,
        stateTaxWithheld: data.stateTaxWithheld || data.stateTax || 0,
      };
    } else if (formType === 'form_1099_nec' || formType === 'form_1099_misc' ||
               formType === 'form_1099_int' || formType === 'form_1099_div') {
      const type1099Map: Record<string, '1099-MISC' | '1099-NEC' | '1099-INT' | '1099-DIV'> = {
        'form_1099_nec': '1099-NEC',
        'form_1099_misc': '1099-MISC',
        'form_1099_int': '1099-INT',
        'form_1099_div': '1099-DIV'
      };
      taxData.form1099Data = {
        payer: data.payerName || '',
        payerTIN: data.payerTIN || '',
        type: type1099Map[formType] || '1099-MISC',
        amount: data.nonEmployeeCompensation || data.interestIncome || data.dividendIncome || data.miscellaneousIncome || 0,
        federalTaxWithheld: data.federalTaxWithheld || 0
      };
    } else if (formType === 'form_1098') {
      taxData.form1098Data = {
        lender: data.lenderName || '',
        lenderTIN: data.payerTIN || '',
        mortgageInterest: data.mortgageInterest || 0,
        outstandingPrincipal: data.outstandingPrincipal || 0,
        mortgageInsurancePremiums: data.mortgageInsurancePremiums || 0,
        pointsPaid: data.pointsPaid || 0,
        propertyTaxes: data.propertyTaxes || 0,
        propertyAddress: data.address
      };
    } else if (formType === 'form_1098_t') {
      taxData.form1098TData = {
        institution: data.institutionName || '',
        institutionEIN: data.payerTIN || '',
        studentName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        qualifiedExpenses: data.qualifiedExpenses || 0,
        scholarshipsGrants: data.scholarshipsGrants || 0,
        isAtLeastHalfTime: data.isAtLeastHalfTime || false,
        isGraduateStudent: data.isGraduateStudent || false
      };
    }

    return taxData;
  };

  // Open document for review
  const openForReview = (doc: TaxDocument) => {
    const analysis = (doc as any).aiResult || (doc as any).aiAnalysis || doc.extractedData;
    if (!analysis) {
      setError(t('taxPortal.documentNotAnalyzed') || 'This document has not been analyzed with AI');
      return;
    }

    setSelectedDocForReview(doc);
    setDocumentType(analysis.documentType || analysis.detectedType || 'other');
    setExtractedData(analysis.extractedData || analysis || {});

    // Convert to tax form data
    const taxData = convertToTaxFormData(analysis);
    setTaxFormData(taxData);
  };

  // Close review panel
  const closeReviewPanel = () => {
    setSelectedDocForReview(null);
    setTaxFormData(null);
    setExtractedData({});
    setDocumentType('other');
  };

  // Update extracted data field
  const updateExtractedField = (field: string, value: any) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get document image URL for thumbnails
  const getDocImageUrl = (doc: TaxDocument): string => {
    const im = (doc as any)?.imageMetadata;
    const W = 80;
    const h = im?.height ? W * im.height / im.width : 80;
    return `https://ssgloghr.com/api/images/${doc.id}?format=webp&width=${W}&height=${h}`;
  };

  // Get progress stats
  const getProgress = () => {
    const list = checklist();
    if (!list) return { completed: 0, total: 0, percent: 0 };

    const required = list.items.filter(i => i.required);
    const completed = required.filter(i => i.status !== 'missing');

    return {
      completed: completed.length,
      total: required.length,
      percent: required.length > 0 ? Math.round((completed.length / required.length) * 100) : 0,
    };
  };

  // Group checklist items by category
  const getGroupedItems = () => {
    const list = checklist();
    if (!list) return {};

    const groups: Record<string, ChecklistItem[]> = {
      income: [],
      deductions: [],
      credits: [],
      identity: [],
      prior_return: [],
      other: [],
    };

    list.items.forEach(item => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      } else {
        groups.other.push(item);
      }
    });

    return groups;
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      income: t('taxPortal.incomeDocuments'),
      deductions: t('taxPortal.deductionDocuments'),
      credits: t('taxPortal.creditDocuments'),
      identity: t('taxPortal.identityDocuments'),
      prior_return: t('taxPortal.priorReturns'),
      other: t('taxPortal.otherDocuments'),
    };
    return labels[category] || category;
  };

  const statusIcons: Record<ChecklistItem['status'], string> = {
    missing: '',
    uploaded: '',
    analyzed: '',
    approved: '',
  };

  const statusColors: Record<ChecklistItem['status'], string> = {
    missing: '#ef4444',
    uploaded: '#f59e0b',
    analyzed: '#3b82f6',
    approved: '#22c55e',
  };

  // Styles
  const containerStyle = {
    'max-width': '900px',
    margin: '0 auto',
    padding: '1rem',
  };

  const headerStyle = {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '2rem',
    'border-radius': '12px',
    'margin-bottom': '1.5rem',
  };

  const progressBarStyle = {
    height: '12px',
    background: 'rgba(255,255,255,0.3)',
    'border-radius': '6px',
    overflow: 'hidden',
    'margin-top': '1rem',
  };

  const checklistItemStyle = (item: ChecklistItem, isDragOver: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    padding: '1rem',
    background: isDragOver ? '#e0f2fe' : 'white',
    border: `2px ${isDragOver ? 'dashed' : 'solid'} ${isDragOver ? '#3b82f6' : 'var(--border-color)'}`,
    'border-radius': '8px',
    'margin-bottom': '0.75rem',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={containerStyle}>
      {/* Loading State */}
      <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', padding: '4rem' }}>
          <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>{t('common.loading')}</div>
          <p style={{ color: 'var(--text-muted)' }}>{t('taxPortal.documentPortal')}...</p>
        </div>
      </Show>

      {/* Google Login State */}
      <Show when={showGoogleLogin() && !isLoading()}>
        <div style={{
          'min-height': '80vh',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
        }}>
          <Card>
            <div style={{ padding: '3rem', 'text-align': 'center', 'max-width': '400px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                'border-radius': '50%',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                margin: '0 auto 1.5rem',
                'font-size': '2rem',
                color: 'white',
              }}>
                📄
              </div>
              <h1 style={{ margin: '0 0 0.5rem', 'font-size': '1.75rem', color: '#1e40af' }}>
                {t('taxPortal.documentPortal')}
              </h1>
              <p style={{ margin: '0 0 2rem', color: 'var(--text-muted)' }}>
                {t('taxPortal.signInToAccess')}
              </p>

              <Show when={googleLoginLoading()}>
                <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                  {t('common.loading')}...
                </div>
              </Show>

              <Show when={!googleLoginLoading()}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <div id="taxPortalGoogleBtn" style={{
                    display: 'flex',
                    'justify-content': 'center',
                  }}></div>
                </div>
              </Show>

              <Show when={error()}>
                <p style={{ color: '#dc2626', 'margin-top': '1rem', 'font-size': '0.875rem' }}>
                  {error()}
                </p>
              </Show>

              <div style={{
                'margin-top': '2rem',
                'padding-top': '1.5rem',
                'border-top': '1px solid var(--border-color)',
              }}>
                <p style={{ margin: 0, 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.contactPreparer')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Show>

      {/* Error State */}
      <Show when={error() && !isLoading() && !showGoogleLogin()}>
        <Card>
          <div style={{ padding: '3rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>!</div>
            <h2 style={{ color: '#dc2626', 'margin-bottom': '1rem' }}>{t('taxPortal.accessError')}</h2>
            <p style={{ color: 'var(--text-muted)', 'margin-bottom': '1.5rem' }}>{error()}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              {t('common.refresh')}
            </Button>
          </div>
        </Card>
      </Show>

      {/* Success Message Toast */}
      <Show when={successMessage()}>
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          background: '#22c55e',
          color: 'white',
          padding: '1rem 1.5rem',
          'border-radius': '8px',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
          'z-index': 1000,
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
        }}>
          {successMessage()}
        </div>
      </Show>

      {/* Main Content */}
      <Show when={client() && !isLoading() && !error()}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={{ margin: 0, 'font-size': '1.75rem' }}>
            {t('taxPortal.welcome')}, {client()!.firstName}!
          </h1>
          <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>
            {client()!.taxYear} {t('taxPortal.documentPortal')}
          </p>

          {/* Progress Bar */}
          <div style={progressBarStyle}>
            <div style={{
              height: '100%',
              width: `${getProgress().percent}%`,
              background: 'white',
              'border-radius': '6px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'margin-top': '0.5rem',
            'font-size': '0.875rem',
          }}>
            <span>{getProgress().completed} {t('taxPortal.ofRequired').toLowerCase()} {getProgress().total}</span>
            <span style={{ 'font-weight': '600' }}>{getProgress().percent}{t('taxPortal.percentComplete')}</span>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              {t('taxPortal.howToUpload')}
            </h3>
            <ul style={{ margin: 0, 'padding-left': '1.25rem', color: 'var(--text-muted)' }}>
              <li>{t('taxPortal.instruction1')}</li>
              <li>{t('taxPortal.instruction2')}</li>
              <li>{t('taxPortal.instruction3')}</li>
              <li>{t('taxPortal.instruction4')}</li>
            </ul>
          </div>
        </Card>

        {/* General Upload Area */}
        <Card>
          <div style={{ padding: '1.5rem', 'margin-top': '1rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>{t('taxPortal.quickUpload')}</h3>
            <div
              onDrop={(e) => handleDrop(e)}
              onDragOver={(e) => { e.preventDefault(); setDragOverItemId('general'); }}
              onDragLeave={() => setDragOverItemId(null)}
              style={{
                border: `2px dashed ${dragOverItemId() === 'general' ? '#3b82f6' : 'var(--border-color)'}`,
                'border-radius': '12px',
                padding: '2rem',
                'text-align': 'center',
                background: dragOverItemId() === 'general' ? '#e0f2fe' : 'var(--gray-50)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('generalFileInput')?.click()}
            >
              <div style={{ 'font-size': '2.5rem', 'margin-bottom': '0.5rem' }}>
                {uploading() && !uploadingItemId() ? t('taxPortal.uploading') : t('common.upload')}
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {t('taxPortal.dragDropHere')} {t('taxPortal.orClickToBrowse')}
              </p>
            </div>
            <input
              id="generalFileInput"
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) handleFileUpload(file);
                e.currentTarget.value = '';
              }}
            />
          </div>
        </Card>

        {/* Document Checklist */}
        <For each={Object.entries(getGroupedItems())}>
          {([category, items]) => (
            <Show when={items.length > 0}>
              <Card>
                <div style={{ padding: '1.5rem', 'margin-top': '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    {getCategoryLabel(category)}
                    <span style={{
                      background: 'var(--gray-100)',
                      padding: '0.25rem 0.5rem',
                      'border-radius': '999px',
                      'font-size': '0.875rem',
                      'font-weight': 'normal',
                    }}>
                      {items.filter(i => i.status !== 'missing').length}/{items.length}
                    </span>
                  </h3>

                  <For each={items}>
                    {(item) => (
                      <div
                        style={checklistItemStyle(item, dragOverItemId() === item.id)}
                        onDrop={(e) => handleDrop(e, item)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverItemId(item.id); }}
                        onDragLeave={() => setDragOverItemId(null)}
                      >
                        {/* Status Icon */}
                        <div style={{
                          'font-size': '1.5rem',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          background: `${statusColors[item.status]}20`,
                          'border-radius': '50%',
                        }}>
                          {statusIcons[item.status]}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            'font-weight': '600',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.5rem',
                          }}>
                            {item.name}
                            <Show when={item.required}>
                              <span style={{ color: '#ef4444' }}>*</span>
                            </Show>
                          </div>
                          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                            {item.description}
                          </div>
                          <Show when={item.uploadedDocumentIds.length > 0}>
                            <div style={{
                              'font-size': '0.75rem',
                              color: statusColors[item.status],
                              'margin-top': '0.25rem',
                            }}>
                              {item.uploadedDocumentIds.length} document(s) uploaded
                              {item.status === 'approved' && ' - Approved'}
                              {item.status === 'analyzed' && ' - Under review'}
                            </div>
                          </Show>
                        </div>

                        {/* Upload Button */}
                        <div>
                          <input
                            id={`file-${item.id}`}
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.currentTarget.files?.[0];
                              if (file) handleFileUpload(file, item);
                              e.currentTarget.value = '';
                            }}
                          />
                          <Button
                            variant={item.status === 'missing' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => document.getElementById(`file-${item.id}`)?.click()}
                            disabled={uploading() && uploadingItemId() === item.id}
                          >
                            {uploading() && uploadingItemId() === item.id
                              ? t('taxPortal.uploading')
                              : item.status === 'missing'
                                ? t('common.upload')
                                : t('taxPortal.addMore')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Card>
            </Show>
          )}
        </For>

        {/* Uploaded Documents List - Enhanced with Tax Data Display */}
        <Show when={documents().length > 0}>
          <Card>
            <div style={{ padding: '1rem', 'margin-top': '1rem' }}>
              <h3 style={{ margin: '0 0 1rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                📊 {t('taxPortal.documentsUploaded')} ({documents().length})
              </h3>

              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                <For each={documents()}>
                  {(doc) => {
                    const analysis = (doc as any).aiResult || (doc as any).aiAnalysis;
                    const hasAIResult = !!(analysis || doc.aiAnalyzed);
                    const extractedData = analysis?.extractedData || doc.extractedData;
                    const detectedType = analysis?.documentType || analysis?.detectedType || doc.detectedType;

                    return (
                      <div
                        style={{
                          display: 'flex',
                          'align-items': 'flex-start',
                          gap: '1rem',
                          padding: '1rem',
                          background: hasAIResult ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'var(--gray-50)',
                          'border-radius': '12px',
                          border: hasAIResult ? '2px solid #22c55e' : '1px solid var(--border-color)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Document Thumbnail */}
                        <div style={{ 'flex-shrink': 0 }}>
                          <Show when={doc?.mimeType?.includes('image')}>
                            <img
                              src={getDocImageUrl(doc)}
                              alt="Document"
                              style={{
                                width: '70px',
                                height: '70px',
                                'object-fit': 'cover',
                                'border-radius': '8px',
                                border: '1px solid var(--border-color)'
                              }}
                            />
                          </Show>
                          <Show when={!doc?.mimeType?.includes('image')}>
                            <div style={{
                              width: '70px',
                              height: '70px',
                              display: 'flex',
                              'align-items': 'center',
                              'justify-content': 'center',
                              background: '#ef4444',
                              color: 'white',
                              'border-radius': '8px',
                              'font-weight': '700',
                              'font-size': '0.875rem'
                            }}>
                              PDF
                            </div>
                          </Show>
                        </div>

                        {/* Document Info */}
                        <div style={{ flex: 1, 'min-width': 0 }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.25rem' }}>
                            <span style={{ 'font-weight': '600', 'font-size': '1rem' }}>
                              {hasAIResult && detectedType ? (DOCUMENT_TYPE_LABELS[detectedType as DocumentType] || detectedType) : doc?.originalFileName}
                            </span>
                            <Show when={hasAIResult && analysis?.confidence}>
                              <span style={{
                                'font-size': '0.7rem',
                                background: '#22c55e',
                                color: 'white',
                                padding: '0.15rem 0.5rem',
                                'border-radius': '999px',
                              }}>
                                {Math.round(analysis.confidence * 100)}% AI
                              </span>
                            </Show>
                          </div>

                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                            {doc?.originalFileName} • {new Date(doc?.uploadedAt).toLocaleDateString()}
                          </div>

                          {/* Extracted Tax Data Display */}
                          <Show when={hasAIResult && extractedData}>
                            <div style={{
                              background: 'white',
                              padding: '0.75rem',
                              'border-radius': '8px',
                              'font-size': '0.8rem',
                              'margin-top': '0.5rem',
                            }}>
                              {/* W-2 Data */}
                              <Show when={detectedType === 'form_w2' || detectedType === 'w2'}>
                                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.5rem' }}>
                                  <Show when={extractedData.employerName}>
                                    <div><strong>Employer:</strong> {extractedData.employerName}</div>
                                  </Show>
                                  <Show when={extractedData.taxYear}>
                                    <div><strong>Tax Year:</strong> {extractedData.taxYear}</div>
                                  </Show>
                                  <Show when={extractedData.wages}>
                                    <div><strong>Wages:</strong> {formatCurrency(extractedData.wages)}</div>
                                  </Show>
                                  <Show when={extractedData.federalTaxWithheld || extractedData.federalTax}>
                                    <div><strong>Fed Tax Withheld:</strong> {formatCurrency(extractedData.federalTaxWithheld || extractedData.federalTax)}</div>
                                  </Show>
                                  <Show when={extractedData.socialSecurityWages}>
                                    <div><strong>SS Wages:</strong> {formatCurrency(extractedData.socialSecurityWages)}</div>
                                  </Show>
                                  <Show when={extractedData.medicareWages}>
                                    <div><strong>Medicare Wages:</strong> {formatCurrency(extractedData.medicareWages)}</div>
                                  </Show>
                                </div>
                              </Show>

                              {/* 1099 Data */}
                              <Show when={detectedType?.includes('1099')}>
                                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.5rem' }}>
                                  <Show when={extractedData.payerName}>
                                    <div><strong>Payer:</strong> {extractedData.payerName}</div>
                                  </Show>
                                  <Show when={extractedData.taxYear}>
                                    <div><strong>Tax Year:</strong> {extractedData.taxYear}</div>
                                  </Show>
                                  <Show when={extractedData.nonEmployeeCompensation}>
                                    <div><strong>Amount:</strong> {formatCurrency(extractedData.nonEmployeeCompensation)}</div>
                                  </Show>
                                  <Show when={extractedData.interestIncome}>
                                    <div><strong>Interest:</strong> {formatCurrency(extractedData.interestIncome)}</div>
                                  </Show>
                                  <Show when={extractedData.dividendIncome}>
                                    <div><strong>Dividends:</strong> {formatCurrency(extractedData.dividendIncome)}</div>
                                  </Show>
                                </div>
                              </Show>

                              {/* 1098 Mortgage Data */}
                              <Show when={detectedType === 'form_1098'}>
                                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.5rem' }}>
                                  <Show when={extractedData.lenderName}>
                                    <div><strong>Lender:</strong> {extractedData.lenderName}</div>
                                  </Show>
                                  <Show when={extractedData.mortgageInterest}>
                                    <div><strong>Interest Paid:</strong> {formatCurrency(extractedData.mortgageInterest)}</div>
                                  </Show>
                                  <Show when={extractedData.propertyTaxes}>
                                    <div><strong>Property Taxes:</strong> {formatCurrency(extractedData.propertyTaxes)}</div>
                                  </Show>
                                </div>
                              </Show>

                              {/* 1098-T Education Data */}
                              <Show when={detectedType === 'form_1098_t'}>
                                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.5rem' }}>
                                  <Show when={extractedData.institutionName}>
                                    <div><strong>Institution:</strong> {extractedData.institutionName}</div>
                                  </Show>
                                  <Show when={extractedData.qualifiedExpenses}>
                                    <div><strong>Tuition Paid:</strong> {formatCurrency(extractedData.qualifiedExpenses)}</div>
                                  </Show>
                                  <Show when={extractedData.scholarshipsGrants}>
                                    <div><strong>Scholarships:</strong> {formatCurrency(extractedData.scholarshipsGrants)}</div>
                                  </Show>
                                </div>
                              </Show>

                              {/* Generic fallback for other document types */}
                              <Show when={!['form_w2', 'w2', 'form_1098', 'form_1098_t'].includes(detectedType || '') && !detectedType?.includes('1099')}>
                                <Show when={extractedData.taxYear}>
                                  <div><strong>Tax Year:</strong> {extractedData.taxYear}</div>
                                </Show>
                                <Show when={extractedData.firstName || extractedData.lastName}>
                                  <div><strong>Name:</strong> {extractedData.firstName} {extractedData.lastName}</div>
                                </Show>
                              </Show>
                            </div>
                          </Show>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', 'flex-shrink': 0 }}>
                          <div style={{
                            padding: '0.25rem 0.75rem',
                            'border-radius': '999px',
                            'font-size': '0.75rem',
                            'font-weight': '500',
                            background: statusColors[doc.status] + '20',
                            color: statusColors[doc.status],
                            'text-align': 'center',
                          }}>
                            {doc.status === 'pending' && t('taxPortal.processing')}
                            {doc.status === 'analyzed' && t('taxPortal.underReview')}
                            {doc.status === 'approved' && t('taxPortal.approved')}
                            {doc.status === 'rejected' && t('taxPortal.needsAttention')}
                            {doc.status === 'reviewed' && t('taxPortal.reviewed')}
                          </div>

                          <Show when={hasAIResult}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openForReview(doc)}
                            >
                              📋 {t('taxPortal.viewDetails') || 'View Details'}
                            </Button>
                          </Show>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </Card>
        </Show>

        {/* Help Section */}
        <Card>
          <div style={{ padding: '1.5rem', 'margin-top': '1rem', 'text-align': 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>{t('taxPortal.needHelp')}</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {t('taxPortal.contactPreparer')}
            </p>
          </div>
        </Card>
      </Show>

      {/* Document Data Viewer Modal - Read Only for Clients */}
      <Show when={viewingDocument()}>
        <DocumentDataViewer
          document={viewingDocument()!}
          onClose={() => setViewingDocument(null)}
          readOnly={true}
        />
      </Show>

      {/* Tax Form Review Panel Modal */}
      <Show when={selectedDocForReview() && taxFormData()}>
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'white',
            'border-radius': '16px',
            'max-width': '700px',
            width: '100%',
            'max-height': '90vh',
            'overflow-y': 'auto',
            'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              'border-bottom': '1px solid var(--border-color)',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              'border-radius': '16px 16px 0 0',
              color: 'white',
            }}>
              <div>
                <h2 style={{ margin: 0, 'font-size': '1.25rem' }}>
                  📋 {t('taxPortal.taxFormDetails') || 'Tax Form Details'}
                </h2>
                <p style={{ margin: '0.25rem 0 0', opacity: 0.9, 'font-size': '0.875rem' }}>
                  {DOCUMENT_TYPE_LABELS[documentType() as DocumentType] || documentType()}
                </p>
              </div>
              <button
                onClick={closeReviewPanel}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  'font-size': '1.25rem',
                  cursor: 'pointer',
                  padding: '0.5rem 0.75rem',
                  'border-radius': '8px',
                  color: 'white',
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              {/* Tax Year & Confidence */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                'margin-bottom': '1.5rem',
                'flex-wrap': 'wrap',
              }}>
                <div style={{
                  flex: 1,
                  'min-width': '150px',
                  padding: '1rem',
                  background: 'var(--gray-50)',
                  'border-radius': '12px',
                  'text-align': 'center',
                }}>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                    {t('taxPortal.taxYear') || 'Tax Year'}
                  </div>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#1e40af' }}>
                    {taxFormData()?.taxYear || new Date().getFullYear() - 1}
                  </div>
                </div>
                <Show when={taxFormData()?.confidence}>
                  <div style={{
                    flex: 1,
                    'min-width': '150px',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    'border-radius': '12px',
                    'text-align': 'center',
                  }}>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                      AI Confidence
                    </div>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#22c55e' }}>
                      {Math.round((taxFormData()?.confidence || 0) * 100)}%
                    </div>
                  </div>
                </Show>
              </div>

              {/* W-2 Form Details */}
              <Show when={taxFormData()?.w2Data}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#1e40af', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    📋 W-2 {t('taxPortal.formDetails') || 'Form Details'}
                  </h4>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(2, 1fr)',
                    gap: '1rem',
                    background: 'var(--gray-50)',
                    padding: '1.25rem',
                    'border-radius': '12px',
                  }}>
                    <div>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>
                        {t('taxPortal.employer') || 'Employer'}
                      </label>
                      <div style={{ 'font-weight': '600' }}>{taxFormData()?.w2Data?.employer || '-'}</div>
                    </div>
                    <div>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>
                        EIN
                      </label>
                      <div style={{ 'font-weight': '600' }}>{taxFormData()?.w2Data?.ein || '-'}</div>
                    </div>
                    <div style={{ 'grid-column': 'span 2', 'border-top': '1px solid var(--border-color)', 'padding-top': '1rem', 'margin-top': '0.5rem' }}>
                      <h5 style={{ margin: '0 0 0.75rem', 'font-size': '0.875rem' }}>Income & Withholdings</h5>
                      <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                          <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Box 1 - Wages</div>
                          <div style={{ 'font-size': '1.1rem', 'font-weight': '700', color: '#1e40af' }}>
                            {formatCurrency(taxFormData()?.w2Data?.wages || 0)}
                          </div>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                          <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Box 2 - Federal Tax Withheld</div>
                          <div style={{ 'font-size': '1.1rem', 'font-weight': '700', color: '#dc2626' }}>
                            {formatCurrency(taxFormData()?.w2Data?.federalTaxWithheld || 0)}
                          </div>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                          <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Box 3 - SS Wages</div>
                          <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>
                            {formatCurrency(taxFormData()?.w2Data?.socialSecurityWages || 0)}
                          </div>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                          <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Box 4 - SS Tax</div>
                          <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>
                            {formatCurrency(taxFormData()?.w2Data?.socialSecurityTaxWithheld || 0)}
                          </div>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                          <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Box 5 - Medicare Wages</div>
                          <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>
                            {formatCurrency(taxFormData()?.w2Data?.medicareWages || 0)}
                          </div>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                          <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Box 6 - Medicare Tax</div>
                          <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>
                            {formatCurrency(taxFormData()?.w2Data?.medicareTaxWithheld || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* 1099 Form Details */}
              <Show when={taxFormData()?.form1099Data}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#1e40af', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    📝 1099 {t('taxPortal.formDetails') || 'Form Details'}
                  </h4>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(2, 1fr)',
                    gap: '1rem',
                    background: 'var(--gray-50)',
                    padding: '1.25rem',
                    'border-radius': '12px',
                  }}>
                    <div>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>
                        Payer
                      </label>
                      <div style={{ 'font-weight': '600' }}>{taxFormData()?.form1099Data?.payer || '-'}</div>
                    </div>
                    <div>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>
                        Type
                      </label>
                      <div style={{ 'font-weight': '600' }}>{taxFormData()?.form1099Data?.type || '-'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Amount</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#1e40af' }}>
                        {formatCurrency(taxFormData()?.form1099Data?.amount || 0)}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Federal Tax Withheld</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#dc2626' }}>
                        {formatCurrency(taxFormData()?.form1099Data?.federalTaxWithheld || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* 1098 Mortgage Form Details */}
              <Show when={taxFormData()?.form1098Data}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#1e40af', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    🏠 1098 Mortgage {t('taxPortal.formDetails') || 'Form Details'}
                  </h4>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(2, 1fr)',
                    gap: '1rem',
                    background: 'var(--gray-50)',
                    padding: '1.25rem',
                    'border-radius': '12px',
                  }}>
                    <div style={{ 'grid-column': 'span 2' }}>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>
                        Lender
                      </label>
                      <div style={{ 'font-weight': '600' }}>{taxFormData()?.form1098Data?.lender || '-'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Mortgage Interest Paid</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#22c55e' }}>
                        {formatCurrency(taxFormData()?.form1098Data?.mortgageInterest || 0)}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Property Taxes</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#22c55e' }}>
                        {formatCurrency(taxFormData()?.form1098Data?.propertyTaxes || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* 1098-T Education Form Details */}
              <Show when={taxFormData()?.form1098TData}>
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#1e40af', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    🎓 1098-T Education {t('taxPortal.formDetails') || 'Form Details'}
                  </h4>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(2, 1fr)',
                    gap: '1rem',
                    background: 'var(--gray-50)',
                    padding: '1.25rem',
                    'border-radius': '12px',
                  }}>
                    <div style={{ 'grid-column': 'span 2' }}>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', display: 'block', 'margin-bottom': '0.25rem' }}>
                        Institution
                      </label>
                      <div style={{ 'font-weight': '600' }}>{taxFormData()?.form1098TData?.institution || '-'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Qualified Expenses</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#1e40af' }}>
                        {formatCurrency(taxFormData()?.form1098TData?.qualifiedExpenses || 0)}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'white', 'border-radius': '8px' }}>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>Scholarships/Grants</div>
                      <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#f59e0b' }}>
                        {formatCurrency(taxFormData()?.form1098TData?.scholarshipsGrants || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Info Note */}
              <div style={{
                padding: '1rem',
                background: '#fef3c7',
                'border-radius': '8px',
                'font-size': '0.875rem',
                color: '#92400e',
              }}>
                <strong>ℹ️ {t('taxPortal.note') || 'Note'}:</strong> {t('taxPortal.dataExtractedByAI') || 'This data was automatically extracted by AI. Your tax preparer will verify all information before filing.'}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              'border-top': '1px solid var(--border-color)',
              display: 'flex',
              'justify-content': 'flex-end',
              gap: '0.75rem',
            }}>
              <Button variant="outline" onClick={closeReviewPanel}>
                {t('common.close') || 'Close'}
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ClientPortal;
