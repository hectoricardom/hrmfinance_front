import { Component, createSignal, Show, createEffect, onCleanup, onMount } from 'solid-js';
import { Card, Button, FormInput, FormSelect } from '../../ui';
import { devLog } from '../../../services/utils';
import { CubanPassportForm as CubanPassportData } from '../types/cubanPassport';
import { extractSignatureFromImage, enhanceSignature, vectorizeSignature } from '../utils/signatureExtractor';
import { generateCubanPassportPDF, downloadFilledCubanPassportPDF } from '../../../services/cubanPassportPdfFiller';
import { downloadDetailedCubanPassportPDF } from '../../../services/cubanPassportDetailedPdf';
import { savePassportApplication, updatePassportApplication, autoSaveApplication, cancelAutoSave } from '../services/savePassportApplication';
import { showResourceWarningDialog } from '../utils/confirmationDialog';
import { useTranslation } from '../../../translations';
import SignatureModal from './SignatureModal';
import { authStore } from '../../../stores/authStore';
import { createSignatureRequest } from '../../../services/signatureRequest';
import ImageUploadWithCrop from '../../../components/ImageUploadWithCrop';

interface CubanPassportFormProps {
  onSubmit?: (data: CubanPassportData) => void;
  initialData?: Partial<CubanPassportData>;
  applicationId?: string; // For editing existing applications
  onSave?: (data: CubanPassportData) => void;
  loading?: boolean;
}

