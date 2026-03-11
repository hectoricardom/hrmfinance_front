import { Component, createSignal, onMount, For, Show, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { devLog } from '../../../services/utils';
import { Card, Button } from '../../ui';
import {
  TaxClientProfile,
  TaxDocument,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  FILING_STATUS_LABELS,
} from '../types';
import { taxPortalService } from '../services/taxPortalService';
import { taxPortalStore } from '../stores/taxPortalStore';
import ClientIntakeForm from '../components/ClientIntakeForm';
import ClientDetailPanel from '../components/ClientDetailPanel';
import { useTranslation } from '../../../translations';

type ViewMode = 'dashboard' | 'clients' | 'documents' | 'settings';
type SortField = 'name' | 'status' | 'progress' | 'updatedAt';

const PreparerDashboard: Component = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = createSignal<ViewMode>('dashboard');
  const [isLoading, setIsLoading] = createSignal(true);
  const [showNewClientForm, setShowNewClientForm] = createSignal(false);
  const [selectedClient, setSelectedClient] = createSignal<TaxClientProfile | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal<TaxClientProfile['status'] | 'all'>('all');
  const [sortField, setSortField] = createSignal<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = createSignal<'asc' | 'desc'>('desc');
  const [showCopiedToast, setShowCopiedToast] = createSignal(false);

  onMount(async () => {
    setIsLoading(true);
    await taxPortalService.initialize();
    await taxPortalService.getClients();
    setIsLoading(false);
  });

  // Get filtered and sorted clients
  const filteredClients = createMemo(() => {
    let clients = [...taxPortalStore.state.clients];
    devLog(clients)
    

    // Search filter
    if (searchQuery()) {
      const query = searchQuery().toLowerCase();
      clients = clients?.filter?.(c =>
        c?.firstName?.toLowerCase().includes(query) ||
        c?.lastName?.toLowerCase().includes(query) ||
        c?.email?.toLowerCase().includes(query) ||
        c?.phone?.includes(query)
      );
    }

    // Status filter
    if (statusFilter() !== 'all') {
      clients = clients.filter(c => c.status === statusFilter());
    }

    // Sort
    clients.sort((a, b) => {
      let comparison = 0;
      switch (sortField()) {
        case 'name':
          comparison = `${a?.lastName} ${a?.firstName}`?.localeCompare(`${b?.lastName} ${b?.firstName}`);
          break;
        case 'status':
          comparison = a?.status?.localeCompare(b?.status);
          break;
        case 'progress':
          comparison = a?.documentProgress - b?.documentProgress;
          break;
        case 'updatedAt':
          comparison = a?.updatedAt - b?.updatedAt;
          break;
      }
      return sortDirection() === 'asc' ? comparison : -comparison;
    });

    return clients;
  });

  // Dashboard stats
  const stats = createMemo(() => taxPortalStore.getDashboardStats());

  // Handle new client created
  const handleClientCreated = (client: TaxClientProfile) => {
    setShowNewClientForm(false);
    setSelectedClient(client);
  };


  // Copy portal link
  const copyPortalLink = async (client: TaxClientProfile) => {
   
    devLog(client.id)
    const url = taxPortalService.getPortalUrl(client.id);
    await navigator.clipboard.writeText(url);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  // Styles
  const containerStyle = {
    padding: '1.5rem',
    'max-width': '1400px',
    margin: '0 auto',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem',
  };

  const statCardStyle = {
    padding: '1.5rem',
    'text-align': 'center' as const,
    background: 'white',
    'border-radius': '12px',
    border: '1px solid var(--border-color)',
  };

  const tableHeaderStyle = {
    padding: '0.75rem 1rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    'background': 'var(--gray-50)',
    'border-bottom': '2px solid var(--border-color)',
    cursor: 'pointer',
  };

  const tableCellStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
  };

  return (
    <div style={containerStyle}>
      {/* Copied Toast */}
      <Show when={showCopiedToast()}>
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          background: '#22c55e',
          color: 'white',
          padding: '0.75rem 1.5rem',
          'border-radius': '8px',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
          'z-index': 1000,
        }}>
          {t('taxPortal.linkCopied')}
        </div>
      </Show>

      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0 }}>{t('taxPortal.documentPortal')}</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
            {new Date().getFullYear() - 1} {t('taxPortal.taxYear')}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNewClientForm(true)}>
          + {t('taxPortal.newClient')}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '1.5rem',
        'border-bottom': '2px solid var(--border-color)',
        'padding-bottom': '0.5rem',
      }}>
        <For each={[
          { id: 'dashboard', label: t('navigation.dashboard') },
          { id: 'clients', label: `${t('common.all')} ${t('taxPortal.clients')}` },
          { id: 'documents', label: `${t('taxPortal.documents')} ${t('taxPortal.underReview')}` },
        ] as { id: ViewMode; label: string }[]}>
          {(tab) => (
            <button
              onClick={() => setViewMode(tab.id)}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode() === tab.id ? 'var(--primary-color)' : 'transparent',
                color: viewMode() === tab.id ? 'white' : 'var(--text-primary)',
                border: 'none',
                'border-radius': '6px',
                cursor: 'pointer',
                'font-weight': viewMode() === tab.id ? '600' : '400',
              }}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', padding: '4rem' }}>
          <p>{t('common.loading')}</p>
        </div>
      </Show>

      {/* Dashboard View */}
      <Show when={!isLoading() && viewMode() === 'dashboard'}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          'margin-bottom': '2rem',
        }}>
          <div style={statCardStyle}>
            <div style={{ 'font-size': '2.5rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
              {stats().totalClients}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{t('taxPortal.totalClients')}</div>
          </div>

          <div style={statCardStyle}>
            <div style={{ 'font-size': '2.5rem', 'font-weight': '700', color: '#f59e0b' }}>
              {stats().clientsByStatus.collecting_documents}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{t('taxPortal.collectingDocuments')}</div>
          </div>

          <div style={statCardStyle}>
            <div style={{ 'font-size': '2.5rem', 'font-weight': '700', color: '#8b5cf6' }}>
              {stats().documentsToReview}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{t('taxPortal.documents')} {t('taxPortal.underReview')}</div>
          </div>

          <div style={statCardStyle}>
            <div style={{ 'font-size': '2.5rem', 'font-weight': '700', color: '#22c55e' }}>
              {stats().clientsByStatus.completed}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{t('taxPortal.completed')}</div>
          </div>
        </div>

        {/* Status Breakdown */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>{t('taxPortal.clients')} by {t('taxPortal.status')}</h3>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.75rem' }}>
              <For each={Object.entries(stats().clientsByStatus)}>
                {([status, count]) => (
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      background: CLIENT_STATUS_COLORS[status as TaxClientProfile['status']] + '20',
                      color: CLIENT_STATUS_COLORS[status as TaxClientProfile['status']],
                      'border-radius': '999px',
                      'font-size': '0.875rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setStatusFilter(status as TaxClientProfile['status']);
                      setViewMode('clients');
                    }}
                  >
                    {CLIENT_STATUS_LABELS[status as TaxClientProfile['status']]}: {count}
                  </div>
                )}
              </For>
            </div>
          </div>
        </Card>

        {/* Recent Activity - Clients needing attention */}
        <Card>
          <div style={{ padding: '1.5rem', 'margin-top': '1rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>{t('taxPortal.clients')} {t('taxPortal.needsAttention')}</h3>
            <Show when={filteredClients().filter(c => c.status === 'collecting_documents' || c.status === 'documents_complete').length === 0}>
              <p style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '2rem' }}>
                {t('taxPortal.noClients')} {t('taxPortal.needsAttention').toLowerCase()}
              </p>
            </Show>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
              <For each={filteredClients().filter(c => c.status === 'collecting_documents' || c.status === 'documents_complete').slice(0, 5)}>
                {(client) => (
                  <div
                    style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'var(--gray-50)',
                      'border-radius': '8px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      'border-radius': '50%',
                      background: 'var(--primary-color)',
                      color: 'white',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'font-weight': '600',
                    }}>
                      {client.firstName[0]}{client.lastName[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 'font-weight': '600' }}>
                        {client.firstName} {client.lastName}
                      </div>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                        {client.documentProgress}% {t('taxPortal.complete')}
                      </div>
                    </div>
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      background: CLIENT_STATUS_COLORS[client.status] + '20',
                      color: CLIENT_STATUS_COLORS[client.status],
                      'border-radius': '999px',
                      'font-size': '0.75rem',
                    }}>
                      {CLIENT_STATUS_LABELS[client.status]}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Card>
      </Show>

      {/* Clients List View */}
      <Show when={!isLoading() && viewMode() === 'clients'}>
        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'margin-bottom': '1rem',
          'flex-wrap': 'wrap',
        }}>
          <input
            type="text"
            placeholder={t('taxPortal.searchClients')}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              'border-radius': '6px',
              'min-width': '250px',
            }}
          />
          <select
            value={statusFilter()}
            onChange={(e) => setStatusFilter(e.currentTarget.value as any)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              'border-radius': '6px',
            }}
          >
            <option value="all">{t('taxPortal.allStatuses')}</option>
            <For each={Object.entries(CLIENT_STATUS_LABELS)}>
              {([value, label]) => (
                <option value={value}>{label}</option>
              )}
            </For>
          </select>
        </div>

        {/* Clients Table */}
        <Card>
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={tableHeaderStyle}
                    onClick={() => {
                      if (sortField() === 'name') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                      else { setSortField('name'); setSortDirection('asc'); }
                    }}
                  >
                    {t('common.name')} {sortField() === 'name' && (sortDirection() === 'asc' ? ' ^' : ' v')}
                  </th>
                  <th style={tableHeaderStyle}>{t('taxPortal.contactInformation')}</th>
                  <th
                    style={tableHeaderStyle}
                    onClick={() => {
                      if (sortField() === 'status') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                      else { setSortField('status'); setSortDirection('asc'); }
                    }}
                  >
                    {t('taxPortal.status')} {sortField() === 'status' && (sortDirection() === 'asc' ? ' ^' : ' v')}
                  </th>
                  <th
                    style={tableHeaderStyle}
                    onClick={() => {
                      if (sortField() === 'progress') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                      else { setSortField('progress'); setSortDirection('desc'); }
                    }}
                  >
                    {t('taxPortal.progress')} {sortField() === 'progress' && (sortDirection() === 'asc' ? ' ^' : ' v')}
                  </th>
                  <th style={tableHeaderStyle}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                <Show when={filteredClients().length === 0}>
                  <tr>
                    <td colspan="5" style={{ ...tableCellStyle, 'text-align': 'center', color: 'var(--text-muted)' }}>
                      {searchQuery() || statusFilter() !== 'all'
                        ? `${t('common.noDataFound')} - ${t('taxPortal.noClients')}`
                        : `${t('taxPortal.noClients')}. ${t('taxPortal.getStarted')}`}
                    </td>
                  </tr>
                </Show>
                <For each={filteredClients()}>
                  {(client) => (
                    <tr style={{ cursor: 'pointer' }} onClick={() => setSelectedClient(client)}>
                      <td style={tableCellStyle}>
                        <div style={{ 'font-weight': '600' }}>
                          {client.firstName} {client.lastName}
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                          {FILING_STATUS_LABELS[client.filingStatus]}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div>{client.email}</div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>{client.phone}</div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: CLIENT_STATUS_COLORS[client.status] + '20',
                          color: CLIENT_STATUS_COLORS[client.status],
                          'border-radius': '999px',
                          'font-size': '0.75rem',
                          'font-weight': '500',
                        }}>
                          {CLIENT_STATUS_LABELS[client.status]}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '100px',
                            height: '8px',
                            background: 'var(--gray-200)',
                            'border-radius': '4px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${client.documentProgress}%`,
                              height: '100%',
                              background: client.documentProgress === 100 ? '#22c55e' : '#3b82f6',
                            }} />
                          </div>
                          <span style={{ 'font-size': '0.875rem' }}>{client.documentProgress}%</span>
                        </div>
                      </td>
                      <td style={tableCellStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPortalLink(client)}
                          >
                            {t('taxPortal.copyLink')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClient(client)}
                          >
                            {t('common.view')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Card>
      </Show>

      {/* Documents to Review View */}
      <Show when={!isLoading() && viewMode() === 'documents'}>
        <DocumentReviewList />
      </Show>

      {/* New Client Modal */}
      <Show when={showNewClientForm()}>
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'white',
            'border-radius': '12px',
            'max-width': '800px',
            width: '100%',
            'max-height': '90vh',
            'overflow-y': 'auto',
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              'border-bottom': '1px solid var(--border-color)',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
            }}>
              <h2 style={{ margin: 0 }}>{t('taxPortal.newClient')} - {t('taxPortal.client')}</h2>
              <button
                onClick={() => setShowNewClientForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  'font-size': '1.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                }}
              >
                X
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <ClientIntakeForm
                onSubmit={handleClientCreated}
                onCancel={() => setShowNewClientForm(false)}
              />
            </div>
          </div>
        </div>
      </Show>

      {/* Client Detail Panel */}
      <Show when={selectedClient()}>
        <ClientDetailPanel
          client={selectedClient()!}
          onClose={() => setSelectedClient(null)}
          onCopyLink={() => copyPortalLink(selectedClient()!)}
        />
      </Show>
    </div>
  );
};

// Document Review List Component
const DocumentReviewList: Component = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = createSignal<(TaxDocument & { clientName: string })[]>([]);

  onMount(() => {
    const docs = taxPortalStore.state.documents
      .filter(d => d.status === 'pending' || d.status === 'analyzed')
      .map(d => {
        const client = taxPortalStore.state.clients.find(c => c.id === d.clientId);
        return {
          ...d,
          clientName: client ? `${client.firstName} ${client.lastName}` : t('common.unknown'),
        };
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
    setDocuments(docs);
  });

  const handleApprove = async (docId: string) => {
    await taxPortalService.approveDocument(docId);
    setDocuments(docs => docs.filter(d => d.id !== docId));
  };

  const handleAnalyze = async (doc: TaxDocument) => {
    await taxPortalService.analyzeDocument(doc);
    // Refresh list
    const updatedDocs = taxPortalStore.state.documents
      .filter(d => d.status === 'pending' || d.status === 'analyzed')
      .map(d => {
        const client = taxPortalStore.state.clients.find(c => c.id === d.clientId);
        return {
          ...d,
          clientName: client ? `${client.firstName} ${client.lastName}` : t('common.unknown'),
        };
      });
    setDocuments(updatedDocs);
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>{t('taxPortal.documentsPending')} {t('taxPortal.review')} ({documents().length})</h3>

        <Show when={documents().length === 0}>
          <p style={{ 'text-align': 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            {t('taxPortal.noDocuments')} {t('taxPortal.pending').toLowerCase()} {t('taxPortal.review').toLowerCase()}
          </p>
        </Show>

        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
          <For each={documents()}>
            {(doc) => (
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': '8px',
              }}>
                <div style={{ 'font-size': '2rem' }}>
                  {doc.mimeType?.includes('pdf') ? 'PDF' : 'IMG'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 'font-weight': '600' }}>{doc.originalFileName}</div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {doc.clientName} | {doc.detectedType || t('taxPortal.pendingAnalysis')} |
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Show when={!doc.aiAnalyzed}>
                    <Button variant="outline" size="sm" onClick={() => handleAnalyze(doc)}>
                      {t('taxPortal.analyze')}
                    </Button>
                  </Show>
                  <Show when={doc.aiAnalyzed}>
                    <Button variant="primary" size="sm" onClick={() => handleApprove(doc.id)}>
                      {t('taxPortal.approve')}
                    </Button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </Card>
  );
};

export default PreparerDashboard;
