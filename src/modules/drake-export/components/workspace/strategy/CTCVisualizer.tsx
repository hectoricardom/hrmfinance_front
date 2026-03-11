/**
 * CTCVisualizer — Visual Schedule 8812 breakdown
 * Shows how the Child Tax Credit flows through non-refundable CTC → ACTC.
 * Dark theme matching EICCurveChart.
 */

import { Component, Show, For, createMemo } from 'solid-js';

interface CTCVisualizerProps {
  qualifyingChildren: number;
  childNames: { name: string; age: number | null }[];
  totalCTC: number;
  taxLiability: number;
  nonRefundableCTC: number;
  refundableACTC: number;
  earnedIncome: number;
  agi: number;
  filingStatus: string;
  taxYear: number;
  isPhasedOut: boolean;
  phaseOutReduction: number;
}

const fmt = (n: number) => `$${n.toLocaleString()}`;

const CTCVisualizer: Component<CTCVisualizerProps> = (props) => {
  // Schedule 8812 intermediate values
  const unusedCTC = createMemo(() => props.totalCTC - props.nonRefundableCTC);
  const perChildCap = createMemo(() => props.qualifyingChildren * 1700);
  const line17 = createMemo(() => Math.min(unusedCTC(), perChildCap()));
  const excessEarned = createMemo(() => Math.max(0, props.earnedIncome - 2500));
  const line20 = createMemo(() => Math.round(excessEarned() * 0.15));
  const totalBenefit = createMemo(() => props.nonRefundableCTC + props.refundableACTC);

  // SVG waterfall chart
  const W = 800;
  const H = 300;
  const PAD = { top: 30, right: 30, bottom: 20, left: 20 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Bar data for the waterfall
  const bars = createMemo(() => {
    const maxVal = Math.max(props.totalCTC, props.earnedIncome * 0.2, 1);
    const items: {
      label: string;
      sublabel: string;
      value: number;
      color: string;
      lineRef?: string;
    }[] = [
      {
        label: `${props.qualifyingChildren} hijo${props.qualifyingChildren !== 1 ? 's' : ''} × $2,000`,
        sublabel: 'Potential CTC',
        value: props.totalCTC,
        color: '#3b82f6',
        lineRef: 'Line 5',
      },
      {
        label: `Tax liability: ${fmt(props.taxLiability)}`,
        sublabel: 'Non-refundable CTC',
        value: props.nonRefundableCTC,
        color: '#8b5cf6',
        lineRef: 'Line 14',
      },
      {
        label: `Unused: ${fmt(unusedCTC())}`,
        sublabel: `Cap: ${props.qualifyingChildren} × $1,700`,
        value: line17(),
        color: '#f59e0b',
        lineRef: 'Line 17',
      },
      {
        label: `15% × (${fmt(props.earnedIncome)} - $2,500)`,
        sublabel: '15% of excess earned income',
        value: line20(),
        color: '#06b6d4',
        lineRef: 'Line 20',
      },
      {
        label: `MIN(${fmt(line17())}, ${fmt(line20())})`,
        sublabel: 'Refundable ACTC',
        value: props.refundableACTC,
        color: '#22c55e',
        lineRef: 'Line 27',
      },
    ];
    return { items, maxVal };
  });

  const barH = 36;
  const barGap = 14;
  const labelW = 120;
  const chartLeft = PAD.left + labelW;
  const chartW = plotW - labelW - 60;

  const toBarW = (val: number) => Math.max(0, (val / Math.max(bars().maxVal, 1)) * chartW);

  // Filing status label
  const filingLabel = createMemo(() => {
    const map: Record<string, string> = {
      single: 'Single',
      married_filing_jointly: 'MFJ',
      married_filing_separately: 'MFS',
      head_of_household: 'HOH',
      qualifying_widow: 'QSS',
    };
    return map[props.filingStatus] || props.filingStatus;
  });

  // Flow arrow connector points
  const connectorY = (idx: number) => PAD.top + idx * (barH + barGap) + barH / 2;

  return (
    <div style={{
      background: 'linear-gradient(145deg, #0a0f1a 0%, #111827 50%, #0d1520 100%)',
      'border-radius': '12px',
      padding: '24px 20px',
      color: '#e2e8f0',
      "font-family": "'DM Sans', -apple-system, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '6px' }}>
        <span style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(34,197,94,0.15))',
          border: '1px solid rgba(59,130,246,0.25)',
          'border-radius': '20px',
          padding: '4px 12px',
          'font-size': '11px',
          'font-weight': '600',
          'letter-spacing': '0.08em',
          'text-transform': 'uppercase',
          color: '#3b82f6',
        }}>
          Schedule 8812 · Tax Year {props.taxYear}
        </span>
      </div>

      <h3 style={{
        'font-size': 'clamp(20px, 3.5vw, 28px)',
        'font-weight': '700',
        margin: '8px 0 4px',
        background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'line-height': '1.15',
      }}>
        Child Tax Credit / ACTC
      </h3>
      <p style={{ color: '#64748b', 'font-size': '14px', margin: '0 0 20px' }}>
        {filingLabel()} · {props.qualifyingChildren} Qualifying Child{props.qualifyingChildren !== 1 ? 'ren' : ''}
        {props.childNames.length > 0 && ` · ${props.childNames.map(c => c.name).join(', ')}`}
      </p>

      {/* Main Credit Callout */}
      <div style={{
        display: 'flex',
        gap: '12px',
        'margin-bottom': '20px',
        'flex-wrap': 'wrap',
      }}>
        {/* Total CTC Benefit */}
        <div style={{
          flex: '1 1 200px',
          display: 'flex',
          'align-items': 'center',
          gap: '14px',
          padding: '14px 18px',
          background: totalBenefit() > 0
            ? 'rgba(34,197,94,0.08)'
            : 'rgba(239,68,68,0.08)',
          border: `1px solid ${totalBenefit() > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          'border-radius': '10px',
        }}>
          <div style={{
            width: '44px', height: '44px', 'border-radius': '50%',
            background: totalBenefit() > 0 ? '#22c55e' : '#ef4444',
            display: 'flex', 'align-items': 'center', 'justify-content': 'center',
            'flex-shrink': '0',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              {totalBenefit() > 0
                ? <path d="M5 13l4 4L19 7" />
                : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              }
            </svg>
          </div>
          <div>
            <div style={{ 'font-size': '12px', color: '#94a3b8' }}>
              Beneficio total CTC / Total CTC Benefit
            </div>
            <div style={{
              'font-size': '26px', 'font-weight': '700',
              color: totalBenefit() > 0 ? '#22c55e' : '#ef4444',
            }}>
              {fmt(totalBenefit())}
            </div>
          </div>
        </div>

        {/* Split cards */}
        <div style={{
          flex: '1 1 280px',
          display: 'grid',
          'grid-template-columns': '1fr 1fr',
          gap: '10px',
        }}>
          <div style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.2)',
            'border-radius': '10px',
            padding: '12px 14px',
            'text-align': 'center',
          }}>
            <div style={{ 'font-size': '10px', color: '#a78bfa', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>
              Line 19 · Non-Refundable
            </div>
            <div style={{ 'font-size': '22px', 'font-weight': '700', color: '#a78bfa', 'font-family': 'monospace' }}>
              {fmt(props.nonRefundableCTC)}
            </div>
            <div style={{ 'font-size': '10px', color: '#64748b', 'margin-top': '2px' }}>
              Reduces tax to {fmt(Math.max(0, props.taxLiability - props.nonRefundableCTC))}
            </div>
          </div>
          <div style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            'border-radius': '10px',
            padding: '12px 14px',
            'text-align': 'center',
          }}>
            <div style={{ 'font-size': '10px', color: '#4ade80', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>
              Line 28 · ACTC Refundable
            </div>
            <div style={{ 'font-size': '22px', 'font-weight': '700', color: '#4ade80', 'font-family': 'monospace' }}>
              {fmt(props.refundableACTC)}
            </div>
            <div style={{ 'font-size': '10px', color: '#64748b', 'margin-top': '2px' }}>
              Added to your refund
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall Chart */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        'border-radius': '12px',
        padding: '12px 0',
        'margin-bottom': '20px',
        overflow: 'hidden',
      }}>
        <svg
          viewBox={`0 0 ${W} ${bars().items.length * (barH + barGap) + PAD.top + PAD.bottom}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="ctcBarGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.6" />
            </linearGradient>
            <filter id="ctcGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <For each={bars().items}>
            {(bar, i) => {
              const y = PAD.top + i() * (barH + barGap);
              const bw = toBarW(bar.value);
              const isResult = i() === bars().items.length - 1;

              return (
                <>
                  {/* Flow connector arrow */}
                  <Show when={i() > 0}>
                    <path
                      d={`M ${chartLeft + toBarW(bars().items[i() - 1].value) / 2} ${y - barGap + 2}
                          L ${chartLeft + bw / 2} ${y - 2}`}
                      stroke="rgba(255,255,255,0.08)"
                      stroke-width="1.5"
                      fill="none"
                      marker-end="url(#arrowHead)"
                    />
                  </Show>

                  {/* Line reference label (left) */}
                  <text
                    x={PAD.left + 4}
                    y={y + barH / 2 + 1}
                    fill={bar.color}
                    font-size="10"
                    font-weight="600"
                    dominant-baseline="middle"
                    opacity="0.8"
                  >
                    {bar.lineRef}
                  </text>

                  {/* Sublabel */}
                  <text
                    x={PAD.left + 4}
                    y={y + barH / 2 + 13}
                    fill="#64748b"
                    font-size="9"
                    dominant-baseline="middle"
                  >
                    {bar.sublabel}
                  </text>

                  {/* Bar background */}
                  <rect
                    x={chartLeft}
                    y={y}
                    width={chartW}
                    height={barH}
                    rx="6"
                    fill="rgba(255,255,255,0.02)"
                  />

                  {/* Active bar */}
                  <rect
                    x={chartLeft}
                    y={y}
                    width={Math.max(bw, bar.value > 0 ? 4 : 0)}
                    height={barH}
                    rx="6"
                    fill={bar.color}
                    opacity={isResult ? 1 : 0.7}
                    filter={isResult ? 'url(#ctcGlow)' : undefined}
                  />

                  {/* Value on bar */}
                  <text
                    x={chartLeft + Math.max(bw, 4) + 8}
                    y={y + barH / 2 + 1}
                    fill={bar.color}
                    font-size="14"
                    font-weight="700"
                    font-family="monospace"
                    dominant-baseline="middle"
                  >
                    {fmt(bar.value)}
                  </text>

                  {/* Calculation label (right of value) */}
                  <text
                    x={chartLeft + Math.max(bw, 4) + 8 + (fmt(bar.value).length * 9) + 8}
                    y={y + barH / 2 + 1}
                    fill="#64748b"
                    font-size="11"
                    dominant-baseline="middle"
                  >
                    {bar.label}
                  </text>

                  {/* Result highlight */}
                  <Show when={isResult}>
                    <rect
                      x={chartLeft - 2}
                      y={y - 2}
                      width={Math.max(bw, 4) + 4}
                      height={barH + 4}
                      rx="8"
                      fill="none"
                      stroke={bar.color}
                      stroke-width="1.5"
                      stroke-dasharray="4 2"
                      opacity="0.5"
                    />
                  </Show>
                </>
              );
            }}
          </For>

          {/* Arrow marker def */}
          <defs>
            <marker id="arrowHead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.15)" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Schedule 8812 Step-by-Step */}
      <div style={{
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        'margin-bottom': '20px',
      }}>
        {/* Step 1: Base CTC */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(59,130,246,0.15)',
          'border-radius': '10px',
          padding: '14px 16px',
          'border-left': '3px solid #3b82f6',
        }}>
          <div style={{ 'font-size': '11px', 'font-weight': '600', color: '#3b82f6', 'letter-spacing': '0.06em', 'margin-bottom': '2px' }}>
            PASO 1 — CTC BASE
          </div>
          <div style={{ 'font-size': '10px', color: '#64748b', 'margin-bottom': '8px' }}>Part I: Total Credit</div>
          <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#e2e8f0', 'font-family': 'monospace', 'margin-bottom': '4px' }}>
            {props.qualifyingChildren} × $2,000 = {fmt(props.qualifyingChildren * 2000)}
          </div>
          <Show when={props.isPhasedOut}>
            <div style={{ 'font-size': '12px', color: '#f59e0b' }}>
              Phase-out: -{fmt(props.phaseOutReduction)}
            </div>
          </Show>
          <div style={{ 'font-size': '12px', color: '#94a3b8' }}>
            Credito potencial: <b style={{ color: '#3b82f6' }}>{fmt(props.totalCTC)}</b>
          </div>
        </div>

        {/* Step 2: Non-refundable */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(139,92,246,0.15)',
          'border-radius': '10px',
          padding: '14px 16px',
          'border-left': '3px solid #8b5cf6',
        }}>
          <div style={{ 'font-size': '11px', 'font-weight': '600', color: '#8b5cf6', 'letter-spacing': '0.06em', 'margin-bottom': '2px' }}>
            PASO 2 — NO REEMBOLSABLE
          </div>
          <div style={{ 'font-size': '10px', color: '#64748b', 'margin-bottom': '8px' }}>Line 14: MIN(CTC, Tax)</div>
          <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#e2e8f0', 'font-family': 'monospace', 'margin-bottom': '4px' }}>
            MIN({fmt(props.totalCTC)}, {fmt(props.taxLiability)})
          </div>
          <div style={{ 'font-size': '12px', color: '#94a3b8' }}>
            Non-refundable: <b style={{ color: '#a78bfa' }}>{fmt(props.nonRefundableCTC)}</b>
          </div>
          <div style={{ 'font-size': '11px', color: '#64748b', 'margin-top': '4px' }}>
            Unused: {fmt(unusedCTC())} to ACTC
          </div>
        </div>

        {/* Step 3: ACTC */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(34,197,94,0.15)',
          'border-radius': '10px',
          padding: '14px 16px',
          'border-left': '3px solid #22c55e',
        }}>
          <div style={{ 'font-size': '11px', 'font-weight': '600', color: '#22c55e', 'letter-spacing': '0.06em', 'margin-bottom': '2px' }}>
            PASO 3 — ACTC REEMBOLSABLE
          </div>
          <div style={{ 'font-size': '10px', color: '#64748b', 'margin-bottom': '8px' }}>Part II-A: Schedule 8812</div>
          <div style={{ 'font-size': '12px', color: '#94a3b8', 'line-height': '1.8' }}>
            <div>Ln 17: MIN({fmt(unusedCTC())}, {fmt(perChildCap())}) = <b style={{ color: '#f59e0b' }}>{fmt(line17())}</b></div>
            <div>Ln 20: 15% × ({fmt(props.earnedIncome)} − $2,500) = <b style={{ color: '#06b6d4' }}>{fmt(line20())}</b></div>
            <div>Ln 27: MIN({fmt(line17())}, {fmt(line20())}) = <b style={{ color: '#4ade80' }}>{fmt(props.refundableACTC)}</b></div>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div style={{
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.12)',
        'border-radius': '10px',
        padding: '16px 20px',
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
      }}>
        <div style={{ 'text-align': 'center' }}>
          <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>CTC / Child</div>
          <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#3b82f6', 'font-family': 'monospace' }}>$2,000</div>
        </div>
        <div style={{ 'text-align': 'center' }}>
          <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Max ACTC / Child</div>
          <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#22c55e', 'font-family': 'monospace' }}>$1,700</div>
        </div>
        <div style={{ 'text-align': 'center' }}>
          <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Earned Income</div>
          <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#06b6d4', 'font-family': 'monospace' }}>{fmt(props.earnedIncome)}</div>
        </div>
        <div style={{ 'text-align': 'center' }}>
          <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>AGI</div>
          <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#f59e0b', 'font-family': 'monospace' }}>{fmt(props.agi)}</div>
        </div>
        <div style={{ 'text-align': 'center' }}>
          <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Tax Liability</div>
          <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#a78bfa', 'font-family': 'monospace' }}>{fmt(props.taxLiability)}</div>
        </div>
      </div>

      <p style={{ color: '#475569', 'font-size': '10px', 'text-align': 'center', 'margin-top': '14px', 'margin-bottom': '0' }}>
        Fuente: IRS Schedule 8812 ({props.taxYear}) · Instructions for Form 1040
      </p>
    </div>
  );
};

export default CTCVisualizer;
