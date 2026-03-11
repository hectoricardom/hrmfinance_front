import { Component, createSignal, For, Show, onMount } from 'solid-js';
import { accountsStore } from '../../accounts/stores/accountsStore';
import type { AccountingAccount } from '../../accounts/stores/accountsStore';
import Card from '../../ui/components/Card';
import Badge from '../../ui/components/Badge';

interface AccountTreeNode extends AccountingAccount {
  subAccounts?: AccountingAccount[];
}

const AccountTree: Component = () => {
  const [accountHierarchy, setAccountHierarchy] = createSignal<AccountTreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = createSignal<Set<string>>(new Set());
  const [isLoading, setIsLoading] = createSignal(true);

  onMount(async () => {
    await loadAccountTree();
  });

  const loadAccountTree = async () => {
    setIsLoading(true);
    try {
      await accountsStore.reloadAccs();
      const hierarchy = accountsStore.getAccountHierarchy();
      setAccountHierarchy(hierarchy);

      // Expand all parent accounts by default
      const expanded = new Set<string>();
      hierarchy.forEach(parent => expanded.add(parent.id));
      setExpandedNodes(expanded);
    } catch (error) {
      console.error('Error loading account tree:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const expanded = new Set(expandedNodes());
    if (expanded.has(nodeId)) {
      expanded.delete(nodeId);
    } else {
      expanded.add(nodeId);
    }
    setExpandedNodes(expanded);
  };

  const isExpanded = (nodeId: string) => expandedNodes().has(nodeId);

  const formatBalance = (balance?: number) => {
    if (balance === undefined || balance === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  const getAccountBalance = (accountId: string) => {
    const balances = accountsStore.accountsBalances as Record<string, number>;
    return balances[accountId] || 0;
  };

  const getTotalBalanceWithSubs = (account: AccountTreeNode) => {
    return accountsStore.getTotalBalanceWithSubAccounts(account.id);
  };

  const getAccountTypeColor = (type?: string) => {
    const colors: Record<string, string> = {
      'Asset': '#22c55e',
      'Liability': '#ef4444',
      'Equity': '#3b82f6',
      'Revenue': '#10b981',
      'Expense': '#f59e0b'
    };
    return colors[type || ''] || '#6b7280';
  };

  const treeContainerStyle = {
    'font-family': 'monospace',
    'line-height': '1.8'
  };

  const nodeStyle = (level: number = 0) => ({
    'margin-left': `${level * 2}rem`,
    'margin-bottom': '0.5rem',
    padding: '0.75rem',
    background: level === 0 ? 'var(--surface-color)' : 'transparent',
    'border-left': level > 0 ? '2px solid var(--border-color)' : 'none',
    'border-radius': level === 0 ? 'var(--border-radius-sm)' : '0',
    transition: 'background 0.2s ease',
    cursor: 'pointer'
  });

  const nodeHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem'
  };

  const expandIconStyle = (hasChildren: boolean) => ({
    width: '1.5rem',
    'text-align': 'center' as const,
    color: 'var(--text-muted)',
    'font-weight': 'bold',
    cursor: hasChildren ? 'pointer' : 'default',
    opacity: hasChildren ? '1' : '0'
  });

  const accountCodeStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)',
    'min-width': '5rem'
  };

  const accountNameStyle = {
    flex: '1',
    color: 'var(--text-primary)'
  };

  const balanceStyle = {
    'font-weight': '600',
    'min-width': '10rem',
    'text-align': 'right' as const
  };

  const renderNode = (account: AccountTreeNode, level: number = 0) => {
    const hasChildren = account.subAccounts && account.subAccounts.length > 0;
    const expanded = isExpanded(account.id);
    const balance = account.balance || getAccountBalance(account.id);
    const totalBalance = hasChildren ? getTotalBalanceWithSubs(account) : balance;

    return (
      <div>
        <div
          style={nodeStyle(level)}
          onClick={() => hasChildren && toggleNode(account.id)}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-color, #f3f4f6)'}
          onMouseLeave={(e) => e.currentTarget.style.background = level === 0 ? 'var(--surface-color)' : 'transparent'}
        >
          <div style={nodeHeaderStyle}>
            <span style={expandIconStyle(hasChildren)}>
              {hasChildren ? (expanded ? '▼' : '▶') : ''}
            </span>

            <span style={accountCodeStyle}>
              {account.code || account.accountNumber}
            </span>

            <span style={accountNameStyle}>
              {account.name}
            </span>

            <Show when={account.accountType || account.type || account.classification}>
              <Badge
                variant="secondary"
                size="sm"
              >
                {account.accountType || account.type || account.classification}
              </Badge>
            </Show>

            <span style={balanceStyle}>
              {formatBalance(totalBalance)}
            </span>
          </div>
        </div>

        <Show when={hasChildren && expanded}>
          <For each={account.subAccounts}>
            {(subAccount) => renderNode(subAccount as AccountTreeNode, level + 1)}
          </For>
        </Show>
      </div>
    );
  };

  const groupByType = () => {
    const groups: Record<string, AccountTreeNode[]> = {
      'Asset': [],
      'Liability': [],
      'Equity': [],
      'Revenue': [],
      'Expense': []
    };

    accountHierarchy().forEach(account => {
      const type = account.accountType || account.type || account.classification;
      if (type && groups[type]) {
        groups[type].push(account);
      }
    });

    return groups;
  };

  const sectionHeaderStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    'margin-top': '1.5rem',
    'margin-bottom': '1rem',
    padding: '0.5rem',
    'border-bottom': '2px solid var(--border-color)',
    color: 'var(--text-primary)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const typeIndicatorStyle = (color: string) => ({
    width: '0.75rem',
    height: '0.75rem',
    'border-radius': '50%',
    background: color
  });

  return (
    <Card title="Account Hierarchy">
      <Show when={isLoading()} fallback={
        <Show when={accountHierarchy().length > 0} fallback={
          <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
            No accounts found.
          </div>
        }>
          <div style={treeContainerStyle}>
            <For each={Object.entries(groupByType())}>
              {([type, accounts]) => (
                <Show when={accounts.length > 0}>
                  <div>
                    <h3 style={sectionHeaderStyle}>
                      <span style={typeIndicatorStyle(getAccountTypeColor(type))}></span>
                      {type}
                    </h3>
                    <For each={accounts}>
                      {(account) => renderNode(account)}
                    </For>
                  </div>
                </Show>
              )}
            </For>
          </div>
        </Show>
      }>
        <div style={{ padding: '2rem', 'text-align': 'center' }}>
          <div style={{ 'font-size': '1rem', color: 'var(--text-muted)' }}>
            Loading account hierarchy...
          </div>
        </div>
      </Show>
    </Card>
  );
};

export default AccountTree;
