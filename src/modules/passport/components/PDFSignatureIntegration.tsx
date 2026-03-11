import { Component, createSignal, Show, For, onMount } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { devLog } from '../../../services/utils';
import { 
  addSignatureToPDF, 
  getPDFInfo, 
  downloadPDFWithSignature,
  PASSPORT_SIGNATURE_POSITIONS,
  SignaturePosition,
  PDFSignatureOptions
} from '../services/pdfSignatureIntegration';
import { extractSignatureFromImage, enhanceSignature, vectorizeSignature } from '../utils/signatureExtractor';
import { showResourceWarningDialog } from '../utils/confirmationDialog';
import { getSignatureFile, SignatureFile } from '../../../services/signatureRequest';
import { auth } from '../../../services/firebase';
import { authStore } from '../../../stores/authStore';
import { useTranslation } from '../../../translations';
import ImageUploadWithCrop from '../../../components/ImageUploadWithCrop';

const PDFSignatureIntegration: Component = () => {
  const { t } = useTranslation();
  
  const [pdfFile, setPdfFile] = createSignal<File | null>(null);
  const [signatureFile, setSignatureFile] = createSignal<File | null>(null);
  const [extractedSignature, setExtractedSignature] = createSignal<string>('');
  const [originalCroppedImage, setOriginalCroppedImage] = createSignal<string>('');
  const [useOriginalImage, setUseOriginalImage] = createSignal<'original' | 'processed' | 'ai'>('processed');
  const [pdfInfo, setPdfInfo] = createSignal<any>(null);
  const [selectedPosition, setSelectedPosition] = createSignal<SignaturePosition>(PASSPORT_SIGNATURE_POSITIONS.CUBAN_PASSPORT_SIGNATURE);
  const [customPosition, setCustomPosition] = createSignal(false);
  const [processing, setProcessing] = createSignal(false);
  const [extracting, setExtracting] = createSignal(false);
  const [enhancementType, setEnhancementType] = createSignal<'basic' | 'enhanced' | 'vectorized'>('enhanced');
  const [message, setMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);
  const [signatureSource, setSignatureSource] = createSignal<'upload' | 'request' | null>(null);
  const [pendingSignatureInfo, setPendingSignatureInfo] = createSignal<any>(null);
  const [signatureBlob, setSignatureBlob] = createSignal<Blob | null>(null);

  // AI Processing
  const [aiProcessingEnabled, setAiProcessingEnabled] = createSignal(false);
  const [aiProcessing, setAiProcessing] = createSignal(false);
  const [aiAnalysisResult, setAiAnalysisResult] = createSignal<any>(null);
  const [aiEnhancedSignature, setAiEnhancedSignature] = createSignal<string>('');

  // Signature sizing options
  const [centerInArea, setCenterInArea] = createSignal(true);
  const [fitToArea, setFitToArea] = createSignal(true);
  const [maintainAspectRatio, setMaintainAspectRatio] = createSignal(true);

  // Note: convertUrlToBlob function removed - now using centralized signatureBlobCache service

  onMount(async () => {
    // Check for pending signature from signature request
    const pendingData = sessionStorage.getItem('pendingSignature');
    if (pendingData) {
      try {
        const signatureData = JSON.parse(pendingData);
        setMessage({ 
          type: 'success', 
          text: t('pdfSignature.messages.loadingSignature', { clientName: signatureData.clientName })
        });
        
        // All signatures are now stored as base64 - no CORS issues!
        if (signatureData.imageData) {
          const base64Size = Math.round((signatureData.imageData.length * 3) / 4);
          
          setExtractedSignature(signatureData.imageData);
          setMessage({ 
            type: 'success', 
            text: `Firma de ${signatureData.clientName} cargada como base64 (${Math.round(base64Size/1024)}KB) - sin problemas de CORS` 
          });
          
          // Convert base64 to blob for PDF processing if needed
          if (signatureData.imageData.startsWith('data:')) {
            const blob = await dataUrlToBlob(signatureData.imageData);
            setSignatureBlob(blob);
          }
        }
        
        setSignatureSource('request');
        setPendingSignatureInfo(signatureData);
        
        // Clear the sessionStorage after loading
        sessionStorage.removeItem('pendingSignature');
      } catch (error) {
        devLog('Error loading pending signature:', error);
        setMessage({ 
          type: 'error', 
          text: 'Error cargando firma desde solicitud' 
        });
      }
    }
  });

  // Helper function to convert base64 data URL to blob
  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return await response.blob();
  };

  const handlePDFUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: t('pdfSignature.messages.errors.selectValidPDF') });
      return;
    }
    
    setPdfFile(file);
    setMessage(null);
    
    try {
      const info = await getPDFInfo(file);
      setPdfInfo(info);
      const plural = info.pageCount > 1 ? t('pdfSignature.messages.pagesPlural') : t('pdfSignature.messages.pagesSingular');
      setMessage({ type: 'success', text: t('pdfSignature.messages.pdfUploaded', { pageCount: info.pageCount, plural }) });
    } catch (error) {
      setMessage({ type: 'error', text: t('pdfSignature.messages.errors.errorReadingPDF') });
      devLog(error);
    }
  };

  const handleSignatureUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor seleccione una imagen válida.' });
      return;
    }
    
    setSignatureFile(file);
    setSignatureSource('upload');
    setPendingSignatureInfo(null);
    setMessage(null);
    
    // Extract signature automatically
    await processSignature(file);
  };

  const processSignatureWithAI = async () => {
    setAiProcessing(true);
    setAiAnalysisResult(null);


    const signatureBase64Full = useOriginalImage() === 'original' ? originalCroppedImage() : extractedSignature();

    // Strip data URL prefix to get only base64 string
    // e.g., "data:image/png;base64,iVBORw0..." -> "iVBORw0..."
    const base64Only = signatureBase64Full.includes('base64,')
      ? signatureBase64Full.split('base64,')[1]
      : signatureBase64Full;

    devLog('Sending base64 to AI (length):', base64Only.length);

    try {
      const response = await fetch('https://ssgloghr.com/api/signatures/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Only,
          userId: authStore.state?.user?.uid,
          timestamp: new Date().toISOString(),
          mimeType:"image/png"
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAiAnalysisResult(result);

      // Store the AI-enhanced signature if available
      if (result.enhancedUrl) {
        devLog('AI Enhanced signature URL received:', result.enhancedUrl);
        setAiEnhancedSignature(result.enhancedUrl);
      }

      setMessage({
        type: 'success',
        text: `✨ Análisis AI completado: ${result.quality || 'Analizado'}${result.enhancedUrl ? ' - Firma mejorada disponible' : ''}`
      });

      return result;
    } catch (error) {
      devLog('AI processing error:', error);
      setMessage({
        type: 'error',
        text: 'Error procesando firma con AI. Verifique su conexión.'
      });
      return null;
    } finally {
      setAiProcessing(false);
    }
  };

  const processSignature = async (file: File) => {
    if (!file) return;

    setExtracting(true);
    setMessage(null);
    setAiAnalysisResult(null);

    try {
      // Check if user wants vectorized processing
      if (enhancementType() === 'vectorized') {
        const userConsent = await showResourceWarningDialog();
        if (!userConsent) {
          setExtracting(false);
          return;
        }
      }

      // Extract signature
      const extractResult = await extractSignatureFromImage(file);

      if (!extractResult.success || !extractResult.signatureDataUrl) {
        setMessage({ type: 'error', text: extractResult.error || 'Error extrayendo la firma' });
        setExtracting(false);
        return;
      }

      let processedSignature = extractResult.signatureDataUrl;

      // Apply enhancement based on selected type
      if (enhancementType() === 'enhanced') {
        processedSignature = await enhanceSignature(processedSignature);
      } else if (enhancementType() === 'vectorized') {
        processedSignature = await vectorizeSignature(processedSignature);
      }

      setExtractedSignature(processedSignature);
      setMessage({ type: 'success', text: 'Firma extraída y procesada correctamente' });

      // AI Processing if enabled
      if (aiProcessingEnabled()) {
        await processSignatureWithAI(processedSignature);
      }

    } catch (error) {
      setMessage({ type: 'error', text: 'Error procesando la firma' });
      devLog(error);
    }

    setExtracting(false);
  };

  const handleAddSignatureToPDF = async () => {
    const hasSignature = extractedSignature() || originalCroppedImage() || aiEnhancedSignature();
    if (!pdfFile() || !hasSignature) {
      setMessage({ type: 'error', text: 'Necesita cargar un PDF y una firma' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      // Use the selected image type: AI-enhanced, original cropped, or processed signature
      let selectedSignature = extractedSignature();
      let signatureBlobToUse = signatureBlob();

      const imageTypeMap: Record<'original' | 'processed' | 'ai', string> = {
        'ai': 'AI-Enhanced',
        'original': 'Original Cropped',
        'processed': 'Processed Signature'
      };

      // Handle AI-enhanced signature (fetch from URL and convert to data URL)
      if (aiEnhancedSignature() && useOriginalImage() === 'ai') {
        devLog('Fetching AI-enhanced signature from URL...');
        const enhancedUrl = `https://ssgloghr.com${aiEnhancedSignature()}`;

        try {
          const response = await fetch(enhancedUrl);
          const blob = await response.blob();

          // Convert blob to data URL
          const reader = new FileReader();
          selectedSignature = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          signatureBlobToUse = blob;
          devLog('AI-enhanced signature converted to data URL');
        } catch (error) {
          devLog('Error fetching AI-enhanced signature:', error);
          setMessage({
            type: 'error',
            text: 'Error cargando firma mejorada con AI. Usando firma procesada.'
          });
          // Fallback to processed signature
          selectedSignature = extractedSignature();
          signatureBlobToUse = signatureBlob();
        }
      } else if (useOriginalImage() === 'original') {
        selectedSignature = originalCroppedImage();
        signatureBlobToUse = null; // Don't use blob for original
      }

      devLog('Using image type:', imageTypeMap[useOriginalImage()]);
      devLog('Signature data type:', signatureBlobToUse ? 'Blob' : selectedSignature.startsWith('data:') ? 'Base64 Data URL' : 'URL');
      if (signatureBlobToUse) {
        devLog('Using blob data for PDF signature:', signatureBlobToUse.size, 'bytes, type:', signatureBlobToUse.type);
      }

      const options: PDFSignatureOptions = {
        signatureBlob: (signatureBlobToUse && (useOriginalImage() === 'processed' || useOriginalImage() === 'ai')) ? signatureBlobToUse : undefined,
        signatureDataUrl: selectedSignature, // Use the selected image (original, processed, or AI-enhanced)
        position: selectedPosition(),
        opacity: 1.0,
        maintainAspectRatio: maintainAspectRatio(),
        centerInArea: centerInArea(),
        fitToArea: fitToArea()
      };
      
      const modifiedPdfBytes = await addSignatureToPDF(pdfFile()!, options);
      
      // Generate filename
      const originalName = pdfFile()!.name.replace('.pdf', '');
      const filename = `${originalName}-firmado.pdf`;
      
      // Download the modified PDF
      downloadPDFWithSignature(modifiedPdfBytes, filename);
      
      setMessage({ type: 'success', text: 'PDF firmado generado y descargado correctamente' });
      
    } catch (error) {
      devLog('PDF signature error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (errorMessage.includes('PNG')) {
        setMessage({ 
          type: 'error', 
          text: 'Error: La imagen de firma no es válida. Intente cargar nuevamente la firma.' 
        });
      } else if (errorMessage.includes('fetch') || errorMessage.includes('URL')) {
        setMessage({ 
          type: 'error', 
          text: 'Error cargando la firma desde Firebase Storage. Verifique su conexión.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Error agregando firma al PDF: ${errorMessage}` 
        });
      }
    }
    
    setProcessing(false);
  };

  const updatePosition = (field: keyof SignaturePosition, value: string) => {
    const numValue = parseInt(value) || 0;
    setSelectedPosition(prev => ({ ...prev, [field]: numValue }));
  };

  const presetPositions = [
    { name: t('pdfSignature.positions.cubanPassportRecommended'), position: PASSPORT_SIGNATURE_POSITIONS.CUBAN_PASSPORT_SIGNATURE },
    //{ name: 'Aplicación DS-11 (EE.UU.)', position: PASSPORT_SIGNATURE_POSITIONS.DS11_SIGNATURE },
    //{ name: 'Parte Inferior Derecha', position: PASSPORT_SIGNATURE_POSITIONS.BOTTOM_RIGHT },
    { name: t('pdfSignature.positions.bottomLeft'), position: PASSPORT_SIGNATURE_POSITIONS.BOTTOM_LEFT }
  ];

  return (
    <Card>
      <div style={{
        padding: '2rem',
        'max-width': '800px',
        margin: '0 auto'
      }}>
        <h2 style={{
          'font-size': '1.5rem',
          'font-weight': '600',
          'margin-bottom': '1rem',
          color: 'var(--text-primary)'
        }}>
          Agregar Firma a PDF
        </h2>
        
        <p style={{
          'margin-bottom': '2rem',
          color: 'var(--text-muted)',
          'line-height': '1.6'
        }}>
          Suba un PDF y una imagen de firma para generar un documento firmado automáticamente.
        </p>

        {/* PDF Upload */}
        <div style={{
          'margin-bottom': '2rem',
          padding: '1.5rem',
          border: '2px dashed var(--border-color)',
          'border-radius': 'var(--border-radius)',
          'text-align': 'center'
        }}>
          <h3 style={{ 'margin-bottom': '1rem' }}>1. Cargar Documento PDF</h3>
          
          <input
            type="file"
            accept=".pdf"
            onChange={handlePDFUpload}
            style={{ display: 'none' }}
            id="pdf-upload"
          />
          
          <label
            for="pdf-upload"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-weight': '500',
              'margin-bottom': '1rem'
            }}
          >
            Seleccionar PDF
          </label>
          
          <Show when={pdfFile()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              background: 'var(--success-light)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <p style={{ margin: '0', color: 'var(--success-dark)' }}>
                ✓ {pdfFile()!.name}
                <Show when={pdfInfo()}>
                  <span style={{ 'margin-left': '0.5rem' }}>
                    ({pdfInfo().pageCount} página{pdfInfo().pageCount > 1 ? 's' : ''})
                  </span>
                </Show>
              </p>
            </div>
          </Show>
        </div>

        {/* Signature Upload */}
        <div style={{
          'margin-bottom': '2rem',
          padding: '1.5rem',
          border: signatureSource() === 'request' ? '2px solid var(--success-color)' : '2px dashed var(--border-color)',
          'border-radius': 'var(--border-radius)',
          'text-align': 'center',
          background: signatureSource() === 'request' ? 'var(--success-light)' : 'transparent'
        }}>
          <h3 style={{ 'margin-bottom': '1rem' }}>2. Cargar Imagen de Firma</h3>
          
          {/* Show signature request info if loaded from request */}
          <Show when={signatureSource() === 'request' && pendingSignatureInfo()}>
            <div style={{
              'margin-bottom': '1rem',
              padding: '1rem',
              background: 'white',
              'border-radius': 'var(--border-radius-sm)',
              'text-align': 'left'
            }}>
              <h4 style={{ 
                'margin-bottom': '0.5rem', 
                color: 'var(--success-dark)',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                ✓ Firma cargada desde solicitud
              </h4>
              <p style={{ margin: '0', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                <strong>Cliente:</strong> {pendingSignatureInfo().clientName}<br/>
                <strong>ID Solicitud:</strong> {pendingSignatureInfo().requestId}<br/>
                <Show when={pendingSignatureInfo().signedAt}>
                  <strong>Firmado:</strong> {new Date(pendingSignatureInfo().signedAt).toLocaleString()}
                </Show>
              </p>
            </div>
          </Show>
          
          {/* Enhancement Type Selection - only show if uploading a new signature */}
          <Show when={signatureSource() !== 'request'}>
            <div style={{
              'margin-bottom': '1rem',
              display: 'flex',
              'justify-content': 'center',
              'align-items': 'center',
              gap: '1rem',
              'flex-wrap': 'wrap'
            }}>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="enhancement"
                  checked={enhancementType() === 'basic'}
                  onChange={() => setEnhancementType('basic')}
                />
                Básico
              </label>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="enhancement"
                  checked={enhancementType() === 'enhanced'}
                  onChange={() => setEnhancementType('enhanced')}
                />
                Mejorado
              </label>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="enhancement"
                  checked={enhancementType() === 'vectorized'}
                  onChange={() => setEnhancementType('vectorized')}
                />
                Avanzado
              </label>
            </div>

            {/* AI Processing Toggle */}
            <div style={{
              'margin-bottom': '1rem',
              display: 'flex',
              'justify-content': 'center',
              'align-items': 'center'
            }}>
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: aiProcessingEnabled() ? 'var(--primary-light)' : 'var(--gray-100)',
                'border-radius': '8px',
                cursor: 'pointer',
                border: aiProcessingEnabled() ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={aiProcessingEnabled()}
                  onChange={(e) => setAiProcessingEnabled(e.target.checked)}
                />
                <span style={{ 'font-weight': '500' }}>
                  ✨ Procesar con AI
                </span>
              </label>
            </div>

            <Show when={aiProcessingEnabled()}>
              <div style={{
                'margin-bottom': '1rem',
                padding: '0.75rem',
                background: 'var(--info-light)',
                'border-radius': '6px',
                'font-size': '0.875rem',
                color: 'var(--info-dark)',
                'text-align': 'center'
              }}>
                💡 La firma será analizada con AI para verificar calidad y autenticidad
              </div>
            </Show>
            
            <div style={{ 'max-width': '400px', margin: '0 auto' }}>
              <ImageUploadWithCrop
                label=""
                placeholder="Seleccionar imagen de firma para recortar"
                currentImage={extractedSignature()}
                onImageUpload={async (base64, fileName) => {
                  // Store the original cropped image
                  setOriginalCroppedImage(base64);
                  
                  // Convert base64 to File object for processing
                  const response = await fetch(base64);
                  const blob = await response.blob();
                  const file = new File([blob], fileName, { type: blob.type });
                  
                  setSignatureFile(file);
                  setSignatureSource('upload');
                  setPendingSignatureInfo(null);
                  setMessage(null);
                  
                  // Process the cropped signature for enhancement
                  await processSignature(file);
                }}
                onError={(error) => {
                  setMessage({
                    type: 'error',
                    text: `Error procesando imagen de firma: ${error}`
                  });
                }}
                uploadToServer={false} // Don't upload to server, just process locally
                enableCrop={true} // Enable cropping for signature images
                aspectRatio={3} // Wider aspect ratio for signatures (3:1)
                options={{
                  maxSizeKB: 1024, // 1MB max for signatures
                  quality: 0.9,
                  maxWidth: 600,
                  maxHeight: 200
                }}
              />
            </div>
          </Show>
          
          {/* Button to load new signature when one is already loaded from request */}
          <Show when={0 && signatureSource() === 'request'}>
            <div style={{ 'max-width': '400px', margin: '0 auto' }}>
              <ImageUploadWithCrop
                label=""
                placeholder="Cargar nueva imagen de firma"
                currentImage=""
                onImageUpload={async (base64, fileName) => {
                  // Store the original cropped image
                  setOriginalCroppedImage(base64);
                  
                  // Convert base64 to File object for processing
                  const response = await fetch(base64);
                  const blob = await response.blob();
                  const file = new File([blob], fileName, { type: blob.type });
                  
                  setSignatureFile(file);
                  setSignatureSource('upload');
                  setPendingSignatureInfo(null);
                  setMessage(null);
                  
                  // Process the cropped signature for enhancement
                  await processSignature(file);
                }}
                onError={(error) => {
                  setMessage({
                    type: 'error',
                    text: `Error procesando imagen de firma: ${error}`
                  });
                }}
                uploadToServer={false} // Don't upload to server, just process locally
                enableCrop={true} // Enable cropping for signature images
                aspectRatio={3} // Wider aspect ratio for signatures (3:1)
                options={{
                  maxSizeKB: 1024, // 1MB max for signatures
                  quality: 0.9,
                  maxWidth: 600,
                  maxHeight: 200
                }}
              />
            </div>
          </Show>
          
          <Show when={extracting()}>
            <div style={{
              'margin-top': '1rem',
              color: 'var(--primary-color)',
              'font-size': '0.875rem'
            }}>
              Procesando firma...
            </div>
          </Show>

          <Show when={aiProcessing()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              background: 'var(--primary-light)',
              'border-radius': '8px',
              'text-align': 'center'
            }}>
              <div style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                border: '2px solid var(--primary-color)',
                'border-top-color': 'transparent',
                'border-radius': '50%',
                animation: 'spin 0.8s linear infinite',
                'margin-right': '0.5rem'
              }} />
              <span style={{ color: 'var(--primary-dark)', 'font-weight': '500' }}>
                ✨ Analizando firma con AI...
              </span>
            </div>
          </Show>

          {/* AI Analysis Results */}
          <Show when={aiAnalysisResult()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              'border-radius': '12px',
              color: 'white',
              'box-shadow': '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                'font-size': '1.125rem',
                'font-weight': '600',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                ✨ Análisis AI de la Firma
              </h4>

              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                'margin-bottom': '1rem'
              }}>
                <Show when={aiAnalysisResult().quality}>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '0.75rem',
                    'border-radius': '8px',
                    'text-align': 'center'
                  }}>
                    <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.25rem', opacity: '0.9' }}>
                      Calidad
                    </div>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
                      {aiAnalysisResult().quality}
                    </div>
                  </div>
                </Show>

                <Show when={aiAnalysisResult().confidence}>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '0.75rem',
                    'border-radius': '8px',
                    'text-align': 'center'
                  }}>
                    <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.25rem', opacity: '0.9' }}>
                      Confianza
                    </div>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
                      {aiAnalysisResult().confidence}%
                    </div>
                  </div>
                </Show>

                <Show when={aiAnalysisResult().authenticity}>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '0.75rem',
                    'border-radius': '8px',
                    'text-align': 'center'
                  }}>
                    <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.25rem', opacity: '0.9' }}>
                      Autenticidad
                    </div>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
                      {aiAnalysisResult().authenticity}
                    </div>
                  </div>
                </Show>
              </div>

              <Show when={aiAnalysisResult().suggestions && aiAnalysisResult().suggestions.length > 0}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '1rem',
                  'border-radius': '8px'
                }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                    💡 Sugerencias:
                  </div>
                  <ul style={{ margin: '0', 'padding-left': '1.5rem', 'line-height': '1.6' }}>
                    <For each={aiAnalysisResult().suggestions}>
                      {(suggestion: string) => <li>{suggestion}</li>}
                    </For>
                  </ul>
                </div>
              </Show>

              <Show when={aiAnalysisResult().description}>
                <div style={{
                  'margin-top': '0.75rem',
                  'font-size': '0.875rem',
                  'line-height': '1.5',
                  opacity: '0.95'
                }}>
                  {aiAnalysisResult().description}
                </div>
              </Show>
            </div>
          </Show>
          
          <Show when={(extractedSignature() || originalCroppedImage()) && !extracting()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1.5rem',
              background: 'white',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <h4 style={{ 'margin-bottom': '1rem' }}>Seleccionar Tipo de Imagen:</h4>
              
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                'margin-bottom': '1rem'
              }}>
                {/* Original Cropped Image */}
                <Show when={originalCroppedImage()}>
                  <label style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    padding: '1rem',
                    border: useOriginalImage() === 'original' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    'border-radius': '6px',
                    cursor: 'pointer',
                    background: useOriginalImage() === 'original' ? 'var(--primary-light)' : 'var(--background-secondary)',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="radio"
                      name="imageType"
                      checked={useOriginalImage() === 'original'}
                      onChange={() => setUseOriginalImage('original')}
                      style={{ 'margin-bottom': '0.5rem' }}
                    />
                    <h5 style={{ 'margin-bottom': '0.5rem', 'text-align': 'center' }}>
                      Imagen Original Recortada
                    </h5>
                    <img
                      src={originalCroppedImage()}
                      alt="Imagen original recortada"
                      style={{
                        'max-width': '200px',
                        'max-height': '80px',
                        border: '1px solid var(--border-color)',
                        'border-radius': '4px',
                        background: 'white',
                        'margin-bottom': '0.5rem'
                      }}
                    />
                    <p style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'text-align': 'center',
                      'line-height': '1.3'
                    }}>
                      Usa la imagen tal como fue recortada, sin procesamiento adicional
                    </p>
                  </label>
                </Show>

                {/* Processed Signature */}
                <Show when={extractedSignature()}>
                  <label style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    padding: '1rem',
                    border: useOriginalImage() === 'processed' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    'border-radius': '6px',
                    cursor: 'pointer',
                    background: useOriginalImage() === 'processed' ? 'var(--primary-light)' : 'var(--background-secondary)',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="radio"
                      name="imageType"
                      checked={useOriginalImage() === 'processed'}
                      onChange={() => setUseOriginalImage('processed')}
                      style={{ 'margin-bottom': '0.5rem' }}
                    />
                    <h5 style={{ 'margin-bottom': '0.5rem', 'text-align': 'center' }}>
                      Firma Procesada ({enhancementType()})
                    </h5>
                    <img
                      src={extractedSignature()}
                      alt="Firma procesada"
                      style={{
                        'max-width': '200px',
                        'max-height': '80px',
                        border: '1px solid var(--border-color)',
                        'border-radius': '4px',
                        background: 'white',
                        'margin-bottom': '0.5rem'
                      }}
                    />
                    <p style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'text-align': 'center',
                      'line-height': '1.3'
                    }}>
                      Firma extraída y mejorada automáticamente
                    </p>
                  </label>
                </Show>

                {/* AI-Enhanced Signature */}
                <Show when={aiEnhancedSignature()}>
                  <label style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    padding: '1rem',
                    border: useOriginalImage() === 'ai' ? '2px solid #764ba2' : '1px solid var(--border-color)',
                    'border-radius': '6px',
                    cursor: 'pointer',
                    background: useOriginalImage() === 'ai' ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' : 'var(--background-secondary)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      'border-radius': '4px',
                      'font-size': '0.625rem',
                      'font-weight': '600'
                    }}>
                      ✨ AI
                    </div>
                    <input
                      type="radio"
                      name="imageType"
                      checked={useOriginalImage() === 'ai'}
                      onChange={() => setUseOriginalImage('ai')}
                      style={{ 'margin-bottom': '0.5rem' }}
                    />
                    <h5 style={{ 'margin-bottom': '0.5rem', 'text-align': 'center' }}>
                      Firma Mejorada con AI
                    </h5>
                    <img
                      src={`https://ssgloghr.com${aiEnhancedSignature()}`}
                      alt="Firma mejorada con AI"
                      style={{
                        'max-width': '200px',
                        'max-height': '80px',
                        border: '1px solid var(--border-color)',
                        'border-radius': '4px',
                        background: 'white',
                        'margin-bottom': '0.5rem'
                      }}
                    />
                    <p style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'text-align': 'center',
                      'line-height': '1.3'
                    }}>
                      Firma procesada y optimizada con inteligencia artificial
                    </p>
                  </label>
                </Show>
              </div>
              
              <div style={{
                display: 'flex',
                'justify-content': 'center',
                gap: '0.5rem',
                'flex-wrap': 'wrap'
              }}>
                <Button
                  onClick={() => signatureFile() && processSignature(signatureFile()!)}
                  variant="secondary"
                  size="sm"
                  disabled={extracting()}
                >
                  Reprocesar Firma
                </Button>

                <Show when={extractedSignature() && !aiProcessing()}>
                  <Button
                    onClick={() => processSignatureWithAI(extractedSignature())}
                    variant="primary"
                    size="sm"
                    disabled={aiProcessing()}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    ✨ Analizar con AI
                  </Button>
                </Show>
              </div>
            </div>
          </Show>
        </div>

        {/* Position Selection */}
        <Show when={extractedSignature() || originalCroppedImage()}>
          <div style={{
            'margin-bottom': '2rem',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)'
          }}>
            <h3 style={{ 'margin-bottom': '1rem' }}>3. Posición de la Firma</h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.5rem',
              'margin-bottom': '1rem'
            }}>
              <For each={presetPositions}>
                {(preset) => (
                  <label style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': '4px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="position"
                      checked={!customPosition() && JSON.stringify(selectedPosition()) === JSON.stringify(preset.position)}
                      onChange={() => {
                        setSelectedPosition(preset.position);
                        setCustomPosition(false);
                      }}
                    />
                    <span style={{ 'font-size': '0.875rem' }}>{preset.name}</span>
                  </label>
                )}
              </For>
              <Show when={authStore.state?.profile.isAdmin}> </Show>
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': '4px',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="position"
                  checked={customPosition()}
                  onChange={() => setCustomPosition(true)}
                />
                <span style={{ 'font-size': '0.875rem' }}>Posición Personalizada</span>
              </label>
             
            </div>
           
            <Show when={customPosition()}> 
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(4, 1fr)',
                gap: '1rem',
                'margin-top': '1rem'
              }}>
                <FormInput
                  label="X (px)"
                  type="number"
                  value={selectedPosition().x.toString()}
                  onChange={(value) => updatePosition('x', value)}
                />
                <FormInput
                  label="Y (px)"
                  type="number"
                  value={selectedPosition().y.toString()}
                  onChange={(value) => updatePosition('y', value)}
                />
                <FormInput
                  label="Ancho (px)"
                  type="number"
                  value={selectedPosition().width.toString()}
                  onChange={(value) => updatePosition('width', value)}
                />
                <FormInput
                  label="Alto (px)"
                  type="number"
                  value={selectedPosition().height.toString()}
                  onChange={(value) => updatePosition('height', value)}
                />
              </div>
           </Show>
          </div>
          
          {/* Signature Sizing Options */}
          <div style={{
            'margin-bottom': '2rem',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius)',
            background: 'var(--background-secondary)'
          }}>
            <h3 style={{ 'margin-bottom': '1rem' }}>4. Opciones de Tamaño de Firma</h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              'margin-bottom': '1rem'
            }}>
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': '4px',
                background: 'white',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={fitToArea()}
                  onChange={(e) => setFitToArea(e.target.checked)}
                />
                <div>
                  <strong>Ajustar al área</strong>
                  <br />
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Reduce la firma si es muy grande
                  </span>
                </div>
              </label>
              
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': '4px',
                background: 'white',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={centerInArea()}
                  onChange={(e) => setCenterInArea(e.target.checked)}
                />
                <div>
                  <strong>Centrar en el área</strong>
                  <br />
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Centra la firma en el espacio definido
                  </span>
                </div>
              </label>
              
              <label style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': '4px',
                background: 'white',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={maintainAspectRatio()}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                />
                <div>
                  <strong>Mantener proporciones</strong>
                  <br />
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Evita que la firma se deforme
                  </span>
                </div>
              </label>
            </div>
            
            <div style={{
              padding: '0.75rem',
              background: 'var(--info-light)',
              'border-radius': '4px',
              'font-size': '0.875rem',
              color: 'var(--info-dark)'
            }}>
              <strong>💡 Recomendado:</strong> Mantén todas las opciones activadas para obtener los mejores resultados.
              La firma se ajustará automáticamente al área definida manteniendo sus proporciones originales.
            </div>
          </div>
        </Show>

        {/* Messages */}
        <Show when={message()}>
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            'border-radius': 'var(--border-radius)',
            background: message()!.type === 'success' ? 'var(--success-light)' : 'var(--error-light)',
            color: message()!.type === 'success' ? 'var(--success-dark)' : 'var(--error-dark)',
            border: `1px solid ${message()!.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`
          }}>
            <strong>{message()!.type === 'success' ? '✓ Éxito:' : '⚠ Error:'}</strong> {message()!.text}
          </div>
        </Show>

        {/* Generate Button */}
        <div style={{
          'text-align': 'center',
          'margin-top': '2rem'
        }}>
          <Button
            onClick={handleAddSignatureToPDF}
            disabled={!pdfFile() || (!extractedSignature() && !originalCroppedImage()) || processing()}
            variant="primary"
            size="lg"
          >
            <Show when={processing()} fallback="🖋️ Generar PDF Firmado">
              <span style={{ display: 'flex', 'align-items': 'center' }}>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  'border-top-color': 'transparent',
                  'border-radius': '50%',
                  animation: 'spin 0.8s linear infinite',
                  'margin-right': '0.5rem'
                }} />
                Generando PDF...
              </span>
            </Show>
          </Button>
        </div>

        <div style={{
          'margin-top': '2rem',
          padding: '1rem',
          background: 'var(--info-light)',
          'border-radius': 'var(--border-radius)',
          'font-size': '0.875rem',
          color: 'var(--info-dark)'
        }}>
          <h4 style={{ 'margin-bottom': '0.5rem' }}>💡 Consejos:</h4>
          <ul style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
            <li>Use imágenes de firma con fondo blanco para mejores resultados</li>
            <li>La firma se ajustará y centrará automáticamente en el área definida</li>
            <li>Las opciones de tamaño están optimizadas para obtener los mejores resultados</li>
            <li>Para pasaportes cubanos, use la posición "Pasaporte Cubano (Recomendado)"</li>
            <li>El PDF modificado se descargará automáticamente</li>
          </ul>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default PDFSignatureIntegration;