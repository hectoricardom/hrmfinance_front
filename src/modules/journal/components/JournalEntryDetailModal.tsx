import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import AddJournalEntryModal from './AddJournalEntryModal';
import { JournalEntry, JournalEntryLine, entryBookStore } from '../stores/entryBookStore';
import { accountsStore } from '../../accounts/stores/accountsStore';
import { useTranslation } from '../../../translations';
import { generateRandomId } from '../../../services/utils';
import { showToast } from '../../../services/toastService';

interface JournalEntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string | null;
}

const JournalEntryDetailModal: Component<JournalEntryDetailModalProps> = (props) => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = createSignal<'details' | 'lines' | 'reconciliation'>('details');
  const [isEditModalOpen, setIsEditModalOpen] = createSignal(false);

  // Fix Balance State
  const [showFixBalance, setShowFixBalance] = createSignal(false);
  const [selectedAccountId, setSelectedAccountId] = createSignal('');
  const [fixDescription, setFixDescription] = createSignal('');
  const [isFixing, setIsFixing] = createSignal(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [deleteConfirmText, setDeleteConfirmText] = createSignal('');
  
  // Use a memo to always get the latest entry data from the store
  const currentEntry = createMemo(() => {
    if (!props.entryId) return null;
    return entryBookStore.getJournalEntryById(props.entryId);
  });

  const headerStyle = {
    'text-align': 'center',
    'margin-bottom': '2rem',
    position: 'relative'
  };

  const headerButtonStyle = {
    position: 'absolute' as const,
    top: '0',
    right: '0',
    display: 'flex',
    gap: '0.5rem'
  };

  const entryNumberStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase',
    'margin-bottom': '0.5rem'
  };

  const descriptionStyle = {
    'font-size': '1.15rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '1.5rem 0 0.5rem'
  };

  const amountStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    'margin-bottom': '0.5rem'
  };

  const statusStyle = {
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    'margin-bottom': '1rem',
    display: 'inline-block'
  };

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const tabsStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '1.5rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    transition: 'all 0.2s ease'
  });

  const lineRowStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 1.25fr 2.75fr 1fr 1fr',
    gap: '1rem',
    padding: '1rem 0',
    'border-bottom': '1px solid var(--border-color)',
    'align-items': 'center'
  };

  const lineHeaderStyle = {
    ...lineRowStyle,
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'border-bottom': '2px solid var(--border-color)'
  };

  const balanceCheckStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '1rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const getStatusColor = (status: JournalEntry['status']) => {
    const colors = {
      'draft': { bg: '#fff3cd', color: '#856404' },
      'posted': { bg: '#d4edda', color: '#155724' },
      'void': { bg: '#f8d7da', color: '#721c24' }
    };
    return colors[status] || { bg: '#fff3cd', color: '#856404' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | number) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = () => {
    const entry = currentEntry()!;
    if (entry?.status === 'posted') {
      if (!confirm(t('journal.confirmEditPosted', 'Este asiento ha sido contabilizado. Editar creará una nueva copia borrador. ¿Continuar?'))) {
        return;
      }
    }
    setIsEditModalOpen(true);
  };

  const handlePost = () => {
    if (!currentEntry()) return;
    
    if (confirm(t('journal.confirmPost', '¿Está seguro de que desea contabilizar este asiento contable? Esta acción no se puede deshacer.'))) {
      try {
        entryBookStore.postJournalEntry(currentEntry()!.id);
      } catch (error) {
        alert(error instanceof Error ? error.message : t('forms.errorPostingEntry', 'Ocurrió un error al contabilizar el asiento'));
      }
    }
  };

  const handleVoid = () => {
    if (!currentEntry()) return;

    if (confirm(t('journal.confirmVoid', '¿Está seguro de que desea anular este asiento contable?'))) {
      entryBookStore.voidJournalEntry(currentEntry()!.id);
    }
  };

  const handleDelete = async () => {
    const entry = currentEntry();
    if (!entry) return;

    // Require typing the entry number to confirm
    if (deleteConfirmText() !== (entry.entryNumber || entry.id)) {
      showToast(t('journal.deleteConfirmMismatch', 'El número de asiento no coincide'), 'warning');
      return;
    }

    setIsDeleting(true);

    try {
      await entryBookStore.deleteJournalEntry(entry.id);
      showToast(t('journal.entryDeleted', 'Asiento eliminado exitosamente'), 'success');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      props.onClose();
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast(
        error instanceof Error ? error.message : t('journal.deleteError', 'Error al eliminar el asiento'),
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirm = () => {
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  // Calculate balance difference
  const getBalanceDifference = () => {
    const entry = currentEntry();
    if (!entry) return 0;
    return entry.totalDebits - entry.totalCredits;
  };



  const getBankLines = createMemo(() => {
    const filterL =(ln:any)=>{
      let acc = accountsStore.getAccountById(ln.accountId);
      return acc?.bankAccountNumber ? ln: null;
    }
    const entry = currentEntry();
    if (!entry) return [];
    return entry.lines.filter(filterL)
  });

  // Handle fix balance - add a new line to balance the entry
  const handleFixBalance = async () => {
    const entry = currentEntry();
    if (!entry) return;

    const accountId = selectedAccountId();
    if (!accountId) {
      showToast(t('journal.selectAccountToFix', 'Seleccione una cuenta para ajustar'), 'warning');
      return;
    }

    const difference = getBalanceDifference();
    if (difference === 0) {
      showToast(t('journal.alreadyBalanced', 'El asiento ya está balanceado'), 'info');
      setShowFixBalance(false);
      return;
    }

    setIsFixing(true);

    try {
      const account = accountsStore.getAccountById(accountId);
      if (!account) {
        showToast(t('journal.accountNotFound', 'Cuenta no encontrada'), 'error');
        return;
      }

      // Create new line to fix the balance
      // If difference > 0, we have more debits than credits, so add a credit
      // If difference < 0, we have more credits than debits, so add a debit
      const isDebit = difference < 0;
      const amount = Math.abs(difference);

      const newLine: JournalEntryLine = {
        id: generateRandomId(),
        accountId: accountId,
        accountNumber: account.accountNumber,
        accountName: account.name,
        description: fixDescription() || t('journal.balanceAdjustment', 'Ajuste de balance'),
        isDebit: isDebit,
        amount: amount,
        debitAmount: isDebit ? amount : 0,
        creditAmount: isDebit ? 0 : amount,
        reconciled: false
      };

      // Update lines array
      const updatedLines = [...entry.lines, newLine];

      // Recalculate totals
      const newTotalDebits = updatedLines.reduce((sum, line) => {
        if (line.isDebit) return sum + parseFloat(line.amount.toString());
        return sum + (line.debitAmount || 0);
      }, 0);

      const newTotalCredits = updatedLines.reduce((sum, line) => {
        if (line.isDebit === false) return sum + parseFloat(line.amount.toString());
        if (line.isDebit === undefined) return sum + (line.creditAmount || 0);
        return sum;
      }, 0);

      // Update the journal entry
      await entryBookStore.updateJournalEntry(entry.id, {
        lines: updatedLines,
        totalDebits: newTotalDebits,
        totalCredits: newTotalCredits
      });

      showToast(t('journal.balanceFixed', 'Balance corregido exitosamente'), 'success');
      setShowFixBalance(false);
      setSelectedAccountId('');
      setFixDescription('');

    } catch (error) {
      console.error('Error fixing balance:', error);
      showToast(t('journal.errorFixingBalance', 'Error al corregir el balance'), 'error');
    } finally {
      setIsFixing(false);
    }
  };

  // Get available accounts for fixing balance
  const getAvailableAccounts = () => {
    return accountsStore.accounts.filter(acc => acc.isActive);
  };

  

  return (
    <>
      <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('journal.entryDetails', 'Detalles del Asiento Contable')}  maxWidth='80vw'>
        {!currentEntry() ? (
          <div style={{ 
            'text-align': 'center', 
            padding: '3rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ 'font-size': '1.5rem', 'margin-bottom': '1rem' }}>⚠️</div>
            <div style={{ 'font-size': '1.1rem', 'margin-bottom': '0.5rem' }}>{t('journal.entryNotFound', 'Asiento No Encontrado')}</div>
            <div style={{ 'font-size': '0.875rem' }}>
              {t('journal.entryNotFoundMessage', 'El asiento contable que busca no se pudo encontrar o puede haber sido eliminado.')}
            </div>
            <div style={{ 'margin-top': '2rem' }}>
              <Button variant="primary" onClick={props.onClose}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : (
          (() => {
            const entry = currentEntry()!;
            const statusColor = getStatusColor(entry.status);
            const isBalanced = () => entry.totalDebits - entry.totalCredits === 0;

            return (
              <>
                <div style={headerStyle}>
          <div style={headerButtonStyle}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEdit}
              title={t('journal.editEntryTooltip', 'Editar este asiento contable')}
            >
              {t('common.edit')}
            </Button>
            {entry.status === 'draft' && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handlePost} 
                disabled={!isBalanced()}
                title={!isBalanced() ? t('journal.entryMustBeBalanced', 'El asiento debe estar balanceado para contabilizar') : t('journal.postEntryTooltip', 'Contabilizar este asiento contable')}
              >
                {t('journal.post', 'Contabilizar')}
              </Button>
            )}
            {entry.status === 'posted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoid}
                style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                title={t('journal.voidEntryTooltip', 'Anular este asiento contable')}
              >
                {t('entryBooks.void', 'Anular')}
              </Button>
            )}
            {/*(entry.status === 'draft' || entry.status === 'void') && ( )*/}
              <Button
                variant="outline"
                size="sm"
                onClick={openDeleteConfirm}
                style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                title={t('journal.deleteEntryTooltip', 'Eliminar este asiento contable permanentemente')}
              >
                🗑️
              </Button>
           
          </div>
          
          <div style={entryNumberStyle}>{entry.entryNumber || entry.comprobanteId || entry.id || '-'}</div>
          <div style={descriptionStyle}>{entry.description}</div>
          <div style={amountStyle}>{formatCurrency(entry.totalDebits)}</div>
          <div 
            style={{
              ...statusStyle,
              background: statusColor.bg,
              color: statusColor.color
            }}
          >
            {t(`journal.${entry.status || "draft"}`, entry.status || "draft")}
          </div>
        </div>


        <div style={tabsStyle}>
          <button 
            style={tabStyle(activeTab() === 'details')}
            onClick={() => setActiveTab('details')}
          >
            {t('common.details')}
          </button>
          <button 
            style={tabStyle(activeTab() === 'lines')}
            onClick={() => setActiveTab('lines')}
          >
            {t('journal.journalLines', 'Líneas del Asiento')} ({entry.lines.length})
          </button>
          <Show when={getBankLines().length}>
          <button 
            style={tabStyle(activeTab() === 'reconciliation')}
            onClick={() => setActiveTab('reconciliation')}
          >
            {t('banking.reconciliation', 'Conciliación')} ({getBankLines().filter(line => line?.isReconciled).length}/{getBankLines().length})
          </button>
          </Show>
        </div>

      

        {activeTab() === 'details' && (
          <div>
            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('common.date')}</span>
              <span style={valueStyle}>{formatDate(entry.createAt || entry.date)}</span>
            </div>
            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('journal.reference')}</span>
              <span style={valueStyle}>{entry.document || t('common.notAvailable', 'N/D')}</span>
            </div>
            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('journal.totalDebit')}</span>
              <span style={valueStyle}>{formatCurrency(entry.totalDebits)}</span>
            </div>
            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('journal.totalCredit')}</span>
              <span style={valueStyle}>{formatCurrency(entry.totalCredits)}</span>
            </div>
            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('journal.balanceStatus', 'Estado del Balance')}</span>
              <span style={{
                ...valueStyle,
                color: isBalanced()? '#4caf50' : '#f44336'
              }}>
                {isBalanced()? `${t('journal.balanced')} ✓` : `${t('journal.unbalanced', 'Desbalanceado')} (${formatCurrency(entry.totalDebits - entry.totalCredits)} ${t('journal.difference', 'diferencia')})`}
              </span>
            </div>
            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('journal.createdBy')}</span>
              <span style={valueStyle}>{entry.createdBy}</span>
            </div>
            <div style={detailRowStyle}>
              <span style={labelStyle}>{t('journal.createdAt', 'Creado En')}</span>
              <span style={valueStyle}>{formatDateTime(entry.createdAt)}</span>
            </div>
            {entry.postedAt && (
              <div style={detailRowStyle}>
                <span style={labelStyle}>{t('journal.postedAt', 'Contabilizado En')}</span>
                <span style={valueStyle}>{formatDateTime(entry.postedAt)}</span>
              </div>
            )}
            
            <div style={{
              'margin-top': '2rem',
              'padding-top': '1rem',
              'border-top': '2px solid var(--border-color)'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1rem'
              }}>
                <h4 style={{ margin: '0', 'font-size': '1rem' }}>{t('journal.quickActions', 'Acciones Rápidas')}</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleEdit}
                  >
                    ✏️ {t('journal.editEntry')}
                  </Button>
                  {entry.status === 'draft' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePost} 
                      disabled={!isBalanced}
                      style={{
                        'border-color': isBalanced()? '#4caf50' : '#f44336',
                        color: isBalanced()? '#4caf50' : '#f44336'
                      }}
                    >
                      {isBalanced()? `✓ ${t('journal.postEntry', 'Contabilizar Asiento')}` : `⚠️ ${t('journal.fixBalance', 'Corregir Balance')}`}
                    </Button>
                  )}
                  {entry.status === 'posted' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleVoid} 
                      style={{ color: '#dc3545', 'border-color': '#dc3545' }}
                    >
                      🗑️ {t('journal.voidEntry', 'Anular Asiento')}
                    </Button>
                  )}
                </div>
              </div>
              
              <div style={{
                padding: '1rem',
                background: entry.status === 'draft' ? '#fff3cd' : entry.status === 'posted' ? '#d4edda' : '#f8d7da',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem'
              }}>
                {entry.status === 'draft' && (
                  <div>
                    <strong>{t('journal.draftEntry', 'Asiento Borrador')}:</strong> {t('journal.draftEntryDescription', 'Este asiento puede ser editado y contabilizado.')}
                    {!isBalanced()&& ` ⚠️ ${t('journal.entryMustBeBalancedBeforePosting', 'El asiento debe estar balanceado antes de contabilizar.')}`}
                  </div>
                )}
                {entry.status === 'posted' && (
                  <div>
                    <strong>{t('journal.postedEntry', 'Asiento Contabilizado')}:</strong> {t('journal.postedEntryDescription', 'Este asiento ha sido contabilizado en el libro mayor. Editar creará una nueva copia borrador.')}
                  </div>
                )}
                {entry.status === 'void' && (
                  <div>
                    <strong>{t('journal.voidEntry')}:</strong> {t('journal.voidEntryDescription', 'Este asiento ha sido anulado y no puede ser modificado.')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
















        {activeTab() === 'lines' && (
          <div>
            <div style={lineHeaderStyle}>
              <div>{t('journal.account')}</div>
              <div>{t('taxPortal.document')}</div>
              <div>{t('common.description')}</div>
              <div>{t('journal.debit')}</div>
              <div>{t('journal.credit')}</div>
              
            </div>
            <For each={entry.lines}>
              {(line) => (
                <div style={lineRowStyle}>
                
                  <div>
                    <div style={{ 'font-weight': '500' }}>{accountsStore.getAccountById(line?.accountId)?.name|| ""}</div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      {accountsStore.getAccountById(line?.accountId)?.accountNumber || line.accountNumber}
                    </div>
                    
                    <Show when={accountsStore.getAccountById(line?.accountId)?.isBankAccount}>
                    {line?.isReconciled ? (
                      <div style={{
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.5rem',
                        color: '#4caf50',
                        'font-size': '0.875rem'
                      }}>
                        <span style={{ 'font-weight': '600' }}>✓ {t('banking.reconciled')}</span>
                        {line?.isReconciledWith && (
                          <span style={{ 
                            'font-size': '0.75rem', 
                            color: 'var(--text-muted)',
                            'font-style': 'italic'
                          }}>
                            ({line?.isReconciledWith})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        //color: 'var(--text-muted)',
                        'font-size': '0.65rem',
                        color: '#f44336',
                      }}>
                        {t('banking.notReconciled', 'No Conciliado')}
                      </div>
                    )}
                  </Show>
                  </div>
                  <div style={{ 'font-size': '0.875rem', 'max-width': '200px' }}>
                    {line.document || '-'}
                  </div>
                  <div style={{ 'font-size': '0.875rem' }}>
                    {line.description || '-'}
                  </div>
                  
                  <div style={{ 'font-weight': '600', color: line.isDebit ? '#4caf50' : 'var(--text-muted)' }}>
                    {line.isDebit ? formatCurrency(line.amount) : '-'}
                  </div>
                  <div style={{ 'font-weight': '600', color: !line.isDebit ? '#f44336' : 'var(--text-muted)' }}>
                    {!line.isDebit ? formatCurrency(line.amount) : '-'}
                  </div>
                  
                </div>
              )}
            </For>
            
            {/* notBalanced section  */}
            <div style={balanceCheckStyle}>
              <div>
                <strong>{t('journal.totalDebit')}:</strong> {formatCurrency(entry.totalDebits)}
              </div>
              <div>
                <strong>{t('journal.totalCredit')}:</strong> {formatCurrency(entry.totalCredits)}
              </div>
              <div style={{
                color: isBalanced() ? '#4caf50' : '#f44336',
                'font-weight': '600',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                {isBalanced() ? `✓ ${t('journal.balanced')}` : `⚠️ ${t('journal.notBalanced', 'No Balanceado')}`}
                <Show when={!isBalanced() }>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFixBalance(!showFixBalance())}
                    style={{
                      'border-color': '#f44336',
                      color: '#f44336',
                      'margin-left': '0.5rem'
                    }}
                  >
                    {showFixBalance() ? t('common.cancel') : `🔧 ${t('journal.fixBalance', 'Corregir')}`}
                  </Button>
                </Show>
              </div>
            </div>

            {/* Fix Balance UI */}
            <Show when={showFixBalance() && !isBalanced() }>
              <div style={{
                'margin-top': '1rem',
                padding: '1.5rem',
                background: '#fff3cd',
                'border-radius': 'var(--border-radius)',
                border: '2px solid #ffc107'
              }}>
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  'margin-bottom': '1rem'
                }}>
                  <span style={{ 'font-size': '1.5rem' }}>🔧</span>
                  <h4 style={{ margin: 0 }}>{t('journal.fixBalanceTitle', 'Corregir Balance del Asiento')}</h4>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'white',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'margin-bottom': '0.5rem',
                    'font-size': '0.9rem'
                  }}>
                    <span>{t('journal.currentDifference', 'Diferencia actual')}:</span>
                    <span style={{
                      'font-weight': '700',
                      color: getBalanceDifference() > 0 ? '#4caf50' : '#f44336'
                    }}>
                      {formatCurrency(Math.abs(getBalanceDifference()))}
                      {getBalanceDifference() > 0 ? ` (${t('journal.moreDebits', 'más débitos')})` : ` (${t('journal.moreCredits', 'más créditos')})`}
                    </span>
                  </div>
                  <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
                    {getBalanceDifference() > 0
                      ? t('journal.willAddCredit', 'Se agregará un CRÉDITO para balancear')
                      : t('journal.willAddDebit', 'Se agregará un DÉBITO para balancear')}
                  </div>
                </div>

                <div style={{ 'margin-bottom': '1rem' }}>
                  <label style={{
                    display: 'block',
                    'font-weight': '600',
                    'margin-bottom': '0.5rem',
                    'font-size': '0.9rem'
                  }}>
                    {t('journal.selectAccountToCharge', 'Seleccione la cuenta para cargar la diferencia')} *
                  </label>
                  <select
                    value={selectedAccountId()}
                    onChange={(e) => setSelectedAccountId(e.currentTarget.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      'font-size': '1rem',
                      background: 'white'
                    }}
                  >
                    <option value="">{t('journal.selectAccount', '-- Seleccione una cuenta --')}</option>
                    <For each={getAvailableAccounts()}>
                      {(account) => (
                        <option value={account.id}>
                          {account.accountNumber} - {account.name} ({account.type})
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <div style={{ 'margin-bottom': '1rem' }}>
                  <label style={{
                    display: 'block',
                    'font-weight': '600',
                    'margin-bottom': '0.5rem',
                    'font-size': '0.9rem'
                  }}>
                    {t('journal.lineDescription', 'Descripción de la línea')} ({t('common.optional', 'opcional')})
                  </label>
                  <input
                    type="text"
                    value={fixDescription()}
                    onInput={(e) => setFixDescription(e.currentTarget.value)}
                    placeholder={t('journal.balanceAdjustment', 'Ajuste de balance')}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      'font-size': '1rem'
                    }}
                  />
                </div>

                <Show when={selectedAccountId()}>
                  <div style={{
                    padding: '1rem',
                    background: '#e8f5e9',
                    'border-radius': 'var(--border-radius-sm)',
                    'margin-bottom': '1rem',
                    border: '1px solid #c8e6c9'
                  }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                      {t('journal.previewNewLine', 'Vista previa de la nueva línea')}:
                    </div>
                    <div style={{
                      display: 'grid',
                      'grid-template-columns': '2fr 1fr 1fr',
                      gap: '1rem',
                      'font-size': '0.9rem'
                    }}>
                      <div>
                        <strong>{t('journal.account')}:</strong> {accountsStore.getAccountById(selectedAccountId())?.name}
                      </div>
                      <div style={{ color: getBalanceDifference() < 0 ? '#4caf50' : 'var(--text-muted)' }}>
                        <strong>{t('journal.debit')}:</strong> {getBalanceDifference() < 0 ? formatCurrency(Math.abs(getBalanceDifference())) : '-'}
                      </div>
                      <div style={{ color: getBalanceDifference() > 0 ? '#f44336' : 'var(--text-muted)' }}>
                        <strong>{t('journal.credit')}:</strong> {getBalanceDifference() > 0 ? formatCurrency(Math.abs(getBalanceDifference())) : '-'}
                      </div>
                    </div>
                  </div>
                </Show>

                <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowFixBalance(false);
                      setSelectedAccountId('');
                      setFixDescription('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleFixBalance}
                    disabled={!selectedAccountId() || isFixing()}
                    style={{
                      background: '#4caf50',
                      'border-color': '#4caf50'
                    }}
                  >
                    {isFixing() ? t('common.saving', 'Guardando...') : `✓ ${t('journal.applyFix', 'Aplicar Corrección')}`}
                  </Button>
                </div>
              </div>
            </Show>















          </div>
        )}
        


















        {getBankLines().length && activeTab() === 'reconciliation' && (
          <div>
            <div style={{
              'margin-bottom': '1.5rem',
              padding: '1rem',
              background: getBankLines().every(line => line?.isReconciled) ? '#e8f5e8' : 
                         getBankLines().some(line => line?.isReconciled) ? '#fff3cd' : '#ffebee',
              'border-radius': 'var(--border-radius)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ 
                display: 'flex', 
                'align-items': 'center', 
                gap: '0.5rem',
                'margin-bottom': '1rem'
              }}>
                <span style={{ 'font-size': '1.5rem' }}>
                  {getBankLines().every(line => line?.isReconciled) ? '✅' : 
                   getBankLines().some(line => line?.isReconciled) ? '🔄' : '⏳'}
                </span>
                <h3 style={{ margin: '0', 'font-size': '1.2rem' }}>
                  {getBankLines().every(line => line?.isReconciled) ? t('journal.fullyReconciled', 'Fully Reconciled') : 
                   getBankLines().some(line => line?.isReconciled) ? t('journal.partiallyReconciled', 'Partially Reconciled') : t('journal.unreconciled', 'Unreconciled')}
                </h3>
              </div>
              
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                    {getBankLines().length}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('journal.totalLines', 'Total Lines')}
                  </div>
                </div>
                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#4caf50' }}>
                    {getBankLines().filter(line => line?.isReconciled).length}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('journal.reconciled', 'Reconciled')}
                  </div>
                </div>
                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#f44336' }}>
                    {getBankLines().filter(line => !line?.isReconciled).length}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('journal.pending', 'Pending')}
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciled Lines Section */}
            {getBankLines().filter(line => line?.isReconciled).length > 0 && (
              <div style={{ 'margin-bottom': '1.5rem' }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  'font-size': '1.1rem',
                  color: '#4caf50',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  ✅ {t('journal.reconciledLines', 'Reconciled Lines')} ({getBankLines().filter(line => line?.isReconciled).length})
                </h4>
                {getBankLines().filter(line => line?.isReconciled).map(line => (
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': '2fr 2fr 1fr 1fr 1.5fr',
                    gap: '1rem',
                    padding: '0.75rem',
                    'margin-bottom': '0.5rem',
                    background: '#f0f9f0',
                    'border-radius': 'var(--border-radius-sm)',
                    'align-items': 'center',
                    'font-size': '0.875rem'
                  }}>
                    <div>
                      <div style={{ 'font-weight': '500' }}>{accountsStore.getAccountById(line?.accountId)?.name}</div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {line?.accountNumber}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {line.description || t('journal.noDescription', 'No description')}
                    </div>
                    <div style={{ 'font-weight': '600', color: line.debitAmount > 0 ? '#4caf50' : 'var(--text-muted)' }}>
                      {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                    </div>
                    <div style={{ 'font-weight': '600', color: line.creditAmount > 0 ? '#f44336' : 'var(--text-muted)' }}>
                      {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                    </div>
                    <div style={{ color: '#4caf50' }}>
                      <div style={{ 'font-weight': '500' }}>✓ {t('journal.matched', 'Matched')}</div>
                      {line?.isReconciledWith && (
                        <div style={{ 'font-size': '0.75rem', 'font-style': 'italic' }}>
                          → {line?.isReconciledWith}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unreconciled Lines Section */}
            {getBankLines().filter(line => !line?.isReconciled).length > 0 && (
              <div style={{ 'margin-bottom': '1.5rem' }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  'font-size': '1.1rem',
                  color: '#f44336',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  ⏳ {t('journal.unreconciledLines', 'Unreconciled Lines')} ({getBankLines().filter(line => !line?.isReconciled).length})
                </h4>
                {getBankLines().filter(line => !line?.isReconciled).map(line => (
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': '2fr 2fr 1fr 1fr 1.5fr',
                    gap: '1rem',
                    padding: '0.75rem',
                    'margin-bottom': '0.5rem',
                    background: '#fff9f0',
                    'border-radius': 'var(--border-radius-sm)',
                    'align-items': 'center',
                    'font-size': '0.875rem',
                    border: '1px solid #ffe0b3'
                  }}>
                    <div>
                      <div style={{ 'font-weight': '500' }}>{accountsStore.getAccountById(line?.accountId)?.name}</div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {line?.accountNumber}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {line.description || t('journal.noDescription', 'No description')}
                    </div>
                    <div style={{ 'font-weight': '600', color: line.debitAmount > 0 ? '#4caf50' : 'var(--text-muted)' }}>
                      {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                    </div>
                    <div style={{ 'font-weight': '600', color: line.creditAmount > 0 ? '#f44336' : 'var(--text-muted)' }}>
                      {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                    </div>
                    <div style={{ color: '#f44336' }}>
                      <div style={{ 'font-weight': '500' }}>⏳ {t('journal.pending', 'Pendiente')}</div>
                      {accountsStore.getAccountById(line.accountId)?.isBankAccount && (
                        <div style={{ 'font-size': '0.75rem', 'font-style': 'italic' }}>
                          {t('journal.bankAccount', 'Cuenta bancaria')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {getBankLines().filter(line => !line?.isReconciled && accountsStore.getAccountById(line.accountId)?.isBankAccount).length > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    background: '#ffebee',
                    'border-radius': 'var(--border-radius-sm)',
                    'margin-top': '1rem',
                    border: '1px solid #ffcdd2'
                  }}>
                    <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', color: '#f44336' }}>
                      💡 {t('journal.reconciliationTip', 'Consejo de Conciliación')}
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {t('journal.unreconciledBankTransactions', 'Este asiento tiene transacciones bancarias no conciliadas.')}
                      {' '}{t('journal.visitBankConsolidations', 'Visit Bank Consolidations to reconcile these transactions')}
                    </div>
                  </div>
                )}
              </div>

            )}


            <div style={{ 
              'margin-top': '1rem', 
              padding: '1rem',
              background: getBankLines().some(line => line?.isReconciled) ? '#e8f5e8' : '#fff3cd',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem'
            }}>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                <strong>🔗 {t('journal.reconciliationSummary', 'Reconciliation Summary')}</strong>
              </div>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ 'margin-bottom': '0.25rem' }}>
                    <strong>{t('journal.totalLines', 'Total Lines')}:</strong> {getBankLines().length}
                  </div>
                  <div style={{ 'margin-bottom': '0.25rem', color: '#4caf50' }}>
                    <strong>{t('journal.reconciled', 'Reconciled')}:</strong> {getBankLines().filter(line => line?.isReconciled).length}
                  </div>
                  <div style={{ color: '#f44336' }}>
                    <strong>{t('journal.unreconciled', 'Unreconciled')}:</strong> {getBankLines().filter(line => !line?.isReconciled).length}
                  </div>
                </div>
                <div>
                  <div style={{ 'margin-bottom': '0.25rem' }}>
                    <strong>{t('journal.bankAccounts', 'Bank Accounts')}:</strong> {
                      getBankLines().filter(line => accountsStore.getAccountById(line.accountId)?.isBankAccount).length
                    }
                  </div>
                  <div style={{ 'margin-bottom': '0.25rem', color: '#4caf50' }}>
                    <strong>{t('journal.bankReconciled', 'Bank Reconciled')}:</strong> {
                      getBankLines().filter(line => accountsStore.getAccountById(line.accountId)?.isBankAccount && line?.isReconciled).length
                    }
                  </div>
                  {getBankLines().filter(line => accountsStore.getAccountById(line.accountId)?.isBankAccount && !line?.isReconciled).length > 0 && (
                    <div style={{ color: '#f44336' }}>
                      <strong>{t('journal.bankPending', 'Bank Pending')}:</strong> {
                        getBankLines().filter(line => accountsStore.getAccountById(line.accountId)?.isBankAccount && !line?.isReconciled).length
                      }
                    </div>
                  )}
                </div>
              </div>
              
              {getBankLines().filter(line => line?.isReconciled).length > 0 && (
                <div style={{ 
                  'margin-top': '0.75rem',
                  'padding-top': '0.75rem',
                  'border-top': '1px solid var(--border-color)'
                }}>
                  <div style={{ 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                    {t('journal.reconciledLines', 'Reconciled Lines')}:
                  </div>
                  {getBankLines().filter(line => line?.isReconciled).map(line => (
                    <div style={{ 
                      display: 'flex', 
                      'justify-content': 'space-between',
                      'margin-bottom': '0.25rem',
                      'font-size': '0.8rem'
                    }}>
                      <span>{line.accountName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {line?.isReconciledWith ? `→ ${line?.isReconciledWith}` : t('journal.manual', 'Manual')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {getBankLines().filter(line => !line?.isReconciled && accountsStore.getAccountById(line.accountId)?.isBankAccount).length > 0 && (
                <div style={{
                  'margin-top': '0.75rem',
                  'padding-top': '0.75rem',
                  'border-top': '1px solid var(--border-color)'
                }}>
                  <div style={{ 'margin-bottom': '0.5rem', 'font-weight': '500', color: '#f44336' }}>
                    ⚠️ {t('journal.pendingBankReconciliation', 'Pending Bank Reconciliation')}:
                  </div>
                  {getBankLines().filter(line => !line?.isReconciled && accountsStore.getAccountById(line.accountId)?.isBankAccount).map(line => (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'margin-bottom': '0.25rem',
                      'font-size': '0.8rem',
                      color: '#f44336'
                    }}>
                      <span>{accountsStore.getAccountById(line.accountId)?.name || line.accountId}</span>
                      <span>{formatCurrency(line.debitAmount || line.creditAmount)}</span>
                    </div>
                  ))}
                  <div style={{
                    'margin-top': '0.5rem',
                    'font-size': '0.75rem',
                    color: 'var(--text-muted)',
                    'font-style': 'italic'
                  }}>
                    {t('journal.visitBankConsolidations', 'Visit Bank Consolidations to reconcile these transactions')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={buttonGroupStyle}>
          <Button variant="secondary" onClick={props.onClose}>
            {t('common.close')}
          </Button>
          <Button variant="primary" onClick={handleEdit}>
            {t('journal.editEntry')}
          </Button>
          {entry.status === 'draft' && (
            <Button 
              variant="outline" 
              onClick={handlePost} 
              disabled={!isBalanced}
              style={{
                'border-color': '#4caf50',
                color: !isBalanced()? 'var(--text-muted)' : '#4caf50'
              }}
            >
              {!isBalanced()? t('journal.entryNotBalanced', 'Asiento No Balanceado') : t('journal.postEntry', 'Contabilizar Asiento')}
            </Button>
          )}
          {entry.status === 'posted' && (
            <Button 
              variant="outline" 
              onClick={handleVoid} 
              style={{ color: '#dc3545', 'border-color': '#dc3545' }}
            >
              {t('journal.voidEntry', 'Anular Asiento')}
            </Button>
          )}
                </div>
              </>
            );
          })()
        )}
      </Modal>

      {currentEntry() && (
        <AddJournalEntryModal
          isOpen={isEditModalOpen()}
          onClose={() => {
            setIsEditModalOpen(false);
            // Keep the detail modal open to show updated data
          }}
          editEntry={currentEntry()!}
        />
      )}







      {/* Delete Confirmation Modal */}
      <Show when={showDeleteConfirm() && currentEntry()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 10000
        }}>
          <div style={{
            background: 'white',
            'border-radius': 'var(--border-radius)',
            'max-width': '480px',
            width: '90%',
            padding: '0',
            'box-shadow': '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}>
            {/* Header - Danger zone */}
            <div style={{
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              padding: '.5rem',
              color: 'white',
              'text-align': 'center'
            }}>
              <div style={{ 'font-size': '3rem', 'margin-bottom': '0.5rem' }}>⚠️</div>
              <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>
                {t('journal.deleteEntryTitle', 'Eliminar Asiento Contable')}
              </h3>
              <div style={{ 'font-size': '0.9rem', opacity: 0.9 }}>
                {t('journal.deleteWarning', 'Esta acción no se puede deshacer')}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                padding: '1rem',
                background: '#fff3cd',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '.85rem',
                border: '1px solid #ffc107'
              }}>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#856404' }}>
                  {t('journal.entryToDelete', 'Asiento a eliminar')}:
                </div>
                <div style={{
                  display: 'grid',
                  'grid-template-columns': '1fr 1fr',
                  gap: '0.5rem',
                  'font-size': '0.9rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('journal.entryNumber', 'Número')}:</span>{' '}
                    <strong>{(currentEntry()?.entryNumber || currentEntry()?.id)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('common.status', 'Estado')}:</span>{' '}
                    <strong>{currentEntry()?.status}</strong>
                  </div>
                  <div style={{ 'grid-column': '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('common.description', 'Descripción')}:</span>{' '}
                    <strong>{currentEntry()?.description}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('journal.totalDebit', 'Total Débito')}:</span>{' '}
                    <strong>{formatCurrency(currentEntry()?.totalDebits || 0)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('journal.lines', 'Líneas')}:</span>{' '}
                    <strong>{currentEntry()?.lines.length}</strong>
                  </div>
                </div>
              </div>

              <div style={{ 'margin-bottom': '1.5rem' }}>
                <label style={{
                  display: 'block',
                  'font-weight': '600',
                  'margin-bottom': '0.5rem',
                  'font-size': '0.9rem'
                }}>
                  {t('journal.confirmDeleteLabel', 'Para confirmar, escriba el número del asiento')}:{' '}
                  <span style={{ color: '#dc3545', 'font-weight': '700' }}>{(currentEntry()?.entryNumber || currentEntry()?.id)}</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText()}
                  onInput={(e) => setDeleteConfirmText(e.currentTarget.value)}
                  placeholder={(currentEntry()?.entryNumber || currentEntry()?.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    'border-radius': 'var(--border-radius-sm)',
                    border: deleteConfirmText() === (currentEntry()?.entryNumber || currentEntry()?.id)
                      ? '2px solid #dc3545'
                      : '1px solid var(--border-color)',
                    'font-size': '1rem',
                    'text-align': 'center',
                    'letter-spacing': '1px',
                    'font-weight': '600'
                  }}
                  disabled={isDeleting()}
                />
                <Show when={deleteConfirmText() && deleteConfirmText() !== (currentEntry()?.entryNumber || currentEntry()?.id)}>
                  <div style={{
                    'margin-top': '0.5rem',
                    'font-size': '0.8rem',
                    color: '#dc3545'
                  }}>
                    {t('journal.deleteConfirmMismatch', 'El número de asiento no coincide')}
                  </div>
                </Show>
              </div>

              <div style={{
                padding: '.5rem',
                background: '#ffebee',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.85rem',
                color: '#c62828',
                'margin-bottom': '.1rem'
              }}>
                <strong>{t('common.warning', 'Advertencia')}:</strong>{' '}
                {t('journal.deleteConsequences', 'Al eliminar este asiento se eliminarán permanentemente todas las líneas y movimientos asociados. Esta operación no afecta los asientos contabilizados (posted).')}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '.5rem 1.5rem',
              background: 'var(--gray-50)',
              'border-top': '1px solid var(--border-color)',
              display: 'flex',
              gap: '1rem',
              'justify-content': 'flex-end'
            }}>
              <Button
                variant="secondary"
                onClick={closeDeleteConfirm}
                disabled={isDeleting()}
              >
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                disabled={deleteConfirmText() !== (currentEntry()?.entryNumber || currentEntry()?.id)  || isDeleting()}
                style={{
                  background: deleteConfirmText() === (currentEntry()?.entryNumber || currentEntry()?.id)  ? '#dc3545' : '#ccc',
                  'border-color': deleteConfirmText() === (currentEntry()?.entryNumber || currentEntry()?.id)  ? '#dc3545' : '#ccc'
                }}
              >
                {isDeleting()
                  ? t('common.deleting', 'Eliminando...')
                  : `🗑️ ${t('journal.confirmDelete', 'Eliminar Asiento')}`
                }
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default JournalEntryDetailModal;