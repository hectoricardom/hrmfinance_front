import { Component, Show, For, createSignal, onMount } from 'solid-js';
import { Card, Button, FormSelect } from '../../ui';
import { CubanPassportForm as CubanPassportData } from '../types/cubanPassport';
import { useTranslation } from '../../../translations';
import Icon from '../../../components/Icon';
// import { generateDetailedCubanPassportPDF } from '../../../services/cubanPassportDetailedPdf';
import { generateCubanPassportPDF } from '../../../services/cubanPassportPdfFiller';
import { authStore } from '../../../stores/authStore';
import { createSignatureRequest } from '../../../services/signatureRequest';
import { useModal } from '../../../contexts/ModalContext';
import cubanPassportApiService from '../services/cubanPassportApiService';
import { devLog } from '../../../services/utils';
// import { generateCubanPassportPDF } from '../services/cubanPassportPdfFiller';

interface CubanPassportViewProps {
  data: CubanPassportData;
  application: any;
  onEdit?: () => void;
  onClose?: () => void;
  navigateTo?: (path:string) => void;
}

const CubanPassportView: Component<CubanPassportViewProps> = (props) => {
 
  const { t } = useTranslation();
  const [printing, setPrinting] = createSignal(false);
  const [downloading, setDownloading] = createSignal(false);
  const [creatingSignatureRequest, setCreatingSignatureRequest] = createSignal(false);
  const [changingStatus, setChangingStatus] = createSignal(false);
  const [showStatusChange, setShowStatusChange] = createSignal(false);
  const [selectedStatus, setSelectedStatus] = createSignal(props.application?.status || 'draft');
  //const navigate = useNavigate();

 
  const handlePrint = async () => {
    setPrinting(true);
    //
    
    let blob = await generateCubanPassportPDF(props.data);
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl); 
    setTimeout(() => setPrinting(false), 1000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let blob = await generateCubanPassportPDF(props.data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pasaporte-cubano-${props.data.nombres}-${props.data.apellidos}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      devLog('Error downloading PDF:', error);
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  const handleCreateSignatureRequest = async () => {
    const data = props.data;
    
    if (!data.primerNombre || !data.primerApellido) {
      alert('Se requiere el nombre y apellido del cliente para crear la solicitud de firma');
      return;
    }

    setCreatingSignatureRequest(true);
    
    try {
      const clientName = `${data.primerNombre} ${data.primerApellido}`.trim();
      const clientId = data.pasaporteAnterior?.numero || props.application?.applicationNumber || 'N/A';
      const refId = data.id || props.application?.applicationNumber || 'N/A';
      
      const request = await createSignatureRequest({
        refId: refId,
        clientId: clientId,
        clientName: clientName,
        clientEmail: data.email || '',
        clientPhone: data.telefono || '',
        documentType: 'Pasaporte Cubano',
        notes: `Firma para solicitud de pasaporte cubano de ${clientName}`,
        storeId: data.storeId,
        businessId:  authStore.getBusinessId(),
        storeName: data.storeName
      }, 7); // 7 days expiration



      // Use accessToken for public access (no login required)
      const token = request.accessToken || request.id;
      const signatureUrl = `${window.location.origin}/#/signature/${token}`;
      devLog('Opening signature URL:', signatureUrl);
      window.open(signatureUrl, '_blank');
      
    } catch (error) {
      devLog('Error creating signature request:', error);
      alert('Error al crear la solicitud de firma');
    } finally {
      setCreatingSignatureRequest(false);
    }
  };

  const formatDate = (day?: string, month?: string, year?: string) => {
    if (!day || !month || !year) return 'N/A';
    return `${day}/${month}/${year}`;
  };

  const openImage = (v:string) => {
    if(!v) return null;
    let url = `https://ssgloghr.com${v}?format=jpeg`;
    window.open(url, '_blank').focus();
  }

  const urlP = (v:string): string => {
  
    if(!v) return "";
    return `https://ssgloghr.com${v}?format=webp&width=900&height=900`
  }


  const handleStatusChange = async () => {
    if (!props.application?.id) return;
    
    setChangingStatus(true);
    try {
      await cubanPassportApiService.updatePassportApplication(props.application.id, {
        status: selectedStatus() as any
      });
      
      // Update the application status locally
      if (props.application) {
        props.application.status = selectedStatus();
      }
      
      setShowStatusChange(false);
      alert('Estado actualizado exitosamente');
      
      // Refresh the page or trigger parent refresh
      if (props.onEdit) {
        props.onEdit();
      }
    } catch (error) {
      devLog('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setChangingStatus(false);
    }
  };

  const sendToPDFSignature = () => {
     const data = props.data;
    
      const clientName = `${data.primerNombre} ${data.primerApellido}`.trim();
     
      // Store the signature data in sessionStorage to pass to PDF signature page
      const signatureData = {
        imageData: data?.signatureBase64, // Base64 data - no CORS issues!
        clientName: clientName,
        requestId: data?.signatureRequestId,
        //signedAt: request.signedAt?.toDate().toISOString()
      };
      
      sessionStorage.setItem('pendingSignature', JSON.stringify(signatureData));
      props?.onClose();
      props?.navigateTo('/pdf-signature');
    };


  const sectionStyle = {
    'margin-bottom': '2rem',
    'border-bottom': '1px solid var(--border-color)',
    'padding-bottom': '1.5rem'
  };

  const labelStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.25rem',
    display: 'block'
  };

  const valueStyle = {
    color: 'var(--text-secondary)',
    'margin-bottom': '1rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.75in;
          }
          
          .passport-print-content {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
            color: #000 !important;
          }
          
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          
          .print-break {
            page-break-before: always !important;
          }
          
          h2, h3 {
            color: #000 !important;
            font-weight: bold !important;
            margin: 10px 0 !important;
          }
          
          .passport-header {
            text-align: center;
            margin-bottom: 20px !important;
            padding-bottom: 15px !important;
            border-bottom: 2px solid #000 !important;
            page-break-inside: avoid;
          }
          
          .passport-header h2 {
            font-size: 18px !important;
            margin-bottom: 8px !important;
          }
          
          .passport-header p {
            font-size: 12px !important;
            margin: 4px 0 !important;
          }
          
          .section-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 15px !important;
            page-break-inside: avoid;
          }
          
          .section-grid > div {
            margin-bottom: 8px !important;
          }
          
          .section-grid span {
            display: block !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          
          .section-grid span:first-child {
            font-weight: bold !important;
            margin-bottom: 2px !important;
          }
          
          .section-grid span:last-child {
            color: #333 !important;
          }
          
          .section-style {
            margin-bottom: 20px !important;
            padding-bottom: 15px !important;
            border-bottom: 1px solid #ddd !important;
            page-break-inside: avoid;
          }
          
          h3 {
            font-size: 14px !important;
            margin: 15px 0 8px 0 !important;
            page-break-after: avoid;
          }
          
          /* Signature section */
          div[style*="margin-top: 2rem"] {
            margin-top: 20px !important;
            page-break-inside: avoid;
          }
          
          /* Photo styling for print */
          img[alt*="pasaporte"] {
            max-width: 150px !important;
            max-height: 150px !important;
            border: 2px solid #000 !important;
          }
          
          /* Signature images */
          img[alt*="Firma"] {
            max-width: 200px !important;
            max-height: 100px !important;
          }
          
          /* General image fallback */
          img {
            max-width: 200px !important;
            max-height: 150px !important;
          }
          
          /* Footer */
          div[style*="margin-top: 3rem"] {
            margin-top: 30px !important;
            font-size: 10px !important;
            page-break-inside: avoid;
          }
        }
        
        @media screen {
          .print-break {
            border-top: 2px dashed #ccc;
            margin-top: 2rem;
            padding-top: 2rem;
          }
        }
      `}</style>

      <Card>
        <div class="passport-print-content" style={{ padding: '2rem' }}>
          {/* Header */}
          <div class="passport-header" style={{ 
            'text-align': 'center', 
            'margin-bottom': '2rem',
            'padding-bottom': '1rem',
            'border-bottom': printing() ? '2px solid #000' : '2px solid var(--border-color)'
          }}>
            <h2 style={{ 
              'font-size': '1.75rem', 
              'font-weight': '700',
              'margin-bottom': '0.5rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              SOLICITUD DE PASAPORTE CUBANO
            </h2>
            <p style={{ 
              'font-size': '1rem',
              color: printing() ? '#000' : 'var(--text-muted)'
            }}>
              Fecha de Solicitud: {props.data.fechaSolicitud || new Date().toLocaleDateString()}
            </p>
            <Show when={props.data.numeroFormulario}>
              <p style={{ 
                'font-size': '0.875rem',
                color: printing() ? '#000' : 'var(--text-muted)'
              }}>
                Número de Formulario: {props.data.numeroFormulario}
              </p>
            </Show>
          </div>

          {/* Action Buttons - Hidden when printing */}
          <div class="no-print" style={{ 
            display: 'flex', 
            gap: '1rem', 
            'justify-content': 'flex-end',
            'margin-bottom': '2rem'
          }}>
            <Button onClick={handlePrint} variant="primary" disabled={printing()}>
              <Icon name="print" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              {printing() ? 'Imprimiendo...' : 'Imprimir'}
            </Button>
            <Show when={authStore.state?.profile?.AdminPassportAccess}>

              <Button onClick={handleCreateSignatureRequest} variant="success" disabled={creatingSignatureRequest()}>
                <Icon name="signature" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                <Show when={creatingSignatureRequest()} fallback="Crear Solicitud de Firma">
                  Creando...
                </Show>
              </Button>
              <Button
                variant="primary"
                onClick={() => sendToPDFSignature()}
              >
                <Icon name="document" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                Usar en PDF
              </Button>
            </Show>
            <Show when={authStore.state?.profile?.PassportAccess || authStore.isAdmin()}>
              <Button 
                onClick={() => setShowStatusChange(!showStatusChange())} 
                variant="outline"
              >
                <Icon name="refresh-cw" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                Cambiar Estado
              </Button>
            </Show>
            <Show when={(props.onEdit &&  authStore.isOwner(props?.application?.createdBy)) || authStore.isAdmin()}>
              <Button onClick={props.onEdit} variant="secondary">
                <Icon name="edit" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                Editar
              </Button>
            </Show>
            <Show when={props.onClose}>
              <Button onClick={props.onClose} variant="outline">
                Cerrar
              </Button>
            </Show>
          </div>

          {/* Status Change Form */}
          <Show when={showStatusChange()}>
            <div style={{
              padding: '1rem',
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '2rem'
            }}>
              <h4 style={{ 
                'font-size': '1rem', 
                'font-weight': '600',
                'margin-bottom': '1rem'
              }}>
                Cambiar Estado de la Solicitud
              </h4>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': '1fr auto auto',
                gap: '1rem',
                'align-items': 'end'
              }}>
                <FormSelect
                  label="Nuevo Estado"
                  value={selectedStatus()}
                  onChange={setSelectedStatus}
                  options={[
                    { value: 'draft', label: 'Borrador' },
                    { value: 'submitted', label: 'Enviado' },
                    { value: 'processing', label: 'En Proceso' },
                    { value: 'completed', label: 'Completado' },
                    { value: 'rejected', label: 'Rechazado' }
                  ]}
                />
                <Button 
                  onClick={handleStatusChange} 
                  variant="primary"
                  disabled={changingStatus() || selectedStatus() === props.application?.status}
                >
                  {changingStatus() ? 'Actualizando...' : 'Actualizar'}
                </Button>
                <Button 
                  onClick={() => setShowStatusChange(false)} 
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
              <p style={{
                'font-size': '0.875rem',
                color: 'var(--text-muted)',
                'margin-top': '0.5rem'
              }}>
                Estado actual: <strong>{props.application?.status || 'draft'}</strong>
              </p>
            </div>
          </Show>

          {/* Personal Information */}
          <div style={sectionStyle} class="section-style">
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Datos Personales
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>Primer Apellido:</span>
                <span style={valueStyle}>{props.data.primerApellido || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Segundo Apellido:</span>
                <span style={valueStyle}>{props.data.segundoApellido || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Primer Nombre:</span>
                <span style={valueStyle}>{props.data.primerNombre || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Segundo Nombre:</span>
                <span style={valueStyle}>{props.data.segundoNombre || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Nombre de la Madre:</span>
                <span style={valueStyle}>{props.data.nombre || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Nombre del Padre:</span>
                <span style={valueStyle}>{props.data.padre || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>CID:</span>
                <span style={valueStyle}>{props.data.cid || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Physical Characteristics */}
          <div style={sectionStyle} class="section-style">
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Características Físicas
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>Sexo:</span>
                <span style={valueStyle}>{props.data.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>
              </div>
              <div>
                <span style={labelStyle}>Color de Piel:</span>
                <span style={valueStyle}>{props.data.colorPiel || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Color de Cabello:</span>
                <span style={valueStyle}>{props.data.colorCabello || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Color de Ojos:</span>
                <span style={valueStyle}>{props.data.colorOjos || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Estatura:</span>
                <span style={valueStyle}>{props.data.estatura ? `${props.data.estatura} cm` : 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Características Especiales:</span>
                <span style={valueStyle}>{props.data.caracteristicasEspeciales || 'NINGUNA'}</span>
              </div>
            </div>
          </div>

          {/* Birth Information */}
          <div style={sectionStyle} class="section-style">
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Lugar de Nacimiento
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>País:</span>
                <span style={valueStyle}>{props.data.lugarNacimiento?.pais || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Provincia:</span>
                <span style={valueStyle}>{props.data.lugarNacimiento?.provincia || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Municipio:</span>
                <span style={valueStyle}>{props.data.lugarNacimiento?.municipio || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Fecha de Nacimiento:</span>
                <span style={valueStyle}>
                  {formatDate(
                    props.data.lugarNacimiento?.diaNacimiento,
                    props.data.lugarNacimiento?.mesNacimiento,
                    props.data.lugarNacimiento?.anoNacimiento
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Current Address */}
          <div style={sectionStyle} class="section-style">
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Dirección Actual
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>Calle:</span>
                <span style={valueStyle}>{props.data.direccionActual?.calle || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Ciudad/Provincia:</span>
                <span style={valueStyle}>{props.data.direccionActual?.provincia || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Municipio/Estado:</span>
                <span style={valueStyle}>{props.data.direccionActual?.municipio || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>País:</span>
                <span style={valueStyle}>{props.data.direccionActual?.pais || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Código Postal:</span>
                <span style={valueStyle}>{props.data.direccionActual?.codigoPostal || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div style={sectionStyle} class="section-style">
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Información de Contacto
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>Teléfono:</span>
                <span style={valueStyle}>{props.data.telefono || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Fax:</span>
                <span style={valueStyle}>{props.data.fax || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Email:</span>
                <span style={valueStyle}>{props.data.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Work Information - Page break for printing */}
          <div class="print-break section-style" style={sectionStyle}>
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Datos Laborales
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>Ocupación:</span>
                <span style={valueStyle}>{props.data.datosLaborales?.ocupacion || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Profesión:</span>
                <span style={valueStyle}>{props.data.datosLaborales?.profesion || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Nivel Escolar:</span>
                <span style={valueStyle}>{props.data.datosLaborales?.nivelEscolar || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Centro de Trabajo:</span>
                <span style={valueStyle}>{props.data.datosLaborales?.nombreCentroTrabajo || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Dirección del Centro:</span>
                <span style={valueStyle}>{props.data.datosLaborales?.direccionCentro || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Teléfono del Centro:</span>
                <span style={valueStyle}>{props.data.datosLaborales?.telefonoCentro || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Reference in Cuba */}
          <div style={sectionStyle} class="section-style">
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Referencia en Cuba
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>Nombre:</span>
                <span style={valueStyle}>{props.data.referenciaEnCuba?.nombre || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Parentesco:</span>
                <span style={valueStyle}>{props.data.referenciaEnCuba?.parentesco || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Teléfono:</span>
                <span style={valueStyle}>{props.data.referenciaEnCuba?.telefono || 'N/A'}</span>
              </div>
              <div style={{ 'grid-column': 'span 2' }}>
                <span style={labelStyle}>Dirección:</span>
                <span style={valueStyle}>{props.data.referenciaEnCuba?.direccion || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Previous Passport */}
          <Show when={props.data.pasaporteAnterior?.numero}>
            <div style={sectionStyle} class="section-style">
              <h3 style={{ 
                'font-size': '1.25rem', 
                'font-weight': '600',
                'margin-bottom': '1rem',
                color: printing() ? '#000' : 'var(--text-primary)'
              }}>
                Pasaporte Anterior
              </h3>
              <div class="section-grid" style={gridStyle}>
                <div>
                  <span style={labelStyle}>Número:</span>
                  <span style={valueStyle}>{props.data.pasaporteAnterior?.numero || 'N/A'}</span>
                </div>
                <div>
                  <span style={labelStyle}>Fecha de Expedición:</span>
                  <span style={valueStyle}>{props.data.pasaporteAnterior?.fechaExpedicion || 'N/A'}</span>
                </div>
                <div>
                  <span style={labelStyle}>Lugar de Expedición:</span>
                  <span style={valueStyle}>{props.data.pasaporteAnterior?.lugar || 'N/A'}</span>
                </div>
              </div>
            </div>
          </Show>

          {/* Birth Certificate */}
          <div style={sectionStyle} class="section-style">
            <h3 style={{ 
              'font-size': '1.25rem', 
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: printing() ? '#000' : 'var(--text-primary)'
            }}>
              Certificación de Nacimiento
            </h3>
            <div class="section-grid" style={gridStyle}>
              <div>
                <span style={labelStyle}>Tomo:</span>
                <span style={valueStyle}>{props.data.certificadoNacimiento?.tomo || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Folio:</span>
                <span style={valueStyle}>{props.data.certificadoNacimiento?.folio || 'N/A'}</span>
              </div>
              <div>
                <span style={labelStyle}>Registro Civil:</span>
                <span style={valueStyle}>{props.data.certificadoNacimiento?.registroCivil || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Store Information */}
          <Show when={props.data.storeId || props.data.storeName}>
            <div style={sectionStyle} class="section-style">
              <h3 style={{ 
                'font-size': '1.25rem', 
                'font-weight': '600',
                'margin-bottom': '1rem',
                color: printing() ? '#000' : 'var(--text-primary)'
              }}>
                Información de la Tienda
              </h3>
              <div class="section-grid" style={gridStyle}>
                <div>
                  <span style={labelStyle}>Tienda:</span>
                  <span style={valueStyle}>{props.data.storeName || props.data.storeId || 'N/A'}</span>
                </div>
              </div>
            </div>
          </Show>

          {/* Photograph */}
          <Show when={props.data.fotoUrl || props.data.fotoBase64}>
            <div style={sectionStyle} class="section-style">
              <h3 style={{ 
                'font-size': '1.25rem', 
                'font-weight': '600',
                'margin-bottom': '1rem',
                color: printing() ? '#000' : 'var(--text-primary)'
              }}>
                Fotografía para Pasaporte
              </h3>
              <div 
             
              style={{ 
                'text-align': 'center',
                'margin-bottom': '1rem'
              }}>
                <img
                  onClick={()=>openImage(props.data.fotoUrl)} 
                  src={urlP(props.data.fotoUrl) || props.data.fotoBase64} 
                  alt="Fotografía para pasaporte"
                  style={{
                    'max-width': '200px',
                    'max-height': '200px',
                    border: '2px solid var(--border-color)',
                    'border-radius': '4px',
                    'object-fit': 'cover'
                  }}
                />
                <p style={{
                  'font-size': '0.875rem',
                  color: printing() ? '#666' : 'var(--text-muted)',
                  'margin-top': '0.5rem'
                }}>
                  Fotografía tamaño pasaporte (4.5 x 4.5 cm)
                </p>
              </div>
            </div>
          </Show>

          {/* Signature */}
          <Show when={props.data.firmaUrl || props.data.signatureBase64 || props.data.firmaBase64}>
            <div style={{ 
              'margin-top': '2rem',
              'text-align': 'center',
              'page-break-inside': 'avoid'
            }}>
              <h3 style={{ 
                'font-size': '1.25rem', 
                'font-weight': '600',
                'margin-bottom': '1rem',
                color: printing() ? '#000' : 'var(--text-primary)'
              }}>
                Firma del Solicitante
              </h3>
              <img
                onClick={()=>openImage(props.data.firmaUrl)} 
                src={urlP(props.data.firmaUrl) || props.data.signatureBase64 ||props.data.firmaBase64} 
                alt="Firma"
                style={{
                  'max-width': '300px',
                  'max-height': '150px',
                  padding: '0.5rem',
                  background: 'white'
                }}
              />
            </div>
          </Show>

          {/* Footer for printing */}
          <div style={{ 
            'margin-top': '3rem',
            'text-align': 'center',
            'font-size': '0.875rem',
            color: printing() ? '#666' : 'var(--text-muted)'
          }}>
            <p>Documento generado el {new Date().toLocaleString()}</p>
          </div>
        </div>
      </Card>
    </>
  );
};

export default CubanPassportView;