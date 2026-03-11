import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { Card, Button } from '../../ui';
import { FormTemplate, FormFieldMapping, CLIENT_FIELD_PATHS, getValueByPath } from '../types/formMapping';
import {
  updateClientFieldPath,
  setFieldOverride,
  removeFieldOverride,
  saveTemplateToServer,
  getTemplateStats
} from '../services/formTemplateService';
import { NotaryCustomer } from '../types';

interface FormMappingEditorProps {
  template: FormTemplate;
  customer?: NotaryCustomer;
  onTemplateUpdate?: (template: FormTemplate) => void;
  onClose?: () => void;
}

const FormMappingEditor: Component<FormMappingEditorProps> = (props) => {
  const [editingField, setEditingField] = createSignal<string | null>(null);
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get template stats
  const stats = createMemo(() => getTemplateStats(props.template.id));

  // Filter mappings
  const filteredMappings = createMemo(() => {
    let mappings = [...props.template.fieldMappings];

    // Filter by search query
    const query = searchQuery().toLowerCase();
    if (query) {
      mappings = mappings.filter(m =>
        m.pdfFieldName.toLowerCase().includes(query) ||
        m.clientFieldPath.toLowerCase().includes(query)
      );
    }

    // Filter by category
    const category = selectedCategory();
    if (category !== 'all') {
      if (category === 'mapped') {
        mappings = mappings.filter(m => m.clientFieldPath !== '(no mapping)');
      } else if (category === 'unmapped') {
        mappings = mappings.filter(m => m.clientFieldPath === '(no mapping)');
      } else if (category === 'manual') {
        mappings = mappings.filter(m => m.mappingSource === 'manual');
      } else if (category === 'low-confidence') {
        mappings = mappings.filter(m => m.confidence < 0.5);
      }
    }

    return mappings;
  });

  // Group client field paths by category
  const clientFieldsByCategory = createMemo(() => {
    const grouped = new Map<string, typeof CLIENT_FIELD_PATHS>();

    CLIENT_FIELD_PATHS.forEach(field => {
      if (!grouped.has(field.category)) {
        grouped.set(field.category, []);
      }
      grouped.get(field.category)!.push(field);
    });

    return grouped;
  });

  // Handle changing a field mapping
  const handleChangeMapping = (pdfFieldName: string, newClientFieldPath: string) => {
    const updated = updateClientFieldPath(
      props.template.id,
      pdfFieldName,
      newClientFieldPath,
      'user'
    );

    if (updated && props.onTemplateUpdate) {
      props.onTemplateUpdate(updated);
    }

    setEditingField(null);
  };

  // Handle setting a manual override
  const handleSetOverride = (pdfFieldName: string, value: string, reason?: string) => {
    const updated = setFieldOverride(
      props.template.id,
      pdfFieldName,
      value,
      reason,
      'user'
    );

    if (updated && props.onTemplateUpdate) {
      props.onTemplateUpdate(updated);
    }
  };

  // Handle removing a manual override
  const handleRemoveOverride = (pdfFieldName: string) => {
    const updated = removeFieldOverride(props.template.id, pdfFieldName);

    if (updated && props.onTemplateUpdate) {
      props.onTemplateUpdate(updated);
    }
  };

  // Handle saving to server
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const result = await saveTemplateToServer(props.template);

    if (result.success) {
      setSaveMessage({ type: 'success', text: '✅ Template guardado exitosamente' });
    } else {
      setSaveMessage({ type: 'error', text: `❌ Error: ${result.error}` });
    }

    setSaving(false);

    // Clear message after 3 seconds
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'var(--success-color)';
    if (confidence >= 0.5) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  // Get confidence label
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.5) return 'Media';
    return 'Baja';
  };

  // Get current value from customer data
  const getCurrentValue = (clientFieldPath: string) => {
    if (!props.customer || clientFieldPath === '(no mapping)') return undefined;
    return getValueByPath(props.customer, clientFieldPath);
  };

  return (
    <div style={{ 'max-width': '1400px', margin: '0 auto' }}>
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
            'margin-bottom': '0.5rem'
          }}>
            🔧 Editor de Mapeo de Campos
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {props.template.formName} {props.template.formVersion && `v${props.template.formVersion}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving()}
          >
            {saving() ? '💾 Guardando...' : '💾 Guardar al Servidor'}
          </Button>
          <Show when={props.onClose}>
            <Button variant="outline" onClick={props.onClose}>
              ✕ Cerrar
            </Button>
          </Show>
        </div>
      </div>

      {/* Save Message */}
      <Show when={saveMessage()}>
        <Card>
          <div style={{
            padding: '1rem',
            background: saveMessage()!.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
            color: saveMessage()!.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1rem'
          }}>
            {saveMessage()!.text}
          </div>
        </Card>
      </Show>

      {/* Statistics */}
      <Card>
        <div style={{
          padding: '1.5rem',
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          'margin-bottom': '1.5rem'
        }}>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700' }}>
              {stats()?.totalFields || 0}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Total Campos
            </div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--success-color)' }}>
              {stats()?.mappedFields || 0}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Mapeados
            </div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--danger-color)' }}>
              {stats()?.unmappedFields || 0}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Sin Mapear
            </div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
              {stats()?.manualMappings || 0}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Manuales
            </div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--info-color)' }}>
              {stats()?.averageConfidence ? (stats()!.averageConfidence * 100).toFixed(0) : 0}%
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Confianza Promedio
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div style={{ padding: '1rem', 'margin-bottom': '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Buscar campo..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              style={{
                flex: 1,
                'min-width': '300px',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />

            {/* Category filters */}
            <select
              value={selectedCategory()}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            >
              <option value="all">Todos los campos</option>
              <option value="mapped">Solo mapeados</option>
              <option value="unmapped">Sin mapear</option>
              <option value="manual">Mapeados manualmente</option>
              <option value="low-confidence">Baja confianza</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Field Mappings Table */}
      <Card>
        <div style={{ overflow: 'auto' }}>
          <table style={{
            width: '100%',
            'border-collapse': 'collapse'
          }}>
            <thead>
              <tr style={{ background: 'var(--gray-100)', 'border-bottom': '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>Campo PDF</th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>Campo Cliente</th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>Valor Actual</th>
                <th style={{ padding: '1rem', 'text-align': 'center', 'font-weight': '600' }}>Confianza</th>
                <th style={{ padding: '1rem', 'text-align': 'center', 'font-weight': '600' }}>Fuente</th>
                <th style={{ padding: '1rem', 'text-align': 'center', 'font-weight': '600' }}>Página</th>
                <th style={{ padding: '1rem', 'text-align': 'center', 'font-weight': '600' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredMappings()}>
                {(mapping) => {
                  const isEditing = editingField() === mapping.pdfFieldName;
                  const currentValue = getCurrentValue(mapping.clientFieldPath);

                  return (
                    <tr style={{
                      'border-bottom': '1px solid var(--border-color)',
                      background: mapping.manualOverride?.enabled ? 'var(--warning-light)' :
                                 mapping.clientFieldPath === '(no mapping)' ? 'var(--danger-light)' : 'white'
                    }}>
                      {/* PDF Field Name */}
                      <td style={{ padding: '1rem', 'font-family': 'monospace', 'font-size': '0.875rem' }}>
                        {mapping.pdfFieldName}
                        <Show when={mapping.manualOverride?.enabled}>
                          <div style={{
                            'font-size': '0.75rem',
                            color: 'var(--warning-color)',
                            'margin-top': '0.25rem'
                          }}>
                            🔒 Override: {mapping.manualOverride?.value}
                          </div>
                        </Show>
                      </td>

                      {/* Client Field Path */}
                      <td style={{ padding: '1rem' }}>
                        <Show when={!isEditing}>
                          <div style={{ 'font-weight': '500' }}>
                            {mapping.clientFieldPath}
                          </div>
                        </Show>
                        <Show when={isEditing}>
                          <select
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--border-color)',
                              'border-radius': 'var(--border-radius-sm)'
                            }}
                            onChange={(e) => handleChangeMapping(mapping.pdfFieldName, e.currentTarget.value)}
                          >
                            <option value="(no mapping)">-- Sin mapear --</option>
                            <For each={Array.from(clientFieldsByCategory().entries())}>
                              {([category, fields]) => (
                                <optgroup label={category.toUpperCase()}>
                                  <For each={fields}>
                                    {(field) => (
                                      <option
                                        value={field.path}
                                        selected={field.path === mapping.clientFieldPath}
                                      >
                                        {field.label} ({field.path})
                                      </option>
                                    )}
                                  </For>
                                </optgroup>
                              )}
                            </For>
                          </select>
                        </Show>
                      </td>

                      {/* Current Value */}
                      <td style={{ padding: '1rem', 'font-size': '0.875rem' }}>
                        <Show when={currentValue !== undefined}>
                          <div style={{
                            'max-width': '200px',
                            overflow: 'hidden',
                            'text-overflow': 'ellipsis',
                            'white-space': 'nowrap'
                          }}>
                            {String(currentValue)}
                          </div>
                        </Show>
                        <Show when={currentValue === undefined}>
                          <span style={{ color: 'var(--text-muted)' }}>(vacío)</span>
                        </Show>
                      </td>

                      {/* Confidence */}
                      <td style={{ padding: '1rem', 'text-align': 'center' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          'border-radius': '999px',
                          'font-weight': '600',
                          'font-size': '0.875rem',
                          color: getConfidenceColor(mapping.confidence),
                          background: `${getConfidenceColor(mapping.confidence)}22`
                        }}>
                          {(mapping.confidence * 100).toFixed(0)}%
                        </div>
                        <div style={{ 'font-size': '0.75rem', 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
                          {getConfidenceLabel(mapping.confidence)}
                        </div>
                      </td>

                      {/* Source */}
                      <td style={{ padding: '1rem', 'text-align': 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          'border-radius': 'var(--border-radius-sm)',
                          'font-size': '0.75rem',
                          background: mapping.mappingSource === 'manual' ? 'var(--primary-light)' : 'var(--info-light)',
                          color: mapping.mappingSource === 'manual' ? 'var(--primary-color)' : 'var(--info-color)'
                        }}>
                          {mapping.mappingSource === 'manual' ? '👤 Manual' : '🤖 IA'}
                        </span>
                      </td>

                      {/* Page */}
                      <td style={{ padding: '1rem', 'text-align': 'center', 'font-size': '0.875rem' }}>
                        {mapping.page}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', 'text-align': 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', 'justify-content': 'center' }}>
                          <Show when={!isEditing}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingField(mapping.pdfFieldName)}
                            >
                              ✏️
                            </Button>
                          </Show>
                          <Show when={isEditing}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingField(null)}
                            >
                              ✕
                            </Button>
                          </Show>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>

          <Show when={filteredMappings().length === 0}>
            <div style={{
              padding: '3rem',
              'text-align': 'center',
              color: 'var(--text-muted)'
            }}>
              No se encontraron campos con los filtros seleccionados
            </div>
          </Show>
        </div>
      </Card>
    </div>
  );
};

export default FormMappingEditor;
