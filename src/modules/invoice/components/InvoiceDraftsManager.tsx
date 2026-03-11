import { Component, For, createSignal, Show } from 'solid-js';
import { invoiceDraftsStore } from '../stores/invoiceDraftsStore';
import { invoiceFormStore } from '../stores/invoiceFormStore';
import { Button, Modal } from '../../ui';
import { useTranslation } from '../../../translations';

interface InvoiceDraftsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftLoaded?: () => void;
}

const InvoiceDraftsManager: Component<InvoiceDraftsManagerProps> = (props) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = createSignal('');
  const [confirmDelete, setConfirmDelete] = createSignal<string | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleLoadDraft = (draftId: string) => {
    const draft = invoiceDraftsStore.getDraft(draftId);
    if (draft) {
      // Ask if user wants to save current form first
      if (invoiceFormStore.hasData() && invoiceFormStore.isDirty) {
        if (confirm('Save current invoice as draft before loading another?')) {
          invoiceDraftsStore.saveDraft(invoiceFormStore.getFormData());
        }
      }

      // Load the draft into the form
      invoiceFormStore.updateForm(draft.data);
      props.onClose();
      props.onDraftLoaded?.();
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    setConfirmDelete(draftId);
  };

  const confirmDeleteDraft = () => {
    if (confirmDelete()) {
      invoiceDraftsStore.deleteDraft(confirmDelete()!);
      setConfirmDelete(null);
    }
  };

  const filteredDrafts = () => {
    const query = searchQuery().trim();
    if (query === '') {
      return invoiceDraftsStore.getDraftsSorted();
    }
    return invoiceDraftsStore.searchDrafts(query);
  };

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1rem',
    'max-height': '70vh',
    overflow: 'auto'
  };

  const searchStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    width: '100%'
  };

  const draftCardStyle = {
    padding: '1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    background: 'var(--surface-color)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.5rem'
  };

  const draftCardHoverStyle = {
    ...draftCardStyle,
    'border-color': 'var(--blue-ribbon-500)',
    'box-shadow': '0 2px 8px rgba(108, 92, 231, 0.2)'
  };

  const headerRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    gap: '1rem'
  };

  const infoStyle = {
    flex: '1',
    'min-width': '0'
  };

  const titleStyle = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap'
  };

  const subtitleStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    margin: '0'
  };

  const metaRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'padding-top': '0.5rem',
    'border-top': '1px solid var(--border-color)'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'flex-shrink': '0'
  };

  const emptyStateStyle = {
    'text-align': 'center',
    padding: '3rem 1rem',
    color: 'var(--text-muted)'
  };

  const badgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    'border-radius': '0.25rem',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: 'var(--blue-ribbon-100)',
    color: 'var(--blue-ribbon-700)'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="📋 Saved Invoice Drafts"
      size="large"
    >
      <div style={containerStyle}>
        {/* Search bar */}
        <input
          type="text"
          placeholder="Search by customer, invoice #, or description..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          style={searchStyle}
        />

        {/* Draft count */}
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          {invoiceDraftsStore.getCount()} draft(s) saved
        </div>

        {/* Drafts list */}
        <Show
          when={filteredDrafts().length > 0}
          fallback={
            <div style={emptyStateStyle}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📝</div>
              <div style={{ 'font-size': '1.125rem', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                {searchQuery() ? 'No drafts found' : 'No saved drafts'}
              </div>
              <div style={{ 'font-size': '0.875rem' }}>
                {searchQuery()
                  ? 'Try a different search term'
                  : 'Save your current invoice as a draft to see it here'}
              </div>
            </div>
          }
        >
          <For each={filteredDrafts()}>
            {(draft) => (
              <div
                style={draftCardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blue-ribbon-500)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 92, 231, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => handleLoadDraft(draft.id)}
              >
                <div style={headerRowStyle}>
                  <div style={infoStyle}>
                    <h3 style={titleStyle}>
                      {draft.metadata.customerName}
                    </h3>
                    <p style={subtitleStyle}>
                      Invoice: {draft.metadata.invoiceNumber}
                    </p>
                    {draft.metadata.description && (
                      <p style={{ ...subtitleStyle, 'margin-top': '0.25rem' }}>
                        {draft.metadata.description}
                      </p>
                    )}
                  </div>
                  <div style={actionsStyle}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadDraft(draft.id);
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'var(--blue-ribbon-500)',
                        color: 'white',
                        border: 'none',
                        'border-radius': '0.375rem',
                        cursor: 'pointer',
                        'font-size': '0.875rem',
                        'font-weight': '500'
                      }}
                      title="Load this draft"
                    >
                      Load
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDraft(draft.id);
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        'border-radius': '0.375rem',
                        cursor: 'pointer',
                        'font-size': '0.875rem',
                        'font-weight': '500'
                      }}
                      title="Delete this draft"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={metaRowStyle}>
                  <div>
                    <span style={badgeStyle}>
                      {draft.data.products.length} products
                    </span>
                    {' '}
                    <span style={badgeStyle}>
                      {draft.data.reservas.length} reservas
                    </span>
                  </div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                    {draft.metadata.totalAmount !== undefined && (
                      <span style={{ 'font-weight': '600', color: 'var(--blue-ribbon-600)' }}>
                        {formatCurrency(draft.metadata.totalAmount)}
                      </span>
                    )}
                    <span>
                      Updated {formatDate(draft.metadata.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </For>
        </Show>

        {/* Clear all button */}
        <Show when={invoiceDraftsStore.getCount() > 0}>
          <div style={{ 'margin-top': '1rem', 'padding-top': '1rem', 'border-top': '1px solid var(--border-color)' }}>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm('Are you sure you want to delete all drafts? This cannot be undone.')) {
                  invoiceDraftsStore.clearAllDrafts();
                }
              }}
              style={{ width: '100%' }}
            >
              🗑️ Clear All Drafts
            </Button>
          </div>
        </Show>
      </div>

      {/* Confirm delete modal */}
      <Show when={confirmDelete()}>
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': '10000'
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              'border-radius': 'var(--border-radius)',
              'max-width': '400px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Confirm Delete</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)' }}>
              Are you sure you want to delete this draft? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDeleteDraft}
                style={{ background: '#f44336' }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </Modal>
  );
};

export default InvoiceDraftsManager;
