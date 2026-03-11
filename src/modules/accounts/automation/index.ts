// Account Automation Module
// Provides automated journal entry creation for common business transactions

export { 
  accountAutomationStore 
} from '../stores/accountAutomationStore';

export { 
  automationService,
  processInvoiceCompleted,
  processInventoryMovement,
  processPaymentReceived,
  processServiceRendered,
  processTaxCalculated
} from '../services/automationService';

export type {
  AccountMapping,
  AutomationRule,
  TransactionType,
  TriggerEvent,
  AutomationCondition,
  AutomationAction,
  DefaultAccountMappings,
  AccountAutomationConfig
} from '../types/automationTypes';

export { 
  defaultAccounts,
  getDefaultAccountForTransaction,
  type DefaultAccount
} from '../data/defaultAccounts';

export { default as AccountAutomationConfig } from '../components/AccountAutomationConfig';
export { default as CustomAutomationPanel } from '../components/CustomAutomationPanel';
export { default as ManualAutomationMenu } from '../components/ManualAutomationMenu';

export { 
  customAutomationService,
  type CustomAutomationParams,
  type QuickTransactionParams
} from '../services/customAutomationService';

// Quick setup function for new installations
export const setupDefaultAutomation = async () => {
  const { accountAutomationStore } = await import('../stores/accountAutomationStore');
  
  // Reset to default configuration
  accountAutomationStore.resetToDefaults();
  
  console.log('Account automation configured with default settings');
  return true;
};