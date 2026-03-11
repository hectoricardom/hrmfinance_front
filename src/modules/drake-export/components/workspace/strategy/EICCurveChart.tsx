/**
 * EIC Curve Chart - Pure SVG SolidJS component
 * Shows the Earned Income Credit curve with the client's position highlighted.
 * Uses actual IRS brackets from creditCalculator for the given tax year,
 * filing status, and qualifying children count.
 */

import { Component, createSignal, createMemo, For, Show } from 'solid-js';

interface EICCurveChartProps {
  earnedIncome: number;
  creditAmount: number;
  qualifyingChildren: number;
  filingStatus: string;
  taxYear: number;
  agi?: number;
}

interface EITCBracket {
  maxCredit: number;
  phaseInEnd: number;
  phaseOutStartSingle: number;
  phaseOutStartMFJ: number;
  maxIncomeSingle: number;
  maxIncomeMFJ: number;
  phaseInRate: number;
  phaseOutRate: number;
}

// IRS EIC parameters — must match creditCalculator.ts
const brackets2024: Record<number, EITCBracket> = {
  0: { maxCredit: 632, phaseInEnd: 7_840, phaseOutStartSingle: 9_800, phaseOutStartMFJ: 16_370, maxIncomeSingle: 18_591, maxIncomeMFJ: 25_511, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
  1: { maxCredit: 4_213, phaseInEnd: 12_390, phaseOutStartSingle: 22_720, phaseOutStartMFJ: 29_290, maxIncomeSingle: 49_084, maxIncomeMFJ: 56_004, phaseInRate: 0.34, phaseOutRate: 0.1598 },
  2: { maxCredit: 6_960, phaseInEnd: 17_400, phaseOutStartSingle: 22_720, phaseOutStartMFJ: 29_290, maxIncomeSingle: 55_768, maxIncomeMFJ: 62_688, phaseInRate: 0.40, phaseOutRate: 0.2106 },
  3: { maxCredit: 7_830, phaseInEnd: 17_400, phaseOutStartSingle: 22_720, phaseOutStartMFJ: 29_290, maxIncomeSingle: 59_899, maxIncomeMFJ: 66_819, phaseInRate: 0.45, phaseOutRate: 0.2106 },
};

const brackets2025: Record<number, EITCBracket> = {
  0: { maxCredit: 649, phaseInEnd: 8_490, phaseOutStartSingle: 10_620, phaseOutStartMFJ: 17_620, maxIncomeSingle: 19_104, maxIncomeMFJ: 26_214, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
  1: { maxCredit: 4_328, phaseInEnd: 12_730, phaseOutStartSingle: 23_350, phaseOutStartMFJ: 30_350, maxIncomeSingle: 50_434, maxIncomeMFJ: 57_554, phaseInRate: 0.34, phaseOutRate: 0.1598 },
  2: { maxCredit: 7_152, phaseInEnd: 17_880, phaseOutStartSingle: 23_350, phaseOutStartMFJ: 30_350, maxIncomeSingle: 57_310, maxIncomeMFJ: 64_430, phaseInRate: 0.40, phaseOutRate: 0.2106 },
  3: { maxCredit: 8_046, phaseInEnd: 17_880, phaseOutStartSingle: 23_350, phaseOutStartMFJ: 30_350, maxIncomeSingle: 61_555, maxIncomeMFJ: 68_675, phaseInRate: 0.45, phaseOutRate: 0.2106 },
};

function getBracket(taxYear: number, children: number): EITCBracket {
  const table = taxYear === 2025 ? brackets2025 : brackets2024;
  return table[Math.min(children, 3)];
}

function calcEIC(income: number, bracket: EITCBracket, isMFJ: boolean): number {
  if (income <= 0) return 0;
  const phaseOutStart = isMFJ ? bracket.phaseOutStartMFJ : bracket.phaseOutStartSingle;
  const maxIncome = isMFJ ? bracket.maxIncomeMFJ : bracket.maxIncomeSingle;
  if (income > maxIncome) return 0;
  if (income <= bracket.phaseInEnd) return Math.min(Math.floor(income * bracket.phaseInRate), bracket.maxCredit);
  if (income <= phaseOutStart) return bracket.maxCredit;
  const reduction = (income - phaseOutStart) * bracket.phaseOutRate;
  return Math.max(0, Math.floor(bracket.maxCredit - reduction));
}

const EICCurveChart: Component<EICCurveChartProps> = (props) => {
  const [hoverPoint, setHoverPoint] = createSignal<{ income: number; credit: number; x: number; y: number } | null>(null);

  const isMFJ = () => props.filingStatus === 'married_filing_jointly';
  const bracket = createMemo(() => getBracket(props.taxYear, props.qualifyingChildren));

  const maxIncome = createMemo(() => isMFJ() ? bracket().maxIncomeMFJ : bracket().maxIncomeSingle);
  const phaseOutStart = createMemo(() => isMFJ() ? bracket().phaseOutStartMFJ : bracket().phaseOutStartSingle);

  // Chart dimensions
  const W = 800;
  const H = 340;
  const PAD = { top: 20, right: 30, bottom: 50, left: 65 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // X/Y domain with some padding past the max
  const xMax = createMemo(() => Math.ceil((maxIncome() * 1.1) / 5000) * 5000);
  const yMax = createMemo(() => bracket().maxCredit * 1.2);

  const toX = (income: number) => PAD.left + (income / xMax()) * plotW;
  const toY = (credit: number) => PAD.top + plotH - (credit / yMax()) * plotH;

  // Generate curve data points
  const curvePoints = createMemo(() => {
    const pts: { income: number; credit: number }[] = [];
    const step = Math.max(100, Math.floor(xMax() / 400));
    for (let i = 0; i <= xMax(); i += step) {
      pts.push({ income: i, credit: calcEIC(i, bracket(), isMFJ()) });
    }
    return pts;
  });

  // SVG area path
  const areaPath = createMemo(() => {
    const pts = curvePoints();
    if (pts.length === 0) return '';
    let d = `M ${toX(pts[0].income)} ${toY(pts[0].credit)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${toX(pts[i].income)} ${toY(pts[i].credit)}`;
    }
    // Close to baseline
    d += ` L ${toX(pts[pts.length - 1].income)} ${toY(0)}`;
    d += ` L ${toX(0)} ${toY(0)} Z`;
    return d;
  });

  // SVG line path (just the top edge)
  const linePath = createMemo(() => {
    const pts = curvePoints();
    if (pts.length === 0) return '';
    let d = `M ${toX(pts[0].income)} ${toY(pts[0].credit)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${toX(pts[i].income)} ${toY(pts[i].credit)}`;
    }
    return d;
  });

  // X-axis ticks
  const xTicks = createMemo(() => {
    const ticks: number[] = [];
    const step = xMax() <= 30000 ? 5000 : 10000;
    for (let v = 0; v <= xMax(); v += step) ticks.push(v);
    return ticks;
  });

  // Y-axis ticks
  const yTicks = createMemo(() => {
    const ticks: number[] = [];
    const step = bracket().maxCredit <= 1000 ? 200 : bracket().maxCredit <= 5000 ? 1000 : 2000;
    for (let v = 0; v <= yMax(); v += step) ticks.push(v);
    return ticks;
  });

  // Client position on the curve
  const clientX = createMemo(() => toX(props.earnedIncome));
  const clientY = createMemo(() => toY(props.creditAmount));
  const clientInRange = createMemo(() => props.earnedIncome >= 0 && props.earnedIncome <= xMax());

  // Handle mouse move for tooltip
  const handleMouseMove = (e: MouseEvent) => {
    const svg = (e.currentTarget as SVGSVGElement);
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = W / rect.width;
    const svgX = mouseX * scaleX;
    const income = Math.max(0, ((svgX - PAD.left) / plotW) * xMax());
    if (income < 0 || income > xMax()) { setHoverPoint(null); return; }
    const credit = calcEIC(Math.round(income), bracket(), isMFJ());
    setHoverPoint({ income: Math.round(income), credit, x: toX(Math.round(income)), y: toY(credit) });
  };

  // Phase card data
  const phases = createMemo(() => [
    {
      label: 'FASE DE ENTRADA',
      sublabel: 'Phase-In',
      range: `$0 – $${bracket().phaseInEnd.toLocaleString()}`,
      color: '#3b82f6',
      desc: `El credito sube a ${(bracket().phaseInRate * 100).toFixed(bracket().phaseInRate < 0.1 ? 2 : 0)}¢ por cada $1 ganado`,
    },
    {
      label: 'MESETA / MAXIMO',
      sublabel: 'Plateau',
      range: `$${bracket().phaseInEnd.toLocaleString()} – $${phaseOutStart().toLocaleString()}`,
      color: '#63d297',
      desc: `Credito maximo de $${bracket().maxCredit.toLocaleString()}`,
    },
    {
      label: 'FASE DE SALIDA',
      sublabel: 'Phase-Out',
      range: `$${phaseOutStart().toLocaleString()} – $${maxIncome().toLocaleString()}`,
      color: '#f59e0b',
      desc: `El credito baja a ~${(bracket().phaseOutRate * 100).toFixed(bracket().phaseOutRate < 0.1 ? 2 : 0)}¢ por cada $1 adicional`,
    },
  ]);

  const stats = createMemo(() => {
    const b = bracket();
    return [
      { label: 'Credito Maximo', value: `$${b.maxCredit.toLocaleString()}` },
      { label: `Limite AGI (${isMFJ() ? 'MFJ' : 'Single/HOH'})`, value: `$${maxIncome().toLocaleString()}` },
      { label: 'Limite Inversiones', value: props.taxYear === 2025 ? '$11,950' : '$11,600' },
      { label: 'Hijos Calificados', value: `${props.qualifyingChildren}` },
    ];
  });

  // Filing status label
  const filingLabel = createMemo(() => {
    const map: Record<string, string> = {
      single: 'Single',
      married_filing_jointly: 'Married Filing Jointly',
      married_filing_separately: 'MFS',
      head_of_household: 'Head of Household',
      qualifying_widow: 'Qualifying Widow(er)',
    };
    return map[props.filingStatus] || props.filingStatus;
  });

  return (
    <div style={{
      background: 'linear-gradient(145deg, #0a0f1a 0%, #111827 50%, #0d1520 100%)',
      'border-radius': '12px',
      padding: '24px 20px',
      color: '#e2e8f0',
      'font-family': "'DM Sans', -apple-system, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '6px' }}>
        <span style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, rgba(99,210,151,0.15), rgba(59,130,246,0.15))',
          border: '1px solid rgba(99,210,151,0.25)',
          'border-radius': '20px',
          padding: '4px 12px',
          'font-size': '11px',
          'font-weight': '600',
          'letter-spacing': '0.08em',
          'text-transform': 'uppercase',
          color: '#63d297',
        }}>
          Tax Year {props.taxYear}
        </span>
      </div>

      <h3 style={{
        'font-size': 'clamp(22px, 4vw, 32px)',
        'font-weight': '700',
        margin: '8px 0 4px',
        background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'line-height': '1.15',
      }}>
        Curva del Earned Income Credit
      </h3>
      <p style={{ color: '#64748b', 'font-size': '14px', margin: '0 0 20px' }}>
        {filingLabel()} · {props.qualifyingChildren} Qualifying Child{props.qualifyingChildren !== 1 ? 'ren' : ''}
      </p>

      {/* Client's Credit Callout */}
      <Show when={props.earnedIncome > 0}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '16px',
          padding: '12px 16px',
          background: props.creditAmount > 0
            ? 'rgba(99,210,151,0.1)'
            : 'rgba(239,68,68,0.1)',
          border: `1px solid ${props.creditAmount > 0 ? 'rgba(99,210,151,0.25)' : 'rgba(239,68,68,0.25)'}`,
          'border-radius': '10px',
          'margin-bottom': '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            'border-radius': '50%',
            background: props.creditAmount > 0 ? '#22c55e' : '#ef4444',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'flex-shrink': '0',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              {props.creditAmount > 0
                ? <path d="M5 13l4 4L19 7" />
                : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              }
            </svg>
          </div>
          <div>
            <div style={{ 'font-size': '13px', color: '#94a3b8' }}>
              Su credito EIC estimado / Your estimated EIC
            </div>
            <div style={{
              'font-size': '28px',
              'font-weight': '700',
              color: props.creditAmount > 0 ? '#63d297' : '#ef4444',
            }}>
              ${props.creditAmount.toLocaleString()}
            </div>
            <div style={{ 'font-size': '12px', color: '#64748b' }}>
              Ingreso ganado: ${props.earnedIncome.toLocaleString()}
              {props.agi && props.agi !== props.earnedIncome ? ` · AGI: $${props.agi.toLocaleString()}` : ''}
            </div>
          </div>
        </div>
      </Show>

      {/* SVG Chart */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        'border-radius': '12px',
        padding: '8px 0 0',
        'margin-bottom': '20px',
        overflow: 'hidden',
      }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPoint(null)}
        >
          <defs>
            <linearGradient id="eicFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#63d297" stop-opacity="0.35" />
              <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.15" />
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02" />
            </linearGradient>
            <linearGradient id="eicStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="25%" stop-color="#63d297" />
              <stop offset="50%" stop-color="#63d297" />
              <stop offset="100%" stop-color="#f59e0b" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <For each={yTicks()}>
            {(v) => (
              <line
                x1={PAD.left} y1={toY(v)}
                x2={W - PAD.right} y2={toY(v)}
                stroke="rgba(255,255,255,0.04)" stroke-dasharray="3 3"
              />
            )}
          </For>
          <For each={xTicks()}>
            {(v) => (
              <line
                x1={toX(v)} y1={PAD.top}
                x2={toX(v)} y2={PAD.top + plotH}
                stroke="rgba(255,255,255,0.04)" stroke-dasharray="3 3"
              />
            )}
          </For>

          {/* Reference lines at phase boundaries */}
          <line x1={toX(bracket().phaseInEnd)} y1={PAD.top} x2={toX(bracket().phaseInEnd)} y2={PAD.top + plotH} stroke="#3b82f6" stroke-dasharray="4 4" stroke-opacity="0.5" />
          <line x1={toX(phaseOutStart())} y1={PAD.top} x2={toX(phaseOutStart())} y2={PAD.top + plotH} stroke="#63d297" stroke-dasharray="4 4" stroke-opacity="0.5" />
          <line x1={toX(maxIncome())} y1={PAD.top} x2={toX(maxIncome())} y2={PAD.top + plotH} stroke="#f59e0b" stroke-dasharray="4 4" stroke-opacity="0.5" />
          {/* Max credit horizontal line */}
          <line x1={PAD.left} y1={toY(bracket().maxCredit)} x2={W - PAD.right} y2={toY(bracket().maxCredit)} stroke="rgba(99,210,151,0.25)" stroke-dasharray="6 4" />

          {/* Area fill */}
          <path d={areaPath()} fill="url(#eicFill)" />
          {/* Line */}
          <path d={linePath()} fill="none" stroke="url(#eicStroke)" stroke-width="2.5" />

          {/* X axis labels */}
          <For each={xTicks()}>
            {(v) => (
              <text x={toX(v)} y={H - PAD.bottom + 20} text-anchor="middle" fill="#64748b" font-size="11" font-family="monospace">
                ${(v / 1000).toFixed(0)}K
              </text>
            )}
          </For>
          <text x={PAD.left + plotW / 2} y={H - 4} text-anchor="middle" fill="#475569" font-size="11">
            Ingreso / Earned Income
          </text>

          {/* Y axis labels */}
          <For each={yTicks()}>
            {(v) => (
              <text x={PAD.left - 8} y={toY(v) + 4} text-anchor="end" fill="#64748b" font-size="11" font-family="monospace">
                ${v.toLocaleString()}
              </text>
            )}
          </For>

          {/* Hover crosshair + tooltip */}
          <Show when={hoverPoint()}>
            <line x1={hoverPoint()!.x} y1={PAD.top} x2={hoverPoint()!.x} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.15)" stroke-width="1" />
            <circle cx={hoverPoint()!.x} cy={hoverPoint()!.y} r="5" fill="#63d297" stroke="#0a0f1a" stroke-width="2.5" />
            {/* Tooltip background */}
            <rect
              x={hoverPoint()!.x + (hoverPoint()!.x > W / 2 ? -155 : 12)}
              y={Math.max(PAD.top, hoverPoint()!.y - 44)}
              width="140" height="54" rx="8"
              fill="rgba(15,23,42,0.95)" stroke="rgba(99,210,151,0.3)"
            />
            <text
              x={hoverPoint()!.x + (hoverPoint()!.x > W / 2 ? -85 : 82)}
              y={Math.max(PAD.top, hoverPoint()!.y - 44) + 18}
              text-anchor="middle" fill="#94a3b8" font-size="10"
            >
              Income: ${hoverPoint()!.income.toLocaleString()}
            </text>
            <text
              x={hoverPoint()!.x + (hoverPoint()!.x > W / 2 ? -85 : 82)}
              y={Math.max(PAD.top, hoverPoint()!.y - 44) + 40}
              text-anchor="middle" fill="#63d297" font-size="16" font-weight="700"
            >
              EIC: ${hoverPoint()!.credit.toLocaleString()}
            </text>
          </Show>

          {/* Client position marker */}
          <Show when={clientInRange() && props.earnedIncome > 0}>
            {/* Vertical line at client position */}
            <line x1={clientX()} y1={PAD.top} x2={clientX()} y2={PAD.top + plotH} stroke="#f472b6" stroke-width="1.5" stroke-dasharray="3 2" stroke-opacity="0.6" />
            {/* Pulsing outer ring */}
            <circle cx={clientX()} cy={clientY()} r="10" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-opacity="0.4">
              <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Solid dot */}
            <circle cx={clientX()} cy={clientY()} r="6" fill="#f472b6" stroke="#0a0f1a" stroke-width="2.5" />
            {/* Label */}
            <text
              x={clientX() + (clientX() > W * 0.7 ? -10 : 10)}
              y={clientY() - 16}
              text-anchor={clientX() > W * 0.7 ? 'end' : 'start'}
              fill="#f472b6" font-size="11" font-weight="600"
            >
              SU CLIENTE
            </text>
          </Show>
        </svg>
      </div>

      {/* Phase Cards */}
      <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', 'margin-bottom': '20px' }}>
        <For each={phases()}>
          {(p) => (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${p.color}22`,
              'border-radius': '10px',
              padding: '14px 16px',
              'border-left': `3px solid ${p.color}`,
            }}>
              <div style={{ 'font-size': '11px', 'font-weight': '600', color: p.color, 'letter-spacing': '0.06em', 'margin-bottom': '2px' }}>
                {p.label}
              </div>
              <div style={{ 'font-size': '10px', color: '#64748b', 'margin-bottom': '8px' }}>{p.sublabel}</div>
              <div style={{ 'font-size': '14px', 'font-weight': '600', color: '#e2e8f0', 'font-family': 'monospace', 'margin-bottom': '4px' }}>
                {p.range}
              </div>
              <div style={{ 'font-size': '12px', color: '#94a3b8', 'line-height': '1.5' }}>{p.desc}</div>
            </div>
          )}
        </For>
      </div>

      {/* Key Stats */}
      <div style={{
        background: 'rgba(99,210,151,0.05)',
        border: '1px solid rgba(99,210,151,0.12)',
        'border-radius': '10px',
        padding: '16px 20px',
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
      }}>
        <For each={stats()}>
          {(s) => (
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>{s.label}</div>
              <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#63d297', 'font-family': 'monospace' }}>{s.value}</div>
            </div>
          )}
        </For>
      </div>

      <p style={{ color: '#475569', 'font-size': '10px', 'text-align': 'center', 'margin-top': '14px', 'margin-bottom': '0' }}>
        Fuente: IRS Publication 596 ({props.taxYear}) · Rev. Proc. {props.taxYear === 2025 ? '2024-40' : '2023-34'}
      </p>
    </div>
  );
};

export default EICCurveChart;
