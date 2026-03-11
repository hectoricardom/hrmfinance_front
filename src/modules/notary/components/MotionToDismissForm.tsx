import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import {
  MotionToDismissData,
  RespondentInfo,
  IMMIGRATION_COURTS,
  COURT_ADDRESSES,
  getCourtAddresses,
  DHS_OFFICES,
  getEmptyMotionData,
  formatANumber,
  validateANumber,
  MotionType,
  MotionBasis,
  ServiceMethod
} from '../types/motionToDismiss';
import {
  downloadMotionPDF,
  downloadMotionText,
  generateMotionTextDocument
} from '../services/motionToDismissGenerator';
import {
  generateFactualBackgroundPrompt,
  generateLegalArgumentsPrompt,
  copyToClipboard
} from '../services/motionTextGenerator';
import CustomerSearchDropdown from './CustomerSearchDropdown';
import { inventoryApi } from '../../../services/apiAdapter';
import { NotaryCustomer, FamilyMember } from '../types';
import { devLog } from '../../../services/utils';

interface MotionToDismissFormProps {
  initialData?: Partial<MotionToDismissData>;
  onSave?: (data: MotionToDismissData) => void;
  onCancel?: () => void;
}

// Pro Se motion - no attorney tab needed
type TabType = 'case' | 'respondent' | 'motion' | 'service' | 'preview';

