// Office Workflow Module - Entry point for all office workflow features

// Types
export type {
  PreVisitFormData,
  DependentInfo,
  FilingStatusOption,
  DocumentBrought,
  SupportedLanguage,
  KioskConfig,
  KioskService,
  CheckInEntry,
  CheckInStatus,
  WaitTimeEstimate,
  AssistantTask,
  AssistantTaskPriority,
  AssistantTaskType,
  BilingualText,
} from './types/workflowTypes';

export {
  FILING_STATUS_LABELS,
  DOCUMENT_LABELS,
  DEFAULT_KIOSK_CONFIG,
  CHECK_IN_STATUS_LABELS,
  CHECK_IN_STATUS_COLORS,
  ASSISTANT_TASK_COLORS,
  UI_LABELS,
} from './types/workflowTypes';

// Services
export { checkinService } from './services/checkinService';

// Store
export { checkinStore } from './stores/checkinStore';

// Components
export { default as PreVisitForm } from './components/PreVisitForm';
export { default as KioskMode } from './components/KioskMode';
export { default as CheckInQueue } from './components/CheckInQueue';
export { default as AssistantDashboard } from './components/AssistantDashboard';

// Pages
export { default as PublicPreVisitPage } from './pages/PublicPreVisitPage';
