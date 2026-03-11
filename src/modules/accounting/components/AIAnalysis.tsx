import { Component, For } from 'solid-js';
import { Card } from '../../ui';

interface AIAnalysisProps {
  analysis: string;
}

const AIAnalysis: Component<AIAnalysisProps> = (props) => {
  const parseAnalysis = () => {
    const sections: { title: string; content: string[] }[] = [];
    const lines = props.analysis.split('\n');
    let currentSection: { title: string; content: string[] } | null = null;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Check if this is a section header (starts with ##, *, or ends with :)
      if (trimmedLine.match(/^#{1,3}\s+/) || trimmedLine.match(/^\*\*.*\*\*:?$/) || trimmedLine.match(/^[A-Z][^.!?]*:$/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const title = trimmedLine
          .replace(/^#{1,3}\s+/, '')
          .replace(/^\*\*/, '')
          .replace(/\*\*:?$/, '')
          .replace(/:$/, '')
          .trim();
        currentSection = { title, content: [] };
      } else if (currentSection) {
        currentSection.content.push(trimmedLine);
      } else {
        // First line without a header
        currentSection = { title: 'Overview', content: [trimmedLine] };
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const isDeduction = (text: string) => {
    const deductionKeywords = ['deduct', 'write-off', 'claim', 'expense', 'credit', 'save', 'reduction'];
    return deductionKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  const containerStyle = {
    'margin-top': '2rem'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'margin-bottom': '1.5rem'
  };

  const iconStyle = {
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'font-weight': '600',
    'font-size': '1.25rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0'
  };

  const disclaimerStyle = {
    padding: '1rem 1.5rem',
    background: '#e3f2fd',
    border: '1px solid #2196f3',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '1.5rem',
    'font-size': '0.875rem',
    color: '#1565c0'
  };

  const sectionsContainerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1.5rem'
  };

  const sectionStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    transition: 'box-shadow 0.2s ease'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const sectionIconStyle = {
    width: '24px',
    height: '24px',
    'border-radius': '4px',
    background: 'var(--primary-color)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'font-size': '0.875rem',
    'font-weight': '600'
  };

  const contentListStyle = {
    'list-style': 'none',
    padding: '0',
    margin: '0',
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem'
  };

  const contentItemStyle = (highlighted: boolean) => ({
    padding: '0.75rem 1rem',
    background: highlighted ? '#fff3cd' : 'var(--background-color)',
    'border-left': highlighted ? '4px solid #ffc107' : '4px solid var(--border-color)',
    'border-radius': '0 var(--border-radius-sm) var(--border-radius-sm) 0',
    color: 'var(--text-secondary)',
    'line-height': '1.6',
    transition: 'all 0.2s ease'
  });

  const highlightBadgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    'border-radius': '4px',
    background: '#ffc107',
    color: '#856404',
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    'margin-right': '0.5rem'
  };

  const getSectionIcon = (index: number) => {
    const icons = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return icons[index % icons.length];
  };

  const sections = parseAnalysis();

  return (
    <div style={containerStyle}>
      <Card>
        <div style={headerStyle}>
          <div style={iconStyle}>AI</div>
          <h3 style={titleStyle}>AI Tax Optimization Analysis</h3>
        </div>

        <div style={disclaimerStyle}>
          <strong>Disclaimer:</strong> This AI-generated analysis is for informational purposes only
          and should not be considered professional tax advice. Always consult with a licensed CPA
          or tax professional before making tax-related decisions.
        </div>

        <div style={sectionsContainerStyle}>
          <For each={sections}>
            {(section, index) => (
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>
                  <div style={sectionIconStyle}>{getSectionIcon(index())}</div>
                  {section.title}
                </div>
                <ul style={contentListStyle}>
                  <For each={section.content}>
                    {(item) => {
                      const highlighted = isDeduction(item);
                      return (
                        <li style={contentItemStyle(highlighted)}>
                          {highlighted && (
                            <span style={highlightBadgeStyle}>Deduction</span>
                          )}
                          {item.replace(/^[-•*]\s*/, '')}
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </div>
            )}
          </For>
        </div>

        <div style={{ 'margin-top': '2rem', 'padding-top': '1.5rem', 'border-top': '1px solid var(--border-color)' }}>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'font-style': 'italic' }}>
            This analysis was generated using AI based on your transaction data and current tax regulations.
            Tax laws are complex and subject to change. For personalized advice, please consult a qualified tax professional.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIAnalysis;
