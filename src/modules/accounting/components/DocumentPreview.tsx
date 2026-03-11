import { Component, Show } from 'solid-js';
import Card from '../../ui/components/Card';
import Button from '../../ui/components/Button';
import ExtractedDataView from './ExtractedDataView';

export interface ExtractedData {
  documentType: string;
  vendor: string;
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  confidence?: number;
}

export interface DocumentData {
  id: string;
  filename: string;
  type: 'pdf' | 'png' | 'jpg' | 'jpeg';
  uploadDate: Date;
  fileUrl?: string;
  extractedData?: ExtractedData;
}

interface DocumentPreviewProps {
  document: DocumentData;
  onCreateJournalEntry?: () => void;
  onClose?: () => void;
}

const DocumentPreview: Component<DocumentPreviewProps> = (props) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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

  const getFileSize = () => {
    // Placeholder - in real implementation would get actual file size
    return '1.2 MB';
  };

  const previewContainerStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '2rem',
    '@media (max-width: 768px)': {
      'grid-template-columns': '1fr'
    }
  };

  const infoSectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const infoItemStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em'
  };

  const valueStyle = {
    'font-size': '1rem',
    color: 'var(--text-primary)',
    'font-weight': '500'
  };

  const previewAreaStyle = {
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '2rem',
    'text-align': 'center' as const,
    background: '#f9fafb',
    'min-height': '400px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-direction': 'column' as const,
    gap: '1rem'
  };

  const confidenceBarStyle = (confidence: number) => ({
    width: '100%',
    height: '8px',
    background: 'var(--border-color)',
    'border-radius': '4px',
    overflow: 'hidden',
    'margin-top': '0.5rem'
  });

  const confidenceFillStyle = (confidence: number) => ({
    height: '100%',
    width: `${confidence}%`,
    background: confidence >= 80 ? '#10B981' : confidence >= 60 ? '#F59E0B' : '#EF4444',
    transition: 'width 0.3s ease'
  });

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-top': '2rem',
    'flex-wrap': 'wrap' as const
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '2rem',
        'flex-wrap': 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            color: 'var(--text-primary)',
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem'
          }}>
            <span style={{ 'font-size': '2rem' }}>{getFileTypeIcon(props.document.type)}</span>
            {props.document.filename}
          </h2>
          <p style={{ margin: '0', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            Uploaded {formatDate(props.document.uploadDate)}
          </p>
        </div>
        {props.onClose && (
          <Button variant="outline" onClick={props.onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div style={previewContainerStyle}>
        {/* Document Info */}
        <div style={infoSectionStyle}>
          <Card title="Document Information">
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.5rem' }}>
              <div style={infoItemStyle}>
                <div style={labelStyle}>File Name</div>
                <div style={valueStyle}>{props.document.filename}</div>
              </div>

              <div style={infoItemStyle}>
                <div style={labelStyle}>File Type</div>
                <div style={valueStyle}>{props.document.type.toUpperCase()}</div>
              </div>

              <div style={infoItemStyle}>
                <div style={labelStyle}>File Size</div>
                <div style={valueStyle}>{getFileSize()}</div>
              </div>

              <div style={infoItemStyle}>
                <div style={labelStyle}>Upload Date</div>
                <div style={valueStyle}>{formatDate(props.document.uploadDate)}</div>
              </div>

              {props.document.extractedData?.confidence !== undefined && (
                <div style={infoItemStyle}>
                  <div style={labelStyle}>AI Confidence</div>
                  <div style={{
                    ...valueStyle,
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between'
                  }}>
                    <span>{getConfidenceLabel(props.document.extractedData.confidence)}</span>
                    <span style={{ 'font-weight': '600' }}>
                      {props.document.extractedData.confidence}%
                    </span>
                  </div>
                  <div style={confidenceBarStyle(props.document.extractedData.confidence)}>
                    <div style={confidenceFillStyle(props.document.extractedData.confidence)} />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Action Buttons */}
          <div style={buttonGroupStyle}>
            <Show when={props.document.extractedData}>
              <Button
                variant="primary"
                onClick={props.onCreateJournalEntry}
              >
                Create Journal Entry
              </Button>
            </Show>
            <Button variant="outline">
              Download
            </Button>
            <Button variant="outline">
              Re-process
            </Button>
          </div>
        </div>

        {/* Document Preview */}
        <div>
          <Card title="Preview">
            <div style={previewAreaStyle}>
              <Show
                when={props.document.fileUrl}
                fallback={
                  <>
                    <span style={{ 'font-size': '4rem' }}>{getFileTypeIcon(props.document.type)}</span>
                    <p style={{ color: 'var(--text-muted)' }}>
                      Preview not available
                    </p>
                  </>
                }
              >
                {/* In real implementation, would show actual document preview */}
                <img
                  src={props.document.fileUrl}
                  alt={props.document.filename}
                  style={{
                    'max-width': '100%',
                    'max-height': '400px',
                    'object-fit': 'contain'
                  }}
                />
              </Show>
            </div>
          </Card>
        </div>
      </div>

      {/* Extracted Data */}
      <Show when={props.document.extractedData}>
        <div style={{ 'margin-top': '2rem' }}>
          <ExtractedDataView extractedData={props.document.extractedData!} />
        </div>
      </Show>
    </div>
  );
};

export default DocumentPreview;
