/**
 * PublicClientPortal - Portal Unificado Pre-Cita
 * Single-page portal where clients complete everything before their appointment:
 * Upload documents (AI classifies), sign engagement letter, create PIN,
 * add dependents, verify info, bank info.
 * Spanish-first, mobile-optimized, no login required.
 * Accessed via: /#/client-portal/:id/:accessToken
 */

import { Component, createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { markDocumentUploaded, uploadTaxDocument, processTaxDocument, getClientPortalPublic, updateClientPortalRequest, submitPortalStep } from '../services/taxPortalApi';
import type { DrakeTaxDocumentType } from '../types/drakeTypes';
import { VERIFICATION_FORM_TYPES } from '../types/drakeTypes';
import { devLog } from '../../../services/utils';
import { lookupZipCode } from '../utils/zipCodeLookup';

// Interfaces
interface ClientVerificationInfo {
  ssn: string;
  filingStatus: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface DependentInfo {
  firstName: string;
  lastName: string;
  relationship: string;
  ssn: string;
  dateOfBirth: string;
}

interface BankInfo {
  bankName: string;
  accountType: 'checking' | 'savings' | '';
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountHolderName: string;
}

interface UploadedDoc {
  id: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  classifiedAs?: string;
  errorMessage?: string;
}

// File constraints
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.heic,.heif';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// US Banks for autocomplete
const US_BANKS = [
  'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'U.S. Bank',
  'PNC Bank', 'Truist Bank', 'Capital One', 'TD Bank', 'Fifth Third Bank',
  'Citizens Bank', 'KeyBank', 'Huntington Bank', 'Regions Bank', 'Ally Bank',
  'Discover Bank', 'Navy Federal Credit Union', 'USAA Federal Savings Bank',
  'Pentagon Federal Credit Union', 'America First Credit Union', 'Chime', 'Varo Bank',
  'SoFi', 'Republic Bank & Trust Company', 'First Horizon Bank', 'Old National Bank'
].sort();

// Friendly document type labels (no tax jargon)
const DOC_FRIENDLY_LABELS: Record<string, Record<string, string>> = {
  es: {
    w2: 'Documento del empleador',
    '1099_nec': 'Ingresos independientes',
    '1099_k': 'Pagos recibidos por apps/plataformas',
    '1099_misc': 'Otros ingresos',
    '1099_int': 'Intereses del banco',
    '1099_div': 'Dividendos de inversiones',
    '1099_g': 'Pagos del gobierno',
    '1099_r': 'Retiro de pensiones',
    '1099_ssa': 'Seguro Social',
    ssa_1099: 'Seguro Social',
    '1098': 'Intereses de hipoteca',
    '1098_t': 'Gastos de educacion',
    '1095_a': 'Seguro medico',
    state_id: 'Identificacion',
    driver_license: 'Licencia de conducir',
    passport: 'Pasaporte',
    social_security_card: 'Tarjeta de Seguro Social',
    other: 'Documento recibido',
    unknown: 'Documento recibido',
  },
  en: {
    w2: 'Employer document',
    '1099_nec': 'Independent income',
    '1099_k': 'App/platform payments',
    '1099_misc': 'Other income',
    '1099_int': 'Bank interest',
    '1099_div': 'Investment dividends',
    '1099_g': 'Government payments',
    '1099_r': 'Retirement withdrawals',
    '1099_ssa': 'Social Security',
    ssa_1099: 'Social Security',
    '1098': 'Mortgage interest',
    '1098_t': 'Education expenses',
    '1095_a': 'Health insurance',
    state_id: 'Identification',
    driver_license: "Driver's license",
    passport: 'Passport',
    social_security_card: 'Social Security Card',
    other: 'Document received',
    unknown: 'Document received',
  }
};

// Translations - Spanish primary
const translations: Record<string, Record<string, string>> = {
  es: {
    // Header
    portalTitle: 'Su Portal de Impuestos',
    welcome: 'Bienvenido',
    appointmentDate: 'Fecha de cita',
    taxYear: 'Impuestos del',
    progress: 'Progreso',
    langToggle: 'English',

    // Loading/Error
    loading: 'Cargando...',
    errorTitle: 'Hubo un Problema',
    errorExpired: 'Este enlace ya no funciona. Pidale a su preparador que le envie uno nuevo.',
    errorInvalid: 'Este enlace no es valido. Pidale a su preparador que le envie uno nuevo.',
    errorCancelled: 'Este enlace fue cancelado. Contacte a su preparador.',

    // Section 1: Upload
    uploadTitle: 'Suba sus documentos',
    uploadMessage: 'Suba todos los papeles que recibio del trabajo, del banco, del gobierno, de donde sea. Tomeles foto o suba el archivo. Nosotros los organizamos por usted.',
    uploadZone: 'Toque aqui para tomar foto o subir archivo',
    uploadZoneSub: 'Fotos o archivos PDF (maximo 25MB)',
    uploadDrag: 'Suelte su archivo aqui',
    uploadedFiles: 'Documentos que ya subio',
    uploadingText: 'Subiendo...',
    processingText: 'Revisando documento...',
    uploadMore: '+ Subir mas',
    uploadError: 'No se pudo subir, intente de nuevo',

    // Section 2: Steps
    stepsTitle: 'Complete estos pasos',
    step: 'Paso',

    // Step 1: Sign
    signTitle: 'Firme para autorizar sus impuestos',
    signDescription: 'Yo autorizo a Stephanie Solution LLC a preparar mis impuestos federales y estatales. Entiendo que mis impuestos dependen de la informacion que yo doy. Voy a revisar todo antes de que se envie.',
    agreeLabel: 'Si, estoy de acuerdo',
    signatureLabel: 'Firme aqui',
    signHint: 'Use su dedo o mouse para firmar',
    clearBtn: 'Borrar firma',
    nameLabel: 'Su nombre completo',
    namePlaceholder: 'Escriba su nombre como aparece en su ID',
    dateLabel: 'Fecha de hoy',
    signBtn: 'Firmar',
    signComplete: 'Firmado correctamente',

    // Step 2: PIN
    pinTitle: 'Escoja 5 numeros secretos',
    pinDescription: 'Estos 5 numeros son su clave personal para que el IRS acepte sus impuestos. Escoja numeros que usted pueda recordar.',
    pinLabel: 'Escriba 5 numeros',
    pinPlaceholder: '12345',
    confirmPinLabel: 'Repita los mismos 5 numeros',
    confirmPinPlaceholder: 'Repita aqui',
    pinMismatch: 'Los numeros no son iguales, intente de nuevo',
    pinInvalid: 'Necesita escribir exactamente 5 numeros',
    pinSignLabel: 'Su Firma',
    pinNameLabel: 'Su nombre',
    pinBtn: 'Guardar mis numeros',
    pinComplete: 'Numeros guardados',

    // Step 3: Dependents
    depTitle: 'Personas que dependen de usted',
    depDescription: 'Agregue a sus hijos o familiares que viven con usted y usted mantiene. Si no tiene, toque el boton de abajo.',
    depFirstName: 'Nombre',
    depLastName: 'Apellido',
    depRelationship: 'Quien es?',
    depSSN: 'Seguro Social (si lo tiene)',
    depDOB: 'Fecha de nacimiento',
    depSave: 'Agregar',
    depCancel: 'Cancelar',
    depAdd: '+ Agregar otra persona',
    depNone: 'No tengo dependientes, continuar',
    depComplete: 'Guardado',
    depRelChild: 'Hijo/a',
    depRelStepchild: 'Hijastro/a',
    depRelParent: 'Padre/Madre',
    depRelSibling: 'Hermano/a',
    depRelOther: 'Otro familiar',
    depSelect: '-- Escoja una opcion --',
    depRemove: 'Quitar',

    // Verify Info
    verifyTitle: 'Confirme su informacion',
    verifyDescription: 'Necesitamos confirmar sus datos para preparar sus impuestos',
    ssnLabel: 'Numero de Seguro Social',
    ssnPlaceholder: '123-45-6789',
    filingLabel: 'Como va a declarar?',
    filingSingle: 'Soltero/a',
    filingMarried: 'Casado/a (juntos)',
    filingMarriedSep: 'Casado/a (por separado)',
    filingHead: 'Jefe/a de familia',
    phoneLabel: 'Su telefono',
    addressLabel: 'Su direccion',
    cityLabel: 'Ciudad',
    stateLabel: 'Estado',
    zipLabel: 'Zip code',
    verifyBtn: 'Guardar mi informacion',
    verifyComplete: 'Informacion guardada',

    // Bank Info
    bankTitle: 'Donde quiere recibir su reembolso?',
    bankDescription: 'Si le toca dinero de vuelta, lo depositamos directo a su cuenta',
    bankNameLabel: 'Su banco',
    bankNamePlaceholder: 'Escriba el nombre de su banco...',
    accountTypeLabel: 'Tipo de cuenta',
    accountChecking: 'Checking (cheques)',
    accountSavings: 'Savings (ahorros)',
    routingLabel: 'Numero de ruta (9 numeros, esta en su cheque)',
    accountLabel: 'Numero de cuenta',
    confirmAccountLabel: 'Repita el numero de cuenta',
    holderLabel: 'Nombre en la cuenta',
    bankBtn: 'Guardar cuenta bancaria',
    bankComplete: 'Cuenta guardada',

    // General
    selectOption: '-- Escoja una opcion --',
    pending: 'Falta',
    complete: 'Listo',
    allDone: 'Excelente! Ya completo todo. Su preparador revisara su informacion.',
    helpTitle: 'Tiene preguntas?',
    helpText: 'Llame o escribale a su preparador, con gusto le ayudamos.',
    secure: 'Su informacion se envia de forma segura.',
    expires: 'Este enlace funciona hasta el',
    gpsRequired: 'Para firmar necesitamos saber su ubicacion. Cuando su telefono le pregunte, toque "Permitir".',
    gpsWaiting: 'Esperando que permita la ubicacion...',
    retryGps: 'Intentar de nuevo',
    accountMismatch: 'Los numeros de cuenta no son iguales',
    portalLocked: 'Su preparador ya termino sus impuestos. Si necesita cambiar algo, contactelo directamente.',
    portalLockedTitle: 'Portal cerrado',
    portalLockedUpload: 'Todavia puede subir documentos si su preparador se lo pide.',

    // Gatekeeping
    signFirst: 'Primero necesitamos su firma',
    signFirstSub: 'Despues de firmar podra completar los demas pasos',
    lockedSection: 'Firme arriba para continuar',
    signedBy: 'Firmado por',
    signedOn: 'Firmado el',
  },
  en: {
    portalTitle: 'Your Tax Portal',
    welcome: 'Welcome',
    appointmentDate: 'Appointment date',
    taxYear: 'Taxes for',
    progress: 'Progress',
    langToggle: 'Espanol',

    loading: 'Loading...',
    errorTitle: 'Something Went Wrong',
    errorExpired: 'This link no longer works. Please ask your preparer to send you a new one.',
    errorInvalid: 'This link is not valid. Please ask your preparer to send you a new one.',
    errorCancelled: 'This link was cancelled. Please contact your preparer.',

    uploadTitle: 'Upload your documents',
    uploadMessage: 'Upload all the papers you received from work, the bank, the government, anywhere. Take a photo or upload the file. We will organize them for you.',
    uploadZone: 'Tap here to take a photo or upload a file',
    uploadZoneSub: 'Photos or PDF files (max 25MB)',
    uploadDrag: 'Drop your file here',
    uploadedFiles: 'Documents you uploaded',
    uploadingText: 'Uploading...',
    processingText: 'Reviewing document...',
    uploadMore: '+ Upload more',
    uploadError: 'Could not upload, please try again',

    stepsTitle: 'Complete these steps',
    step: 'Step',

    signTitle: 'Sign to authorize your taxes',
    signDescription: 'I authorize Stephanie Solution LLC to prepare my federal and state tax returns. I understand that my taxes depend on the information I provide. I will review everything before it is sent.',
    agreeLabel: 'Yes, I agree',
    signatureLabel: 'Sign here',
    signHint: 'Use your finger or mouse to sign',
    clearBtn: 'Clear signature',
    nameLabel: 'Your full name',
    namePlaceholder: 'Type your name as it appears on your ID',
    dateLabel: 'Today\'s date',
    signBtn: 'Sign',
    signComplete: 'Signed successfully',

    pinTitle: 'Choose 5 secret numbers',
    pinDescription: 'These 5 numbers are your personal code so the IRS can accept your taxes. Pick numbers you can remember.',
    pinLabel: 'Type 5 numbers',
    pinPlaceholder: '12345',
    confirmPinLabel: 'Type the same 5 numbers again',
    confirmPinPlaceholder: 'Type again',
    pinMismatch: 'The numbers don\'t match, try again',
    pinInvalid: 'You need exactly 5 numbers',
    pinSignLabel: 'Your Signature',
    pinNameLabel: 'Your name',
    pinBtn: 'Save my numbers',
    pinComplete: 'Numbers saved',

    depTitle: 'People who depend on you',
    depDescription: 'Add your children or family members who live with you and you support. If you have none, tap the button below.',
    depFirstName: 'First Name',
    depLastName: 'Last Name',
    depRelationship: 'Who are they?',
    depSSN: 'Social Security (if you have it)',
    depDOB: 'Date of Birth',
    depSave: 'Add',
    depCancel: 'Cancel',
    depAdd: '+ Add another person',
    depNone: 'I have no dependents, continue',
    depComplete: 'Saved',
    depRelChild: 'Son/Daughter',
    depRelStepchild: 'Stepchild',
    depRelParent: 'Parent',
    depRelSibling: 'Brother/Sister',
    depRelOther: 'Other family',
    depSelect: '-- Choose one --',
    depRemove: 'Remove',

    verifyTitle: 'Confirm your information',
    verifyDescription: 'We need to confirm your details to prepare your taxes',
    ssnLabel: 'Social Security Number',
    ssnPlaceholder: '123-45-6789',
    filingLabel: 'How will you file?',
    filingSingle: 'Single',
    filingMarried: 'Married (filing together)',
    filingMarriedSep: 'Married (filing separately)',
    filingHead: 'Head of Household',
    phoneLabel: 'Your phone number',
    addressLabel: 'Your address',
    cityLabel: 'City',
    stateLabel: 'State',
    zipLabel: 'ZIP Code',
    verifyBtn: 'Save my information',
    verifyComplete: 'Information saved',

    bankTitle: 'Where do you want your refund?',
    bankDescription: 'If you get money back, we can deposit it directly to your bank account',
    bankNameLabel: 'Your bank',
    bankNamePlaceholder: 'Type your bank name...',
    accountTypeLabel: 'Account type',
    accountChecking: 'Checking',
    accountSavings: 'Savings',
    routingLabel: 'Routing number (9 digits, on your check)',
    accountLabel: 'Account number',
    confirmAccountLabel: 'Type account number again',
    holderLabel: 'Name on the account',
    bankBtn: 'Save bank account',
    bankComplete: 'Account saved',

    selectOption: '-- Choose one --',
    pending: 'Not done',
    complete: 'Done',
    allDone: 'Great job! You completed everything. Your preparer will review your information.',
    helpTitle: 'Have questions?',
    helpText: 'Call or text your preparer, we are happy to help.',
    secure: 'Your information is sent securely.',
    expires: 'This link works until',
    gpsRequired: 'To sign, we need your location. When your phone asks, tap "Allow".',
    gpsWaiting: 'Waiting for you to allow location...',
    retryGps: 'Try again',
    accountMismatch: 'The account numbers don\'t match',
    portalLocked: 'Your preparer already finished your taxes. If you need to change something, contact them directly.',
    portalLockedTitle: 'Portal closed',
    portalLockedUpload: 'You can still upload documents if your preparer asks you to.',

    // Gatekeeping
    signFirst: 'We need your signature first',
    signFirstSub: 'After signing you can complete the other steps',
    lockedSection: 'Sign above to continue',
    signedBy: 'Signed by',
    signedOn: 'Signed on',
  }
};

const PublicClientPortal: Component = () => {
  const params = useParams<{ id: string, accessToken: string }>();

  // Core state
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [portalData, setPortalData] = createSignal<any>(null);
  const [language, setLanguage] = createSignal<'es' | 'en'>('es');
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

  // Portal locked by admin
  const isPortalLocked = () => {
    const portal = portalData();
    return portal?.portalLocked === true || portal?.status === 'completed';
  };

  // Upload state - unified "upload anything" zone
  const [uploadedDocs, setUploadedDocs] = createSignal<UploadedDoc[]>([]);
  const [dragOver, setDragOver] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;

  // Signature state
  const [signAgreed, setSignAgreed] = createSignal(false);
  const [signName, setSignName] = createSignal('');
  const [signDate, setSignDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [signSubmitted, setSignSubmitted] = createSignal(false);
  let signCanvasRef: HTMLCanvasElement | null = null;
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [hasSignature, setHasSignature] = createSignal(false);
  let signStartTime: number | null = null;
  let signStrokeCount = 0;

  // PIN state
  const [pin, setPin] = createSignal('');
  const [confirmPin, setConfirmPin] = createSignal('');
  const [pinName, setPinName] = createSignal('');
  const [pinSubmitted, setPinSubmitted] = createSignal(false);
  const [pinError, setPinError] = createSignal<string | null>(null);
  let pinCanvasRef: HTMLCanvasElement | null = null;
  const [isPinDrawing, setIsPinDrawing] = createSignal(false);
  const [hasPinSignature, setHasPinSignature] = createSignal(false);
  let pinStartTime: number | null = null;
  let pinStrokeCount = 0;

  // Dependents state
  const [dependents, setDependents] = createSignal<DependentInfo[]>([]);
  const [depsSubmitted, setDepsSubmitted] = createSignal(false);
  const [showDepForm, setShowDepForm] = createSignal(false);
  const [currentDep, setCurrentDep] = createSignal<DependentInfo>({
    firstName: '', lastName: '', relationship: '', ssn: '', dateOfBirth: ''
  });

  // Verification state
  const [verifyInfo, setVerifyInfo] = createSignal<ClientVerificationInfo>({
    ssn: '', filingStatus: '', phone: '', address: '', city: '', state: '', zipCode: ''
  });
  const [verifySubmitted, setVerifySubmitted] = createSignal(false);

  // Bank state
  const [bankInfo, setBankInfo] = createSignal<BankInfo>({
    bankName: '', accountType: '', routingNumber: '', accountNumber: '',
    confirmAccountNumber: '', accountHolderName: ''
  });
  const [bankSubmitted, setBankSubmitted] = createSignal(false);
  const [bankSuggestions, setBankSuggestions] = createSignal<string[]>([]);
  const [showBankSuggestions, setShowBankSuggestions] = createSignal(false);

  // GPS & IP state
  const [gpsCoords, setGpsCoords] = createSignal<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsDenied, setGpsDenied] = createSignal(false);
  const [ipAddress, setIpAddress] = createSignal<string | null>(null);

  // Translation helper
  const t = (key: string) => translations[language()]?.[key] || translations['es']?.[key] || key;

  // Get friendly doc label
  const getFriendlyLabel = (docType: string) => {
    const labels = DOC_FRIENDLY_LABELS[language()] || DOC_FRIENDLY_LABELS['es'];
    return labels[docType] || labels['other'] || docType;
  };

  // GPS
  const requestGeolocation = () => {
    if (!navigator.geolocation) { setGpsDenied(true); return; }
    setGpsDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsDenied(false);
      },
      () => setGpsDenied(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  onMount(() => {
    requestGeolocation();
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => setIpAddress(d.ip))
      .catch(() => {});
  });

  // Metadata capture
  const captureMetadata = (canvas: HTMLCanvasElement | null, startTime: number | null, strokeCount: number) => {
    const gps = gpsCoords();
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/(\d+)/ },
      { name: 'Safari', regex: /Safari\/(\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+)/ },
      { name: 'Edge', regex: /Edg\/(\d+)/ },
    ];
    let browserName = 'Unknown', browserVersion = '0';
    for (const b of browsers) {
      const m = navigator.userAgent.match(b.regex);
      if (m) { browserName = b.name; browserVersion = m[1]; break; }
    }
    return {
      userAgent: navigator.userAgent,
      browserName, browserVersion,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      touchEnabled: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      ipAddress: ipAddress() || undefined,
      gpsLatitude: gps?.latitude,
      gpsLongitude: gps?.longitude,
      gpsAccuracy: gps?.accuracy,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      pageUrl: window.location.href,
      clientTimestamp: Date.now(),
      timezoneOffset: new Date().getTimezoneOffset(),
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      strokeCount,
      signatureDuration: startTime ? Date.now() - startTime : undefined
    };
  };

  // Canvas helpers
  const getCanvasCoords = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const initCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
  };

  // Sign canvas functions
  const startSignDraw = (e: MouseEvent | TouchEvent) => {
    if (!signCanvasRef) return;
    e.preventDefault();
    setIsDrawing(true);
    if (!signStartTime) signStartTime = Date.now();
    const ctx = signCanvasRef.getContext('2d');
    if (ctx) { const { x, y } = getCanvasCoords(e, signCanvasRef); ctx.beginPath(); ctx.moveTo(x, y); }
  };

  const signDraw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing() || !signCanvasRef) return;
    e.preventDefault();
    const ctx = signCanvasRef.getContext('2d');
    if (ctx) { const { x, y } = getCanvasCoords(e, signCanvasRef); ctx.lineTo(x, y); ctx.stroke(); setHasSignature(true); }
  };

  const stopSignDraw = () => { if (isDrawing()) signStrokeCount++; setIsDrawing(false); };

  const clearSign = () => {
    if (!signCanvasRef) return;
    const ctx = signCanvasRef.getContext('2d');
    if (ctx) { ctx.clearRect(0, 0, signCanvasRef.width, signCanvasRef.height); setHasSignature(false); signStartTime = null; signStrokeCount = 0; }
  };

  // PIN canvas functions
  const startPinDraw = (e: MouseEvent | TouchEvent) => {
    if (!pinCanvasRef) return;
    e.preventDefault();
    setIsPinDrawing(true);
    if (!pinStartTime) pinStartTime = Date.now();
    const ctx = pinCanvasRef.getContext('2d');
    if (ctx) { const { x, y } = getCanvasCoords(e, pinCanvasRef); ctx.beginPath(); ctx.moveTo(x, y); }
  };

  const pinDraw = (e: MouseEvent | TouchEvent) => {
    if (!isPinDrawing() || !pinCanvasRef) return;
    e.preventDefault();
    const ctx = pinCanvasRef.getContext('2d');
    if (ctx) { const { x, y } = getCanvasCoords(e, pinCanvasRef); ctx.lineTo(x, y); ctx.stroke(); setHasPinSignature(true); }
  };

  const stopPinDraw = () => { if (isPinDrawing()) pinStrokeCount++; setIsPinDrawing(false); };

  const clearPinSign = () => {
    if (!pinCanvasRef) return;
    const ctx = pinCanvasRef.getContext('2d');
    if (ctx) { ctx.clearRect(0, 0, pinCanvasRef.width, pinCanvasRef.height); setHasPinSignature(false); pinStartTime = null; pinStrokeCount = 0; }
  };

  // Check section completion from server data only
  const hasExistingSign = () => {
    const portal = portalData();
    if (portal?.steps) {
      return portal.steps.some((s: any) => s.type === 'sign_document' && s.status === 'completed');
    }
    return false;
  };
  const hasExistingPin = () => {
    const portal = portalData();
    if (portal?.steps) {
      return portal.steps.some((s: any) => s.type === 'enter_pin' && s.status === 'completed');
    }
    return false;
  };
  const hasExistingDeps = () => {
    const portal = portalData();
    if (portal?.steps) {
      const verifyStep = portal.steps.find((s: any) => s.type === 'verify_info');
      if (verifyStep?.fields) {
        const depField = verifyStep.fields.find((f: any) => f.key === 'dependents');
        if (depField?.value) return true;
      }
    }
    return false;
  };
  const hasExistingVerify = () => {
    const portal = portalData();
    if (portal?.steps) {
      const step = portal.steps.find((s: any) => s.type === 'verify_info');
      if (step?.status === 'completed') return true;
    }
    return false;
  };
  const hasExistingBank = () => {
    const portal = portalData();
    if (portal?.steps) {
      const verifyStep = portal.steps.find((s: any) => s.type === 'verify_info');
      if (verifyStep?.fields) {
        const bankField = verifyStep.fields.find((f: any) => f.key === 'accountNumber');
        if (bankField?.value) return true;
      }
    }
    return false;
  };

  // Gatekeeping: engagement must be signed before other sections unlock
  const isEngagementSigned = () => signSubmitted() || hasExistingSign();

  // Helper: get a step from server data by type
  const getStep = (type: string) => portalData()?.steps?.find((s: any) => s.type === type);
  const hasStep = (type: string) => !!getStep(type);

  // Section visibility: upload & sign always visible if step exists, rest unlocks after signing
  const showUploadSection = () => hasStep('upload_documents');
  const showSignSection = () => hasStep('sign_document');
  const showPinSection = () => hasStep('enter_pin') && isEngagementSigned();
  const showVerifySection = () => hasStep('verify_info') && isEngagementSigned();

  // Step title/description from server (fallback to translations)
  const stepTitle = (type: string) => getStep(type)?.title || '';
  const stepDescription = (type: string) => getStep(type)?.description || '';

  // Progress calculation based on actual steps from server
  const progressPercent = () => {
    const portal = portalData();
    if (!portal?.steps) return 0;
    const steps = portal.steps as any[];
    const total = steps.length;
    let done = 0;

    for (const step of steps) {
      if (step.status === 'completed') { done++; continue; }
      // Check local submitted state for current session
      if (step.type === 'sign_document' && signSubmitted()) { done++; continue; }
      if (step.type === 'enter_pin' && pinSubmitted()) { done++; continue; }
      if (step.type === 'verify_info' && (verifySubmitted() || depsSubmitted() || bankSubmitted())) { done++; continue; }
      if (step.type === 'upload_documents' && uploadedDocs().some(d => d.status === 'done')) { done++; continue; }
    }

    return Math.round((done / total) * 100);
  };

  // Load request - try new Client Portal API first, fallback to old API
  createEffect(async () => {
    const { accessToken, id } = params;
    if (!accessToken) { setError('invalid'); setIsLoading(false); return; }

    try {
      setIsLoading(true);

      // Try new Client Portal API first
      const portal = await getClientPortalPublic(id, accessToken);

      
      devLog('Portal loaded1:', portal);

      if (!portal) { setError('invalid'); setIsLoading(false); return; }
      if (portal.expired) { setError('expired'); setIsLoading(false); return; }
      if (portal.status === 'expired') { setError('expired'); setIsLoading(false); return; }
      if (portal.status === 'cancelled') { setError('cancelled'); setIsLoading(false); return; }

      setPortalData(portal);
      devLog('Portal loaded:', portal);

      // Check step completion and restore saved data from server
      if (portal.steps) {
        for (const step of portal.steps) {
          if (step.status === 'completed') {
            if (step.type === 'sign_document') { setSignSubmitted(true); }
            if (step.type === 'enter_pin') { setPinSubmitted(true); }
            if (step.type === 'upload_documents') { /* tracked via uploadedDocs */ }
          }

          // Restore verify_info field values from server
          if (step.type === 'verify_info' && step.fields) {
            const fieldValues: Record<string, string> = {};
            for (const f of step.fields) {
              if (f.value) fieldValues[f.key] = f.value;
            }
            if (Object.keys(fieldValues).length > 0) {
              setVerifyInfo(prev => ({
                ssn: fieldValues.ssn || prev.ssn,
                filingStatus: fieldValues.filingStatus || prev.filingStatus,
                phone: fieldValues.phone || prev.phone,
                address: fieldValues.address || prev.address,
                city: fieldValues.city || prev.city,
                state: fieldValues.state || prev.state,
                zipCode: fieldValues.zipCode || prev.zipCode,
              }));
            }
            if (step.status === 'completed') { setVerifySubmitted(true); }
          }
        }

        // Check uploaded files from upload_documents step
        const uploadStep = portal.steps.find((s: any) => s.type === 'upload_documents');
        const uploadedFiles = uploadStep?.uploadedFiles;
        if (uploadedFiles && uploadedFiles.length > 0) {
          const existing: UploadedDoc[] = uploadedFiles.map((f: any) => ({
            id: f.id || f.fileName,
            fileName: f.fileName,
            status: 'done' as const,
            progress: 100,
            classifiedAs: f.classifiedAs || 'other',
          }));
          setUploadedDocs(existing);
        }
      }

    } catch (err) {
      devLog('Error loading portal:', err);
      setError('invalid');
    } finally {
      setIsLoading(false);
    }
  });

  // File upload handler - "upload anything"
  const handleFiles = async (files: FileList | File[]) => {
    const portal = portalData();
    if (!portal) return;

    for (const file of Array.from(files)) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        continue; // silently skip invalid types
      }
      if (file.size > MAX_FILE_SIZE) continue;

      const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Add to list immediately
      setUploadedDocs(prev => [...prev, {
        id: docId, fileName: file.name, status: 'uploading', progress: 10
      }]);

      try {
        // Upload
        updateDoc(docId, { progress: 30 });
        const uploadResult = await uploadTaxDocument(
          file,
          portal.customFields?.taxPortalId || portal.recipientId || portal.id,
          portal.customFields?.taxYear || new Date().getFullYear().toString(),
          { documentType: 'other', businessId: portal.businessId }
        );

        if (!uploadResult.success || !uploadResult.documentId) {
          throw new Error(uploadResult.error || 'Upload failed');
        }

        // Process with AI
        updateDoc(docId, { status: 'processing', progress: 60, id: uploadResult.documentId });

        const processResult = await processTaxDocument(uploadResult.documentId, portal.businessId);
        let classifiedAs = 'other';
        if (processResult.success && processResult.document?.documentType) {
          classifiedAs = processResult.document.documentType;
        }

        // Mark uploaded
        updateDoc(docId, { progress: 90 });
        await markDocumentUploaded(
          portal.id,
          portal.businessId,
          classifiedAs as any,
          uploadResult.documentId
        );

        updateDoc(docId, { status: 'done', progress: 100, classifiedAs });

      } catch (err) {
        devLog('Upload error:', err);
        updateDoc(docId, { status: 'error', progress: 0, errorMessage: (err as Error).message });
      }
    }
  };

  const updateDoc = (id: string, updates: Partial<UploadedDoc>) => {
    setUploadedDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  // Helper: find step ID by type from portal steps
  const getStepId = (type: string): string | null => {
    const portal = portalData();
    if (!portal?.steps) {
      devLog(`[getStepId] No steps in portalData for type "${type}". Portal keys:`, portal ? Object.keys(portal) : 'null');
      return null;
    }
    const step = portal.steps.find((s: any) => s.type === type);
    if (!step?.id) {
      devLog(`[getStepId] Step "${type}" not found. Available steps:`, portal.steps.map((s: any) => `${s.type}:${s.id}`));
    }
    return step?.id || null;
  };

  // Submit handlers — use submitPortalStep with stepId (API: POST step/:stepId)
  const handleSubmitSign = async () => {
    if (!signAgreed() || !hasSignature() || !signName()) return;
    if (!gpsCoords() || gpsDenied()) { alert(t('gpsRequired')); return; }

    const portal = portalData();
    if (!portal) return;

    const signatureImage = signCanvasRef?.toDataURL('image/png') || '';
    const metadata = captureMetadata(signCanvasRef, signStartTime, signStrokeCount);

    try {
      const stepId = getStepId('sign_document');
      const result = stepId
        ? await submitPortalStep(params.id, params.accessToken, stepId, { signatureData: signatureImage, signerName: signName() }, true)
        : await updateClientPortalRequest(params.id, params.accessToken, { section: 'sign_document', signatureData: signatureImage, signerName: signName(), metadata }, portalData()?.businessId);
      if (result?.success) {
        setSignSubmitted(true);

        showSuccess(t('signComplete'));
      }
    } catch (err) {
      devLog('Sign error:', err);
    }
  };

  const handleSubmitPin = async () => {
    const portal = portalData();
    if (!portal) return;

    if (pin().length !== 5) { setPinError(t('pinInvalid')); return; }
    if (pin() !== confirmPin()) { setPinError(t('pinMismatch')); return; }

    try {
      const stepId = getStepId('enter_pin');
      const result = stepId
        ? await submitPortalStep(params.id, params.accessToken, stepId, { pin: pin(), signerName: signName() || '' })
        : await updateClientPortalRequest(params.id, params.accessToken, { section: 'enter_pin', pin: pin(), signerName: signName() || '' }, portalData()?.businessId);
      if (result?.success) {
        setPinSubmitted(true);
        showSuccess(t('pinComplete'));
        setPinError(null);
      } else if (result?.error) {
        setPinError(result.error);
      }
    } catch (err) {
      devLog('PIN save error:', err);
      setPinError(language() === 'es' ? 'Error al guardar el PIN' : 'Error saving PIN');
    }
  };

  const handleSubmitDeps = async () => {
    const portal = portalData();
    if (!portal) return;

    try {
      const stepId = getStepId('verify_info');
      const result = stepId
        ? await submitPortalStep(params.id, params.accessToken, stepId, { fields: { dependents: JSON.stringify(dependents()) } }, false)
        : await updateClientPortalRequest(params.id, params.accessToken, { section: 'dependents', dependents: dependents() }, portalData()?.businessId);
      if (result?.success) {
        setDepsSubmitted(true);

        showSuccess(t('depComplete'));
      }
    } catch (err) {
      devLog('Dependents error:', err);
    }
  };

  const handleAddDep = () => {
    const dep = currentDep();
    if (!dep.firstName || !dep.lastName || !dep.relationship) return;
    setDependents(prev => [...prev, { ...dep }]);
    setCurrentDep({ firstName: '', lastName: '', relationship: '', ssn: '', dateOfBirth: '' });
    setShowDepForm(false);
  };

  const handleSubmitVerify = async () => {
    const info = verifyInfo();
    if (!info.ssn || !info.filingStatus) {
      alert(language() === 'es' ? 'Complete el SSN y estado civil' : 'Complete SSN and filing status');
      return;
    }

    const portal = portalData();
    if (!portal) return;

    try {
      const stepId = getStepId('verify_info');
      const fields = {
        ssn: info.ssn,
        filingStatus: info.filingStatus,
        phone: info.phone,
        address: info.address,
        city: info.city,
        state: info.state,
        zipCode: info.zipCode,
      };
      const result = stepId
        ? await submitPortalStep(params.id, params.accessToken, stepId, { fields }, true)
        : await updateClientPortalRequest(params.id, params.accessToken, { section: 'verify_info', ...fields }, portalData()?.businessId);
      if (result?.success) {
        setVerifySubmitted(true);

        showSuccess(t('verifyComplete'));
      } else if (result?.error === 'Required fields missing') {
        alert(language() === 'es' ? 'Faltan campos requeridos' : 'Required fields missing');
      }
    } catch (err) {
      devLog('Verify error:', err);
    }
  };

  const handleSubmitBank = async () => {
    const info = bankInfo();
    if (!info.accountType || !info.routingNumber || !info.accountNumber) {
      alert(language() === 'es' ? 'Complete todos los campos bancarios' : 'Complete all bank fields');
      return;
    }
    if (info.accountNumber !== info.confirmAccountNumber) {
      alert(t('accountMismatch'));
      return;
    }

    const portal = portalData();
    if (!portal) return;

    try {
      const stepId = getStepId('verify_info');
      const fields = {
        bankName: info.bankName || '',
        accountType: info.accountType,
        routingNumber: info.routingNumber,
        accountNumber: info.accountNumber,
        accountHolderName: info.accountHolderName,
      };
      const result = stepId
        ? await submitPortalStep(params.id, params.accessToken, stepId, { fields }, false)
        : await updateClientPortalRequest(params.id, params.accessToken, { section: 'bank_info', ...fields }, portalData()?.businessId);
      if (result?.success) {
        setBankSubmitted(true);

        showSuccess(t('bankComplete'));
      }
    } catch (err) {
      devLog('Bank error:', err);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Bank autocomplete
  const updateBankName = (value: string) => {
    setBankInfo(prev => ({ ...prev, bankName: value }));
    if (value.length >= 1) {
      const filtered = US_BANKS.filter(b => b.toLowerCase().includes(value.toLowerCase())).slice(0, 6);
      setBankSuggestions(filtered);
      setShowBankSuggestions(filtered.length > 0);
    } else {
      setBankSuggestions([]);
      setShowBankSuggestions(false);
    }
  };

  // ==================== STYLES ====================
  const pageStyle = {
    'min-height': '100vh',
    background: 'linear-gradient(180deg, #eef6ff 0%, #f8fafb 50%, #ffffff 100%)',
    padding: '0',
    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    '-webkit-font-smoothing': 'antialiased' as const
  };

  const containerStyle = {
    'max-width': '540px',
    margin: '0 auto',
    padding: '1rem 1rem 2rem'
  };

  const langBtnStyle = {
    position: 'fixed' as const,
    top: '0.75rem',
    right: '0.75rem',
    padding: '0.4rem 0.75rem',
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid #ddd',
    'border-radius': '20px',
    cursor: 'pointer',
    'font-size': '0.8rem',
    color: '#555',
    'z-index': '100',
    'backdrop-filter': 'blur(8px)'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    padding: '1.5rem 0 1rem'
  };

  const progressBoxStyle = {
    background: 'white',
    'border-radius': '16px',
    padding: '1.25rem',
    'margin-bottom': '1.5rem',
    'box-shadow': '0 1px 4px rgba(0,0,0,0.06)'
  };

  const progressBarBg = {
    height: '10px',
    background: '#e8ecf0',
    'border-radius': '5px',
    overflow: 'hidden',
    'margin-bottom': '0.5rem'
  };

  const progressBarFill = (pct: number) => ({
    height: '100%',
    width: `${pct}%`,
    background: pct === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
    'border-radius': '5px',
    transition: 'width 0.4s ease'
  });

  const sectionStyle = {
    background: 'white',
    'border-radius': '16px',
    'margin-bottom': '1rem',
    'box-shadow': '0 1px 4px rgba(0,0,0,0.06)'
  };

  const sectionHeaderStyle = (completed: boolean) => ({
    padding: '1.25rem 1.25rem 0.75rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'border-bottom': completed ? 'none' : '1px solid #f1f3f5'
  });

  const sectionTitleStyle = {
    'font-size': '1.1rem',
    'font-weight': '600',
    color: '#1e293b'
  };

  const badgeStyle = (done: boolean) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '20px',
    'font-size': '0.8rem',
    'font-weight': '600',
    background: done ? '#dcfce7' : '#f1f5f9',
    color: done ? '#16a34a' : '#94a3b8'
  });

  const sectionBodyStyle = { padding: '1rem 1.25rem 1.25rem' };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    'border-radius': '10px',
    border: '1.5px solid #e2e8f0',
    'font-size': '1rem',
    background: '#fafbfc',
    'box-sizing': 'border-box' as const,
    'margin-bottom': '0.65rem',
    transition: 'border-color 0.2s',
    outline: 'none'
  };

  const selectStyle = {
    ...inputStyle,
    appearance: 'none' as const,
    'background-image': 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
    'background-position': 'right 0.75rem center',
    'background-repeat': 'no-repeat',
    'background-size': '1.25rem',
    'padding-right': '2.5rem'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.85rem',
    'font-weight': '500',
    color: '#475569',
    'margin-bottom': '0.3rem'
  };

  const btnPrimaryStyle = {
    width: '100%',
    padding: '1rem',
    'border-radius': '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    'font-size': '1.05rem',
    'font-weight': '600',
    cursor: 'pointer',
    'margin-top': '0.5rem',
    transition: 'opacity 0.2s'
  };

  const btnSecondaryStyle = {
    padding: '0.75rem 1.25rem',
    'border-radius': '10px',
    border: '1.5px solid #e2e8f0',
    background: 'white',
    color: '#475569',
    'font-size': '0.95rem',
    'font-weight': '500',
    cursor: 'pointer'
  };

  const completedMsgStyle = {
    'text-align': 'center' as const,
    padding: '1.25rem',
    color: '#16a34a',
    'font-weight': '600',
    'font-size': '1rem'
  };

  const twoCol = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '0.65rem'
  };

  const canvasContainerStyle = (hasSig: boolean) => ({
    position: 'relative' as const,
    border: hasSig ? '2px solid #22c55e' : '2px dashed #cbd5e1',
    'border-radius': '10px',
    background: '#fff',
    overflow: 'hidden',
    'margin-bottom': '0.5rem'
  });

  const canvasStyle = {
    width: '100%',
    height: '140px',
    cursor: 'crosshair',
    'touch-action': 'none' as const
  };

  const sigLineStyle = {
    position: 'absolute' as const, bottom: '28px', left: '20px', right: '20px',
    height: '1px', background: '#94a3b8', 'pointer-events': 'none' as const
  };

  const dropZoneStyle = (isDrag: boolean) => ({
    display: 'block' as const,
    border: `2.5px dashed ${isDrag ? '#3b82f6' : '#c7d2e0'}`,
    'border-radius': '14px',
    padding: '2rem 1rem',
    'text-align': 'center' as const,
    background: isDrag ? '#eff6ff' : '#f9fafb',
    cursor: 'pointer',
    transition: 'all 0.2s',
    'box-sizing': 'border-box' as const,
    width: '100%'
  });

  // ==================== RENDER ====================

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        input[type="file"] { display: none; }
        input:focus, select:focus { border-color: #3b82f6 !important; }
      `}</style>

      {/* Language toggle */}
      <button style={langBtnStyle} onClick={() => setLanguage(language() === 'es' ? 'en' : 'es')}>
        {t('langToggle')}
      </button>

      <div style={containerStyle}>
        {/* Loading */}
        <Show when={isLoading()}>
          <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', 'min-height': '60vh', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', border: '3px solid #e2e8f0', 'border-top-color': '#3b82f6', 'border-radius': '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#64748b', 'font-size': '1rem' }}>{t('loading')}</p>
          </div>
        </Show>

        {/* Error */}
        <Show when={!isLoading() && error()}>
          <div style={{ background: 'white', 'border-radius': '16px', padding: '3rem 2rem', 'text-align': 'center', 'box-shadow': '0 4px 12px rgba(0,0,0,0.08)', 'margin-top': '3rem' }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>!</div>
            <h2 style={{ color: '#dc2626', 'margin-bottom': '0.75rem', 'font-size': '1.3rem' }}>{t('errorTitle')}</h2>
            <p style={{ color: '#64748b', 'font-size': '1rem', 'line-height': '1.5' }}>
              {error() === 'expired' ? t('errorExpired') : error() === 'cancelled' ? t('errorCancelled') : t('errorInvalid')}
            </p>
          </div>
        </Show>

        {/* Main Content */}
        <Show when={!isLoading() && !error() && portalData()}>
          {/* Success toast */}
          <Show when={successMessage()}>
            <div style={{
              position: 'fixed' as const, top: '1rem', left: '50%', transform: 'translateX(-50%)',
              background: '#16a34a', color: 'white', padding: '0.75rem 1.5rem', 'border-radius': '12px',
              'font-weight': '600', 'box-shadow': '0 4px 12px rgba(0,0,0,0.15)', 'z-index': '200',
              animation: 'fadeIn 0.3s ease'
            }}>
              {successMessage()}
            </div>
          </Show>

          {/* Header */}
          <div style={headerStyle}>
            <div style={{ 'font-size': '1.6rem', 'font-weight': '700', color: '#1e293b', 'margin-bottom': '0.25rem' }}>
              {t('welcome')}, {portalData()?.recipientName?.split(' ')[0] || portalData()?.recipientName}
            </div>
            <div style={{ color: '#64748b', 'font-size': '0.9rem' }}>
              {t('taxYear')}: {portalData()?.customFields?.taxYear || new Date().getFullYear()}
            </div>
          </div>

          {/* Progress */}
          <div style={progressBoxStyle}>
            <div style={progressBarBg}>
              <div style={progressBarFill(progressPercent())} />
            </div>
            <div style={{ 'text-align': 'center', color: '#64748b', 'font-size': '0.9rem' }}>
              {progressPercent()}% {t('complete').toLowerCase()}
            </div>
          </div>

          {/* All complete */}
          <Show when={progressPercent() === 100 && !isPortalLocked()}>
            <div style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)', 'border-radius': '16px',
              padding: '1.5rem', 'text-align': 'center', color: 'white', 'margin-bottom': '1rem'
            }}>
              <div style={{ 'font-size': '1.1rem', 'font-weight': '600' }}>{t('allDone')}</div>
            </div>
          </Show>

          {/* Portal locked by admin */}
          <Show when={isPortalLocked()}>
            <div style={{
              background: '#fef3c7', border: '1.5px solid #fcd34d', 'border-radius': '16px',
              padding: '1.25rem', 'margin-bottom': '1rem'
            }}>
              <div style={{ 'font-weight': '700', color: '#92400e', 'margin-bottom': '0.4rem', 'font-size': '1.05rem' }}>
                {t('portalLockedTitle')}
              </div>
              <div style={{ color: '#a16207', 'font-size': '0.9rem', 'line-height': '1.5' }}>
                {t('portalLocked')}
              </div>
              <div style={{ color: '#a16207', 'font-size': '0.85rem', 'margin-top': '0.5rem', 'font-style': 'italic' }}>
                {t('portalLockedUpload')}
              </div>
            </div>
          </Show>

          {/* ===== UPLOAD DOCUMENTS (always available) ===== */}
          <Show when={showUploadSection()}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle(false)}>
                <div style={sectionTitleStyle}>{stepTitle('upload_documents') || t('uploadTitle')}</div>
              </div>
              <div style={sectionBodyStyle}>
                <p style={{ color: '#64748b', 'font-size': '0.9rem', 'line-height': '1.5', 'margin-bottom': '1rem' }}>
                  {stepDescription('upload_documents') || t('uploadMessage')}
                </p>

                {/* Upload zone */}
                <label
                  style={dropZoneStyle(dragOver())}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    multiple
                    onChange={(e) => { if (e.currentTarget.files) handleFiles(e.currentTarget.files); e.currentTarget.value = ''; }}
                  />
                  <div style={{ 'font-size': '2.5rem', 'margin-bottom': '0.25rem', opacity: '0.5' }}>+</div>
                  <div style={{ 'font-weight': '600', color: '#1e293b', 'font-size': '1rem' }}>
                    {dragOver() ? t('uploadDrag') : t('uploadZone')}
                  </div>
                  <div style={{ color: '#94a3b8', 'font-size': '0.8rem', 'margin-top': '0.25rem' }}>
                    {t('uploadZoneSub')}
                  </div>
                </label>

                {/* Uploaded files list */}
                <Show when={uploadedDocs().length > 0}>
                  <div style={{ 'margin-top': '1rem' }}>
                    <div style={{ 'font-size': '0.85rem', 'font-weight': '600', color: '#475569', 'margin-bottom': '0.5rem' }}>
                      {t('uploadedFiles')} ({uploadedDocs().length})
                    </div>
                    <For each={uploadedDocs()}>
                      {(doc) => (
                        <div style={{
                          display: 'flex', 'align-items': 'center', gap: '0.75rem',
                          padding: '0.75rem', background: doc.status === 'error' ? '#fef2f2' : doc.status === 'done' ? '#f0fdf4' : '#f8fafc',
                          'border-radius': '10px', 'margin-bottom': '0.5rem',
                          border: `1px solid ${doc.status === 'error' ? '#fecaca' : doc.status === 'done' ? '#bbf7d0' : '#e2e8f0'}`
                        }}>
                          <div style={{
                            width: '28px', height: '28px', 'border-radius': '50%', display: 'flex',
                            'align-items': 'center', 'justify-content': 'center', 'flex-shrink': '0',
                            background: doc.status === 'done' ? '#22c55e' : doc.status === 'error' ? '#ef4444' : '#3b82f6',
                            color: 'white', 'font-size': '0.7rem', 'font-weight': 'bold'
                          }}>
                            {doc.status === 'done' ? 'OK' : doc.status === 'error' ? '!' :
                              <div style={{ width: '14px', height: '14px', border: '2px solid white', 'border-top-color': 'transparent', 'border-radius': '50%', animation: 'spin 0.8s linear infinite' }} />
                            }
                          </div>
                          <div style={{ flex: '1', 'min-width': '0' }}>
                            <div style={{ 'font-size': '0.9rem', 'font-weight': '500', color: '#1e293b', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                              {doc.fileName}
                            </div>
                            <div style={{ 'font-size': '0.8rem', color: '#64748b' }}>
                              {doc.status === 'uploading' ? t('uploadingText') :
                               doc.status === 'processing' ? t('processingText') :
                               doc.status === 'error' ? t('uploadError') :
                               doc.classifiedAs ? getFriendlyLabel(doc.classifiedAs) : ''}
                            </div>
                          </div>
                          <Show when={doc.status === 'uploading' || doc.status === 'processing'}>
                            <div style={{ width: '40px', 'text-align': 'right', 'font-size': '0.8rem', color: '#3b82f6', 'font-weight': '600' }}>
                              {doc.progress}%
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          {/* ===== SIGN ENGAGEMENT LETTER (gate for PIN, verify, deps, bank) ===== */}
          <Show when={showSignSection()}>
            {/* Not yet signed — prominent display */}
            <Show when={!isEngagementSigned() && !isPortalLocked()}>
              <div style={{
                ...sectionStyle,
                border: '2px solid #3b82f6',
                'box-shadow': '0 2px 12px rgba(59,130,246,0.12)'
              }}>
                <div style={{ padding: '1.25rem 1.25rem 0.75rem', 'border-bottom': '1px solid #f1f3f5' }}>
                  <div style={{ ...sectionTitleStyle, 'font-size': '1.2rem' }}>{stepTitle('sign_document') || t('signTitle')}</div>
                  <div style={{ color: '#3b82f6', 'font-size': '0.85rem', 'margin-top': '0.25rem', 'font-weight': '500' }}>
                    {t('signFirst')}
                  </div>
                </div>
                <div style={sectionBodyStyle}>
                  {/* Engagement text */}
                  <div style={{
                    padding: '1rem', background: '#f8fafb', 'border-radius': '10px',
                    border: '1px solid #e8ecf0', 'font-size': '0.88rem', 'line-height': '1.6',
                    color: '#475569', 'margin-bottom': '1rem', 'max-height': '180px', 'overflow-y': 'auto'
                  }}>
                    {t('signDescription')}
                  </div>

                  {/* Agree checkbox */}
                  <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem', 'margin-bottom': '1rem' }}>
                    <input
                      type="checkbox"
                      checked={signAgreed()}
                      onChange={(e) => setSignAgreed(e.currentTarget.checked)}
                      style={{ width: '22px', height: '22px', 'margin-top': '1px', cursor: 'pointer', 'flex-shrink': '0' }}
                    />
                    <label style={{ 'font-size': '0.9rem', color: '#1e293b', cursor: 'pointer' }}
                      onClick={() => setSignAgreed(!signAgreed())}>
                      {t('agreeLabel')} *
                    </label>
                  </div>

                  {/* Signature canvas */}
                  <div>
                    <label style={labelStyle}>{t('signatureLabel')} *</label>
                    <div style={canvasContainerStyle(hasSignature())}>
                      <canvas
                        ref={(el) => { signCanvasRef = el; initCanvas(el); }}
                        width={500} height={150}
                        style={canvasStyle}
                        onMouseDown={startSignDraw} onMouseMove={signDraw} onMouseUp={stopSignDraw} onMouseLeave={stopSignDraw}
                        onTouchStart={startSignDraw} onTouchMove={signDraw} onTouchEnd={stopSignDraw}
                      />
                      <div style={sigLineStyle} />
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.75rem' }}>
                      <span style={{ 'font-size': '0.78rem', color: '#94a3b8' }}>{t('signHint')}</span>
                      <button type="button" onClick={clearSign} style={{ ...btnSecondaryStyle, padding: '0.3rem 0.65rem', 'font-size': '0.78rem' }}>
                        {t('clearBtn')}
                      </button>
                    </div>
                  </div>

                  {/* Name + Date */}
                  <div>
                    <label style={labelStyle}>{t('nameLabel')} *</label>
                    <input type="text" style={inputStyle} placeholder={t('namePlaceholder')}
                      value={signName()} onInput={(e) => setSignName(e.currentTarget.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('dateLabel')}</label>
                    <input type="date" style={inputStyle} value={signDate()}
                      onInput={(e) => setSignDate(e.currentTarget.value)} />
                  </div>

                  {/* GPS warnings */}
                  <Show when={gpsDenied()}>
                    <div style={{ color: '#dc2626', 'font-size': '0.85rem', padding: '0.75rem', background: '#fef2f2', 'border-radius': '8px', border: '1px solid #fecaca', 'margin-bottom': '0.5rem', display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                      <span style={{ flex: '1' }}>{t('gpsRequired')}</span>
                      <button type="button" onClick={requestGeolocation} style={{ padding: '0.3rem 0.6rem', border: '1px solid #fca5a5', 'border-radius': '6px', background: 'white', color: '#dc2626', 'font-size': '0.8rem', 'font-weight': '600', cursor: 'pointer' }}>
                        {t('retryGps')}
                      </button>
                    </div>
                  </Show>
                  <Show when={!gpsDenied() && !gpsCoords()}>
                    <div style={{ color: '#d97706', 'font-size': '0.85rem', padding: '0.75rem', background: '#fffbeb', 'border-radius': '8px', border: '1px solid #fde68a', 'margin-bottom': '0.5rem' }}>
                      {t('gpsWaiting')}
                    </div>
                  </Show>

                  <button
                    style={{ ...btnPrimaryStyle, opacity: (!signAgreed() || !hasSignature() || !signName() || !gpsCoords() || gpsDenied()) ? 0.5 : 1 }}
                    disabled={!signAgreed() || !hasSignature() || !signName() || !gpsCoords() || gpsDenied()}
                    onClick={handleSubmitSign}
                  >
                    {t('signBtn')}
                  </button>
                </div>
              </div>

              {/* Locked sections preview — dynamic from server steps */}
              <div style={{ 'margin-top': '1rem', 'margin-bottom': '1rem' }}>
                <div style={{ 'font-size': '0.85rem', color: '#94a3b8', 'text-align': 'center', 'margin-bottom': '0.75rem' }}>
                  {t('signFirstSub')}
                </div>
                <For each={(portalData()?.steps || []).filter((s: any) => s.type !== 'upload_documents' && s.type !== 'sign_document')}>
                  {(step: any) => (
                    <div style={{
                      ...sectionStyle,
                      opacity: 0.5,
                      'pointer-events': 'none' as const,
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.75rem',
                      padding: '1rem 1.25rem'
                    }}>
                      <div style={{
                        width: '32px', height: '32px', 'border-radius': '8px',
                        background: '#f1f5f9', display: 'flex', 'align-items': 'center',
                        'justify-content': 'center', color: '#94a3b8', 'font-size': '1rem',
                        'flex-shrink': '0'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <div style={{ flex: '1' }}>
                        <div style={{ 'font-weight': '500', color: '#94a3b8', 'font-size': '0.95rem' }}>{step.title || step.type}</div>
                        <div style={{ 'font-size': '0.78rem', color: '#cbd5e1' }}>{t('lockedSection')}</div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* Already signed — collapsed with green checkmark */}
            <Show when={isEngagementSigned() && !isPortalLocked()}>
              <div style={{ ...sectionStyle, border: '1.5px solid #bbf7d0' }}>
                <div style={{
                  padding: '1rem 1.25rem',
                  display: 'flex', 'align-items': 'center', gap: '0.75rem'
                }}>
                  <div style={{
                    width: '32px', height: '32px', 'border-radius': '50%',
                    background: '#22c55e', display: 'flex', 'align-items': 'center',
                    'justify-content': 'center', color: 'white', 'font-weight': 'bold',
                    'font-size': '0.85rem', 'flex-shrink': '0'
                  }}>
                    OK
                  </div>
                  <div style={{ flex: '1' }}>
                    <div style={{ 'font-weight': '600', color: '#16a34a', 'font-size': '1rem' }}>
                      {t('signComplete')}
                    </div>
                    <div style={{ 'font-size': '0.8rem', color: '#64748b' }}>
                      {t('signedOn')}: {signDate() || new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* Portal locked */}
            <Show when={isPortalLocked()}>
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle(true)}>
                  <div style={sectionTitleStyle}>{t('signTitle')}</div>
                  <div style={badgeStyle(true)}>{t('portalLockedTitle')}</div>
                </div>
                <div style={completedMsgStyle}>{t('portalLockedTitle')}</div>
              </div>
            </Show>
          </Show>

          {/* ===== ADDITIONAL STEPS (only after signing) ===== */}
          <Show when={isEngagementSigned() && (showPinSection() || showVerifySection())}>
            <div style={{ 'font-size': '1.1rem', 'font-weight': '600', color: '#1e293b', padding: '0.75rem 0 0.5rem' }}>
              {t('stepsTitle')}
            </div>
          </Show>

          {/* Step 2: PIN */}
          <Show when={showPinSection()}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle(pinSubmitted() || hasExistingPin() || isPortalLocked())}>
                <div style={sectionTitleStyle}>{stepTitle('enter_pin') || t('pinTitle')}</div>
                <div style={badgeStyle(pinSubmitted() || hasExistingPin() || isPortalLocked())}>
                  {pinSubmitted() || hasExistingPin() ? t('complete') : isPortalLocked() ? t('portalLockedTitle') : t('pending')}
                </div>
              </div>

              <Show when={!pinSubmitted() && !hasExistingPin() && !isPortalLocked()}>
                <div style={sectionBodyStyle}>
                  {/* E-filing PIN — client chooses their own 5-digit PIN for IRS e-filing */}
                  <p style={{ color: '#64748b', 'font-size': '0.9rem', 'line-height': '1.5', 'margin-bottom': '1rem' }}>
                    {stepDescription('enter_pin') || t('pinDescription')}
                  </p>

                  <div style={{ 'max-width': '280px', margin: '0 auto 1rem' }}>
                    <label style={labelStyle}>{t('pinLabel')} *</label>
                    <input
                      type="text" inputMode="numeric" maxLength={5}
                      style={{ ...inputStyle, 'font-size': '1.8rem', 'text-align': 'center', 'letter-spacing': '0.6rem', 'font-weight': 'bold' }}
                      placeholder={t('pinPlaceholder')}
                      value={pin()}
                      onInput={(e) => { setPin(e.currentTarget.value.replace(/\D/g, '').slice(0, 5)); setPinError(null); }}
                    />

                    <label style={{ ...labelStyle, 'margin-top': '0.5rem' }}>{t('confirmPinLabel')} *</label>
                    <input
                      type="text" inputMode="numeric" maxLength={5}
                      style={{ ...inputStyle, 'font-size': '1.8rem', 'text-align': 'center', 'letter-spacing': '0.6rem', 'font-weight': 'bold' }}
                      placeholder={t('confirmPinPlaceholder')}
                      value={confirmPin()}
                      onInput={(e) => { setConfirmPin(e.currentTarget.value.replace(/\D/g, '').slice(0, 5)); setPinError(null); }}
                    />
                  </div>

                  <button
                    style={{ ...btnPrimaryStyle, opacity: (pin().length !== 5 || pin() !== confirmPin()) ? 0.5 : 1 }}
                    disabled={pin().length !== 5 || pin() !== confirmPin()}
                    onClick={handleSubmitPin}
                  >
                    {t('pinBtn')}
                  </button>

                  {/* Validation errors */}
                  <Show when={pin().length > 0 && pin().length !== 5}>
                    <div style={{ padding: '0.6rem', background: '#fef2f2', border: '1px solid #fecaca', 'border-radius': '8px', color: '#dc2626', 'font-size': '0.85rem', 'margin-top': '0.5rem' }}>
                      {t('pinInvalid')}
                    </div>
                  </Show>
                  <Show when={confirmPin().length === 5 && pin() !== confirmPin()}>
                    <div style={{ padding: '0.6rem', background: '#fef2f2', border: '1px solid #fecaca', 'border-radius': '8px', color: '#dc2626', 'font-size': '0.85rem', 'margin-top': '0.5rem' }}>
                      {t('pinMismatch')}
                    </div>
                  </Show>
                  <Show when={pinError()}>
                    <div style={{ padding: '0.6rem', background: '#fef2f2', border: '1px solid #fecaca', 'border-radius': '8px', color: '#dc2626', 'font-size': '0.85rem', 'margin-top': '0.5rem' }}>
                      {pinError()}
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={pinSubmitted() || hasExistingPin() || isPortalLocked()}>
                <div style={completedMsgStyle}>
                  {pinSubmitted() || hasExistingPin() ? t('pinComplete') : t('portalLockedTitle')}
                </div>
              </Show>
            </div>
          </Show>

          {/* Step 3: Dependents (sub-section of verify_info) */}
          <Show when={showVerifySection()}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle(depsSubmitted() || hasExistingDeps() || isPortalLocked())}>
                <div style={sectionTitleStyle}>{t('depTitle')}</div>
                <div style={badgeStyle(depsSubmitted() || hasExistingDeps() || isPortalLocked())}>
                  {depsSubmitted() || hasExistingDeps() ? t('complete') : isPortalLocked() ? t('portalLockedTitle') : t('pending')}
                </div>
              </div>

              <Show when={!depsSubmitted() && !hasExistingDeps() && !isPortalLocked()}>
                <div style={sectionBodyStyle}>
                  <p style={{ color: '#64748b', 'font-size': '0.9rem', 'line-height': '1.5', 'margin-bottom': '1rem' }}>
                    {t('depDescription')}
                  </p>

                  {/* Added dependents list */}
                  <Show when={dependents().length > 0}>
                    <div style={{ 'margin-bottom': '0.75rem' }}>
                      <For each={dependents()}>
                        {(dep, i) => (
                          <div style={{
                            display: 'flex', 'justify-content': 'space-between', 'align-items': 'center',
                            padding: '0.75rem', background: '#f0fdf4', 'border-radius': '10px', 'margin-bottom': '0.4rem',
                            border: '1px solid #bbf7d0'
                          }}>
                            <div>
                              <div style={{ 'font-weight': '500', color: '#1e293b' }}>{dep.firstName} {dep.lastName}</div>
                              <div style={{ 'font-size': '0.8rem', color: '#64748b' }}>{dep.relationship} {dep.dateOfBirth ? `- ${dep.dateOfBirth}` : ''}</div>
                            </div>
                            <button
                              style={{ ...btnSecondaryStyle, padding: '0.3rem 0.65rem', 'font-size': '0.78rem', color: '#dc2626', 'border-color': '#fecaca' }}
                              onClick={() => setDependents(prev => prev.filter((_, idx) => idx !== i()))}
                            >
                              {t('depRemove')}
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  {/* Add dependent form */}
                  <Show when={showDepForm()}>
                    <div style={{ padding: '1rem', background: '#f8fafb', 'border-radius': '10px', 'margin-bottom': '0.75rem', border: '1px solid #e8ecf0' }}>
                      <div style={twoCol}>
                        <div>
                          <label style={labelStyle}>{t('depFirstName')} *</label>
                          <input type="text" style={inputStyle} value={currentDep().firstName}
                            onInput={(e) => setCurrentDep(p => ({ ...p, firstName: e.currentTarget.value }))} />
                        </div>
                        <div>
                          <label style={labelStyle}>{t('depLastName')} *</label>
                          <input type="text" style={inputStyle} value={currentDep().lastName}
                            onInput={(e) => setCurrentDep(p => ({ ...p, lastName: e.currentTarget.value }))} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>{t('depRelationship')} *</label>
                        <select style={selectStyle} value={currentDep().relationship}
                          onChange={(e) => setCurrentDep(p => ({ ...p, relationship: e.currentTarget.value }))}>
                          <option value="">{t('depSelect')}</option>
                          <option value="child">{t('depRelChild')}</option>
                          <option value="stepchild">{t('depRelStepchild')}</option>
                          <option value="parent">{t('depRelParent')}</option>
                          <option value="sibling">{t('depRelSibling')}</option>
                          <option value="other">{t('depRelOther')}</option>
                        </select>
                      </div>
                      <div style={twoCol}>
                        <div>
                          <label style={labelStyle}>{t('depSSN')}</label>
                          <input type="text" style={inputStyle} placeholder="123-45-6789"
                            value={currentDep().ssn}
                            onInput={(e) => setCurrentDep(p => ({ ...p, ssn: e.currentTarget.value }))} />
                        </div>
                        <div>
                          <label style={labelStyle}>{t('depDOB')}</label>
                          <input type="date" style={inputStyle} value={currentDep().dateOfBirth}
                            onInput={(e) => setCurrentDep(p => ({ ...p, dateOfBirth: e.currentTarget.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.65rem', 'margin-top': '0.25rem' }}>
                        <button style={btnSecondaryStyle} onClick={() => setShowDepForm(false)}>{t('depCancel')}</button>
                        <button style={{ ...btnPrimaryStyle, flex: '1', 'margin-top': '0' }} onClick={handleAddDep}>{t('depSave')}</button>
                      </div>
                    </div>
                  </Show>

                  {/* Action buttons */}
                  <Show when={!showDepForm()}>
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <button style={btnSecondaryStyle} onClick={() => setShowDepForm(true)}>
                        {t('depAdd')}
                      </button>
                      <button style={{ ...btnPrimaryStyle, flex: '1', 'margin-top': '0' }} onClick={handleSubmitDeps}>
                        {dependents().length === 0 ? t('depNone') : t('depComplete')}
                      </button>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={depsSubmitted() || hasExistingDeps() || isPortalLocked()}>
                <div style={completedMsgStyle}>
                  {depsSubmitted() || hasExistingDeps()
                    ? <>{t('depComplete')} ({dependents().length})</>
                    : t('portalLockedTitle')
                  }
                </div>
              </Show>
            </div>
          </Show>

          {/* Verify Personal Info */}
          <Show when={showVerifySection()}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle(verifySubmitted() || hasExistingVerify() || isPortalLocked())}>
                <div style={sectionTitleStyle}>{stepTitle('verify_info') || t('verifyTitle')}</div>
                <div style={badgeStyle(verifySubmitted() || hasExistingVerify() || isPortalLocked())}>
                  {verifySubmitted() || hasExistingVerify() ? t('complete') : isPortalLocked() ? t('portalLockedTitle') : t('pending')}
                </div>
              </div>

              <Show when={!verifySubmitted() && !hasExistingVerify() && !isPortalLocked()}>
                <div style={sectionBodyStyle}>
                  <div>
                    <label style={labelStyle}>{t('ssnLabel')} *</label>
                    <input type="text" style={inputStyle} placeholder={t('ssnPlaceholder')}
                      value={verifyInfo().ssn}
                      onInput={(e) => setVerifyInfo(p => ({ ...p, ssn: e.currentTarget.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('filingLabel')} *</label>
                    <select style={selectStyle} value={verifyInfo().filingStatus}
                      onChange={(e) => setVerifyInfo(p => ({ ...p, filingStatus: e.currentTarget.value }))}>
                      <option value="">{t('selectOption')}</option>
                      <option value="single">{t('filingSingle')}</option>
                      <option value="married_jointly">{t('filingMarried')}</option>
                      <option value="married_separate">{t('filingMarriedSep')}</option>
                      <option value="head_household">{t('filingHead')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('phoneLabel')}</label>
                    <input type="tel" style={inputStyle} placeholder="(555) 123-4567"
                      value={verifyInfo().phone}
                      onInput={(e) => setVerifyInfo(p => ({ ...p, phone: e.currentTarget.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('addressLabel')}</label>
                    <input type="text" style={inputStyle} placeholder="123 Main St"
                      value={verifyInfo().address}
                      onInput={(e) => setVerifyInfo(p => ({ ...p, address: e.currentTarget.value }))} />
                  </div>
                  <div style={twoCol}>
                    <div>
                      <label style={labelStyle}>{t('cityLabel')}</label>
                      <input type="text" style={inputStyle} value={verifyInfo().city}
                        onInput={(e) => setVerifyInfo(p => ({ ...p, city: e.currentTarget.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('stateLabel')}</label>
                      <input type="text" style={inputStyle} placeholder="KY" value={verifyInfo().state}
                        onInput={(e) => setVerifyInfo(p => ({ ...p, state: e.currentTarget.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('zipLabel')}</label>
                    <input type="text" style={inputStyle} placeholder="40272" maxLength={10}
                      value={verifyInfo().zipCode}
                      onInput={async (e) => {
                        const zip = e.currentTarget.value;
                        setVerifyInfo(p => ({ ...p, zipCode: zip }));
                        const clean = zip.replace(/\D/g, '');
                        if (clean.length === 5) {
                          const r = await lookupZipCode(clean);
                          if (r) setVerifyInfo(p => ({ ...p, city: r.city, state: r.stateAbbreviation }));
                        }
                      }} />
                  </div>
                  <button style={btnPrimaryStyle} onClick={handleSubmitVerify}>{t('verifyBtn')}</button>
                </div>
              </Show>

              <Show when={verifySubmitted() || hasExistingVerify() || isPortalLocked()}>
                <div style={completedMsgStyle}>
                  {verifySubmitted() || hasExistingVerify() ? t('verifyComplete') : t('portalLockedTitle')}
                </div>
              </Show>
            </div>
          </Show>

          {/* Bank Info (sub-section of verify_info) */}
          <Show when={showVerifySection()}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle(bankSubmitted() || hasExistingBank() || isPortalLocked())}>
                <div style={sectionTitleStyle}>{t('bankTitle')}</div>
                <div style={badgeStyle(bankSubmitted() || hasExistingBank() || isPortalLocked())}>
                  {bankSubmitted() || hasExistingBank() ? t('complete') : isPortalLocked() ? t('portalLockedTitle') : t('pending')}
                </div>
              </div>

              <Show when={!bankSubmitted() && !hasExistingBank() && !isPortalLocked()}>
                <div style={sectionBodyStyle}>
                  <p style={{ color: '#64748b', 'font-size': '0.9rem', 'margin-bottom': '0.75rem' }}>
                    {t('bankDescription')}
                  </p>

                  {/* Bank name with autocomplete */}
                  <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>{t('bankNameLabel')}</label>
                    <input type="text" style={inputStyle} placeholder={t('bankNamePlaceholder')}
                      value={bankInfo().bankName}
                      onInput={(e) => updateBankName(e.currentTarget.value)}
                      onBlur={() => setTimeout(() => setShowBankSuggestions(false), 200)} />
                    <Show when={showBankSuggestions()}>
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                        border: '1px solid #e2e8f0', 'border-radius': '10px', 'box-shadow': '0 4px 12px rgba(0,0,0,0.1)',
                        'z-index': 50, 'max-height': '180px', overflow: 'auto'
                      }}>
                        <For each={bankSuggestions()}>
                          {(bank) => (
                            <div
                              style={{ padding: '0.65rem 1rem', cursor: 'pointer', 'border-bottom': '1px solid #f1f5f9', 'font-size': '0.9rem' }}
                              onMouseDown={(e) => { e.preventDefault(); setBankInfo(p => ({ ...p, bankName: bank })); setShowBankSuggestions(false); }}
                            >
                              {bank}
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>

                  <div>
                    <label style={labelStyle}>{t('accountTypeLabel')} *</label>
                    <select style={selectStyle} value={bankInfo().accountType}
                      onChange={(e) => setBankInfo(p => ({ ...p, accountType: e.currentTarget.value as any }))}>
                      <option value="">{t('selectOption')}</option>
                      <option value="checking">{t('accountChecking')}</option>
                      <option value="savings">{t('accountSavings')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('routingLabel')} *</label>
                    <input type="text" style={inputStyle} placeholder="123456789" maxLength={9}
                      value={bankInfo().routingNumber}
                      onInput={(e) => setBankInfo(p => ({ ...p, routingNumber: e.currentTarget.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('accountLabel')} *</label>
                    <input type="text" style={inputStyle} placeholder="123456789012"
                      value={bankInfo().accountNumber}
                      onInput={(e) => setBankInfo(p => ({ ...p, accountNumber: e.currentTarget.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('confirmAccountLabel')} *</label>
                    <input type="text" style={inputStyle} placeholder="123456789012"
                      value={bankInfo().confirmAccountNumber}
                      onInput={(e) => setBankInfo(p => ({ ...p, confirmAccountNumber: e.currentTarget.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('holderLabel')}</label>
                    <input type="text" style={inputStyle}
                      value={bankInfo().accountHolderName}
                      onInput={(e) => setBankInfo(p => ({ ...p, accountHolderName: e.currentTarget.value }))} />
                  </div>
                  <button style={btnPrimaryStyle} onClick={handleSubmitBank}>{t('bankBtn')}</button>
                </div>
              </Show>

              <Show when={bankSubmitted() || hasExistingBank() || isPortalLocked()}>
                <div style={completedMsgStyle}>
                  {bankSubmitted() || hasExistingBank() ? t('bankComplete') : t('portalLockedTitle')}
                </div>
              </Show>
            </div>
          </Show>

          {/* Help */}
          <div style={{ background: '#f8fafb', 'border-radius': '12px', padding: '1rem', 'text-align': 'center', 'margin-top': '1rem' }}>
            <div style={{ 'font-weight': '600', color: '#475569', 'margin-bottom': '0.25rem', 'font-size': '0.9rem' }}>
              {t('helpTitle')}
            </div>
            <div style={{ color: '#94a3b8', 'font-size': '0.85rem' }}>{t('helpText')}</div>
          </div>

          {/* Footer */}
          <div style={{ 'text-align': 'center', padding: '1.5rem 0', color: '#94a3b8', 'font-size': '0.8rem' }}>
            <p>{t('secure')}</p>
            <p style={{ 'margin-top': '0.25rem' }}>
              {t('expires')} {portalData()?.expiresAt ? new Date(portalData()!.expiresAt).toLocaleDateString() : '--'}
            </p>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default PublicClientPortal;
