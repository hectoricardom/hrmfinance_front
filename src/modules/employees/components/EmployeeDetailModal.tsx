import { Component, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { Employee } from '../stores/employeeStore';
import EditEmployeeModal from './EditEmployeeModal';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const EmployeeDetailModal: Component<EmployeeDetailModalProps> = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = createSignal(false);

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const avatarStyle = {
    width: '80px',
    height: '80px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-800))',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'font-weight': '600',
    'font-size': '1.5rem',
    margin: '0 auto 1.5rem auto',
    'box-shadow': '0 6px 16px rgba(108, 92, 231, 0.3)'
  };

  const headerStyle = {
    'text-align': 'center',
    'margin-bottom': '2rem'
  };

  const nameStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0.5rem 0'
  };

  const positionStyle = {
    color: 'var(--text-muted)',
    'font-size': '1rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  //if (!props.employee) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(salary);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('employees.employeeDetails')} size="large">
        <div style={headerStyle}>
          <div style={avatarStyle}>
            {getInitials(props.employee.name)}
          </div>
          <div style={nameStyle}>{props.employee.name}</div>
          <div style={positionStyle}>{props.employee.position}</div>
        </div>

        <div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('employees.employeeId')}</span>
            <span style={valueStyle}>{props.employee.id}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('employees.department')}</span>
            <span style={valueStyle}>{props.employee.department}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('employees.email')}</span>
            <span style={valueStyle}>{props.employee.email}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('employees.phone')}</span>
            <span style={valueStyle}>{props.employee.phone}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('employees.salary')}</span>
            <span style={valueStyle}>{formatSalary(props.employee.salary)}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>{t('employees.hireDate')}</span>
            <span style={valueStyle}>{formatDate(props.employee.startDate)}</span>
          </div>
        </div>

        <div style={buttonGroupStyle}>
          <Button variant="secondary" onClick={props.onClose}>
            {t('common.close')}
          </Button>
          <button
            onClick={() => {
              props.onClose();
              navigate(`/timesheets?employee=${props.employee!.id}`);
            }}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-700))',
              color: 'white',
              border: 'none',
              'border-radius': '0.375rem',
              'font-weight': '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              'font-size': '0.875rem',
              'box-shadow': '0 2px 8px rgba(108, 92, 231, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 92, 231, 0.4)';
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--blue-ribbon-600), var(--blue-ribbon-800))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 92, 231, 0.3)';
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-700))';
            }}
          >
            📅 View Timesheet
          </button>
          <Button variant="primary" onClick={() => setIsEditModalOpen(true)}>
            {t('employees.editEmployee')}
          </Button>
        </div>
      </Modal>

      <EditEmployeeModal
        isOpen={isEditModalOpen()}
        onClose={() => setIsEditModalOpen(false)}
        employee={props.employee}
      />
    </>
  );
};

export default EmployeeDetailModal;