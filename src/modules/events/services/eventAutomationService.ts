import { EventData, EventAutomationRule, EventRuleCondition, JournalEntryLine } from '../types/eventTypes';
import { entryBookStore } from '../../journal/stores/entryBookStore';
import { eventService } from './eventService';
import { getEventTemplate } from '../data/eventTemplates';
import { eventRulesApi } from '../../../services/api/eventRulesApi';

class EventAutomationService {
  private rules: Map<string, EventAutomationRule> = new Map();
  private auditLog: Array<{
    timestamp: Date;
    eventId: string;
    eventType: string;
    rulesTriggered: string[];
    entriesCreated: string[];
    success: boolean;
    error?: string;
  }> = [];

  constructor() {
    // Register with event service to listen to all events
    eventService.on(
      [
        'invoice_completed', 'invoice_created', 'invoice_updated', 'invoice_cancelled',
        'payment_received', 'payment_refunded',
        'inventory_received', 'inventory_sold', 'inventory_adjusted',
        'expense_created', 'expense_approved', 'expense_paid',
        'service_rendered', 'freight_processed', 'customs_cleared',
        'bank_transaction_imported'
      ],
      this.handleEvent.bind(this),
      { id: 'automation_service', priority: 50 }
    );
    
    // Load rules from API on initialization
    this.loadRulesFromApi();
  }

