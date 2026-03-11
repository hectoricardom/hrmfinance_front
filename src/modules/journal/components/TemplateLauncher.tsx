import { Component, createSignal, createEffect, onCleanup, Show, For, createMemo } from 'solid-js';
import { Modal, Button, Card } from '../../ui';
import TemplateLauncherSidebar from './TemplateLauncherSidebar';
import DynamicTemplateForm from './DynamicTemplateForm';
import { templateStore } from '../stores/templateStore';
import { entryBookStore, JournalEntry } from '../stores/entryBookStore';
import { JournalTemplate, TemplateFormData, ProcessedTemplate } from '../types/journalTemplateTypes';
import { TemplateProcessor } from '../services/templateProcessor';
import { authStore } from '../../../stores/authStore';
import { devLog, generateShortCode } from '../../../services/utils';

interface TemplateLauncherProps {
  defaultTemplateId?: string;
  onClose?: () => void;
  onEntryCreated?: (entry: JournalEntry) => void;
}

const FAVORITES_KEY = 'template-launcher-favorites';
const RECENT_KEY = 'template-launcher-recent';

const TemplateLauncher: Component<TemplateLauncherProps> = (props) => {
  const [selectedTemplateId, setSelectedTemplateId] = createSignal<string | null>(
    props.defaultTemplateId || null
  );
  const [formData, setFormData] = createSignal<TemplateFormData>({});
  const [favorites, setFavorites] = createSignal<string[]>([]);
  const [recentTemplates, setRecentTemplates] = createSignal<string[]>([]);
  const [processedPreview, setProcessedPreview] = createSignal<ProcessedTemplate | null>(null);

  // Load favorites and recent from localStorage
  const loadFromStorage = () => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }

      const storedRecent = localStorage.getItem(RECENT_KEY);
      if (storedRecent) {
        setRecentTemplates(JSON.parse(storedRecent));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  // Save recent to localStorage
  const saveRecent = (newRecent: string[]) => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    } catch (error) {
      console.error('Error saving recent templates:', error);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (templateId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId];
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };

  // Add to recent templates
  const addToRecent = (templateId: string) => {
    setRecentTemplates(prev => {
      const filtered = prev.filter(id => id !== templateId);
      const newRecent = [templateId, ...filtered].slice(0, 5);
      saveRecent(newRecent);
      return newRecent;
    });
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setFormData({});
    setProcessedPreview(null);
    addToRecent(templateId);
  };

  // Get selected template
  const selectedTemplate = createMemo(() => {
    const id = selectedTemplateId();
    return id ? templateStore.getTemplateById(id) : null;
  });

  // Update preview when form data changes
  createEffect(() => {
    const template = selectedTemplate();
    const data = formData();

    if (template && Object.keys(data).length > 0) {
      try {
        const processed = TemplateProcessor.processTemplate(template, data);

        setProcessedPreview(processed);
      } catch (error) {
        console.error('Error processing template:', error);
        setProcessedPreview(null);
      }
    } else {
      setProcessedPreview(null);
    }
  });

  // Handle form data change
  const handleFormDataChange = (newData: TemplateFormData) => {
    setFormData(newData);
  };

  // Handle entry creation
  const handleCreateEntry = async () => {
    const preview = processedPreview();
    const template = selectedTemplate();

    if (!preview || !template || !preview.validation.isValid) {
      alert('Por favor complete todos los campos requeridos correctamente');
      return;
    }

    try {
      // Increment template usage count
      await templateStore.incrementUsageCount(template.id);

      // Create the journal entry
      const newEntry: any = {
        entryNumber: entryBookStore.getNextEntryNumber(),
        date: new Date().toISOString().split('T')[0],
        description: preview.generatedEntry.description,
        reference: preview.generatedEntry.reference,
        document: preview.generatedEntry.document,
        status: 'draft' as const,
        createdBy: authStore.getUserName() || 'user',
        createdAt: new Date().toISOString(),
        totalDebits: preview.generatedEntry.lines.reduce((sum, line) => sum + line.debitAmount, 0),
        totalCredits: preview.generatedEntry.lines.reduce((sum, line) => sum + line.creditAmount, 0),
        lines: preview.generatedEntry.lines.map((line, index) => ({
          id: generateShortCode(11),
          accountId: line.accountId,
          accountNumber: line.accountId,
          accountName: line.accountName || '',
          description: line.description,
          document: line.document,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          amount: line.debitAmount > 0 ? line.debitAmount : line.creditAmount,
          isDebit: line.debitAmount > 0,
          reconciled: false
        }))
      };

      await entryBookStore.addJournalEntry(newEntry);

      // Call onEntryCreated callback if provided
      if (props.onEntryCreated) {
        props.onEntryCreated(newEntry);
      }

      // Close the launcher
      if (props.onClose) {
        props.onClose();
      }

      alert('Asiento contable creado exitosamente');
    } catch (error) {
      console.error('Error creating journal entry:', error);
      alert('Error al crear el asiento contable: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  // Keyboard shortcut: Ctrl+Enter to submit
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCreateEntry();
    }
  };

  // Get active templates reactively
  const activeTemplates = createMemo(() => {
    const templates = templateStore.getActiveTemplates();
    devLog('[TemplateLauncher] Active templates:', templates.length, templates.map(t => t.name));
    return templates;
  });

  // Load data on mount
  createEffect(() => {
    loadFromStorage();
    devLog('[TemplateLauncher] Loading templates for business:', authStore.getBusinessId());
    templateStore.refreshData(authStore.getBusinessId());
  });

  // Add keyboard listener
  createEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
    });
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    height: '100%'
  };

  const topHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 1.5rem',
    'border-bottom': '1px solid var(--border-color)',
    background: 'var(--surface-color)'
  };

  const contentLayoutStyle = {
    display: 'grid',
    'grid-template-columns': '320px 1fr',
    flex: '1',
    'min-height': '0',
    overflow: 'hidden'
  };

  const mainContentStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    height: '100%',
    'overflow-y': 'auto' as const,
    padding: '1.5rem'
  };

  const headerStyle = {
    'margin-bottom': '1.5rem',
    'padding-bottom': '1rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const previewSectionStyle = {
    'margin-top': '2rem',
    'padding-top': '1.5rem',
    'border-top': '1px solid var(--border-color)'
  };

  const previewCardStyle = {
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const linesTableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '0.875rem'
  };

  const footerStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '1rem',
    'margin-top': '2rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)'
  };

  return (
    <div style={containerStyle}>
      {/* Top Header with Close Button */}
      <div style={topHeaderStyle}>
        <div>
          <h2 style={{ margin: '0', 'font-size': '1.25rem' }}>Crear Asiento con Plantilla</h2>
          <p style={{ margin: '0.25rem 0 0 0', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Seleccione una plantilla y complete los campos
          </p>
        </div>
        <button
          onClick={props.onClose}
          style={{
            background: 'none',
            border: 'none',
            'font-size': '1.5rem',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '0.5rem',
            'border-radius': '50%',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            transition: 'all 0.2s'
          }}
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* Content Layout */}
      <div style={contentLayoutStyle}>
        {/* Left Sidebar */}
        <TemplateLauncherSidebar
          templates={activeTemplates()}
          selectedTemplateId={selectedTemplateId()}
          onTemplateSelect={handleTemplateSelect}
          favorites={favorites()}
          recentTemplates={recentTemplates()}
          onToggleFavorite={handleToggleFavorite}
        />

        {/* Right Content Area */}
        <div style={mainContentStyle}>
        <Show when={!selectedTemplate()}>
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            height: '100%',
            color: 'var(--text-muted)',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📋</div>
            <h3 style={{ 'margin-bottom': '0.5rem' }}>Selecciona una Plantilla</h3>
            <p>Elige una plantilla de la barra lateral para comenzar a crear un asiento contable</p>
          </div>
        </Show>

        <Show when={selectedTemplate()}>
          {(() => {
            const template = selectedTemplate()!;
            return (
              <>
                {/* Template Header */}
                <div style={headerStyle}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.5rem 0' }}>{template.name}</h2>
                      <p style={{ margin: '0', color: 'var(--text-muted)' }}>
                        {template.description}
                      </p>
                    </div>
                    <div
                      onClick={() => handleToggleFavorite(template.id)}
                      style={{
                        cursor: 'pointer',
                        'font-size': '1.5rem',
                        color: favorites().includes(template.id) ? '#ffd700' : 'var(--text-muted)'
                      }}
                    >
                      {favorites().includes(template.id) ? '★' : '☆'}
                    </div>
                  </div>
                </div>

                {/* Dynamic Form */}
                <div>
                  <h3 style={{ 'margin-bottom': '1rem' }}>Complete la Información</h3>
                  <For each={template.fields}>
                    {(field) => {
                      const fieldStyle = {
                        'margin-bottom': '1.5rem'
                      };

                      const labelStyle = {
                        display: 'block',
                        'font-weight': '500',
                        'margin-bottom': '0.5rem'
                      };

                      const inputStyle = {
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius)',
                        'font-family': 'inherit',
                        'font-size': '1rem'
                      };

                      const textareaStyle = {
                        ...inputStyle,
                        'min-height': '100px',
                        resize: 'vertical' as const
                      };

                      return (
                        <div style={fieldStyle}>
                          <label style={labelStyle}>
                            {field.label}
                            {field.required && <span style={{ color: 'red' }}> *</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={formData()[field.name] || ''}
                              onInput={(e) => handleFormDataChange({ ...formData(), [field.name]: e.currentTarget.value })}
                              placeholder={field.placeholder}
                              style={textareaStyle}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={formData()[field.name] || ''}
                              onChange={(e) => handleFormDataChange({ ...formData(), [field.name]: e.currentTarget.value })}
                              style={inputStyle}
                            >
                              <option value="">Seleccione una opción...</option>
                              <For each={field.options || []}>
                                {(option) => (
                                  <option value={option.value}>{option.label}</option>
                                )}
                              </For>
                            </select>
                          ) : (
                            <input
                              type={field.type === 'currency' || field.type === 'number' ? 'number' : field.type}
                              value={formData()[field.name] || ''}
                              onInput={(e) => handleFormDataChange({ ...formData(), [field.name]: e.currentTarget.value })}
                              placeholder={field.placeholder}
                              step={field.type === 'currency' ? '0.01' : undefined}
                              style={inputStyle}
                            />
                          )}
                        </div>
                      );
                    }}
                  </For>
                </div>

                {/* Live Preview */}
                <Show when={processedPreview()}>
                  {(preview) => (
                    <div style={previewSectionStyle}>
                      <h3 style={{ 'margin-bottom': '1rem' }}>Vista Previa del Asiento</h3>

                      {/* Validation Errors */}
                      <Show when={!preview().validation.isValid}>
                        <div style={{
                          padding: '1rem',
                          background: '#f8d7da',
                          color: '#721c24',
                          'border-radius': 'var(--border-radius)',
                          'margin-bottom': '1rem',
                          border: '1px solid #f5c6cb'
                        }}>
                          <strong>Errores de validación:</strong>
                          <For each={preview().validation.errors}>
                            {(error) => <div>• {error}</div>}
                          </For>
                        </div>
                      </Show>

                      {/* Warnings */}
                      <Show when={preview().validation.warnings.length > 0}>
                        <div style={{
                          padding: '1rem',
                          background: '#fff3cd',
                          color: '#856404',
                          'border-radius': 'var(--border-radius)',
                          'margin-bottom': '1rem',
                          border: '1px solid #ffeaa7'
                        }}>
                          <strong>Advertencias:</strong>
                          <For each={preview().validation.warnings}>
                            {(warning) => <div>• {warning}</div>}
                          </For>
                        </div>
                      </Show>

                      {/* Entry Summary */}
                      <div style={previewCardStyle}>
                        <div style={{ 'margin-bottom': '1rem' }}>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Descripción:</div>
                          <div>{preview().generatedEntry.description}</div>
                        </div>
                        <div style={{ 'margin-bottom': '1rem' }}>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Referencia:</div>
                          <div>{preview().generatedEntry.reference || 'Sin referencia'}</div>
                        </div>

                        {/* Balance Summary */}
                        <div style={{
                          display: 'grid',
                          'grid-template-columns': '1fr 1fr 1fr',
                          gap: '1rem',
                          'margin-bottom': '1rem',
                          'padding-top': '1rem',
                          'border-top': '1px solid var(--border-color)'
                        }}>
                          <div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Total Débitos</div>
                            <div style={{ 'font-weight': '600', color: '#4caf50' }}>
                              {formatCurrency(preview().generatedEntry.lines.reduce((sum, line) => sum + line.debitAmount, 0))}
                            </div>
                          </div>
                          <div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Total Créditos</div>
                            <div style={{ 'font-weight': '600', color: '#f44336' }}>
                              {formatCurrency(preview().generatedEntry.lines.reduce((sum, line) => sum + line.creditAmount, 0))}
                            </div>
                          </div>
                          <div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Estado</div>
                            <div style={{
                              'font-weight': '600',
                              color: preview().validation.isValid ? '#4caf50' : '#f44336'
                            }}>
                              {preview().validation.isValid ? 'Balanceado' : 'No Balanceado'}
                            </div>
                          </div>
                        </div>

                        {/* Lines Table */}
                        <div>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                            Líneas del Asiento ({preview().generatedEntry.lines.length})
                          </div>
                          <table style={linesTableStyle}>
                            <thead>
                              <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                                <th style={{ padding: '0.5rem', 'text-align': 'left' }}>Cuenta</th>
                                <th style={{ padding: '0.5rem', 'text-align': 'left' }}>Documento</th>
                                <th style={{ padding: '0.5rem', 'text-align': 'left' }}>Descripción</th>
                                <th style={{ padding: '0.5rem', 'text-align': 'right' }}>Débito</th>
                                <th style={{ padding: '0.5rem', 'text-align': 'right' }}>Crédito</th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={preview().generatedEntry.lines}>
                                {(line) => (
                                  <tr style={{ 'border-bottom': '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.5rem' }}>
                                      <div style={{ 'font-weight': '500' }}>{line.accountName || line.accountId}</div>
                                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                        {line.accountId}
                                      </div>
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>{line.document}</td>
                                    <td style={{ padding: '0.5rem' }}>{line.description}</td>
                                    <td style={{ padding: '0.5rem', 'text-align': 'right', 'font-weight': '600', color: '#4caf50' }}>
                                      {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                                    </td>
                                    <td style={{ padding: '0.5rem', 'text-align': 'right', 'font-weight': '600', color: '#f44336' }}>
                                      {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                                    </td>
                                  </tr>
                                )}
                              </For>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </Show>

                {/* Footer Actions */}
                <div style={footerStyle}>
                  <Button variant="secondary" onClick={props.onClose}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateEntry}
                    disabled={!processedPreview() || !processedPreview()!.validation.isValid}
                  >
                    Crear Asiento (Ctrl+Enter)
                  </Button>
                </div>
              </>
            );
          })()}
        </Show>
        </div>
      </div>
    </div>
  );
};

export default TemplateLauncher;
