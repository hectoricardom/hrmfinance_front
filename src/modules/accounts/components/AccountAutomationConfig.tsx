import { Component, createSignal, For, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { accountAutomationStore } from '../stores/accountAutomationStore';
import { automationService } from '../services/automationService';
import { AutomationRule, AccountMapping, TransactionType } from '../types/automationTypes';
import RuleEditForm from './RuleEditForm';
import MappingEditForm from './MappingEditForm';
import GenerateRuleModal from './GenerateRuleModal';

interface AccountAutomationConfigProps {
  onClose?: () => void;
}

const AccountAutomationConfig: Component<AccountAutomationConfigProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'overview' | 'rules' | 'mappings' | 'audit'>('overview');
  const [editingRule, setEditingRule] = createSignal<AutomationRule | null>(null);
  const [editingMapping, setEditingMapping] = createSignal<AccountMapping | null>(null);
  const [showGenerateModal, setShowGenerateModal] = createSignal(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleToggleAutomation = () => {
    accountAutomationStore.toggleAutomation(!accountAutomationStore.isEnabled);
  };

  const handleToggleRule = (ruleId: string, isActive: boolean) => {
    accountAutomationStore.toggleAutomationRule(ruleId, isActive);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this automation rule?')) {
      accountAutomationStore.removeAutomationRule(ruleId);
    }
  };

  const handleDeleteMapping = (mappingId: string) => {
    if (confirm('Are you sure you want to delete this account mapping?')) {
      accountAutomationStore.removeAccountMapping(mappingId);
    }
  };

  const handleSaveRule = (rule: AutomationRule) => {
    if (rule.id && accountAutomationStore.automationRules.find(r => r.id === rule.id)) {
      // Update existing rule
      accountAutomationStore.updateAutomationRule(rule.id, rule);
    } else {
      // Add new rule
      accountAutomationStore.addAutomationRule(rule);
    }
    setEditingRule(null);
  };

  const handleSaveMapping = (mapping: AccountMapping) => {
    if (mapping.id && accountAutomationStore.accountMappings.find(m => m.id === mapping.id)) {
      // Update existing mapping
      accountAutomationStore.updateAccountMapping(mapping.id, mapping);
    } else {
      // Add new mapping
      accountAutomationStore.addAccountMapping(mapping);
    }
    setEditingMapping(null);
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
  };

  const handleRuleGenerated = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowGenerateModal(false);
  };

  const auditLog = () => automationService.getAuditLog(50);

  const tabButtonStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-color)',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'all 0.2s'
  });

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-top': '1rem'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    'font-size': '0.875rem'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '2rem'
      }}>
        <h1 style={{ 'font-size': '1.75rem', 'font-weight': 'bold' }}>
          Account Automation Configuration
        </h1>
        <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
          <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={accountAutomationStore.isEnabled}
              onChange={handleToggleAutomation}
            />
            Enable Automation
          </label>
          <Show when={props.onClose}>
            <Button variant="secondary" onClick={props.onClose}>
              Close
            </Button>
          </Show>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '2rem',
        'border-bottom': '1px solid var(--border-color)',
        'padding-bottom': '1rem'
      }}>
        <button
          style={tabButtonStyle(activeTab() === 'overview')}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          style={tabButtonStyle(activeTab() === 'rules')}
          onClick={() => setActiveTab('rules')}
        >
          Automation Rules ({accountAutomationStore.automationRules.length})
        </button>
        <button
          style={tabButtonStyle(activeTab() === 'mappings')}
          onClick={() => setActiveTab('mappings')}
        >
          Account Mappings ({accountAutomationStore.accountMappings.length})
        </button>
        <button
          style={tabButtonStyle(activeTab() === 'audit')}
          onClick={() => setActiveTab('audit')}
        >
          Audit Log
        </button>
      </div>

      {/* Overview Tab */}
      <Show when={activeTab() === 'overview'}>
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <Card title="System Status">
            <div style={{ padding: '1rem' }}>
              <div style={{ 'margin-bottom': '1rem' }}>
                <strong>Automation Status:</strong>{' '}
                <span style={{
                  color: accountAutomationStore.isEnabled ? '#10b981' : '#ef4444',
                  'font-weight': '600'
                }}>
                  {accountAutomationStore.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div style={{ 'margin-bottom': '1rem' }}>
                <strong>Active Rules:</strong> {accountAutomationStore.automationRules.length}
              </div>
              <div style={{ 'margin-bottom': '1rem' }}>
                <strong>Account Mappings:</strong> {accountAutomationStore.accountMappings.length}
              </div>
              <div>
                <strong>Audit Logging:</strong>{' '}
                <span style={{ color: '#10b981', 'font-weight': '600' }}>Enabled</span>
              </div>
            </div>
          </Card>

          <Card title="Default Account Mappings">
            <div style={{ padding: '1rem', 'font-size': '0.875rem' }}>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>Cash Sales:</strong> Cash → Sales Revenue
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>Credit Sales:</strong> A/R → Sales Revenue
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>Services:</strong> Cash → Service Revenue
              </div>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>Transport:</strong> Cash → Transport Revenue
              </div>
              <div>
                <strong>Sales Tax:</strong> Cash → Tax Payable
              </div>
            </div>
          </Card>

          <Card title="Recent Activity">
            <div style={{ padding: '1rem' }}>
              <Show when={auditLog().length > 0} fallback={
                <div style={{ color: 'var(--text-secondary)', 'font-style': 'italic' }}>
                  No recent automation activity
                </div>
              }>
                <For each={auditLog().slice(0, 5)}>
                  {(entry) => (
                    <div style={{
                      'margin-bottom': '0.75rem',
                      'padding-bottom': '0.75rem',
                      'border-bottom': '1px solid var(--border-color)',
                      'font-size': '0.875rem'
                    }}>
                      <div style={{ 'font-weight': '600', color: entry.success ? '#10b981' : '#ef4444' }}>
                        {entry.event} - {entry.success ? 'Success' : 'Failed'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(entry.timestamp)} - {entry.rulesApplied.length} rules applied
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </Card>
        </div>
      </Show>

      {/* Automation Rules Tab */}
      <Show when={activeTab() === 'rules'}>
        <Card title="Automation Rules">
          <div style={{ padding: '1rem' }}>
            <div style={{ 'margin-bottom': '1rem', display: 'flex', 'justify-content': 'space-between' }}>
              <h3>Active Automation Rules</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" onClick={() => setShowGenerateModal(true)}>
                  Generate from Data
                </Button>
                <Button variant="primary" onClick={() => setEditingRule({} as AutomationRule)}>
                  Add New Rule
                </Button>
              </div>
            </div>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Rule Name</th>
                  <th style={thStyle}>Trigger Event</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={accountAutomationStore.automationRules}>
                  {(rule) => (
                    <tr>
                      <td style={tdStyle}>
                        <div>
                          <div style={{ 'font-weight': '600' }}>{rule.name}</div>
                          <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                            {rule.description}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{rule.triggerEvent}</td>
                      <td style={tdStyle}>{rule.priority}</td>
                      <td style={tdStyle}>
                        <span style={{
                          color: rule.isActive ? '#10b981' : '#ef4444',
                          'font-weight': '600'
                        }}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            style={{
                              padding: '0.25rem 0.5rem',
                              'font-size': '0.75rem',
                              border: 'none',
                              'border-radius': '4px',
                              background: rule.isActive ? '#ef4444' : '#10b981',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                          >
                            {rule.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            style={{
                              padding: '0.25rem 0.5rem',
                              'font-size': '0.75rem',
                              border: '1px solid var(--border-color)',
                              'border-radius': '4px',
                              background: 'white',
                              cursor: 'pointer'
                            }}
                            onClick={() => setEditingRule(rule)}
                          >
                            Edit
                          </button>
                          <button
                            style={{
                              padding: '0.25rem 0.5rem',
                              'font-size': '0.75rem',
                              border: 'none',
                              'border-radius': '4px',
                              background: '#ef4444',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            Delete
                          </button>
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

      {/* Account Mappings Tab */}
      <Show when={activeTab() === 'mappings'}>
        <Card title="Account Mappings">
          <div style={{ padding: '1rem' }}>
            <div style={{ 'margin-bottom': '1rem', display: 'flex', 'justify-content': 'space-between' }}>
              <h3>Transaction Account Mappings</h3>
              <Button variant="primary" onClick={() => setEditingMapping({} as AccountMapping)}>
                Add New Mapping
              </Button>
            </div>

            <Show when={accountAutomationStore.accountMappings.length === 0} fallback={
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Mapping Name</th>
                    <th style={thStyle}>Transaction Type</th>
                    <th style={thStyle}>Debit Account</th>
                    <th style={thStyle}>Credit Account</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={accountAutomationStore.accountMappings}>
                    {(mapping) => (
                      <tr>
                        <td style={tdStyle}>
                          <div>
                            <div style={{ 'font-weight': '600' }}>{mapping.name}</div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                              {mapping.description}
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>{mapping.transactionType}</td>
                        <td style={tdStyle}>{mapping.debitAccountId}</td>
                        <td style={tdStyle}>{mapping.creditAccountId}</td>
                        <td style={tdStyle}>
                          <span style={{
                            color: mapping.isActive ? '#10b981' : '#ef4444',
                            'font-weight': '600'
                          }}>
                            {mapping.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              style={{
                                padding: '0.25rem 0.5rem',
                                'font-size': '0.75rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': '4px',
                                background: 'white',
                                cursor: 'pointer'
                              }}
                              onClick={() => setEditingMapping(mapping)}
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                padding: '0.25rem 0.5rem',
                                'font-size': '0.75rem',
                                border: 'none',
                                'border-radius': '4px',
                                background: '#ef4444',
                                color: 'white',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleDeleteMapping(mapping.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            }>
              <div style={{
                'text-align': 'center',
                color: 'var(--text-secondary)',
                'font-style': 'italic',
                padding: '2rem'
              }}>
                No custom account mappings configured. The system uses default mappings.
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Audit Log Tab */}
      <Show when={activeTab() === 'audit'}>
        <Card title="Automation Audit Log">
          <div style={{ padding: '1rem' }}>
            <div style={{ 'margin-bottom': '1rem', display: 'flex', 'justify-content': 'space-between' }}>
              <h3>Recent Automation Activity</h3>
              <Button variant="outline" onClick={() => automationService.clearAuditLog()}>
                Clear Log
              </Button>
            </div>

            <Show when={auditLog().length > 0} fallback={
              <div style={{
                'text-align': 'center',
                color: 'var(--text-secondary)',
                'font-style': 'italic',
                padding: '2rem'
              }}>
                No automation activity recorded yet.
              </div>
            }>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Timestamp</th>
                    <th style={thStyle}>Event</th>
                    <th style={thStyle}>Rules Applied</th>
                    <th style={thStyle}>Entries Created</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={auditLog()}>
                    {(entry) => (
                      <tr>
                        <td style={tdStyle}>
                          <div style={{ 'font-size': '0.875rem' }}>
                            {formatDate(entry.timestamp)}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ 'font-weight': '600' }}>{entry.event}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ 'font-size': '0.875rem' }}>
                            {entry.rulesApplied.join(', ') || 'None'}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ 'font-size': '0.875rem' }}>
                            {entry.entriesCreated.length} entries
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            color: entry.success ? '#10b981' : '#ef4444',
                            'font-weight': '600'
                          }}>
                            {entry.success ? 'Success' : 'Failed'}
                          </span>
                          <Show when={entry.error}>
                            <div style={{ 'font-size': '0.75rem', color: '#ef4444' }}>
                              {entry.error}
                            </div>
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Rule Edit Form Modal */}
      <Show when={editingRule()}>
        <RuleEditForm
          rule={editingRule()}
          onSave={handleSaveRule}
          onCancel={handleCancelEdit}
        />
      </Show>

      {/* Mapping Edit Form Modal */}
      <Show when={editingMapping()}>
        <MappingEditForm
          mapping={editingMapping()}
          onSave={handleSaveMapping}
          onCancel={handleCancelEdit}
        />
      </Show>

      {/* Generate Rule Modal */}
      <Show when={showGenerateModal()}>
        <GenerateRuleModal
          onRuleGenerated={handleRuleGenerated}
          onClose={() => setShowGenerateModal(false)}
        />
      </Show>
    </div>
  );
};

export default AccountAutomationConfig;