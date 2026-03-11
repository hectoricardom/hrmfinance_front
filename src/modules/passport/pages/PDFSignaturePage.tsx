import { Component } from 'solid-js';
import PDFSignatureIntegration from '../components/PDFSignatureIntegration';
import { useTranslation } from '../../../translations';

const PDFSignaturePage: Component = () => {
  const { t } = useTranslation();
  
  return (
    <div style={{
      'min-height': '100vh',
      background: 'var(--background-secondary)',
      padding: '2rem 0'
    }}>
      <div style={{
        'max-width': '1200px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        <div style={{
          'text-align': 'center',
          'margin-bottom': '3rem'
        }}>
          <h1 style={{
            'font-size': '2.5rem',
            'font-weight': '700',
            'margin-bottom': '1rem',
            color: 'var(--text-primary)',
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
            '-webkit-background-clip': 'text',
            '-webkit-text-fill-color': 'transparent',
            'background-clip': 'text'
          }}>
            🖋️ {t('pdfSignature.pageTitle')}
          </h1>
          
          <p style={{
            'font-size': '1.125rem',
            color: 'var(--text-muted)',
            'max-width': '600px',
            margin: '0 auto',
            'line-height': '1.6'
          }}>
            {t('pdfSignature.pageSubtitle')}
          </p>
        </div>

        <PDFSignatureIntegration />

        {/* Feature highlights */}
        <div style={{
          'margin-top': '4rem',
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div style={{
            padding: '2rem',
            background: 'white',
            'border-radius': 'var(--border-radius)',
            'box-shadow': 'var(--shadow-sm)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '2.5rem',
              'margin-bottom': '1rem'
            }}>
              🤖
            </div>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              {t('pdfSignature.features.smartProcessing.title')}
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              'line-height': '1.5',
              margin: '0'
            }}>
              {t('pdfSignature.features.smartProcessing.description')}
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'white',
            'border-radius': 'var(--border-radius)',
            'box-shadow': 'var(--shadow-sm)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '2.5rem',
              'margin-bottom': '1rem'
            }}>
              🎯
            </div>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              {t('pdfSignature.features.precisePositioning.title')}
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              'line-height': '1.5',
              margin: '0'
            }}>
              {t('pdfSignature.features.precisePositioning.description')}
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'white',
            'border-radius': 'var(--border-radius)',
            'box-shadow': 'var(--shadow-sm)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '2.5rem',
              'margin-bottom': '1rem'
            }}>
              ⚡
            </div>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '0.5rem',
              color: 'var(--text-primary)'
            }}>
              {t('pdfSignature.features.fastSecure.title')}
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              'line-height': '1.5',
              margin: '0'
            }}>
              {t('pdfSignature.features.fastSecure.description')}
            </p>
          </div>
        </div>

        {/* Supported documents */}
        <div style={{
          'margin-top': '4rem',
          padding: '2rem',
          background: 'white',
          'border-radius': 'var(--border-radius)',
          'box-shadow': 'var(--shadow-sm)'
        }}>
          <h3 style={{
            'font-size': '1.5rem',
            'font-weight': '600',
            'margin-bottom': '1.5rem',
            color: 'var(--text-primary)',
            'text-align': 'center'
          }}>
            📄 {t('pdfSignature.supportedDocs.title')}
          </h3>
          
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            'text-align': 'center'
          }}>
            <div style={{
              padding: '1rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <strong>🇨🇺 {t('pdfSignature.supportedDocs.cubanPassport')}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>{t('pdfSignature.supportedDocs.cubanPassportDesc')}</small>
            </div>
            
            <div style={{
              padding: '1rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <strong>🇺🇸 {t('pdfSignature.supportedDocs.usPassport')}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>{t('pdfSignature.supportedDocs.usPassportDesc')}</small>
            </div>
            
            <div style={{
              padding: '1rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <strong>📋 {t('pdfSignature.supportedDocs.legalDocs')}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>{t('pdfSignature.supportedDocs.legalDocsDesc')}</small>
            </div>
            
            <div style={{
              padding: '1rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <strong>🏢 {t('pdfSignature.supportedDocs.businessForms')}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>{t('pdfSignature.supportedDocs.businessFormsDesc')}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFSignaturePage;