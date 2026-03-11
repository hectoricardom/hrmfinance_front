import { Component, Show, For, createSignal, createMemo } from 'solid-js';
import { AISuggestion } from '../../types/supervisionTypes';

interface SimilarTransaction {
  description: string;
  amount: number;
  date: string;
}

interface SuggestionDetails {
  transactionType: string;
  suggestedAccountCode: string;
  suggestedAccountName: string;
  confidence: number;
  basedOnCount: number;
  similarTransactions?: SimilarTransaction[];
}

interface AISuggestionModalProps {
  isOpen: boolean;
  suggestion: AISuggestion | null;
  onClose: () => void;
  onDecision: (decision: 'accept' | 'accept_lock' | 'reject_change' | 'reject_ignore', alternateAccountCode?: string) => void;
}

type DecisionType = 'accept' | 'accept_lock' | 'reject_change' | 'reject_ignore';

// Mock account options for the account picker
const mockAccounts = [
  { code: '1010', name: 'Cash' },
  { code: '1015', name: 'Crypto Wallet' },
  { code: '1020', name: 'Checking Account' },
  { code: '1100', name: 'Accounts Receivable' },
  { code: '2000', name: 'Accounts Payable' },
  { code: '4000', name: 'Sales Revenue' },
  { code: '5000', name: 'Cost of Goods Sold' },
  { code: '6000', name: 'Operating Expenses' },
];

// Mock similar transactions
const mockSimilarTransactions: SimilarTransaction[] = [
  { description: 'BTC payment', amount: 150.00, date: '2024-01-14' },
  { description: 'ETH payment', amount: 89.50, date: '2024-01-13' },
  { description: 'BTC payment', amount: 200.00, date: '2024-01-12' },
];

