import { Component, createSignal, For, Show, onMount } from 'solid-js';
import { Card, Button } from '../../ui';
import { inventoryApi } from '../../../services/apiAdapter';
import { showToast } from '../../../services/toastService';

interface Discrepancy {
  product_id: string;
  product_name?: string;
  product_code?: string;
  store_id: string;
  calculated_qty: number;
  current_qty: number;
  difference: number;
}

const StockReconciliation: Component = () => {
  const [discrepancies, setDiscrepancies] = createSignal<Discrepancy[]>([]);
  const [isChecking, setIsChecking] = createSignal(false);
  const [isFixing, setIsFixing] = createSignal(false);
  const [lastCheck, setLastCheck] = createSignal<Date | null>(null);
  const [fixResult, setFixResult] = createSignal<{ fixed: number; message: string } | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setFixResult(null);
    try {
      const result = await inventoryApi.reconcileStock(undefined, false);
      setDiscrepancies(result.discrepancies || []);
      setLastCheck(new Date());

      if (result.discrepancies?.length === 0) {
        showToast('No discrepancies found! Stock is consistent.', 'success');
      } else {
        showToast(`Found ${result.discrepancies.length} discrepancies`, 'warning');
      }
    } catch (err) {
      console.error('Error checking stock:', err);
      showToast('Failed to check stock reconciliation', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoFix = async () => {
    if (discrepancies().length === 0) return;

    const confirmed = window.confirm(
      `This will automatically fix ${discrepancies().length} stock discrepancies by updating the stored quantities to match calculated values.\n\nAre you sure you want to proceed?`
    );

    if (!confirmed) return;

    setIsFixing(true);
    try {
      const result = await inventoryApi.reconcileStock(undefined, true);
      setFixResult({
        fixed: result.fixed || 0,
        message: result.message || `Fixed ${result.fixed || 0} discrepancies`,
      });
      setDiscrepancies([]);
      showToast(`Successfully fixed ${result.fixed || 0} discrepancies`, 'success');
    } catch (err) {
      console.error('Error fixing discrepancies:', err);
      showToast('Failed to fix discrepancies', 'error');
    } finally {
      setIsFixing(false);
    }
  };

  const getTotalDifference = () => {
    return discrepancies().reduce((sum, d) => sum + Math.abs(d.difference), 0);
  };

  return (
    <div style={{ padding: '1.5rem', 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', 'font-size': '1.5rem' }}>
          ⚖️ Stock Reconciliation
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Compare calculated stock levels with stored values and fix discrepancies.
        </p>
      </div>

      {/* Actions Card */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'flex-wrap': 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Check for Discrepancies</h3>
              <p style={{ margin: 0, 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Scan inventory to find differences between calculated and stored stock levels.
              </p>
              <Show when={lastCheck()}>
                <p style={{ margin: '0.5rem 0 0', 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  Last checked: {lastCheck()!.toLocaleString()}
                </p>
              </Show>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="primary" onClick={handleCheck} disabled={isChecking()}>
                {isChecking() ? '🔄 Checking...' : '🔍 Check Stock'}
              </Button>
              <Show when={discrepancies().length > 0}>
                <Button variant="outline" onClick={handleAutoFix} disabled={isFixing()}>
                  {isFixing() ? '⏳ Fixing...' : `🔧 Auto-Fix All (${discrepancies().length})`}
                </Button>
              </Show>
            </div>
          </div>

          {/* Fix Result */}
          <Show when={fixResult()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              background: '#f0fdf4',
              'border-radius': '8px',
              color: '#166534',
            }}>
              ✅ {fixResult()!.message}
            </div>
          </Show>
        </div>
      </Card>

      {/* Summary Stats */}
      <Show when={discrepancies().length > 0}>
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', 'margin-top': '1rem' }}>
          <Card>
            <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
              <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#f59e0b' }}>
                {discrepancies().length}
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Discrepancies Found
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
              <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#dc2626' }}>
                {getTotalDifference()}
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Total Unit Difference
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
              <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#3b82f6' }}>
                {new Set(discrepancies().map(d => d.store_id)).size}
              </div>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Stores Affected
              </div>
            </div>
          </Card>
        </div>
      </Show>

      {/* Discrepancies Table */}
      <Card>
        <div style={{ padding: '1rem', 'margin-top': '1rem' }}>
          <h3 style={{ margin: '0 0 1rem' }}>Discrepancies</h3>

          <Show when={!lastCheck() && discrepancies().length === 0}>
            <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>🔍</div>
              <p>Click "Check Stock" to scan for discrepancies.</p>
            </div>
          </Show>

          <Show when={lastCheck() && discrepancies().length === 0}>
            <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>✅</div>
              <p>No discrepancies found! Stock levels are consistent.</p>
            </div>
          </Show>

          <Show when={discrepancies().length > 0}>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                <thead>
                  <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Product</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Store</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Calculated</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Stored</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right', 'font-size': '0.75rem', 'text-transform': 'uppercase', color: 'var(--text-muted)' }}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={discrepancies()}>
                    {(d) => (
                      <tr style={{ 'border-bottom': '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ 'font-weight': '600' }}>{d.product_name || d.product_id}</div>
                          <Show when={d.product_code}>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>{d.product_code}</div>
                          </Show>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{d.store_id}</td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '600', color: '#22c55e' }}>
                          {d.calculated_qty}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '600', color: '#3b82f6' }}>
                          {d.current_qty}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          'text-align': 'right',
                          'font-weight': '700',
                          color: d.difference !== 0 ? '#dc2626' : 'inherit',
                        }}>
                          {d.difference > 0 ? '+' : ''}{d.difference}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              background: '#fef3c7',
              'border-radius': '8px',
              'font-size': '0.875rem',
              color: '#92400e',
            }}>
              <strong>⚠️ Note:</strong> Auto-fix will update the stored quantities to match the calculated values based on movement history.
              Review the differences carefully before proceeding.
            </div>
          </Show>
        </div>
      </Card>
    </div>
  );
};

export default StockReconciliation;
