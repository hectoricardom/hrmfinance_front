/**
 * InvoiceSchemaAnalyzer Component - Approach 3: Complete Field Extraction
 *
 * Comprehensive invoice analysis that:
 * - Fetches ALL invoices from the database
 * - Compares invoice structures to find ALL possible fields
 * - Creates a unified "super schema" with all fields
 * - Shows field coverage and sample values
 * - Allows fields to be dragged to rule targets
 */

import { Component, createSignal, For, Show, createMemo, onMount } from 'solid-js';
import { useTranslation } from '../../../translations';
import { useInvoiceFieldExtractor, ExtractedField, FieldCategory } from '../hooks/useInvoiceFieldExtractor';

interface InvoiceSchemaAnalyzerProps {
  onFieldSelect: (fieldPath: string, targetType: string) => void;
  onSchemaReady?: (fields: ExtractedField[]) => void;
}

const InvoiceSchemaAnalyzer: Component<InvoiceSchemaAnalyzerProps> = (props) => {
  const { t } = useTranslation();
  const { extractFields, isExtracting, progress, error, schema } = useInvoiceFieldExtractor();

  const [viewMode, setViewMode] = createSignal<'tree' | 'flat' | 'categories'>('categories');
  const [expandedPaths, setExpandedPaths] = createSignal<Set<string>>(new Set());
  const [selectedField, setSelectedField] = createSignal<ExtractedField | null>(null);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [filterType, setFilterType] = createSignal<string | null>(null);
  const [sortBy, setSortBy] = createSignal<'path' | 'coverage' | 'type'>('coverage');
  const [invoiceLimit, setInvoiceLimit] = createSignal(100);

  // Analyze invoices on mount
  onMount(() => {
    extractFields(invoiceLimit()).then(() => {
      if (schema()) {
        props.onSchemaReady?.(schema()!.fields);
      }
    });
  });

  // Build tree structure from flat fields
  const fieldTree = createMemo(() => {
    const s = schema();
    if (!s) return [];

    const tree: Map<string, { field: ExtractedField | null; children: Map<string, any> }> = new Map();

    s.fields.forEach(field => {
      const parts = field.path.split('.');
      let current = tree;

      parts.forEach((part, index) => {
        if (!current.has(part)) {
          current.set(part, { field: null, children: new Map() });
        }
        const node = current.get(part)!;
        if (index === parts.length - 1) {
          node.field = field;
        }
        current = node.children;
      });
    });

    return tree;
  });

  // Filtered and sorted fields
  const filteredFields = createMemo(() => {
    const s = schema();
    if (!s) return [];

    let fields = [...s.fields];

    // Filter by search
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      fields = fields.filter(f =>
        f.path.toLowerCase().includes(term) ||
        f.description.toLowerCase().includes(term)
      );
    }

    // Filter by type
    if (filterType()) {
      fields = fields.filter(f => f.type === filterType());
    }

    // Sort
    switch (sortBy()) {
      case 'coverage':
        fields.sort((a, b) => b.coverage - a.coverage);
        break;
      case 'path':
        fields.sort((a, b) => a.path.localeCompare(b.path));
        break;
      case 'type':
        fields.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    return fields;
  });

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleDragStart = (field: ExtractedField, e: DragEvent) => {
    e.dataTransfer!.effectAllowed = 'copy';
    e.dataTransfer!.setData('text/plain', field.path);
    e.dataTransfer!.setData('application/json', JSON.stringify(field));
  };

  const handleQuickAdd = (field: ExtractedField, targetType: string) => {
    props.onFieldSelect(field.path, targetType);
  };

  const reanalyze = () => {
    extractFields(invoiceLimit()).then(() => {
      if (schema()) {
        props.onSchemaReady?.(schema()!.fields);
      }
    });
  };

  // Type colors
  const typeColors: Record<string, { bg: string; text: string; border: string }> = {
    string: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    number: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    boolean: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    date: { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
    array: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    object: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  };

  // Styles
  const containerStyle = {
    'background-color': 'white',
    'border-radius': '0.5rem',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    'background-color': '#f9fafb',
    'border-bottom': '1px solid #e5e7eb',
  };

  const statsBarStyle = {
    display: 'flex',
    gap: '1.5rem',
    padding: '0.75rem 1rem',
    'background-color': '#f3f4f6',
    'border-bottom': '1px solid #e5e7eb',
    'font-size': '0.75rem',
  };

  const fieldCardStyle = (field: ExtractedField) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.625rem 0.75rem',
    'background-color': 'white',
    border: `1px solid ${typeColors[field.type]?.border || '#e5e7eb'}`,
    'border-left': `4px solid ${typeColors[field.type]?.border || '#e5e7eb'}`,
    'border-radius': '0.375rem',
    'margin-bottom': '0.375rem',
    cursor: 'grab',
    transition: 'all 0.15s',
  });

  const categoryCardStyle = {
    'background-color': 'white',
    border: '1px solid #e5e7eb',
    'border-radius': '0.5rem',
    'margin-bottom': '1rem',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', margin: 0, display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            🔬 Invoice Schema Analyzer
          </h3>
          <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
            Analyze all invoices to extract a complete field schema
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
          <select
            value={invoiceLimit()}
            onChange={(e) => setInvoiceLimit(parseInt(e.currentTarget.value))}
            style={{
              padding: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              'border-radius': '0.375rem',
              'font-size': '0.75rem'
            }}
          >
            <option value={25}>25 invoices</option>
            <option value={50}>50 invoices</option>
            <option value={100}>100 invoices</option>
            <option value={250}>250 invoices</option>
            <option value={500}>All invoices</option>
          </select>

          <button
            onClick={reanalyze}
            disabled={isExtracting()}
            style={{
              padding: '0.375rem 0.75rem',
              'background-color': '#3b82f6',
              color: 'white',
              border: 'none',
              'border-radius': '0.375rem',
              cursor: isExtracting() ? 'not-allowed' : 'pointer',
              'font-size': '0.75rem',
              'font-weight': '500',
              opacity: isExtracting() ? 0.5 : 1,
            }}
          >
            {isExtracting() ? 'Analyzing...' : '🔄 Re-analyze'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      <Show when={isExtracting()}>
        <div style={{ padding: '2rem', 'text-align': 'center' }}>
          <div style={{
            width: '100%',
            'max-width': '300px',
            margin: '0 auto 1rem',
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
          <p style={{ color: '#6b7280', 'font-size': '0.875rem' }}>
            Analyzing {invoiceLimit()} invoices... {progress()}%
          </p>
          <p style={{ color: '#9ca3af', 'font-size': '0.75rem' }}>
            Extracting all unique fields from invoice data
          </p>
        </div>
      </Show>

      {/* Error State */}
      <Show when={error()}>
        <div style={{ padding: '2rem', 'text-align': 'center', color: '#dc2626' }}>
          <p style={{ 'font-size': '0.875rem' }}>⚠️ {error()}</p>
          <button
            onClick={reanalyze}
            style={{
              'margin-top': '0.5rem',
              padding: '0.375rem 0.75rem',
              'background-color': '#3b82f6',
              color: 'white',
              border: 'none',
              'border-radius': '0.375rem',
              cursor: 'pointer',
              'font-size': '0.75rem'
            }}
          >
            Retry Analysis
          </button>
        </div>
      </Show>

      {/* Main Content */}
      <Show when={!isExtracting() && !error() && schema()}>
        {/* Stats Bar */}
        <div style={statsBarStyle}>
          <div>
            <strong>{schema()?.totalInvoices}</strong> invoices analyzed
          </div>
          <div>
            <strong>{schema()?.fields.length}</strong> unique fields found
          </div>
          <div>
            <strong>{schema()?.categories.length}</strong> categories
          </div>
          <div style={{ color: '#059669' }}>
            <strong>{schema()?.fields.filter(f => f.coverage >= 80).length}</strong> high coverage (≥80%)
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '0.75rem 1rem', 'border-bottom': '1px solid #e5e7eb', display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            style={{
              flex: 1,
              'min-width': '200px',
              padding: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              'border-radius': '0.375rem',
              'font-size': '0.75rem'
            }}
          />

          {/* View Mode */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <For each={['categories', 'flat', 'tree'] as const}>
              {(mode) => (
                <button
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '0.375rem 0.5rem',
                    'background-color': viewMode() === mode ? '#3b82f6' : 'white',
                    color: viewMode() === mode ? 'white' : '#6b7280',
                    border: '1px solid #d1d5db',
                    'border-radius': '0.25rem',
                    cursor: 'pointer',
                    'font-size': '0.7rem',
                    'text-transform': 'capitalize'
                  }}
                >
                  {mode}
                </button>
              )}
            </For>
          </div>

          {/* Type Filter */}
          <select
            value={filterType() || ''}
            onChange={(e) => setFilterType(e.currentTarget.value || null)}
            style={{
              padding: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              'border-radius': '0.375rem',
              'font-size': '0.75rem'
            }}
          >
            <option value="">All Types</option>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy()}
            onChange={(e) => setSortBy(e.currentTarget.value as any)}
            style={{
              padding: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              'border-radius': '0.375rem',
              'font-size': '0.75rem'
            }}
          >
            <option value="coverage">Sort by Coverage</option>
            <option value="path">Sort by Path</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>

        {/* Fields Content */}
        <div style={{ padding: '1rem', 'max-height': '500px', 'overflow-y': 'auto' }}>
          {/* Categories View */}
          <Show when={viewMode() === 'categories'}>
            <For each={schema()?.categories}>
              {(category) => (
                <div style={categoryCardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      padding: '0.75rem 1rem',
                      'background-color': '#f9fafb',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleExpand(category.name)}
                  >
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                      <span style={{ 'font-size': '1.25rem' }}>{category.icon}</span>
                      <span style={{ 'font-weight': '600' }}>{category.name}</span>
                      <span style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                        ({category.fields.length} fields)
                      </span>
                    </div>
                    <span style={{ color: '#6b7280' }}>
                      {expandedPaths().has(category.name) ? '▼' : '▶'}
                    </span>
                  </div>

                  <Show when={expandedPaths().has(category.name)}>
                    <div style={{ padding: '0.5rem 0.75rem' }}>
                      <For each={category.fields.filter(f =>
                        !searchTerm() || f.path.toLowerCase().includes(searchTerm().toLowerCase())
                      )}>
                        {(field) => (
                          <div
                            draggable={true}
                            onDragStart={(e) => handleDragStart(field, e)}
                            style={fieldCardStyle(field)}
                          >
                            {/* Type Badge */}
                            <span style={{
                              padding: '0.125rem 0.375rem',
                              'background-color': typeColors[field.type]?.bg,
                              color: typeColors[field.type]?.text,
                              'border-radius': '0.25rem',
                              'font-size': '0.625rem',
                              'font-weight': '600',
                              'text-transform': 'uppercase'
                            }}>
                              {field.type}
                            </span>

                            {/* Field Info */}
                            <div style={{ flex: 1 }}>
                              <div style={{ 'font-weight': '500', 'font-size': '0.8rem' }}>
                                {field.path.replace('data.', '')}
                              </div>
                              <div style={{ 'font-size': '0.7rem', color: '#6b7280' }}>
                                {field.description}
                              </div>
                            </div>

                            {/* Coverage */}
                            <div style={{
                              display: 'flex',
                              'flex-direction': 'column',
                              'align-items': 'flex-end',
                              'min-width': '50px'
                            }}>
                              <span style={{
                                'font-size': '0.7rem',
                                'font-weight': '600',
                                color: field.coverage >= 80 ? '#059669' : field.coverage >= 50 ? '#d97706' : '#6b7280'
                              }}>
                                {field.coverage}%
                              </span>
                              <div style={{
                                width: '40px',
                                height: '3px',
                                'background-color': '#e5e7eb',
                                'border-radius': '1.5px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${field.coverage}%`,
                                  height: '100%',
                                  'background-color': field.coverage >= 80 ? '#059669' : field.coverage >= 50 ? '#d97706' : '#9ca3af'
                                }} />
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleQuickAdd(field, 'condition'); }}
                                style={{
                                  padding: '0.25rem',
                                  'background-color': '#fee2e2',
                                  border: 'none',
                                  'border-radius': '0.25rem',
                                  cursor: 'pointer',
                                  'font-size': '0.7rem'
                                }}
                                title="Add as condition"
                              >
                                🔍
                              </button>
                              <Show when={field.type === 'number'}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleQuickAdd(field, 'amount'); }}
                                  style={{
                                    padding: '0.25rem',
                                    'background-color': '#dbeafe',
                                    border: 'none',
                                    'border-radius': '0.25rem',
                                    cursor: 'pointer',
                                    'font-size': '0.7rem'
                                  }}
                                  title="Add as amount"
                                >
                                  💰
                                </button>
                              </Show>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleQuickAdd(field, 'description'); }}
                                style={{
                                  padding: '0.25rem',
                                  'background-color': '#fef3c7',
                                  border: 'none',
                                  'border-radius': '0.25rem',
                                  cursor: 'pointer',
                                  'font-size': '0.7rem'
                                }}
                                title="Add to description"
                              >
                                📝
                              </button>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </Show>

          {/* Flat View */}
          <Show when={viewMode() === 'flat'}>
            <For each={filteredFields()}>
              {(field) => (
                <div
                  draggable={true}
                  onDragStart={(e) => handleDragStart(field, e)}
                  style={fieldCardStyle(field)}
                >
                  <span style={{
                    padding: '0.125rem 0.375rem',
                    'background-color': typeColors[field.type]?.bg,
                    color: typeColors[field.type]?.text,
                    'border-radius': '0.25rem',
                    'font-size': '0.625rem',
                    'font-weight': '600'
                  }}>
                    {field.type}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ 'font-weight': '500', 'font-size': '0.8rem' }}>
                      {field.path.replace('data.', '')}
                    </div>
                    <div style={{ 'font-size': '0.7rem', color: '#6b7280' }}>
                      {field.description}
                    </div>
                  </div>

                  <span style={{
                    padding: '0.125rem 0.375rem',
                    'background-color': field.coverage >= 80 ? '#dcfce7' : field.coverage >= 50 ? '#fef3c7' : '#f3f4f6',
                    color: field.coverage >= 80 ? '#166534' : field.coverage >= 50 ? '#92400e' : '#6b7280',
                    'border-radius': '0.25rem',
                    'font-size': '0.625rem',
                    'font-weight': '600'
                  }}>
                    {field.coverage}%
                  </span>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickAdd(field, 'condition'); }}
                      style={{ padding: '0.25rem', 'background-color': '#fee2e2', border: 'none', 'border-radius': '0.25rem', cursor: 'pointer', 'font-size': '0.7rem' }}
                    >🔍</button>
                    <Show when={field.type === 'number'}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleQuickAdd(field, 'amount'); }}
                        style={{ padding: '0.25rem', 'background-color': '#dbeafe', border: 'none', 'border-radius': '0.25rem', cursor: 'pointer', 'font-size': '0.7rem' }}
                      >💰</button>
                    </Show>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickAdd(field, 'description'); }}
                      style={{ padding: '0.25rem', 'background-color': '#fef3c7', border: 'none', 'border-radius': '0.25rem', cursor: 'pointer', 'font-size': '0.7rem' }}
                    >📝</button>
                  </div>
                </div>
              )}
            </For>
          </Show>

          {/* Tree View */}
          <Show when={viewMode() === 'tree'}>
            <div style={{ 'font-family': 'monospace', 'font-size': '0.8rem' }}>
              <For each={Array.from(fieldTree().entries())}>
                {([key, node]) => (
                  <TreeNode
                    nodeKey={key}
                    node={node}
                    level={0}
                    expandedPaths={expandedPaths()}
                    onToggle={toggleExpand}
                    onFieldSelect={handleQuickAdd}
                    typeColors={typeColors}
                  />
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          padding: '0.75rem 1rem',
          'background-color': '#f9fafb',
          'border-top': '1px solid #e5e7eb',
          'font-size': '0.7rem',
          'flex-wrap': 'wrap'
        }}>
          <span style={{ color: '#6b7280' }}>Field Types:</span>
          <For each={Object.entries(typeColors)}>
            {([type, colors]) => (
              <span style={{
                padding: '0.125rem 0.375rem',
                'background-color': colors.bg,
                color: colors.text,
                'border-radius': '0.25rem',
                'font-weight': '500'
              }}>
                {type}
              </span>
            )}
          </For>
          <span style={{ 'margin-left': 'auto', color: '#6b7280' }}>
            💡 Drag fields to targets or click quick-add buttons
          </span>
        </div>
      </Show>
    </div>
  );
};

