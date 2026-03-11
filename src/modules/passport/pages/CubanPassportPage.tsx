import { Component, createSignal, Show } from 'solid-js';
import { CubanPassportForm } from '../';
import { CubanPassportForm as CubanPassportData } from '../types/cubanPassport';
import PassportApplicationsList from '../components/PassportApplicationsList';
import { SavedPassportApplication } from '../services/cubanPassportApiService';
import cubanPassportApiService from '../services/cubanPassportApiService';
import { Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

const CubanPassportPage: Component = () => {
  const { t } = useTranslation();
  
  // View mode: 'form' | 'list'
  const [currentView, setCurrentView] = createSignal<'form' | 'list'>('list');
  const [editingApplication, setEditingApplication] = createSignal<SavedPassportApplication | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);
  
  const handleFormSubmit = async (data: CubanPassportData) => {
    try {
      setLoading(true);
      setSaveMessage(null);
      
      if (editingApplication()) {
        // Update existing application
        await cubanPassportApiService.updatePassportApplication(editingApplication()!.id, {
          applicationData: data,
          status: 'submitted'
        });
        setSaveMessage({ type: 'success', text: t('passport.cuban.messages.submitSuccess') });
      } else {
        // Create new application
        await cubanPassportApiService.createPassportApplication({
          applicationData: data,
          status: 'submitted'
        });
        setSaveMessage({ type: 'success', text: t('passport.cuban.messages.submitSuccess') });
      }
      
      // Reset form and go to list view
      setTimeout(() => {
        setEditingApplication(null);
        setCurrentView('list');
      }, 2000);
      
    } catch (error) {
      devLog('Error submitting passport application:', error);
      setSaveMessage({ type: 'error', text: t('passport.cuban.messages.submitError') });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectApplication = (application: SavedPassportApplication) => {
    setEditingApplication(application);
    setCurrentView('form');
  };
  
  const handleEditApplication = (application: SavedPassportApplication) => {
    setEditingApplication(application);
    setCurrentView('form');
  };
  
  const handleNewApplication = () => {
    setEditingApplication(null);
    setCurrentView('form');
  };
  
  const handleSaveApplication = async (data: CubanPassportData) => {
    try {
      setLoading(true);
      setSaveMessage(null);
      
      if (editingApplication()) {
        // Update existing application as draft
        await cubanPassportApiService.updatePassportApplication(editingApplication()!.id, {
          applicationData: data,
          status: 'draft'
        });
        setSaveMessage({ type: 'success', text: t('passport.cuban.messages.saveSuccess') });
      } else {
        // Create new application as draft
        const savedApp = await cubanPassportApiService.createPassportApplication({
          applicationData: data,
          status: 'draft'
        });
        setEditingApplication(savedApp);
        setSaveMessage({ type: 'success', text: t('passport.cuban.messages.saveSuccess') });
      }
      
    } catch (error) {
      devLog('Error saving passport application:', error);
      setSaveMessage({ type: 'error', text: t('passport.cuban.messages.saveError') });
    } finally {
      setLoading(false);
    }
  };
  
  // Example initial data (can be loaded from API)
  const initialData: Partial<CubanPassportData> = {
    // You can pre-fill some fields if needed
    lugarNacimiento: {
      pais: 'CUBA',
      provincia: '',
      municipio: '',
      diaNacimiento: '',
      mesNacimiento: '',
      anoNacimiento: ''
    },
    direccionActual: {
      calle: '',
      provincia: '',
      municipio: '',
      pais: 'ESTADOS UNIDOS',
      codigoPostal: ''
    }
  };
  
  return (
    <div style={{ 'max-width': '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{
        'text-align': 'center',
        'margin-bottom': '2rem'
      }}>
        <h1 style={{
          'font-size': '2rem',
          'font-weight': '700',
          color: 'var(--text-primary)',
          'margin-bottom': '0.5rem'
        }}>
          {t('passport.cuban.pageTitle')}
        </h1>
        <p style={{
          color: 'var(--text-muted)',
          'font-size': '1.125rem',
          'margin-bottom': '1.5rem'
        }}>
          {currentView() === 'form' 
            ? (editingApplication() 
                ? t('passport.cuban.formViewEdit') 
                : t('passport.cuban.formViewNew'))
            : t('passport.cuban.listView')
          }
        </p>
        
        {/* View Toggle Buttons */}
        <div style={{
          display: 'flex',
          'justify-content': 'center',
          gap: '1rem',
          'margin-bottom': '2rem'
        }}>
          <Button
            onClick={() => setCurrentView('list')}
            variant={currentView() === 'list' ? 'primary' : 'secondary'}
          >
            📋 {t('passport.cuban.buttons.viewApplications')}
          </Button>
          <Button
            onClick={handleNewApplication}
            variant={currentView() === 'form' && !editingApplication() ? 'primary' : 'secondary'}
          >
            ➕ {t('passport.cuban.buttons.newApplication')}
          </Button>
        </div>
      </div>
      
      {/* Instructions - Only show for form view */}
      <Show when={currentView() === 'form'}>
        <div style={{
          background: 'var(--warning-light)',
          padding: '1rem',
          'border-radius': 'var(--border-radius)',
          'margin-bottom': '2rem',
          border: '1px solid var(--warning-color)'
        }}>
          <h3 style={{
            'font-size': '1.125rem',
            'font-weight': '600',
            'margin-bottom': '0.5rem',
            color: 'var(--warning-dark)'
          }}>
            {t('passport.cuban.instructions.title', 'Important Instructions')}
          </h3>
          <ul style={{
            'margin-left': '1.5rem',
            'font-size': '0.875rem',
            color: 'var(--text-primary)'
          }}>
            <li>{t('passport.cuban.instructions.1', 'All names should be entered in UPPERCASE letters')}</li>
            <li>{t('passport.cuban.instructions.2', 'Ensure all information matches your official documents')}</li>
            <li>{t('passport.cuban.instructions.3', 'Upload a clear image of your signature on white paper')}</li>
            <li>{t('passport.cuban.instructions.4', 'The generated PDF will match the official Cuban passport form format')}</li>
            <li>{t('passport.cuban.instructions.5', 'You will need to print the form and add a 4.5 x 4.5 cm photo')}</li>
            <li><strong>Auto-guardado:</strong> {t('passport.cuban.instructions.autoSave')}</li>
          </ul>
        </div>
      </Show>
      
      {/* Save Messages */}
      <Show when={saveMessage()}>
        <div style={{
          padding: '1rem',
          'margin-bottom': '1rem',
          'border-radius': 'var(--border-radius)',
          background: saveMessage()!.type === 'success' ? 'var(--success-light)' : 'var(--error-light)',
          color: saveMessage()!.type === 'success' ? 'var(--success-dark)' : 'var(--error-dark)',
          border: `1px solid ${saveMessage()!.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`
        }}>
          <strong>{saveMessage()!.type === 'success' ? '✓ Éxito:' : '⚠ Error:'}</strong> {saveMessage()!.text}
        </div>
      </Show>

      {/* Main Content */}
      <Show when={currentView() === 'form'}>
        <CubanPassportForm
          onSubmit={handleFormSubmit}
          initialData={editingApplication()?.applicationData || initialData}
          applicationId={editingApplication()?.id}
          onSave={handleSaveApplication}
          loading={loading()}
        />
      </Show>
      
      <Show when={currentView() === 'list'}>
        <PassportApplicationsList
          onSelectApplication={handleSelectApplication}
          onEditApplication={handleEditApplication}
          showActions={true}
        />
      </Show>
      
      <div style={{
        'margin-top': '3rem',
        padding: '1.5rem',
        background: 'var(--gray-50)',
        'border-radius': 'var(--border-radius)',
        'text-align': 'center'
      }}>
        <h3 style={{
          'font-size': '1.25rem',
          'font-weight': '600',
          'margin-bottom': '1rem',
          color: 'var(--text-primary)'
        }}>
          {t('passport.cuban.help.title', 'Need Help?')}
        </h3>
        <p style={{
          'font-size': '1rem',
          color: 'var(--text-muted)',
          'margin-bottom': '1rem'
        }}>
          {t('passport.cuban.help.description', 'For assistance with your passport application, contact the nearest Cuban consulate.')}
        </p>
        <div style={{
          display: 'flex',
          'justify-content': 'center',
          gap: '2rem',
          'flex-wrap': 'wrap'
        }}>
          <div>
            <h4 style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
              {t('passport.cuban.help.phone', 'Phone')}
            </h4>
            <p style={{ color: 'var(--primary-color)' }}>1-800-CUBA-PASS</p>
          </div>
          <div>
            <h4 style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
              {t('passport.cuban.help.email', 'Email')}
            </h4>
            <p style={{ color: 'var(--primary-color)' }}>pasaportes@consuladocuba.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CubanPassportPage;