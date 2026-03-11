import { Component, For, Show, createMemo } from 'solid-js';

// Types
interface DecisionNode {
  id: string;
  label: string;
  type: 'question' | 'account';
  accountCode?: string;
  accountType?: 'Asset' | 'Liability' | 'Revenue' | 'Expense' | 'Equity';
  children?: DecisionNode[];
}

interface AccountInfo {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Revenue' | 'Expense' | 'Equity';
  description?: string;
  normalBalance: 'debit' | 'credit';
}

interface Stage4AccountMappingProps {
  decisions: DecisionNode;
  selectedPath: string[];
  accountInfo: AccountInfo | null;
}

// Account type colors
const accountTypeColors: Record<string, string> = {
  Asset: '#2196F3',      // Blue
  Liability: '#F44336',  // Red
  Revenue: '#4CAF50',    // Green
  Expense: '#FF9800',    // Orange
  Equity: '#9C27B0'      // Purple
};

const Stage4AccountMapping: Component<Stage4AccountMappingProps> = (props) => {
  // Styles
  const containerStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e0e0e0)',
    'box-shadow': 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1))'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const badgeStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    'font-weight': '700',
    'font-size': '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a1a)',
    margin: '0'
  };

  const svgContainerStyle = {
    width: '100%',
    'overflow-x': 'auto',
    padding: '1rem 0',
    background: '#f8f9fa',
    'border-radius': '8px',
    'margin-bottom': '1.5rem'
  };

  const accountInfoPanelStyle = {
    padding: '1.5rem',
    background: 'white',
    'border-radius': '8px',
    border: '1px solid var(--border-color, #e0e0e0)'
  };

  const accountInfoHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'margin-bottom': '1rem'
  };

  const accountCodeStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary, #1a1a1a)'
  };

  const accountNameStyle = {
    'font-size': '1.125rem',
    color: 'var(--text-secondary, #666666)'
  };

  const accountTypeBadgeStyle = (type: string) => ({
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    'border-radius': '16px',
    background: accountTypeColors[type] || '#999999',
    color: 'white',
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase'
  });

  const infoRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid #f0f0f0'
  };

  const infoLabelStyle = {
    color: 'var(--text-muted, #999999)',
    'font-size': '0.875rem'
  };

  const infoValueStyle = {
    'font-weight': '500',
    color: 'var(--text-primary, #1a1a1a)'
  };

  // Helper to calculate node positions for SVG
  const calculateNodePositions = createMemo(() => {
    const positions: { node: DecisionNode; x: number; y: number; level: number }[] = [];
    const levelWidths: number[] = [];

    // First pass: count nodes at each level
    const countNodesAtLevel = (node: DecisionNode, level: number) => {
      if (!levelWidths[level]) levelWidths[level] = 0;
      levelWidths[level]++;
      node.children?.forEach(child => countNodesAtLevel(child, level + 1));
    };
    countNodesAtLevel(props.decisions, 0);

    // Second pass: assign positions
    const levelCounters: number[] = [];
    const assignPositions = (node: DecisionNode, level: number) => {
      if (!levelCounters[level]) levelCounters[level] = 0;
      const totalAtLevel = levelWidths[level];
      const nodeIndex = levelCounters[level];
      const spacing = 800 / (totalAtLevel + 1);
      const x = spacing * (nodeIndex + 1);
      const y = level * 100 + 50;

      positions.push({ node, x, y, level });
      levelCounters[level]++;

      node.children?.forEach(child => assignPositions(child, level + 1));
    };
    assignPositions(props.decisions, 0);

    return positions;
  });

  // Check if a node is in the selected path
  const isNodeSelected = (nodeId: string) => props.selectedPath.includes(nodeId);

  // Render decision tree SVG
  const renderDecisionTree = () => {
    const nodePositions = calculateNodePositions();
    const svgHeight = Math.max(...nodePositions.map(p => p.y)) + 100;

    // Create connections
    const connections: { from: { x: number; y: number }; to: { x: number; y: number }; selected: boolean }[] = [];

    const buildConnections = (node: DecisionNode, parentPos?: { x: number; y: number }) => {
      const nodePos = nodePositions.find(p => p.node.id === node.id);
      if (!nodePos) return;

      if (parentPos) {
        connections.push({
          from: parentPos,
          to: { x: nodePos.x, y: nodePos.y },
          selected: isNodeSelected(node.id)
        });
      }

      node.children?.forEach(child => buildConnections(child, { x: nodePos.x, y: nodePos.y }));
    };
    buildConnections(props.decisions);

    return (
      <svg width="800" height={svgHeight} style={{ display: 'block', margin: '0 auto' }}>
        {/* Render connections */}
        <For each={connections}>
          {(conn) => (
            <g>
              {/* Connection line */}
              <path
                d={`M ${conn.from.x} ${conn.from.y + 20}
                    C ${conn.from.x} ${(conn.from.y + conn.to.y) / 2},
                      ${conn.to.x} ${(conn.from.y + conn.to.y) / 2},
                      ${conn.to.x} ${conn.to.y - 20}`}
                fill="none"
                stroke={conn.selected ? '#4CAF50' : '#e0e0e0'}
                stroke-width={conn.selected ? 3 : 2}
                stroke-dasharray={conn.selected ? 'none' : '5,5'}
              >
                {conn.selected && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="100"
                    to="0"
                    dur="1s"
                    repeatCount="1"
                  />
                )}
              </path>
              {/* Animated dot for selected paths */}
              {conn.selected && (
                <circle r="4" fill="#4CAF50">
                  <animateMotion
                    dur="1.5s"
                    repeatCount="indefinite"
                    path={`M ${conn.from.x} ${conn.from.y + 20}
                           C ${conn.from.x} ${(conn.from.y + conn.to.y) / 2},
                             ${conn.to.x} ${(conn.from.y + conn.to.y) / 2},
                             ${conn.to.x} ${conn.to.y - 20}`}
                  />
                </circle>
              )}
            </g>
          )}
        </For>

        {/* Render nodes */}
        <For each={nodePositions}>
          {(pos) => {
            const selected = isNodeSelected(pos.node.id);
            const isAccount = pos.node.type === 'account';
            const nodeColor = isAccount && pos.node.accountType
              ? accountTypeColors[pos.node.accountType]
              : (selected ? '#4CAF50' : '#667eea');

            return (
              <g transform={`translate(${pos.x}, ${pos.y})`}>
                {/* Node background */}
                {isAccount ? (
                  <rect
                    x="-45"
                    y="-20"
                    width="90"
                    height="40"
                    rx="8"
                    fill={selected ? nodeColor : 'white'}
                    stroke={nodeColor}
                    stroke-width="2"
                  >
                    {selected && (
                      <animate
                        attributeName="stroke-width"
                        values="2;4;2"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    )}
                  </rect>
                ) : (
                  <polygon
                    points="-50,0 0,-25 50,0 0,25"
                    fill={selected ? nodeColor : 'white'}
                    stroke={nodeColor}
                    stroke-width="2"
                  >
                    {selected && (
                      <animate
                        attributeName="stroke-width"
                        values="2;4;2"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    )}
                  </polygon>
                )}

                {/* Node label */}
                <text
                  x="0"
                  y={isAccount ? "5" : "4"}
                  text-anchor="middle"
                  font-size={isAccount ? "14" : "11"}
                  font-weight={selected ? "700" : "500"}
                  fill={selected ? 'white' : nodeColor}
                >
                  {isAccount ? `[${pos.node.accountCode}]` : pos.node.label}
                </text>
              </g>
            );
          }}
        </For>
      </svg>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={badgeStyle}>4</div>
        <h3 style={titleStyle}>Account Mapping</h3>
      </div>

      {/* Decision Tree Visualization */}
      <div style={svgContainerStyle}>
        {renderDecisionTree()}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap', 'margin-bottom': '1.5rem' }}>
        <For each={Object.entries(accountTypeColors)}>
          {([type, color]) => (
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', 'border-radius': '3px', background: color }}></div>
              <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted, #666666)' }}>{type}</span>
            </div>
          )}
        </For>
      </div>

      {/* Selected Account Info Panel */}
      <Show when={props.accountInfo}>
        <div style={accountInfoPanelStyle}>
          <div style={accountInfoHeaderStyle}>
            <span style={accountCodeStyle}>{props.accountInfo!.code}</span>
            <span style={accountTypeBadgeStyle(props.accountInfo!.type)}>
              {props.accountInfo!.type}
            </span>
          </div>
          <div style={accountNameStyle}>{props.accountInfo!.name}</div>

          <div style={{ 'margin-top': '1rem' }}>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Normal Balance</span>
              <span style={infoValueStyle}>{props.accountInfo!.normalBalance.toUpperCase()}</span>
            </div>
            <Show when={props.accountInfo!.description}>
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Description</span>
                <span style={infoValueStyle}>{props.accountInfo!.description}</span>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Selected Path Display */}
      <Show when={props.selectedPath.length > 0}>
        <div style={{ 'margin-top': '1rem', padding: '1rem', background: '#e8f5e9', 'border-radius': '8px' }}>
          <div style={{ 'font-size': '0.875rem', 'font-weight': '600', color: '#2e7d32', 'margin-bottom': '0.5rem' }}>
            Selected Path:
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
            <For each={props.selectedPath}>
              {(nodeId, index) => (
                <>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: 'white',
                    'border-radius': '4px',
                    'font-size': '0.75rem',
                    'font-weight': '500'
                  }}>
                    {nodeId}
                  </span>
                  <Show when={index() < props.selectedPath.length - 1}>
                    <span style={{ color: '#2e7d32' }}>-&gt;</span>
                  </Show>
                </>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default Stage4AccountMapping;
