import { Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { AccountingAccount } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';

interface AccountCardProps {
  account: AccountingAccount;
  onClick?: (account: AccountingAccount) => void;
  onViewDetails?: (account: AccountingAccount) => void;
}

const AccountCard: Component<AccountCardProps> = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (props.onClick) {
      props.onClick(props.account);
    } else {
      navigate(`/accounts/${props.account.id}`);
    }
  };

  const footerStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    'margin-top': '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)'
  };

  const accountHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const accountNumberStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  const accountTypeStyle = {
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  const balanceStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--primary-color)',
    'margin-bottom': '0.5rem'
  };

  const categoryStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'margin-bottom': '0.5rem'
  };

  const descriptionStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
    'line-height': '1.4'
  };

  const getTypeColor = (type: AccountingAccount['type']) => {
    const colors = {
      'Asset': { bg: '#e8f5e8', color: '#2d7d32' },
      'Liability': { bg: '#fff3e0', color: '#f57c00' },
      'Equity': { bg: '#e3f2fd', color: '#1976d2' },
      'Revenue': { bg: '#e8f5e8', color: '#388e3c' },
      'Expense': { bg: '#ffebee', color: '#d32f2f' }
    };
    return colors[type] || { bg: '#f5f5f5', color: '#666' };
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  const typeColor = getTypeColor(props.account?.accountType);

  console.log(props.account)

  return (
    <Card>
      <div style={accountHeaderStyle}>
        <div style={accountNumberStyle}>
          {props.account?.accountNumber}
        </div>
        <div 
          style={{
            ...accountTypeStyle,
            background: typeColor.bg,
            color: typeColor.color
          }}
        >
          {t(`accounts.types.${props.account?.accountType?.toLowerCase()}`)}
        </div>
      </div>
      
      <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.1rem' }}>
        {props.account.name}
      </h3>
      
      <div style={categoryStyle}>
        {props.account.category}
      </div>
      
      <div style={balanceStyle}>
        {formatBalance(props.account?.balance)}
      </div>
      
      <div style={descriptionStyle}>
        {props.account.description}
      </div>
      
      {!props.account.isActive && (
        <div style={{
          'margin-top': '0.5rem',
          padding: '0.25rem 0.75rem',
          'border-radius': '9999px',
          'font-size': '0.75rem',
          'font-weight': '500',
          background: '#ffebee',
          color: '#d32f2f',
          'text-align': 'center'
        }}>
          {t('common.inactive')}
        </div>
      )}

      <div style={footerStyle}>
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => props.onViewDetails?.(props.account)}
        >
          {t('common.view')} {t('accounts.accountDetails')}
        </Button>
      </div>
    </Card>
  );
};

export default AccountCard;