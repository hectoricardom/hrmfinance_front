import { Component, createSignal, createEffect, onMount, onCleanup, createMemo, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import StageNavigator from './StageNavigator';
import Stage1DataIngestion from './stages/Stage1DataIngestion';
import Stage2AdapterTransform from './stages/Stage2AdapterTransform';
import Stage3InvoiceConversion from './stages/Stage3InvoiceConversion';
import Stage4AccountMapping from './stages/Stage4AccountMapping';
import Stage5RulesEngine from './stages/Stage5RulesEngine';
import Stage6EntryBookGen from './stages/Stage6EntryBookGen';
import Stage7LearningPersist from './stages/Stage7LearningPersist';
import { getSampleBySource, type DataSource } from '../data/sampleData';
import { accountingFlowApi, type FlowProcessingResult } from '../services/accountingFlowApi';

export interface AccountingFlowVisualizationProps {
  initialSource?: string;
}

type PlaybackSpeed = 0.5 | 1 | 2;
type ProcessingMode = 'sample' | 'api';

const TOTAL_STAGES = 7;
const STAGE_DURATION_MS = 3000; // Base duration per stage at 1x speed

const AccountingFlowVisualization: Component<AccountingFlowVisualizationProps> = (props) => {
  const [currentStage, setCurrentStage] = createSignal(1);
  const [completedStages, setCompletedStages] = createSignal<number[]>([]);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [playbackSpeed, setPlaybackSpeed] = createSignal<PlaybackSpeed>(1);
  const [transitionClass, setTransitionClass] = createSignal<'entering' | 'visible' | 'exiting'>('visible');
  const [selectedSource, setSelectedSource] = createSignal<DataSource>((props.initialSource as DataSource) || 'stripe');

  // API Processing state
  const [processingMode, setProcessingMode] = createSignal<ProcessingMode>('sample');
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [apiResult, setApiResult] = createSignal<FlowProcessingResult | null>(null);
  const [apiError, setApiError] = createSignal<string | null>(null);
  const [manualData, setManualData] = createSignal<Record<string, unknown> | null>(null);

  let playbackInterval: number | undefined;

  // Get sample data for the selected source
  const sampleData = createMemo(() => getSampleBySource(selectedSource()));

  // Get raw data (manual edited or sample)
  const currentRawData = createMemo(() => {
    if (selectedSource() === 'manual' && manualData()) {
      return manualData()!;
    }
    return sampleData().rawInput;
  });

  // Handle source change
  const handleSourceChange = (source: DataSource) => {
    setSelectedSource(source);
    setManualData(null);
    setApiResult(null);
    setApiError(null);
    setProcessingMode('sample');
    // Reset to stage 1 when source changes
    setCurrentStage(1);
    setCompletedStages([]);
  };

  // Handle manual data change
  const handleManualDataChange = (data: Record<string, unknown>) => {
    setManualData(data);
    setApiResult(null);
    setApiError(null);
  };

  // Process with real API
  const processWithApi = async () => {
    setIsProcessing(true);
    setApiError(null);
    setProcessingMode('api');

    try {
      const result = await accountingFlowApi.processTransaction(
        selectedSource(),
        currentRawData()
      );

      if (result.success) {
        setApiResult(result);
        setCurrentStage(1);
        setCompletedStages([]);
      } else {
        setApiError(result.error || 'Processing failed');
        setProcessingMode('sample');
      }
    } catch (error) {
      setApiError((error as Error).message);
      setProcessingMode('sample');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute and create entry book
  const executeAndCreate = async () => {
    setIsProcessing(true);
    try {
      const result = await accountingFlowApi.executeAndCreateEntryBook(
        'invoice_completed',
        currentRawData()
      );

      if (result.success) {
        alert('Entry book created successfully!');
      } else {
        alert('Failed to create entry book: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Playback control functions
  const play = () => {
    if (currentStage() >= TOTAL_STAGES && completedStages().length === TOTAL_STAGES) {
      reset();
    }
    setIsPlaying(true);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentStage(1);
    setCompletedStages([]);
    setTransitionClass('visible');
  };

  const goToStage = (stageNumber: number) => {
    if (stageNumber < 1 || stageNumber > TOTAL_STAGES) return;

    setTransitionClass('exiting');
    setTimeout(() => {
      setCurrentStage(stageNumber);
      // Update completed stages based on navigation
      const newCompleted = Array.from({ length: stageNumber - 1 }, (_, i) => i + 1);
      setCompletedStages(newCompleted);
      setTransitionClass('entering');
      setTimeout(() => setTransitionClass('visible'), 50);
    }, 200);
  };

  const nextStage = () => {
    if (currentStage() < TOTAL_STAGES) {
      setTransitionClass('exiting');
      setTimeout(() => {
        setCompletedStages(prev => [...prev, currentStage()]);
        setCurrentStage(prev => prev + 1);
        setTransitionClass('entering');
        setTimeout(() => setTransitionClass('visible'), 50);
      }, 200);
    } else {
      setCompletedStages(prev => [...prev, TOTAL_STAGES]);
      setIsPlaying(false);
    }
  };

  const prevStage = () => {
    if (currentStage() > 1) {
      goToStage(currentStage() - 1);
    }
  };

  // Auto-advance effect
  createEffect(() => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = undefined;
    }

    if (isPlaying()) {
      const interval = STAGE_DURATION_MS / playbackSpeed();
      playbackInterval = window.setInterval(() => {
        nextStage();
      }, interval);
    }
  });

  // Keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        isPlaying() ? pause() : play();
        break;
      case 'ArrowRight':
        e.preventDefault();
        pause();
        nextStage();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        pause();
        prevStage();
        break;
      case 'KeyR':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          reset();
        }
        break;
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
    if (playbackInterval) {
      clearInterval(playbackInterval);
    }
  });

  // Styles
  const containerStyle: JSX.CSSProperties = {
    display: 'grid',
    'grid-template-columns': '280px 1fr',
    'grid-template-rows': 'auto 1fr',
    height: '100vh',
    background: '#f8fafc',
    'font-family': 'system-ui, -apple-system, sans-serif',
  };

  const sidebarStyle: JSX.CSSProperties = {
    'grid-row': '1 / -1',
    'grid-column': '1',
    'overflow-y': 'auto',
  };

  const controlsBarStyle: JSX.CSSProperties = {
    'grid-column': '2',
    'grid-row': '1',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '16px 24px',
    background: 'white',
    'border-bottom': '1px solid #e2e8f0',
    'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.05)',
  };

  const controlsLeftStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '12px',
  };

  const controlButtonStyle = (isActive: boolean = false): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '40px',
    height: '40px',
    'border-radius': '10px',
    border: 'none',
    background: isActive ? '#3b82f6' : '#f1f5f9',
    color: isActive ? 'white' : '#475569',
    'font-size': '18px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const speedButtonStyle = (isSelected: boolean): JSX.CSSProperties => ({
    padding: '6px 12px',
    'border-radius': '6px',
    border: 'none',
    background: isSelected ? '#3b82f6' : 'transparent',
    color: isSelected ? 'white' : '#64748b',
    'font-size': '13px',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const speedContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '4px',
    background: '#f1f5f9',
    padding: '4px',
    'border-radius': '8px',
  };

  const progressContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '12px',
  };

  const progressBarStyle: JSX.CSSProperties = {
    width: '200px',
    height: '6px',
    background: '#e2e8f0',
    'border-radius': '3px',
    overflow: 'hidden',
  };

  const progressFillStyle = (): JSX.CSSProperties => ({
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
    'border-radius': '3px',
    width: `${(currentStage() / TOTAL_STAGES) * 100}%`,
    transition: 'width 0.3s ease',
  });

  const progressTextStyle: JSX.CSSProperties = {
    'font-size': '13px',
    'font-weight': '600',
    color: '#475569',
  };

  const contentAreaStyle: JSX.CSSProperties = {
    'grid-column': '2',
    'grid-row': '2',
    overflow: 'auto',
    padding: '24px',
  };

  const stageContainerStyle = (): JSX.CSSProperties => ({
    opacity: transitionClass() === 'visible' ? '1' : '0',
    transform: transitionClass() === 'exiting'
      ? 'translateX(-20px)'
      : transitionClass() === 'entering'
        ? 'translateX(20px)'
        : 'translateX(0)',
    transition: 'all 0.2s ease-out',
  });

  const keyboardHintStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '16px',
    'font-size': '12px',
    color: '#94a3b8',
  };

  const kbdStyle: JSX.CSSProperties = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': '24px',
    height: '24px',
    padding: '0 6px',
    background: '#f1f5f9',
    'border-radius': '4px',
    'font-size': '11px',
    'font-weight': '600',
    color: '#475569',
    border: '1px solid #e2e8f0',
    'margin-right': '4px',
  };

  // Prepare stage-specific data from sample data
  const getStage2Mappings = createMemo(() => {
    const data = sampleData();
    return data.fieldMappings.map(m => ({
      sourceField: m.sourceField,
      transform: m.transformationType || 'direct',
      targetField: m.targetField,
      confidence: Math.round(m.confidence * 100)
    }));
  });

  const getStage2Transaction = createMemo(() => {
    const data = sampleData();
    const st = data.standardTransaction;
    return {
      id: st.id,
      timestamp: st.date,
      amount: st.amount,
      currency: st.currency,
      description: st.description,
      reference: st.sourceId,
      metadata: st.metadata
    };
  });

  const getStage3Invoice = createMemo(() => {
    const data = sampleData();
    const st = data.standardTransaction;
    return {
      id: `INV-${st.sourceId}`,
      invoiceNumber: st.sourceId,
      date: st.date,
      customer: st.customer,
      lineItems: st.lineItems.map((item, idx) => ({
        id: `item-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
        accountCode: item.accountCode
      })),
      subtotal: st.lineItems.reduce((sum, item) => sum + item.totalPrice, 0),
      tax: st.taxes.reduce((sum, tax) => sum + tax.amount, 0),
      total: st.amount,
      payments: [{
        method: st.paymentMethod,
        amount: st.amount
      }],
      status: 'paid' as const
    };
  });

  const getStage4Decisions = createMemo(() => ({
    id: 'root',
    label: 'Transaction Type?',
    type: 'question' as const,
    children: [
      {
        id: 'product',
        label: 'Product Sale',
        type: 'account' as const,
        accountCode: '4001',
        accountType: 'Revenue' as const
      },
      {
        id: 'service',
        label: 'Service',
        type: 'account' as const,
        accountCode: '4101',
        accountType: 'Revenue' as const
      },
      {
        id: 'payment',
        label: 'Payment Method?',
        type: 'question' as const,
        children: [
          {
            id: 'cash',
            label: 'Cash',
            type: 'account' as const,
            accountCode: '1001',
            accountType: 'Asset' as const
          },
          {
            id: 'card',
            label: 'Credit Card',
            type: 'account' as const,
            accountCode: '1003',
            accountType: 'Asset' as const
          },
          {
            id: 'zelle',
            label: 'Zelle',
            type: 'account' as const,
            accountCode: '1002',
            accountType: 'Asset' as const
          }
        ]
      }
    ]
  }));

  const getStage4AccountInfo = createMemo(() => {
    const data = sampleData();
    const firstAccount = data.accountMappings[0];
    return {
      code: firstAccount.accountCode,
      name: firstAccount.accountName,
      type: firstAccount.accountType,
      description: firstAccount.description,
      normalBalance: firstAccount.debitAmount > 0 ? 'debit' as const : 'credit' as const
    };
  });

  const getStage5Rules = createMemo(() => {
    const data = sampleData();
    return [{
      id: 'rule-1',
      name: `${data.source.charAt(0).toUpperCase() + data.source.slice(1)} Payment Processing`,
      priority: 1,
      isActive: true,
      conditions: [
        { field: 'source', operator: 'equals' as const, value: data.source, result: true },
        { field: 'status', operator: 'equals' as const, value: 'completed', result: true },
        { field: 'amount', operator: 'greater_than' as const, value: 0, result: true }
      ],
      description: `Process ${data.source} transactions`
    }];
  });

  const getStage5JournalLines = createMemo(() => {
    const data = sampleData();
    return data.accountMappings.map(m => ({
      accountCode: m.accountCode,
      accountName: m.accountName,
      debit: m.debitAmount,
      credit: m.creditAmount,
      description: m.description
    }));
  });

  const getStage6Entries = createMemo(() => {
    const data = sampleData();
    return data.entryBook.lines.map(line => ({
      accountCode: line.accountCode,
      accountName: line.accountName,
      debit: line.debit || 0,
      credit: line.credit || 0
    }));
  });

  const getStage6Metadata = createMemo(() => {
    const data = sampleData();
    return {
      date: data.journalEntry.date,
      reference: data.journalEntry.reference,
      documentNumber: data.journalEntry.id,
      description: data.journalEntry.description,
      status: 'posted' as const
    };
  });

  // Render the current stage component
  const renderStageContent = () => {
    const stage = currentStage();
    const data = sampleData();
    const result = apiResult();
    const useApiData = processingMode() === 'api' && result?.success;

    switch (stage) {
      case 1:
        return (
          <Stage1DataIngestion
            selectedSource={selectedSource()}
            rawData={currentRawData()}
            onSourceChange={handleSourceChange}
            onManualDataChange={handleManualDataChange}
            validationStatus={isProcessing() ? 'pending' : apiError() ? 'error' : 'validated'}
            validationMessage={apiError() || undefined}
          />
        );
      case 2:
        // Use API result data if available, otherwise use sample data
        if (useApiData && result.stages.stage2) {
          const s2 = result.stages.stage2;
          return (
            <Stage2AdapterTransform
              sourceType={selectedSource()}
              mappings={s2.fieldMappings.map((m: any) => ({
                sourceField: m.sourceField,
                transform: m.transformationType || 'direct',
                targetField: m.targetField,
                confidence: Math.round((m.confidence || 0.9) * 100)
              }))}
              confidence={s2.confidence}
              standardTransaction={s2.standardTransaction}
              patterns={s2.patterns}
            />
          );
        }
        return (
          <Stage2AdapterTransform
            sourceType={selectedSource()}
            mappings={getStage2Mappings()}
            confidence={Math.round(data.fieldMappings.reduce((sum, m) => sum + m.confidence, 0) / data.fieldMappings.length * 100)}
            standardTransaction={getStage2Transaction()}
            patterns={[
              { type: 'currency', label: 'Currency', found: true, count: 1 },
              { type: 'date', label: 'Date', found: true, count: 1 },
              { type: 'reference', label: 'Reference', found: true, count: 2 },
              { type: 'email', label: 'Email', found: !!data.standardTransaction.customer.email }
            ]}
          />
        );
      case 3:
        if (useApiData && result.stages.stage3) {
          const s3 = result.stages.stage3;
          return (
            <Stage3InvoiceConversion
              standardTransaction={s3.standardTransaction}
              invoice={s3.invoice}
              accountAssignments={s3.accountAssignments}
              paymentAllocations={s3.paymentAllocations}
            />
          );
        }
        return (
          <Stage3InvoiceConversion
            standardTransaction={getStage2Transaction()}
            invoice={getStage3Invoice()}
            accountAssignments={data.accountMappings.map(m => ({
              accountCode: m.accountCode,
              accountName: m.accountName,
              amount: m.debitAmount || m.creditAmount,
              type: m.debitAmount > 0 ? 'debit' as const : 'credit' as const
            }))}
            paymentAllocations={[{
              method: data.standardTransaction.paymentMethod,
              amount: data.standardTransaction.amount
            }]}
          />
        );
      case 4:
        if (useApiData && result.stages.stage4) {
          const s4 = result.stages.stage4;
          return (
            <Stage4AccountMapping
              decisions={s4.decisions}
              selectedPath={s4.selectedPath}
              accountInfo={s4.accountInfo}
            />
          );
        }
        return (
          <Stage4AccountMapping
            decisions={getStage4Decisions()}
            selectedPath={['root', data.standardTransaction.paymentMethod === 'cash' ? 'cash' : data.standardTransaction.paymentMethod === 'zelle' ? 'zelle' : 'card']}
            accountInfo={getStage4AccountInfo()}
          />
        );
      case 5:
        if (useApiData && result.stages.stage5) {
          const s5 = result.stages.stage5;
          return (
            <Stage5RulesEngine
              rules={s5.rules}
              evaluatedRule={s5.evaluatedRule}
              conditions={s5.evaluatedRule?.conditions || []}
              journalLines={s5.journalLines}
            />
          );
        }
        return (
          <Stage5RulesEngine
            rules={getStage5Rules()}
            evaluatedRule={getStage5Rules()[0]}
            conditions={getStage5Rules()[0].conditions}
            journalLines={getStage5JournalLines()}
          />
        );
      case 6:
        if (useApiData && result.stages.stage6) {
          const s6 = result.stages.stage6;
          return (
            <Stage6EntryBookGen
              entries={s6.entries}
              totals={s6.totals}
              isBalanced={s6.isBalanced}
              metadata={s6.metadata}
            />
          );
        }
        return (
          <Stage6EntryBookGen
            entries={getStage6Entries()}
            totals={{
              totalDebits: data.entryBook.totalDebits,
              totalCredits: data.entryBook.totalCredits
            }}
            isBalanced={data.entryBook.isBalanced}
            metadata={getStage6Metadata()}
          />
        );
      case 7:
        if (useApiData && result.stages.stage7) {
          const s7 = result.stages.stage7;
          return (
            <Stage7LearningPersist
              status={s7.status}
              previousConfidence={s7.previousConfidence}
              newConfidence={s7.newConfidence}
              metrics={s7.metrics}
            />
          );
        }
        return (
          <Stage7LearningPersist
            status="success"
            previousConfidence={85}
            newConfidence={Math.round(data.fieldMappings.reduce((sum, m) => sum + m.confidence, 0) / data.fieldMappings.length * 100)}
            metrics={{
              totalProcessed: 1247,
              successRate: 98.5,
              averageConfidence: Math.round(data.fieldMappings.reduce((sum, m) => sum + m.confidence, 0) / data.fieldMappings.length * 100)
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={containerStyle}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <StageNavigator
          currentStage={currentStage()}
          completedStages={completedStages()}
          onStageClick={goToStage}
        />
      </div>

      {/* Controls Bar */}
      <div style={controlsBarStyle}>
        <div style={controlsLeftStyle}>
          {/* Play/Pause Button */}
          <button
            style={controlButtonStyle(isPlaying())}
            onClick={() => isPlaying() ? pause() : play()}
            title={isPlaying() ? 'Pause' : 'Play'}
          >
            {isPlaying() ? '⏸' : '▶'}
          </button>

          {/* Reset Button */}
          <button
            style={controlButtonStyle()}
            onClick={reset}
            title="Reset"
          >
            ↺
          </button>

          {/* Speed Selector */}
          <div style={speedContainerStyle}>
            {([0.5, 1, 2] as PlaybackSpeed[]).map((speed) => (
              <button
                style={speedButtonStyle(playbackSpeed() === speed)}
                onClick={() => setPlaybackSpeed(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Separator */}
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 8px' }} />

          {/* API Processing Button */}
          <button
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '6px',
              padding: '8px 16px',
              'border-radius': '8px',
              border: 'none',
              background: isProcessing() ? '#94a3b8' : processingMode() === 'api' ? '#10b981' : '#3b82f6',
              color: 'white',
              'font-size': '13px',
              'font-weight': '600',
              cursor: isProcessing() ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={processWithApi}
            disabled={isProcessing()}
            title="Process data through real API"
          >
            {isProcessing() ? '⏳ Processing...' : processingMode() === 'api' ? '✓ API Active' : '🚀 Process with API'}
          </button>

          {/* Create Entry Book Button (only show after API processing) */}
          <Show when={processingMode() === 'api' && apiResult()}>
            <button
              style={{
                display: 'flex',
                'align-items': 'center',
                gap: '6px',
                padding: '8px 16px',
                'border-radius': '8px',
                border: '2px solid #10b981',
                background: 'white',
                color: '#10b981',
                'font-size': '13px',
                'font-weight': '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={executeAndCreate}
              disabled={isProcessing()}
              title="Create the entry book in the system"
            >
              📚 Create Entry Book
            </button>
          </Show>

          {/* Mode Indicator */}
          <div style={{
            display: 'flex',
            'align-items': 'center',
            gap: '4px',
            padding: '4px 10px',
            'border-radius': '12px',
            background: processingMode() === 'api' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
            color: processingMode() === 'api' ? '#10b981' : '#6b7280',
            'font-size': '11px',
            'font-weight': '500',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              'border-radius': '50%',
              background: processingMode() === 'api' ? '#10b981' : '#6b7280',
            }} />
            {processingMode() === 'api' ? 'Live API' : 'Sample Data'}
          </div>
        </div>

        {/* Progress Indicator */}
        <div style={progressContainerStyle}>
          <div style={progressBarStyle}>
            <div style={progressFillStyle()} />
          </div>
          <span style={progressTextStyle}>
            Stage {currentStage()} of {TOTAL_STAGES}
          </span>
        </div>

        {/* Keyboard Hints */}
        <div style={keyboardHintStyle}>
          <span><span style={kbdStyle}>Space</span> Play/Pause</span>
          <span><span style={kbdStyle}>←</span><span style={kbdStyle}>→</span> Navigate</span>
        </div>
      </div>

      {/* Content Area */}
      <div style={contentAreaStyle}>
        <div style={stageContainerStyle()}>
          {renderStageContent()}
        </div>
      </div>
    </div>
  );
};

export default AccountingFlowVisualization;
