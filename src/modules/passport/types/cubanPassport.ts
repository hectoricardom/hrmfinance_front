export interface CubanPassportForm {
  // Personal Information (Page 1)
  primerApellido: string; // First surname (RAMIREZ)
  segundoApellido: string; // Second surname (PADRO)
  primerNombre: string; // First name (DANIEL)
  segundoNombre?: string; // Second name
  
  nombre: string; // Full name (ALINA)
  padre: string; // Father's name (MARCOS)
  cid: string;
  id?: string;
  // Sex options
  civilStatus: string;
  sexo: 'M' | 'F'; // Masculino o Femenino
  colorPiel: 'Blanca' | 'Mestiza' | 'Negra'; // Skin color
  colorCabello: 'Castaño' | 'Negro' | 'Rubio' | 'Gris'; // Hair color
  colorOjos: 'Castaños' | 'Negros' | 'Azules' | 'Verdes'; // Eye color
  
  // Physical characteristics
  estatura: string; // Height (e.g., "168")
  peso: string;
  caracteristicasEspeciales?: string; // Special characteristics (NINGUNA)
  
  // Migration classification
  clasificacionMigratoria: 'PSE' | 'PVE' | 'PVT' | 'PRE'; // PSE selected in form
  lastTravelDate?: string;
  // Permits
  permisoViaje: 'Interior' | 'Exterior' | 'Temporal';
  permisoEmigrado?: boolean;
  permisoResidencia?: string;
  
  lastOutCubaDate: {
      dd: string; // 
      mm: string; // 
      yyyy: string; // 
    },
  // Birth Information
  lugarNacimiento: {
    pais: string; // CUBA
    provincia: string; // SANTIAGO DE CUBA
    municipio: string; // SANTIAGO DE CUBA
    diaNacimiento: string; // 19
    mesNacimiento: string; // 2
    anoNacimiento: string; // 1985
  };
  
  // Current Address
  direccionActual: {
    calle: string; // 1222 W ASHLAND AVE
    numero?: string;
    apto?: string;
    entre?: string;
    provincia: string; // LOUISVILLE
    municipio: string; // KY
    pais: string; // ESTADOS UNIDOS
    codigoPostal: string; // 40215
  };
  
  // Contact
  telefono: string; // 502-665-4184
  fax?: string; // 000-000-0000
  email: string;
  
  // Work/Study Information
  datosLaborales: {
    ocupacion: string; // OBRERO / MECANICO
    profesion: string; // MECANICO
    nivelEscolar: string; // PRE-UNIVERSITARIO
    nombreCentroTrabajo: string; // BIGO TIRE
    direccionCentro: string; // 44 13 CANE RUN LOUISVILLE
    telefonoCentro: string;
  };
  
  // Consular Registration
  inscripcionConsular?: {
    numero: string;
    fecha: string;
  };
  
  // Passport Information (Page 2)
  pasaporteAnterior?: {
    numero: string; // K587373
    fechaExpedicion: string;
    lugar: string;
  };
  
  // Birth Certificate
  certificadoNacimiento: {
    tomo: string;
    folio: string;
    registroCivil: string;
  };
  
  // Reference in Cuba
  referenciaEnCuba: {
    nombre: string; // ALINA PADRO TERRERO
    parentesco: string; // MADRE
    telefono: string; // 
    direccion: string; // GRAL BANDERA 308 SANTIAGO DE CUBA SANTIAGO DE CUBA
  };
  
  // Current Residence
  residenciaActual?: {
    desde: string;
    hasta: string;
  };
  
  // Other Information
  apellidosSoltera?: string; // Apellidos de soltera (for women)
  otrosNombres?: string;
  numeroResidencia?: string;
  pasaporteExtranjero?: string;
  
  // Consular Fees
  arancel?: string; // Fee amount ($)
  
  // Photo - can be either base64 (for legacy) or URL (preferred)
  fotoBase64?: string; // Legacy: 4.5 x 4.5 cm photo as base64
  fotoUrl?: string; // Preferred: Photo URL from /api/images/upload
  
  // Signature - can be either base64 (for legacy) or URL (preferred)
  firmaBase64?: string; // Legacy: Extracted signature as base64
  firmaUrl?: string; // Preferred: Signature URL from /api/images/upload
  signatureRequestId?: string; // ID of the signature request used for this signature
  signatureBase64?: string;
  // Form metadata
  fechaSolicitud: string; // 27/8/2025
  numeroFormulario?: string; // 40498
  
  // Store/Business association
  storeId?: string; // Associated store/location
  storeName?: string; // Store name for display
}