const MotionToDismissForm: Component<MotionToDismissFormProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<TabType>('case');
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [linkedClientId, setLinkedClientId] = createSignal('');

  // Initialize with empty data or provided data
  const initialData = props.initialData || getEmptyMotionData();

  // Case Information
  const [aNumber, setANumber] = createSignal(initialData.aNumber || '');
  const [courtLocation, setCourtLocation] = createSignal(initialData.courtLocation || 'MIAMI');
  const [judgeName, setJudgeName] = createSignal(initialData.judgeName || '');
  const [nextHearingDate, setNextHearingDate] = createSignal(
    initialData.nextHearingDate ? new Date(initialData.nextHearingDate).toISOString().split('T')[0] : ''
  );

  // Respondent Information
  const [respFirstName, setRespFirstName] = createSignal(initialData.respondent?.firstName || '');
  const [respMiddleName, setRespMiddleName] = createSignal(initialData.respondent?.middleName || '');
  const [respLastName, setRespLastName] = createSignal(initialData.respondent?.lastName || '');
  const [respDOB, setRespDOB] = createSignal(
    initialData.respondent?.dateOfBirth ? new Date(initialData.respondent.dateOfBirth).toISOString().split('T')[0] : ''
  );
  const [respCountryOfBirth, setRespCountryOfBirth] = createSignal(initialData.respondent?.countryOfBirth || 'Cuba');
  const [respStreet, setRespStreet] = createSignal(initialData.respondent?.address?.street || '');
  const [respStreet2, setRespStreet2] = createSignal(initialData.respondent?.address?.street2 || '');
  const [respCity, setRespCity] = createSignal(initialData.respondent?.address?.city || '');
  const [respState, setRespState] = createSignal(initialData.respondent?.address?.state || 'FL');
  const [respZip, setRespZip] = createSignal(initialData.respondent?.address?.zipCode || '');
  const [respPhone, setRespPhone] = createSignal(initialData.respondent?.phone || '');
  const [respEmail, setRespEmail] = createSignal(initialData.respondent?.email || '');

  // Address source: 'customer' to use linked customer address, 'manual' to enter manually
  const [addressSource, setAddressSource] = createSignal<'customer' | 'manual'>('manual');
  // Store customer address separately when linked
  const [customerAddress, setCustomerAddress] = createSignal<{
    street: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  } | null>(null);
  const [customerName, setCustomerName] = createSignal('');

  // Motion Details (Pro Se - no attorney fields needed)
  const [motionType, setMotionType] = createSignal<MotionType>(initialData.motionType || 'dismiss');
  const [basis, setBasis] = createSignal<MotionBasis>(initialData.basis || 'caa');
  const [otherBasisDescription, setOtherBasisDescription] = createSignal(initialData.otherBasisDescription || '');

  // CAA Details
  const [i485FiledDate, setI485FiledDate] = createSignal(
    initialData.caaDetails?.i485FiledDate ? new Date(initialData.caaDetails.i485FiledDate).toISOString().split('T')[0] : ''
  );
  const [i485ReceiptNumber, setI485ReceiptNumber] = createSignal(initialData.caaDetails?.i485ReceiptNumber || '');

  // LPR Details
  const [lprGrantDate, setLprGrantDate] = createSignal(
    initialData.lprDetails?.lprGrantDate ? new Date(initialData.lprDetails.lprGrantDate).toISOString().split('T')[0] : ''
  );
  const [greenCardNumber, setGreenCardNumber] = createSignal(initialData.lprDetails?.greenCardNumber || '');

  // Family Case
  const [isFamilyCase, setIsFamilyCase] = createSignal(initialData.isFamilyCase || false);
  const [familyMembers, setFamilyMembers] = createSignal<FamilyMember[]>(initialData.familyMembers || []);

  // Arguments
  const [supportingFacts, setSupportingFacts] = createSignal(initialData.supportingFacts || '');
  const [legalArguments, setLegalArguments] = createSignal(initialData.legalArguments || '');
  const [isGenerating, setIsGenerating] = createSignal(false);

  // Certificate of Service
  const [serviceMethod, setServiceMethod] = createSignal<ServiceMethod>(
    initialData.certificateOfService?.serviceMethod || 'mail'
  );
  const [serviceDate, setServiceDate] = createSignal(
    initialData.certificateOfService?.serviceDate
      ? new Date(initialData.certificateOfService.serviceDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [dhsOfficeSelect, setDhsOfficeSelect] = createSignal('miami_ice');
  const [dhsStreet, setDhsStreet] = createSignal(initialData.certificateOfService?.dhsOfficeAddress?.street || '');
  const [dhsCity, setDhsCity] = createSignal(initialData.certificateOfService?.dhsOfficeAddress?.city || '');
  const [dhsState, setDhsState] = createSignal(initialData.certificateOfService?.dhsOfficeAddress?.state || '');
  const [dhsZip, setDhsZip] = createSignal(initialData.certificateOfService?.dhsOfficeAddress?.zipCode || '');

  // Handle A-Number formatting
  const handleANumberChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 9) {
      setANumber(formatANumber(cleaned));
    }
  };

  // Handle customer selection from search
  const handleCustomerSelect = async (clientId: string, selectedCustomerName: string) => {
    setLinkedClientId(clientId);
    if (!clientId) {
      // Clear customer data when unlinked
      setCustomerAddress(null);
      setCustomerName('');
      setAddressSource('manual');
      return;
    }

    try {
      // Fetch customer details
      const customer = await inventoryApi.getClientNotaryById(clientId) as NotaryCustomer;
      if (customer) {
        // Store customer name
        setCustomerName(`${customer.firstName || ''} ${customer.lastName || ''}`.trim());

        // Populate respondent fields
        setRespFirstName(customer.firstName || '');
        setRespMiddleName(customer.middleName || '');
        setRespLastName(customer.lastName || '');
        if (customer.dateOfBirth) {
          setRespDOB(new Date(customer.dateOfBirth).toISOString().split('T')[0]);
        }
        setRespCountryOfBirth(customer.countryOfBirth || 'Cuba');
        setRespPhone(customer.phoneNumber || '');
        setRespEmail(customer.email || '');

        // Store customer address separately
        if (customer.address) {
          const custAddr = {
            street: customer.address.street || '',
            street2: customer.address.street2 || undefined,
            city: customer.address.city || '',
            state: customer.address.state || 'FL',
            zipCode: customer.address.zipCode || ''
          };
          setCustomerAddress(custAddr);

          // Auto-populate address fields and set source to 'customer'
          setRespStreet(custAddr.street);
          setRespStreet2(custAddr.street2 || '');
          setRespCity(custAddr.city);
          setRespState(custAddr.state);
          setRespZip(custAddr.zipCode);
          setAddressSource('customer');
        } else {
          setCustomerAddress(null);
          setAddressSource('manual');
        }

        // A-Number
        if (customer.alienNumber) {
          handleANumberChange(customer.alienNumber);
        }
      }
    } catch (err) {
      devLog('Error fetching customer:', err);
    }
  };

  // Handle address source change
  const handleAddressSourceChange = (source: 'customer' | 'manual') => {
    setAddressSource(source);
    if (source === 'customer' && customerAddress()) {
      // Populate from customer address
      const addr = customerAddress()!;
      setRespStreet(addr.street);
      setRespStreet2(addr.street2 || '');
      setRespCity(addr.city);
      setRespState(addr.state);
      setRespZip(addr.zipCode);
    }
    // When switching to 'manual', keep current values for editing
  };

  // Handle court selection - auto-populate DHS address with legalAdvisor
  const handleCourtChange = (courtKey: string) => {
    setCourtLocation(courtKey);
    const addresses = getCourtAddresses(courtKey);
    if (addresses) {
      // Parse city/state/zip from the city string (e.g., "Miami, FL 33130")
      const parts = addresses.legalAdvisor.city.split(', ');
      const cityName = parts[0] || '';
      const stateZip = parts[1] || '';
      const stateZipParts = stateZip.split(' ');
      const state = stateZipParts[0] || '';
      const zip = stateZipParts[1] || '';

      setDhsStreet(addresses.legalAdvisor.address);
      setDhsCity(cityName);
      setDhsState(state);
      setDhsZip(zip);
      setDhsOfficeSelect('other'); // Set to 'other' since we're using custom address
    }
  };

  // Add new family member
  const addFamilyMember = () => {
    const newMember: FamilyMember = {
      firstName: '',
      lastName: '',
      dateOfBirth: 0,
      countryOfBirth: 'Cuba',
      aNumber: '',
      relationship: 'spouse'
    };
    setFamilyMembers([...familyMembers(), newMember]);
  };

  // Remove family member
  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers().filter((_, i) => i !== index));
  };

  // Update family member
  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: any) => {
    const updated = [...familyMembers()];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  // Copy Factual Background prompt
  const [copiedFactual, setCopiedFactual] = createSignal(false);
  const [copiedLegal, setCopiedLegal] = createSignal(false);

  const handleCopyFactualPrompt = async () => {
    try {
      const data = buildMotionData();
      const prompt = generateFactualBackgroundPrompt(data);
      const success = await copyToClipboard(prompt);
      if (success) {
        setCopiedFactual(true);
        setTimeout(() => setCopiedFactual(false), 2000);
      } else {
        setError('Failed to copy to clipboard');
      }
    } catch (err) {
      devLog('Error copying prompt:', err);
      setError('Error generating prompt. Please check all required fields.');
    }
  };

  // Copy Legal Arguments prompt
  const handleCopyLegalPrompt = async () => {
    try {
      const data = buildMotionData();
      const prompt = generateLegalArgumentsPrompt(data);
      const success = await copyToClipboard(prompt);
      if (success) {
        setCopiedLegal(true);
        setTimeout(() => setCopiedLegal(false), 2000);
      } else {
        setError('Failed to copy to clipboard');
      }
    } catch (err) {
      devLog('Error copying prompt:', err);
      setError('Error generating prompt. Please check all required fields.');
    }
  };

  // Handle DHS office selection
  const handleDhsOfficeChange = (value: string) => {
    setDhsOfficeSelect(value);
    const office = DHS_OFFICES.find(o => o.value === value);
    if (office && office.value !== 'other') {
      setDhsStreet(office.address.street);
      setDhsCity(office.address.city);
      setDhsState(office.address.state);
      setDhsZip(office.address.zipCode);
    } else {
      setDhsStreet('');
      setDhsCity('');
      setDhsState('');
      setDhsZip('');
    }
  };

  // Build complete motion data (Pro Se - no attorney)
  const buildMotionData = (): MotionToDismissData => {
    const respondent: RespondentInfo = {
      firstName: respFirstName(),
      middleName: respMiddleName() || undefined,
      lastName: respLastName(),
      dateOfBirth: respDOB() ? new Date(respDOB()).getTime() : Date.now(),
      countryOfBirth: respCountryOfBirth(),
      aNumber: aNumber(),
      address: {
        street: respStreet(),
        street2: respStreet2() || undefined,
        city: respCity(),
        state: respState(),
        zipCode: respZip(),
        country: 'USA'
      },
      phone: respPhone() || undefined,
      email: respEmail() || undefined
    };

    const data: MotionToDismissData = {
      aNumber: aNumber(),
      courtLocation: courtLocation(),
      judgeName: judgeName(),
      nextHearingDate: nextHearingDate() ? new Date(nextHearingDate()).getTime() : undefined,
      isProSe: true, // Pro Se motion - self-represented
      respondent,
      isFamilyCase: isFamilyCase(),
      familyMembers: isFamilyCase() ? familyMembers() : undefined,
      motionType: motionType(),
      basis: basis(),
      otherBasisDescription: basis() === 'other' ? otherBasisDescription() : undefined,
      caaDetails: basis() === 'caa' && i485FiledDate() ? {
        i485FiledDate: new Date(i485FiledDate()).getTime(),
        i485ReceiptNumber: i485ReceiptNumber()
      } : undefined,
      lprDetails: basis() === 'already_lpr' && lprGrantDate() ? {
        lprGrantDate: new Date(lprGrantDate()).getTime(),
        greenCardNumber: greenCardNumber()
      } : undefined,
      supportingFacts: supportingFacts(),
      legalArguments: legalArguments(),
      reliefRequested: [
        motionType() === 'dismiss' ? 'dismissal' :
        motionType() === 'terminate' ? 'termination' :
        'administrative_closure'
      ],
      certificateOfService: {
        serviceMethod: serviceMethod(),
        serviceDate: new Date(serviceDate()).getTime(),
        dhsOfficeAddress: {
          street: dhsStreet(),
          city: dhsCity(),
          state: dhsState(),
          zipCode: dhsZip(),
          country: 'USA'
        },
        dhsOfficeName: DHS_OFFICES.find(o => o.value === dhsOfficeSelect())?.label || 'DHS/ICE Office of Chief Counsel',
        servedParties: ['DHS/ICE Office of Chief Counsel']
      },
      clientNotaryId: linkedClientId() || undefined,
      createdAt: initialData.createdAt || Date.now(),
      updatedAt: Date.now(),
      status: 'draft'
    };

    return data;
  };

  // Validation
  const isValid = createMemo(() => {
    // Pro Se - only validate respondent info, no attorney required
    return (
      validateANumber(aNumber()) &&
      courtLocation() &&
      respFirstName() &&
      respLastName() &&
      respDOB()
    );
  });

  // Handle save
  const handleSave = () => {
    if (!isValid()) {
      setError('Please complete all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = buildMotionData();
      props.onSave?.(data);
    } catch (err) {
      devLog('Error saving motion:', err);
      setError('Error saving motion. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle downloads
  const handleDownloadPDF = async () => {
    try {
      const data = buildMotionData();
      await downloadMotionPDF(data);
    } catch (err) {
      devLog('Error generating PDF:', err);
      setError('Error generating PDF. Please try again.');
    }
  };

  const handleDownloadText = () => {
    try {
      const data = buildMotionData();
      downloadMotionText(data);
    } catch (err) {
      devLog('Error generating text:', err);
      setError('Error generating text document. Please try again.');
    }
  };

  // Generate preview text
  const previewText = createMemo(() => {
    try {
      const data = buildMotionData();
      return generateMotionTextDocument(data);
    } catch (err) {
      return 'Error generating preview. Please check all required fields.';
    }
  });

  // Styles
  const tabButtonStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    'border-bottom': isActive ? 'none' : '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '400',
    transition: 'all 0.2s ease',
    'font-family': 'inherit'
  });

  const fieldContainerStyle = {
    'margin-bottom': '1rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.5rem',
    'font-weight': '500',
    color: 'var(--text-primary)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)'
  };

  const textareaStyle = {
    ...inputStyle,
    'min-height': '150px',
    resize: 'vertical' as const
  };

  const sectionStyle = {
    padding: '1.5rem',
    background: 'var(--gray-50)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'margin-bottom': '1rem',
    'font-weight': '600',
    'font-size': '1.1rem',
    color: 'var(--text-primary)'
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem'
        }}>
          <h2 style={{
            'font-size': '1.5rem',
            'font-weight': '600',
            color: 'var(--text-primary)'
          }}>
            Immigration Court Motion to Dismiss
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="outline"
              onClick={props.onCancel}
              disabled={saving()}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Error Display */}
        <Show when={error()}>
          <div style={{
            padding: '1rem',
            background: 'var(--danger-light)',
            color: 'var(--danger-color)',
            'border-radius': 'var(--border-radius-sm)',
            'margin-bottom': '1rem'
          }}>
            {error()}
          </div>
        </Show>

        {/* Tab Navigation */}
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{
            display: 'flex',
            'border-bottom': '1px solid var(--border-color)',
            gap: '0.25rem',
            'flex-wrap': 'wrap'
          }}>
            <button
              style={tabButtonStyle(activeTab() === 'case')}
              onClick={() => setActiveTab('case')}
            >
              Case Information
            </button>
            <button
              style={tabButtonStyle(activeTab() === 'respondent')}
              onClick={() => setActiveTab('respondent')}
            >
              Respondent
            </button>
            <button
              style={tabButtonStyle(activeTab() === 'motion')}
              onClick={() => setActiveTab('motion')}
            >
              Motion Details
            </button>
            <button
              style={tabButtonStyle(activeTab() === 'service')}
              onClick={() => setActiveTab('service')}
            >
              Service
            </button>
            <button
              style={tabButtonStyle(activeTab() === 'preview')}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ 'min-height': '400px' }}>

          {/* TAB 1: Case Information */}
          <Show when={activeTab() === 'case'}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Case Information</h3>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>*</span> A-Number
                  </label>
                  <input
                    type="text"
                    value={aNumber()}
                    onInput={(e) => handleANumberChange(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="XXX-XXX-XXX"
                    required
                  />
                  <Show when={aNumber() && !validateANumber(aNumber())}>
                    <span style={{ color: 'var(--danger-color)', 'font-size': '0.875rem' }}>
                      Invalid A-Number format (9 digits required)
                    </span>
                  </Show>
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>*</span> Immigration Court
                  </label>
                  <select
                    value={courtLocation()}
                    onChange={(e) => handleCourtChange(e.currentTarget.value)}
                    style={inputStyle}
                    required
                  >
                    <For each={IMMIGRATION_COURTS}>
                      {(court) => <option value={court.value}>{court.label}</option>}
                    </For>
                  </select>
                  <Show when={getCourtAddresses(courtLocation())}>
                    <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      Court: {getCourtAddresses(courtLocation())?.court.address}, {getCourtAddresses(courtLocation())?.court.city}
                    </div>
                  </Show>
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    Judge Name
                  </label>
                  <input
                    type="text"
                    value={judgeName()}
                    onInput={(e) => setJudgeName(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="Hon. John Smith"
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    Next Hearing Date
                  </label>
                  <input
                    type="date"
                    value={nextHearingDate()}
                    onInput={(e) => setNextHearingDate(e.currentTarget.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </Show>

          {/* TAB 2: Respondent Information */}
          <Show when={activeTab() === 'respondent'}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Respondent Information</h3>

              {/* Link to existing customer */}
              <div style={{ 'margin-bottom': '1.5rem' }}>
                <label style={labelStyle}>Search Existing Client (NotaryCustomer)</label>
                <CustomerSearchDropdown
                  value={linkedClientId()}
                  onChange={handleCustomerSelect}
                  placeholder="Type to search clients by name or A-Number..."
                />
              </div>

              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>*</span> First Name
                  </label>
                  <input
                    type="text"
                    value={respFirstName()}
                    onInput={(e) => setRespFirstName(e.currentTarget.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>Middle Name</label>
                  <input
                    type="text"
                    value={respMiddleName()}
                    onInput={(e) => setRespMiddleName(e.currentTarget.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>*</span> Last Name
                  </label>
                  <input
                    type="text"
                    value={respLastName()}
                    onInput={(e) => setRespLastName(e.currentTarget.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>*</span> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={respDOB()}
                    onInput={(e) => setRespDOB(e.currentTarget.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>*</span> Country of Birth
                  </label>
                  <input
                    type="text"
                    value={respCountryOfBirth()}
                    onInput={(e) => setRespCountryOfBirth(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="Cuba"
                    required
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>Phone</label>
                  <input
                    type="tel"
                    value={respPhone()}
                    onInput={(e) => setRespPhone(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="(305) 123-4567"
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={respEmail()}
                    onInput={(e) => setRespEmail(e.currentTarget.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Address Section */}
              <h4 style={{ ...sectionTitleStyle, 'margin-top': '1.5rem', 'font-size': '1rem' }}>
                Address
              </h4>

              {/* Address Source Toggle - only show if customer is linked and has address */}
              <Show when={customerAddress()}>
                <div style={{
                  'margin-bottom': '1rem',
                  padding: '1rem',
                  background: 'var(--info-light)',
                  'border-radius': 'var(--border-radius-sm)'
                }}>
                  <label style={{ ...labelStyle, 'margin-bottom': '0.75rem' }}>Address Source</label>
                  <div style={{ display: 'flex', gap: '1.5rem', 'flex-wrap': 'wrap' }}>
                    <label style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem 1rem',
                      background: addressSource() === 'customer' ? 'var(--primary-color)' : 'white',
                      color: addressSource() === 'customer' ? 'white' : 'var(--text-primary)',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="addressSource"
                        value="customer"
                        checked={addressSource() === 'customer'}
                        onChange={() => handleAddressSourceChange('customer')}
                        style={{ display: 'none' }}
                      />
                      <span style={{ 'font-size': '1.2rem' }}>📋</span>
                      Use {customerName()}'s Address
                    </label>

                    <label style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem 1rem',
                      background: addressSource() === 'manual' ? 'var(--primary-color)' : 'white',
                      color: addressSource() === 'manual' ? 'white' : 'var(--text-primary)',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="addressSource"
                        value="manual"
                        checked={addressSource() === 'manual'}
                        onChange={() => handleAddressSourceChange('manual')}
                        style={{ display: 'none' }}
                      />
                      <span style={{ 'font-size': '1.2rem' }}>✏️</span>
                      Enter Different Address
                    </label>
                  </div>

                  {/* Show customer address preview when using customer address */}
                  <Show when={addressSource() === 'customer' && customerAddress()}>
                    <div style={{
                      'margin-top': '0.75rem',
                      padding: '0.75rem',
                      background: 'white',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.9rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <strong>Using:</strong> {customerAddress()?.street}
                      {customerAddress()?.street2 && `, ${customerAddress()?.street2}`}
                      , {customerAddress()?.city}, {customerAddress()?.state} {customerAddress()?.zipCode}
                    </div>
                  </Show>
                </div>
              </Show>

              {/* Address Fields - editable when manual, read-only when using customer */}
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                <div style={{ ...fieldContainerStyle, 'grid-column': '1 / -1' }}>
                  <label style={labelStyle}>Street Address</label>
                  <input
                    type="text"
                    value={respStreet()}
                    onInput={(e) => setRespStreet(e.currentTarget.value)}
                    style={{
                      ...inputStyle,
                      background: addressSource() === 'customer' ? 'var(--gray-100)' : 'var(--surface-color)',
                      cursor: addressSource() === 'customer' ? 'not-allowed' : 'text'
                    }}
                    placeholder="123 Main Street"
                    disabled={addressSource() === 'customer'}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>Apt/Suite</label>
                  <input
                    type="text"
                    value={respStreet2()}
                    onInput={(e) => setRespStreet2(e.currentTarget.value)}
                    style={{
                      ...inputStyle,
                      background: addressSource() === 'customer' ? 'var(--gray-100)' : 'var(--surface-color)',
                      cursor: addressSource() === 'customer' ? 'not-allowed' : 'text'
                    }}
                    disabled={addressSource() === 'customer'}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>City</label>
                  <input
                    type="text"
                    value={respCity()}
                    onInput={(e) => setRespCity(e.currentTarget.value)}
                    style={{
                      ...inputStyle,
                      background: addressSource() === 'customer' ? 'var(--gray-100)' : 'var(--surface-color)',
                      cursor: addressSource() === 'customer' ? 'not-allowed' : 'text'
                    }}
                    disabled={addressSource() === 'customer'}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>State</label>
                  <input
                    type="text"
                    value={respState()}
                    onInput={(e) => setRespState(e.currentTarget.value)}
                    style={{
                      ...inputStyle,
                      background: addressSource() === 'customer' ? 'var(--gray-100)' : 'var(--surface-color)',
                      cursor: addressSource() === 'customer' ? 'not-allowed' : 'text'
                    }}
                    placeholder="FL"
                    disabled={addressSource() === 'customer'}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>ZIP Code</label>
                  <input
                    type="text"
                    value={respZip()}
                    onInput={(e) => setRespZip(e.currentTarget.value)}
                    style={{
                      ...inputStyle,
                      background: addressSource() === 'customer' ? 'var(--gray-100)' : 'var(--surface-color)',
                      cursor: addressSource() === 'customer' ? 'not-allowed' : 'text'
                    }}
                    placeholder="33130"
                    disabled={addressSource() === 'customer'}
                  />
                </div>
              </div>
            </div>
          </Show>

          {/* TAB 3: Motion Details (Pro Se - no attorney tab) */}
          <Show when={activeTab() === 'motion'}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Motion Type</h3>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="motionType"
                    value="dismiss"
                    checked={motionType() === 'dismiss'}
                    onChange={() => setMotionType('dismiss')}
                  />
                  Motion to Dismiss
                </label>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="motionType"
                    value="terminate"
                    checked={motionType() === 'terminate'}
                    onChange={() => setMotionType('terminate')}
                  />
                  Motion to Terminate
                </label>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="motionType"
                    value="administrative_closure"
                    checked={motionType() === 'administrative_closure'}
                    onChange={() => setMotionType('administrative_closure')}
                  />
                  Motion for Administrative Closure
                </label>
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Basis for Motion</h3>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="basis"
                    value="caa"
                    checked={basis() === 'caa'}
                    onChange={() => setBasis('caa')}
                  />
                  Cuban Adjustment Act (CAA)
                </label>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="basis"
                    value="already_lpr"
                    checked={basis() === 'already_lpr'}
                    onChange={() => setBasis('already_lpr')}
                  />
                  Already LPR
                </label>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="basis"
                    value="other"
                    checked={basis() === 'other'}
                    onChange={() => setBasis('other')}
                  />
                  Other
                </label>
              </div>

              {/* Conditional Fields - CAA */}
              <Show when={basis() === 'caa'}>
                <div style={{ 'margin-top': '1.5rem' }}>
                  <h4 style={{ ...sectionTitleStyle, 'font-size': '1rem' }}>CAA Details</h4>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    <div style={fieldContainerStyle}>
                      <label style={labelStyle}>I-485 Filed Date</label>
                      <input
                        type="date"
                        value={i485FiledDate()}
                        onInput={(e) => setI485FiledDate(e.currentTarget.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div style={fieldContainerStyle}>
                      <label style={labelStyle}>I-485 Receipt Number</label>
                      <input
                        type="text"
                        value={i485ReceiptNumber()}
                        onInput={(e) => setI485ReceiptNumber(e.currentTarget.value)}
                        style={inputStyle}
                        placeholder="IOE1234567890"
                      />
                    </div>
                  </div>
                </div>
              </Show>

              {/* Conditional Fields - LPR */}
              <Show when={basis() === 'already_lpr'}>
                <div style={{ 'margin-top': '1.5rem' }}>
                  <h4 style={{ ...sectionTitleStyle, 'font-size': '1rem' }}>LPR Details</h4>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    <div style={fieldContainerStyle}>
                      <label style={labelStyle}>LPR Grant Date</label>
                      <input
                        type="date"
                        value={lprGrantDate()}
                        onInput={(e) => setLprGrantDate(e.currentTarget.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div style={fieldContainerStyle}>
                      <label style={labelStyle}>Green Card Number</label>
                      <input
                        type="text"
                        value={greenCardNumber()}
                        onInput={(e) => setGreenCardNumber(e.currentTarget.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              </Show>

              {/* Conditional Fields - Other */}
              <Show when={basis() === 'other'}>
                <div style={{ 'margin-top': '1.5rem' }}>
                  <div style={fieldContainerStyle}>
                    <label style={labelStyle}>Describe Other Basis</label>
                    <textarea
                      value={otherBasisDescription()}
                      onInput={(e) => setOtherBasisDescription(e.currentTarget.value)}
                      style={textareaStyle}
                    />
                  </div>
                </div>
              </Show>
            </div>

            {/* Family Case Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Family Case</h3>
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isFamilyCase()}
                    onChange={(e) => setIsFamilyCase(e.currentTarget.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span style={{ 'font-weight': '500' }}>This is a family case (multiple respondents)</span>
                </label>
              </div>

              <Show when={isFamilyCase()}>
                <div style={{ 'margin-top': '1rem' }}>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-bottom': '1rem'
                  }}>
                    <h4 style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                      Family Members ({familyMembers().length})
                    </h4>
                    <Button variant="outline" size="sm" onClick={addFamilyMember}>
                      + Add Family Member
                    </Button>
                  </div>

                  <For each={familyMembers()}>
                    {(member, index) => (
                      <div style={{
                        padding: '1rem',
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        'margin-bottom': '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'margin-bottom': '1rem'
                        }}>
                          <span style={{ 'font-weight': '600' }}>Family Member #{index() + 1}</span>
                          <button
                            onClick={() => removeFamilyMember(index())}
                            style={{
                              background: 'var(--danger-color)',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.75rem',
                              'border-radius': 'var(--border-radius-sm)',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{
                          display: 'grid',
                          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem'
                        }}>
                          <div>
                            <label style={labelStyle}>Relationship</label>
                            <select
                              value={member.relationship}
                              onChange={(e) => updateFamilyMember(index(), 'relationship', e.currentTarget.value)}
                              style={inputStyle}
                            >
                              <option value="spouse">Spouse</option>
                              <option value="child">Child</option>
                              <option value="parent">Parent</option>
                              <option value="sibling">Sibling</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>First Name</label>
                            <FormInput
                              type="text"
                              value={member.firstName}
                              onChange={(e) => updateFamilyMember(index(), 'firstName', e)}
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Last Name</label>
                            <FormInput
                              type="text"
                              value={member.lastName}
                              onChange={(e) => updateFamilyMember(index(), 'lastName', e)}
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>A-Number</label>
                            <FormInput
                              type="text"
                              value={member.aNumber}
                              onChange={(e) => updateFamilyMember(index(), 'aNumber', formatANumber(e.replace(/[^0-9]/g, '')))}
                              style={inputStyle}
                              placeholder="XXX-XXX-XXX"
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Date of Birth</label>
                            <FormInput
                              type="date"
                              value={member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : ''}
                              onChange={(e) => updateFamilyMember(index(), 'dateOfBirth', e ? new Date(e).getTime() : 0)}
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Country of Birth</label>
                            <FormInput
                              type="text"
                              value={member.countryOfBirth}
                              onChange={(e) => updateFamilyMember(index(), 'countryOfBirth', e)}
                              style={inputStyle}
                              placeholder="Cuba"
                            />
                          </div>

                          {/* CAA-specific fields for family member */}
                          <Show when={basis() === 'caa'}>
                            <div>
                              <label style={labelStyle}>I-485 Filed Date</label>
                              <FormInput
                                type="date"
                                value={member.i485FiledDate ? new Date(member.i485FiledDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => updateFamilyMember(index(), 'i485FiledDate', e ? new Date(e).getTime() : undefined)}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>I-485 Receipt #</label>
                              <FormInput
                                type="text"
                                value={member.i485ReceiptNumber || ''}
                                onChange={(e) => updateFamilyMember(index(), 'i485ReceiptNumber', e)}
                                style={inputStyle}
                              />
                            </div>
                          </Show>

                          {/* LPR-specific fields for family member */}
                          <Show when={basis() === 'already_lpr'}>
                            <div>
                              <label style={labelStyle}>LPR Grant Date</label>
                              <FormInput
                                type="date"
                                value={member.lprGrantDate ? new Date(member.lprGrantDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => updateFamilyMember(index(), 'lprGrantDate', e ? new Date(e).getTime() : undefined)}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Green Card #</label>
                              <FormInput
                                type="text"
                                value={member.greenCardNumber || ''}
                                onChange={(e) => updateFamilyMember(index(), 'greenCardNumber', e)}
                                style={inputStyle}
                              />
                            </div>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>

                  <Show when={familyMembers().length === 0}>
                    <div style={{
                      padding: '2rem',
                      'text-align': 'center',
                      color: 'var(--text-muted)',
                      background: 'white',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px dashed var(--border-color)'
                    }}>
                      No family members added. Click "Add Family Member" to add respondents.
                    </div>
                  </Show>
                </div>
              </Show>
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Arguments</h3>

              <div style={{
                padding: '1rem',
                background: 'var(--info-light)',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem',
                color: 'var(--info-color)',
                'margin-bottom': '1.5rem'
              }}>
                <strong>How to use:</strong> Click "Copy Prompt" to copy an AI prompt with all the form data.
                Paste it into ChatGPT, Claude, or another AI to generate the text, then paste the result here.
              </div>

              <div style={fieldContainerStyle}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '0.5rem'
                }}>
                  <label style={labelStyle}>Factual Background</label>
                  <button
                    onClick={handleCopyFactualPrompt}
                    disabled={!respFirstName() || !respLastName()}
                    style={{
                      padding: '0.5rem 1rem',
                      background: copiedFactual() ? 'var(--success-color)' : 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      'border-radius': 'var(--border-radius-sm)',
                      cursor: !respFirstName() || !respLastName() ? 'not-allowed' : 'pointer',
                      opacity: !respFirstName() || !respLastName() ? 0.5 : 1,
                      'font-weight': '500',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    {copiedFactual() ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <textarea
                  value={supportingFacts()}
                  onInput={(e) => setSupportingFacts(e.currentTarget.value)}
                  style={{ ...textareaStyle, 'min-height': '250px' }}
                  placeholder="1. Click 'Copy Prompt' above&#10;2. Paste into ChatGPT or Claude&#10;3. Copy the AI response and paste it here"
                />
              </div>

              <div style={fieldContainerStyle}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '0.5rem'
                }}>
                  <label style={labelStyle}>Legal Arguments</label>
                  <button
                    onClick={handleCopyLegalPrompt}
                    disabled={!respFirstName() || !respLastName()}
                    style={{
                      padding: '0.5rem 1rem',
                      background: copiedLegal() ? 'var(--success-color)' : 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      'border-radius': 'var(--border-radius-sm)',
                      cursor: !respFirstName() || !respLastName() ? 'not-allowed' : 'pointer',
                      opacity: !respFirstName() || !respLastName() ? 0.5 : 1,
                      'font-weight': '500',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    {copiedLegal() ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <textarea
                  value={legalArguments()}
                  onInput={(e) => setLegalArguments(e.currentTarget.value)}
                  style={{ ...textareaStyle, 'min-height': '350px' }}
                  placeholder="1. Click 'Copy Prompt' above&#10;2. Paste into ChatGPT or Claude&#10;3. Copy the AI response and paste it here"
                />
              </div>
            </div>
          </Show>

          {/* TAB 5: Certificate of Service */}
          <Show when={activeTab() === 'service'}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Certificate of Service</h3>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>Service Method</label>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="serviceMethod"
                      value="mail"
                      checked={serviceMethod() === 'mail'}
                      onChange={() => setServiceMethod('mail')}
                    />
                    U.S. Mail
                  </label>
                  <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="serviceMethod"
                      value="hand_delivery"
                      checked={serviceMethod() === 'hand_delivery'}
                      onChange={() => setServiceMethod('hand_delivery')}
                    />
                    Hand Delivery
                  </label>
                  <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="serviceMethod"
                      value="electronic"
                      checked={serviceMethod() === 'electronic'}
                      onChange={() => setServiceMethod('electronic')}
                    />
                    Electronic (ECAS)
                  </label>
                </div>
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>Service Date</label>
                <input
                  type="date"
                  value={serviceDate()}
                  onInput={(e) => setServiceDate(e.currentTarget.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>DHS Office</label>
                <select
                  value={dhsOfficeSelect()}
                  onChange={(e) => handleDhsOfficeChange(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <For each={DHS_OFFICES}>
                    {(office) => <option value={office.value}>{office.label}</option>}
                  </For>
                </select>
              </div>

              <h4 style={{ ...sectionTitleStyle, 'margin-top': '1.5rem', 'font-size': '1rem' }}>
                DHS Office Address
              </h4>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>Street</label>
                  <input
                    type="text"
                    value={dhsStreet()}
                    onInput={(e) => setDhsStreet(e.currentTarget.value)}
                    style={inputStyle}
                    disabled={dhsOfficeSelect() !== 'other'}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>City</label>
                  <input
                    type="text"
                    value={dhsCity()}
                    onInput={(e) => setDhsCity(e.currentTarget.value)}
                    style={inputStyle}
                    disabled={dhsOfficeSelect() !== 'other'}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>State</label>
                  <input
                    type="text"
                    value={dhsState()}
                    onInput={(e) => setDhsState(e.currentTarget.value)}
                    style={inputStyle}
                    disabled={dhsOfficeSelect() !== 'other'}
                  />
                </div>

                <div style={fieldContainerStyle}>
                  <label style={labelStyle}>ZIP Code</label>
                  <input
                    type="text"
                    value={dhsZip()}
                    onInput={(e) => setDhsZip(e.currentTarget.value)}
                    style={inputStyle}
                    disabled={dhsOfficeSelect() !== 'other'}
                  />
                </div>
              </div>
            </div>
          </Show>

          {/* TAB 6: Preview & Generate */}
          <Show when={activeTab() === 'preview'}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Document Preview</h3>

              <div style={{
                'margin-bottom': '1.5rem',
                display: 'flex',
                gap: '1rem',
                'flex-wrap': 'wrap'
              }}>
                <Button
                  variant="primary"
                  onClick={handleDownloadPDF}
                  disabled={!isValid()}
                >
                  Download PDF
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDownloadText}
                  disabled={!isValid()}
                >
                  Download Text
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={!isValid() || saving()}
                >
                  {saving() ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>

              <Show when={!isValid()}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--warning-light)',
                  color: 'var(--warning-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem'
                }}>
                  Please complete all required fields to generate documents.
                </div>
              </Show>

              <div style={{
                background: 'white',
                padding: '2rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                'font-family': 'monospace',
                'font-size': '0.875rem',
                'white-space': 'pre-wrap',
                'max-height': '600px',
                overflow: 'auto',
                'line-height': '1.6'
              }}>
                {previewText()}
              </div>
            </div>
          </Show>

        </div>

        {/* Form Actions Footer */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          gap: '1rem',
          'margin-top': '2rem',
          padding: '1rem',
          background: 'var(--gray-50)',
          'border-radius': 'var(--border-radius-sm)'
        }}>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            <Show when={!isValid()}>
              Complete required fields (*)
            </Show>
            <Show when={isValid()}>
              All required fields completed
            </Show>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              variant="outline"
              onClick={props.onCancel}
              disabled={saving()}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!isValid() || saving()}
            >
              {saving() ? 'Saving Draft...' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MotionToDismissForm;
