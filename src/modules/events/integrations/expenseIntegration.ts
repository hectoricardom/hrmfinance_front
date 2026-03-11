// Integration layer to connect expense module with event system

import { emitExpenseCreated } from '../services/eventService';
import { ExpenseEvent } from '../types/eventTypes';

/**
 * Transform expense data to event format
 */
export const transformExpenseToEvent = (expense: any): ExpenseEvent['data'] => {
  return {
    expenseId: expense.id || `exp_${Date.now()}`,
    category: expense.category || 'general',
    subcategory: expense.subcategory,
    description: expense.description || 'Expense',
    amount: parseFloat(expense.amount) || 0,
    currency: expense.currency || 'USD',
    exchangeRate: parseFloat(expense.exchangeRate) || 1.0,
    vendorId: expense.vendorId || expense.vendor?.id,
    vendorName: expense.vendorName || expense.vendor?.name || expense.payee,
    employeeId: expense.employeeId || expense.employee?.id,
    employeeName: expense.employeeName || expense.employee?.name || expense.submittedBy,
    departmentId: expense.departmentId || expense.department?.id,
    departmentName: expense.departmentName || expense.department?.name,
    projectId: expense.projectId || expense.project?.id,
    projectName: expense.projectName || expense.project?.name,
    paymentMethod: expense.paymentMethod || 'cash',
    bankAccount: expense.bankAccount || expense.account,
    reference: expense.reference || expense.receiptNumber || `REF-${Date.now()}`,
    receiptAttached: Boolean(expense.receipt || expense.attachments?.length > 0),
    taxAmount: parseFloat(expense.taxAmount) || 0,
    taxRate: parseFloat(expense.taxRate) || 0,
    approvedBy: expense.approvedBy || expense.approver?.name,
    approvedDate: expense.approvedDate,
    paidDate: expense.paidDate
  };
};

/**
 * Emit expense created event
 */
export const emitExpenseCreatedEvent = async (expense: any): Promise<void> => {
  const eventData = transformExpenseToEvent(expense);
  
  const event: ExpenseEvent = {
    id: `expense_created_${expense.id}_${Date.now()}`,
    type: 'expense_created',
    timestamp: new Date(),
    source: 'expense_module',
    data: eventData
  };

  await emitExpenseCreated(event);
};

/**
 * Emit expense approved event
 */
export const emitExpenseApprovedEvent = async (expense: any): Promise<void> => {
  const eventData = transformExpenseToEvent(expense);
  
  const event: ExpenseEvent = {
    id: `expense_approved_${expense.id}_${Date.now()}`,
    type: 'expense_approved',
    timestamp: new Date(),
    source: 'expense_module',
    data: {
      ...eventData,
      approvedDate: new Date().toISOString().split('T')[0]
    }
  };

  await emitExpenseCreated(event); // Reuse the same emission function
};

/**
 * Emit expense paid event
 */
export const emitExpensePaidEvent = async (expense: any): Promise<void> => {
  const eventData = transformExpenseToEvent(expense);
  
  const event: ExpenseEvent = {
    id: `expense_paid_${expense.id}_${Date.now()}`,
    type: 'expense_paid',
    timestamp: new Date(),
    source: 'expense_module',
    data: {
      ...eventData,
      paidDate: new Date().toISOString().split('T')[0]
    }
  };

  await emitExpenseCreated(event);
};

// Integration helpers for expense management
export const expenseEventIntegration = {
  /**
   * Call this when an expense is created
   */
  onExpenseCreated: emitExpenseCreatedEvent,
  
  /**
   * Call this when an expense is approved
   */
  onExpenseApproved: emitExpenseApprovedEvent,
  
  /**
   * Call this when an expense is paid
   */
  onExpensePaid: emitExpensePaidEvent,

  /**
   * Transform function for testing
   */
  transformExpenseToEvent,

  /**
   * General expense status change handler
   */
  onExpenseStatusChange: async (expense: any, newStatus: string): Promise<void> => {
    switch (newStatus) {
      case 'approved':
        await emitExpenseApprovedEvent(expense);
        break;
      case 'paid':
        await emitExpensePaidEvent(expense);
        break;
      case 'created':
      case 'submitted':
        await emitExpenseCreatedEvent(expense);
        break;
      default:
        // For other status changes, emit generic created event
        await emitExpenseCreatedEvent(expense);
    }
  }
};