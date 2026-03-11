import { lazy, onMount, Show, type Component } from 'solid-js';
import { Route, HashRouter, useNavigate } from '@solidjs/router';

// Initialize app with proper API mode
import './services/initializeApp';

/*
// Initialize CORS debugger (development only)
import { initializeCorsDebugger } from './utils/corsDebugger';
import { debugSignatureStorage, getSignatureStorageSummary, validateSignatureRequest } from './utils/signatureValidation';
if (import.meta.env.DEV) {
  initializeCorsDebugger();
  
  // Add signature validation utilities to window for debugging
  (window as any).signatureDebug = {
    debugSignatureStorage,
    getSignatureStorageSummary,
    validateSignatureRequest
  };
  
  console.log('🖋️  Signature debug utilities available: window.signatureDebug');
  
  // Suppress Firestore CORS errors in console
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.toString?.().includes('google.firestore.v1.Firestore/Listen/channel')) {
      console.warn('⚠️ Firestore CORS error suppressed - using fallback permissions for development');
      return;
    }
    originalError.apply(console, args);
  };
}
 */
// Modal Context
import { ModalProvider } from './contexts/ModalContext';

// Authentication
import AuthGuard from './components/AuthGuard';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedLazyRoute from './components/ProtectedLazyRoute';

// UI Components
import { Navigation, NavigationFiber, NavigationFiberSimple } from './modules/ui';

// Main Dashboard (kept in pages as it's a general overview)

// Module imports
import {
  Accounts,
  AccountDetail,
  BalanceSheet,
  TrialBalance,
  IncomeStatement
} from './modules/accounts';

import { TrialBalanceAudit } from './modules/accounts/audit';

import {
  Inventory,
  Products,
  OrphanManagement,
  StockReconciliation
} from './modules/inventory';

import {
  Employees
} from './modules/employees';

import Timesheets from './modules/employees/pages/Timesheets';

import {
  BankConsolidations
} from './modules/banking';

const EntryBooks = lazy(() => import('./modules/journal/pages/EntryBooks'));

import { HBLTabbedPage, HBLScannerDemo, HBLMobileScannerPage, HBLOfflineScannerPage, HBLLabelDemo, HBLBulkFetch } from './modules/hbl';

import { ContainerScanner, ContainerManagement } from './modules/container-scanner';

import { InvoiceDashboardExample } from './modules/invoice';
import { POSPage } from './modules/pos';
import { ManualAutomationMenu } from './modules/accounts/automation';
import { CubanPassportPage, PDFSignaturePage, FingerprintPage } from './modules/passport';
//import PassportPhotoPage from './modules/passport/components/PassportPhotoPage';
//import { FaceDetectionComparison } from './modules/passport/utils/faceDetectionComparison';
//import FaceDetectionComparisonComponent from './modules/passport/components/FaceDetectionComparison';
//import PassportPhotoFinal from './modules/passport/components/PassportPhotoFinal';

import { PurchaseRequestsPage, PurchaseRegistrationPage } from './modules/purchase-requests';


import { setNavigation } from './stores/navStore';

import { NotaryCustomerManager, NotaryCustomerDetail, PDFFormFiller, MotionToDismissForm, G1650Form } from './modules/notary';
import {
  EventTypeManager,
  BookingPage,
  AppointmentDashboard,
  AvailabilitySettingsPage
} from './modules/appointments';
import { FirebaseDebugger } from './modules/appointments/components/FirebaseDebugger';
import { PublicBookingPage } from './modules/appointments/components/PublicBookingPage';
import { EventTypesDebug } from './modules/appointments/components/EventTypesDebug';
import { MobilePublicBookingPage } from './modules/appointments/components/MobilePublicBookingPage';
import { ClientPortal, PreparerDashboard } from './modules/tax-portal';
import { ProvidersClientsPage } from './modules/providers-clients';





const ContainerScannerDemo = lazy(() => import('./modules/container-scanner/pages/ContainerScannerDemo'));
const UserProfileAdmin = lazy(() => import('./modules/admin/UserProfileAdmin'));
const BusinessManagement = lazy(() => import('./modules/admin/BusinessManagement'));
const StoreManager = lazy(() => import('./components/StoreManager'));
const DataMigration = lazy(() => import('./components/DataMigration'));
const MagicLinkVerify = lazy(() => import('./pages/MagicLinkVerify'));

