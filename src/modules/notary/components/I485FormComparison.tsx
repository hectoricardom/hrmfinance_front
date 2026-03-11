import { Component, createSignal, For, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { NotaryCustomer } from '../types';
import {
  extractPDFFormFields,
  parseI485Fields,
  compareI485WithClient,
  ComparisonResult,
  FieldComparison,
  I485FormData
} from '../services/pdfFormReader';
import PDFFieldMapper from './PDFFieldMapper';
import { devLog } from '../../../services/utils';

interface I485FormComparisonProps {
  customer: NotaryCustomer;
  onClose?: () => void;
}

const I485FormComparison: Component<I485FormComparisonProps> = (props) => {
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [formData, setFormData] = createSignal<I485FormData | null>(null);
  const [comparisonResult, setComparisonResult] = createSignal<ComparisonResult | null>(null);
  const [dragOver, setDragOver] = createSignal(false);
  const [viewMode, setViewMode] = createSignal<'table' | 'visual'>('table');

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor selecciona un archivo PDF');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setFormData(null);
    setComparisonResult(null);
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

  // Process PDF and compare
  const handleProcessPDF = async () => {
    const file = selectedFile();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      devLog('Extracting PDF form fields...');
      const fields = await extractPDFFormFields(file);
      devLog('Extracted fields:', fields);

      devLog('Parsing I-485 form data...');
      const parsed = parseI485Fields(fields);
      devLog('Parsed form data:', parsed);
      setFormData(parsed);

      devLog('Comparing with client data...');
      const comparison = compareI485WithClient(parsed, props.customer);
      devLog('Comparison result:', comparison);
      setComparisonResult(comparison);

    } catch (err) {
      devLog('Error processing PDF:', err);
      setError(err instanceof Error ? err.message : 'Error procesando el PDF');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    padding: '2rem',
    'margin-bottom': '1.5rem'
  };

  const dropZoneStyle = {
    border: `2px dashed ${dragOver() ? 'var(--primary-color)' : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius)',
    padding: '3rem',
    'text-align': 'center' as const,
    background: dragOver() ? 'var(--primary-light)' : 'var(--gray-50)',
    transition: 'all 0.2s',
    cursor: 'pointer',
    'margin-bottom': '1rem'
  };

  const getMatchIcon = (matches: boolean) => matches ? '✅' : '❌';
  const getMatchColor = (matches: boolean) => matches ? 'var(--success-color)' : 'var(--danger-color)';

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'var(--text-muted)';
    if (confidence >= 0.9) return 'var(--success-color)';
    if (confidence >= 0.7) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  return (
    <div style={{ 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem'
      }}>
        <div>
          <h2 style={{
            'font-size': '1.75rem',
            'font-weight': '700',
            color: 'var(--text-primary)',
            'margin-bottom': '0.5rem'
          }}>
            📋 Comparación de Formulario I-485
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Cliente: {props.customer.firstName} {props.customer.lastName}
          </p>
        </div>
        <Show when={props.onClose}>
          <Button variant="outline" onClick={props.onClose}>
            ✕ Cerrar
          </Button>
        </Show>
      </div>

      {/* File Upload Section */}
      <Card>
        <div style={cardStyle}>
          <h3 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
            1. Cargar Formulario I-485 (PDF)
          </h3>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={dropZoneStyle}
            onClick={() => document.getElementById('pdfFileInput')?.click()}
          >
            <Show when={!selectedFile()}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>
                📄
              </div>
              <div style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                Arrastra el PDF del formulario I-485 aquí
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                o haz clic para seleccionar
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
            id="pdfFileInput"
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {/* Action Buttons */}
          <Show when={selectedFile() && !comparisonResult()}>
            <div style={{ display: 'flex', gap: '1rem', 'margin-top': '1rem' }}>
              <Button
                variant="primary"
                onClick={handleProcessPDF}
                disabled={loading()}
                style={{ flex: 1 }}
              >
                {loading() ? '🔄 Procesando...' : '🔍 Analizar y Comparar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setFormData(null);
                  setComparisonResult(null);
                  setError(null);
                }}
              >
                ✕ Cancelar
              </Button>
            </div>
          </Show>

          {/* View Mode Selector (after analysis) */}
          <Show when={selectedFile() && comparisonResult()}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              'margin-top': '1rem',
              padding: '0.5rem',
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius)',
              'justify-content': 'center'
            }}>
              <Button
                size="sm"
                variant={viewMode() === 'table' ? 'primary' : 'outline'}
                onClick={() => setViewMode('table')}
              >
                📊 Vista de Tabla
              </Button>
              <Button
                size="sm"
                variant={viewMode() === 'visual' ? 'primary' : 'outline'}
                onClick={() => setViewMode('visual')}
              >
                🔍 Vista Visual del PDF
              </Button>
            </div>
          </Show>

          {/* Error Message */}
          <Show when={error()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              background: 'var(--danger-light)',
              color: 'var(--danger-color)',
              'border-radius': 'var(--border-radius)',
              border: '1px solid var(--danger-color)'
            }}>
              <strong>⚠️ Error:</strong> {error()}
            </div>
          </Show>
        </div>
      </Card>

      {/* Visual PDF Mapper View */}
      <Show when={comparisonResult() && selectedFile() && viewMode() === 'visual'}>
        <PDFFieldMapper
          pdfFile={selectedFile()!}
          customer={props.customer}
          onClose={() => setViewMode('table')}
        />
      </Show>

      {/* Comparison Results Table View */}
      <Show when={comparisonResult() && viewMode() === 'table'}>
        <Card>
          <div style={cardStyle}>
            <h3 style={{ 'margin-bottom': '1.5rem', 'font-weight': '600' }}>
              2. Resultados de la Comparación
            </h3>

            {/* Summary Statistics */}
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'margin-bottom': '2rem'
            }}>
              <div style={{
                padding: '1.5rem',
                background: 'var(--info-light)',
                'border-radius': 'var(--border-radius)',
                'text-align': 'center' as const
              }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--info-color)' }}>
                  {comparisonResult()!.totalFields}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                  Campos Totales
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--success-light)',
                'border-radius': 'var(--border-radius)',
                'text-align': 'center' as const
              }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--success-color)' }}>
                  {comparisonResult()!.matchingFields}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                  Coincidencias
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--danger-light)',
                'border-radius': 'var(--border-radius)',
                'text-align': 'center' as const
              }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--danger-color)' }}>
                  {comparisonResult()!.mismatchingFields}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                  Discrepancias
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--primary-light)',
                'border-radius': 'var(--border-radius)',
                'text-align': 'center' as const
              }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                  {comparisonResult()!.matchPercentage.toFixed(1)}%
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                  Exactitud
                </div>
              </div>
            </div>

            {/* Errors */}
            <Show when={comparisonResult()!.errors.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--danger-light)',
                'border-radius': 'var(--border-radius)',
                'margin-bottom': '1.5rem',
                border: '1px solid var(--danger-color)'
              }}>
                <strong>🚨 Errores Críticos:</strong>
                <ul style={{ 'margin-top': '0.5rem', 'margin-bottom': '0', 'padding-left': '1.5rem' }}>
                  <For each={comparisonResult()!.errors}>
                    {(error) => <li>{error}</li>}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Warnings */}
            <Show when={comparisonResult()!.warnings.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--warning-light)',
                'border-radius': 'var(--border-radius)',
                'margin-bottom': '1.5rem',
                border: '1px solid var(--warning-color)'
              }}>
                <strong>⚠️ Advertencias:</strong>
                <ul style={{ 'margin-top': '0.5rem', 'margin-bottom': '0', 'padding-left': '1.5rem' }}>
                  <For each={comparisonResult()!.warnings}>
                    {(warning) => <li>{warning}</li>}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Detailed Comparison Table */}
            <h4 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>
              Comparación Detallada de Campos
            </h4>

            <div style={{
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius)',
              overflow: 'hidden'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                'grid-template-columns': 'auto 2fr 2fr 2fr 1fr',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--gray-100)',
                'font-weight': '600',
                'font-size': '0.875rem',
                'border-bottom': '2px solid var(--border-color)'
              }}>
                <div></div>
                <div>Campo</div>
                <div>Valor en Formulario</div>
                <div>Valor en Cliente</div>
                <div style={{ 'text-align': 'center' as const }}>Confianza</div>
              </div>

              {/* Table Rows */}
              <For each={comparisonResult()!.comparisons}>
                {(comparison, index) => (
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'auto 2fr 2fr 2fr 1fr',
                    gap: '1rem',
                    padding: '1rem',
                    'border-bottom': index() < comparisonResult()!.comparisons.length - 1 ? '1px solid var(--border-color)' : 'none',
                    background: comparison.matches ? 'white' : 'var(--danger-light)',
                    'align-items': 'center'
                  }}>
                    <div style={{
                      'font-size': '1.25rem',
                      'text-align': 'center' as const
                    }}>
                      {getMatchIcon(comparison.matches)}
                    </div>

                    <div style={{ 'font-weight': '500' }}>
                      {comparison.fieldName}
                      <Show when={comparison.notes}>
                        <div style={{
                          'font-size': '0.75rem',
                          color: 'var(--text-muted)',
                          'margin-top': '0.25rem',
                          'font-weight': '400'
                        }}>
                          {comparison.notes}
                        </div>
                      </Show>
                    </div>

                    <div style={{
                      'font-family': 'monospace',
                      'font-size': '0.875rem',
                      color: comparison.formValue ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>
                      {comparison.formValue || '(vacío)'}
                    </div>

                    <div style={{
                      'font-family': 'monospace',
                      'font-size': '0.875rem',
                      color: comparison.clientValue ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>
                      {comparison.clientValue || '(vacío)'}
                    </div>

                    <div style={{
                      'text-align': 'center' as const,
                      'font-weight': '600',
                      color: getConfidenceColor(comparison.confidence)
                    }}>
                      {comparison.confidence !== undefined
                        ? `${(comparison.confidence * 100).toFixed(0)}%`
                        : '-'
                      }
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              'margin-top': '2rem',
              'justify-content': 'flex-end'
            }}>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setFormData(null);
                  setComparisonResult(null);
                  setError(null);
                }}
              >
                🔄 Analizar Otro Formulario
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // Export results as JSON
                  const dataStr = JSON.stringify({
                    customer: {
                      id: props.customer.clientNotaryId,
                      name: `${props.customer.firstName} ${props.customer.lastName}`
                    },
                    formData: formData(),
                    comparison: comparisonResult()
                  }, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `I485-Comparison-${props.customer.clientNotaryId}-${Date.now()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                💾 Exportar Resultados (JSON)
              </Button>
            </div>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export default I485FormComparison;
