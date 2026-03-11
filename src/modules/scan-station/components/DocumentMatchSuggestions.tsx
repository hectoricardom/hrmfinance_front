/**
 * DocumentMatchSuggestions Component
 * For unmatched documents (scanned without client selection), shows
 * document thumbnail, detected type, client match suggestions, and
 * options to assign or create new clients.
 */

import { Component, createSignal, Show, For } from 'solid-js';
import { Card } from '../../ui';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';
import { DRAKE_FORM_LABELS } from '../../drake-export/types/drakeTypes';
import type { ScanBatchItem, ClientMatchSuggestion } from '../types/scanTypes';

export interface DocumentMatchSuggestionsProps {
  /** Unmatched scan items that need client assignment */
  items: ScanBatchItem[];
  /** Suggestions per item (keyed by item ID) */
  suggestions: Record<string, ClientMatchSuggestion[]>;
  /** Called when a document is assigned to a client */
  onAssign: (itemId: string, client: TaxPortal) => void;
  /** Called when "Create New Client" is clicked for a document */
  onCreateClient: (itemId: string) => void;
  /** Called when manual search is used to find a client */
  onSearchClient: (query: string) => void;
  /** Search results from manual search */
  searchResults: TaxPortal[];
  /** Whether search is loading */
  isSearching: boolean;
}