const HBLAgencyWeightFilter = lazy(() => import('./modules/hbl/list/HBLAgencyWeightFilter'));

const EventAutomationUI = lazy(() => import('./modules/events/components/EventAutomationUI'));
const PassportPhotoDebug = lazy(() => import('./modules/passport/components/PassportPhotoDebug'));
const DeliveryManifestPage = lazy(() => import('./modules/hbl/pages/DeliveryManifestPage'));
const HBLScanLocationDemo = lazy(() => import('./modules/hbl/pages/HBLScanLocationDemo'));
const HBLLocationSummary = lazy(() => import('./modules/hbl/pages/HBLLocationSummary'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PublicSignaturePageFirestore = lazy(() => import('./pages/PublicSignaturePageFirestore'));

const SignatureManagerPage = lazy(() => import('./pages/SignatureManagerPage'));

const TaxReturnCalculator = lazy(() => import('./modules/tax/components/TaxReturnCalculator'));

// Accounting Module (with AI features)
const AccountingDashboard = lazy(() => import('./modules/accounting/pages/AccountingDashboard'));
const AccountingAccountsPage = lazy(() => import('./modules/accounting/pages/AccountsPage'));
const AccountingTransactionsPage = lazy(() => import('./modules/accounting/pages/TransactionsPage'));
const AccountingDocumentsPage = lazy(() => import('./modules/accounting/pages/DocumentsPage'));
const AccountingReportsPage = lazy(() => import('./modules/accounting/pages/ReportsPage'));
const AccountingTaxCenterPage = lazy(() => import('./modules/accounting/pages/TaxCenterPage'));
const LearningEnginePage = lazy(() => import('./modules/accounting/pages/LearningEnginePage'));
const DrakeExportPage = lazy(() => import('./modules/drake-export/pages/DrakeExportPage'));
const TaxPortalPage = lazy(() => import('./modules/drake-export/pages/TaxPortalPage'));
const TaxClientListPage = lazy(() => import('./modules/drake-export/pages/TaxClientListPage'));
const TaxClientWorkspace = lazy(() => import('./modules/drake-export/pages/TaxClientWorkspace'));
const PublicTaxUploadPage = lazy(() => import('./modules/drake-export/pages/PublicTaxUploadPage'));
const PinAccessPage = lazy(() => import('./modules/drake-export/pages/PinAccessPage'));
const PublicClientPortal = lazy(() => import('./modules/drake-export/pages/PublicClientPortal'));
const PublicClientVerifyPage = lazy(() => import('./modules/drake-export/pages/PublicClientVerifyPage'));
const SignatureValidationPage = lazy(() => import('./modules/drake-export/pages/SignatureValidationPage'));
const MobileBookingPage = lazy(() => import('./modules/appointments/components/MobileBookingPage'));
const DebugBooking = lazy(() => import('./modules/appointments/components/DebugBooking'));
const SimplePassportCrop = lazy(() => import('./modules/passport/components/SimplePassportCrop'));
const Remittances = lazy(() => import('./modules/remittances'));
const TimesheetComparison = lazy(() => import('./modules/timesheet/components/TimesheetComparison'));

// Smart Queue, Scan Station, Communications, Office Workflow, Tax Payments (Phase 1-3, 6, 8)
const SmartQueuePage = lazy(() => import('./modules/smart-queue/components/SmartQueuePage'));
const ScanStationPage = lazy(() => import('./modules/scan-station/components/ScanStationPage'));
const MessagingSettingsPage = lazy(() => import('./modules/communications/components/MessagingSettingsPage'));
const KioskMode = lazy(() => import('./modules/office-workflow/components/KioskMode'));
const CheckInQueue = lazy(() => import('./modules/office-workflow/components/CheckInQueue'));
const AssistantDashboard = lazy(() => import('./modules/office-workflow/components/AssistantDashboard'));
const PublicPreVisitPage = lazy(() => import('./modules/office-workflow/pages/PublicPreVisitPage'));
const PaymentSettingsPage = lazy(() => import('./modules/tax-payments/components/PaymentSettingsPage'));
const StripeReturnHandler = lazy(() => import('./modules/tax-payments/components/StripeReturnHandler'));
const StripeCancelHandler = lazy(() => import('./modules/tax-payments/components/StripeCancelHandler'));
const PublicESignaturePage = lazy(() => import('./modules/drake-export/pages/PublicSignaturePage'));

const ConsigneePage = lazy(() => import('./pages/ConsigneePage'));
const ShipperPage = lazy(() => import('./pages/ShipperPage'));

const ShippingOffersPage = lazy(() => import('./pages/ShippingOffersPage'));
const YabaOffersPage = lazy(() => import('./pages/YabaOffersPage'));
const ProductOffersComparison = lazy(() => import('./modules/offers/components/ProductOffersComparison'));

// Inventory Receiving & Counting
const ReceivingScreen = lazy(() => import('./modules/inventory/components/ReceivingScreen'));
const CountingScreen = lazy(() => import('./modules/inventory/components/CountingScreen'));
const BulkProductImporter = lazy(() => import('./modules/inventory/components/BulkProductImporter'));

// Accounting Flow Visualization
const AccountingFlowPage = lazy(() => import('./modules/accounting-flow/pages/AccountingFlowPage'));

// Supervision Dashboard (AI Adapter Management)
const SupervisionDashboard = lazy(() => import('./modules/supervision/pages/SupervisionDashboard'));
const AdaptersListPage = lazy(() => import('./modules/supervision/pages/AdaptersListPage'));
const AdapterDetailPage = lazy(() => import('./modules/supervision/pages/AdapterDetailPage'));
const AccountMappingsPage = lazy(() => import('./modules/supervision/pages/AccountMappingsPage'));






const AppHeader = (props: any) => {
  return (
    <>
      <NavigationFiber />
      {props.children}
    </>
  )
}

// Wrapper for protected routes
const ProtectedLayout: Component<{ children: any, permission?: string, permissions?: string[], featureName: string }> = (props) => {


  onMount(() => {
    // setNavigation(navigate);
    console.log("ddd")
  })

  return (
    <ModalProvider>
      <AuthGuard>
        <AppHeader>

          <ProtectedRoute permission={props.permission} permissions={props.permissions} featureName={props.featureName}>
            {props.children}
          </ProtectedRoute>

        </AppHeader>
      </AuthGuard>
    </ModalProvider>
  );
};

// Wrapper for protected routes with lazy loading - only loads component AFTER permission check
const ProtectedLazyLayout: Component<{
  load: () => Promise<{ default: Component<any> }>,
  permission?: string,
  permissions?: string[],
  featureName: string,
  componentProps?: Record<string, any>
}> = (props) => {
  return (
    <ModalProvider>
      <AuthGuard>
        <AppHeader>
          <ProtectedLazyRoute
            load={props.load}
            permission={props.permission}
            permissions={props.permissions}
            featureName={props.featureName}
            componentProps={props.componentProps}
          />
        </AppHeader>
      </AuthGuard>
    </ModalProvider>
  );
};

// import { setupEventAutomation } from './modules/events';

const App: Component = () => {
  onMount(() => {
    /* 
    setupEventAutomation().then(() => {
      console.log('Event automation system ready');
    }).catch(err => {
      console.error('Failed to initialize event automation:', err);
    });
    */
  });

  return (
    <div>
      <main>
        <HashRouter>
          {/* Public routes (no authentication required) */}
          <Route path="/sign/:id/:token" component={PublicSignaturePageFirestore} />
          <Route path="/signature/:id/:token" component={PublicSignaturePageFirestore} />

          {/* Public Tax Document Upload (no auth required) */}
          <Route path="/tax-upload/:id/:accessToken" component={PublicTaxUploadPage} />
          <Route path="/tax-upload-pin" component={PinAccessPage} />
          <Route path="/client-portal/:id/:accessToken" component={PublicClientPortal} />
          <Route path="/tax-verify/:id/:accessToken" component={PublicClientVerifyPage} />

          {/* Public Signature Validation (no auth required) */}
          <Route path="/signature-validation/:id/:accessToken" component={SignatureValidationPage} />
          <Route path="/signature-validation/:id/:accessToken/:type" component={SignatureValidationPage} />

          {/* Magic Link verification route */}
          <Route path="/auth/magic-link-verify" component={MagicLinkVerify} />

          {/* Dashboard route */}
          <Route path="/" component={() => (
            <AuthGuard>
              <AppHeader>
                <Dashboard />
              </AppHeader>
            </AuthGuard>
          )} />

          {/* Protected routes */}
          <Route path="/accounts" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Accounts">
              <Accounts />
            </ProtectedLayout>
          )} />

          <Route path="/accounts/:id" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Account Details">
              <AccountDetail />
            </ProtectedLayout>
          )} />

          <Route path="/entry-books" component={() => (
            <ProtectedLayout permission="JournalAccess" featureName="Entry Books">
              <EntryBooks />
            </ProtectedLayout>
          )} />

          <Route path="/employees" component={() => (
            <ProtectedLayout permission="EmployeeAccess" featureName="Employee Management">
              <Employees />
            </ProtectedLayout>
          )} />

          <Route path="/timesheets" component={() => (
            <ProtectedLayout permission="EmployeeAccess" featureName="Employee Timesheets">
              <Timesheets />
            </ProtectedLayout>
          )} />

          <Route path="/timesheet-comparison" component={() => (
            <ProtectedLayout permission="EmployeeAccess" featureName="Timesheet Comparison">
              <TimesheetComparison />
            </ProtectedLayout>
          )} />

          <Route path="/bank-consolidations" component={() => (
            <ProtectedLayout permission="BankingAccess" featureName="Bank Consolidations">
              <BankConsolidations />
            </ProtectedLayout>
          )} />

          <Route path="/balance-sheet" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Balance Sheet">
              <BalanceSheet />
            </ProtectedLayout>
          )} />

          <Route path="/income-statement" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Income Statement">
              <IncomeStatement />
            </ProtectedLayout>
          )} />

          {/* Accounting Module Routes */}
          <Route path="/accounting" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Accounting Dashboard">
              <AccountingDashboard />
            </ProtectedLayout>
          )} />

          <Route path="/accounting/accounts" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Accounting Accounts">
              <AccountingAccountsPage />
            </ProtectedLayout>
          )} />

          <Route path="/accounting/transactions" component={() => (
            <ProtectedLayout permission="JournalAccess" featureName="Accounting Transactions">
              <AccountingTransactionsPage />
            </ProtectedLayout>
          )} />

          <Route path="/accounting/documents" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Source Documents">
              <AccountingDocumentsPage />
            </ProtectedLayout>
          )} />

          <Route path="/accounting/reports" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Accounting Reports">
              <AccountingReportsPage />
            </ProtectedLayout>
          )} />

          <Route path="/accounting/tax" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Tax Center">
              <AccountingTaxCenterPage />
            </ProtectedLayout>
          )} />

          <Route path="/accounting/drake-export" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Drake Export">
              <DrakeExportPage />
            </ProtectedLayout>
          )} />

          <Route path="/accounting/tax-portal" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Tax Portal">
              <TaxPortalPage />
            </ProtectedLayout>
          )} />

         

          <Route path="/accounting/learning-engine" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="AI Learning Engine">
              <LearningEnginePage />
            </ProtectedLayout>
          )} />

           <Route path="/tax-clients" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Tax Clients">
              <TaxClientListPage />
            </ProtectedLayout>
          )} />


          <Route path="/tax-client/:id" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Client Workspace">
              <TaxClientWorkspace />
            </ProtectedLayout>
          )} />

          <Route path="/trial-balance" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Trial Balance">
              <TrialBalance />
            </ProtectedLayout>
          )} />

          <Route path="/trial-balance-audit" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Trial Balance Audit">
              <TrialBalanceAudit />
            </ProtectedLayout>
          )} />

          <Route path="/invoices" component={() => (
            <ProtectedLayout permission="invoiceAccess" featureName="Invoices">
              <InvoiceDashboardExample />
            </ProtectedLayout>
          )} />

          <Route path="/pos" component={() => (
            <ProtectedLayout permission="invoiceAccess" featureName="Point of Sale">
              <POSPage />
            </ProtectedLayout>
          )} />

          {/* Tax Return Calculator */}
          <Route path="/tax-calculator" component={() => (
            <ProtectedLayout permission="invoiceAccess" featureName="Tax Return Calculator">
              <TaxReturnCalculator />
            </ProtectedLayout>
          )} />

          {/* Tax Document Portal - Preparer Dashboard */}
          <Route path="/tax-portal" component={() => (
            <ProtectedLayout permission="invoiceAccess" featureName="Tax Document Portal">
              <PreparerDashboard />
            </ProtectedLayout>
          )} />

         

          {/* Shipping Offers */}
          <Route path="/shipping-offers" component={() => (
            <ProtectedLayout permission="invoiceAccess" featureName="Shipping Offers">
              <ShippingOffersPage />
            </ProtectedLayout>
          )} />

          {/* YABA Offers Manager */}
          <Route path="/yaba-offers" component={() => (
            <ProtectedLayout permission="offersManagementAccess" featureName="YABA Offers Manager">
              <YabaOffersPage />
            </ProtectedLayout>
          )} />

          <Route path="/inventory" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Inventory Management">
              <Inventory />
            </ProtectedLayout>
          )} />

          <Route path="/products" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Product Management">
              <Products />
            </ProtectedLayout>
          )} />

          <Route path="/inventory/orphans" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Orphan Management">
              <OrphanManagement />
            </ProtectedLayout>
          )} />

          <Route path="/inventory/reconciliation" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Stock Reconciliation">
              <StockReconciliation />
            </ProtectedLayout>
          )} />

          <Route path="/inventory/products" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Product Management">
              <Products />
            </ProtectedLayout>
          )} />

          <Route path="/inventory/stock-reconciliation" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Stock Reconciliation">
              <StockReconciliation />
            </ProtectedLayout>
          )} />

          <Route path="/inventory/receiving" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Inventory Receiving">
              <ReceivingScreen />
            </ProtectedLayout>
          )} />

          <Route path="/inventory/counting" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Inventory Counting">
              <CountingScreen />
            </ProtectedLayout>
          )} />

          <Route path="/inventory/import" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Bulk Product Import">
              <BulkProductImporter />
            </ProtectedLayout>
          )} />

          <Route path="/hbl" component={() => (
            <ProtectedLayout permission="HBLAccess" featureName="HBL">
              <HBLAgencyWeightFilter />
            </ProtectedLayout>
          )} />


          <Route path="/hbl-manage" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="HBL Management">
              <HBLTabbedPage />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-scanner" component={() => (
            <ProtectedLayout permissions={["HBLAccessManagement", "HBLScannerAccess"]} featureName="HBL Scanner Demo">
              <HBLScannerDemo />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-mobile-scanner" component={() => (
            <ProtectedLayout permissions={["HBLAccessManagement", "HBLScannerAccess"]} featureName="HBL Mobile Scanner">
              <HBLMobileScannerPage />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-offline-scanner" component={() => (
            <ProtectedLayout permissions={["HBLAccessManagement", "HBLScannerAccess"]} featureName="HBL Offline Scanner">
              <HBLOfflineScannerPage />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-labels" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="HBL Label Generator">
              <HBLLabelDemo />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-manifest" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="Delivery Manifest">
              <DeliveryManifestPage />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-scan-location" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="HBL Scan Location Demo">
              <HBLScanLocationDemo />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-location-summary" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="HBL Location Summary">
              <HBLLocationSummary />
            </ProtectedLayout>
          )} />

          <Route path="/hbl-bulk-fetch" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="HBL Bulk Fetch">
              <HBLBulkFetch />
            </ProtectedLayout>
          )} />

          <Route path="/container-scanner" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="Container Scanner">
              <ContainerScanner />
            </ProtectedLayout>
          )} />

          <Route path="/container-scanner/demo" component={() => (
            <ProtectedLayout permission="HBLScannerAccess" featureName="Container Scanner Demo">
              <ContainerScannerDemo />
            </ProtectedLayout>
          )} />

          <Route path="/container-management" component={() => (
            <ProtectedLayout permission="HBLAccessManagement" featureName="Container Management">
              <ContainerManagement />
            </ProtectedLayout>
          )} />

          <Route path="/cuban-passport" component={() => (
            <ProtectedLayout permission="PassportAccess" featureName="Cuban Passport Application">
              <CubanPassportPage />
            </ProtectedLayout>
          )} />

          <Route path="/pdf-signature" component={() => (
            <ProtectedLayout permission="AdminPassportAccess" featureName="PDF Signature Integration">
              <PDFSignaturePage />
            </ProtectedLayout>
          )} />

          <Route path="/signature-requests" component={() => (
            <ProtectedLayout permission="PassportAccess" featureName="Signature Request Management">
              <SignatureManagerPage />
            </ProtectedLayout>
          )} />

          <Route path="/passport-photo" component={() => (
            <ProtectedLayout permission="AdminPassportAccess" featureName="Passport Photo Capture">
              {/** <PassportPhotoPage />*/}
              <SimplePassportCrop />
            </ProtectedLayout>
          )} />

          <Route path="/passport-debug" component={() => (
            <ProtectedLayout permission="AdminPassportAccess" featureName="Passport Photo Capture">
              <AuthGuard>
                <PassportPhotoDebug />
              </AuthGuard>
            </ProtectedLayout>
          )} />

          <Route path="/fingerprint-capture" component={() => (
            <ProtectedLayout permission="PassportAccess" featureName="Fingerprint Capture">
              <FingerprintPage />
            </ProtectedLayout>
          )} />

          <Route path="/admin/users" component={() => (
            <ProtectedLayout permission="isAdmin" featureName="User Administration">
              <UserProfileAdmin />
            </ProtectedLayout>
          )} />

          <Route path="/admin/businesses" component={() => (
            <ProtectedLayout permission="isAdmin" featureName="Business Management">
              <BusinessManagement />
            </ProtectedLayout>
          )} />

          <Route path="/admin/stores" component={() => (
            <ProtectedLayout permission="isAdmin" featureName="Store Management">
              <StoreManager />
            </ProtectedLayout>
          )} />

          <Route path="/admin/migration" component={() => (
            <ProtectedLayout permission="isAdmin" featureName="Data Migration">
              <DataMigration />
            </ProtectedLayout>
          )} />

          <Route path="/automation" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Manual Automation">
              <ManualAutomationMenu />
            </ProtectedLayout>
          )} />

          <Route path="/event-automation" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Event Automation">
              <EventAutomationUI />
            </ProtectedLayout>
          )} />

          <Route path="/accounting-flow" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Accounting Flow">
              <AccountingFlowPage />
            </ProtectedLayout>
          )} />

          {/* Supervision Dashboard Routes */}
          <Route path="/supervision" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Supervision Dashboard">
              <SupervisionDashboard />
            </ProtectedLayout>
          )} />

          <Route path="/supervision/adapters" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Adapter Management">
              <AdaptersListPage />
            </ProtectedLayout>
          )} />

          <Route path="/supervision/adapters/:id" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Adapter Details">
              <AdapterDetailPage />
            </ProtectedLayout>
          )} />

          <Route path="/supervision/account-mappings" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Account Mappings">
              <AccountMappingsPage />
            </ProtectedLayout>
          )} />

          <Route path="/remittances" component={() => (
            <ProtectedLayout permission="RemittanceAccess" featureName="Remittances">
              <Remittances />
            </ProtectedLayout>
          )} />

          <Route path="/purchase-requests" component={() => (
            <ProtectedLayout permission="PurchaseRequestAccess" featureName="Purchase Requests">
              <PurchaseRequestsPage />
            </ProtectedLayout>
          )} />

          <Route path="/purchase-registrations" component={() => (
            <ProtectedLayout permission="PurchaseRequestAccess" featureName="Purchase Registrations">
              <PurchaseRegistrationPage />
            </ProtectedLayout>
          )} />

          {/* Providers & Clients */}
          <Route path="/providers-clients" component={() => (
            <ProtectedLayout permission="AccountAccess" featureName="Providers and Clients">
              <ProvidersClientsPage />
            </ProtectedLayout>
          )} />

          <Route path="/consignees" component={() => (
            <ProtectedLayout permission="HBLAccess" featureName="Consignees">
              <ConsigneePage />
            </ProtectedLayout>
          )} />

          <Route path="/shippers" component={() => (
            <ProtectedLayout permission="HBLAccess" featureName="Shippers">
              <ShipperPage />
            </ProtectedLayout>
          )} />

          <Route path="/notary-customers" component={() => (
            <ProtectedLayout permission="NotaryAccess" featureName="Notary Customer Management">
              <NotaryCustomerManager />
            </ProtectedLayout>
          )} />

          <Route path="/notary-customers/:id" component={() => (
            <ProtectedLayout permission="NotaryAccess" featureName="Notary Customer Detail">
              <NotaryCustomerDetail />
            </ProtectedLayout>
          )} />

          <Route path="/notary-pdf-forms" component={() => (
            <ProtectedLayout permission="NotaryAccess" featureName="PDF Form Filler">
              <PDFFormFiller />
            </ProtectedLayout>
          )} />

          <Route path="/notary/motion-to-dismiss" component={() => (
            <ProtectedLayout permission="NotaryAccess" featureName="Motion to Dismiss">
              <MotionToDismissForm />
            </ProtectedLayout>
          )} />

          <Route path="/notary/g1650" component={() => (
            <ProtectedLayout permission="NotaryAccess" featureName="Form G-1650 ACH Authorization">
              <G1650Form />
            </ProtectedLayout>
          )} />

          {/* Product Offers Comparison */}
          <Route path="/offers-comparison" component={() => (
            <ProtectedLayout permission="InventoryAccess" featureName="Product Offers Comparison">
              <ProductOffersComparison />
            </ProtectedLayout>
          )} />

          {/* Appointments Module Routes */}
          <Route path="/appointments" component={() => (
            <ProtectedLayout permission="AppointmentAccess" featureName="Appointments">
              <AppointmentDashboard />
            </ProtectedLayout>
          )} />

          <Route path="/event-types" component={() => (
            <ProtectedLayout permission="AppointmentAccess" featureName="Event Types">
              <EventTypeManager />
            </ProtectedLayout>
          )} />

          <Route path="/firebase-debug" component={() => (
            <ProtectedLayout permission="AppointmentAccess" featureName="Firebase Debug">
              <FirebaseDebugger />
            </ProtectedLayout>
          )} />

          <Route path="/event-types-debug" component={() => (
            <ProtectedLayout permission="AppointmentAccess" featureName="Event Types Debug">
              <EventTypesDebug />
            </ProtectedLayout>
          )} />

          <Route path="/availability" component={() => (
            <ProtectedLayout permission="AppointmentAccess" featureName="Availability">
              <AvailabilitySettingsPage />
            </ProtectedLayout>
          )} />


           {/* Tax Document Portal - Client Portal (public, uses magic link or Google auth) */}
          <Route path="/tax-portal/client/:token" component={ClientPortal} />
          <Route path="/tax-portal/client" component={ClientPortal} />

          {/* Public booking page - no authentication required */}
          <Route path="/book" component={PublicBookingPage} />
          <Route path="/book/:userId" component={BookingPage} />
          <Route path="/book/:username" component={BookingPage} />

          {/* Mobile-first booking pages */}
          <Route path="/mobile-book" component={MobilePublicBookingPage} />
          <Route path="/mobile-book/:userId" component={MobileBookingPage} />
          <Route path="/mobile-book/:username" component={MobileBookingPage} />

          <Route path="/debug-booking/:userId" component={() => <DebugBooking />} />

          {/* Smart Queue - New Home Page */}
          <Route path="/smart-queue" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Smart Queue">
              <SmartQueuePage />
            </ProtectedLayout>
          )} />

          {/* Scan Station */}
          <Route path="/scan" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Scan Station">
              <ScanStationPage />
            </ProtectedLayout>
          )} />

          {/* Communications / Messaging Settings */}
          <Route path="/messaging-settings" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Messaging Settings">
              <MessagingSettingsPage />
            </ProtectedLayout>
          )} />

          {/* Office Workflow - Kiosk Mode */}
          <Route path="/kiosk" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Kiosk Mode">
              <KioskMode />
            </ProtectedLayout>
          )} />

          {/* Office Workflow - Check-In Queue */}
          <Route path="/check-in" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Check-In Queue">
              <CheckInQueue />
            </ProtectedLayout>
          )} />

          {/* Office Workflow - Assistant Dashboard */}
          <Route path="/assistant" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Assistant Dashboard">
              <AssistantDashboard />
            </ProtectedLayout>
          )} />

          {/* Payment Settings */}
          <Route path="/payment-settings" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Payment Settings">
              <PaymentSettingsPage />
            </ProtectedLayout>
          )} />

          {/* Stripe Payment Return Routes */}
          <Route path="/stripe-success" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Stripe Payment">
              <StripeReturnHandler />
            </ProtectedLayout>
          )} />
          <Route path="/stripe-cancel" component={() => (
            <ProtectedLayout permission="taxWorkflowAccess" featureName="Stripe Payment">
              <StripeCancelHandler />
            </ProtectedLayout>
          )} />

          {/* Public Routes (no auth) */}
          {/* Pre-Visit Form */}
          <Route path="/pre-visit/:id/:token" component={PublicPreVisitPage} />

          {/* E-Signature (public, via WhatsApp/SMS link) */}
          <Route path="/e-sign/:id/:token" component={PublicESignaturePage} />
        </HashRouter>
      </main>
    </div>



  );
};

export default App;