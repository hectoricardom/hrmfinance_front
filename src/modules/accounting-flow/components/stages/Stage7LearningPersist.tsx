import { Component, Show, createMemo, For } from 'solid-js';
import type { JSX } from 'solid-js';

export interface LearningMetrics {
  totalProcessed: number;
  successRate: number;
  averageConfidence: number;
}

export interface Stage7LearningPersistProps {
  status: 'success' | 'failure';
  previousConfidence: number;
  newConfidence: number;
  metrics: LearningMetrics;
}

const Stage7LearningPersist: Component<Stage7LearningPersistProps> = (props) => {
  const confidenceDelta = createMemo(() => props.newConfidence - props.previousConfidence);
  const isPositiveDelta = createMemo(() => confidenceDelta() >= 0);

  // Styles
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '24px',
    padding: '24px',
    'font-family': 'system-ui, -apple-system, sans-serif',
  };

  const statusCardStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    gap: '16px',
    padding: '20px 24px',
    'border-radius': '12px',
    background: props.status === 'success'
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.15)',
    color: 'white',
  }));

  const statusIconStyle: JSX.CSSProperties = {
    width: '48px',
    height: '48px',
    'border-radius': '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '24px',
    'font-weight': 'bold',
  };

  const statusTextStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '4px',
  };

  const statusTitleStyle: JSX.CSSProperties = {
    'font-size': '18px',
    'font-weight': '600',
    margin: '0',
  };

  const statusSubtitleStyle: JSX.CSSProperties = {
    'font-size': '14px',
    opacity: '0.9',
    margin: '0',
  };

  const confidenceCardStyle: JSX.CSSProperties = {
    background: 'white',
    'border-radius': '12px',
    padding: '24px',
    'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e5e7eb',
  };

  const confidenceHeaderStyle: JSX.CSSProperties = {
    'font-size': '14px',
    'font-weight': '500',
    color: '#6b7280',
    'margin-bottom': '16px',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
  };

  const confidenceContentStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '20px',
  };

  const confidenceValueStyle: JSX.CSSProperties = {
    'font-size': '32px',
    'font-weight': '700',
    color: '#1f2937',
  };

  const arrowContainerStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    gap: '4px',
    padding: '8px 16px',
    'border-radius': '8px',
    background: isPositiveDelta() ? '#ecfdf5' : '#fef2f2',
  }));

  const arrowStyle = createMemo((): JSX.CSSProperties => ({
    'font-size': '24px',
    color: isPositiveDelta() ? '#10b981' : '#ef4444',
    transition: 'transform 0.3s ease',
  }));

  const deltaStyle = createMemo((): JSX.CSSProperties => ({
    'font-size': '14px',
    'font-weight': '600',
    color: isPositiveDelta() ? '#059669' : '#dc2626',
  }));

  const metricsGridStyle: JSX.CSSProperties = {
    display: 'grid',
    'grid-template-columns': 'repeat(3, 1fr)',
    gap: '16px',
  };

  const metricCardStyle: JSX.CSSProperties = {
    background: 'white',
    'border-radius': '12px',
    padding: '20px',
    'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e5e7eb',
    'text-align': 'center',
  };

  const metricValueStyle: JSX.CSSProperties = {
    'font-size': '28px',
    'font-weight': '700',
    color: '#1f2937',
    'margin-bottom': '4px',
  };

  const metricLabelStyle: JSX.CSSProperties = {
    'font-size': '13px',
    color: '#6b7280',
    'font-weight': '500',
  };

  const feedbackLoopStyle: JSX.CSSProperties = {
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    'border-radius': '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  };

  const feedbackTitleStyle: JSX.CSSProperties = {
    'font-size': '16px',
    'font-weight': '600',
    color: '#1f2937',
    'margin-bottom': '20px',
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
  };

  const diagramContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    position: 'relative',
    padding: '20px 0',
  };

  const nodeStyle: JSX.CSSProperties = {
    padding: '12px 16px',
    'border-radius': '8px',
    background: 'white',
    'box-shadow': '0 2px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    'font-size': '13px',
    'font-weight': '500',
    color: '#374151',
    'text-align': 'center',
    'min-width': '100px',
  };

  const arrowConnectorStyle: JSX.CSSProperties = {
    color: '#9ca3af',
    'font-size': '20px',
    padding: '0 8px',
  };

  const loopArrowStyle: JSX.CSSProperties = {
    position: 'absolute',
    bottom: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#10b981',
    'font-size': '14px',
    display: 'flex',
    'align-items': 'center',
    gap: '4px',
    background: '#ecfdf5',
    padding: '4px 12px',
    'border-radius': '16px',
    'font-weight': '500',
  };

  const saveButtonStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '8px',
    padding: '14px 28px',
    'background': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    'border-radius': '10px',
    'font-size': '15px',
    'font-weight': '600',
    cursor: 'pointer',
    'box-shadow': '0 4px 12px rgba(59, 130, 246, 0.35)',
    transition: 'all 0.2s ease',
    'align-self': 'center',
  };

  const feedbackNodes = [
    { label: 'Input', icon: '📄' },
    { label: 'Process', icon: '⚙️' },
    { label: 'Result', icon: '✓' },
    { label: 'Learn', icon: '🧠' },
  ];

  return (
    <div style={containerStyle}>
      {/* Status Card */}
      <div style={statusCardStyle()}>
        <div style={statusIconStyle}>
          <Show when={props.status === 'success'} fallback={<span>✕</span>}>
            <span>✓</span>
          </Show>
        </div>
        <div style={statusTextStyle}>
          <h3 style={statusTitleStyle}>
            {props.status === 'success' ? 'Learning Successful' : 'Learning Failed'}
          </h3>
          <p style={statusSubtitleStyle}>
            {props.status === 'success'
              ? 'Knowledge base has been updated with new patterns'
              : 'Unable to persist learning - please retry'}
          </p>
        </div>
      </div>

      {/* Confidence Delta */}
      <div style={confidenceCardStyle}>
        <div style={confidenceHeaderStyle}>Confidence Delta</div>
        <div style={confidenceContentStyle}>
          <span style={confidenceValueStyle}>{props.previousConfidence}%</span>
          <div style={arrowContainerStyle()}>
            <span style={arrowStyle()}>{isPositiveDelta() ? '↑' : '↓'}</span>
            <span style={deltaStyle()}>
              {isPositiveDelta() ? '+' : ''}{confidenceDelta().toFixed(1)}%
            </span>
          </div>
          <span style={confidenceValueStyle}>{props.newConfidence}%</span>
        </div>
      </div>

      {/* Metrics Panel */}
      <div style={metricsGridStyle}>
        <div style={metricCardStyle}>
          <div style={metricValueStyle}>{props.metrics.totalProcessed.toLocaleString()}</div>
          <div style={metricLabelStyle}>Total Processed</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricValueStyle}>{props.metrics.successRate.toFixed(1)}%</div>
          <div style={metricLabelStyle}>Success Rate</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricValueStyle}>{props.metrics.averageConfidence.toFixed(1)}%</div>
          <div style={metricLabelStyle}>Avg Confidence</div>
        </div>
      </div>

      {/* Feedback Loop Diagram */}
      <div style={feedbackLoopStyle}>
        <div style={feedbackTitleStyle}>
          <span>🔄</span>
          <span>Feedback Loop</span>
        </div>
        <div style={diagramContainerStyle}>
          <For each={feedbackNodes}>
            {(node, index) => (
              <>
                <div style={nodeStyle}>
                  <div style={{ 'font-size': '20px', 'margin-bottom': '4px' }}>{node.icon}</div>
                  <div>{node.label}</div>
                </div>
                <Show when={index() < feedbackNodes.length - 1}>
                  <span style={arrowConnectorStyle}>→</span>
                </Show>
              </>
            )}
          </For>
          <div style={loopArrowStyle}>
            ↩ Improves future mappings
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        style={saveButtonStyle}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.45)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.35)';
        }}
      >
        <span>💾</span>
        <span>Save to Knowledge Base</span>
      </button>
    </div>
  );
};

export default Stage7LearningPersist;
