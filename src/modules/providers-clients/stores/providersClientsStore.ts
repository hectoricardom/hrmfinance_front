import { createSignal } from 'solid-js';
import { fetchGraphQLSS, formatFloat, generateShortCode } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import {
  ProviderClient,
  Transaction,
  EntityType,
  TransactionType,
  TransactionSummary,
  PaymentFormData,
  CollectionFormData
} from '../types';
import { accountsApi } from '../../../services/apiAdapter';

// Signals for state
const [entities, setEntities] = createSignal<ProviderClient[]>([]);
const [transactions, setTransactions] = createSignal<Transaction[]>([]);
const [pendingCollections, setPendingCollections] = createSignal<Transaction[]>([]);
const [pendingPayments, setPendingPayments] = createSignal<Transaction[]>([]);
const [isLoading, setIsLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [selectedEntity, setSelectedEntity] = createSignal<ProviderClient | null>(null);
const [agingReport, setAgingReport] = createSignal<any>(null);
const [balances, setBalances] = createSignal<any>(null);

// API Functions
const api = {
  // CRUD Operations
  async getCustomerProviders(search?: string, filters?: any): Promise<ProviderClient[]> {
    const response = await fetchGraphQLSS({
      query: "getCustomerProviders",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      
      params: {":search0": search,  ':search1': authStore.getBusinessId()}
    });
    
    return Array.isArray(response) ? response : (response?.data || []);
  },

  async getCustomerProviderById(id: string): Promise<ProviderClient | null> {
    const response = await fetchGraphQLSS({
      query: "getCustomerProviderById",
      params: { id, businessId: authStore.getBusinessId() }
    });
    return response?.data || response || null;
  },

  async addCustomerProvider(data: Partial<ProviderClient>): Promise<ProviderClient> {
    const response = await fetchGraphQLSS({
      query: "addCustomerProvider",
      params:{
        businessId: authStore.getBusinessId()
      },
      form: data 
    });
    return response?.data || response;
  },

  async updateCustomerProvider(id: string, data: Partial<ProviderClient>): Promise<ProviderClient> {
    const response = await fetchGraphQLSS({
      query: "updateCustomerProvider",
      params: { id,  businessId: authStore.getBusinessId() },
      form: data 
    });
    return response?.data || response;
  },

  async deleteCustomerProvider(id: string): Promise<boolean> {
    const response = await fetchGraphQLSS({
      query: "deleteCustomerProvider",
      params: { id }
    });
    return response?.success !== false;
  },

  async searchCustomerProviders(query: string): Promise<ProviderClient[]> {
    const response = await fetchGraphQLSS({
      query: "searchCustomerProviders",
      queryString: query
    });
    return Array.isArray(response) ? response : (response?.data || []);
  },

  // Transaction Operations
  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const response = await fetchGraphQLSS({
      query: "createTransaction",
      params: { ...data }
    });
    return response?.data || response;
  },

  async createTransactionWithEntryBook(data: Partial<Transaction>, entryBookData?: any): Promise<Transaction> {
    const response = await fetchGraphQLSS({
      query: "createTransactionWithEntryBook",
      params: { ...data, entryBook: entryBookData }
    });
    return response?.data || response;
  },

  async getTransactions(entityId?: string, filters?: any): Promise<Transaction[]> {
    const response = await fetchGraphQLSS({
      query: "getEntryBooks",
      params: { ":search0": entityId, ':search1': authStore.getBusinessId(), year: authStore.getSelectedYear() },
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND category = category AND isActive = isActive",
    
    });
    return Array.isArray(response) ? response : (response?.data || []);
  },

  async getPendingCollections(): Promise<Transaction[]> {
    const response = await fetchGraphQLSS({
      query: "getPendingCollections",
      params: {}
    });
    return Array.isArray(response) ? response : (response?.data || []);
  },

  async getPendingPayments(): Promise<Transaction[]> {
    const response = await fetchGraphQLSS({
      query: "getPendingPayments",
      params: {}
    });
    return Array.isArray(response) ? response : (response?.data || []);
  },

  // Payment Operations
  async applyPayment(transactionId: string, paymentData: any): Promise<any> {
    const response = await fetchGraphQLSS({
      query: "applyPayment",
      params: { transactionId, ...paymentData }
    });
    return response?.data || response;
  },

  async recordPaymentAndApply(entityId: string, paymentData: PaymentFormData | CollectionFormData): Promise<Transaction> {
    const response = await fetchGraphQLSS({
      query: "recordPaymentAndApply",
      params: { entityId, input: paymentData }
    });
    return response?.data || response;
  },

  // Reports
  async getAgingReport(entityType?: EntityType): Promise<any> {
    const response = await fetchGraphQLSS({
      query: "getAgingReport",
      params: { entityType }
    });
    return response?.data || response;
  },

  async getStatement(entityId: string, startDate?: string, endDate?: string): Promise<any> {
    const response = await fetchGraphQLSS({
      query: "getStatement",
      params: { entityId, startDate, endDate }
    });
    return response?.data || response;
  },

  async getCustomerProviderStats(entityId?: string): Promise<any> {
    const response = await fetchGraphQLSS({
      query: "getCustomerProviderStats",
      params: { entityId }
    });
    return response?.data || response;
  },

  // Linking
  async linkEntryBookToTransaction(transactionId: string, entryBookId: string): Promise<any> {
    const response = await fetchGraphQLSS({
      query: "linkEntryBookToTransaction",
      params: { transactionId, entryBookId }
    });
    return response?.data || response;
  }
};