  /**
   * Add a new automation rule
   */
  addRule(rule: Omit<EventAutomationRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const newRule: EventAutomationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(newRule.id, newRule);
    return newRule.id;
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<EventAutomationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = {
      ...rule,
      ...updates,
      id: ruleId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.rules.set(ruleId, updatedRule);
    return true;
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): EventAutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules for a specific event type
   */
  getRulesForEvent(eventType: string): EventAutomationRule[] {
    return this.getRules()
      .filter(rule => rule.eventType === eventType && rule.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Main event handler - processes events and triggers automation
   */
  private async handleEvent(event: EventData): Promise<void> {
    const applicableRules = this.getRulesForEvent(event.type);
    
    if (applicableRules.length === 0) {
      return; // No rules for this event type
    }

    const rulesTriggered: string[] = [];
    const entriesCreated: string[] = [];
    let success = true;
    let error: string | undefined;

    try {
      for (const rule of applicableRules) {
        try {
          const shouldTrigger = this.evaluateConditions(rule.conditions, event);
          
          if (shouldTrigger) {
            const entryId = await this.createJournalEntry(rule, event);
            rulesTriggered.push(rule.name);
            entriesCreated.push(entryId);
          }
        } catch (ruleError) {
          console.error(`Error executing rule ${rule.name}:`, ruleError);
          error = ruleError instanceof Error ? ruleError.message : 'Unknown error';
          success = false;
        }
      }
    } catch (processingError) {
      console.error('Error processing event automation:', processingError);
      error = processingError instanceof Error ? processingError.message : 'Unknown error';
      success = false;
    }

    // Log the automation event
    this.auditLog.unshift({
      timestamp: new Date(),
      eventId: event.id,
      eventType: event.type,
      rulesTriggered,
      entriesCreated,
      success,
      error
    });

    // Keep only last 1000 audit entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(0, 1000);
    }
  }

  /**
   * Evaluate rule conditions against event data
   */
  private evaluateConditions(conditions: EventRuleCondition[], event: EventData): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const value = this.getNestedValue(event, condition.field);
      return this.evaluateCondition(value, condition);
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(value: any, condition: EventRuleCondition): boolean {
    const { operator, value: expectedValue, dataType } = condition;

    // Convert values to appropriate types
    const convertedValue = this.convertValue(value, dataType);
    const convertedExpected = this.convertValue(expectedValue, dataType);

    switch (operator) {
      case 'equals':
        return convertedValue === convertedExpected;
      case 'notEquals':
        return convertedValue !== convertedExpected;
      case 'greaterThan':
        return convertedValue > convertedExpected;
      case 'lessThan':
        return convertedValue < convertedExpected;
      case 'greaterThanOrEqual':
        return convertedValue >= convertedExpected;
      case 'lessThanOrEqual':
        return convertedValue <= convertedExpected;
      case 'contains':
        return String(convertedValue).toLowerCase().includes(String(convertedExpected).toLowerCase());
      case 'notContains':
        return !String(convertedValue).toLowerCase().includes(String(convertedExpected).toLowerCase());
      case 'in':
        return Array.isArray(convertedExpected) && convertedExpected.includes(convertedValue);
      case 'notIn':
        return Array.isArray(convertedExpected) && !convertedExpected.includes(convertedValue);
      case 'exists':
        return value !== undefined && value !== null;
      case 'notExists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  /**
   * Convert value to specified data type
   */
  private convertValue(value: any, dataType: string): any {
    if (value === null || value === undefined) return value;

    switch (dataType) {
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }

  /**
   * Create journal entry from rule template
   */
  private async createJournalEntry(rule: EventAutomationRule, event: EventData): Promise<string> {
    const { journalEntryTemplate } = rule;
    
    // Process description and reference templates
    const description = this.processTemplate(journalEntryTemplate.description, event);
    const reference = this.processTemplate(journalEntryTemplate.reference, event);

    // Process each line in the template
    const lines: JournalEntryLine[] = [];
    
    for (const lineTemplate of journalEntryTemplate.lines) {
      // Check line-specific conditions if they exist
      if (lineTemplate.conditions && lineTemplate.conditions.length > 0) {
        const shouldIncludeLine = this.evaluateConditions(lineTemplate.conditions, event);
        if (!shouldIncludeLine) continue;
      }

      // Calculate amount for this line
      const amount = this.evaluateAmountExpression(lineTemplate.amountExpression, event);
      if (amount === 0) continue; // Skip zero-amount lines

      // Get account information
      const accountId = this.processTemplate(lineTemplate.accountExpression, event);
      const subAccountId = lineTemplate.subAccountExpression 
        ? this.processTemplate(lineTemplate.subAccountExpression, event)
        : undefined;

      // Process line description
      const lineDescription = this.processTemplate(lineTemplate.descriptionTemplate, event);

      // Create the journal entry line
      const line: JournalEntryLine = {
        id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        accountId,
        accountName: this.getAccountName(accountId),
        subAccountId,
        subAccountName: subAccountId ? this.getAccountName(subAccountId) : undefined,
        description: lineDescription,
        debitAmount: lineTemplate.isDebit ? amount : 0,
        creditAmount: lineTemplate.isDebit ? 0 : amount,
        reference
      };

      lines.push(line);
    }

    if (lines.length === 0) {
      throw new Error('No valid journal entry lines generated');
    }

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredits = lines.reduce((sum, line) => sum + line.creditAmount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Journal entry not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }

    // Create the journal entry
    const journalEntry = {
      entryNumber: entryBookStore.getNextEntryNumber(),
      date: new Date().toISOString().split('T')[0],
      description,
      reference,
      status: 'draft' as const,
      createdBy: 'automation',
      createdAt: new Date().toISOString(),
      totalDebit: totalDebits,
      totalCredit: totalCredits,
      lines
    };

    const entryId = await entryBookStore.addJournalEntry(journalEntry);

    // Auto-post if configured (you can add configuration for this)
    // entryBookStore.postJournalEntry(entryId);

    return entryId;
  }

  /**
   * Process template strings with event data
   */
  private processTemplate(template: string, event: EventData): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = this.getNestedValue(event, path);
      return String(value || match);
    });
  }

  /**
   * Evaluate amount expression
   */
  private evaluateAmountExpression(expression: string, event: EventData): number {
    try {
      // Handle direct numeric values
      if (!isNaN(Number(expression))) {
        return Number(expression);
      }

      // Handle event data expressions
      const value = this.getNestedValue(event, expression);
      return Number(value) || 0;
    } catch (error) {
      console.error(`Error evaluating amount expression: ${expression}`, error);
      return 0;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get account name by ID (integrate with your account system)
   */
  private getAccountName(accountId: string): string {
    // This would integrate with your actual chart of accounts
    const accountNames: { [key: string]: string } = {
      '1001': 'Cash - Operating Account',
      '1002': 'Cash - Zelle Account',
      '1003': 'Cash - Credit Card Processing',
      '1101': 'Accounts Receivable - Customers',
      '1102': 'Accounts Receivable - Freight Charges',
      '1201': 'Inventory - Products',
      '1202': 'Inventory - Packaging Materials',
      '1301': 'Prepaid Expenses',
      '1401': 'Customs Fees Receivable',
      '1402': 'Transit Insurance Receivable',
      '2001': 'Accounts Payable',
      '2002': 'Freight Payable',
      '2101': 'Accrued Salaries',
      '2102': 'Accrued Rent',
      '2301': 'Sales Tax Payable',
      '2302': 'Customs Fees Payable',
      '2303': 'Transit Insurance Payable',
      '3001': 'Owner\'s Equity',
      '3101': 'Retained Earnings',
      '4001': 'Sales Revenue - Products',
      '4101': 'Service Revenue - General',
      '4201': 'Transport Service Revenue',
      '4202': 'Freight Revenue - Air',
      '4203': 'Freight Revenue - Sea',
      '4301': 'Processing Revenue - Packaging',
      '4302': 'Processing Revenue - Storage',
      '5001': 'Cost of Goods Sold - Products',
      '5002': 'Cost of Goods Sold - Packaging',
      '5101': 'Freight Expense - Air',
      '5102': 'Freight Expense - Sea',
      '5103': 'Local Transport Expense',
      '5201': 'Salaries and Wages',
      '5202': 'Rent Expense - Office',
      '5203': 'Rent Expense - Warehouse',
      '5301': 'Utilities Expense',
      '5302': 'Insurance Expense',
      '5303': 'Office Supplies',
      '5401': 'Professional Fees',
      '5402': 'Bank Fees',
      '5403': 'Credit Card Processing Fees',
      '5501': 'Vehicle Expenses',
      '5502': 'Equipment Maintenance',
      '5601': 'Depreciation Expense'
    };
    
    return accountNames[accountId] || `Account ${accountId}`;
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 100) {
    return this.auditLog.slice(0, limit);
  }

  /**
   * Clear audit log
   */
  clearAuditLog() {
    this.auditLog = [];
  }

  /**
   * Export rules configuration
   */
  exportRules(): EventAutomationRule[] {
    return this.getRules();
  }

  /**
   * Import rules configuration
   */
  importRules(rules: EventAutomationRule[]): void {
    this.rules.clear();
    rules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Sync rules from API (called when rules are updated via UI)
   */
  syncRules(rules: EventAutomationRule[]): void {
    this.rules.clear();
    rules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Load rules from API
   */
  private async loadRulesFromApi(): Promise<void> {
    try {
      const rules = await eventRulesApi.getAll();

      this.syncRules(rules);
    } catch (error) {
      console.error('Failed to load event rules from API:', error);
      // Continue with empty rules if API fails
    }
  }

  /**
   * Test a rule against sample data
   */
  testRule(rule: EventAutomationRule, sampleEventData: EventData): {
    wouldTrigger: boolean;
    conditionResults: Array<{ condition: EventRuleCondition; result: boolean }>;
    estimatedJournalEntry?: any;
    errors?: string[];
  } {
    const conditionResults = rule.conditions.map(condition => ({
      condition,
      result: this.evaluateCondition(this.getNestedValue(sampleEventData, condition.field), condition)
    }));

    const wouldTrigger = conditionResults.every(result => result.result);

    const result: any = {
      wouldTrigger,
      conditionResults
    };

    if (wouldTrigger) {
      try {
        // Simulate journal entry creation without actually creating it
        const description = this.processTemplate(rule.journalEntryTemplate.description, sampleEventData);
        const reference = this.processTemplate(rule.journalEntryTemplate.reference, sampleEventData);

        const lines = rule.journalEntryTemplate.lines.map(lineTemplate => {
          const amount = this.evaluateAmountExpression(lineTemplate.amountExpression, sampleEventData);
          const accountId = this.processTemplate(lineTemplate.accountExpression, sampleEventData);
          const lineDescription = this.processTemplate(lineTemplate.descriptionTemplate, sampleEventData);

          return {
            accountId,
            accountName: this.getAccountName(accountId),
            description: lineDescription,
            debitAmount: lineTemplate.isDebit ? amount : 0,
            creditAmount: lineTemplate.isDebit ? 0 : amount
          };
        });

        result.estimatedJournalEntry = {
          description,
          reference,
          lines
        };
      } catch (error) {
        result.errors = [error instanceof Error ? error.message : 'Unknown error'];
      }
    }

    return result;
  }
}

// Export singleton instance
export const eventAutomationService = new EventAutomationService();