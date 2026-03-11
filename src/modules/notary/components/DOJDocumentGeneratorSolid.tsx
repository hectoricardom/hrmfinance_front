import { Component, createSignal, Show, onMount } from 'solid-js';
import Button from '../../ui/components/Button';
import Card from '../../ui/components/Card';
import Icon from '../../../components/Icon';
import { NotaryCustomer } from '../types';
import { DOJDocumentGenerator, dojDocumentTemplates } from '../../../services/dojDocumentGenerator';
import { devLog } from '../../../services/utils';

interface Props {
  customer: NotaryCustomer;
}

export const DOJDocumentGeneratorSolid: Component<Props> = (props) => {
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [customTemplate, setCustomTemplate] = createSignal(dojDocumentTemplates.detailedTemplate);
  const [useCustomTemplate, setUseCustomTemplate] = createSignal(false);

  onMount(() => {
    // Add CSS for spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
  });

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      
      const template = useCustomTemplate() ? customTemplate() : dojDocumentTemplates.detailedTemplate;
      const pdfBlob = await DOJDocumentGenerator.generatePDF(props.customer, template);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DOJ_${props.customer.firstName}_${props.customer.lastName}_${new Date().getTime()}.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
      devLog('DOJ document generated successfully!');
      // Show success message - you can replace this with your app's notification system
      alert('DOJ document generated successfully!');
    } catch (error) {
      devLog('Error generating PDF:', error);
      alert('Failed to generate DOJ document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const placeholdersList = [
    '{FULL_NAME}', '{FIRST_NAME}', '{MIDDLE_NAME}', '{LAST_NAME}',
    '{EMAIL}', '{PHONE}', '{SSN}', '{ALIEN_NUMBER}',
    '{DATE_OF_BIRTH}', '{GENDER}', '{RACE}', '{ETHNICITY}',
    '{MARITAL_STATUS}', '{HEIGHT}', '{WEIGHT}', '{HAIR_COLOR}',
    '{EYE_COLOR}', '{BIRTH_CITY}', '{BIRTH_STATE}', '{BIRTH_COUNTRY}',
    '{CURRENT_COUNTRY}', '{CURRENT_STATE}', '{FATHER_NAME}',
    '{MOTHER_NAME}', '{SPOUSE_NAME}', '{COUNTRY_OF_CITIZENSHIP}',
    '{PASSPORT_NUMBER}', '{PASSPORT_EXPIRY}', '{MARRIAGE_DATE}',
    '{MARRIAGE_CITY}', '{MARRIAGE_STATE}', '{MARRIAGE_COUNTRY}',
    '{TODAY_DATE}', '{CURRENT_DATE}', '{CURRENT_YEAR}'
  ];

  return (
    <Card>
      <div style={{ padding: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          'align-items': 'center', 
          gap: '0.5rem',
          'margin-bottom': '0.5rem'
        }}>
          <Icon name="file-text" size={20} />
          <h2 style={{ 
            'font-size': '1.5rem', 
            'font-weight': 'bold',
            margin: 0 
          }}>
            DOJ Document Generator
          </h2>
        </div>
        <p style={{ 
          color: 'var(--text-muted)', 
          'margin-bottom': '1rem' 
        }}>
          Generate official Department of Justice documents for {props.customer.firstName} {props.customer.lastName}
        </p>

        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ 
              'font-size': '0.875rem', 
              'font-weight': '500',
              'margin-bottom': '0.5rem' 
            }}>
              Template Options
            </h3>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  checked={!useCustomTemplate()}
                  onChange={() => setUseCustomTemplate(false)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Use Default Template</span>
              </label>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  checked={useCustomTemplate()}
                  onChange={() => setUseCustomTemplate(true)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Use Custom Template</span>
              </label>
            </div>
          </div>

          <Show when={useCustomTemplate()}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
              <div style={{ 
                display: 'flex', 
                'justify-content': 'space-between', 
                'align-items': 'center' 
              }}>
                <h3 style={{ 
                  'font-size': '0.875rem', 
                  'font-weight': '500' 
                }}>
                  Custom Template
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomTemplate(dojDocumentTemplates.basicTemplate)}
                >
                  Load Basic Template
                </Button>
              </div>
              <textarea
                value={customTemplate()}
                onInput={(e) => setCustomTemplate(e.currentTarget.value)}
                placeholder="Enter your custom template here..."
                style={{
                  'min-height': '300px',
                  'font-family': 'monospace',
                  'font-size': '0.875rem',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'background-color': 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  resize: 'vertical'
                }}
              />
              <div style={{ 
                'font-size': '0.75rem', 
                color: 'var(--text-muted)' 
              }}>
                <p style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                  Available placeholders:
                </p>
                <div style={{ 
                  display: 'flex', 
                  'flex-wrap': 'wrap', 
                  gap: '0.25rem' 
                }}>
                  {placeholdersList.map((placeholder) => (
                    <code style={{
                      'background-color': 'var(--bg-muted)',
                      padding: '0.125rem 0.25rem',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.75rem'
                    }}>
                      {placeholder}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </Show>

          <div style={{
            'background-color': 'var(--bg-muted)',
            padding: '1rem',
            'border-radius': 'var(--border-radius)',
            opacity: '0.5'
          }}>
            <h4 style={{ 
              'font-size': '0.875rem', 
              'font-weight': '500',
              'margin-bottom': '0.5rem' 
            }}>
              Customer Information Preview
            </h4>
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': 'repeat(2, 1fr)', 
              gap: '0.5rem',
              'font-size': '0.875rem' 
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Name:</span>{' '}
                {props.customer.firstName} {props.customer.middleName} {props.customer.lastName}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>A#:</span>{' '}
                {props.customer.alienNumber || 'N/A'}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>DOB:</span>{' '}
                {props.customer.dateOfBirth ? new Date(props.customer.dateOfBirth).toLocaleDateString() : 'N/A'}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Citizenship:</span>{' '}
                {props.customer.countryOfCitizenship || 'N/A'}
              </div>
            </div>
          </div>

          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating()}
            className="w-full"
          >
            <Show 
              when={isGenerating()} 
              fallback={
                <>
                  <Icon name="download" size={16} style={{ 'margin-right': '0.5rem' }} />
                  Generate DOJ Document
                </>
              }
            >
              <Icon name="loader-2" size={16} class="animate-spin" style={{ 'margin-right': '0.5rem' }} />
              Generating DOJ Document...
            </Show>
          </Button>
        </div>
      </div>
    </Card>
  );
};