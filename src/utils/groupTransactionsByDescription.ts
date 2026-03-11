import { readFileSync, writeFileSync } from 'fs';
import { devLog } from '../services/utils';

interface TransactionGroup {
  description: string;
  totalAmount: number;
  count: number;
  dates: string[];
  amounts: number[];
  type: string;
  averageAmount: number;
}

export function groupTransactionsByDescription(csvFilePath: string): void {
  const csvContent = readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  // Group transactions by description
  const transactionGroups = new Map<string, TransactionGroup>();
  
  // Process all transactions
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 7) {
      const description = parts[2].trim();
      const amount = parseFloat(parts[3]);
      const date = parts[1];
      const type = parts[4];
      
      if (!transactionGroups.has(description)) {
        transactionGroups.set(description, {
          description: description,
          totalAmount: 0,
          count: 0,
          dates: [],
          amounts: [],
          type: type,
          averageAmount: 0
        });
      }
      
      const group = transactionGroups.get(description)!;
      group.totalAmount += amount;
      group.count++;
      group.dates.push(date);
      group.amounts.push(amount);
    }
  }
  
  // Calculate averages and convert to array
  const sortedGroups = Array.from(transactionGroups.values())
    .map(group => {
      group.averageAmount = group.totalAmount / group.count;
      return group;
    })
    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));
  
  // Separate income and expenses
  const incomeGroups = sortedGroups.filter(g => g.totalAmount > 0);
  const expenseGroups = sortedGroups.filter(g => g.totalAmount < 0);
  
  // Generate report
  let report = '# TRANSACTIONS GROUPED BY DESCRIPTION\n';
  report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  
  // Summary
  report += '## SUMMARY\n';
  report += `- Total unique descriptions: ${transactionGroups.size}\n`;
  report += `- Income descriptions: ${incomeGroups.length}\n`;
  report += `- Expense descriptions: ${expenseGroups.length}\n\n`;
  
  // Income section
  report += '## INCOME TRANSACTIONS (Grouped by Description)\n\n';
  report += '| Description | Count | Total Amount | Average | First Date | Last Date |\n';
  report += '|-------------|-------|--------------|---------|------------|------------|\n';
  
  incomeGroups.forEach(group => {
    const firstDate = group.dates[group.dates.length - 1];
    const lastDate = group.dates[0];
    const desc = group.description.length > 60 
      ? group.description.substring(0, 57) + '...' 
      : group.description;
    
    report += `| ${desc} | ${group.count} | $${group.totalAmount.toFixed(2)} | $${group.averageAmount.toFixed(2)} | ${firstDate} | ${lastDate} |\n`;
  });
  
  // Expense section
  report += '\n## EXPENSE TRANSACTIONS (Grouped by Description)\n\n';
  report += '| Description | Count | Total Amount | Average | First Date | Last Date |\n';
  report += '|-------------|-------|--------------|---------|------------|------------|\n';
  
  expenseGroups.forEach(group => {
    const firstDate = group.dates[group.dates.length - 1];
    const lastDate = group.dates[0];
    const desc = group.description.length > 60 
      ? group.description.substring(0, 57) + '...' 
      : group.description;
    
    report += `| ${desc} | ${group.count} | $${Math.abs(group.totalAmount).toFixed(2)} | $${Math.abs(group.averageAmount).toFixed(2)} | ${firstDate} | ${lastDate} |\n`;
  });
  
  // High frequency transactions
  report += '\n## HIGH FREQUENCY TRANSACTIONS (5+ occurrences)\n\n';
  const highFrequency = sortedGroups.filter(g => g.count >= 5);
  
  report += '| Description | Frequency | Total Impact | Type |\n';
  report += '|-------------|-----------|--------------|------|\n';
  
  highFrequency.forEach(group => {
    const impact = group.totalAmount > 0 
      ? `+$${group.totalAmount.toFixed(2)}` 
      : `-$${Math.abs(group.totalAmount).toFixed(2)}`;
    const type = group.totalAmount > 0 ? 'Income' : 'Expense';
    
    report += `| ${group.description} | ${group.count}x | ${impact} | ${type} |\n`;
  });
  
  // Unique high-value transactions
  report += '\n## UNIQUE HIGH-VALUE TRANSACTIONS\n\n';
  const uniqueHighValue = sortedGroups
    .filter(g => g.count === 1 && Math.abs(g.totalAmount) > 500)
    .slice(0, 20);
  
  report += '| Description | Amount | Date | Type |\n';
  report += '|-------------|--------|------|------|\n';
  
  uniqueHighValue.forEach(group => {
    const amount = group.totalAmount > 0 
      ? `$${group.totalAmount.toFixed(2)}` 
      : `-$${Math.abs(group.totalAmount).toFixed(2)}`;
    
    report += `| ${group.description} | ${amount} | ${group.dates[0]} | ${group.type} |\n`;
  });
  
  // Key insights
  report += '\n## KEY INSIGHTS\n\n';
  
  // Most frequent income source
  const mostFrequentIncome = incomeGroups.sort((a, b) => b.count - a.count)[0];
  if (mostFrequentIncome) {
    report += `**Most Frequent Income**: ${mostFrequentIncome.description}\n`;
    report += `- Occurred ${mostFrequentIncome.count} times\n`;
    report += `- Total: $${mostFrequentIncome.totalAmount.toFixed(2)}\n`;
    report += `- Average: $${mostFrequentIncome.averageAmount.toFixed(2)}\n\n`;
  }
  
  // Largest expense category
  const largestExpense = expenseGroups[0];
  if (largestExpense) {
    report += `**Largest Expense Category**: ${largestExpense.description}\n`;
    report += `- Total: $${Math.abs(largestExpense.totalAmount).toFixed(2)}\n`;
    report += `- Frequency: ${largestExpense.count} times\n`;
    report += `- Average: $${Math.abs(largestExpense.averageAmount).toFixed(2)}\n\n`;
  }
  
  // Recurring expenses
  const recurringExpenses = expenseGroups
    .filter(g => g.count >= 3)
    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
    .slice(0, 10);
  
  report += '**Top Recurring Expenses**:\n';
  recurringExpenses.forEach((expense, i) => {
    report += `${i + 1}. ${expense.description}: $${Math.abs(expense.totalAmount).toFixed(2)} (${expense.count}x)\n`;
  });
  
  // Save report
  const outputPath = csvFilePath.replace('.csv', '_grouped_by_description.md');
  writeFileSync(outputPath, report);
  
  devLog(`Grouped analysis saved to: ${outputPath}`);
  devLog(`\nQuick Summary:`);
  devLog(`- Total unique transactions: ${transactionGroups.size}`);
  devLog(`- Income sources: ${incomeGroups.length}`);
  devLog(`- Expense categories: ${expenseGroups.length}`);
  devLog(`- High frequency (5+): ${highFrequency.length}`);
}

// Run the analysis
if (require.main === module) {
  const filePath = '/Users/hectorssg/Documents/claudeAI/hrmfinance/src/utils/ChaseYABA.csv';
  groupTransactionsByDescription(filePath);
}