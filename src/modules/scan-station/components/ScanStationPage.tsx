/**
 * ScanStationPage Component
 * Main scan page with client selector, scan mode tabs (Single, Batch, ID),
 * integration with BatchScanCapture and ScanResultsView, and navigation
 * to client workspace after scanning.
 */

import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card } from '../../ui';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';
import { getTaxPortals } from '../../drake-export/services/taxPortalApi';
import { uploadTaxDocument } from '../../drake-export/services/taxDocumentApi';
import { MLIDScanner, MLPassportScanner } from '../../scanner';
import type { ScanResult as DeviceScanResult } from '../../scanner';
import type { TaxPortal, DrakeTaxDocumentType } from '../../drake-export/types/drakeTypes';
import type { ScanBatchItem, ScanMode, ClientMatchSuggestion, IDScanResult } from '../types/scanTypes';
import { scanProcessingService, fileToDataUrl } from '../services/scanProcessingService';
import { idScanService } from '../services/idScanService';
import BatchScanCapture from './BatchScanCapture';
import ScanResultsView from './ScanResultsView';
import DocumentMatchSuggestions from './DocumentMatchSuggestions';

const ScanStationPage: Component = () => {
  const navigate = useNavigate();

  // ============================================
  // State
  // ============================================

  // Client selection
  const [clients, setClients] = createSignal<TaxPortal[]>([]);
  const [selectedClient, setSelectedClient] = createSignal<TaxPortal | null>(null);
  const [clientSearch, setClientSearch] = createSignal('');
  const [showClientDropdown, setShowClientDropdown] = createSignal(false);
  const [noClientMode, setNoClientMode] = createSignal(false);

  // Scan mode
  const [scanMode, setScanMode] = createSignal<ScanMode>('batch');
  const [taxYear, setTaxYear] = createSignal<number>(2025);

  // Processing
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [batchItems, setBatchItems] = createSignal<ScanBatchItem[]>([]);

  // ID Scan
  const [idScanResult, setIdScanResult] = createSignal<IDScanResult | null>(null);
  const [showIDScanner, setShowIDScanner] = createSignal(false);
  const [idScanType, setIdScanType] = createSignal<'id' | 'passport'>('id');

  // Unmatched documents
  const [unmatchedItems, setUnmatchedItems] = createSignal<ScanBatchItem[]>([]);
  const [matchSuggestions, setMatchSuggestions] = createSignal<Record<string, ClientMatchSuggestion[]>>({});
  const [clientSearchResults, setClientSearchResults] = createSignal<TaxPortal[]>([]);
  const [isSearchingClients, setIsSearchingClients] = createSignal(false);

  // ============================================
  // Load Clients
  // ============================================

  const loadClients = async (search?: string) => {
    try {
      const results = await getTaxPortals(search);
      setClients(results);
    } catch (error) {
      devLog('[ScanStation] Error loading clients:', error);
    }
  };

  // Load clients on mount
  createEffect(() => {
    loadClients();
  });

  // Filter clients based on search
  const filteredClients = () => {
    const query = clientSearch().toLowerCase().trim();
    if (!query) return clients().slice(0, 20);
    return clients().filter((c) => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const ssn = (c.ssn || '').replace(/\D/g, '');
      return fullName.includes(query) || ssn.includes(query.replace(/\D/g, ''));
    }).slice(0, 20);
  };

  // ============================================
  // Client Selection
  // ============================================

  const handleSelectClient = (client: TaxPortal) => {
    setSelectedClient(client);
    setNoClientMode(false);
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
  };

  const handleNoClientMode = () => {
    setSelectedClient(null);
    setNoClientMode(true);
    setShowClientDropdown(false);
    setClientSearch('');
  };

  // ============================================
  // Batch Processing
  // ============================================

  const handleFilesReady = async (files: File[]) => {
    setIsProcessing(true);

    // Create initial batch items
    const items: ScanBatchItem[] = [];
    for (const file of files) {
      const previewUrl = await fileToDataUrl(file);
      items.push({
        id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        previewUrl,
        status: 'pending',
        progress: 0,
        accepted: false,
        rejected: false,
        isDuplicate: false,
        assignedClientId: selectedClient()?.id,
        assignedClientName: selectedClient() ? `${selectedClient()!.firstName} ${selectedClient()!.lastName}` : undefined,
      });
    }
    setBatchItems(items);

    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // Update status
        setBatchItems((prev) => prev.map((p) =>
          p.id === item.id ? { ...p, status: 'classifying' as const, progress: 20 } : p
        ));

        const result = await scanProcessingService.processScannedDocument(
          item.file,
          selectedClient()?.id,
          taxYear(),
          (status, progress) => {
            setBatchItems((prev) => prev.map((p) =>
              p.id === item.id ? { ...p, status: status as ScanBatchItem['status'], progress } : p
            ));
          }
        );

        // Check for duplicates
        let isDuplicate = false;
        if (selectedClient()?.id && result.classification) {
          const dupCheck = await scanProcessingService.checkForDuplicate(
            selectedClient()!.id,
            result.classification.documentType,
            result.extractedAmounts || {},
            result.payerInfo || {},
            taxYear()
          );
          isDuplicate = dupCheck.isDuplicate;
        }

        setBatchItems((prev) => prev.map((p) =>
          p.id === item.id ? {
            ...p,
            status: 'complete' as const,
            progress: 100,
            result,
            isDuplicate,
          } : p
        ));

        // For no-client mode, try to match document to clients
        if (noClientMode() && (result.detectedRecipientName || result.detectedRecipientSSN)) {
          const suggestions = await scanProcessingService.matchDocumentToClients(
            result.detectedRecipientName,
            result.detectedRecipientSSN
          );
          setMatchSuggestions((prev) => ({ ...prev, [item.id]: suggestions }));
          setUnmatchedItems((prev) => [...prev, { ...item, status: 'complete', progress: 100, result }]);
        }
      } catch (error: any) {
        devLog('[ScanStation] Error processing item:', error);
        setBatchItems((prev) => prev.map((p) =>
          p.id === item.id ? {
            ...p,
            status: 'error' as const,
            progress: 0,
            errorMessage: error.message || 'Processing failed',
          } : p
        ));
      }
    }

    setIsProcessing(false);
  };

  // ============================================
  // Accept / Reject Handlers
  // ============================================

  const handleAccept = async (itemId: string) => {
    const item = batchItems().find((i) => i.id === itemId);
    if (!item?.result || !item.result.file) return;

    const clientId = item.assignedClientId || selectedClient()?.id;
    if (!clientId) {
      // Move to unmatched
      setUnmatchedItems((prev) => [...prev, item]);
      return;
    }

    // Upload the document
    try {
      setBatchItems((prev) => prev.map((p) =>
        p.id === itemId ? { ...p, status: 'uploading' as const, progress: 50 } : p
      ));

      const docType = item.correctedDocumentType || item.result.classification?.documentType || 'other';

      await uploadTaxDocument(
        item.result.file,
        clientId,
        taxYear(),
        { documentType: docType }
      );

      setBatchItems((prev) => prev.map((p) =>
        p.id === itemId ? { ...p, accepted: true, status: 'complete' as const, progress: 100 } : p
      ));
    } catch (error: any) {
      devLog('[ScanStation] Error uploading document:', error);
      setBatchItems((prev) => prev.map((p) =>
        p.id === itemId ? { ...p, errorMessage: `Upload failed: ${error.message}`, status: 'error' as const } : p
      ));
    }
  };

  const handleReject = (itemId: string) => {
    setBatchItems((prev) => prev.map((p) =>
      p.id === itemId ? { ...p, rejected: true } : p
    ));
  };

  const handleAcceptAll = () => {
    const pendingItems = batchItems().filter((i) => i.status === 'complete' && !i.accepted && !i.rejected);
    pendingItems.forEach((item) => handleAccept(item.id));
  };

  const handleCorrectType = (itemId: string, newType: DrakeTaxDocumentType) => {
    setBatchItems((prev) => prev.map((p) =>
      p.id === itemId ? { ...p, correctedDocumentType: newType } : p
    ));
  };

  const handleCorrectField = (itemId: string, fieldName: string, newValue: string | number) => {
    setBatchItems((prev) => prev.map((p) => {
      if (p.id !== itemId || !p.result?.fields) return p;
      const updatedFields = p.result.fields.map((f) =>
        f.fieldName === fieldName ? { ...f, value: newValue, corrected: true, originalValue: f.originalValue ?? f.value } : f
      );
      return { ...p, result: { ...p.result, fields: updatedFields } };
    }));
  };

  // ============================================
  // Unmatched Document Handlers
  // ============================================

  const handleAssignToClient = (itemId: string, client: TaxPortal) => {
    setBatchItems((prev) => prev.map((p) =>
      p.id === itemId ? {
        ...p,
        assignedClientId: client.id,
        assignedClientName: `${client.firstName} ${client.lastName}`,
      } : p
    ));
    setUnmatchedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleCreateClient = (itemId: string) => {
    const item = batchItems().find((i) => i.id === itemId);
    if (item?.result?.detectedRecipientName) {
      // Navigate to client creation page or show modal
      // For now, navigate to client list page
      navigate('/tax-clients');
    }
  };

  const handleSearchClients = async (query: string) => {
    setIsSearchingClients(true);
    try {
      const results = await getTaxPortals(query);
      setClientSearchResults(results.slice(0, 10));
    } catch (error) {
      devLog('[ScanStation] Client search error:', error);
    }
    setIsSearchingClients(false);
  };

  // ============================================
  // ID Scan Handlers
  // ============================================

  const handleIDScanResult = (result: DeviceScanResult) => {
    devLog('[ScanStation] ID scan result:', result);
    let extractedData: IDScanResult;

    if (idScanType() === 'passport') {
      extractedData = idScanService.extractPassportData(result);
    } else {
      extractedData = idScanService.extractIDData(result);
    }

    setIdScanResult(extractedData);
    setShowIDScanner(false);

    // If we have a selected client, offer to update their info
    if (selectedClient() && extractedData.isValid) {
      const updates = idScanService.buildTaxPortalFromIDScan(extractedData);
      devLog('[ScanStation] TaxPortal updates from ID scan:', updates);
    }
  };

  const handleApplyIDData = () => {
    const result = idScanResult();
    if (!result) return;

    const updates = idScanService.buildTaxPortalFromIDScan(result);
    devLog('[ScanStation] Applying ID data to client:', updates);
    // The parent can use updateTaxPortal to save these changes
    // For now, navigate to workspace with this data
    if (selectedClient()) {
      navigate(`/tax-clients/${selectedClient()!.id}`);
    }
  };

  // ============================================
  // Navigation
  // ============================================

  const goToClientWorkspace = () => {
    if (selectedClient()) {
      navigate(`/tax-clients/${selectedClient()!.id}`);
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={{
      'max-width': '1100px',
      margin: '0 auto',
      padding: '16px',
    }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '12px',
        'margin-bottom': '24px',
        'flex-wrap': 'wrap',
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#1a73e8" style={{ width: '28px', height: '28px' }}>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div style={{ flex: 1 }}>
          <h1 style={{ 'font-size': '22px', 'font-weight': '700', color: '#1f2937', margin: 0 }}>
            Scan Station
          </h1>
          <p style={{ 'font-size': '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
            Scan, classify, and upload tax documents
          </p>
        </div>

        <Show when={selectedClient()}>
          <button
            onClick={goToClientWorkspace}
            style={{
              padding: '8px 16px',
              'border-radius': '8px',
              border: 'none',
              background: '#1a73e8',
              color: 'white',
              'font-size': '13px',
              'font-weight': '600',
              cursor: 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '6px',
            }}
          >
            Go to Workspace
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </Show>
      </div>

      {/* Client Selection Card */}
      <Card>
        <div style={{ padding: '16px' }}>
          <div style={{
            display: 'flex',
            'align-items': 'center',
            gap: '12px',
            'margin-bottom': '12px',
            'flex-wrap': 'wrap',
          }}>
            <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#374151' }}>
              Client
            </div>

            {/* Tax Year Selector */}
            <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'margin-left': 'auto' }}>
              <label style={{ 'font-size': '13px', color: '#6b7280' }}>Tax Year:</label>
              <select
                value={taxYear()}
                onChange={(e) => setTaxYear(parseInt(e.currentTarget.value))}
                style={{
                  padding: '6px 10px',
                  'border-radius': '6px',
                  border: '1px solid #d1d5db',
                  'font-size': '13px',
                  background: 'white',
                }}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>
          </div>

          <Show when={!selectedClient() && !noClientMode()} fallback={
            <Show when={selectedClient()} fallback={
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '8px',
                padding: '10px 14px',
                'border-radius': '8px',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" style={{ width: '18px', height: '18px' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span style={{ 'font-size': '13px', color: '#92400e', flex: 1 }}>
                  No client selected - documents will need to be matched after scanning
                </span>
                <button
                  onClick={() => setNoClientMode(false)}
                  style={{
                    padding: '4px 10px',
                    'border-radius': '4px',
                    border: '1px solid #d97706',
                    background: 'transparent',
                    color: '#d97706',
                    'font-size': '12px',
                    cursor: 'pointer',
                  }}
                >
                  Select Client
                </button>
              </div>
            }>
              {/* Selected Client Display */}
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '10px',
                padding: '10px 14px',
                'border-radius': '8px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  'border-radius': '50%',
                  background: '#22c55e',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  color: 'white',
                  'font-weight': '700',
                  'font-size': '14px',
                  'flex-shrink': 0,
                }}>
                  {(selectedClient()!.firstName?.[0] || '').toUpperCase()}{(selectedClient()!.lastName?.[0] || '').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#374151' }}>
                    {selectedClient()!.firstName} {selectedClient()!.lastName}
                  </div>
                  <div style={{ 'font-size': '12px', color: '#6b7280' }}>
                    {selectedClient()!.ssn ? `SSN: ***-**-${selectedClient()!.ssn!.replace(/\D/g, '').slice(-4)}` : 'No SSN'}
                    {selectedClient()!.email && ` | ${selectedClient()!.email}`}
                  </div>
                </div>
                <button
                  onClick={handleClearClient}
                  style={{
                    padding: '6px 12px',
                    'border-radius': '6px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: '#6b7280',
                    'font-size': '12px',
                    cursor: 'pointer',
                  }}
                >
                  Change
                </button>
              </div>
            </Show>
          }>
            {/* Client Search */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      'pointer-events': 'none',
                    }}
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={clientSearch()}
                    onInput={(e) => {
                      setClientSearch(e.currentTarget.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search client by name or SSN..."
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 34px',
                      'border-radius': '8px',
                      border: '1px solid #d1d5db',
                      'font-size': '13px',
                      outline: 'none',
                      'box-sizing': 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={handleNoClientMode}
                  style={{
                    padding: '10px 14px',
                    'border-radius': '8px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: '#6b7280',
                    'font-size': '13px',
                    'white-space': 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  No Client
                </button>
              </div>

              {/* Dropdown */}
              <Show when={showClientDropdown() && filteredClients().length > 0}>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  'margin-top': '4px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  'border-radius': '8px',
                  'box-shadow': '0 4px 12px rgba(0,0,0,0.1)',
                  'max-height': '240px',
                  'overflow-y': 'auto',
                  'z-index': 50,
                }}>
                  <For each={filteredClients()}>
                    {(client) => (
                      <div
                        onClick={() => handleSelectClient(client)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          'border-bottom': '1px solid #f3f4f6',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '8px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          'border-radius': '50%',
                          background: '#e5e7eb',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          'font-size': '11px',
                          'font-weight': '600',
                          color: '#374151',
                          'flex-shrink': 0,
                        }}>
                          {(client.firstName?.[0] || '').toUpperCase()}{(client.lastName?.[0] || '').toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 'font-size': '13px', 'font-weight': '500', color: '#374151' }}>
                            {client.firstName} {client.lastName}
                          </div>
                          <div style={{ 'font-size': '11px', color: '#9ca3af' }}>
                            {client.ssn ? `***-**-${client.ssn.replace(/\D/g, '').slice(-4)}` : ''}
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </Card>

      {/* Scan Mode Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        'margin-top': '16px',
        'margin-bottom': '16px',
        background: '#f3f4f6',
        'border-radius': '10px',
        padding: '3px',
      }}>
        {(['batch', 'single', 'id'] as ScanMode[]).map((mode) => (
          <button
            onClick={() => setScanMode(mode)}
            style={{
              flex: 1,
              padding: '10px 16px',
              'border-radius': '8px',
              border: 'none',
              background: scanMode() === mode ? 'white' : 'transparent',
              color: scanMode() === mode ? '#1a73e8' : '#6b7280',
              'font-size': '13px',
              'font-weight': scanMode() === mode ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              'box-shadow': scanMode() === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {mode === 'batch' ? 'Batch Scan' : mode === 'single' ? 'Single Document' : 'ID / Passport'}
          </button>
        ))}
      </div>

      {/* Batch Scan Mode */}
      <Show when={scanMode() === 'batch' || scanMode() === 'single'}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#374151', 'margin-bottom': '12px' }}>
              {scanMode() === 'batch' ? 'Upload Multiple Documents' : 'Upload Single Document'}
            </div>
            <BatchScanCapture
              onFilesReady={handleFilesReady}
              isProcessing={isProcessing()}
              maxFiles={scanMode() === 'single' ? 1 : 50}
              allowCamera={true}
              accept="image/*,application/pdf"
            />
          </div>
        </Card>

        {/* Results */}
        <Show when={batchItems().length > 0}>
          <div style={{ 'margin-top': '16px' }}>
            <Card>
              <div style={{ padding: '16px' }}>
                <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#374151', 'margin-bottom': '12px' }}>
                  Processing Results
                </div>
                <ScanResultsView
                  items={batchItems()}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onAcceptAll={handleAcceptAll}
                  onCorrectType={handleCorrectType}
                  onCorrectField={handleCorrectField}
                  isProcessing={isProcessing()}
                />
              </div>
            </Card>
          </div>
        </Show>

        {/* Unmatched Documents */}
        <Show when={noClientMode() && unmatchedItems().length > 0}>
          <div style={{ 'margin-top': '16px' }}>
            <DocumentMatchSuggestions
              items={unmatchedItems()}
              suggestions={matchSuggestions()}
              onAssign={handleAssignToClient}
              onCreateClient={handleCreateClient}
              onSearchClient={handleSearchClients}
              searchResults={clientSearchResults()}
              isSearching={isSearchingClients()}
            />
          </div>
        </Show>
      </Show>

      {/* ID / Passport Scan Mode */}
      <Show when={scanMode() === 'id'}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#374151', 'margin-bottom': '12px' }}>
              Scan ID or Passport
            </div>

            {/* ID Type Toggle */}
            <div style={{
              display: 'flex',
              gap: '2px',
              'margin-bottom': '16px',
              background: '#f3f4f6',
              'border-radius': '8px',
              padding: '3px',
              'max-width': '300px',
            }}>
              <button
                onClick={() => setIdScanType('id')}
                style={{
                  flex: 1,
                  padding: '8px',
                  'border-radius': '6px',
                  border: 'none',
                  background: idScanType() === 'id' ? 'white' : 'transparent',
                  color: idScanType() === 'id' ? '#1a73e8' : '#6b7280',
                  'font-size': '13px',
                  'font-weight': '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Driver's License
              </button>
              <button
                onClick={() => setIdScanType('passport')}
                style={{
                  flex: 1,
                  padding: '8px',
                  'border-radius': '6px',
                  border: 'none',
                  background: idScanType() === 'passport' ? 'white' : 'transparent',
                  color: idScanType() === 'passport' ? '#1a73e8' : '#6b7280',
                  'font-size': '13px',
                  'font-weight': '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Passport
              </button>
            </div>

            <Show when={!showIDScanner()} fallback={
              <div style={{ 'max-width': '600px', margin: '0 auto' }}>
                <Show when={idScanType() === 'id'} fallback={
                  <MLPassportScanner
                    onScan={(result: any) => handleIDScanResult(result)}
                    onError={(err: any) => devLog('[ScanStation] ID scan error:', err)}
                    autoStart={true}
                    showDebug={false}
                  />
                }>
                  <MLIDScanner
                    onScan={(result: any) => handleIDScanResult(result)}
                    onError={(err: any) => devLog('[ScanStation] ID scan error:', err)}
                    autoStart={true}
                    showDebug={false}
                  />
                </Show>
                <div style={{ 'text-align': 'center', 'margin-top': '12px' }}>
                  <button
                    onClick={() => setShowIDScanner(false)}
                    style={{
                      padding: '8px 16px',
                      'border-radius': '6px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      color: '#6b7280',
                      'font-size': '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            }>
              <div style={{
                'text-align': 'center',
                padding: '32px',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" style={{ width: '48px', height: '48px', margin: '0 auto 12px' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
                <div style={{ 'font-size': '14px', color: '#6b7280', 'margin-bottom': '16px' }}>
                  {idScanType() === 'id'
                    ? 'Scan the barcode on the back of a driver\'s license or state ID'
                    : 'Scan the MRZ (machine readable zone) on a passport'
                  }
                </div>
                <button
                  onClick={() => setShowIDScanner(true)}
                  style={{
                    padding: '12px 24px',
                    'border-radius': '8px',
                    border: 'none',
                    background: '#1a73e8',
                    color: 'white',
                    'font-size': '14px',
                    'font-weight': '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    'align-items': 'center',
                    gap: '8px',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Start Scanning
                </button>
              </div>
            </Show>

            {/* ID Scan Results */}
            <Show when={idScanResult()}>
              <div style={{
                'margin-top': '16px',
                padding: '16px',
                'border-radius': '8px',
                background: idScanResult()!.isValid ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${idScanResult()!.isValid ? '#86efac' : '#fecaca'}`,
              }}>
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '8px',
                  'margin-bottom': '12px',
                }}>
                  <Show when={idScanResult()!.isValid} fallback={
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" style={{ width: '20px', height: '20px' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" style={{ width: '20px', height: '20px' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Show>
                  <span style={{
                    'font-size': '14px',
                    'font-weight': '600',
                    color: idScanResult()!.isValid ? '#22c55e' : '#ef4444',
                  }}>
                    {idScanResult()!.isValid ? 'ID Scanned Successfully' : 'Scan Incomplete'}
                  </span>
                  <span style={{
                    'font-size': '12px',
                    color: '#6b7280',
                    'margin-left': 'auto',
                  }}>
                    Confidence: {Math.round(idScanResult()!.confidence * 100)}%
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '8px',
                }}>
                  <Show when={idScanResult()!.firstName}>
                    <IDField label="First Name" value={idScanResult()!.firstName!} />
                  </Show>
                  <Show when={idScanResult()!.middleName}>
                    <IDField label="Middle Name" value={idScanResult()!.middleName!} />
                  </Show>
                  <Show when={idScanResult()!.lastName}>
                    <IDField label="Last Name" value={idScanResult()!.lastName!} />
                  </Show>
                  <Show when={idScanResult()!.dateOfBirth}>
                    <IDField label="Date of Birth" value={idScanResult()!.dateOfBirth!} />
                  </Show>
                  <Show when={idScanResult()!.documentNumber}>
                    <IDField label="ID Number" value={idScanResult()!.documentNumber!} />
                  </Show>
                  <Show when={idScanResult()!.issuingState}>
                    <IDField label="State" value={idScanResult()!.issuingState!} />
                  </Show>
                  <Show when={idScanResult()!.address}>
                    <IDField label="Address" value={idScanResult()!.address!} />
                  </Show>
                  <Show when={idScanResult()!.city}>
                    <IDField label="City" value={idScanResult()!.city!} />
                  </Show>
                  <Show when={idScanResult()!.zipCode}>
                    <IDField label="Zip Code" value={idScanResult()!.zipCode!} />
                  </Show>
                  <Show when={idScanResult()!.expirationDate}>
                    <IDField label="Expiration" value={idScanResult()!.expirationDate!} />
                  </Show>
                </div>

                {/* Validation warnings */}
                {(() => {
                  const validation = idScanService.validateIDData(idScanResult()!);
                  return (
                    <Show when={validation.warnings.length > 0 || validation.errors.length > 0}>
                      <div style={{ 'margin-top': '12px' }}>
                        <For each={validation.errors}>
                          {(error) => (
                            <div style={{ 'font-size': '12px', color: '#ef4444', 'margin-bottom': '2px' }}>
                              {error}
                            </div>
                          )}
                        </For>
                        <For each={validation.warnings}>
                          {(warning) => (
                            <div style={{ 'font-size': '12px', color: '#f59e0b', 'margin-bottom': '2px' }}>
                              {warning}
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  );
                })()}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  'margin-top': '16px',
                  'justify-content': 'flex-end',
                }}>
                  <button
                    onClick={() => {
                      setIdScanResult(null);
                      setShowIDScanner(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      'border-radius': '6px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      color: '#374151',
                      'font-size': '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Scan Again
                  </button>
                  <Show when={selectedClient() && idScanResult()!.isValid}>
                    <button
                      onClick={handleApplyIDData}
                      style={{
                        padding: '8px 16px',
                        'border-radius': '6px',
                        border: 'none',
                        background: '#22c55e',
                        color: 'white',
                        'font-size': '13px',
                        'font-weight': '600',
                        cursor: 'pointer',
                      }}
                    >
                      Apply to Client Profile
                    </button>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Click-away handler for dropdown */}
      <Show when={showClientDropdown()}>
        <div
          onClick={() => setShowClientDropdown(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            'z-index': 40,
          }}
        />
      </Show>
    </div>
  );
};

// ============================================
// IDField Sub-Component
// ============================================

interface IDFieldProps {
  label: string;
  value: string;
}

const IDField: Component<IDFieldProps> = (props) => (
  <div style={{
    padding: '6px 8px',
    'border-radius': '4px',
    background: 'rgba(255, 255, 255, 0.7)',
  }}>
    <div style={{ 'font-size': '11px', color: '#6b7280' }}>{props.label}</div>
    <div style={{ 'font-size': '13px', 'font-weight': '500', color: '#374151' }}>{props.value}</div>
  </div>
);

export default ScanStationPage;
