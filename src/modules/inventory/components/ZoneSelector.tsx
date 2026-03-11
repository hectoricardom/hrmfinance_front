import { Component, For } from 'solid-js';
import { Zone } from '../types/counting';

interface ZoneSelectorProps {
  zones: Zone[];
  onSelectZone: (zone: Zone) => void;
  onStartFullCount: () => void;
}

const ZoneSelector: Component<ZoneSelectorProps> = (props) => {
  const containerStyle = {
    padding: '2rem',
    'max-width': '1200px',
    margin: '0 auto'
  };

  const headerStyle = {
    'margin-bottom': '2rem',
    'text-align': 'center' as const
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem'
  };

  const subtitleStyle = {
    color: 'var(--text-secondary)',
    'font-size': '0.875rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const cardStyle = {
    background: 'white',
    border: '1px solid var(--border-color)',
    'border-radius': '8px',
    padding: '1.5rem',
    transition: 'all 0.2s',
    cursor: 'pointer'
  };

  const cardHoverStyle = {
    'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-2px)'
  };

  const zoneNameStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem'
  };

  const statsRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'margin-bottom': '0.5rem'
  };

  const statLabelStyle = {
    color: 'var(--text-secondary)',
    'font-size': '0.875rem'
  };

  const statValueStyle = {
    color: 'var(--text-primary)',
    'font-weight': '500',
    'font-size': '0.875rem'
  };

  const buttonStyle = {
    width: '100%',
    'margin-top': '1rem',
    padding: '0.75rem',
    background: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': '6px',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  const fullCountButtonStyle = {
    ...buttonStyle,
    background: 'var(--success-color)',
    'max-width': '400px',
    margin: '0 auto',
    display: 'block',
    'font-size': '1rem',
    padding: '1rem'
  };

  const dividerStyle = {
    height: '1px',
    background: 'var(--border-color)',
    'margin': '2rem 0'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Seleccionar Zona de Conteo</h2>
        <p style={subtitleStyle}>Seleccione una zona para iniciar el conteo de inventario</p>
      </div>

      <div style={gridStyle}>
        <For each={props.zones}>
          {(zone) => (
            <div
              style={cardStyle}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, cardHoverStyle);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.transform = '';
              }}
            >
              <div style={zoneNameStyle}>{zone.name}</div>

              <div style={statsRowStyle}>
                <span style={statLabelStyle}>Productos:</span>
                <span style={statValueStyle}>{zone.productCount}</span>
              </div>

              <div style={statsRowStyle}>
                <span style={statLabelStyle}>Estantes:</span>
                <span style={statValueStyle}>{zone.shelfCount}</span>
              </div>

              <button
                style={buttonStyle}
                onClick={() => props.onSelectZone(zone)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--primary-color)';
                }}
              >
                Iniciar
              </button>
            </div>
          )}
        </For>
      </div>

      <div style={dividerStyle}></div>

      <button
        style={fullCountButtonStyle}
        onClick={props.onStartFullCount}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#059669';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--success-color)';
        }}
      >
        CONTEO COMPLETO
      </button>
    </div>
  );
};

export default ZoneSelector;
