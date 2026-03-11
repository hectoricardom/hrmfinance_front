import { readFileSync, writeFileSync } from 'fs';
import { devLog } from '../services/utils';

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

function categorizeTransaction(description: string): string {
  const upperDesc = description.toUpperCase();
  
  for (const [category, keywords] of Object.entries(BUSINESS_CATEGORIES)) {
    for (const keyword of keywords) {
      if (upperDesc.includes(keyword.toUpperCase())) {
        return category;
      }
    }
  }
  
  return 'OTHER';
}

function parseCSV(csvContent: string): Transaction[] {
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
}

function analyzeTransactions(transactions: Transaction[]): Map<string, CategorySummary> {
  const categoryMap = new Map<string, CategorySummary>();
  
  transactions.forEach(transaction => {
    const category = categorizeTransaction(transaction.description);
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        totalAmount: 0,
        transactionCount: 0,
        transactions: []
      });
    }
    
    const categorySummary = categoryMap.get(category)!;
    categorySummary.totalAmount += transaction.amount;
    categorySummary.transactionCount++;
    categorySummary.transactions.push(transaction);
  });
  
  return categoryMap;
}

function generateReport(categoryMap: Map<string, CategorySummary>): string {
  let report = '# TAX DEDUCTION SUMMARY REPORT\n';
  report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  
  // Business expenses (negative amounts)
  report += '## BUSINESS EXPENSES (Tax Deductible)\n\n';
  let totalExpenses = 0;
  
  const expenseCategories = ['UTILITIES', 'BUSINESS_TRAVEL', 'BUSINESS_MEALS', 
                            'OFFICE_SUPPLIES', 'LOAN_PAYMENTS'];
  
  expenseCategories.forEach(category => {
    const summary = categoryMap.get(category);
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
      totalExpenses += Math.abs(summary.totalAmount);
    }
  });
  
  report += `### TOTAL BUSINESS EXPENSES: $${totalExpenses.toFixed(2)}\n\n`;
  
  // Business income (positive amounts)
  report += '## BUSINESS INCOME\n\n';
  let totalIncome = 0;
  
  const incomeCategories = ['BUSINESS_INCOME', 'CLIENT_PAYMENTS'];
  
  incomeCategories.forEach(category => {
    const summary = categoryMap.get(category);
    if (summary && summary.totalAmount > 0) {
      report += `### ${category.replace(/_/g, ' ')}\n`;
      report += `- Total: $${summary.totalAmount.toFixed(2)}\n`;
      report += `- Transaction Count: ${summary.transactionCount}\n`;
      
      if (category === 'BUSINESS_INCOME') {
        report += `- Details:\n`;
        summary.transactions.forEach(t => {
          if (t.amount > 0) {
            report += `  - ${t.postingDate} | ${t.description} | $${t.amount.toFixed(2)}\n`;
          }
        });
      }
      
      report += '\n';
      totalIncome += summary.totalAmount;
    }
  });
  
  report += `### TOTAL BUSINESS INCOME: $${totalIncome.toFixed(2)}\n\n`;
  
  // Summary
  report += '## SUMMARY FOR TAX PURPOSES\n\n';
  report += `- Total Business Income: $${totalIncome.toFixed(2)}\n`;
  report += `- Total Business Expenses: $${totalExpenses.toFixed(2)}\n`;
  report += `- Net Business Profit/Loss: $${(totalIncome - totalExpenses).toFixed(2)}\n\n`;
  
  // Other transactions summary
  const otherSummary = categoryMap.get('OTHER');
  if (otherSummary) {
    report += '## OTHER TRANSACTIONS (Non-Business)\n';
    report += `- Total Count: ${otherSummary.transactionCount}\n`;
    report += `- Net Amount: $${otherSummary.totalAmount.toFixed(2)}\n\n`;
  }
  
  return report;
}

// Main function to process the CSV file
export function analyzeBankStatement(csvFilePath: string): string {
  try {
    const csvContent = readFileSync(csvFilePath, 'utf-8');
    const transactions = parseCSV(csvContent);
    const categoryMap = analyzeTransactions(transactions);
    const report = generateReport(categoryMap);
    
    // Save report to file
    const reportPath = csvFilePath.replace('.csv', '_tax_report.md');
    writeFileSync(reportPath, report);
    
    devLog(`Report generated: ${reportPath}`);
    return report;
  } catch (error) {
    console.error('Error processing CSV file:', error);
    throw error;
  }
}

// If running directly
if (require.main === module) {
  const filePath = '/Users/hectorssg/Documents/claudeAI/hrmfinance/src/utils/ChaseYABA.csv';
  const report = analyzeBankStatement(filePath);
  devLog(report);
}