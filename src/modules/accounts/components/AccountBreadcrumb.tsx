import { Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { AccountingAccount } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';

interface AccountBreadcrumbProps {
  accountPath: AccountingAccount[];
}

const AccountBreadcrumb: Component<AccountBreadcrumbProps> = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const breadcrumbStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'margin-bottom': '1rem',
    padding: '0.75rem 1rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };

  const crumbStyle = {
    color: 'var(--text-secondary)',
    'text-decoration': 'none',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'color 0.2s ease'
  };

  const crumbActiveStyle = {
    ...crumbStyle,
    color: 'var(--primary-color)',
    'font-weight': '600'
  };

  const separatorStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  if (props.accountPath.length === 0) return null;

  return (
    <nav style={breadcrumbStyle}>
      <span
        style={crumbStyle}
        onClick={() => navigate('/accounts')}
        onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
        onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
      >
        {t('common.all')} {t('navigation.accounts')}
      </span>
      
      {props.accountPath.map((account, index) => (
        <>
          <span style={separatorStyle}>›</span>
          <span
            style={index === props.accountPath.length - 1 ? crumbActiveStyle : crumbStyle}
            onClick={() => {
              if (index < props.accountPath.length - 1) {
                navigate(`/accounts/${account.id}`);
              }
            }}
            onMouseEnter={(e) => {
              if (index < props.accountPath.length - 1) {
                e.target.style.color = 'var(--primary-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (index < props.accountPath.length - 1) {
                e.target.style.color = 'var(--text-secondary)';
              }
            }}
          >
            {account.accountNumber} - {account.name}
          </span>
        </>
      ))}
    </nav>
  );
};

export default AccountBreadcrumb;