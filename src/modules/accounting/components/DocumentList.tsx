import { Component, createSignal, For, Show } from 'solid-js';
import Card from '../../ui/components/Card';
import Button from '../../ui/components/Button';

export interface Document {
  id: string;
  filename: string;
  type: 'pdf' | 'png' | 'jpg' | 'jpeg';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadDate: Date;
  extractedAmount?: number;
  vendor?: string;
  documentType?: string;
}

interface DocumentListProps {
  documents: Document[];
  onView: (document: Document) => void;
  onDelete?: (documentId: string) => void;
}

const DocumentList: Component<DocumentListProps> = (props) => {
  const [filterStatus, setFilterStatus] = createSignal<string>('all');
  const [filterDate, setFilterDate] = createSignal<string>('all');
  const [sortBy, setSortBy] = createSignal<'date' | 'filename' | 'amount'>('date');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  const getStatusBadge = (status: Document['status']) => {
    const styles: Record<Document['status'], { bg: string; color: string; text: string }> = {
      pending: { bg: '#FEF3C7', color: '#92400E', text: 'Pending' },
      processing: { bg: '#DBEAFE', color: '#1E40AF', text: 'Processing' },
      completed: { bg: '#D1FAE5', color: '#065F46', text: 'Completed' },
      failed: { bg: '#FEE2E2', color: '#991B1B', text: 'Failed' }
    };

    const style = styles[status];
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        'border-radius': '9999px',
        'font-size': '0.875rem',
        'font-weight': '500',
        background: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  const getFileTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredDocuments = () => {
    let filtered = [...props.documents];

    // Filter by status
    if (filterStatus() !== 'all') {
      filtered = filtered.filter(doc => doc.status === filterStatus());
    }

    // Filter by date
    const now = new Date();
    if (filterDate() === 'today') {
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.uploadDate);
        return docDate.toDateString() === now.toDateString();
      });
    } else if (filterDate() === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(doc => new Date(doc.uploadDate) >= weekAgo);
    } else if (filterDate() === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(doc => new Date(doc.uploadDate) >= monthAgo);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy()) {
        case 'date':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
        case 'filename':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'amount':
          comparison = (a.extractedAmount || 0) - (b.extractedAmount || 0);
          break;
      }
      return sortOrder() === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const toggleSort = (column: 'date' | 'filename' | 'amount') => {
    if (sortBy() === column) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'date' | 'filename' | 'amount') => {
    if (sortBy() !== column) return '↕️';
    return sortOrder() === 'asc' ? '↑' : '↓';
  };

  const filterStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap' as const,
    'align-items': 'center'
  };

  const selectStyle = {
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    'font-family': 'inherit',
    cursor: 'pointer'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-top': '1rem'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem 1rem',
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    'user-select': 'none' as const
  };

  const tdStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  };

  return (
    <Card title="Documents">
      <div>
        {/* Filters */}
        <div style={filterStyle}>
          <div>
            <label style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-right': '0.5rem' }}>
              Status:
            </label>
            <select
              style={selectStyle}
              value={filterStatus()}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-right': '0.5rem' }}>
              Date:
            </label>
            <select
              style={selectStyle}
              value={filterDate()}
              onChange={(e) => setFilterDate(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div style={{ 'margin-left': 'auto', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            {filteredDocuments().length} document{filteredDocuments().length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <Show
          when={filteredDocuments().length > 0}
          fallback={
            <div style={{
              'text-align': 'center',
              padding: '3rem 1rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📭</div>
              <p>No documents found</p>
            </div>
          }
        >
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle} onClick={() => toggleSort('filename')}>
                    Filename {getSortIcon('filename')}
                  </th>
                  <th style={thStyle}>Document Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle} onClick={() => toggleSort('date')}>
                    Date {getSortIcon('date')}
                  </th>
                  <th style={thStyle} onClick={() => toggleSort('amount')}>
                    Amount {getSortIcon('amount')}
                  </th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredDocuments()}>
                  {(doc) => (
                    <tr style={{ 'background-color': 'var(--surface-color)' }}>
                      <td style={tdStyle}>
                        <span style={{ 'font-size': '1.5rem' }}>{getFileTypeIcon(doc.type)}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ 'font-weight': '500' }}>{doc.filename}</div>
                        {doc.vendor && (
                          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                            {doc.vendor}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {doc.documentType || '-'}
                      </td>
                      <td style={tdStyle}>
                        {getStatusBadge(doc.status)}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ 'font-size': '0.875rem' }}>{formatDate(doc.uploadDate)}</div>
                      </td>
                      <td style={tdStyle}>
                        {doc.extractedAmount ? (
                          <span style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                            ${doc.extractedAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => props.onView(doc)}
                          >
                            View
                          </Button>
                          {props.onDelete && (
                            <button
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--error-color)',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                'font-size': '1.25rem'
                              }}
                              onClick={() => props.onDelete?.(doc.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default DocumentList;
