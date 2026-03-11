import { createSignal } from 'solid-js';
import { apiAdapter, journalApi, bankConsolidationApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { accountsStore } from '../../accounts/stores/accountsStore';
import { Base64Encode } from '../../../services/utils';

export interface BankStatement {
  id: string;
  accountId: string; // Reference to accounting account
  date: string;
  description: string;
  reference: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  category?: string;
  isReconciled: boolean;
  reconciledWith?: string; // ID of matching entry book record
  importedAt: string;
  source: 'manual' | 'csv_import' | 'api';
}

export interface EntryBookRecord {
  id: string;
  accountId: string;
  date: string;
  description: string;
  reference: string;
  debitAmount: number;
  creditAmount: number;
  category: string;
  isReconciled: boolean;
  reconciledWith?: string; // ID of matching bank statement
  createdAt: string;
}

export interface BankAccount {
  id: string;
  accountId: string; // Reference to accounting account
  bankName: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit' | 'investment';
  currency: string;
  currentBalance: number;
  lastReconciledDate?: string;
  lastReconciledBalance?: number;
  isActive: boolean;
}

export interface ReconciliationSession {
  id: string;
  bankAccountId: string;
  periodStart: string;
  periodEnd: string;
  startingBalance: number;
  endingBalance: number;
  status: 'pending' | 'in_progress' | 'completed' | 'discrepancy';
  totalBankTransactions: number;
  totalEntryBookRecords: number;
  reconciledTransactions: number;
  unreconciledTransactions: number;
  discrepancyAmount: number;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}


/* 
const initialBankAccounts: BankAccount[] = [
  {
    id: '1',
    accountId: '1002', // Bank - Checking Account
    bankName: 'First National Bank',
    accountNumber: '****1234',
    accountType: 'checking',
    currency: 'USD',
    currentBalance: 32730.50,
    lastReconciledDate: '2024-01-01',
    lastReconciledBalance: 30000.00,
    isActive: true
  },
  {
    id: '2',
    accountId: '1003', // Bank - Savings Account
    bankName: 'First National Bank',
    accountNumber: '****5678',
    accountType: 'savings',
    currency: 'USD',
    currentBalance: 12000.00,
    lastReconciledDate: '2024-01-01',
    lastReconciledBalance: 10000.00,
    isActive: true
  }
];

const initialBankStatements: BankStatement[] = [
  {
    id: '1',
    accountId: '1002',
    date: '2024-01-15',
    description: 'Customer Payment - ABC Corp',
    reference: 'CHK001234',
    debitAmount: 5000.00,
    creditAmount: 0,
    balance: 35730.50,
    category: 'Customer Payment',
    isReconciled: true,
    reconciledWith: 'eb1',
    importedAt: '2024-01-16',
    source: 'csv_import'
  },
  {
    id: '2',
    accountId: '1002',
    date: '2024-01-14',
    description: 'Office Supplies - Staples',
    reference: 'CHK001235',
    debitAmount: 0,
    creditAmount: 250.00,
    balance: 30730.50,
    category: 'Office Expenses',
    isReconciled: true,
    reconciledWith: 'eb2',
    importedAt: '2024-01-16',
    source: 'csv_import'
  },
  {
    id: '3',
    accountId: '1002',
    date: '2024-01-13',
    description: 'Monthly Rent Payment',
    reference: 'CHK001236',
    debitAmount: 0,
    creditAmount: 2000.00,
    balance: 28730.50,
    category: 'Rent',
    isReconciled: false,
    importedAt: '2024-01-16',
    source: 'csv_import'
  },
  {
    id: '4',
    accountId: '1002',
    date: '2024-01-12',
    description: 'Wire Transfer In',
    reference: 'WIRE001',
    debitAmount: 10000.00,
    creditAmount: 0,
    balance: 38730.50,
    category: 'Wire Transfer',
    isReconciled: false,
    importedAt: '2024-01-16',
    source: 'csv_import'
  }
];

const initialEntryBookRecords: EntryBookRecord[] = [
  {
    id: 'eb1',
    accountId: '1002',
    date: '2024-01-15',
    description: 'Customer Payment Received - ABC Corp',
    reference: 'INV-2024-001',
    debitAmount: 5000.00,
    creditAmount: 0,
    category: 'Accounts Receivable',
    isReconciled: true,
    reconciledWith: '1',
    createdAt: '2024-01-15'
  },
  {
    id: 'eb2',
    accountId: '1002',
    date: '2024-01-14',
    description: 'Office Supplies Purchase',
    reference: 'PO-2024-001',
    debitAmount: 0,
    creditAmount: 250.00,
    category: 'Office Expenses',
    isReconciled: true,
    reconciledWith: '2',
    createdAt: '2024-01-14'
  },
  {
    id: 'eb3',
    accountId: '1002',
    date: '2024-01-11',
    description: 'Salary Payment - John Doe',
    reference: 'PAY-2024-001',
    debitAmount: 0,
    creditAmount: 3500.00,
    category: 'Salary Expense',
    isReconciled: false,
    createdAt: '2024-01-11'
  }
];

const initialReconciliationSessions: ReconciliationSession[] = [
  {
    id: '1',
    bankAccountId: '1',
    periodStart: '2024-01-01',
    periodEnd: '2024-01-15',
    startingBalance: 30000.00,
    endingBalance: 35730.50,
    status: 'in_progress',
    totalBankTransactions: 4,
    totalEntryBookRecords: 3,
    reconciledTransactions: 2,
    unreconciledTransactions: 2,
    discrepancyAmount: 1500.00,
    createdAt: '2024-01-16',
    notes: 'Wire transfer and rent payment need investigation'
  }
];
*/

const [bankAccounts, setBankAccounts] = createSignal<BankAccount[]>([]);
const [bankStatements, setBankStatements] = createSignal<BankStatement[]>([]);
const [entryBookRecords, setEntryBookRecords] = createSignal<EntryBookRecord[]>([]);
const [reconciliationSessions, setReconciliationSessions] = createSignal<ReconciliationSession[]>([]);

export const bankConsolidationStore = {
  // Bank Accounts
  get bankAccounts() {
    return bankAccounts();
  },

  addBankAccount(account: Omit<BankAccount, 'id'>) {
    const newAccount: BankAccount = {
      ...account,
      id: Date.now().toString()
    };
    setBankAccounts([...bankAccounts(), newAccount]);
    return newAccount;
  },

  updateBankAccount(id: string, updates: Partial<BankAccount>) {
    setBankAccounts(bankAccounts().map(account => 
      account.id === id ? { ...account, ...updates } : account
    ));
  },

  getBankAccountById(id: string) {
    return bankAccounts().find(account => account.id === id);
  },

  // Sync bank accounts from accounts store
  syncBankAccountsFromAccounts() {
    const accountBankAccounts = accountsStore.getBankAccounts();

    const bankAccountsFromAccounts: BankAccount[] = accountBankAccounts.map(account => ({
      id: account.id,
      accountId: account.id,
      bankName: account.bankName || '',
      accountNumber: account.bankAccountNumber || '',
      accountType: account.bankAccountType || 'checking',
      currency: account.currency || 'USD',
      currentBalance: account.balance || 0,
      isActive: account.isActive
    }));

    setBankAccounts(bankAccountsFromAccounts);
    return bankAccountsFromAccounts;
  },

  // Get bank accounts derived from accounts store
  getBankAccountsFromAccounts() {
    const accountBankAccounts = accountsStore.getBankAccounts();

    return accountBankAccounts.map(account => ({
      id: account.id,
      accountId: account.id,
      bankName: account.bankName || '',
      accountNumber: account.bankAccountNumber || '',
      accountType: account.bankAccountType || 'checking',
      currency: account.currency || 'USD',
      currentBalance: account.balance || 0,
      isActive: account.isActive
    }));
  },

  // Bank Statements
  get bankStatements() {
    return bankStatements();
  },

  addBankStatement(statement: Omit<BankStatement, 'id'>) {
    const newStatement: BankStatement = {
      ...statement,
      id: Date.now().toString(),
      importedAt: new Date().toISOString()
    };

    setBankStatements([...bankStatements(), newStatement]);
    return newStatement;
  },

  addBankStatementsFromCSV(statements: Omit<BankStatement, 'id' | 'importedAt' | 'source'>[]) {

    const genIdStatement = (statement:any) => {
      return Base64Encode(`${statement.account}_${statement.date}_${statement.balance}_${statement.description}_${statement.reference}`);
    }

    const newStatements = statements.map(statement => ({
      ...statement,
      id: genIdStatement(statement),
      id2: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      importedAt: new Date().toISOString(),
      source: 'csv_import' as const,
      isReconciled: false
    }));
    setBankStatements([...bankStatements(), ...newStatements]);
    return newStatements;
  },

  // Add bank statements from CSV and persist to API
  async addBankStatementsFromCSVWithAPI(statements: Omit<BankStatement, 'id' | 'importedAt' | 'source'>[]): Promise<{ added: BankStatement[], duplicates: any[] }> {
    const genIdStatement = (statement: any) => {
      return Base64Encode(`${statement.accountId}_${statement.date}_${statement.balance}_${statement.description}_${statement.reference}`);
    };

    const newStatements = statements.map(statement => ({
      ...statement,
      id: genIdStatement(statement),
      importedAt: new Date().toISOString(),
      source: 'csv_import' as const,
      isReconciled: false
    }));

    try {
      // Use API to verify and add, handling duplicates
      const result = await bankConsolidationApi.addBankConsolidationVerify(newStatements);

      // Update local store with added statements
      if (result.added && result.added.length > 0) {
        setBankStatements(prev => [...prev, ...result.added]);
        this._invalidateMatchCache();
      }

      return {
        added: result.added || [],
        duplicates: result.duplicates || []
      };
    } catch (error) {
      console.error('Error saving bank statements to API:', error);
      // Fallback to local-only storage if API fails
      setBankStatements(prev => [...prev, ...newStatements]);
      this._invalidateMatchCache();
      return {
        added: newStatements as BankStatement[],
        duplicates: []
      };
    }
  },

  // Fetch bank statements from API
  async fetchBankStatementsFromAPI(accountId: string, startDate?: string, endDate?: string): Promise<BankStatement[]> {
    try {
      let statements: any[];

      if (startDate && endDate) {
        statements = await bankConsolidationApi.getBankConsolidationsByDateRange(accountId, startDate, endDate);
      } else {
        statements = await bankConsolidationApi.getBankConsolidations(accountId);
      }

      // Convert API response to BankStatement format
      const bankStatementsFromAPI: BankStatement[] = (statements || []).map((s: any) => ({
        id: s.id,
        accountId: s.accountId,
        date: s.date,
        description: s.description || '',
        reference: s.reference || '',
        debitAmount: s.debitAmount || 0,
        creditAmount: s.creditAmount || 0,
        balance: s.balance || 0,
        category: s.category,
        isReconciled: s.isReconciled || false,
        reconciledWith: s.reconciledWith,
        importedAt: s.importedAt || s.createdAt,
        source: s.source || 'api'
      }));

      // Merge with existing statements (replace those from same account/period)
      const existingStatements = bankStatements();
      const existingIds = new Set(bankStatementsFromAPI.map(s => s.id));

      const mergedStatements = [
        ...existingStatements.filter(s =>
          s.accountId !== accountId || !existingIds.has(s.id)
        ),
        ...bankStatementsFromAPI
      ];

      setBankStatements(mergedStatements);
      this._invalidateMatchCache();

      return bankStatementsFromAPI;
    } catch (error) {
      console.error('Error fetching bank statements from API:', error);
      // Return existing local statements for the account
      return this.getBankStatementsByAccount(accountId);
    }
  },

  // Fetch all bank statements from API
  async fetchAllBankStatementsFromAPI(): Promise<BankStatement[]> {
    try {
      const statements = await bankConsolidationApi.getAllBankConsolidations();

      const bankStatementsFromAPI: BankStatement[] = (statements || []).map((s: any) => ({
        id: s.id,
        accountId: s.accountId,
        date: s.date,
        description: s.description || '',
        reference: s.reference || '',
        debitAmount: s.debitAmount || 0,
        creditAmount: s.creditAmount || 0,
        balance: s.balance || 0,
        category: s.category,
        isReconciled: s.isReconciled || false,
        reconciledWith: s.reconciledWith,
        importedAt: s.importedAt || s.createdAt,
        source: s.source || 'api'
      }));

      setBankStatements(bankStatementsFromAPI);
      this._invalidateMatchCache();

      return bankStatementsFromAPI;
    } catch (error) {
      console.error('Error fetching all bank statements from API:', error);
      return bankStatements();
    }
  },

  updateBankStatement(id: string, updates: Partial<BankStatement>) {
    setBankStatements(bankStatements().map(statement => 
      statement.id === id ? { ...statement, ...updates } : statement
    ));
  },

  getBankStatementsByAccount(accountId: string) {
    return bankStatements().filter(statement => statement.accountId === accountId);
  },

  getUnreconciledBankStatements(accountId?: string) {
    const statements = accountId 
      ? this.getBankStatementsByAccount(accountId)
      : bankStatements();
    return statements.filter(statement => !statement.isReconciled);
  },

  // Entry Book Records
  get entryBookRecords() {
    return entryBookRecords();
  },

  addEntryBookRecord(record: Omit<EntryBookRecord, 'id'>) {
    const newRecord: EntryBookRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setEntryBookRecords([...entryBookRecords(), newRecord]);
    return newRecord;
  },

  updateEntryBookRecord(id: string, updates: Partial<EntryBookRecord>) {
    setEntryBookRecords(entryBookRecords().map(record => 
      record.id === id ? { ...record, ...updates } : record
    ));
  },

  getEntryBookRecordsByAccount(accountId: string) {
    return entryBookRecords().filter(record => record.accountId === accountId);
  },

  getUnreconciledEntryBookRecords(accountId?: string) {
    const records = accountId 
      ? this.getEntryBookRecordsByAccount(accountId)
      : entryBookRecords();
    return records.filter(record => !record.isReconciled);
  },

  // Fetch entry book records from API
  async fetchEntryBookRecordsFromAPI(accountId: string, startDate: string, endDate: string) {
    try {
      const businessId = authStore.getBusinessId();
      if (!businessId) {
        console.warn('No business ID available for fetching entry book records');
        return [];
      }


      const entriesData : any = await journalApi.getAll(`${businessId} ${accountId}`);
     
      const entries = entriesData?.data || [];
      
      // Convert journal entries to EntryBookRecord format
      const entryBookRecords2: EntryBookRecord[] = [];
      
      entries.forEach((entry: any) => {
        // Process each line in the journal entry
        entry.lines?.forEach((line: any) => {
          // Only include lines for the specific account
          if (line.accountId === accountId) {
            let lineid = line.lineId ||  line.creditAmount || line.debitAmount;
            entryBookRecords2.push({
              id: `${entry.id}_${lineid}`,
              lineId: line.lineId,
              accountId: line.accountId,
              date: entry.date,
              description: line.description || entry.description,
              reference: entry.reference || entry.entryNumber,
              debitAmount: line.debitAmount || 0,
              creditAmount: line.creditAmount || 0,
              category: line.accountName || 'General',
              isReconciled: false, // Default to false, will be updated based on reconciliation status
              createdAt: entry.createdAt
            });
          }
        });
      });

      // Update the store with fetched records (merge with existing)
      const existingRecords = entryBookRecords();
      const mergedRecords = [
        ...existingRecords.filter(r => r.accountId !== accountId || 
          new Date(r.createdAt) < new Date(startDate) || 
          new Date(r.createdAt) > new Date(endDate)),
        ...entryBookRecords2
      ];
      
      setEntryBookRecords(mergedRecords);

      //console.log(`Fetched ${mergedRecords.length} entry book records from API for account ${accountId}`);
      return mergedRecords;
      
    } catch (error) {
      console.error('Error fetching entry book records from API:', error);
      // Fallback to existing records if API fails
      return this.getEntryBookRecordsByAccount(accountId).filter(r => 
        r.date >= startDate && r.date <= endDate
      );
    }
  },

  // Match cache to avoid recalculating matches on every render
  _matchCache: new Map<string, Array<{ record: EntryBookRecord; score: number; reasons: string[] }>>(),
  _matchCacheVersion: 0,

  // Clear match cache when data changes
  _invalidateMatchCache() {
    this._matchCache.clear();
    this._matchCacheVersion++;
  },

  // Reconciliation - OPTIMIZED: batch updates to minimize re-renders
  reconcileTransaction(bankStatementId: string, entryBookRecordId: string) {
    // Batch both updates into single signal updates to minimize re-renders
    // Update bank statements in one operation
    setBankStatements(prev => prev.map(statement =>
      statement.id === bankStatementId
        ? { ...statement, isReconciled: true, reconciledWith: entryBookRecordId }
        : statement
    ));

    // Update entry book records in one operation
    setEntryBookRecords(prev => prev.map(record =>
      record.id === entryBookRecordId
        ? { ...record, isReconciled: true, reconciledWith: bankStatementId }
        : record
    ));

    // Invalidate cache for affected items only
    this._matchCache.delete(bankStatementId);

    // Persist to API (fire and forget for performance)
    bankConsolidationApi.updateReconciliationStatus(bankStatementId, true, entryBookRecordId)
      .catch(err => console.error('Failed to persist reconciliation to API:', err));
  },

  // Async version of reconcileTransaction that waits for API response
  async reconcileTransactionWithAPI(bankStatementId: string, entryBookRecordId: string): Promise<boolean> {
    // Optimistic local update
    setBankStatements(prev => prev.map(statement =>
      statement.id === bankStatementId
        ? { ...statement, isReconciled: true, reconciledWith: entryBookRecordId }
        : statement
    ));

    setEntryBookRecords(prev => prev.map(record =>
      record.id === entryBookRecordId
        ? { ...record, isReconciled: true, reconciledWith: bankStatementId }
        : record
    ));

    this._matchCache.delete(bankStatementId);

    try {
      await bankConsolidationApi.updateReconciliationStatus(bankStatementId, true, entryBookRecordId);
      return true;
    } catch (error) {
      console.error('Failed to persist reconciliation to API, rolling back:', error);
      // Rollback on failure
      setBankStatements(prev => prev.map(statement =>
        statement.id === bankStatementId
          ? { ...statement, isReconciled: false, reconciledWith: undefined }
          : statement
      ));
      setEntryBookRecords(prev => prev.map(record =>
        record.id === entryBookRecordId
          ? { ...record, isReconciled: false, reconciledWith: undefined }
          : record
      ));
      return false;
    }
  },

  unreconciledTransaction(bankStatementId: string) {
    const statement = bankStatements().find(s => s.id === bankStatementId);
    const entryBookRecordId = statement?.reconciledWith;

    // Batch update bank statements
    setBankStatements(prev => prev.map(s =>
      s.id === bankStatementId
        ? { ...s, isReconciled: false, reconciledWith: undefined }
        : s
    ));

    // Batch update entry book records if there was a linked record
    if (entryBookRecordId) {
      setEntryBookRecords(prev => prev.map(r =>
        r.id === entryBookRecordId
          ? { ...r, isReconciled: false, reconciledWith: undefined }
          : r
      ));
    }

    // Invalidate cache
    this._matchCache.delete(bankStatementId);

    // Persist to API (fire and forget)
    bankConsolidationApi.updateReconciliationStatus(bankStatementId, false)
      .catch(err => console.error('Failed to persist unreconciliation to API:', err));
  },

  // Async version of unreconciledTransaction that waits for API response
  async unreconciledTransactionWithAPI(bankStatementId: string): Promise<boolean> {
    const statement = bankStatements().find(s => s.id === bankStatementId);
    const entryBookRecordId = statement?.reconciledWith;

    // Optimistic local update
    setBankStatements(prev => prev.map(s =>
      s.id === bankStatementId
        ? { ...s, isReconciled: false, reconciledWith: undefined }
        : s
    ));

    if (entryBookRecordId) {
      setEntryBookRecords(prev => prev.map(r =>
        r.id === entryBookRecordId
          ? { ...r, isReconciled: false, reconciledWith: undefined }
          : r
      ));
    }

    this._matchCache.delete(bankStatementId);

    try {
      await bankConsolidationApi.updateReconciliationStatus(bankStatementId, false);
      return true;
    } catch (error) {
      console.error('Failed to persist unreconciliation to API, rolling back:', error);
      // Rollback on failure
      setBankStatements(prev => prev.map(s =>
        s.id === bankStatementId
          ? { ...s, isReconciled: true, reconciledWith: entryBookRecordId }
          : s
      ));
      if (entryBookRecordId) {
        setEntryBookRecords(prev => prev.map(r =>
          r.id === entryBookRecordId
            ? { ...r, isReconciled: true, reconciledWith: bankStatementId }
            : r
        ));
      }
      return false;
    }
  },

  // ============================================================================
  // IMPROVED AUTO-MATCHING ALGORITHM
  // ============================================================================

  /**
   * Calculates the Levenshtein distance between two strings
   * Used for fuzzy matching descriptions
   */
  _levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  },

  /**
   * Common noise words to ignore when comparing descriptions
   */
  _noiseWords: new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'from', 'of', 'in', 'on', 'at',
    'payment', 'transfer', 'deposit', 'withdrawal', 'transaction', 'pago', 'transferencia',
    'deposito', 'retiro', 'transaccion', 'ref', 'reference', 'referencia', 'number', 'numero'
  ]),

  /**
   * Calculate similarity between two descriptions
   * Returns a score between 0 and 1
   */
  _calculateDescriptionSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const normalize = (s: string) => s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !this._noiseWords.has(word));

    const words1 = normalize(str1);
    const words2 = normalize(str2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Exact match after normalization
    const s1 = words1.join(' ');
    const s2 = words2.join(' ');
    if (s1 === s2) return 1.0;

    // Word overlap score
    const commonWords = words1.filter(w => words2.includes(w)).length;
    const wordOverlap = commonWords / Math.max(words1.length, words2.length);

    // Levenshtein-based similarity for the full strings
    const maxLen = Math.max(s1.length, s2.length);
    const levenshteinSimilarity = maxLen > 0
      ? 1 - (this._levenshteinDistance(s1, s2) / maxLen)
      : 0;

    // Combine both methods, weighted towards word overlap
    return wordOverlap * 0.6 + levenshteinSimilarity * 0.4;
  },

  /**
   * Extract significant words from a string (removes noise words and short words)
   */
  _extractSignificantWords(text: string): Set<string> {
    if (!text) return new Set();

    const words = text.toLowerCase()
      .replace(/[^a-z0-9áéíóúñü\s]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3 && !this._noiseWords.has(word));

    return new Set(words);
  },

  /**
   * Calculate cross-field word matching score
   * Compares words from statement.reference with record.description and vice versa
   */
  _calculateCrossFieldMatch(
    statementDesc: string,
    statementRef: string,
    recordDesc: string,
    recordRef: string
  ): { score: number; matches: string[] } {
    const statementDescWords = this._extractSignificantWords(statementDesc);
    const statementRefWords = this._extractSignificantWords(statementRef);
    const recordDescWords = this._extractSignificantWords(recordDesc);
    const recordRefWords = this._extractSignificantWords(recordRef);

    const matches: string[] = [];
    let matchCount = 0;

    // Cross-match: statement reference words in record description
    for (const word of statementRefWords) {
      if (recordDescWords.has(word)) {
        matches.push(`ref→desc: "${word}"`);
        matchCount++;
      }
    }

    // Cross-match: record reference words in statement description
    for (const word of recordRefWords) {
      if (statementDescWords.has(word)) {
        matches.push(`desc←ref: "${word}"`);
        matchCount++;
      }
    }

    // Cross-match: statement description words in record reference
    for (const word of statementDescWords) {
      if (recordRefWords.has(word) && !matches.some(m => m.includes(`"${word}"`))) {
        matches.push(`desc→ref: "${word}"`);
        matchCount++;
      }
    }

    // Cross-match: record description words in statement reference
    for (const word of recordDescWords) {
      if (statementRefWords.has(word) && !matches.some(m => m.includes(`"${word}"`))) {
        matches.push(`ref←desc: "${word}"`);
        matchCount++;
      }
    }

    // Also check direct word overlap between descriptions (significant words only)
    for (const word of statementDescWords) {
      if (recordDescWords.has(word) && !matches.some(m => m.includes(`"${word}"`))) {
        matches.push(`desc↔desc: "${word}"`);
        matchCount++;
      }
    }

    // Calculate score based on match count (max 2 points for cross-field)
    let score = 0;
    if (matchCount >= 3) {
      score = 2;
    } else if (matchCount === 2) {
      score = 1.5;
    } else if (matchCount === 1) {
      score = 1;
    }

    return { score, matches };
  },

  /**
   * Calculate match score between a bank statement and entry book record
   * Returns { score: number (0-10), reasons: string[] }
   */
  _calculateMatchScore(statement: BankStatement, record: EntryBookRecord): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Amount matching (max 4 points)
    const statementAmount = statement.balance || statement.debitAmount || statement.creditAmount;
    const recordAmount = record.debitAmount || record.creditAmount;

    const amountDiff = Math.abs(Math.abs(statementAmount) - Math.abs(recordAmount));

    if (amountDiff < 0.01) {
      score += 3;
      reasons.push('Exact amount match');
    } else if (amountDiff / Math.max(statementAmount, recordAmount, 1) < 0.01) {
      score += 2;
      reasons.push('Near amount match');
    }

    // Check same direction (both debit or both credit)
    const statementIsDebit = statement.debitAmount > 0;
    const recordIsDebit = record.debitAmount > 0;
    if (statementIsDebit === recordIsDebit) {
      score += 1;
      reasons.push('Same direction');
    }

    // 2. Date matching (max 2 points)
    // First check if date strings are exactly equal (most reliable)
    const statementDateStr = statement.date?.split('T')[0] || '';
    const recordDateStr = typeof record.date === "number" ? record.date :  record.date?.split('T')[0] || '';

    if (statementDateStr && recordDateStr && statementDateStr === recordDateStr) {
      score += 2;
      reasons.push('Exact date');
    } else {
      // Calculate days difference for near matches
      const statementDate = new Date(statement.date);
      const recordDate = new Date(record.date);

      // Reset time components to compare dates only
      statementDate.setHours(0, 0, 0, 0);
      recordDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.round(Math.abs((statementDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24)));

      if (daysDiff === 0) {
        // Dates are same day (after normalizing time)
        score += 2;
        reasons.push('Exact date');
      } else if (daysDiff <= 3) {
        score += 1.5;
        reasons.push('Date within 3 days');
      } else if (daysDiff <= 7) {
        score += 1;
        reasons.push('Date within 7 days');
      }
    }

    // 3. Reference matching (max 2 points)
    let referenceMatched = false;
    if (statement.reference && record.reference) {
      const ref1 = statement.reference.toLowerCase().replace(/[^a-z0-9]/g, '');
      const ref2 = record.reference.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (ref1 === ref2) {
        score += 2;
        reasons.push('Exact reference');
        referenceMatched = true;
      } else if (ref1.includes(ref2) || ref2.includes(ref1)) {
        score += 1.5;
        reasons.push('Partial reference');
        referenceMatched = true;
      }
    }

    // 4. Cross-field word matching (max 2 points)
    // Compare words across description and reference fields
    const crossMatch = this._calculateCrossFieldMatch(
      statement.description || '',
      statement.reference || '',
      record.description || '',
      record.reference || ''
    );

    if (crossMatch.score > 0) {
      score += crossMatch.score;
      if (crossMatch.matches.length > 0) {
        reasons.push(`Cross-field match: ${crossMatch.matches.slice(0, 3).join(', ')}${crossMatch.matches.length > 3 ? '...' : ''}`);
      }
    }

    // 5. Description similarity (max 2 points) - only if cross-field didn't find much
    if (crossMatch.score < 1.5) {
      const descSimilarity = this._calculateDescriptionSimilarity(statement.description, record.description);
      if (descSimilarity >= 0.8) {
        score += 2;
        reasons.push('High description similarity');
      } else if (descSimilarity >= 0.5) {
        score += 1;
        reasons.push('Partial description match');
      }
    }

    return { score, reasons };
  },

  /**
   * Find potential matches for a bank statement
   * Uses improved scoring algorithm with minimum confidence threshold
   * OPTIMIZED: Uses cache to avoid recalculating on every render
   */
  findPotentialMatches(bankStatementId: string): EntryBookRecord[] {
    // Use cached results if available
    const cached = this._matchCache.get(bankStatementId);
    if (cached) {
      return cached.filter(m => m.score >= 6).map(m => m.record);
    }

    const statement = bankStatements().find(s => s.id === bankStatementId);
    if (!statement) return [];

    const unreconciledRecords = this.getUnreconciledEntryBookRecords(statement.accountId);

    // Minimum confidence threshold: 60% (6 out of 10 points)
    const MIN_CONFIDENCE = 6;

    const scoredMatches = unreconciledRecords
      .map(record => ({
        record,
        ...this._calculateMatchScore(statement, record)
      }))
      .filter(match => match.score >= 4) // Cache all matches >= 40%
      .sort((a, b) => b.score - a.score);

    // Cache the results
    this._matchCache.set(bankStatementId, scoredMatches);

    return scoredMatches.filter(m => m.score >= MIN_CONFIDENCE).map(m => m.record);
  },

  /**
   * Get detailed match information for a bank statement
   * Useful for showing why a match was suggested
   * OPTIMIZED: Uses cache to avoid recalculating
   */
  getMatchDetails(bankStatementId: string): Array<{ record: EntryBookRecord; score: number; reasons: string[] }> {
    // Use cached results if available
    const cached = this._matchCache.get(bankStatementId);
    if (cached) {
      return cached;
    }

    const statement = bankStatements().find(s => s.id === bankStatementId);
    if (!statement) return [];

    const unreconciledRecords = this.getUnreconciledEntryBookRecords(statement.accountId);

    const scoredMatches = unreconciledRecords
      .map(record => ({
        record,
        ...this._calculateMatchScore(statement, record)
      }))
      .filter(match => match.score >= 4) // Show matches with at least 40% confidence
      .sort((a, b) => b.score - a.score);

    // Cache the results
    this._matchCache.set(bankStatementId, scoredMatches);

    return scoredMatches;
  },

  // Reconciliation Sessions
  get reconciliationSessions() {
    return reconciliationSessions();
  },

  startReconciliationSession(bankAccountId: string, periodStart: string, periodEnd: string) {
    const bankStatements = this.getBankStatementsByAccount(bankAccountId)
      .filter(s => s.date >= periodStart && s.date <= periodEnd);
    const entryRecords = this.getEntryBookRecordsByAccount(bankAccountId)
      .filter(r => r.date >= periodStart && r.date <= periodEnd);

    const reconciledCount = bankStatements.filter(s => s.isReconciled).length;
    const startingBalance = this.getBankAccountById(bankAccountId)?.lastReconciledBalance || 0;
    const endingBalance = this.getBankAccountById(bankAccountId)?.currentBalance || 0;

    const session: ReconciliationSession = {
      id: Date.now().toString(),
      bankAccountId,
      periodStart,
      periodEnd,
      startingBalance,
      endingBalance,
      status: 'in_progress',
      totalBankTransactions: bankStatements.length,
      totalEntryBookRecords: entryRecords.length,
      reconciledTransactions: reconciledCount,
      unreconciledTransactions: bankStatements.length - reconciledCount,
      discrepancyAmount: 0, // Calculate based on unreconciled items
      createdAt: new Date().toISOString()
    };

    setReconciliationSessions([...reconciliationSessions(), session]);
    return session;
  },

  updateReconciliationSession(id: string, updates: Partial<ReconciliationSession>) {
    setReconciliationSessions(reconciliationSessions().map(session => 
      session.id === id ? { ...session, ...updates } : session
    ));
  },

  getReconciliationSessionsByAccount(bankAccountId: string) {
    return reconciliationSessions().filter(session => session.bankAccountId === bankAccountId);
  }
};