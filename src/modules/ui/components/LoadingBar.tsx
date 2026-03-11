import { Component } from 'solid-js';

interface LoadingBarProps {
  color?: string;
  height?: string;
  background?: string;
}

const LoadingBar: Component<LoadingBarProps> = (props) => {
  const barColor = props.color || 'var(--primary-color)';
  const barHeight = props.height || '3px';
  const bgColor = props.background || 'var(--gray-200)';

  return (
    <>
      <div style={{
        position: 'relative',
        width: '100%',
        height: barHeight,
        background: bgColor,
        overflow: 'hidden',
        'border-radius': '2px'
      }}>
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          height: '100%',
          width: '30%',
          background: barColor,
          animation: 'loadingBar 1.2s ease-in-out infinite'
        }} />
      </div>
      <style>{`
        @keyframes loadingBar {
          0% { left: 0%; }
          20% { left: 35%; }
          35% { left: 70%; }
          60% { left: 100%; }
          75% { left: 70%; }
          90% { left: 40%; }
          100% { left: 10%; }
        }
      `}</style>
    </>
  );
};

export default LoadingBar;
