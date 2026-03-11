import { Component, createSignal, onMount, For, Show, createMemo } from 'solid-js';
import { Card, Button } from '../../ui';
import { FormTemplate } from '../types/formMapping';
import {
  listPdfFormStructures,
  deletePdfFormStructure,
  clonePdfFormStructure,
  getTemplateStats
} from '../services/formTemplateService';

interface FormTemplateListProps {
  onSelectTemplate?: (template: FormTemplate) => void;
  onEditTemplate?: (template: FormTemplate) => void;
  onFillTemplate?: (template: FormTemplate) => void;
}

const FormTemplateList: Component<FormTemplateListProps> = (props) => {
  const [templates, setTemplates] = createSignal<FormTemplate[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterActive, setFilterActive] = createSignal<boolean | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = createSignal<FormTemplate | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);

  // Load templates on mount
  onMount(async () => {
    await loadTemplates();
  });

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listPdfFormStructures({
        formName: searchQuery(),
        isActive: filterActive()
      });

      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        setError(result.error || 'Error loading templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (template: FormTemplate) => {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${template.formName}"?`)) {
      return;
    }

    const result = await deletePdfFormStructure(template.id);

    if (result.success) {
      await loadTemplates();
    } else {
      alert(`Error al eliminar: ${result.error}`);
    }
  };

  const handleClone = async (template: FormTemplate) => {
    const newName = prompt('Nombre para la copia:', `${template.formName} (Copia)`);

    if (!newName) return;

    const result = await clonePdfFormStructure(template.id, newName);

    if (result.success) {
      await loadTemplates();
      alert('Plantilla duplicada exitosamente');
    } else {
      alert(`Error al duplicar: ${result.error}`);
    }
  };

  const handleViewDetails = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setShowDetails(true);
  };

  // Filtered templates based on search
  const filteredTemplates = createMemo(() => {
    let filtered = templates();

    if (searchQuery()) {
      const query = searchQuery().toLowerCase();
      filtered = filtered.filter(t =>
        t.formName.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '2rem' }}>
        <h1 style={{ 'font-size': '2rem', 'font-weight': '700', 'margin-bottom': '0.5rem' }}>
          📋 Plantillas de Formularios PDF
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Administra plantillas guardadas para llenar formularios automáticamente
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <div style={{ padding: '1.5rem', 'margin-bottom': '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Buscar plantillas..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              style={{
                flex: '1',
                'min-width': '250px',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius)',
                'font-size': '1rem'
              }}
            />

            <select
              value={filterActive() === undefined ? 'all' : filterActive() ? 'active' : 'inactive'}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setFilterActive(val === 'all' ? undefined : val === 'active');
                loadTemplates();
              }}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius)',
                'font-size': '1rem'
              }}
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>

            <Button onClick={loadTemplates} size="sm">
              🔄 Recargar
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      <Show when={loading()}>
        <Card>
          <div style={{ padding: '3rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>⏳</div>
            <p>Cargando plantillas...</p>
          </div>
        </Card>
      </Show>

      {/* Error State */}
      <Show when={error()}>
        <Card>
          <div style={{
            padding: '2rem',
            background: 'var(--danger-light)',
            'border-radius': 'var(--border-radius)',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>❌</div>
            <p style={{ color: 'var(--danger-color)', 'font-weight': '600' }}>
              {error()}
            </p>
            <Button onClick={loadTemplates} variant="outline" size="sm" style={{ 'margin-top': '1rem' }}>
              Reintentar
            </Button>
          </div>
        </Card>
      </Show>

      {/* Templates Grid */}
      <Show when={!loading() && !error()}>
        <Show
          when={filteredTemplates().length > 0}
          fallback={
            <Card>
              <div style={{ padding: '3rem', 'text-align': 'center' }}>
                <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📭</div>
                <p style={{ 'font-size': '1.125rem', 'margin-bottom': '0.5rem' }}>
                  No hay plantillas
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Crea tu primera plantilla mapeando un formulario PDF
                </p>
              </div>
            </Card>
          }
        >
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            <For each={filteredTemplates()}>
              {(template) => {
                const stats = getTemplateStats(template.id);

                return (
                  <Card>
                    <div style={{ padding: '1.5rem' }}>
                      {/* Template Header */}
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start', 'margin-bottom': '0.5rem' }}>
                          <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600', flex: '1' }}>
                            {template.formName}
                          </h3>
                          <div style={{
                            padding: '0.25rem 0.75rem',
                            'border-radius': '9999px',
                            'font-size': '0.75rem',
                            'font-weight': '600',
                            background: template.isActive ? 'var(--success-light)' : 'var(--gray-200)',
                            color: template.isActive ? 'var(--success-color)' : 'var(--text-muted)'
                          }}>
                            {template.isActive ? '✓ Activa' : '⏸ Inactiva'}
                          </div>
                        </div>

                        <Show when={template.formVersion}>
                          <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                            Versión: {template.formVersion}
                          </p>
                        </Show>

                        <Show when={template.description}>
                          <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                            {template.description}
                          </p>
                        </Show>
                      </div>

                      {/* Stats */}
                      <div style={{
                        display: 'grid',
                        'grid-template-columns': '1fr 1fr',
                        gap: '0.75rem',
                        padding: '1rem',
                        background: 'var(--gray-50)',
                        'border-radius': 'var(--border-radius-sm)',
                        'margin-bottom': '1rem'
                      }}>
                        <div>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Campos Totales</div>
                          <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>{template.totalFields}</div>
                        </div>
                        <div>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Páginas</div>
                          <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>{template.totalPages}</div>
                        </div>
                        <Show when={stats}>
                          <div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Mapeados</div>
                            <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: 'var(--success-color)' }}>
                              {stats?.mappedFields || 0}
                            </div>
                          </div>
                          <div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Confianza</div>
                            <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
                              {Math.round((stats?.averageConfidence || 0) * 100)}%
                            </div>
                          </div>
                        </Show>
                      </div>

                      {/* Metadata */}
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
                        <div>Creado: {formatDate(template.createdAt)}</div>
                        <div>Actualizado: {formatDate(template.updatedAt)}</div>
                        <Show when={template.stats?.timesUsed}>
                          <div>Usado: {template.stats?.timesUsed} veces</div>
                        </Show>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => props.onFillTemplate?.(template)}
                          style={{ flex: '1', 'min-width': '100px' }}
                        >
                          📄 Llenar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => props.onEditTemplate?.(template)}
                          style={{ flex: '1', 'min-width': '100px' }}
                        >
                          ✏️ Editar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(template)}
                        >
                          📊
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClone(template)}
                        >
                          📋
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template)}
                          style={{ color: 'var(--danger-color)' }}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Details Modal */}
      <Show when={showDetails() && selectedTemplate()}>
        <div
          style={{
            position: 'fixed',
            inset: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': '1000',
            padding: '2rem'
          }}
          onClick={() => setShowDetails(false)}
        >
          <div
            style={{
              background: 'white',
              'border-radius': 'var(--border-radius)',
              'max-width': '800px',
              width: '100%',
              'max-height': '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start', 'margin-bottom': '1.5rem' }}>
                <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
                  Detalles de la Plantilla
                </h2>
                <Button size="sm" variant="outline" onClick={() => setShowDetails(false)}>
                  ✕
                </Button>
              </div>

              <Show when={selectedTemplate()}>
                {(template) => {
                  const stats = getTemplateStats(template().id);

                  return (
                    <div>
                      <div style={{ 'margin-bottom': '1.5rem' }}>
                        <h3 style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                          {template().formName}
                        </h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                          {template().description || 'Sin descripción'}
                        </p>
                      </div>

                      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1.5rem' }}>
                        <div>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>ID</div>
                          <div style={{ 'font-size': '0.875rem', 'word-break': 'break-all' }}>{template().id}</div>
                        </div>
                        <div>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Versión</div>
                          <div style={{ 'font-size': '0.875rem' }}>v{template().version}</div>
                        </div>
                        <div>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Creado</div>
                          <div style={{ 'font-size': '0.875rem' }}>{formatDate(template().createdAt)}</div>
                        </div>
                        <div>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Actualizado</div>
                          <div style={{ 'font-size': '0.875rem' }}>{formatDate(template().updatedAt)}</div>
                        </div>
                      </div>

                      <Show when={stats}>
                        <div style={{ 'margin-bottom': '1.5rem' }}>
                          <h4 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>Estadísticas</h4>
                          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--gray-50)', 'border-radius': 'var(--border-radius-sm)' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Total Campos</div>
                              <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>{stats?.totalFields}</div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--success-light)', 'border-radius': 'var(--border-radius-sm)' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Mapeados</div>
                              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--success-color)' }}>
                                {stats?.mappedFields}
                              </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--warning-light)', 'border-radius': 'var(--border-radius-sm)' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Sin Mapear</div>
                              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--warning-color)' }}>
                                {stats?.unmappedFields}
                              </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--info-light)', 'border-radius': 'var(--border-radius-sm)' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Confianza Alta</div>
                              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--info-color)' }}>
                                {stats?.highConfidenceFields}
                              </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--danger-light)', 'border-radius': 'var(--border-radius-sm)' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Confianza Baja</div>
                              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--danger-color)' }}>
                                {stats?.lowConfidenceFields}
                              </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--gray-50)', 'border-radius': 'var(--border-radius-sm)' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Confianza Prom.</div>
                              <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                                {Math.round((stats?.averageConfidence || 0) * 100)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </Show>

                      <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
                        <Button onClick={() => setShowDetails(false)} variant="outline">
                          Cerrar
                        </Button>
                        <Button onClick={() => {
                          props.onFillTemplate?.(template());
                          setShowDetails(false);
                        }}>
                          Llenar Formulario
                        </Button>
                      </div>
                    </div>
                  );
                }}
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default FormTemplateList;
