import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { NotaryCustomer, PlaceOfBirth, DriverLicense } from '../types';
import { inventoryApi } from '../../../services/apiAdapter';
import CustomerSearchDropdown from './CustomerSearchDropdown';
import { devLog } from '../../../services/utils';

interface NotaryCustomerEditorProps {
  customer?: NotaryCustomer | null;
  onSave?: (customer: NotaryCustomer) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

const NotaryCustomerEditor: Component<NotaryCustomerEditorProps> = (props) => {
  const { t } = useTranslation();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [activeSection, setActiveSection] = createSignal<'personal' | 'contact' | 'location' | 'immigration' | 'documents' | 'residences' | 'employment' | 'education' | 'i94' | 'passports' | 'driverLicense' | 'family'>('personal');
  
  // Form fields
  const [firstName, setFirstName] = createSignal('');
  const [middleName, setMiddleName] = createSignal('');
  const [lastName, setLastName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [phoneNumber, setPhoneNumber] = createSignal('');
  const [ss, setSs] = createSignal('');
  const [alienNumber, setAlienNumber] = createSignal('');
  
  // Personal Info
  const [genre, setGenre] = createSignal('');
  const [dateOfBirth, setDateOfBirth] = createSignal('');
  const [race, setRace] = createSignal('');
  const [ethnicity, setEthnicity] = createSignal('');
  const [maritalStatus, setMaritalStatus] = createSignal('');
  const [height, setHeight] = createSignal('');
  const [weight, setWeight] = createSignal('');
  const [hairColor, setHairColor] = createSignal('');
  const [eyesColor, setEyesColor] = createSignal('');
  
  // Location
  const [birthCity, setBirthCity] = createSignal('');
  const [birthState, setBirthState] = createSignal('');
  const [birthCountry, setBirthCountry] = createSignal('');
  const [currentCountry, setCurrentCountry] = createSignal('');
  const [currentState, setCurrentState] = createSignal('');
  
  // Immigration
  const [countryOfCitizenship, setCountryOfCitizenship] = createSignal('');
  const [isInUSA, setIsInUSA] = createSignal(false);
  const [hasI94, setHasI94] = createSignal(false);
  const [hasLPR, setHasLPR] = createSignal(false);
  const [passportNumber, setPassportNumber] = createSignal('');
  const [passportExpire, setPassportExpire] = createSignal('');
  
  // Marriage
  const [isMarriage, setIsMarriage] = createSignal(false);
  const [marriageDate, setMarriageDate] = createSignal('');
  const [marriageCity, setMarriageCity] = createSignal('');
  const [marriageState, setMarriageState] = createSignal('');
  const [marriageCountry, setMarriageCountry] = createSignal('');

  // Dynamic lists
  const [residences, setResidences] = createSignal<Array<any>>([]);
  const [employers, setEmployers] = createSignal<Array<any>>([]);
  const [schools, setSchools] = createSignal<Array<any>>([]);
  const [i94Records, setI94Records] = createSignal<Array<any>>([]);
  const [passportRecords, setPassportRecords] = createSignal<Array<any>>([]);
  const [driverLicenses, setDriverLicenses] = createSignal<Array<any>>([]);

  // Family relations
  const [father, setFather] = createSignal('');
  const [mother, setMother] = createSignal('');
  const [spouse, setSpouse] = createSignal('');
  const [siblings, setSiblings] = createSignal<string[]>([]);
  const [children, setChildren] = createSignal<Array<{name: string, dob: string}>>([]);

  // Initialize form with customer data if editing
  onMount(() => {
    if (props.customer) {
      const customer = props.customer;
      
      setFirstName(customer.firstName || '');
      setMiddleName(customer.middleName || '');
      setLastName(customer.lastName || '');
      setEmail(customer.email || '');
      setPhoneNumber(customer.phoneNumber || '');
      setSs(customer.ss || '');
      setAlienNumber(customer.alienNumber || '');
      
      setGenre(customer.genre || '');
      setDateOfBirth(customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : '');
      setRace(customer.race || '');
      setEthnicity(customer.ethnicity || '');
      setMaritalStatus(customer.maritalStatus || '');
      setHeight(customer.height || '');
      setWeight(customer.weight || '');
      setHairColor(customer.hairColor || '');
      setEyesColor(customer.eyesColor || '');
      
      setBirthCity(customer.placeOfBirth?.city || '');
      setBirthState(customer.placeOfBirth?.state || '');
      setBirthCountry(customer.placeOfBirth?.country || '');
      setCurrentCountry(customer.currentLocation?.country || '');
      setCurrentState(customer.currentLocation?.state || '');
      
      setCountryOfCitizenship(customer.countryOfCitizenship || '');
      setIsInUSA(customer.isInUSA || false);
      setHasI94(customer.hasI94 || false);
      setHasLPR(customer.hasLPR || false);
      setPassportNumber(customer.passportNumber || '');
      setPassportExpire(customer.passportExpire ? new Date(customer.passportExpire).toISOString().split('T')[0] : '');
      
      setIsMarriage(customer.isMarriage || false);
      setMarriageDate(customer.marriage_date ? new Date(customer.marriage_date).toISOString().split('T')[0] : '');
      setMarriageCity(customer.marriage_city || '');
      setMarriageState(customer.marriage_state || '');
      setMarriageCountry(customer.marriage_country || '');

      // Initialize dynamic lists
      if (customer.residences) {
        setResidences(Object.entries(customer.residences).map(([id, res]) => ({ id, ...res })));
      }
      if (customer.employers) {
        setEmployers(Object.entries(customer.employers).map(([id, emp]) => ({ id, ...emp })));
      }
      if (customer.schoolHistory) {
        setSchools(Object.entries(customer.schoolHistory).map(([id, school]) => ({ id, ...school })));
      }
      if (customer.entryRecord) {
        setI94Records(Object.entries(customer.entryRecord).map(([id, entry]) => ({ id, ...entry })));
      }
      if (customer.passportRecord) {
        setPassportRecords(Object.entries(customer.passportRecord).map(([id, passport]) => ({ id, ...passport })));
      }
      if (customer.driverLicenses) {
        setDriverLicenses(Object.entries(customer.driverLicenses).map(([id, dl]) => ({ id, ...dl })));
      }

      // Initialize family relations
      setFather(customer.father || '');
      setMother(customer.mother || '');
      setSpouse(customer.spouse || '');
      setSiblings(customer.siblings || []);
      if (customer.childrens) {
        setChildren(Object.entries(customer.childrens).map(([name, dob]) => ({ name, dob: dob ? new Date(dob as number).toISOString().split('T')[0] : '' })));
      }
    }
  });

  // Validation
  const isValid = createMemo(() => {
    return firstName().trim() && lastName().trim() && email().trim();
  });

  const validationErrors = createMemo(() => {
    const errors = [];
    if (!firstName().trim()) errors.push('Nombre es requerido');
    if (!lastName().trim()) errors.push('Apellido es requerido');
    if (!email().trim()) errors.push('Email es requerido');
    if (email().trim() && !/\S+@\S+\.\S+/.test(email())) errors.push('Email debe tener formato válido');
    return errors;
  });

  // Build customer object
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
      marriage_country: marriageCountry() || undefined,

      // Dynamic lists
      residences: residences().length > 0 ?
        residences().reduce((acc, res) => ({ ...acc, [res.id || Date.now() + Math.random()]: res }), {}) : undefined,
      employers: employers().length > 0 ?
        employers().reduce((acc, emp) => ({ ...acc, [emp.id || Date.now() + Math.random()]: emp }), {}) : undefined,
      schoolHistory: schools().length > 0 ?
        schools().reduce((acc, school) => ({ ...acc, [school.id || Date.now() + Math.random()]: school }), {}) : undefined,
      entryRecord: i94Records().length > 0 ?
        i94Records().reduce((acc, entry) => ({ ...acc, [entry.id || Date.now() + Math.random()]: entry }), {}) : undefined,
      passportRecord: passportRecords().length > 0 ?
        passportRecords().reduce((acc, passport) => ({ ...acc, [passport.id || Date.now() + Math.random()]: passport }), {}) : undefined,
      driverLicenses: driverLicenses().length > 0 ?
        driverLicenses().reduce((acc, dl) => ({ ...acc, [dl.id || Date.now() + Math.random()]: dl }), {}) : undefined,

      // Family relations
      father: father() || undefined,
      mother: mother() || undefined,
      spouse: spouse() || undefined,
      siblings: siblings().length > 0 ? siblings() : undefined,
      childrens: children().length > 0 ?
        children().reduce((acc, child) => ({ ...acc, [child.name]: child.dob ? new Date(child.dob).getTime() : 0 }), {}) : undefined
    };
  };

