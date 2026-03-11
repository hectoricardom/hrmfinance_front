import { Component, createSignal, For, Show, onMount, createEffect } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { Card, Button } from '../../ui';
import { NotaryCustomer } from '../types';
import { PDFFormTemplate } from '../types/pdfForms';
import { getAllTemplates } from '../config/pdfFormTemplates';
import { fillPDFForm, downloadFilledPDF, previewPDF, fillMultiplePDFForms } from '../services/pdfFormFiller';
import { inventoryApi } from '../../../services/apiAdapter';
import { devLog } from '../../../services/utils';

const PDFFormFiller: Component = () => {
  const location = useLocation();
  const [customers, setCustomers] = createSignal<NotaryCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = createSignal<NotaryCustomer | null>(null);
  const [templates, setTemplates] = createSignal<PDFFormTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = createSignal<Set<string>>(new Set());
  const [loading, setLoading] = createSignal(false);
  const [filling, setFilling] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterCategory, setFilterCategory] = createSignal<string>('all');
  const [result, setResult] = createSignal<string>('');
  const [autoSelectedFromDetail, setAutoSelectedFromDetail] = createSignal(false);

  // Get customerId from URL query parameters
  const getCustomerIdFromURL = (): string | null => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('customerId');
  };

  // Load customers on mount
  onMount(async () => {
    await loadCustomers();
    setTemplates(getAllTemplates());
  });

  // Auto-select customer from navigation state or URL parameter
  createEffect(() => {
    // First priority: Check if customer data was passed through navigation state
    const navState = location.state as any;
    if (navState?.customer && !selectedCustomer()) {
      setSelectedCustomer(navState.customer);
      setAutoSelectedFromDetail(true);
      devLog('Auto-selected customer from NotaryCustomerDetail:', navState.customer);
      return;
    }

    // Second priority: Check URL parameter
    const customerId = getCustomerIdFromURL();
    if (customerId && customers().length > 0 && !selectedCustomer()) {
      const customer = customers().find(c => c.clientNotaryId === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        devLog('Auto-selected customer from URL:', customer);
      } else {
        // If customer not found in list, try to fetch by ID
        fetchCustomerById(customerId);
      }
    }
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getClientNotary('');
      setCustomers(response || []);
    } catch (error) {
      devLog('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerById = async (customerId: string) => {
    try {
      const response = await inventoryApi.getClientNotaryById(customerId);
      if (response) {
        setSelectedCustomer(response);
        // Also add to customers list if not already there
        if (!customers().find(c => c.clientNotaryId === customerId)) {
          setCustomers([response, ...customers()]);
        }
        devLog('Fetched and auto-selected customer:', response);
      }
    } catch (error) {
      devLog('Error fetching customer by ID:', error);
    }
  };

  const filteredCustomers = () => {
    const query = searchQuery().toLowerCase();
    if (!query) return customers();

    return customers().filter(customer =>
      customer.firstName?.toLowerCase().includes(query) ||
      customer.lastName?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.clientNotaryId?.toLowerCase().includes(query)
    );
  };

  const filteredTemplates = () => {
    const category = filterCategory();
    if (category === 'all') return templates();
    return templates().filter(t => t.category === category);
  };

  const toggleTemplate = (templateId: string) => {
    const current = new Set(selectedTemplates());
    if (current.has(templateId)) {
      current.delete(templateId);
    } else {
      current.add(templateId);
    }
    setSelectedTemplates(current);
  };

  const handleFillAndDownload = async () => {
    const customer = selectedCustomer();
    const templateIds = Array.from(selectedTemplates());

    if (!customer) {
      alert('Please select a customer');
      return;
    }

    if (templateIds.length === 0) {
      alert('Please select at least one PDF template');
      return;
    }

    setFilling(true);
    setResult('');

    try {
      const results = await fillMultiplePDFForms(templateIds, customer, {
        flatten: true,
        includeImages: true,
        includeDebugInfo: true
      });

      let successCount = 0;
      let failCount = 0;
      let resultMessage = '';

      for (const [templateId, result] of Object.entries(results)) {
        const template = templates().find(t => t.id === templateId);
        const templateName = template?.name || templateId;

        if (result.success && result.pdfBlob) {
          successCount++;
          downloadFilledPDF(result.pdfBlob, customer, templateName);
          resultMessage += `✓ ${templateName}: ${result.filledFields?.length || 0} fields filled\n`;
        } else {
          failCount++;
          resultMessage += `✗ ${templateName}: ${result.error || 'Unknown error'}\n`;
        }
      }

      setResult(`
Successfully filled ${successCount} form(s), ${failCount} failed.

${resultMessage}
      `.trim());

    } catch (error) {
      devLog('Error filling PDFs:', error);
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFilling(false);
    }
  };

  const handlePreview = async () => {
    const customer = selectedCustomer();
    const templateIds = Array.from(selectedTemplates());

    if (!customer || templateIds.length === 0) {
      alert('Please select a customer and at least one template');
      return;
    }

    setFilling(true);

    try {
      // Preview first selected template
      const firstTemplateId = templateIds[0];
      const result = await fillPDFForm({
        templateId: firstTemplateId,
        customer,
        options: {
          flatten: false, // Don't flatten for preview
          includeImages: true,
          includeDebugInfo: true
        }
      });

      if (result.success && result.pdfBlob) {
        previewPDF(result.pdfBlob);
      } else {
        alert(`Preview failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      devLog('Error previewing PDF:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFilling(false);
    }
  };

  const cardStyle = {
    padding: '2rem',
    'margin-bottom': '2rem'
  };

  const sectionHeaderStyle = {
    'font-size': '1.25rem',
    'font-weight': '700',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'font-size': '1rem',
    'margin-bottom': '1rem'
  };

  return (
    <div style={{ 'max-width': '1400px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{
        'font-size': '2rem',
        'font-weight': '700',
        'margin-bottom': '1rem',
        color: 'var(--text-primary)'
      }}>
        📄 PDF Form Filler
      </h1>
      <Show when={autoSelectedFromDetail()}>
        <div style={{
          'margin-bottom': '1rem',
          padding: '0.75rem',
          background: 'var(--info-light)',
          'border-radius': 'var(--border-radius)',
          border: '1px solid var(--info-color)',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          <span style={{ 'font-size': '1.25rem' }}>✨</span>
          <div>
            <strong>Cliente cargado automáticamente:</strong> {selectedCustomer()?.firstName} {selectedCustomer()?.lastName}
            <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
              Todos los formularios se llenarán con los datos de este cliente
            </div>
          </div>
        </div>
      </Show>
      <p style={{ 'margin-bottom': '2rem', color: 'var(--text-muted)' }}>
        Fill immigration and legal forms with customer data
      </p>

      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '2rem' }}>
        {/* Customer Selection */}
        <Card>
          <div style={cardStyle}>
            <h2 style={sectionHeaderStyle}>1. Select Customer</h2>

            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              style={inputStyle}
            />

            <Show when={loading()}>
              <div style={{ 'text-align': 'center', padding: '2rem' }}>
                Loading customers...
              </div>
            </Show>

            <Show when={!loading()}>
              <div style={{
                'max-height': '400px',
                'overflow-y': 'auto',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius)'
              }}>
                <For each={filteredCustomers()}>
                  {(customer) => (
                    <div
                      onClick={() => setSelectedCustomer(customer)}
                      style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        'border-bottom': '1px solid var(--border-color)',
                        background: selectedCustomer()?.clientNotaryId === customer.clientNotaryId
                          ? 'var(--primary-light)'
                          : 'white',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ 'font-weight': '600' }}>
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                        {customer.email || 'No email'} • ID: {customer.clientNotaryId}
                      </div>
                    </div>
                  )}
                </For>

                <Show when={filteredCustomers().length === 0}>
                  <div style={{
                    padding: '2rem',
                    'text-align': 'center',
                    color: 'var(--text-muted)'
                  }}>
                    No customers found
                  </div>
                </Show>
              </div>
            </Show>

            <Show when={selectedCustomer()}>
              <div style={{
                'margin-top': '1rem',
                padding: '1rem',
                background: autoSelectedFromDetail() ? 'var(--info-light)' : 'var(--success-light)',
                'border-radius': 'var(--border-radius)',
                border: `1px solid ${autoSelectedFromDetail() ? 'var(--info-color)' : 'var(--success-color)'}`
              }}>
                <Show when={autoSelectedFromDetail()}>
                  <div style={{ 'margin-bottom': '0.5rem', 'font-size': '0.875rem', color: 'var(--info-color)' }}>
                    📋 Datos cargados desde detalle del cliente
                  </div>
                </Show>
                ✓ Selected: <strong>
                  {selectedCustomer()?.firstName} {selectedCustomer()?.lastName}
                </strong>
                <Show when={autoSelectedFromDetail()}>
                  <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Cliente: {selectedCustomer()?.clientNotaryId} • {selectedCustomer()?.email || 'Sin email'}
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </Card>

        {/* Template Selection */}
        <Card>
          <div style={cardStyle}>
            <h2 style={sectionHeaderStyle}>2. Select PDF Templates</h2>

            <select
              value={filterCategory()}
              onChange={(e) => setFilterCategory(e.currentTarget.value)}
              style={inputStyle}
            >
              <option value="all">All Categories</option>
              <option value="immigration">Immigration</option>
              <option value="passport">Passport</option>
              <option value="visa">Visa</option>
              <option value="work_permit">Work Permit</option>
              <option value="general">General</option>
              <option value="other">Other</option>
            </select>

            <div style={{
              'max-height': '400px',
              'overflow-y': 'auto',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius)'
            }}>
              <For each={filteredTemplates()}>
                {(template) => (
                  <div
                    style={{
                      padding: '1rem',
                      'border-bottom': '1px solid var(--border-color)'
                    }}
                  >
                    <label style={{
                      display: 'flex',
                      'align-items': 'flex-start',
                      cursor: 'pointer',
                      gap: '0.75rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedTemplates().has(template.id)}
                        onChange={() => toggleTemplate(template.id)}
                        style={{ 'margin-top': '0.25rem' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ 'font-weight': '600' }}>{template.name}</div>
                        <div style={{
                          'font-size': '0.875rem',
                          color: 'var(--text-muted)',
                          'margin-top': '0.25rem'
                        }}>
                          {template.description}
                        </div>
                        <div style={{
                          'font-size': '0.75rem',
                          'margin-top': '0.5rem'
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: 'var(--gray-100)',
                            'border-radius': '4px'
                          }}>
                            {template.category}
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </For>
            </div>

            <Show when={selectedTemplates().size > 0}>
              <div style={{
                'margin-top': '1rem',
                padding: '1rem',
                background: 'var(--info-light)',
                'border-radius': 'var(--border-radius)',
                border: '1px solid var(--info-color)'
              }}>
                ✓ Selected: <strong>{selectedTemplates().size}</strong> template(s)
              </div>
            </Show>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <div style={cardStyle}>
          <h2 style={sectionHeaderStyle}>3. Fill & Download Forms</h2>

          <div style={{
            display: 'flex',
            gap: '1rem',
            'margin-bottom': '1rem'
          }}>
            <Button
              variant="primary"
              onClick={handleFillAndDownload}
              disabled={filling() || !selectedCustomer() || selectedTemplates().size === 0}
              style={{ flex: 1 }}
            >
              {filling() ? '⏳ Processing...' : '📥 Fill & Download All'}
            </Button>

            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={filling() || !selectedCustomer() || selectedTemplates().size === 0}
            >
              👁️ Preview First
            </Button>
          </div>

          <Show when={result()}>
            <div style={{
              padding: '1rem',
              background: result().includes('✗') ? 'var(--danger-light)' : 'var(--success-light)',
              'border-radius': 'var(--border-radius)',
              border: `1px solid ${result().includes('✗') ? 'var(--danger-color)' : 'var(--success-color)'}`,
              'white-space': 'pre-wrap',
              'font-family': 'monospace',
              'font-size': '0.875rem'
            }}>
              {result()}
            </div>
          </Show>

          <div style={{
            'margin-top': '1rem',
            padding: '1rem',
            background: 'var(--gray-50)',
            'border-radius': 'var(--border-radius)',
            'font-size': '0.875rem',
            color: 'var(--text-muted)'
          }}>
            <strong>Note:</strong> PDF forms will be filled with customer data and downloaded automatically.
            Make sure your browser allows downloads from this site.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PDFFormFiller;
