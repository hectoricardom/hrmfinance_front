import { Component, createSignal, For, Show, createEffect, onMount } from 'solid-js';
import { Card, Button } from '../../ui';
import {
  NotaryDocument,
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  AIDocumentAnalysis,
  ExtractedDocumentData
} from '../types/documents';
import { analyzeDocument, validateExtractedData } from '../services/documentAnalyzer';
import { inventoryApi } from '../../../services/apiAdapter';
import AIAnalysisDetailModal from './AIAnalysisDetailModal';
import { devLog } from '../../../services/utils';

interface DocumentUploaderProps {
  clientNotaryId: string;
  onDocumentSaved?: (document: NotaryDocument) => void;
  existingDocuments?: NotaryDocument[];
}

const DocumentUploader: Component<DocumentUploaderProps> = (props) => {
  const [uploading, setUploading] = createSignal(false);
  const [analyzing, setAnalyzing] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [filePreview, setFilePreview] = createSignal<string>('');
  const [dragOver, setDragOver] = createSignal(false);
  const [documents, setDocuments] = createSignal<NotaryDocument[]>([]);

  // AI Analysis results
  const [aiAnalysis, setAiAnalysis] = createSignal<AIDocumentAnalysis | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = createSignal<string | null>(null);

  // Editable fields
  const [documentType, setDocumentType] = createSignal<DocumentType>('other');
  const [extractedData, setExtractedData] = createSignal<ExtractedDocumentData>({});
  const [description, setDescription] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [documentNumber, setDocumentNumber] = createSignal('');
  const [issueDate, setIssueDate] = createSignal('');
  const [expirationDate, setExpirationDate] = createSignal('');
  const [issuingCountry, setIssuingCountry] = createSignal('');

  // UI state
  const [showAIResults, setShowAIResults] = createSignal(false);
  const [editMode, setEditMode] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<string[]>([]);
  const [validationWarnings, setValidationWarnings] = createSignal<string[]>([]);

  // Load existing documents on mount
  onMount(async () => {
    await loadDocuments();
  });

  // Load documents from API
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await inventoryApi.getDocuments(props.clientNotaryId);
      setDocuments(docs);
    } catch (error) {
      devLog('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAiAnalysis(null);
    setShowAIResults(false);
    setEditMode(false);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Analyze document with AI
  const handleAnalyze = async () => {
    const file = selectedFile();
    if (!file) return;

    setAnalyzing(true);
    try {
      // Step 1: Upload the document first
      devLog('Step 1: Uploading document...');
      const initialMetadata = {
        documentType: 'other', // Will be updated after AI analysis
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      };

      const uploadedDoc = await inventoryApi.uploadDocument(
        file,
        props.clientNotaryId,
        initialMetadata
      );

      devLog('Document uploaded:', uploadedDoc);
      setUploadedDocumentId(uploadedDoc.id || uploadedDoc.documentId);

      // Step 2: Process with AI
      devLog('Step 2: Processing with AI...');
      const fileUrl = uploadedDoc.fileUrl || uploadedDoc.url;

      const aiResult = await inventoryApi.processDocument(
        uploadedDoc.id || uploadedDoc.documentId,
        fileUrl,
        file.type
      );

      devLog('AI processing result:', aiResult);

      // Extract AI analysis from result
      const analysis: AIDocumentAnalysis = aiResult.aiAnalysis || aiResult;
      setAiAnalysis(analysis);

      // Pre-fill fields from AI analysis
      setDocumentType(analysis.detectedType);
      setExtractedData(analysis.extractedData);

      if (analysis.extractedData.documentNumber) {
        setDocumentNumber(analysis.extractedData.documentNumber);
      }
      if (analysis.extractedData.issueDate) {
        setIssueDate(analysis.extractedData.issueDate);
      }
      if (analysis.extractedData.expirationDate) {
        setExpirationDate(analysis.extractedData.expirationDate);
      }
      if (analysis.extractedData.issuingCountry) {
        setIssuingCountry(analysis.extractedData.issuingCountry);
      }

      // Validate extracted data
      const validation = validateExtractedData(analysis.extractedData);
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);

      setShowAIResults(true);
      setEditMode(true);

      devLog('AI analysis completed successfully');
    } catch (error) {
      devLog('Error analyzing document:', error);
      alert('Error al analizar el documento: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Save document (update metadata after AI analysis)
  const handleSave = async () => {
    const docId = uploadedDocumentId();
    if (!docId) {
      alert('Error: No se ha subido ningún documento aún');
      return;
    }

    setUploading(true);
    try {
      // Update document with corrected metadata
      const updates = {
        documentType: documentType(),
        description: description(),
        documentNumber: documentNumber(),
        issueDate: issueDate() ? new Date(issueDate()).getTime() : undefined,
        expirationDate: expirationDate() ? new Date(expirationDate()).getTime() : undefined,
        issuingCountry: issuingCountry(),
        notes: notes(),
        aiAnalysis: aiAnalysis() || undefined,
        aiAnalyzedAt: aiAnalysis() ? Date.now() : undefined,
        extractedData: extractedData(),
        verified: true, // Mark as verified after user review
        verifiedAt: Date.now()
      };

      devLog('Updating document metadata:', updates);
      const updatedDoc = await inventoryApi.updateDocument(docId, updates);

      devLog('Document updated successfully:', updatedDoc);

      // Call parent callback
      if (props.onDocumentSaved) {
        props.onDocumentSaved(updatedDoc);
      }

      // Reload documents list
      await loadDocuments();

      // Reset form
      setSelectedFile(null);
      setFilePreview('');
      setAiAnalysis(null);
      setUploadedDocumentId(null);
      setShowAIResults(false);
      setEditMode(false);
      setDescription('');
      setNotes('');
      setDocumentNumber('');
      setIssueDate('');
      setExpirationDate('');
      setIssuingCountry('');
      setExtractedData({});

      alert('Documento guardado exitosamente!');
    } catch (error) {
      devLog('Error saving document:', error);
      alert('Error al guardar el documento: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setUploading(false);
    }
  };

  // Update extracted data field
  const updateExtractedField = (field: string, value: any) => {
    setExtractedData({
      ...extractedData(),
      [field]: value
    });
  };

  const cardStyle = {
    padding: '2rem',
    'margin-bottom': '1.5rem'
  };

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



  return (
    <div style={{ 'max-width': '1200px', margin: '0 auto' }}>
      <h2 style={{
        'font-size': '1.5rem',
        'font-weight': '700',
        'margin-bottom': '1.5rem',
        color: 'var(--text-primary)'
      }}>
        📤 Cargar y Analizar Documentos
      </h2>

      {/* File Upload Section */}
      <Card>
        <div style={cardStyle}>
          <h3 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
            1. Seleccionar Documento
          </h3>

          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: `2px dashed ${dragOver() ? 'var(--primary-color)' : 'var(--border-color)'}`,
              'border-radius': 'var(--border-radius)',
              padding: '3rem',
              'text-align': 'center',
              background: dragOver() ? 'var(--primary-light)' : 'var(--gray-50)',
              transition: 'all 0.2s',
              cursor: 'pointer',
              'margin-bottom': '1rem'
            }}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <Show when={!selectedFile()}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>
                📄
              </div>
              <div style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                Arrastra un documento aquí o haz clic para seleccionar
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Soporta: PDF, JPG, PNG (máx. 10MB)
              </div>
            </Show>

            <Show when={selectedFile()}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>✅</div>
              <div style={{ 'font-weight': '600' }}>{selectedFile()?.name}</div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                {(selectedFile()!.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </Show>
          </div>

          <input
            id="fileInput"
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {/* File Preview */}
          <Show when={filePreview()}>
            <div style={{
              'margin-top': '1rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius)',
              padding: '1rem',
              'text-align': 'center'
            }}>
              <img
                src={filePreview()}
                alt="Preview"
                style={{
                  'max-width': '100%',
                  'max-height': '300px',
                  'border-radius': 'var(--border-radius)'
                }}
              />
            </div>
          </Show>

          {/* Action Buttons */}
          <Show when={selectedFile() && !showAIResults()}>
            <div style={{ display: 'flex', gap: '1rem', 'margin-top': '1rem' }}>
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={analyzing()}
                style={{ flex: 1 }}
              >
                {analyzing() ? '🔍 Analizando...' : '🤖 Analizar con IA'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview('');
                }}
              >
                ✕ Cancelar
              </Button>
            </div>
          </Show>
        </div>
      </Card>

      {/* AI Analysis Results */}
      <Show when={showAIResults() && aiAnalysis()}>
        <Card>
          <div style={cardStyle}>
            <h3 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
              2. Resultados del Análisis IA
            </h3>

            {/* Confidence Score */}
            <div style={{
              padding: '1rem',
              background: 'var(--info-light)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1.5rem',
              border: '1px solid var(--info-color)'
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <div>
                  <strong>Tipo de Documento Detectado:</strong> {DOCUMENT_TYPE_LABELS[aiAnalysis()!.detectedType]}
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: aiAnalysis()!.confidence > 0.8 ? 'var(--success-color)' : 'var(--warning-color)',
                  color: 'white',
                  'border-radius': 'var(--border-radius)',
                  'font-weight': '600'
                }}>
                  {(aiAnalysis()!.confidence * 100).toFixed(0)}% confianza
                </div>
              </div>
            </div>

            {/* Validation Messages */}
            <Show when={validationErrors().length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--danger-light)',
                'border-radius': 'var(--border-radius)',
                'margin-bottom': '1rem',
                border: '1px solid var(--danger-color)'
              }}>
                <strong>⚠️ Errores de Validación:</strong>
                <ul style={{ 'margin-top': '0.5rem', 'padding-left': '1.5rem' }}>
                  <For each={validationErrors()}>
                    {(error) => <li>{error}</li>}
                  </For>
                </ul>
              </div>
            </Show>

            <Show when={validationWarnings().length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--warning-light)',
                'border-radius': 'var(--border-radius)',
                'margin-bottom': '1rem',
                border: '1px solid var(--warning-color)'
              }}>
                <strong>⚠️ Advertencias:</strong>
                <ul style={{ 'margin-top': '0.5rem', 'padding-left': '1.5rem' }}>
                  <For each={validationWarnings()}>
                    {(warning) => <li>{warning}</li>}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Editable Fields */}
            <div style={{
              padding: '1.5rem',
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1rem'
              }}>
                <h4 style={{ 'font-weight': '600' }}>✏️ Editar Información Extraída</h4>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Revisa y corrige cualquier error
                </div>
              </div>

              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {/* Document Type */}
                <div>
                  <label style={labelStyle}>Tipo de Documento</label>
                  <select
                    value={documentType()}
                    onChange={(e) => setDocumentType(e.currentTarget.value as DocumentType)}
                    style={inputStyle}
                  >
                    <For each={Object.entries(DOCUMENT_TYPE_LABELS)}>
                      {([value, label]) => (
                        <option value={value}>{label}</option>
                      )}
                    </For>
                  </select>
                </div>

                {/* Document Number */}
                <div>
                  <label style={labelStyle}>Número de Documento</label>
                  <input
                    type="text"
                    value={documentNumber()}
                    onInput={(e) => setDocumentNumber(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="Número del documento"
                  />
                </div>

                {/* First Name */}
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <input
                    type="text"
                    value={extractedData().firstName || ''}
                    onInput={(e) => updateExtractedField('firstName', e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="Nombre"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input
                    type="text"
                    value={extractedData().lastName || ''}
                    onInput={(e) => updateExtractedField('lastName', e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="Apellido"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label style={labelStyle}>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={extractedData().dateOfBirth || ''}
                    onInput={(e) => updateExtractedField('dateOfBirth', e.currentTarget.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Issue Date */}
                <div>
                  <label style={labelStyle}>Fecha de Emisión</label>
                  <input
                    type="date"
                    value={issueDate()}
                    onInput={(e) => setIssueDate(e.currentTarget.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Expiration Date */}
                <div>
                  <label style={labelStyle}>Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={expirationDate()}
                    onInput={(e) => setExpirationDate(e.currentTarget.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Issuing Country */}
                <div>
                  <label style={labelStyle}>País Emisor</label>
                  <input
                    type="text"
                    value={issuingCountry()}
                    onInput={(e) => setIssuingCountry(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="País"
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ 'margin-top': '1rem' }}>
                <label style={labelStyle}>Descripción (Opcional)</label>
                <textarea
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  style={{
                    ...inputStyle,
                    'min-height': '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Descripción adicional del documento..."
                />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notas (Opcional)</label>
                <textarea
                  value={notes()}
                  onInput={(e) => setNotes(e.currentTarget.value)}
                  style={{
                    ...inputStyle,
                    'min-height': '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            {/* Save Buttons */}
            <div style={{ display: 'flex', gap: '1rem', 'margin-top': '1.5rem' }}>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={uploading()}
                style={{ flex: 1 }}
              >
                {uploading() ? '💾 Guardando...' : '✅ Guardar Documento'}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  // If document was uploaded but user is canceling, delete it
                  const docId = uploadedDocumentId();
                  if (docId) {
                    try {
                      await inventoryApi.deleteDocument(docId);
                      devLog('Canceled document deleted:', docId);
                    } catch (error) {
                      devLog('Error deleting canceled document:', error);
                    }
                  }

                  setShowAIResults(false);
                  setSelectedFile(null);
                  setFilePreview('');
                  setAiAnalysis(null);
                  setUploadedDocumentId(null);
                }}
              >
                ✕ Cancelar
              </Button>
            </div>
          </div>
        </Card>
      </Show>

      {/* Existing Documents List */}
      <Show when={documents().length > 0 || loading()}>
        <Card>
          <div style={cardStyle}>
            <h3 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
              📋 Documentos Existentes ({documents().length})
            </h3>

            <Show when={loading()}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                🔄 Cargando documentos...
              </div>
            </Show>

            <Show when={!loading() && documents().length === 0}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No hay documentos subidos aún.
              </div>
            </Show>

            <Show when={!loading() && documents().length > 0}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <For each={documents()}>
                  {(doc) => (
                    <NotaryDocItem doc={doc} />
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export default DocumentUploader;





interface NotaryDocItemProps {
  
  loadDocuments?: () => Promise<any>;
  doc?: NotaryDocument;
}



const NotaryDocItem: Component<NotaryDocItemProps> = (props) => {

  const {doc} = props;


  const [processingDocId, setProcessingDocId] = createSignal<string | null>(null);
  const [url, setUrl] = createSignal<string | null>(null);
  const [showAIDetailsModal, setShowAIDetailsModal] = createSignal(false);


  // Download document
  const handleDownload = async (doc: NotaryDocument) => {
    try {
      const blob = await inventoryApi.downloadDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || `document-${doc.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      devLog('Error downloading document:', error);
      alert('Error al descargar el documento: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // Delete document
  const handleDelete = async (doc: NotaryDocument) => {
    if (!confirm(`¿Está seguro de eliminar el documento "${doc.originalFileName || doc.fileName}"?`)) {
      return;
    }

    try {
      const result = await inventoryApi.deleteDocument(doc.id);
      if (result.success) {
        alert(result.message);
        await props?.loadDocuments(); // Reload list
      } else {
        alert(result.message);
      }
    } catch (error) {
      devLog('Error deleting document:', error);
      alert('Error al eliminar el documento: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // Process existing document with AI
  const handleProcessWithAI = async (doc: NotaryDocument) => {
    setProcessingDocId(doc.id);
    try {
      devLog('Processing document with AI:', doc.id);

      // Call processDocument API
      const aiResult = await inventoryApi.processDocument(
        doc.id,
        doc.fileUrl || doc?.url,
        doc.mimeType
      );

      devLog('AI processing result:', aiResult);

      // Extract AI analysis
      const analysis: AIDocumentAnalysis = aiResult.aiAnalysis || aiResult;

      // Update document with AI results
      const updates = {
        aiAnalysis: analysis,
        aiAnalyzedAt: Date.now(),
        documentType: analysis.detectedType,
        extractedData: analysis.extractedData,
        // Update fields from AI if not already set
        documentNumber: doc.documentNumber || analysis.extractedData.documentNumber,
        issueDate: doc.issueDate || (analysis.extractedData.issueDate ? new Date(analysis.extractedData.issueDate).getTime() : undefined),
        expirationDate: doc.expirationDate || (analysis.extractedData.expirationDate ? new Date(analysis.extractedData.expirationDate).getTime() : undefined),
        issuingCountry: doc.issuingCountry || analysis.extractedData.issuingCountry
      };

      await inventoryApi.updateDocument(doc.id, updates);

      // Reload documents list
      await props?.loadDocuments();

      alert(`Documento analizado con IA exitosamente!\n\nTipo detectado: ${DOCUMENT_TYPE_LABELS[analysis.detectedType]}\nConfianza: ${(analysis.confidence * 100).toFixed(0)}%`);
    } catch (error) {
      devLog('Error processing document with AI:', error);
      alert('Error al procesar el documento con IA: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setProcessingDocId(null);
    }
  };



  createEffect(()=>{
    if(!url()){
        setUrl(urlP(doc))
    }
  })

  const urlP = (v:any): string => {
    let im = v?.imageMetadata;
    let W = 150;
    let h = im.height ? W*im.height / im.width : 150;
    
      if(!v.id) return "";
      
      return `https://ssgloghr.com/api/images/${v.id}?format=webp&width=${W}&height=${h}`
  }


  return (
    <div style={{
      padding: '1rem',
      border: '1px solid var(--border-color)',
      'border-radius': 'var(--border-radius)',
      background: 'white'
    }}>
      
      
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <img
            //onClick={()=>openImage(props.data.fotoUrl)} 
            src={url()} 
            alt="Fotografía para pasaporte"
            style={{
              'max-width': '200px',
              'max-height': '200px',
              border: '2px solid var(--border-color)',
              'border-radius': '4px',
              'object-fit': 'cover'
            }}
          />
        </div> 
        <div style={{ flex: 1 }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
            {DOCUMENT_TYPE_LABELS[doc?.aiResult?.documentType]} - {doc?.id}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Subido: {new Date(doc?.uploadedAt).toLocaleDateString('es-ES')}
            {doc?.documentNumber && ` • No. ${doc?.documentNumber}`}
            {doc?.issueDate && ` • Emitido: ${new Date(doc?.issueDate).toLocaleDateString('es-ES')}`}
          </div>
          {doc?.description && (
            <div style={{ 'margin-top': '0.25rem', 'font-size': '0.875rem' }}>
              {doc?.description}
            </div>
          )}
          {doc?.aiResult && (
            <div style={{
              'margin-top': '0.5rem',
              'font-size': '0.75rem',
              color: 'var(--info-color)'
            }}>
              🤖 Analizado con IA ({(doc?.aiResult?.confidence * 100).toFixed(0)}% confianza)
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', 'flex-shrink': 0, 'flex-wrap': 'wrap' }}>
          <Show when={!doc?.aiResult?.confidence}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleProcessWithAI(doc)}
              disabled={processingDocId() === doc?.id}
              style={{ background: 'var(--info-color)' }}
            >
              {processingDocId() === doc?.id ? '🔄 Procesando...' : '🤖 Analizar con IA'}
            </Button>
          </Show>
          <Show when={doc?.aiResult?.confidence || doc?.aiAnalysis?.confidence}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                devLog('Opening AI Details Modal for document:', doc);
                devLog('AI Result:', doc?.aiResult);
                devLog('AI Analysis:', doc?.aiAnalysis);
                setShowAIDetailsModal(true);
                devLog('Modal state set to:', true);
              }}
              style={{ background: 'var(--success-color)' }}
            >
              🔍 Ver Análisis IA
            </Button>
          </Show>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(doc)}
          >
            📥 Descargar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(doc)}
            style={{ color: 'var(--danger-color)', 'border-color': 'var(--danger-color)' }}
          >
            🗑️ Eliminar
          </Button>
        </div>
      </div>

      {/* AI Analysis Detail Modal */}
      <AIAnalysisDetailModal
        document={doc}
        isOpen={showAIDetailsModal()}
        onClose={() => setShowAIDetailsModal(false)}
      />
    </div>
  )

}