  // Handle save
  const handleSave = async () => {
    if (!isValid()) {
      setError('Por favor completa todos los campos requeridos');
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

  // Section navigation style
  const sectionNavStyle = {
    display: 'flex',
    gap: '0.25rem',
    'margin-bottom': '2rem',
    'border-bottom': '2px solid var(--border-color)',
    'overflow-x': 'auto'
  };

  const sectionButtonStyle = (isActive: boolean) => ({
    padding: '1rem 1.5rem',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    border: 'none',
    'border-radius': '8px 8px 0 0',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '400',
    'white-space': 'nowrap',
    transition: 'all 0.2s ease',
    'font-size': '0.875rem'
  });

  // Input styles
  const inputGroupStyle = {
    'margin-bottom': '1.5rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'font-size': '0.875rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'font-size': '1rem',
    'font-family': 'inherit',
    transition: 'border-color 0.2s ease'
  };

  const inputFocusStyle = {
    ...inputStyle,
    'border-color': 'var(--primary-color)',
    outline: 'none',
    'box-shadow': '0 0 0 3px rgba(var(--primary-color-rgb), 0.1)'
  };

  return (
    <div style={{ 'max-width': '1000px', margin: '0 auto' }}>
      <Card>
        <div style={{ padding: '2rem' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '2rem'
          }}>
            <div>
              <h1 style={{
                'font-size': '1.75rem',
                'font-weight': '700',
                color: 'var(--text-primary)',
                'margin-bottom': '0.5rem'
              }}>
                {props.mode === 'create' ? 
                  '➕ Crear Nuevo Cliente Notarial' : 
                  `✏️ Editar Cliente: ${firstName()} ${lastName()}`
                }
              </h1>
              <p style={{
                color: 'var(--text-muted)',
                'font-size': '1rem'
              }}>
                {props.mode === 'create' ? 
                  'Complete la información del nuevo cliente' : 
                  'Modifique la información del cliente existente'
                }
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button 
                variant="outline" 
                onClick={props.onCancel}
                disabled={saving()}
              >
                ✕ Cancelar
              </Button>
            </div>
          </div>

          {/* Validation Errors */}
          <Show when={validationErrors().length > 0}>
            <div style={{
              padding: '1rem',
              background: 'var(--danger-light)',
              color: 'var(--danger-color)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1.5rem',
              border: '1px solid var(--danger-color)'
            }}>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>⚠️ Errores de Validación:</h4>
              <ul style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
                <For each={validationErrors()}>
                  {(error) => <li>{error}</li>}
                </For>
              </ul>
            </div>
          </Show>

          <Show when={error()}>
            <div style={{
              padding: '1rem',
              background: 'var(--danger-light)',
              color: 'var(--danger-color)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1.5rem'
            }}>
              {error()}
            </div>
          </Show>

          {/* Section Navigation */}
          <div style={sectionNavStyle}>
            <button
              style={sectionButtonStyle(activeSection() === 'personal')}
              onClick={() => setActiveSection('personal')}
            >
              👤 Personal
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'contact')}
              onClick={() => setActiveSection('contact')}
            >
              📞 Contacto
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'location')}
              onClick={() => setActiveSection('location')}
            >
              📍 Ubicación
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'residences')}
              onClick={() => setActiveSection('residences')}
            >
              🏠 Residencias
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'employment')}
              onClick={() => setActiveSection('employment')}
            >
              💼 Empleos
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'education')}
              onClick={() => setActiveSection('education')}
            >
              🎓 Educación
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'immigration')}
              onClick={() => setActiveSection('immigration')}
            >
              ✈️ Inmigración
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'i94')}
              onClick={() => setActiveSection('i94')}
            >
              📋 I-94
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'passports')}
              onClick={() => setActiveSection('passports')}
            >
              📔 Pasaportes
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'driverLicense')}
              onClick={() => setActiveSection('driverLicense')}
            >
              🪪 Licencias
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'family')}
              onClick={() => setActiveSection('family')}
            >
              👨‍👩‍👧‍👦 Familia
            </button>
            <button
              style={sectionButtonStyle(activeSection() === 'documents')}
              onClick={() => setActiveSection('documents')}
            >
              📄 Documentos
            </button>
          </div>

          {/* Form Sections */}
          <div style={{ 'min-height': '500px' }}>
            {/* Personal Section */}
            <Show when={activeSection() === 'personal'}>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>* </span>
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={firstName()}
                    onInput={(e) => setFirstName(e.currentTarget.value)}
                    style={inputStyle}
                    required
                    placeholder="Ej: Juan"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Segundo Nombre</label>
                  <input
                    type="text"
                    value={middleName()}
                    onInput={(e) => setMiddleName(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="Ej: Carlos"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>* </span>
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={lastName()}
                    onInput={(e) => setLastName(e.currentTarget.value)}
                    style={inputStyle}
                    required
                    placeholder="Ej: García"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Género</label>
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

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={dateOfBirth()}
                    onInput={(e) => setDateOfBirth(e.currentTarget.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Estado Civil</label>
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

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Raza</label>
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

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Etnia</label>
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

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Altura (cm)</label>
                  <input
                    type="number"
                    value={height()}
                    onInput={(e) => setHeight(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="175"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Peso (lbs)</label>
                  <input
                    type="number"
                    value={weight()}
                    onInput={(e) => setWeight(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="150"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Color de Cabello</label>
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

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Color de Ojos</label>
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
              <Show when={maritalStatus() === 'Married'}>
                <div style={{
                  'margin-top': '2rem',
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
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
                    <label style={{ 'font-weight': '600' }}>
                      💑 Información de Matrimonio
                    </label>
                  </div>

                  <Show when={isMarriage()}>
                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '1rem'
                    }}>
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Fecha de Matrimonio</label>
                        <input
                          type="date"
                          value={marriageDate()}
                          onInput={(e) => setMarriageDate(e.currentTarget.value)}
                          style={inputStyle}
                        />
                      </div>

                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Ciudad</label>
                        <input
                          type="text"
                          value={marriageCity()}
                          onInput={(e) => setMarriageCity(e.currentTarget.value)}
                          style={inputStyle}
                        />
                      </div>

                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Estado/Provincia</label>
                        <input
                          type="text"
                          value={marriageState()}
                          onInput={(e) => setMarriageState(e.currentTarget.value)}
                          style={inputStyle}
                        />
                      </div>

                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>País</label>
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
            </Show>

            {/* Contact Section */}
            <Show when={activeSection() === 'contact'}>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>
                    <span style={{ color: 'var(--danger-color)' }}>* </span>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email()}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    style={inputStyle}
                    required
                    placeholder="ejemplo@correo.com"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Número de Teléfono</label>
                  <input
                    type="tel"
                    value={phoneNumber()}
                    onInput={(e) => setPhoneNumber(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="(502) 123-4567"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>SSN (Seguro Social)</label>
                  <input
                    type="text"
                    value={ss()}
                    onInput={(e) => setSs(e.currentTarget.value)}
                    style={inputStyle}
                    placeholder="123-45-6789"
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Número de Extranjero (Alien Number)</label>
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

            {/* Location Section */}
            <Show when={activeSection() === 'location'}>
              <div style={{ display: 'grid', gap: '2rem' }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{
                    'margin-bottom': '1rem',
                    'font-weight': '600',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    🎂 Lugar de Nacimiento
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem'
                  }}>
                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>Ciudad</label>
                      <input
                        type="text"
                        value={birthCity()}
                        onInput={(e) => setBirthCity(e.currentTarget.value)}
                        style={inputStyle}
                        placeholder="Holguín"
                      />
                    </div>

                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>Estado/Provincia</label>
                      <input
                        type="text"
                        value={birthState()}
                        onInput={(e) => setBirthState(e.currentTarget.value)}
                        style={inputStyle}
                        placeholder="Holguín"
                      />
                    </div>

                    <div style={inputGroupStyle}>
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

                <div style={{
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{
                    'margin-bottom': '1rem',
                    'font-weight': '600',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    📍 Ubicación Actual
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1rem'
                  }}>
                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>País</label>
                      <input
                        type="text"
                        value={currentCountry()}
                        onInput={(e) => setCurrentCountry(e.currentTarget.value)}
                        style={inputStyle}
                        placeholder="USA"
                      />
                    </div>

                    <div style={inputGroupStyle}>
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

            {/* Immigration Section */}
            <Show when={activeSection() === 'immigration'}>
              <div style={{ display: 'grid', gap: '2rem' }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{
                    'margin-bottom': '1rem',
                    'font-weight': '600',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}>
                    🏳️ Ciudadanía y Estado
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    'margin-bottom': '1.5rem'
                  }}>
                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>País de Ciudadanía</label>
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
              </div>
            </Show>

            {/* Residences Section */}
            <Show when={activeSection() === 'residences'}>
              <div>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '1.5rem'
                }}>
                  <h3 style={{ 'font-weight': '600' }}>🏠 Residencias</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setResidences([...residences(), {
                        id: Date.now().toString(),
                        addressLineOne: '',
                        city: '',
                        state: '',
                        zipcode: '',
                        country: '',
                        fromDate: { month: '', year: '' },
                        toDate: { month: '', year: '' }
                      }]);
                    }}
                  >
                    + Agregar Residencia
                  </Button>
                </div>

                <For each={residences()}>
                  {(residence, index) => (
                    <div style={{
                      padding: '1.5rem',
                      background: 'var(--gray-50)',
                      'border-radius': 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'margin-bottom': '1rem'
                      }}>
                        <h4>Residencia #{index() + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResidences(residences().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)' }}
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Dirección Línea 1</label>
                          <input
                            type="text"
                            value={residence.addressLineOne || ''}
                            onInput={(e) => {
                              const updated = [...residences()];
                              updated[index()].addressLineOne = e.currentTarget.value;
                              setResidences(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Dirección Línea 2</label>
                          <input
                            type="text"
                            value={residence.addressLineTwo || ''}
                            onInput={(e) => {
                              const updated = [...residences()];
                              updated[index()].addressLineTwo = e.currentTarget.value;
                              setResidences(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Ciudad</label>
                          <input
                            type="text"
                            value={residence.city || ''}
                            onInput={(e) => {
                              const updated = [...residences()];
                              updated[index()].city = e.currentTarget.value;
                              setResidences(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Estado</label>
                          <input
                            type="text"
                            value={residence.state || ''}
                            onInput={(e) => {
                              const updated = [...residences()];
                              updated[index()].state = e.currentTarget.value;
                              setResidences(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Código Postal</label>
                          <input
                            type="text"
                            value={residence.zipcode || ''}
                            onInput={(e) => {
                              const updated = [...residences()];
                              updated[index()].zipcode = e.currentTarget.value;
                              setResidences(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>País</label>
                          <input
                            type="text"
                            value={residence.country || ''}
                            onInput={(e) => {
                              const updated = [...residences()];
                              updated[index()].country = e.currentTarget.value;
                              setResidences(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Desde (Mes/Año)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={residence.fromDate?.month || ''}
                              onInput={(e) => {
                                const updated = [...residences()];
                                if (!updated[index()].fromDate) updated[index()].fromDate = {};
                                updated[index()].fromDate!.month = e.currentTarget.value;
                                setResidences(updated);
                              }}
                              placeholder="MM"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                            <input
                              type="text"
                              value={residence.fromDate?.year || ''}
                              onInput={(e) => {
                                const updated = [...residences()];
                                if (!updated[index()].fromDate) updated[index()].fromDate = {};
                                updated[index()].fromDate!.year = e.currentTarget.value;
                                setResidences(updated);
                              }}
                              placeholder="YYYY"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                          </div>
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Hasta (Mes/Año)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={residence.toDate?.month || ''}
                              onInput={(e) => {
                                const updated = [...residences()];
                                if (!updated[index()].toDate) updated[index()].toDate = {};
                                updated[index()].toDate!.month = e.currentTarget.value;
                                setResidences(updated);
                              }}
                              placeholder="MM"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                            <input
                              type="text"
                              value={residence.toDate?.year || ''}
                              onInput={(e) => {
                                const updated = [...residences()];
                                if (!updated[index()].toDate) updated[index()].toDate = {};
                                updated[index()].toDate!.year = e.currentTarget.value;
                                setResidences(updated);
                              }}
                              placeholder="YYYY o 'Present'"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>

                <Show when={residences().length === 0}>
                  <div style={{
                    'text-align': 'center',
                    padding: '2rem',
                    color: 'var(--text-muted)'
                  }}>
                    No hay residencias agregadas. Haga clic en "Agregar Residencia" para comenzar.
                  </div>
                </Show>
              </div>
            </Show>

            {/* Employment Section */}
            <Show when={activeSection() === 'employment'}>
              <div>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '1.5rem'
                }}>
                  <h3 style={{ 'font-weight': '600' }}>💼 Historial Laboral</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEmployers([...employers(), {
                        id: Date.now().toString(),
                        employerName: '',
                        occupation: '',
                        addressLineOne: '',
                        city: '',
                        state: '',
                        zipcode: '',
                        country: '',
                        fromDate: { month: '', year: '' },
                        toDate: { month: '', year: '' }
                      }]);
                    }}
                  >
                    + Agregar Empleo
                  </Button>
                </div>

                <For each={employers()}>
                  {(employer, index) => (
                    <div style={{
                      padding: '1.5rem',
                      background: 'var(--gray-50)',
                      'border-radius': 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'margin-bottom': '1rem'
                      }}>
                        <h4>Empleo #{index() + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmployers(employers().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)' }}
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Nombre del Empleador</label>
                          <input
                            type="text"
                            value={employer.employerName || ''}
                            onInput={(e) => {
                              const updated = [...employers()];
                              updated[index()].employerName = e.currentTarget.value;
                              setEmployers(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Ocupación</label>
                          <input
                            type="text"
                            value={employer.occupation || ''}
                            onInput={(e) => {
                              const updated = [...employers()];
                              updated[index()].occupation = e.currentTarget.value;
                              setEmployers(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Dirección</label>
                          <input
                            type="text"
                            value={employer.addressLineOne || ''}
                            onInput={(e) => {
                              const updated = [...employers()];
                              updated[index()].addressLineOne = e.currentTarget.value;
                              setEmployers(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Ciudad</label>
                          <input
                            type="text"
                            value={employer.city || ''}
                            onInput={(e) => {
                              const updated = [...employers()];
                              updated[index()].city = e.currentTarget.value;
                              setEmployers(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Estado</label>
                          <input
                            type="text"
                            value={employer.state || ''}
                            onInput={(e) => {
                              const updated = [...employers()];
                              updated[index()].state = e.currentTarget.value;
                              setEmployers(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Código Postal</label>
                          <input
                            type="text"
                            value={employer.zipcode || ''}
                            onInput={(e) => {
                              const updated = [...employers()];
                              updated[index()].zipcode = e.currentTarget.value;
                              setEmployers(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>País</label>
                          <input
                            type="text"
                            value={employer.country || ''}
                            onInput={(e) => {
                              const updated = [...employers()];
                              updated[index()].country = e.currentTarget.value;
                              setEmployers(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Desde (Mes/Año)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={employer.fromDate?.month || ''}
                              onInput={(e) => {
                                const updated = [...employers()];
                                if (!updated[index()].fromDate) updated[index()].fromDate = {};
                                updated[index()].fromDate!.month = e.currentTarget.value;
                                setEmployers(updated);
                              }}
                              placeholder="MM"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                            <input
                              type="text"
                              value={employer.fromDate?.year || ''}
                              onInput={(e) => {
                                const updated = [...employers()];
                                if (!updated[index()].fromDate) updated[index()].fromDate = {};
                                updated[index()].fromDate!.year = e.currentTarget.value;
                                setEmployers(updated);
                              }}
                              placeholder="YYYY"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                          </div>
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Hasta (Mes/Año)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={employer.toDate?.month || ''}
                              onInput={(e) => {
                                const updated = [...employers()];
                                if (!updated[index()].toDate) updated[index()].toDate = {};
                                updated[index()].toDate!.month = e.currentTarget.value;
                                setEmployers(updated);
                              }}
                              placeholder="MM"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                            <input
                              type="text"
                              value={employer.toDate?.year || ''}
                              onInput={(e) => {
                                const updated = [...employers()];
                                if (!updated[index()].toDate) updated[index()].toDate = {};
                                updated[index()].toDate!.year = e.currentTarget.value;
                                setEmployers(updated);
                              }}
                              placeholder="YYYY o 'Present'"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>

                <Show when={employers().length === 0}>
                  <div style={{
                    'text-align': 'center',
                    padding: '2rem',
                    color: 'var(--text-muted)'
                  }}>
                    No hay empleos agregados. Haga clic en "Agregar Empleo" para comenzar.
                  </div>
                </Show>
              </div>
            </Show>

            {/* Education Section */}
            <Show when={activeSection() === 'education'}>
              <div>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '1.5rem'
                }}>
                  <h3 style={{ 'font-weight': '600' }}>🎓 Historial Educativo</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSchools([...schools(), {
                        id: Date.now().toString(),
                        schoolName: '',
                        schoolType: '',
                        city: '',
                        state: '',
                        zipcode: '',
                        country: '',
                        fromDate: { month: '', year: '' },
                        toDate: { month: '', year: '' }
                      }]);
                    }}
                  >
                    + Agregar Escuela
                  </Button>
                </div>

                <For each={schools()}>
                  {(school, index) => (
                    <div style={{
                      padding: '1.5rem',
                      background: 'var(--gray-50)',
                      'border-radius': 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'margin-bottom': '1rem'
                      }}>
                        <h4>Educación #{index() + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSchools(schools().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)' }}
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Nombre de la Institución</label>
                          <input
                            type="text"
                            value={school.schoolName || ''}
                            onInput={(e) => {
                              const updated = [...schools()];
                              updated[index()].schoolName = e.currentTarget.value;
                              setSchools(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Tipo de Institución</label>
                          <select
                            value={school.schoolType || ''}
                            onChange={(e) => {
                              const updated = [...schools()];
                              updated[index()].schoolType = e.currentTarget.value;
                              setSchools(updated);
                            }}
                            style={inputStyle}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Elementary">Primaria</option>
                            <option value="Middle School">Secundaria</option>
                            <option value="High School">Preparatoria</option>
                            <option value="College">Universidad</option>
                            <option value="University">Universidad</option>
                            <option value="Trade School">Escuela Técnica</option>
                            <option value="Other">Otro</option>
                          </select>
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Ciudad</label>
                          <input
                            type="text"
                            value={school.city || ''}
                            onInput={(e) => {
                              const updated = [...schools()];
                              updated[index()].city = e.currentTarget.value;
                              setSchools(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Estado</label>
                          <input
                            type="text"
                            value={school.state || ''}
                            onInput={(e) => {
                              const updated = [...schools()];
                              updated[index()].state = e.currentTarget.value;
                              setSchools(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>País</label>
                          <input
                            type="text"
                            value={school.country || ''}
                            onInput={(e) => {
                              const updated = [...schools()];
                              updated[index()].country = e.currentTarget.value;
                              setSchools(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Desde (Mes/Año)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={school.fromDate?.month || ''}
                              onInput={(e) => {
                                const updated = [...schools()];
                                if (!updated[index()].fromDate) updated[index()].fromDate = {};
                                updated[index()].fromDate!.month = e.currentTarget.value;
                                setSchools(updated);
                              }}
                              placeholder="MM"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                            <input
                              type="text"
                              value={school.fromDate?.year || ''}
                              onInput={(e) => {
                                const updated = [...schools()];
                                if (!updated[index()].fromDate) updated[index()].fromDate = {};
                                updated[index()].fromDate!.year = e.currentTarget.value;
                                setSchools(updated);
                              }}
                              placeholder="YYYY"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                          </div>
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Hasta (Mes/Año)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={school.toDate?.month || ''}
                              onInput={(e) => {
                                const updated = [...schools()];
                                if (!updated[index()].toDate) updated[index()].toDate = {};
                                updated[index()].toDate!.month = e.currentTarget.value;
                                setSchools(updated);
                              }}
                              placeholder="MM"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                            <input
                              type="text"
                              value={school.toDate?.year || ''}
                              onInput={(e) => {
                                const updated = [...schools()];
                                if (!updated[index()].toDate) updated[index()].toDate = {};
                                updated[index()].toDate!.year = e.currentTarget.value;
                                setSchools(updated);
                              }}
                              placeholder="YYYY o 'Present'"
                              style={{ ...inputStyle, width: '50%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>

                <Show when={schools().length === 0}>
                  <div style={{
                    'text-align': 'center',
                    padding: '2rem',
                    color: 'var(--text-muted)'
                  }}>
                    No hay escuelas agregadas. Haga clic en "Agregar Escuela" para comenzar.
                  </div>
                </Show>
              </div>
            </Show>

            {/* I-94 Section */}
            <Show when={activeSection() === 'i94'}>
              <div>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '1.5rem'
                }}>
                  <h3 style={{ 'font-weight': '600' }}>📋 Registros I-94 / Entradas</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setI94Records([...i94Records(), {
                        id: Date.now().toString(),
                        dateOfEntry: 0,
                        placeOfEntry: '',
                        state: '',
                        status: '',
                        lastLeftYourCountry: 0
                      }]);
                    }}
                  >
                    + Agregar Registro
                  </Button>
                </div>

                <For each={i94Records()}>
                  {(record, index) => (
                    <div style={{
                      padding: '1.5rem',
                      background: 'var(--gray-50)',
                      'border-radius': 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'margin-bottom': '1rem'
                      }}>
                        <h4>Registro I-94 #{index() + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setI94Records(i94Records().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)' }}
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Fecha de Entrada</label>
                          <input
                            type="date"
                            value={record.dateOfEntry ? new Date(record.dateOfEntry).toISOString().split('T')[0] : ''}
                            onInput={(e) => {
                              const updated = [...i94Records()];
                              updated[index()].dateOfEntry = e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : 0;
                              setI94Records(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Lugar de Entrada</label>
                          <input
                            type="text"
                            value={record.placeOfEntry || ''}
                            onInput={(e) => {
                              const updated = [...i94Records()];
                              updated[index()].placeOfEntry = e.currentTarget.value;
                              setI94Records(updated);
                            }}
                            style={inputStyle}
                            placeholder="Miami, New York, etc."
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Estado</label>
                          <input
                            type="text"
                            value={record.state || ''}
                            onInput={(e) => {
                              const updated = [...i94Records()];
                              updated[index()].state = e.currentTarget.value;
                              setI94Records(updated);
                            }}
                            style={inputStyle}
                            placeholder="FL, NY, etc."
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Estado Migratorio</label>
                          <input
                            type="text"
                            value={record.status || ''}
                            onInput={(e) => {
                              const updated = [...i94Records()];
                              updated[index()].status = e.currentTarget.value;
                              setI94Records(updated);
                            }}
                            style={inputStyle}
                            placeholder="B1/B2, F1, etc."
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Última vez que salió del país</label>
                          <input
                            type="date"
                            value={record.lastLeftYourCountry ? new Date(record.lastLeftYourCountry).toISOString().split('T')[0] : ''}
                            onInput={(e) => {
                              const updated = [...i94Records()];
                              updated[index()].lastLeftYourCountry = e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : 0;
                              setI94Records(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </For>

                <Show when={i94Records().length === 0}>
                  <div style={{
                    'text-align': 'center',
                    padding: '2rem',
                    color: 'var(--text-muted)'
                  }}>
                    No hay registros I-94 agregados. Haga clic en "Agregar Registro" para comenzar.
                  </div>
                </Show>
              </div>
            </Show>

            {/* Passports Section */}
            <Show when={activeSection() === 'passports'}>
              <div>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '1.5rem'
                }}>
                  <h3 style={{ 'font-weight': '600' }}>📔 Pasaportes</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setPassportRecords([...passportRecords(), {
                        id: Date.now().toString(),
                        passportNumber: '',
                        countryOfIssuance: '',
                        issueDate: 0,
                        expirationDate: 0
                      }]);
                    }}
                  >
                    + Agregar Pasaporte
                  </Button>
                </div>

                <For each={passportRecords()}>
                  {(passport, index) => (
                    <div style={{
                      padding: '1.5rem',
                      background: 'var(--gray-50)',
                      'border-radius': 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'margin-bottom': '1rem'
                      }}>
                        <h4>Pasaporte #{index() + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPassportRecords(passportRecords().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)' }}
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Número de Pasaporte</label>
                          <input
                            type="text"
                            value={passport.passportNumber || ''}
                            onInput={(e) => {
                              const updated = [...passportRecords()];
                              updated[index()].passportNumber = e.currentTarget.value;
                              setPassportRecords(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>País de Emisión</label>
                          <input
                            type="text"
                            value={passport.countryOfIssuance || ''}
                            onInput={(e) => {
                              const updated = [...passportRecords()];
                              updated[index()].countryOfIssuance = e.currentTarget.value;
                              setPassportRecords(updated);
                            }}
                            style={inputStyle}
                            placeholder="CUB, USA, etc."
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Fecha de Emisión</label>
                          <input
                            type="date"
                            value={passport.issueDate ? new Date(passport.issueDate).toISOString().split('T')[0] : ''}
                            onInput={(e) => {
                              const updated = [...passportRecords()];
                              updated[index()].issueDate = e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : 0;
                              setPassportRecords(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Fecha de Vencimiento</label>
                          <input
                            type="date"
                            value={passport.expirationDate ? new Date(passport.expirationDate).toISOString().split('T')[0] : ''}
                            onInput={(e) => {
                              const updated = [...passportRecords()];
                              updated[index()].expirationDate = e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : 0;
                              setPassportRecords(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </For>

                <Show when={passportRecords().length === 0}>
                  <div style={{
                    'text-align': 'center',
                    padding: '2rem',
                    color: 'var(--text-muted)'
                  }}>
                    No hay pasaportes agregados. Haga clic en "Agregar Pasaporte" para comenzar.
                  </div>
                </Show>
              </div>
            </Show>

            {/* Driver License Section */}
            <Show when={activeSection() === 'driverLicense'}>
              <div>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '1.5rem'
                }}>
                  <h3 style={{ 'font-weight': '600' }}>🪪 Licencias de Conducir</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setDriverLicenses([...driverLicenses(), {
                        id: Date.now().toString(),
                        licenseNumber: '',
                        issueState: '',
                        issueDate: 0,
                        expirationDate: 0,
                        dlClass: '',
                        restrictions: '',
                        endorsements: ''
                      }]);
                    }}
                  >
                    + Agregar Licencia
                  </Button>
                </div>

                <For each={driverLicenses()}>
                  {(dl, index) => (
                    <div style={{
                      padding: '1.5rem',
                      background: 'var(--gray-50)',
                      'border-radius': 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'margin-bottom': '1rem'
                      }}>
                        <h4>Licencia de Conducir #{index() + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDriverLicenses(driverLicenses().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)' }}
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Número de Licencia</label>
                          <input
                            type="text"
                            value={dl.licenseNumber || ''}
                            onInput={(e) => {
                              const updated = [...driverLicenses()];
                              updated[index()].licenseNumber = e.currentTarget.value;
                              setDriverLicenses(updated);
                            }}
                            style={inputStyle}
                            placeholder="ABC123456"
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Estado de Emisión</label>
                          <input
                            type="text"
                            value={dl.issueState || ''}
                            onInput={(e) => {
                              const updated = [...driverLicenses()];
                              updated[index()].issueState = e.currentTarget.value;
                              setDriverLicenses(updated);
                            }}
                            style={inputStyle}
                            placeholder="KY, FL, NY, etc."
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Clase de Licencia</label>
                          <select
                            value={dl.dlClass || ''}
                            onChange={(e) => {
                              const updated = [...driverLicenses()];
                              updated[index()].dlClass = e.currentTarget.value;
                              setDriverLicenses(updated);
                            }}
                            style={inputStyle}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Class A">Clase A</option>
                            <option value="Class B">Clase B</option>
                            <option value="Class C">Clase C</option>
                            <option value="Class D">Clase D (Regular)</option>
                            <option value="Class M">Clase M (Motocicleta)</option>
                            <option value="CDL">CDL (Comercial)</option>
                          </select>
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Fecha de Emisión</label>
                          <input
                            type="date"
                            value={dl.issueDate ? new Date(dl.issueDate).toISOString().split('T')[0] : ''}
                            onInput={(e) => {
                              const updated = [...driverLicenses()];
                              updated[index()].issueDate = e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : 0;
                              setDriverLicenses(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Fecha de Vencimiento</label>
                          <input
                            type="date"
                            value={dl.expirationDate ? new Date(dl.expirationDate).toISOString().split('T')[0] : ''}
                            onInput={(e) => {
                              const updated = [...driverLicenses()];
                              updated[index()].expirationDate = e.currentTarget.value ? new Date(e.currentTarget.value).getTime() : 0;
                              setDriverLicenses(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Restricciones</label>
                          <input
                            type="text"
                            value={dl.restrictions || ''}
                            onInput={(e) => {
                              const updated = [...driverLicenses()];
                              updated[index()].restrictions = e.currentTarget.value;
                              setDriverLicenses(updated);
                            }}
                            style={inputStyle}
                            placeholder="B (Lentes correctivos), etc."
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Endosos</label>
                          <input
                            type="text"
                            value={dl.endorsements || ''}
                            onInput={(e) => {
                              const updated = [...driverLicenses()];
                              updated[index()].endorsements = e.currentTarget.value;
                              setDriverLicenses(updated);
                            }}
                            style={inputStyle}
                            placeholder="H (Materiales Peligrosos), etc."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </For>

                <Show when={driverLicenses().length === 0}>
                  <div style={{
                    'text-align': 'center',
                    padding: '2rem',
                    color: 'var(--text-muted)'
                  }}>
                    No hay licencias de conducir agregadas. Haga clic en "Agregar Licencia" para comenzar.
                  </div>
                </Show>
              </div>
            </Show>

            {/* Family Section */}
            <Show when={activeSection() === 'family'}>
              <div>
                <h3 style={{ 'font-weight': '600', 'margin-bottom': '1.5rem' }}>👨‍👩‍👧‍👦 Relaciones Familiares</h3>

                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem',
                  'margin-bottom': '2rem'
                }}>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>👨 Padre</label>
                    <CustomerSearchDropdown
                      value={father()}
                      onChange={(clientId, name) => setFather(clientId)}
                      placeholder="Buscar padre..."
                    />
                  </div>

                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>👩 Madre</label>
                    <CustomerSearchDropdown
                      value={mother()}
                      onChange={(clientId, name) => setMother(clientId)}
                      placeholder="Buscar madre..."
                    />
                  </div>

                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>💑 Cónyuge</label>
                    <CustomerSearchDropdown
                      value={spouse()}
                      onChange={(clientId, name) => setSpouse(clientId)}
                      placeholder="Buscar cónyuge..."
                    />
                  </div>
                </div>

                {/* Siblings */}
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)',
                  'margin-bottom': '1.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'margin-bottom': '1rem'
                  }}>
                    <h4>👫 Hermanos/as</h4>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSiblings([...siblings(), '']);
                      }}
                    >
                      + Agregar Hermano/a
                    </Button>
                  </div>

                  <For each={siblings()}>
                    {(sibling, index) => (
                      <div style={{ display: 'flex', gap: '1rem', 'margin-bottom': '1rem', 'align-items': 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <CustomerSearchDropdown
                            value={sibling}
                            onChange={(clientId, name) => {
                              const updated = [...siblings()];
                              updated[index()] = clientId;
                              setSiblings(updated);
                            }}
                            placeholder="Buscar hermano/a..."
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSiblings(siblings().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)', 'flex-shrink': 0 }}
                        >
                          🗑️
                        </Button>
                      </div>
                    )}
                  </For>

                  <Show when={siblings().length === 0}>
                    <div style={{
                      'text-align': 'center',
                      padding: '1rem',
                      color: 'var(--text-muted)'
                    }}>
                      No hay hermanos/as agregados. Haga clic en "Agregar Hermano/a" para comenzar.
                    </div>
                  </Show>
                </div>

                {/* Children */}
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'margin-bottom': '1rem'
                  }}>
                    <h4>👶 Hijos/as</h4>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setChildren([...children(), { name: '', dob: '' }]);
                      }}
                    >
                      + Agregar Hijo/a
                    </Button>
                  </div>

                  <For each={children()}>
                    {(child, index) => (
                      <div style={{
                        display: 'grid',
                        'grid-template-columns': '1fr 1fr auto',
                        gap: '1rem',
                        'margin-bottom': '1rem',
                        'align-items': 'flex-start'
                      }}>
                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Hijo/a (Cliente)</label>
                          <CustomerSearchDropdown
                            value={child.name}
                            onChange={(clientId, name) => {
                              const updated = [...children()];
                              updated[index()].name = clientId;
                              setChildren(updated);
                            }}
                            placeholder="Buscar hijo/a..."
                          />
                        </div>

                        <div style={inputGroupStyle}>
                          <label style={labelStyle}>Fecha de Nacimiento</label>
                          <input
                            type="date"
                            value={child.dob}
                            onInput={(e) => {
                              const updated = [...children()];
                              updated[index()].dob = e.currentTarget.value;
                              setChildren(updated);
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setChildren(children().filter((_, i) => i !== index()));
                          }}
                          style={{ color: 'var(--danger-color)', 'align-self': 'flex-end', 'margin-top': '1.7rem' }}
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>
                    )}
                  </For>

                  <Show when={children().length === 0}>
                    <div style={{
                      'text-align': 'center',
                      padding: '1rem',
                      color: 'var(--text-muted)'
                    }}>
                      No hay hijos/as agregados. Haga clic en "Agregar Hijo/a" para comenzar.
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Documents Section */}
            <Show when={activeSection() === 'documents'}>
              <div style={{
                padding: '1.5rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{
                  'margin-bottom': '1rem',
                  'font-weight': '600',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  📔 Información del Pasaporte
                </h3>
                
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Número de Pasaporte</label>
                    <input
                      type="text"
                      value={passportNumber()}
                      onInput={(e) => setPassportNumber(e.currentTarget.value)}
                      style={inputStyle}
                      placeholder="K490160"
                    />
                  </div>

                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={passportExpire()}
                      onInput={(e) => setPassportExpire(e.currentTarget.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </Show>
          </div>

          {/* Save Actions */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-top': '3rem',
            padding: '1.5rem',
            background: 'var(--gray-50)',
            'border-radius': 'var(--border-radius)',
            border: '2px solid var(--border-color)'
          }}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '1rem'
            }}>
              <Show when={!isValid()}>
                <span style={{
                  color: 'var(--warning-color)',
                  'font-size': '0.875rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  ⚠️ Completa todos los campos requeridos (*)
                </span>
              </Show>
              
              <Show when={isValid()}>
                <span style={{
                  color: 'var(--success-color)',
                  'font-size': '0.875rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem'
                }}>
                  ✅ Todo listo para guardar
                </span>
              </Show>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                variant="outline"
                onClick={props.onCancel}
                disabled={saving()}
              >
                ✕ Cancelar
              </Button>
              
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!isValid() || saving()}
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  'min-width': '180px'
                }}
              >
                {saving() ? (
                  <>⏳ Guardando...</>
                ) : (
                  <>{props.mode === 'create' ? '➕ Crear Cliente' : '✏️ Actualizar Cliente'}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotaryCustomerEditor;