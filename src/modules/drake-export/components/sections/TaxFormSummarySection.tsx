/**
 * TaxFormSummarySection
 * SolidJS component for displaying tax form summary in Drake Tax Export
 */

import { Component, JSX, createSignal, createMemo, Show, For } from 'solid-js';
import { drakeExportStore } from '../../stores/drakeExportStore';
import TaxFormLineItem from '../shared/TaxFormLineItem';
import { FORM_DEFINITIONS } from '../data/drakeFieldMappings';
import type { DrakeTaxDocumentType, DrakeTaxDocument, ExtractedTaxAmounts } from '../../types/drakeTypes';
import { DRAKE_FORM_LABELS } from '../../types/drakeTypes';

// Form group data structure for accordion items
interface FormGroupData {
  formType: DrakeTaxDocumentType;
  label: string;
  icon: string;
  color: string;
  documentCount: number;
  totalAmount: number;
  documents: DrakeTaxDocument[];
  lineItems: LineItemData[];
}

interface LineItemData {
  boxNumber: string;
  description: string;
  amount: number;
  sourceDocCount: number;
  documentIds: string[];
}

const TaxFormSummarySection: Component = () => {
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = createSignal<Set<DrakeTaxDocumentType>>(new Set());

  // Toggle section expansion
  const toggleSection = (formType: DrakeTaxDocumentType) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(formType)) {
        next.delete(formType);
      } else {
        next.add(formType);
      }
      return next;
    });
  };

  // Check if a section is expanded
  const isSectionExpanded = (formType: DrakeTaxDocumentType): boolean => {
    return expandedSections().has(formType);
  };

  // Aggregate data from store documents
  const aggregatedData = createMemo(() => {
    const documents = drakeExportStore.documents;
    const groupMap = new Map<DrakeTaxDocumentType, FormGroupData>();

    documents.forEach((doc) => {
      const formType = doc.drakeFormType || 'other';
      const formDef = FORM_DEFINITIONS[formType];

      if (!groupMap.has(formType)) {
        groupMap.set(formType, {
          formType,
          label: DRAKE_FORM_LABELS[formType] || 'Other',
          icon: formDef?.icon || '📄',
          color: formDef?.color || '#64748b',
          documentCount: 0,
          totalAmount: 0,
          documents: [],
          lineItems: []
        });
      }

      const group = groupMap.get(formType)!;
      group.documentCount += 1;
      group.documents.push(doc);

      // Calculate total from extracted amounts
      if (doc.extractedAmounts) {
        const amounts = doc.extractedAmounts;
        const primaryAmount = getPrimaryAmount(formType, amounts);
        group.totalAmount += primaryAmount;
      }
    });

    // Build line items for each group
    groupMap.forEach((group) => {
      group.lineItems = buildLineItems(group.formType, group.documents);
    });

    return Array.from(groupMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  });

  // Get the primary amount for a form type
  const getPrimaryAmount = (formType: DrakeTaxDocumentType, amounts: ExtractedTaxAmounts): number => {
    switch (formType) {
      case 'w2':
        return amounts.wages || 0;
      case '1099_nec':
        return amounts.nonEmployeeCompensation || 0;
      case '1099_misc':
        return (amounts.rents || 0) + (amounts.royalties || 0) + (amounts.otherIncome || 0);
      case '1099_int':
        return amounts.interestIncome || 0;
      case '1099_div':
        return amounts.ordinaryDividends || 0;
      case '1098':
        return amounts.mortgageInterest || 0;
      case '1098_t':
        return amounts.paymentsReceived || 0;
      case 'schedule_k1':
        return amounts.ordinaryBusinessIncome || 0;
      case 'receipt':
        return amounts.totalAmount || 0;
      default:
        return amounts.totalAmount || 0;
    }
  };

  // Build line items aggregated across documents
  const buildLineItems = (formType: DrakeTaxDocumentType, documents: DrakeTaxDocument[]): LineItemData[] => {
    const formDef = FORM_DEFINITIONS[formType];
    if (!formDef) return [];

    const lineItemMap = new Map<string, LineItemData>();

    formDef.boxes.forEach((box) => {
      documents.forEach((doc) => {
        if (doc.extractedAmounts) {
          const value = doc.extractedAmounts[box.dataField];
          if (typeof value === 'number' && value !== 0) {
            const key = box.boxNumber;
            if (!lineItemMap.has(key)) {
              lineItemMap.set(key, {
                boxNumber: `Box ${box.boxNumber}`,
                description: box.description,
                amount: 0,
                sourceDocCount: 0,
                documentIds: []
              });
            }
            const item = lineItemMap.get(key)!;
            item.amount += value;
            item.sourceDocCount += 1;
            item.documentIds.push(doc.id);
          }
        }
      });
    });

    return Array.from(lineItemMap.values()).sort((a, b) => b.amount - a.amount);
  };

  // Calculate summary totals
  const summaryTotals = createMemo(() => {
    const documents = drakeExportStore.documents;
    let totalIncome = 0;
    let totalWithholding = 0;

    documents.forEach((doc) => {
      if (doc.extractedAmounts) {
        const amounts = doc.extractedAmounts;
        // Income amounts
        totalIncome += amounts.wages || 0;
        totalIncome += amounts.nonEmployeeCompensation || 0;
        totalIncome += amounts.interestIncome || 0;
        totalIncome += amounts.ordinaryDividends || 0;
        totalIncome += amounts.rents || 0;
        totalIncome += amounts.royalties || 0;
        totalIncome += amounts.otherIncome || 0;
        totalIncome += amounts.ordinaryBusinessIncome || 0;

        // Withholding amounts
        totalWithholding += amounts.federalTaxWithheld || 0;
        totalWithholding += amounts.federalTaxWithheld1099 || 0;
        totalWithholding += amounts.stateTaxWithheld || 0;
        totalWithholding += amounts.localTaxWithheld || 0;
      }
    });

    return {
      totalIncome,
      totalWithholding,
      netIncome: totalIncome - totalWithholding
    };
  });

  // Check for warnings (unverified documents)
  const warnings = createMemo(() => {
    const unverifiedCount = drakeExportStore.documents.filter((doc) => !doc.verified).length;
    const result: string[] = [];

    if (unverifiedCount > 0) {
      result.push(`${unverifiedCount} document(s) have not been verified`);
    }

    const documentsWithErrors = drakeExportStore.documents.filter(
      (doc) => doc.uploadStatus === 'error'
    ).length;
    if (documentsWithErrors > 0) {
      result.push(`${documentsWithErrors} document(s) have processing errors`);
    }

    return result;
  });

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Styles
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1rem'
  };

  const accordionStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem'
  };

  const formGroupStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    overflow: 'hidden'
  };

  const formHeaderStyle = (color: string, isExpanded: boolean): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem 1.25rem',
    background: isExpanded ? `${color}10` : 'transparent',
    'border-left': `4px solid ${color}`,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  });

  const headerLeftStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem'
  };

  const iconContainerStyle = (color: string): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '2.5rem',
    height: '2.5rem',
    'border-radius': '0.5rem',
    background: `${color}15`,
    'font-size': '1.25rem'
  });

  const headerInfoStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.125rem'
  };

  const formLabelStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '0.9375rem',
    color: 'var(--text-primary, #1f2937)'
  };

  const docCountStyle: JSX.CSSProperties = {
    'font-size': '0.8125rem',
    color: 'var(--text-secondary, #6B7280)'
  };

  const headerRightStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem'
  };

  const totalAmountStyle: JSX.CSSProperties = {
    'font-weight': '700',
    'font-size': '1.125rem',
    color: 'var(--text-primary, #1f2937)',
    'font-variant-numeric': 'tabular-nums'
  };

  const chevronStyle = (isExpanded: boolean): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '1.5rem',
    height: '1.5rem',
    color: 'var(--text-secondary, #6B7280)',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.3s ease'
  });

  const lineItemsContainerStyle = (isExpanded: boolean): JSX.CSSProperties => ({
    'max-height': isExpanded ? '1000px' : '0',
    opacity: isExpanded ? '1' : '0',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease-in-out, opacity 0.25s ease-in-out',
    'border-top': isExpanded ? '1px solid var(--border-color, #e5e7eb)' : 'none'
  });

  const lineItemsInnerStyle: JSX.CSSProperties = {
    padding: '0.5rem 0'
  };

  const summaryContainerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    padding: '1.5rem',
    'margin-top': '0.5rem'
  };

  const summaryTitleStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary, #1f2937)',
    'margin-bottom': '1rem',
    'padding-bottom': '0.75rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)'
  };

  const summaryRowStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0'
  };

  const summaryLabelStyle: JSX.CSSProperties = {
    'font-size': '0.9375rem',
    color: 'var(--text-secondary, #6B7280)'
  };

  const summaryValueStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary, #1f2937)',
    'font-variant-numeric': 'tabular-nums'
  };

  const netIncomeRowStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'margin-top': '0.5rem',
    'border-top': '2px solid var(--border-color, #e5e7eb)'
  };

  const netIncomeLabelStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary, #1f2937)'
  };

  const netIncomeValueStyle = (amount: number): JSX.CSSProperties => ({
    'font-weight': '700',
    'font-size': '1.25rem',
    color: amount >= 0 ? 'var(--success-color, #10B981)' : 'var(--danger-color, #EF4444)',
    'font-variant-numeric': 'tabular-nums'
  });

  const warningContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.5rem',
    background: 'var(--warning-light, #FFFBEB)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--warning-border, #FCD34D)',
    padding: '1rem 1.25rem',
    'margin-top': '0.5rem'
  };

  const warningHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-weight': '600',
    'font-size': '0.9375rem',
    color: 'var(--warning-dark, #92400E)'
  };

  const warningItemStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.875rem',
    color: 'var(--warning-text, #B45309)',
    'padding-left': '1.5rem'
  };

  const emptyStateStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '3rem 2rem',
    background: 'var(--surface-secondary, #f9fafb)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px dashed var(--border-color, #d1d5db)',
    'text-align': 'center'
  };

  const emptyIconStyle: JSX.CSSProperties = {
    'font-size': '2.5rem',
    'margin-bottom': '1rem',
    opacity: '0.5'
  };

  const emptyTextStyle: JSX.CSSProperties = {
    'font-size': '0.9375rem',
    color: 'var(--text-secondary, #6B7280)'
  };

  return (
    <div style={containerStyle}>
      {/* Form type accordion groups */}
      <Show
        when={aggregatedData().length > 0}
        fallback={
          <div style={emptyStateStyle}>
            <span style={emptyIconStyle}>📋</span>
            <span style={emptyTextStyle}>No documents uploaded yet. Upload tax documents to see the summary.</span>
          </div>
        }
      >
        <div style={accordionStyle}>
          <For each={aggregatedData()}>
            {(group) => (
              <div style={formGroupStyle}>
                {/* Form Group Header */}
                <div
                  style={formHeaderStyle(group.color, isSectionExpanded(group.formType))}
                  onClick={() => toggleSection(group.formType)}
                >
                  <div style={headerLeftStyle}>
                    <div style={iconContainerStyle(group.color)}>
                      {group.icon}
                    </div>
                    <div style={headerInfoStyle}>
                      <span style={formLabelStyle}>{group.label}</span>
                      <span style={docCountStyle}>
                        {group.documentCount} document{group.documentCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={headerRightStyle}>
                    <span style={totalAmountStyle}>
                      {formatCurrency(group.totalAmount)}
                    </span>
                    <span style={chevronStyle(isSectionExpanded(group.formType))}>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2.5 4.5L6 8L9.5 4.5"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Expandable Line Items */}
                <div style={lineItemsContainerStyle(isSectionExpanded(group.formType))}>
                  <div style={lineItemsInnerStyle}>
                    <For each={group.lineItems}>
                      {(item) => (
                        <TaxFormLineItem
                          formCode={group.formType}
                          boxNumber={item.boxNumber}
                          description={item.description}
                          amount={item.amount}
                          sourceDocumentCount={item.sourceDocCount}
                        />
                      )}
                    </For>
                    <Show when={group.lineItems.length === 0}>
                      <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-secondary, #6B7280)', 'font-size': '0.875rem' }}>
                        No line item details available
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Summary Totals */}
        <div style={summaryContainerStyle}>
          <div style={summaryTitleStyle}>Summary Totals</div>

          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Total Income</span>
            <span style={summaryValueStyle}>{formatCurrency(summaryTotals().totalIncome)}</span>
          </div>

          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Total Withholding</span>
            <span style={summaryValueStyle}>{formatCurrency(summaryTotals().totalWithholding)}</span>
          </div>

          <div style={netIncomeRowStyle}>
            <span style={netIncomeLabelStyle}>Net Income</span>
            <span style={netIncomeValueStyle(summaryTotals().netIncome)}>
              {formatCurrency(summaryTotals().netIncome)}
            </span>
          </div>
        </div>

        {/* Warnings for incomplete data */}
        <Show when={warnings().length > 0}>
          <div style={warningContainerStyle}>
            <div style={warningHeaderStyle}>
              <span>⚠️</span>
              <span>Warnings</span>
            </div>
            <For each={warnings()}>
              {(warning) => (
                <div style={warningItemStyle}>
                  <span>•</span>
                  <span>{warning}</span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default TaxFormSummarySection;
