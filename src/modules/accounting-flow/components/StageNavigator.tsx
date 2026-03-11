import { Component, For, createMemo } from 'solid-js';
import type { JSX } from 'solid-js';

export interface StageInfo {
  number: number;
  name: string;
}

export interface StageNavigatorProps {
  currentStage: number;
  completedStages: number[];
  onStageClick: (stageNumber: number) => void;
}

const STAGES: StageInfo[] = [
  { number: 1, name: 'Source Input' },
  { number: 2, name: 'Transaction Parse' },
  { number: 3, name: 'Context Build' },
  { number: 4, name: 'Mapping Resolution' },
  { number: 5, name: 'Journal Entry' },
  { number: 6, name: 'Validation' },
  { number: 7, name: 'Learning & Persist' },
];

type StageStatus = 'completed' | 'current' | 'pending';

const StageNavigator: Component<StageNavigatorProps> = (props) => {
  const getStageStatus = (stageNumber: number): StageStatus => {
    if (props.completedStages.includes(stageNumber)) return 'completed';
    if (stageNumber === props.currentStage) return 'current';
    return 'pending';
  };

  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    padding: '24px 16px',
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    'min-height': '100%',
    'font-family': 'system-ui, -apple-system, sans-serif',
  };

  const titleStyle: JSX.CSSProperties = {
    'font-size': '12px',
    'font-weight': '600',
    'text-transform': 'uppercase',
    'letter-spacing': '0.1em',
    color: '#94a3b8',
    'margin-bottom': '24px',
    'padding-left': '8px',
  };

  const stagesListStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    position: 'relative',
  };

  const progressLineStyle: JSX.CSSProperties = {
    position: 'absolute',
    left: '23px',
    top: '24px',
    bottom: '24px',
    width: '2px',
    background: '#334155',
    'z-index': '0',
  };

  const getStageItemStyle = (status: StageStatus): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    gap: '16px',
    padding: '12px 8px',
    'border-radius': '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    'z-index': '1',
    background: status === 'current' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
  });

  const getCircleStyle = (status: StageStatus): JSX.CSSProperties => {
    const baseStyle: JSX.CSSProperties = {
      width: '32px',
      height: '32px',
      'border-radius': '50%',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'font-size': '14px',
      'font-weight': '600',
      transition: 'all 0.3s ease',
      'flex-shrink': '0',
    };

    if (status === 'completed') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        'box-shadow': '0 2px 8px rgba(16, 185, 129, 0.4)',
      };
    }

    if (status === 'current') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        'box-shadow': '0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(59, 130, 246, 0.4)',
        animation: 'pulse 2s infinite',
      };
    }

    return {
      ...baseStyle,
      background: '#334155',
      color: '#94a3b8',
      border: '2px solid #475569',
    };
  };

  const getTextContainerStyle = (): JSX.CSSProperties => ({
    display: 'flex',
    'flex-direction': 'column',
    gap: '2px',
    overflow: 'hidden',
  });

  const getNameStyle = (status: StageStatus): JSX.CSSProperties => ({
    'font-size': '14px',
    'font-weight': status === 'current' ? '600' : '500',
    color: status === 'pending' ? '#64748b' : '#e2e8f0',
    transition: 'color 0.2s ease',
    'white-space': 'nowrap',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
  });

  const getStatusLabelStyle = (status: StageStatus): JSX.CSSProperties => ({
    'font-size': '11px',
    'font-weight': '500',
    color: status === 'completed' ? '#10b981' : status === 'current' ? '#60a5fa' : '#475569',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
  });

  const getStatusIcon = (status: StageStatus): string => {
    if (status === 'completed') return '\u2713';
    if (status === 'current') return '\u2192';
    return '\u25CB';
  };

  const getStatusLabel = (status: StageStatus): string => {
    if (status === 'completed') return 'Completed';
    if (status === 'current') return 'In Progress';
    return 'Pending';
  };

  // Add keyframe animation for pulse effect via style tag
  const pulseKeyframes = `
    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(59, 130, 246, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.15), 0 2px 12px rgba(59, 130, 246, 0.5);
      }
    }
  `;

  return (
    <nav style={containerStyle}>
      <style>{pulseKeyframes}</style>
      <div style={titleStyle}>Pipeline Stages</div>
      <div style={stagesListStyle}>
        <div style={progressLineStyle} />
        <For each={STAGES}>
          {(stage) => {
            const status = createMemo(() => getStageStatus(stage.number));
            return (
              <div
                style={getStageItemStyle(status())}
                onClick={() => props.onStageClick(stage.number)}
                onMouseOver={(e) => {
                  if (status() !== 'current') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (status() !== 'current') {
                    e.currentTarget.style.background = 'transparent';
                  } else {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  }
                }}
              >
                <div style={getCircleStyle(status())}>
                  <span>{status() === 'completed' ? getStatusIcon('completed') : stage.number}</span>
                </div>
                <div style={getTextContainerStyle()}>
                  <span style={getNameStyle(status())}>{stage.name}</span>
                  <span style={getStatusLabelStyle(status())}>
                    {getStatusIcon(status())} {getStatusLabel(status())}
                  </span>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </nav>
  );
};

export default StageNavigator;
