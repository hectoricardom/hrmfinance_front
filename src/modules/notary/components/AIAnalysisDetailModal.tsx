import { Component, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Card, Button } from '../../ui';
import {
  NotaryDocument,
  AIDocumentAnalysis,
  DOCUMENT_TYPE_LABELS,
  DocumentType
} from '../types/documents';
import { devLog } from '../../../services/utils';

interface AIAnalysisDetailModalProps {
  document: NotaryDocument;
  isOpen: boolean;
  onClose: () => void;
}

const AIAnalysisDetailModal: Component<AIAnalysisDetailModalProps> = (props) => {
  const analysis = () => {
    // Debug log
    devLog('AIAnalysisDetailModal - Document:', props.document);
    devLog('AIAnalysisDetailModal - AI Analysis:', props.document.aiAnalysis);
    devLog('AIAnalysisDetailModal - AI Result:', props.document.aiResult);

    return props.document.aiAnalysis || props.document.aiResult;
  };

  const overlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': 9999,
    padding: '2rem',
    'overflow-y': 'auto'
  };

  const modalStyle = {
    background: 'white',
    'border-radius': 'var(--border-radius)',
    'max-width': '900px',
    width: '100%',
    'max-height': '90vh',
    'overflow-y': 'auto',
    'box-shadow': '0 20px 60px rgba(0, 0, 0, 0.3)'
  };

  const headerStyle = {
    padding: '1.5rem',
    'border-bottom': '2px solid var(--border-color)',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    background: 'var(--primary-light)'
  };

  const bodyStyle = {
    padding: '2rem'
  };

  const sectionStyle = {
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'var(--gray-50)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const fieldStyle = {
    display: 'grid',
    'grid-template-columns': '200px 1fr',
    gap: '1rem',
    'margin-bottom': '0.75rem',
    padding: '0.5rem',
    background: 'white',
    'border-radius': 'var(--border-radius-sm)'
  };

  const labelStyle = {
    'font-weight': '600',
    color: 'var(--text-muted)'
  };

  const valueStyle = {
    color: 'var(--text-primary)'
  };

  const confidenceBadgeStyle = (confidence: number) => ({
    display: 'inline-block',
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius)',
    'font-weight': '600',
    'font-size': '1.25rem',
    background: confidence >= 0.9 ? 'var(--success-color)' :
                confidence >= 0.7 ? 'var(--warning-color)' :
                'var(--danger-color)',
    color: 'white'
  });

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Muy Alta';
    if (confidence >= 0.7) return 'Alta';
    if (confidence >= 0.5) return 'Media';
    return 'Baja';
  };

  const formatDate = (dateString?: string | number) => {
    if (!dateString) return '-';
    try {
      const date = typeof dateString === 'number'
        ? new Date(dateString)
        : new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch {
      return dateString.toString();
    }
  };

  return (
    <Portal>
      <Show when={props.isOpen && analysis()}>
        <div style={overlayStyle} onClick={props.onClose}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: '0', 'font-size': '1.5rem', 'font-weight': '700' }}>
              🤖 Análisis de IA - Detalles Completos
            </h2>
            <div style={{ 'margin-top': '0.25rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Documento: {props.document.originalFileName || props.document.fileName}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={props.onClose}
            style={{ 'flex-shrink': 0 }}
          >
            ✕ Cerrar
          </Button>
        </div>

        <div style={bodyStyle}>
          {/* Confidence Score Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              📊 Confianza del Análisis
            </div>
            <div style={{
              'text-align': 'center',
              padding: '1.5rem',
              background: 'white',
              'border-radius': 'var(--border-radius)'
            }}>
              <div style={confidenceBadgeStyle(analysis()!.confidence)}>
                {(analysis()!.confidence * 100).toFixed(1)}%
              </div>
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '1rem',
                'font-weight': '600',
                color: 'var(--text-muted)'
              }}>
                Confianza {getConfidenceLabel(analysis()!.confidence)}
              </div>
            </div>
          </div>

          {/* Document Classification */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              📄 Clasificación del Documento
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>Tipo Detectado:</div>
              <div style={{ ...valueStyle, 'font-weight': '600', color: 'var(--primary-color)' }}>
                {DOCUMENT_TYPE_LABELS[analysis()!.detectedType]}
              </div>
            </div>

            {/* Alternative Types */}
            <Show when={analysis()!.alternativeTypes && analysis()!.alternativeTypes!.length > 0}>
              <div style={{ 'margin-top': '1rem' }}>
                <div style={{ ...labelStyle, 'margin-bottom': '0.5rem' }}>
                  Tipos Alternativos:
                </div>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                  <For each={analysis()!.alternativeTypes}>
                    {(alt) => (
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: 'white',
                        'border-radius': 'var(--border-radius-sm)',
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center'
                      }}>
                        <span>{DOCUMENT_TYPE_LABELS[alt.type]}</span>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          'border-radius': '9999px',
                          background: 'var(--gray-200)',
                          'font-size': '0.875rem',
                          'font-weight': '600'
                        }}>
                          {(alt.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>

          {/* Extracted Personal Information */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              👤 Información Personal Extraída
            </div>

            <Show when={analysis()!.extractedData.firstName}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Nombre:</div>
                <div style={valueStyle}>{analysis()!.extractedData.firstName}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.middleName}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Segundo Nombre:</div>
                <div style={valueStyle}>{analysis()!.extractedData.middleName}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.lastName}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Apellido:</div>
                <div style={valueStyle}>{analysis()!.extractedData.lastName}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.dateOfBirth}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Fecha de Nacimiento:</div>
                <div style={valueStyle}>{formatDate(analysis()!.extractedData.dateOfBirth)}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.placeOfBirth}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Lugar de Nacimiento:</div>
                <div style={valueStyle}>{analysis()!.extractedData.placeOfBirth}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.gender}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Género:</div>
                <div style={valueStyle}>{analysis()!.extractedData.gender}</div>
              </div>
            </Show>
          </div>

          {/* Document Information */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              📋 Información del Documento
            </div>

            <Show when={analysis()!.extractedData.documentNumber}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Número de Documento:</div>
                <div style={valueStyle}>{analysis()!.extractedData.documentNumber}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.issueDate}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Fecha de Emisión:</div>
                <div style={valueStyle}>{formatDate(analysis()!.extractedData.issueDate)}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.expirationDate}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Fecha de Vencimiento:</div>
                <div style={valueStyle}>{formatDate(analysis()!.extractedData.expirationDate)}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.issuingAuthority}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Autoridad Emisora:</div>
                <div style={valueStyle}>{analysis()!.extractedData.issuingAuthority}</div>
              </div>
            </Show>

            <Show when={analysis()!.extractedData.issuingCountry}>
              <div style={fieldStyle}>
                <div style={labelStyle}>País Emisor:</div>
                <div style={valueStyle}>{analysis()!.extractedData.issuingCountry}</div>
              </div>
            </Show>
          </div>

          {/* Address Information */}
          <Show when={
            analysis()!.extractedData.address ||
            analysis()!.extractedData.city ||
            analysis()!.extractedData.state ||
            analysis()!.extractedData.zipCode ||
            analysis()!.extractedData.country
          }>
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                📍 Dirección
              </div>

              <Show when={analysis()!.extractedData.address}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Dirección:</div>
                  <div style={valueStyle}>{analysis()!.extractedData.address}</div>
                </div>
              </Show>

              <Show when={analysis()!.extractedData.city}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Ciudad:</div>
                  <div style={valueStyle}>{analysis()!.extractedData.city}</div>
                </div>
              </Show>

              <Show when={analysis()!.extractedData.state}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Estado/Provincia:</div>
                  <div style={valueStyle}>{analysis()!.extractedData.state}</div>
                </div>
              </Show>

              <Show when={analysis()!.extractedData.zipCode}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Código Postal:</div>
                  <div style={valueStyle}>{analysis()!.extractedData.zipCode}</div>
                </div>
              </Show>

              <Show when={analysis()!.extractedData.country}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>País:</div>
                  <div style={valueStyle}>{analysis()!.extractedData.country}</div>
                </div>
              </Show>
            </div>
          </Show>

          {/* All Extracted Fields (Flexible Data) */}
          <Show when={Object.keys(analysis()!.extractedData).length > 0}>
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                🗂️ Todos los Datos Extraídos
              </div>
              <div style={{
                padding: '1rem',
                background: 'white',
                'border-radius': 'var(--border-radius-sm)',
                'font-family': 'monospace',
                'font-size': '0.875rem',
                'overflow-x': 'auto'
              }}>
                <pre style={{ margin: '0', 'white-space': 'pre-wrap' }}>
                  {JSON.stringify(analysis()!.extractedData, null, 2)}
                </pre>
              </div>
            </div>
          </Show>

          {/* Full OCR Text */}
          <Show when={analysis()!.fullText}>
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                📝 Texto Completo (OCR)
              </div>
              <div style={{
                padding: '1rem',
                background: 'white',
                'border-radius': 'var(--border-radius-sm)',
                'max-height': '300px',
                'overflow-y': 'auto',
                'font-size': '0.875rem',
                'line-height': '1.6',
                'white-space': 'pre-wrap'
              }}>
                {analysis()!.fullText}
              </div>
            </div>
          </Show>

          {/* Analysis Metadata */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              ⚙️ Metadatos del Análisis
            </div>

            <Show when={analysis()!.model}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Modelo IA:</div>
                <div style={valueStyle}>{analysis()!.model}</div>
              </div>
            </Show>

            <Show when={analysis()!.processingTime}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Tiempo de Procesamiento:</div>
                <div style={valueStyle}>{analysis()!.processingTime}ms</div>
              </div>
            </Show>

            <Show when={props.document.aiAnalyzedAt}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Analizado el:</div>
                <div style={valueStyle}>
                  {new Date(props.document.aiAnalyzedAt!).toLocaleString('es-ES')}
                </div>
              </div>
            </Show>

            <Show when={analysis()!.error}>
              <div style={{
                padding: '1rem',
                background: 'var(--danger-light)',
                'border-radius': 'var(--border-radius-sm)',
                color: 'var(--danger-color)',
                'margin-top': '1rem'
              }}>
                <strong>⚠️ Error:</strong> {analysis()!.error}
              </div>
            </Show>
          </div>

          {/* Close Button */}
          <div style={{ 'text-align': 'center', 'margin-top': '2rem' }}>
            <Button
              variant="primary"
              onClick={props.onClose}
              style={{ 'min-width': '200px' }}
            >
              ✅ Cerrar
            </Button>
          </div>
        </div>
        </div>
        </div>
      </Show>
    </Portal>
  );
};

export default AIAnalysisDetailModal;