// Store methods
export const providersClientsStore = {
  // Getters
  get entities() { return entities(); },
  get transactions() { return transactions(); },
  get pendingCollections() { return pendingCollections(); },
  get pendingPayments() { return pendingPayments(); },
  get isLoading() { return isLoading(); },
  get error() { return error(); },
  get selectedEntity() { return selectedEntity(); },
  get agingReport() { return agingReport(); },
 get balances() { return balances(); },

 

  // Get entities by type
  getProviders(): ProviderClient[] {
    return entities().filter(e => e.type === 'provider' || e.type === 'both');
  },

  getClients(): ProviderClient[] {
    return entities().filter(e => e.type === 'customer' || e.type === 'both');
  },

  getActiveEntities(): ProviderClient[] {
    return entities().filter(e => e.isActive);
  },

  getEntityById(id: string): ProviderClient | undefined {
    return entities().find(e => e.id === id);
  },

  // Get transactions for an entity

  
  getTransactionsByEntity(entityId: string): any[] {
   

    

    let docs: any = providersClientsStore?.balances?.refMap[entityId]?.documents || {};
  
    Object.keys(docs).map((li:any)=>{
        docs[li].document = li;
        docs[li].balance = formatFloat(docs[li].debitTotal)*100 - formatFloat(docs[li].creditTotal)*100;
    })


    return Object.values(docs).sort((a:any,b:any)=>(a?.balance?.toString() || '')?.localCompare?.(b?.balance?.toString() || ''))
  },

  getTransactionsByEntityAccount(entityId: string): any[] {
   
    let docs: any = {}
    let transactionsLines:any = []
    transactions().map((r)=> {
      r?.lines?.map((t:any) => {
        if(t.accountId === entityId){
          let linobj: any  = {...t, ...{
            id: r.id, date:r.date, reference: r.reference
          }}
          transactionsLines.push(linobj)
        }
      })
    })

    
    //console.log(transactionsLines.sort((a:any,b:any)=>(a?.document || '')?.localCompare?.(b?.document || '')));
    transactionsLines.map((li:any)=>{
     
        if(!docs[li.document]){
          docs[li.document] = {debitAmount: 0, creditAmount: 0, document: li.document, balance: 0, transactions: [], accountId: entityId}
        }
        let creditAmount = formatFloat(li.creditAmount)*100 + parseInt(docs[li.document].creditAmount);
        let debitAmount = formatFloat(li.debitAmount)*100 + parseInt(docs[li.document].debitAmount);
       
        docs[li.document].creditAmount = creditAmount;
        docs[li.document].debitAmount = debitAmount;
        docs[li.document].balance = debitAmount - creditAmount;
        docs[li.document].transactions.push(li); 
     
    })
    return Object.values(docs).sort((a:any,b:any)=>(a?.balance?.toString() || '')?.localCompare?.(b?.balance?.toString() || ''))
  },

  // Get transaction summary for an entity
  getEntitySummary(entityId: string): TransactionSummary | null {
    const entity = this.getEntityById(entityId);

    console.log("getEntitySummary",{entity})
    if (!entity) return null;

    const entityTransactions = this.getTransactionsByEntity(entityId);

    const summary: TransactionSummary = {
      entityId,
      entityName: entity.name,
      entityType: entity.type,
      totalPayments: 0,
      totalCollections: 0,
      totalInvoices: 0,
      totalCredits: 0,
      totalDebits: 0,
      balance: 0,
      transactionCount: entityTransactions.length
    };

    console.log(entityTransactions)
    entityTransactions.forEach(t => {
      if (t.status === 'cancelled') return;

      switch (t.type) {
        case 'payment':
          summary.totalPayments += t.amount;
          break;
        case 'collection':
          summary.totalCollections += t.amount;
          break;
        case 'invoice':
          summary.totalInvoices += t.amount;
          break;
        case 'credit':
          summary.totalCredits += t.amount;
          break;
        case 'debit':
          summary.totalDebits += t.amount;
          break;
      }
    });

    summary.balance = entity.balance;
    return summary;
  },

  // Load entities from API
  async loadEntities(search?: string): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getCustomerProviders(search);
      
      setEntities(data);
    } catch (err) {
      console.error('Error loading entities:', err);
      setError('Error al cargar proveedores y clientes');
    } finally {
      setIsLoading(false);
    }
  },

  // Search entities
  async searchEntities(query: string): Promise<ProviderClient[]> {
    try {
      const data = await api.searchCustomerProviders(query);
      return data;
    } catch (err) {
      console.error('Error searching entities:', err);
      return [];
    }
  },

  // Load transactions from API
  async loadTransactions(entityId?: string): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getTransactions(entityId);
      setTransactions(data.filter(r=>r.year===2025));
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Error al cargar transacciones');
    } finally {
      setIsLoading(false);
    }
  },

  // Load pending collections
  async loadPendingCollections(): Promise<void> {
    try {
      const data = await api.getPendingCollections();
      setPendingCollections(data);
    } catch (err) {
      console.error('Error loading pending collections:', err);
    }
  },

  // Load pending payments
  async loadPendingPayments(): Promise<void> {
    try {
      const data = await api.getPendingPayments();
      setPendingPayments(data);
    } catch (err) {
      console.error('Error loading pending payments:', err);
    }
  },

  // Load aging report
  async loadAgingReport(entityType?: EntityType): Promise<void> {
    try {
      const data = await api.getAgingReport(entityType);
      setAgingReport(data);
    } catch (err) {
      console.error('Error loading aging report:', err);
    }
  },

  // Get statement for entity
  async getStatement(entityId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      return await api.getStatement(entityId, startDate, endDate);
    } catch (err) {
      console.error('Error getting statement:', err);
      return null;
    }
  },

  // Get stats
  async getStats(entityId?: string): Promise<any> {
    try {
      return await api.getCustomerProviderStats(entityId);
    } catch (err) {
      console.error('Error getting stats:', err);
      return null;
    }
  },

  // Create new entity
  async createEntity(data: Omit<ProviderClient, 'id' | 'createdAt' | 'updatedAt' | 'balance'>): Promise<ProviderClient> {
    setIsLoading(true);

    try {
      const newEntity = await api.addCustomerProvider({
        ...data,
        balance: 0,
        businessId: authStore.getBusinessId()
      });

      setEntities([...entities(), newEntity]);
      return newEntity;
    } catch (err) {
      console.error('Error creating entity:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  },

  // Update entity
  async updateEntity(id: string, data: Partial<ProviderClient>): Promise<ProviderClient | null> {
    setIsLoading(true);

    try {
      const updatedEntity = await api.updateCustomerProvider(id, data);

      const index = entities().findIndex(e => e.id === id);
      if (index !== -1) {
        const newEntities = [...entities()];
        newEntities[index] = updatedEntity;
        setEntities(newEntities);
      }

      return updatedEntity;
    } catch (err) {
      console.error('Error updating entity:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  },

  // Delete entity
  async deleteEntity(id: string): Promise<boolean> {
    setIsLoading(true);

    try {
      const success = await api.deleteCustomerProvider(id);

      if (success) {
        setEntities(entities().filter(e => e.id !== id));
      }

      return success;
    } catch (err) {
      console.error('Error deleting entity:', err);
      setError('No se puede eliminar una entidad con transacciones');
      return false;
    } finally {
      setIsLoading(false);
    }
  },

  // Create payment (to provider)
  async createPayment(data: PaymentFormData): Promise<Transaction> {
    setIsLoading(true);

    try {
      const entity = this.getEntityById(data.entityId);
      if (!entity) throw new Error('Entity not found');

      const transaction = await api.recordPaymentAndApply(data.entityId, {
        ...data,
        type: 'payment',
        status: 'completed',
        createdBy: authStore.user?.uid,
        businessId: authStore.currentBusinessId
      });

      // Refresh entity data to get updated balance
      await this.loadEntities();
      setTransactions([...transactions(), transaction]);

      return transaction;
    } catch (err) {
      console.error('Error creating payment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  },

  // Create collection (from client)
  async createCollection(data: CollectionFormData): Promise<Transaction> {
    setIsLoading(true);

    try {
      const entity = this.getEntityById(data.entityId);
      if (!entity) throw new Error('Entity not found');

      const transaction = await api.recordPaymentAndApply(data.entityId, {
        ...data,
        type: 'collection',
        status: 'completed',
        createdBy: authStore.user?.uid,
        businessId: authStore.currentBusinessId
      });

      // Refresh entity data to get updated balance
      await this.loadEntities();
      setTransactions([...transactions(), transaction]);

      return transaction;
    } catch (err) {
      console.error('Error creating collection:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  },

  // Create invoice/debit
  async createInvoice(entityId: string, amount: number, description: string, reference?: string, dueDate?: string): Promise<Transaction> {
    setIsLoading(true);

    try {
      const entity = this.getEntityById(entityId);
      if (!entity) throw new Error('Entity not found');

      const transaction = await api.createTransaction({
        entityId,
        entityName: entity.name,
        type: 'invoice',
        amount,
        description,
        reference,
        date: new Date().toISOString().split('T')[0],
        dueDate,
        status: 'pending',
        createdBy: authStore.user?.uid,
        businessId: authStore.currentBusinessId
      });

      // Refresh entity data to get updated balance
      await this.loadEntities();
      setTransactions([...transactions(), transaction]);

      return transaction;
    } catch (err) {
      console.error('Error creating invoice:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  },

  // Create transaction with entry book (for accounting integration)
  async createTransactionWithEntryBook(transactionData: Partial<Transaction>, entryBookData?: any): Promise<Transaction> {
    setIsLoading(true);

    try {
      const transaction = await api.createTransactionWithEntryBook(transactionData, entryBookData);

      await this.loadEntities();
      setTransactions([...transactions(), transaction]);

      return transaction;
    } catch (err) {
      console.error('Error creating transaction with entry book:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  },

  // Apply payment to existing transaction
  async applyPayment(transactionId: string, paymentData: any): Promise<any> {
    setIsLoading(true);

    try {
      const result = await api.applyPayment(transactionId, paymentData);

      // Refresh data
      await this.loadEntities();
      await this.loadTransactions();

      return result;
    } catch (err) {
      console.error('Error applying payment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  },

  // Link entry book to transaction
  async linkEntryBook(transactionId: string, entryBookId: string): Promise<any> {
    try {
      return await api.linkEntryBookToTransaction(transactionId, entryBookId);
    } catch (err) {
      console.error('Error linking entry book:', err);
      throw err;
    }
  },

  // Cancel transaction
  async cancelTransaction(transactionId: string): Promise<boolean> {
    setIsLoading(true);

    try {
      const txnIndex = transactions().findIndex(t => t.id === transactionId);
      if (txnIndex === -1) return false;

      const txn = transactions()[txnIndex];

      // Update via API
      await api.createTransaction({
        ...txn,
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const updatedTxn = { ...txn, status: 'cancelled' as const, updatedAt: new Date().toISOString() };
      const newTransactions = [...transactions()];
      newTransactions[txnIndex] = updatedTxn;
      setTransactions(newTransactions);

      // Refresh entity balance
      await this.loadEntities();

      return true;
    } catch (err) {
      console.error('Error cancelling transaction:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  },

  async updateBalance(){  
    let bln:any  = await accountsApi.getBalancesByProviders();
    
    setBalances(bln);
    return true;
  },

  // Select entity for detail view
  selectEntity(entity: ProviderClient | null) {
    setSelectedEntity(entity);
  },

  // Clear error
  clearError() {
    setError(null);
  },

  // Initialize store
  async initialize(): Promise<void> {
    await Promise.all([
      this.loadEntities(),
      //this.loadTransactions(),
      //this.loadPendingCollections(),
      //this.loadPendingPayments()
    ]);
  },

  // Refresh all data
  async refresh(): Promise<void> {
    await this.initialize();
  }
};

export default providersClientsStore;
