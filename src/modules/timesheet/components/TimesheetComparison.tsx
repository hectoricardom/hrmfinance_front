import { Component, createSignal, Show } from 'solid-js';
import TimesheetV1 from './TimesheetV1';
import TimesheetV2 from './TimesheetV2';
import TimesheetV3 from './TimesheetV3';
import TimesheetV4 from './TimesheetV4';

/**
 * Comparison Page for all 4 Timesheet Versions
 * Switch between versions to test usability
 */
const TimesheetComparison: Component = () => {
  const [activeVersion, setActiveVersion] = createSignal(1);

  const versions = [
    { id: 1, name: 'V1: Classic Table', desc: 'Traditional spreadsheet-style, familiar for Excel users' },
    { id: 2, name: 'V2: Timeline', desc: 'Visual timeline blocks, great for seeing time at a glance' }
  ];

  const styles = {
    container: {
      'min-height': '100vh',
      background: '#f0f2f5'
    },
    nav: {
      background: '#1a1a2e',
      padding: '15px 30px',
      display: 'flex',
      gap: '10px',
      'align-items': 'center',
      'flex-wrap': 'wrap'
    },
    navTitle: {
      color: '#fff',
      'font-size': '18px',
      'font-weight': '600',
      'margin-right': '30px',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    btn: {
      padding: '10px 20px',
      border: 'none',
      'border-radius': '8px',
      cursor: 'pointer',
      'font-size': '13px',
      'font-weight': '500',
      transition: 'all 0.2s',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    btnActive: {
      background: '#fff',
      color: '#1a1a2e'
    },
    content: {
      padding: '30px'
    },
    infoBar: {
      background: '#fff',
      padding: '15px 25px',
      'margin-bottom': '20px',
      'border-radius': '10px',
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      'box-shadow': '0 2px 8px rgba(0,0,0,0.06)',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    infoText: {
      'font-size': '14px',
      color: '#666'
    },
    infoBadge: {
      background: '#e3f2fd',
      color: '#1976D2',
      padding: '6px 14px',
      'border-radius': '20px',
      'font-size': '12px',
      'font-weight': '600'
    },
    legend: {
      background: '#fff',
      padding: '20px 25px',
      'margin-top': '30px',
      'border-radius': '10px',
      'box-shadow': '0 2px 8px rgba(0,0,0,0.06)',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    legendTitle: {
      'font-size': '16px',
      'font-weight': '600',
      'margin-bottom': '15px',
      color: '#333'
    },
    legendGrid: {
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px'
    },
    legendItem: {
      display: 'flex',
      gap: '12px',
      'align-items': 'flex-start'
    },
    legendNum: {
      width: '28px',
      height: '28px',
      background: '#667eea',
      color: '#fff',
      'border-radius': '50%',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'font-size': '14px',
      'font-weight': '600',
      'flex-shrink': '0'
    },
    legendContent: {},
    legendName: {
      'font-size': '14px',
      'font-weight': '600',
      color: '#333',
      'margin-bottom': '2px'
    },
    legendDesc: {
      'font-size': '12px',
      color: '#888'
    }
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <span style={styles.navTitle}>Timesheet Comparison</span>
        {versions.map((v) => (
          <button
            style={{
              ...styles.btn,
              ...(activeVersion() === v.id ? styles.btnActive : {})
            }}
            onClick={() => setActiveVersion(v.id)}
          >
            {v.name}
          </button>
        ))}
      </nav>

      <div style={styles.content}>
        <div style={styles.infoBar}>
          <span style={styles.infoText}>
            {versions.find(v => v.id === activeVersion())?.desc}
          </span>
          <span style={styles.infoBadge}>
            Version {activeVersion()} of 4
          </span>
        </div>

        <Show when={activeVersion() === 1}>
          <TimesheetV1 />
        </Show>
       
        <Show when={activeVersion() === 2}>
          <TimesheetV4 />
        </Show>

        <div style={styles.legend}>
          <div style={styles.legendTitle}>Version Summary</div>
          <div style={styles.legendGrid}>
            {versions.map((v) => (
              <div style={styles.legendItem}>
                <span style={styles.legendNum}>{v.id}</span>
                <div style={styles.legendContent}>
                  <div style={styles.legendName}>{v.name}</div>
                  <div style={styles.legendDesc}>{v.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetComparison;
