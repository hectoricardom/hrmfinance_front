import { Component, createSignal, For, Show, createMemo, onMount, createEffect } from 'solid-js';
import { devLog } from '../../../services/utils';
import { Card, Button } from '../../ui';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  TAX_FORM_TYPES,
  AIDocumentAnalysis,
  ExtractedDocumentData,
  TaxFormExtractedData,
  NotaryDocument
} from '../../notary/types/documents';
import { inventoryApi } from '../../../services/apiAdapter';
import { W2Form, Form1099, Form1098, Form1098T } from '../types/taxTypes';
import { NotaryCustomer } from '../../notary/types';

interface TaxDocumentUploaderProps {
  onW2Added?: (w2: W2Form) => void;
  onForm1099Added?: (form1099: Form1099) => void;
  onForm1098Added?: (form1098: Form1098) => void;
  onForm1098TAdded?: (form1098T: Form1098T) => void;
  onDocumentProcessed?: (analysis: TaxFormExtractedData) => void;
}

const TaxDocumentUploader: Component<TaxDocumentUploaderProps> = (props) => {
  // Client Selection State
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<NotaryCustomer[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [showDropdown, setShowDropdown] = createSignal(false);
  const [selectedClient, setSelectedClient] = createSignal<NotaryCustomer | null>(null);
  let searchTimeout: number | undefined;

  // Document Upload State
  const [uploading, setUploading] = createSignal(false);
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [filePreview, setFilePreview] = createSignal<string>('');
  const [dragOver, setDragOver] = createSignal(false);

  // Uploaded Documents List
  const [documents, setDocuments] = createSignal<NotaryDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = createSignal(false);

  // AI Analysis State
  const [analyzingDocId, setAnalyzingDocId] = createSignal<string | null>(null);
  const [selectedDocForReview, setSelectedDocForReview] = createSignal<NotaryDocument | null>(null);
  const [taxFormData, setTaxFormData] = createSignal<TaxFormExtractedData | null>(null);
  const [extractedData, setExtractedData] = createSignal<ExtractedDocumentData>({});
  const [documentType, setDocumentType] = createSignal<DocumentType>('other');

  // UI State
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

  // Filter only tax form types for the dropdown
  const taxFormTypeLabels = createMemo(() => {
    const labels: Record<string, string> = {};
    TAX_FORM_TYPES.forEach(type => {
      labels[type] = DOCUMENT_TYPE_LABELS[type];
    });
    return labels;
  });

  // Load documents when client is selected
  createEffect(() => {
    const client = selectedClient();
    const clientId = client?.id || client?.clientNotaryId;
    if (clientId) {
      loadDocuments(clientId);
    }
  });

  // Search for clients
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await inventoryApi.searchClientNotary(query);
        setSearchResults(results || []);
        setShowDropdown(true);
      } catch (err) {
        devLog('Error searching clients:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300) as unknown as number;
  };

  // Select a client
  const selectClient = (client: NotaryCustomer) => {
    setSelectedClient(client);
    setSearchQuery(`${client.firstName} ${client.lastName}`);
    setShowDropdown(false);
    setError(null);
    setSuccessMessage(null);
  };

  // Clear client selection
  const clearClient = () => {
    setSelectedClient(null);
    setSearchQuery('');
    setDocuments([]);
    setSelectedDocForReview(null);
    setTaxFormData(null);
  };

  // Load documents for selected client
  const loadDocuments = async (clientId: string) => {
    setLoadingDocs(true);
    try {
      const docs = await inventoryApi.getDocuments(clientId);
      setDocuments(docs || []);
    } catch (err) {
      devLog('Error loading documents:', err);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFilePreview('pdf');
    } else {
      setFilePreview('');
    }
  };

  // Handle drag and drop
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Upload document (without AI analysis)
  const handleUpload = async () => {
    const file = selectedFile();
    const client = selectedClient();

    if (!file || !client) {
      setError('Seleccione un cliente y un archivo');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const metadata = {
        documentType: 'tax_return',
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isTaxDocument: true
      };

      const clientId = client.id || client.clientNotaryId || '';
      const uploadedDoc = await inventoryApi.uploadDocument(file, clientId, metadata);
      devLog('Document uploaded:', uploadedDoc);

      // Refresh documents list
      await loadDocuments(clientId);

      // Reset file selection
      setSelectedFile(null);
      setFilePreview('');
      setSuccessMessage('Documento subido exitosamente');

    } catch (err) {
      devLog('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  // Analyze document with AI
  const handleAnalyzeWithAI = async (doc: NotaryDocument) => {
    setAnalyzingDocId(doc.id);
    setError(null);

    try {
      devLog('Processing document with AI:', doc.id);

      const aiResult = await inventoryApi.processDocument(
        doc.id,
        doc.fileUrl || (doc as any).url,
        doc.mimeType
      );

      devLog('AI processing result:', aiResult);

      // Extract AI analysis
      const analysis: AIDocumentAnalysis = aiResult.aiAnalysis || aiResult;

      // Update document with AI results
      const updates = {
        aiAnalysis: analysis,
        aiResult: analysis,
        aiAnalyzedAt: Date.now(),
        documentType: analysis.detectedType,
        extractedData: analysis.extractedData
      };

      await inventoryApi.updateDocument(doc.id, updates);

      // Refresh documents list
      const client = selectedClient();
      if (client) {
        await loadDocuments(client.id || client.clientNotaryId || '');
      }

      setSuccessMessage(`Documento analizado: ${DOCUMENT_TYPE_LABELS[analysis.detectedType]} (${(analysis.confidence * 100).toFixed(0)}% confianza)`);

    } catch (err) {
      devLog('Error analyzing document:', err);
      setError(err instanceof Error ? err.message : 'Error al analizar el documento');
    } finally {
      setAnalyzingDocId(null);
    }
  };

  // Open document for review and add to calculator
  const openForReview = (doc: NotaryDocument) => {
    const analysis = doc.aiResult || doc.aiAnalysis;
    if (!analysis) {
      setError('Este documento no ha sido analizado con IA');
      return;
    }

    devLog(analysis)

    setSelectedDocForReview(doc);
    setDocumentType(analysis.documentType);
    setExtractedData(analysis.extractedData || {});

    // Convert to tax form data
    const taxData = convertToTaxFormData(analysis);
    setTaxFormData(taxData);
  };

  // Convert AI analysis to tax form data
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


    devLog(data)
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

  // Add to tax calculator
  const handleAddToCalculator = () => {
    const taxData = taxFormData();
    const docType = documentType();

    if (!taxData) {
      setError('No hay datos para agregar');
      return;
    }

    // Call appropriate callback based on form type
    if ((docType === 'form_w2' || docType === 'w2') && taxData.w2Data && props.onW2Added) {
      const w2: W2Form = {
        id: `w2-${Date.now()}`,
        employer: taxData.w2Data.employer,
        ein: taxData.w2Data.ein,
        wages: Math.floor(taxData.w2Data.wages),
        federalTaxWithheld:  Math.floor(taxData.w2Data.federalTaxWithheld),
        socialSecurityWages:  Math.floor(taxData.w2Data.socialSecurityWages),
        socialSecurityTaxWithheld:  Math.floor(taxData.w2Data.socialSecurityTaxWithheld),
        medicareWages:  Math.floor(taxData.w2Data.medicareWages),
        medicareTaxWithheld:  Math.floor(taxData.w2Data.medicareTaxWithheld),
        stateTaxWithheld:  Math.floor(taxData.w2Data.stateTaxWithheld)
      };
      props.onW2Added(w2);
      setSuccessMessage('W-2 agregado al calculador de impuestos');
    } else if ((docType === 'form_1099_nec' || docType === 'form_1099_misc' ||
                docType === 'form_1099_int' || docType === 'form_1099_div') &&
                taxData.form1099Data && props.onForm1099Added) {
      const form1099: Form1099 = {
        id: `1099-${Date.now()}`,
        payer: taxData.form1099Data.payer,
        payerTIN: taxData.form1099Data.payerTIN,
        type: taxData.form1099Data.type,
        amount:  Math.floor(taxData.form1099Data.amount),
        federalTaxWithheld:  Math.floor(taxData.form1099Data.federalTaxWithheld),
        description: taxData.form1099Data.description || ''
      };
      props.onForm1099Added(form1099);
      setSuccessMessage('1099 agregado al calculador de impuestos');
    } else if (docType === 'form_1098' && taxData.form1098Data && props.onForm1098Added) {
      const form1098: Form1098 = {
        id: `1098-${Date.now()}`,
        lender: taxData.form1098Data.lender,
        lenderTIN: taxData.form1098Data.lenderTIN,
        mortgageInterest:  Math.floor(taxData.form1098Data.mortgageInterest),
        outstandingPrincipal:  Math.floor(taxData.form1098Data.outstandingPrincipal),
        mortgageOriginationDate: '',
        refundOfOverpaidInterest: 0,
        mortgageInsurancePremiums:  Math.floor(taxData.form1098Data.mortgageInsurancePremiums),
        pointsPaid:  Math.floor(taxData.form1098Data.pointsPaid),
        propertyAddress: taxData.form1098Data.propertyAddress || '',
        propertyTaxes:  Math.floor(taxData.form1098Data.propertyTaxes),
        isMainHome: true,
        description: ''
      };
      props.onForm1098Added(form1098);
      setSuccessMessage('1098 agregado al calculador de impuestos');
    } else if (docType === 'form_1098_t' && taxData.form1098TData && props.onForm1098TAdded) {
      const form1098T: Form1098T = {
        id: `1098t-${Date.now()}`,
        institution: taxData.form1098TData.institution,
        institutionEIN: taxData.form1098TData.institutionEIN,
        studentSSN: taxData.taxpayerSSN || '',
        studentName: taxData.form1098TData.studentName,
        qualifiedExpenses:  Math.floor(taxData.form1098TData.qualifiedExpenses),
        adjustmentsPriorYear: 0,
        scholarshipsGrants:  Math.floor(taxData.form1098TData.scholarshipsGrants),
        adjustmentsForPriorYearScholarships: 0,
        isAtLeastHalfTime: taxData.form1098TData.isAtLeastHalfTime,
        isGraduateStudent: taxData.form1098TData.isGraduateStudent,
        academicPeriod: `${taxData.taxYear}`,
        includesAmountsForNextYear: false,
        description: ''
      };
      props.onForm1098TAdded(form1098T);
      setSuccessMessage('1098-T agregado al calculador de impuestos');
    }

    // Close review panel
    setSelectedDocForReview(null);
    setTaxFormData(null);
  };

  // Update extracted data field
  const updateField = (field: string, value: any) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  // Get document image URL
  const getDocImageUrl = (doc: NotaryDocument): string => {
    const im = (doc as any)?.imageMetadata;
    const W = 120;
    const h = im?.height ? W * im.height / im.width : 120;
    return `https://ssgloghr.com/api/images/${doc.id}?format=webp&width=${W}&height=${h}`;
  };

  // Styles
  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'font-size': '1rem',
    'margin-bottom': '0.5rem'
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '600',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };

  return (
    <div>
      {/* Error Message */}
      <Show when={error()}>
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          'border-radius': 'var(--border-radius)',
          'margin-bottom': '1rem',
          color: '#dc2626'
        }}>
          <strong>Error:</strong> {error()}
        </div>
      </Show>

      {/* Success Message */}
      <Show when={successMessage()}>
        <div style={{
          padding: '1rem',
          background: '#dcfce7',
          border: '1px solid #22c55e',
          'border-radius': 'var(--border-radius)',
          'margin-bottom': '1rem',
          color: '#16a34a'
        }}>
          {successMessage()}
        </div>
      </Show>

      {/* Step 1: Client Selection */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span>1️⃣</span> Seleccionar Cliente
          </h4>

          <Show when={!selectedClient()}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar cliente por nombre, teléfono o ID..."
                value={searchQuery()}
                onInput={(e) => handleSearch(e.currentTarget.value)}
                onFocus={() => searchResults().length > 0 && setShowDropdown(true)}
                style={inputStyle}
              />

              {/* Search Results Dropdown */}
              <Show when={showDropdown() && searchResults().length > 0}>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius)',
                  'max-height': '200px',
                  'overflow-y': 'auto',
                  'z-index': 100,
                  'box-shadow': '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  <For each={searchResults()}>
                    {(client) => (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          'border-bottom': '1px solid var(--border-color)',
                          transition: 'background 0.2s'
                        }}
                        onClick={() => selectClient(client)}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ 'font-weight': '600' }}>
                          {client.firstName} {client.lastName}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {client.phoneNumber || client.email || client.clientNotaryId}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={isSearching()}>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.5rem' }}>
                  🔍 Buscando...
                </div>
              </Show>
            </div>
          </Show>

          <Show when={selectedClient()}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              padding: '1rem',
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius)',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ 'font-weight': '600', 'font-size': '1.1rem' }}>
                  {selectedClient()!.firstName} {selectedClient()!.lastName}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {selectedClient()!.phoneNumber} • {selectedClient()!.email || selectedClient()!.clientNotaryId}
                </div>
              </div>
              <Button variant="outline" onClick={clearClient}>
                ✕ Cambiar
              </Button>
            </div>
          </Show>
        </div>
      </Card>

      {/* Step 2: Upload Document (only show if client selected) */}
      <Show when={selectedClient()}>
        <Card>
          <div style={{ padding: '1.5rem', 'margin-top': '1rem' }}>
            <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <span>2️⃣</span> Subir Documento
            </h4>

            {/* Drag & Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver() ? 'var(--primary-color)' : 'var(--border-color)'}`,
                'border-radius': 'var(--border-radius)',
                padding: '2rem',
                'text-align': 'center',
                background: dragOver() ? 'var(--primary-light)' : 'var(--gray-50)',
                cursor: 'pointer',
                'margin-bottom': '1rem'
              }}
              onClick={() => document.getElementById('taxFileInput')?.click()}
            >
              <Show when={!selectedFile()}>
                <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📄</div>
                <div style={{ 'font-weight': '600' }}>Arrastra un documento aquí</div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  o haz clic para seleccionar (PDF, JPG, PNG)
                </div>
              </Show>

              <Show when={selectedFile()}>
                <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>✅</div>
                <div style={{ 'font-weight': '600' }}>{selectedFile()?.name}</div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {(selectedFile()!.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </Show>
            </div>

            <input
              id="taxFileInput"
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {/* Upload Button */}
            <Show when={selectedFile()}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  disabled={uploading()}
                >
                  {uploading() ? '📤 Subiendo...' : '📤 Subir Documento'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setSelectedFile(null); setFilePreview(''); }}
                >
                  ✕ Cancelar
                </Button>
              </div>
            </Show>
          </div>
        </Card>

        {/* Step 3: Documents List */}
        <Card>
          <div style={{ padding: '1.5rem', 'margin-top': '1rem' }}>
            <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <span>3️⃣</span> Documentos del Cliente ({documents().length})
            </h4>

            <Show when={loadingDocs()}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                🔄 Cargando documentos...
              </div>
            </Show>

            <Show when={!loadingDocs() && documents().length === 0}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No hay documentos subidos para este cliente.
              </div>
            </Show>

            <Show when={!loadingDocs() && documents().length > 0}>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
                <For each={documents()}>
                  {(doc) => {
                    const hasAIResult = !!(doc.aiResult || doc.aiAnalysis);
                    const analysis = doc.aiResult || doc.aiAnalysis;

                    return (
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '1rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius)',
                        background: 'white',
                        'align-items': 'center'
                      }}>
                        {/* Thumbnail */}
                        <div style={{ 'flex-shrink': 0 }}>
                          <img
                            src={getDocImageUrl(doc)}
                            alt="Document"
                            style={{
                              width: '80px',
                              height: '80px',
                              'object-fit': 'cover',
                              'border-radius': 'var(--border-radius)',
                              border: '1px solid var(--border-color)'
                            }}
                          />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                            {hasAIResult ? DOCUMENT_TYPE_LABELS[analysis!.detectedType] : doc.originalFileName || 'Documento'}
                          </div>
                          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                            Subido: {new Date(doc.uploadedAt).toLocaleDateString('es-ES')}
                          </div>
                          <Show when={hasAIResult}>
                            <div style={{
                              'margin-top': '0.25rem',
                              'font-size': '0.75rem',
                              color: '#16a34a',
                              display: 'flex',
                              'align-items': 'center',
                              gap: '0.25rem'
                            }}>
                              <span>🤖</span>
                              <span>Analizado ({(analysis!.confidence * 100).toFixed(0)}% confianza)</span>
                            </div>
                            <div style={{
                              'margin-top': '0.25rem',
                              'font-size': '0.75rem',
                              display: 'flex',
                              'align-items': 'center',
                              gap: '0.25rem'
                            }}>
                              <span  style={{
                                color: '#1a73e8',
                                "font-weight": "700",
                                "text-transform": "uppercase"
                              }}> ({(analysis?.documentType)})</span> - 
                              <span> ({(analysis?.extractedData?.taxYear)})</span>
                            </div>

                            <div style={{
                              'margin-top': '0.25rem',
                              'font-size': '0.75rem',
                              color: '#16a34a',
                              display: 'flex',
                              'align-items': 'center',
                              gap: '0.25rem'
                            }}>
                              <span>
                               
                              </span>
                            </div>
                          </Show>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', 'flex-shrink': 0 }}>
                          <Show when={!hasAIResult}>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAnalyzeWithAI(doc)}
                              disabled={analyzingDocId() === doc.id}
                            >
                              {analyzingDocId() === doc.id ? '🔄 Analizando...' : '🤖 Analizar con IA'}
                            </Button>
                          </Show>
                          <Show when={hasAIResult}>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openForReview(doc)}
                            >
                              ➕ Agregar al Calculador
                            </Button>
                          </Show>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </Card>

        {/* Review Panel (when a document is selected for review) */}
        <Show when={selectedDocForReview() && taxFormData()}>
          <Card>
            <div style={{ padding: '1.5rem', 'margin-top': '1rem' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                <h4 style={{ 'font-weight': '600', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <span>✏️</span> Revisar y Agregar al Calculador
                </h4>
                <Button variant="outline" size="sm" onClick={() => { setSelectedDocForReview(null); setTaxFormData(null); }}>
                  ✕ Cerrar
                </Button>
              </div>

              {/* Form Type */}
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={labelStyle}>Tipo de Formulario</label>
                <select
                  value={documentType()}
                  onChange={(e) => setDocumentType(e.currentTarget.value as DocumentType)}
                  style={inputStyle}
                >
                  <For each={Object.entries(taxFormTypeLabels())}>
                    {([value, label]) => (
                      <option value={value}>{label}</option>
                    )}
                  </For>
                </select>
              </div>

              {/* Dynamic Fields Based on Form Type */}
              <div style={{
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius)',
                'margin-bottom': '1rem'
              }}>
                {/* W-2 Fields */}
                <Show when={documentType() === 'form_w2'}>
                  <div style={gridStyle}>
                    <div>
                      <label style={labelStyle}>Empleador</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={extractedData().employerName || ''}
                        onInput={(e) => updateField('employerName', e.currentTarget.value)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>EIN</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={extractedData().employerEIN || ''}
                        onInput={(e) => updateField('employerEIN', e.currentTarget.value)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Salarios (Box 1)</label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={extractedData().wages || ''}
                        onInput={(e) => updateField('wages', parseFloat(e.currentTarget.value) || 0)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Imp. Federal (Box 2)</label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={extractedData().federalTaxWithheld || ''}
                        onInput={(e) => updateField('federalTaxWithheld', parseFloat(e.currentTarget.value) || 0)}
                      />
                    </div>
                  </div>
                </Show>

                {/* 1099 Fields */}
                <Show when={documentType().startsWith('form_1099')}>
                  <div style={gridStyle}>
                    <div>
                      <label style={labelStyle}>Pagador</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={extractedData().payerName || ''}
                        onInput={(e) => updateField('payerName', e.currentTarget.value)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Monto</label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={extractedData().nonEmployeeCompensation || extractedData().interestIncome || extractedData().dividendIncome || ''}
                        onInput={(e) => updateField('nonEmployeeCompensation', parseFloat(e.currentTarget.value) || 0)}
                      />
                    </div>
                  </div>
                </Show>

                {/* 1098 Fields */}
                <Show when={documentType() === 'form_1098'}>
                  <div style={gridStyle}>
                    <div>
                      <label style={labelStyle}>Prestamista</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={extractedData().lenderName || ''}
                        onInput={(e) => updateField('lenderName', e.currentTarget.value)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Interés Hipotecario</label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={extractedData().mortgageInterest || ''}
                        onInput={(e) => updateField('mortgageInterest', parseFloat(e.currentTarget.value) || 0)}
                      />
                    </div>
                  </div>
                </Show>

                {/* 1098-T Fields */}
                <Show when={documentType() === 'form_1098_t'}>
                  <div style={gridStyle}>
                    <div>
                      <label style={labelStyle}>Institución</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={extractedData().institutionName || ''}
                        onInput={(e) => updateField('institutionName', e.currentTarget.value)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Gastos Calificados</label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={extractedData().qualifiedExpenses || ''}
                        onInput={(e) => updateField('qualifiedExpenses', parseFloat(e.currentTarget.value) || 0)}
                      />
                    </div>
                  </div>
                </Show>
              </div>

              {/* Add Button */}
              <Button variant="primary" onClick={handleAddToCalculator}>
                ✅ Agregar al Calculador de Impuestos
              </Button>
            </div>
          </Card>
        </Show>
      </Show>
    </div>
  );
};

export default TaxDocumentUploader;
