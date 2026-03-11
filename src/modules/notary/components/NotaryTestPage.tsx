import { Component } from 'solid-js';
import { Card } from '../../ui';
import { NotaryCustomerManager } from '../index';

const NotaryTestPage: Component = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <Card>
        <div style={{ padding: '2rem', 'text-align': 'center' }}>
          <h1 style={{ 
            'font-size': '2rem', 
            'margin-bottom': '1rem',
            color: 'var(--primary-color)' 
          }}>
            🏛️ Sistema de Clientes Notariales
          </h1>
          <p style={{ 
            'font-size': '1.125rem',
            color: 'var(--text-muted)',
            'margin-bottom': '2rem' 
          }}>
            Gestión completa de clientes para servicios notariales
          </p>
          
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            'margin-bottom': '2rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: 'var(--success-light)',
              'border-radius': 'var(--border-radius)',
              'text-align': 'center'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>👥</div>
              <h3 style={{ 'margin-bottom': '0.5rem' }}>Gestión de Clientes</h3>
              <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Administra información completa de clientes notariales
              </p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'var(--primary-light)',
              'border-radius': 'var(--border-radius)',
              'text-align': 'center'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>🔍</div>
              <h3 style={{ 'margin-bottom': '0.5rem' }}>Búsqueda Avanzada</h3>
              <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Encuentra clientes por múltiples criterios
              </p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'var(--info-light)',
              'border-radius': 'var(--border-radius)',
              'text-align': 'center'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📋</div>
              <h3 style={{ 'margin-bottom': '0.5rem' }}>Historial Completo</h3>
              <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Residencias, educación, empleo e inmigración
              </p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'var(--warning-light)',
              'border-radius': 'var(--border-radius)',
              'text-align': 'center'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📄</div>
              <h3 style={{ 'margin-bottom': '0.5rem' }}>Documentos</h3>
              <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Pasaportes, certificados y firmas digitales
              </p>
            </div>
          </div>
        </div>
      </Card>
      
      <div style={{ 'margin-top': '1rem' }}>
        <NotaryCustomerManager />
      </div>
    </div>
  );
};

export default NotaryTestPage;