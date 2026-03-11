import { Component } from 'solid-js';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { JournalEntry } from '../stores/entryBookStore';
import { useTranslation } from '../../../translations';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onClick?: (entry: JournalEntry) => void;
  onViewDetails?: (entry: JournalEntry) => void;
}

const JournalEntryCard: Component<JournalEntryCardProps> = (props) => {
  const { t } = useTranslation();
  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const entryNumberStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase'
  };

  const statusStyle = {
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  const descriptionStyle = {
    'font-size': '1.1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem'
  };

  const metaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'margin-bottom': '1rem'
  };

  const amountStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const totalStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--primary-color)'
  };

  const linesPreviewStyle = {
    'max-height': '100px',
    'overflow-y': 'auto',
    'border-top': '1px solid var(--border-color)',
    'padding-top': '1rem'
  };

  const lineStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem'
  };

  const footerStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    'margin-top': '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)'
  };

  const getStatusColor = (status: JournalEntry['status']) => {
    const colors = {
      'draft': { bg: '#fff3cd', color: '#856404' },
      'posted': { bg: '#d4edda', color: '#155724' },
      'void': { bg: '#f8d7da', color: '#721c24' }
    };
    return colors?.[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const statusColor = getStatusColor(props.entry.status);
  const isBalanced = () => props.entry.totalDebits - (props.entry.totalCredits) ===  0;



  return (
    <Card>
      <div style={headerStyle}>
        <div style={entryNumberStyle}>{props.entry.id}</div>
        <div 
          style={{
            ...statusStyle,
            background: statusColor?.bg,
            color: statusColor?.color
          }}
        >
          {t(`journal.${props.entry.status || "draft"}`, props.entry.status || "draft")}
        </div>
      </div>

      <div style={descriptionStyle}>{props.entry.description}</div>
      
      <div style={metaStyle}>
        {formatDate(props.entry.date || props.entry.createdAt)} • {props.entry.reference || t('journal.noReference', 'Sin referencia')} • {t('journal.store', 'Almacen')} {props.entry.store} • {t('journal.createdBy', 'Por')} {props.entry.createdBy}
      </div>

      <div style={amountStyle}>
        <div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>{t('journal.totalAmount', 'Monto Total')}</div>
          <div style={totalStyle}>{formatCurrency(props.entry.totalDebits)}</div>
        </div>
        <div style={{ 'text-align': 'right' }}>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>{t('journal.lines', 'Líneas')}</div>
          <div style={{ 'font-weight': '600' }}>{props.entry?.lines?.length}</div>
        </div>
      </div>

      {!isBalanced() && (
        <div style={{
          padding: '0.5rem',
          'border-radius': 'var(--border-radius-sm)',
          background: '#f8d7da',
          color: '#721c24',
          'font-size': '0.875rem',
          'margin-bottom': '1rem'
        }}>
          ⚠️ {t('journal.entryNotBalancedShort', 'Asiento no balanceado')}: {t('journal.debit')} {formatCurrency(props.entry.totalDebits)}, 
          {t('journal.credit')} {formatCurrency(props.entry.totalCredits)}
        </div>
      )}

      <div style={linesPreviewStyle}>
        <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
          {t('journal.accountLines', 'Líneas de Cuenta')}:
        </div>
        {props.entry?.lines?.slice(0, 20).map(line => (
          <div style={lineStyle}>
            <div style={{ flex: '1' }}>
              <div style={{ 'font-weight': '500' }}>{line?.accountNumber}</div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                {line?.description || t('journal.noDescription', 'Sin descripción')}
              </div>
            </div>
            <div style={{ 'text-align': 'right' }}>
              {line?.isDebit && (
                <div style={{ color: '#4caf50', 'font-weight': '500' }}>
                  {t('journal.debitShort', 'Db.')} {formatCurrency(line?.amount)}
                </div>
              )}
              {!line?.isDebit && (
                <div style={{ color: '#f44336', 'font-weight': '500' }}>
                  {t('journal.creditShort', 'Cr.')} {formatCurrency(line?.amount)}
                </div>
              )}
              {line?.reconciled && (
                <div style={{ 'font-size': '0.75rem', color: '#4caf50' }}>
                  ✓ {t('banking.reconciled', 'Conciliado')}
                </div>
              )}
            </div>
          </div>
        ))}
        {props.entry?.lines?.length > 3 && (
          <div style={{ 'text-align': 'center', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            {t('journal.andMoreLines', '... y {count} líneas más').replace('{count}', (props.entry?.lines?.length - 3).toString())}
          </div>
        )}
      </div>

      <div style={footerStyle}>
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => props.onViewDetails?.(props.entry)}
        >
          {t('journal.viewDetails', 'Ver Detalles')}
        </Button>
      </div>
    </Card>
  );
};

export default JournalEntryCard;