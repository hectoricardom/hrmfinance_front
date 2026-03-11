import { Component, createSignal, For, Show, onMount } from 'solid-js';
import { Card, Button } from '../../ui';
import { inventoryApi } from '../../../services/apiAdapter';
import { showToast } from '../../../services/toastService';

interface OrphanedMovement {
  movement_id: string;
  movement_type: string;
  invoice_ref: string | null;
  invoice_id: string | null;
  orphaned_at: string | null;
  orphan_reason: string | null;
  store: string;
  created_at: string;
}

const OrphanManagement: Component = () => {
  const [orphans, setOrphans] = createSignal<OrphanedMovement[]>([]);
  const [totalCount, setTotalCount] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isScanning, setIsScanning] = createSignal(false);
  const [isMarking, setIsMarking] = createSignal(false);
  const [scanResult, setScanResult] = createSignal<{ count: number; message: string } | null>(null);

  const loadOrphans = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.getOrphanedMovements(100);
      setOrphans(data.orphans || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error('Error loading orphans:', err);
      showToast('Failed to load orphaned movements', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const result = await inventoryApi.detectOrphanedMovements();
      setScanResult({
        count: result.count || 0,
        message: result.message || `Found ${result.count || 0} orphaned movements`,
      });
      showToast(result.message || 'Scan complete', 'info');
    } catch (err) {
      console.error('Error scanning:', err);
      showToast('Failed to scan for orphans', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleMarkOrphans = async () => {
    setIsMarking(true);
    try {
      const result = await inventoryApi.markOrphanedMovements();
      showToast(`Marked ${result.markedCount || 0} movements as orphaned`, 'success');
      setScanResult(null);
      await loadOrphans();
    } catch (err) {
      console.error('Error marking orphans:', err);
      showToast('Failed to mark orphans', 'error');
    } finally {
      setIsMarking(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReasonStyle = (reason: string | null) => {
    if (reason === 'invoice_deleted') {
      return { bg: '#fef2f2', color: '#dc2626' };
    }
    return { bg: '#fffbeb', color: '#f59e0b' };
  };

  onMount(() => {
    loadOrphans();
  });

  return (
    <div style={{ padding: '1.5rem', 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', 'font-size': '1.5rem' }}>
          🔍 Orphaned Movements
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Manage inventory movements that have lost their linked invoices.
        </p>
      </div>

      {/* Actions Card */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'flex-wrap': 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem' }}>
                {totalCount()} Orphaned Movements
              </h3>
              <p style={{ margin: 0, 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                These movements have invoices that were deleted or not found.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="outline" onClick={handleScan} disabled={isScanning()}>
                {isScanning() ? '🔄 Scanning...' : '🔍 Scan for Orphans'}
              </Button>
              <Show when={scanResult() && scanResult()!.count > 0}>
                <Button variant="primary" onClick={handleMarkOrphans} disabled={isMarking()}>
                  {isMarking() ? '⏳ Marking...' : `✓ Mark ${scanResult()!.count} Orphans`}
                </Button>
              </Show>
              <Button variant="outline" onClick={loadOrphans}>
                🔄 Refresh
              </Button>
            </div>
          </div>

          {/* Scan Result */}
          <Show when={scanResult()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              background: scanResult()!.count > 0 ? '#fffbeb' : '#f0fdf4',
              'border-radius': '8px',
              color: scanResult()!.count > 0 ? '#92400e' : '#166534',
            }}>
              {scanResult()!.message}
            </div>
          </Show>
        </div>
      </Card>

      {/* Orphans Table */}
      <Card>
        <div style={{ padding: '1rem', 'margin-top': '1rem' }}>
          <Show when={isLoading()}>
            <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading orphaned movements...
            </div>
          </Show>

          <Show when={!isLoading() && orphans().length === 0}>
            <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>✅</div>
              <p>No orphaned movements found. All movements are properly linked!</p>
            </div>
          </Show>

          <Show when={!isLoading() && orphans().length > 0}>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                <thead>
                  <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Movement ID</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Type</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Invoice Ref</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Store</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Created</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Orphaned</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={orphans()}>
                    {(orphan) => {
                      const reasonStyle = getReasonStyle(orphan.orphan_reason);
                      return (
                        <tr style={{ 'border-bottom': '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', 'font-family': 'monospace', 'font-size': '0.8rem' }}>
                            {orphan.movement_id.substring(0, 12)}...
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              'border-radius': '4px',
                              'font-size': '0.75rem',
                              'font-weight': '600',
                              background: orphan.movement_type === 'SALES' ? '#fef2f2' : '#f0fdf4',
                              color: orphan.movement_type === 'SALES' ? '#dc2626' : '#22c55e',
                            }}>
                              {orphan.movement_type}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>{orphan.invoice_ref || '-'}</td>
                          <td style={{ padding: '0.75rem' }}>{orphan.store || '-'}</td>
                          <td style={{ padding: '0.75rem', 'font-size': '0.8rem' }}>{formatDate(orphan.created_at)}</td>
                          <td style={{ padding: '0.75rem', 'font-size': '0.8rem' }}>{formatDate(orphan.orphaned_at)}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <Show when={orphan.orphan_reason}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                'border-radius': '4px',
                                'font-size': '0.75rem',
                                background: reasonStyle.bg,
                                color: reasonStyle.color,
                              }}>
                                {orphan.orphan_reason}
                              </span>
                            </Show>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Card>
    </div>
  );
};

export default OrphanManagement;