const DocumentMatchSuggestions: Component<DocumentMatchSuggestionsProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [activeItemId, setActiveItemId] = createSignal<string | null>(null);
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  // ============================================
  // Search Handler
  // ============================================

  const handleSearchInput = (query: string) => {
    setSearchQuery(query);
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      if (query.trim().length >= 2) {
        props.onSearchClient(query.trim());
      }
    }, 300);
  };

  // ============================================
  // Helpers
  // ============================================

  const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return '#22c55e';
    if (confidence >= 0.4) return '#f59e0b';
    return '#ef4444';
  };

  const confidencePercent = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getTypeLabel = (item: ScanBatchItem): string => {
    const type = item.correctedDocumentType || item.result?.classification?.documentType || 'other';
    return DRAKE_FORM_LABELS[type] || type;
  };

  const formatName = (client: TaxPortal): string => {
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed Client';
  };

  const maskSSN = (ssn?: string): string => {
    if (!ssn) return '';
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `***-**-${cleaned.slice(-4)}`;
    }
    return '';
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '8px',
        'margin-bottom': '16px',
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" style={{ width: '20px', height: '20px' }}>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <div style={{ 'font-size': '15px', 'font-weight': '600', color: '#374151' }}>
            Unmatched Documents ({props.items.length})
          </div>
          <div style={{ 'font-size': '12px', color: '#6b7280' }}>
            These documents need to be assigned to a client
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        'margin-bottom': '16px',
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
        }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              'pointer-events': 'none',
            }}
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery()}
            onInput={(e) => handleSearchInput(e.currentTarget.value)}
            placeholder="Search clients by name, SSN, or email..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 34px',
              'border-radius': '8px',
              border: '1px solid #d1d5db',
              'font-size': '13px',
              outline: 'none',
              'box-sizing': 'border-box',
            }}
          />
        </div>
      </div>

      {/* Manual Search Results */}
      <Show when={searchQuery().length >= 2 && (props.searchResults.length > 0 || props.isSearching)}>
        <div style={{
          'margin-bottom': '16px',
          border: '1px solid #e5e7eb',
          'border-radius': '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px',
            background: '#f8fafc',
            'font-size': '12px',
            'font-weight': '600',
            color: '#6b7280',
          }}>
            Search Results
          </div>
          <Show when={props.isSearching}>
            <div style={{ padding: '12px', 'text-align': 'center', 'font-size': '13px', color: '#6b7280' }}>
              Searching...
            </div>
          </Show>
          <Show when={!props.isSearching && props.searchResults.length === 0}>
            <div style={{ padding: '12px', 'text-align': 'center', 'font-size': '13px', color: '#9ca3af' }}>
              No clients found
            </div>
          </Show>
          <For each={props.searchResults}>
            {(client) => (
              <div style={{
                display: 'flex',
                'align-items': 'center',
                padding: '8px 12px',
                'border-top': '1px solid #f3f4f6',
                gap: '8px',
              }}>
                <div style={{ flex: 1, 'min-width': 0 }}>
                  <div style={{ 'font-size': '13px', 'font-weight': '500', color: '#374151' }}>
                    {formatName(client)}
                  </div>
                  <div style={{ 'font-size': '11px', color: '#6b7280' }}>
                    {maskSSN(client.ssn)}
                    {client.email && ` | ${client.email}`}
                  </div>
                </div>
                <Show when={activeItemId()}>
                  <button
                    onClick={() => {
                      if (activeItemId()) {
                        props.onAssign(activeItemId()!, client);
                        setActiveItemId(null);
                        setSearchQuery('');
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      'border-radius': '4px',
                      border: 'none',
                      background: '#1a73e8',
                      color: 'white',
                      'font-size': '12px',
                      'font-weight': '500',
                      cursor: 'pointer',
                    }}
                  >
                    Assign
                  </button>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Document Cards */}
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <For each={props.items}>
          {(item) => {
            const itemSuggestions = () => props.suggestions[item.id] || [];

            return (
              <Card>
                <div style={{ padding: '16px' }}>
                  {/* Document Info Row */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    'margin-bottom': '12px',
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: '80px',
                      height: '100px',
                      'border-radius': '6px',
                      overflow: 'hidden',
                      background: '#f3f4f6',
                      'flex-shrink': 0,
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                    }}>
                      <Show when={item.previewUrl} fallback={
                        <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" style={{ width: '32px', height: '32px' }}>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      }>
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          style={{ width: '100%', height: '100%', 'object-fit': 'cover' }}
                        />
                      </Show>
                    </div>

                    {/* Document Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#374151' }}>
                        {getTypeLabel(item)}
                      </div>
                      <div style={{ 'font-size': '12px', color: '#6b7280', 'margin-top': '2px' }}>
                        {item.file.name}
                      </div>
                      <Show when={item.result?.detectedRecipientName}>
                        <div style={{ 'font-size': '13px', color: '#374151', 'margin-top': '6px' }}>
                          Recipient: <strong>{item.result!.detectedRecipientName}</strong>
                        </div>
                      </Show>
                      <Show when={item.result?.detectedRecipientSSN}>
                        <div style={{ 'font-size': '12px', color: '#6b7280' }}>
                          SSN: ***-**-{item.result!.detectedRecipientSSN!.slice(-4)}
                        </div>
                      </Show>
                      <Show when={item.assignedClientName}>
                        <div style={{
                          'margin-top': '6px',
                          padding: '4px 8px',
                          'border-radius': '4px',
                          background: '#f0fdf4',
                          color: '#22c55e',
                          'font-size': '12px',
                          'font-weight': '600',
                          display: 'inline-block',
                        }}>
                          Assigned to: {item.assignedClientName}
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  <Show when={!item.assignedClientId && itemSuggestions().length > 0}>
                    <div style={{
                      'border-top': '1px solid #f3f4f6',
                      'padding-top': '12px',
                    }}>
                      <div style={{ 'font-size': '12px', 'font-weight': '600', color: '#6b7280', 'margin-bottom': '8px' }}>
                        Suggested Matches
                      </div>
                      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                        <For each={itemSuggestions().slice(0, 5)}>
                          {(suggestion) => (
                            <div style={{
                              display: 'flex',
                              'align-items': 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              'border-radius': '6px',
                              border: '1px solid #e5e7eb',
                              background: 'white',
                            }}>
                              {/* Confidence indicator */}
                              <div style={{
                                width: '32px',
                                height: '32px',
                                'border-radius': '50%',
                                background: `${confidenceColor(suggestion.confidence)}15`,
                                display: 'flex',
                                'align-items': 'center',
                                'justify-content': 'center',
                                'font-size': '11px',
                                'font-weight': '700',
                                color: confidenceColor(suggestion.confidence),
                                'flex-shrink': 0,
                              }}>
                                {confidencePercent(suggestion.confidence)}
                              </div>

                              {/* Client info */}
                              <div style={{ flex: 1, 'min-width': 0 }}>
                                <div style={{ 'font-size': '13px', 'font-weight': '500', color: '#374151' }}>
                                  {formatName(suggestion.client)}
                                </div>
                                <div style={{ 'font-size': '11px', color: '#6b7280' }}>
                                  {suggestion.matchReason}
                                </div>
                              </div>

                              {/* Assign button */}
                              <button
                                onClick={() => props.onAssign(item.id, suggestion.client)}
                                style={{
                                  padding: '6px 12px',
                                  'border-radius': '6px',
                                  border: 'none',
                                  background: '#1a73e8',
                                  color: 'white',
                                  'font-size': '12px',
                                  'font-weight': '600',
                                  cursor: 'pointer',
                                  'flex-shrink': 0,
                                }}
                              >
                                Assign
                              </button>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  {/* Actions */}
                  <Show when={!item.assignedClientId}>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      'margin-top': '12px',
                      'padding-top': '12px',
                      'border-top': '1px solid #f3f4f6',
                    }}>
                      <button
                        onClick={() => {
                          setActiveItemId(item.id);
                          // Focus the search input
                          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                          if (searchInput) searchInput.focus();
                        }}
                        style={{
                          padding: '8px 12px',
                          'border-radius': '6px',
                          border: '1px solid #d1d5db',
                          background: activeItemId() === item.id ? '#eff6ff' : 'white',
                          color: activeItemId() === item.id ? '#1a73e8' : '#374151',
                          'font-size': '12px',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '4px',
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search Client
                      </button>

                      <button
                        onClick={() => props.onCreateClient(item.id)}
                        style={{
                          padding: '8px 12px',
                          'border-radius': '6px',
                          border: '1px solid #d1d5db',
                          background: 'white',
                          color: '#374151',
                          'font-size': '12px',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '4px',
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Create New Client
                      </button>
                    </div>
                  </Show>
                </div>
              </Card>
            );
          }}
        </For>
      </div>

      {/* Empty State */}
      <Show when={props.items.length === 0}>
        <div style={{
          'text-align': 'center',
          padding: '32px',
          color: '#9ca3af',
          'font-size': '14px',
        }}>
          No unmatched documents
        </div>
      </Show>
    </div>
  );
};

export default DocumentMatchSuggestions;