const AISuggestionModal: Component<AISuggestionModalProps> = (props) => {
  const [decision, setDecision] = createSignal<DecisionType | null>(null);
  const [alternateAccount, setAlternateAccount] = createSignal<string | null>(null);
  const [showAccountPicker, setShowAccountPicker] = createSignal(false);
  const [accountSearchQuery, setAccountSearchQuery] = createSignal('');
  const [isHoveringSkip, setIsHoveringSkip] = createSignal(false);
  const [isHoveringApply, setIsHoveringApply] = createSignal(false);

  // Extract suggestion details from the AISuggestion
  const suggestionDetails = createMemo((): SuggestionDetails | null => {
    const suggestion = props.suggestion;
    if (!suggestion) return null;

    // Try to extract details from suggestedValue if it's an object
    const suggestedValue = suggestion.suggestedValue as Record<string, unknown> | undefined;

    return {
      transactionType: suggestedValue?.transactionType as string || suggestion.description.split(':')[0] || 'Unknown',
      suggestedAccountCode: suggestedValue?.accountCode as string || '1015',
      suggestedAccountName: suggestedValue?.accountName as string || 'Crypto Wallet',
      confidence: Math.round(suggestion.confidence * 100),
      basedOnCount: suggestedValue?.basedOnCount as number || 15,
      similarTransactions: suggestedValue?.similarTransactions as SimilarTransaction[] || mockSimilarTransactions,
    };
  });

  const filteredAccounts = createMemo(() => {
    const query = accountSearchQuery().toLowerCase();
    if (!query) return mockAccounts;
    return mockAccounts.filter(
      acc => acc.code.toLowerCase().includes(query) || acc.name.toLowerCase().includes(query)
    );
  });

  const handleDecisionChange = (newDecision: DecisionType) => {
    setDecision(newDecision);
    if (newDecision === 'reject_change') {
      setShowAccountPicker(true);
    } else {
      setShowAccountPicker(false);
      setAlternateAccount(null);
    }
  };

  const handleAccountSelect = (accountCode: string) => {
    setAlternateAccount(accountCode);
  };

  const handleApply = () => {
    const currentDecision = decision();
    if (!currentDecision) return;

    if (currentDecision === 'reject_change') {
      props.onDecision(currentDecision, alternateAccount() || undefined);
    } else {
      props.onDecision(currentDecision);
    }
  };

  const handleSkip = () => {
    props.onClose();
  };

  const isApplyDisabled = createMemo(() => {
    const currentDecision = decision();
    if (!currentDecision) return true;
    if (currentDecision === 'reject_change' && !alternateAccount()) return true;
    return false;
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#10B981';
    if (confidence >= 60) return '#F59E0B';
    return '#EF4444';
  };

  // Styles
  const overlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    'background-color': 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
    padding: '1rem',
  };

  const modalStyle = {
    'background-color': '#FFFFFF',
    'border-radius': '0.75rem',
    'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    'max-width': '40rem',
    'max-height': '90vh',
    overflow: 'hidden',
    display: 'flex',
    'flex-direction': 'column' as const,
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem 1.5rem',
    'border-bottom': '1px solid #E5E7EB',
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    color: '#FFFFFF',
  };

  const headerTitleStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '1.125rem',
    'font-weight': '600',
    margin: '0',
  };

  const closeButtonStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    'border-radius': '0.375rem',
    color: '#FFFFFF',
    cursor: 'pointer',
    padding: '0.5rem',
    'font-size': '1.25rem',
    'line-height': '1',
    transition: 'background-color 0.2s ease',
  };

  const contentStyle = {
    padding: '1.5rem',
    'overflow-y': 'auto' as const,
    flex: '1',
  };

  const detectedPatternStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(79, 70, 229, 0.05)',
    'border-radius': '0.5rem',
    'margin-bottom': '1.5rem',
    color: '#4F46E5',
    'font-size': '0.9375rem',
  };

  const sectionTitleStyle = {
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
    color: '#6B7280',
    'margin-bottom': '0.75rem',
  };

  const suggestionCardStyle = {
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    'border-radius': '0.5rem',
    padding: '1rem',
    'margin-bottom': '1.5rem',
  };

  const suggestionRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0',
    'border-bottom': '1px solid #E5E7EB',
  };

  const suggestionRowLastStyle = {
    ...suggestionRowStyle,
    'border-bottom': 'none',
  };

  const suggestionLabelStyle = {
    color: '#6B7280',
    'font-size': '0.875rem',
  };

  const suggestionValueStyle = {
    color: '#111827',
    'font-weight': '500',
    'font-size': '0.875rem',
  };

  const confidenceBarContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
  };

  const confidenceBarBgStyle = {
    width: '100px',
    height: '8px',
    background: '#E5E7EB',
    'border-radius': '4px',
    overflow: 'hidden',
  };

  const transactionsListStyle = {
    'margin-bottom': '1.5rem',
  };

  const transactionItemStyle = {
    display: 'flex',
    'align-items': 'center',
    padding: '0.625rem 0',
    'border-left': '2px solid #E5E7EB',
    'padding-left': '1rem',
    'margin-left': '0.5rem',
    position: 'relative' as const,
  };

  const transactionDotStyle = {
    position: 'absolute' as const,
    left: '-0.3125rem',
    width: '0.5rem',
    height: '0.5rem',
    'border-radius': '50%',
    background: '#9CA3AF',
  };

  const transactionContentStyle = {
    flex: '1',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
  };

  const transactionDescStyle = {
    color: '#374151',
    'font-size': '0.875rem',
  };

  const transactionMetaStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'center',
    color: '#6B7280',
    'font-size': '0.8125rem',
  };

  const decisionSectionStyle = {
    'margin-bottom': '1.5rem',
  };

  const radioGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem',
  };

  const radioOptionStyle = (isSelected: boolean) => ({
    display: 'flex',
    'align-items': 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    'border-radius': '0.5rem',
    border: `2px solid ${isSelected ? '#4F46E5' : '#E5E7EB'}`,
    background: isSelected ? 'rgba(79, 70, 229, 0.05)' : '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const radioCircleStyle = (isSelected: boolean) => ({
    width: '1.25rem',
    height: '1.25rem',
    'min-width': '1.25rem',
    'border-radius': '50%',
    border: `2px solid ${isSelected ? '#4F46E5' : '#D1D5DB'}`,
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'margin-top': '0.125rem',
  });

  const radioInnerCircleStyle = {
    width: '0.625rem',
    height: '0.625rem',
    'border-radius': '50%',
    background: '#4F46E5',
  };

  const radioLabelStyle = {
    'font-size': '0.9375rem',
    color: '#374151',
  };

  const radioHintStyle = {
    'font-size': '0.8125rem',
    color: '#9CA3AF',
    'margin-top': '0.25rem',
  };

  const accountPickerStyle = {
    'margin-top': '1rem',
    'margin-left': '2rem',
    padding: '1rem',
    background: '#F9FAFB',
    'border-radius': '0.5rem',
    border: '1px solid #E5E7EB',
  };

  const searchInputStyle = {
    width: '100%',
    padding: '0.625rem 1rem',
    'border-radius': '0.375rem',
    border: '1px solid #D1D5DB',
    'font-size': '0.875rem',
    'margin-bottom': '0.75rem',
    outline: 'none',
  };

  const accountListStyle = {
    'max-height': '150px',
    'overflow-y': 'auto' as const,
    border: '1px solid #E5E7EB',
    'border-radius': '0.375rem',
    background: '#FFFFFF',
  };

  const accountOptionStyle = (isSelected: boolean) => ({
    padding: '0.625rem 1rem',
    cursor: 'pointer',
    'border-bottom': '1px solid #F3F4F6',
    background: isSelected ? 'rgba(79, 70, 229, 0.1)' : '#FFFFFF',
    color: isSelected ? '#4F46E5' : '#374151',
    transition: 'background-color 0.15s ease',
  });

  const footerStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    'border-top': '1px solid #E5E7EB',
    background: '#F9FAFB',
  };

  const skipButtonStyle = () => ({
    padding: '0.625rem 1.25rem',
    'border-radius': '0.375rem',
    border: '1px solid #D1D5DB',
    background: isHoveringSkip() ? '#F3F4F6' : '#FFFFFF',
    color: '#4B5563',
    'font-size': '0.875rem',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const applyButtonStyle = () => {
    const disabled = isApplyDisabled();
    return {
      padding: '0.625rem 1.25rem',
      'border-radius': '0.375rem',
      border: 'none',
      background: disabled ? '#D1D5DB' : (isHoveringApply() ? '#4338CA' : '#4F46E5'),
      color: '#FFFFFF',
      'font-size': '0.875rem',
      'font-weight': '500',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      opacity: disabled ? '0.6' : '1',
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Show when={props.isOpen && props.suggestion}>
      <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && props.onClose()}>
        <div style={modalStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <h2 style={headerTitleStyle}>
              <span style={{ 'font-size': '1.5rem' }}>AI SUGGESTION REVIEW</span>
            </h2>
            <button
              style={closeButtonStyle}
              onClick={props.onClose}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              X
            </button>
          </div>

          {/* Content */}
          <div style={contentStyle}>
            {/* Detected Pattern Banner */}
            <div style={detectedPatternStyle}>
              <span style={{ 'font-size': '1.25rem' }}>&#129302;</span>
              <span>AI detected a new pattern for: <strong>{suggestionDetails()?.transactionType || 'Unknown'}</strong></span>
            </div>

            {/* Suggested Mapping Card */}
            <div style={sectionTitleStyle}>SUGGESTED MAPPING:</div>
            <div style={suggestionCardStyle}>
              <div style={suggestionRowStyle}>
                <span style={suggestionLabelStyle}>Transaction Type:</span>
                <span style={suggestionValueStyle}>{suggestionDetails()?.transactionType}</span>
              </div>
              <div style={suggestionRowStyle}>
                <span style={suggestionLabelStyle}>Suggested Account:</span>
                <span style={suggestionValueStyle}>
                  {suggestionDetails()?.suggestedAccountCode} - {suggestionDetails()?.suggestedAccountName}
                </span>
              </div>
              <div style={suggestionRowStyle}>
                <span style={suggestionLabelStyle}>Confidence:</span>
                <div style={confidenceBarContainerStyle}>
                  <span style={{
                    ...suggestionValueStyle,
                    color: getConfidenceColor(suggestionDetails()?.confidence || 0)
                  }}>
                    {suggestionDetails()?.confidence}%
                  </span>
                  <div style={confidenceBarBgStyle}>
                    <div style={{
                      width: `${suggestionDetails()?.confidence || 0}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${getConfidenceColor(suggestionDetails()?.confidence || 0)}, ${getConfidenceColor((suggestionDetails()?.confidence || 0) + 10)})`,
                      'border-radius': '4px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>
              <div style={suggestionRowLastStyle}>
                <span style={suggestionLabelStyle}>Based on:</span>
                <span style={suggestionValueStyle}>{suggestionDetails()?.basedOnCount} similar transactions</span>
              </div>
            </div>

            {/* Similar Transactions */}
            <div style={transactionsListStyle}>
              <div style={sectionTitleStyle}>SIMILAR TRANSACTIONS:</div>
              <For each={suggestionDetails()?.similarTransactions || []}>
                {(transaction, index) => (
                  <div style={transactionItemStyle}>
                    <div style={transactionDotStyle} />
                    <div style={transactionContentStyle}>
                      <span style={transactionDescStyle}>
                        {index() === (suggestionDetails()?.similarTransactions?.length || 0) - 1 ? '---' : '|--'} {transaction.description}
                      </span>
                      <div style={transactionMetaStyle}>
                        <span>{formatCurrency(transaction.amount)}</span>
                        <span>({formatDate(transaction.date)})</span>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Decision Section */}
            <div style={decisionSectionStyle}>
              <div style={sectionTitleStyle}>YOUR DECISION:</div>
              <div style={radioGroupStyle}>
                {/* Accept suggestion */}
                <div
                  style={radioOptionStyle(decision() === 'accept')}
                  onClick={() => handleDecisionChange('accept')}
                >
                  <div style={radioCircleStyle(decision() === 'accept')}>
                    <Show when={decision() === 'accept'}>
                      <div style={radioInnerCircleStyle} />
                    </Show>
                  </div>
                  <div>
                    <div style={radioLabelStyle}>Accept suggestion (auto-lock at 90%)</div>
                    <div style={radioHintStyle}>Will automatically lock when confidence reaches 90%</div>
                  </div>
                </div>

                {/* Accept & lock now */}
                <div
                  style={radioOptionStyle(decision() === 'accept_lock')}
                  onClick={() => handleDecisionChange('accept_lock')}
                >
                  <div style={radioCircleStyle(decision() === 'accept_lock')}>
                    <Show when={decision() === 'accept_lock'}>
                      <div style={radioInnerCircleStyle} />
                    </Show>
                  </div>
                  <div>
                    <div style={radioLabelStyle}>Accept & lock now</div>
                    <div style={radioHintStyle}>Apply the mapping and prevent future AI modifications</div>
                  </div>
                </div>

                {/* Reject & set different */}
                <div
                  style={radioOptionStyle(decision() === 'reject_change')}
                  onClick={() => handleDecisionChange('reject_change')}
                >
                  <div style={radioCircleStyle(decision() === 'reject_change')}>
                    <Show when={decision() === 'reject_change'}>
                      <div style={radioInnerCircleStyle} />
                    </Show>
                  </div>
                  <div>
                    <div style={radioLabelStyle}>Reject & set different account</div>
                    <div style={radioHintStyle}>Choose a different account for this pattern</div>
                  </div>
                </div>

                {/* Account Picker */}
                <Show when={showAccountPicker()}>
                  <div style={accountPickerStyle}>
                    <input
                      type="text"
                      placeholder="Search accounts by code or name..."
                      style={searchInputStyle}
                      value={accountSearchQuery()}
                      onInput={(e) => setAccountSearchQuery(e.currentTarget.value)}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#4F46E5'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                    />
                    <div style={accountListStyle}>
                      <For each={filteredAccounts()}>
                        {(account) => (
                          <div
                            style={accountOptionStyle(alternateAccount() === account.code)}
                            onClick={() => handleAccountSelect(account.code)}
                            onMouseEnter={(e) => {
                              if (alternateAccount() !== account.code) {
                                e.currentTarget.style.background = '#F3F4F6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (alternateAccount() !== account.code) {
                                e.currentTarget.style.background = '#FFFFFF';
                              }
                            }}
                          >
                            <strong>{account.code}</strong> - {account.name}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Reject & ignore */}
                <div
                  style={radioOptionStyle(decision() === 'reject_ignore')}
                  onClick={() => handleDecisionChange('reject_ignore')}
                >
                  <div style={radioCircleStyle(decision() === 'reject_ignore')}>
                    <Show when={decision() === 'reject_ignore'}>
                      <div style={radioInnerCircleStyle} />
                    </Show>
                  </div>
                  <div>
                    <div style={radioLabelStyle}>Reject & ignore pattern</div>
                    <div style={radioHintStyle}>Dismiss this suggestion and don't apply any mapping</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <button
              style={skipButtonStyle()}
              onClick={handleSkip}
              onMouseEnter={() => setIsHoveringSkip(true)}
              onMouseLeave={() => setIsHoveringSkip(false)}
            >
              Skip for Now
            </button>
            <button
              style={applyButtonStyle()}
              onClick={handleApply}
              disabled={isApplyDisabled()}
              onMouseEnter={() => setIsHoveringApply(true)}
              onMouseLeave={() => setIsHoveringApply(false)}
            >
              Apply Decision
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default AISuggestionModal;
