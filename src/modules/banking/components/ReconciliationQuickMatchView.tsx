/**
 * View 1: Quick Match Card View
 *
 * A card-based, mobile-friendly view that shows one transaction at a time
 * with suggested matches. Users can quickly accept/skip with buttons or swipe gestures.
 *
 * Best for: Mobile users, beginners, small transaction volumes
 */
import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { Button } from '../../ui';
import { bankConsolidationStore, BankStatement, EntryBookRecord } from '../stores/bankConsolidationStore';
import { useTranslation } from '../../../translations';

interface ReconciliationQuickMatchViewProps {
  bankAccountId: string;
  selectedPeriod: { start: string; end: string };
  bankStatements: BankStatement[];
  entryBookRecords: EntryBookRecord[];
}

const ReconciliationQuickMatchView: Component<ReconciliationQuickMatchViewProps> = (props) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [selectedMatch, setSelectedMatch] = createSignal<string | null>(null);
  const [showAllMatches, setShowAllMatches] = createSignal(false);
  const [isAnimating, setIsAnimating] = createSignal(false);
  const [animationDirection, setAnimationDirection] = createSignal<'left' | 'right' | null>(null);

  // Get unreconciled bank statements from props
  const unreconciledStatements = createMemo(() => {
    return props.bankStatements
      .filter(s =>
        !s.isReconciled
        // && s.date >= props.selectedPeriod.start &&
        //s.date <= props.selectedPeriod.end
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  // Get current statement
  const currentStatement = (() => {
    const statements = unreconciledStatements();

    //console.log("currentStatement ",props.bankStatements, props.selectedPeriod, unreconciledStatements())
    const idx = currentIndex();
    return idx < statements.length ? statements[idx] : null;
  });

  // Get matches for current statement
  const currentMatches = (() => {
    const stmt = currentStatement();
    if (!stmt) return [];
    return bankConsolidationStore.getMatchDetails(stmt.id);
  });

  // Best match (highest score)
  const bestMatch = (() => {
    const matches = currentMatches();
    return matches.length > 0 ? matches[0] : null;
  });

  // Progress stats using props
  const stats = createMemo(() => {
    const allStatements = props.bankStatements
    /** 
      .filter(s =>
      //  s.date >= props.selectedPeriod.start &&
        s.date <= props.selectedPeriod.end
      );
    */
    const total = allStatements.length;
    const reconciled = allStatements.filter(s => s.isReconciled).length;

    return {
      total,
      reconciled,
      remaining: unreconciledStatements().length,
      progress: total > 0 ? Math.round((reconciled / total) * 100) : 0
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 8) return '#4caf50'; // Green
    if (score >= 6) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 8) return t('banking.exactMatch', 'Coincidencia exacta');
    if (score >= 6) return t('banking.goodMatch', 'Buena coincidencia');
    return t('banking.possibleMatch', 'Posible coincidencia');
  };

  const handleAcceptMatch = async (entryBookRecordId: string) => {
    const stmt = currentStatement();
    if (!stmt) return;

    setAnimationDirection('right');
    setIsAnimating(true);

    setTimeout(() => {
      bankConsolidationStore.reconcileTransaction(stmt.id, entryBookRecordId);

      setSelectedMatch(null);
      setShowAllMatches(false);
      setIsAnimating(false);
      setAnimationDirection(null);
      // Index stays same because list shrinks
    }, 300);
  };

  const handleSkip = () => {
    setAnimationDirection('left');
    setIsAnimating(true);

    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, unreconciledStatements().length - 1));
      setSelectedMatch(null);
      setShowAllMatches(false);
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 300);
  };

  const handlePrevious = () => {
    if (currentIndex() > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedMatch(null);
      setShowAllMatches(false);
    }
  };

  // Container styles
  const containerStyle = {
    'max-width': '500px',
    margin: '0 auto',
    padding: '1rem'
  };

  const progressBarStyle = {
    width: '100%',
    height: '8px',
    background: 'var(--gray-200)',
    'border-radius': '4px',
    overflow: 'hidden',
    'margin-bottom': '1rem'
  };

  const progressFillStyle = () => ({
    width: `${stats().progress}%`,
    height: '100%',
    background: 'var(--primary-color)',
    transition: 'width 0.3s ease'
  });

  const cardStyle = () => ({
    background: 'var(--surface-color)',
    'border-radius': '12px',
    'box-shadow': '0 4px 20px rgba(0,0,0,0.1)',
    padding: '1.5rem',
    'margin-bottom': '1rem',
    transform: isAnimating()
      ? animationDirection() === 'right'
        ? 'translateX(100%) rotate(5deg)'
        : 'translateX(-100%) rotate(-5deg)'
      : 'translateX(0)',
    opacity: isAnimating() ? 0 : 1,
    transition: 'transform 0.3s ease, opacity 0.3s ease'
  });

  const bankIconStyle = {
    width: '48px',
    height: '48px',
    background: 'var(--primary-light, #e3f2fd)',
    'border-radius': '50%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '1.5rem',
    'margin-right': '1rem'
  };

  const matchCardStyle = (isSelected: boolean, score: number) => ({
    background: isSelected ? 'var(--primary-light, #e3f2fd)' : 'var(--gray-50)',
    border: `2px solid ${isSelected ? 'var(--primary-color)' : 'transparent'}`,
    'border-radius': '8px',
    padding: '1rem',
    'margin-top': '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    'border-left': `4px solid ${getConfidenceColor(score)}`
  });

  const buttonGroupStyle = {
    display: 'flex',
    gap: '0.75rem',
    'margin-top': '1.5rem'
  };

  return (
    <div style={containerStyle}>
      {/* Progress Header */}
      <div style={{ 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>
          {t('banking.quickReconciliation', 'Conciliación Rápida')}
        </h3>
        <div style={{ color: 'var(--text-muted)', 'font-size': '0.9rem', 'margin-bottom': '0.5rem' }}>
          {stats().reconciled} {t('common.of', 'de')} {stats().total} {t('banking.reconciled', 'conciliados')}
        </div>
        <div style={progressBarStyle}>
          <div style={progressFillStyle()} />
        </div>
        <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
          {stats().remaining} {t('banking.remaining', 'pendientes')}
        </div>
      </div>

      {/* Main Card */}
      <Show when={currentStatement()} fallback={
        <div style={{
          'text-align': 'center',
          padding: '3rem',
          background: 'var(--surface-color)',
          'border-radius': '12px'
        }}>
          <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>🎉</div>
          <h3>{t('banking.allReconciled', 'Todo Conciliado')}</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {t('banking.noMoreToReconcile', 'No hay más transacciones pendientes')}
          </p>
        </div>
      }>
        <div style={cardStyle()}>
          {/* Bank Statement Header */}
          <div style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <div style={bankIconStyle}>🏦</div>
            <div style={{ flex: 1 }}>
              <div style={{ 'font-weight': '600', 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                {t('banking.bankStatement', 'Estado de Cuenta')}
              </div>
              <div style={{ 'font-size': '0.9rem' }}>
                {formatDate(currentStatement()!.date)}
              </div>
            </div>
            <div style={{ 'text-align': 'right' }}>
              <div style={{
                'font-size': '1.25rem',
                'font-weight': '700',
                color: currentStatement()!.debitAmount > 0 ? '#4caf50' : '#f44336'
              }}>
                {currentStatement()!.debitAmount > 0
                  ? formatCurrency(currentStatement()!.debitAmount)
                  : `-${formatCurrency(currentStatement()!.creditAmount)}`
                }
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            background: 'var(--gray-50)',
            padding: '0.75rem',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <div style={{ 'font-weight': '500' }}>{currentStatement()!.description}</div>
            <Show when={currentStatement()!.reference}>
              <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                Ref: {currentStatement()!.reference}
              </div>
            </Show>
          </div>

          {/* Suggested Matches */}
          <Show when={currentMatches().length > 0} fallback={
            <div style={{
              'text-align': 'center',
              padding: '1.5rem',
              background: 'var(--gray-50)',
              'border-radius': '8px',
              color: 'var(--text-muted)'
            }}>
              <div style={{ 'font-size': '1.5rem', 'margin-bottom': '0.5rem' }}>🔍</div>
              {t('banking.noMatchesFound', 'No se encontraron coincidencias')}
            </div>
          }>
            <div style={{ 'font-weight': '600', 'font-size': '0.85rem', 'margin-bottom': '0.5rem', color: 'var(--text-muted)' }}>
              📊 {t('banking.suggestedMatches', 'Coincidencias Sugeridas')}
            </div>

            {/* Best Match */}
            <Show when={bestMatch() && !showAllMatches()}>
              <div
                style={matchCardStyle(selectedMatch() === bestMatch()!.record.id, bestMatch()!.score)}
                onClick={() => setSelectedMatch(bestMatch()!.record.id)}
              >
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'inline-flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      'margin-bottom': '0.5rem'
                    }}>
                      <span style={{
                        background: getConfidenceColor(bestMatch()!.score),
                        color: 'white',
                        'font-size': '0.7rem',
                        padding: '0.2rem 0.5rem',
                        'border-radius': '4px',
                        'font-weight': '600'
                      }}>
                        {Math.round(bestMatch()!.score * 10)}%
                      </span>
                      <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {getConfidenceLabel(bestMatch()!.score)}
                      </span>
                    </div>
                    <div style={{ 'font-weight': '500' }}>{bestMatch()!.record.description}</div>
                    <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
                      {formatDate(bestMatch()!.record.date)}
                    </div>
                  </div>
                  <div style={{
                    'font-weight': '600',
                    color: bestMatch()!.record.debitAmount > 0 ? '#4caf50' : '#f44336'
                  }}>
                    {bestMatch()!.record.debitAmount > 0
                      ? formatCurrency(bestMatch()!.record.debitAmount)
                      : `-${formatCurrency(bestMatch()!.record.creditAmount)}`
                    }
                  </div>
                </div>

                {/* Match Reasons */}
                <div style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem' }}>
                  <For each={bestMatch()!.reasons.slice(0, 3)}>
                    {(reason) => (
                      <span style={{
                        display: 'inline-block',
                        background: 'var(--gray-200)',
                        padding: '0.15rem 0.4rem',
                        'border-radius': '4px',
                        'margin-right': '0.25rem',
                        'margin-bottom': '0.25rem'
                      }}>
                        ✓ {reason}
                      </span>
                    )}
                  </For>
                </div>
              </div>

              <Show when={currentMatches().length > 1}>
                <button
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: '1px dashed var(--border-color)',
                    'border-radius': '8px',
                    'margin-top': '0.5rem',
                    cursor: 'pointer',
                    color: 'var(--primary-color)',
                    'font-size': '0.85rem'
                  }}
                  onClick={() => setShowAllMatches(true)}
                >
                  {t('banking.viewOtherMatches', 'Ver otras')} ({currentMatches().length - 1} {t('common.more', 'más')})
                </button>
              </Show>
            </Show>

            {/* All Matches */}
            <Show when={showAllMatches()}>
              <For each={currentMatches()}>
                {(match) => (
                  <div
                    style={matchCardStyle(selectedMatch() === match.record.id, match.score)}
                    onClick={() => setSelectedMatch(match.record.id)}
                  >
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                      <div>
                        <span style={{
                          background: getConfidenceColor(match.score),
                          color: 'white',
                          'font-size': '0.7rem',
                          padding: '0.15rem 0.4rem',
                          'border-radius': '4px',
                          'margin-right': '0.5rem'
                        }}>
                          {Math.round(match.score * 10)}%
                        </span>
                        <span style={{ 'font-weight': '500' }}>{match.record.description}</span>
                      </div>
                      <span style={{
                        'font-weight': '600',
                        color: match.record.debitAmount > 0 ? '#4caf50' : '#f44336'
                      }}>
                        {match.record.debitAmount > 0
                          ? formatCurrency(match.record.debitAmount)
                          : `-${formatCurrency(match.record.creditAmount)}`
                        }
                      </span>
                    </div>
                  </div>
                )}
              </For>
              <button
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  'font-size': '0.85rem',
                  'margin-top': '0.5rem'
                }}
                onClick={() => setShowAllMatches(false)}
              >
                {t('common.showLess', 'Mostrar menos')}
              </button>
            </Show>
          </Show>

          {/* Action Buttons */}
          <div style={buttonGroupStyle}>
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex() === 0}
              style={{ flex: 1 }}
            >
              ← {t('common.previous', 'Anterior')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSkip}
              style={{ flex: 1 }}
            >
              {t('common.skip', 'Omitir')} →
            </Button>
          </div>

          <Show when={selectedMatch() || (bestMatch() && currentMatches().length === 1)}>
            <Button
              variant="primary"
              onClick={() => handleAcceptMatch(selectedMatch() || bestMatch()!.record.id)}
              style={{ width: '100%', 'margin-top': '0.75rem' }}
            >
              ✓ {t('banking.acceptMatch', 'Aceptar Coincidencia')}
            </Button>
          </Show>
        </div>
      </Show>

      {/* Navigation indicator */}
      <Show when={unreconciledStatements().length > 1}>
        <div style={{
          'text-align': 'center',
          color: 'var(--text-muted)',
          'font-size': '0.85rem'
        }}>
          {currentIndex() + 1} / {unreconciledStatements().length}
        </div>
      </Show>
    </div>
  );
};

export default ReconciliationQuickMatchView;
