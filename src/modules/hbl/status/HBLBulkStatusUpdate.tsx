import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { parseAndUpdateHBLs, statusAllList, BulkUpdateResponse } from './hblUpdateService';
import { parseHBLNumbers, getHBLFormat } from '../data/hblParser';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import UserSelector, { SelectedUser } from '../components/UserSelector';
import { inventoryApi } from '../../../services/apiAdapter';
import { devLog } from '../../../services/utils';

interface HBLBulkStatusUpdateProps {
  onClose?: () => void;
  onSuccess?: (response: BulkUpdateResponse) => void;
}

const HBLBulkStatusUpdate: Component<HBLBulkStatusUpdateProps> = (props) => {
  const { t } = useTranslation();
  const [inputText, setInputText] = createSignal('');
  const [selectedStatus, setSelectedStatus] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [parsedHBLs, setParsedHBLs] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [response, setResponse] = createSignal<BulkUpdateResponse | null>(null);
  const [selectedUser, setSelectedUser] = createSignal<SelectedUser | null>(null);
  const [copied, setCopied] = createSignal(false);

  // Filter status locations based on user permissions
  const allowedStatusLocations = createMemo(() => {
    return authStore.filterAllowedStatusLocations(statusAllList);
  });

  const handleParseText = () => {
    const hbls = parseHBLNumbers(inputText());
    setParsedHBLs(hbls);
    setCopied(false); // Reset copied state when parsing new HBLs
  };

  const handleCopyAllHBLs = async () => {
    const hblList = parsedHBLs().join('\n');

    try {
      await navigator.clipboard.writeText(hblList);
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      devLog('Failed to copy HBLs:', error);
      alert('Error al copiar HBLs al portapapeles');
    }
  };

  const handleUpdateStatuses = async () => {
    if (!selectedStatus() || parsedHBLs().length === 0) {
      alert(t('hbl.bulkUpdate.selectStatusAndParse', 'Please select a status and parse HBLs first'));
      return;
    }

    setLoading(true);
    setResponse(null);


    try {
      let result:any = {}
      /* 
      const result = await parseAndUpdateHBLs(
        inputText(),
        selectedStatus(),
        notes() || undefined,
        selectedUser() || undefined
      );
      */
      /// 
     let hblList =  parsedHBLs().map(g =>  {

      
        let params = {
            hbl: g,
            status: selectedStatus(),
            userId: selectedUser()?.userId,
            userName: selectedUser()?.email,
            timeStamp: (new Date()).getTime()
        }
        //console.log(params);
        return params;
      })

      
      const locationResult = await inventoryApi.upsertMultiScannedLocations({list: hblList});

      //console.log(locationResult)

      setResponse(result);

      if (props.onSuccess && result.totalSuccess > 0) {
        props.onSuccess(result);
      }
    } catch (error) {
      devLog('Error updating HBL statuses:', error);
      alert(t('hbl.bulkUpdate.error', 'Error updating HBL statuses. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInputText('');
    setSelectedStatus('');
    setNotes('');
    setParsedHBLs([]);
    setResponse(null);
    setSelectedUser(null);
    setCopied(false);
  };

  const textareaStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease',
    resize: 'vertical' as const,
    'min-height': '120px'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease'
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const containerStyle = {
    'margin-bottom': '1rem'
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ 
          'font-size': '1.5rem', 
          'font-weight': '600', 
          'margin-bottom': '1.5rem',
          color: 'var(--text-primary)'
        }}>
        
          {t('hbl.bulkUpdate.title', 'Bulk HBL Status Update')}
        </h2>
        
        <div>
          {/* Text Input Area */}
          <div style={containerStyle}>
            <label style={labelStyle}>
              {t('hbl.bulkUpdate.inputLabel', 'Enter text containing HBL numbers')}
            </label>
            <div style={{
              'font-size': '0.875rem',
              color: 'var(--text-muted)',
              'margin-bottom': '0.5rem',
              'line-height': '1.5'
            }}>
              Formatos soportados:
              <div style={{ 'margin-top': '0.25rem', 'padding-left': '1rem' }}>
                • Estándar: <code style={{
                  background: 'var(--gray-100)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '4px'
                }}>230XXXXXX</code> (ej: 230123456)
              </div>
              <div style={{ 'padding-left': '1rem' }}>
                • Extendido: <code style={{
                  background: 'var(--gray-100)',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '4px'
                }}>AAA12345678</code> (ej: TRE20272709)
              </div>
            </div>
            <textarea
              style={textareaStyle}
              value={inputText()}
              onInput={(e) => setInputText(e.currentTarget.value)}
              placeholder={t('hbl.bulkUpdate.placeholder', 'Paste el texto aquí. Los números HBL se extraerán automáticamente (230XXXXXX o AAA12345678)...')}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
            <div style={{ 'margin-top': '0.75rem' }}>
              <Button onClick={handleParseText} variant="secondary" size="sm">
                {t('hbl.bulkUpdate.parseButton', 'Parse HBLs')}
              </Button>
            </div>
          </div>

          {/* Parsed HBLs Display */}
          <Show when={parsedHBLs().length > 0}>
            <div style={containerStyle}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                'margin-bottom': '0.75rem'
              }}>
                <h3 style={{
                  'font-size': '1.125rem',
                  'font-weight': '500',
                  margin: '0',
                  color: 'var(--text-primary)'
                }}>
                  {t('hbl.bulkUpdate.found', 'Found')} {parsedHBLs().length} HBL(s):
                </h3>
                <Button
                  onClick={handleCopyAllHBLs}
                  variant="secondary"
                  size="sm"
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Show when={!copied()} fallback={
                    <>
                      <span style={{ 'font-size': '1rem' }}>✓</span>
                      Copiado
                    </>
                  }>
                    <span style={{ 'font-size': '1rem' }}>📋</span>
                    Copiar Todos
                  </Show>
                </Button>
              </div>
              <div style={{
                background: 'var(--gray-50)',
                padding: '0.75rem',
                'border-radius': 'var(--border-radius-sm)',
                'max-height': '8rem',
                'overflow-y': 'auto'
              }}>
                <div style={{
                  display: 'flex',
                  'flex-wrap': 'wrap',
                  gap: '0.5rem'
                }}>
                  <For each={parsedHBLs()}>
                    {(hbl) => {
                      const format = getHBLFormat(hbl);
                      const formatColor = format === 'standard' ? '#3b82f6' :
                                          format === 'extended' ? '#8b5cf6' : '#6b7280';
                      const formatLabel = format === 'standard' ? '230' :
                                          format === 'extended' ? 'EXT' : '?';

                      return (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: 'var(--primary-light)',
                          'border-radius': 'var(--border-radius-sm)',
                          'font-size': '0.875rem',
                          'font-weight': '500',
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.375rem'
                        }}>
                          <span style={{
                            'font-size': '0.625rem',
                            'font-weight': '700',
                            background: formatColor,
                            color: 'white',
                            padding: '0.125rem 0.25rem',
                            'border-radius': '3px',
                            'text-transform': 'uppercase'
                          }}>
                            {formatLabel}
                          </span>
                          {hbl}
                        </span>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          </Show>

          {/* Status Selection */}
          <div style={containerStyle}>
            <label style={labelStyle}>
              {t('hbl.bulkUpdate.selectStatus', 'Select New Status')}
            </label>
            <select
              style={selectStyle}
              value={selectedStatus()}
              onChange={(e) => setSelectedStatus(e.currentTarget.value)}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <option value="">-- {t('hbl.bulkUpdate.selectOption', 'Select Status')} --</option>
              <For each={allowedStatusLocations()}>
                {(status) => (
                  <option value={status.id}>
                    {status.label} {status.tag ? `(${status.tag})` : ''}
                  </option>
                )}
              </For>
            </select>
          </div>

          {/* User Selection */}
          <div style={containerStyle}>
            <UserSelector
              selectedUser={selectedUser()}
              onUserSelected={setSelectedUser}
            />
          </div>

          {/* Notes Input */}
          <div style={containerStyle}>
            <label style={labelStyle}>
              {t('hbl.bulkUpdate.notes', 'Notes (Optional)')}
            </label>
            <textarea
              style={{ ...textareaStyle, 'min-height': '80px' }}
              value={notes()}
              onInput={(e) => setNotes(e.currentTarget.value)}
              placeholder={t('hbl.bulkUpdate.notesPlaceholder', 'Add any notes about this status update...')}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-top': '1.5rem'
          }}>

            <Button
              onClick={handleUpdateStatuses}
              disabled={loading() || parsedHBLs().length === 0 || !selectedStatus()}
              variant="primary"
            >
              <Show when={loading()} fallback={t('hbl.bulkUpdate.updateButton', 'Update Statuses')}>
                <span style={{ display: 'flex', 'align-items': 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid #fff',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 0.8s linear infinite',
                    'margin-right': '0.5rem'
                  }} />
                  {t('hbl.bulkUpdate.updating', 'Updating...')}
                </span>
              </Show>
            </Button>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button onClick={resetForm} variant="secondary" size="sm">
                {t('hbl.bulkUpdate.reset', 'Reset')}
              </Button>
              <Show when={props.onClose}>
                <Button onClick={props.onClose} variant="outline" size="sm">
                  {t('hbl.bulkUpdate.close', 'Close')}
                </Button>
              </Show>
            </div>
          </div>

          {/* Results Display */}
          <Show when={response()}>
            {(resp) => (
              <div style={{
                'margin-top': '1.5rem',
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h3 style={{
                  'font-size': '1.125rem',
                  'font-weight': '500',
                  'margin-bottom': '1rem',
                  color: 'var(--text-primary)'
                }}>
                  {t('hbl.bulkUpdate.results', 'Update Results')}
                </h3>
                
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(3, 1fr)',
                  gap: '1rem',
                  'margin-bottom': '1rem'
                }}>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--primary-color)'
                    }}>
                      {resp().totalProcessed}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      {t('hbl.bulkUpdate.totalProcessed', 'Total Processed')}
                    </div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--success-color)'
                    }}>
                      {resp().totalSuccess}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      {t('hbl.bulkUpdate.successful', 'Successful')}
                    </div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--danger-color)'
                    }}>
                      {resp().totalFailed}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      {t('hbl.bulkUpdate.failed', 'Failed')}
                    </div>
                  </div>
                </div>

                <Show when={resp().totalFailed > 0}>
                  <div style={{
                    'margin-top': '1rem',
                    padding: '0.75rem',
                    background: 'var(--danger-light)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <h4 style={{
                      'font-weight': '500',
                      'margin-bottom': '0.5rem',
                      color: 'var(--danger-dark)'
                    }}>
                      {t('hbl.bulkUpdate.failedUpdates', 'Failed Updates:')}
                    </h4>
                    <div style={{
                      'max-height': '8rem',
                      'overflow-y': 'auto'
                    }}>
                      <For each={resp().results.filter(r => !r.success)}>
                        {(result) => (
                          <div style={{
                            'font-size': '0.875rem',
                            color: 'var(--danger-color)',
                            'margin-bottom': '0.25rem'
                          }}>
                            {result.hbl}: {result.error}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default HBLBulkStatusUpdate;