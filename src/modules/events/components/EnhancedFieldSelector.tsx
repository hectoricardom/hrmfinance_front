import { Component, createSignal, Show, For, createMemo } from 'solid-js';
import { EventType, CustomField } from '../types/eventTypes';
import { getEventTemplate } from '../data/eventTemplates';

interface EnhancedFieldSelectorProps {
  eventType: EventType;
  onFieldSelect: (fieldPath: string, fieldType: string) => void;
  onExpressionInsert: (expression: string) => void;
  currentValue?: string;
  cursorPosition?: number;
  customFields?: CustomField[];
}

interface FieldNode {
  path: string;
  name: string;
  type: string;
  description: string;
  children?: FieldNode[];
  example?: any;
}

const EnhancedFieldSelector: Component<EnhancedFieldSelectorProps> = (props) => {
  const [expandedPaths, setExpandedPaths] = createSignal<Set<string>>(new Set([
    'data', 
    'custom',
    'data.shipper_consignee',
    'data.products[0]',
    'data.products[0].product',
    'data.reservas[0]', 
    'data.services[0]',
    'data.paymentMethods'
  ])); // Start with key sections expanded
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedTab, setSelectedTab] = createSignal<'fields' | 'expressions' | 'functions'>('fields');

  // Get event template and build field tree
  const fieldTree = createMemo(() => {
    if (!props.eventType) {
      return [];
    }
    
    const template = getEventTemplate(props.eventType);
    if (!template) {
      return [];
    }
    
    // Build field tree from flat field paths
    const buildFieldTreeFromPaths = (dataStructure: Record<string, any>): FieldNode[] => {
      const tree: Record<string, any> = {};
      
      // First, organize fields into a tree structure
      Object.entries(dataStructure).forEach(([fieldPath, definition]) => {
        const parts = fieldPath.split('.');
        let current = tree;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;
          
          if (isLast) {
            // Leaf node
            current[part] = {
              _definition: definition,
              _path: fieldPath
            };
          } else {
            // Branch node
            if (!current[part] || current[part]._definition) {
              current[part] = {};
            }
          }
          current = current[part];
        }
      });
      
      // Convert tree to FieldNode array
      const convertToNodes = (obj: any, parentPath = ''): FieldNode[] => {
        const nodes: FieldNode[] = [];
        
        Object.entries(obj).forEach(([key, value]: [string, any]) => {
          if (value._definition) {
            // Leaf node with field definition
            const node: FieldNode = {
              path: value._path,
              name: key.replace(/\[\d+\]/, '[0]'), // Clean up array notation
              type: value._definition.type,
              description: value._definition.description || '',
              example: value._definition.example
            };
            nodes.push(node);
          } else if (typeof value === 'object' && value !== null) {
            // Branch node - has children
            const children = convertToNodes(value, parentPath ? `${parentPath}.${key}` : key);
            if (children.length > 0) {
              const node: FieldNode = {
                path: parentPath ? `${parentPath}.${key}` : key,
                name: key.replace(/\[\d+\]/, '[0]'), // Clean up array notation
                type: 'object',
                description: `${key.charAt(0).toUpperCase() + key.slice(1)} fields`,
                children: children
              };
              nodes.push(node);
            }
          }
        });
        
        return nodes.sort((a, b) => {
          // Sort with objects first, then leaf nodes, alphabetically within each group
          if (a.children && !b.children) return -1;
          if (!a.children && b.children) return 1;
          return a.name.localeCompare(b.name);
        });
      };
      
      return convertToNodes(tree);
    };

    const baseFields = buildFieldTreeFromPaths(template.dataStructure);
    
    // If we don't have a proper tree structure, show all fields directly
    if (baseFields.length === 0) {
      // Create direct field nodes from the data structure
      const directFields: FieldNode[] = Object.entries(template.dataStructure).map(([fieldPath, definition]) => ({
        path: fieldPath,
        name: fieldPath.replace('data.', ''),
        type: definition.type,
        description: definition.description || '',
        example: definition.example
      }));
      
      const dataContainer: FieldNode = {
        path: 'data',
        name: 'data',
        type: 'object',
        description: 'Event data fields',
        children: directFields
      };
      
      return [dataContainer];
    }
    
    // Filter to show only 'data' node from base fields
    const dataNode = baseFields.find(node => node.name === 'data');
    const result: FieldNode[] = [];
    
    if (dataNode) {
      result.push(dataNode);
    }
    
    // Add custom fields as a separate section
    const customFieldNodes = (props.customFields || []).map(field => ({
      path: `custom.${field.name}`,
      name: field.name,
      type: 'expression' as const,
      description: field.description || `Custom field: ${field.expression}`,
      example: field.expression
    }));
    
    if (customFieldNodes.length > 0) {
      const customFieldsContainer: FieldNode = {
        path: 'custom',
        name: 'custom',
        type: 'object',
        description: 'Custom fields defined for this rule',
        children: customFieldNodes
      };
      result.push(customFieldsContainer);
    }
    
    return result;
  });

  // Filter fields based on search
  const filteredFields = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) return fieldTree();

    const filterTree = (nodes: FieldNode[]): FieldNode[] => {
      return nodes.reduce((acc: FieldNode[], node) => {
        const matchesSearch = 
          node.path.toLowerCase().includes(term) ||
          node.name.toLowerCase().includes(term) ||
          node.description.toLowerCase().includes(term);

        if (matchesSearch) {
          acc.push(node);
        } else if (node.children) {
          const filteredChildren = filterTree(node.children);
          if (filteredChildren.length > 0) {
            acc.push({ ...node, children: filteredChildren });
          }
        }

        return acc;
      }, []);
    };

    return filterTree(fieldTree());
  });

  // Common expressions based on event type
  const commonExpressions = createMemo(() => {
    const base = [
      {
        name: 'Conditional Amount',
        expression: 'data.amount > 1000 ? data.amount * 0.95 : data.amount',
        description: 'Apply 5% discount if amount > 1000'
      },
      {
        name: 'Formatted Reference',
        expression: '"REF-" + data.invoice + "-" + new Date().getFullYear()',
        description: 'Create formatted reference with year'
      },
      {
        name: 'Percentage Calculation',
        expression: 'data.totalAmount * 0.18',
        description: 'Calculate 18% of total amount'
      }
    ];

    // Add event-specific expressions
    if (props.eventType === 'invoice_completed') {
      base.push(
        {
          name: 'Total Payments',
          expression: 'data.paymentMethods.cash + data.paymentMethods.zelle + data.paymentMethods.creditCard',
          description: 'Sum all payment methods'
        },
        {
          name: 'Net Amount',
          expression: 'data.totalAmount - data.taxAmount',
          description: 'Total minus tax'
        }
      );
    }

    return base;
  });

  // Available functions
  const availableFunctions = [
    {
      name: 'Math Functions',
      items: [
        { name: 'Math.round()', description: 'Round to nearest integer' },
        { name: 'Math.floor()', description: 'Round down' },
        { name: 'Math.ceil()', description: 'Round up' },
        { name: 'Math.abs()', description: 'Absolute value' },
        { name: 'Math.min(a, b)', description: 'Minimum of two values' },
        { name: 'Math.max(a, b)', description: 'Maximum of two values' }
      ]
    },
    {
      name: 'String Functions',
      items: [
        { name: '.toUpperCase()', description: 'Convert to uppercase' },
        { name: '.toLowerCase()', description: 'Convert to lowercase' },
        { name: '.substring(0, 10)', description: 'Extract substring' },
        { name: '.replace("old", "new")', description: 'Replace text' },
        { name: '.trim()', description: 'Remove whitespace' }
      ]
    },
    {
      name: 'Date Functions',
      items: [
        { name: 'new Date()', description: 'Current date' },
        { name: 'new Date().getFullYear()', description: 'Current year' },
        { name: 'new Date().getMonth() + 1', description: 'Current month' },
        { name: 'new Date().getDate()', description: 'Current day' }
      ]
    }
  ];

  const toggleExpanded = (path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFieldClick = (field: FieldNode) => {
    props.onFieldSelect(field.path, field.type);
  };

  const handleExpressionClick = (expression: string) => {
    props.onExpressionInsert(expression);
  };

  // Styles
  const containerStyle = {
    'background-color': 'white',
    border: '1px solid #d1d5db',
    'border-radius': '0.5rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    'max-height': '500px',
    display: 'flex',
    'flex-direction': 'column' as const
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1rem',
    'background-color': isActive ? 'white' : '#f9fafb',
    border: 'none',
    'border-bottom': isActive ? '2px solid #3b82f6' : '2px solid transparent',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '500',
    color: isActive ? '#1f2937' : '#6b7280',
    'font-size': '0.875rem',
    flex: '1'
  });

  const searchStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid #e5e7eb'
  };

  const contentStyle = {
    flex: '1',
    'overflow-y': 'auto' as const,
    padding: '0.75rem'
  };

  const fieldNodeStyle = {
    'margin-bottom': '0.25rem'
  };

  const fieldItemStyle = {
    display: 'flex',
    'align-items': 'center',
    padding: '0.5rem',
    cursor: 'pointer',
    'border-radius': '0.375rem',
    'font-size': '0.875rem'
  };

  const typeTagStyle = (type: string) => ({
    'font-size': '0.7rem',
    padding: '0.125rem 0.375rem',
    'border-radius': '0.25rem',
    'margin-left': '0.5rem',
    'font-weight': '500',
    'background-color': 
      type === 'number' ? '#dbeafe' :
      type === 'string' ? '#d1fae5' :
      type === 'boolean' ? '#fef3c7' :
      type === 'object' ? '#e0e7ff' :
      '#f3f4f6',
    color:
      type === 'number' ? '#1e40af' :
      type === 'string' ? '#065f46' :
      type === 'boolean' ? '#92400e' :
      type === 'object' ? '#4338ca' :
      '#374151'
  });

  const RenderFieldNode: Component<{ node: FieldNode; level: number }> = (props) => {
    const hasChildren = props.node.children && props.node.children.length > 0;
    const isExpanded = expandedPaths().has(props.node.path);

    return (
      <div style={fieldNodeStyle}>
        <div
          style={{
            ...fieldItemStyle,
            'padding-left': `${props.level * 1.5 + 0.5}rem`
          }}
          onClick={() => hasChildren ? toggleExpanded(props.node.path) : handleFieldClick(props.node)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {hasChildren && (
            <span style={{ 'margin-right': '0.5rem', 'font-size': '0.75rem' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          
          <code style={{ 'font-family': 'monospace', color: '#059669', 'font-weight': '600' }}>
            {props.node.name}
          </code>
          
          <span style={typeTagStyle(props.node.type)}>
            {props.node.type}
          </span>
          
          <Show when={props.node.example !== undefined}>
            <span style={{
              'font-size': '0.7rem',
              color: '#6b7280',
              'margin-left': '0.5rem',
              'font-style': 'italic'
            }}>
              e.g., {JSON.stringify(props.node.example)}
            </span>
          </Show>
          
          {!hasChildren && (
            <span style={{
              'margin-left': 'auto',
              'font-size': '0.7rem',
              color: '#9ca3af'
            }}>
              Click to insert
            </span>
          )}
        </div>
        
        <Show when={props.node.description}>
          <p style={{
            'font-size': '0.75rem',
            color: '#6b7280',
            'margin-left': `${props.level * 1.5 + 2}rem`,
            'margin-top': '0.125rem',
            'margin-bottom': '0.5rem'
          }}>
            {props.node.description}
          </p>
        </Show>
        
        <Show when={hasChildren && isExpanded}>
          <For each={props.node.children}>
            {(child) => <RenderFieldNode node={child} level={props.level + 1} />}
          </For>
        </Show>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Tabs */}
      <div style={{ display: 'flex', 'border-bottom': '1px solid #e5e7eb' }}>
        <button
          style={tabStyle(selectedTab() === 'fields')}
          onClick={() => setSelectedTab('fields')}
        >
          📋 Fields
        </button>
        <button
          style={tabStyle(selectedTab() === 'expressions')}
          onClick={() => setSelectedTab('expressions')}
        >
          🧮 Expressions
        </button>
        <button
          style={tabStyle(selectedTab() === 'functions')}
          onClick={() => setSelectedTab('functions')}
        >
          🔧 Functions
        </button>
      </div>

      {/* Search (for fields tab) */}
      <Show when={selectedTab() === 'fields'}>
        <div style={searchStyle}>
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              'border-radius': '0.375rem',
              'font-size': '0.875rem'
            }}
          />
        </div>
      </Show>

      {/* Content */}
      <div style={contentStyle}>
        <Show when={selectedTab() === 'fields'}>
          <Show when={filteredFields().length > 0} fallback={
            <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
              <p style={{ 'margin-bottom': '0.5rem' }}>📋 No fields available</p>
              <p style={{ 'font-size': '0.75rem' }}>
                Select an event type to see available data fields
              </p>
            </div>
          }>
            <For each={filteredFields()}>
              {(node) => <RenderFieldNode node={node} level={0} />}
            </For>
          </Show>
        </Show>

        <Show when={selectedTab() === 'expressions'}>
          <div>
            <p style={{ 'font-size': '0.875rem', color: '#6b7280', 'margin-bottom': '1rem' }}>
              Click to insert common expressions
            </p>
            <For each={commonExpressions()}>
              {(expr) => (
                <div
                  style={{
                    padding: '0.75rem',
                    'background-color': '#f9fafb',
                    'border-radius': '0.375rem',
                    'margin-bottom': '0.5rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleExpressionClick(expr.expression)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                >
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                    {expr.name}
                  </div>
                  <code style={{
                    'font-family': 'monospace',
                    'font-size': '0.875rem',
                    color: '#059669',
                    display: 'block',
                    'margin-bottom': '0.25rem'
                  }}>
                    {expr.expression}
                  </code>
                  <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0' }}>
                    {expr.description}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={selectedTab() === 'functions'}>
          <div>
            <p style={{ 'font-size': '0.875rem', color: '#6b7280', 'margin-bottom': '1rem' }}>
              Click to insert function templates
            </p>
            <For each={availableFunctions}>
              {(category) => (
                <div style={{ 'margin-bottom': '1.5rem' }}>
                  <h4 style={{
                    'font-weight': '600',
                    'margin-bottom': '0.5rem',
                    color: '#1f2937'
                  }}>
                    {category.name}
                  </h4>
                  <For each={category.items}>
                    {(func) => (
                      <div
                        style={{
                          padding: '0.5rem',
                          cursor: 'pointer',
                          'border-radius': '0.375rem'
                        }}
                        onClick={() => handleExpressionClick(func.name)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <code style={{
                          'font-family': 'monospace',
                          color: '#6366f1',
                          'font-weight': '600'
                        }}>
                          {func.name}
                        </code>
                        <span style={{
                          'font-size': '0.75rem',
                          color: '#6b7280',
                          'margin-left': '0.5rem'
                        }}>
                          - {func.description}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default EnhancedFieldSelector;