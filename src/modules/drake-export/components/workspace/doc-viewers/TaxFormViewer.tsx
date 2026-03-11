/**
 * TaxFormViewer
 * Renders type-specific tax form details (W-2, 1099-NEC, 1099-MISC, etc.)
 * Extracted from DocumentsSection.tsx modal detail view.
 */
import { Component, Show, For } from 'solid-js';
import type { DrakeTaxDocument } from '../../../types/drakeTypes';
import { QrButton } from '../ClientInfoSection';
import { formatDateMMDDYYYY } from '../../../../../services/utils';

interface TaxFormViewerProps {
  document: DrakeTaxDocument;
  onShowQR: (doc: DrakeTaxDocument) => void;
  onTextQR: (text: string) => void;
  onQRMonthly?: () => string;
}

const getBox12CodeDescription = (code: string): string => {
  const descriptions: Record<string, string> = {
    'A': 'Uncollected SS/RRTA tax on tips',
    'B': 'Uncollected Medicare tax on tips',
    'C': 'Taxable cost of group-term life insurance',
    'D': 'Elective deferrals to 401(k)',
    'E': 'Elective deferrals to 403(b)',
    'F': 'Elective deferrals to 408(k)(6) SEP',
    'G': 'Elective deferrals to 457(b)',
    'H': 'Elective deferrals to 501(c)(18)(D)',
    'J': 'Nontaxable sick pay',
    'K': '20% excise tax on golden parachute',
    'L': 'Substantiated employee expenses',
    'M': 'Uncollected SS on group-term life',
    'N': 'Uncollected Medicare on group-term life',
    'P': 'Excludable moving expense reimb.',
    'Q': 'Nontaxable combat pay',
    'R': 'Employer HSA contributions',
    'S': 'Employee salary reduction to SIMPLE',
    'T': 'Adoption benefits',
    'V': 'Income from exercise of stock options',
    'W': 'Employer contributions to HSA',
    'Y': 'Deferrals under 409A nonqualified plan',
    'Z': 'Income under 409A nonqualified plan',
    'AA': 'Designated Roth contributions to 401(k)',
    'BB': 'Designated Roth contributions to 403(b)',
    'CC': 'HIRE exempt wages and tips',
    'DD': 'Cost of employer health coverage',
    'EE': 'Designated Roth contributions to 457(b)',
    'FF': 'Permitted benefits under QSEHRA',
    'GG': 'Income from qualified equity grants',
    'HH': 'Aggregate deferrals under 83(i)',
  };
  return descriptions[code.toUpperCase()] || 'Other';
};

