import { Component, For, createMemo, JSX } from 'solid-js';

export interface DecisionNode {
  id: string;
  label: string;
  accountType?: 'Asset' | 'Liability' | 'Revenue' | 'Expense';
  children?: DecisionNode[];
  x?: number;
  y?: number;
}

interface DecisionTreeProps {
  decisions: DecisionNode[];
  activePath?: string[];
}

const DecisionTree: Component<DecisionTreeProps> = (props) => {
  const accountTypeColors: Record<string, string> = {
    Asset: '#3b82f6',
    Liability: '#ef4444',
    Revenue: '#10b981',
    Expense: '#f97316',
  };

  const containerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #1e1e1e)',
    'border-radius': 'var(--border-radius, 8px)',
    padding: '1rem',
    border: '1px solid var(--border-color, #333)',
    overflow: 'auto',
  };

  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 50;
  const LEVEL_HEIGHT = 100;
  const NODE_SPACING = 40;

  const flattenWithPositions = createMemo(() => {
    const nodes: Array<DecisionNode & { x: number; y: number; parentId?: string }> = [];
    const edges: Array<{ from: DecisionNode; to: DecisionNode; isActive: boolean }> = [];

    const calculateSubtreeWidth = (node: DecisionNode): number => {
      if (!node.children || node.children.length === 0) {
        return NODE_WIDTH;
      }
      return node.children.reduce((sum, child) => sum + calculateSubtreeWidth(child) + NODE_SPACING, -NODE_SPACING);
    };

    const processNode = (
      node: DecisionNode,
      level: number,
      startX: number,
      parentId?: string
    ): number => {
      const subtreeWidth = calculateSubtreeWidth(node);
      const x = startX + subtreeWidth / 2;
      const y = level * LEVEL_HEIGHT + 30;

      nodes.push({ ...node, x, y, parentId });

      if (node.children && node.children.length > 0) {
        let childStartX = startX;
        for (const child of node.children) {
          const childWidth = calculateSubtreeWidth(child);
          processNode(child, level + 1, childStartX, node.id);

          const isActive = props.activePath?.includes(node.id) && props.activePath?.includes(child.id);
          edges.push({
            from: { ...node, x, y },
            to: {
              ...child,
              x: childStartX + childWidth / 2,
              y: (level + 1) * LEVEL_HEIGHT + 30
            },
            isActive: isActive || false,
          });

          childStartX += childWidth + NODE_SPACING;
        }
      }

      return subtreeWidth;
    };

    let startX = 50;
    for (const rootNode of props.decisions) {
      const width = processNode(rootNode, 0, startX);
      startX += width + NODE_SPACING * 2;
    }

    return { nodes, edges };
  });

  const svgDimensions = createMemo(() => {
    const { nodes } = flattenWithPositions();
    if (nodes.length === 0) return { width: 400, height: 200 };

    const maxX = Math.max(...nodes.map(n => n.x)) + NODE_WIDTH / 2 + 50;
    const maxY = Math.max(...nodes.map(n => n.y)) + NODE_HEIGHT + 50;

    return { width: Math.max(400, maxX), height: Math.max(200, maxY) };
  });

  const isNodeActive = (nodeId: string) => {
    return props.activePath?.includes(nodeId) || false;
  };

  const getNodeColor = (node: DecisionNode) => {
    if (node.accountType) {
      return accountTypeColors[node.accountType] || '#6b7280';
    }
    return '#6b7280';
  };

  return (
    <div style={containerStyle}>
      <svg
        width={svgDimensions().width}
        height={svgDimensions().height}
        style={{ display: 'block', margin: '0 auto' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Edges */}
        <For each={flattenWithPositions().edges}>
          {(edge) => {
            const fromX = edge.from.x!;
            const fromY = edge.from.y! + NODE_HEIGHT / 2;
            const toX = edge.to.x!;
            const toY = edge.to.y! - NODE_HEIGHT / 2;

            const midY = (fromY + toY) / 2;
            const pathD = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;

            return (
              <path
                d={pathD}
                fill="none"
                stroke={edge.isActive ? '#3b82f6' : '#4b5563'}
                stroke-width={edge.isActive ? 3 : 2}
                stroke-dasharray={edge.isActive ? 'none' : '5,5'}
                marker-end={edge.isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                style={{
                  transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
                }}
              >
                {edge.isActive && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="20"
                    to="0"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                )}
              </path>
            );
          }}
        </For>

        {/* Nodes */}
        <For each={flattenWithPositions().nodes}>
          {(node) => {
            const nodeColor = getNodeColor(node);
            const isActive = isNodeActive(node.id);

            return (
              <g
                transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
                style={{ cursor: 'pointer' }}
              >
                {/* Node background */}
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx="8"
                  ry="8"
                  fill={isActive ? nodeColor : 'var(--surface-color, #1e1e1e)'}
                  stroke={nodeColor}
                  stroke-width={isActive ? 3 : 2}
                  style={{
                    transition: 'fill 0.3s ease, stroke-width 0.3s ease',
                  }}
                >
                  {isActive && (
                    <animate
                      attributeName="opacity"
                      values="1;0.8;1"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  )}
                </rect>

                {/* Node label */}
                <text
                  x={NODE_WIDTH / 2}
                  y={NODE_HEIGHT / 2 - 5}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  fill={isActive ? '#fff' : 'var(--text-primary, #fff)'}
                  font-size="12"
                  font-weight="600"
                >
                  {node.label.length > 14 ? node.label.substring(0, 12) + '...' : node.label}
                </text>

                {/* Account type badge */}
                {node.accountType && (
                  <text
                    x={NODE_WIDTH / 2}
                    y={NODE_HEIGHT / 2 + 12}
                    text-anchor="middle"
                    dominant-baseline="middle"
                    fill={isActive ? 'rgba(255,255,255,0.8)' : nodeColor}
                    font-size="9"
                    font-weight="500"
                  >
                    {node.accountType}
                  </text>
                )}
              </g>
            );
          }}
        </For>
      </svg>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          'justify-content': 'center',
          gap: '1.5rem',
          'margin-top': '1rem',
          'padding-top': '1rem',
          'border-top': '1px solid var(--border-color, #333)',
        }}
      >
        <For each={Object.entries(accountTypeColors)}>
          {([type, color]) => (
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  'border-radius': '3px',
                  background: color,
                }}
              />
              <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted, #888)' }}>
                {type}
              </span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default DecisionTree;
