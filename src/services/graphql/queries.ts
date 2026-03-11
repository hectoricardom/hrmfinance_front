// GraphQL Queries for different modules

// Common fragments
export const ACCOUNT_FRAGMENT = `
  fragment AccountFields on Account {
    id
    accountNumber
    name
    type
    category
    description
    balance
    isActive
    parentAccountId
    createdDate
    lastModified
  }
`;

export const JOURNAL_ENTRY_FRAGMENT = `
  fragment JournalEntryFields on JournalEntry {
    id
    entryNumber
    date
    description
    reference
    status
    createdBy
    createdAt
    postedAt
    totalDebit
    totalCredit
    lines {
      id
      accountId
      accountName
      description
      debitAmount
      creditAmount
      reconciled
      reconciledWith
    }
  }
`;

export const EMPLOYEE_FRAGMENT = `
  fragment EmployeeFields on Employee {
    id
    employeeId
    fullName
    position
    department
    email
    phone
    salary
    hireDate
    isActive
    createdAt
    updatedAt
  }
`;

export const INVENTORY_FRAGMENT = `
  fragment InventoryFields on InventoryItem {
    id
    productCode
    productName
    sku
    description
    category
    unitOfMeasure
    unitCost
    quantity
    minStockLevel
    maxStockLevel
    locationId
    locationName
    isActive
    createdAt
    updatedAt
  }
`;

// Account Queries
export const GET_ACCOUNTS = `
  query GetAccounts($filter: AccountFilter, $sort: AccountSort) {
    accounts(filter: $filter, sort: $sort) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const GET_ACCOUNT_BY_ID = `
  query GetAccountById($id: ID!) {
    account(id: $id) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const CREATE_ACCOUNT = `
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const UPDATE_ACCOUNT = `
  mutation UpdateAccount($id: ID!, $input: UpdateAccountInput!) {
    updateAccount(id: $id, input: $input) {
      ...AccountFields
    }
  }
  ${ACCOUNT_FRAGMENT}
`;

export const DELETE_ACCOUNT = `
  mutation DeleteAccount($id: ID!) {
    deleteAccount(id: $id) {
      success
      message
    }
  }
`;

// Journal Entry Queries
export const GET_JOURNAL_ENTRIES = `
  query GetJournalEntries($filter: JournalEntryFilter, $sort: JournalEntrySort) {
    journalEntries(filter: $filter, sort: $sort) {
      ...JournalEntryFields
    }
  }
  ${JOURNAL_ENTRY_FRAGMENT}
`;

export const GET_JOURNAL_ENTRY_BY_ID = `
  query GetJournalEntryById($id: ID!) {
    journalEntry(id: $id) {
      ...JournalEntryFields
    }
  }
  ${JOURNAL_ENTRY_FRAGMENT}
`;

export const CREATE_JOURNAL_ENTRY = `
  mutation CreateJournalEntry($input: CreateJournalEntryInput!) {
    createJournalEntry(input: $input) {
      ...JournalEntryFields
    }
  }
  ${JOURNAL_ENTRY_FRAGMENT}
`;

export const UPDATE_JOURNAL_ENTRY = `
  mutation UpdateJournalEntry($id: ID!, $input: UpdateJournalEntryInput!) {
    updateJournalEntry(id: $id, input: $input) {
      ...JournalEntryFields
    }
  }
  ${JOURNAL_ENTRY_FRAGMENT}
`;

export const DELETE_JOURNAL_ENTRY = `
  mutation DeleteJournalEntry($id: ID!) {
    deleteJournalEntry(id: $id) {
      success
      message
    }
  }
`;

export const POST_JOURNAL_ENTRY = `
  mutation PostJournalEntry($id: ID!) {
    postJournalEntry(id: $id) {
      ...JournalEntryFields
    }
  }
  ${JOURNAL_ENTRY_FRAGMENT}
`;

// Employee Queries
export const GET_EMPLOYEES = `
  query GetEmployees($filter: EmployeeFilter, $sort: EmployeeSort) {
    employees(filter: $filter, sort: $sort) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FRAGMENT}
`;

export const GET_EMPLOYEE_BY_ID = `
  query GetEmployeeById($id: ID!) {
    employee(id: $id) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FRAGMENT}
`;

export const CREATE_EMPLOYEE = `
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FRAGMENT}
`;

export const UPDATE_EMPLOYEE = `
  mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FRAGMENT}
`;

export const DELETE_EMPLOYEE = `
  mutation DeleteEmployee($id: ID!) {
    deleteEmployee(id: $id) {
      success
      message
    }
  }
`;

// Inventory Queries
export const GET_INVENTORY = `
  query GetInventory($filter: InventoryFilter, $sort: InventorySort) {
    inventory(filter: $filter, sort: $sort) {
      ...InventoryFields
    }
  }
  ${INVENTORY_FRAGMENT}
`;

export const GET_INVENTORY_BY_ID = `
  query GetInventoryById($id: ID!) {
    inventoryItem(id: $id) {
      ...InventoryFields
    }
  }
  ${INVENTORY_FRAGMENT}
`;

export const CREATE_INVENTORY_ITEM = `
  mutation CreateInventoryItem($input: CreateInventoryItemInput!) {
    createInventoryItem(input: $input) {
      ...InventoryFields
    }
  }
  ${INVENTORY_FRAGMENT}
`;

export const UPDATE_INVENTORY_ITEM = `
  mutation UpdateInventoryItem($id: ID!, $input: UpdateInventoryItemInput!) {
    updateInventoryItem(id: $id, input: $input) {
      ...InventoryFields
    }
  }
  ${INVENTORY_FRAGMENT}
`;

export const DELETE_INVENTORY_ITEM = `
  mutation DeleteInventoryItem($id: ID!) {
    deleteInventoryItem(id: $id) {
      success
      message
    }
  }
`;

// Banking Queries
export const GET_BANK_STATEMENTS = `
  query GetBankStatements($filter: BankStatementFilter, $sort: BankStatementSort) {
    bankStatements(filter: $filter, sort: $sort) {
      id
      accountId
      date
      description
      reference
      debitAmount
      creditAmount
      balance
      isReconciled
      reconciledWith
      createdAt
    }
  }
`;

export const RECONCILE_TRANSACTION = `
  mutation ReconcileTransaction($bankStatementId: ID!, $journalEntryLineId: ID!) {
    reconcileTransaction(bankStatementId: $bankStatementId, journalEntryLineId: $journalEntryLineId) {
      success
      message
    }
  }
`;

// Dashboard Queries
export const GET_DASHBOARD_DATA = `
  query GetDashboardData($dateRange: DateRange) {
    dashboard(dateRange: $dateRange) {
      totalRevenue
      totalExpenses
      netIncome
      totalAssets
      totalLiabilities
      totalEquity
      employeeCount
      pendingInvoices
      cashBalance
      recentActivity {
        id
        description
        date
        type
        amount
      }
    }
  }
`;