const TaxFormViewer: Component<TaxFormViewerProps> = (props) => {
  const doc = () => props.document;

  return (
    <>
      {/* W-2 Specific Info */}
      <Show when={doc().drakeFormType === 'w2'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#3b82f6', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>W-2</span>
            Employer Information
          </div>
           <QrButton text={""}
              handle={()=>props.onShowQR(doc())}
              label=''
            />
          <div style={{
            padding: '1rem',
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          {/* W-2 Amounts Grid */}
           <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(2, 1fr)',
              gap: '0.5rem'
            }}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Wage & Tax Information</div>
            <QrButton text={[
                doc().extractedAmounts?.wages || "", '|',
                doc().extractedAmounts?.wages || "", '|',
                doc().extractedAmounts?.federalTaxWithheld || "", '|',
                doc().extractedAmounts?.federalTaxWithheld || "", '|',
                doc().extractedAmounts?.socialSecurityWages || "", '|',
                doc().extractedAmounts?.socialSecurityTax || "", '|',
                doc().extractedAmounts?.medicareWages || "", '|',
                doc().extractedAmounts?.medicareTax || "", '|',
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
          </div>

          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <Show when={doc().extractedAmounts?.wages !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1 - Wages</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem', color: '#22c55e' }}>
                  ${(doc().extractedAmounts?.wages || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.federalTaxWithheld !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 2 - Federal Tax Withheld</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem', color: '#ef4444' }}>
                  ${(doc().extractedAmounts?.federalTaxWithheld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.socialSecurityWages !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 3 - SS Wages</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.socialSecurityWages || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.socialSecurityTax !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 4 - SS Tax Withheld</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.socialSecurityTax || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.medicareWages !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 5 - Medicare Wages</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.medicareWages || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>

            <Show when={doc().extractedAmounts?.medicareTax !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 6 - Medicare Tax Withheld</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.medicareTax || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>

            </div>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(2, 1fr)',
              gap: '0.5rem'
            }}>
              <div style={{display: "flex"}}>


            <div style={{ 'font-weight': '600', 'margin': '0.75rem 0' }}> Local Wages </div>
             <Show when={doc().extractedAmounts?.employerStateId}>
             <div style={{ 'font-weight': '600', 'margin': '0.75rem 0.5rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span style={{ background: '#8b5cf6', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>{doc().extractedAmounts?.employerStateId}</span>

              </div>
            </Show>
            </div>
            <QrButton text={[

                doc().extractedAmounts?.employerStateId || "", '|',
                doc().extractedAmounts?.stateWages || "", '|',
                doc().extractedAmounts?.stateWages || "", '|',
                doc().extractedAmounts?.stateTaxWithheld || "", '|',
                doc().extractedAmounts?.stateTaxWithheld || "", '|',
                doc().extractedAmounts?.localWages || "", '|',
                doc().extractedAmounts?.localTaxWithheld  || "", '|',
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
            </div>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(2, 1fr)',
              gap: '0.5rem'
            }}>

            <Show when={doc().extractedAmounts?.stateWages !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 16 - State Wages</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.stateWages || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.stateTaxWithheld !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 17 - State Tax Withheld</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.stateTaxWithheld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>


            <Show when={doc().extractedAmounts?.localWages !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 18 - Local Wages</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.localWages || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>


            <Show when={doc().extractedAmounts?.localTaxWithheld !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 19 - Local Withheld </div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.localTaxWithheld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>

          </div>

          {/* Box 12 Codes Section */}
          <Show when={doc().extractedAmounts?.box12Codes && (doc().extractedAmounts?.box12Codes?.length || 0) > 0}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span style={{ background: '#8b5cf6', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>Box 12</span>
                Deferred Compensation & Other Codes
              </div>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(2, 1fr)',
                gap: '0.5rem'
              }}>
                <For each={doc().extractedAmounts?.box12Codes}>
                  {(item) => (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(139, 92, 246, 0.05)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      'border-radius': '6px'
                    }}>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span style={{
                          background: '#8b5cf6',
                          color: 'white',
                          padding: '0.125rem 0.375rem',
                          'border-radius': '3px',
                          'font-size': '0.7rem',
                          'font-weight': '600'
                        }}>
                          {item.code}
                        </span>
                        <span>{getBox12CodeDescription(item.code)}</span>
                      </div>
                      <div style={{ 'font-weight': '600', 'margin-top': '0.25rem' }}>
                        ${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Box 14 Other Items Section */}
          <Show when={doc().extractedAmounts?.box14Items && (doc().extractedAmounts?.box14Items?.length || 0) > 0}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <span style={{ background: '#f59e0b', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>Box 14</span>
                Other Information
              </div>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(2, 1fr)',
                gap: '0.5rem'
              }}>
                <For each={doc().extractedAmounts?.box14Items}>
                  {(item) => (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      'border-radius': '6px'
                    }}>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.label || 'Other'}
                      </div>
                      <div style={{ 'font-weight': '600', 'margin-top': '0.25rem' }}>
                        ${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

        </div>
      </Show>

      {/* 1099-NEC Specific Info */}
      <Show when={doc().drakeFormType === '1099_nec'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#8b5cf6', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1099-NEC</span>
            Payer Information
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>

           <QrButton text={[
                doc().payerInfo?.ein || "", '|','|',
                doc().payerInfo?.name || "", '|','|',
                doc().payerInfo?.address || "", '|',
                doc().payerInfo?.zip || "", '|',
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Nonemployee Compensation</div>
          <div style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1))',
            'border-radius': '8px',
            'text-align': 'center'
          }}>

            <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>
              Box 1 - Nonemployee Compensation
            </div>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#8b5cf6' }}>
              ${(doc().extractedAmounts?.nonEmployeeCompensation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </Show>

      {/* 1099-MISC Specific Info */}
      <Show when={doc().drakeFormType === '1099_misc'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#f59e0b', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1099-MISC</span>
            Payer Information
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>

            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>
             <QrButton text={[
                doc().payerInfo?.ein || "", '|',
                doc().payerInfo?.name || "", '|','|',
                doc().payerInfo?.address || "", '|',
                doc().payerInfo?.zip || "", '|',
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Miscellaneous Income</div>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <Show when={doc().extractedAmounts?.rents !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1 - Rents</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.rents || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.royalties !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 2 - Royalties</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.royalties || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.otherIncome !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 3 - Other Income</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.otherIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* 1099-INT Specific Info */}
      <Show when={doc().drakeFormType === '1099_int'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#22c55e', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1099-INT</span>
            Payer Information
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(34, 197, 94, 0.05)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Interest Income</div>
          <div style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
            'border-radius': '8px',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>
              Box 1 - Interest Income
            </div>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#22c55e' }}>
              ${(doc().extractedAmounts?.interestIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </Show>

      {/* 1099-DIV Specific Info */}
      <Show when={doc().drakeFormType === '1099_div'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#06b6d4', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1099-DIV</span>
            Payer Information
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Dividend Income</div>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <Show when={doc().extractedAmounts?.ordinaryDividends !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1a - Ordinary Dividends</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem', color: '#06b6d4' }}>
                  ${(doc().extractedAmounts?.ordinaryDividends || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.qualifiedDividends !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1b - Qualified Dividends</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem', color: '#06b6d4' }}>
                  ${(doc().extractedAmounts?.qualifiedDividends || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.capitalGains !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 2a - Capital Gains</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.capitalGains || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* 1099-R Retirement Distribution */}
      <Show when={doc().drakeFormType === '1099_r' || (doc().documentType as string) === '1099-R'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#ec4899', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1099-R</span>
            Retirement Distribution
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(236, 72, 153, 0.05)',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>
            <QrButton text={[
              doc().payerInfo?.ein || "", '|',
              doc().payerInfo?.name || "", '|',
              doc().payerInfo?.address || "", '|',
              (doc().payerInfo?.city || '') + ' ' + (doc().payerInfo?.state || ''), '|',
              doc().payerInfo?.zip || "", '|',
            ].join('') || ''}
              handle={props.onTextQR}
              label='Payer'
            />
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          {/* Distribution Amounts QR */}
          <div style={{ 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ 'font-weight': '600' }}>Distribution Amounts</span>
            <QrButton text={[
              doc().extractedAmounts?.grossDistribution || '', '|',
              doc().extractedAmounts?.taxableAmount || '', '|',
              doc().extractedAmounts?.taxableAmountNotDetermined ? '1' : '', '|',
              doc().extractedAmounts?.totalDistribution ? '1' : '', '|',
              doc().extractedAmounts?.capitalGain || '', '|',
              doc().extractedAmounts?.federalTaxWithheld || '', '|',
              doc().extractedAmounts?.employeeContributions || '', '|',
              doc().extractedAmounts?.netUnrealizedAppreciation || '', '|',
              doc().extractedAmounts?.distributionCode || '', '|',
              doc().extractedAmounts?.otherAmount || '', '|',
              doc().extractedAmounts?.percentageTotalDistribution || '', '|',
              doc().extractedAmounts?.totalEmployeeContributions || '', '|',
              doc().extractedAmounts?.firstYearOfRoth || '', '|',
            ].join('') || ''}
              handle={props.onTextQR}
              label='Amounts'
            />
          </div>

          {/* Main Distribution Boxes */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem',
            'margin-bottom': '1rem'
          }}>
            <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.1))', 'border-radius': '6px' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1 - Gross Distribution</div>
              <div style={{ 'font-weight': '700', 'font-size': '1.25rem', color: '#ec4899' }}>
                ${(doc().extractedAmounts?.grossDistribution || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.1))', 'border-radius': '6px' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 2a - Taxable Amount</div>
              <div style={{ 'font-weight': '700', 'font-size': '1.25rem', color: '#ec4899' }}>
                ${(doc().extractedAmounts?.taxableAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Additional Boxes */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(3, 1fr)',
            gap: '0.5rem'
          }}>
            <Show when={doc().extractedAmounts?.federalTaxWithheld !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 4 - Federal Tax Withheld</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.federalTaxWithheld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.employeeContributions !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 5 - Employee Contributions</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.employeeContributions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.distributionCode}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 7 - Distribution Code</div>
                <div style={{ 'font-weight': '600', color: '#ec4899' }}>
                  {doc().extractedAmounts?.distributionCode}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.capitalGain !== undefined && (doc().extractedAmounts?.capitalGain || 0) > 0}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 3 - Capital Gain</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.capitalGain || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.netUnrealizedAppreciation !== undefined && (doc().extractedAmounts?.netUnrealizedAppreciation || 0) > 0}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 6 - Net Unrealized Appreciation</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.netUnrealizedAppreciation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.firstYearOfRoth}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 11 - First Year of Roth</div>
                <div style={{ 'font-weight': '600' }}>
                  {doc().extractedAmounts?.firstYearOfRoth}
                </div>
              </div>
            </Show>
          </div>

          {/* Checkboxes */}
          <Show when={doc().extractedAmounts?.taxableAmountNotDetermined || doc().extractedAmounts?.totalDistribution}>
            <div style={{ 'margin-top': '0.75rem', display: 'flex', gap: '1rem', 'font-size': '0.875rem' }}>
              <Show when={doc().extractedAmounts?.taxableAmountNotDetermined}>
                <span style={{ color: '#ec4899' }}>✓ Taxable amount not determined (2b)</span>
              </Show>
              <Show when={doc().extractedAmounts?.totalDistribution}>
                <span style={{ color: '#ec4899' }}>✓ Total distribution (2b)</span>
              </Show>
            </div>
          </Show>

          {/* State/Local Taxes */}
          <Show when={doc().extractedAmounts?.stateTaxWithheld || doc().extractedAmounts?.localTaxWithheld}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                State/Local Tax Info
                <QrButton text={[
                  doc().payerInfo?.state || '', '|',
                  doc().extractedAmounts?.stateDistribution || doc().extractedAmounts?.grossDistribution || '', '|',
                  doc().extractedAmounts?.stateTaxWithheld || '', '|',
                  doc().extractedAmounts?.localDistribution || '', '|',
                  doc().extractedAmounts?.localTaxWithheld || '', '|',
                  doc().extractedAmounts?.localityName || '', '|',
                ].join('') || ''}
                  handle={props.onTextQR}
                  label='State'
                />
              </div>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <Show when={doc().extractedAmounts?.stateTaxWithheld !== undefined}>
                  <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '4px' }}>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>State Tax Withheld</div>
                    <div style={{ 'font-weight': '600' }}>
                      ${(doc().extractedAmounts?.stateTaxWithheld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </Show>
                <Show when={doc().extractedAmounts?.localTaxWithheld !== undefined}>
                  <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '4px' }}>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Local Tax Withheld</div>
                    <div style={{ 'font-weight': '600' }}>
                      ${(doc().extractedAmounts?.localTaxWithheld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* 1099-G Government Payments */}
      <Show when={doc().drakeFormType === '1099_g' || (doc().documentType as string) === '1099-G'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#0891b2', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1099-G</span>
            Government Payments
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(8, 145, 178, 0.05)',
            border: '1px solid rgba(8, 145, 178, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name || doc().extractedData?.payerName}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name || doc().extractedData?.payerName}
              </div>
            </Show>
            <Show when={doc().payerInfo?.ein || doc().extractedData?.payerTIN}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                TIN: {doc().payerInfo?.ein || doc().extractedData?.payerTIN}
              </div>
            </Show>
            <Show when={doc().extractedData?.payerAddress}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().extractedData?.payerAddress?.fullAddress ||
                  `${doc().extractedData?.payerAddress?.street || ''} ${doc().extractedData?.payerAddress?.city || ''}, ${doc().extractedData?.payerAddress?.state || ''} ${doc().extractedData?.payerAddress?.zipCode || ''}`}
              </div>
            </Show>
          </div>

          {/* Recipient Information */}
          <Show when={doc().extractedData?.recipientName}>
            <div style={{
              padding: '0.75rem',
              background: 'rgba(8, 145, 178, 0.05)',
              border: '1px dashed rgba(8, 145, 178, 0.3)',
              'border-radius': '6px',
              'margin-bottom': '1rem'
            }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>Recipient</div>
              <div style={{ 'font-weight': '500' }}>{doc().extractedData?.recipientName}</div>
              <Show when={doc().extractedData?.recipientSSN}>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                  SSN: {doc().extractedData?.recipientSSN}
                </div>
              </Show>
            </div>
          </Show>

          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Government Payment Details</div>

          {/* Main Amount - Unemployment Compensation */}
          <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box1 !== undefined && doc().extractedData?.form1099Data?.rawBoxData?.box1 !== null}>
            <div style={{
              padding: '1.25rem',
              background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.1), rgba(6, 182, 212, 0.1))',
              'border-radius': '8px',
              'text-align': 'center',
              'margin-bottom': '0.75rem'
            }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>
                Box 1 - Unemployment Compensation
              </div>
              <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#0891b2' }}>
                ${(doc().extractedData?.form1099Data?.rawBoxData?.box1 || doc().extractedAmounts?.unemploymentCompensation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </Show>

          {/* Other Boxes */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box2}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 2 - State/Local Tax Refund</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedData?.form1099Data?.rawBoxData?.box2 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box3}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 3 - Tax Year</div>
                <div style={{ 'font-weight': '600' }}>
                  {doc().extractedData?.form1099Data?.rawBoxData?.box3}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedData?.form1099Data?.federalIncomeTaxWithheld !== undefined || doc().extractedData?.form1099Data?.rawBoxData?.box4 !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 4 - Federal Tax Withheld</div>
                <div style={{ 'font-weight': '600', color: '#059669' }}>
                  ${(doc().extractedData?.form1099Data?.federalIncomeTaxWithheld ?? doc().extractedData?.form1099Data?.rawBoxData?.box4 ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box5}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 5 - RTAA Payment</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedData?.form1099Data?.rawBoxData?.box5 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box6}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 6 - Taxable Grants</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedData?.form1099Data?.rawBoxData?.box6 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box7}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 7 - Agriculture Payments</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedData?.form1099Data?.rawBoxData?.box7 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
          </div>

          {/* State Information */}
          <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box10a || doc().extractedData?.form1099Data?.rawBoxData?.box10b || doc().extractedData?.form1099Data?.stateIncomeTaxWithheld !== undefined}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.9rem' }}>State Information</div>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(3, 1fr)',
                gap: '0.5rem'
              }}>
                <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box10a}>
                  <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                    <div style={{ 'font-size': '0.7rem', color: 'var(--text-secondary)' }}>Box 10a - State</div>
                    <div style={{ 'font-weight': '600' }}>
                      {doc().extractedData?.form1099Data?.rawBoxData?.box10a}
                    </div>
                  </div>
                </Show>
                <Show when={doc().extractedData?.form1099Data?.rawBoxData?.box10b}>
                  <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                    <div style={{ 'font-size': '0.7rem', color: 'var(--text-secondary)' }}>Box 10b - State ID</div>
                    <div style={{ 'font-weight': '600', 'font-size': '0.85rem' }}>
                      {doc().extractedData?.form1099Data?.rawBoxData?.box10b}
                    </div>
                  </div>
                </Show>
                <Show when={doc().extractedData?.form1099Data?.stateIncomeTaxWithheld !== undefined || doc().extractedData?.form1099Data?.rawBoxData?.box11 !== undefined}>
                  <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                    <div style={{ 'font-size': '0.7rem', color: 'var(--text-secondary)' }}>Box 11 - State Tax Withheld</div>
                    <div style={{ 'font-weight': '600', color: '#059669' }}>
                      ${(doc().extractedData?.form1099Data?.stateIncomeTaxWithheld ?? doc().extractedData?.form1099Data?.rawBoxData?.box11 ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* 1098 Mortgage Interest */}
      <Show when={doc().drakeFormType === '1098'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#ec4899', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1098</span>
            Lender Information
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(236, 72, 153, 0.05)',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Mortgage Interest Statement</div>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <Show when={doc().extractedAmounts?.mortgageInterest !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1 - Mortgage Interest</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem', color: '#ec4899' }}>
                  ${(doc().extractedAmounts?.mortgageInterest || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.propertyTaxes !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 10 - Property Taxes</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem' }}>
                  ${(doc().extractedAmounts?.propertyTaxes || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.mortgageInsurance !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 5 - Mortgage Insurance</div>
                <div style={{ 'font-weight': '600' }}>
                  ${(doc().extractedAmounts?.mortgageInsurance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* 1098-T Tuition Statement */}
      <Show when={doc().drakeFormType === '1098_t'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#14b8a6', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1098-T</span>
            Educational Institution
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(20, 184, 166, 0.05)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
          </div>

          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Tuition Statement</div>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <Show when={doc().extractedAmounts?.tuitionPaid !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1 - Payments Received</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem', color: '#14b8a6' }}>
                  ${(doc().extractedAmounts?.tuitionPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.scholarshipsGrants !== undefined}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 5 - Scholarships/Grants</div>
                <div style={{ 'font-weight': '600', 'font-size': '1.125rem' }}>
                  ${(doc().extractedAmounts?.scholarshipsGrants || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* 1095-A Health Insurance Marketplace Statement */}
      <Show when={doc().drakeFormType === '1095_a' || doc().documentType?.toLowerCase().includes('1095')}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#7c3aed', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1095-A</span>
            Health Insurance Marketplace Statement
          </div>
          <div style={{
            padding: '1rem',
            background: 'rgba(124, 58, 237, 0.05)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name}
              </div>
            </Show>

            <QrButton text={[
                doc().payerInfo?.marketplace?.marketplaceIdentifier || "", '|',
                doc().payerInfo?.marketplace?.policyNumber|| "", '|','|',
                doc().payerInfo?.name || "", '|','|',
                formatDateMMDDYYYY(doc().payerInfo?.marketplace?.policyStartDate) || "", '|',
                formatDateMMDDYYYY(doc().payerInfo?.marketplace?.policyEndDate) || "", '|',
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                Marketplace ID: {doc().payerInfo?.ein}
              </div>
            </Show>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.5rem', 'font-style': 'italic' }}>
              Used for Form 8962 Premium Tax Credit calculation
            </div>
          </div>

           <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(3, 1fr)',
            gap: '0.5rem',
            'margin-bottom': '1rem'
          }}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Annual Totals (Form 8962)</div>
            <QrButton text={[
                doc().extractedAmounts?.annualPremiumAmount || "", '|',
                doc().extractedAmounts?.annualSlcspPremium  || "", '|',
                doc().extractedAmounts?.annualAdvancePtc || "",
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
          </div>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(3, 1fr)',
            gap: '0.5rem',
            'margin-bottom': '1rem'
          }}>
            <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(139, 92, 246, 0.1))', 'border-radius': '8px', 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>Column A - Annual Premium</div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#7c3aed' }}>
                ${(doc().extractedAmounts?.annualPremiumAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(139, 92, 246, 0.1))', 'border-radius': '8px', 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>Column B - SLCSP</div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#7c3aed' }}>
                ${(doc().extractedAmounts?.annualSlcspPremium || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(139, 92, 246, 0.1))', 'border-radius': '8px', 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>Column C - Advance PTC</div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#ef4444' }}>
                ${(doc().extractedAmounts?.annualAdvancePtc || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Coverage Months */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--surface-alt, #f9fafb)',
            'border-radius': '8px',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '1rem'
          }}>
            <span style={{ 'font-weight': '500' }}>Coverage Months</span>
            <div style={{ display: 'flex'}}>
              <span style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#7c3aed', margin: "0 10px 0 0" }}>
                {doc().extractedAmounts?.coverageMonths || 12} months
              </span>
              <Show when={props.onQRMonthly}>
                <QrButton text={props.onQRMonthly!()}
                  handle={props.onTextQR}
                  label=''
                />
              </Show>
            </div>
          </div>

          {/* Monthly Breakdown if available */}
          <Show when={doc().extractedAmounts?.monthlyPremiums?.length}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Monthly Breakdown</div>
            <div style={{
              'overflow-x': 'auto',
              border: '1px solid var(--border-color, #e5e7eb)',
              'border-radius': '8px'
            }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-alt, #f9fafb)' }}>
                    <th style={{ padding: '0.5rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>Month</th>
                    <th style={{ padding: '0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>Premium</th>
                    <th style={{ padding: '0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>SLCSP</th>
                    <th style={{ padding: '0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>APTC</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}>
                    {(month, index) => {
                      const premium = doc().extractedAmounts?.monthlyPremiums?.[index()] || 0;
                      const slcsp = doc().extractedAmounts?.monthlySlcsp?.[index()] || 0;
                      const aptc = doc().extractedAmounts?.monthlyAptc?.[index()] || 0;
                      const hasCoverage = premium > 0;
                      return (
                        <tr style={{ background: hasCoverage ? 'rgba(124, 58, 237, 0.02)' : 'transparent' }}>
                          <td style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)', 'font-weight': hasCoverage ? '500' : '400', color: hasCoverage ? 'var(--text-primary)' : 'var(--text-muted)' }}>{month}</td>
                          <td style={{ padding: '0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', color: hasCoverage ? '#7c3aed' : 'var(--text-muted)' }}>${premium.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', color: hasCoverage ? 'var(--text-primary)' : 'var(--text-muted)' }}>${slcsp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)', color: hasCoverage ? '#ef4444' : 'var(--text-muted)' }}>${aptc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>

      {/* 1099-K Payment Card and Third Party Network Transactions */}
      <Show when={doc().drakeFormType === '1099_k'}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ background: '#f97316', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>1099-K</span>
            Payment Settlement Entity (PSE) Information
          </div>

          {/* PSE (Filer) Information */}
          <div style={{
            padding: '1rem',
            background: 'rgba(249, 115, 22, 0.05)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            'border-radius': '8px',
            'margin-bottom': '1rem'
          }}>
            <Show when={doc().payerInfo?.name || doc().extractedAmounts?.pseName}>
              <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.25rem' }}>
                {doc().payerInfo?.name || doc().extractedAmounts?.pseName}
              </div>
            </Show>
            <QrButton text={[
                doc().payerInfo?.ein || "", '|',
                doc().payerInfo?.name || doc().extractedAmounts?.pseName || "", '|',
                doc().payerInfo?.address || "", '|',
                doc().payerInfo?.zip || "", '|',
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
            <Show when={doc().payerInfo?.ein}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                EIN: {doc().payerInfo?.ein}
              </div>
            </Show>
            <Show when={doc().payerInfo?.address || doc().payerInfo?.city}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                {doc().payerInfo?.address}
                {doc().payerInfo?.city && `, ${doc().payerInfo?.city}`}
                {doc().payerInfo?.state && `, ${doc().payerInfo?.state}`}
                {doc().payerInfo?.zip && ` ${doc().payerInfo?.zip}`}
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.psePhone}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                Phone: {doc().extractedAmounts?.psePhone}
              </div>
            </Show>
            <Show when={doc().extractedAmounts?.merchantCategoryCode}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                Merchant Category Code (MCC): {doc().extractedAmounts?.merchantCategoryCode}
              </div>
            </Show>
          </div>

          {/* Gross Amount Section */}
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            Gross Payment Amounts
            <QrButton text={[
                doc().extractedAmounts?.grossAmount1099K || "", '|',
                doc().extractedAmounts?.cardNotPresentTransactions || "", '|',
                doc().extractedAmounts?.numberOfTransactions || "", '|',
                doc().extractedAmounts?.federalTaxWithheld1099K || "", '|',
              ].join('') || ''}
              handle={props.onTextQR}
              label=''
            />
          </div>
          <div style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(251, 146, 60, 0.1))',
            'border-radius': '8px',
            'text-align': 'center',
            'margin-bottom': '1rem'
          }}>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-bottom': '0.25rem' }}>
              Box 1a - Gross Amount of Payment Card/Third Party Network Transactions
            </div>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#f97316' }}>
              ${(doc().extractedAmounts?.grossAmount1099K || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Additional Boxes Grid */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(3, 1fr)',
            gap: '0.75rem',
            'margin-bottom': '1rem'
          }}>
            <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 1b - Card Not Present</div>
              <div style={{ 'font-weight': '600', 'font-size': '1.125rem' }}>
                ${(doc().extractedAmounts?.cardNotPresentTransactions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 3 - Number of Transactions</div>
              <div style={{ 'font-weight': '600', 'font-size': '1.125rem' }}>
                {(doc().extractedAmounts?.numberOfTransactions || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(5, 150, 105, 0.1)', 'border-radius': '6px' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Box 4 - Federal Tax Withheld</div>
              <div style={{ 'font-weight': '600', 'font-size': '1.125rem', color: '#059669' }}>
                ${(doc().extractedAmounts?.federalTaxWithheld1099K || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Monthly Breakdown if available */}
          <Show when={doc().extractedAmounts?.monthlyGrossAmounts}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              Monthly Gross Amounts (Boxes 5a-5l)
              <QrButton text={(() => {
                  const monthly = doc().extractedAmounts?.monthlyGrossAmounts || {};
                  return [
                    monthly.january || "", '|',
                    monthly.february || "", '|',
                    monthly.march || "", '|',
                    monthly.april || "", '|',
                    monthly.may || "", '|',
                    monthly.june || "", '|',
                    monthly.july || "", '|',
                    monthly.august || "", '|',
                    monthly.september || "", '|',
                    monthly.october || "", '|',
                    monthly.november || "", '|',
                    monthly.december || "",
                  ].join('');
                })()}
                handle={props.onTextQR}
                label=''
              />
            </div>
            <div style={{ 'overflow-x': 'auto', 'margin-bottom': '1rem' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                    <For each={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}>
                      {(month) => (
                        <th style={{ padding: '0.5rem', 'text-align': 'center', 'font-weight': '600', 'font-size': '0.75rem' }}>{month}</th>
                      )}
                    </For>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {(() => {
                      const monthly = doc().extractedAmounts?.monthlyGrossAmounts || {};
                      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;
                      return months.map((m) => (
                        <td style={{ padding: '0.5rem', 'text-align': 'center', 'border-top': '1px solid #e5e7eb' }}>
                          ${((monthly as any)[m] || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </td>
                      ));
                    })()}
                  </tr>
                </tbody>
              </table>
            </div>
          </Show>

          {/* State Information */}
          <Show when={doc().extractedAmounts?.stateAbbreviation1099K || doc().extractedAmounts?.stateTaxWithheld1099K}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.9rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              State Information
              <QrButton text={[
                  doc().extractedAmounts?.stateAbbreviation1099K || "", '|',
                  doc().extractedAmounts?.stateIdNumber1099K || "", '|',
                  doc().extractedAmounts?.stateTaxWithheld1099K || "",
                ].join('') || ''}
                handle={props.onTextQR}
                label=''
              />
            </div>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(3, 1fr)',
              gap: '0.5rem'
            }}>
              <Show when={doc().extractedAmounts?.stateAbbreviation1099K}>
                <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                  <div style={{ 'font-size': '0.7rem', color: 'var(--text-secondary)' }}>Box 6 - State</div>
                  <div style={{ 'font-weight': '600' }}>
                    {doc().extractedAmounts?.stateAbbreviation1099K}
                  </div>
                </div>
              </Show>
              <Show when={doc().extractedAmounts?.stateIdNumber1099K}>
                <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                  <div style={{ 'font-size': '0.7rem', color: 'var(--text-secondary)' }}>Box 7 - State ID</div>
                  <div style={{ 'font-weight': '600', 'font-size': '0.85rem' }}>
                    {doc().extractedAmounts?.stateIdNumber1099K}
                  </div>
                </div>
              </Show>
              <Show when={doc().extractedAmounts?.stateTaxWithheld1099K}>
                <div style={{ padding: '0.5rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                  <div style={{ 'font-size': '0.7rem', color: 'var(--text-secondary)' }}>Box 8 - State Tax Withheld</div>
                  <div style={{ 'font-weight': '600', color: '#059669' }}>
                    ${(doc().extractedAmounts?.stateTaxWithheld1099K || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      {/* Generic Extracted Amounts (for 'other' or unknown types) */}
      <Show when={!['w2', '1099_nec', '1099_misc', '1099_int', '1099_div', '1099_r', '1098', '1098_t', '1095_a', '1099_g', '1099_k'].includes(doc().drakeFormType || '') && !doc().documentType?.toLowerCase().includes('1095') && (doc().documentType as string) !== '1099-G' && (doc().documentType as string) !== '1099-R' && doc().extractedAmounts}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Extracted Amounts</div>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem'
          }}>
            <For each={Object.entries(doc().extractedAmounts || {})}>
              {([key, value]) => (
                <Show when={value !== undefined && value !== null && typeof value === 'number'}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--surface-alt, #f9fafb)',
                    'border-radius': '6px',
                    'font-size': '0.875rem'
                  }}>
                    <div style={{ color: 'var(--text-secondary)', 'font-size': '0.75rem', 'text-transform': 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div style={{ 'font-weight': '600' }}>
                      ${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </Show>
              )}
            </For>
          </div>
        </div>
      </Show>
    </>
  );
};

export default TaxFormViewer;
