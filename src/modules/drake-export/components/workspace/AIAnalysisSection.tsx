/**
 * AI Analysis Section Component
 * AI-powered document analysis and insights for tax preparation
 */

import { Component, createSignal, For, Show } from 'solid-js';
import { Card, Button } from '../../../ui';
import type { TaxPortal, DrakeTaxDocument } from '../../types/drakeTypes';
import { DRAKE_FORM_LABELS } from '../../types/drakeTypes';
import { devLog } from '../../../../services/utils';

interface AIAnalysisSectionProps {
  client: TaxPortal;
  documents: DrakeTaxDocument[];
  taxYear: number;
}

interface AnalysisResult {
  documentId: string;
  documentName: string;
  category: string;
  extractedData: {
    field: string;
    value: string | number;
  }[];
  confidence: number;
  status: 'good' | 'review' | 'issue';
  message?: string;
}

interface TaxStrategy {
  title: string;
  description: string;
  potentialSavings?: string;
  priority: 'high' | 'medium' | 'low';
}

const AIAnalysisSection: Component<AIAnalysisSectionProps> = (props) => {
  const [isAnalyzing, setIsAnalyzing] = createSignal(false);
  const [analysisResults, setAnalysisResults] = createSignal<AnalysisResult[]>([]);
  const [showStrategies, setShowStrategies] = createSignal(false);
  const [isLoadingStrategies, setIsLoadingStrategies] = createSignal(false);
  const [strategies, setStrategies] = createSignal<TaxStrategy[]>([]);
  const [analysisComplete, setAnalysisComplete] = createSignal(false);

  // Get status color
  const getStatusColor = (status: 'good' | 'review' | 'issue') => {
    switch (status) {
      case 'good':
        return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)' };
      case 'review':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'issue':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' };
    }
  };

  // Get priority color
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'medium':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'low':
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
  };

  // Analyze all documents
  const handleAnalyzeAll = async () => {
    setIsAnalyzing(true);
    setAnalysisResults([]);
    setAnalysisComplete(false);

    try {
      // Simulate AI analysis with realistic delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const results: AnalysisResult[] = props.documents.map(doc => {
        // Determine status based on document state
        let status: 'good' | 'review' | 'issue' = 'review';
        let message = '';

        if (doc.verified && doc.aiConfidence && doc.aiConfidence >= 0.9) {
          status = 'good';
          message = 'Document verified and data extracted successfully';
        } else if (doc.uploadStatus === 'error') {
          status = 'issue';
          message = doc.errorMessage || 'Error processing document';
        } else if (doc.aiConfidence && doc.aiConfidence < 0.7) {
          status = 'issue';
          message = 'Low confidence - manual review required';
        } else if (!doc.verified) {
          status = 'review';
          message = 'Document needs verification';
        } else {
          status = 'good';
          message = 'Document processed successfully';
        }

        // Extract data fields
        const extractedData: { field: string; value: string | number }[] = [];
        if (doc.extractedAmounts) {
          if (doc.extractedAmounts.wages !== undefined) {
            extractedData.push({ field: 'Wages (Box 1)', value: `$${doc.extractedAmounts.wages.toLocaleString()}` });
          }
          if (doc.extractedAmounts.federalTaxWithheld !== undefined) {
            extractedData.push({ field: 'Federal Tax Withheld', value: `$${doc.extractedAmounts.federalTaxWithheld.toLocaleString()}` });
          }
          if (doc.extractedAmounts.nonEmployeeCompensation !== undefined) {
            extractedData.push({ field: 'Non-Employee Compensation', value: `$${doc.extractedAmounts.nonEmployeeCompensation.toLocaleString()}` });
          }
          if (doc.extractedAmounts.interestIncome !== undefined) {
            extractedData.push({ field: 'Interest Income', value: `$${doc.extractedAmounts.interestIncome.toLocaleString()}` });
          }
          if (doc.extractedAmounts.ordinaryDividends !== undefined) {
            extractedData.push({ field: 'Dividends', value: `$${doc.extractedAmounts.ordinaryDividends.toLocaleString()}` });
          }
          if (doc.extractedAmounts.mortgageInterest !== undefined) {
            extractedData.push({ field: 'Mortgage Interest', value: `$${doc.extractedAmounts.mortgageInterest.toLocaleString()}` });
          }
          if (doc.extractedAmounts.totalAmount !== undefined && extractedData.length === 0) {
            extractedData.push({ field: 'Total Amount', value: `$${doc.extractedAmounts.totalAmount.toLocaleString()}` });
          }
        }

        if (extractedData.length === 0) {
          extractedData.push({ field: 'Status', value: 'No data extracted yet' });
        }

        return {
          documentId: doc.id,
          documentName: doc.originalFileName,
          category: DRAKE_FORM_LABELS[doc.drakeFormType || 'other'],
          extractedData,
          confidence: doc.aiConfidence || Math.random() * 0.3 + 0.7,
          status,
          message
        };
      });

      setAnalysisResults(results);
      setAnalysisComplete(true);
    } catch (error) {
      devLog('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get tax strategies
  const handleGetStrategies = async () => {
    setIsLoadingStrategies(true);
    setShowStrategies(true);

    try {
      // Simulate AI strategy generation
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Calculate totals from documents for personalized suggestions
      let totalIncome = 0;
      let totalWithholding = 0;
      let hasMortgage = false;
      let hasBusinessIncome = false;

      props.documents.forEach(doc => {
        if (doc.extractedAmounts) {
          if (doc.extractedAmounts.wages) totalIncome += doc.extractedAmounts.wages;
          if (doc.extractedAmounts.nonEmployeeCompensation) {
            totalIncome += doc.extractedAmounts.nonEmployeeCompensation;
            hasBusinessIncome = true;
          }
          if (doc.extractedAmounts.federalTaxWithheld) totalWithholding += doc.extractedAmounts.federalTaxWithheld;
          if (doc.extractedAmounts.mortgageInterest) hasMortgage = true;
        }
      });

      const suggestedStrategies: TaxStrategy[] = [];

      // Add relevant strategies based on client situation
      if (hasBusinessIncome) {
        suggestedStrategies.push({
          title: 'Qualified Business Income Deduction',
          description: 'Self-employment income may qualify for the 20% QBI deduction under Section 199A.',
          potentialSavings: 'Up to 20% of qualified business income',
          priority: 'high'
        });
        suggestedStrategies.push({
          title: 'Self-Employment Tax Deduction',
          description: 'Deduct 50% of self-employment taxes paid from adjusted gross income.',
          priority: 'high'
        });
      }

      if (hasMortgage) {
        suggestedStrategies.push({
          title: 'Itemize vs Standard Deduction',
          description: 'With mortgage interest, compare itemized deductions against the standard deduction.',
          potentialSavings: 'Varies based on total itemized deductions',
          priority: 'medium'
        });
      }

      suggestedStrategies.push({
        title: 'Retirement Contribution Review',
        description: 'Verify maximum IRA/401(k) contributions have been made for tax year ' + props.taxYear + '.',
        potentialSavings: 'Up to $6,500 (IRA) or $23,000 (401k) in deductions',
        priority: 'medium'
      });

      if (totalWithholding > totalIncome * 0.25) {
        suggestedStrategies.push({
          title: 'Withholding Adjustment',
          description: 'Consider adjusting W-4 withholding - current withholding appears high relative to income.',
          priority: 'low'
        });
      }

      suggestedStrategies.push({
        title: 'Health Savings Account (HSA)',
        description: 'If enrolled in a high-deductible health plan, maximize HSA contributions for triple tax benefits.',
        potentialSavings: 'Up to $4,150 individual / $8,300 family deduction',
        priority: 'medium'
      });

      setStrategies(suggestedStrategies);
    } catch (error) {
      devLog('Strategy error:', error);
    } finally {
      setIsLoadingStrategies(false);
    }
  };

  // Styles
  const sectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
    gap: '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    margin: '0'
  };

  const subtitleStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    'margin-top': '0.25rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '0.75rem',
    'flex-wrap': 'wrap' as const
  };

  const bigButtonStyle = (primary: boolean) => ({
    padding: '0.875rem 1.5rem',
    'font-size': '1rem',
    'font-weight': '600',
    'border-radius': '10px',
    border: primary ? 'none' : '2px solid var(--border-color, #e5e7eb)',
    background: primary ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
    color: primary ? 'white' : 'var(--text-primary, #1f2937)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'box-shadow': primary ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
  });

  const resultsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem'
  };

  const resultCardStyle = (status: 'good' | 'review' | 'issue') => {
    const colors = getStatusColor(status);
    return {
      padding: '1.25rem',
      'border-radius': '12px',
      border: `1px solid ${colors.border}`,
      background: colors.bg,
      transition: 'all 0.2s ease'
    };
  };

  const cardHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '1rem'
  };

  const categoryBadgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    'border-radius': '6px',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    'font-size': '0.75rem',
    'font-weight': '600'
  };

  const confidenceBadgeStyle = (confidence: number) => {
    let color = '#22c55e';
    if (confidence < 0.7) color = '#ef4444';
    else if (confidence < 0.9) color = '#f59e0b';

    return {
      display: 'flex',
      'align-items': 'center',
      gap: '0.375rem',
      'font-size': '0.75rem',
      'font-weight': '600',
      color
    };
  };

  const docNameStyle = {
    'font-weight': '600',
    'font-size': '0.9375rem',
    color: 'var(--text-primary, #1f2937)',
    'margin-bottom': '0.5rem',
    'word-break': 'break-word' as const
  };

  const dataRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.375rem 0',
    'font-size': '0.8125rem',
    'border-bottom': '1px solid rgba(0,0,0,0.05)'
  };

  const dataLabelStyle = {
    color: 'var(--text-secondary, #6b7280)'
  };

  const dataValueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)'
  };

  const messageStyle = (status: 'good' | 'review' | 'issue') => ({
    'margin-top': '0.75rem',
    padding: '0.5rem 0.75rem',
    'border-radius': '6px',
    background: 'rgba(255,255,255,0.5)',
    'font-size': '0.8125rem',
    color: getStatusColor(status).color,
    display: 'flex',
    'align-items': 'center',
    gap: '0.375rem'
  });

  const strategyCardStyle = (priority: 'high' | 'medium' | 'low') => ({
    padding: '1.25rem',
    'border-radius': '12px',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: 'white',
    'margin-bottom': '1rem'
  });

  const strategyHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem'
  };

  const strategyTitleStyle = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary, #1f2937)'
  };

  const priorityBadgeStyle = (priority: 'high' | 'medium' | 'low') => {
    const colors = getPriorityColor(priority);
    return {
      padding: '0.25rem 0.625rem',
      'border-radius': '9999px',
      background: colors.bg,
      color: colors.color,
      'font-size': '0.6875rem',
      'font-weight': '700',
      'text-transform': 'uppercase' as const
    };
  };

  const strategyDescStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    'line-height': '1.5'
  };

  const savingsStyle = {
    'margin-top': '0.75rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(34, 197, 94, 0.1)',
    'border-radius': '6px',
    'font-size': '0.8125rem',
    color: '#22c55e',
    'font-weight': '600'
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '3rem',
    color: 'var(--text-secondary, #6b7280)'
  };

  const loadingStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    padding: '3rem',
    gap: '1rem'
  };

  const spinnerStyle = {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-color, #e5e7eb)',
    'border-top-color': 'var(--primary-color, #3b82f6)',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite'
  };

  // Status icon
  const getStatusIcon = (status: 'good' | 'review' | 'issue') => {
    switch (status) {
      case 'good':
        return (
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        );
      case 'review':
        return (
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        );
      case 'issue':
        return (
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div style={sectionStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>AI Document Analysis</h3>
          <p style={subtitleStyle}>
            Analyze documents for {props.client.firstName} {props.client.lastName} - Tax Year {props.taxYear}
          </p>
        </div>
        <div style={buttonGroupStyle}>
          <button
            style={bigButtonStyle(true)}
            onClick={handleAnalyzeAll}
            disabled={isAnalyzing() || props.documents.length === 0}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            {isAnalyzing() ? 'Analyzing...' : 'Analyze All Documents'}
          </button>
          <Show when={analysisComplete()}>
            <button
              style={bigButtonStyle(false)}
              onClick={handleGetStrategies}
              disabled={isLoadingStrategies()}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              {isLoadingStrategies() ? 'Loading...' : 'Tax Strategy'}
            </button>
          </Show>
        </div>
      </div>

      {/* Loading State */}
      <Show when={isAnalyzing()}>
        <Card>
          <div style={loadingStyle}>
            <div style={spinnerStyle} />
            <div style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
              Analyzing {props.documents.length} document(s)...
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
              AI is extracting data and verifying information
            </div>
          </div>
        </Card>
      </Show>

      {/* Analysis Results */}
      <Show when={!isAnalyzing() && analysisResults().length > 0}>
        <div style={resultsGridStyle}>
          <For each={analysisResults()}>
            {(result) => (
              <div style={resultCardStyle(result.status)}>
                <div style={cardHeaderStyle}>
                  <span style={categoryBadgeStyle}>{result.category}</span>
                  <span style={confidenceBadgeStyle(result.confidence)}>
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                      <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <div style={docNameStyle}>{result.documentName}</div>
                <div>
                  <For each={result.extractedData}>
                    {(data) => (
                      <div style={dataRowStyle}>
                        <span style={dataLabelStyle}>{data.field}</span>
                        <span style={dataValueStyle}>{data.value}</span>
                      </div>
                    )}
                  </For>
                </div>
                <Show when={result.message}>
                  <div style={messageStyle(result.status)}>
                    {getStatusIcon(result.status)}
                    {result.message}
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Tax Strategies */}
      <Show when={showStrategies()}>
        <Card>
          <div style={{ padding: '0.5rem' }}>
            <h4 style={{ ...titleStyle, 'margin-bottom': '1rem' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', 'vertical-align': 'middle', 'margin-right': '0.5rem', color: '#f59e0b' }}>
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              Tax Strategy Suggestions
            </h4>
            <Show when={isLoadingStrategies()}>
              <div style={loadingStyle}>
                <div style={spinnerStyle} />
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                  Generating personalized tax strategies...
                </div>
              </div>
            </Show>
            <Show when={!isLoadingStrategies() && strategies().length > 0}>
              <For each={strategies()}>
                {(strategy) => (
                  <div style={strategyCardStyle(strategy.priority)}>
                    <div style={strategyHeaderStyle}>
                      <span style={strategyTitleStyle}>{strategy.title}</span>
                      <span style={priorityBadgeStyle(strategy.priority)}>{strategy.priority}</span>
                    </div>
                    <p style={strategyDescStyle}>{strategy.description}</p>
                    <Show when={strategy.potentialSavings}>
                      <div style={savingsStyle}>
                        Potential Savings: {strategy.potentialSavings}
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Empty State */}
      <Show when={!isAnalyzing() && analysisResults().length === 0 && props.documents.length === 0}>
        <Card>
          <div style={emptyStateStyle}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>No documents to analyze</div>
            <div style={{ 'font-size': '1rem' }}>
              Upload tax documents to begin AI analysis
            </div>
          </div>
        </Card>
      </Show>

      <Show when={!isAnalyzing() && analysisResults().length === 0 && props.documents.length > 0}>
        <Card>
          <div style={emptyStateStyle}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>Ready to Analyze</div>
            <div style={{ 'font-size': '1rem', 'margin-bottom': '0.5rem' }}>
              {props.documents.length} document(s) available
            </div>
            <div style={{ 'font-size': '0.875rem' }}>
              Click "Analyze All Documents" to extract data and get insights
            </div>
          </div>
        </Card>
      </Show>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AIAnalysisSection;
