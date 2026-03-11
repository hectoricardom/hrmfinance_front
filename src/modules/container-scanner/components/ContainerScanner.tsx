/**
 * Container Scanner Component
 *
 * Handles container arrival validation and bulk scanning at distribution centers.
 * Optimized for mobile warehouse workers with minimal computer skills.
 *
 * Workflow:
 * 1. Scan container QR code
 * 2. Load all expected bulks
 * 3. Scan each bulk to validate
 * 4. Mark container as received when complete
 */

import { Component, createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js';
import { Container, Bulk, ScannerState } from '../types/containerScannerTypes';
import { fetchContainer, markBulkAsScanned, markContainerAsReceived, parseQRCode } from '../services/containerScannerApi';

// Inline styles matching the invoice module pattern
const styles = {
  container: {
    'min-height': '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    'padding-bottom': '5rem'
  },

  header: {
    background: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
    'border-bottom': '1px solid #475569',
    padding: '1.5rem',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },

  headerTitle: {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'white',
    'text-align': 'center',
    'margin-bottom': '0.5rem'
  },

  headerSubtitle: {
    'font-size': '0.875rem',
    color: '#cbd5e1',
    'text-align': 'center'
  },

  banner: {
    padding: '1rem',
    'border-left': '4px solid',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.75rem',
    'max-width': '42rem',
    margin: '0 auto'
  },

  errorBanner: {
    background: 'linear-gradient(90deg, #fef2f2 0%, rgba(254, 242, 242, 0.5) 100%)',
    'border-color': '#ef4444'
  },

  successBanner: {
    background: 'linear-gradient(90deg, #f0fdf4 0%, rgba(240, 253, 244, 0.5) 100%)',
    'border-color': '#10b981'
  },

  card: {
    background: 'white',
    'border-radius': '0.75rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '2px solid #e2e8f0',
    padding: '2rem',
    'margin-top': '1.5rem',
    transition: 'box-shadow 0.3s'
  },

  formGroup: {
    'margin-bottom': '1.25rem'
  },

  label: {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '600',
    color: '#334155',
    'margin-bottom': '0.5rem'
  },

  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    'font-size': '1rem',
    border: '2px solid #cbd5e1',
    'border-radius': '0.5rem',
    background: 'white',
    transition: 'all 0.2s',
    outline: 'none',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  helperText: {
    'font-size': '0.75rem',
    color: '#64748b',
    'margin-top': '0.375rem'
  },

  button: {
    width: '100%',
    padding: '0.875rem 1.5rem',
    border: 'none',
    'border-radius': '0.5rem',
    'font-size': '1rem',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },

  primaryButton: {
    background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)',
    color: 'white'
  },

  secondaryButton: {
    background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%)',
    color: '#334155',
    border: '2px solid #cbd5e1'
  },

  successButton: {
    background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
    color: 'white'
  },

  progressCard: {
    background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, white 100%)',
    'border-radius': '0.75rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '2px solid #c7d2fe',
    padding: '1.5rem'
  },

  progressHeader: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '1rem'
  },

  progressNumber: {
    'font-size': '2.25rem',
    'font-weight': '700',
    color: '#312e81'
  },

  progressLabel: {
    'font-size': '0.875rem',
    color: '#64748b',
    'margin-top': '0.25rem',
    'font-weight': '500'
  },

  progressCircle: {
    width: '5rem',
    height: '5rem',
    'border-radius': '50%',
    border: '8px solid #e0e7ff',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: 'linear-gradient(135deg, white 0%, #eef2ff 100%)',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    'flex-shrink': '0'
  },

  progressPercentage: {
    'font-size': '1.5rem',
    'font-weight': '800',
    color: '#4f46e5'
  },

  progressBar: {
    width: '100%',
    background: '#cbd5e1',
    'border-radius': '9999px',
    height: '0.75rem',
    overflow: 'hidden',
    'box-shadow': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },

  progressBarFill: {
    background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #10b981 100%)',
    height: '100%',
    transition: 'all 0.5s ease-out',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  bulkItem: {
    padding: '0.875rem',
    'border-radius': '0.5rem',
    border: '2px solid',
    transition: 'all 0.2s',
    'margin-bottom': '0.625rem'
  },

  bulkItemScanned: {
    background: '#f0fdf4',
    'border-color': '#86efac'
  },

  bulkItemUnscanned: {
    background: 'white',
    'border-color': '#e2e8f0'
  },

  checkmark: {
    width: '2rem',
    height: '2rem',
    'border-radius': '50%',
    background: '#10b981',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    'font-size': '1.125rem',
    'font-weight': '700'
  },

  emptyCheckmark: {
    width: '2rem',
    height: '2rem',
    'border-radius': '50%',
    border: '2px solid #cbd5e1',
    background: 'white',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center'
  },

  contentWrapper: {
    padding: '1rem',
    'max-width': '42rem',
    margin: '0 auto'
  },

  iconBadge: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '5rem',
    height: '5rem',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)',
    'border-radius': '1rem',
    'margin-bottom': '1rem',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    'font-size': '3rem'
  },

  iconBadgeLarge: {
    width: '6rem',
    height: '6rem',
    'font-size': '3.5rem'
  },

  iconBadgeSuccess: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
  },

  sectionTitle: {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: '#0f172a',
    'margin-bottom': '0.5rem',
    'text-align': 'center'
  },

  sectionSubtitle: {
    'font-size': '0.875rem',
    color: '#475569',
    'text-align': 'center'
  },

  textCenter: {
    'text-align': 'center',
    'margin-bottom': '2rem'
  },

  badge: {
    'font-size': '0.75rem',
    'font-weight': '700',
    color: 'white',
    background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
    padding: '0.375rem 0.75rem',
    'border-radius': '9999px',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  infoBox: {
    background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%)',
    border: '2px solid #cbd5e1',
    'border-radius': '0.75rem',
    padding: '1.25rem',
    'margin-bottom': '1.5rem',
    'box-shadow': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },

  infoBoxSuccess: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #d1fae5 100%)',
    border: '2px solid #6ee7b7'
  },

  infoRow: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'font-size': '0.875rem',
    'margin-bottom': '0.75rem'
  },

  infoLabel: {
    color: '#475569',
    'font-weight': '500'
  },

  infoValue: {
    'font-family': 'monospace',
    'font-weight': '700',
    color: '#0f172a',
    background: 'white',
    padding: '0.25rem 0.75rem',
    'border-radius': '0.375rem',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  infoValueSuccess: {
    'font-weight': '700',
    color: '#047857',
    background: '#d1fae5',
    padding: '0.25rem 0.75rem',
    'border-radius': '0.375rem'
  },

  loadingCard: {
    background: 'white',
    'border-radius': '0.75rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '2px solid #e2e8f0',
    padding: '3rem',
    'margin-top': '1.5rem',
    'text-align': 'center'
  },

  loadingIcon: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'margin-bottom': '1rem',
    'font-size': '2.25rem'
  },

  loadingTitle: {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: '#0f172a',
    'margin-bottom': '0.5rem'
  },

  loadingText: {
    color: '#475569',
    'font-size': '0.875rem'
  },

  spaceY: {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1.25rem',
    'margin-top': '1.5rem'
  },

  listContainer: {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.625rem',
    'max-height': '24rem',
    'overflow-y': 'auto',
    'padding-right': '0.25rem'
  },

  alertBox: {
    'margin-top': '1rem',
    padding: '0.75rem',
    'border-left': '4px solid',
    'border-radius': '0 0.5rem 0.5rem 0',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  alertWarning: {
    background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
    'border-color': '#f59e0b'
  },

  alertSuccess: {
    background: 'linear-gradient(90deg, #ecfdf5 0%, #d1fae5 100%)',
    'border-color': '#10b981'
  },

  alertContent: {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem'
  },

  alertIcon: {
    'flex-shrink': '0',
    width: '2rem',
    height: '2rem',
    'border-radius': '50%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '1rem'
  },

  alertIconWarning: {
    background: '#fef3c7'
  },

  alertIconSuccess: {
    background: '#d1fae5'
  },

  alertTitle: {
    'font-size': '0.875rem',
    'font-weight': '700'
  },

  alertTitleWarning: {
    color: '#78350f'
  },

  alertTitleSuccess: {
    color: '#065f46'
  },

  alertText: {
    'font-size': '0.75rem',
    'margin-top': '0.125rem',
    'font-weight': '500'
  },

  alertTextWarning: {
    color: '#92400e'
  },

  alertTextSuccess: {
    color: '#047857'
  },

  flexRow: {
    display: 'flex',
    'align-items': 'start',
    'justify-content': 'space-between',
    gap: '0.75rem'
  },

  flexCol: {
    display: 'flex',
    'flex-direction': 'column'
  },

  flex1: {
    flex: '1',
    'min-width': '0'
  },

  flexShrink0: {
    'flex-shrink': '0'
  },

  truncate: {
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap'
  },

  textMono: {
    'font-family': 'monospace'
  },

  processingBox: {
    'text-align': 'center',
    'margin-top': '0.75rem',
    padding: '0.75rem',
    background: 'linear-gradient(90deg, #eef2ff 0%, #e9d5ff 100%)',
    'border-radius': '0.5rem',
    border: '1px solid #c7d2fe',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  processingText: {
    'font-size': '0.875rem',
    color: '#3730a3',
    'font-weight': '600'
  },

  headerRow: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '1.25rem'
  },

  successCard: {
    background: 'linear-gradient(135deg, white 0%, rgba(236, 253, 245, 0.3) 50%, white 100%)',
    'border-radius': '0.75rem',
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    border: '2px solid #6ee7b7',
    padding: '2rem',
    'margin-top': '1.5rem'
  },

  completedIcon: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '6rem',
    height: '6rem',
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)',
    'border-radius': '50%',
    'margin-bottom': '1rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    'font-size': '3rem',
    color: '#059669'
  },

  completedTitle: {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: '#059669',
    'margin-bottom': '0.5rem'
  },

  completedSubtitle: {
    color: '#334155',
    'font-size': '0.875rem',
    'font-weight': '500'
  },

  receivedCard: {
    background: 'linear-gradient(135deg, white 0%, rgba(240, 253, 244, 0.4) 50%, white 100%)',
    'border-radius': '0.75rem',
    'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '2px solid #86efac',
    padding: '2rem',
    'margin-top': '1.5rem'
  },

  receivedIcon: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '7rem',
    height: '7rem',
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)',
    'border-radius': '50%',
    'margin-bottom': '1rem',
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    'font-size': '3.75rem'
  },

  receivedTitle: {
    'font-size': '1.875rem',
    'font-weight': '800',
    background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
    '-webkit-background-clip': 'text',
    '-webkit-text-fill-color': 'transparent',
    'background-clip': 'text',
    'margin-bottom': '0.75rem'
  },

  receivedSubtitle: {
    color: '#334155',
    'font-size': '1rem',
    'font-weight': '600',
    'margin-bottom': '1rem'
  },

  timestampBadge: {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.75rem',
    color: '#475569',
    background: 'linear-gradient(90deg, #f1f5f9 0%, #f8fafc 100%)',
    padding: '0.5rem 1rem',
    'border-radius': '9999px',
    border: '1px solid #cbd5e1',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    'font-weight': '500'
  },

  infoPanel: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #d1fae5 100%)',
    border: '2px solid #6ee7b7',
    'border-radius': '0.75rem',
    padding: '1.5rem',
    'margin-bottom': '1.5rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  },

  infoPanelIcon: {
    'flex-shrink': '0',
    width: '3.5rem',
    height: '3.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    'border-radius': '0.75rem',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    'font-size': '1.875rem',
    color: 'white'
  },

  infoPanelTitle: {
    'font-size': '1rem',
    'font-weight': '700',
    color: '#065f46',
    'margin-bottom': '1rem'
  },

  infoPanelRow: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'font-size': '0.875rem',
    background: 'white',
    'border-radius': '0.5rem',
    padding: '0.75rem',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    'margin-bottom': '0.75rem'
  },

  statusBadge: {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-weight': '700',
    color: '#047857',
    background: '#d1fae5',
    padding: '0.25rem 0.75rem',
    'border-radius': '0.375rem'
  },

  buttonGroup: {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem'
  }
};

