import { Component, createSignal } from 'solid-js';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { FormInput } from '../../ui';
import { FormSelect } from '../../ui';
import { useTranslation } from '../../../translations';
import { Employee, employeeStore } from '../stores/employeeStore';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddEmployeeModal: Component<AddEmployeeModalProps> = (props) => {
  const { t } = useTranslation();
  const [formData, setFormData] = createSignal({
    name: '',
    position: '',
    salary: '',
    email: '',
    phone: '',
    department: '',
    startDate: '',
    payType: 'salary' as 'hourly' | 'salary',
    hourlyRate: '',
    annualSalary: '',
    overtimeRate: '1.5',
    standardHoursPerWeek: '40',
    taxRate: '',
    insuranceDeduction: ''
  });

  const departmentOptions = [
    { value: 'Engineering', label: t('employees.departments.engineering', 'Engineering') },
    { value: 'Product', label: t('employees.departments.product', 'Product') },
    { value: 'Design', label: t('employees.departments.design', 'Design') },
    { value: 'Marketing', label: t('employees.departments.marketing', 'Marketing') },
    { value: 'Sales', label: t('employees.departments.sales', 'Sales') },
    { value: 'Human Resources', label: t('employees.departments.humanResources', 'Human Resources') },
    { value: 'Finance', label: t('employees.departments.finance', 'Finance') },
    { value: 'Operations', label: t('employees.departments.operations', 'Operations') },
    { value: 'Analytics', label: t('employees.departments.analytics', 'Analytics') }
  ];

  const payTypeOptions = [
    { value: 'salary', label: 'Salary' },
    { value: 'hourly', label: 'Hourly' }
  ];

  const sectionStyle = {
    'margin-bottom': '1.5rem',
    'padding-bottom': '1.5rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const data = formData();

    if (!data.name  ||  !data.department ) {
      alert(t('forms.requiredField'));
      return;
    }

    const newEmployee: Omit<Employee, 'id'> = {
      name: data.name,
      position: data.position,
      salary: parseFloat(data.salary),
      email: data.email,
      phone: data.phone,
      department: data.department,
      startDate: data.startDate,
      payType: data.payType,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
      annualSalary: data.annualSalary ? parseFloat(data.annualSalary) : undefined,
      overtimeRate: data.overtimeRate ? parseFloat(data.overtimeRate) : undefined,
      standardHoursPerWeek: data.standardHoursPerWeek ? parseFloat(data.standardHoursPerWeek) : undefined,
      taxRate: data.taxRate ? parseFloat(data.taxRate) : undefined,
      insuranceDeduction: data.insuranceDeduction ? parseFloat(data.insuranceDeduction) : undefined
    };

    employeeStore.addEmployee(newEmployee);

    // Reset form
    setFormData({
      name: '',
      position: '',
      salary: '',
      email: '',
      phone: '',
      department: '',
      startDate: '',
      payType: 'salary',
      hourlyRate: '',
      annualSalary: '',
      overtimeRate: '1.5',
      standardHoursPerWeek: '40',
      taxRate: '',
      insuranceDeduction: ''
    });

    props.onClose();
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('employees.addEmployee')}>
      <form onSubmit={handleSubmit}>
        {/* Basic Information Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Basic Information</div>

          <FormInput
            label={t('employees.fullName')}
            value={formData().name}
            onChange={(value) => updateFormData('name', value)}
            placeholder={t('employees.enterFullName', "Enter employee's full name")}
            required
          />

          <FormInput
            label={t('employees.position')}
            value={formData().position}
            onChange={(value) => updateFormData('position', value)}
            placeholder={t('employees.enterPosition', 'Enter job position')}
            
          />

          <FormSelect
            label={t('employees.department')}
            value={formData().department}
            onChange={(value) => updateFormData('department', value)}
            options={departmentOptions}
            required
          />

          <FormInput
            label={t('employees.email')}
            type="email"
            value={formData().email}
            onChange={(value) => updateFormData('email', value)}
            placeholder={t('employees.enterEmail', 'Enter email address')}
            
          />

          <FormInput
            label={t('employees.phone')}
            type="tel"
            value={formData().phone}
            onChange={(value) => updateFormData('phone', value)}
            placeholder={t('employees.enterPhone', 'Enter phone number')}
          />

          <FormInput
            label={t('employees.hireDate')}
            type="date"
            value={formData().startDate}
            onChange={(value) => updateFormData('startDate', value)}
           
          />
        </div>

        {/* Payroll Settings Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Payroll Settings</div>

          <FormSelect
            label="Pay Type"
            value={formData().payType}
            onChange={(value) => updateFormData('payType', value)}
            options={payTypeOptions}
          />

          <FormInput
            label={t('employees.salary')}
            type="number"
            value={formData().salary}
            onChange={(value) => updateFormData('salary', value)}
            placeholder={t('employees.enterSalary', 'Enter annual salary')}
           
          />

          {formData().payType === 'hourly' && (
            <FormInput
              label="Hourly Rate"
              type="number"
              step="0.01"
              value={formData().hourlyRate}
              onChange={(value) => updateFormData('hourlyRate', value)}
              placeholder="Enter hourly rate"
            />
          )}

          {formData().payType === 'salary' && (
            <FormInput
              label="Annual Salary"
              type="number"
              step="0.01"
              value={formData().annualSalary}
              onChange={(value) => updateFormData('annualSalary', value)}
              placeholder="Enter annual salary"
            />
          )}

          <FormInput
            label="Standard Hours Per Week"
            type="number"
            value={formData().standardHoursPerWeek}
            onChange={(value) => updateFormData('standardHoursPerWeek', value)}
            placeholder="Enter standard hours per week (e.g., 40)"
          />

          <FormInput
            label="Overtime Rate Multiplier"
            type="number"
            step="0.1"
            value={formData().overtimeRate}
            onChange={(value) => updateFormData('overtimeRate', value)}
            placeholder="Enter overtime rate (e.g., 1.5 for time-and-a-half)"
          />
        </div>

        {/* Deductions Section */}
        <div>
          <div style={sectionTitleStyle}>Deductions</div>

          <FormInput
            label="Tax Rate (%)"
            type="number"
            step="0.1"
            value={formData().taxRate}
            onChange={(value) => updateFormData('taxRate', value)}
            placeholder="Enter tax rate percentage"
          />

          <FormInput
            label="Insurance Deduction ($)"
            type="number"
            step="0.01"
            value={formData().insuranceDeduction}
            onChange={(value) => updateFormData('insuranceDeduction', value)}
            placeholder="Enter insurance deduction amount"
          />
        </div>

        <div style={buttonGroupStyle}>
          <Button variant="secondary" type="button" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('employees.addEmployee')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddEmployeeModal;