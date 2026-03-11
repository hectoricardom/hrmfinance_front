/**
 * Tax Portal Page
 * Main entry point for managing tax clients and document requests
 */

import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { A } from '@solidjs/router';
import { Card, Button, FormInput, Modal } from '../../ui';
import { useTranslation } from '../../../translations';
import {
  getTaxPortals,
  createTaxPortal,
  deleteTaxPortal,
  getDocumentRequests
} from '../services/taxPortalApi';
import TaxPortalRequestManager from '../components/TaxPortalRequestManager';
import type { TaxPortal, TaxDocumentRequest } from '../types/drakeTypes';
import { devLog } from '../../../services/utils';
import { lookupZipCode } from '../utils/zipCodeLookup';

const TaxPortalPage: Component = () => {
  const { t } = useTranslation();

  // State
  const [portals, setPortals] = createSignal<TaxPortal[]>([]);
  const [requests, setRequests] = createSignal<TaxDocumentRequest[]>([]);
  const [selectedPortal, setSelectedPortal] = createSignal<TaxPortal | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<'portals' | 'requests'>('portals');

  // New portal form
  const [newPortal, setNewPortal] = createSignal({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ssn: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  // Load data
  createEffect(async () => {
    setIsLoading(true);
    try {
      const [portalsData, requestsData] = await Promise.all([
        getTaxPortals(),
        getDocumentRequests()
      ]);
      setPortals(portalsData);
      setRequests(requestsData);
    } catch (error) {
      devLog('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  });

  // Filter portals by search
  const filteredPortals = () => {
    const term = searchTerm().toLowerCase();
    if (!term) return portals();
    return portals().filter(p =>
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.phone?.includes(term)
    );
  };

  // Handle create portal
  const handleCreatePortal = async () => {
    try {
      const portal = await createTaxPortal(newPortal());
      setPortals([portal, ...portals()]);
      setShowCreateForm(false);
      setNewPortal({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        ssn: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      });
      setSelectedPortal(portal);
    } catch (error) {
      devLog('Error creating portal:', error);
      alert('Error al crear el portal');
    }
  };

  // Handle delete portal
  const handleDeletePortal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax portal?')) return;
    try {
      await deleteTaxPortal(id);
      setPortals(portals().filter(p => p.id !== id));
      if (selectedPortal()?.id === id) {
        setSelectedPortal(null);
      }
    } catch (error) {
      devLog('Error deleting portal:', error);
    }
  };

  // Get request counts by status
  const requestStats = () => {
    const reqs = requests();
    return {
      pending: reqs.filter(r => r.status === 'pending').length,
      partial: reqs.filter(r => r.status === 'partial').length,
      complete: reqs.filter(r => r.status === 'complete').length,
      expired: reqs.filter(r => r.status === 'expired').length
    };
  };

  // Styles
  const containerStyle = {
    padding: '1.5rem',
    'max-width': '1400px',
    margin: '0 auto'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap',
    gap: '1rem'
  };

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const statCardStyle = (color: string) => ({
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-left': `4px solid ${color}`,
    'border-radius': 'var(--border-radius-md)',
    padding: '1rem',
    'text-align': 'center'
  });

  const tabsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1.5rem',
    'border-bottom': '1px solid var(--border-color)',
    'padding-bottom': '0.5rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    border: 'none',
    'border-radius': 'var(--border-radius-md)',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'all 0.2s'
  });

  const mainContentStyle = {
    display: 'grid',
    'grid-template-columns': selectedPortal() ? '350px 1fr' : '1fr',
    gap: '1.5rem'
  };

  const portalListStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem',
    'max-height': '70vh',
    'overflow-y': 'auto'
  };

  const portalCardStyle = (isSelected: boolean) => ({
    background: isSelected ? 'var(--primary-color)' : 'var(--surface-color)',
    color: isSelected ? 'white' : 'var(--text-primary)',
    border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius-md)',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  const formGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ 'font-size': '1.75rem', 'font-weight': '700', margin: '0 0 0.25rem 0' }}>
            Tax Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Manage tax clients and document requests
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <A href="/accounting/drake-export" style={{ 'text-decoration': 'none' }}>
            <Button variant="secondary">
              Drake Export
            </Button>
          </A>
          <Button onClick={() => setShowCreateForm(true)}>
            + New Client
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={statsGridStyle}>
        <div style={statCardStyle('#3b82f6')}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#3b82f6' }}>
            {portals().length}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Tax Clients
          </div>
        </div>
        <div style={statCardStyle('#f59e0b')}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#f59e0b' }}>
            {requestStats().pending}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Pending Requests
          </div>
        </div>
        <div style={statCardStyle('#8b5cf6')}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#8b5cf6' }}>
            {requestStats().partial}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Partial Uploads
          </div>
        </div>
        <div style={statCardStyle('#22c55e')}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#22c55e' }}>
            {requestStats().complete}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Complete
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          style={tabStyle(activeTab() === 'portals')}
          onClick={() => setActiveTab('portals')}
        >
          Tax Clients ({portals().length})
        </button>
        <button
          style={tabStyle(activeTab() === 'requests')}
          onClick={() => setActiveTab('requests')}
        >
          Document Requests ({requests().length})
        </button>
      </div>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div style={{ 'font-size': '1.5rem', color: 'var(--text-muted)' }}>Loading...</div>
        </div>
      </Show>

      {/* Create Portal Form Modal */}
      <Modal
        isOpen={showCreateForm()}
        onClose={() => setShowCreateForm(false)}
        title="New Tax Client"
        maxWidth="600px"
      >
        <div style={formGridStyle}>
          <FormInput
            label="First Name *"
            value={newPortal().firstName}
            onChange={(e) => setNewPortal({ ...newPortal(), firstName: e })}
          />
          <FormInput
            label="Last Name *"
            value={newPortal().lastName}
            onChange={(e) => setNewPortal({ ...newPortal(), lastName: e })}
          />
          <FormInput
            label="Email"
            type="email"
            value={newPortal().email}
            onChange={(e) => setNewPortal({ ...newPortal(), email: e })}
          />
          <FormInput
            label="Phone"
            value={newPortal().phone}
            onChange={(e) => setNewPortal({ ...newPortal(), phone: e })}
          />
          <FormInput
            label="SSN"
            placeholder="XXX-XX-XXXX"
            value={newPortal().ssn}
            onChange={(e) => setNewPortal({ ...newPortal(), ssn: e })}
          />
          <FormInput
            label="Address"
            value={newPortal().address}
            onChange={(e) => setNewPortal({ ...newPortal(), address: e })}
          />
          <FormInput
            label="City"
            value={newPortal().city}
            onChange={(e) => setNewPortal({ ...newPortal(), city: e })}
          />
          <FormInput
            label="State"
            value={newPortal().state}
            onChange={(e) => setNewPortal({ ...newPortal(), state: e })}
          />
          <FormInput
            label="Zip Code"
            value={newPortal().zipCode}
            onChange={async (e) => {
              setNewPortal({ ...newPortal(), zipCode: e });
              // Auto-lookup city/state when ZIP is 5 digits
              const cleanZip = e.replace(/\D/g, '');
              if (cleanZip.length === 5) {
                const result = await lookupZipCode(cleanZip);
                if (result) {
                  setNewPortal(prev => ({
                    ...prev,
                    city: result.city,
                    state: result.stateAbbreviation
                  }));
                }
              }
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end', 'margin-top': '1.5rem' }}>
          <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePortal}
            disabled={!newPortal().firstName || !newPortal().lastName}
          >
            Create Client
          </Button>
        </div>
      </Modal>

      {/* Main Content */}
      <Show when={!isLoading()}>
        {/* Portals Tab */}
        <Show when={activeTab() === 'portals'}>
          <div style={mainContentStyle}>
            {/* Portal List */}
            <div>
              <FormInput
                placeholder="Search clients..."
                value={searchTerm()}
                onChange={(e) => setSearchTerm(e)}
                style={{ 'margin-bottom': '1rem' }}
              />

              <div style={portalListStyle}>
                <Show when={filteredPortals().length === 0}>
                  <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No tax clients found
                  </div>
                </Show>

                <For each={filteredPortals()}>
                  {(portal) => (
                    <div
                      style={portalCardStyle(selectedPortal()?.id === portal.id)}
                      onClick={() => setSelectedPortal(portal)}
                    >
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                        <div>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                            {portal.firstName} {portal.lastName}
                          </div>
                          <div style={{ 'font-size': '0.875rem', opacity: 0.8 }}>
                            {portal.email || portal.phone || 'No contact info'}
                          </div>
                          <Show when={portal.documentCount}>
                            <div style={{ 'font-size': '0.75rem', 'margin-top': '0.5rem', opacity: 0.7 }}>
                              {portal.documentCount} documents
                            </div>
                          </Show>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePortal(portal.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: 0.6,
                            'font-size': '1.25rem'
                          }}
                        >
                          x
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Selected Portal Details */}
            <Show when={selectedPortal()}>
              <div>
                <Card>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                    <h2 style={{ margin: 0 }}>
                      {selectedPortal()!.firstName} {selectedPortal()!.lastName}
                    </h2>
                    <A
                      href={`/accounting/drake-export?client=${selectedPortal()!.id}`}
                      style={{ 'text-decoration': 'none' }}
                    >
                      <Button variant="secondary" size="sm">
                        Open in Drake Export
                      </Button>
                    </A>
                  </div>

                  <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '1rem', 'margin-bottom': '1.5rem' }}>
                    <div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Email</div>
                      <div>{selectedPortal()!.email || '-'}</div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Phone</div>
                      <div>{selectedPortal()!.phone || '-'}</div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>SSN</div>
                      <div>{selectedPortal()!.ssn ? `***-**-${selectedPortal()!.ssn.slice(-4)}` : '-'}</div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Address</div>
                      <div>
                        {selectedPortal()!.address ?
                          `${selectedPortal()!.address}, ${selectedPortal()!.city}, ${selectedPortal()!.state} ${selectedPortal()!.zipCode}`
                          : '-'}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Document Request Manager */}
                <div style={{ 'margin-top': '1.5rem' }}>
                  <TaxPortalRequestManager
                    taxPortal={selectedPortal()!}
                    onRequestCreated={(req) => setRequests([req, ...requests()])}
                  />
                </div>
              </div>
            </Show>

            <Show when={!selectedPortal()}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-md)',
                padding: '3rem',
                color: 'var(--text-muted)'
              }}>
                Select a client to manage document requests
              </div>
            </Show>
          </div>
        </Show>

        {/* Requests Tab */}
        <Show when={activeTab() === 'requests'}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
            <Show when={requests().length === 0}>
              <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No document requests yet. Create one from a client's profile.
              </div>
            </Show>

            <For each={requests()}>
              {(request) => {
                const statusColors: Record<string, string> = {
                  pending: '#f59e0b',
                  partial: '#8b5cf6',
                  complete: '#22c55e',
                  expired: '#ef4444',
                  cancelled: '#6b7280'
                };

                return (
                  <Card>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                      <div>
                        <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                          {request.clientName}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          Tax Year {request.taxYear} - Created {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{
                        background: statusColors[request.status],
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        'border-radius': '9999px',
                        'font-size': '0.75rem',
                        'font-weight': '600',
                        'text-transform': 'uppercase'
                      }}>
                        {request.status}
                      </div>
                    </div>

                    <div style={{ 'margin-top': '1rem' }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'font-size': '0.875rem',
                        'margin-bottom': '0.5rem'
                      }}>
                        <span>Upload Progress</span>
                        <span>
                          {request.requestedDocuments.filter(d => d.uploaded).length} / {request.requestedDocuments.length} documents
                        </span>
                      </div>
                      <div style={{
                        height: '8px',
                        background: 'var(--border-color)',
                        'border-radius': '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(request.requestedDocuments.filter(d => d.uploaded).length / request.requestedDocuments.length) * 100}%`,
                          background: 'var(--primary-color)',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  </Card>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default TaxPortalPage;
