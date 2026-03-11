import { Component, createSignal, For, Show, createEffect, on } from 'solid-js';
import { generateRandomId, localStorage, devLog } from '../../../services/utils';
import Icon from '../../../components/Icon';
import { showToast } from '../../../services/toastService';
import {
  CustomerTaxInfo,
  W2Form,
  Form1099,
  TaxDeduction,
  TaxFormData,
  TaxCalculationResult,
  FilingStatus,
  BusinessExpense,
  RetirementContribution,
  RentalProperty,
  PartnershipIncome,
  EstateIncome,
  Form1098,
  Form1098T
} from '../types/taxTypes';
import { taxCalculationService } from '../services/taxCalculationService';
import { FormInput } from '../../ui';
import { inventoryApi } from '../../../services/apiAdapter';
import { NotaryCustomer } from '../../notary/types';
import AllSchedules from './schedules/AllSchedules';
import TaxDocumentUploader from './TaxDocumentUploader';

const TaxReturnCalculator: Component = () => {
  // Tax Year Selection
  const [taxYear, setTaxYear] = createSignal<2024 | 2025>(2024);

  // Customer Information
  const [customerInfo, setCustomerInfo] = createSignal<CustomerTaxInfo>({
    firstName: '',
    lastName: '',
    ssn: '',
    filingStatus: 'single',
    dependents: 0,
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  // W-2 Forms
  const [w2Forms, setW2Forms] = createSignal<W2Form[]>([]);

  // 1099 Forms
  const [form1099s, setForm1099s] = createSignal<Form1099[]>([]);

  // Deductions
  const [deductions, setDeductions] = createSignal<TaxDeduction[]>([]);

  // Business Expenses
  const [businessExpenses, setBusinessExpenses] = createSignal<BusinessExpense[]>([]);

  // Retirement Contributions (Form 8880)
  const [retirementContributions, setRetirementContributions] = createSignal<RetirementContribution[]>([]);

  // Rental Properties (Schedule E - Part I)
  const [rentalProperties, setRentalProperties] = createSignal<RentalProperty[]>([]);

  // Partnership Income (Schedule E - Part II)
  const [partnershipIncomes, setPartnershipIncomes] = createSignal<PartnershipIncome[]>([]);

  // Estate/Trust Income (Schedule E - Part III)
  const [estateIncomes, setEstateIncomes] = createSignal<EstateIncome[]>([]);

  // Form 1098 - Mortgage Interest Statements
  const [form1098s, setForm1098s] = createSignal<Form1098[]>([]);

  // Form 1098-T - Tuition Statements
  const [form1098Ts, setForm1098Ts] = createSignal<Form1098T[]>([]);

  // Tax Calculation Result
  const [calculationResult, setCalculationResult] = createSignal<TaxCalculationResult | null>(null);
  const [showResults, setShowResults] = createSignal(false);

  // Form Section Visibility (collapsible sections)
  const [showBusinessExpenses, setShowBusinessExpenses] = createSignal(false);
  const [showDeductions, setShowDeductions] = createSignal(false);
  const [showRetirement, setShowRetirement] = createSignal(false);
  const [showRentalProperties, setShowRentalProperties] = createSignal(false);
  const [showPartnerships, setShowPartnerships] = createSignal(false);
  const [showEstates, setShowEstates] = createSignal(false);
  const [showForm1098, setShowForm1098] = createSignal(false);
  const [showForm1098T, setShowForm1098T] = createSignal(false);
  const [showAllSections, setShowAllSections] = createSignal(false);
  const [showDocumentUploader, setShowDocumentUploader] = createSignal(false);

  // Customer Search
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<NotaryCustomer[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [showDropdown, setShowDropdown] = createSignal(false);
  let searchTimeout: number | undefined;

  // Sidebar Navigation
  const [activeSection, setActiveSection] = createSignal('customer-info');
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);

  // Navigation items configuration
  const navItems = [
    { id: 'customer-info', label: 'Cliente', icon: '👤', count: null },
    { id: 'document-upload', label: 'Documentos IA', icon: '📄', count: null },
    { id: 'w2-forms', label: 'W-2', icon: '📋', count: () => w2Forms().length },
    { id: 'form-1099', label: '1099', icon: '📝', count: () => form1099s().length },
    { id: 'business-expenses', label: 'Gastos Negocio', icon: '💼', count: () => businessExpenses().length },
    { id: 'rental-properties', label: 'Alquileres', icon: '🏠', count: () => rentalProperties().length },
    { id: 'partnerships', label: 'Sociedades', icon: '🤝', count: () => partnershipIncomes().length },
    { id: 'estates', label: 'Fideicomisos', icon: '🏛️', count: () => estateIncomes().length },
    { id: 'form-1098', label: '1098 Hipoteca', icon: '🏦', count: () => form1098s().length },
    { id: 'form-1098t', label: '1098-T Educación', icon: '🎓', count: () => form1098Ts().length },
    { id: 'results', label: 'Resultados', icon: '📊', count: null },
  ];

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // localStorage keys
  const STORAGE_KEYS = {
    TAX_YEAR: 'tax-calculator-tax-year',
    CUSTOMER_INFO: 'tax-calculator-customer-info',
    W2_FORMS: 'tax-calculator-w2-forms',
    FORM_1099S: 'tax-calculator-1099s',
    DEDUCTIONS: 'tax-calculator-deductions',
    BUSINESS_EXPENSES: 'tax-calculator-business-expenses',
    RETIREMENT_CONTRIBUTIONS: 'tax-calculator-retirement-contributions',
    RENTAL_PROPERTIES: 'tax-calculator-rental-properties',
    PARTNERSHIP_INCOMES: 'tax-calculator-partnership-incomes',
    ESTATE_INCOMES: 'tax-calculator-estate-incomes',
    FORM_1098S: 'tax-calculator-1098s',
    FORM_1098TS: 'tax-calculator-1098ts',
  };

  // Load data from localStorage on component mount
  const loadFromLocalStorage = () => {
    const savedTaxYear = localStorage.get<2024 | 2025>(STORAGE_KEYS.TAX_YEAR);
    const savedCustomerInfo = localStorage.get<CustomerTaxInfo>(STORAGE_KEYS.CUSTOMER_INFO);
    const savedW2Forms = localStorage.get<W2Form[]>(STORAGE_KEYS.W2_FORMS);
    const savedForm1099s = localStorage.get<Form1099[]>(STORAGE_KEYS.FORM_1099S);
    const savedDeductions = localStorage.get<TaxDeduction[]>(STORAGE_KEYS.DEDUCTIONS);
    const savedBusinessExpenses = localStorage.get<BusinessExpense[]>(STORAGE_KEYS.BUSINESS_EXPENSES);
    const savedRetirementContributions = localStorage.get<RetirementContribution[]>(STORAGE_KEYS.RETIREMENT_CONTRIBUTIONS);
    const savedRentalProperties = localStorage.get<RentalProperty[]>(STORAGE_KEYS.RENTAL_PROPERTIES);
    const savedPartnershipIncomes = localStorage.get<PartnershipIncome[]>(STORAGE_KEYS.PARTNERSHIP_INCOMES);
    const savedEstateIncomes = localStorage.get<EstateIncome[]>(STORAGE_KEYS.ESTATE_INCOMES);
    const savedForm1098s = localStorage.get<Form1098[]>(STORAGE_KEYS.FORM_1098S);
    const savedForm1098Ts = localStorage.get<Form1098T[]>(STORAGE_KEYS.FORM_1098TS);

    if (savedTaxYear && (savedTaxYear === 2024 || savedTaxYear === 2025)) {
      setTaxYear(savedTaxYear);
    }
    if (savedCustomerInfo) {
      setCustomerInfo(savedCustomerInfo);
    }
    if (savedW2Forms && savedW2Forms.length > 0) {
      setW2Forms(savedW2Forms);
    }
    if (savedForm1099s && savedForm1099s.length > 0) {
      setForm1099s(savedForm1099s);
    }
    if (savedDeductions && savedDeductions.length > 0) {
      setDeductions(savedDeductions);
    }
    if (savedBusinessExpenses && savedBusinessExpenses.length > 0) {
      setBusinessExpenses(savedBusinessExpenses);
    }
    if (savedRetirementContributions && savedRetirementContributions.length > 0) {
      setRetirementContributions(savedRetirementContributions);
    }
    if (savedRentalProperties && savedRentalProperties.length > 0) {
      setRentalProperties(savedRentalProperties);
    }
    if (savedPartnershipIncomes && savedPartnershipIncomes.length > 0) {
      setPartnershipIncomes(savedPartnershipIncomes);
    }
    if (savedEstateIncomes && savedEstateIncomes.length > 0) {
      setEstateIncomes(savedEstateIncomes);
    }
    if (savedForm1098s && savedForm1098s.length > 0) {
      setForm1098s(savedForm1098s);
    }
    if (savedForm1098Ts && savedForm1098Ts.length > 0) {
      setForm1098Ts(savedForm1098Ts);
    }

    // Auto-expand sections that have data
    if (savedBusinessExpenses && savedBusinessExpenses.length > 0) {
      setShowBusinessExpenses(true);
    }
    if (savedRetirementContributions && savedRetirementContributions.length > 0) {
      setShowRetirement(true);
    }
    if (savedRentalProperties && savedRentalProperties.length > 0) {
      setShowRentalProperties(true);
    }
    if (savedPartnershipIncomes && savedPartnershipIncomes.length > 0) {
      setShowPartnerships(true);
    }
    if (savedEstateIncomes && savedEstateIncomes.length > 0) {
      setShowEstates(true);
    }
    if (savedForm1098s && savedForm1098s.length > 0) {
      setShowForm1098(true);
    }
    if (savedForm1098Ts && savedForm1098Ts.length > 0) {
      setShowForm1098T(true);
    }
  };

  // Load data on component mount
  loadFromLocalStorage();

  // Save tax year to localStorage whenever it changes
  createEffect(on(taxYear, (year) => {
    localStorage.set(STORAGE_KEYS.TAX_YEAR, year);
  }, { defer: true }));

  // Save customer info to localStorage whenever it changes
  createEffect(on(customerInfo, (info) => {
    localStorage.set(STORAGE_KEYS.CUSTOMER_INFO, info);
  }, { defer: true }));

  // Save W2 forms to localStorage whenever they change
  createEffect(on(w2Forms, (forms) => {
    localStorage.set(STORAGE_KEYS.W2_FORMS, forms);
  }, { defer: true }));

  // Save 1099 forms to localStorage whenever they change
  createEffect(on(form1099s, (forms) => {
    localStorage.set(STORAGE_KEYS.FORM_1099S, forms);
  }, { defer: true }));

  // Save deductions to localStorage whenever they change
  createEffect(on(deductions, (deds) => {
    localStorage.set(STORAGE_KEYS.DEDUCTIONS, deds);
  }, { defer: true }));

  // Save business expenses to localStorage whenever they change
  createEffect(on(businessExpenses, (expenses) => {
    localStorage.set(STORAGE_KEYS.BUSINESS_EXPENSES, expenses);
  }, { defer: true }));

  // Save retirement contributions to localStorage whenever they change
  createEffect(on(retirementContributions, (contributions) => {
    localStorage.set(STORAGE_KEYS.RETIREMENT_CONTRIBUTIONS, contributions);
  }, { defer: true }));

  // Save rental properties to localStorage whenever they change
  createEffect(on(rentalProperties, (properties) => {
    localStorage.set(STORAGE_KEYS.RENTAL_PROPERTIES, properties);
  }, { defer: true }));

  // Save partnership incomes to localStorage whenever they change
  createEffect(on(partnershipIncomes, (partnerships) => {
    localStorage.set(STORAGE_KEYS.PARTNERSHIP_INCOMES, partnerships);
  }, { defer: true }));

  // Save estate incomes to localStorage whenever they change
  createEffect(on(estateIncomes, (estates) => {
    localStorage.set(STORAGE_KEYS.ESTATE_INCOMES, estates);
  }, { defer: true }));

  // Save Form 1098s to localStorage whenever they change
  createEffect(on(form1098s, (forms) => {
    localStorage.set(STORAGE_KEYS.FORM_1098S, forms);
  }, { defer: true }));

  // Save Form 1098-Ts to localStorage whenever they change
  createEffect(on(form1098Ts, (forms) => {
    localStorage.set(STORAGE_KEYS.FORM_1098TS, forms);
  }, { defer: true }));

  // Debounced customer search
  const handleCustomerSearch = async (query: string) => {
    setSearchQuery(query);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await inventoryApi.searchClientNotary(query);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (error) {
        devLog('Error searching customers:', error);
        setSearchResults([]);
        showToast('Error al buscar clientes', 'error');
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Fetch and populate customer data
  const handleSelectCustomer = async (customer: NotaryCustomer) => {
    devLog('Selected customer:', customer);

    const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    setSearchQuery(customerName);
    setShowDropdown(false);

    try {
      // Fetch full customer details
      const fullCustomer = customer;
      devLog('Full customer data:', fullCustomer);

      // Extract most recent residence
      let address = '';
      let city = '';
      let state = '';
      let zipCode = '';

      if (fullCustomer.residences) {
        const residences = Object.values(fullCustomer.residences);
        if (residences.length > 0) {
          // Get the most recent residence (last entry)
          const recentResidence = residences[residences.length - 1];
          address = recentResidence.addressLineOne || '';
          city = recentResidence.city || '';
          state = recentResidence.state || '';
          zipCode = recentResidence.zipcode || '';
        }
      }

      // Populate customer info
      setCustomerInfo({
        firstName: fullCustomer.firstName || '',
        lastName: fullCustomer.lastName || '',
        ssn: fullCustomer.ss || '',
        filingStatus: 'single', // Default - user can change
        dependents: 0, // Default - user can change
        address: address,
        city: city,
        state: state,
        zipCode: zipCode
      });

      showToast(`Cliente ${customerName} cargado exitosamente`, 'success');
    } catch (error) {
      devLog('Error fetching customer details:', error);
      showToast('Error al cargar los detalles del cliente', 'error');
    }
  };

  const clearCustomerSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Add W-2 Form from document uploader
  const addW2FromUploader = (w2: W2Form) => {
    setW2Forms([...w2Forms(), w2]);
    showToast('W-2 agregado desde documento escaneado', 'success');
  };

  // Add 1099 Form from document uploader
  const add1099FromUploader = (form1099: Form1099) => {
    setForm1099s([...form1099s(), form1099]);
    showToast('1099 agregado desde documento escaneado', 'success');
  };

  // Add 1098 Form from document uploader
  const add1098FromUploader = (form1098: Form1098) => {
    setForm1098s([...form1098s(), form1098]);
    setShowForm1098(true);
    showToast('1098 agregado desde documento escaneado', 'success');
  };

  // Add 1098-T Form from document uploader
  const add1098TFromUploader = (form1098T: Form1098T) => {
    setForm1098Ts([...form1098Ts(), form1098T]);
    setShowForm1098T(true);
    showToast('1098-T agregado desde documento escaneado', 'success');
  };

  // Add W-2 Form
  const addW2Form = () => {
    const newW2: W2Form = {
      id: generateRandomId(),
      employer: '',
      ein: '',
      wages: 0,
      federalTaxWithheld: 0,
      socialSecurityWages: 0,
      socialSecurityTaxWithheld: 0,
      medicareWages: 0,
      medicareTaxWithheld: 0,
      stateTaxWithheld: 0
    };
    setW2Forms([...w2Forms(), newW2]);
    showToast('W-2 form agregado', 'success');
  };

  // Update W-2 Form
  const updateW2Form = (id: string, updates: Partial<W2Form>) => {
    setW2Forms(w2Forms().map(w2 => w2.id === id ? { ...w2, ...updates } : w2));
  };

  // Remove W-2 Form
  const removeW2Form = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar este formulario W-2?')) {
      setW2Forms(w2Forms().filter(w2 => w2.id !== id));
      showToast('W-2 form eliminado', 'info');
    }
  };

  // Add 1099 Form
  const add1099Form = () => {
    const new1099: Form1099 = {
      id: generateRandomId(),
      payer: '',
      payerTIN: '',
      type: '1099-MISC',
      amount: 0,
      federalTaxWithheld: 0,
      description: ''
    };
    setForm1099s([...form1099s(), new1099]);
    showToast('Formulario 1099 agregado', 'success');
  };

  // Update 1099 Form
  const update1099Form = (id: string, updates: Partial<Form1099>) => {
    setForm1099s(form1099s().map(form => form.id === id ? { ...form, ...updates } : form));
  };

  // Remove 1099 Form
  const remove1099Form = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar este formulario 1099?')) {
      setForm1099s(form1099s().filter(form => form.id !== id));
      showToast('Formulario 1099 eliminado', 'info');
    }
  };

  // Add Business Expense
  const addBusinessExpense = () => {
    const newExpense: BusinessExpense = {
      id: generateRandomId(),
      category: 'other',
      description: '',
      amount: 0
    };
    setBusinessExpenses([...businessExpenses(), newExpense]);
    showToast('Gasto de negocio agregado', 'success');
  };

  // Update Business Expense
  const updateBusinessExpense = (id: string, updates: Partial<BusinessExpense>) => {
    setBusinessExpenses(businessExpenses().map(exp => exp.id === id ? { ...exp, ...updates } : exp));
  };

  // Remove Business Expense
  const removeBusinessExpense = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar este gasto?')) {
      setBusinessExpenses(businessExpenses().filter(exp => exp.id !== id));
      showToast('Gasto eliminado', 'info');
    }
  };

  // Add Retirement Contribution
  const addRetirementContribution = () => {
    const newContribution: RetirementContribution = {
      id: generateRandomId(),
      type: 'traditional_ira',
      amount: 0,
      description: ''
    };
    setRetirementContributions([...retirementContributions(), newContribution]);
    showToast('Contribución de retiro agregada', 'success');
  };

  // Update Retirement Contribution
  const updateRetirementContribution = (id: string, updates: Partial<RetirementContribution>) => {
    setRetirementContributions(retirementContributions().map(rc => rc.id === id ? { ...rc, ...updates } : rc));
  };

  // Remove Retirement Contribution
  const removeRetirementContribution = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar esta contribución?')) {
      setRetirementContributions(retirementContributions().filter(rc => rc.id !== id));
      showToast('Contribución eliminada', 'info');
    }
  };

  // Add Rental Property
  const addRentalProperty = () => {
    const newProperty: RentalProperty = {
      id: generateRandomId(),
      address: '',
      type: 'Single Family',
      daysRented: 0,
      daysPersonalUse: 0,
      fairRentalDays: 365,
      rentsReceived: 0,
      royaltiesReceived: 0,
      advertising: 0,
      auto: 0,
      cleaning: 0,
      commissions: 0,
      insurance: 0,
      legal: 0,
      management: 0,
      mortgageInterest: 0,
      otherInterest: 0,
      repairs: 0,
      supplies: 0,
      taxes: 0,
      utilities: 0,
      depreciation: 0,
      otherExpenses: 0
    };
    setRentalProperties([...rentalProperties(), newProperty]);
    showToast('Propiedad de renta agregada', 'success');
  };

  // Update Rental Property
  const updateRentalProperty = (id: string, updates: Partial<RentalProperty>) => {
    setRentalProperties(rentalProperties().map(rp => rp.id === id ? { ...rp, ...updates } : rp));
  };

  // Remove Rental Property
  const removeRentalProperty = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar esta propiedad?')) {
      setRentalProperties(rentalProperties().filter(rp => rp.id !== id));
      showToast('Propiedad eliminada', 'info');
    }
  };

  // Add Partnership Income
  const addPartnershipIncome = () => {
    const newPartnership: PartnershipIncome = {
      id: generateRandomId(),
      name: '',
      ein: '',
      isPassive: false,
      ordinaryIncome: 0,
      description: ''
    };
    setPartnershipIncomes([...partnershipIncomes(), newPartnership]);
    showToast('Ingreso de sociedad agregado', 'success');
  };

  // Update Partnership Income
  const updatePartnershipIncome = (id: string, updates: Partial<PartnershipIncome>) => {
    setPartnershipIncomes(partnershipIncomes().map(pi => pi.id === id ? { ...pi, ...updates } : pi));
  };

  // Remove Partnership Income
  const removePartnershipIncome = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar este ingreso de sociedad?')) {
      setPartnershipIncomes(partnershipIncomes().filter(pi => pi.id !== id));
      showToast('Ingreso de sociedad eliminado', 'info');
    }
  };

  // Add Estate Income
  const addEstateIncome = () => {
    const newEstate: EstateIncome = {
      id: generateRandomId(),
      name: '',
      ein: '',
      isPassive: false,
      ordinaryIncome: 0,
      description: ''
    };
    setEstateIncomes([...estateIncomes(), newEstate]);
    showToast('Ingreso de fideicomiso agregado', 'success');
  };

  // Update Estate Income
  const updateEstateIncome = (id: string, updates: Partial<EstateIncome>) => {
    setEstateIncomes(estateIncomes().map(ei => ei.id === id ? { ...ei, ...updates } : ei));
  };

  // Remove Estate Income
  const removeEstateIncome = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar este ingreso de fideicomiso?')) {
      setEstateIncomes(estateIncomes().filter(ei => ei.id !== id));
      showToast('Ingreso de fideicomiso eliminado', 'info');
    }
  };

  // Add Form 1098
  const add1098 = () => {
    const new1098: Form1098 = {
      id: generateRandomId(),
      lender: '',
      lenderTIN: '',
      mortgageInterest: 0,
      outstandingPrincipal: 0,
      mortgageOriginationDate: '',
      refundOfOverpaidInterest: 0,
      mortgageInsurancePremiums: 0,
      pointsPaid: 0,
      propertyAddress: '',
      propertyTaxes: 0,
      isMainHome: true,
      description: ''
    };
    setForm1098s([...form1098s(), new1098]);
    showToast('Form 1098 agregado', 'success');
  };

  const update1098 = (id: string, updates: Partial<Form1098>) => {
    setForm1098s(form1098s().map(form => form.id === id ? { ...form, ...updates } : form));
  };

  const remove1098 = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar este Form 1098?')) {
      setForm1098s(form1098s().filter(form => form.id !== id));
      showToast('Form 1098 eliminado', 'info');
    }
  };

  // Add Form 1098-T
  const add1098T = () => {
    const new1098T: Form1098T = {
      id: generateRandomId(),
      institution: '',
      institutionEIN: '',
      studentSSN: '',
      studentName: '',
      qualifiedExpenses: 0,
      adjustmentsPriorYear: 0,
      scholarshipsGrants: 0,
      adjustmentsForPriorYearScholarships: 0,
      isAtLeastHalfTime: false,
      isGraduateStudent: false,
      academicPeriod: '',
      includesAmountsForNextYear: false,
      description: ''
    };
    setForm1098Ts([...form1098Ts(), new1098T]);
    showToast('Form 1098-T agregado', 'success');
  };

  const update1098T = (id: string, updates: Partial<Form1098T>) => {
    setForm1098Ts(form1098Ts().map(form => form.id === id ? { ...form, ...updates } : form));
  };

  const remove1098T = (id: string) => {
    if (confirm('¿Está seguro que desea eliminar este Form 1098-T?')) {
      setForm1098Ts(form1098Ts().filter(form => form.id !== id));
      showToast('Form 1098-T eliminado', 'info');
    }
  };

  // Calculate Tax Return
  const calculateTaxReturn = () => {
    devLog('🔍 Starting tax calculation...');

    // Validate customer info
    const customer = customerInfo();
    devLog('Customer info:', customer);

    if (!customer.firstName || !customer.lastName || !customer.ssn) {
      showToast('Por favor complete la información del cliente', 'warning');
      return;
    }

    // Validate at least one income source
    devLog('W2 Forms:', w2Forms());
    devLog('1099 Forms:', form1099s());

    if (w2Forms().length === 0 && form1099s().length === 0) {
      showToast('Por favor agregue al menos un formulario W-2 o 1099', 'warning');
      return;
    }

    const formData: TaxFormData = {
      taxYear: taxYear(),
      customerInfo: customer,
      w2Forms: w2Forms(),
      form1099s: form1099s(),
      deductions: deductions(),
      businessExpenses: businessExpenses(),
      retirementContributions: retirementContributions(),
      rentalProperties: rentalProperties(),
      partnershipIncomes: partnershipIncomes(),
      estateIncomes: estateIncomes(),
      form1098s: form1098s(),
      form1098Ts: form1098Ts()
    };

    devLog('Form data for calculation:', formData);

    try {
      const result = taxCalculationService.calculateTaxReturn(formData);
      devLog('Calculation result:', result);

      setCalculationResult(result);
      setShowResults(true);
      showToast('Cálculo de impuestos completado', 'success');
    } catch (error) {
      devLog('Error calculating taxes:', error);
      showToast('Error al calcular impuestos: ' + (error as Error).message, 'error');
    }
  };

  // Clear Form
  const clearForm = () => {
    if (confirm('¿Está seguro que desea limpiar todos los datos?')) {
      setCustomerInfo({
        firstName: '',
        lastName: '',
        ssn: '',
        filingStatus: 'single',
        dependents: 0,
        address: '',
        city: '',
        state: '',
        zipCode: '',
        age: undefined,
        isFullTimeStudent: false,
        isClaimedAsDependent: false
      });
      setW2Forms([]);
      setForm1099s([]);
      setDeductions([]);
      setBusinessExpenses([]);
      setRetirementContributions([]);
      setRentalProperties([]);
      setPartnershipIncomes([]);
      setEstateIncomes([]);
      setForm1098s([]);
      setForm1098Ts([]);
      setCalculationResult(null);
      setShowResults(false);
      clearCustomerSearch();

      // Clear localStorage
      Object.values(STORAGE_KEYS).forEach(key => localStorage.remove(key));

      showToast('Formulario limpiado', 'info');
    }
  };

  // Toggle all optional sections
  const toggleAllSections = () => {
    const newState = !showAllSections();
    setShowAllSections(newState);
    setShowBusinessExpenses(newState);
    setShowRetirement(newState);
    setShowRentalProperties(newState);
    setShowPartnerships(newState);
    setShowEstates(newState);
    setShowForm1098(newState);
    setShowForm1098T(newState);
  };

  // Styles
  const containerStyle = {
    'max-width': '1400px',
    margin: '0 auto',
    padding: '2rem',
    'font-family': 'system-ui, sans-serif'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    'border-radius': 'var(--border-radius)',
    'box-shadow': '0 4px 12px rgba(102, 126, 234, 0.3)'
  };

  const titleStyle = {
    'font-size': '2rem',
    'font-weight': 'bold',
    margin: '0 0 0.5rem 0'
  };

  const sectionStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const formGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const formGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)'
  };

  const inputStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)',
    width: '100%'
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-weight': '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: '#667eea',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#10b981',
    color: 'white'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    background: '#ef4444',
    color: 'white'
  };

  const cardStyle = {
    background: '#f9fafb',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1rem',
    'margin-bottom': '1rem'
  };

  // Sidebar Styles
  const sidebarStyle = {
    position: 'fixed' as const,
    left: sidebarCollapsed() ? '-200px' : '0',
    top: '0',
    bottom: '0',
    width: '220px',
    background: 'linear-gradient(180deg, #1e3a5f 0%, #2d4a6f 100%)',
    'box-shadow': '4px 0 15px rgba(0, 0, 0, 0.15)',
    'z-index': 1000,
    transition: 'left 0.3s ease',
    display: 'flex',
    'flex-direction': 'column' as const,
    'overflow-y': 'auto' as const
  };

  const sidebarHeaderStyle = {
    padding: '1.25rem 1rem',
    'border-bottom': '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    background: 'rgba(0, 0, 0, 0.1)'
  };

  const sidebarNavStyle = {
    padding: '0.75rem 0',
    flex: '1'
  };

  const navItemStyle = (isActive: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.75)',
    background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
    'border-left': isActive ? '3px solid #60a5fa' : '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    'font-size': '0.875rem',
    'font-weight': isActive ? '600' : '400'
  });

  const navItemCountStyle = {
    'margin-left': 'auto',
    background: 'rgba(255, 255, 255, 0.2)',
    'border-radius': '10px',
    padding: '0.125rem 0.5rem',
    'font-size': '0.75rem',
    'min-width': '20px',
    'text-align': 'center' as const
  };

  const toggleButtonStyle = {
    position: 'fixed' as const,
    left: sidebarCollapsed() ? '10px' : '230px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: '#1e3a5f',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.2)',
    'z-index': 1001,
    transition: 'left 0.3s ease'
  };

  const mainContentStyle = {
    'margin-left': sidebarCollapsed() ? '0' : '220px',
    transition: 'margin-left 0.3s ease',
    'min-height': '100vh'
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Sidebar Navigation */}
      <aside style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ 'font-size': '1.25rem' }}>📊</span>
            <span style={{ color: 'white', 'font-weight': '600', 'font-size': '0.9rem' }}>Tax Calculator</span>
          </div>
        </div>
        <nav style={sidebarNavStyle}>
          <For each={navItems}>
            {(item) => {
              const count = item.count ? item.count() : null;
              return (
                <div
                  style={navItemStyle(activeSection() === item.id)}
                  onClick={() => scrollToSection(item.id)}
                  onMouseEnter={(e) => {
                    if (activeSection() !== item.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection() !== item.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ 'font-size': '1.1rem' }}>{item.icon}</span>
                  <span>{item.label}</span>
                  <Show when={count !== null && count > 0}>
                    <span style={navItemCountStyle}>{count}</span>
                  </Show>
                </div>
              );
            }}
          </For>
        </nav>
        {/* Quick Stats at bottom */}
        <div style={{
          padding: '1rem',
          'border-top': '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 'font-size': '0.75rem', color: 'rgba(255, 255, 255, 0.6)', 'margin-bottom': '0.5rem' }}>
            Resumen Rápido
          </div>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem', 'font-size': '0.8rem', color: 'white' }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
              <span>W-2s:</span>
              <span style={{ 'font-weight': '600' }}>{w2Forms().length}</span>
            </div>
            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
              <span>1099s:</span>
              <span style={{ 'font-weight': '600' }}>{form1099s().length}</span>
            </div>
            <Show when={calculationResult()}>
              <div style={{
                'margin-top': '0.5rem',
                'padding-top': '0.5rem',
                'border-top': '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                'justify-content': 'space-between'
              }}>
                <span>Total:</span>
                <span style={{
                  'font-weight': '700',
                  color: calculationResult()!.refundAmount > 0 ? '#4ade80' : '#f87171'
                }}>
                  ${Math.abs(calculationResult()!.refundAmount > 0 ? calculationResult()!.refundAmount : calculationResult()!.taxDue).toLocaleString()}
                </span>
              </div>
            </Show>
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        style={toggleButtonStyle}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed())}
        title={sidebarCollapsed() ? 'Mostrar menú' : 'Ocultar menú'}
      >
        {sidebarCollapsed() ? '→' : '←'}
      </button>

      {/* Main Content */}
      <div style={mainContentStyle}>
        <div style={containerStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <h1 style={titleStyle}>
              <Icon name="finance" size="1.5em" />
              Calculadora de Declaración de Impuestos
            </h1>
            <p style={{ margin: '0', opacity: '0.9' }}>
              Calcule su devolución o deuda de impuestos federales {taxYear()}
            </p>
          </div>

      {/* Tax Year Selection */}
      <div style={{
        ...sectionStyle,
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        color: 'white',
        'margin-bottom': '1.5rem'
      }}>
        <h2 style={{ ...sectionTitleStyle, color: 'white', 'margin-bottom': '1rem' }}>
          📅 Año Fiscal
        </h2>
        <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
          <For each={[2024, 2025] as const}>
            {(year) => (
              <button
                onClick={() => setTaxYear(year)}
                style={{
                  padding: '1rem 2rem',
                  'font-size': '1.25rem',
                  'font-weight': '700',
                  border: taxYear() === year ? '3px solid white' : '2px solid rgba(255,255,255,0.5)',
                  'border-radius': 'var(--border-radius-md)',
                  background: taxYear() === year ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  'min-width': '120px'
                }}
              >
                {year}
                <Show when={taxYear() === year}>
                  <span style={{ 'margin-left': '0.5rem' }}>✓</span>
                </Show>
              </button>
            )}
          </For>
        </div>
        <p style={{ 'margin-top': '0.75rem', 'font-size': '0.875rem', opacity: 0.9 }}>
          Seleccione el año fiscal para calcular sus impuestos con las tasas y deducciones correctas.
        </p>
      </div>

      {/* Customer Information Section */}
      <div id="customer-info" style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <Icon name="customer" size="1.2em" />
          Información del Cliente
        </h2>

        {/* Customer Search */}
        <div style={{ 'margin-bottom': '1.5rem', padding: '1rem', background: '#f0f9ff', 'border-radius': 'var(--border-radius-sm)', border: '1px solid #bfdbfe' }}>
          <label style={{ ...labelStyle, 'margin-bottom': '0.5rem', display: 'block', color: '#1e40af', 'font-weight': '600' }}>
            🔍 Buscar Cliente Existente
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery()}
              onInput={(e) => handleCustomerSearch(e.currentTarget.value)}
              onFocus={() => {
                if (searchResults().length > 0) {
                  setShowDropdown(true);
                }
              }}
              style={{
                ...inputStyle,
                'padding-right': '2.5rem',
                border: '2px solid #3b82f6'
              }}
              placeholder="Buscar por nombre, apellido o SSN..."
            />

            {/* Loading indicator */}
            <Show when={isSearching()}>
              <div style={{
                position: 'absolute',
                right: searchQuery().length > 0 ? '3rem' : '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280'
              }}>
                🔄
              </div>
            </Show>

            {/* Clear button */}
            <Show when={searchQuery().length > 0}>
              <button
                onClick={clearCustomerSearch}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  'font-size': '1.25rem',
                  color: '#6b7280',
                  padding: '0.25rem'
                }}
                type="button"
              >
                ✕
              </button>
            </Show>

            {/* Dropdown Results */}
            <Show when={showDropdown() && searchResults().length > 0}>
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                right: '0',
                'margin-top': '0.25rem',
                background: 'white',
                border: '2px solid #3b82f6',
                'border-radius': 'var(--border-radius-sm)',
                'max-height': '300px',
                'overflow-y': 'auto',
                'box-shadow': '0 4px 12px rgba(59, 130, 246, 0.2)',
                'z-index': 1000
              }}>
                <For each={searchResults()}>
                  {(customer) => (
                    <div
                      onClick={() => handleSelectCustomer(customer)}
                      style={{
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        'border-bottom': '1px solid #e5e7eb',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div style={{ 'font-size': '0.875rem', color: '#6b7280' }}>
                        {customer.email && `${customer.email}`}
                        {customer.phoneNumber && ` • ${customer.phoneNumber}`}
                        {customer.ss && ` • SSN: ${customer.ss.substring(0, 3)}-**-****`}
                      </div>
                      <div style={{ 'font-size': '0.75rem', color: '#9ca3af', 'margin-top': '0.25rem' }}>
                        ID: {customer.clientNotaryId}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* No results message */}
            <Show when={showDropdown() && searchResults().length === 0 && searchQuery().length >= 2 && !isSearching()}>
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                right: '0',
                'margin-top': '0.25rem',
                background: 'white',
                border: '2px solid #3b82f6',
                'border-radius': 'var(--border-radius-sm)',
                'box-shadow': '0 4px 12px rgba(59, 130, 246, 0.2)',
                'z-index': 1000
              }}>
                <div style={{ padding: '1rem', 'text-align': 'center', color: '#6b7280' }}>
                  No se encontraron clientes con "{searchQuery()}"
                </div>
              </div>
            </Show>
          </div>
          <p style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-top': '0.5rem', 'margin-bottom': '0' }}>
            💡 Busque un cliente existente para cargar automáticamente su información, o complete manualmente los campos a continuación.
          </p>
        </div>

        <div style={formGridStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Nombre *</label>
            <FormInput
              type="text"
              style={inputStyle}
              value={customerInfo().firstName}
              onChange={(e) => setCustomerInfo({ ...customerInfo(), firstName: e })}
              placeholder="Ej: Juan"
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Apellido *</label>
            <FormInput
              type="text"
              style={inputStyle}
              value={customerInfo().lastName}
             onChange={(e) => setCustomerInfo({ ...customerInfo(), lastName: e })}
              placeholder="Ej: Pérez"
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>SSN / ITIN *</label>
            <FormInput
              type="text"
              style={inputStyle}
              value={customerInfo().ssn}
             onChange={(e) => setCustomerInfo({ ...customerInfo(), ssn: e })}
              placeholder="###-##-####"
              maxLength={11}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Estado Civil *</label>
            <select
              style={inputStyle}
              value={customerInfo().filingStatus}
              onChange={(e) => {
                setCustomerInfo({ ...customerInfo(), filingStatus: e.target.value as FilingStatus })}}
            >
              <option value="single">Soltero(a)</option>
              <option value="married_joint">Casado(a) - Declaración Conjunta</option>
              <option value="married_separate">Casado(a) - Declaración Separada</option>
              <option value="head_of_household">Jefe de Familia</option>
            </select>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Número de Dependientes</label>
            <FormInput
              type="number"
              style={inputStyle}
              value={customerInfo().dependents}
             onChange={(e) => setCustomerInfo({ ...customerInfo(), dependents: parseInt(e) || 0 })}
              min="0"
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Dirección</label>
            <FormInput
              type="text"
              style={inputStyle}
              value={customerInfo().address}
             onChange={(e) => setCustomerInfo({ ...customerInfo(), address: e })}
              placeholder="Calle y número"
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Ciudad</label>
            <FormInput
              type="text"
              style={inputStyle}
              value={customerInfo().city}
             onChange={(e) => setCustomerInfo({ ...customerInfo(), city: e })}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Estado</label>
            <FormInput
              type="text"
              style={inputStyle}
              value={customerInfo().state}
             onChange={(e) => setCustomerInfo({ ...customerInfo(), state: e })}
              maxLength={2}
              placeholder="Ej: FL"
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Código Postal</label>
            <FormInput
              type="text"
              style={inputStyle}
              value={customerInfo().zipCode}
             onChange={(e) => setCustomerInfo({ ...customerInfo(), zipCode: e })}
              maxLength={5}
            />
          </div>
        </div>

        {/* Additional Info for Form 8880 */}
        <div style={{ 'margin-top': '1.5rem', padding: '1rem', background: '#fef3c7', 'border-radius': 'var(--border-radius-sm)', border: '1px solid #fbbf24' }}>
          <h3 style={{ 'font-size': '1rem', 'font-weight': '600', color: '#92400e', 'margin-bottom': '1rem' }}>
            ℹ️ Información Adicional (para Crédito de Ahorro de Retiro - Form 8880)
          </h3>
          <div style={formGridStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Edad</label>
              <FormInput
                type="number"
                style={inputStyle}
                value={customerInfo().age || ''}
               onChange={(e) => setCustomerInfo({ ...customerInfo(), age: parseInt(e) || undefined })}
                min="0"
                max="120"
                placeholder="Años"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>¿Estudiante de Tiempo Completo?</label>
              <select
                style={inputStyle}
                value={customerInfo().isFullTimeStudent ? 'yes' : 'no'}
                onChange={(e) => setCustomerInfo({ ...customerInfo(), isFullTimeStudent: e.target.value === 'yes' })}
              >
                <option value="no">No</option>
                <option value="yes">Sí</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>¿Reclamado como Dependiente?</label>
              <select
                style={inputStyle}
                value={customerInfo().isClaimedAsDependent ? 'yes' : 'no'}
                onChange={(e) => setCustomerInfo({ ...customerInfo(), isClaimedAsDependent: e.target.value === 'yes' })}
              >
                <option value="no">No</option>
                <option value="yes">Sí</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Setup Panel - Form Visibility Controls */}
      <div style={{
        ...sectionStyle,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.5rem',
        'border-radius': 'var(--border-radius-lg)',
        'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem',
          'flex-wrap': 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{
              margin: '0 0 0.5rem 0',
              'font-size': '1.5rem',
              'font-weight': '700',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <Icon name="settings" size="1.3em" />
              Configuración Rápida
            </h2>
            <p style={{
              margin: '0',
              opacity: '0.9',
              'font-size': '0.9rem'
            }}>
              Selecciona los formularios que necesitas completar
            </p>
          </div>
          <button
            style={{
              ...buttonStyle,
              background: showAllSections() ? '#10b981' : 'white',
              color: showAllSections() ? 'white' : '#667eea',
              padding: '0.75rem 1.5rem',
              'font-weight': '600',
              'font-size': '0.95rem',
              border: showAllSections() ? '2px solid #10b981' : '2px solid white',
              'box-shadow': '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onClick={toggleAllSections}
          >
            <Icon name={showAllSections() ? "eye-off" : "eye"} size="1em" />
            {showAllSections() ? 'Ocultar Todos' : 'Mostrar Todos'}
          </button>
        </div>

        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          {/* Business Expenses Toggle */}
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="checkbox"
              checked={showBusinessExpenses()}
              onChange={(e) => setShowBusinessExpenses(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
              <Icon name="operations" size="1.1em" />
              <span style={{ 'font-weight': '500' }}>Gastos de Negocio</span>
            </div>
            <Show when={businessExpenses().length > 0}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                'border-radius': '12px',
                'font-size': '0.75rem',
                'font-weight': '600'
              }}>
                {businessExpenses().length}
              </span>
            </Show>
          </label>

          {/* Retirement Contributions Toggle */}
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="checkbox"
              checked={showRetirement()}
              onChange={(e) => setShowRetirement(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
              <Icon name="currency" size="1.1em" />
              <span style={{ 'font-weight': '500' }}>Contribuciones de Retiro</span>
            </div>
            <Show when={retirementContributions().length > 0}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                'border-radius': '12px',
                'font-size': '0.75rem',
                'font-weight': '600'
              }}>
                {retirementContributions().length}
              </span>
            </Show>
          </label>

          {/* Rental Properties Toggle */}
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="checkbox"
              checked={showRentalProperties()}
              onChange={(e) => setShowRentalProperties(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
              <Icon name="home" size="1.1em" />
              <span style={{ 'font-weight': '500' }}>Propiedades de Alquiler</span>
            </div>
            <Show when={rentalProperties().length > 0}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                'border-radius': '12px',
                'font-size': '0.75rem',
                'font-weight': '600'
              }}>
                {rentalProperties().length}
              </span>
            </Show>
          </label>

          {/* Partnerships Toggle */}
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="checkbox"
              checked={showPartnerships()}
              onChange={(e) => setShowPartnerships(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
              <Icon name="users" size="1.1em" />
              <span style={{ 'font-weight': '500' }}>Sociedades/S Corp</span>
            </div>
            <Show when={partnershipIncomes().length > 0}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                'border-radius': '12px',
                'font-size': '0.75rem',
                'font-weight': '600'
              }}>
                {partnershipIncomes().length}
              </span>
            </Show>
          </label>

          {/* Estates Toggle */}
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="checkbox"
              checked={showEstates()}
              onChange={(e) => setShowEstates(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
              <Icon name="law" size="1.1em" />
              <span style={{ 'font-weight': '500' }}>Fideicomisos/Herencias</span>
            </div>
            <Show when={estateIncomes().length > 0}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                'border-radius': '12px',
                'font-size': '0.75rem',
                'font-weight': '600'
              }}>
                {estateIncomes().length}
              </span>
            </Show>
          </label>

          {/* Form 1098 Toggle */}
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="checkbox"
              checked={showForm1098()}
              onChange={(e) => setShowForm1098(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
              <Icon name="percent" size="1.1em" />
              <span style={{ 'font-weight': '500' }}>Form 1098 (Hipoteca)</span>
            </div>
            <Show when={form1098s().length > 0}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                'border-radius': '12px',
                'font-size': '0.75rem',
                'font-weight': '600'
              }}>
                {form1098s().length}
              </span>
            </Show>
          </label>

          {/* Form 1098-T Toggle */}
          <label style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="checkbox"
              checked={showForm1098T()}
              onChange={(e) => setShowForm1098T(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1' }}>
              <Icon name="education" size="1.1em" />
              <span style={{ 'font-weight': '500' }}>Form 1098-T (Educación)</span>
            </div>
            <Show when={form1098Ts().length > 0}>
              <span style={{
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.5rem',
                'border-radius': '12px',
                'font-size': '0.75rem',
                'font-weight': '600'
              }}>
                {form1098Ts().length}
              </span>
            </Show>
          </label>
        </div>

        {/* Helper Text */}
        <div style={{
          'margin-top': '1rem',
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.15)',
          'border-radius': 'var(--border-radius-sm)',
          'font-size': '0.85rem',
          opacity: '0.95'
        }}>
          <Icon name="info" size="0.9em" style={{ 'margin-right': '0.5rem' }} />
          Las secciones con datos guardados se mostrarán automáticamente. W-2 y 1099 siempre están visibles.
        </div>
      </div>

      {/* Document Upload Section */}
      <div id="document-upload" style={sectionStyle}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
          <h2 style={{ ...sectionTitleStyle, margin: '0' }}>
            <Icon name="upload" size="1.2em" />
            Cargar Documentos con IA
          </h2>
          <button
            style={{
              ...secondaryButtonStyle,
              background: showDocumentUploader() ? 'var(--primary-color)' : undefined,
              color: showDocumentUploader() ? 'white' : undefined
            }}
            onClick={() => setShowDocumentUploader(!showDocumentUploader())}
          >
            <Icon name={showDocumentUploader() ? "visibility_off" : "upload"} size="1em" />
            {showDocumentUploader() ? 'Ocultar Cargador' : 'Escanear Formularios'}
          </button>
        </div>

        <Show when={!showDocumentUploader()}>
          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            'border-radius': 'var(--border-radius)',
            border: '1px dashed #0ea5e9',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>🤖</div>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#0369a1' }}>
              Escaneo Inteligente de Formularios
            </div>
            <div style={{ 'font-size': '0.875rem', color: '#64748b' }}>
              Sube tus formularios W-2, 1099, 1098, o 1098-T y la IA extraerá automáticamente los datos.
            </div>
          </div>
        </Show>

        <Show when={showDocumentUploader()}>
          <TaxDocumentUploader
            onW2Added={addW2FromUploader}
            onForm1099Added={add1099FromUploader}
            onForm1098Added={add1098FromUploader}
            onForm1098TAdded={add1098TFromUploader}
            onDocumentProcessed={(data) => {
              devLog('Document processed:', data);
            }}
          />
        </Show>
      </div>

      {/* W-2 Forms Section */}
      <div id="w2-forms" style={sectionStyle}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
          <h2 style={{ ...sectionTitleStyle, margin: '0' }}>
            <Icon name="invoice" size="1.2em" />
            Formularios W-2 ({w2Forms().length})
          </h2>
          <button style={secondaryButtonStyle} onClick={addW2Form}>
            <Icon name="add" size="1em" />
            Agregar W-2
          </button>
        </div>

        <Show when={w2Forms().length === 0}>
          <p style={{ color: 'var(--text-secondary)', 'text-align': 'center', padding: '2rem' }}>
            No hay formularios W-2 agregados. Haga clic en "Agregar W-2" para comenzar.
          </p>
        </Show>

        <For each={w2Forms()}>
          {(w2) => (
            <div style={cardStyle}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                <strong>W-2: {w2.employer || 'Sin nombre'}</strong>
                <button
                  style={{ ...buttonStyle, background: '#ef4444', color: 'white', padding: '0.5rem 1rem' }}
                  onClick={() => removeW2Form(w2.id)}
                >
                  <Icon name="delete" size="0.9em" />
                  Eliminar
                </button>
              </div>
              <div style={formGridStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Empleador</label>
                  <FormInput
                    type="text"
                    style={inputStyle}
                    value={w2.employer}
                   onChange={(e) => updateW2Form(w2.id, { employer: e })}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>EIN</label>
                  <FormInput
                    type="text"
                    style={inputStyle}
                    value={w2.ein}
                   onChange={(e) => updateW2Form(w2.id, { ein: e })}
                    placeholder="##-#######"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Salarios (Box 1)</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={w2.wages}
                    onChange={(e) => {
                      updateW2Form(w2.id, { 
                        wages: parseFloat(e) || 0,
                        medicareWages: parseFloat(e) || 0,
                        socialSecurityWages: parseFloat(e) || 0,
                        socialSecurityTaxWithheld: parseFloat(e )* 0.062 ||  0,
                        medicareTaxWithheld: parseFloat(e )* 0.0145 ||  0 
                       })
                    }}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Retención Federal (Box 2)</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={w2.federalTaxWithheld}
                   onChange={(e) => updateW2Form(w2.id, { federalTaxWithheld: parseFloat(e) || 0 })}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Salarios Seg. Social (Box 3)</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={w2.socialSecurityWages}
                    onChange={(e) => updateW2Form(w2.id, { 
                      socialSecurityWages: parseFloat(e) || 0,  
                      socialSecurityTaxWithheld: parseFloat(e )* 0.062 ||  0
                    })}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Impuesto Seg. Social (Box 4)</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={w2.socialSecurityTaxWithheld}
                   onChange={(e) => updateW2Form(w2.id, { socialSecurityTaxWithheld: parseFloat(e) || 0 })}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Salarios Medicare (Box 5)</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={w2.medicareWages}
                   onChange={(e) => updateW2Form(w2.id, { 
                      medicareWages: parseFloat(e) || 0,
                      medicareTaxWithheld: Math.round(parseFloat(e )* 0.0145) ||  0 
                    })}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Impuesto Medicare (Box 6)</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={w2.medicareTaxWithheld}
                   onChange={(e) => updateW2Form(w2.id, { medicareTaxWithheld: parseFloat(e) || 0 })}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Impuesto Estatal Retenido (Box 17)</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={w2.stateTaxWithheld || 0}
                    onChange={(e) => updateW2Form(w2.id, { stateTaxWithheld: parseFloat(e) || 0 })}
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* 1099 Forms Section */}
      <div id="form-1099" style={sectionStyle}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
          <h2 style={{ ...sectionTitleStyle, margin: '0' }}>
            <Icon name="operations" size="1.2em" />
            Formularios 1099 ({form1099s().length})
          </h2>
          <button style={secondaryButtonStyle} onClick={add1099Form}>
            <Icon name="add" size="1em" />
            Agregar 1099
          </button>
        </div>

        <Show when={form1099s().length === 0}>
          <p style={{ color: 'var(--text-secondary)', 'text-align': 'center', padding: '2rem' }}>
            No hay formularios 1099 agregados. Haga clic en "Agregar 1099" si tiene ingresos misceláneos.
          </p>
        </Show>

        <For each={form1099s()}>
          {(form1099) => (
            <div style={cardStyle}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                <strong>1099-{form1099.type.split('-')[1]}: {form1099.payer || 'Sin nombre'}</strong>
                <button
                  style={{ ...buttonStyle, background: '#ef4444', color: 'white', padding: '0.5rem 1rem' }}
                  onClick={() => remove1099Form(form1099.id)}
                >
                  <Icon name="delete" size="0.9em" />
                  Eliminar
                </button>
              </div>
              <div style={formGridStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Pagador</label>
                  <FormInput
                    type="text"
                    style={inputStyle}
                    value={form1099.payer}
                   onChange={(e) => update1099Form(form1099.id, { payer: e })}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>TIN del Pagador</label>
                  <FormInput
                    type="text"
                    style={inputStyle}
                    value={form1099.payerTIN}
                   onChange={(e) => update1099Form(form1099.id, { payerTIN: e })}
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Tipo de 1099</label>
                  <select
                    style={inputStyle}
                    value={form1099.type}
                    onChange={(e) => update1099Form(form1099.id, { type: e.target.value as Form1099['type'] })}
                  >
                    <option value="1099-MISC">1099-MISC (Ingresos Misceláneos)</option>
                    <option value="1099-NEC">1099-NEC (Compensación No-Empleado)</option>
                    <option value="1099-INT">1099-INT (Intereses)</option>
                    <option value="1099-DIV">1099-DIV (Dividendos)</option>
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Monto</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={form1099.amount}
                   onChange={(e) => update1099Form(form1099.id, { amount: parseFloat(e) || 0 })}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Retención Federal</label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={form1099.federalTaxWithheld}
                   onChange={(e) => update1099Form(form1099.id, { federalTaxWithheld: parseFloat(e) || 0 })}
                    step="0.01"
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Descripción</label>
                  <FormInput
                    type="text"
                    style={inputStyle}
                    value={form1099.description}
                   onChange={(e) => update1099Form(form1099.id, { description: e })}
                  />
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Business Expenses Section (for 1099 contractors) - Collapsible */}
      <Show when={form1099s().length > 0}>
        <div id="business-expenses" style={sectionStyle}>
          <div
            style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': showBusinessExpenses() ? '1rem' : '0',
              padding: '1rem',
              background: showBusinessExpenses() ? 'transparent' : '#f9fafb',
              'border-radius': '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowBusinessExpenses(!showBusinessExpenses())}
          >
            <h2 style={{ ...sectionTitleStyle, margin: '0', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <Icon name={showBusinessExpenses() ? "arrow-down" : "arrow-right"} size="1em" />
              <Icon name="operations" size="1.2em" />
              Gastos de Negocio (Schedule C) ({businessExpenses().length})
            </h2>
            <Show when={showBusinessExpenses()}>
              <button
                style={secondaryButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  addBusinessExpense();
                }}
              >
                <Icon name="add" size="1em" />
                Agregar Gasto
              </button>
            </Show>
          </div>

          <Show when={showBusinessExpenses()}>
          <div style={{ 'margin-bottom': '1rem', padding: '0.75rem', background: '#fef3c7', 'border-radius': '4px', 'font-size': '0.875rem', border: '1px solid #fbbf24' }}>
            💼 Si tiene ingresos 1099, puede deducir gastos de negocio. La tarifa de millaje estándar 2024 es $0.67 por milla.
          </div>

          <Show when={businessExpenses().length === 0}>
            <p style={{ color: 'var(--text-secondary)', 'text-align': 'center', padding: '2rem' }}>
              No hay gastos agregados. Agregue gastos de negocio para reducir su ingreso gravable.
            </p>
          </Show>

          <For each={businessExpenses()}>
            {(expense) => (
              <div style={cardStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                  <strong>Gasto: {expense.description || 'Sin descripción'}</strong>
                  <button
                    style={{ ...buttonStyle, background: '#ef4444', color: 'white', padding: '0.5rem 1rem' }}
                    onClick={() => removeBusinessExpense(expense.id)}
                  >
                    <Icon name="delete" size="0.9em" />
                    Eliminar
                  </button>
                </div>
                <div style={formGridStyle}>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Categoría *</label>
                    <select
                      style={inputStyle}
                      value={expense.category}
                      onChange={(e) => updateBusinessExpense(expense.id, { category: e.target.value as any, miles: e.target.value === 'mileage' ? 0 : undefined })}
                    >
                      <option value="mileage">Millaje (Mileage)</option>
                      <option value="insurance">Seguros (Insurance)</option>
                      <option value="phone">Teléfono/Internet</option>
                      <option value="supplies">Suministros/Materiales</option>
                      <option value="rent">Renta de Oficina</option>
                      <option value="utilities">Servicios Públicos</option>
                      <option value="advertising">Publicidad/Marketing</option>
                      <option value="professional_services">Servicios Profesionales</option>
                      <option value="depreciation">Depreciación</option>
                      <option value="other">Otros Gastos</option>
                    </select>
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Descripción</label>
                    <FormInput
                      type="text"
                      style={inputStyle}
                      value={expense.description}
                      onChange={(e) => updateBusinessExpense(expense.id, { description: e })}
                      placeholder="Ej: Gasolina, herramientas, etc."
                    />
                  </div>
                  <Show when={expense.category === 'mileage'}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Millas Recorridas</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={expense.miles || 0}
                        onChange={(e) => updateBusinessExpense(expense.id, { miles: parseFloat(e) || 0, amount: (parseFloat(e) || 0) * 0.67 })}
                        placeholder="Millas"
                      />
                      <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-top': '0.25rem' }}>
                        Deducción: ${((expense.miles || 0) * 0.67).toFixed(2)}
                      </div>
                    </div>
                  </Show>
                  <Show when={expense.category !== 'mileage'}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Monto</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={expense.amount}
                        onChange={(e) => updateBusinessExpense(expense.id, { amount: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
          </Show>
        </div>
      </Show>

      {/* Retirement Contributions Section (Form 8880) */}
      <div style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': showRetirement() ? '1rem' : '0',
            padding: '1rem',
            background: showRetirement() ? 'transparent' : '#f9fafb',
            'border-radius': '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowRetirement(!showRetirement())}
        >
          <h2 style={{ ...sectionTitleStyle, margin: '0', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Icon name={showRetirement() ? "arrow-down" : "arrow-right"} size="1em" />
            <Icon name="finance" size="1.2em" />
            Contribuciones de Retiro (Form 8880) ({retirementContributions().length})
          </h2>
          <Show when={showRetirement()}>
            <button
              style={{...secondaryButtonStyle, background: '#06b6d4'}}
              onClick={(e) => {
                e.stopPropagation();
                addRetirementContribution();
              }}
            >
              <Icon name="add" size="1em" />
              Agregar Contribución
            </button>
          </Show>
        </div>

        <Show when={showRetirement()}>
        <Show when={retirementContributions().length === 0}>
          <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
            <p>No hay contribuciones de retiro agregadas.</p>
            <p style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
              Incluya contribuciones a IRA, 401(k), 403(b), etc. para calcular el Crédito de Ahorro de Retiro.
            </p>
          </div>
        </Show>

        <Show when={retirementContributions().length > 0}>
          <div>
            <For each={retirementContributions()}>
              {(contribution) => (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                    <h4 style={{ margin: '0', 'font-size': '1rem', 'font-weight': '600', color: '#06b6d4' }}>
                      Contribución de Retiro
                    </h4>
                    <button
                      style={{ ...dangerButtonStyle, padding: '0.5rem 1rem', 'font-size': '0.875rem' }}
                      onClick={() => removeRetirementContribution(contribution.id)}
                    >
                      <Icon name="delete" size="0.9em" />
                      Eliminar
                    </button>
                  </div>
                  <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Tipo de Contribución</label>
                      <select
                        style={inputStyle}
                        value={contribution.type}
                        onChange={(e) => updateRetirementContribution(contribution.id, { type: e.target.value as RetirementContribution['type'] })}
                      >
                        <option value="traditional_ira">IRA Tradicional</option>
                        <option value="roth_ira">Roth IRA</option>
                        <option value="401k">401(k)</option>
                        <option value="403b">403(b)</option>
                        <option value="simple">SIMPLE IRA</option>
                        <option value="sep">SEP IRA</option>
                        <option value="457b">457(b)</option>
                        <option value="sarsep">SARSEP</option>
                      </select>
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Monto Contribuido</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={contribution.amount}
                        onChange={(e) => updateRetirementContribution(contribution.id, { amount: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Descripción</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={contribution.description}
                        onChange={(e) => updateRetirementContribution(contribution.id, { description: e })}
                        placeholder="Ej: Contribución anual a IRA"
                      />
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        </Show>
      </div>

      {/* Rental Properties Section (Schedule E - Part I) */}
      <div id="rental-properties" style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': showRentalProperties() ? '1rem' : '0',
            padding: '1rem',
            background: showRentalProperties() ? 'transparent' : '#f9fafb',
            'border-radius': '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowRentalProperties(!showRentalProperties())}
        >
          <h2 style={{ ...sectionTitleStyle, margin: '0', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Icon name={showRentalProperties() ? "arrow-down" : "arrow-right"} size="1em" />
            <Icon name="inventory" size="1.2em" />
            Propiedades de Renta (Schedule E) ({rentalProperties().length})
          </h2>
          <Show when={showRentalProperties()}>
            <button
              style={{...secondaryButtonStyle, background: '#a855f7'}}
              onClick={(e) => {
                e.stopPropagation();
                addRentalProperty();
              }}
            >
              <Icon name="add" size="1em" />
              Agregar Propiedad
            </button>
          </Show>
        </div>

        <Show when={showRentalProperties()}>
        <Show when={rentalProperties().length === 0}>
          <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
            <p>No hay propiedades de renta agregadas.</p>
            <p style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
              Agregue propiedades de renta para reportar ingresos y gastos en Schedule E.
            </p>
          </div>
        </Show>

        <Show when={rentalProperties().length > 0}>
          <div>
            <For each={rentalProperties()}>
              {(property) => (
                <div style={{...cardStyle, 'margin-bottom': '1.5rem', padding: '1.5rem'}}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                    <h4 style={{ margin: '0', 'font-size': '1.1rem', 'font-weight': '600', color: '#a855f7' }}>
                      Propiedad de Renta
                    </h4>
                    <button
                      style={{ ...dangerButtonStyle, padding: '0.5rem 1rem', 'font-size': '0.875rem' }}
                      onClick={() => removeRentalProperty(property.id)}
                    >
                      <Icon name="delete" size="0.9em" />
                      Eliminar
                    </button>
                  </div>

                  {/* Property Basic Info */}
                  <div style={{ 'margin-bottom': '1rem', padding: '1rem', background: '#faf5ff', 'border-radius': 'var(--border-radius-sm)' }}>
                    <h5 style={{ 'font-size': '0.9rem', 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#7c3aed' }}>
                      Información de la Propiedad
                    </h5>
                    <div style={formGridStyle}>
                      <div style={{ ...formGroupStyle, 'grid-column': '1 / -1' }}>
                        <label style={labelStyle}>Dirección de la Propiedad</label>
                        <FormInput
                          type="text"
                          style={inputStyle}
                          value={property.address}
                          onChange={(e) => updateRentalProperty(property.id, { address: e })}
                          placeholder="Calle, Ciudad, Estado, ZIP"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Tipo de Propiedad</label>
                        <select
                          style={inputStyle}
                          value={property.type}
                          onChange={(e) => updateRentalProperty(property.id, { type: e.target.value as RentalProperty['type'] })}
                        >
                          <option value="Single Family">Casa Unifamiliar</option>
                          <option value="Multi-Family">Multifamiliar</option>
                          <option value="Vacation/Short-Term">Vacacional/Corto Plazo</option>
                          <option value="Commercial">Comercial</option>
                          <option value="Land">Terreno</option>
                        </select>
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Días Rentados</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.daysRented}
                          onChange={(e) => updateRentalProperty(property.id, { daysRented: parseInt(e) || 0 })}
                          min="0"
                          max="365"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Días Uso Personal</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.daysPersonalUse}
                          onChange={(e) => updateRentalProperty(property.id, { daysPersonalUse: parseInt(e) || 0 })}
                          min="0"
                          max="365"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Días Disponibles para Renta</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.fairRentalDays}
                          onChange={(e) => updateRentalProperty(property.id, { fairRentalDays: parseInt(e) || 0 })}
                          min="0"
                          max="365"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Income */}
                  <div style={{ 'margin-bottom': '1rem', padding: '1rem', background: '#ecfdf5', 'border-radius': 'var(--border-radius-sm)' }}>
                    <h5 style={{ 'font-size': '0.9rem', 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#059669' }}>
                      Ingresos
                    </h5>
                    <div style={formGridStyle}>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Rentas Recibidas</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.rentsReceived}
                          onChange={(e) => updateRentalProperty(property.id, { rentsReceived: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Regalías Recibidas</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.royaltiesReceived}
                          onChange={(e) => updateRentalProperty(property.id, { royaltiesReceived: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div style={{ padding: '1rem', background: '#fef2f2', 'border-radius': 'var(--border-radius-sm)' }}>
                    <h5 style={{ 'font-size': '0.9rem', 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#dc2626' }}>
                      Gastos
                    </h5>
                    <div style={formGridStyle}>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Publicidad</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.advertising}
                          onChange={(e) => updateRentalProperty(property.id, { advertising: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Auto y Viajes</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.auto}
                          onChange={(e) => updateRentalProperty(property.id, { auto: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Limpieza y Mantenimiento</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.cleaning}
                          onChange={(e) => updateRentalProperty(property.id, { cleaning: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Comisiones</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.commissions}
                          onChange={(e) => updateRentalProperty(property.id, { commissions: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Seguro</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.insurance}
                          onChange={(e) => updateRentalProperty(property.id, { insurance: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Servicios Legales y Profesionales</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.legal}
                          onChange={(e) => updateRentalProperty(property.id, { legal: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Administración</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.management}
                          onChange={(e) => updateRentalProperty(property.id, { management: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Interés Hipotecario</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.mortgageInterest}
                          onChange={(e) => updateRentalProperty(property.id, { mortgageInterest: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Otro Interés</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.otherInterest}
                          onChange={(e) => updateRentalProperty(property.id, { otherInterest: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Reparaciones</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.repairs}
                          onChange={(e) => updateRentalProperty(property.id, { repairs: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Suministros</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.supplies}
                          onChange={(e) => updateRentalProperty(property.id, { supplies: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Impuestos</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.taxes}
                          onChange={(e) => updateRentalProperty(property.id, { taxes: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Servicios Públicos</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.utilities}
                          onChange={(e) => updateRentalProperty(property.id, { utilities: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Depreciación</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.depreciation}
                          onChange={(e) => updateRentalProperty(property.id, { depreciation: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Otros Gastos</label>
                        <FormInput
                          type="number"
                          style={inputStyle}
                          value={property.otherExpenses}
                          onChange={(e) => updateRentalProperty(property.id, { otherExpenses: parseFloat(e) || 0 })}
                          step="0.01"
                          placeholder="$0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        </Show>
      </div>

      {/* Partnership Income Section (Schedule E - Part II) */}
      <div id="partnerships" style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': showPartnerships() ? '1rem' : '0',
            padding: '1rem',
            background: showPartnerships() ? 'transparent' : '#f9fafb',
            'border-radius': '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowPartnerships(!showPartnerships())}
        >
          <h2 style={{ ...sectionTitleStyle, margin: '0', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Icon name={showPartnerships() ? "arrow-down" : "arrow-right"} size="1em" />
            <Icon name="customer" size="1.2em" />
            Ingresos de Sociedades/S-Corp (Schedule E - Part II) ({partnershipIncomes().length})
          </h2>
          <Show when={showPartnerships()}>
            <button
              style={{...secondaryButtonStyle, background: '#8b5cf6'}}
              onClick={(e) => {
                e.stopPropagation();
                addPartnershipIncome();
              }}
            >
              <Icon name="add" size="1em" />
              Agregar K-1
            </button>
          </Show>
        </div>

        <Show when={showPartnerships()}>
        <Show when={partnershipIncomes().length === 0}>
          <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
            <p>No hay ingresos de sociedades agregados.</p>
            <p style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
              Agregue información del formulario K-1 de sociedades o corporaciones S.
            </p>
          </div>
        </Show>

        <Show when={partnershipIncomes().length > 0}>
          <div>
            <For each={partnershipIncomes()}>
              {(partnership) => (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                    <h4 style={{ margin: '0', 'font-size': '1rem', 'font-weight': '600', color: '#8b5cf6' }}>
                      Sociedad/S-Corp K-1
                    </h4>
                    <button
                      style={{ ...dangerButtonStyle, padding: '0.5rem 1rem', 'font-size': '0.875rem' }}
                      onClick={() => removePartnershipIncome(partnership.id)}
                    >
                      <Icon name="delete" size="0.9em" />
                      Eliminar
                    </button>
                  </div>
                  <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Nombre de la Sociedad/S-Corp</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={partnership.name}
                        onChange={(e) => updatePartnershipIncome(partnership.id, { name: e })}
                        placeholder="Nombre de la entidad"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>EIN</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={partnership.ein}
                        onChange={(e) => updatePartnershipIncome(partnership.id, { ein: e })}
                        placeholder="##-#######"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Ingreso Ordinario (Box 1)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={partnership.ordinaryIncome}
                        onChange={(e) => updatePartnershipIncome(partnership.id, { ordinaryIncome: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>¿Actividad Pasiva?</label>
                      <select
                        style={inputStyle}
                        value={partnership.isPassive ? 'yes' : 'no'}
                        onChange={(e) => updatePartnershipIncome(partnership.id, { isPassive: e.target.value === 'yes' })}
                      >
                        <option value="no">No (Activa)</option>
                        <option value="yes">Sí (Pasiva)</option>
                      </select>
                    </div>
                    <div style={{ ...formGroupStyle, 'grid-column': '1 / -1' }}>
                      <label style={labelStyle}>Descripción</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={partnership.description}
                        onChange={(e) => updatePartnershipIncome(partnership.id, { description: e })}
                        placeholder="Detalles adicionales"
                      />
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        </Show>
      </div>

      {/* Estate/Trust Income Section (Schedule E - Part III) */}
      <div id="estates" style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': showEstates() ? '1rem' : '0',
            padding: '1rem',
            background: showEstates() ? 'transparent' : '#f9fafb',
            'border-radius': '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowEstates(!showEstates())}
        >
          <h2 style={{ ...sectionTitleStyle, margin: '0', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Icon name={showEstates() ? "arrow-down" : "arrow-right"} size="1em" />
            <Icon name="invoice" size="1.2em" />
            Ingresos de Fideicomisos/Herencias (Schedule E - Part III) ({estateIncomes().length})
          </h2>
          <Show when={showEstates()}>
            <button
              style={{...secondaryButtonStyle, background: '#ec4899'}}
              onClick={(e) => {
                e.stopPropagation();
                addEstateIncome();
              }}
            >
              <Icon name="add" size="1em" />
              Agregar K-1
            </button>
          </Show>
        </div>

        <Show when={showEstates()}>
        <Show when={estateIncomes().length === 0}>
          <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
            <p>No hay ingresos de fideicomisos/herencias agregados.</p>
            <p style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
              Agregue información del formulario 1041 K-1 de fideicomisos o herencias.
            </p>
          </div>
        </Show>

        <Show when={estateIncomes().length > 0}>
          <div>
            <For each={estateIncomes()}>
              {(estate) => (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                    <h4 style={{ margin: '0', 'font-size': '1rem', 'font-weight': '600', color: '#ec4899' }}>
                      Fideicomiso/Herencia K-1
                    </h4>
                    <button
                      style={{ ...dangerButtonStyle, padding: '0.5rem 1rem', 'font-size': '0.875rem' }}
                      onClick={() => removeEstateIncome(estate.id)}
                    >
                      <Icon name="delete" size="0.9em" />
                      Eliminar
                    </button>
                  </div>
                  <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Nombre del Fideicomiso/Herencia</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={estate.name}
                        onChange={(e) => updateEstateIncome(estate.id, { name: e })}
                        placeholder="Nombre de la entidad"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>EIN</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={estate.ein}
                        onChange={(e) => updateEstateIncome(estate.id, { ein: e })}
                        placeholder="##-#######"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Ingreso Ordinario</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={estate.ordinaryIncome}
                        onChange={(e) => updateEstateIncome(estate.id, { ordinaryIncome: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>¿Actividad Pasiva?</label>
                      <select
                        style={inputStyle}
                        value={estate.isPassive ? 'yes' : 'no'}
                        onChange={(e) => updateEstateIncome(estate.id, { isPassive: e.target.value === 'yes' })}
                      >
                        <option value="no">No (Activa)</option>
                        <option value="yes">Sí (Pasiva)</option>
                      </select>
                    </div>
                    <div style={{ ...formGroupStyle, 'grid-column': '1 / -1' }}>
                      <label style={labelStyle}>Descripción</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={estate.description}
                        onChange={(e) => updateEstateIncome(estate.id, { description: e })}
                        placeholder="Detalles adicionales"
                      />
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        </Show>
      </div>

      {/* Form 1098 - Mortgage Interest Section */}
      <div id="form-1098" style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': showForm1098() ? '1rem' : '0',
            padding: '1rem',
            background: showForm1098() ? 'transparent' : '#f9fafb',
            'border-radius': '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowForm1098(!showForm1098())}
        >
          <h2 style={{ ...sectionTitleStyle, margin: '0', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Icon name={showForm1098() ? "arrow-down" : "arrow-right"} size="1em" />
            <Icon name="home" size="1.2em" />
            Form 1098 - Interés Hipotecario (Schedule A) ({form1098s().length})
          </h2>
          <Show when={showForm1098()}>
            <button
              style={{...secondaryButtonStyle, background: '#14b8a6'}}
              onClick={(e) => {
                e.stopPropagation();
                add1098();
              }}
            >
              <Icon name="add" size="1em" />
              Agregar Form 1098
            </button>
          </Show>
        </div>

        <Show when={showForm1098()}>
        <Show when={form1098s().length === 0}>
          <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
            <p>No hay formularios 1098 agregados.</p>
            <p style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
              Agregue información del Form 1098 para deducir intereses hipotecarios.
            </p>
          </div>
        </Show>

        <Show when={form1098s().length > 0}>
          <div>
            <For each={form1098s()}>
              {(form1098) => (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                    <h4 style={{ margin: '0', 'font-size': '1rem', 'font-weight': '600', color: '#14b8a6' }}>
                      Form 1098 - Interés Hipotecario
                    </h4>
                    <button
                      style={{ ...dangerButtonStyle, padding: '0.5rem 1rem', 'font-size': '0.875rem' }}
                      onClick={() => remove1098(form1098.id)}
                    >
                      <Icon name="delete" size="0.9em" />
                      Eliminar
                    </button>
                  </div>
                  <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Prestamista</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098.lender}
                        onChange={(e) => update1098(form1098.id, { lender: e })}
                        placeholder="Nombre del banco/prestamista"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>TIN del Prestamista</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098.lenderTIN}
                        onChange={(e) => update1098(form1098.id, { lenderTIN: e })}
                        placeholder="##-#######"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Interés Hipotecario (Box 1)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098.mortgageInterest}
                        onChange={(e) => update1098(form1098.id, { mortgageInterest: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Impuestos de Propiedad (Box 10)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098.propertyTaxes}
                        onChange={(e) => update1098(form1098.id, { propertyTaxes: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={{ ...formGroupStyle, 'grid-column': '1 / -1' }}>
                      <label style={labelStyle}>Dirección de la Propiedad</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098.propertyAddress}
                        onChange={(e) => update1098(form1098.id, { propertyAddress: e })}
                        placeholder="Dirección completa de la propiedad"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>¿Residencia Principal?</label>
                      <select
                        style={inputStyle}
                        value={form1098.isMainHome ? 'yes' : 'no'}
                        onChange={(e) => update1098(form1098.id, { isMainHome: e.target.value === 'yes' })}
                      >
                        <option value="yes">Sí (Residencia Principal)</option>
                        <option value="no">No (Segunda Vivienda)</option>
                      </select>
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Principal Pendiente (Box 2)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098.outstandingPrincipal}
                        onChange={(e) => update1098(form1098.id, { outstandingPrincipal: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Fecha de Origen de Hipoteca (Box 3)</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098.mortgageOriginationDate}
                        onChange={(e) => update1098(form1098.id, { mortgageOriginationDate: e })}
                        placeholder="MM/DD/YYYY"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Puntos Pagados (Box 6)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098.pointsPaid}
                        onChange={(e) => update1098(form1098.id, { pointsPaid: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Primas de Seguro Hipotecario (Box 5)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098.mortgageInsurancePremiums}
                        onChange={(e) => update1098(form1098.id, { mortgageInsurancePremiums: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={{ ...formGroupStyle, 'grid-column': '1 / -1' }}>
                      <label style={labelStyle}>Descripción</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098.description}
                        onChange={(e) => update1098(form1098.id, { description: e })}
                        placeholder="Detalles adicionales"
                      />
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        </Show>
      </div>

      {/* Form 1098-T - Tuition Statement Section */}
      <div id="form-1098t" style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': showForm1098T() ? '1rem' : '0',
            padding: '1rem',
            background: showForm1098T() ? 'transparent' : '#f9fafb',
            'border-radius': '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowForm1098T(!showForm1098T())}
        >
          <h2 style={{ ...sectionTitleStyle, margin: '0', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Icon name={showForm1098T() ? "arrow-down" : "arrow-right"} size="1em" />
            <Icon name="book" size="1.2em" />
            Form 1098-T - Matrícula Educativa (Form 8863) ({form1098Ts().length})
          </h2>
          <Show when={showForm1098T()}>
            <button
              style={{...secondaryButtonStyle, background: '#6366f1'}}
              onClick={(e) => {
                e.stopPropagation();
                add1098T();
              }}
            >
              <Icon name="add" size="1em" />
              Agregar Form 1098-T
            </button>
          </Show>
        </div>

        <Show when={showForm1098T()}>
        <Show when={form1098Ts().length === 0}>
          <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
            <p>No hay formularios 1098-T agregados.</p>
            <p style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
              Agregue información del Form 1098-T para créditos educativos.
            </p>
          </div>
        </Show>

        <Show when={form1098Ts().length > 0}>
          <div>
            <For each={form1098Ts()}>
              {(form1098T) => (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                    <h4 style={{ margin: '0', 'font-size': '1rem', 'font-weight': '600', color: '#6366f1' }}>
                      Form 1098-T - Matrícula Educativa
                    </h4>
                    <button
                      style={{ ...dangerButtonStyle, padding: '0.5rem 1rem', 'font-size': '0.875rem' }}
                      onClick={() => remove1098T(form1098T.id)}
                    >
                      <Icon name="delete" size="0.9em" />
                      Eliminar
                    </button>
                  </div>
                  <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Institución Educativa</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098T.institution}
                        onChange={(e) => update1098T(form1098T.id, { institution: e })}
                        placeholder="Nombre de la universidad/escuela"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>EIN de la Institución</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098T.institutionEIN}
                        onChange={(e) => update1098T(form1098T.id, { institutionEIN: e })}
                        placeholder="##-#######"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Nombre del Estudiante</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098T.studentName}
                        onChange={(e) => update1098T(form1098T.id, { studentName: e })}
                        placeholder="Nombre completo del estudiante"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>SSN del Estudiante</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098T.studentSSN}
                        onChange={(e) => update1098T(form1098T.id, { studentSSN: e })}
                        placeholder="###-##-####"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Gastos Calificados (Box 1)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098T.qualifiedExpenses}
                        onChange={(e) => update1098T(form1098T.id, { qualifiedExpenses: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Becas/Subvenciones (Box 5)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098T.scholarshipsGrants}
                        onChange={(e) => update1098T(form1098T.id, { scholarshipsGrants: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Período Académico</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098T.academicPeriod}
                        onChange={(e) => update1098T(form1098T.id, { academicPeriod: e })}
                        placeholder="ej. 2024 Spring, 2024-2025"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>¿Al menos Medio Tiempo?</label>
                      <select
                        style={inputStyle}
                        value={form1098T.isAtLeastHalfTime ? 'yes' : 'no'}
                        onChange={(e) => update1098T(form1098T.id, { isAtLeastHalfTime: e.target.value === 'yes' })}
                      >
                        <option value="no">No</option>
                        <option value="yes">Sí (Box 7)</option>
                      </select>
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>¿Estudiante de Posgrado?</label>
                      <select
                        style={inputStyle}
                        value={form1098T.isGraduateStudent ? 'yes' : 'no'}
                        onChange={(e) => update1098T(form1098T.id, { isGraduateStudent: e.target.value === 'yes' })}
                      >
                        <option value="no">No</option>
                        <option value="yes">Sí (Box 8)</option>
                      </select>
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Ajustes Año Anterior (Box 4)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098T.adjustmentsPriorYear}
                        onChange={(e) => update1098T(form1098T.id, { adjustmentsPriorYear: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Ajustes Becas Año Anterior (Box 6)</label>
                      <FormInput
                        type="number"
                        style={inputStyle}
                        value={form1098T.adjustmentsForPriorYearScholarships}
                        onChange={(e) => update1098T(form1098T.id, { adjustmentsForPriorYearScholarships: parseFloat(e) || 0 })}
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>¿Incluye Montos para Próximo Año?</label>
                      <select
                        style={inputStyle}
                        value={form1098T.includesAmountsForNextYear ? 'yes' : 'no'}
                        onChange={(e) => update1098T(form1098T.id, { includesAmountsForNextYear: e.target.value === 'yes' })}
                      >
                        <option value="no">No</option>
                        <option value="yes">Sí (Box 9)</option>
                      </select>
                    </div>
                    <div style={{ ...formGroupStyle, 'grid-column': '1 / -1' }}>
                      <label style={labelStyle}>Descripción</label>
                      <FormInput
                        type="text"
                        style={inputStyle}
                        value={form1098T.description}
                        onChange={(e) => update1098T(form1098T.id, { description: e })}
                        placeholder="Detalles adicionales"
                      />
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        </Show>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'center', 'margin-bottom': '2rem' }}>
        <button style={primaryButtonStyle} onClick={calculateTaxReturn}>
          <Icon name="operations" size="1em" />
          Calcular Impuestos
        </button>
        <button style={dangerButtonStyle} onClick={clearForm}>
          <Icon name="delete" size="1em" />
          Limpiar Formulario
        </button>
      </div>











      {/* Tax Calculation Results */}
      <div id="results">
      <Show when={showResults() && calculationResult()}>
        {() => {
          const result = calculationResult()!;
          const isRefund = result.refundAmount > 0;

          return (
            <div style={{
              ...sectionStyle,
              background: isRefund
                ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: `2px solid ${isRefund ? '#10b981' : '#ef4444'}`
            }}>
              <h2 style={sectionTitleStyle}>
                <Icon name="finance" size="1.2em" />
                Resultados del Cálculo
              </h2>

              {/* Calculation Reference Information */}
              <div style={{
                background: 'white',
                padding: '1rem 1.5rem',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem',
                border: '2px solid #3b82f6'
              }}>
                <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '0.25rem' }}>
                      📋 Número de Referencia
                    </div>
                    <div style={{ 'font-weight': '600', color: '#1e40af', 'font-family': 'monospace', 'font-size': '0.95rem' }}>
                      {result.calculationReference}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '0.25rem' }}>
                      📅 Fecha de Cálculo
                    </div>
                    <div style={{ 'font-weight': '600', color: '#1f2937' }}>
                      {new Date(result.calculationDate).toLocaleString('es-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '0.25rem' }}>
                      👤 Cliente
                    </div>
                    <div style={{ 'font-weight': '600', color: '#1f2937' }}>
                      {result.customerName}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '0.25rem' }}>
                      📆 Año Fiscal
                    </div>
                    <div style={{ 'font-weight': '600', color: '#1f2937' }}>
                      {result.taxYear}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1.5rem',
                'text-align': 'center' as const
              }}>
                <h3 style={{ 'font-size': '1.5rem', margin: '0 0 1rem 0', color: isRefund ? '#10b981' : '#ef4444' }}>
                  {isRefund ? '🎉 Devolución de Impuestos' : '⚠️ Impuestos Adeudados'}
                </h3>
                <div style={{ 'font-size': '3rem', 'font-weight': 'bold', color: isRefund ? '#10b981' : '#ef4444' }}>
                  {taxCalculationService.formatCurrency(isRefund ? result.refundAmount : result.taxDue)}
                </div>
                <p style={{ 'margin-top': '0.5rem', color: 'var(--text-secondary)' }}>
                  Tasa Efectiva: {taxCalculationService.formatPercentage(result.effectiveTaxRate)}
                </p>
                <Show when={result.stateTaxState === 'KY'}>
                  <div style={{
                    'margin-top': '1rem',
                    'padding-top': '1rem',
                    'border-top': '1px solid #e5e7eb'
                  }}>
                    <div style={{ 'font-size': '1rem', color: '#6b7280', 'margin-bottom': '0.25rem' }}>
                      Impuesto Estatal — Kentucky ({(result.stateTaxRate * 100).toFixed(0)}%)
                    </div>
                    <div style={{
                      'font-size': '1.5rem',
                      'font-weight': 'bold',
                      color: result.stateTaxRefund > 0 ? '#10b981' : result.stateTaxDue > 0 ? '#ef4444' : '#6b7280'
                    }}>
                      {result.stateTaxRefund > 0
                        ? `Devolución: ${taxCalculationService.formatCurrency(result.stateTaxRefund)}`
                        : result.stateTaxDue > 0
                          ? `Adeudado: ${taxCalculationService.formatCurrency(result.stateTaxDue)}`
                          : '$0.00'}
                    </div>
                  </div>
                </Show>
              </div>

              {/* Income Summary */}
              <div style={{ background: 'white', padding: '1.5rem', 'border-radius': 'var(--border-radius-sm)', 'margin-bottom': '1.5rem' }}>
                <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem' }}>Resumen de Ingresos</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Ingresos W-2:</span>
                    <strong>{taxCalculationService.formatCurrency(result.totalW2Income)}</strong>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Ingresos 1099 (Total):</span>
                    <strong>{taxCalculationService.formatCurrency(result.total1099Income)}</strong>
                  </div>

                  {/* 1099 Income Breakdown by Type */}
                  <Show when={result.total1099Income > 0}>
                    <div style={{
                      'margin-top': '0.5rem',
                      padding: '0.75rem',
                      background: '#f0fdf4',
                      'border-radius': '6px',
                      border: '1px solid #10b981',
                      'margin-bottom': '0.5rem'
                    }}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem', color: '#059669' }}>
                        💰 Desglose de Ingresos 1099:
                      </div>
                      <div style={{ display: 'grid', gap: '0.5rem', 'font-size': '0.875rem' }}>
                        <Show when={result.total1099InvestmentIncome > 0}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                            <span>📊 Ingresos de Inversión (INT + DIV):</span>
                            <span>{taxCalculationService.formatCurrency(result.total1099InvestmentIncome)}</span>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#059669', 'margin-left': '1rem', 'margin-top': '-0.25rem' }}>
                            ✓ No sujeto al impuesto de trabajo por cuenta propia
                          </div>
                        </Show>
                        <Show when={result.total1099SelfEmploymentIncome > 0}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                            <span>💼 Ingresos de Trabajo por Cuenta Propia (NEC + MISC):</span>
                            <span>{taxCalculationService.formatCurrency(result.total1099SelfEmploymentIncome)}</span>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#dc2626', 'margin-left': '1rem', 'margin-top': '-0.25rem' }}>
                            ⚠️ Sujeto al impuesto de trabajo por cuenta propia (15.3%)
                          </div>
                        </Show>
                      </div>
                    </div>
                  </Show>

                  {/* Self-Employment Breakdown (when applicable) */}
                  <Show when={result.total1099SelfEmploymentIncome > 0}>
                    <div style={{
                      'margin-top': '0.5rem',
                      padding: '0.75rem',
                      background: '#fef3c7',
                      'border-radius': '6px',
                      border: '1px solid #fbbf24'
                    }}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem', color: '#92400e' }}>
                        📋 Cálculo de Ingreso Neto de Trabajo por Cuenta Propia:
                      </div>
                      <div style={{ display: 'grid', gap: '0.5rem', 'font-size': '0.875rem' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                          <span>Ingresos 1099 (NEC + MISC):</span>
                          <span>{taxCalculationService.formatCurrency(result.total1099SelfEmploymentIncome)}</span>
                        </div>
                        <Show when={result.totalBusinessExpenses > 0}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', color: '#b45309' }}>
                            <span>- Gastos de Negocio:</span>
                            <span>-{taxCalculationService.formatCurrency(result.totalBusinessExpenses)}</span>
                          </div>
                        </Show>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.5rem', 'border-top': '1px dashed #fbbf24', 'font-weight': '600' }}>
                          <span>= Ingreso Neto de Trabajo por Cuenta Propia:</span>
                          <span>{taxCalculationService.formatCurrency(result.netSelfEmploymentIncome)}</span>
                        </div>
                        <Show when={result.selfEmploymentTax > 0}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-top': '0.5rem', 'padding-top': '0.5rem', 'border-top': '1px dashed #fbbf24' }}>
                            <span>Impuesto de Trabajo por Cuenta Propia (15.3%):</span>
                            <span>{taxCalculationService.formatCurrency(result.selfEmploymentTax)}</span>
                          </div>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', color: '#065f46' }}>
                            <span>Deducción del 50% del Impuesto SE:</span>
                            <span>-{taxCalculationService.formatCurrency(result.selfEmploymentTaxDeduction)}</span>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </Show>

                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.75rem', 'border-top': '2px solid var(--border-color)' }}>
                    <span><strong>Ingreso Total:</strong></span>
                    <strong>{taxCalculationService.formatCurrency(result.totalIncome)}</strong>
                  </div>
                  <Show when={result.selfEmploymentTaxDeduction > 0}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.875rem', color: '#059669' }}>
                      <span>- Deducción del Impuesto SE:</span>
                      <span>-{taxCalculationService.formatCurrency(result.selfEmploymentTaxDeduction)}</span>
                    </div>
                  </Show>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.5rem', 'border-top': '1px solid var(--border-color)' }}>
                    <span><strong>Ingreso Bruto Ajustado (AGI):</strong></span>
                    <strong>{taxCalculationService.formatCurrency(result.adjustedGrossIncome)}</strong>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ background: 'white', padding: '1.5rem', 'border-radius': 'var(--border-radius-sm)', 'margin-bottom': '1.5rem' }}>
                <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem' }}>Deducciones</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Deducción Estándar:</span>
                    <span>{taxCalculationService.formatCurrency(result.standardDeduction)}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Deducciones Detalladas:</span>
                    <span>{taxCalculationService.formatCurrency(result.totalItemizedDeductions)}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.75rem', 'border-top': '2px solid var(--border-color)' }}>
                    <span><strong>Deducción Utilizada ({result.deductionUsed === 'standard' ? 'Estándar' : 'Detallada'}):</strong></span>
                    <strong>{taxCalculationService.formatCurrency(result.deductionAmount)}</strong>
                  </div>
                  <Show when={result.qbiDeduction > 0}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-top': '0.5rem', color: '#059669' }}>
                      <span>Deducción QBI (20% del Ingreso de Negocio Calificado):</span>
                      <span>-{taxCalculationService.formatCurrency(result.qbiDeduction)}</span>
                    </div>
                    <div style={{
                      'margin-top': '0.5rem',
                      padding: '0.75rem',
                      background: '#ecfdf5',
                      'border-radius': '6px',
                      border: '1px solid #6ee7b7',
                      'font-size': '0.8125rem',
                      color: '#047857'
                    }}>
                      💡 La Deducción QBI es una deducción del 20% del ingreso de negocio calificado, limitada por el ingreso gravable. Esto reduce su ingreso gravable sin necesidad de detallar deducciones.
                    </div>
                  </Show>
                </div>
              </div>

              {/* Tax Calculation */}
              <div style={{ background: 'white', padding: '1.5rem', 'border-radius': 'var(--border-radius-sm)', 'margin-bottom': '1.5rem' }}>
                <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem' }}>Cálculo de Impuestos</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span><strong>Ingreso Gravable:</strong></span>
                    <strong>{taxCalculationService.formatCurrency(result.taxableIncome)}</strong>
                  </div>

                  {/* Tax Bracket Breakdown */}
                  <div style={{ 'margin-top': '0.5rem' }}>
                    <div style={{ 'font-size': '0.875rem', 'font-weight': '600', 'margin-bottom': '0.5rem', color: 'var(--text-secondary)' }}>
                      Desglose por Tramo:
                    </div>
                    <For each={result.taxBracketBreakdown}>
                      {(bracket) => (
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'font-size': '0.875rem',
                          padding: '0.5rem',
                          background: '#f9fafb',
                          'border-radius': '4px',
                          'margin-bottom': '0.25rem'
                        }}>
                          <span>{bracket.bracket} en {taxCalculationService.formatCurrency(bracket.taxableAmount)}</span>
                          <span>{taxCalculationService.formatCurrency(bracket.taxAmount)}</span>
                        </div>
                      )}
                    </For>
                  </div>

                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.75rem', 'border-top': '2px solid var(--border-color)' }}>
                    <span><strong>Responsabilidad Fiscal Federal:</strong></span>
                    <strong>{taxCalculationService.formatCurrency(result.federalTaxLiability)}</strong>
                  </div>

                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Crédito Tributario por Hijos (No-reembolsable):</span>
                    <span style={{ color: '#10b981' }}>-{taxCalculationService.formatCurrency(result.childTaxCredit)}</span>
                  </div>

                  <Show when={result.additionalChildTaxCredit > 0}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Crédito Tributario Adicional por Hijos (Reembolsable):</span>
                      <span style={{ color: '#10b981' }}>-{taxCalculationService.formatCurrency(result.additionalChildTaxCredit)}</span>
                    </div>
                    <div style={{
                      'margin-top': '0.75rem',
                      padding: '0.75rem',
                      background: '#ecfdf5',
                      'border-radius': '6px',
                      border: '1px solid #6ee7b7',
                      'font-size': '0.8125rem'
                    }}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#065f46' }}>
                        📊 Crédito Tributario Adicional por Hijos Explicado:
                      </div>
                      <div style={{ color: '#047857', 'line-height': '1.5' }}>
                        Cuando su responsabilidad fiscal es menor que el Crédito Tributario por Hijos total, el Crédito Tributario Adicional por Hijos (ACTC) le permite recibir la parte restante como un crédito reembolsable.
                        <div style={{ 'margin-top': '0.5rem' }}>
                          El ACTC se calcula como 15% × (Ingresos del Trabajo - $2,500), hasta el monto del crédito no utilizado.
                        </div>
                        <div style={{ 'margin-top': '0.5rem', 'padding-top': '0.5rem', 'border-top': '1px solid #6ee7b7' }}>
                          💡 <strong>Nota:</strong> Este es un crédito reembolsable, lo que significa que puede recibir un reembolso incluso si no debe impuestos.
                        </div>
                      </div>
                    </div>
                  </Show>

                  <Show when={result.earnedIncomeCredit > 0}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Crédito por Ingreso del Trabajo (EIC):</span>
                      <span style={{ color: '#10b981' }}>-{taxCalculationService.formatCurrency(result.earnedIncomeCredit)}</span>
                    </div>

                    {/* EIC Calculation Explanation */}
                    <div style={{
                      'margin-top': '0.75rem',
                      padding: '0.75rem',
                      background: '#ecfdf5',
                      'border-radius': '6px',
                      border: '1px solid #6ee7b7',
                      'font-size': '0.8125rem'
                    }}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#065f46' }}>
                        📊 Cálculo del EIC Explicado:
                      </div>
                      <div style={{ color: '#047857', 'line-height': '1.5' }}>
                        El Crédito por Ingreso del Trabajo (EIC) se calcula en 3 fases basadas en su AGI de {taxCalculationService.formatCurrency(result.adjustedGrossIncome)}:
                        <ul style={{ 'margin': '0.5rem 0 0 1.25rem', 'padding': '0' }}>
                          <li><strong>Fase de Aumento:</strong> El crédito aumenta linealmente hasta alcanzar el máximo cuando su ingreso llega a un umbral específico.</li>
                          <li><strong>Fase de Meseta:</strong> Recibe el crédito máximo cuando su ingreso está dentro de un rango intermedio.</li>
                          <li><strong>Fase de Reducción:</strong> El crédito disminuye gradualmente a medida que su ingreso se acerca al límite máximo de elegibilidad.</li>
                        </ul>
                        <div style={{ 'margin-top': '0.5rem', 'padding-top': '0.5rem', 'border-top': '1px solid #6ee7b7' }}>
                          💡 <strong>Nota:</strong> El EIC es un crédito reembolsable, lo que significa que puede recibir un reembolso incluso si no debe impuestos.
                        </div>
                      </div>
                    </div>
                  </Show>

                  <Show when={result.otherCredits > 0}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Otros Créditos:</span>
                      <span style={{ color: '#10b981' }}>-{taxCalculationService.formatCurrency(result.otherCredits)}</span>
                    </div>
                  </Show>

                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.75rem', 'border-top': '1px solid var(--border-color)' }}>
                    <span>Total Retenido:</span>
                    <span style={{ color: '#10b981' }}>-{taxCalculationService.formatCurrency(result.totalWithheld)}</span>
                  </div>
                </div>
              </div>

              {/* Payroll Taxes Section */}
              <div style={{ background: 'white', padding: '1.5rem', 'border-radius': 'var(--border-radius-sm)', 'margin-bottom': '1.5rem' }}>
                <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem' }}>Impuestos de Nómina</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Seguro Social (6.2%):</span>
                    <strong>{taxCalculationService.formatCurrency(result.socialSecurityTax)}</strong>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Medicare (1.45%):</span>
                    <strong>{taxCalculationService.formatCurrency(result.medicareTax)}</strong>
                  </div>
                  <Show when={result.additionalMedicareTax > 0}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Medicare Adicional (0.9%):</span>
                      <strong>{taxCalculationService.formatCurrency(result.additionalMedicareTax)}</strong>
                    </div>
                  </Show>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'padding-top': '0.75rem', 'border-top': '2px solid var(--border-color)' }}>
                    <span><strong>Total Impuestos de Nómina:</strong></span>
                    <strong>{taxCalculationService.formatCurrency(result.totalPayrollTax)}</strong>
                  </div>
                  <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-top': '0.5rem', padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                    💡 Los impuestos de nómina son retenidos automáticamente de su salario por su empleador. Estos montos están incluidos en las recomendaciones de retención total.
                  </div>
                </div>
              </div>

              {/* Withholding Recommendations */}
              <div style={{ background: 'white', padding: '1.5rem', 'border-radius': 'var(--border-radius-sm)', 'margin-bottom': '1.5rem', border: '2px solid #3b82f6' }}>
                <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem', color: '#1e40af' }}>
                  📋 Recomendaciones de Retención
                </h4>

                {/* Withholding Status */}
                <div style={{
                  padding: '1rem',
                  'border-radius': '8px',
                  'margin-bottom': '1rem',
                  background: result.withholdingStatus === 'adequate'
                    ? '#d1fae5'
                    : result.withholdingStatus === 'underwithholding'
                    ? '#fee2e2'
                    : '#fef3c7',
                  border: `2px solid ${
                    result.withholdingStatus === 'adequate'
                    ? '#10b981'
                    : result.withholdingStatus === 'underwithholding'
                    ? '#ef4444'
                    : '#f59e0b'
                  }`
                }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#1f2937' }}>
                    {result.withholdingStatus === 'adequate' && '✅ Estado de Retención: Adecuado'}
                    {result.withholdingStatus === 'underwithholding' && '⚠️ Estado de Retención: Insuficiente'}
                    {result.withholdingStatus === 'overwithholding' && '💰 Estado de Retención: Excesivo'}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: '#4b5563' }}>
                    {result.withholdingStatus === 'adequate' &&
                      'Su retención actual está dentro del rango apropiado (±10% de su responsabilidad fiscal).'}
                    {result.withholdingStatus === 'underwithholding' &&
                      `Está reteniendo menos de lo necesario. Considere aumentar su retención para evitar penalidades.`}
                    {result.withholdingStatus === 'overwithholding' &&
                      'Está reteniendo más de lo necesario. Considere reducir su retención para aumentar su ingreso neto.'}
                  </div>
                </div>

                {/* Recommended Withholding Amounts */}
                <div style={{ 'margin-bottom': '1rem' }}>
                  <div style={{ 'font-size': '0.875rem', 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#1e40af' }}>
                    Retención Recomendada Basada en Ingresos:
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem', 'grid-template-columns': '1fr 1fr' }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem', background: '#eff6ff', 'border-radius': '4px' }}>
                      <span style={{ 'font-size': '0.875rem' }}>Anual:</span>
                      <strong style={{ color: '#1e40af' }}>{taxCalculationService.formatCurrency(result.recommendedWithholding.annual)}</strong>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem', background: '#eff6ff', 'border-radius': '4px' }}>
                      <span style={{ 'font-size': '0.875rem' }}>Mensual:</span>
                      <strong style={{ color: '#1e40af' }}>{taxCalculationService.formatCurrency(result.recommendedWithholding.monthly)}</strong>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem', background: '#eff6ff', 'border-radius': '4px' }}>
                      <span style={{ 'font-size': '0.875rem' }}>Quincenal:</span>
                      <strong style={{ color: '#1e40af' }}>{taxCalculationService.formatCurrency(result.recommendedWithholding.biweekly)}</strong>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem', background: '#eff6ff', 'border-radius': '4px' }}>
                      <span style={{ 'font-size': '0.875rem' }}>Semanal:</span>
                      <strong style={{ color: '#1e40af' }}>{taxCalculationService.formatCurrency(result.recommendedWithholding.weekly)}</strong>
                    </div>
                  </div>
                </div>

                {/* W-4 Recommendation */}
                <div style={{ padding: '1rem', background: '#f0f9ff', 'border-radius': '6px', border: '1px solid #bfdbfe' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#1e40af' }}>
                    📝 Recomendación W-4:
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: '#1f2937' }}>
                    Basado en su ingreso y responsabilidad fiscal, considere declarar{' '}
                    <strong style={{ color: '#1e40af' }}>
                      {result.recommendedWithholding.recommendedW4Allowances} {result.recommendedWithholding.recommendedW4Allowances === 1 ? 'dependiente' : 'dependientes'}
                    </strong>{' '}
                    en su formulario W-4 para una retención más precisa.
                  </div>
                  <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-top': '0.5rem' }}>
                    💡 Nota: Esta es una estimación simplificada. Consulte las instrucciones del IRS Form W-4 para un cálculo más preciso.
                  </div>
                </div>
              </div>

              {/* Final Result */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                'border-radius': 'var(--border-radius-sm)',
                border: `3px solid ${isRefund ? '#10b981' : '#ef4444'}`
              }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <h4 style={{ margin: '0', 'font-size': '1.5rem' }}>
                    {isRefund ? 'Devolución Esperada:' : 'Impuesto Adeudado:'}
                  </h4>
                  <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: isRefund ? '#10b981' : '#ef4444' }}>
                    {taxCalculationService.formatCurrency(isRefund ? result.refundAmount : result.taxDue)}
                  </div>
                </div>
              </div>

              {/* Form 1040 Line-by-Line Breakdown */}
              <div style={{ background: 'white', padding: '1.5rem', 'border-radius': 'var(--border-radius-sm)', 'margin-bottom': '1.5rem', border: '2px solid #6366f1' }}>
                <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem', color: '#4338ca', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  📄 Desglose Completo - Formulario 1040 (38 Líneas)
                </h4>

                <div style={{ 'font-size': '0.875rem' }}>
                  {/* Filing Status & Dependents */}
                  <div style={{ 'margin-bottom': '1.5rem', padding: '1rem', background: '#f0f9ff', 'border-radius': '6px' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#1e40af' }}>
                      📋 Estado Civil y Dependientes
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                        <span>Estado Civil:</span>
                        <strong>{
                          customerInfo().filingStatus === 'single' ? 'Soltero(a)' :
                          customerInfo().filingStatus === 'married_joint' ? 'Casado(a) - Declaración Conjunta' :
                          customerInfo().filingStatus === 'married_separate' ? 'Casado(a) - Declaración Separada' :
                          'Jefe de Familia'
                        }</strong>
                      </div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                        <span>Número de Dependientes:</span>
                        <strong>{customerInfo().dependents}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Income Section (Lines 1-9) */}
                  <div style={{ 'margin-bottom': '1.5rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#059669', background: '#d1fae5', padding: '0.5rem', 'border-radius': '4px' }}>
                      💰 Ingresos (Líneas 1-9)
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', 'margin-left': '0.5rem' }}>
                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 1z:</strong> Salarios, sueldos, propinas</span>
                          <strong>{taxCalculationService.formatCurrency(result.totalW2Income)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Suma de todos los formularios W-2 (Box 1)
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Líneas 2a-7:</strong> Intereses, dividendos, otros ingresos</span>
                          <strong>$0.00</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 No aplicable en este cálculo
                        </div>
                      </div>

                      <Show when={result.total1099InvestmentIncome > 0}>
                        <div style={{ padding: '0.5rem', background: '#f0fdf4', 'border-radius': '4px', border: '1px solid #10b981' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Líneas 2b-3b:</strong> Intereses y Dividendos (Schedule B)</span>
                            <strong>{taxCalculationService.formatCurrency(result.total1099InvestmentIncome)}</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#059669' }}>
                            ✓ Ingresos de inversión (1099-INT + 1099-DIV) - No sujeto a SE tax
                          </div>
                        </div>
                      </Show>

                      <Show when={result.netSelfEmploymentIncome !== 0}>
                        <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Línea 8:</strong> Ingreso (o pérdida) del Schedule C</span>
                            <strong>{taxCalculationService.formatCurrency(result.netSelfEmploymentIncome)}</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                            📊 Ingresos 1099 SE (NEC + MISC): {taxCalculationService.formatCurrency(result.total1099SelfEmploymentIncome)} - Gastos de Negocio: {taxCalculationService.formatCurrency(result.totalBusinessExpenses)}
                          </div>
                        </div>
                      </Show>

                      <div style={{ padding: '0.5rem', background: '#d1fae5', 'border-radius': '4px', border: '1px solid #10b981' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                          <span><strong>Línea 9:</strong> Ingreso Total</span>
                          <strong>{taxCalculationService.formatCurrency(result.totalIncome)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#065f46' }}>
                          📊 Línea 1z + Línea 8 = {taxCalculationService.formatCurrency(result.totalW2Income)} + {taxCalculationService.formatCurrency(result.netSelfEmploymentIncome)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adjustments (Line 10) */}
                  <div style={{ 'margin-bottom': '1.5rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#0891b2', background: '#cffafe', padding: '0.5rem', 'border-radius': '4px' }}>
                      🔧 Ajustes al Ingreso (Línea 10)
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', 'margin-left': '0.5rem' }}>
                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 10:</strong> Ajustes al ingreso (Schedule 1)</span>
                          <strong>{taxCalculationService.formatCurrency(result.selfEmploymentTaxDeduction)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Deducción del impuesto de trabajo por cuenta propia (50% de {taxCalculationService.formatCurrency(result.selfEmploymentTax)})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AGI (Line 11) */}
                  <div style={{ 'margin-bottom': '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: '#dbeafe', 'border-radius': '4px', border: '2px solid #3b82f6' }}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                        <span><strong>Línea 11:</strong> Ingreso Bruto Ajustado (AGI)</span>
                        <strong style={{ color: '#1e40af', 'font-size': '1.1rem' }}>{taxCalculationService.formatCurrency(result.adjustedGrossIncome)}</strong>
                      </div>
                      <div style={{ 'font-size': '0.75rem', color: '#1e40af' }}>
                        📊 Línea 9 - Línea 10 = {taxCalculationService.formatCurrency(result.totalIncome)} - {taxCalculationService.formatCurrency(result.selfEmploymentTaxDeduction)}
                      </div>
                    </div>
                  </div>

                  {/* Standard Deduction (Line 12) */}
                  <div style={{ 'margin-bottom': '1.5rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#7c3aed', background: '#f3e8ff', padding: '0.5rem', 'border-radius': '4px' }}>
                      📉 Deducciones (Líneas 12-13)
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', 'margin-left': '0.5rem' }}>
                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 12:</strong> Deducción estándar o detallada</span>
                          <strong>{taxCalculationService.formatCurrency(result.deductionAmount)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Deducción {result.deductionUsed === 'standard' ? 'Estándar' : 'Detallada'} para {
                            customerInfo().filingStatus === 'single' ? 'Soltero(a)' :
                            customerInfo().filingStatus === 'married_joint' ? 'Casado(a) - Declaración Conjunta' :
                            customerInfo().filingStatus === 'married_separate' ? 'Casado(a) - Declaración Separada' :
                            'Jefe de Familia'
                          }
                        </div>
                      </div>

                      <Show when={result.qbiDeduction > 0}>
                        <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Línea 13:</strong> Deducción de Ingreso de Negocio Calificado</span>
                            <strong>{taxCalculationService.formatCurrency(result.qbiDeduction)}</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                            📊 Form 8995: Menor entre 20% del QBI o 20% del ingreso gravable antes de QBI
                          </div>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Taxable Income (Line 15) */}
                  <div style={{ 'margin-bottom': '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: '#fef3c7', 'border-radius': '4px', border: '2px solid #f59e0b' }}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                        <span><strong>Línea 15:</strong> Ingreso Gravable</span>
                        <strong style={{ color: '#92400e', 'font-size': '1.1rem' }}>{taxCalculationService.formatCurrency(result.taxableIncome)}</strong>
                      </div>
                      <div style={{ 'font-size': '0.75rem', color: '#92400e' }}>
                        📊 Línea 11 - Línea 12 - Línea 13 = {taxCalculationService.formatCurrency(result.adjustedGrossIncome)} - {taxCalculationService.formatCurrency(result.deductionAmount)} - {taxCalculationService.formatCurrency(result.qbiDeduction)}
                      </div>
                    </div>
                  </div>

                  {/* Tax (Line 16) */}
                  <div style={{ 'margin-bottom': '1.5rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem', 'border-radius': '4px' }}>
                      💸 Impuestos (Líneas 16-24)
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', 'margin-left': '0.5rem' }}>
                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 16:</strong> Impuesto (de tablas de impuestos)</span>
                          <strong>{taxCalculationService.formatCurrency(result.federalTaxLiability)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Calculado usando las tablas de impuestos 2024 en el ingreso gravable
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Líneas 17-18:</strong> Impuestos adicionales</span>
                          <strong>$0.00</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 No aplicable (AMT, impuesto sobre ingresos no reportados, etc.)
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#ecfdf5', 'border-radius': '4px', border: '1px solid #10b981' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 19:</strong> Créditos no-reembolsables (Schedule 3)</span>
                          <strong style={{ color: '#059669' }}>-{taxCalculationService.formatCurrency(result.childTaxCredit)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#065f46' }}>
                          📊 Crédito Tributario por Hijos (limitado al impuesto de Línea 16)
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Líneas 20-22:</strong> Otros impuestos</span>
                          <strong>$0.00</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 No aplicable (impuestos adicionales)
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 23:</strong> Agregar Schedule 2, línea 21</span>
                          <strong>{taxCalculationService.formatCurrency(result.selfEmploymentTax)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Schedule SE: Impuesto de trabajo por cuenta propia (15.3% de {taxCalculationService.formatCurrency(result.netSelfEmploymentIncome * 0.9235)})
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#fee2e2', 'border-radius': '4px', border: '1px solid #ef4444' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                          <span><strong>Línea 24:</strong> Impuesto Total</span>
                          <strong style={{ color: '#dc2626' }}>{taxCalculationService.formatCurrency(Math.max(0, result.federalTaxLiability - result.childTaxCredit) + result.selfEmploymentTax)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#991b1b' }}>
                          📊 (Línea 16 - Créditos No-reembolsables) + Línea 23 = ({taxCalculationService.formatCurrency(result.federalTaxLiability)} - {taxCalculationService.formatCurrency(result.childTaxCredit)}) + {taxCalculationService.formatCurrency(result.selfEmploymentTax)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credits (Lines 25-32) */}
                  <div style={{ 'margin-bottom': '1.5rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#059669', background: '#d1fae5', padding: '0.5rem', 'border-radius': '4px' }}>
                      ✨ Créditos (Líneas 25-32)
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', 'margin-left': '0.5rem' }}>
                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 25:</strong> Pagos federales retenidos (W-2, 1099)</span>
                          <strong>{taxCalculationService.formatCurrency(result.totalWithheld)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Suma de retenciones federales de todos los formularios W-2 y 1099
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 26:</strong> Pagos estimados de impuestos 2024</span>
                          <strong>$0.00</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 No aplicable en este cálculo
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 27:</strong> Crédito por Ingreso del Trabajo (EIC)</span>
                          <strong>{taxCalculationService.formatCurrency(result.earnedIncomeCredit)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Schedule EIC: Calculado para {customerInfo().dependents} {customerInfo().dependents === 1 ? 'hijo' : 'hijos'} calificados con AGI de {taxCalculationService.formatCurrency(result.adjustedGrossIncome)}
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 28:</strong> Crédito Tributario Adicional por Hijos</span>
                          <strong>{taxCalculationService.formatCurrency(result.additionalChildTaxCredit)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 Schedule 8812: 15% × (Ingresos del Trabajo - $2,500), limitado al CTC no utilizado
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Línea 29:</strong> Crédito de Oportunidad Americana</span>
                          <strong>$0.00</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 No aplicable en este cálculo
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                          <span><strong>Líneas 30-31:</strong> Otros créditos y pagos</span>
                          <strong>$0.00</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                          📊 No aplicable (recuperación de crédito, Schedule 3, etc.)
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', background: '#d1fae5', 'border-radius': '4px', border: '1px solid #10b981' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                          <span><strong>Línea 32:</strong> Total de Créditos y Pagos</span>
                          <strong style={{ color: '#059669' }}>{taxCalculationService.formatCurrency(result.totalWithheld + result.earnedIncomeCredit + result.additionalChildTaxCredit)}</strong>
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: '#065f46' }}>
                          📊 Línea 25 (retención) + Línea 27 (EIC) + Línea 28 (ACTC) = {taxCalculationService.formatCurrency(result.totalWithheld)} + {taxCalculationService.formatCurrency(result.earnedIncomeCredit)} + {taxCalculationService.formatCurrency(result.additionalChildTaxCredit)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Refund or Amount Owed (Lines 33-38) */}
                  <div style={{ 'margin-bottom': '0' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: isRefund ? '#059669' : '#dc2626', background: isRefund ? '#d1fae5' : '#fee2e2', padding: '0.5rem', 'border-radius': '4px' }}>
                      {isRefund ? '💰 Devolución (Líneas 33-35a)' : '⚠️ Cantidad Adeudada (Líneas 33-37)'}
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem', 'margin-left': '0.5rem' }}>
                      <Show when={isRefund}>
                        <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Línea 33:</strong> Cantidad pagada en exceso</span>
                            <strong>{taxCalculationService.formatCurrency(result.refundAmount)}</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                            📊 Si Línea 32 {'>'} Línea 24, restar Línea 24 de Línea 32
                          </div>
                        </div>

                        <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Línea 34:</strong> Cantidad a aplicar al impuesto estimado 2025</span>
                            <strong>$0.00</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                            📊 Opcional - aplicar parte del reembolso a impuestos estimados del próximo año
                          </div>
                        </div>

                        <div style={{ padding: '0.75rem', background: '#d1fae5', 'border-radius': '4px', border: '2px solid #10b981' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Línea 35a:</strong> Cantidad a Reembolsar</span>
                            <strong style={{ color: '#059669', 'font-size': '1.25rem' }}>{taxCalculationService.formatCurrency(result.refundAmount)}</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#065f46' }}>
                            📊 Línea 33 - Línea 34
                          </div>
                        </div>
                      </Show>

                      <Show when={!isRefund}>
                        <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Línea 37:</strong> Cantidad que adeuda</span>
                            <strong>{taxCalculationService.formatCurrency(result.taxDue)}</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                            📊 Si Línea 24 {'>'} Línea 32, restar Línea 32 de Línea 24
                          </div>
                        </div>

                        <div style={{ padding: '0.5rem', background: '#f9fafb', 'border-radius': '4px' }}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                            <span><strong>Línea 38:</strong> Multa por pago insuficiente estimado</span>
                            <strong>$0.00</strong>
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                            📊 Form 2210 si aplica - no calculado en esta versión
                          </div>
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>
              </div>

              {/* State Tax - Kentucky */}
              <Show when={result.stateTaxState === 'KY'}>
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1.5rem'
                }}>
                  <h4 style={{ 'margin-top': '0', 'margin-bottom': '1rem', color: '#1f2937' }}>
                    🏛️ Impuesto Estatal — Kentucky (Tasa Fija {(result.stateTaxRate * 100).toFixed(0)}%)
                  </h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Ingreso Bruto Ajustado (AGI):</span>
                      <strong>{taxCalculationService.formatCurrency(result.adjustedGrossIncome)}</strong>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Deducción Estándar Estatal KY:</span>
                      <strong>-{taxCalculationService.formatCurrency(result.adjustedGrossIncome - result.stateTaxableIncome)}</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'padding-top': '0.5rem',
                      'border-top': '1px solid #e5e7eb'
                    }}>
                      <span>Ingreso Gravable Estatal:</span>
                      <strong>{taxCalculationService.formatCurrency(result.stateTaxableIncome)}</strong>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Impuesto Estatal ({(result.stateTaxRate * 100).toFixed(0)}%):</span>
                      <strong>{taxCalculationService.formatCurrency(result.stateTaxLiability)}</strong>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>Impuesto Estatal Retenido (W-2 Box 17):</span>
                      <strong>-{taxCalculationService.formatCurrency(result.stateTaxWithheld)}</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'padding-top': '0.75rem',
                      'border-top': '2px solid #e5e7eb',
                      'font-size': '1.1rem'
                    }}>
                      <span style={{ 'font-weight': '600' }}>
                        {result.stateTaxRefund > 0 ? 'Devolución Estatal:' : 'Impuesto Estatal Adeudado:'}
                      </span>
                      <strong style={{
                        color: result.stateTaxRefund > 0 ? '#10b981' : result.stateTaxDue > 0 ? '#ef4444' : '#1f2937'
                      }}>
                        {taxCalculationService.formatCurrency(result.stateTaxRefund > 0 ? result.stateTaxRefund : result.stateTaxDue)}
                      </strong>
                    </div>
                  </div>
                </div>
              </Show>

              {/* All Tax Schedules */}
              <AllSchedules
                formData={{
                  customerInfo: customerInfo(),
                  w2Forms: w2Forms(),
                  form1099s: form1099s(),
                  deductions: deductions(),
                  businessExpenses: businessExpenses(),
                  retirementContributions: retirementContributions(),
                  rentalProperties: rentalProperties(),
                  partnershipIncomes: partnershipIncomes(),
                  estateIncomes: estateIncomes()
                }}
                calculationResult={result}
              />

              {/* Disclaimer */}
              <div style={{
                'margin-top': '1.5rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem',
                color: 'var(--text-secondary)'
              }}>
                <strong>⚠️ Nota Importante:</strong> Este es un cálculo estimado basado en las tarifas de impuestos federales de 2024.
                Los resultados reales pueden variar según circunstancias individuales, deducciones adicionales, créditos, y otros factores.
                Consulte con un profesional de impuestos para obtener asesoramiento personalizado.
              </div>
            </div>
          );
        }}
      </Show>
      </div>
        </div>
      </div>
    </div>
  );
};

export default TaxReturnCalculator;







/*


 
 Income Section:
  - Line 1a (W-2 wages) 69807
  - Line 8 (Schedule C business income) 0 
  - Line 9 (Total income) 69807
  - Line 11 (AGI) - you said $ 69,807

  Deduction Section:
  - Line 12 (Standard deduction)  21900
  - Line 15 (Taxable income) - you said 47,907

  Tax Section:
  - Line 16 (Tax) - Critical! $5,418
  - Line 19 (Non-refundable credits) - you said $2,000
  - Line 23 (SE Tax) - Critical!  0
  - Line 24 (Total tax) - Critical! 3418

  Credits/Payments Section:
  - Line 25 (Federal tax withheld) 5420
  - Line 28 (Additional CTC) - Critical! 0
  - Line 32 (Total payments) - Critical! 5,420
  - Line 35a (Refund) - showing $2,002

*/