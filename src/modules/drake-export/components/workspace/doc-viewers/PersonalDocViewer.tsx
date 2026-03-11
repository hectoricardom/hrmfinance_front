/**
 * PersonalDocViewer
 * Renders card-like visualizations for personal documents (ID cards, SSN cards, passports).
 */
import { Component, Show } from 'solid-js';
import type { DrakeTaxDocument } from '../../../types/drakeTypes';

interface PersonalDocViewerProps {
  document: DrakeTaxDocument;
  compact?: boolean;
}

/**
 * Extract best-available personal data from a document.
 * Data can arrive from multiple server paths:
 *   1. doc.extractedData  — raw server extraction (has [key:string]:any)
 *   2. doc.aiAnalysis.extractedData — AI classification result (ExtractedDocumentData)
 *   3. doc.extractedAmounts — mapped tax amounts (recipientName, recipientSSN)
 * Fields may use different names depending on server version / doc type.
 */
const getPersonalData = (doc: DrakeTaxDocument) => {
  const ed = doc.extractedData || {} as any;
  const ai = doc.aiAnalysis?.extractedData || {} as any;
  const ea = doc.extractedAmounts || {} as any;
  // Server nests detailed ID/passport data under identificationData
  const id = ed.identificationData || ai.identificationData || {} as any;
  // Address may be nested object inside identificationData
  const idAddr = id.address || {} as any;

  // Name: prefer identificationData (most detailed), then separated fields, then recipientName
  const name =
    [id.firstName, id.middleName, id.lastName].filter(Boolean).join(' ') ||
    [ed.firstName, ed.middleName, ed.lastName].filter(Boolean).join(' ') ||
    [ai.firstName, ai.middleName, ai.lastName].filter(Boolean).join(' ') ||
    id.fullName ||
    ed.recipientName ||
    ea.recipientName ||
    ai.recipientName ||
    ed.fullName ||
    ai.fullName ||
    '';

  // SSN: from identificationData (socialSecurityNumber / ssnLastFour) or top-level
  const ssn =
    id.socialSecurityNumber ||
    ed.ssn || ed.recipientSSN || ed.employeeSSN ||
    ai.ssn || ai.recipientSSN ||
    ea.recipientSSN ||
    (id.ssnLastFour ? `***-**-${id.ssnLastFour}` : '') ||
    '';

  // Date of birth
  const dateOfBirth =
    id.dateOfBirth ||
    ed.dateOfBirth || ai.dateOfBirth ||
    ed.dob || ai.dob || '';

  // Address: prefer identificationData address, then top-level fields
  const addressParts = [
    idAddr.street || ed.address || ai.address || '',
    idAddr.city || ed.city || ai.city || '',
    idAddr.state || ed.state || ai.state || '',
    idAddr.zipCode || ed.zipCode || ai.zipCode || '',
  ].filter(Boolean);
  const address = addressParts.length > 0
    ? addressParts.join(', ')
    : idAddr.fullAddress || ed.fullAddress || ai.fullAddress || '';

  // ID/document number
  const idNumber =
    id.documentNumber ||
    ed.idNumber || ed.documentNumber ||
    ai.documentNumber || ai.idNumber ||
    ed.licenseNumber || ai.licenseNumber ||
    ed.passportNumber || ai.passportNumber || id.passportNumber ||
    '';

  // Expiration
  const expirationDate =
    id.expirationDate ||
    ed.expirationDate || ai.expirationDate ||
    ed.expDate || ai.expDate || '';

  // Issue date
  const issueDate =
    id.issueDate ||
    ed.issueDate || ai.issueDate || '';

  // Issuing state (driver's licenses)
  const issuingState =
    id.issuingState ||
    ed.idState || ed.issuingState ||
    ai.issuingState || ai.state ||
    '';

  // Issuing country (passports)
  const issuingCountry =
    id.issuingCountry ||
    ai.issuingCountry || ed.issuingCountry ||
    ai.country || ed.country ||
    id.passportCountry ||
    ai.nationality || ed.nationality ||
    '';

  // Gender
  const gender = id.gender || ed.gender || ai.gender || ed.sex || ai.sex || '';

  // Extra fields from identificationData
  const height = id.height || '';
  const eyeColor = id.eyeColor || '';
  const hairColor = id.hairColor || '';
  const idSubtype = id.idSubtype || ed.documentSubtype || '';

  // Effective document type: prefer doc.documentType, fallback to AI detection, then extractedData, then identificationData
  let documentType =
    (doc.documentType as string) ||
    (doc.aiAnalysis?.detectedType as string) ||
    (doc.aiAnalysis?.documentType as string) ||
    (ed.documentType as string) ||
    (ai.documentType as string) ||
    (id.idType as string) ||
    '';

  // If documentType is generic ('other', empty), infer from extracted fields
  if (!documentType || documentType === 'other') {
    if (id.passportCountry || ed.passportNumber || ai.passportNumber || (issuingCountry && issuingCountry !== 'US' && issuingCountry !== 'USA')) {
      documentType = 'passport';
    } else if (issuingState || idNumber) {
      documentType = 'driver_license';
    } else if (ssn && !idNumber) {
      documentType = 'social_security_card';
    }
  }

  return {
    name, ssn, dateOfBirth, address, idNumber,
    expirationDate, issueDate, issuingState, issuingCountry,
    gender, documentType, height, eyeColor, hairColor, idSubtype,
  };
};

