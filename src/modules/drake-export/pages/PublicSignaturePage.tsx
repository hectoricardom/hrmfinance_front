/**
 * PublicSignaturePage
 * Remote signature page - NO auth required
 * Accessed via WhatsApp/SMS link: /remote-sign/:id/:token
 * Mobile-first design for phone-based signing
 */

import { Component, createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  getDocumentRequestByToken,
  getTaxPortalByRequest,
  updateDocumentRequestPublic,
} from '../services/taxPortalApi';
import type { TaxPortal, TaxDocumentRequest, SignatureMetadata } from '../types/drakeTypes';
import { devLog } from '../../../services/utils';

// ---------- Types ----------

type PageLanguage = 'en' | 'es';
type PageStep = 'loading' | 'error' | 'verify' | 'review' | 'sign' | 'confirm' | 'success';
type ErrorType = 'expired' | 'already_signed' | 'invalid_token' | 'generic';

// ---------- Translations ----------

const translations: Record<PageLanguage, Record<string, string>> = {
  en: {
    brandName: 'Stephanie Solutions Tax Preparation',
    loadingMessage: 'Loading your document...',
    // Verify step
    verifyTitle: 'Verify Your Identity',
    verifyInstructions: 'For your security, please verify your identity before proceeding.',
    verifyMethodSSN: 'Last 4 digits of SSN',
    verifyMethodDOB: 'Date of Birth',
    ssnPlaceholder: 'Last 4 digits',
    dobPlaceholder: 'MM/DD/YYYY',
    verifyButton: 'Verify Identity',
    verifyError: 'Verification failed. Please check your information and try again.',
    verifying: 'Verifying...',
    // Review step
    reviewTitle: 'Review Documents',
    reviewInstructions: 'Please review the following information before signing.',
    engagementSection: 'Engagement Letter',
    engagementTerms: 'By signing, you authorize Stephanie Solutions Tax Preparation to prepare and file your tax return for the tax year shown below. You agree to provide accurate and complete information.',
    form8879Section: 'E-File Authorization (Form 8879)',
    taxYear: 'Tax Year',
    clientName: 'Client Name',
    feeEstimate: 'Estimated Fee',
    refundAmount: 'Refund Amount',
    amountOwed: 'Amount Owed',
    continueToSign: 'Continue to Sign',
    // Sign step
    signTitle: 'Sign Your Documents',
    signInstructions: 'Use your finger to sign below',
    clear: 'Clear',
    undoStroke: 'Undo',
    signatureRequired: 'Please sign with at least 2 strokes',
    typedNameLabel: 'Type Your Full Legal Name',
    typedNamePlaceholder: 'e.g. John A. Smith',
    pinLabel: '5-Digit E-Filing PIN',
    pinPlaceholder: 'Enter 5 digits',
    pinHint: 'Choose any 5 digits (not all zeros). This PIN authorizes your e-filed return.',
    legalAcknowledgment: 'I agree to the terms and conditions. I confirm that the information provided is accurate and I authorize the electronic filing of my tax return.',
    submitSignature: 'Submit Signature',
    submitting: 'Submitting...',
    // Confirm step (pre-submit review)
    confirmTitle: 'Confirm Your Signature',
    confirmInstructions: 'Please review your information before submitting.',
    signaturePreview: 'Your Signature',
    signedAs: 'Signing as',
    pinSet: 'E-Filing PIN',
    editSignature: 'Edit Signature',
    confirmSubmit: 'Confirm & Submit',
    // Success step
    successTitle: 'Thank You!',
    successMessage: 'Your signature has been recorded successfully.',
    successTimestamp: 'Signed on',
    successClose: 'You may close this page.',
    // Errors
    errorExpiredTitle: 'Link Expired',
    errorExpiredMessage: 'This signing link has expired. Please contact your tax preparer for a new link.',
    errorAlreadySignedTitle: 'Already Signed',
    errorAlreadySignedMessage: 'This document has already been signed. If you need to make changes, please contact your tax preparer.',
    errorInvalidTitle: 'Invalid Link',
    errorInvalidMessage: 'This signing link is not valid. Please check the URL or contact your tax preparer.',
    errorGenericTitle: 'Something Went Wrong',
    errorGenericMessage: 'An error occurred. Please try again or contact your tax preparer.',
    errorSaving: 'Error saving your signature. Please try again.',
    gpsRequired: 'Location access is required to sign. Please enable location permissions in your browser settings and reload the page.',
    gpsWaiting: 'Waiting for location access...',
    retryGps: 'Retry Location',
    na: 'N/A',
    back: 'Back',
    portraitHint: 'For the best experience, use your phone in portrait mode.',
  },
  es: {
    brandName: 'Stephanie Solutions Tax Preparation',
    loadingMessage: 'Cargando su documento...',
    // Verify step
    verifyTitle: 'Verifique su Identidad',
    verifyInstructions: 'Para su seguridad, verifique su identidad antes de continuar.',
    verifyMethodSSN: 'Ultimos 4 digitos del SSN',
    verifyMethodDOB: 'Fecha de Nacimiento',
    ssnPlaceholder: 'Ultimos 4 digitos',
    dobPlaceholder: 'MM/DD/AAAA',
    verifyButton: 'Verificar Identidad',
    verifyError: 'La verificacion fallo. Por favor verifique su informacion e intente de nuevo.',
    verifying: 'Verificando...',
    // Review step
    reviewTitle: 'Revise los Documentos',
    reviewInstructions: 'Por favor revise la siguiente informacion antes de firmar.',
    engagementSection: 'Carta de Compromiso',
    engagementTerms: 'Al firmar, usted autoriza a Stephanie Solutions Tax Preparation a preparar y presentar su declaracion de impuestos para el ano fiscal indicado a continuacion. Usted acepta proporcionar informacion precisa y completa.',
    form8879Section: 'Autorizacion E-File (Formulario 8879)',
    taxYear: 'Ano Fiscal',
    clientName: 'Nombre del Cliente',
    feeEstimate: 'Tarifa Estimada',
    refundAmount: 'Monto del Reembolso',
    amountOwed: 'Monto Adeudado',
    continueToSign: 'Continuar para Firmar',
    // Sign step
    signTitle: 'Firme sus Documentos',
    signInstructions: 'Use su dedo para firmar abajo',
    clear: 'Borrar',
    undoStroke: 'Deshacer',
    signatureRequired: 'Por favor firme con al menos 2 trazos',
    typedNameLabel: 'Escriba su Nombre Legal Completo',
    typedNamePlaceholder: 'ej. Juan A. Garcia',
    pinLabel: 'PIN de 5 Digitos para E-Filing',
    pinPlaceholder: 'Ingrese 5 digitos',
    pinHint: 'Elija cualquier 5 digitos (no todos ceros). Este PIN autoriza su declaracion electronica.',
    legalAcknowledgment: 'Acepto los terminos y condiciones. Confirmo que la informacion proporcionada es precisa y autorizo la presentacion electronica de mi declaracion de impuestos.',
    submitSignature: 'Enviar Firma',
    submitting: 'Enviando...',
    // Confirm step
    confirmTitle: 'Confirme su Firma',
    confirmInstructions: 'Por favor revise su informacion antes de enviar.',
    signaturePreview: 'Su Firma',
    signedAs: 'Firmando como',
    pinSet: 'PIN de E-Filing',
    editSignature: 'Editar Firma',
    confirmSubmit: 'Confirmar y Enviar',
    // Success step
    successTitle: 'Gracias!',
    successMessage: 'Su firma ha sido registrada exitosamente.',
    successTimestamp: 'Firmado el',
    successClose: 'Puede cerrar esta pagina.',
    // Errors
    errorExpiredTitle: 'Enlace Expirado',
    errorExpiredMessage: 'Este enlace de firma ha expirado. Comuniquese con su preparador de impuestos para un nuevo enlace.',
    errorAlreadySignedTitle: 'Ya Firmado',
    errorAlreadySignedMessage: 'Este documento ya ha sido firmado. Si necesita hacer cambios, comuniquese con su preparador de impuestos.',
    errorInvalidTitle: 'Enlace Invalido',
    errorInvalidMessage: 'Este enlace de firma no es valido. Verifique la URL o comuniquese con su preparador de impuestos.',
    errorGenericTitle: 'Algo Salio Mal',
    errorGenericMessage: 'Ocurrio un error. Por favor intente de nuevo o comuniquese con su preparador de impuestos.',
    errorSaving: 'Error al guardar su firma. Por favor intente de nuevo.',
    gpsRequired: 'Se requiere acceso a la ubicacion para firmar. Habilite los permisos de ubicacion en la configuracion de su navegador y recargue la pagina.',
    gpsWaiting: 'Esperando acceso a la ubicacion...',
    retryGps: 'Reintentar Ubicacion',
    na: 'N/A',
    back: 'Atras',
    portraitHint: 'Para una mejor experiencia, use su telefono en modo vertical.',
  },
};

