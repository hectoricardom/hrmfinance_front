import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { Card } from '../../ui';
import { useTranslation } from '../../../translations';
import { createStore } from 'solid-js/store';

interface Transaction {
  
  postingDate: string;
  description: string;
  amount: number;
  type?: string;
  balance?: number;
  checkNumber?: string;
  details?: string;
}

interface PayeeAnalysis {
  name: string;
  totalAmount: number;
  transactionCount: number;
  transactions: Transaction[];
  category?: string;
}

interface DetailedSummary {
  deposits: {
    total: number;
    count: number;
    byType: Map<string, { total: number; count: number; transactions: Transaction[] }>;
    byPayee: Map<string, PayeeAnalysis>;
  };
  payments: {
    total: number;
    count: number;
    byType: Map<string, { total: number; count: number; transactions: Transaction[] }>;
    byPayee: Map<string, PayeeAnalysis>;
  };
  checks: {
    total: number;
    count: number;
    transactions: Transaction[];
  };
  transfers: {
    total: number;
    count: number;
    transactions: Transaction[];
  };
  dailyBalances: Map<string, number>;
  accountsAffected: Set<string>;
}

const DetailedBankAnalyzer: Component = () => {
  const { t } = useTranslation();
  
  const [fileContent, setFileContent] = createSignal<string>('');
  const [selectedView, setSelectedView] = createSignal<'summary' | 'deposits' | 'payments' | 'timeline'>('summary');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [dateRange, setDateRange] = createSignal({ start: '', end: '' });
  const [transactionList, setTransactions] = createStore({
    list: [] as Transaction[],
  })
  
  // Enhanced categorization
  const EXPENSE_CATEGORIES = {
    'Utilities': ['AT&T', 'METRO BY T-MOBILE', 'COMCAST', 'STREAM ENERGY', 'NETFLIX', 'SPECTRUM'],
    'checks': ['CHECK'],
    'JPM': ['JPM', 'POVBR'],
    'Transportation': ['DRIVE AWAY', 'TRANPORT', 'QUICKQUACK', 'EXXON', 'SHELL', 'CHEVRON', 'UBER', 'LYFT', "U-HAUL", "UHAL",
      "LOVE'S", 
    ],
    'Lodging': ['HOLIDAY INN', 'MARRIOTT', 'HILTON', 'AIRBNB', 'HOTEL', 'MOTEL'],
    'Food & Dining': ['GOLDEN CORRAL', 'MOCTEZUMA', 'CHINA STAR', 'RESTAURANT', 'CAFE', 'STARBUCKS',
      "BUFFET", 'GRILL', 'MARKET', 'SEAFOOD',
    ],
    'Shopping': ['BURLINGTON', 'WALMART', 'TARGET', 'AMAZON', 'ROSS', 'KROGER', 'PUBLIC', 'AMZN', "AMZ", ],
    'Financial': ['AMERICANFIRSTFIN', 'LOAN', 'CREDIT'],
    'Insurance': ['INSURANCE', 'GEICO', 'STATE FARM'],
    "Rent": ['SHAFAII INVESTME', ],
    'Medical': ['PHARMACY', 'CVS', 'WALGREENS', 'HOSPITAL', 'CLINIC'],
    'Entertainment': ['CINEMA', 'THEATER', 'CONCERT'],
    'Other Services': ['BARBER', 'SALON', 'SPA', 'GYM'],
    "Return": ['RETURN ITEM ', ],
    
  };
  
  const categorizeExpense = (description: string): string => {
    const upperDesc = description.toUpperCase();
    
    for (const [category, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
      for (const keyword of keywords) {
        if (upperDesc.includes(keyword.toUpperCase())) {
          return category;
        }
      }
    }
    
    return 'Other';
  };
  
  const extractPayeeName = (description: string): string => {
    // Extract Zelle sender names
    const zelleMatch = description.match(/Zelle payment from ([^0-9]+)/i);
    if (zelleMatch) {
      return zelleMatch[1].trim().replace(/[A-Z0-9]{10,}$/, '').trim();
    }
    
    // Extract check payee
    if (description.includes('CHECK')) {
      return 'Check Payment';
    }
    
    // Extract merchant name (first part before numbers/locations)
    const merchantMatch = description.match(/^([^0-9]+)/);
    if (merchantMatch) {
      return merchantMatch[1].trim();
    }
    
    return description.substring(0, 30);
  };
  
  const parseCSV = (csvContent: string): Transaction[] => {
    const lines = csvContent.trim().split('\n');
    const transactions: Transaction[] = [];
    console.log(lines)
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      console.log(parts)
      if (parts.length >= 3) {
        const amount = parseFloat(parts[2]);

        let ss = {
          postingDate: parts[0],
          description: parts[1],
          amount: amount,
        }
       
        transactions.push(ss);
      }
    }
    console.log({transactions})
    setTransactions("list",transactions)
    return transactions;
  };
  
  const transactions = createMemo(() => {
    if (!fileContent()) return [];
    return parseCSV(fileContent());
  });
  
  const filteredTransactions = createMemo(() => {
    let filtered = transactionList?.list;
    
    // Filter by date range
    if (dateRange().start || dateRange().end) {
      filtered = filtered.filter(t => {
        const transDate = new Date(t.postingDate);
        const startDate = dateRange().start ? new Date(dateRange().start) : new Date('2024-01-01');
        const endDate = dateRange().end ? new Date(dateRange().end) : new Date('2024-12-31');
        return transDate >= startDate && transDate <= endDate;
      });
    }
    
    // Filter by search term
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(term) ||
        Math.abs(t.amount).toString().includes(term)
      );
    }
    
    return filtered;
  });
  
  const detailedAnalysis = createMemo((): DetailedSummary => {
    const analysis: DetailedSummary = {
      deposits: {
        total: 0,
        count: 0,
        byType: new Map(),
        byPayee: new Map()
      },
      payments: {
        total: 0,
        count: 0,
        byType: new Map(),
        byPayee: new Map()
      },
      checks: {
        total: 0,
        count: 0,
        transactions: []
      },
      transfers: {
        total: 0,
        count: 0,
        transactions: []
      },
      dailyBalances: new Map(),
      accountsAffected: new Set()
    };
    
    filteredTransactions().forEach(transaction => {
      const payeeName = extractPayeeName(transaction.description);
      console.log({transaction})
     
      // Track daily balances
      analysis.dailyBalances.set(transaction.postingDate, transaction.amount);
      
     
      // Track accounts affected
      if (transaction.description.includes('ZELLE') || transaction.description.includes('QUICKPAY')) {
        analysis.accountsAffected.add('Zelle Account');
      }
      if (transaction.description.includes('ACH')) {
        analysis.accountsAffected.add('ACH Network');
      }
      if (transaction?.description.includes('DEBIT_CARD')) {
        analysis.accountsAffected.add('Debit Card');
      }
      if (transaction?.description.includes('CHECK')) {
        analysis.accountsAffected.add('Checking Account');
      }
      if (transaction?.description.includes('TRANSFER')) {
        analysis.accountsAffected.add('Savings Account');
      }
      
      // Process deposits (positive amounts)
      if (transaction.amount > 0) {
        analysis.deposits.total += transaction.amount;
        analysis.deposits.count++;
        
        // By type
        if (!analysis.deposits.byType.has(transaction.description)) {
          analysis.deposits.byType.set(transaction.description, { total: 0, count: 0, transactions: [] });
        }
        const typeData = analysis.deposits.byType.get(transaction.description)!;
        typeData.total += transaction.amount;
        typeData.count++;
        typeData.transactions.push(transaction);
        
        // By payee
        if (!analysis.deposits.byPayee.has(payeeName)) {
          analysis.deposits.byPayee.set(payeeName, {
            name: payeeName,
            totalAmount: 0,
            transactionCount: 0,
            transactions: []
          });
        }
        const payeeData = analysis.deposits.byPayee.get(payeeName)!;
        payeeData.totalAmount += transaction.amount;
        payeeData.transactionCount++;
        payeeData.transactions.push(transaction);
      }
      
      // Process payments (negative amounts)
      if (transaction.amount < 0) {
        analysis.payments.total += Math.abs(transaction.amount);
        analysis.payments.count ++;
        
        // By type
        if (!analysis.payments.byType.has(transaction.description)) {
          analysis.payments.byType.set(transaction.description, { total: 0, count: 0, transactions: [] });
        }
        const typeData = analysis.payments.byType.get(transaction.description)!;
        typeData.total += Math.abs(transaction.amount);
        typeData.count++;
        typeData.transactions.push(transaction);
        
        // By payee
        const category = categorizeExpense(transaction.description);
        if (!analysis.payments.byPayee.has(payeeName)) {
          analysis.payments.byPayee.set(payeeName, {
            name: payeeName,
            totalAmount: 0,
            transactionCount: 0,
            transactions: [],
            category
          });
        }
        const payeeData = analysis.payments.byPayee.get(payeeName)!;
        payeeData.totalAmount += Math.abs(transaction.amount);
        payeeData.transactionCount++;
        payeeData.transactions.push(transaction);
      }
      
      // Track checks
      if (transaction.type === 'CHECK_PAID' || transaction.checkNumber) {
        analysis.checks.total += Math.abs(transaction.amount);
        analysis.checks.count++;
        analysis.checks.transactions.push(transaction);
      }
      
      // Track transfers
      if (transaction.description.includes('TRANSFER') || transaction.description === 'ACCT_XFER') {
        analysis.transfers.total += Math.abs(transaction.amount);
        analysis.transfers.count++;
        analysis.transfers.transactions.push(transaction);
      }
    });
    console.log(analysis)
    return analysis;
  });
  
  const monthlyTrend = createMemo(() => {
    const trend = new Map<string, { deposits: number; payments: number; net: number }>();
    
    filteredTransactions().forEach(t => {
      const month = t.postingDate.substring(0, 7); // YYYY-MM
      if (!trend.has(month)) {
        trend.set(month, { deposits: 0, payments: 0, net: 0 });
      }
      const monthData = trend.get(month)!;
      
      if (t.amount > 0) {
        monthData.deposits += t.amount;
      } else {
        monthData.payments += Math.abs(t.amount);
      }
      monthData.net = monthData.deposits - monthData.payments;
    });
    
    return Array.from(trend.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  });
  
  const handleFileUpload = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
      

        //setFileContent(event.target?.result as string);
        console.log(event.target?.result );
        parseCSV(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };
  
  const downloadDetailedReport = () => {
    const analysis = detailedAnalysis();
    let report = '# DETAILED BANK STATEMENT ANALYSIS\n';
    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    // Executive Summary
    report += '## EXECUTIVE SUMMARY\n\n';
    report += `- **Total Deposits:** $${analysis.deposits.total.toFixed(2)} (${analysis.deposits.count} transactions)\n`;
    report += `- **Total Payments:** $${analysis.payments.total.toFixed(2)} (${analysis.payments.count} transactions)\n`;
    report += `- **Net Cash Flow:** $${(analysis.deposits.total - analysis.payments.total).toFixed(2)}\n`;
    report += `- **Check Payments:** $${analysis.checks.total.toFixed(2)} (${analysis.checks.count} checks)\n`;
    report += `- **Transfers:** $${analysis.transfers.total.toFixed(2)} (${analysis.transfers.count} transfers)\n\n`;
    
    // Accounts Affected
    report += '## ACCOUNTS AFFECTED\n\n';
    analysis.accountsAffected.forEach(account => {
      report += `- ${account}\n`;
    });
    report += '\n';
    
    // Deposits Detail
    report += '## DEPOSITS DETAIL\n\n';
    report += '### By Type\n';
    analysis.deposits.byType.forEach((data, type) => {
      report += `- **${type}**: $${data.total.toFixed(2)} (${data.count} transactions)\n`;
    });
    
    report += '\n### Top Depositors\n';
    const topDepositors = Array.from(analysis.deposits.byPayee.entries())
      .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
      .slice(0, 20);
    
    topDepositors.forEach(([name, data]) => {
      report += `- **${name}**: $${data.totalAmount.toFixed(2)} (${data.transactionCount} transactions)\n`;
    });
    
    // Payments Detail
    report += '\n## PAYMENTS DETAIL\n\n';
    report += '### By Type\n';
    analysis.payments.byType.forEach((data, type) => {
      report += `- **${type}**: $${data.total.toFixed(2)} (${data.count} transactions)\n`;
    });
    
    report += '\n### By Category\n';
    const categoryTotals = new Map<string, number>();
    analysis.payments.byPayee.forEach(payee => {
      const category = payee.category || 'Other';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + payee.totalAmount);
    });
    
    Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, total]) => {
        report += `- **${category}**: $${total.toFixed(2)}\n`;
      });
    
    report += '\n### Top Payees\n';
    const topPayees = Array.from(analysis.payments.byPayee.entries())
      .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
      .slice(0, 20);
    
    topPayees.forEach(([name, data]) => {
      report += `- **${name}** (${data.category}): $${data.totalAmount.toFixed(2)} (${data.transactionCount} transactions)\n`;
    });
    
    // Monthly Trend
    report += '\n## MONTHLY CASH FLOW TREND\n\n';
    monthlyTrend().forEach(([month, data]) => {
      report += `- **${month}**: Deposits: $${data.deposits.toFixed(2)} | Payments: $${data.payments.toFixed(2)} | Net: $${data.net.toFixed(2)}\n`;
    });
    
    // Check Details
    if (analysis.checks.transactions.length > 0) {
      report += '\n## CHECK PAYMENTS DETAIL\n\n';
      analysis.checks.transactions.forEach(check => {
        report += `- Check #${check.checkNumber || 'N/A'} - ${check.postingDate} - $${Math.abs(check.amount).toFixed(2)}\n`;
      });
    }
    
    // Download
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed_bank_analysis_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ 'margin-bottom': '2rem' }}>Detailed Bank Statement Analyzer</h1>
      
      {/* File Upload */}
      <Card style={{ 'margin-bottom': '2rem' }}>
        <h2>Upload Bank Statement CSV</h2>
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          style={{ 'margin-top': '1rem' }}
        />
      </Card>
      
      <Show when={transactionList?.list}>
        {/* Filters */}
        <Card style={{ 'margin-bottom': '2rem' }}>
          <h3>Filters</h3>
          <div style={{ display: 'flex', gap: '1rem', 'margin-top': '1rem', 'flex-wrap': 'wrap' }}>
            <input 
              type="text"
              placeholder="Search transactions..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              style={{ flex: '1', 'min-width': '200px', padding: '0.5rem' }}
            />
            <input 
              type="date"
              value={dateRange().start}
              onInput={(e) => setDateRange({ ...dateRange(), start: e.currentTarget.value })}
              placeholder="Start Date"
            />
            <input 
              type="date"
              value={dateRange().end}
              onInput={(e) => setDateRange({ ...dateRange(), end: e.currentTarget.value })}
              placeholder="End Date"
            />
            <button 
              onClick={downloadDetailedReport}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer'
              }}
            >
              Download Detailed Report
            </button>
          </div>
        </Card>
        
        {/* View Tabs */}
        <div style={{ display: 'flex', gap: '1rem', 'margin-bottom': '2rem' }}>
          <button 
            onClick={() => setSelectedView('summary')}
            style={{
              padding: '0.5rem 1rem',
              background: selectedView() === 'summary' ? 'var(--primary-color)' : '#e9ecef',
              color: selectedView() === 'summary' ? 'white' : 'black',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Summary
          </button>
          <button 
            onClick={() => setSelectedView('deposits')}
            style={{
              padding: '0.5rem 1rem',
              background: selectedView() === 'deposits' ? 'var(--primary-color)' : '#e9ecef',
              color: selectedView() === 'deposits' ? 'white' : 'black',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Deposits
          </button>
          <button 
            onClick={() => setSelectedView('payments')}
            style={{
              padding: '0.5rem 1rem',
              background: selectedView() === 'payments' ? 'var(--primary-color)' : '#e9ecef',
              color: selectedView() === 'payments' ? 'white' : 'black',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Payments
          </button>
          <button 
            onClick={() => setSelectedView('timeline')}
            style={{
              padding: '0.5rem 1rem',
              background: selectedView() === 'timeline' ? 'var(--primary-color)' : '#e9ecef',
              color: selectedView() === 'timeline' ? 'white' : 'black',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Timeline
          </button>
        </div>
        
        {/* Summary View */}
        <Show when={selectedView() === 'summary'}>
          {/* Executive Summary Cards */}
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', 'margin-bottom': '2rem' }}>
            <Card>
              <h3>Total Deposits</h3>
              <p style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#22c55e' }}>
                {formatCurrency(detailedAnalysis().deposits.total)}
              </p>
              <p style={{ color: '#6c757d' }}>{detailedAnalysis().deposits.count} transactions</p>
            </Card>
            
            <Card>
              <h3>Total Payments</h3>
              <p style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#ef4444' }}>
                {formatCurrency(detailedAnalysis().payments.total)}
              </p>
              <p style={{ color: '#6c757d' }}>{detailedAnalysis().payments.count} transactions</p>
            </Card>
            
            <Card>
              <h3>Net Cash Flow</h3>
              <p style={{ 
                'font-size': '2rem', 
                'font-weight': 'bold', 
                color: (detailedAnalysis().deposits.total - detailedAnalysis().payments.total) >= 0 ? '#22c55e' : '#ef4444' 
              }}>
                {formatCurrency(detailedAnalysis().deposits.total - detailedAnalysis().payments.total)}
              </p>
            </Card>
            
            <Card>
              <h3>Check Payments</h3>
              <p style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#3b82f6' }}>
                {formatCurrency(detailedAnalysis().checks.total)}
              </p>
              <p style={{ color: '#6c757d' }}>{detailedAnalysis().checks.count} checks</p>
            </Card>
          </div>
          
          {/* Accounts Affected */}
          <Card style={{ 'margin-bottom': '2rem' }}>
            <h3>Accounts & Payment Methods Used</h3>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem', 'margin-top': '1rem' }}>
              <For each={Array.from(detailedAnalysis().accountsAffected)}>
                {(account) => (
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: '#e9ecef',
                    'border-radius': '9999px',
                    'font-size': '0.875rem'
                  }}>
                    {account}
                  </span>
                )}
              </For>
            </div>
          </Card>
          
          {/* Monthly Trend */}
          <Card>
            <h3>Monthly Cash Flow Trend</h3>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse', 'margin-top': '1rem' }}>
                <thead>
                  <tr style={{ 'border-bottom': '2px solid #dee2e6' }}>
                    <th style={{ padding: '0.75rem', 'text-align': 'left' }}>Month</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right' }}>Deposits</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right' }}>Payments</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={monthlyTrend()}>
                    {([month, data]) => (
                      <tr style={{ 'border-bottom': '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem' }}>{month}</td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', color: '#22c55e' }}>
                          {formatCurrency(isNaN(data.deposits) ? 0 :data.deposits )}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', color: '#ef4444' }}>
                          {formatCurrency(isNaN(data.payments) ? 0 :data.payments )}
                        </td>
                        <td style={{ 
                          padding: '0.75rem', 
                          'text-align': 'right',
                          'font-weight': 'bold',
                          color: data.net >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {formatCurrency(data.net)}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Card>
        </Show>
        
        {/* Deposits View */}
        <Show when={selectedView() === 'deposits'}>
          <Card style={{ 'margin-bottom': '2rem' }}>
            <h2>Deposits by Type</h2>
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', 'margin-top': '1rem' }}>
              <For each={Array.from(detailedAnalysis().deposits.byType.entries())}>
                {([type, data]) => (
                  <div style={{
                    padding: '1rem',
                    background: '#f8f9fa',
                    'border-radius': 'var(--border-radius-sm)',
                    border: '1px solid #e9ecef'
                  }}>
                    <h4>{type}</h4>
                    <p style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#22c55e' }}>
                      {formatCurrency(data.total)}
                    </p>
                    <p style={{ color: '#6c757d' }}>{data.count} transactions</p>
                  </div>
                )}
              </For>
            </div>
          </Card>
          
          <Card>
            <h2>Top Depositors</h2>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse', 'margin-top': '1rem' }}>
                <thead>
                  <tr style={{ 'border-bottom': '2px solid #dee2e6' }}>
                    <th style={{ padding: '0.75rem', 'text-align': 'left' }}>Depositor</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right' }}>Total Amount</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'center' }}>Count</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Array.from(detailedAnalysis().deposits.byPayee.entries())
                    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                    .slice(0, 20)}>
                    {([name, data]) => (
                      <tr style={{ 'border-bottom': '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem' }}>{name}</td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', color: '#22c55e', 'font-weight': 'bold' }}>
                          {formatCurrency(data.totalAmount)}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'center' }}>
                          {data.transactionCount}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'center' }}>
                          <details>
                            <summary style={{ cursor: 'pointer' }}>View</summary>
                            <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem' }}>
                              <For each={data.transactions.slice(0, 5)}>
                                {(t) => (
                                  <div style={{ padding: '0.25rem' }}>
                                    {t.postingDate} - {formatCurrency(t.amount)}
                                  </div>
                                )}
                              </For>
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Card>
        </Show>
        
        {/* Payments View */}
        <Show when={selectedView() === 'payments'}>
          <Card style={{ 'margin-bottom': '2rem' }}>
            <h2>Payments by Category</h2>
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', 'margin-top': '1rem' }}>
              {(() => {
                const categoryTotals = new Map<string, { total: number; count: number }>();
                detailedAnalysis().payments.byPayee.forEach(payee => {
                  const category = payee.category || 'Other';
                  if (!categoryTotals.has(category)) {
                    categoryTotals.set(category, { total: 0, count: 0 });
                  }
                  const catData = categoryTotals.get(category)!;
                  catData.total += payee.totalAmount;
                  catData.count += payee.transactionCount;
                });
                
                return Array.from(categoryTotals.entries())
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([category, data]) => (
                    <div style={{
                      padding: '1rem',
                      background: '#f8f9fa',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4>{category}</h4>
                      <p style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#ef4444' }}>
                        {formatCurrency(data.total)}
                      </p>
                      <p style={{ color: '#6c757d' }}>{data.count} transactions</p>
                    </div>
                  ));
              })()}
            </div>
          </Card>
          
          <Card>
            <h2>Top Payees</h2>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse', 'margin-top': '1rem' }}>
                <thead>
                  <tr style={{ 'border-bottom': '2px solid #dee2e6' }}>
                    <th style={{ padding: '0.75rem', 'text-align': 'left' }}>Payee</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'left' }}>Category</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'right' }}>Total Amount</th>
                    <th style={{ padding: '0.75rem', 'text-align': 'center' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Array.from(detailedAnalysis().payments.byPayee.entries())
                    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                    .slice(0, 130)}>
                    {([name, data]) => (
                      <tr style={{ 'border-bottom': '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem' }}>{name}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: '#e9ecef',
                            'border-radius': '4px',
                            'font-size': '0.875rem'
                          }}>
                            {data.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'right', color: '#ef4444', 'font-weight': 'bold' }}>
                          {formatCurrency(data.totalAmount)}
                        </td>
                        <td style={{ padding: '0.75rem', 'text-align': 'center' }}>
                          {data.transactionCount}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Card>
        </Show>
        
        {/* Timeline View */}
        <Show when={selectedView() === 'timeline'}>
          <Card>
            <h2>Transaction Timeline</h2>
            <div style={{ 'max-height': '600px', 'overflow-y': 'auto', 'margin-top': '1rem' }}>
              <For each={filteredTransactions().slice(0, 100)}>
                {(transaction) => (
                  <div style={{
                    padding: '1rem',
                    'border-bottom': '1px solid #e9ecef',
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center'
                  }}>
                    <div style={{ flex: '1' }}>
                      <div style={{ 'font-weight': 'bold' }}>{transaction.description}</div>
                      <div style={{ 'font-size': '0.875rem', color: '#6c757d' }}>
                        {transaction.postingDate} • {transaction.type}
                        {transaction.checkNumber && ` • Check #${transaction.checkNumber}`}
                      </div>
                    </div>
                    <div style={{ 'text-align': 'right' }}>
                      <div style={{ 
                        'font-weight': 'bold',
                        'font-size': '1.1rem',
                        color: transaction.amount >= 0 ? '#22c55e' : '#ef4444'
                      }}>
                        {formatCurrency(Math.abs(transaction.amount))}
                        {transaction.amount >= 0 ? ' ↓' : ' ↑'}
                      </div>
                     
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Card>
        </Show>
      </Show>
    </div>
  );
};

export default DetailedBankAnalyzer;




// 2 446 448.10