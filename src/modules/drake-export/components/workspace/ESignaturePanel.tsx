/**
 * ESignaturePanel
 * In-office signature capture panel for tablets/screens
 * Captures client signature on Engagement Letter, Form 8879, or both
 * Touch-optimized for iPad/tablet use during in-person appointments
 */

import { Component, createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js';
import { Card, Button } from '../../../ui';
import { fetchGraphQLSS, devLog } from '../../../../services/utils';
import { authStore } from '../../../../stores/authStore';
import type { TaxPortal, TaxDocumentRequest, SignatureMetadata } from '../../types/drakeTypes';

// ---------- Types ----------

type DocumentTypeOption = 'engagement' | 'form8879' | 'both';
type SigningStep = 'select' | 'review' | 'sign' | 'confirm';
type PanelLanguage = 'en' | 'es';

interface ESignaturePanelProps {
  client: TaxPortal;
  documentRequest: TaxDocumentRequest;
  onSignatureComplete: (result: SignatureResult) => void;
}

interface SignatureResult {
  documentType: DocumentTypeOption;
  signatureImage: string;
  metadata: SignatureMetadata;
  signerName: string;
  pin?: string;
  signedAt: number;
}

// ---------- Translations ----------

const translations: Record<PanelLanguage, Record<string, string>> = {
  en: {
    title: 'Electronic Signature',
    selectDocType: 'Select Document to Sign',
    engagementLetter: 'Engagement Letter',
    form8879: 'Form 8879 (E-File Authorization)',
    bothDocuments: 'Both Documents',
    engagementDesc: 'Agreement for tax preparation services',
    form8879Desc: 'IRS authorization to e-file your return',
    bothDesc: 'Sign engagement letter and e-filing authorization',
    next: 'Next',
    back: 'Back',
    reviewTitle: 'Review Before Signing',
    engagementTermsTitle: 'Engagement Letter Summary',
    engagementTerms: 'By signing, you authorize Stephanie Solutions Tax Preparation to prepare and file your tax return. You agree to provide accurate and complete information. Fees are based on the complexity of your return.',
    feeEstimate: 'Estimated Fee',
    form8879Title: 'E-File Authorization (Form 8879)',
    agi: 'Adjusted Gross Income (AGI)',
    totalTax: 'Total Tax',
    refundAmount: 'Refund Amount',
    amountOwed: 'Amount Owed',
    pinLabel: '5-Digit Signing PIN',
    pinPlaceholder: 'Enter 5 digits',
    pinHint: 'Choose any 5 digits (not all zeros). This PIN authorizes your e-filed return.',
    signTitle: 'Sign Below',
    signInstructions: 'Use your finger or stylus to sign on the line below',
    clear: 'Clear',
    undoStroke: 'Undo',
    signatureRequired: 'Signature must have at least 2 strokes',
    legalAcknowledgment: 'I agree to the terms and conditions. I confirm that the information provided is accurate and I authorize the electronic filing of my tax return.',
    typedNameLabel: 'Type Your Full Legal Name',
    typedNamePlaceholder: 'e.g. John A. Smith',
    signButton: 'Sign Document',
    signing: 'Signing...',
    confirmTitle: 'Signature Recorded',
    confirmMessage: 'Your signature has been successfully captured and recorded.',
    signedAt: 'Signed at',
    signedBy: 'Signed by',
    documentSigned: 'Document(s) Signed',
    signaturePreview: 'Signature Preview',
    done: 'Done',
    errorSaving: 'Error saving signature. Please try again.',
    gpsRequired: 'Location access is required to sign. Please enable location permissions in your browser settings and reload the page.',
    gpsWaiting: 'Waiting for location access...',
    retryGps: 'Retry Location',
    na: 'N/A',
  },
  es: {
    title: 'Firma Electronica',
    selectDocType: 'Seleccione el Documento a Firmar',
    engagementLetter: 'Carta de Compromiso',
    form8879: 'Formulario 8879 (Autorizacion E-File)',
    bothDocuments: 'Ambos Documentos',
    engagementDesc: 'Acuerdo para servicios de preparacion de impuestos',
    form8879Desc: 'Autorizacion del IRS para presentar su declaracion electronica',
    bothDesc: 'Firmar la carta de compromiso y la autorizacion de presentacion electronica',
    next: 'Siguiente',
    back: 'Atras',
    reviewTitle: 'Revise Antes de Firmar',
    engagementTermsTitle: 'Resumen de Carta de Compromiso',
    engagementTerms: 'Al firmar, usted autoriza a Stephanie Solutions Tax Preparation a preparar y presentar su declaracion de impuestos. Usted acepta proporcionar informacion precisa y completa. Los honorarios se basan en la complejidad de su declaracion.',
    feeEstimate: 'Tarifa Estimada',
    form8879Title: 'Autorizacion E-File (Formulario 8879)',
    agi: 'Ingreso Bruto Ajustado (AGI)',
    totalTax: 'Impuesto Total',
    refundAmount: 'Monto del Reembolso',
    amountOwed: 'Monto Adeudado',
    pinLabel: 'PIN de 5 Digitos para Firma',
    pinPlaceholder: 'Ingrese 5 digitos',
    pinHint: 'Elija cualquier 5 digitos (no todos ceros). Este PIN autoriza su declaracion electronica.',
    signTitle: 'Firme Abajo',
    signInstructions: 'Use su dedo o lapiz para firmar en la linea de abajo',
    clear: 'Borrar',
    undoStroke: 'Deshacer',
    signatureRequired: 'La firma debe tener al menos 2 trazos',
    legalAcknowledgment: 'Acepto los terminos y condiciones. Confirmo que la informacion proporcionada es precisa y autorizo la presentacion electronica de mi declaracion de impuestos.',
    typedNameLabel: 'Escriba su Nombre Legal Completo',
    typedNamePlaceholder: 'ej. Juan A. Garcia',
    signButton: 'Firmar Documento',
    signing: 'Firmando...',
    confirmTitle: 'Firma Registrada',
    confirmMessage: 'Su firma ha sido capturada y registrada exitosamente.',
    signedAt: 'Firmado el',
    signedBy: 'Firmado por',
    documentSigned: 'Documento(s) Firmado(s)',
    signaturePreview: 'Vista Previa de la Firma',
    done: 'Listo',
    errorSaving: 'Error al guardar la firma. Por favor intente de nuevo.',
    gpsRequired: 'Se requiere acceso a la ubicacion para firmar. Habilite los permisos de ubicacion en la configuracion de su navegador y recargue la pagina.',
    gpsWaiting: 'Esperando acceso a la ubicacion...',
    retryGps: 'Reintentar Ubicacion',
    na: 'N/A',
  },
};

// ---------- Component ----------

const ESignaturePanel: Component<ESignaturePanelProps> = (props) => {
  // State
  const [lang, setLang] = createSignal<PanelLanguage>('en');
  const [step, setStep] = createSignal<SigningStep>('select');
  const [selectedDocType, setSelectedDocType] = createSignal<DocumentTypeOption>('engagement');
  const [agreed, setAgreed] = createSignal(false);
  const [typedName, setTypedName] = createSignal('');
  const [pin, setPin] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [signatureImage, setSignatureImage] = createSignal<string | null>(null);
  const [signedTimestamp, setSignedTimestamp] = createSignal<number | null>(null);

  // Geolocation & IP state
  const [gpsCoords, setGpsCoords] = createSignal<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsDenied, setGpsDenied] = createSignal(false);
  const [ipAddress, setIpAddress] = createSignal<string | null>(null);

  // Canvas state
  let canvasRef: HTMLCanvasElement | undefined;
  let canvasContainerRef: HTMLDivElement | undefined;
  const [strokes, setStrokes] = createSignal<{ x: number; y: number }[][]>([]);
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [currentStroke, setCurrentStroke] = createSignal<{ x: number; y: number }[]>([]);
  const [signatureStartTime, setSignatureStartTime] = createSignal<number>(0);

  const t = (key: string): string => translations[lang()]?.[key] || key;

  // Format currency
  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return t('na');
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Whether Form 8879 is involved
  const needsPin = () => selectedDocType() === 'form8879' || selectedDocType() === 'both';

  // PIN validation
  const isPinValid = () => {
    if (!needsPin()) return true;
    const p = pin();
    return p.length === 5 && /^\d{5}$/.test(p) && p !== '00000';
  };

  // Stroke count validation
  const hasMinStrokes = () => strokes().length >= 2;

  // Can submit
  const canSign = () =>
    agreed() &&
    typedName().trim().length >= 2 &&
    hasMinStrokes() &&
    isPinValid() &&
    gpsCoords() !== null &&
    !gpsDenied();

  // ---------- Canvas Setup ----------

  const setupCanvas = () => {
    if (!canvasRef || !canvasContainerRef) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasContainerRef.getBoundingClientRect();
    const width = rect.width;
    const height = 200;

    canvasRef.style.width = `${width}px`;
    canvasRef.style.height = `${height}px`;
    canvasRef.width = width * dpr;
    canvasRef.height = height * dpr;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    redrawCanvas();
  };

  const redrawCanvas = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasRef.width / dpr;
    const h = canvasRef.height / dpr;

    ctx.clearRect(0, 0, w, h);

    // Draw guide line
    ctx.save();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(20, h - 40);
    ctx.lineTo(w - 20, h - 40);
    ctx.stroke();
    ctx.restore();

    // Draw "X" marker
    ctx.save();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '18px serif';
    ctx.fillText('X', 8, h - 35);
    ctx.restore();

    // Redraw all strokes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);

    for (const stroke of strokes()) {
      drawStroke(ctx, stroke);
    }

    // Draw current in-progress stroke
    const curr = currentStroke();
    if (curr.length > 0) {
      drawStroke(ctx, curr);
    }
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
    ctx.stroke();
  };

  const getCanvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    if (!canvasRef) return { x: 0, y: 0 };
    const rect = canvasRef.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // ---------- Event Handlers ----------

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    if (!canvasRef) return;
    canvasRef.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    if (strokes().length === 0 && signatureStartTime() === 0) {
      setSignatureStartTime(Date.now());
    }
    const pt = getCanvasPoint(e.clientX, e.clientY);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDrawing()) return;
    e.preventDefault();
    const pt = getCanvasPoint(e.clientX, e.clientY);
    setCurrentStroke(prev => [...prev, pt]);
    redrawCanvas();
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDrawing()) return;
    e.preventDefault();
    setIsDrawing(false);
    const curr = currentStroke();
    if (curr.length > 1) {
      setStrokes(prev => [...prev, curr]);
    }
    setCurrentStroke([]);
    redrawCanvas();
  };

  const clearSignature = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setSignatureStartTime(0);
    redrawCanvas();
  };

  const undoLastStroke = () => {
    setStrokes(prev => prev.slice(0, -1));
    redrawCanvas();
  };

  // ---------- Geolocation ----------

  const requestGeolocation = () => {
    if (!navigator.geolocation) return;
    setGpsDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsDenied(false);
        devLog('Geolocation acquired:', pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        devLog('Geolocation denied or unavailable:', err.message);
        setGpsDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ---------- Canvas resize listener ----------

  const handleResize = () => {
    const prevStrokes = strokes();
    setupCanvas();
    setStrokes(prevStrokes);
    redrawCanvas();
  };

  onMount(() => {
    window.addEventListener('resize', handleResize);

    // Request geolocation
    requestGeolocation();
    if (!navigator.geolocation) {
      setGpsDenied(true);
    }

    // Fetch public IP
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => {
        setIpAddress(data.ip);
        devLog('IP address acquired:', data.ip);
      })
      .catch((err) => devLog('IP fetch failed:', err));
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
  });

  // Setup canvas when entering sign step
  createEffect(() => {
    if (step() === 'sign') {
      requestAnimationFrame(() => setupCanvas());
    }
  });

  // ---------- Collect Metadata ----------

  const collectMetadata = (): SignatureMetadata => {
    const endTime = Date.now();
    const startTime = signatureStartTime() || endTime;
    const gps = gpsCoords();
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      touchEnabled: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      ipAddress: ipAddress() || undefined,
      gpsLatitude: gps?.latitude,
      gpsLongitude: gps?.longitude,
      gpsAccuracy: gps?.accuracy,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      pageUrl: window.location.href,
      referrer: document.referrer || undefined,
      clientTimestamp: endTime,
      timezoneOffset: new Date().getTimezoneOffset(),
      canvasWidth: canvasRef?.width,
      canvasHeight: canvasRef?.height,
      strokeCount: strokes().length,
      signatureDuration: endTime - startTime,
    };
  };

  // ---------- Save Signature ----------

  const handleSign = async () => {
    if (!canSign() || !canvasRef) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const sigImage = canvasRef.toDataURL('image/png');
      const metadata = collectMetadata();
      const now = Date.now();
      setSignatureImage(sigImage);
      setSignedTimestamp(now);

      const docType = selectedDocType();

      // Build update payload
      const updates: Record<string, any> = {};

      if (docType === 'engagement' || docType === 'both') {
        updates.clientSignature = {
          name: typedName().trim(),
          date: new Date(now).toLocaleDateString(),
          agreedToTerms: true,
          signedAt: now,
          signatureImage: sigImage,
          metadata,
        };
      }

      if (docType === 'form8879' || docType === 'both') {
        updates.clientSigningPin = {
          pin: pin(),
          setAt: now,
          confirmedAt: now,
          signerName: typedName().trim(),
          signatureImage: sigImage,
          metadata,
        };
      }

      // TODO: Replace with actual API endpoint for workspace (authenticated) signature save
      const body = {
        query: 'updateTaxDocumentRequest',
        params: {
          businessId: authStore.getBusinessId(),
          id: props.documentRequest.id,
        },
        form: updates,
      };

      devLog('Saving in-office signature:', body);
      await fetchGraphQLSS(body);

      const result: SignatureResult = {
        documentType: docType,
        signatureImage: sigImage,
        metadata,
        signerName: typedName().trim(),
        pin: needsPin() ? pin() : undefined,
        signedAt: now,
      };

      setStep('confirm');
      props.onSignatureComplete(result);
    } catch (err) {
      devLog('Error saving signature:', err);
      setSaveError(t('errorSaving'));
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Styles ----------

  const panelStyle = {
    'max-width': '800px',
    margin: '0 auto',
    padding: '0',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem',
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: '#1e3a5f',
    margin: '0',
  };

  const langToggleStyle = {
    display: 'flex',
    gap: '0.25rem',
    background: '#f1f5f9',
    'border-radius': '8px',
    padding: '2px',
  };

  const langBtnStyle = (active: boolean) => ({
    padding: '0.375rem 0.75rem',
    border: 'none',
    'border-radius': '6px',
    background: active ? '#1e3a5f' : 'transparent',
    color: active ? 'white' : '#64748b',
    'font-weight': '600',
    'font-size': '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const docTypeCardStyle = (selected: boolean) => ({
    padding: '1.25rem',
    border: `2px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
    'border-radius': '12px',
    background: selected ? '#eff6ff' : 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    'margin-bottom': '0.75rem',
  });

  const docTypeTitleStyle = {
    'font-weight': '600',
    'font-size': '1rem',
    color: '#1e293b',
    'margin-bottom': '0.25rem',
  };

  const docTypeDescStyle = {
    'font-size': '0.875rem',
    color: '#64748b',
    margin: '0',
  };

  const sectionStyle = {
    background: '#f8fafc',
    'border-radius': '10px',
    padding: '1.25rem',
    'margin-bottom': '1rem',
    border: '1px solid #e2e8f0',
  };

  const sectionTitleStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: '#1e293b',
    'margin-bottom': '0.75rem',
    'margin-top': '0',
  };

  const infoRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid #e2e8f0',
  };

  const infoLabelStyle = {
    'font-size': '0.875rem',
    color: '#64748b',
  };

  const infoValueStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: '#1e293b',
  };

  const canvasContainerStyle = {
    position: 'relative' as const,
    background: 'white',
    'border-radius': '12px',
    border: '2px solid #cbd5e1',
    overflow: 'hidden' as const,
    'margin-bottom': '1rem',
    'touch-action': 'none',
  };

  const canvasStyle = {
    display: 'block',
    width: '100%',
    cursor: 'crosshair',
    'touch-action': 'none',
  };

  const canvasActionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1rem',
  };

  const canvasActionBtnStyle = {
    padding: '0.5rem 1rem',
    border: '1px solid #cbd5e1',
    'border-radius': '8px',
    background: 'white',
    color: '#64748b',
    'font-size': '0.875rem',
    cursor: 'pointer',
    'font-weight': '500',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #cbd5e1',
    'border-radius': '8px',
    'font-size': '1rem',
    'box-sizing': 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const pinInputStyle = {
    ...inputStyle,
    'max-width': '200px',
    'letter-spacing': '0.5em',
    'text-align': 'center' as const,
    'font-size': '1.25rem',
    'font-weight': '700',
  };

  const checkboxRowStyle = {
    display: 'flex',
    'align-items': 'flex-start',
    gap: '0.75rem',
    'margin-bottom': '1rem',
  };

  const checkboxStyle = {
    width: '20px',
    height: '20px',
    'min-width': '20px',
    'margin-top': '2px',
    cursor: 'pointer',
    'accent-color': '#3b82f6',
  };

  const checkboxLabelStyle = {
    'font-size': '0.875rem',
    color: '#475569',
    'line-height': '1.4',
    cursor: 'pointer',
  };

  const signBtnStyle = (enabled: boolean) => ({
    width: '100%',
    padding: '1rem',
    border: 'none',
    'border-radius': '12px',
    background: enabled
      ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
      : '#cbd5e1',
    color: enabled ? 'white' : '#94a3b8',
    'font-size': '1.125rem',
    'font-weight': '700',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    'margin-top': '0.5rem',
  });

  const navBtnStyle = (primary: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: primary ? 'none' : '1px solid #cbd5e1',
    'border-radius': '8px',
    background: primary ? '#3b82f6' : 'white',
    color: primary ? 'white' : '#64748b',
    'font-size': '0.9375rem',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const confirmBoxStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
  };

  const confirmIconStyle = {
    width: '64px',
    height: '64px',
    'border-radius': '50%',
    background: '#dcfce7',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    margin: '0 auto 1rem auto',
  };

  const confirmTitleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: '#16a34a',
    'margin-bottom': '0.5rem',
  };

  const confirmMsgStyle = {
    color: '#64748b',
    'font-size': '1rem',
    'margin-bottom': '1.5rem',
  };

  const confirmDetailStyle = {
    'font-size': '0.875rem',
    color: '#475569',
    'margin-bottom': '0.25rem',
  };

  const errorStyle = {
    color: '#dc2626',
    'font-size': '0.875rem',
    'margin-bottom': '0.75rem',
    padding: '0.75rem',
    background: '#fef2f2',
    'border-radius': '8px',
    border: '1px solid #fecaca',
  };

  const strokeWarningStyle = {
    color: '#f59e0b',
    'font-size': '0.8125rem',
    'margin-bottom': '0.5rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.375rem',
  };

  const signaturePreviewStyle = {
    'max-width': '300px',
    'max-height': '120px',
    border: '1px solid #e2e8f0',
    'border-radius': '8px',
    margin: '1rem auto',
    display: 'block',
  };

  // ---------- Document type label ----------

  const docTypeLabel = () => {
    const dt = selectedDocType();
    if (dt === 'engagement') return t('engagementLetter');
    if (dt === 'form8879') return t('form8879');
    return t('bothDocuments');
  };

  // ---------- Render ----------

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>{t('title')}</h2>
        <div style={langToggleStyle}>
          <button style={langBtnStyle(lang() === 'en')} onClick={() => setLang('en')}>EN</button>
          <button style={langBtnStyle(lang() === 'es')} onClick={() => setLang('es')}>ES</button>
        </div>
      </div>

      {/* Step: Select Document Type */}
      <Show when={step() === 'select'}>
        <Card>
          <h3 style={sectionTitleStyle}>{t('selectDocType')}</h3>

          <div
            style={docTypeCardStyle(selectedDocType() === 'engagement')}
            onClick={() => setSelectedDocType('engagement')}
          >
            <div style={docTypeTitleStyle}>{t('engagementLetter')}</div>
            <p style={docTypeDescStyle}>{t('engagementDesc')}</p>
          </div>

          <div
            style={docTypeCardStyle(selectedDocType() === 'form8879')}
            onClick={() => setSelectedDocType('form8879')}
          >
            <div style={docTypeTitleStyle}>{t('form8879')}</div>
            <p style={docTypeDescStyle}>{t('form8879Desc')}</p>
          </div>

          <div
            style={docTypeCardStyle(selectedDocType() === 'both')}
            onClick={() => setSelectedDocType('both')}
          >
            <div style={docTypeTitleStyle}>{t('bothDocuments')}</div>
            <p style={docTypeDescStyle}>{t('bothDesc')}</p>
          </div>

          <div style={{ display: 'flex', 'justify-content': 'flex-end', 'margin-top': '1rem' }}>
            <button style={navBtnStyle(true)} onClick={() => setStep('review')}>
              {t('next')}
            </button>
          </div>
        </Card>
      </Show>

      {/* Step: Review Info */}
      <Show when={step() === 'review'}>
        <Card>
          <h3 style={sectionTitleStyle}>{t('reviewTitle')}</h3>

          {/* Engagement Letter Info */}
          <Show when={selectedDocType() === 'engagement' || selectedDocType() === 'both'}>
            <div style={sectionStyle}>
              <h4 style={sectionTitleStyle}>{t('engagementTermsTitle')}</h4>
              <p style={{ 'font-size': '0.875rem', color: '#475569', 'line-height': '1.5', 'margin-bottom': '0.75rem' }}>
                {t('engagementTerms')}
              </p>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>{t('feeEstimate')}</span>
                <span style={infoValueStyle}>
                  {formatCurrency(props.client.paymentAmount)}
                </span>
              </div>
            </div>
          </Show>

          {/* Form 8879 Info */}
          <Show when={selectedDocType() === 'form8879' || selectedDocType() === 'both'}>
            <div style={sectionStyle}>
              <h4 style={sectionTitleStyle}>{t('form8879Title')}</h4>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>{t('agi')}</span>
                <span style={infoValueStyle}>
                  {formatCurrency(props.client.totalRefund !== undefined ? undefined : undefined)}
                </span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>{t('totalTax')}</span>
                <span style={infoValueStyle}>{t('na')}</span>
              </div>
              <Show when={props.client.federalRefund !== undefined && props.client.federalRefund > 0}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('refundAmount')}</span>
                  <span style={{ ...infoValueStyle, color: '#16a34a' }}>
                    {formatCurrency(props.client.federalRefund)}
                  </span>
                </div>
              </Show>
              <Show when={props.client.federalOwe !== undefined && props.client.federalOwe > 0}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('amountOwed')}</span>
                  <span style={{ ...infoValueStyle, color: '#dc2626' }}>
                    {formatCurrency(props.client.federalOwe)}
                  </span>
                </div>
              </Show>

              {/* PIN Entry */}
              <div style={{ 'margin-top': '1rem' }}>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '600', color: '#1e293b', display: 'block', 'margin-bottom': '0.5rem' }}>
                  {t('pinLabel')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  style={pinInputStyle}
                  placeholder={t('pinPlaceholder')}
                  value={pin()}
                  onInput={(e) => {
                    const val = e.currentTarget.value.replace(/\D/g, '').slice(0, 5);
                    setPin(val);
                  }}
                />
                <p style={{ 'font-size': '0.8125rem', color: '#64748b', 'margin-top': '0.375rem' }}>
                  {t('pinHint')}
                </p>
              </div>
            </div>
          </Show>

          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-top': '1rem' }}>
            <button style={navBtnStyle(false)} onClick={() => setStep('select')}>
              {t('back')}
            </button>
            <button
              style={navBtnStyle(true)}
              onClick={() => setStep('sign')}
              disabled={needsPin() && !isPinValid()}
            >
              {t('next')}
            </button>
          </div>
        </Card>
      </Show>

      {/* Step: Sign */}
      <Show when={step() === 'sign'}>
        <Card>
          <h3 style={sectionTitleStyle}>{t('signTitle')}</h3>
          <p style={{ 'font-size': '0.875rem', color: '#64748b', 'margin-bottom': '1rem' }}>
            {t('signInstructions')}
          </p>

          {/* GPS denied error */}
          <Show when={gpsDenied()}>
            <div style={{ color: '#dc2626', 'font-size': '0.875rem', 'margin-bottom': '1rem', padding: '0.75rem', background: '#fef2f2', 'border-radius': '8px', border: '1px solid #fecaca', display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', 'min-width': '18px' }}>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span style={{ flex: '1' }}>{t('gpsRequired')}</span>
              <button
                style={{ padding: '0.375rem 0.75rem', border: '1px solid #fca5a5', 'border-radius': '6px', background: 'white', color: '#dc2626', 'font-size': '0.8125rem', 'font-weight': '600', cursor: 'pointer' }}
                onClick={requestGeolocation}
              >
                {t('retryGps')}
              </button>
            </div>
          </Show>

          {/* GPS waiting */}
          <Show when={!gpsDenied() && !gpsCoords()}>
            <div style={{ color: '#d97706', 'font-size': '0.875rem', 'margin-bottom': '1rem', padding: '0.75rem', background: '#fffbeb', 'border-radius': '8px', border: '1px solid #fde68a', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', 'min-width': '18px', animation: 'spin 1s linear infinite' }}>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clip-rule="evenodd" />
              </svg>
              {t('gpsWaiting')}
            </div>
          </Show>

          {/* Canvas */}
          <div ref={canvasContainerRef} style={canvasContainerStyle}>
            <canvas
              ref={canvasRef}
              style={canvasStyle}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          {/* Canvas actions */}
          <div style={canvasActionsStyle}>
            <button style={canvasActionBtnStyle} onClick={clearSignature}>
              {t('clear')}
            </button>
            <button
              style={canvasActionBtnStyle}
              onClick={undoLastStroke}
              disabled={strokes().length === 0}
            >
              {t('undoStroke')}
            </button>
          </div>

          {/* Stroke validation warning */}
          <Show when={strokes().length > 0 && !hasMinStrokes()}>
            <div style={strokeWarningStyle}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              {t('signatureRequired')}
            </div>
          </Show>

          {/* Legal acknowledgment */}
          <div style={checkboxRowStyle}>
            <input
              type="checkbox"
              id="esign-agree"
              style={checkboxStyle}
              checked={agreed()}
              onChange={(e) => setAgreed(e.currentTarget.checked)}
            />
            <label for="esign-agree" style={checkboxLabelStyle}>
              {t('legalAcknowledgment')}
            </label>
          </div>

          {/* Typed name */}
          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{ 'font-size': '0.875rem', 'font-weight': '600', color: '#1e293b', display: 'block', 'margin-bottom': '0.5rem' }}>
              {t('typedNameLabel')}
            </label>
            <input
              type="text"
              style={inputStyle}
              placeholder={t('typedNamePlaceholder')}
              value={typedName()}
              onInput={(e) => setTypedName(e.currentTarget.value)}
            />
          </div>

          {/* Error */}
          <Show when={saveError()}>
            <div style={errorStyle}>{saveError()}</div>
          </Show>

          {/* Navigation + Sign */}
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-top': '0.5rem' }}>
            <button style={navBtnStyle(false)} onClick={() => setStep('review')}>
              {t('back')}
            </button>
            <button
              style={signBtnStyle(canSign() && !isSaving())}
              onClick={handleSign}
              disabled={!canSign() || isSaving()}
            >
              {isSaving() ? t('signing') : t('signButton')}
            </button>
          </div>
        </Card>
      </Show>

      {/* Step: Confirmation */}
      <Show when={step() === 'confirm'}>
        <Card>
          <div style={confirmBoxStyle}>
            <div style={confirmIconStyle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" style={{ width: '36px', height: '36px' }}>
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={confirmTitleStyle}>{t('confirmTitle')}</h3>
            <p style={confirmMsgStyle}>{t('confirmMessage')}</p>

            <div style={{ 'text-align': 'left' as const, 'max-width': '400px', margin: '0 auto' }}>
              <p style={confirmDetailStyle}>
                <strong>{t('signedBy')}:</strong> {typedName()}
              </p>
              <p style={confirmDetailStyle}>
                <strong>{t('signedAt')}:</strong>{' '}
                {signedTimestamp()
                  ? new Date(signedTimestamp()!).toLocaleString(lang() === 'es' ? 'es-US' : 'en-US', {
                      dateStyle: 'long',
                      timeStyle: 'medium',
                    })
                  : ''}
              </p>
              <p style={confirmDetailStyle}>
                <strong>{t('documentSigned')}:</strong> {docTypeLabel()}
              </p>
              <Show when={ipAddress()}>
                <p style={confirmDetailStyle}>
                  <strong>IP:</strong> {ipAddress()}
                </p>
              </Show>
              <Show when={gpsCoords()}>
                <p style={confirmDetailStyle}>
                  <strong>GPS:</strong> {gpsCoords()!.latitude.toFixed(6)}, {gpsCoords()!.longitude.toFixed(6)} ({'\u00B1'}{Math.round(gpsCoords()!.accuracy)}m)
                </p>
              </Show>
            </div>

            <Show when={signatureImage()}>
              <div>
                <p style={{ ...confirmDetailStyle, 'text-align': 'center' as const, 'margin-top': '1rem' }}>
                  <strong>{t('signaturePreview')}</strong>
                </p>
                <img src={signatureImage()!} alt="Signature" style={signaturePreviewStyle} />
              </div>
            </Show>

            <button
              style={{ ...navBtnStyle(true), 'margin-top': '1.5rem' }}
              onClick={() => props.onSignatureComplete({
                documentType: selectedDocType(),
                signatureImage: signatureImage()!,
                metadata: collectMetadata(),
                signerName: typedName(),
                pin: needsPin() ? pin() : undefined,
                signedAt: signedTimestamp()!,
              })}
            >
              {t('done')}
            </button>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export default ESignaturePanel;
