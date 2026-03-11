import { Component, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import Card from '../../ui/components/Card';
import Button from '../../ui/components/Button';

export interface ProcessingDocument {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  estimatedTimeRemaining?: number;
  error?: string;
}

interface ProcessingQueueProps {
  documents: ProcessingDocument[];
  onCancel?: (documentId: string) => void;
  onRetry?: (documentId: string) => void;
  onClear?: () => void;
}

const ProcessingQueue: Component<ProcessingQueueProps> = (props) => {
  const [currentTime, setCurrentTime] = createSignal(new Date());

  // Update current time every second for time calculations
  onMount(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    onCleanup(() => clearInterval(interval));
  });

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getElapsedTime = (startTime: Date) => {
    const elapsed = Math.floor((currentTime().getTime() - startTime.getTime()) / 1000);
    return formatTimeRemaining(elapsed);
  };

  const getStatusIcon = (status: ProcessingDocument['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📄';
    }
  };

  const getStatusColor = (status: ProcessingDocument['status']) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'processing':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      default:
        return 'var(--text-muted)';
    }
  };

  const getStatusText = (status: ProcessingDocument['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting in queue';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const pendingCount = () => props.documents.filter(d => d.status === 'pending').length;
  const processingCount = () => props.documents.filter(d => d.status === 'processing').length;
  const completedCount = () => props.documents.filter(d => d.status === 'completed').length;
  const failedCount = () => props.documents.filter(d => d.status === 'failed').length;

  const queueItemStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1.25rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    background: 'var(--surface-color)',
    transition: 'all 0.2s ease'
  };

  const progressBarContainerStyle = {
    width: '100%',
    height: '8px',
    background: 'var(--border-color)',
    'border-radius': '4px',
    overflow: 'hidden',
    'margin-top': '0.75rem'
  };

  const progressBarStyle = (progress: number, status: ProcessingDocument['status']) => ({
    height: '100%',
    width: `${progress}%`,
    background: status === 'failed'
      ? '#EF4444'
      : 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    transition: 'width 0.3s ease',
    position: 'relative' as const,
    overflow: 'hidden'
  });

  const statsContainerStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const statBoxStyle = {
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'text-align': 'center' as const
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '3rem 1rem',
    color: 'var(--text-muted)'
  };

  return (
    <Card title="Processing Queue">
      <div>
        {/* Queue Statistics */}
        <Show when={props.documents.length > 0}>
          <div style={statsContainerStyle}>
            <div style={statBoxStyle}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>⏳</div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#F59E0B' }}>
                {pendingCount()}
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Pending</div>
            </div>

            <div style={statBoxStyle}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>⚙️</div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#3B82F6' }}>
                {processingCount()}
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Processing</div>
            </div>

            <div style={statBoxStyle}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>✅</div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#10B981' }}>
                {completedCount()}
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Completed</div>
            </div>

            <div style={statBoxStyle}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>❌</div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#EF4444' }}>
                {failedCount()}
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Failed</div>
            </div>
          </div>
        </Show>

        {/* Clear Completed Button */}
        <Show when={completedCount() > 0 || failedCount() > 0}>
          <div style={{ 'margin-bottom': '1.5rem', 'text-align': 'right' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={props.onClear}
            >
              Clear Completed
            </Button>
          </div>
        </Show>

        {/* Queue Items */}
        <Show
          when={props.documents.length > 0}
          fallback={
            <div style={emptyStateStyle}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📋</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                No documents in queue
              </h3>
              <p style={{ margin: '0' }}>
                Upload documents to see them here while they're being processed
              </p>
            </div>
          }
        >
          <div>
            <For each={props.documents}>
              {(doc) => (
                <div style={queueItemStyle}>
                  <div style={{ flex: '1', 'min-width': '0', 'margin-right': '1rem' }}>
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.75rem',
                      'margin-bottom': '0.5rem'
                    }}>
                      <span style={{ 'font-size': '1.5rem' }}>
                        {getStatusIcon(doc.status)}
                      </span>
                      <div style={{ flex: '1', 'min-width': '0' }}>
                        <div style={{
                          'font-weight': '500',
                          color: 'var(--text-primary)',
                          'white-space': 'nowrap',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis'
                        }}>
                          {doc.filename}
                        </div>
                        <div style={{
                          'font-size': '0.875rem',
                          color: getStatusColor(doc.status),
                          'margin-top': '0.25rem'
                        }}>
                          {getStatusText(doc.status)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Show when={doc.status === 'processing' || doc.status === 'pending'}>
                      <div style={progressBarContainerStyle}>
                        <div style={progressBarStyle(doc.progress, doc.status)}>
                          <Show when={doc.status === 'processing'}>
                            <div style={{
                              position: 'absolute',
                              top: '0',
                              left: '0',
                              right: '0',
                              bottom: '0',
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                              animation: 'shimmer 2s infinite'
                            }} />
                          </Show>
                        </div>
                      </div>
                    </Show>

                    {/* Time Information */}
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'margin-top': '0.75rem',
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      <Show when={doc.startTime}>
                        <span>Elapsed: {getElapsedTime(doc.startTime!)}</span>
                      </Show>
                      <Show when={doc.estimatedTimeRemaining && doc.status === 'processing'}>
                        <span>~{formatTimeRemaining(doc.estimatedTimeRemaining!)} remaining</span>
                      </Show>
                      <Show when={doc.status === 'processing'}>
                        <span>{doc.progress}%</span>
                      </Show>
                    </div>

                    {/* Error Message */}
                    <Show when={doc.status === 'failed' && doc.error}>
                      <div style={{
                        'margin-top': '0.75rem',
                        padding: '0.75rem',
                        background: '#FEE2E2',
                        border: '1px solid #EF4444',
                        'border-radius': 'var(--border-radius-sm)',
                        color: '#991B1B',
                        'font-size': '0.875rem'
                      }}>
                        {doc.error}
                      </div>
                    </Show>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                    <Show when={doc.status === 'processing' || doc.status === 'pending'}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => props.onCancel?.(doc.id)}
                      >
                        Cancel
                      </Button>
                    </Show>
                    <Show when={doc.status === 'failed'}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => props.onRetry?.(doc.id)}
                      >
                        Retry
                      </Button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* CSS Animation for shimmer effect */}
        <style>
          {`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}
        </style>
      </div>
    </Card>
  );
};

export default ProcessingQueue;
