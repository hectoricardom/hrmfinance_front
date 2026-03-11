import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { LockStatus } from '../../types/supervisionTypes';

// ============================================================================
// Types
// ============================================================================

interface Version {
  id: string;
  version: number;
  timestamp: string;
  changes: Record<string, any>;
  changedBy: string;
  changeType: 'user' | 'ai' | 'system';
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  entityType: 'adapter' | 'fieldMapping' | 'accountMapping';
  entityId: string;
  entityName: string;
  onClose: () => void;
  onRollback?: (versionId: string) => void;
}

// ============================================================================
// Mock Data
// ============================================================================

const generateMockVersions = (entityType: string): Version[] => {
  if (entityType === 'fieldMapping') {
    return [
      {
        id: 'v3',
        version: 3,
        timestamp: '2024-01-15T14:30:00Z',
        changes: {
          transform: 'cents_to_dollars',
          confidence: 92,
          lock: LockStatus.USER_LOCKED,
          sourcePath: 'amount',
          targetPath: 'amount'
        },
        changedBy: 'User',
        changeType: 'user'
      },
      {
        id: 'v2',
        version: 2,
        timestamp: '2024-01-10T09:15:00Z',
        changes: {
          transform: 'divide_100',
          confidence: 85,
          lock: LockStatus.AI_LOCKED,
          sourcePath: 'amount',
          targetPath: 'amount'
        },
        changedBy: 'AI Learning',
        changeType: 'ai'
      },
      {
        id: 'v1',
        version: 1,
        timestamp: '2024-01-05T11:00:00Z',
        changes: {
          transform: 'none',
          confidence: 45,
          lock: LockStatus.UNLOCKED,
          sourcePath: 'amount',
          targetPath: 'amount'
        },
        changedBy: 'Initial AI detection',
        changeType: 'system'
      }
    ];
  } else if (entityType === 'adapter') {
    return [
      {
        id: 'v2',
        version: 2,
        timestamp: '2024-01-14T16:45:00Z',
        changes: {
          name: 'QuickBooks Adapter',
          confidence: 95,
          detectionRules: 3,
          fieldMappings: 12
        },
        changedBy: 'User',
        changeType: 'user'
      },
      {
        id: 'v1',
        version: 1,
        timestamp: '2024-01-08T10:30:00Z',
        changes: {
          name: 'QuickBooks Adapter',
          confidence: 78,
          detectionRules: 2,
          fieldMappings: 8
        },
        changedBy: 'AI Generation',
        changeType: 'ai'
      }
    ];
  } else {
    return [
      {
        id: 'v3',
        version: 3,
        timestamp: '2024-01-16T11:20:00Z',
        changes: {
          debitAccount: '1000 - Cash',
          creditAccount: '4000 - Revenue',
          confidence: 88,
          priority: 1
        },
        changedBy: 'User',
        changeType: 'user'
      },
      {
        id: 'v2',
        version: 2,
        timestamp: '2024-01-12T14:00:00Z',
        changes: {
          debitAccount: '1000 - Cash',
          creditAccount: '4100 - Sales Revenue',
          confidence: 75,
          priority: 2
        },
        changedBy: 'AI Suggestion',
        changeType: 'ai'
      },
      {
        id: 'v1',
        version: 1,
        timestamp: '2024-01-06T09:00:00Z',
        changes: {
          debitAccount: '1000 - Cash',
          creditAccount: '4000 - Revenue',
          confidence: 60,
          priority: 5
        },
        changedBy: 'System Default',
        changeType: 'system'
      }
    ];
  }
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
    padding: '1rem'
  },
  modal: {
    background: '#ffffff',
    'border-radius': '0.5rem',
    'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    'max-width': '700px',
    'max-height': '90vh',
    overflow: 'hidden',
    display: 'flex',
    'flex-direction': 'column' as const
  },
  header: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem 1.5rem',
    'border-bottom': '1px solid #E5E7EB',
    background: '#F9FAFB'
  },
  headerTitle: {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  },
  title: {
    margin: '0',
    'font-size': '1rem',
    'font-weight': '600',
    color: '#374151',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em'
  },
  entityName: {
    'font-size': '0.875rem',
    color: '#6B7280'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    'font-size': '1.5rem',
    color: '#9CA3AF',
    cursor: 'pointer',
    padding: '0.25rem',
    'line-height': '1',
    'border-radius': '0.25rem',
    transition: 'color 0.2s ease'
  },
  content: {
    padding: '1.5rem',
    'overflow-y': 'auto' as const,
    flex: '1'
  },
  timeline: {
    position: 'relative' as const,
    'padding-left': '1.5rem'
  },
  timelineLine: {
    position: 'absolute' as const,
    left: '0.4375rem',
    top: '1.25rem',
    bottom: '0.5rem',
    width: '2px',
    background: '#E5E7EB'
  },
  versionItem: {
    position: 'relative' as const,
    'padding-bottom': '1.5rem'
  },
  versionItemLast: {
    'padding-bottom': '0'
  },
  versionDot: {
    position: 'absolute' as const,
    left: '-1.5rem',
    top: '0.125rem',
    width: '1rem',
    height: '1rem',
    'border-radius': '50%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '0.75rem',
    'z-index': '1'
  },
  versionDotCurrent: {
    background: '#3B82F6',
    color: '#ffffff'
  },
  versionDotPast: {
    background: '#ffffff',
    border: '2px solid #D1D5DB',
    color: '#9CA3AF'
  },
  versionDotSelected: {
    background: '#F59E0B',
    border: '2px solid #F59E0B',
    color: '#ffffff'
  },
  versionCard: {
    background: '#F9FAFB',
    'border-radius': '0.5rem',
    padding: '1rem',
    border: '1px solid #E5E7EB',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  versionCardCurrent: {
    background: 'rgba(59, 130, 246, 0.05)',
    'border-color': '#3B82F6'
  },
  versionCardSelected: {
    background: 'rgba(245, 158, 11, 0.05)',
    'border-color': '#F59E0B'
  },
  versionHeader: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '0.5rem'
  },
  versionInfo: {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  },
  versionNumber: {
    'font-weight': '600',
    'font-size': '0.875rem',
    color: '#374151'
  },
  currentBadge: {
    'font-size': '0.625rem',
    'font-weight': '600',
    color: '#3B82F6',
    background: 'rgba(59, 130, 246, 0.1)',
    padding: '0.125rem 0.375rem',
    'border-radius': '9999px',
    'text-transform': 'uppercase' as const
  },
  versionDate: {
    'font-size': '0.75rem',
    color: '#9CA3AF'
  },
  restoreButton: {
    background: 'rgba(249, 115, 22, 0.1)',
    color: '#F97316',
    border: '1px solid #F97316',
    padding: '0.25rem 0.75rem',
    'border-radius': '0.25rem',
    'font-size': '0.75rem',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  versionDetails: {
    'font-size': '0.8125rem',
    color: '#6B7280',
    'margin-bottom': '0.375rem'
  },
  versionChangedBy: {
    'font-size': '0.75rem',
    color: '#9CA3AF',
    'font-style': 'italic' as const
  },
  changeTypeBadge: {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    'font-size': '0.625rem',
    padding: '0.125rem 0.375rem',
    'border-radius': '0.25rem',
    'margin-left': '0.5rem'
  },
  changeTypeUser: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444'
  },
  changeTypeAi: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3B82F6'
  },
  changeTypeSystem: {
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#6B7280'
  },
  comparisonSection: {
    'margin-top': '1.5rem',
    'padding-top': '1.5rem',
    'border-top': '1px solid #E5E7EB'
  },
  comparisonTitle: {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: '#374151',
    'margin-bottom': '1rem',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em'
  },
  comparisonBox: {
    background: '#F9FAFB',
    'border-radius': '0.5rem',
    border: '1px solid #E5E7EB',
    padding: '1rem',
    'font-family': 'monospace',
    'font-size': '0.8125rem'
  },
  diffRow: {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.375rem 0',
    'border-bottom': '1px solid #E5E7EB'
  },
  diffRowLast: {
    'border-bottom': 'none'
  },
  diffLabel: {
    'min-width': '100px',
    color: '#6B7280',
    'font-weight': '500'
  },
  diffCurrent: {
    color: '#10B981',
    'font-weight': '500'
  },
  diffArrow: {
    color: '#9CA3AF',
    'font-size': '1rem'
  },
  diffPrevious: {
    color: '#EF4444'
  },
  noSelection: {
    color: '#9CA3AF',
    'font-style': 'italic' as const,
    'text-align': 'center' as const,
    padding: '1rem'
  },
  // Confirmation Dialog Styles
  confirmOverlay: {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1100'
  },
  confirmDialog: {
    background: '#ffffff',
    'border-radius': '0.5rem',
    'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    'max-width': '400px',
    padding: '1.5rem'
  },
  confirmIcon: {
    'text-align': 'center' as const,
    'margin-bottom': '1rem'
  },
  confirmIconCircle: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '3rem',
    height: '3rem',
    'border-radius': '50%',
    background: 'rgba(249, 115, 22, 0.1)',
    color: '#F97316',
    'font-size': '1.5rem'
  },
  confirmTitle: {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: '#374151',
    'text-align': 'center' as const,
    'margin-bottom': '0.5rem'
  },
  confirmMessage: {
    'font-size': '0.875rem',
    color: '#6B7280',
    'text-align': 'center' as const,
    'margin-bottom': '1.5rem',
    'line-height': '1.5'
  },
  confirmActions: {
    display: 'flex',
    gap: '0.75rem',
    'justify-content': 'center'
  },
  confirmButton: {
    padding: '0.5rem 1.25rem',
    'border-radius': '0.375rem',
    'font-size': '0.875rem',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  confirmButtonCancel: {
    background: '#ffffff',
    color: '#6B7280',
    border: '1px solid #D1D5DB'
  },
  confirmButtonConfirm: {
    background: '#F97316',
    color: '#ffffff',
    border: '1px solid #F97316'
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '10'
  },
  loadingSpinner: {
    width: '2rem',
    height: '2rem',
    border: '3px solid #E5E7EB',
    'border-top-color': '#3B82F6',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite'
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatLockStatus = (status: LockStatus | string): string => {
  if (typeof status === 'string') {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  switch (status) {
    case LockStatus.USER_LOCKED:
      return 'User Locked';
    case LockStatus.AI_LOCKED:
      return 'AI Locked';
    case LockStatus.UNLOCKED:
      return 'Unlocked';
    case LockStatus.PENDING_REVIEW:
      return 'Pending Review';
    default:
      return String(status);
  }
};

const getChangeTypeConfig = (changeType: 'user' | 'ai' | 'system') => {
  switch (changeType) {
    case 'user':
      return { label: 'User', style: styles.changeTypeUser, icon: 'U' };
    case 'ai':
      return { label: 'AI', style: styles.changeTypeAi, icon: 'AI' };
    case 'system':
      return { label: 'System', style: styles.changeTypeSystem, icon: 'S' };
    default:
      return { label: 'Unknown', style: styles.changeTypeSystem, icon: '?' };
  }
};

const formatChangeValue = (key: string, value: any): string => {
  if (key === 'lock') {
    return formatLockStatus(value);
  }
  if (key === 'confidence') {
    return `${value}%`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

// ============================================================================
// Component
// ============================================================================

const VersionHistoryModal: Component<VersionHistoryModalProps> = (props) => {
  const [versions, setVersions] = createSignal<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = createSignal<Version | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);
  const [versionToRestore, setVersionToRestore] = createSignal<Version | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);

  // Load mock data when modal opens
  const loadVersions = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setVersions(generateMockVersions(props.entityType));
      setIsLoading(false);
    }, 300);
  };

  // Get current version
  const currentVersion = createMemo(() => {
    const vers = versions();
    return vers.length > 0 ? vers[0] : null;
  });

  // Get comparison data between current and selected version
  const comparisonData = createMemo(() => {
    const current = currentVersion();
    const selected = selectedVersion();
    if (!current || !selected || current.id === selected.id) {
      return null;
    }

    const allKeys = new Set([
      ...Object.keys(current.changes),
      ...Object.keys(selected.changes)
    ]);

    const diffs: { key: string; current: any; previous: any; changed: boolean }[] = [];
    allKeys.forEach(key => {
      const currentVal = current.changes[key];
      const previousVal = selected.changes[key];
      diffs.push({
        key,
        current: currentVal,
        previous: previousVal,
        changed: JSON.stringify(currentVal) !== JSON.stringify(previousVal)
      });
    });

    return diffs;
  });

  // Handle restore button click
  const handleRestoreClick = (version: Version, e: Event) => {
    e.stopPropagation();
    setVersionToRestore(version);
    setShowConfirmDialog(true);
  };

  // Handle confirm restore
  const handleConfirmRestore = () => {
    const version = versionToRestore();
    if (version && props.onRollback) {
      setIsLoading(true);
      // Simulate rollback
      setTimeout(() => {
        props.onRollback!(version.id);
        setShowConfirmDialog(false);
        setVersionToRestore(null);
        setIsLoading(false);
        // Reload versions
        loadVersions();
      }, 500);
    }
  };

  // Handle cancel restore
  const handleCancelRestore = () => {
    setShowConfirmDialog(false);
    setVersionToRestore(null);
  };

  // Handle version selection for comparison
  const handleVersionClick = (version: Version) => {
    if (version.id === currentVersion()?.id) {
      setSelectedVersion(null);
    } else if (selectedVersion()?.id === version.id) {
      setSelectedVersion(null);
    } else {
      setSelectedVersion(version);
    }
  };

  // Handle close
  const handleClose = () => {
    setSelectedVersion(null);
    setShowConfirmDialog(false);
    setVersionToRestore(null);
    props.onClose();
  };

  // Load versions when modal opens
  createMemo(() => {
    if (props.isOpen) {
      loadVersions();
    }
  });

  // Entity type label
  const entityTypeLabel = createMemo(() => {
    switch (props.entityType) {
      case 'adapter':
        return 'Adapter';
      case 'fieldMapping':
        return 'Field Mapping';
      case 'accountMapping':
        return 'Account Mapping';
      default:
        return 'Entity';
    }
  });

  return (
    <Show when={props.isOpen}>
      <div style={styles.overlay} onClick={handleClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <h2 style={styles.title}>Version History: {entityTypeLabel()}</h2>
              <span style={styles.entityName}>{props.entityName}</span>
            </div>
            <button
              style={styles.closeButton}
              onClick={handleClose}
              onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
            >
              x
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {/* Timeline */}
            <div style={styles.timeline}>
              <div style={styles.timelineLine} />

              <Show when={!isLoading()} fallback={
                <div style={{ padding: '2rem', 'text-align': 'center', color: '#9CA3AF' }}>
                  Loading version history...
                </div>
              }>
                <For each={versions()}>
                  {(version, index) => {
                    const isCurrent = () => index() === 0;
                    const isSelected = () => selectedVersion()?.id === version.id;
                    const isLast = () => index() === versions().length - 1;
                    const changeTypeConfig = getChangeTypeConfig(version.changeType);

                    return (
                      <div
                        style={{
                          ...styles.versionItem,
                          ...(isLast() ? styles.versionItemLast : {})
                        }}
                      >
                        {/* Timeline dot */}
                        <div
                          style={{
                            ...styles.versionDot,
                            ...(isCurrent() ? styles.versionDotCurrent :
                                isSelected() ? styles.versionDotSelected :
                                styles.versionDotPast)
                          }}
                        >
                          {isCurrent() ? '\u25CF' : '\u25CB'}
                        </div>

                        {/* Version card */}
                        <div
                          style={{
                            ...styles.versionCard,
                            ...(isCurrent() ? styles.versionCardCurrent : {}),
                            ...(isSelected() ? styles.versionCardSelected : {})
                          }}
                          onClick={() => handleVersionClick(version)}
                        >
                          <div style={styles.versionHeader}>
                            <div style={styles.versionInfo}>
                              <span style={styles.versionNumber}>v{version.version}</span>
                              <Show when={isCurrent()}>
                                <span style={styles.currentBadge}>Current</span>
                              </Show>
                              <span style={styles.versionDate}>{formatDateTime(version.timestamp)}</span>
                            </div>
                            <Show when={!isCurrent()}>
                              <button
                                style={styles.restoreButton}
                                onClick={(e) => handleRestoreClick(version, e)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#F97316';
                                  e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                                  e.currentTarget.style.color = '#F97316';
                                }}
                              >
                                Restore
                              </button>
                            </Show>
                          </div>

                          {/* Version details */}
                          <div style={styles.versionDetails}>
                            <For each={Object.entries(version.changes).slice(0, 2)}>
                              {([key, value]) => (
                                <span>
                                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}: {formatChangeValue(key, value)}
                                  {' | '}
                                </span>
                              )}
                            </For>
                          </div>

                          <div style={styles.versionChangedBy}>
                            Changed by: {version.changedBy}
                            <span style={{ ...styles.changeTypeBadge, ...changeTypeConfig.style }}>
                              {changeTypeConfig.icon}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </div>

            {/* Comparison Section */}
            <Show when={selectedVersion() && currentVersion()}>
              <div style={styles.comparisonSection}>
                <div style={styles.comparisonTitle}>
                  Compare v{currentVersion()?.version} vs v{selectedVersion()?.version}
                </div>
                <div style={styles.comparisonBox}>
                  <Show when={comparisonData()} fallback={
                    <div style={styles.noSelection}>No differences to display</div>
                  }>
                    <For each={comparisonData()!}>
                      {(diff, index) => (
                        <div
                          style={{
                            ...styles.diffRow,
                            ...(index() === comparisonData()!.length - 1 ? styles.diffRowLast : {})
                          }}
                        >
                          <span style={styles.diffLabel}>
                            {diff.key.charAt(0).toUpperCase() + diff.key.slice(1).replace(/([A-Z])/g, ' $1')}:
                          </span>
                          <span style={{
                            ...styles.diffCurrent,
                            color: diff.changed ? '#10B981' : '#6B7280'
                          }}>
                            {formatChangeValue(diff.key, diff.current)}
                          </span>
                          <span style={styles.diffArrow}>{'\u2192'}</span>
                          <span style={{
                            ...styles.diffPrevious,
                            color: diff.changed ? '#EF4444' : '#6B7280'
                          }}>
                            {formatChangeValue(diff.key, diff.previous)}
                          </span>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>

            <Show when={!selectedVersion() && versions().length > 1}>
              <div style={{ ...styles.noSelection, marginTop: '1.5rem' }}>
                Click on a past version to compare with the current version
              </div>
            </Show>
          </div>

          {/* Loading overlay */}
          <Show when={isLoading()}>
            <div style={styles.loadingOverlay}>
              <div style={styles.loadingSpinner} />
            </div>
          </Show>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Show when={showConfirmDialog()}>
        <div style={styles.confirmOverlay} onClick={handleCancelRestore}>
          <div style={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmIcon}>
              <span style={styles.confirmIconCircle}>{'\u21B6'}</span>
            </div>
            <div style={styles.confirmTitle}>Confirm Rollback</div>
            <div style={styles.confirmMessage}>
              Are you sure you want to restore version {versionToRestore()?.version}?
              This will create a new version with the previous configuration.
              Current settings will be saved in version history.
            </div>
            <div style={styles.confirmActions}>
              <button
                style={{ ...styles.confirmButton, ...styles.confirmButtonCancel }}
                onClick={handleCancelRestore}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.confirmButton, ...styles.confirmButtonConfirm }}
                onClick={handleConfirmRestore}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#EA580C';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F97316';
                }}
              >
                Restore Version
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Show>
  );
};

export default VersionHistoryModal;