// Tree Node Component
interface TreeNodeProps {
  nodeKey: string;
  node: { field: ExtractedField | null; children: Map<string, any> };
  level: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFieldSelect: (field: ExtractedField, targetType: string) => void;
  typeColors: Record<string, { bg: string; text: string; border: string }>;
}

const TreeNode: Component<TreeNodeProps> = (props) => {
  const hasChildren = () => props.node.children.size > 0;
  const isExpanded = () => props.expandedPaths.has(props.nodeKey);

  return (
    <div style={{ 'margin-left': `${props.level * 16}px` }}>
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '0.25rem',
          padding: '0.25rem 0',
          cursor: hasChildren() ? 'pointer' : 'default'
        }}
        onClick={() => hasChildren() && props.onToggle(props.nodeKey)}
      >
        <Show when={hasChildren()}>
          <span style={{ color: '#6b7280', 'font-size': '0.7rem' }}>
            {isExpanded() ? '▼' : '▶'}
          </span>
        </Show>
        <Show when={!hasChildren()}>
          <span style={{ width: '12px' }} />
        </Show>

        <span style={{ color: props.node.field ? '#1f2937' : '#6b7280' }}>
          {props.nodeKey}
        </span>

        <Show when={props.node.field}>
          <span style={{
            padding: '0 0.25rem',
            'background-color': props.typeColors[props.node.field!.type]?.bg || '#f3f4f6',
            color: props.typeColors[props.node.field!.type]?.text || '#6b7280',
            'border-radius': '0.125rem',
            'font-size': '0.6rem'
          }}>
            {props.node.field!.type}
          </span>
          <span style={{ 'font-size': '0.65rem', color: '#9ca3af' }}>
            ({props.node.field!.coverage}%)
          </span>
        </Show>
      </div>

      <Show when={isExpanded()}>
        <For each={Array.from(props.node.children.entries())}>
          {([key, childNode]) => (
            <TreeNode
              nodeKey={key}
              node={childNode}
              level={props.level + 1}
              expandedPaths={props.expandedPaths}
              onToggle={props.onToggle}
              onFieldSelect={props.onFieldSelect}
              typeColors={props.typeColors}
            />
          )}
        </For>
      </Show>
    </div>
  );
};

export default InvoiceSchemaAnalyzer;