const ContainerScanner: Component = () => {
  // ==================== STATE ====================
  const [state, setState] = createSignal<ScannerState>('initial');
  const [container, setContainer] = createSignal<Container | null>(null);
  const [expectedBulks, setExpectedBulks] = createSignal<Bulk[]>([]);
  const [scannedBulkIds, setScannedBulkIds] = createSignal<Set<string>>(new Set());
  const [currentInput, setCurrentInput] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  const [isProcessing, setIsProcessing] = createSignal(false);

  let containerInputRef: HTMLInputElement | undefined;
  let bulkInputRef: HTMLInputElement | undefined;
  let successTimeout: number | undefined;

  // ==================== COMPUTED VALUES ====================
  const progress = createMemo(() => {
    const total = expectedBulks().length;
    const scanned = scannedBulkIds().size;
    return { scanned, total, percentage: total > 0 ? (scanned / total) * 100 : 0 };
  });

  const isComplete = createMemo(() => {
    const { scanned, total } = progress();
    return total > 0 && scanned === total;
  });

  const unscannedBulks = createMemo(() => {
    const scanned = scannedBulkIds();
    return expectedBulks().filter(bulk => !scanned.has(bulk.id));
  });

  // ==================== LIFECYCLE ====================
  onMount(() => {
    // Auto-focus on container input when component loads
    if (containerInputRef) {
      containerInputRef.focus();
    }
  });

  onCleanup(() => {
    if (successTimeout) {
      clearTimeout(successTimeout);
    }
  });

  // ==================== HANDLERS ====================

  /**
   * Handle container QR code scan
   */
  const handleContainerScan = async (e: Event) => {
    e.preventDefault();
    const input = currentInput().trim();

    if (!input) {
      showError('Please scan a container QR code');
      return;
    }

    setState('loading');
    setError(null);

    try {
      // Fetch container data from backend
      const containerData = await fetchContainer(input);

      if (!containerData.bulks || containerData.bulks.length === 0) {
        throw new Error('This container has no bulks assigned');
      }

      setContainer(containerData);
      setExpectedBulks(containerData.bulks);
      setScannedBulkIds(new Set());
      setState('scanning');
      setCurrentInput('');

      // Auto-focus on bulk input
      setTimeout(() => {
        if (bulkInputRef) {
          bulkInputRef.focus();
        }
      }, 100);

    } catch (err: any) {
      setState('error');
      setError(err.message || 'Failed to load container. Please try again.');
      setCurrentInput('');
    }
  };

  /**
   * Handle bulk QR code scan
   */
  const handleBulkScan = async (e: Event) => {
    e.preventDefault();

    if (isProcessing()) return;

    const input = currentInput().trim();

    if (!input) {
      return; // Ignore empty scans
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const bulkId = parseQRCode(input);

      if (!bulkId) {
        throw new Error('Invalid QR code format');
      }

      console.log(expectedBulks())
      // Check if bulk exists in expected list (by ID or tracking number)
      const bulk = expectedBulks().find(b => b.id === bulkId || b.trackingNumber === bulkId);

      if (!bulk) {
        throw new Error(`❌ Este bulto NO pertenece a este contenedor. Bulto escaneado: ${bulkId.slice(0, 12)}... | Contenedor actual: ${container()?.containerNumber || container()?.id}`);
      }

      // Check if already scanned (use actual bulk ID for tracking)
      if (scannedBulkIds().has(bulk.id)) {
        showError('⚠️ ¡Este bulto ya fue escaneado!');
        playDuplicateAnimation();
        setCurrentInput('');
        setIsProcessing(false);
        return;
      }

      // Mark as scanned in backend
      await markBulkAsScanned(bulk.id);

      // Update local state (use actual bulk ID)
      setScannedBulkIds(prev => new Set([...prev, bulk.id]));

      // Show success feedback
      showSuccess(`✓ ${bulk.name || bulk.trackingNumber || `Bulk ${bulkId}`}`);
      playSuccessAnimation();

      // Clear input
      setCurrentInput('');

      // Check if all bulks are scanned
      setTimeout(() => {
        if (isComplete()) {
          setState('completed');
        }
      }, 500);

    } catch (err: any) {
      showError(err.message || 'Failed to scan bulk');
      playErrorAnimation();
    } finally {
      setIsProcessing(false);

      // Auto-focus back on input
      setTimeout(() => {
        if (bulkInputRef) {
          bulkInputRef.focus();
        }
      }, 100);
    }
  };

  /**
   * Mark container as received
   */
  const handleMarkAsReceived = async () => {
    if (!container()) return;

    setIsProcessing(true);
    setError(null);

    try {
      await markContainerAsReceived(container()!.id);
      setState('received');
      showSuccess('✓ Container received successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to mark container as received');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset scanner to scan a new container
   */
  const handleReset = () => {
    setState('initial');
    setContainer(null);
    setExpectedBulks([]);
    setScannedBulkIds(new Set());
    setCurrentInput('');
    setError(null);
    setSuccessMessage(null);

    setTimeout(() => {
      if (containerInputRef) {
        containerInputRef.focus();
      }
    }, 100);
  };

  // ==================== HELPER FUNCTIONS ====================

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    if (successTimeout) clearTimeout(successTimeout);
    successTimeout = setTimeout(() => setSuccessMessage(null), 2000) as any;
  };

  const playSuccessAnimation = () => {
    // Trigger haptic feedback (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const playErrorAnimation = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const playDuplicateAnimation = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  // ==================== RENDER ====================

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Escáner de Contenedores</h1>
        <p style={styles.headerSubtitle}>Centro de Distribución - Recepción</p>
      </div>

      {/* Error Banner */}
      <Show when={error()}>
        <div style={{...styles.banner, ...styles.errorBanner}}>
          <span style={{'font-size': '1.125rem'}}>⚠️</span>
          <span style={{'font-weight': '500', color: '#7f1d1d'}}>{error()}</span>
        </div>
      </Show>

      {/* Success Banner */}
      <Show when={successMessage()}>
        <div style={{...styles.banner, ...styles.successBanner}}>
          <span style={{'font-size': '1.125rem'}}>✓</span>
          <span style={{'font-weight': '500', color: '#14532d'}}>{successMessage()}</span>
        </div>
      </Show>

      {/* Main Content */}
      <div style={styles.contentWrapper}>

        {/* INITIAL STATE: Scan Container */}
        <Show when={state() === 'initial' || state() === 'error'}>
          <div style={styles.card}>
            <div style={styles.textCenter}>
              <div style={styles.iconBadge}>
                <span>📦</span>
              </div>
              <h2 style={styles.sectionTitle}>Escanear Contenedor</h2>
              <p style={styles.sectionSubtitle}>Escanee el código QR en la etiqueta del contenedor</p>
            </div>

            <form onSubmit={handleContainerScan}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  ID del Contenedor
                </label>
                <input
                  ref={containerInputRef}
                  type="text"
                  value={currentInput()}
                  onInput={(e) => setCurrentInput(e.currentTarget.value)}
                  placeholder="Escanear o ingresar ID del contenedor"
                  style={styles.input}
                  autofocus
                />
                <p style={styles.helperText}>
                  Apunte el escáner al código QR o escriba manualmente
                </p>
              </div>
              <button
                type="submit"
                style={{...styles.button, ...styles.primaryButton}}
              >
                Cargar Contenedor
              </button>
            </form>
          </div>
        </Show>

        {/* LOADING STATE */}
        <Show when={state() === 'loading'}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingIcon}>
              <div style={{'animation': 'spin 1s linear infinite'}}>⏳</div>
            </div>
            <h2 style={styles.loadingTitle}>Cargando Contenedor...</h2>
            <p style={styles.loadingText}>Por favor espere</p>
          </div>
        </Show>

        {/* SCANNING STATE: Scan Bulks */}
        <Show when={state() === 'scanning'}>
          <div style={styles.spaceY}>

            {/* Progress Card */}
            <div style={styles.progressCard}>
              <div style={styles.progressHeader}>
                <div style={styles.flexCol}>
                  <p style={{'font-size': '0.75rem', 'font-weight': '700', color: '#4f46e5', 'text-transform': 'uppercase', 'letter-spacing': '0.05em', 'margin-bottom': '0.25rem'}}>Progreso del Contenedor</p>
                  <div style={styles.progressNumber}>
                    {progress().scanned}<span style={{'font-size': '1.5rem', color: '#94a3b8', 'font-weight': '400'}}> / {progress().total}</span>
                  </div>
                  <p style={styles.progressLabel}>Bultos Escaneados</p>
                </div>
                <div style={styles.flexShrink0}>
                  <div style={styles.progressCircle}>
                    <span style={styles.progressPercentage}>{Math.round(progress().percentage)}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={styles.progressBar}>
                <div
                  style={{...styles.progressBarFill, width: `${progress().percentage}%`}}
                >
                </div>
              </div>
              <div style={{'display': 'flex', 'justify-content': 'space-between', 'margin-top': '0.625rem', 'font-size': '0.75rem', 'font-weight': '500'}}>
                <span style={{color: '#047857'}}>✓ {progress().scanned} escaneados</span>
                <span style={{color: '#475569'}}>⏳ {progress().total - progress().scanned} restantes</span>
              </div>
            </div>

            {/* Scan Input */}
            <div style={styles.card}>
              <div style={styles.textCenter}>
                <div style={{...styles.iconBadge, ...styles.iconBadgeSuccess}}>
                  <span>📱</span>
                </div>
                <h2 style={{'font-size': '1.125rem', 'font-weight': '700', color: '#0f172a', 'text-align': 'center'}}>Escanear Código QR del Bulto</h2>
                <p style={{'font-size': '0.75rem', color: '#475569', 'margin-top': '0.25rem', 'font-weight': '500', 'text-align': 'center'}}>Escanee cada bulto para marcar como recibido</p>
              </div>

              <form onSubmit={handleBulkScan}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    ID del Bulto / Número de Rastreo
                  </label>
                  <input
                    ref={bulkInputRef}
                    type="text"
                    value={currentInput()}
                    onInput={(e) => setCurrentInput(e.currentTarget.value)}
                    placeholder="Escanear código QR del bulto"
                    style={{
                      ...styles.input,
                      ...(isProcessing() ? {background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed'} : {})
                    }}
                    disabled={isProcessing()}
                    autofocus
                  />
                  <Show when={!isProcessing()}>
                    <p style={styles.helperText}>
                      Apunte el escáner al código QR o escriba el número de rastreo
                    </p>
                  </Show>
                </div>
              </form>

              <Show when={isProcessing()}>
                <div style={styles.processingBox}>
                  <span style={{...styles.processingText, 'animation': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'}}>
                    Procesando escaneo...
                  </span>
                </div>
              </Show>
            </div>

            {/* Bulk List */}
            <div style={styles.card}>
              <div style={styles.headerRow}>
                <h3 style={{'font-size': '1rem', 'font-weight': '700', color: '#0f172a'}}>
                  Bultos en el Contenedor
                </h3>
                <span style={styles.badge}>
                  {expectedBulks().length} total
                </span>
              </div>

              <div style={styles.listContainer}>
                <For each={expectedBulks()}>
                  {(bulk) => {
                    const isScanned = scannedBulkIds().has(bulk.id);
                    return (
                      <div
                        style={{
                          ...styles.bulkItem,
                          ...(isScanned ? styles.bulkItemScanned : styles.bulkItemUnscanned)
                        }}
                      >
                        <div style={styles.flexRow}>
                          <div style={styles.flex1}>
                            <div style={{'font-size': '0.875rem', 'font-weight': '500', color: isScanned ? '#064e3b' : '#0f172a'}}>
                              {bulk.name || bulk.trackingNumber || `Bulk ${bulk.id.slice(0, 8)}`}
                            </div>
                            <Show when={bulk.trackingNumber}>
                              <div style={{'font-size': '0.75rem', color: '#475569', 'margin-top': '0.25rem'}}>
                                📦 {bulk.trackingNumber}
                              </div>
                            </Show>
                          </div>
                          <div style={styles.flexShrink0}>
                            <Show when={isScanned} fallback={
                              <div style={styles.emptyCheckmark}>
                                <div style={{width: '0.5rem', height: '0.5rem', 'border-radius': '50%', background: '#cbd5e1'}}></div>
                              </div>
                            }>
                              <div style={styles.checkmark}>
                                ✓
                              </div>
                            </Show>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>

              <Show when={unscannedBulks().length > 0}>
                <div style={{...styles.alertBox, ...styles.alertWarning}}>
                  <div style={styles.alertContent}>
                    <div style={{...styles.alertIcon, ...styles.alertIconWarning}}>
                      <span>⚠️</span>
                    </div>
                    <div style={styles.flex1}>
                      <p style={{...styles.alertTitle, ...styles.alertTitleWarning}}>
                        {unscannedBulks().length} bulto{unscannedBulks().length !== 1 ? 's' : ''} restante{unscannedBulks().length !== 1 ? 's' : ''}
                      </p>
                      <p style={{...styles.alertText, ...styles.alertTextWarning}}>
                        Continúe escaneando para completar el contenedor
                      </p>
                    </div>
                  </div>
                </div>
              </Show>

              <Show when={scannedBulkIds().size === expectedBulks().length && expectedBulks().length > 0}>
                <div style={{...styles.alertBox, ...styles.alertSuccess}}>
                  <div style={styles.alertContent}>
                    <div style={{...styles.alertIcon, ...styles.alertIconSuccess}}>
                      <span>✓</span>
                    </div>
                    <div style={styles.flex1}>
                      <p style={{...styles.alertTitle, ...styles.alertTitleSuccess}}>
                        ¡Todos los bultos escaneados!
                      </p>
                      <p style={{...styles.alertText, ...styles.alertTextSuccess}}>
                        Listo para marcar el contenedor como recibido
                      </p>
                    </div>
                  </div>
                </div>
              </Show>
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleReset}
              style={{...styles.button, ...styles.secondaryButton}}
            >
              Cancelar y Escanear Nuevo Contenedor
            </button>
          </div>
        </Show>

        {/* COMPLETED STATE: Ready to Mark as Received */}
        <Show when={state() === 'completed'}>
          <div style={styles.successCard}>
            <div style={styles.textCenter}>
              <div style={{...styles.completedIcon, 'animation': 'bounce-once 0.6s ease-in-out'}}>
                <div>✓</div>
              </div>
              <h2 style={styles.completedTitle}>¡Todos los Bultos Escaneados!</h2>
              <p style={styles.completedSubtitle}>
                Se escanearon exitosamente los {progress().total} bulto{progress().total !== 1 ? 's' : ''}
              </p>
            </div>

            <div style={styles.infoBox}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>ID del Contenedor:</span>
                <span style={styles.infoValue}>{container()?.containerNumber || container()?.id}</span>
              </div>
              <div style={{...styles.infoRow, 'margin-bottom': '0'}}>
                <span style={styles.infoLabel}>Total de Bultos:</span>
                <span style={styles.infoValueSuccess}>{progress().total}</span>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={handleMarkAsReceived}
                disabled={isProcessing()}
                style={{
                  ...styles.button,
                  ...styles.successButton,
                  ...(isProcessing() ? {background: 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 100%)', cursor: 'not-allowed'} : {})
                }}
              >
                {isProcessing() ? (
                  <span style={{'animation': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'}}>Procesando...</span>
                ) : (
                  "Marcar como Recibido"
                )}
              </button>

              <button
                onClick={handleReset}
                style={{...styles.button, background: 'white', color: '#334155', border: '2px solid #cbd5e1', 'font-weight': '600'}}
              >
                Escanear Nuevo Contenedor
              </button>
            </div>
          </div>
        </Show>

        {/* RECEIVED STATE: Success */}
        <Show when={state() === 'received'}>
          <div style={styles.receivedCard}>
            <div style={styles.textCenter}>
              <div style={{...styles.receivedIcon, 'animation': 'bounce-once 0.6s ease-in-out'}}>
                <span>🎉</span>
              </div>
              <h2 style={styles.receivedTitle}>
                ¡Contenedor Recibido!
              </h2>
              <p style={styles.receivedSubtitle}>
                El contenedor ha sido marcado como recibido exitosamente
              </p>
              <div style={styles.timestampBadge}>
                <span>{new Date().toLocaleString('es-ES')}</span>
              </div>
            </div>

            <div style={styles.infoPanel}>
              <div style={styles.alertContent}>
                <div style={styles.infoPanelIcon}>
                  <div>📦</div>
                </div>
                <div style={styles.flex1}>
                  <div style={styles.infoPanelTitle}>
                    Información del Contenedor
                  </div>
                  <div style={styles.flexCol}>
                    <div style={styles.infoPanelRow}>
                      <span style={{'color': '#475569', 'font-weight': '600'}}>ID del Contenedor:</span>
                      <span style={{...styles.textMono, 'font-weight': '700', color: '#0f172a', background: '#f1f5f9', padding: '0.25rem 0.75rem', 'border-radius': '0.375rem'}}>{container()?.containerNumber || container()?.id}</span>
                    </div>
                    <div style={styles.infoPanelRow}>
                      <span style={{'color': '#475569', 'font-weight': '600'}}>Total de Bultos:</span>
                      <span style={{'font-weight': '700', color: '#047857', background: '#d1fae5', padding: '0.25rem 0.75rem', 'border-radius': '0.375rem'}}>{progress().total}</span>
                    </div>
                    <div style={{...styles.infoPanelRow, 'margin-bottom': '0'}}>
                      <span style={{'color': '#475569', 'font-weight': '600'}}>Estado:</span>
                      <span style={styles.statusBadge}>
                        ✓ Recibido
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{...styles.button, ...styles.primaryButton}}
            >
              Escanear Siguiente Contenedor
            </button>
          </div>
        </Show>

      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        @keyframes slide-down {
          0% {
            transform: translateY(-10px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.1); }
          50% { transform: scale(0.95); }
          75% { transform: scale(1.05); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default ContainerScanner;
