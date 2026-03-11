import { Component, createSignal, For, Show, createMemo, createEffect, onMount } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { Card } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import TemplateBuilderV2 from './TemplateBuilderV2';
import DynamicTemplateForm from './DynamicTemplateForm';
import { categoryOptions, templateStore } from '../stores/templateStore';
import { entryBookStore } from '../stores/entryBookStore';
import { JournalTemplate, ProcessedTemplate } from '../types/journalTemplateTypes';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TemplateManager: Component<TemplateManagerProps> = (props) => {
  const { t } = useTranslation();
  
  const [currentView, setCurrentView] = createSignal<'catalog' | 'builder' | 'form'>('catalog');
  const [selectedTemplate, setSelectedTemplate] = createSignal<JournalTemplate | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = createSignal(false);
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');



  onMount(()=>{
     //templateStore.refreshData( authStore.getBusinessId())
  })


  const fetchTemplate =async ()=>{
    let qt = authStore.getBusinessId();
    if(searchQuery()){
      qt += " "+ searchQuery()
    }
    if(selectedCategory()){
      qt += " "+ selectedCategory()
    }
    templateStore.refreshData(qt)
  }

  // Filtros y búsqueda
  const filteredTemplates = (() => {
    let templates = templateStore.getActiveTemplates();
    
    // Filtrar por categoría
    if (selectedCategory() !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory());
    }
    
    // Filtrar por búsqueda
    const search = searchQuery().toLowerCase();
    if (search) {
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.settings.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    // Ordenar por uso y fecha
    return templates.sort((a, b) => {
      // Primero por uso
      if ((b.usageCount || 0) !== (a.usageCount || 0)) {
        return (b.usageCount || 0) - (a.usageCount || 0);
      }
      // Luego por fecha de actualización
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  });

  // Categorías disponibles
  const categories = createMemo(() => {
    const cats = [...new Set(templateStore.getActiveTemplates().map(t => t.category))];
    return [
      { value: 'all', label: 'Todas las Categorías' },
      ...cats.map(cat => ({ value: cat, label: templateStore.getCategoryDescription(cat) }))
    ];
  });

  const handleUseTemplate = (template: JournalTemplate) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };

  const handleEditTemplate = (template: JournalTemplate) => {
    setSelectedTemplate(template);
    setIsBuilderOpen(true);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsBuilderOpen(true);
  };

  const handleSaveTemplate = async (template: JournalTemplate) => {
    try {
      if (selectedTemplate()) {
        await templateStore.updateTemplate(selectedTemplate()!.id, template);
      } else {
        await templateStore.addTemplate(template);
      }
      setIsBuilderOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      // Error is handled in the templateStore, just log here
    }
  };

  const handleSubmitEntry = async (processedTemplate: ProcessedTemplate) => {
    try {
      // Incrementar contador de uso
      await templateStore.incrementUsageCount(processedTemplate.templateId);
      
      // Crear el asiento contable
      const newEntry = {
        entryNumber: entryBookStore.getNextEntryNumber(),
        date: new Date().toISOString().split('T')[0],
        description: processedTemplate.generatedEntry.description,
        reference: processedTemplate.generatedEntry.reference,
        status: 'draft' as const,
        createdBy: 'user', // TODO: obtener del contexto
        createdAt: new Date().toISOString(),
        totalDebits: processedTemplate.generatedEntry.lines.reduce((sum, line) => sum + line.debitAmount, 0),
        totalCredits: processedTemplate.generatedEntry.lines.reduce((sum, line) => sum + line.creditAmount, 0),
        lines: processedTemplate.generatedEntry.lines.map((line, index) => ({
          id: `line_${Date.now()}_${index}`,
          accountId: line.accountId,
          accountName: line.accountName || '',
          description: line.description,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          amount: line.debitAmount > 0 ? line.debitAmount : line.creditAmount,
          isDebit: line.debitAmount > 0,
          reconciled: false
        }))
      };

      entryBookStore.addJournalEntry(newEntry);
      setIsFormOpen(false);
      setSelectedTemplate(null);
      props.onClose();
      
      // Mostrar mensaje de éxito
      alert('Asiento contable creado exitosamente');
      
    } catch (error) {
      console.error('Error creating journal entry:', error);
      alert('Error al crear el asiento contable: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const handleDeleteTemplate = (template: JournalTemplate) => {
    if (template.createdBy === 'system') {
      alert('No se pueden eliminar plantillas del sistema');
      return;
    }

    if (confirm(`¿Está seguro de que desea eliminar la plantilla "${template.name}"?`)) {
      templateStore.deleteTemplate(template.id);
    }
  };

  const handleCloneTemplate = async (template: JournalTemplate) => {
    const newName = prompt('Nombre para la plantilla clonada:', `${template.name} (Copia)`);
    if (newName) {
      try {
        await templateStore.duplicateTemplate(template.id, newName);
        alert('Plantilla clonada exitosamente');
      } catch (error) {
        console.error('Error cloning template:', error);
        alert('Error al clonar la plantilla');
      }
    }
  };

  // Estilos
  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const filtersStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '2rem',
    'flex-wrap': 'wrap'
  };

  const templateGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  };

  const templateCardStyle = {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      'box-shadow': '0 4px 12px rgba(0,0,0,0.15)'
    }
  };

  const statsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const badgeStyle = (color: string) => ({
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: color,
    color: 'white'
  });

  const stats = templateStore.getStats();

  return (
    <>
      <Modal 
        isOpen={props.isOpen} 
        onClose={props.onClose} 
        title="Plantillas de Asientos Contables"
        size="large"
        maxWidth='80vw'
      >
        <div>
          {/* Error State */}
          <Show when={templateStore.error}>
            <div style={{
              padding: '1rem',
              background: '#f8d7da',
              color: '#721c24',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1rem',
              border: '1px solid #f5c6cb'
            }}>
              <strong>⚠️ Error:</strong> {templateStore.error}
              <Button 
                variant="outline" 
                size="sm"
                style={{ 'margin-left': '1rem' }}
                onClick={() => templateStore.refreshData()}
              >
                Reintentar
              </Button>
            </div>
          </Show>

          {/* Loading State */}
          <Show when={templateStore.isLoading}>
            <div style={{
              display: 'flex',
              'justify-content': 'center',
              'align-items': 'center',
              padding: '2rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ 'margin-right': '0.5rem' }}>🔄</div>
              Cargando plantillas...
            </div>
          </Show>
          {/* Header con estadísticas */}
          <div style={headerStyle}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Catálogo de Plantillas</h3>
              <p style={{ margin: '0', color: 'var(--text-muted)' }}>
                Crea asientos contables rápidamente usando plantillas predefinidas o personalizadas
              </p>
            </div>
            <Button variant="primary" onClick={handleCreateTemplate}>
              + Nueva Plantilla
            </Button>
          </div>

          {/* Estadísticas rápidas */}
          <div style={statsStyle}>
            <Card>
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                  {stats.totalTemplates}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Total Plantillas
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#4caf50' }}>
                  {stats.activeTemplates}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Activas
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ 'text-align': 'center' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#ff9800' }}>
                  {stats.categories}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Categorías
                </div>
              </div>
            </Card>
          </div>

          {/* Filtros de búsqueda */}
          <div style={filtersStyle}>
            <div style={{ 'min-width': '600px' }}>
              <FormInput
                label=""
                value={searchQuery()}
                onChange={(v)=>{
                  setSearchQuery(v)
                  //fetchTemplate();
                }}
                placeholder="Buscar plantillas..."
              />
            </div>
            <div style={{ 'min-width': '200px' }}>
              <FormSelect
                label=""
                value={selectedCategory()}
                onChange={(v)=>{
                  setSelectedCategory(v)
                  //fetchTemplate();
                }}
                options={categoryOptions}
              />
            </div>
            <div style={{ display: 'flex', 'align-items': 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>

          {/* Grid de plantillas */}
          <Show when={filteredTemplates().length > 0} fallback={
            <div style={{ 
              'text-align': 'center', 
              padding: '3rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ 'font-size': '1.5rem', 'margin-bottom': '1rem' }}>📄</div>
              <h3>No se encontraron plantillas</h3>
              <p>No hay plantillas que coincidan con los filtros seleccionados.</p>
              <Button variant="primary" onClick={handleCreateTemplate}>
                Crear Nueva Plantilla
              </Button>
            </div>
          }>
            <div style={templateGridStyle}>
              <For each={filteredTemplates()}>
                {(template) => (
                  <Card style={templateCardStyle}>
                    <div>
                      {/* Header de la tarjeta */}
                      <div style={{ 
                        display: 'flex', 
                        'justify-content': 'space-between', 
                        'align-items': 'flex-start',
                        'margin-bottom': '1rem'
                      }}>
                        <div style={{ flex: '1' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.1rem' }}>
                            {template.name}
                          </h4>
                          <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                            <span style={badgeStyle('#2196f3')}>{template.category}</span>
                            {template.usageCount > 0 && (
                              <span style={badgeStyle('#4caf50')}>
                                {template.usageCount} usos
                              </span>
                            )}
                            {template.createdBy === 'system' && (
                              <span style={badgeStyle('#ff9800')}>Sistema</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Descripción */}
                      <p style={{ 
                        margin: '0 0 1rem 0', 
                        'font-size': '0.875rem', 
                        color: 'var(--text-muted)',
                        'line-height': '1.4'
                      }}>
                        {template.description}
                      </p>

                      {/* Info de campos y líneas */}
                      <div style={{ 
                        display: 'flex', 
                        'justify-content': 'space-between',
                        'margin-bottom': '1rem',
                        'font-size': '0.875rem',
                        color: 'var(--text-muted)'
                      }}>
                        <span>{template.fields.length} campos</span>
                        <span>{template.lineRules.length} líneas</span>
                        {template.lastUsed && (
                          <span>
                            Último uso: {new Date(template.lastUsed).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <Show when={template.settings.tags && template.settings.tags.length > 0}>
                        <div style={{ 'margin-bottom': '1rem' }}>
                          <For each={template.settings.tags}>
                            {(tag) => (
                              <span style={{
                                display: 'inline-block',
                                padding: '0.125rem 0.375rem',
                                'margin-right': '0.25rem',
                                'margin-bottom': '0.25rem',
                                'border-radius': '4px',
                                'font-size': '0.75rem',
                                background: '#f0f0f0',
                                color: '#666'
                              }}>
                                #{tag}
                              </span>
                            )}
                          </For>
                        </div>
                      </Show>

                      {/* Botones de acción */}
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        'padding-top': '1rem',
                        'border-top': '1px solid var(--border-color)'
                      }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                          style={{ flex: '1' }}
                        >
                          Usar Plantilla
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          title="Editar"
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCloneTemplate(template)}
                          title="Clonar plantilla"
                        >
                          📋
                        </Button>
                        <Show when={template.createdBy !== 'system'}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template)}
                            style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                            title="Eliminar"
                          >
                            🗑️
                          </Button>
                        </Show>
                      </div>
                    </div>
                  </Card>
                )}
              </For>
            </div>
          </Show>

          {/* Plantillas más usadas */}
          <Show when={stats.mostUsed.length > 0}>
            <div style={{ 'margin-top': '3rem', 'padding-top': '2rem', 'border-top': '2px solid var(--border-color)' }}>
              <h4>Plantillas Más Utilizadas</h4>
              <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
                <For each={stats.mostUsed}>
                  {(template) => (
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--surface-color)',
                      'border-radius': 'var(--border-radius)',
                      'font-size': '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleUseTemplate(template)}>
                      <strong>{template.name}</strong>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {template.usageCount} usos
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Modal>

      {/* Modal del constructor de plantillas V2 (3 pasos) */}
      <Show when={isBuilderOpen()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1100
        }}>
          <div style={{
            background: 'var(--background-color)',
            'border-radius': 'var(--border-radius)',
            width: '95vw',
            'max-width': '1200px',
            height: '95vh',
            'max-height': '800px',
            overflow: 'hidden',
            'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <TemplateBuilderV2
              template={selectedTemplate() || undefined}
              onSave={(template) => {
                handleSaveTemplate(template);
              }}
              onCancel={() => {
                setIsBuilderOpen(false);
                setSelectedTemplate(null);
              }}
            />
          </div>
        </div>
      </Show>

      {/* Modal del formulario dinámico */}
      <Show when={selectedTemplate() && isFormOpen()}>
        <DynamicTemplateForm
          isOpen={isFormOpen()}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate()!}
          onSubmit={handleSubmitEntry}
        />
      </Show>
    </>
  );
};

export default TemplateManager;