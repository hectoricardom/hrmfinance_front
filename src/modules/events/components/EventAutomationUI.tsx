import { Component, createSignal, For, Show, createResource, onMount } from 'solid-js';
import { eventAutomationService } from '../services/eventAutomationService';
import { eventService } from '../services/eventService';
import { EventAutomationRule, EventType } from '../types/eventTypes';
import { getEventTemplate } from '../data/eventTemplates';
import EventRuleBuilder from './EventRuleBuilder';
import { useTranslation } from '../../../translations';
import { eventRulesApi } from '../../../services/api/eventRulesApi';
import { accountsStore } from '../../accounts';
import { accountsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';

const EventAutomationUI: Component = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<'rules' | 'events' | 'audit'>('rules');
  const [editingRule, setEditingRule] = createSignal<EventAutomationRule | null>(null);
  const [showNewRule, setShowNewRule] = createSignal(false);
  const [selectedEventType, setSelectedEventType] = createSignal<EventType | ''>('');

  // Fetch rules from API
  const [rules, { refetch: refetchRules }] = createResource(
    () => eventRulesApi.getAll(),
    { initialValue: [] }
  );
  
  const eventHistory = () => eventService.getHistory(50);
  const auditLog = () => eventAutomationService.getAuditLog(50);

  const eventTypes: Array<{value: EventType, label: string, category: string}> = [
    { value: 'invoice_completed', label: t('eventAutomation.eventTypes.invoice_completed'), category: t('eventAutomation.categories.financial') },
    { value: 'invoice_created', label: t('eventAutomation.eventTypes.invoice_created'), category: t('eventAutomation.categories.financial') },
    { value: 'invoice_updated', label: t('eventAutomation.eventTypes.invoice_updated'), category: t('eventAutomation.categories.financial') },
    { value: 'payment_received', label: t('eventAutomation.eventTypes.payment_received'), category: t('eventAutomation.categories.financial') },
    { value: 'inventory_received', label: t('eventAutomation.eventTypes.inventory_received'), category: t('eventAutomation.categories.inventory') },
    { value: 'inventory_sold', label: t('eventAutomation.eventTypes.inventory_sold'), category: t('eventAutomation.categories.inventory') },
    { value: 'inventory_adjusted', label: t('eventAutomation.eventTypes.inventory_adjusted'), category: t('eventAutomation.categories.inventory') },
    { value: 'expense_created', label: t('eventAutomation.eventTypes.expense_created'), category: t('eventAutomation.categories.financial') },
    { value: 'expense_approved', label: t('eventAutomation.eventTypes.expense_approved'), category: t('eventAutomation.categories.financial') },
    { value: 'expense_paid', label: t('eventAutomation.eventTypes.expense_paid'), category: t('eventAutomation.categories.financial') },
    { value: 'service_rendered', label: t('eventAutomation.eventTypes.service_rendered'), category: t('eventAutomation.categories.operational') },
    { value: 'freight_processed', label: t('eventAutomation.eventTypes.freight_processed'), category: t('eventAutomation.categories.operational') },
    { value: 'customs_cleared', label: t('eventAutomation.eventTypes.customs_cleared'), category: t('eventAutomation.categories.operational') }
  ];

  const handleSaveRule = async (rule: Omit<EventAutomationRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {

      console.log(rule, editingRule())

      if (editingRule()) {
        await eventRulesApi.update(editingRule()!.id, rule);
      } else {
        await eventRulesApi.create(rule);
      }
      
      // Refresh the rules list
      await refetchRules();
      
      // Update local service cache
      const updatedRules = await eventRulesApi.getAll();
      console.log(updatedRules)

      eventAutomationService.syncRules(updatedRules);
      
      setEditingRule(null);
      setShowNewRule(false);

    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('Failed to save rule. Please try again.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm(t('common.confirmDelete'))) {
      try {
        await eventRulesApi.delete(ruleId);
        
        // Refresh the rules list
        await refetchRules();
        
        // Update local service cache
        const updatedRules = await eventRulesApi.getAll();
        eventAutomationService.syncRules(updatedRules);
      } catch (error) {
        console.error('Failed to delete rule:', error);
        alert('Failed to delete rule. Please try again.');
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    'background-color': isActive ? '#3b82f6' : 'transparent',
    color: isActive ? 'white' : '#6b7280',
    border: 'none',
    'border-radius': '0.5rem',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'all 0.2s'
  });

  const cardStyle = {
    'background-color': 'white',
    'border-radius': '0.5rem',
    padding: '1.5rem',
    'box-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    'margin-bottom': '1rem'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    'background-color': '#3b82f6',
    color: 'white',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    'background-color': '#6b7280'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    'background-color': '#ef4444'
  };


 const searchAccount = async() => {
      let acns  = await accountsApi.getAlls(authStore.getBusinessId());
      accountsStore.updAccount(acns);
   }


   onMount(()=>{
    searchAccount();
   })

  // Toggle rule active status
  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {

   
      await eventRulesApi.toggleActive(ruleId, isActive);
      
      // Refresh the rules list
      await refetchRules();
      
      // Update local service cache
      // 
      const updatedRules = await eventRulesApi.getAll();
      eventAutomationService.syncRules(updatedRules);
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      alert('Failed to update rule status. Please try again.');
    }
  };
  
  return (
    <div style={{ 'max-width': '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ 'margin-bottom': '2rem' }}>
        <h1 style={{ 'font-size': '2rem', 'font-weight': '700', 'margin-bottom': '0.5rem' }}>
          {t('eventAutomation.title')}
        </h1>
        <p style={{ color: '#6b7280' }}>
          {t('eventAutomation.subtitle')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '2rem' }}>
        <button
          style={tabStyle(activeTab() === 'rules')}
          onClick={() => setActiveTab('rules')}
        >
          {t('eventAutomation.tabs.rules')} ({!rules.loading && !rules.error ? rules().length : 0})
        </button>
        <button
          style={tabStyle(activeTab() === 'events')}
          onClick={() => setActiveTab('events')}
        >
          {t('eventAutomation.tabs.events')}
        </button>
        <button
          style={tabStyle(activeTab() === 'audit')}
          onClick={() => setActiveTab('audit')}
        >
          {t('eventAutomation.tabs.audit')}
        </button>
      </div>

      {/* Rules Tab */}
      <Show when={activeTab() === 'rules'}>
        <div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '1.5rem' }}>
            <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
              {t('eventAutomation.rules.title')}
            </h2>
            <button
              style={buttonStyle}
              onClick={() => {
                searchAccount();
                setShowNewRule(true);
              }}
            >
              + {t('eventAutomation.rules.createNew')}
            </button>
          </div>

          <Show when={rules.loading}>
            <div style={cardStyle}>
              <p style={{ 'text-align': 'center', color: '#6b7280' }}>
                Loading rules...
              </p>
            </div>
          </Show>
          
          <Show when={rules.error}>
            <div style={cardStyle}>
              <p style={{ 'text-align': 'center', color: '#ef4444' }}>
                Failed to load rules. Please refresh the page.
              </p>
            </div>
          </Show>
          
          <Show when={!rules.loading && !rules.error && rules().length === 0}>
            <div style={{
              ...cardStyle,
              'text-align': 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <p style={{ 'margin-bottom': '1rem' }}>{t('eventAutomation.rules.noRules')}</p>
              <button
                style={buttonStyle}
                onClick={() => {
                  searchAccount();
                  setShowNewRule(true);
                }}
              >
                {t('eventAutomation.rules.createFirst')}
              </button>
            </div>
          </Show>

          <For each={!rules.loading && !rules.error ? rules() : []}>
            {(rule) => (
              <div style={cardStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem', 'margin-bottom': '0.5rem' }}>
                      <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>
                        {rule.name}
                      </h3>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        'background-color': rule.isActive ? '#d1fae5' : '#fee2e2',
                        color: rule.isActive ? '#065f46' : '#991b1b',
                        'border-radius': '0.375rem',
                        'font-size': '0.875rem',
                        'font-weight': '500'
                      }}>
                        {rule.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        'background-color': '#e5e7eb',
                        color: '#374151',
                        'border-radius': '0.375rem',
                        'font-size': '0.875rem'
                      }}>
                        {rule.eventType}
                      </span>
                    </div>
                    <p style={{ color: '#6b7280', 'margin-bottom': '1rem' }}>
                      {rule.description}
                    </p>

                    <div style={{ 'font-size': '0.875rem', color: '#4b5563' }}>
                      <div style={{ 'margin-bottom': '0.5rem' }}>
                        <strong>{t('eventAutomation.rules.conditions')}:</strong>
                        <For each={rule.conditions}>
                          {(condition, index) => (
                            <div style={{ 'margin-left': '1rem' }}>
                              {index() > 0 && 'AND '}
                              {condition.field} {condition.operator} {condition.value}
                            </div>
                          )}
                        </For>
                        {rule?.conditions?.length === 0 && <span style={{ 'margin-left': '1rem' }}>{t('eventAutomation.rules.alwaysTriggers')}</span>}
                      </div>

                      <div>
                        <strong>{t('eventAutomation.rules.journalEntry')}:</strong>
                        <div style={{ 'margin-left': '1rem' }}>
                          {rule.journalEntryTemplate?.lines?.length} {t('eventAutomation.rules.lines')} - {rule?.journalEntryTemplate?.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={secondaryButtonStyle}
                      onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                    >
                      {rule.isActive ? t('eventAutomation.rules.disable') : t('eventAutomation.rules.enable')}
                    </button>
                    <button
                      style={buttonStyle}
                      onClick={() => {
                        searchAccount();
                        setEditingRule(rule);
                      }}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      style={dangerButtonStyle}
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Events Tab */}
      <Show when={activeTab() === 'events'}>
        <div>
          <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '1.5rem' }}>
            {t('eventAutomation.events.title')}
          </h2>

          <Show when={eventHistory().length === 0}>
            <div style={{ ...cardStyle, 'text-align': 'center', color: '#6b7280' }}>
              {t('eventAutomation.events.noEvents')}
            </div>
          </Show>

          <For each={eventHistory()}>
            {(event) => (
              <div style={cardStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                  <h3 style={{ 'font-size': '1rem', 'font-weight': '600' }}>
                    {event.type}
                  </h3>
                  <span style={{ 'font-size': '0.875rem', color: '#6b7280' }}>
                    {formatDate(event.timestamp)}
                  </span>
                </div>
                <div style={{ 'font-size': '0.875rem', color: '#4b5563' }}>
                  <div><strong>{t('eventAutomation.events.source')}:</strong> {event.source}</div>
                  <div><strong>{t('eventAutomation.events.eventId')}:</strong> {event.id}</div>
                  <details style={{ 'margin-top': '0.5rem' }}>
                    <summary style={{ cursor: 'pointer' }}>{t('eventAutomation.events.viewData')}</summary>
                    <pre style={{
                      'margin-top': '0.5rem',
                      padding: '0.5rem',
                      'background-color': '#f3f4f6',
                      'border-radius': '0.25rem',
                      overflow: 'auto',
                      'font-size': '0.75rem'
                    }}>
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Audit Tab */}
      <Show when={activeTab() === 'audit'}>
        <div>
          <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '1.5rem' }}>
            {t('eventAutomation.audit.title')}
          </h2>

          <Show when={auditLog().length === 0}>
            <div style={{ ...cardStyle, 'text-align': 'center', color: '#6b7280' }}>
              {t('eventAutomation.audit.noActivity')}
            </div>
          </Show>

          <For each={auditLog()}>
            {(entry) => (
              <div style={cardStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                    <h3 style={{ 'font-size': '1rem', 'font-weight': '600' }}>
                      {entry.eventType}
                    </h3>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      'background-color': entry.success ? '#d1fae5' : '#fee2e2',
                      color: entry.success ? '#065f46' : '#991b1b',
                      'border-radius': '0.375rem',
                      'font-size': '0.875rem',
                      'font-weight': '500'
                    }}>
                      {entry.success ? t('eventAutomation.audit.success') : t('eventAutomation.audit.failed')}
                    </span>
                  </div>
                  <span style={{ 'font-size': '0.875rem', color: '#6b7280' }}>
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
                
                <div style={{ 'font-size': '0.875rem', color: '#4b5563' }}>
                  <div><strong>{t('eventAutomation.audit.eventId')}:</strong> {entry.eventId}</div>
                  <div><strong>{t('eventAutomation.audit.rulesTriggered')}:</strong> {entry.rulesTriggered.join(', ') || t('common.none')}</div>
                  <div><strong>{t('eventAutomation.audit.entriesCreated')}:</strong> {entry.entriesCreated.length} {t('eventAutomation.audit.journalEntries')}</div>
                  <Show when={entry.error}>
                    <div style={{ color: '#dc2626', 'margin-top': '0.5rem' }}>
                      <strong>{t('eventAutomation.audit.error')}:</strong> {entry.error}
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Rule Builder Modal */}
      <Show when={showNewRule() || editingRule()}>
        <EventRuleBuilder
          rule={editingRule()}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowNewRule(false);
            setEditingRule(null);
          }}
        />
      </Show>
    </div>
  );
};

export default EventAutomationUI;