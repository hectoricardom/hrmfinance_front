/**
 * SmartFieldLinker Component - Approach 2: One-Click Linking
 *
 * Intelligent field suggestion system with:
 * - Auto-suggested mappings based on field names and types
 * - One-click to link fields to targets
 * - Smart matching algorithm
 * - Quick-add common patterns
 */

import { Component, createSignal, For, Show, createMemo, onMount } from 'solid-js';
import { useTranslation } from '../../../translations';
import { useInvoiceFieldExtractor, ExtractedField } from '../hooks/useInvoiceFieldExtractor';

interface SuggestedLink {
  sourceField: ExtractedField;
  targetType: 'condition' | 'description' | 'amount' | 'reference' | 'account';
  confidence: number; // 0-100
  reason: string;
}

interface QuickPattern {
  name: string;
  icon: string;
  description: string;
  mappings: Array<{
    fieldPattern: string;
    targetType: string;
    transform?: string;
  }>;
}

interface SmartFieldLinkerProps {
  onLinkField: (fieldPath: string, targetType: string, transform?: string) => void;
  onApplyPattern: (pattern: QuickPattern) => void;
  eventType?: string;
}

const SmartFieldLinker: Component<SmartFieldLinkerProps> = (props) => {
  const { t } = useTranslation();
  const { extractFields, isExtracting, progress, error, schema } = useInvoiceFieldExtractor();

  const [activeTab, setActiveTab] = createSignal<'suggested' | 'all' | 'patterns'>('suggested');
  const [appliedLinks, setAppliedLinks] = createSignal<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = createSignal('');

  // Quick patterns for common accounting scenarios
  const quickPatterns: QuickPattern[] = [
    {
      name: 'Sales Invoice',
      icon: '🧾',
      description: 'Standard sales invoice with AR and Revenue entries',
      mappings: [
        { fieldPattern: 'total', targetType: 'amount', transform: 'debit:AR' },
        { fieldPattern: 'subtotal', targetType: 'amount', transform: 'credit:Revenue' },
        { fieldPattern: 'taxAmount', targetType: 'amount', transform: 'credit:TaxPayable' },
        { fieldPattern: 'invoice', targetType: 'reference' },
        { fieldPattern: 'shipper_consignee.name', targetType: 'description' },
      ]
    },
    {
      name: 'Cash Receipt',
      icon: '💵',
      description: 'Payment received - Cash/Bank and AR entries',
      mappings: [
        { fieldPattern: 'paymentMethods.cash', targetType: 'amount', transform: 'debit:Cash' },
        { fieldPattern: 'paymentMethods.zelle', targetType: 'amount', transform: 'debit:Bank' },
        { fieldPattern: 'total', targetType: 'amount', transform: 'credit:AR' },
        { fieldPattern: 'invoice', targetType: 'reference' },
      ]
    },
    {
      name: 'Inventory Sale',
      icon: '📦',
      description: 'COGS and Inventory reduction',
      mappings: [
        { fieldPattern: 'productSubtotal', targetType: 'amount', transform: 'debit:COGS' },
        { fieldPattern: 'productSubtotal', targetType: 'amount', transform: 'credit:Inventory' },
        { fieldPattern: 'invoice', targetType: 'reference' },
      ]
    },
    {
      name: 'Service Revenue',
      icon: '🔧',
      description: 'Service income recognition',
      mappings: [
        { fieldPattern: 'serviceSubtotal', targetType: 'amount', transform: 'credit:ServiceRevenue' },
        { fieldPattern: 'reservaSubtotal', targetType: 'amount', transform: 'credit:ShippingRevenue' },
        { fieldPattern: 'total', targetType: 'amount', transform: 'debit:AR' },
      ]
    },
    {
      name: 'Shipping Charges',
      icon: '🚚',
      description: 'Transport and shipping revenue',
      mappings: [
        { fieldPattern: 'transportTotal', targetType: 'amount', transform: 'credit:TransportRevenue' },
        { fieldPattern: 'reservaSubtotal', targetType: 'amount', transform: 'credit:ShippingRevenue' },
      ]
    },
  ];

  // Load invoice schema on mount
  onMount(() => {
    extractFields(30);
  });

  // Generate smart suggestions based on field analysis
  const suggestedLinks = createMemo((): SuggestedLink[] => {
    const s = schema();
    if (!s) return [];

    const suggestions: SuggestedLink[] = [];

    s.fields.forEach(field => {
      const path = field.path.toLowerCase();
      const name = path.split('.').pop() || '';

      // Amount field suggestions
      if (field.type === 'number') {
        if (name.includes('total') || name.includes('amount') || name.includes('subtotal')) {
          suggestions.push({
            sourceField: field,
            targetType: 'amount',
            confidence: 95,
            reason: 'Numeric field with amount-related name'
          });
        } else if (name.includes('tax')) {
          suggestions.push({
            sourceField: field,
            targetType: 'amount',
            confidence: 90,
            reason: 'Tax-related numeric field'
          });
        } else if (name.includes('price') || name.includes('cost')) {
          suggestions.push({
            sourceField: field,
            targetType: 'amount',
            confidence: 85,
            reason: 'Price/cost field'
          });
        } else if (name.includes('qty') || name.includes('quantity')) {
          suggestions.push({
            sourceField: field,
            targetType: 'condition',
            confidence: 70,
            reason: 'Quantity field - good for conditions'
          });
        }
      }

      // Reference field suggestions
      if (field.type === 'string') {
        if (name.includes('invoice') || name.includes('number') || name.includes('id')) {
          suggestions.push({
            sourceField: field,
            targetType: 'reference',
            confidence: 90,
            reason: 'Identifier field - ideal for reference'
          });
        } else if (name.includes('name') || name.includes('description')) {
          suggestions.push({
            sourceField: field,
            targetType: 'description',
            confidence: 85,
            reason: 'Descriptive text field'
          });
        }
      }

      // Condition suggestions
      if (field.type === 'boolean') {
        suggestions.push({
          sourceField: field,
          targetType: 'condition',
          confidence: 95,
          reason: 'Boolean field - perfect for conditions'
        });
      }

      if (path.includes('type') || path.includes('status') || path.includes('category')) {
        suggestions.push({
          sourceField: field,
          targetType: 'condition',
          confidence: 85,
          reason: 'Classification field - good for filtering'
        });
      }
    });

    // Sort by confidence and remove duplicates
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .filter((s, i, arr) => arr.findIndex(x =>
        x.sourceField.path === s.sourceField.path && x.targetType === s.targetType
      ) === i);
  });

  // Filtered suggestions
  const filteredSuggestions = createMemo(() => {
    let suggestions = suggestedLinks();

    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      suggestions = suggestions.filter(s =>
        s.sourceField.path.toLowerCase().includes(term) ||
        s.reason.toLowerCase().includes(term)
      );
    }

    return suggestions;
  });

  const handleLinkClick = (suggestion: SuggestedLink) => {
    props.onLinkField(suggestion.sourceField.path, suggestion.targetType);
    setAppliedLinks(prev => new Set([...prev, `${suggestion.sourceField.path}:${suggestion.targetType}`]));
  };

  const handlePatternApply = (pattern: QuickPattern) => {
    props.onApplyPattern(pattern);
  };

  const isLinkApplied = (suggestion: SuggestedLink) => {
    return appliedLinks().has(`${suggestion.sourceField.path}:${suggestion.targetType}`);
  };

  // Styles
  const tabStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    'background-color': isActive ? '#3b82f6' : 'transparent',
    color: isActive ? 'white' : '#6b7280',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem',
  });

  const suggestionCardStyle = (isApplied: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    'background-color': isApplied ? '#dcfce7' : 'white',
    border: isApplied ? '1px solid #86efac' : '1px solid #e5e7eb',
    'border-radius': '0.5rem',
    'margin-bottom': '0.5rem',
    transition: 'all 0.2s',
  });

  const confidenceBadgeStyle = (confidence: number) => ({
    padding: '0.125rem 0.5rem',
    'background-color': confidence >= 90 ? '#dcfce7' : confidence >= 70 ? '#fef3c7' : '#fee2e2',
    color: confidence >= 90 ? '#166534' : confidence >= 70 ? '#92400e' : '#991b1b',
    'border-radius': '0.25rem',
    'font-size': '0.625rem',
    'font-weight': '600',
  });

  const targetBadgeColors: Record<string, { bg: string; text: string }> = {
    amount: { bg: '#dbeafe', text: '#1e40af' },
    description: { bg: '#fef3c7', text: '#92400e' },
    reference: { bg: '#f3e8ff', text: '#7c3aed' },
    condition: { bg: '#fee2e2', text: '#991b1b' },
    account: { bg: '#dcfce7', text: '#166534' },
  };

  const patternCardStyle = {
    padding: '1rem',
    'background-color': 'white',
    border: '1px solid #e5e7eb',
    'border-radius': '0.5rem',
    'margin-bottom': '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ padding: '1rem', 'background-color': '#f9fafb', 'border-radius': '0.5rem' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '1rem', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', margin: 0 }}>
          ⚡ Smart Field Linker
        </h3>
        <Show when={!isExtracting() && schema()}>
          <span style={{ 'font-size': '0.875rem', color: '#6b7280' }}>
            {suggestedLinks().length} suggestions
          </span>
        </Show>
      </div>

      {/* Loading */}
      <Show when={isExtracting()}>
        <div style={{ 'text-align': 'center', padding: '2rem' }}>
          <div style={{
            width: '100%', height: '6px', 'background-color': '#e5e7eb',
            'border-radius': '3px', overflow: 'hidden', 'margin-bottom': '0.5rem'
          }}>
            <div style={{
              width: `${progress()}%`, height: '100%', 'background-color': '#3b82f6',
              transition: 'width 0.3s'
            }} />
          </div>
          <p style={{ color: '#6b7280', 'font-size': '0.875rem' }}>
            Analyzing invoice fields... {progress()}%
          </p>
        </div>
      </Show>

      {/* Main Content */}
      <Show when={!isExtracting() && schema()}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '1rem' }}>
          <button style={tabStyle(activeTab() === 'suggested')} onClick={() => setActiveTab('suggested')}>
            ✨ Suggested ({suggestedLinks().length})
          </button>
          <button style={tabStyle(activeTab() === 'patterns')} onClick={() => setActiveTab('patterns')}>
            📋 Quick Patterns
          </button>
          <button style={tabStyle(activeTab() === 'all')} onClick={() => setActiveTab('all')}>
            📊 All Fields
          </button>
        </div>

        {/* Search */}
        <Show when={activeTab() !== 'patterns'}>
          <input
            type="text"
            placeholder="Search fields or suggestions..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              'border-radius': '0.375rem',
              'font-size': '0.875rem',
              'margin-bottom': '1rem'
            }}
          />
        </Show>

        {/* Suggested Links Tab */}
        <Show when={activeTab() === 'suggested'}>
          <div style={{ 'max-height': '400px', 'overflow-y': 'auto' }}>
            <For each={filteredSuggestions()}>
              {(suggestion) => (
                <div style={suggestionCardStyle(isLinkApplied(suggestion))}>
                  {/* Confidence Badge */}
                  <div style={confidenceBadgeStyle(suggestion.confidence)}>
                    {suggestion.confidence}%
                  </div>

                  {/* Field Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>
                      {suggestion.sourceField.path.replace('data.', '')}
                    </div>
                    <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                      {suggestion.reason}
                    </div>
                  </div>

                  {/* Target Badge */}
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    'background-color': targetBadgeColors[suggestion.targetType]?.bg || '#f3f4f6',
                    color: targetBadgeColors[suggestion.targetType]?.text || '#374151',
                    'border-radius': '0.25rem',
                    'font-size': '0.75rem',
                    'font-weight': '500',
                    'text-transform': 'capitalize'
                  }}>
                    → {suggestion.targetType}
                  </span>

                  {/* Link Button */}
                  <button
                    onClick={() => handleLinkClick(suggestion)}
                    disabled={isLinkApplied(suggestion)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      'background-color': isLinkApplied(suggestion) ? '#86efac' : '#3b82f6',
                      color: isLinkApplied(suggestion) ? '#166534' : 'white',
                      border: 'none',
                      'border-radius': '0.375rem',
                      cursor: isLinkApplied(suggestion) ? 'default' : 'pointer',
                      'font-size': '0.75rem',
                      'font-weight': '500',
                    }}
                  >
                    {isLinkApplied(suggestion) ? '✓ Linked' : '+ Link'}
                  </button>
                </div>
              )}
            </For>

            <Show when={filteredSuggestions().length === 0}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: '#6b7280' }}>
                No suggestions match your search
              </div>
            </Show>
          </div>
        </Show>

        {/* Quick Patterns Tab */}
        <Show when={activeTab() === 'patterns'}>
          <div>
            <p style={{ 'font-size': '0.875rem', color: '#6b7280', 'margin-bottom': '1rem' }}>
              Apply pre-configured field mappings for common accounting scenarios:
            </p>

            <For each={quickPatterns}>
              {(pattern) => (
                <div
                  style={patternCardStyle}
                  onClick={() => handlePatternApply(pattern)}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                >
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '0.5rem' }}>
                    <span style={{ 'font-size': '1.5rem' }}>{pattern.icon}</span>
                    <div>
                      <div style={{ 'font-weight': '600' }}>{pattern.name}</div>
                      <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>{pattern.description}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.25rem', 'margin-top': '0.5rem' }}>
                    <For each={pattern.mappings}>
                      {(mapping) => (
                        <span style={{
                          padding: '0.125rem 0.375rem',
                          'background-color': '#f3f4f6',
                          'border-radius': '0.25rem',
                          'font-size': '0.625rem',
                          color: '#6b7280'
                        }}>
                          {mapping.fieldPattern} → {mapping.targetType}
                        </span>
                      )}
                    </For>
                  </div>

                  <button
                    style={{
                      'margin-top': '0.75rem',
                      padding: '0.375rem 0.75rem',
                      'background-color': '#3b82f6',
                      color: 'white',
                      border: 'none',
                      'border-radius': '0.375rem',
                      cursor: 'pointer',
                      'font-size': '0.75rem',
                      'font-weight': '500'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePatternApply(pattern);
                    }}
                  >
                    Apply Pattern
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* All Fields Tab */}
        <Show when={activeTab() === 'all'}>
          <div style={{ 'max-height': '400px', 'overflow-y': 'auto' }}>
            <For each={schema()?.fields.filter(f =>
              !searchTerm() ||
              f.path.toLowerCase().includes(searchTerm().toLowerCase())
            )}>
              {(field) => (
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  'background-color': 'white',
                  border: '1px solid #e5e7eb',
                  'border-radius': '0.375rem',
                  'margin-bottom': '0.375rem',
                  'font-size': '0.8rem'
                }}>
                  <span style={{
                    padding: '0.125rem 0.375rem',
                    'background-color': field.type === 'number' ? '#dbeafe' : '#fef3c7',
                    color: field.type === 'number' ? '#1e40af' : '#92400e',
                    'border-radius': '0.25rem',
                    'font-size': '0.625rem',
                    'font-weight': '600'
                  }}>
                    {field.type}
                  </span>

                  <span style={{ flex: 1, 'font-weight': '500' }}>
                    {field.path.replace('data.', '')}
                  </span>

                  <span style={{ 'font-size': '0.625rem', color: '#6b7280' }}>
                    {field.coverage}% coverage
                  </span>

                  {/* Quick Link Buttons */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => props.onLinkField(field.path, 'condition')}
                      style={{
                        padding: '0.125rem 0.375rem',
                        'background-color': '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        'border-radius': '0.25rem',
                        cursor: 'pointer',
                        'font-size': '0.625rem'
                      }}
                      title="Add as condition"
                    >
                      🔍
                    </button>
                    <Show when={field.type === 'number'}>
                      <button
                        onClick={() => props.onLinkField(field.path, 'amount')}
                        style={{
                          padding: '0.125rem 0.375rem',
                          'background-color': '#dbeafe',
                          color: '#1e40af',
                          border: 'none',
                          'border-radius': '0.25rem',
                          cursor: 'pointer',
                          'font-size': '0.625rem'
                        }}
                        title="Add as amount"
                      >
                        💰
                      </button>
                    </Show>
                    <Show when={field.type === 'string'}>
                      <button
                        onClick={() => props.onLinkField(field.path, 'description')}
                        style={{
                          padding: '0.125rem 0.375rem',
                          'background-color': '#fef3c7',
                          color: '#92400e',
                          border: 'none',
                          'border-radius': '0.25rem',
                          cursor: 'pointer',
                          'font-size': '0.625rem'
                        }}
                        title="Add to description"
                      >
                        📝
                      </button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default SmartFieldLinker;
