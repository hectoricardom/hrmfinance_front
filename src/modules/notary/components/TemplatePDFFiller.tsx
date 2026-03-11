import { Component, createSignal, For, Show, onMount } from 'solid-js';
import { Card, Button } from '../../ui';
import { NotaryCustomer, FormTemplate } from '../types';
import { loadAllTemplatesFromServer } from '../services/formTemplateService';
import { getValueByPath, evaluateConditional } from '../types/formMapping';
import { PDFDocument } from 'pdf-lib';
import { processClientData, createMergedCustomerData } from '../services/clientDataProcessor';
import { devLog } from '../../../services/utils';

interface TemplatePDFFillerProps {
  customer: NotaryCustomer;
  onClose?: () => void;
}

const TemplatePDFFiller: Component<TemplatePDFFillerProps> = (props) => {
  const [templates, setTemplates] = createSignal<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = createSignal<FormTemplate | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [filling, setFilling] = createSignal(false);
  const [result, setResult] = createSignal<string | null>(null);
  const [pdfFile, setPdfFile] = createSignal<File | null>(null);

  // Load templates from server
  onMount(async () => {
    setLoading(true);
    try {
      const loadedTemplates = await loadAllTemplatesFromServer();
      setTemplates(loadedTemplates);
      devLog('Loaded templates:', loadedTemplates);
    } catch (error) {
      devLog('Error loading templates:', error);
      setResult('❌ Error cargando templates');
    } finally {
      setLoading(false);
    }
  });

  // Handle template selection
  const handleTemplateSelect = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setResult(null);
    setPdfFile(null);

    // Prompt user to upload the PDF file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setPdfFile(file);
        devLog('PDF file selected:', file.name);
      }
    };
    input.click();
  };

  // Fill PDF with template and customer data
  const handleFillPDF = async () => {
    const template = selectedTemplate();
    const file = pdfFile();

    if (!template || !file) {
      setResult('❌ Selecciona un template y sube un archivo PDF');
      return;
    }

    setFilling(true);
    setResult(null);

    try {
      // Read PDF file
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();

      // Process customer data (sorts arrays chronologically)
      const processedData = processClientData(props.customer);
      const mergedData = createMergedCustomerData(props.customer, processedData);

      // Parse template fields
      const fields = typeof template.fields === 'string'
        ? JSON.parse(template.fields)
        : template.fields;

      let filledCount = 0;
      let skippedCount = 0;

      // Fill each field according to the template
      for (const fieldMapping of fields) {
        try {
          const pdfField = form.getField(fieldMapping.pdfFieldName);

          // Determine the value to use
          let valueToFill: string | undefined;

          if (fieldMapping.useCustomValue) {
            // Use custom value
            valueToFill = fieldMapping.customValue;
          } else {
            // Use customer data field
            valueToFill = getValueByPath(props.customer, fieldMapping.clientFieldPath);

            // Check conditional rules
            if (fieldMapping.conditional?.enabled) {
              const evaluation = evaluateConditional(
                fieldMapping.conditional,
                mergedData,
                valueToFill
              );

              if (!evaluation.shouldFill) {
                devLog(`Skipping field ${fieldMapping.pdfFieldName}: ${evaluation.reason}`);
                skippedCount++;
                continue;
              }
            }
          }

          // Skip if no value
          if (!valueToFill) {
            skippedCount++;
            continue;
          }

          // Fill based on field type
          if (fieldMapping.pdfFieldType === 'text') {
            pdfField.setText(String(valueToFill));
            filledCount++;
          } else if (fieldMapping.pdfFieldType === 'checkbox') {
            // Check if value is truthy
            const shouldCheck =
              valueToFill === 'true' ||
              valueToFill === 'yes' ||
              valueToFill === 'Yes' ||
              valueToFill === 'YES' ||
              valueToFill === 'si' ||
              valueToFill === 'Sí' ||
              valueToFill === '1' ||
              valueToFill === 'x' ||
              valueToFill === 'X';

            if (shouldCheck) {
              pdfField.check();
              filledCount++;
            }
          }

          devLog(`Filled ${fieldMapping.pdfFieldName} with: ${valueToFill}`);

        } catch (fieldError) {
          devLog(`Error filling field ${fieldMapping.pdfFieldName}:`, fieldError);
        }
      }

      // Flatten form (make fields read-only)
      form.flatten();

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Download PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.formName}_${props.customer.firstName}_${props.customer.lastName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setResult(`✅ PDF llenado exitosamente!\n\n📊 ${filledCount} campos llenados\n⏭️ ${skippedCount} campos omitidos\n\n📥 Descargando archivo...`);

    } catch (error) {
      devLog('Error filling PDF:', error);
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setFilling(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem'
      }}>
        <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
          📄 Llenar PDF con Template
        </h3>
        <Show when={props.onClose}>
          <Button variant="outline" size="sm" onClick={props.onClose}>
            ✕ Cerrar
          </Button>
        </Show>
      </div>

      {/* Customer Info */}
      <div style={{
        padding: '1rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        'border-radius': 'var(--border-radius-sm)',
        'margin-bottom': '1.5rem'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
          Cliente Seleccionado:
        </div>
        <div style={{ 'font-size': '1.1rem' }}>
          {props.customer.firstName} {props.customer.lastName}
        </div>
        <div style={{ 'font-size': '0.875rem', opacity: 0.9, 'margin-top': '0.25rem' }}>
          ID: {props.customer.clientNotaryId} • {props.customer.email || 'Sin email'}
        </div>
      </div>

      {/* Loading */}
      <Show when={loading()}>
        <div style={{
          'text-align': 'center',
          padding: '2rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>⏳</div>
          Cargando templates...
        </div>
      </Show>

      {/* Template List */}
      <Show when={!loading() && templates().length > 0}>
        <Card title="1. Selecciona un Template">
          <div style={{
            'max-height': '400px',
            'overflow-y': 'auto',
            'margin-top': '1rem'
          }}>
            <For each={templates()}>
              {(template) => (
                <div
                  onClick={() => handleTemplateSelect(template)}
                  style={{
                    padding: '1rem',
                    'margin-bottom': '0.5rem',
                    border: selectedTemplate()?.id === template.id
                      ? '2px solid var(--primary-color)'
                      : '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    background: selectedTemplate()?.id === template.id
                      ? 'var(--primary-light)'
                      : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                    {selectedTemplate()?.id === template.id && '✓ '}
                    {template.formName || template.templateName}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    📋 {template.totalFields || 0} campos •
                    📄 {template.totalPages || 0} páginas •
                    🕐 {new Date(template.updatedAt).toLocaleDateString('es-ES')}
                  </div>
                  <Show when={template.description}>
                    <div style={{
                      'font-size': '0.875rem',
                      'margin-top': '0.5rem',
                      color: 'var(--text-muted)'
                    }}>
                      {template.description}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Card>
      </Show>

      {/* No templates */}
      <Show when={!loading() && templates().length === 0}>
        <Card>
          <div style={{
            'text-align': 'center',
            padding: '3rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📭</div>
            <div style={{ 'font-size': '1.1rem', 'margin-bottom': '0.5rem' }}>
              No hay templates disponibles
            </div>
            <div style={{ 'font-size': '0.875rem' }}>
              Crea templates desde el administrador de clientes notariales
            </div>
          </div>
        </Card>
      </Show>

      {/* Selected Template & PDF File */}
      <Show when={selectedTemplate()}>
        <Card title="2. Archivo PDF Seleccionado" style={{ 'margin-top': '1rem' }}>
          <div style={{ padding: '1rem' }}>
            <Show when={pdfFile()}>
              <div style={{
                padding: '1rem',
                background: 'var(--success-light)',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem'
              }}>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  ✓ PDF Cargado:
                </div>
                <div style={{ 'font-size': '0.875rem' }}>
                  📄 {pdfFile()!.name} ({(pdfFile()!.size / 1024).toFixed(2)} KB)
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleFillPDF}
                disabled={filling()}
                style={{ width: '100%' }}
              >
                {filling() ? '⏳ Llenando PDF...' : '📥 Llenar y Descargar PDF'}
              </Button>
            </Show>

            <Show when={!pdfFile()}>
              <div style={{
                padding: '2rem',
                'text-align': 'center',
                color: 'var(--text-muted)',
                border: '2px dashed var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📁</div>
                <div>Haz clic en el template de arriba para seleccionar un archivo PDF</div>
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Result */}
      <Show when={result()}>
        <div style={{
          'margin-top': '1rem',
          padding: '1rem',
          background: result()!.includes('❌') ? 'var(--danger-light)' : 'var(--success-light)',
          'border-radius': 'var(--border-radius-sm)',
          border: `1px solid ${result()!.includes('❌') ? 'var(--danger-color)' : 'var(--success-color)'}`,
          'white-space': 'pre-wrap',
          'font-family': 'monospace',
          'font-size': '0.875rem'
        }}>
          {result()}
        </div>
      </Show>

      {/* Instructions */}
      <div style={{
        'margin-top': '1.5rem',
        padding: '1rem',
        background: 'var(--gray-50)',
        'border-radius': 'var(--border-radius-sm)',
        'font-size': '0.875rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
          📝 Instrucciones:
        </div>
        <ol style={{ margin: '0', 'padding-left': '1.5rem' }}>
          <li>Selecciona un template de la lista</li>
          <li>Sube el archivo PDF original del formulario</li>
          <li>El sistema llenará automáticamente los campos según el mapeo del template</li>
          <li>Los valores personalizados y condicionales se aplicarán automáticamente</li>
          <li>El PDF llenado se descargará automáticamente</li>
        </ol>
      </div>
    </div>
  );
};

export default TemplatePDFFiller;
