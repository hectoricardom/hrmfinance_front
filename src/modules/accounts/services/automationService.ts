import { accountAutomationStore } from '../stores/accountAutomationStore';
import { entryBookStore } from '../../journal/stores/entryBookStore';
import { TriggerEvent, AutomationRule, AutomationAction } from '../types/automationTypes';

export interface AutomationContext {
  invoice?: any;
  inventoryMovement?: any;
  payment?: any;
  services?: any[];
  triggerData?: any;
}

class AutomationService {
  private auditLog: Array<{
    timestamp: Date;
    event: string;
    context: any;
    rulesApplied: string[];
    entriesCreated: string[];
    success: boolean;
    error?: string;
  }> = [];

  /**
   * Main entry point for processing automation events
   */
  async processEvent(event: TriggerEvent, context: AutomationContext): Promise<void> {
    if (!accountAutomationStore.isEnabled) {
      return;
    }

    const timestamp = new Date();
    let rulesApplied: string[] = [];
    let entriesCreated: string[] = [];
    let success = true;
    let error: string | undefined;

    try {
      const applicableRules = accountAutomationStore.getApplicableRules(event, context);
      
      for (const rule of applicableRules) {
        try {
          const entryIds = await this.executeRule(rule, context);
          rulesApplied.push(rule.name);
          entriesCreated.push(...entryIds);
        } catch (ruleError) {
          console.error(`Error executing rule ${rule.name}:`, ruleError);
          error = ruleError.message;
          success = false;
        }
      }
    } catch (processingError) {
      console.error('Error processing automation event:', processingError);
      error = processingError.message;
      success = false;
    }

    // Log the automation event
    this.auditLog.push({
      timestamp,
      event,
      context,
      rulesApplied,
      entriesCreated,
      success,
      error
    });

    // Keep only last 1000 audit entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Execute a specific automation rule
   */
  private async executeRule(rule: AutomationRule, context: AutomationContext): Promise<string[]> {
    const entryIds: string[] = [];

    for (const action of rule.actions) {
      if (action.type === 'create_journal_entry') {
        const entryId = await this.createJournalEntry(action, context, rule.name);
        if (entryId) {
          entryIds.push(entryId);
        }
      }
    }

    return entryIds;
  }

  /**
   * Create journal entry from automation action
   */
  private async createJournalEntry(
    action: AutomationAction, 
    context: AutomationContext, 
    ruleName: string
  ): Promise<string | null> {
    try {
      const lines = action.accountMappings.map(mapping => {
        const amount = this.evaluateAmountExpression(mapping.amountExpression, context);
        const description = this.expandDescription(mapping.description, context);

        return [
          // Debit line
          {
            accountId: mapping.debitAccountId,
            accountName: this.getAccountName(mapping.debitAccountId),
            debitAmount: amount,
            creditAmount: 0,
            description
          },
          // Credit line  
          {
            accountId: mapping.creditAccountId,
            accountName: this.getAccountName(mapping.creditAccountId),
            debitAmount: 0,
            creditAmount: amount,
            description
          }
        ];
      }).flat();

      // Calculate totals
      const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
      const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);
      
      // Create the journal entry
      const entry = {
        entryNumber: this.getNextEntryNumber(),
        date: new Date().toISOString().split('T')[0],
        description: `Auto: ${ruleName} - ${this.getContextDescription(context)}`,
        reference: this.getReference(context),
        status: 'draft' as const,
        createdBy: 'automation',
        createdAt: new Date().toISOString(),
        totalDebit,
        totalCredit,
        lines: lines.map(line => ({
          ...line,
          id: `line_${Date.now()}_${Math.random()}`
        }))
      };

      const entryId = await entryBookStore.addJournalEntry(entry);
      
      // Auto-post if configured and amount is below threshold
      const config = accountAutomationStore.exportConfiguration();
      const totalAmount = lines.reduce((sum, line) => sum + line.debitAmount, 0);
      
      if (!config.auditSettings.requireApproval || 
          totalAmount <= config.auditSettings.approvalThreshold) {
        entryBookStore.postJournalEntry(entryId);
      }

      return entryId;
    } catch (error) {
      console.error('Error creating journal entry:', error);
      throw error;
    }
  }

  /**
   * Evaluate amount expression in context
   */
  private evaluateAmountExpression(expression: string, context: AutomationContext): number {
    try {
      // Handle direct numeric values
      if (!isNaN(Number(expression))) {
        return Number(expression);
      }

      // Handle context expressions like 'invoice.total', 'paymentMethods.cash'
      const value = this.getNestedValue(context, expression);
      return Number(value) || 0;
    } catch (error) {
      console.error(`Error evaluating amount expression: ${expression}`, error);
      return 0;
    }
  }

  /**
   * Expand description template with context values
   */
  private expandDescription(template: string, context: AutomationContext): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      return String(value || match);
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get account name by ID (would integrate with accounts store)
   */
  private getAccountName(accountId: string): string {
    // This would integrate with the actual accounts store
    // For now, return a placeholder
    const accountNames: { [key: string]: string } = {
      '1001': 'Cash - Operating',
      '1101': 'Accounts Receivable',
      '1201': 'Inventory - Products', 
      '1401': 'Customs Fees Receivable',
      '2301': 'Sales Tax Payable',
      '4001': 'Sales Revenue - Products',
      '4101': 'Service Revenue',
      '4201': 'Transport Service Revenue',
      '5001': 'Cost of Goods Sold'
    };
    
    return accountNames[accountId] || `Account ${accountId}`;
  }

  /**
   * Get reference from context (invoice number, etc.)
   */
  private getReference(context: AutomationContext): string {
    if (context.invoice?.invoice) {
      return `INV-${context.invoice.invoice}`;
    }
    if (context.payment?.id) {
      return `PAY-${context.payment.id}`;
    }
    if (context.inventoryMovement?.id) {
      return `INV-MOV-${context.inventoryMovement.id}`;
    }
    return `AUTO-${Date.now()}`;
  }

  /**
   * Get next entry number for journal entries
   */
  private getNextEntryNumber(): string {
    return entryBookStore.getNextEntryNumber();
  }

  /**
   * Get context description for journal entry
   */
  private getContextDescription(context: AutomationContext): string {
    if (context.invoice) {
      return `Invoice ${context.invoice.invoice} - ${context.invoice.shipper_consignee?.name}`;
    }
    if (context.payment) {
      return `Payment ${context.payment.id}`;
    }
    if (context.inventoryMovement) {
      return `Inventory Movement ${context.inventoryMovement.type}`;
    }
    return 'Automated Transaction';
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 100) {
    return this.auditLog.slice(-limit).reverse();
  }

  /**
   * Clear audit log
   */
  clearAuditLog() {
    this.auditLog = [];
  }
}

// Export singleton instance
export const automationService = new AutomationService();

// Convenience functions for common automation events
export const processInvoiceCompleted = (invoice: any) => {
  return automationService.processEvent('invoice_completed', { invoice });
};

export const processInventoryMovement = (movement: any) => {
  return automationService.processEvent('inventory_movement', { inventoryMovement: movement });
};

export const processPaymentReceived = (payment: any) => {
  return automationService.processEvent('payment_received', { payment });
};

export const processServiceRendered = (services: any[]) => {
  return automationService.processEvent('service_rendered', { services });
};

export const processTaxCalculated = (taxData: any) => {
  return automationService.processEvent('tax_calculated', { triggerData: taxData });
};