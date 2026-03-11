/**
 * ValidationChecklist Component
 *
 * Displays a categorized checklist of validation items with pass/warn/error
 * status icons, readiness score, collapsible sections, and fix action links.
 */

import { Component, createSignal, createMemo, For, Show, JSX } from 'solid-js';
import { Button } from '../../../ui';
import type { TaxPortal, DrakeTaxDocument, TaxDocumentRequest } from '../../types/drakeTypes';
import type { ValidationCheckItem, ValidationResult } from '../../types/taxCalcTypes';
import { taxValidationService } from '../../services/taxValidationService';

interface ValidationChecklistProps {
  client: TaxPortal;
  documents: DrakeTaxDocument[];
  documentRequest?: TaxDocumentRequest | null;
  onFixAction?: (action: string) => void;
}

const ValidationChecklist: Component<ValidationChecklistProps> = (props) => {
  const [result, setResult] = createSignal<ValidationResult | null>(null);
  const [isRunning, setIsRunning] = createSignal(false);
  const [expandedSections, setExpandedSections] = createSignal<Record<string, boolean>>({
    required: true,
    recommended: true,
    optional: false,
  });

  // Run validation
  const runValidation = () => {
    setIsRunning(true);
    // Small delay for visual feedback
    setTimeout(() => {
      const validationResult = taxValidationService.validate(
        props.client,
        props.documents,
        props.documentRequest
      );
      setResult(validationResult);
      setIsRunning(false);
    }, 300);
  };

  // Categorize items
  const requiredItems = createMemo(() => result()?.items.filter((i) => i.category === 'required') || []);
  const recommendedItems = createMemo(() => result()?.items.filter((i) => i.category === 'recommended') || []);
  const optionalItems = createMemo(() => result()?.items.filter((i) => i.category === 'optional') || []);

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Status icon
  const statusIcon = (status: ValidationCheckItem['status']): JSX.Element => {
    switch (status) {
      case 'pass':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
      case 'warn':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'pending':
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
    }
  };

  // Score color
  const scoreColor = (score: number): string => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  // Styles
  const containerStyle: JSX.CSSProperties = {
    padding: '1rem',
  };

  const headerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '1.5rem',
  };

  const scoreContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
  };

  const scoreCircleStyle = (score: number): JSX.CSSProperties => ({
    width: '64px',
    height: '64px',
    'border-radius': '50%',
    border: `4px solid ${scoreColor(score)}`,
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '1.25rem',
    'font-weight': '700',
    color: scoreColor(score),
  });

  const scoreLabelStyle: JSX.CSSProperties = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
  };

  const countsStyle: JSX.CSSProperties = {
    display: 'flex',
    gap: '1rem',
    'font-size': '0.875rem',
  };

  const countBadgeStyle = (color: string): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    background: `${color}15`,
    color: color,
    'font-weight': '600',
  });

  const sectionHeaderStyle = (isOpen: boolean): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '0.75rem 1rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-md)',
    cursor: 'pointer',
    'user-select': 'none',
    'margin-bottom': isOpen ? '0.5rem' : '0',
    'margin-top': '0.75rem',
    transition: 'all 0.2s',
  });

  const sectionTitleStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '0.9rem',
    color: 'var(--text-primary)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
  };

  const sectionCountStyle = (color: string): JSX.CSSProperties => ({
    'font-size': '0.75rem',
    'font-weight': '600',
    color: color,
    background: `${color}15`,
    padding: '0.125rem 0.5rem',
    'border-radius': '9999px',
  });

  const arrowStyle = (isOpen: boolean): JSX.CSSProperties => ({
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
    color: 'var(--text-secondary)',
  });

  const itemStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color)',
  };

  const itemContentStyle: JSX.CSSProperties = {
    flex: '1',
    'min-width': '0',
  };

  const itemLabelStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-primary)',
    'margin-bottom': '0.125rem',
  };

  const itemDetailStyle: JSX.CSSProperties = {
    'font-size': '0.8rem',
    color: 'var(--text-secondary)',
    'line-height': '1.4',
  };

  const fixLinkStyle: JSX.CSSProperties = {
    'font-size': '0.8rem',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    'text-decoration': 'underline',
    background: 'none',
    border: 'none',
    padding: '0',
    'margin-top': '0.25rem',
    display: 'inline-block',
  };

  const emptyStateStyle: JSX.CSSProperties = {
    'text-align': 'center',
    padding: '3rem 2rem',
    color: 'var(--text-secondary)',
  };

  const emptyIconStyle: JSX.CSSProperties = {
    'margin-bottom': '1rem',
  };

  // Section renderer
  const renderSection = (
    title: string,
    sectionKey: string,
    items: ValidationCheckItem[],
    icon: string
  ) => {
    const isOpen = () => expandedSections()[sectionKey];
    const passCount = items.filter((i) => i.status === 'pass').length;
    const totalCount = items.length;

    return (
      <div>
        <div style={sectionHeaderStyle(isOpen())} onClick={() => toggleSection(sectionKey)}>
          <div style={sectionTitleStyle}>
            <span>{icon}</span>
            <span>{title}</span>
            <span style={sectionCountStyle(passCount === totalCount ? '#22c55e' : '#f59e0b')}>
              {passCount}/{totalCount}
            </span>
          </div>
          <span style={arrowStyle(isOpen())}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <Show when={isOpen()}>
          <div style={{ 'border': '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-md)', overflow: 'hidden' }}>
            <For each={items}>
              {(item) => (
                <div style={itemStyle}>
                  <div style={{ 'flex-shrink': '0', 'margin-top': '2px' }}>
                    {statusIcon(item.status)}
                  </div>
                  <div style={itemContentStyle}>
                    <div style={itemLabelStyle}>{item.label}</div>
                    <Show when={item.detail}>
                      <div style={itemDetailStyle}>{item.detail}</div>
                    </Show>
                    <Show when={item.fixAction && item.status !== 'pass' && props.onFixAction}>
                      <button
                        style={fixLinkStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onFixAction?.(item.fixAction!);
                        }}
                      >
                        Fix this
                      </button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Header with run button */}
      <div style={headerStyle}>
        <Show
          when={result()}
          fallback={
            <div style={{ 'font-size': '0.9rem', color: 'var(--text-secondary)' }}>
              Run validation to check readiness for filing.
            </div>
          }
        >
          <div style={scoreContainerStyle}>
            <div style={scoreCircleStyle(result()!.readinessScore)}>
              {result()!.readinessScore}%
            </div>
            <div>
              <div style={{ 'font-weight': '600', color: 'var(--text-primary)', 'margin-bottom': '0.25rem' }}>
                {result()!.isReady ? 'Ready for Filing' : 'Not Ready'}
              </div>
              <div style={countsStyle}>
                <span style={countBadgeStyle('#22c55e')}>
                  {result()!.passCount} pass
                </span>
                <span style={countBadgeStyle('#f59e0b')}>
                  {result()!.warnCount} warn
                </span>
                <span style={countBadgeStyle('#ef4444')}>
                  {result()!.errorCount} error
                </span>
              </div>
            </div>
          </div>
        </Show>
        <Button onClick={runValidation} disabled={isRunning()}>
          {isRunning() ? 'Running...' : result() ? 'Re-run Validation' : 'Run Validation'}
        </Button>
      </div>

      {/* Validation Results */}
      <Show when={result()} fallback={
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <path d="M9 14l2 2 4-4" />
            </svg>
          </div>
          <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
            No validation results yet
          </div>
          <div style={{ 'font-size': '0.875rem' }}>
            Click "Run Validation" to check if this return is ready for Drake export.
          </div>
        </div>
      }>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
          <Show when={requiredItems().length > 0}>
            {renderSection('Required', 'required', requiredItems(), 'Required')}
          </Show>
          <Show when={recommendedItems().length > 0}>
            {renderSection('Recommended', 'recommended', recommendedItems(), 'Recommended')}
          </Show>
          <Show when={optionalItems().length > 0}>
            {renderSection('Optional', 'optional', optionalItems(), 'Optional')}
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ValidationChecklist;
