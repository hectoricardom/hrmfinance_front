import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import { NotaryCustomer, PlaceOfBirth, DateRange } from '../types';
import { inventoryApi } from '../../../services/apiAdapter';
import { devLog } from '../../../services/utils';

interface NotaryCustomerFormProps {
  customer?: NotaryCustomer | null;
  onSave?: (customer: NotaryCustomer) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

const NotaryCustomerForm: Component<NotaryCustomerFormProps> = (props) => {
  const { t } = useTranslation();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<'basic' | 'personal' | 'contact' | 'immigration'>('basic');
  
  // Basic Information
  const [firstName, setFirstName] = createSignal('');
  const [middleName, setMiddleName] = createSignal('');
  const [lastName, setLastName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [phoneNumber, setPhoneNumber] = createSignal('');
  const [ss, setSs] = createSignal('');
  const [alienNumber, setAlienNumber] = createSignal('');
  
  // Personal Information
  const [genre, setGenre] = createSignal('');
  const [dateOfBirth, setDateOfBirth] = createSignal('');
  const [race, setRace] = createSignal('');
  const [ethnicity, setEthnicity] = createSignal('');
  const [maritalStatus, setMaritalStatus] = createSignal('');
  const [height, setHeight] = createSignal('');
  const [weight, setWeight] = createSignal('');
  const [hairColor, setHairColor] = createSignal('');
  const [eyesColor, setEyesColor] = createSignal('');
  
  // Place of Birth
  const [birthCity, setBirthCity] = createSignal('');
  const [birthState, setBirthState] = createSignal('');
  const [birthCountry, setBirthCountry] = createSignal('');
  
  // Current Location
  const [currentCountry, setCurrentCountry] = createSignal('');
  const [currentState, setCurrentState] = createSignal('');
  
  // Immigration
  const [countryOfCitizenship, setCountryOfCitizenship] = createSignal('');
  const [isInUSA, setIsInUSA] = createSignal(false);
  const [hasI94, setHasI94] = createSignal(false);
  const [hasLPR, setHasLPR] = createSignal(false);
  const [passportNumber, setPassportNumber] = createSignal('');
  const [passportExpire, setPassportExpire] = createSignal('');
  
  // Marriage Information
  const [isMarriage, setIsMarriage] = createSignal(false);
  const [marriageDate, setMarriageDate] = createSignal('');
  const [marriageCity, setMarriageCity] = createSignal('');
  const [marriageState, setMarriageState] = createSignal('');
  const [marriageCountry, setMarriageCountry] = createSignal('');

  // Initialize form with customer data if editing
  onMount(() => {
    if (props.customer) {
      const customer = props.customer;
      
      // Basic Information
      setFirstName(customer.firstName || '');
      setMiddleName(customer.middleName || '');
      setLastName(customer.lastName || '');
      setEmail(customer.email || '');
      setPhoneNumber(customer.phoneNumber || '');
      setSs(customer.ss || '');
      setAlienNumber(customer.alienNumber || '');
      
      // Personal Information
      setGenre(customer.genre || '');
      setDateOfBirth(customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : '');
      setRace(customer.race || '');
      setEthnicity(customer.ethnicity || '');
      setMaritalStatus(customer.maritalStatus || '');
      setHeight(customer.height || '');
      setWeight(customer.weight || '');
      setHairColor(customer.hairColor || '');
      setEyesColor(customer.eyesColor || '');
      
      // Place of Birth
      setBirthCity(customer.placeOfBirth?.city || '');
      setBirthState(customer.placeOfBirth?.state || '');
      setBirthCountry(customer.placeOfBirth?.country || '');
      
      // Current Location
      setCurrentCountry(customer.currentLocation?.country || '');
      setCurrentState(customer.currentLocation?.state || '');
      
      // Immigration
      setCountryOfCitizenship(customer.countryOfCitizenship || '');
      setIsInUSA(customer.isInUSA || false);
      setHasI94(customer.hasI94 || false);
      setHasLPR(customer.hasLPR || false);
      setPassportNumber(customer.passportNumber || '');
      setPassportExpire(customer.passportExpire ? new Date(customer.passportExpire).toISOString().split('T')[0] : '');
      
      // Marriage
      setIsMarriage(customer.isMarriage || false);
      setMarriageDate(customer.marriage_date ? new Date(customer.marriage_date).toISOString().split('T')[0] : '');
      setMarriageCity(customer.marriage_city || '');
      setMarriageState(customer.marriage_state || '');
      setMarriageCountry(customer.marriage_country || '');
    }
  });

  // Validation
  const isValid = createMemo(() => {
    return firstName().trim() && lastName().trim();
  });

  // Build customer object from form data
  const buildCustomerData = (): Partial<NotaryCustomer> => {
    return {
      firstName: firstName().trim(),
      middleName: middleName().trim() || undefined,
      lastName: lastName().trim(),
      email: email().trim(),
      phoneNumber: phoneNumber().trim() || undefined,
      ss: ss().trim() || undefined,
      alienNumber: alienNumber().trim() || undefined,
      
      genre: genre() || undefined,
      dateOfBirth: dateOfBirth() ? new Date(dateOfBirth()).getTime() : undefined,
      race: race() || undefined,
      ethnicity: ethnicity() || undefined,
      maritalStatus: maritalStatus() || undefined,
      height: height() || undefined,
      weight: weight() || undefined,
      hairColor: hairColor() || undefined,
      eyesColor: eyesColor() || undefined,
      
      placeOfBirth: (birthCity() || birthState() || birthCountry()) ? {
        city: birthCity() || undefined,
        state: birthState() || undefined,
        country: birthCountry() || undefined
      } : undefined,
      
      currentLocation: (currentCountry() || currentState()) ? {
        country: currentCountry() || undefined,
        state: currentState() || undefined
      } : undefined,
      
      countryOfCitizenship: countryOfCitizenship() || undefined,
      isInUSA: isInUSA(),
      hasI94: hasI94(),
      hasLPR: hasLPR(),
      passportNumber: passportNumber() || undefined,
      passportExpire: passportExpire() ? new Date(passportExpire()).getTime() : undefined,
      
      isMarriage: isMarriage(),
      marriage_date: marriageDate() ? new Date(marriageDate()).getTime() : undefined,
      marriage_city: marriageCity() || undefined,
      marriage_state: marriageState() || undefined,
      marriage_country: marriageCountry() || undefined
    };
  };

  // Handle save
  const handleSave = async () => {
    if (!isValid()) {
      setError('Por favor completa los campos requeridos');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const customerData = buildCustomerData();
      
      if (props.mode === 'create') {
        const result = await inventoryApi.createClientNotary(customerData);
        props.onSave?.(result);
      } else if (props.mode === 'edit' && props.customer?.clientNotaryId) {
        const result = await inventoryApi.updateClientNotary(props.customer.clientNotaryId, customerData);
        props.onSave?.(result);
      }
    } catch (err) {
      devLog('Error saving customer:', err);
      setError('Error al guardar el cliente. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Tab button style
  const tabButtonStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    'border-bottom': isActive ? 'none' : '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '400',
    transition: 'all 0.2s ease'
  });

  // Field container style
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
    'font-family': 'inherit'
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
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
            {props.mode === 'create' ? 
              '➕ Crear Nuevo Cliente' : 
              `✏️ Editar Cliente: ${firstName()} ${lastName()}`
            }
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button 
              variant="outline" 
              onClick={props.onCancel}
              disabled={saving()}
            >
              ✕ {t('common.cancel', 'Cancelar')}
            </Button>
          </div>
        </div>

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
            gap: '0.25rem'
          }}>
            <button 
              style={tabButtonStyle(activeTab() === 'basic')}
              onClick={() => setActiveTab('basic')}
            >
              📝 Información Básica
            </button>
            <button 
              style={tabButtonStyle(activeTab() === 'personal')}
              onClick={() => setActiveTab('personal')}
            >
              👤 Datos Personales
            </button>
            <button 
              style={tabButtonStyle(activeTab() === 'contact')}
              onClick={() => setActiveTab('contact')}
            >
              📍 Ubicación
            </button>
            <button 
              style={tabButtonStyle(activeTab() === 'immigration')}
              onClick={() => setActiveTab('immigration')}
            >
              ✈️ Inmigración
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ 'min-height': '400px' }}>
          {/* Basic Information Tab */}
          <Show when={activeTab() === 'basic'}>
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  <span style={{ color: 'var(--danger-color)' }}>*</span> 
                  {t('notary.field.firstName', 'Nombre')}
                </label>
                <input
                  type="text"
                  value={firstName()}
                  onInput={(e) => setFirstName(e.currentTarget.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.middleName', 'Segundo Nombre')}
                </label>
                <input
                  type="text"
                  value={middleName()}
                  onInput={(e) => setMiddleName(e.currentTarget.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  <span style={{ color: 'var(--danger-color)' }}>*</span>
                  {t('notary.field.lastName', 'Apellido')}
                </label>
                <input
                  type="text"
                  value={lastName()}
                  onInput={(e) => setLastName(e.currentTarget.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  <span style={{ color: 'var(--danger-color)' }}></span>
                  {t('notary.field.email', 'Email')}
                </label>
                <input
                  type="email"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  style={inputStyle}
                 
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.phoneNumber', 'Teléfono')}
                </label>
                <input
                  type="tel"
                  value={phoneNumber()}
                  onInput={(e) => setPhoneNumber(e.currentTarget.value)}
                  style={inputStyle}
                  placeholder="(502) 123-4567"
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.ss', 'Número de Seguro Social')}
                </label>
                <input
                  type="text"
                  value={ss()}
                  onInput={(e) => setSs(e.currentTarget.value)}
                  style={inputStyle}
                  placeholder="123-45-6789"
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.alienNumber', 'Número de Extranjero')}
                </label>
                <input
                  type="text"
                  value={alienNumber()}
                  onInput={(e) => setAlienNumber(e.currentTarget.value)}
                  style={inputStyle}
                  placeholder="A123456789"
                />
              </div>
            </div>
          </Show>

          {/* Personal Information Tab */}
          <Show when={activeTab() === 'personal'}>
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.gender', 'Género')}
                </label>
                <select
                  value={genre()}
                  onChange={(e) => setGenre(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Male">Masculino</option>
                  <option value="Female">Femenino</option>
                  <option value="Other">Otro</option>
                </select>
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.dateOfBirth', 'Fecha de Nacimiento')}
                </label>
                <input
                  type="date"
                  value={dateOfBirth()}
                  onInput={(e) => setDateOfBirth(e.currentTarget.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.race', 'Raza')}
                </label>
                <select
                  value={race()}
                  onChange={(e) => setRace(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  <option value="White">Blanco</option>
                  <option value="Black">Negro</option>
                  <option value="Asian">Asiático</option>
                  <option value="Native American">Nativo Americano</option>
                  <option value="Pacific Islander">Isleño del Pacífico</option>
                  <option value="Mixed">Mixto</option>
                  <option value="Other">Otro</option>
                </select>
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.ethnicity', 'Etnia')}
                </label>
                <select
                  value={ethnicity()}
                  onChange={(e) => setEthnicity(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Hispanic or Latino">Hispano o Latino</option>
                  <option value="Not Hispanic or Latino">No Hispano o Latino</option>
                </select>
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.maritalStatus', 'Estado Civil')}
                </label>
                <select
                  value={maritalStatus()}
                  onChange={(e) => setMaritalStatus(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Single">Soltero/a</option>
                  <option value="Married">Casado/a</option>
                  <option value="Divorced">Divorciado/a</option>
                  <option value="Widowed">Viudo/a</option>
                  <option value="Separated">Separado/a</option>
                </select>
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.height', 'Altura (cm)')}
                </label>
                <input
                  type="number"
                  value={height()}
                  onInput={(e) => setHeight(e.currentTarget.value)}
                  style={inputStyle}
                  placeholder="175"
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.weight', 'Peso (lbs)')}
                </label>
                <input
                  type="number"
                  value={weight()}
                  onInput={(e) => setWeight(e.currentTarget.value)}
                  style={inputStyle}
                  placeholder="150"
                />
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.hairColor', 'Color de Cabello')}
                </label>
                <select
                  value={hairColor()}
                  onChange={(e) => setHairColor(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Black">Negro</option>
                  <option value="Brown">Marrón</option>
                  <option value="Blonde">Rubio</option>
                  <option value="Red">Rojo</option>
                  <option value="Gray">Gris</option>
                  <option value="White">Blanco</option>
                  <option value="Bald">Calvo</option>
                </select>
              </div>

              <div style={fieldContainerStyle}>
                <label style={labelStyle}>
                  {t('notary.field.eyeColor', 'Color de Ojos')}
                </label>
                <select
                  value={eyesColor()}
                  onChange={(e) => setEyesColor(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Black">Negro</option>
                  <option value="Brown">Marrón</option>
                  <option value="Blue">Azul</option>
                  <option value="Green">Verde</option>
                  <option value="Hazel">Avellana</option>
                  <option value="Gray">Gris</option>
                </select>
              </div>
            </div>

            {/* Marriage Section */}
            <div style={{ 
              'margin-top': '2rem',
              padding: '1.5rem',
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <div style={{ 
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                'margin-bottom': '1rem'
              }}>
                <input
                  type="checkbox"
                  checked={isMarriage()}
                  onChange={(e) => setIsMarriage(e.currentTarget.checked)}
                />
                <label style={{ 'font-weight': '500' }}>
                  💑 {t('notary.field.isMarried', 'Está Casado/a')}
                </label>
              </div>

              <Show when={isMarriage()}>
                <div style={{ 
                  display: 'grid', 
                  'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={labelStyle}>
                      {t('notary.field.marriageDate', 'Fecha de Matrimonio')}
                    </label>
                    <input
                      type="date"
                      value={marriageDate()}
                      onInput={(e) => setMarriageDate(e.currentTarget.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {t('notary.field.marriageCity', 'Ciudad')}
                    </label>
                    <input
                      type="text"
                      value={marriageCity()}
                      onInput={(e) => setMarriageCity(e.currentTarget.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {t('notary.field.marriageState', 'Estado/Provincia')}
                    </label>
                    <input
                      type="text"
                      value={marriageState()}
                      onInput={(e) => setMarriageState(e.currentTarget.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {t('notary.field.marriageCountry', 'País')}
                    </label>
                    <input
                      type="text"
                      value={marriageCountry()}
                      onInput={(e) => setMarriageCountry(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="USA, CUB, etc."
                    />
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* Location Tab */}
          <Show when={activeTab() === 'contact'}>
            <div style={{ display: 'grid', gap: '2rem' }}>
              {/* Place of Birth */}
              <div style={{ 
                padding: '1.5rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                <h3 style={{ 
                  'margin-bottom': '1rem',
                  'font-weight': '600',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  🎂 {t('notary.field.placeOfBirth', 'Lugar de Nacimiento')}
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={labelStyle}>Ciudad</label>
                    <input
                      type="text"
                      value={birthCity()}
                      onInput={(e) => setBirthCity(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="Holguín"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Estado/Provincia</label>
                    <input
                      type="text"
                      value={birthState()}
                      onInput={(e) => setBirthState(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="Holguín"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>País</label>
                    <input
                      type="text"
                      value={birthCountry()}
                      onInput={(e) => setBirthCountry(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="CUB"
                    />
                  </div>
                </div>
              </div>

              {/* Current Location */}
              <div style={{ 
                padding: '1.5rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                <h3 style={{ 
                  'margin-bottom': '1rem',
                  'font-weight': '600',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  📍 {t('notary.field.currentLocation', 'Ubicación Actual')}
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={labelStyle}>País</label>
                    <input
                      type="text"
                      value={currentCountry()}
                      onInput={(e) => setCurrentCountry(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="USA"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Estado</label>
                    <input
                      type="text"
                      value={currentState()}
                      onInput={(e) => setCurrentState(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="KY"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* Immigration Tab */}
          <Show when={activeTab() === 'immigration'}>
            <div style={{ display: 'grid', gap: '2rem' }}>
              {/* Citizenship and Status */}
              <div style={{ 
                padding: '1.5rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                <h3 style={{ 
                  'margin-bottom': '1rem',
                  'font-weight': '600',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  🏳️ {t('notary.immigration.citizenship', 'Ciudadanía y Estado')}
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  'margin-bottom': '1.5rem'
                }}>
                  <div>
                    <label style={labelStyle}>
                      {t('notary.field.citizenship', 'País de Ciudadanía')}
                    </label>
                    <input
                      type="text"
                      value={countryOfCitizenship()}
                      onInput={(e) => setCountryOfCitizenship(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="CUB"
                    />
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{ 
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={isInUSA()}
                      onChange={(e) => setIsInUSA(e.currentTarget.checked)}
                    />
                    <label>🇺🇸 En Estados Unidos</label>
                  </div>

                  <div style={{ 
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={hasI94()}
                      onChange={(e) => setHasI94(e.currentTarget.checked)}
                    />
                    <label>📋 Tiene I-94</label>
                  </div>

                  <div style={{ 
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={hasLPR()}
                      onChange={(e) => setHasLPR(e.currentTarget.checked)}
                    />
                    <label>🟢 Residente Permanente</label>
                  </div>
                </div>
              </div>

              {/* Passport Information */}
              <div style={{ 
                padding: '1.5rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                <h3 style={{ 
                  'margin-bottom': '1rem',
                  'font-weight': '600',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  📔 {t('notary.documents.passport', 'Información del Pasaporte')}
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <label style={labelStyle}>
                      {t('notary.field.passportNumber', 'Número de Pasaporte')}
                    </label>
                    <input
                      type="text"
                      value={passportNumber()}
                      onInput={(e) => setPassportNumber(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="K490160"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      {t('notary.field.passportExpiry', 'Fecha de Vencimiento')}
                    </label>
                    <input
                      type="date"
                      value={passportExpire()}
                      onInput={(e) => setPassportExpire(e.currentTarget.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Form Actions */}
        <div style={{
          display: 'flex',
          'justify-content': 'flex-end',
          gap: '1rem',
          'margin-top': '2rem',
          padding: '1rem',
          background: 'var(--gray-50)',
          'border-radius': 'var(--border-radius-sm)'
        }}>
          <Button
            variant="outline"
            onClick={props.onCancel}
            disabled={saving()}
          >
            ✕ {t('common.cancel', 'Cancelar')}
          </Button>
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isValid() || saving()}
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}
          >
            {saving() ? (
              <>⏳ {t('common.saving', 'Guardando...')}</>
            ) : (
              <>{props.mode === 'create' ? '➕ Crear Cliente' : '✏️ Actualizar Cliente'}</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NotaryCustomerForm;