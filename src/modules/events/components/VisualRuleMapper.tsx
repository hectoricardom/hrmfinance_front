/**
 * VisualRuleMapper Component - Approach 1: Drag & Drop
 *
 * Side-by-side interface with:
 * - Left panel: Draggable invoice fields (from schema analysis)
 * - Right panel: Drop zones for conditions and journal entry lines
 *
 * Features:
 * - Visual field categorization
 * - Drop zones for each journal line
 * - New line creation on drop
 * - Custom field creation zone
 */

import { Component, createSignal, For, Show, createMemo, onMount, createEffect } from 'solid-js';
import { useTranslation } from '../../../translations';
import { useInvoiceFieldExtractor, ExtractedField } from '../hooks/useInvoiceFieldExtractor';

interface JournalLine {
  accountExpression?: string;
  accountId?: string;
  descriptionTemplate?: string;
  amountExpression?: string;
  isDebit?: boolean;
}

interface FieldMapping {
  sourceField: ExtractedField;
  targetType: 'condition' | 'description' | 'amount' | 'reference' | 'lineAmount' | 'lineDescription' | 'newLine';
  targetIndex?: number;
}

interface LineCondition {
  field: string;
  operator: string;
  value: string | number;
  dataType: string;
}

interface VisualRuleMapperProps {
  onFieldSelect: (fieldPath: string, targetType: string, lineIndex?: number) => void;
  onMappingsChange?: (mappings: FieldMapping[]) => void;
  onAddCondition?: (fieldPath: string) => void;
  onSetLineAmount?: (fieldPath: string, lineIndex: number) => void;
  onSetLineDescription?: (fieldPath: string, lineIndex: number) => void;
  onCreateNewLine?: (amountField: string, descriptionField?: string, lineConditions?: LineCondition[]) => void;
  onSetReference?: (fieldPath: string) => void;
  onSetDescription?: (fieldPath: string) => void;
  onCreateCustomField?: (name: string, expression: string, description?: string) => void;
  eventType?: string;
  journalLines?: JournalLine[];
}

