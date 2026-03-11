import { Component, createSignal, Show, For } from 'solid-js';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { hblStore } from '../data/hblStore';
import { HBLListView } from '../list';
// These components don't exist yet, commenting them out
// import HBLFormModal from './HBLFormModal';
// import HBLTracking from './HBLTracking';
// import HBLReports from './HBLReports';
// import HBLScanning from './HBLScanning';
// import HBLImportExport from './HBLImportExport';

type TabKey = 'list' | 'tracking' | 'bulk' | 'scanning' | 'reports' | 'import-export';

interface Tab {
  key: TabKey;
  label: string;
  icon?: string;
  description?: string;
}

const HBLManagement: Component = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<TabKey>('list');
  const [showAddModal, setShowAddModal] = createSignal(false);

  const tabs: Tab[] = [
    {
      key: 'list',
      label: t('hbl.tabs.list', 'HBL List'),
      icon: '📋',
      description: t('hbl.tabs.listDesc', 'View and manage individual HBLs')
    },
    {
      key: 'tracking',
      label: t('hbl.tabs.tracking', 'Tracking'),
      icon: '📍',
      description: t('hbl.tabs.trackingDesc', 'Track HBL status and location')
    },
    {
      key: 'bulk',
      label: t('hbl.tabs.bulk', 'Bulk Operations'),
      icon: '📦',
      description: t('hbl.tabs.bulkDesc', 'Perform bulk updates and actions')
    },
    {
      key: 'scanning',
      label: t('hbl.tabs.scanning', 'Scanning'),
      icon: '📷',
      description: t('hbl.tabs.scanningDesc', 'Scan and process HBLs')
    },
    {
      key: 'reports',
      label: t('hbl.tabs.reports', 'Reports'),
      icon: '📊',
      description: t('hbl.tabs.reportsDesc', 'Generate HBL reports and analytics')
    },
    {
      key: 'import-export',
      label: t('hbl.tabs.importExport', 'Import/Export'),
      icon: '📥',
      description: t('hbl.tabs.importExportDesc', 'Import and export HBL data')
    }
  ];

  const handleAddHBL = () => {
    setShowAddModal(true);
  };

  return (
    <div class="hbl-management" style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '2rem'
      }}>
        <div>
          <h1 style={{
            'font-size': '2rem',
            'font-weight': '700',
            color: 'var(--text-primary)',
            'margin-bottom': '0.5rem'
          }}>
            {t('hbl.management.title', 'HBL Management System')}
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            'font-size': '0.875rem'
          }}>
            {t('hbl.management.subtitle', 'Manage House Bills of Lading efficiently')}
          </p>
        </div>
        
        <Show when={activeTab() === 'list'}>
          <Button
            variant="primary"
            onClick={handleAddHBL}
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}
          >
            <span>+</span>
            {t('hbl.addNew', 'Add New HBL')}
          </Button>
        </Show>
      </div>

      {/* Tab Navigation */}
      <Card style={{ 'margin-bottom': '1.5rem' }}>
        <div style={{
          display: 'flex',
          'flex-wrap': 'wrap',
          gap: '0.5rem',
          padding: '1rem'
        }}>
          <For each={tabs}>
            {(tab) => (
              <button
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-md)',
                  background: activeTab() === tab.key ? 'var(--primary-color)' : 'var(--surface-color)',
                  color: activeTab() === tab.key ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  'font-weight': activeTab() === tab.key ? '600' : '400'
                }}
                title={tab.description}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )}
          </For>
        </div>
      </Card>

      {/* Tab Content */}
      <div class="tab-content">
        <Show when={activeTab() === 'list'}>
          <HBLListView />
        </Show>
        
        <Show when={activeTab() === 'tracking'}>
          {/* <HBLTracking /> */}
          <div>Tracking component coming soon...</div>
        </Show>
        
        <Show when={activeTab() === 'bulk'}>
           {/* <HBLBulkOperations />*/}
          <div>Bulk operations coming soon...</div>
        </Show>
        
        <Show when={activeTab() === 'scanning'}>
          {/* <HBLScanning /> */}
          <div>Scanning component coming soon...</div>
        </Show>
        
        <Show when={activeTab() === 'reports'}>
          {/* <HBLReports /> */}
          <div>Reports component coming soon...</div>
        </Show>
        
        <Show when={activeTab() === 'import-export'}>
          {/* <HBLImportExport /> */}
          <div>Import/Export component coming soon...</div>
        </Show>
      </div>

      {/* Add HBL Modal */}
      <Show when={showAddModal()}>
        {/* <HBLFormModal
          isOpen={showAddModal()}
          onClose={() => setShowAddModal(false)}
          onSave={async (hbl) => {
            await hblStore.addHBL(hbl);
            setShowAddModal(false);
          }}
        /> */}
        <div>Form modal coming soon...</div>
      </Show>
    </div>
  );
};

export default HBLManagement;