// ---------- Component ----------

const PublicSignaturePage: Component = () => {
  const params = useParams<{ id: string; token: string }>();

  // Core state
  const [lang, setLang] = createSignal<PageLanguage>('en');
  const [pageStep, setPageStep] = createSignal<PageStep>('loading');
  const [errorType, setErrorType] = createSignal<ErrorType>('generic');
  const [request, setRequest] = createSignal<TaxDocumentRequest | null>(null);
  const [client, setClient] = createSignal<TaxPortal | null>(null);

  // Verify state
  const [verifyMethod, setVerifyMethod] = createSignal<'ssn' | 'dob'>('ssn');
  const [verifyInput, setVerifyInput] = createSignal('');
  const [verifyError, setVerifyError] = createSignal(false);
  const [isVerifying, setIsVerifying] = createSignal(false);

  // Sign state
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

  // ---------- Detect language from browser ----------

  const detectLanguage = () => {
    const browserLang = navigator.language || '';
    if (browserLang.startsWith('es')) {
      setLang('es');
    } else {
      setLang('en');
    }
  };

  // ---------- Format currency ----------

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return t('na');
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // ---------- Whether we need a PIN (Form 8879 always needs one) ----------

  const needsPin = (): boolean => {
    // Check if the document request has requested sign_letter or set_signing_pin types
    const req = request();
    if (!req) return false;
    const docTypes = req.requestedDocuments?.map(d => d.type) || [];
    // If set_signing_pin is requested, or if we have form 8879 fields to fill
    return docTypes.includes('set_signing_pin') || !!req.clientSigningPin;
  };

  // PIN validation
  const isPinValid = () => {
    if (!needsPin()) return true;
    const p = pin();
    return p.length === 5 && /^\d{5}$/.test(p) && p !== '00000';
  };

  // Stroke count validation
  const hasMinStrokes = () => strokes().length >= 2;

  // Can submit
  const canSubmit = () =>
    agreed() &&
    typedName().trim().length >= 2 &&
    hasMinStrokes() &&
    isPinValid() &&
    gpsCoords() !== null &&
    !gpsDenied();

  // ---------- Geolocation ----------

  const requestGeolocation = () => {
    if (!navigator.geolocation) { setGpsDenied(true); return; }
    setGpsDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsDenied(false);
        devLog('Geolocation acquired:', pos.coords.latitude, pos.coords.longitude);
      },
      (err) => { devLog('Geolocation denied:', err.message); setGpsDenied(true); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ---------- Load Data on Mount ----------

  onMount(() => {
    detectLanguage();
    loadRequest();
    requestGeolocation();
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => { setIpAddress(data.ip); devLog('IP acquired:', data.ip); })
      .catch((err) => devLog('IP fetch failed:', err));
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
  });

  const loadRequest = async () => {
    try {
      const id = params.id;
      const token = params.token;

      if (!id || !token) {
        setErrorType('invalid_token');
        setPageStep('error');
        return;
      }

      const docRequest = await getDocumentRequestByToken(id, token);
      if (!docRequest) {
        setErrorType('invalid_token');
        setPageStep('error');
        return;
      }

      // Check expiration
      if (docRequest.status === 'expired' || (docRequest.expiresAt && docRequest.expiresAt < Date.now())) {
        setErrorType('expired');
        setPageStep('error');
        return;
      }

      // Check if already signed (both engagement and pin)
      const hasEngagement = !!docRequest.clientSignature?.signedAt;
      const hasPin = !!docRequest.clientSigningPin?.pin;
      if (hasEngagement && hasPin) {
        setErrorType('already_signed');
        setPageStep('error');
        return;
      }

      setRequest(docRequest);

      // Try to load client data for display
      try {
        const clientData = await getTaxPortalByRequest(id, token);
        if (clientData) {
          setClient(clientData);
        }
      } catch (err) {
        devLog('Could not load client data (non-critical):', err);
      }

      setPageStep('verify');
    } catch (err) {
      devLog('Error loading signature request:', err);
      setErrorType('generic');
      setPageStep('error');
    }
  };

  // ---------- Verify Identity ----------

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyError(false);

    try {
      const cl = client();
      if (!cl) {
        // If no client data, skip verification
        setPageStep('review');
        return;
      }

      const input = verifyInput().trim();
      let isValid = false;

      if (verifyMethod() === 'ssn') {
        // Match last 4 digits of SSN
        const clientSSN = cl.ssn || '';
        const last4 = clientSSN.replace(/\D/g, '').slice(-4);
        isValid = input.length === 4 && input === last4;
      } else {
        // Match date of birth
        const clientDOB = cl.dateOfBirth || '';
        // Normalize both to compare (accept MM/DD/YYYY or YYYY-MM-DD)
        const inputNormalized = input.replace(/\D/g, '');
        const dobNormalized = clientDOB.replace(/\D/g, '');
        // Try matching last 8 digits (MMDDYYYY or YYYYMMDD)
        isValid = inputNormalized.length >= 8 && (
          inputNormalized === dobNormalized ||
          inputNormalized === dobNormalized.slice(4) + dobNormalized.slice(0, 4) // MMDDYYYY vs YYYYMMDD
        );
      }

      if (isValid) {
        setPageStep('review');
      } else {
        setVerifyError(true);
      }
    } catch (err) {
      devLog('Verification error:', err);
      setVerifyError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  // ---------- Canvas ----------

  const setupCanvas = () => {
    if (!canvasRef || !canvasContainerRef) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasContainerRef.getBoundingClientRect();
    const width = rect.width;
    const height = Math.min(220, Math.max(160, window.innerHeight * 0.25));

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

    // Guide line
    ctx.save();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(16, h - 36);
    ctx.lineTo(w - 16, h - 36);
    ctx.stroke();
    ctx.restore();

    // X marker
    ctx.save();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '18px serif';
    ctx.fillText('X', 6, h - 30);
    ctx.restore();

    // Strokes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);

    for (const stroke of strokes()) {
      drawStroke(ctx, stroke);
    }
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

  const handleResize = () => {
    if (pageStep() === 'sign' || pageStep() === 'confirm') {
      const prevStrokes = strokes();
      setupCanvas();
      setStrokes(prevStrokes);
      redrawCanvas();
    }
  };

  // Setup canvas when entering sign step
  createEffect(() => {
    if (pageStep() === 'sign') {
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

  // ---------- Submit Signature ----------

  const handleSubmit = async () => {
    if (!canSubmit() || !canvasRef) return;

    const req = request();
    if (!req) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const sigImage = canvasRef.toDataURL('image/png');
      const metadata = collectMetadata();
      const now = Date.now();
      setSignatureImage(sigImage);
      setSignedTimestamp(now);

      // Build update payload
      const updates: Record<string, any> = {};

      // Always save engagement signature
      updates.clientSignature = {
        name: typedName().trim(),
        date: new Date(now).toLocaleDateString(),
        agreedToTerms: true,
        signedAt: now,
        signatureImage: sigImage,
        metadata,
      };

      // Save PIN if needed
      if (needsPin() && isPinValid()) {
        updates.clientSigningPin = {
          pin: pin(),
          setAt: now,
          confirmedAt: now,
          signerName: typedName().trim(),
          signatureImage: sigImage,
          metadata,
        };
      }

      // TODO: Consider marking specific document types as uploaded/completed
      const result = await updateDocumentRequestPublic(
        req.id,
        params.token,
        updates,
        req.businessId
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to save signature');
      }

      setPageStep('success');
    } catch (err) {
      devLog('Error submitting signature:', err);
      setSaveError(t('errorSaving'));
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Go to confirm step (capture canvas before navigating) ----------

  const goToConfirmStep = () => {
    if (!canvasRef) return;
    setSignatureImage(canvasRef.toDataURL('image/png'));
    setPageStep('confirm');
  };

  // ---------- Styles ----------

  const pageStyle = {
    'min-height': '100dvh',
    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    '-webkit-font-smoothing': 'antialiased',
  };

  const headerStyle = {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)',
    padding: '1rem 1.25rem',
    color: 'white',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
  };

  const brandStyle = {
    'font-size': '1rem',
    'font-weight': '700',
    margin: '0',
  };

  const langToggleStyle = {
    display: 'flex',
    gap: '0.25rem',
    background: 'rgba(255,255,255,0.15)',
    'border-radius': '8px',
    padding: '2px',
  };

  const langBtnStyle = (active: boolean) => ({
    padding: '0.375rem 0.625rem',
    border: 'none',
    'border-radius': '6px',
    background: active ? 'white' : 'transparent',
    color: active ? '#1e3a5f' : 'rgba(255,255,255,0.8)',
    'font-weight': '600',
    'font-size': '0.8125rem',
    cursor: 'pointer',
  });

  const contentStyle = {
    padding: '1.25rem',
    'max-width': '520px',
    margin: '0 auto',
  };

  const cardStyle = {
    background: 'white',
    'border-radius': '16px',
    'box-shadow': '0 4px 24px rgba(0,0,0,0.08)',
    padding: '1.5rem',
    'margin-bottom': '1rem',
  };

  const titleStyle = {
    'font-size': '1.375rem',
    'font-weight': '700',
    color: '#1e293b',
    'margin-top': '0',
    'margin-bottom': '0.5rem',
  };

  const subtitleStyle = {
    'font-size': '0.9375rem',
    color: '#64748b',
    'margin-bottom': '1.25rem',
    'line-height': '1.4',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #cbd5e1',
    'border-radius': '10px',
    'font-size': '1rem',
    'box-sizing': 'border-box' as const,
    outline: 'none',
    '-webkit-appearance': 'none' as const,
  };

  const pinInputStyle = {
    ...inputStyle,
    'max-width': '220px',
    'letter-spacing': '0.5em',
    'text-align': 'center' as const,
    'font-size': '1.375rem',
    'font-weight': '700',
  };

  const primaryBtnStyle = (enabled: boolean) => ({
    width: '100%',
    padding: '1rem',
    border: 'none',
    'border-radius': '12px',
    background: enabled
      ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
      : '#cbd5e1',
    color: enabled ? 'white' : '#94a3b8',
    'font-size': '1.0625rem',
    'font-weight': '700',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    '-webkit-tap-highlight-color': 'transparent',
    'min-height': '52px',
  });

  const secondaryBtnStyle = {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #cbd5e1',
    'border-radius': '12px',
    background: 'white',
    color: '#64748b',
    'font-size': '0.9375rem',
    'font-weight': '600',
    cursor: 'pointer',
    'margin-top': '0.75rem',
    'min-height': '48px',
  };

  const verifyMethodBtnStyle = (active: boolean) => ({
    flex: '1',
    padding: '0.75rem',
    border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
    'border-radius': '10px',
    background: active ? '#eff6ff' : 'white',
    color: active ? '#1d4ed8' : '#64748b',
    'font-size': '0.875rem',
    'font-weight': '600',
    cursor: 'pointer',
    'text-align': 'center' as const,
    'min-height': '48px',
  });

  const errorBannerStyle = {
    color: '#dc2626',
    'font-size': '0.875rem',
    padding: '0.75rem',
    background: '#fef2f2',
    'border-radius': '8px',
    border: '1px solid #fecaca',
    'margin-bottom': '1rem',
  };

  const sectionBoxStyle = {
    background: '#f8fafc',
    'border-radius': '10px',
    padding: '1rem',
    'margin-bottom': '1rem',
    border: '1px solid #e2e8f0',
  };

  const sectionHeaderStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: '#1e293b',
    'margin-top': '0',
    'margin-bottom': '0.75rem',
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
    'margin-bottom': '0.75rem',
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
    padding: '0.5rem 0.875rem',
    border: '1px solid #cbd5e1',
    'border-radius': '8px',
    background: 'white',
    color: '#64748b',
    'font-size': '0.875rem',
    cursor: 'pointer',
    'font-weight': '500',
    'min-height': '40px',
  };

  const checkboxRowStyle = {
    display: 'flex',
    'align-items': 'flex-start',
    gap: '0.75rem',
    'margin-bottom': '1.25rem',
  };

  const checkboxStyle = {
    width: '22px',
    height: '22px',
    'min-width': '22px',
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

  const strokeWarningStyle = {
    color: '#f59e0b',
    'font-size': '0.8125rem',
    'margin-bottom': '0.75rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.375rem',
  };

  const successBoxStyle = {
    'text-align': 'center' as const,
    padding: '2rem 1rem',
  };

  const successIconStyle = {
    width: '80px',
    height: '80px',
    'border-radius': '50%',
    background: '#dcfce7',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    margin: '0 auto 1.25rem auto',
  };

  const successTitleStyle = {
    'font-size': '1.75rem',
    'font-weight': '700',
    color: '#16a34a',
    'margin-bottom': '0.75rem',
  };

  const successMsgStyle = {
    'font-size': '1rem',
    color: '#64748b',
    'margin-bottom': '1rem',
    'line-height': '1.4',
  };

  const successDetailStyle = {
    'font-size': '0.9375rem',
    color: '#475569',
    'margin-bottom': '0.25rem',
  };

  const signaturePreviewStyle = {
    'max-width': '280px',
    'max-height': '100px',
    border: '1px solid #e2e8f0',
    'border-radius': '8px',
    margin: '0.75rem auto',
    display: 'block',
  };

  const errorPageStyle = {
    'text-align': 'center' as const,
    padding: '3rem 1rem',
  };

  const errorIconStyle = {
    width: '72px',
    height: '72px',
    'border-radius': '50%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    margin: '0 auto 1.25rem auto',
  };

  const loadingContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    padding: '4rem 1rem',
    color: '#64748b',
  };

  const backBtnStyle = {
    padding: '0.75rem 1rem',
    border: '1px solid #cbd5e1',
    'border-radius': '10px',
    background: 'white',
    color: '#64748b',
    'font-size': '0.9375rem',
    'font-weight': '500',
    cursor: 'pointer',
    'min-height': '44px',
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: '#1e293b',
    display: 'block',
    'margin-bottom': '0.5rem',
  };

  // ---------- Error details ----------

  const getErrorTitle = () => {
    const et = errorType();
    if (et === 'expired') return t('errorExpiredTitle');
    if (et === 'already_signed') return t('errorAlreadySignedTitle');
    if (et === 'invalid_token') return t('errorInvalidTitle');
    return t('errorGenericTitle');
  };

  const getErrorMessage = () => {
    const et = errorType();
    if (et === 'expired') return t('errorExpiredMessage');
    if (et === 'already_signed') return t('errorAlreadySignedMessage');
    if (et === 'invalid_token') return t('errorInvalidMessage');
    return t('errorGenericMessage');
  };

  const getErrorColor = () => {
    const et = errorType();
    if (et === 'expired') return '#f59e0b';
    if (et === 'already_signed') return '#3b82f6';
    return '#dc2626';
  };

  // Client display name
  const clientName = () => {
    const cl = client();
    if (cl) return `${cl.firstName || ''} ${cl.lastName || ''}`.trim();
    const req = request();
    if (req) return req.clientName || '';
    return '';
  };

  // ---------- Render ----------

  return (
    <div style={pageStyle}>
      {/* Branded Header */}
      <div style={headerStyle}>
        <h1 style={brandStyle}>{t('brandName')}</h1>
        <div style={langToggleStyle}>
          <button style={langBtnStyle(lang() === 'en')} onClick={() => setLang('en')}>EN</button>
          <button style={langBtnStyle(lang() === 'es')} onClick={() => setLang('es')}>ES</button>
        </div>
      </div>

      <div style={contentStyle}>

        {/* Loading */}
        <Show when={pageStep() === 'loading'}>
          <div style={loadingContainerStyle}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              'border-top-color': '#3b82f6',
              'border-radius': '50%',
              animation: 'spin 1s linear infinite',
              'margin-bottom': '1rem',
            }} />
            <p style={{ margin: '0' }}>{t('loadingMessage')}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </Show>

        {/* Error */}
        <Show when={pageStep() === 'error'}>
          <div style={cardStyle}>
            <div style={errorPageStyle}>
              <div style={{ ...errorIconStyle, background: getErrorColor() + '20' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={getErrorColor()} stroke-width="2" style={{ width: '36px', height: '36px' }}>
                  <Show when={errorType() === 'already_signed'}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Show>
                  <Show when={errorType() === 'expired'}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Show>
                  <Show when={errorType() !== 'already_signed' && errorType() !== 'expired'}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </Show>
                </svg>
              </div>
              <h2 style={{ ...titleStyle, color: getErrorColor() }}>{getErrorTitle()}</h2>
              <p style={subtitleStyle}>{getErrorMessage()}</p>
            </div>
          </div>
        </Show>

        {/* Verify Identity */}
        <Show when={pageStep() === 'verify'}>
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t('verifyTitle')}</h2>
            <p style={subtitleStyle}>{t('verifyInstructions')}</p>

            {/* Method selector */}
            <div style={{ display: 'flex', gap: '0.75rem', 'margin-bottom': '1.25rem' }}>
              <button
                style={verifyMethodBtnStyle(verifyMethod() === 'ssn')}
                onClick={() => { setVerifyMethod('ssn'); setVerifyInput(''); setVerifyError(false); }}
              >
                {t('verifyMethodSSN')}
              </button>
              <button
                style={verifyMethodBtnStyle(verifyMethod() === 'dob')}
                onClick={() => { setVerifyMethod('dob'); setVerifyInput(''); setVerifyError(false); }}
              >
                {t('verifyMethodDOB')}
              </button>
            </div>

            <Show when={verifyError()}>
              <div style={errorBannerStyle}>{t('verifyError')}</div>
            </Show>

            <div style={{ 'margin-bottom': '1.25rem' }}>
              <Show when={verifyMethod() === 'ssn'}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  style={inputStyle}
                  placeholder={t('ssnPlaceholder')}
                  value={verifyInput()}
                  onInput={(e) => setVerifyInput(e.currentTarget.value.replace(/\D/g, '').slice(0, 4))}
                />
              </Show>
              <Show when={verifyMethod() === 'dob'}>
                <input
                  type="text"
                  inputMode="numeric"
                  style={inputStyle}
                  placeholder={t('dobPlaceholder')}
                  value={verifyInput()}
                  onInput={(e) => setVerifyInput(e.currentTarget.value)}
                />
              </Show>
            </div>

            <button
              style={primaryBtnStyle(verifyInput().length >= 4 && !isVerifying())}
              onClick={handleVerify}
              disabled={verifyInput().length < 4 || isVerifying()}
            >
              {isVerifying() ? t('verifying') : t('verifyButton')}
            </button>
          </div>
        </Show>

        {/* Review Documents */}
        <Show when={pageStep() === 'review'}>
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t('reviewTitle')}</h2>
            <p style={subtitleStyle}>{t('reviewInstructions')}</p>

            {/* Engagement Letter */}
            <div style={sectionBoxStyle}>
              <h3 style={sectionHeaderStyle}>{t('engagementSection')}</h3>
              <p style={{ 'font-size': '0.875rem', color: '#475569', 'line-height': '1.5', 'margin-top': '0', 'margin-bottom': '0.75rem' }}>
                {t('engagementTerms')}
              </p>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>{t('clientName')}</span>
                <span style={infoValueStyle}>{clientName()}</span>
              </div>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>{t('taxYear')}</span>
                <span style={infoValueStyle}>{request()?.taxYear || new Date().getFullYear() - 1}</span>
              </div>
              <Show when={client()?.paymentAmount}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('feeEstimate')}</span>
                  <span style={infoValueStyle}>{formatCurrency(client()?.paymentAmount)}</span>
                </div>
              </Show>
            </div>

            {/* Form 8879 */}
            <Show when={needsPin()}>
              <div style={sectionBoxStyle}>
                <h3 style={sectionHeaderStyle}>{t('form8879Section')}</h3>
                <Show when={client()?.federalRefund !== undefined && (client()?.federalRefund || 0) > 0}>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>{t('refundAmount')}</span>
                    <span style={{ ...infoValueStyle, color: '#16a34a' }}>
                      {formatCurrency(client()?.federalRefund)}
                    </span>
                  </div>
                </Show>
                <Show when={client()?.federalOwe !== undefined && (client()?.federalOwe || 0) > 0}>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>{t('amountOwed')}</span>
                    <span style={{ ...infoValueStyle, color: '#dc2626' }}>
                      {formatCurrency(client()?.federalOwe)}
                    </span>
                  </div>
                </Show>
              </div>
            </Show>

            <button
              style={primaryBtnStyle(true)}
              onClick={() => setPageStep('sign')}
            >
              {t('continueToSign')}
            </button>
          </div>
        </Show>

        {/* Sign */}
        <Show when={pageStep() === 'sign'}>
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t('signTitle')}</h2>
            <p style={subtitleStyle}>{t('signInstructions')}</p>

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
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', 'min-width': '18px' }}>
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

            {/* Stroke warning */}
            <Show when={strokes().length > 0 && !hasMinStrokes()}>
              <div style={strokeWarningStyle}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                {t('signatureRequired')}
              </div>
            </Show>

            {/* Typed name */}
            <div style={{ 'margin-bottom': '1rem' }}>
              <label style={labelStyle}>{t('typedNameLabel')}</label>
              <input
                type="text"
                style={inputStyle}
                placeholder={t('typedNamePlaceholder')}
                value={typedName()}
                onInput={(e) => setTypedName(e.currentTarget.value)}
              />
            </div>

            {/* PIN entry */}
            <Show when={needsPin()}>
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={labelStyle}>{t('pinLabel')}</label>
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
            </Show>

            {/* Legal acknowledgment */}
            <div style={checkboxRowStyle}>
              <input
                type="checkbox"
                id="public-sign-agree"
                style={checkboxStyle}
                checked={agreed()}
                onChange={(e) => setAgreed(e.currentTarget.checked)}
              />
              <label for="public-sign-agree" style={checkboxLabelStyle}>
                {t('legalAcknowledgment')}
              </label>
            </div>

            {/* Error */}
            <Show when={saveError()}>
              <div style={errorBannerStyle}>{saveError()}</div>
            </Show>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={backBtnStyle} onClick={() => setPageStep('review')}>
                {t('back')}
              </button>
              <button
                style={{ ...primaryBtnStyle(canSubmit() && !isSaving()), flex: '1' }}
                onClick={goToConfirmStep}
                disabled={!canSubmit()}
              >
                {t('submitSignature')}
              </button>
            </div>
          </div>
        </Show>

        {/* Confirm (pre-submit review) */}
        <Show when={pageStep() === 'confirm'}>
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t('confirmTitle')}</h2>
            <p style={subtitleStyle}>{t('confirmInstructions')}</p>

            <div style={sectionBoxStyle}>
              <p style={{ 'font-size': '0.875rem', color: '#64748b', 'margin-top': '0', 'margin-bottom': '0.5rem' }}>
                <strong>{t('signaturePreview')}</strong>
              </p>
              <Show when={signatureImage()}>
                <img src={signatureImage()!} alt="Signature" style={signaturePreviewStyle} />
              </Show>

              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>{t('signedAs')}</span>
                <span style={infoValueStyle}>{typedName()}</span>
              </div>
              <Show when={needsPin()}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('pinSet')}</span>
                  <span style={infoValueStyle}>{pin().replace(/./g, '*')}</span>
                </div>
              </Show>
            </div>

            <Show when={saveError()}>
              <div style={errorBannerStyle}>{saveError()}</div>
            </Show>

            <button
              style={primaryBtnStyle(!isSaving())}
              onClick={handleSubmit}
              disabled={isSaving()}
            >
              {isSaving() ? t('submitting') : t('confirmSubmit')}
            </button>

            <button
              style={secondaryBtnStyle}
              onClick={() => setPageStep('sign')}
            >
              {t('editSignature')}
            </button>
          </div>
        </Show>

        {/* Success */}
        <Show when={pageStep() === 'success'}>
          <div style={cardStyle}>
            <div style={successBoxStyle}>
              <div style={successIconStyle}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" style={{ width: '44px', height: '44px' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={successTitleStyle}>{t('successTitle')}</h2>
              <p style={successMsgStyle}>{t('successMessage')}</p>

              <Show when={signatureImage()}>
                <img src={signatureImage()!} alt="Signature" style={signaturePreviewStyle} />
              </Show>

              <p style={successDetailStyle}>
                <strong>{t('successTimestamp')}:</strong>{' '}
                {signedTimestamp()
                  ? new Date(signedTimestamp()!).toLocaleString(lang() === 'es' ? 'es-US' : 'en-US', {
                      dateStyle: 'long',
                      timeStyle: 'medium',
                    })
                  : ''}
              </p>
              <Show when={ipAddress()}>
                <p style={successDetailStyle}>
                  <strong>IP:</strong> {ipAddress()}
                </p>
              </Show>
              <Show when={gpsCoords()}>
                <p style={successDetailStyle}>
                  <strong>GPS:</strong> {gpsCoords()!.latitude.toFixed(6)}, {gpsCoords()!.longitude.toFixed(6)} ({'\u00B1'}{Math.round(gpsCoords()!.accuracy)}m)
                </p>
              </Show>
              <p style={{ ...successDetailStyle, 'margin-top': '1.5rem', color: '#94a3b8' }}>
                {t('successClose')}
              </p>
            </div>
          </div>
        </Show>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        input:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
      `}</style>
    </div>
  );
};

export default PublicSignaturePage;