/**
 * Classification helpers — match against:
 *   - DB values: 'driver_license', 'social_security_card', 'passport'
 *   - AI-detected types which may match the same or use different casing
 *   - User-entered / free-text document type labels
 */
const isDriversLicense = (docType: string) =>
  /driver|license|state.?id|dl\b|driver_license|id.?card|identification/i.test(docType);

const isSSNCard = (docType: string) =>
  /ssn|social.?security|social_security_card/i.test(docType);

const isPassport = (docType: string) =>
  /passport/i.test(docType);

const isGreenCard = (docType: string) =>
  /green.?card|permanent.?resident|i-?551/i.test(docType);

const isVisa = (docType: string) =>
  /\bvisa\b|i-?94\b/i.test(docType);

const maskSSN = (ssn: string): string => {
  if (!ssn) return '';
  const digits = ssn.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `***-**-${digits.slice(-4)}`;
  }
  return ssn;
};

/** Full-size card for modal view */
const FullCard: Component<{ doc: DrakeTaxDocument }> = (props) => {
  const data = () => getPersonalData(props.doc);
  const docType = () => data().documentType;

  return (
    <div style={{ 'margin-bottom': '1.5rem' }}>
      <Show when={isDriversLicense(docType())}>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%)',
          'border-radius': '12px',
          padding: '1.5rem',
          color: 'white',
          'min-height': '200px',
          position: 'relative',
          overflow: 'hidden',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {/* Background pattern */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '120px',
            height: '120px',
            background: 'rgba(255,255,255,0.05)',
            'border-radius': '0 0 0 100%',
          }} />

          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '1rem' }}>
            <div>
              <div style={{ 'font-size': '0.6875rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.7' }}>
                {data().issuingState ? `${data().issuingState} ` : ''}{/state.?id|id.?card|identification/i.test(docType()) ? 'Identification Card' : 'Driver\'s License / State ID'}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-top': '0.25rem' }}>
                {data().name || 'Name not extracted'}
              </div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255,255,255,0.15)',
              'border-radius': '8px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <circle cx="8" cy="11" r="2.5" />
                <path d="M14 10h4M14 14h4M4 18c0-2 2-3 4-3s4 1 4 3" />
              </svg>
            </div>
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.75rem', 'margin-top': '0.75rem' }}>
            <Show when={data().idNumber}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>ID Number</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600', 'font-family': 'monospace' }}>{data().idNumber}</div>
              </div>
            </Show>
            <Show when={data().dateOfBirth}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Date of Birth</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().dateOfBirth}</div>
              </div>
            </Show>
            <Show when={data().ssn}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>SSN</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600', 'font-family': 'monospace' }}>{maskSSN(data().ssn)}</div>
              </div>
            </Show>
            <Show when={data().gender}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Sex</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().gender}</div>
              </div>
            </Show>
            <Show when={data().issueDate}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Issued</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().issueDate}</div>
              </div>
            </Show>
            <Show when={data().expirationDate}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Expires</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().expirationDate}</div>
              </div>
            </Show>
            <Show when={data().height}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Height</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().height}</div>
              </div>
            </Show>
            <Show when={data().eyeColor}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Eyes</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().eyeColor}</div>
              </div>
            </Show>
          </div>

          <Show when={data().address}>
            <div style={{ 'margin-top': '0.75rem' }}>
              <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Address</div>
              <div style={{ 'font-size': '0.8125rem', 'margin-top': '0.125rem' }}>{data().address}</div>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={isSSNCard(docType())}>
        <div style={{
          background: 'linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%)',
          'border-radius': '12px',
          padding: '1.5rem',
          color: '#1a1a2e',
          'min-height': '160px',
          position: 'relative',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #d5d5c8',
        }}>
          <div style={{
            'font-size': '0.75rem',
            'text-transform': 'uppercase',
            'letter-spacing': '0.15em',
            color: '#0055a4',
            'font-weight': '700',
            'text-align': 'center',
            'margin-bottom': '0.5rem',
          }}>
            Social Security
          </div>
          <div style={{
            'text-align': 'center',
            'font-size': '0.625rem',
            'text-transform': 'uppercase',
            'letter-spacing': '0.08em',
            color: '#666',
            'margin-bottom': '1rem',
          }}>
            Account Number
          </div>

          <div style={{
            'text-align': 'center',
            'font-size': '1.75rem',
            'font-weight': '700',
            'font-family': 'monospace',
            'letter-spacing': '0.15em',
            color: '#0055a4',
            'margin-bottom': '1rem',
          }}>
            {maskSSN(data().ssn) || '***-**-****'}
          </div>

          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>
              {data().name || 'Name not extracted'}
            </div>
          </div>
        </div>
      </Show>

      <Show when={isPassport(docType())}>
        <div style={{
          background: 'linear-gradient(135deg, #1a3c34 0%, #2d6650 50%, #1a3c34 100%)',
          'border-radius': '12px',
          padding: '1.5rem',
          color: 'white',
          'min-height': '200px',
          position: 'relative',
          overflow: 'hidden',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {/* Decorative emblem area */}
          <div style={{
            position: 'absolute',
            top: '50%',
            right: '1.5rem',
            transform: 'translateY(-50%)',
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.06)',
            'border-radius': '50%',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>

          <div style={{ 'font-size': '0.6875rem', 'text-transform': 'uppercase', 'letter-spacing': '0.15em', opacity: '0.7' }}>
            Passport {data().issuingCountry ? `- ${data().issuingCountry}` : ''}
          </div>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-top': '0.375rem' }}>
            {data().name || 'Name not extracted'}
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.75rem', 'margin-top': '1rem' }}>
            <Show when={data().idNumber}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Passport No.</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600', 'font-family': 'monospace' }}>{data().idNumber}</div>
              </div>
            </Show>
            <Show when={data().dateOfBirth}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Date of Birth</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().dateOfBirth}</div>
              </div>
            </Show>
            <Show when={data().ssn}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>SSN</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600', 'font-family': 'monospace' }}>{maskSSN(data().ssn)}</div>
              </div>
            </Show>
            <Show when={data().gender}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Sex</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().gender}</div>
              </div>
            </Show>
            <Show when={data().issueDate}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Issue Date</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().issueDate}</div>
              </div>
            </Show>
            <Show when={data().expirationDate}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Expiration</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().expirationDate}</div>
              </div>
            </Show>
            <Show when={data().issuingCountry}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Nationality</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().issuingCountry}</div>
              </div>
            </Show>
          </div>

          <Show when={data().address}>
            <div style={{ 'margin-top': '0.75rem' }}>
              <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Address</div>
              <div style={{ 'font-size': '0.8125rem', 'margin-top': '0.125rem' }}>{data().address}</div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Green Card / Visa / I-94 — similar to passport layout */}
      <Show when={!isDriversLicense(docType()) && !isSSNCard(docType()) && !isPassport(docType()) && (isGreenCard(docType()) || isVisa(docType()))}>
        <div style={{
          background: isGreenCard(docType())
            ? 'linear-gradient(135deg, #1a4731 0%, #2d7a50 50%, #1a4731 100%)'
            : 'linear-gradient(135deg, #4a1d6e 0%, #6b3fa0 50%, #4a1d6e 100%)',
          'border-radius': '12px',
          padding: '1.5rem',
          color: 'white',
          'min-height': '180px',
          position: 'relative',
          overflow: 'hidden',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <div style={{ 'font-size': '0.6875rem', 'text-transform': 'uppercase', 'letter-spacing': '0.15em', opacity: '0.7' }}>
            {isGreenCard(docType()) ? 'Permanent Resident Card' : 'Visa / I-94'}
          </div>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-top': '0.375rem' }}>
            {data().name || 'Name not extracted'}
          </div>
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '0.75rem', 'margin-top': '1rem' }}>
            <Show when={data().idNumber}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Document No.</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600', 'font-family': 'monospace' }}>{data().idNumber}</div>
              </div>
            </Show>
            <Show when={data().dateOfBirth}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Date of Birth</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().dateOfBirth}</div>
              </div>
            </Show>
            <Show when={data().ssn}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>SSN</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600', 'font-family': 'monospace' }}>{maskSSN(data().ssn)}</div>
              </div>
            </Show>
            <Show when={data().gender}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Sex</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().gender}</div>
              </div>
            </Show>
            <Show when={data().issueDate}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Issued</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().issueDate}</div>
              </div>
            </Show>
            <Show when={data().expirationDate}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Expiration</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().expirationDate}</div>
              </div>
            </Show>
            <Show when={data().issuingCountry}>
              <div>
                <div style={{ 'font-size': '0.625rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em', opacity: '0.6' }}>Country</div>
                <div style={{ 'font-size': '1rem', 'font-weight': '600' }}>{data().issuingCountry}</div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Fallback: unknown personal doc type (birth certificate, etc.) */}
      <Show when={!isDriversLicense(docType()) && !isSSNCard(docType()) && !isPassport(docType()) && !isGreenCard(docType()) && !isVisa(docType())}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(139, 92, 246, 0.02))',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          'border-radius': '12px',
          padding: '1.25rem',
        }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#8b5cf6' }}>
            {docType() || 'Personal Document'}
          </div>
          <Show when={data().name}>
            <div style={{ 'font-size': '0.875rem' }}>Name: {data().name}</div>
          </Show>
          <Show when={data().ssn}>
            <div style={{ 'font-size': '0.875rem' }}>SSN: {maskSSN(data().ssn)}</div>
          </Show>
          <Show when={data().dateOfBirth}>
            <div style={{ 'font-size': '0.875rem' }}>DOB: {data().dateOfBirth}</div>
          </Show>
          <Show when={data().idNumber}>
            <div style={{ 'font-size': '0.875rem' }}>ID: {data().idNumber}</div>
          </Show>
          <Show when={data().gender}>
            <div style={{ 'font-size': '0.875rem' }}>Sex: {data().gender}</div>
          </Show>
          <Show when={data().issueDate}>
            <div style={{ 'font-size': '0.875rem' }}>Issued: {data().issueDate}</div>
          </Show>
          <Show when={data().expirationDate}>
            <div style={{ 'font-size': '0.875rem' }}>Exp: {data().expirationDate}</div>
          </Show>
          <Show when={data().address}>
            <div style={{ 'font-size': '0.875rem' }}>Address: {data().address}</div>
          </Show>
          <Show when={data().issuingCountry}>
            <div style={{ 'font-size': '0.875rem' }}>Country: {data().issuingCountry}</div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

/** Compact inline card for grouped list */
const CompactCard: Component<{ doc: DrakeTaxDocument }> = (props) => {
  const data = () => getPersonalData(props.doc);
  const docType = () => data().documentType;

  const getBgColor = () => {
    if (isDriversLicense(docType())) return 'linear-gradient(135deg, #1e3a5f, #2d5a8e)';
    if (isSSNCard(docType())) return 'linear-gradient(135deg, #f5f5f0, #e8e8e0)';
    if (isPassport(docType())) return 'linear-gradient(135deg, #1a3c34, #2d6650)';
    if (isGreenCard(docType())) return 'linear-gradient(135deg, #1a4731, #2d7a50)';
    if (isVisa(docType())) return 'linear-gradient(135deg, #4a1d6e, #6b3fa0)';
    return 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))';
  };

  const getTextColor = () => {
    if (isSSNCard(docType())) return '#1a1a2e';
    if (isDriversLicense(docType()) || isPassport(docType()) || isGreenCard(docType()) || isVisa(docType())) return 'white';
    return 'var(--text-primary)';
  };

  const getLabel = () => {
    if (isDriversLicense(docType())) return 'ID';
    if (isSSNCard(docType())) return 'SSN';
    if (isPassport(docType())) return 'PASS';
    if (isGreenCard(docType())) return 'GC';
    if (isVisa(docType())) return 'VISA';
    return 'DOC';
  };

  return (
    <div style={{
      display: 'flex',
      'align-items': 'center',
      gap: '0.625rem',
      padding: '0.5rem 0.75rem',
      background: getBgColor(),
      'border-radius': '8px',
      'margin-top': '0.5rem',
    }}>
      <div style={{
        'font-size': '0.5625rem',
        'font-weight': '700',
        'text-transform': 'uppercase',
        'letter-spacing': '0.08em',
        padding: '0.125rem 0.375rem',
        'border-radius': '3px',
        background: isSSNCard(docType()) ? '#0055a4' : 'rgba(255,255,255,0.2)',
        color: isSSNCard(docType()) ? 'white' : getTextColor(),
        'flex-shrink': '0',
      }}>
        {getLabel()}
      </div>
      <div style={{ flex: '1', 'min-width': '0', color: getTextColor() }}>
        <div style={{ 'font-weight': '600', 'font-size': '0.8125rem', 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis' }}>
          {data().name || 'Name not extracted'}
        </div>
        <div style={{ 'font-size': '0.6875rem', opacity: '0.8', display: 'flex', gap: '0.75rem' }}>
          <Show when={isSSNCard(docType()) && data().ssn}>
            <span style={{ 'font-family': 'monospace' }}>{maskSSN(data().ssn)}</span>
          </Show>
          <Show when={!isSSNCard(docType()) && data().idNumber}>
            <span style={{ 'font-family': 'monospace' }}>{data().idNumber}</span>
          </Show>
          <Show when={data().expirationDate}>
            <span>Exp: {data().expirationDate}</span>
          </Show>
          <Show when={data().dateOfBirth && !data().expirationDate}>
            <span>DOB: {data().dateOfBirth}</span>
          </Show>
        </div>
      </div>
    </div>
  );
};

const PersonalDocViewer: Component<PersonalDocViewerProps> = (props) => {
  return (
    <Show when={props.compact} fallback={<FullCard doc={props.document} />}>
      <CompactCard doc={props.document} />
    </Show>
  );
};

export default PersonalDocViewer;