const CubanPassportForm: Component<CubanPassportFormProps> = (props) => {
  const { t } = useTranslation();
  
  // Form state with default values matching the example
  const [formData, setFormData] = createSignal<Partial<CubanPassportData>>({
    clasificacionMigratoria: 'PSE',
    sexo: 'M',
    colorPiel: 'Blanca',
    colorOjos: 'Castaños',
    colorCabello: 'Negro',
    civilStatus: "Soltero",
    lugarNacimiento: {
      pais: 'CUBA',
      provincia: '',
      municipio: '',
      diaNacimiento: '',
      mesNacimiento: '',
      anoNacimiento: ''
    },
    direccionActual: {
      calle: '',
      provincia: '',
      municipio: '',
      pais: 'ESTADOS UNIDOS',
      codigoPostal: ''
    },
    datosLaborales: {
      ocupacion: '',
      profesion: '',
      nivelEscolar: '',
      nombreCentroTrabajo: '',
      direccionCentro: '',
      telefonoCentro: ''
    },
    referenciaEnCuba: {
      nombre: '',
      telefono: '',
      parentesco: '',
      direccion: ''
    },
    certificadoNacimiento: {
      tomo: '',
      folio: '',
      registroCivil: ''
    },
    cid: "",
    lastTravelDate: "",
    lastOutCubaDate: {
      dd:"",
      mm:"",
      yyyy:""
    },
    ...props.initialData
  });
  
  const [signatureFile, setSignatureFile] = createSignal<File | null>(null);
  const [extracting, setExtracting] = createSignal(false);
  const [generating, setGenerating] = createSignal(false);
  const [enhancementType, setEnhancementType] = createSignal<'basic' | 'enhanced' | 'vectorized'>('enhanced');
  
  // Save functionality
  const [saving, setSaving] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [currentApplicationId, setCurrentApplicationId] = createSignal<string | undefined>(props.id);
  const [saveMessage, setSaveMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);
  const [showSignatureModal, setShowSignatureModal] = createSignal(false);
  
  // Auto-save effect - save as draft when form changes
  createEffect(() => {
    const data = formData();
    // Only auto-save if we have some basic required data
    if (data.primerNombre && data.primerApellido && data.email) {
      autoSaveApplication(data as CubanPassportData, currentApplicationId());
    }
  });
  
  // Cleanup auto-save on component unmount
  onCleanup(() => {
    cancelAutoSave();
  });
  
  
  
/**

  createEffect(()=>{
    setFormData({
        "clasificacionMigratoria": "PSE",
        "sexo": "M",
        "colorPiel": "Blanca",
        "colorOjos": "Castaños",
        "colorCabello": "Castaño",
        "lugarNacimiento": {
            "pais": "UNITED STATES",
            "provincia": "SANTIAGO DE CUBA",
            "municipio": "SANTIAGO DE CUBA",
            "diaNacimiento": "19",
            "mesNacimiento": "2",
            "anoNacimiento": "1985"
        },
        "direccionActual": {
            "calle": "330 STARLET COURT",
            "provincia": "KY",
            "municipio": "FAIRDALE",
            "pais": "UNITED STATES",
            "codigoPostal": "40118"
        },
        "datosLaborales": {
            "ocupacion": "OBRERO",
            "profesion": "MECANICO",
            "nivelEscolar": "PRE-UNIVERSITARIO",
            "nombreCentroTrabajo": "WALMART",
            "direccionCentro": "175 OUTERLOOP ",
            "telefonoCentro": ""
        },
        "referenciaEnCuba": {
            "nombre": "ALINA PRADO",
            "parentesco": "",
            "direccion": "GRABD ASND AMAISJD ASLJD A,SD ASKASD ASDKAS ADK"
        },
        "certificadoNacimiento": {
            "tomo": "38",
            "folio": "78",
            "registroCivil": "SONGO LA MAYA"
        },
        "primerApellido": "JODNASDJ",
        "segundoApellido": "JSADNDN",
        "primerNombre": "NKJASDA",
        "segundoNombre": "JNJN",
        "nombre": "JNJN",
        "padre": "JN",
        "estatura": "176",
        "telefono": "5023231345",
        "email": "nshdgvau@gmail.com",
        "pasaporteAnterior": {
            "numero": "K582932",
            "fechaExpedicion": "2025-04-15",
            "lugar": "LA HABANA"
        },
        "firmaBase64": "data:image/png;base64,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"
    })
  })

   */
  // Update helpers
  const updateFormData = (field: keyof CubanPassportData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear any existing save messages when form changes
    setSaveMessage(null);
  };
  
  const updateNested = (parent: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent as keyof typeof prev] as any, [field]: value }
    }));
    // Clear any existing save messages when form changes
    setSaveMessage(null);
  };
  
  // Handle signature
  const handleSignatureFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      devLog('No file selected');
      return;
    }

    devLog('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
    setSignatureFile(file);
    setExtracting(true);
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Image file is too large. Please select an image smaller than 10MB');
      }

      devLog('Extracting signature from image...');
      const result = await extractSignatureFromImage(file);
      devLog('Extraction result:', { success: result.success, hasSignature: !!result.signatureDataUrl });
      
      if (result.success && result.signatureDataUrl) {
        let processedSignature = result.signatureDataUrl;
        
        const type = enhancementType();
        devLog('Enhancement type:', type);
        
        try {
          if (type === 'enhanced') {
            devLog('Applying enhanced processing...');
            processedSignature = await enhanceSignature(result.signatureDataUrl);
          } else if (type === 'vectorized') {
            // Ask for user consent before running resource-intensive processing
            const userConsent = await showResourceWarningDialog();
            
            if (userConsent) {
              devLog('User approved vectorized processing...');
              processedSignature = await vectorizeSignature(result.signatureDataUrl);
            } else {
              devLog('User declined vectorized processing, using enhanced instead...');
              processedSignature = await enhanceSignature(result.signatureDataUrl);
            }
          }
          devLog('Processing completed successfully');
        } catch (enhanceError) {
          devLog('Enhancement failed, using basic extraction:', enhanceError);
          processedSignature = result.signatureDataUrl; // Fallback to basic
        }
        
        updateFormData('firmaBase64', processedSignature);
      } else {
        throw new Error(result.error || 'Could not extract signature from image. Please ensure the image contains a clear signature on a white background.');
      }
    } catch (error) {
      devLog('Error extracting signature:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing signature';
      alert(`Error: ${errorMessage}\n\nTips:\n- Use a clear image with good contrast\n- Ensure signature is on white/light background\n- Try a different enhancement type`);
    } finally {
      setExtracting(false);
    }
  };
  
   const handleSaveDraft = async () => {

   }
  // Save as draft
  const handle2SaveDraft = async () => {
    const data = formData();
    
    if (!data.primerNombre || !data.primerApellido) {
      setSaveMessage({
        type: 'error',
        text: 'Por favor complete al menos el nombre, apellido y email antes de guardar'
      });
      return;
    }
    
    try {
      setSaving(true);
      setSaveMessage(null);
      
      let applicationId = currentApplicationId();
      devLog(applicationId, data)
      if (applicationId) {
        await updatePassportApplication(applicationId, data as CubanPassportData, { status: 'draft' });
      } else {
        applicationId = await savePassportApplication(data as CubanPassportData, { status: 'draft' });
        setCurrentApplicationId(applicationId);
        props.onSave?.(data as CubanPassportData);
      }
      
      setSaveMessage({
        type: 'success',
        text: 'Solicitud guardada como borrador exitosamente'
      });
      
    } catch (error) {
      devLog('Error saving draft:', error);
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error guardando la solicitud'
      });
    } finally {
      setSaving(false);
    }
  };
  
  
  // Submit application
  const handleSubmitApplication = async () => {
    const data = formData();
    
    // Validate all required fields
    const requiredFields = [
      'primerApellido', 'primerNombre', 'telefono',
      'lugarNacimiento.diaNacimiento', 'lugarNacimiento.mesNacimiento', 'lugarNacimiento.anoNacimiento'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const keys = field.split('.');
      let value = data as any;
      for (const key of keys) {
        value = value?.[key];
      }
      return !value;
    });
    
    if (missingFields.length > 0) {
      setSaveMessage({
        type: 'error',
        text: 'Por favor complete todos los campos requeridos antes de enviar'
      });
      return;
    }
    
    if (!confirm('¿Está seguro que desea enviar esta solicitud? Una vez enviada no podrá ser modificada.')) {
      return;
    }
    
    try {
      setSubmitting(true);
      setSaveMessage(null);
      
      let applicationId = currentApplicationId();
      
      if (applicationId) {
        await updatePassportApplication(applicationId, data as CubanPassportData, { status: 'submitted' });
      } else {
        applicationId = await savePassportApplication(data as CubanPassportData, { status: 'submitted' });
        setCurrentApplicationId(applicationId);
        props.onSave?.(data as CubanPassportData);
      }
      
      setSaveMessage({
        type: 'success',
        text: 'Solicitud enviada exitosamente. Recibirá notificaciones sobre el estado de su solicitud.'
      });
      
    } catch (error) {
      devLog('Error submitting application:', error);
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error enviando la solicitud'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Generate PDF
  const handleGeneratePDF = async () => {
    const data = formData();
    
    // Validate required fields
    if (!data.primerApellido || !data.primerNombre || !data.lugarNacimiento?.diaNacimiento) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    setGenerating(true);
    
    try {
      const pdfBlob = await generateCubanPassportPDF({
        ...data,
        fechaSolicitud: new Date().toLocaleDateString()
      } as CubanPassportData);
      
      // Download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pasaporte_cubano_${data.primerApellido}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (props.onSubmit) {
        props.onSubmit(data as CubanPassportData);
      }
    } catch (error) {
      devLog('Error generating PDF:', error);
      alert('Error generando el PDF');
    } finally {
      setGenerating(false);
    }
  };
  
  // Generate Detailed PDF
  const handleGenerateDetailedPDF = async () => {
    const data = formData();
    
    // Validate required fields
    if (!data.primerApellido || !data.primerNombre) {
      setSaveMessage({
        type: 'error',
        text: 'Por favor complete al menos el nombre y apellido antes de generar el PDF'
      });
      return;
    }
    
    setGenerating(true);
    setSaveMessage(null);
    
    try {
      await downloadDetailedCubanPassportPDF({
        ...data,
        fechaSolicitud: data.fechaSolicitud || new Date().toLocaleDateString('es-ES')
      } as CubanPassportData);
      
      setSaveMessage({
        type: 'success',
        text: 'PDF detallado generado y descargado exitosamente'
      });
      
    } catch (error) {
      devLog('Error generating detailed PDF:', error);
      setSaveMessage({
        type: 'error',
        text: 'Error generando el PDF detallado'
      });
    } finally {
      setGenerating(false);
    }
  };
  
  // Fill Official PDF Form
  const handleFillOfficialPDF = async () => {
    const data = formData();
    
    // Validate required fields
    if (!data.primerApellido || !data.primerNombre) {
      setSaveMessage({
        type: 'error',
        text: 'Por favor complete al menos el nombre y apellido antes de generar el PDF oficial'
      });
      return;
    }
    
    setGenerating(true);
    setSaveMessage(null);
    
    try {
      await downloadFilledCubanPassportPDF({
        ...data,
        fechaSolicitud: data.fechaSolicitud || new Date().toLocaleDateString('es-ES')
      } as CubanPassportData);
      
      setSaveMessage({
        type: 'success',
        text: 'Formulario PDF oficial generado y descargado exitosamente'
      });
      
    } catch (error) {
      devLog('Error filling official PDF:', error);
      setSaveMessage({
        type: 'error',
        text: 'Error al llenar el formulario PDF oficial. Por favor intente nuevamente.'
      });
    } finally {
      setGenerating(false);
    }
  };
  
  const sectionStyle = {
    'margin-bottom': '2rem',
    'padding-bottom': '1.5rem',
    'border-bottom': '1px solid var(--border-color)'
  };
  
  const sectionTitleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)'
  };
  
  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };
  

  const urlP = (v:string): string => {
   
    if(!v) return "";
    return `https://ssgloghr.com${v}?format=webp&width=900&height=900`
  }

  return (
    <Card>
      <div style={{ padding: '2rem' }}>
        <h2 style={{
          'font-size': '1.75rem',
          'font-weight': '700',
          'margin-bottom': '1rem',
          color: 'var(--text-primary)',
          'text-align': 'center'
        }}>
          SOLICITUD DE SERVICIO CONSULAR
        </h2>
        <p style={{
          'text-align': 'center',
          'margin-bottom': '2rem',
          color: 'var(--text-muted)'
        }}>
          Pasaporte Cubano 
        </p>
        
        {/* Store Selection */}
        <div style={{ 'margin-bottom': '2rem', padding: '1rem', background: 'var(--surface-secondary)', 'border-radius': 'var(--border-radius)' }}>
          <h3 style={{
            'font-size': '1.125rem',
            'font-weight': '600',
            'margin-bottom': '1rem',
            color: 'var(--text-primary)'
          }}>Seleccionar Tienda</h3>
          <FormSelect
            label="Tienda/Ubicación"
            value={formData()?.storeId}
            onChange={(value) => {
              updateFormData('storeId', value);
              const selectedStore = authStore.allowedStores.find(s => s.id === value);
              if (selectedStore) {
                updateFormData('storeName', selectedStore.name);
              }
            }}
            options={[
              { value: '', label: 'Seleccionar tienda...' },
              ...authStore.allowedStores.map(store => ({
                value: store.id,
                label: store.name
              }))
            ]}
            required
          />
        </div>
        
        {/* Datos Personales */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Datos Personales</h3>
          <div style={gridStyle}>
            <FormInput
              label="Primer Apellido"
              value={formData().primerApellido || ''}
              onChange={(value) => updateFormData('primerApellido', value.toUpperCase())}
              required
            />
            <FormInput
              label="Segundo Apellido"
              value={formData().segundoApellido || ''}
              onChange={(value) => updateFormData('segundoApellido', value.toUpperCase())}
              required
            />
            <FormInput
              label="Primer Nombre"
              value={formData().primerNombre || ''}
              onChange={(value) => updateFormData('primerNombre', value.toUpperCase())}
              required
            />
            <FormInput
              label="Segundo Nombre"
              value={formData().segundoNombre || ''}
              onChange={(value) => updateFormData('segundoNombre', value.toUpperCase())}
            />
          </div>
          
          <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
            <FormInput
              label="Nombre de la Madre"
              value={formData().nombre || ''}
              onChange={(value) => updateFormData('nombre', value.toUpperCase())}
              required
            />
            <FormInput
              label="Nombre del Padre"
              value={formData().padre || ''}
              onChange={(value) => updateFormData('padre', value.toUpperCase())}
              required
            />
          </div>
        </div>
        
        {/* Características Físicas */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Características Físicas</h3>
          <div style={gridStyle}>
            <FormSelect
              label="Sexo"
              value={formData().sexo || 'M'}
              onChange={(value) => updateFormData('sexo', value)}
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Femenino' }
              ]}
              required
            />
            <FormSelect
              label="Estado Civil"
              value={formData().civilStatus || 'Soltero'}
              onChange={(value) => updateFormData('civilStatus', value)}
              options={[
                { value: 'Casado', label: 'Casado' },
                { value: 'Soltero', label: 'Soltero' },
                 { value: 'Divorciado', label: 'Divorciado' },
                { value: 'Viudo', label: 'Viudo' }
              ]}
              required
            />
            <FormSelect
              label="Color de Piel"
              value={formData().colorPiel || 'Blanca'}
              onChange={(value) => updateFormData('colorPiel', value)}
              options={[
                { value: 'Blanca', label: 'Blanca' },
                { value: 'Mestiza', label: 'Mestiza' },
                { value: 'Negra', label: 'Negra' }
              ]}
              required
            />
            <FormSelect
              label="Color de Cabello"
              value={formData().colorCabello || 'Negro'}
              onChange={(value) => updateFormData('colorCabello', value)}
              options={[
                { value: 'Negro', label: 'Negro' },
                { value: 'Castaño', label: 'Castaño' },
                { value: 'Rubio', label: 'Rubio' },
                { value: 'Gris', label: 'Gris' }
              ]}
              required
            />
            <FormSelect
              label="Color de Ojos"
              value={formData().colorOjos || 'Castaños'}
              onChange={(value) => updateFormData('colorOjos', value)}
              options={[
                { value: 'Negros', label: 'Negros' },
                { value: 'Claros', label: 'Claros' },
                { value: 'Pardos', label: 'Pardos' }
               
              ]}
              required
            />
            <FormInput
              label="Estatura (cm)"
              value={formData().estatura || ''}
              onChange={(value) => updateFormData('estatura', value)}
              placeholder="168"
              required
            />
            <FormInput
              label="Peso (lbs)"
              value={formData().peso || ''}
              onChange={(value) => updateFormData('peso', value)}
              placeholder="168"
              required
            />
            <FormInput
              label="Características Especiales"
              value={formData().caracteristicasEspeciales || ''}
              onChange={(value) => updateFormData('caracteristicasEspeciales', value.toUpperCase())}
              placeholder="NINGUNA"
            />
          </div>
        </div>
        
        {/* Fotografía del Pasaporte */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Fotografía para Pasaporte</h3>
          <p style={{ 
            color: 'var(--text-muted)', 
            'margin-bottom': '1rem',
            'font-size': '0.875rem'
          }}>
            Suba una fotografía tamaño pasaporte (4.5 x 4.5 cm). La imagen debe ser reciente, con fondo claro y buena calidad.
          </p>
          
         
          <div style={{ 'max-width': '400px' }}>
            <ImageUploadWithCrop
              label=""
              placeholder="Seleccionar fotografía para pasaporte"
              currentImage={urlP(formData()?.fotoUrl) || formData().fotoBase64} // Support both URL and base64
              onImageUpload={async (base64OrUrl, fileName, uploadResult) => {
                if (uploadResult?.imageUrl) {
                  // Server upload successful - store URL (preferred)
                  updateFormData('fotoUrl', uploadResult.imageUrl);
                  updateFormData('fotoBase64', undefined); // Clear base64 to save space
                  setSaveMessage({
                    type: 'success',
                    text: 'Fotografía subida exitosamente'
                  });
                } else {

                  devLog(base64OrUrl)
                   devLog(uploadResult)
                  // Fallback to base64 if server upload failed
                  updateFormData('fotoBase64', base64OrUrl);
                  updateFormData('fotoUrl', undefined);
                }
                setTimeout(() => setSaveMessage(null), 3000);
              }}
              onError={(error) => {
                setSaveMessage({
                  type: 'error',
                  text: `Error subiendo foto: ${error}`
                });
                setTimeout(() => setSaveMessage(null), 5000);
              }}
              uploadToServer={true} // Upload to server to get URL
              aspectRatio={1} // Square aspect ratio for passport photos
              enableCrop={true} // Enable cropping for passport photos
              minWidth={530} // Minimum width for passport photos (4.5cm at 300 DPI)
              minHeight={530} // Minimum height for passport photos (4.5cm at 300 DPI)
              autoScale={true} // Auto-scale small images to meet passport requirements
              options={{
                maxSizeKB: 2048, // 2MB max
                quality: 0.8,
                maxWidth: 800,
                maxHeight: 800
              }}
            />
          </div>
        </div>
        
        {/* Clasificación Migratoria */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Clasificación Migratoria al salir de Cuba</h3>
          <FormSelect
            label="De que forma salio"
            value={formData().clasificacionMigratoria || 'Avion'}
            onChange={(value) => updateFormData('clasificacionMigratoria', value)}
            options={[
              { value: 'Avion', label: 'Avion' },
              { value: 'Mar', label: 'Mar' }
            ]}
            required
          />
           

             <h3 style={sectionTitleStyle}>Fecha de Salida</h3>
             <div style={{ ...gridStyle, 'margin-top': '1rem', 'grid-template-columns': 'repeat(3, 1fr)', 'max-width': '400px' }}>
            <FormInput
              label="Día"
              value={formData().lastOutCubaDate?.dd || ''}
              onChange={(value) => updateNested('lastOutCubaDate', 'dd', value)}
              placeholder="19"
              required
            />
            <FormInput
              label="Mes"
              value={formData().lastOutCubaDate?.mm || ''}
              onChange={(value) => updateNested('lastOutCubaDate', 'mm', value)}
              placeholder="2"
              required
            />
            <FormInput
              label="Año"
              value={formData().lastOutCubaDate?.yyyy || ''}
              onChange={(value) => updateNested('lastOutCubaDate', 'yyyy', value)}
              placeholder="1985"
              required
            />
          </div>
        </div>
        
        {/* Lugar de Nacimiento */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Lugar de Nacimiento</h3>
          <div style={gridStyle}>
            <FormInput
              label="País"
              value={formData().lugarNacimiento?.pais || ''}
              onChange={(value) => updateNested('lugarNacimiento', 'pais', value.toUpperCase())}
              placeholder="CUBA"
              required
            />
            <FormInput
              label="Provincia"
              value={formData().lugarNacimiento?.provincia || ''}
              onChange={(value) => updateNested('lugarNacimiento', 'provincia', value.toUpperCase())}
              placeholder="SANTIAGO DE CUBA"
              required
            />
            <FormInput
              label="Municipio"
              value={formData().lugarNacimiento?.municipio || ''}
              onChange={(value) => updateNested('lugarNacimiento', 'municipio', value.toUpperCase())}
              placeholder="SANTIAGO DE CUBA"
              required
            />
          </div>
          <div style={{ ...gridStyle, 'margin-top': '1rem', 'grid-template-columns': 'repeat(3, 1fr)', 'max-width': '400px' }}>
            <FormInput
              label="Día"
              value={formData().lugarNacimiento?.diaNacimiento || ''}
              onChange={(value) => updateNested('lugarNacimiento', 'diaNacimiento', value)}
              placeholder="19"
              required
            />
            <FormInput
              label="Mes"
              value={formData().lugarNacimiento?.mesNacimiento || ''}
              onChange={(value) => updateNested('lugarNacimiento', 'mesNacimiento', value)}
              placeholder="2"
              required
            />
            <FormInput
              label="Año"
              value={formData().lugarNacimiento?.anoNacimiento || ''}
              onChange={(value) => updateNested('lugarNacimiento', 'anoNacimiento', value)}
              placeholder="1985"
              required
            />
          </div>
        </div>
        
        {/* Dirección Actual */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Dirección de la Residencia Actual</h3>
          <FormInput
            label="Dirección (calle, ave o apto, entre calles)"
            value={formData().direccionActual?.calle || ''}
            onChange={(value) => updateNested('direccionActual', 'calle', value.toUpperCase())}
            placeholder="1222 W ASHLAND AVE"
            required
          />
          <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
            <FormInput
              label="Ciudad/Municipio"
              value={formData().direccionActual?.municipio || ''}
              onChange={(value) => updateNested('direccionActual', 'municipio', value.toUpperCase())}
              placeholder="KY"
              required
            />
            <FormInput
              label="Provincia/Estado"
              value={formData().direccionActual?.provincia || ''}
              onChange={(value) => updateNested('direccionActual', 'provincia', value.toUpperCase())}
              placeholder="LOUISVILLE"
              required
            />
            <FormInput
              label="País"
              value={formData().direccionActual?.pais || ''}
              onChange={(value) => updateNested('direccionActual', 'pais', value.toUpperCase())}
              placeholder="ESTADOS UNIDOS"
              required
            />
            <FormInput
              label="Código Postal"
              value={formData().direccionActual?.codigoPostal || ''}
              onChange={(value) => updateNested('direccionActual', 'codigoPostal', value)}
              placeholder="40215"
              required
            />
          </div>
        </div>
        
        {/* Contacto */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Información de Contacto</h3>
          <div style={gridStyle}>
            <FormInput
              label="Teléfono"
              value={formData().telefono || ''}
              onChange={(value) => updateFormData('telefono', value)}
              placeholder="502-665-4184"
              required
            />
            <FormInput
              label="Fax"
              value={formData().fax || ''}
              onChange={(value) => updateFormData('fax', value)}
              placeholder="000-000-0000"
            />
            <FormInput
              label="Email"
              value={formData().email || ''}
              onChange={(value) => updateFormData('email', value)}
              type="email"
            />
          </div>
        </div>
        
        {/* Datos Laborales */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Datos Laborales o de Estudio Actual</h3>
          <div style={gridStyle}>
            <FormInput
              label="Profesión"
              value={formData().datosLaborales?.profesion || ''}
              onChange={(value) => updateNested('datosLaborales', 'profesion', value.toUpperCase())}
              placeholder="MECANICO"
              required
            />
            <FormInput
              label="Ocupación"
              value={formData().datosLaborales?.ocupacion || ''}
              onChange={(value) => updateNested('datosLaborales', 'ocupacion', value.toUpperCase())}
              placeholder="OBRERO"
              required
            />
            <FormSelect
              label="Nivel Escolar"
              value={formData().datosLaborales?.nivelEscolar || 'PRE-UNIVERSITARIO'}
              onChange={(value) => updateNested('datosLaborales', 'nivelEscolar', value)}
              options={[
                { value: 'PRIMARIO', label: 'Primario' },
                { value: 'SECUNDARIO', label: 'Secundario' },
                { value: 'PRE-UNIVERSITARIO', label: 'Pre-Universitario' },
                { value: 'UNIVERSITARIO', label: 'Universitario' }
              ]}
              required
            />
          </div>
          <div style={{ 'margin-top': '1rem' }}>
            <FormInput
              label="Nombre del Centro de Trabajo/Estudio"
              value={formData().datosLaborales?.nombreCentroTrabajo || ''}
              onChange={(value) => updateNested('datosLaborales', 'nombreCentroTrabajo', value.toUpperCase())}
              placeholder="BIGO TIRE"
              required
            />
            <FormInput
              label="Dirección del Centro"
              value={formData().datosLaborales?.direccionCentro || ''}
              onChange={(value) => updateNested('datosLaborales', 'direccionCentro', value.toUpperCase())}
              placeholder="4413 CANE RUN LOUISVILLE"
            />
            <FormInput
              label="Teléfono del Centro"
              value={formData().datosLaborales?.telefonoCentro || ''}
              onChange={(value) => updateNested('datosLaborales', 'telefonoCentro', value)}
              placeholder="000-000-0000"
            />
          </div>
        </div>
        
        {/* Referencia en Cuba */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Referencia en Cuba</h3>
          <FormInput
            label="Nombres y Apellidos de la referencia en Cuba"
            value={formData().referenciaEnCuba?.nombre || ''}
            onChange={(value) => updateNested('referenciaEnCuba', 'nombre', value.toUpperCase())}
            placeholder="ALINA PADRO TERRERO"
            required
          />
          <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
            <FormInput
              label="Parentesco"
              value={formData().referenciaEnCuba?.parentesco || ''}
              onChange={(value) => updateNested('referenciaEnCuba', 'parentesco', value.toUpperCase())}
              placeholder="MADRE"
              required
            />
          </div>
          <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
            
           <FormInput
              label="Teléfono"
              value={formData().referenciaEnCuba?.telefono || ''}
              onChange={(value) => updateNested('referenciaEnCuba', 'telefono', value.toUpperCase())}
              placeholder="502-665-4184"
              required
            />
          </div>

        
          <FormInput
            label="Dirección de la Referencia (incluir la provincia)"
            value={formData().referenciaEnCuba?.direccion || ''}
            onChange={(value) => updateNested('referenciaEnCuba', 'direccion', value.toUpperCase())}
            placeholder="GRAL BANDERA 308 SANTIAGO DE CUBA SANTIAGO DE CUBA"
            required
          />
        </div>
        
        {/* Pasaporte Anterior */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Pasaporte Anterior (si aplica)</h3>
          <div style={gridStyle}>
            <FormInput
              label="Número de Pasaporte"
              value={formData().pasaporteAnterior?.numero || ''}
              onChange={(value) => updateFormData('pasaporteAnterior', { 
                ...formData().pasaporteAnterior, 
                numero: value.toUpperCase() 
              })}
              placeholder="K587373"
            />
            <FormInput
              label="Fecha de Expedición"
              type="date"
              value={formData().pasaporteAnterior?.fechaExpedicion || ''}
              onChange={(value) => updateFormData('pasaporteAnterior', { 
                ...formData().pasaporteAnterior, 
                fechaExpedicion: value 
              })}
            />
            <FormInput
              label="Lugar de Expedición"
              value={formData().pasaporteAnterior?.lugar || ''}
              onChange={(value) => updateFormData('pasaporteAnterior', { 
                ...formData().pasaporteAnterior, 
                lugar: value.toUpperCase() 
              })}
            />
            <FormInput
              label="Número de CID"
              value={formData().cid || ''}
              onChange={(value) => updateFormData('cid', value)}
              placeholder="12345678901"
            />
          </div>
        </div>
        
        {/* Certificado de Nacimiento */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Certificación de Nacimiento</h3>
          <div style={gridStyle}>
            <FormInput
              label="Tomo"
              value={formData().certificadoNacimiento?.tomo || ''}
              onChange={(value) => updateNested('certificadoNacimiento', 'tomo', value)}
            />
            <FormInput
              label="Folio"
              value={formData().certificadoNacimiento?.folio || ''}
              onChange={(value) => updateNested('certificadoNacimiento', 'folio', value)}
            />
            <FormInput
              label="Registro Civil"
              value={formData().certificadoNacimiento?.registroCivil || ''}
              onChange={(value) => updateNested('certificadoNacimiento', 'registroCivil', value.toUpperCase())}
            />
          </div>
        </div>


        
        
        {/* Save Messages */}
        <Show when={saveMessage()}>
          <div style={{
            padding: '1rem',
            'margin-top': '1rem',
            'border-radius': 'var(--border-radius)',
            background: saveMessage()!.type === 'success' ? 'var(--success-light)' : 'var(--error-light)',
            color: saveMessage()!.type === 'success' ? 'var(--success-dark)' : 'var(--error-dark)',
            border: `1px solid ${saveMessage()!.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`
          }}>
            <strong>{saveMessage()!.type === 'success' ? '✓ Éxito:' : '⚠ Error:'}</strong> {saveMessage()!.text}
          </div>
        </Show>
        
        {/* Botones de Acción */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'flex-wrap': 'wrap',
          gap: '1rem',
          'margin-top': '2rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
            <Button
              onClick={handleSaveDraft}
              disabled={saving() || submitting()}
              variant="secondary"
              size="md"
            >
              <Show when={saving()} fallback="Guardar Borrador">
                <span style={{ display: 'flex', 'align-items': 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 0.8s linear infinite',
                    'margin-right': '0.5rem'
                  }} />
                  Guardando...
                </span>
              </Show>
            </Button>
            
            <Button
              onClick={handleSubmitApplication}
              disabled={saving() || submitting()}
              variant="primary"
              size="md"
            >
              <Show when={submitting()} fallback="Enviar Solicitud">
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
                  Enviando...
                </span>
              </Show>
            </Button>


            </div>
            <Show when={authStore.isAdmin()}>
            <Button
              onClick={handleGenerateDetailedPDF}
              disabled={saving() || submitting() || generating()}
              variant="outline"
              size="md"
            >
              <Show when={generating()} fallback="Generar PDF Detallado">
                <span style={{ display: 'flex', 'align-items': 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 0.8s linear infinite',
                    'margin-right': '0.5rem'
                  }} />
                  Generando...
                </span>
              </Show>
            </Button>
            
            <Button
              onClick={handleFillOfficialPDF}
              disabled={saving() || submitting() || generating()}
              variant="success"
              size="md"
              title="Descargar el formulario oficial de pasaporte cubano con sus datos"
            >
              <Show when={generating()} fallback="Llenar PDF Oficial">
                <span style={{ display: 'flex', 'align-items': 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 0.8s linear infinite',
                    'margin-right': '0.5rem'
                  }} />
                  Llenando...
                </span>
              </Show>
            </Button>
            
          
          </Show>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Show when={currentApplicationId()}>
              <span style={{
                'font-size': '0.875rem',
                color: 'var(--text-muted)',
                padding: '0.5rem'
              }}>
                ID: {currentApplicationId()?.substring(0, 8)}...
              </span>
            </Show>
            
            <Button
              onClick={() => {
                if (confirm('¿Está seguro que desea limpiar el formulario?')) {
                  window.location.reload();
                }
              }}
              variant="secondary"
              size="sm"
            >
              Limpiar Formulario
            </Button>
          </div>
        </div>
      </div>
      
      <SignatureModal
        isOpen={showSignatureModal()}
        onClose={() => setShowSignatureModal(false)}
        signatureDataUrl={formData().firmaBase64!}
        enhancementType={enhancementType()}
      />
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default CubanPassportForm;





/*


        
        {/* Firma *}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Firma del Solicitante</h3>
          
          {/* Enhancement Type Selection *}
          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{
              display: 'block',
              'font-weight': '500',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              Tipo de Procesamiento de Firma
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                background: 'var(--surface-color)',
                'font-size': '1rem',
                cursor: 'pointer'
              }}
              value={enhancementType()}
              onChange={(e) => setEnhancementType(e.currentTarget.value as 'basic' | 'enhanced' | 'vectorized')}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <option value="basic">Básico - Sin procesamiento adicional</option>
              <option value="enhanced">Mejorado - Reducción de ruido y suavizado</option>
              <option value="vectorized">Vectorizado - Calidad profesional (requiere confirmación)</option>
            </select>
            
            <div style={{
              'margin-top': '0.5rem',
              'font-size': '0.75rem',
              color: 'var(--text-muted)'
            }}>
              {enhancementType() === 'basic' && '• Extrae la firma tal como aparece en la imagen'}
              {enhancementType() === 'enhanced' && '• Mejora la calidad eliminando pixeles y suavizando bordes'}
              {enhancementType() === 'vectorized' && '• Filtros avanzados con calidad profesional (solicitará confirmación antes de procesar)'}
            </div>
          </div>
          
          <div style={{
            background: 'var(--gray-50)',
            padding: '1rem',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1rem'
          }}>
            <p style={{
              'font-size': '0.875rem',
              color: 'var(--text-muted)',
              'margin-bottom': '0.5rem'
            }}>
              Suba una imagen con su firma sobre fondo blanco para mejores resultados
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureFileSelect}
              style={{ display: 'none' }}
              id="signature-upload-cuban"
            />
            <label
              for="signature-upload-cuban"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'var(--primary-color)',
                color: 'white',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-weight': '500'
              }}
            >
              Subir Imagen de Firma
            </label>
            
            <Show when={extracting()}>
              <div style={{
                'margin-top': '1rem',
                color: 'var(--primary-color)',
                'font-size': '0.875rem',
                display: 'flex',
                'align-items': 'center'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--primary-color)',
                  'border-top-color': 'transparent',
                  'border-radius': '50%',
                  animation: 'spin 0.8s linear infinite',
                  'margin-right': '0.5rem'
                }} />
                {enhancementType() === 'vectorized' 
                  ? 'Aplicando filtros avanzados... (optimizado para ser rápido)'
                  : 'Extrayendo y mejorando firma...'}
              </div>
            </Show>
            
            <Show when={signatureFile() && !extracting()}>
              <Button 
                onClick={async () => {
                  if (enhancementType() === 'vectorized') {
                    const userConsent = await showResourceWarningDialog();
                    
                    if (!userConsent) {
                      return; // User cancelled
                    }
                  }
                  
                  signatureFile() && handleSignatureFileSelect({ 
                    target: { files: [signatureFile()!] } 
                  } as any);
                }}
                variant="secondary" 
                size="sm"
                style={{ 'margin-top': '0.75rem' }}
              >
                Reprocesar con {enhancementType() === 'basic' ? 'Básico' : enhancementType() === 'enhanced' ? 'Mejorado' : 'Filtros Avanzados'}
              </Button>
            </Show>
          </div>
          
          <Show when={formData().firmaBase64}>
            <div style={{
              'margin-top': '1rem',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              background: 'white'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'flex-start',
                'margin-bottom': '1rem'
              }}>
                <div>
                  <h4 style={{
                    'font-size': '1.125rem',
                    'font-weight': '600',
                    'margin-bottom': '0.5rem',
                    color: 'var(--text-primary)'
                  }}>
                    Firma Procesada
                  </h4>
                  <p style={{
                    'font-size': '0.875rem',
                    color: 'var(--success-color)',
                    'margin-bottom': '0',
                    'font-weight': '500'
                  }}>
                    ✓ {enhancementType() === 'basic' 
                        ? 'Extraída sin procesamiento' 
                        : enhancementType() === 'enhanced' 
                        ? 'Mejorada con algoritmos avanzados' 
                        : 'Optimizada con filtros avanzados'}
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                'justify-content': 'center',
                'align-items': 'center',
                background: '#f8f9fa',
                padding: '2rem',
                'border-radius': 'var(--border-radius)',
                border: '2px dashed var(--border-color)',
                'min-height': '200px'
              }}>
                <img
                  src={formData().firmaBase64}
                  alt="Firma Extraída"
                  onClick={() => setShowSignatureModal(false)}
                  style={{
                    'max-width': '600px',
                    'max-height': '300px',
                    width: 'auto',
                    height: 'auto',
                    border: '2px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'white',
                    padding: '1rem',
                    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
                    cursor: 'pointer'
                  }}
                />
              </div>
              
              <div style={{
                'margin-top': '1rem',
                'text-align': 'center'
              }}>
                <p style={{
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)',
                  margin: '0 0 0.5rem 0'
                }}>
                  Esta firma se incluirá en el PDF del pasaporte. Verifique que se vea claramente antes de generar el documento.
                </p>
                <p style={{
                  'font-size': '0.8rem',
                  color: 'var(--primary-color)',
                  margin: '0',
                  'font-weight': '500'
                }}>
                  🔍 Haga clic en la firma para verla en tamaño completo
                </p>
              </div>
            </div>
          </Show>
          
          {/* Alternative: Capture signature with image upload and crop *}
          <div style={{ 'margin-top': '2rem' }}>
            <h4 style={{
              'font-size': '1rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              📸 Alternativamente: Capturar Firma con Imagen
            </h4>
            <p style={{
              color: 'var(--text-muted)',
              'font-size': '0.875rem',
              'margin-bottom': '1rem'
            }}>
              Use esta opción para subir una imagen de documento firmado y recortar solo la firma.
            </p>
            
            <div style={{ 'max-width': '400px' }}>
              <ImageUploadWithCrop
                label=""
                placeholder="Seleccionar imagen con firma"
                currentImage={urlP(formData()?.firmaUrl) || formData().firmaBase64} // Support both URL and base64
                onImageUpload={async (base64OrUrl, fileName, uploadResult) => {
                  if (uploadResult?.imageUrl) {
                    devLog()
                    // Convert URL to base64 for signature processing
                   
                    try {
                      const response = await fetch(uploadResult.imageUrl);
                      const blob = await response.blob();
                      const reader = new FileReader();
                      reader.onload = () => {
                        updateFormData('firmaBase64', reader.result as string);
                        updateFormData('firmaUrl', uploadResult?.imageUrl);
                        setSaveMessage({
                          type: 'success',
                          text: 'Firma capturada exitosamente'
                        });
                        setTimeout(() => setSaveMessage(null), 3000);
                      };
                      reader.readAsDataURL(blob);
                    } catch (error) {
                      devLog('Error processing signature image:', error);
                      updateFormData('firmaBase64', base64OrUrl);
                    }
                  } else {
                    updateFormData('firmaBase64', base64OrUrl);
                    setSaveMessage({
                      type: 'success',
                      text: 'Firma capturada exitosamente'
                    });
                    setTimeout(() => setSaveMessage(null), 3000);
                  }
                }}
                onError={(error) => {
                  setSaveMessage({
                    type: 'error',
                    text: `Error capturando firma: ${error}`
                  });
                  setTimeout(() => setSaveMessage(null), 5000);
                }}
                uploadToServer={true}
                aspectRatio={3} // Wider aspect ratio for signatures (3:1)
                enableCrop={true}
                minWidth={300} // Minimum width for signatures
                minHeight={100} // Minimum height for signatures
                autoScale={true}
                options={{
                  maxSizeKB: 1024, // 1MB max for signatures
                  quality: 0.9,
                  maxWidth: 600,
                  maxHeight: 200
                }}
              />
            </div>
          </div>
        </div>


*/