import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { Card } from '../../ui';
import { useTranslation } from '../../../translations';

interface Transaction {
  details: string;
  postingDate: string;
  description: string;
  amount: number;
  type: string;
  balance: number;
  checkNumber?: string;
}

interface CategorySummary {
  category: string;
  totalAmount: number;
  transactionCount: number;
  transactions: Transaction[];
}

const TaxDeductionAnalyzer: Component = () => {
  const { t } = useTranslation();
  
  const [fileContent, setFileContent] = createSignal<string>('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('');
  const [dateRange, setDateRange] = createSignal({ start: '', end: '' });
  
  // Tax deduction categories
  const BUSINESS_CATEGORIES = {
    'UTILITIES': ['AT&T', 'METRO BY T-MOBILE', 'COMCAST', 'STREAM ENERGY', 'NETFLIX'],
    'BUSINESS_TRAVEL': ['HOLIDAY INN', 'DRIVE AWAY', 'QUICKQUACK'],
    'BUSINESS_MEALS': ['GOLDEN CORRAL', 'SQ *T MOCTEZUMA', 'CHINA STAR'],
    'OFFICE_SUPPLIES': ['BURLINGTON STORES'],
    'BUSINESS_INCOME': ['Zelle payment from TU TIEMPO TRAVEL'],
    'CLIENT_PAYMENTS': ['Zelle payment from'],
    'LOAN_PAYMENTS': ['AMERICANFIRSTFIN'],
    'BANK_TRANSFERS': ['Online Transfer'],
    'CHECK_PAYMENTS': ['CHECK']
  };
  
  const categorizeTransaction = (description: string): string => {
    const upperDesc = description.toUpperCase();
    
    for (const [category, keywords] of Object.entries(BUSINESS_CATEGORIES)) {
      for (const keyword of keywords) {
        if (upperDesc.includes(keyword.toUpperCase())) {
          return category;
        }
      }
    }
    
    return 'OTHER';
  };
  
  const parseCSV = (csvContent: string): Transaction[] => {
    const lines = csvContent.trim().split('\n');
    const transactions: Transaction[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 7) {
        const amount = parseFloat(parts[3]);
        transactions.push({
          details: parts[0],
          postingDate: parts[1],
          description: parts[2],
          amount: amount,
          type: parts[4],
          balance: parseFloat(parts[5]),
          checkNumber: parts[6] || undefined
        });
      }
    }
    
    return transactions;
  };
  
  const transactions = createMemo(() => {
    if (!fileContent()) return [];
    return parseCSV(fileContent());
  });
  
  const filteredTransactions = createMemo(() => {
    let filtered = transactions();
    
    // Filter by date range
    if (dateRange().start || dateRange().end) {
      filtered = filtered.filter(t => {
        const transDate = new Date(t.postingDate);
        const startDate = dateRange().start ? new Date(dateRange().start) : new Date('1900-01-01');
        const endDate = dateRange().end ? new Date(dateRange().end) : new Date('2100-12-31');
        return transDate >= startDate && transDate <= endDate;
      });
    }
    
    return filtered;
  });
  
  const categoryMap = createMemo(() => {
    const map = new Map<string, CategorySummary>();
    
    filteredTransactions().forEach(transaction => {
      const category = categorizeTransaction(transaction.description);
      
      if (!map.has(category)) {
        map.set(category, {
          category,
          totalAmount: 0,
          transactionCount: 0,
          transactions: []
        });
      }
      
      const categorySummary = map.get(category)!;
      categorySummary.totalAmount += transaction.amount;
      categorySummary.transactionCount++;
      categorySummary.transactions.push(transaction);
    });
    
    return map;
  });
  
  const expenseCategories = ['UTILITIES', 'BUSINESS_TRAVEL', 'BUSINESS_MEALS', 
                            'OFFICE_SUPPLIES', 'LOAN_PAYMENTS'];
  const incomeCategories = ['BUSINESS_INCOME', 'CLIENT_PAYMENTS'];
  
  const totalExpenses = createMemo(() => {
    let total = 0;
    expenseCategories.forEach(cat => {
      const summary = categoryMap().get(cat);
      if (summary && summary.totalAmount < 0) {
        total += Math.abs(summary.totalAmount);
      }
    });
    return total;
  });
  
  const totalIncome = createMemo(() => {
    let total = 0;
    incomeCategories.forEach(cat => {
      const summary = categoryMap().get(cat);
      if (summary && summary.totalAmount > 0) {
        total += summary.totalAmount;
      }
    });
    return total;
  });
  
  const handleFileUpload = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };
  
  const downloadReport = () => {
    let report = '# TAX DEDUCTION SUMMARY REPORT\n';
    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    if (dateRange().start || dateRange().end) {
      report += `Date Range: ${dateRange().start || 'Start'} to ${dateRange().end || 'End'}\n\n`;
    }
    
    // Business expenses
    report += '## BUSINESS EXPENSES (Tax Deductible)\n\n';
    
    expenseCategories.forEach(category => {
      const summary = categoryMap().get(category);
      if (summary && summary.totalAmount < 0) {
        report += `### ${category.replace(/_/g, ' ')}\n`;
        report += `- Total: $${Math.abs(summary.totalAmount).toFixed(2)}\n`;
        report += `- Transaction Count: ${summary.transactionCount}\n`;
        report += `- Details:\n`;
        
        summary.transactions.forEach(t => {
          if (t.amount < 0) {
            report += `  - ${t.postingDate} | ${t.description} | $${Math.abs(t.amount).toFixed(2)}\n`;
          }
        });
        
        report += '\n';
      }
    });
    
    report += `### TOTAL BUSINESS EXPENSES: $${totalExpenses().toFixed(2)}\n\n`;
    
    // Business income
    report += '## BUSINESS INCOME\n\n';
    
    incomeCategories.forEach(category => {
      const summary = categoryMap().get(category);
      if (summary && summary.totalAmount > 0) {
        report += `### ${category.replace(/_/g, ' ')}\n`;
        report += `- Total: $${summary.totalAmount.toFixed(2)}\n`;
        report += `- Transaction Count: ${summary.transactionCount}\n\n`;
      }
    });
    
    report += `### TOTAL BUSINESS INCOME: $${totalIncome().toFixed(2)}\n\n`;
    
    // Summary
    report += '## SUMMARY FOR TAX PURPOSES\n\n';
    report += `- Total Business Income: $${totalIncome().toFixed(2)}\n`;
    report += `- Total Business Expenses: $${totalExpenses().toFixed(2)}\n`;
    report += `- Net Business Profit/Loss: $${(totalIncome() - totalExpenses()).toFixed(2)}\n`;
    
    // Download
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_deduction_report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ 'margin-bottom': '2rem' }}>Tax Deduction Analyzer</h1>
      
      {/* File Upload */}
      <Card style={{ 'margin-bottom': '2rem' }}>
        <h2>Upload Chase Bank Statement CSV</h2>
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          style={{ 'margin-top': '1rem' }}
        />
      </Card>
      
      <Show when={fileContent()}>
        {/* Date Filter */}
        <Card style={{ 'margin-bottom': '2rem' }}>
          <h3>Filter by Date Range</h3>
          <div style={{ display: 'flex', gap: '1rem', 'margin-top': '1rem' }}>
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
          </div>
        </Card>
        
        {/* Summary */}
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '1rem', 'margin-bottom': '2rem' }}>
          <Card>
            <h3>Total Business Income</h3>
            <p style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#22c55e' }}>
              ${totalIncome().toFixed(2)}
            </p>
          </Card>
          
          <Card>
            <h3>Total Business Expenses</h3>
            <p style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#ef4444' }}>
              ${totalExpenses().toFixed(2)}
            </p>
          </Card>
          
          <Card>
            <h3>Net Profit/Loss</h3>
            <p style={{ 
              'font-size': '2rem', 
              'font-weight': 'bold', 
              color: (totalIncome() - totalExpenses()) >= 0 ? '#22c55e' : '#ef4444' 
            }}>
              ${(totalIncome() - totalExpenses()).toFixed(2)}
            </p>
          </Card>
        </div>
        
        {/* Categories */}
        <Card style={{ 'margin-bottom': '2rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h2>Expense Categories</h2>
            <button 
              onClick={downloadReport}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer'
              }}
            >
              Download Tax Report
            </button>
          </div>
          
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '1rem' }}>
            <For each={expenseCategories}>
              {(category) => {
                const summary = categoryMap().get(category);
                if (!summary || summary.totalAmount >= 0) return null;
                
                return (
                  <div style={{
                    padding: '1rem',
                    background: '#f8f9fa',
                    'border-radius': 'var(--border-radius-sm)',
                    border: '1px solid #e9ecef'
                  }}>
                    <h4 style={{ 'margin-bottom': '0.5rem' }}>
                      {category.replace(/_/g, ' ')}
                    </h4>
                    <p style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#ef4444' }}>
                      ${Math.abs(summary.totalAmount).toFixed(2)}
                    </p>
                    <p style={{ color: '#6c757d' }}>
                      {summary.transactionCount} transactions
                    </p>
                    
                    <details style={{ 'margin-top': '0.5rem' }}>
                      <summary style={{ cursor: 'pointer' }}>View Details</summary>
                      <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem' }}>
                        <For each={summary.transactions.filter(t => t.amount < 0)}>
                          {(transaction) => (
                            <div style={{ 'margin-bottom': '0.25rem', padding: '0.25rem', background: 'white' }}>
                              {transaction.postingDate} - {transaction.description} - ${Math.abs(transaction.amount).toFixed(2)}
                            </div>
                          )}
                        </For>
                      </div>
                    </details>
                  </div>
                );
              }}
            </For>
          </div>
        </Card>
        
        {/* Income Categories */}
        <Card>
          <h2>Income Categories</h2>
          
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '1rem', 'margin-top': '1rem' }}>
            <For each={incomeCategories}>
              {(category) => {
                const summary = categoryMap().get(category);
                if (!summary || summary.totalAmount <= 0) return null;
                
                return (
                  <div style={{
                    padding: '1rem',
                    background: '#f8f9fa',
                    'border-radius': 'var(--border-radius-sm)',
                    border: '1px solid #e9ecef'
                  }}>
                    <h4 style={{ 'margin-bottom': '0.5rem' }}>
                      {category.replace(/_/g, ' ')}
                    </h4>
                    <p style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#22c55e' }}>
                      ${summary.totalAmount.toFixed(2)}
                    </p>
                    <p style={{ color: '#6c757d' }}>
                      {summary.transactionCount} transactions
                    </p>
                  </div>
                );
              }}
            </For>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export default TaxDeductionAnalyzer;