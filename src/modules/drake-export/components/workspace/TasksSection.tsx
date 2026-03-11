/**
 * TasksSection
 * Workspace component displaying client tasks with status and batch send functionality
 */

import { Component, createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { Card, Button } from '../../../ui';
import { createDocumentRequest, sendDocumentRequestReminder, markDocumentNotNeeded } from '../../services/taxPortalApi';
import type { TaxPortal, RequestedDocumentType, TaxYear, DrakeTaxDocument, TaxDocumentRequest } from '../../types/drakeTypes';
import { DEFAULT_REQUESTED_DOCUMENTS, DRAKE_FORM_LABELS } from '../../types/drakeTypes';
import { generateEngagementLetterPDF } from '../../utils/engagementLetterPdfGenerator';
import { generateForm8879PDF } from '../../utils/form8879PdfGenerator';
import SignatureValidationView from '../SignatureValidationView';
import ESignaturePanel from './ESignaturePanel';
import { devLog } from '../../../../services/utils';

interface TasksSectionProps {
  taxPortalId?: string;
  taxPortal: TaxPortal;
  client?: TaxPortal;
  documents?: DrakeTaxDocument[];
  documentRequests?: TaxDocumentRequest[];
  onTasksChange?: (pendingCount: number) => void;
  logo?: string; // Base64 encoded logo for PDF header
}

interface ClientTask {
  id: string;
  type: 'upload_ssn' | 'sign_letter' | 'review_summary' | 'upload_document' | 'verify_info' | 'provide_dependent_info' | 'set_signing_pin' | 'provide_bank_info';
  title: string;
  description: string;
  status: 'pending' | 'complete' | 'in_progress';
  priority: 'high' | 'medium' | 'low';
  documentType?: string;
  completedAt?: number;
  matchedDocument?: DrakeTaxDocument;
  signedRequest?: TaxDocumentRequest; // Reference to the signed document request
  pinRequest?: TaxDocumentRequest; // Reference to the document request with signing PIN
  matchedDocuments?: DrakeTaxDocument[];
}

const TasksSection: Component<TasksSectionProps> = (props) => {
  const [isSendingAll, setIsSendingAll] = createSignal(false);
  const [sendingTaskId, setSendingTaskId] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [selectedTasks, setSelectedTasks] = createSignal<Set<string>>(new Set());

  // Signature validation modal state
  const [showValidationModal, setShowValidationModal] = createSignal(false);
  const [validationRequest, setValidationRequest] = createSignal<TaxDocumentRequest | null>(null);
  const [validationType, setValidationType] = createSignal<'engagement' | 'pin'>('engagement');
  const [copiedLink, setCopiedLink] = createSignal<string | null>(null);

  // Mark as not needed state
  const [showNotNeededModal, setShowNotNeededModal] = createSignal(false);
  const [notNeededTask, setNotNeededTask] = createSignal<ClientTask | null>(null);
  const [notNeededReason, setNotNeededReason] = createSignal('');
  const [markingNotNeeded, setMarkingNotNeeded] = createSignal(false);
  const [notNeededTasks, setNotNeededTasks] = createSignal<Set<string>>(new Set());

  // E-Signature panel state
  const [expandedSignatureTaskId, setExpandedSignatureTaskId] = createSignal<string | null>(null);

  // Helper: Generate validation URL for a request
  const getValidationUrl = (request: TaxDocumentRequest, type: 'engagement' | 'pin'): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/signature-validation/${request.id}/${request.accessToken}/${type}`;
  };

  // Helper: Generate verification URL for client info verification
  const getVerificationUrl = (request: TaxDocumentRequest): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/tax-verify/${request.id}/${request.accessToken}`;
  };

  // Helper: Get a document request for verification (any active request)
  const getVerificationRequest = (): TaxDocumentRequest | undefined => {
    return props.documentRequests?.find(req => req.status === 'pending' || req.status === 'partial')
      || props.documentRequests?.[0];
  };

  // Helper: Copy validation link to clipboard
  const copyValidationLink = async (request: TaxDocumentRequest, type: 'engagement' | 'pin') => {
    const url = getValidationUrl(request, type);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(request.id + type);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      devLog('Failed to copy:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  // Helper: Copy verification link to clipboard
  const copyVerificationLink = async (request: TaxDocumentRequest) => {
    const url = getVerificationUrl(request);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(request.id + 'verify');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      devLog('Failed to copy:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  // Helper: Find documents matching a task's document type
  const findMatchingDocuments = (taskDocType: string | undefined): DrakeTaxDocument[] => {
    if (!taskDocType || !props.documents) return [];

    return props.documents.filter(doc => {
      if (!doc.drakeFormType) return false;

      // Direct match (e.g., 'w2' matches 'w2')
      if (doc.drakeFormType === taskDocType) return true;

      // Partial match for 1099 forms (e.g., '1099' matches '1099_nec', '1099_misc', etc.)
      if (taskDocType === '1099' && doc.drakeFormType.startsWith('1099')) return true;

      // Partial match for 1098 forms
      if (taskDocType === '1098' && doc.drakeFormType.startsWith('1098')) return true;

      return false;
    });
  };

  // Generate tasks based on tax portal status and match with documents
  const clientTasks = createMemo<ClientTask[]>(() => {
    const tasks: ClientTask[] = [];
    const docs = props.documents || [];

    // Task: Upload SSN
    if (!props?.taxPortal?.ssn) {
      tasks.push({
        id: 'upload_ssn',
        type: 'upload_ssn',
        title: 'Upload SSN',
        description: 'Client needs to provide their Social Security Number',
        status: 'pending',
        priority: 'high'
      });
    } else {
      tasks.push({
        id: 'upload_ssn',
        type: 'upload_ssn',
        title: 'SSN Provided',
        description: `SSN ending in ${props?.taxPortal?.ssn.slice(-4)}`,
        status: 'complete',
        priority: 'high',
        completedAt: props?.taxPortal?.updatedAt
      });
    }

    // Task: Sign engagement letter - check if signed in any document request
    const signedRequest = props.documentRequests?.find(req => req.clientSignature?.signedAt);
    const isLetterSigned = !!signedRequest;

    tasks.push({
      id: 'sign_letter',
      type: 'sign_letter',
      title: isLetterSigned ? 'Engagement Letter Signed' : 'Sign Engagement Letter',
      description: isLetterSigned
        ? `Signed by ${signedRequest?.clientSignature?.name || 'client'} on ${new Date(signedRequest?.clientSignature?.signedAt || 0).toLocaleDateString()}`
        : 'Client needs to sign the tax preparation engagement letter',
      status: isLetterSigned ? 'complete' : 'pending',
      priority: 'high',
      completedAt: signedRequest?.clientSignature?.signedAt,
      signedRequest: isLetterSigned ? signedRequest : undefined
    });

    // Task: Set signing PIN for e-filing - check if PIN is set in any document request
    const pinRequest = props.documentRequests?.find(req => req.clientSigningPin?.pin);
    const isPinSet = !!pinRequest?.clientSigningPin?.pin;
    tasks.push({
      id: 'set_signing_pin',
      type: 'set_signing_pin',
      title: isPinSet ? 'E-Filing PIN Set' : 'Set E-Filing PIN',
      description: isPinSet
        ? `5-digit PIN set on ${new Date(pinRequest?.clientSigningPin?.setAt || 0).toLocaleDateString()}`
        : 'Client needs to create a 5-digit PIN to authorize e-filing their tax return',
      status: isPinSet ? 'complete' : 'pending',
      priority: 'high',
      completedAt: pinRequest?.clientSigningPin?.setAt,
      pinRequest: isPinSet ? pinRequest : undefined
    });

    // Task: Verify personal information — check taxPortal fields AND portal-submitted clientVerification
    const hasCompleteInfo = props.taxPortal?.firstName &&
      props.taxPortal?.lastName &&
      props.taxPortal?.address &&
      props.taxPortal?.city &&
      props.taxPortal?.state &&
      props.taxPortal?.zipCode;
    const verifiedRequest = props.documentRequests?.find(req => req.clientVerification?.submittedAt);
    const isVerifyComplete = hasCompleteInfo || !!verifiedRequest;
    const verifyDesc = verifiedRequest?.clientVerification
      ? `Verified via portal on ${new Date(verifiedRequest.clientVerification.submittedAt || 0).toLocaleDateString()}` +
        (verifiedRequest.clientVerification.phone ? ` · Phone: ${verifiedRequest.clientVerification.phone}` : '')
      : hasCompleteInfo ? 'Personal information has been verified' : 'Client needs to verify their name and address';

    tasks.push({
      id: 'verify_info',
      type: 'verify_info',
      title: isVerifyComplete ? 'Personal Info Verified' : 'Verify Personal Information',
      description: verifyDesc,
      status: isVerifyComplete ? 'complete' : 'pending',
      priority: 'medium',
      completedAt: verifiedRequest?.clientVerification?.submittedAt || (hasCompleteInfo ? props.taxPortal?.updatedAt : undefined)
    });

    // Task: Provide dependent information — check taxPortal AND portal-submitted clientDependents
    const hasDependents = (props.taxPortal?.dependents?.length || 0) > 0;
    const confirmedNoDependents = props.taxPortal?.hasNoDependents === true;
    const portalDepsRequest = props.documentRequests?.find(req =>
      (req.clientDependents && (req.clientDependents as any[]).length > 0)
    );
    const portalDeps = portalDepsRequest?.clientDependents as any[] | undefined;
    const dependentTaskComplete = hasDependents || confirmedNoDependents || !!portalDeps?.length;
    const depCount = portalDeps?.length || props.taxPortal?.dependents?.length || 0;
    const depSource = portalDeps?.length ? 'portal' : 'system';

    tasks.push({
      id: 'provide_dependent_info',
      type: 'provide_dependent_info',
      title: dependentTaskComplete
        ? (confirmedNoDependents && !portalDeps?.length ? 'No Dependents (Confirmed)' : `${depCount} Dependent(s) Added`)
        : 'Provide Dependent Information',
      description: dependentTaskComplete
        ? (confirmedNoDependents && !portalDeps?.length
          ? 'Client confirmed they have no dependents to claim'
          : `${depCount} dependent(s) submitted${depSource === 'portal' ? ' via portal' : ''}: ${
              (portalDeps || props.taxPortal?.dependents || []).map((d: any) => `${d.firstName} ${d.lastName}`).join(', ')
            }`)
        : 'Client needs to provide information about any dependents',
      status: dependentTaskComplete ? 'complete' : 'pending',
      priority: 'medium',
      completedAt: dependentTaskComplete ? props.taxPortal?.updatedAt : undefined
    });

    // Task: Bank Information — check portal-submitted clientBankInfo
    const bankRequest = props.documentRequests?.find(req => req.clientBankInfo?.submittedAt);
    const hasBankInTaxPortal = !!(props.taxPortal as any)?.bankRouting && !!(props.taxPortal as any)?.bankAccount;
    const isBankComplete = !!bankRequest || hasBankInTaxPortal;
    const bankInfo = bankRequest?.clientBankInfo;

    tasks.push({
      id: 'provide_bank_info',
      type: 'provide_bank_info',
      title: isBankComplete ? 'Bank Info Provided' : 'Provide Bank Information',
      description: isBankComplete
        ? (bankInfo
          ? `${bankInfo.bankName || 'Bank'} · ${bankInfo.accountType || ''} ····${(bankInfo.accountNumber || '').slice(-4)} · Submitted ${new Date(bankInfo.submittedAt || 0).toLocaleDateString()}`
          : 'Bank information on file')
        : 'Client needs to provide bank account for direct deposit/payment',
      status: isBankComplete ? 'complete' : 'pending',
      priority: 'medium',
      completedAt: bankInfo?.submittedAt
    });

    // Task: Upload W-2 - check for matching documents
    const w2Docs = findMatchingDocuments('w2');
    const hasW2 = w2Docs.length > 0;
    tasks.push({
      id: 'upload_w2',
      type: 'upload_document',
      title: 'Upload W-2',
      description: hasW2
        ? `${w2Docs.length} W-2 form(s) uploaded`
        : 'Client needs to upload their W-2 form(s) from employer(s)',
      status: hasW2 ? 'complete' : 'pending',
      priority: 'high',
      documentType: 'w2',
      matchedDocuments: hasW2 ? w2Docs : undefined,
      matchedDocument: hasW2 ? w2Docs[0] : undefined,
      completedAt: hasW2 ? w2Docs[0].uploadedAt : undefined
    });

    // Task: Upload 1099s - check for matching documents
    const docs1099 = findMatchingDocuments('1099');
    const has1099 = docs1099.length > 0;
    tasks.push({
      id: 'upload_1099',
      type: 'upload_document',
      title: 'Upload 1099 Forms',
      description: has1099
        ? `${docs1099.length} 1099 form(s) uploaded`
        : 'Upload any 1099 forms (1099-NEC, 1099-MISC, 1099-INT, 1099-DIV)',
      status: has1099 ? 'complete' : 'pending',
      priority: 'medium',
      documentType: '1099',
      matchedDocuments: has1099 ? docs1099 : undefined,
      matchedDocument: has1099 ? docs1099[0] : undefined,
      completedAt: has1099 ? docs1099[0].uploadedAt : undefined
    });

    // Task: Review summary - check if reviewed in any document request
    const reviewedRequest = props.documentRequests?.find(req => req.clientReviewConfirmation?.reviewedAt);
    const isReviewComplete = !!reviewedRequest;

    tasks.push({
      id: 'review_summary',
      type: 'review_summary',
      title: isReviewComplete ? 'Tax Summary Reviewed' : 'Review Tax Summary',
      description: isReviewComplete
        ? `Reviewed and confirmed on ${new Date(reviewedRequest?.clientReviewConfirmation?.reviewedAt || 0).toLocaleDateString()}`
        : 'Client needs to review and approve the tax summary before filing',
      status: isReviewComplete ? 'complete' : 'pending',
      priority: 'low',
      completedAt: reviewedRequest?.clientReviewConfirmation?.reviewedAt
    });

    return tasks;
  });

  // Notify parent of pending tasks count changes
  createEffect(() => {
    const pending = clientTasks().filter(t => t.status === 'pending').length;
    props.onTasksChange?.(pending);
  });

  // Compute task statistics
  const taskStats = createMemo(() => {
    const tasks = clientTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      complete: tasks.filter(t => t.status === 'complete').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length
    };
  });

  // Get pending tasks
  const pendingTasks = createMemo(() => {
    return clientTasks().filter(t => t.status === 'pending');
  });

  // Handle send all pending to client
  const handleSendAllPending = async () => {
    if (pendingTasks().length === 0) {
      setErrorMessage('No pending tasks to send');
      return;
    }

    setIsSendingAll(true);
    setErrorMessage(null);

    try {
      // Create a document request with all required documents
      const requestedDocs: RequestedDocumentType[] = DEFAULT_REQUESTED_DOCUMENTS.map(doc => ({
        ...doc,
        required: doc.type === 'w2' || pendingTasks().some(t => t.documentType === doc.type)
      }));

      await createDocumentRequest(props.taxPortal, {
        taxYear: (props?.taxPortal?.taxYear || new Date().getFullYear()) as TaxYear,
        requestedDocuments: requestedDocs,
        instructions: generateTaskInstructions()
      });

      setSuccessMessage(`Sent ${pendingTasks().length} pending tasks to ${props?.taxPortal?.firstName} ${props?.taxPortal?.lastName}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSendingAll(false);
    }
  };

  // Generate instructions text from pending tasks
  const generateTaskInstructions = () => {
    const pending = pendingTasks();
    const items = pending.map((t, i) => `${i + 1}. ${t.title}: ${t.description}`);
    return `Please complete the following tasks:\n\n${items.join('\n')}`;
  };

  // Handle send individual task reminder
  const handleSendReminder = async (task: ClientTask) => {
    setSendingTaskId(task.id);
    setErrorMessage(null);

    devLog(props?.taxPortal)

    try {
      // Build reminder message for this specific task
      const clientName = `${props?.taxPortal?.firstName || ''} ${props?.taxPortal?.lastName || ''}`.trim();
      const clientEmail = props?.taxPortal?.email;
      const clientPhone = props?.taxPortal?.phone;

      if (!clientEmail && !clientPhone) {
       // throw new Error('No email or phone available for this client');
      }


      // Create a document request for this specific task
      const requestedDocs: RequestedDocumentType[] = [{
        type: task.type as any || 'other',
        label: task.title,
        required: task.priority === 'high',
        uploaded: false
      }];

      await createDocumentRequest(props.taxPortal, {
        taxYear: (props?.taxPortal?.taxYear || new Date().getFullYear()) as TaxYear,
        requestedDocuments: requestedDocs,
        instructions: `Please complete the following task:\n\n${task.title}: ${task.description}`,
        task
      });

      setSuccessMessage(`Reminder sent for "${task.title}" to ${clientName}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      devLog('Error sending reminder:', error);
      setErrorMessage((error as Error).message || 'Failed to send reminder');
    } finally {
      setSendingTaskId(null);
    }
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Handle marking task as not needed
  const handleMarkNotNeeded = async (task: ClientTask, reason?: string) => {
    setMarkingNotNeeded(true);
    setErrorMessage(null);

    try {
      // Find the active document request for this task
      const activeRequest = props.documentRequests?.find(req => req.status === 'pending' || req.status === 'partial');
      if (!activeRequest) {
        throw new Error('No active document request found');
      }

      const result = await markDocumentNotNeeded(
        activeRequest.id,
        task.documentType || task.type,
        true,
        reason || notNeededReason()
      );

      if (result.success) {
        // Add to local state
        setNotNeededTasks(prev => {
          const newSet = new Set(prev);
          newSet.add(task.id);
          return newSet;
        });
        setSuccessMessage(`"${task.title}" marked as not needed`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to mark as not needed');
      }
    } catch (error) {
      devLog('Error marking as not needed:', error);
      setErrorMessage((error as Error).message);
    } finally {
      setMarkingNotNeeded(false);
      setShowNotNeededModal(false);
      setNotNeededTask(null);
      setNotNeededReason('');
    }
  };

  // Handle undoing not needed status
  const handleUndoNotNeeded = async (task: ClientTask) => {
    setMarkingNotNeeded(true);
    setErrorMessage(null);

    try {
      const activeRequest = props.documentRequests?.find(req => req.status === 'pending' || req.status === 'partial');
      if (!activeRequest) {
        throw new Error('No active document request found');
      }

      const result = await markDocumentNotNeeded(
        activeRequest.id,
        task.documentType || task.type,
        false
      );

      if (result.success) {
        setNotNeededTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(task.id);
          return newSet;
        });
        setSuccessMessage(`"${task.title}" restored to pending`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to restore task');
      }
    } catch (error) {
      devLog('Error restoring task:', error);
      setErrorMessage((error as Error).message);
    } finally {
      setMarkingNotNeeded(false);
    }
  };

  // Open not needed modal for a task
  const openNotNeededModal = (task: ClientTask) => {
    setNotNeededTask(task);
    setNotNeededReason('');
    setShowNotNeededModal(true);
  };

  // Get priority badge config
  const getPriorityConfig = (priority: ClientTask['priority']) => {
    const configs = {
      high: { label: 'High', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
      medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
      low: { label: 'Low', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
    };
    return configs[priority];
  };

  // Get status config
  const getStatusConfig = (status: ClientTask['status']) => {
    const configs = {
      pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
      complete: { label: 'Complete', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
      in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }
    };
    return configs[status];
  };

  // Format date
  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Styles
  const sectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'flex-wrap': 'wrap' as const,
    gap: '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    margin: '0'
  };

  const statsRowStyle = {
    display: 'flex',
    gap: '1.5rem',
    'margin-top': '0.5rem'
  };

  const statItemStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.875rem'
  };

  const statDotStyle = (color: string) => ({
    width: '8px',
    height: '8px',
    'border-radius': '50%',
    background: color
  });

  const messageStyle = (type: 'success' | 'error') => ({
    padding: '0.75rem 1rem',
    'border-radius': '8px',
    'font-size': '0.875rem',
    background: type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: type === 'success' ? '#22c55e' : '#ef4444',
    border: `1px solid ${type === 'success' ? '#22c55e' : '#ef4444'}`,
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  });

  const taskListStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem'
  };

  const taskCardStyle = (status: ClientTask['status'], isNotNeeded: boolean = false) => ({
    display: 'flex',
    'align-items': 'flex-start',
    gap: '1rem',
    padding: '1rem',
    background: isNotNeeded
      ? 'rgba(245, 158, 11, 0.03)'
      : status === 'complete'
        ? 'rgba(34, 197, 94, 0.03)'
        : 'var(--surface-color, #ffffff)',
    border: `1px solid ${isNotNeeded
      ? 'rgba(245, 158, 11, 0.2)'
      : status === 'complete'
        ? 'rgba(34, 197, 94, 0.2)'
        : 'var(--border-color, #e5e7eb)'}`,
    'border-radius': '8px',
    transition: 'all 0.2s ease',
    opacity: isNotNeeded ? '0.7' : '1'
  });

  const checkboxContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'padding-top': '0.125rem'
  };

  const checkboxStyle = (checked: boolean, isNotNeeded: boolean = false) => ({
    width: '24px',
    height: '24px',
    'border-radius': '50%',
    border: (checked || isNotNeeded) ? 'none' : '2px solid var(--border-color, #d1d5db)',
    background: isNotNeeded ? '#f59e0b' : checked ? '#22c55e' : 'transparent',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  const taskContentStyle = {
    flex: '1',
    'min-width': '0'
  };

  const taskTitleStyle = (isComplete: boolean, isNotNeeded: boolean = false) => ({
    'font-weight': '500',
    'font-size': '0.9375rem',
    color: isNotNeeded
      ? '#f59e0b'
      : isComplete
        ? 'var(--text-secondary, #6b7280)'
        : 'var(--text-primary, #1f2937)',
    'text-decoration': (isComplete || isNotNeeded) ? 'line-through' : 'none',
    'margin-bottom': '0.25rem'
  });

  const taskDescriptionStyle = {
    'font-size': '0.8125rem',
    color: 'var(--text-muted, #9ca3af)',
    'margin-bottom': '0.5rem'
  };

  const badgeContainerStyle = {
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap' as const
  };

  const badgeStyle = (config: { color: string; bg: string }) => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.125rem 0.5rem',
    'border-radius': '4px',
    background: config.bg,
    color: config.color,
    'font-size': '0.6875rem',
    'font-weight': '600',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em'
  });

  const sendAllButtonStyle = {
    padding: '0.875rem 2rem',
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    border: 'none',
    'border-radius': '8px',
    'font-size': '1rem',
    'font-weight': '600',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
    'box-shadow': '0 4px 6px rgba(59, 130, 246, 0.25)'
  };

  const sendAllButtonDisabledStyle = {
    ...sendAllButtonStyle,
    background: 'var(--border-color, #d1d5db)',
    cursor: 'not-allowed',
    'box-shadow': 'none'
  };

  const completedDateStyle = {
    'font-size': '0.75rem',
    color: '#22c55e',
    'margin-top': '0.25rem'
  };

  const summaryCardStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
    'border-radius': '12px',
    'margin-bottom': '1rem'
  };

  return (
    <div style={sectionStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Client Tasks</h3>
          <div style={statsRowStyle}>
            <div style={statItemStyle}>
              <div style={statDotStyle('#f59e0b')} />
              <span>{taskStats().pending} Pending</span>
            </div>
            <div style={statItemStyle}>
              <div style={statDotStyle('#22c55e')} />
              <span>{taskStats().complete} Complete</span>
            </div>
            <Show when={taskStats().inProgress > 0}>
              <div style={statItemStyle}>
                <div style={statDotStyle('#3b82f6')} />
                <span>{taskStats().inProgress} In Progress</span>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Messages */}
      <Show when={errorMessage()}>
        <div style={messageStyle('error')}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          {errorMessage()}
        </div>
      </Show>
      <Show when={successMessage()}>
        <div style={messageStyle('success')}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          {successMessage()}
        </div>
      </Show>

      {/* Send All Pending Card */}
      <Show when={pendingTasks().length > 0}>
        <Card>
          <div style={summaryCardStyle}>
            <div style={{ 'font-size': '2.5rem', 'margin-bottom': '0.5rem' }}>
              {pendingTasks().length}
            </div>
            <div style={{ 'font-size': '1rem', 'font-weight': '500', color: 'var(--text-primary)', 'margin-bottom': '0.5rem' }}>
              Pending Tasks
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '1.5rem', 'text-align': 'center' }}>
              Send all pending tasks to {props?.taxPortal?.firstName} {props?.taxPortal?.lastName} for completion
            </div>
            <button
              style={isSendingAll() ? sendAllButtonDisabledStyle : sendAllButtonStyle}
              onClick={handleSendAllPending}
              disabled={isSendingAll()}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              {isSendingAll() ? 'Sending...' : 'Send All Pending to Client'}
            </button>
          </div>
        </Card>
      </Show>

      {/* Task List */}
      <Card>
        <div style={taskListStyle}>
          <For each={clientTasks()}>
            {(task) => {
              const priorityConfig = getPriorityConfig(task.priority);
              const statusConfig = getStatusConfig(task.status);
              const isComplete = task.status === 'complete';
              const isNotNeeded = notNeededTasks().has(task.id);
              devLog(task)

              return (
                <div style={taskCardStyle(task.status, isNotNeeded)}>
                  {/* Checkbox */}
                  <div style={checkboxContainerStyle}>
                    <div style={checkboxStyle(isComplete, isNotNeeded)}>
                      <Show when={isComplete}>
                        <svg viewBox="0 0 20 20" fill="white" style={{ width: '14px', height: '14px' }}>
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </Show>
                      <Show when={isNotNeeded && !isComplete}>
                        <svg viewBox="0 0 20 20" fill="white" style={{ width: '14px', height: '14px' }}>
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </Show>
                    </div>
                  </div>

                  {/* Task Content */}
                  <div style={taskContentStyle}>
                    <div style={taskTitleStyle(isComplete, isNotNeeded)}>{task.title}</div>
                    <div style={taskDescriptionStyle}>{task.description}</div>
                    <div style={badgeContainerStyle}>
                      <Show when={isNotNeeded}>
                        <span style={badgeStyle({ color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' })}>Not Needed</span>
                      </Show>
                      <Show when={!isNotNeeded}>
                        <span style={badgeStyle(statusConfig)}>{statusConfig.label}</span>
                      </Show>
                      <span style={badgeStyle(priorityConfig)}>{priorityConfig.label} Priority</span>
                      <Show when={task.documentType && !task.matchedDocuments}>
                        <span style={badgeStyle({ color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' })}>
                          {task.documentType}
                        </span>
                      </Show>
                    </div>

                    {/* Matched Documents */}
                    <Show when={task.matchedDocuments && task.matchedDocuments.length > 0}>
                      <div style={{
                        'margin-top': '0.75rem',
                        padding: '0.75rem',
                        background: 'rgba(34, 197, 94, 0.05)',
                        'border-radius': '6px',
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                      }}>
                        <div style={{
                          'font-size': '0.75rem',
                          'font-weight': '600',
                          color: '#166534',
                          'margin-bottom': '0.5rem',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.375rem'
                        }}>
                          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                          Matched Documents ({task.matchedDocuments.length})
                        </div>
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.375rem' }}>
                          <For each={task.matchedDocuments}>
                            {(doc) => (
                              <div style={{
                                display: 'flex',
                                'align-items': 'center',
                                gap: '0.5rem',
                                'font-size': '0.8125rem',
                                color: 'var(--text-secondary)'
                              }}>
                                <span style={{
                                  display: 'inline-flex',
                                  padding: '0.125rem 0.375rem',
                                  background: 'rgba(139, 92, 246, 0.1)',
                                  color: '#8b5cf6',
                                  'border-radius': '4px',
                                  'font-size': '0.6875rem',
                                  'font-weight': '600'
                                }}>
                                  {DRAKE_FORM_LABELS[doc.drakeFormType || 'other']}
                                </span>
                                <span style={{
                                  'max-width': '200px',
                                  overflow: 'hidden',
                                  'text-overflow': 'ellipsis',
                                  'white-space': 'nowrap'
                                }} title={doc.originalFileName}>
                                  {doc.originalFileName}
                                </span>
                                <Show when={doc.payerInfo?.name}>
                                  <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                                    - {doc.payerInfo?.name}
                                  </span>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>

                    <Show when={isComplete && task.completedAt && !task.matchedDocuments}>
                      <div style={completedDateStyle}>
                        Completed on {formatDate(task.completedAt)}
                      </div>
                    </Show>

                    {/* Download PDF for signed engagement letter */}
                    <Show when={task.type === 'sign_letter' && task.signedRequest}>
                      <button
                        onClick={() => {
                          if (task.signedRequest) {
                            generateEngagementLetterPDF({
                              client: props.taxPortal,
                              request: task.signedRequest,
                              logo: props.logo
                            });
                          }
                        }}
                        style={{
                          'margin-top': '0.75rem',
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '6px',
                          'font-size': '0.8125rem',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease',
                          'box-shadow': '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                        Download Signed Letter (PDF)
                      </button>
                      <button
                        onClick={() => {
                          if (task.signedRequest) {
                            setValidationRequest(task.signedRequest);
                            setValidationType('engagement');
                            setShowValidationModal(true);
                          }
                        }}
                        style={{
                          'margin-top': '0.5rem',
                          'margin-left': '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '6px',
                          'font-size': '0.8125rem',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease',
                          'box-shadow': '0 2px 4px rgba(139, 92, 246, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.3)';
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                          <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        View Validation
                      </button>
                      <button
                        onClick={() => task.signedRequest && copyValidationLink(task.signedRequest, 'engagement')}
                        style={{
                          'margin-top': '0.5rem',
                          'margin-left': '0.5rem',
                          padding: '0.5rem 1rem',
                          background: copiedLink() === (task.signedRequest?.id + 'engagement') ? '#22c55e' : '#f1f5f9',
                          color: copiedLink() === (task.signedRequest?.id + 'engagement') ? 'white' : '#64748b',
                          border: '1px solid #e2e8f0',
                          'border-radius': '6px',
                          'font-size': '0.8125rem',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        {copiedLink() === (task.signedRequest?.id + 'engagement') ? 'Copied!' : 'Copy Link'}
                      </button>
                    </Show>

                    {/* Download PDF for E-Filing PIN (Form 8879) */}
                    <Show when={task.type === 'set_signing_pin' && task.pinRequest}>
                      <button
                        onClick={() => {
                          if (task.pinRequest) {
                            generateForm8879PDF({
                              client: props.taxPortal,
                              request: task.pinRequest,
                              logo: props.logo
                            });
                          }
                        }}
                        style={{
                          'margin-top': '0.75rem',
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '6px',
                          'font-size': '0.8125rem',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease',
                          'box-shadow': '0 2px 4px rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                        Download Form 8879 (PDF)
                      </button>
                      <button
                        onClick={() => {
                          if (task.pinRequest) {
                            setValidationRequest(task.pinRequest);
                            setValidationType('pin');
                            setShowValidationModal(true);
                          }
                        }}
                        style={{
                          'margin-top': '0.5rem',
                          'margin-left': '0.5rem',
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '6px',
                          'font-size': '0.8125rem',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease',
                          'box-shadow': '0 2px 4px rgba(139, 92, 246, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.3)';
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                          <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        View Validation
                      </button>
                      <button
                        onClick={() => task.pinRequest && copyValidationLink(task.pinRequest, 'pin')}
                        style={{
                          'margin-top': '0.5rem',
                          'margin-left': '0.5rem',
                          padding: '0.5rem 1rem',
                          background: copiedLink() === (task.pinRequest?.id + 'pin') ? '#22c55e' : '#f1f5f9',
                          color: copiedLink() === (task.pinRequest?.id + 'pin') ? 'white' : '#64748b',
                          border: '1px solid #e2e8f0',
                          'border-radius': '6px',
                          'font-size': '0.8125rem',
                          'font-weight': '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        {copiedLink() === (task.pinRequest?.id + 'pin') ? 'Copied!' : 'Copy Link'}
                      </button>
                    </Show>

                    {/* Verification link for verify_info task */}
                    <Show when={task.type === 'verify_info' && getVerificationRequest()}>
                      <div style={{ 'margin-top': '0.75rem', display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            const request = getVerificationRequest();
                            if (request) {
                              const url = getVerificationUrl(request);
                              window.open(url, '_blank');
                            }
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            color: 'white',
                            border: 'none',
                            'border-radius': '6px',
                            'font-size': '0.8125rem',
                            'font-weight': '500',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            'align-items': 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            'box-shadow': '0 2px 4px rgba(6, 182, 212, 0.3)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(6, 182, 212, 0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(6, 182, 212, 0.3)';
                          }}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                          </svg>
                          Open Verification Page
                        </button>
                        <button
                          onClick={() => {
                            const request = getVerificationRequest();
                            if (request) copyVerificationLink(request);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: copiedLink() === (getVerificationRequest()?.id + 'verify') ? '#22c55e' : '#f1f5f9',
                            color: copiedLink() === (getVerificationRequest()?.id + 'verify') ? 'white' : '#64748b',
                            border: '1px solid #e2e8f0',
                            'border-radius': '6px',
                            'font-size': '0.8125rem',
                            'font-weight': '500',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            'align-items': 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                          {copiedLink() === (getVerificationRequest()?.id + 'verify') ? 'Copied!' : 'Copy Verification Link'}
                        </button>
                      </div>
                    </Show>
                  </div>

                  {/* Action */}
                  <Show when={!isComplete && !notNeededTasks().has(task.id)}>
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', 'align-items': 'flex-end' }}>
                      {/* Sign In-Office button for signature tasks */}
                      <Show when={(task.type === 'sign_letter' || task.type === 'set_signing_pin') && props.documentRequests?.[0]}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setExpandedSignatureTaskId(
                            expandedSignatureTaskId() === task.id ? null : task.id
                          )}
                        >
                          {expandedSignatureTaskId() === task.id ? 'Close Signer' : 'Sign In-Office'}
                        </Button>
                      </Show>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendReminder(task)}
                        disabled={sendingTaskId() === task.id}
                      >
                        {sendingTaskId() === task.id ? 'Sending...' : 'Send Reminder'}
                      </Button>
                      {/* Mark as Not Needed - for document upload tasks */}
                      <Show when={task.type === 'upload_document'}>
                        <button
                          onClick={() => openNotNeededModal(task)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px dashed #cbd5e1',
                            'border-radius': '6px',
                            'font-size': '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.375rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = '#f59e0b';
                            e.currentTarget.style.color = '#f59e0b';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#94a3b8';
                          }}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                          </svg>
                          Not Needed
                        </button>
                      </Show>
                    </div>
                  </Show>

                  {/* Not Needed State - shows undo button */}
                  <Show when={notNeededTasks().has(task.id)}>
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.375rem', 'align-items': 'flex-end' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                        'border-radius': '4px',
                        'font-size': '0.6875rem',
                        'font-weight': '600',
                        'text-transform': 'uppercase'
                      }}>
                        Not Needed
                      </span>
                      <button
                        onClick={() => handleUndoNotNeeded(task)}
                        disabled={markingNotNeeded()}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'transparent',
                          color: '#64748b',
                          border: 'none',
                          'font-size': '0.75rem',
                          cursor: 'pointer',
                          'text-decoration': 'underline'
                        }}
                      >
                        {markingNotNeeded() ? 'Restoring...' : 'Undo'}
                      </button>
                    </div>
                  </Show>

                  {/* Inline E-Signature Panel */}
                  <Show when={expandedSignatureTaskId() === task.id && (task.type === 'sign_letter' || task.type === 'set_signing_pin') && props.documentRequests?.[0]}>
                    <div style={{
                      'grid-column': '1 / -1',
                      'margin-top': '0.75rem',
                      'padding-top': '0.75rem',
                      'border-top': '1px dashed var(--border-color, #e5e7eb)'
                    }}>
                      <ESignaturePanel
                        client={props.taxPortal}
                        documentRequest={props.documentRequests![0]}
                        onSignatureComplete={() => {
                          setExpandedSignatureTaskId(null);
                          if (props.onTasksChange) {
                            // Trigger refresh
                            props.onTasksChange(0);
                          }
                        }}
                      />
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Card>

      {/* All Complete State */}
      <Show when={taskStats().pending === 0}>
        <Card>
          <div style={{
            'text-align': 'center',
            padding: '2rem',
            background: 'rgba(34, 197, 94, 0.05)',
            'border-radius': '8px'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '0.75rem', color: '#22c55e' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '48px', height: '48px' }}>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div style={{ 'font-size': '1.125rem', 'font-weight': '600', color: '#166534', 'margin-bottom': '0.5rem' }}>
              All Tasks Complete!
            </div>
            <div style={{ 'font-size': '0.875rem', color: '#22c55e' }}>
              {props?.taxPortal?.firstName} has completed all required tasks
            </div>
          </div>
        </Card>
      </Show>

      {/* Signature Validation Modal */}
      <Show when={showValidationModal() && validationRequest()}>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            'background-color': 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': 1000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowValidationModal(false);
            }
          }}
        >
          <div
            style={{
              background: 'white',
              'border-radius': '12px',
              'max-width': '900px',
              'max-height': '90vh',
              overflow: 'auto',
              'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowValidationModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#f1f5f9',
                border: 'none',
                'border-radius': '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'z-index': 10
              }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#64748b' }}>
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
            <SignatureValidationView
              request={validationRequest()!}
              type={validationType()}
            />
          </div>
        </div>
      </Show>

      {/* Not Needed Confirmation Modal */}
      <Show when={showNotNeededModal() && notNeededTask()}>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            'background-color': 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': 1000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNotNeededModal(false);
              setNotNeededTask(null);
            }
          }}
        >
          <div
            style={{
              background: 'white',
              'border-radius': '12px',
              'max-width': '450px',
              width: '100%',
              padding: '1.5rem',
              'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                'border-radius': '10px',
                background: 'rgba(245, 158, 11, 0.1)',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center'
              }}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '24px', height: '24px', color: '#f59e0b' }}>
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 style={{ 'font-size': '1rem', 'font-weight': '600', color: '#1f2937', margin: 0 }}>
                  Mark as Not Needed
                </h3>
                <p style={{ 'font-size': '0.875rem', color: '#6b7280', margin: 0 }}>
                  {notNeededTask()?.title}
                </p>
              </div>
            </div>

            {/* Description */}
            <p style={{ 'font-size': '0.875rem', color: '#4b5563', 'margin-bottom': '1rem' }}>
              This will mark the document as not applicable for this client. They won't be asked to upload it.
            </p>

            {/* Reason Input */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'font-size': '0.875rem', 'font-weight': '500', color: '#374151', 'margin-bottom': '0.5rem' }}>
                Reason (optional)
              </label>
              <input
                type="text"
                value={notNeededReason()}
                onInput={(e) => setNotNeededReason(e.currentTarget.value)}
                placeholder="e.g., Client has no W-2 income"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #d1d5db',
                  'border-radius': '8px',
                  'font-size': '0.875rem',
                  outline: 'none',
                  'box-sizing': 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNotNeededModal(false);
                  setNotNeededTask(null);
                  setNotNeededReason('');
                }}
                style={{
                  padding: '0.625rem 1rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  'border-radius': '8px',
                  'font-size': '0.875rem',
                  'font-weight': '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => notNeededTask() && handleMarkNotNeeded(notNeededTask()!)}
                disabled={markingNotNeeded()}
                style={{
                  padding: '0.625rem 1rem',
                  background: markingNotNeeded() ? '#fbbf24' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  'border-radius': '8px',
                  'font-size': '0.875rem',
                  'font-weight': '500',
                  cursor: markingNotNeeded() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}
              >
                {markingNotNeeded() ? (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}>
                      <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Mark as Not Needed'
                )}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default TasksSection;
