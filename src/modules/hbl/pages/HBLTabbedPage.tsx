import { Component, createSignal, Show } from 'solid-js';
import { useTranslation } from '../../../translations';
import HBLList from './HBLList';
import HBLScannerDemo from './HBLScannerDemo';
import HBLLabelDemo from './HBLLabelDemo';
import HBLLabel2x4Demo from './HBLLabel2x4Demo';
import { HBLBulkStatusUpdate } from '../status';
import HBLBulkList from '../status/HBLBulkList';
import HBLAgencyWeightFilter from '../list/HBLAgencyWeightFilter';

type TabKey = 'list' | 'scanner' | 'bulk-scanner' | 'labels' | 'reports' | "group-agency";

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
  description: string;
}

const HBLTabbedPage: Component = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<TabKey>('list');

  const tabs: Tab[] = [
    {
      key: 'list',
      label: t('hbl.tabs.list', 'HBL List'),
      icon: '📋',
      description: t('hbl.tabs.listDesc', 'View, search, filter and manage HBL records')
    },
    {
      key: 'scanner',
      label: t('hbl.tabs.scanner', 'Scanner Demo'),
      icon: '📱',
      description: t('hbl.tabs.scannerDesc', 'Advanced scanning operations and testing')
    },
    {
      key: 'bulk-scanner',
      label: t('hbl.tabs.bulkScanner', 'Bulk Scanner'),
      icon: '🔄',
      description: t('hbl.tabs.bulkScannerDesc', 'Scan multiple HBLs and update statuses')
    },
    {
      key: 'labels',
      label: t('hbl.tabs.labels', 'Labels'),
      icon: '🏷️',
      description: t('hbl.tabs.labelsDesc', 'Generate and print shipping labels')
    },
    {
      key: 'reports',
      label: t('hbl.tabs.reports', 'Reports'),
      icon: '📊',
      description: t('hbl.tabs.reportsDesc', 'Analytics and reporting tools')
    },
    {
      key: 'group-agency',
      label: t('hbl.tabs.reports', 'Agrupar'),
      icon: '📊',
      description: t('hbl.tabs.reportsDesc', 'Analytics and reporting tools')
    }
  ];

  const tabStyle = (tab: Tab) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: activeTab() === tab.key ? 'var(--primary-color)' : 'transparent',
    color: activeTab() === tab.key ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': activeTab() === tab.key ? '600' : '400',
    transition: 'all 0.2s ease',
    'font-size': '0.875rem'
  });

  const tabContentStyle = {
    'margin-top': '1.5rem',
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-md)',
    'box-shadow': 'var(--shadow-sm)'
  };

  return (
    <div style={{ padding: '1.5rem', 'max-width': '100%' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '2rem' }}>
        <h1 style={{ 
          'font-size': '2rem',
          'font-weight': '700',
          color: 'var(--text-primary)',
          'margin-bottom': '0.5rem'
        }}>
          {t('hbl.title', 'HBL Management System')}
        </h1>
        <p style={{ 
          color: 'var(--text-muted)',
          'font-size': '1rem'
        }}>
          {t('hbl.subtitle', 'Manage House Bill of Lading records, scanning, and operations')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '1rem',
        'flex-wrap': 'wrap',
        'border-bottom': '1px solid var(--border-color)',
        'padding-bottom': '1rem'
      }}>
        {tabs.map((tab) => (
          <button
            style={tabStyle(tab)}
            onClick={() => setActiveTab(tab.key)}
            title={tab.description}
          >
            <span style={{ 'font-size': '1.2rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={tabContentStyle}>
        <Show when={activeTab() === 'list'}>
          <div>
            <div style={{ 'margin-bottom': '1rem' }}>
              <h2 style={{ 
                'font-size': '1.25rem',
                'font-weight': '600',
                color: 'var(--text-primary)',
                'margin-bottom': '0.5rem'
              }}>
                📋 {t('hbl.list.title', 'HBL Records Management')}
              </h2>
              <p style={{ 
                color: 'var(--text-muted)',
                'font-size': '0.875rem'
              }}>
                {t('hbl.list.description', 'Search, filter, view and export your HBL records. Print lists and manage individual entries.')}
              </p>
            </div>
            <HBLList />
          </div>
        </Show>

        <Show when={activeTab() === 'scanner'}>
          <div>
            <div style={{ 'margin-bottom': '1rem' }}>
              <h2 style={{ 
                'font-size': '1.25rem',
                'font-weight': '600',
                color: 'var(--text-primary)',
                'margin-bottom': '0.5rem'
              }}>
                📱 {t('hbl.scanner.title', 'Advanced Scanner Operations')}
              </h2>
              <p style={{ 
                color: 'var(--text-muted)',
                'font-size': '0.875rem'
              }}>
                {t('hbl.scanner.description', 'Test different scanning modes, continuous scanning, and advanced barcode operations.')}
              </p>
            </div>
            <HBLScannerDemo />
          </div>
        </Show>

        <Show when={activeTab() === 'bulk-scanner'}>
          <div>
            <div style={{ 'margin-bottom': '1rem' }}>
              <h2 style={{ 
                'font-size': '1.25rem',
                'font-weight': '600',
                color: 'var(--text-primary)',
                'margin-bottom': '0.5rem'
              }}>
                🔄 {t('hbl.bulkScanner.title', 'Bulk Status Scanner')}
              </h2>
              <p style={{ 
                color: 'var(--text-muted)',
                'font-size': '0.875rem'
              }}>
                {t('hbl.bulkScanner.description', 'Scan multiple HBL barcodes and update their statuses in bulk operations.')}
              </p>
            </div>
            <HBLBulkStatusUpdate/>
          </div>
        </Show>

        <Show when={activeTab() === 'labels'}>
          <div>
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <h2 style={{
                'font-size': '1.25rem',
                'font-weight': '600',
                color: 'var(--text-primary)',
                'margin-bottom': '0.5rem'
              }}>
                🏷️ {t('hbl.labels.title', 'Label Generation')}
              </h2>
              <p style={{
                color: 'var(--text-muted)',
                'font-size': '0.875rem',
                'margin-bottom': '1rem'
              }}>
                {t('hbl.labels.description', 'Generate and print shipping labels in various formats.')}
              </p>

              <div style={{
                padding: '1rem',
                background: '#e3f2fd',
                border: '1px solid #2196f3',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1.5rem'
              }}>
                <strong>💡 Tip:</strong> Use the HBL List tab to print labels for multiple HBLs at once.
                Select HBLs and click "Print Labels" or print all filtered results.
              </div>

              {/* Label Format Options */}
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem',
                'margin-bottom': '2rem'
              }}>
                <div style={{
                  padding: '1rem',
                  border: '2px solid var(--primary-color)',
                  'border-radius': 'var(--border-radius-md)',
                  background: 'var(--surface-color)'
                }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    'font-size': '1.1rem',
                    color: 'var(--primary-color)'
                  }}>
                    📦 2.3 x 4 inch Labels (Recommended)
                  </h3>
                  <p style={{
                    margin: '0 0 0.75rem 0',
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)'
                  }}>
                    Compact thermal labels for label printers. Perfect for bulk printing.
                  </p>
                  <ul style={{
                    margin: '0',
                    'padding-left': '1.5rem',
                    'font-size': '0.875rem'
                  }}>
                    <li>QR Code with HBL number</li>
                    <li>Bag number (highlighted)</li>
                    <li>Customer details</li>
                    <li>Compact design</li>
                  </ul>
                </div>

                <div style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-md)',
                  background: 'var(--surface-color)'
                }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    'font-size': '1.1rem'
                  }}>
                    📄 4 x 6 inch Labels
                  </h3>
                  <p style={{
                    margin: '0 0 0.75rem 0',
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)'
                  }}>
                    Standard shipping labels with more details.
                  </p>
                  <ul style={{
                    margin: '0',
                    'padding-left': '1.5rem',
                    'font-size': '0.875rem'
                  }}>
                    <li>QR Code</li>
                    <li>Complete address</li>
                    <li>Weight & pieces info</li>
                    <li>Origin & destination</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2.3x4 Demo */}
            <div style={{ 'margin-bottom': '3rem' }}>
              <h3 style={{
                'font-size': '1.1rem',
                'font-weight': '600',
                'margin-bottom': '1rem',
                color: 'var(--text-primary)'
              }}>
                2.3 x 4 inch Label Demo
              </h3>
              <HBLLabel2x4Demo />
            </div>

            {/* 4x6 Demo */}
            <div>
              <h3 style={{
                'font-size': '1.1rem',
                'font-weight': '600',
                'margin-bottom': '1rem',
                color: 'var(--text-primary)'
              }}>
                4 x 6 inch Label Demo
              </h3>
              <HBLLabelDemo />
            </div>
          </div>
        </Show>
        <Show when={activeTab() === 'reports'}>
            <HBLBulkList/>
        </Show>

        <Show when={activeTab() === 'group-agency'}>
           <HBLAgencyWeightFilter/>
        </Show>
      </div>
    </div>
  );
};

export default HBLTabbedPage;