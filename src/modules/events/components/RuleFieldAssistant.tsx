/**
 * RuleFieldAssistant Component
 *
 * Unified interface that combines all three field mapping approaches:
 * 1. VisualRuleMapper - Drag & Drop
 * 2. SmartFieldLinker - One-Click Linking
 * 3. InvoiceSchemaAnalyzer - Complete Field Extraction
 *
 * Integrates with EventRuleBuilder to provide faster rule creation
 */

import { Component, createSignal, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import VisualRuleMapper from './VisualRuleMapper';
import SmartFieldLinker from './SmartFieldLinker';
import InvoiceSchemaAnalyzer from './InvoiceSchemaAnalyzer';
import { ExtractedField } from '../hooks/useInvoiceFieldExtractor';

interface JournalLine {
  accountExpression?: string;
  accountId?: string;
  descriptionTemplate?: string;
  amountExpression?: string;
  isDebit?: boolean;
}

interface LineCondition {
  field: string;
  operator: string;
  value: string | number;
  dataType: string;
}

interface RuleFieldAssistantProps {
  eventType: string;
  journalLines?: JournalLine[];
  onAddCondition: (fieldPath: string, operator?: string, value?: string) => void;
  onSetDescription: (template: string) => void;
  onSetAmount: (expression: string, lineIndex: number) => void;
  onSetLineDescription: (template: string, lineIndex: number) => void;
  onSetReference: (template: string) => void;
  onAddLine?: (amountExpression: string, descriptionTemplate?: string, lineConditions?: LineCondition[]) => void;
  onAddCustomField?: (name: string, expression: string, description?: string) => void;
  onClose?: () => void;
}

const RuleFieldAssistant: Component<RuleFieldAssistantProps> = (props) => {
  const { t } = useTranslation();
  const [activeApproach, setActiveApproach] = createSignal<'visual' | 'smart' | 'analyzer'>('visual');
  const [insertMode, setInsertMode] = createSignal<'replace' | 'append'>('append');
  const [selectedLineIndex, setSelectedLineIndex] = createSignal<number>(0);
  const [targetField, setTargetField] = createSignal<'amount' | 'lineDescription'>('amount');

  // Handle field selection from any approach
  const handleFieldSelect = (fieldPath: string, targetType: string) => {
    switch (targetType) {
      case 'condition':
        props.onAddCondition(fieldPath);
        break;
      case 'description':
        props.onSetDescription(`{${fieldPath}}`);
        break;
      case 'amount':
        props.onSetAmount(fieldPath, selectedLineIndex());
        break;
      case 'lineDescription':
        props.onSetLineDescription(`{${fieldPath}}`, selectedLineIndex());
        break;
      case 'reference':
        props.onSetReference(`{${fieldPath}}`);
        break;
    }
  };

  // Handle pattern application
  const handlePatternApply = (pattern: any) => {
    pattern.mappings.forEach((mapping: any, index: number) => {
      const lineIndex = Math.min(index, (props.journalLines?.length || 1) - 1);
      if (mapping.targetType === 'amount') {
        props.onSetAmount(`data.${mapping.fieldPattern}`, lineIndex);
      } else {
        handleFieldSelect(`data.${mapping.fieldPattern}`, mapping.targetType);
      }
    });
  };

  // Styles
  const containerStyle = {
    'background-color': 'white',
    'border-radius': '0.75rem',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    'max-height': '96vh',
    display: 'flex',
    'flex-direction': 'column',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 1.25rem',
    'background': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
  };

  const approachTabStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '0.75rem 1rem',
    'background-color': isActive ? 'white' : '#f3f4f6',
    color: isActive ? '#1f2937' : '#6b7280',
    border: 'none',
    'border-bottom': isActive ? '2px solid #3b82f6' : '2px solid transparent',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '500',
    'font-size': '0.875rem',
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    gap: '0.25rem',
    transition: 'all 0.2s',
  });

  const contentStyle = {
    flex: 1,
    overflow: 'auto',
    padding: '0',
  };

  const lineSelectorStyle = {
    padding: '0.75rem 1rem',
    'background-color': '#f0f9ff',
    'border-bottom': '1px solid #e5e7eb',
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'flex-wrap': 'wrap',
  };

  const lineButtonStyle = (isSelected: boolean) => ({
    padding: '0.5rem 0.75rem',
    'background-color': isSelected ? '#3b82f6' : 'white',
    color: isSelected ? 'white' : '#374151',
    border: '1px solid ' + (isSelected ? '#3b82f6' : '#d1d5db'),
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'font-weight': '500',
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    gap: '0.125rem',
    'min-width': '80px',
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, 'font-size': '1.25rem', 'font-weight': '700' }}>
            🚀 {t('fieldAssistant.title')}
          </h2>
          <p style={{ margin: '0.25rem 0 0', 'font-size': '0.8rem', opacity: 0.9 }}>
            {t('fieldAssistant.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
          {/* Insert Mode Toggle */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'font-size': '0.75rem' }}>
            <span>{t('fieldAssistant.mode')}:</span>
            <select
              value={insertMode()}
              onChange={(e) => setInsertMode(e.currentTarget.value as any)}
              style={{
                padding: '0.25rem 0.5rem',
                'border-radius': '0.25rem',
                border: 'none',
                'font-size': '0.75rem',
                cursor: 'pointer'
              }}
            >
              <option value="append">{t('fieldAssistant.append')}</option>
              <option value="replace">{t('fieldAssistant.replace')}</option>
            </select>
          </div>

          <Show when={props.onClose}>
            <button
              onClick={props.onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.375rem 0.75rem',
                'border-radius': '0.375rem',
                cursor: 'pointer',
                'font-size': '0.875rem'
              }}
            >
              ✕ {t('common.close')}
            </button>
          </Show>
        </div>
      </div>

      {/* Line Selector - Shows when there are journal lines 
      <Show when={props.journalLines && props.journalLines.length > 0}>
        <div style={lineSelectorStyle}>
          <div style={{ 'font-size': '0.875rem', 'font-weight': '600', color: '#1f2937' }}>
            📋 {t('fieldAssistant.selectLine')}:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
            <For each={props.journalLines}>
              {(line, index) => (
                <button
                  style={lineButtonStyle(selectedLineIndex() === index())}
                  onClick={() => setSelectedLineIndex(index())}
                >
                  <span style={{ 'font-weight': '600' }}>
                    {t('fieldAssistant.line')} {index() + 1}
                  </span>
                  <span style={{ 'font-size': '0.65rem', opacity: 0.8 }}>
                    {line.isDebit ? `📥 ${t('journal.debit')}` : `📤 ${t('journal.credit')}`}
                  </span>
                  <Show when={line.accountExpression}>
                    <span style={{ 'font-size': '0.6rem', opacity: 0.7 }}>
                      {line.accountExpression?.slice(0, 10)}...
                    </span>
                  </Show>
                </button>
              )}
            </For>
          </div>

          {/* Target Field Selector /}
          <div style={{ 'margin-left': 'auto', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ 'font-size': '0.75rem', color: '#6b7280' }}>{t('fieldAssistant.target')}:</span>
            <select
              value={targetField()}
              onChange={(e) => setTargetField(e.currentTarget.value as any)}
              style={{
                padding: '0.375rem 0.5rem',
                border: '1px solid #d1d5db',
                'border-radius': '0.375rem',
                'font-size': '0.75rem',
                cursor: 'pointer'
              }}
            >
              <option value="amount">💰 {t('fieldAssistant.amount')}</option>
              <option value="lineDescription">📝 {t('fieldAssistant.lineDescription')}</option>
            </select>
          </div>
        </div>
      </Show>
      */}

      {/* No Lines Warning 
      <Show when={!props.journalLines || props.journalLines.length === 0}>
        <div style={{
          padding: '0.75rem 1rem',
          'background-color': '#fef3c7',
          'border-bottom': '1px solid #fcd34d',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          'font-size': '0.875rem',
          color: '#92400e'
        }}>
          ⚠️ {t('fieldAssistant.noLinesWarning')}
        </div>
      </Show>
      */}

      {/* Approach Tabs 
      <div style={{ display: 'flex', 'border-bottom': '1px solid #e5e7eb' }}>
        <button
          style={approachTabStyle(activeApproach() === 'smart')}
          onClick={() => setActiveApproach('smart')}
        >
          <span style={{ 'font-size': '1.25rem' }}>⚡</span>
          <span>{t('fieldAssistant.tabs.smart')}</span>
          <span style={{ 'font-size': '0.7rem', color: '#6b7280' }}>{t('fieldAssistant.tabs.smartDesc')}</span>
        </button>

        <button
          style={approachTabStyle(activeApproach() === 'visual')}
          onClick={() => setActiveApproach('visual')}
        >
          <span style={{ 'font-size': '1.25rem' }}>🎯</span>
          <span>{t('fieldAssistant.tabs.visual')}</span>
          <span style={{ 'font-size': '0.7rem', color: '#6b7280' }}>{t('fieldAssistant.tabs.visualDesc')}</span>
        </button>

        <button
          style={approachTabStyle(activeApproach() === 'analyzer')}
          onClick={() => setActiveApproach('analyzer')}
        >
          <span style={{ 'font-size': '1.25rem' }}>🔬</span>
          <span>{t('fieldAssistant.tabs.analyzer')}</span>
          <span style={{ 'font-size': '0.7rem', color: '#6b7280' }}>{t('fieldAssistant.tabs.analyzerDesc')}</span>
        </button>
      </div>
      */}
      {/* Content */}
      <div style={contentStyle}>
         {/* SmartFieldLinker
        <Show when={false && activeApproach() === 'smart'}>
          <SmartFieldLinker
            eventType={props.eventType}
            onLinkField={(fieldPath, targetType) => {
              // If target is amount and we have a specific target field selected, use it
              if (targetType === 'amount' && targetField() === 'lineDescription') {
                handleFieldSelect(fieldPath, 'lineDescription');
              } else {
                handleFieldSelect(fieldPath, targetType);
              }
            }}
            onApplyPattern={handlePatternApply}
          />
        </Show>
        */}

        <Show when={activeApproach() === 'visual'}>
          <VisualRuleMapper
            eventType={props.eventType}
            journalLines={props.journalLines}
            onFieldSelect={(fieldPath, targetType, lineIndex) => {
              if (targetType === 'amount' && lineIndex !== undefined) {
                props.onSetAmount(fieldPath, lineIndex);
              } else if (targetType === 'lineDescription' && lineIndex !== undefined) {
                props.onSetLineDescription(`{${fieldPath}}`, lineIndex);
              } else if (targetType === 'amount' && targetField() === 'lineDescription') {
                handleFieldSelect(fieldPath, 'lineDescription');
              } else {
                handleFieldSelect(fieldPath, targetType);
              }
            }}
            onAddCondition={(fieldPath) => props.onAddCondition(fieldPath)}
            onSetLineAmount={(fieldPath, lineIndex) => props.onSetAmount(fieldPath, lineIndex)}
            onSetLineDescription={(fieldPath, lineIndex) => props.onSetLineDescription(`{${fieldPath}}`, lineIndex)}
            onSetReference={(fieldPath) => props.onSetReference(`{${fieldPath}}`)}
            onSetDescription={(fieldPath) => props.onSetDescription(`{${fieldPath}}`)}
            onCreateNewLine={(amountField, descriptionField, lineConditions) => {
              if (props.onAddLine) {
                props.onAddLine(amountField, descriptionField ? `{${descriptionField}}` : undefined, lineConditions);
              }
            }}
            onCreateCustomField={(name, expression, description) => {
              if (props.onAddCustomField) {
                props.onAddCustomField(name, expression, description);
              }
            }}
          />
        </Show>
        {/* InvoiceSchemaAnalyzer
        <Show when={activeApproach() === 'analyzer'}>
          <InvoiceSchemaAnalyzer
            onFieldSelect={(fieldPath, targetType) => {
              if (targetType === 'amount' && targetField() === 'lineDescription') {
                handleFieldSelect(fieldPath, 'lineDescription');
              } else {
                handleFieldSelect(fieldPath, targetType);
              }
            }}
          />
        </Show>
        */}
      </div>

      {/* Footer with Tips */}
      <div style={{
        padding: '0.75rem 1rem',
        'background-color': '#f9fafb',
        'border-top': '1px solid #e5e7eb',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'font-size': '0.75rem',
        color: '#6b7280'
      }}>
        <div>
          <Show when={activeApproach() === 'smart'}>
            💡 {t('fieldAssistant.tips.smart')}
          </Show>
          <Show when={activeApproach() === 'visual'}>
            💡 {t('fieldAssistant.tips.visual')}
          </Show>
          <Show when={activeApproach() === 'analyzer'}>
            💡 {t('fieldAssistant.tips.analyzer')}
          </Show>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{
            padding: '0.125rem 0.375rem',
            'background-color': '#fee2e2',
            'border-radius': '0.25rem',
            'font-size': '0.625rem'
          }}>
            🔍 {t('fieldAssistant.targets.condition')}
          </span>
          <span style={{
            padding: '0.125rem 0.375rem',
            'background-color': '#fef3c7',
            'border-radius': '0.25rem',
            'font-size': '0.625rem'
          }}>
            📝 {t('fieldAssistant.targets.description')}
          </span>
          <span style={{
            padding: '0.125rem 0.375rem',
            'background-color': '#dbeafe',
            'border-radius': '0.25rem',
            'font-size': '0.625rem'
          }}>
            💰 {t('fieldAssistant.targets.amount')}
          </span>
          <span style={{
            padding: '0.125rem 0.375rem',
            'background-color': '#f3e8ff',
            'border-radius': '0.25rem',
            'font-size': '0.625rem'
          }}>
            🔗 {t('fieldAssistant.targets.reference')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RuleFieldAssistant;