const VisualRuleMapper: Component<VisualRuleMapperProps> = (props) => {
  const { t } = useTranslation();
  const { extractFields, isExtracting, progress, error, schema } = useInvoiceFieldExtractor();

  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string | null>(null);
  const [draggedField, setDraggedField] = createSignal<ExtractedField | null>(null);
  const [activeDropZone, setActiveDropZone] = createSignal<string | null>(null);
  const [mappings, setMappings] = createSignal<FieldMapping[]>([]);
  const [showHighCoverageOnly, setShowHighCoverageOnly] = createSignal(false);

  // New line creation state
  const [newLineAmount, setNewLineAmount] = createSignal<string>('');
  const [newLineDescription, setNewLineDescription] = createSignal<string>('');

  // Custom field creation state
  const [customFieldName, setCustomFieldName] = createSignal<string>('');
  const [customFieldExpression, setCustomFieldExpression] = createSignal<string>('');
  const [customFieldDescription, setCustomFieldDescription] = createSignal<string>('');

  // Track last loaded event type to avoid redundant fetches
  const [lastEventType, setLastEventType] = createSignal<string | undefined>(undefined);

  // Load schema on mount with current event type
  // Pass undefined as limit to process ALL records and build complete schema
  onMount(() => {
    console.log('[VisualRuleMapper] onMount - loading ALL fields for eventType:', props.eventType);
    // No limit - process ALL records to get complete schema with all possible fields
    extractFields(undefined, props.eventType);
    setLastEventType(props.eventType);
  });

  // Re-extract fields when eventType changes
  createEffect(() => {
    const currentEventType = props.eventType;
    const previousEventType = lastEventType();

    // Only re-extract if eventType actually changed and we have a previous value
    if (previousEventType !== undefined && currentEventType !== previousEventType) {
      console.log('[VisualRuleMapper] eventType changed from', previousEventType, 'to', currentEventType);
      // No limit - process ALL records for complete schema
      extractFields(undefined, currentEventType);
      setLastEventType(currentEventType);
    }
  });

  // Filtered fields based on search and category
  const filteredFields = createMemo(() => {
    const s = schema();
    if (!s) return [];

    let fields = s.fields;

    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      fields = fields.filter(f =>
        f.path.toLowerCase().includes(term) ||
        f.description.toLowerCase().includes(term)
      );
    }

    if (selectedCategory()) {
      const category = s.categories.find(c => c.name === selectedCategory());
      if (category) {
        fields = category.fields;
      }
    }

    if (showHighCoverageOnly()) {
      fields = fields.filter(f => f.coverage >= 50);
    }

    return fields;
  });

  // Drag handlers
  const handleDragStart = (field: ExtractedField, e: DragEvent) => {
    setDraggedField(field);
    e.dataTransfer!.effectAllowed = 'copy';
    e.dataTransfer!.setData('text/plain', field.path);
    e.dataTransfer!.setData('application/json', JSON.stringify(field));
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: DragEvent) => {
    setDraggedField(null);
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (zone: string, e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
    setActiveDropZone(zone);
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  // Drop handler for conditions
  const handleDropCondition = (e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      props.onAddCondition?.(fieldPath);
      props.onFieldSelect(fieldPath, 'condition');
      addMapping(fieldPath, 'condition');
    }
  };

  // Drop handler for line amount
  const handleDropLineAmount = (lineIndex: number, e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      props.onSetLineAmount?.(fieldPath, lineIndex);
      props.onFieldSelect(fieldPath, 'amount', lineIndex);
      addMapping(fieldPath, 'lineAmount', lineIndex);
    }
  };

  // Drop handler for line description
  const handleDropLineDescription = (lineIndex: number, e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      props.onSetLineDescription?.(fieldPath, lineIndex);
      props.onFieldSelect(fieldPath, 'lineDescription', lineIndex);
      addMapping(fieldPath, 'lineDescription', lineIndex);
    }
  };

  // Drop handler for new line amount
  const handleDropNewLineAmount = (e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      setNewLineAmount(fieldPath);
    }
  };

  // Drop handler for new line description
  const handleDropNewLineDescription = (e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      setNewLineDescription(fieldPath);
    }
  };

  // Drop handler for reference
  const handleDropReference = (e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      props.onSetReference?.(fieldPath);
      props.onFieldSelect(fieldPath, 'reference');
      addMapping(fieldPath, 'reference');
    }
  };

  // Drop handler for description
  const handleDropDescription = (e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      props.onSetDescription?.(fieldPath);
      props.onFieldSelect(fieldPath, 'description');
      addMapping(fieldPath, 'description');
    }
  };

  // Create new line with dropped fields
  // Create new line with default condition for amount > 0
  const createNewLine = () => {
    if (newLineAmount()) {
      // Add default condition: amount field > 0
      const defaultCondition: LineCondition = {
        field: newLineAmount(),
        operator: 'greaterThan',
        value: 0,
        dataType: 'number'
      };
      props.onCreateNewLine?.(newLineAmount(), newLineDescription() || undefined, [defaultCondition]);
      setNewLineAmount('');
      setNewLineDescription('');
    }
  };

  // Create custom field
  const createCustomField = () => {
    if (customFieldName() && customFieldExpression()) {
      props.onCreateCustomField?.(customFieldName(), customFieldExpression(), customFieldDescription() || undefined);
      setCustomFieldName('');
      setCustomFieldExpression('');
      setCustomFieldDescription('');
    }
  };

  // Handle drop for custom field expression
  const handleDropCustomFieldExpression = (e: DragEvent) => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldPath = e.dataTransfer!.getData('text/plain');
    if (fieldPath) {
      const currentExpr = customFieldExpression();
      // If this is the first field dropped, also set the name from the field
      if (!currentExpr) {
        // Extract field name from path (e.g., "data.totalAmount" -> "totalAmount")
        const fieldName = fieldPath.split('.').pop() || fieldPath;
        if (!customFieldName()) {
          setCustomFieldName(fieldName);
        }
      }
      setCustomFieldExpression(currentExpr ? `${currentExpr} + ${fieldPath}` : fieldPath);
    }
  };

  const addMapping = (fieldPath: string, targetType: FieldMapping['targetType'], targetIndex?: number) => {
    const field = draggedField();
    if (field) {
      setMappings(prev => [...prev, { sourceField: field, targetType, targetIndex }]);
      props.onMappingsChange?.(mappings());
    }
  };

  const removeMapping = (index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index));
    props.onMappingsChange?.(mappings());
  };

  // Styles
  const containerStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1.2fr',
    gap: '1rem',
    padding: '1rem',
    'background-color': '#f9fafb',
    'min-height': '500px',
  };

  const panelStyle = {
    'background-color': 'white',
    'border-radius': '0.5rem',
    padding: '.71rem',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
    'overflow-y': 'auto',
    'max-height': '540px',
  };

  const fieldItemStyle = (isDragging: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    'background-color': isDragging ? '#e0f2fe' : 'white',
    border: '1px solid #e5e7eb',
    'border-radius': '0.375rem',
    cursor: 'grab',
    'font-size': '0.8rem',
    'margin-bottom': '0.375rem',
    transition: 'all 0.2s',
    opacity: isDragging ? 0.5 : 1,
  });

  const typeColors: Record<string, { bg: string; text: string }> = {
    string: { bg: '#fef3c7', text: '#92400e' },
    number: { bg: '#dbeafe', text: '#1e40af' },
    boolean: { bg: '#dcfce7', text: '#166534' },
    date: { bg: '#f3e8ff', text: '#7c3aed' },
    array: { bg: '#fee2e2', text: '#991b1b' },
    object: { bg: '#e0e7ff', text: '#3730a3' },
  };

  const dropZoneStyle = (zone: string, color: string = '#3b82f6') => ({
    padding: '0.75rem',
    border: activeDropZone() === zone ? `2px dashed ${color}` : '2px dashed #d1d5db',
    'border-radius': '0.5rem',
    'background-color': activeDropZone() === zone ? `${color}10` : '#fafafa',
    'min-height': '60px',
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    'text-align': 'center',
    transition: 'all 0.2s',
    cursor: 'pointer',
  });

  const categoryTabStyle = (isActive: boolean) => ({
    padding: '0.25rem 0.5rem',
    'background-color': isActive ? '#3b82f6' : 'transparent',
    color: isActive ? 'white' : '#6b7280',
    border: 'none',
    'border-radius': '0.25rem',
    cursor: 'pointer',
    'font-size': '0.7rem',
    'font-weight': '500',
    'white-space': 'nowrap',
  });

  return (
    <div>
      {/* Loading State */}
      <Show when={isExtracting()}>
        <div style={{ 'text-align': 'center', padding: '2rem' }}>
          <div style={{ 'margin-bottom': '1rem' }}>
            <div style={{
              width: '100%',
              height: '8px',
              'background-color': '#e5e7eb',
              'border-radius': '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress()}%`,
                height: '100%',
                'background-color': '#3b82f6',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
          <p style={{ color: '#6b7280', 'font-size': '0.875rem' }}>
            {props.eventType?.includes('inventory')
              ? `Analizando movimientos de inventario... ${progress()}%`
              : `Analizando facturas... ${progress()}%`
            }
          </p>
        </div>
      </Show>

      {/* Error State */}
      <Show when={error()}>
        <div style={{ 'text-align': 'center', padding: '2rem', color: '#dc2626' }}>
          <p>Error: {error()}</p>
          <button
            onClick={() => extractFields(undefined, props.eventType)}
            style={{
              'margin-top': '1rem',
              padding: '0.5rem 1rem',
              'background-color': '#3b82f6',
              color: 'white',
              border: 'none',
              'border-radius': '0.375rem',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </Show>

      {/* Main Content */}
      <Show when={!isExtracting() && schema()}>
        <div style={containerStyle}>
          {/* Left Panel - Source Fields */}
          <div style={panelStyle}>
            <h4 style={{ 'font-size': '0.9rem', 'font-weight': '600', 'margin-bottom': '0.5rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              {props.eventType?.includes('inventory') ? '📦 Campos de Movimiento' : '📊 Campos Disponibles'}
              <span style={{ 'font-size': '0.7rem', color: '#6b7280', 'font-weight': 'normal' }}>
                ({schema()?.fields.length} campos)
              </span>
            </h4>

            {/* Search */}
            <input
              type="text"
              placeholder="Buscar campos..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.375rem 0.5rem',
                border: '1px solid #d1d5db',
                'border-radius': '0.375rem',
                'font-size': '0.75rem',
                'margin-bottom': '0.5rem'
              }}
            />

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', 'flex-wrap': 'wrap', 'margin-bottom': '0.5rem' }}>
              <button
                style={categoryTabStyle(selectedCategory() === null)}
                onClick={() => setSelectedCategory(null)}
              >
                Todos
              </button>
              <For each={schema()?.categories}>
                {(category) => (
                  <button
                    style={categoryTabStyle(selectedCategory() === category.name)}
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    {category.icon} {category.name}
                  </button>
                )}
              </For>
            </div>

            {/* Field List */}
            <div style={{ 'max-height': '400px', 'overflow-y': 'auto' }}>
              <For each={filteredFields()}>
                {(field) => (
                  <div
                    draggable={true}
                    onDragStart={(e) => handleDragStart(field, e)}
                    onDragEnd={handleDragEnd}
                    style={fieldItemStyle(draggedField()?.path === field.path)}
                  >
                    <span style={{
                      padding: '0.125rem 0.25rem',
                      'background-color': typeColors[field.type]?.bg || '#f3f4f6',
                      color: typeColors[field.type]?.text || '#374151',
                      'border-radius': '0.25rem',
                      'font-size': '0.55rem',
                      'font-weight': '600',
                      'text-transform': 'uppercase'
                    }}>
                      {field.type}
                    </span>

                    <div style={{ flex: 1, 'min-width': 0 }}>
                      <div style={{ 'font-weight': '500', 'font-size': '0.75rem', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                        {field.path.replace('data.', '')}
                      </div>
                    </div>

                    <span style={{
                      'font-size': '0.6rem',
                      color: field.coverage >= 80 ? '#059669' : field.coverage >= 50 ? '#d97706' : '#9ca3af',
                      'font-weight': '500'
                    }}>
                      {field.coverage}%
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Right Panel - Drop Zones */}
          <div style={{ ...panelStyle, display: 'flex', 'flex-direction': 'column', padding: '0.75rem' }}>
            <h4 style={{ 'font-size': '0.9rem', 'font-weight': '600', 'margin-bottom': '0.5rem', padding: '0 0.25rem' }}>
              🎯 Arrastra campos aquí
            </h4>

            {/* Scrollable container for all sections */}
            <div style={{ flex: 1, 'overflow-y': 'auto', 'padding-right': '0.25rem','max-height': '540px', }}>
              

              

              {/* Journal Lines Section */}
              <div style={{
                'background-color': '#f0fdf4',
                'border-radius': '0.375rem',
                padding: '0.5rem',
                'margin-bottom': '0.75rem',
                border: '1px solid #bbf7d0',
                'max-height': '200px',
                'overflow-y': 'auto'
              }}>
                <div style={{ 'font-size': '0.7rem', 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#166534' }}>
                  📋 Líneas de Asiento ({props.journalLines?.length || 0})
                </div>

                <Show when={!props.journalLines || props.journalLines.length === 0}>
                  <div style={{ 'font-size': '0.65rem', color: '#6b7280', 'font-style': 'italic', 'text-align': 'center', padding: '0.5rem' }}>
                    No hay líneas. Crea una abajo.
                  </div>
                </Show>

                <For each={props.journalLines}>
                  {(line, index) => (
                    <div style={{
                      border: '1px solid #d1d5db',
                      'border-radius': '0.375rem',
                      padding: '0.375rem',
                      'margin-bottom': '0.375rem',
                      'background-color': 'white'
                    }}>
                      <div style={{ 'font-size': '0.6rem', 'font-weight': '600', 'margin-bottom': '0.25rem', display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
                        <span style={{
                          padding: '0.0625rem 0.25rem',
                          'background-color': line.isDebit ? '#dcfce7' : '#fee2e2',
                          color: line.isDebit ? '#166534' : '#991b1b',
                          'border-radius': '0.125rem',
                          'font-size': '0.5rem'
                        }}>
                          {line.isDebit ? 'D' : 'C'}
                        </span>
                        <span>L{index() + 1}</span>
                      </div>
                      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.25rem' }}>
                        <div
                          onDragOver={(e) => handleDragOver(`line-${index()}-amount`, e)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDropLineAmount(index(), e)}
                          style={{
                            padding: '0.25rem',
                            border: activeDropZone() === `line-${index()}-amount` ? '2px dashed #059669' : '1px dashed #d1d5db',
                            'border-radius': '0.25rem',
                            'background-color': activeDropZone() === `line-${index()}-amount` ? '#dcfce7' : '#fafafa',
                            'text-align': 'center',
                            'font-size': '0.55rem'
                          }}
                        >
                          💰 {line.amountExpression?.replace('data.', '').slice(0, 12) || 'Monto'}
                        </div>
                        <div
                          onDragOver={(e) => handleDragOver(`line-${index()}-desc`, e)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDropLineDescription(index(), e)}
                          style={{
                            padding: '0.25rem',
                            border: activeDropZone() === `line-${index()}-desc` ? '2px dashed #7c3aed' : '1px dashed #d1d5db',
                            'border-radius': '0.25rem',
                            'background-color': activeDropZone() === `line-${index()}-desc` ? '#f3e8ff' : '#fafafa',
                            'text-align': 'center',
                            'font-size': '0.55rem'
                          }}
                        >
                          📝 {line.descriptionTemplate?.slice(0, 10) || 'Desc'}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              {/* New Line Creation Section */}
              <div style={{
                'background-color': '#fffbeb',
                'border-radius': '0.375rem',
                padding: '0.5rem',
                'margin-bottom': '0.75rem',
                border: '1px solid #fcd34d'
              }}>
                <div style={{ 'font-size': '0.7rem', 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#d97706' }}>
                  ➕ Nueva Línea
                </div>
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.375rem', 'margin-bottom': '0.375rem' }}>
                  <div
                    onDragOver={(e) => handleDragOver('newline-amount', e)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropNewLineAmount}
                    style={{
                      padding: '0.375rem',
                      border: activeDropZone() === 'newline-amount' ? '2px dashed #059669' : '1px dashed #d1d5db',
                      'border-radius': '0.25rem',
                      'background-color': newLineAmount() ? '#dcfce7' : (activeDropZone() === 'newline-amount' ? '#dcfce7' : 'white'),
                      'text-align': 'center',
                      'font-size': '0.65rem'
                    }}
                  >
                    <div style={{ 'font-weight': '600', color: '#059669' }}>💰 Monto*</div>
                    <div style={{ color: newLineAmount() ? '#166534' : '#9ca3af', 'font-size': '0.6rem' }}>
                      {newLineAmount()?.replace('data.', '') || 'Arrastra'}
                    </div>
                  </div>
                  <div
                    onDragOver={(e) => handleDragOver('newline-desc', e)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropNewLineDescription}
                    style={{
                      padding: '0.375rem',
                      border: activeDropZone() === 'newline-desc' ? '2px dashed #7c3aed' : '1px dashed #d1d5db',
                      'border-radius': '0.25rem',
                      'background-color': newLineDescription() ? '#f3e8ff' : (activeDropZone() === 'newline-desc' ? '#f3e8ff' : 'white'),
                      'text-align': 'center',
                      'font-size': '0.65rem'
                    }}
                  >
                    <div style={{ 'font-weight': '600', color: '#7c3aed' }}>📝 Desc</div>
                    <div style={{ color: newLineDescription() ? '#7c3aed' : '#9ca3af', 'font-size': '0.6rem' }}>
                      {newLineDescription()?.replace('data.', '') || 'Opcional'}
                    </div>
                  </div>
                </div>
                <Show when={newLineAmount()}>
                  <button
                    onClick={createNewLine}
                    style={{
                      width: '100%',
                      padding: '0.25rem',
                      'background-color': '#d97706',
                      color: 'white',
                      border: 'none',
                      'border-radius': '0.25rem',
                      'font-size': '0.65rem',
                      'font-weight': '600',
                      cursor: 'pointer'
                    }}
                  >
                    ➕ Crear (con condición {'>'}0)
                  </button>
                </Show>
              </div>

              {/* Custom Field Section */}
              <div style={{
                'background-color': '#faf5ff',
                'border-radius': '0.375rem',
                padding: '0.5rem',
                'margin-bottom': '0.75rem',
                border: '1px solid #e9d5ff'
              }}>
                <div style={{ 'font-size': '0.7rem', 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#7c3aed' }}>
                  ⚙️ Campo Personalizado
                </div>
                <input
                  type="text"
                  placeholder="Nombre (auto desde campo)"
                  value={customFieldName()}
                  onInput={(e) => setCustomFieldName(e.currentTarget.value)}
                  style={{
                    width: '100%',
                    padding: '0.25rem 0.375rem',
                    border: '1px solid #d1d5db',
                    'border-radius': '0.25rem',
                    'font-size': '0.65rem',
                    'margin-bottom': '0.25rem'
                  }}
                />
                <div
                  onDragOver={(e) => handleDragOver('custom-expr', e)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropCustomFieldExpression}
                  style={{
                    padding: '0.375rem',
                    border: activeDropZone() === 'custom-expr' ? '2px dashed #7c3aed' : '1px dashed #d1d5db',
                    'border-radius': '0.25rem',
                    'background-color': customFieldExpression() ? '#f3e8ff' : (activeDropZone() === 'custom-expr' ? '#f3e8ff' : 'white'),
                    'min-height': '35px',
                    'font-size': '0.6rem',
                    'font-family': 'monospace',
                    'margin-bottom': '0.25rem',
                    'word-break': 'break-all'
                  }}
                >
                  {customFieldExpression() || (
                    <span style={{ color: '#9ca3af' }}>Arrastra campos (se suman con +)</span>
                  )}
                </div>
                <Show when={customFieldName() && customFieldExpression()}>
                  <button
                    onClick={createCustomField}
                    style={{
                      width: '100%',
                      padding: '0.25rem',
                      'background-color': '#7c3aed',
                      color: 'white',
                      border: 'none',
                      'border-radius': '0.25rem',
                      'font-size': '0.65rem',
                      'font-weight': '600',
                      cursor: 'pointer'
                    }}
                  >
                    ⚙️ Crear: {customFieldName()}
                  </button>
                </Show>
              </div>

              {/* General Fields Section */}
              <div style={{
                'background-color': '#f9fafb',
                'border-radius': '0.375rem',
                padding: '0.5rem',
                'margin-bottom': '0.75rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ 'font-size': '0.7rem', 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#374151' }}>
                  📋 Campos Generales
                </div>

                {/* Condition Drop Zone */}
                <div style={{ 'margin-bottom': '0.5rem' }}>
                  <div
                    onDragOver={(e) => handleDragOver('condition', e)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropCondition}
                    style={{ ...dropZoneStyle('condition', '#dc2626'), 'min-height': '45px', padding: '0.5rem' }}
                  >
                    <span style={{ 'font-size': '0.7rem', color: '#6b7280' }}>
                      🔍 {activeDropZone() === 'condition' ? 'Soltar' : 'Condición'}
                    </span>
                  </div>
                </div>
                  {/* Description & Reference in row */}
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.375rem' }}>
                  <div
                    onDragOver={(e) => handleDragOver('description', e)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropDescription}
                    style={{ ...dropZoneStyle('description', '#7c3aed'), 'min-height': '40px', padding: '0.375rem' }}
                  >
                    <span style={{ 'font-size': '0.65rem', color: '#6b7280' }}>
                      📝 {activeDropZone() === 'description' ? 'Soltar' : 'Descripción'}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => handleDragOver('reference', e)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropReference}
                    style={{ ...dropZoneStyle('reference', '#0891b2'), 'min-height': '40px', padding: '0.375rem' }}
                  >
                    <span style={{ 'font-size': '0.65rem', color: '#6b7280' }}>
                      🔗 {activeDropZone() === 'reference' ? 'Soltar' : 'Referencia'}
                    </span>
                  </div>
                </div>
             

              {/* Mappings Section */}
              <Show when={mappings().length > 0}>
                <div style={{
                  'background-color': '#f9fafb',
                  'border-radius': '0.375rem',
                  padding: '0.5rem',
                  border: '1px solid #e5e7eb',
                  'max-height': '100px',
                  'overflow-y': 'auto'
                }}>
                  <div style={{ 'font-size': '0.7rem', 'font-weight': '600', 'margin-bottom': '0.375rem', color: '#374151' }}>
                    ✅ Mapeos ({mappings().length})
                  </div>
                  <For each={mappings()}>
                    {(mapping, index) => (
                      <div style={{
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'space-between',
                        padding: '0.125rem 0.25rem',
                        'background-color': 'white',
                        'border-radius': '0.125rem',
                        'margin-bottom': '0.125rem',
                        'font-size': '0.55rem'
                      }}>
                        <span>
                          <strong>{mapping.sourceField.path.replace('data.', '')}</strong>
                          {' → '}
                          <span style={{ color: '#6b7280' }}>{mapping.targetType}</span>
                        </span>
                        <button
                          onClick={() => removeMapping(index())}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '0',
                            'font-size': '0.6rem'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default VisualRuleMapper;
