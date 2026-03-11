import { Component } from 'solid-js';
import { A } from '@solidjs/router';
import { Layout } from '../modules/ui';
import { useTranslation } from '../i18n';

interface UnauthorizedAccessProps {
  featureName?: string;
  requiredPermission?: string;
}

const UnauthorizedAccess: Component<UnauthorizedAccessProps> = (props) => {
  const { t } = useTranslation();
  const containerStyle = {
    'min-height': 'calc(100vh - 200px)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '2rem'
  };

  const contentStyle = {
    'text-align': 'center',
    'max-width': '600px',
    width: '100%'
  };

  const iconStyle = {
    'font-size': '5rem',
    color: '#e53e3e',
    'margin-bottom': '2rem'
  };

  const titleStyle = {
    'font-size': '2.5rem',
    'font-weight': '700',
    color: '#1a202c',
    'margin-bottom': '1rem'
  };

  const subtitleStyle = {
    'font-size': '1.25rem',
    color: '#718096',
    'margin-bottom': '2rem',
    'line-height': '1.6'
  };

  const infoBoxStyle = {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    'border-radius': '0.5rem',
    padding: '1.5rem',
    'margin-bottom': '2rem'
  };

  const infoTextStyle = {
    color: '#4a5568',
    'font-size': '1rem',
    'line-height': '1.6'
  };

  const actionButtonsStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'center',
    'flex-wrap': 'wrap'
  };

  const buttonStyle = {
    padding: '0.75rem 2rem',
    'border-radius': '0.5rem',
    'text-decoration': 'none',
    'font-weight': '500',
    transition: 'all 0.2s',
    display: 'inline-block'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'var(--primary-color)',
    color: 'white',
    border: '2px solid var(--primary-color)'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'white',
    color: 'var(--primary-color)',
    border: '2px solid var(--primary-color)'
  };

  const featureListStyle = {
    'text-align': 'left',
    'margin-top': '2rem',
    padding: '0 2rem'
  };

  const featureItemStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'margin-bottom': '1rem',
    color: '#4a5568'
  };

  const checkIconStyle = {
    color: '#48bb78',
    'font-size': '1.25rem'
  };

  return (
    <Layout title={t('unauthorized.title')}>
      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={iconStyle}>🔒</div>
          
          <h1 style={titleStyle}>{t('unauthorized.accessDenied')}</h1>
          
          <p style={subtitleStyle}>
            {t('unauthorized.noPermission')} 
            {props.featureName ? ` ${props.featureName}` : ` ${t('unauthorized.thisFeature')}`}.
          </p>

          <div style={infoBoxStyle}>
            <p style={infoTextStyle}>
              <strong>{t('unauthorized.whySeeing')}</strong><br />
              {t('unauthorized.explanation')}
              {props.requiredPermission && (
                <>
                  <br />
                  <br />
                  <strong>{t('unauthorized.requiredPermission')}</strong> {props.requiredPermission}
                </>
              )}
            </p>
          </div>

          <div style={actionButtonsStyle}>
            <A href="/" style={primaryButtonStyle}>
              {t('unauthorized.goToDashboard')}
            </A>
            <button 
              style={secondaryButtonStyle}
              onClick={() => window.history.back()}
            >
              {t('unauthorized.goBack')}
            </button>
          </div>

          <div style={featureListStyle}>
            <h3 style={{ 'margin-bottom': '1rem', color: '#2d3748' }}>
              {t('unauthorized.featuresCanAccess')}
            </h3>
            <div style={featureItemStyle}>
              <span style={checkIconStyle}>✓</span>
              <span>{t('unauthorized.dashboardAccess')}</span>
            </div>
            <div style={featureItemStyle}>
              <span style={checkIconStyle}>✓</span>
              <span>{t('unauthorized.profileAccess')}</span>
            </div>
            <div style={featureItemStyle}>
              <span style={checkIconStyle}>✓</span>
              <span>{t('unauthorized.roleBasedAccess')}</span>
            </div>
          </div>

          <div style={{ 
            'margin-top': '3rem', 
            padding: '1.5rem',
            background: '#edf2f7',
            'border-radius': '0.5rem'
          }}>
            <p style={{ color: '#4a5568', 'font-size': '0.875rem' }}>
              {t('unauthorized.needAccess')}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UnauthorizedAccess;