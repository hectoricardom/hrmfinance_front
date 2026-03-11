import { Component, createSignal, Show, For } from 'solid-js';
import { Card, Button, FormInput, FormSelect } from '../../ui';
import { PassportRequest } from '../types';
import { extractSignatureFromImage, enhanceSignature } from '../utils/signatureExtractor';
import { generatePassportPDF } from '../services/pdfGenerator';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

interface PassportRequestFormProps {
  onSubmit?: (request: PassportRequest) => void;
  initialData?: Partial<PassportRequest>;
}

const PassportRequestForm: Component<PassportRequestFormProps> = (props) => {
  const { t } = useTranslation();
  
  // Form state
  const [formData, setFormData] = createSignal<Partial<PassportRequest>>({
    documentType: 'passport',
    gender: 'M',
    status: 'draft',
    address: {},
    emergencyContact: {},
    ...props.initialData
  });
  
  const [signatureFile, setSignatureFile] = createSignal<File | null>(null);
  const [signatureExtracted, setSignatureExtracted] = createSignal(false);
  const [extracting, setExtracting] = createSignal(false);
  const [generating, setGenerating] = createSignal(false);
  
  // Form update helpers
  const updateFormData = (field: keyof PassportRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const updateAddress = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };
  
  const updateEmergencyContact = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value }
    }));
  };
  
  const updatePreviousPassport = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      previousPassport: { ...prev.previousPassport, [field]: value }
    }));
  };
  
  // Handle signature file selection
  const handleSignatureFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      setSignatureFile(file);
      extractSignature(file);
    }
  };
  
  // Extract signature from image
  const extractSignature = async (file: File) => {
    setExtracting(true);
    setSignatureExtracted(false);
    
    try {
      const result = await extractSignatureFromImage(file);
      
      if (result.success && result.signatureDataUrl) {
        const enhanced = await enhanceSignature(result.signatureDataUrl);
        updateFormData('signatureDataUrl', enhanced);
        updateFormData('signatureExtracted', true);
        setSignatureExtracted(true);
        
        devLog(`Signature extracted with confidence: ${result.confidence}`);
      } else {
        alert(result.error || 'Failed to extract signature');
      }
    } catch (error) {
      devLog('Error extracting signature:', error);
      alert('Error extracting signature');
    } finally {
      setExtracting(false);
    }
  };
  
  // Generate PDF
  const handleGeneratePDF = async () => {
    const data = formData();
    
    // Validate required fields
    if (!data.firstName || !data.lastName || !data.dateOfBirth) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (!data.signatureDataUrl) {
      alert('Please upload and extract a signature first');
      return;
    }
    
    setGenerating(true);
    
    try {
      const pdfBlob = await generatePassportPDF(data as PassportRequest);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passport_request_${data.lastName}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Update form data with generated status
      updateFormData('generatedPdfUrl', url);
      updateFormData('status', 'submitted');
      updateFormData('submittedAt', new Date().toISOString());
      
      if (props.onSubmit) {
        props.onSubmit({
          ...data,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current_user'
        } as PassportRequest);
      }
    } catch (error) {
      devLog('Error generating PDF:', error);
      alert('Error generating PDF');
    } finally {
      setGenerating(false);
    }
  };
  
  const sectionStyle = {
    'margin-bottom': '2rem',
    'padding-bottom': '1.5rem',
    'border-bottom': '1px solid var(--border-color)'
  };
  
  const sectionTitleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)'
  };
  
  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  };
  
  return (
    <Card>
      <div style={{ padding: '2rem' }}>
        <h2 style={{
          'font-size': '1.75rem',
          'font-weight': '700',
          'margin-bottom': '2rem',
          color: 'var(--text-primary)'
        }}>
          {t('passport.requestForm.title', 'Passport Request Form')}
        </h2>
        
        {/* Personal Information Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            {t('passport.sections.personal', 'Personal Information')}
          </h3>
          <div style={gridStyle}>
            <FormInput
              label={t('passport.fields.firstName', 'First Name')}
              value={formData().firstName || ''}
              onChange={(value) => updateFormData('firstName', value)}
              required
            />
            <FormInput
              label={t('passport.fields.middleName', 'Middle Name')}
              value={formData().middleName || ''}
              onChange={(value) => updateFormData('middleName', value)}
            />
            <FormInput
              label={t('passport.fields.lastName', 'Last Name')}
              value={formData().lastName || ''}
              onChange={(value) => updateFormData('lastName', value)}
              required
            />
            <FormInput
              label={t('passport.fields.dateOfBirth', 'Date of Birth')}
              type="date"
              value={formData().dateOfBirth || ''}
              onChange={(value) => updateFormData('dateOfBirth', value)}
              required
            />
            <FormInput
              label={t('passport.fields.placeOfBirth', 'Place of Birth')}
              value={formData().placeOfBirth || ''}
              onChange={(value) => updateFormData('placeOfBirth', value)}
              required
            />
            <FormInput
              label={t('passport.fields.nationality', 'Nationality')}
              value={formData().nationality || ''}
              onChange={(value) => updateFormData('nationality', value)}
              required
            />
            <FormSelect
              label={t('passport.fields.gender', 'Gender')}
              value={formData().gender || 'M'}
              onChange={(value) => updateFormData('gender', value as 'M' | 'F' | 'X')}
              options={[
                { value: 'M', label: t('passport.gender.male', 'Male') },
                { value: 'F', label: t('passport.gender.female', 'Female') },
                { value: 'X', label: t('passport.gender.other', 'Other') }
              ]}
              required
            />
          </div>
        </div>
        
        {/* Contact Information Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            {t('passport.sections.contact', 'Contact Information')}
          </h3>
          <div style={gridStyle}>
            <FormInput
              label={t('passport.fields.street', 'Street Address')}
              value={formData().address?.street || ''}
              onChange={(value) => updateAddress('street', value)}
              required
            />
            <FormInput
              label={t('passport.fields.city', 'City')}
              value={formData().address?.city || ''}
              onChange={(value) => updateAddress('city', value)}
              required
            />
            <FormInput
              label={t('passport.fields.state', 'State/Province')}
              value={formData().address?.state || ''}
              onChange={(value) => updateAddress('state', value)}
              required
            />
            <FormInput
              label={t('passport.fields.zipCode', 'ZIP/Postal Code')}
              value={formData().address?.zipCode || ''}
              onChange={(value) => updateAddress('zipCode', value)}
              required
            />
            <FormInput
              label={t('passport.fields.country', 'Country')}
              value={formData().address?.country || ''}
              onChange={(value) => updateAddress('country', value)}
              required
            />
            <FormInput
              label={t('passport.fields.phone', 'Phone Number')}
              type="tel"
              value={formData().phone || ''}
              onChange={(value) => updateFormData('phone', value)}
              required
            />
            <FormInput
              label={t('passport.fields.email', 'Email Address')}
              type="email"
              value={formData().email || ''}
              onChange={(value) => updateFormData('email', value)}
              required
            />
          </div>
        </div>
        
        {/* Document Type Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            {t('passport.sections.document', 'Document Information')}
          </h3>
          <div style={gridStyle}>
            <FormSelect
              label={t('passport.fields.documentType', 'Document Type')}
              value={formData().documentType || 'passport'}
              onChange={(value) => updateFormData('documentType', value as 'passport' | 'renewal' | 'replacement')}
              options={[
                { value: 'passport', label: t('passport.docType.new', 'New Passport') },
                { value: 'renewal', label: t('passport.docType.renewal', 'Passport Renewal') },
                { value: 'replacement', label: t('passport.docType.replacement', 'Passport Replacement') }
              ]}
              required
            />
          </div>
          
          {/* Previous Passport (for renewal/replacement) */}
          <Show when={formData().documentType !== 'passport'}>
            <div style={{ 'margin-top': '1rem' }}>
              <h4 style={{
                'font-size': '1.125rem',
                'font-weight': '500',
                'margin-bottom': '0.75rem',
                color: 'var(--text-primary)'
              }}>
                {t('passport.sections.previousPassport', 'Previous Passport Information')}
              </h4>
              <div style={gridStyle}>
                <FormInput
                  label={t('passport.fields.passportNumber', 'Passport Number')}
                  value={formData().previousPassport?.number || ''}
                  onChange={(value) => updatePreviousPassport('number', value)}
                />
                <FormInput
                  label={t('passport.fields.issueDate', 'Issue Date')}
                  type="date"
                  value={formData().previousPassport?.issueDate || ''}
                  onChange={(value) => updatePreviousPassport('issueDate', value)}
                />
                <FormInput
                  label={t('passport.fields.expiryDate', 'Expiry Date')}
                  type="date"
                  value={formData().previousPassport?.expiryDate || ''}
                  onChange={(value) => updatePreviousPassport('expiryDate', value)}
                />
              </div>
            </div>
          </Show>
        </div>
        
        {/* Emergency Contact Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            {t('passport.sections.emergency', 'Emergency Contact')}
          </h3>
          <div style={gridStyle}>
            <FormInput
              label={t('passport.fields.emergencyName', 'Contact Name')}
              value={formData().emergencyContact?.name || ''}
              onChange={(value) => updateEmergencyContact('name', value)}
              required
            />
            <FormInput
              label={t('passport.fields.emergencyRelation', 'Relationship')}
              value={formData().emergencyContact?.relationship || ''}
              onChange={(value) => updateEmergencyContact('relationship', value)}
              required
            />
            <FormInput
              label={t('passport.fields.emergencyPhone', 'Phone Number')}
              type="tel"
              value={formData().emergencyContact?.phone || ''}
              onChange={(value) => updateEmergencyContact('phone', value)}
              required
            />
          </div>
        </div>
        
        {/* Signature Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            {t('passport.sections.signature', 'Signature')}
          </h3>
          
          <div style={{
            background: 'var(--gray-50)',
            padding: '1rem',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1rem'
          }}>
            <p style={{
              'font-size': '0.875rem',
              color: 'var(--text-muted)',
              'margin-bottom': '0.5rem'
            }}>
              {t('passport.signature.instructions', 
                'Upload an image containing your signature. The system will extract and process it automatically.')}
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureFileSelect}
              style={{ display: 'none' }}
              id="signature-upload"
            />
            <label
              for="signature-upload"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'var(--primary-color)',
                color: 'white',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-weight': '500',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-dark)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
            >
              {t('passport.signature.upload', 'Upload Signature Image')}
            </label>
            
            <Show when={extracting()}>
              <div style={{
                'margin-top': '1rem',
                color: 'var(--primary-color)',
                'font-size': '0.875rem'
              }}>
                {t('passport.signature.extracting', 'Extracting signature...')}
              </div>
            </Show>
          </div>
          
          <Show when={formData().signatureDataUrl}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              background: 'white'
            }}>
              <h4 style={{
                'font-size': '1rem',
                'font-weight': '500',
                'margin-bottom': '0.75rem',
                color: 'var(--text-primary)'
              }}>
                {t('passport.signature.extracted', 'Extracted Signature')}
              </h4>
              <img
                src={formData().signatureDataUrl}
                alt="Extracted Signature"
                style={{
                  'max-width': '300px',
                  'max-height': '150px',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  padding: '0.5rem'
                }}
              />
              <Show when={signatureExtracted()}>
                <p style={{
                  'margin-top': '0.5rem',
                  color: 'var(--success-color)',
                  'font-size': '0.875rem'
                }}>
                  ✓ {t('passport.signature.success', 'Signature successfully extracted')}
                </p>
              </Show>
            </div>
          </Show>
        </div>
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-top': '2rem'
        }}>
          <Button
            onClick={handleGeneratePDF}
            disabled={generating() || !formData().signatureDataUrl}
            variant="primary"
          >
            <Show when={generating()} fallback={t('passport.actions.generate', 'Generate PDF')}>
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
                {t('passport.actions.generating', 'Generating...')}
              </span>
            </Show>
          </Button>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              onClick={() => {
                if (confirm(t('passport.actions.clearConfirm', 'Are you sure you want to clear the form?'))) {
                  setFormData({
                    documentType: 'passport',
                    gender: 'M',
                    status: 'draft',
                    address: {},
                    emergencyContact: {}
                  });
                  setSignatureFile(null);
                  setSignatureExtracted(false);
                }
              }}
              variant="secondary"
              size="sm"
            >
              {t('passport.actions.clear', 'Clear Form')}
            </Button>
          </div>
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

export default PassportRequestForm;