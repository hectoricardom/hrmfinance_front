import { Component, createMemo, For, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { NotaryCustomer } from '../types';
import { processClientData, ProcessedClientData } from '../services/clientDataProcessor';

interface ClientDataPreviewProps {
  customer: NotaryCustomer;
  onClose?: () => void;
}

/**
 * Component to preview processed client data
 * This shows how the data processor organizes and sorts all client information
 */
const ClientDataPreview: Component<ClientDataPreviewProps> = (props) => {
  // Process client data
  const processedData = createMemo(() => processClientData(props.customer));

  const sectionStyle = {
    'margin-bottom': '1.5rem',
    padding: '1.5rem',
    background: 'var(--gray-50)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--primary-color)'
  };

  return (
    <div style={{ 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem'
      }}>
        <div>
          <h2 style={{
            'font-size': '1.75rem',
            'font-weight': '700',
            'margin-bottom': '0.5rem'
          }}>
            📊 Vista Procesada de Datos del Cliente
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Datos organizados y listos para llenar formularios
          </p>
        </div>
        <Show when={props.onClose}>
          <Button variant="outline" onClick={props.onClose}>
            ✕ Cerrar
          </Button>
        </Show>
      </div>

      {/* Personal Information */}
      <Card>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>👤 Información Personal</h3>
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
            <div>
              <strong>Nombre Completo:</strong> {processedData().personal.fullName}
            </div>
            <div>
              <strong>Edad:</strong> {processedData().personal.age || '-'} años
            </div>
            <div>
              <strong>Fecha de Nacimiento:</strong>{' '}
              {processedData().personal.dateOfBirth?.toLocaleDateString('es-ES') || '-'}
            </div>
            <div>
              <strong>Lugar de Nacimiento:</strong>{' '}
              {processedData().personal.placeOfBirth?.formatted || '-'}
            </div>
            <div>
              <strong>Género:</strong> {processedData().personal.gender || '-'}
            </div>
            <div>
              <strong>Estado Civil:</strong> {processedData().personal.maritalStatus || '-'}
            </div>
          </div>
        </div>
      </Card>

      {/* Residences */}
      <Card>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            🏠 Residencias ({processedData().residences.all.length} total)
          </h3>

          <div style={{ 'margin-bottom': '1rem', display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
            <div style={{
              padding: '0.5rem 1rem',
              background: 'var(--info-light)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              🇺🇸 En USA: {processedData().residences.inUSA.length}
            </div>
            <div style={{
              padding: '0.5rem 1rem',
              background: 'var(--warning-light)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              🌍 Fuera de USA: {processedData().residences.outsideUSA.length}
            </div>
            <div style={{
              padding: '0.5rem 1rem',
              background: 'var(--success-light)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              📅 Últimos 5 años: {processedData().residences.last5Years.length}
            </div>
          </div>

          <Show when={processedData().residences.current}>
            <div style={{
              padding: '1rem',
              background: 'var(--success-light)',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1rem',
              border: '1px solid var(--success-color)'
            }}>
              <strong>✅ Residencia Actual:</strong>
              <div style={{ 'margin-top': '0.5rem' }}>
                {processedData().residences.current?.formattedAddress}
              </div>
              <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
                {processedData().residences.current?.formattedPeriod} ({processedData().residences.current?.duration} meses)
              </div>
            </div>
          </Show>

          {/* Group by Country */}
          <div style={{ 'margin-top': '1rem' }}>
            <h4 style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Por País:</h4>
            <For each={Array.from(processedData().residences.byCountry.entries())}>
              {([country, residences]) => (
                <div style={{
                  padding: '0.75rem',
                  background: 'white',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <strong>{country}:</strong> {residences.length} residencia(s)
                  <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem' }}>
                    <For each={residences.slice(0, 2)}>
                      {(res) => (
                        <div style={{ 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
                          • {res.city}, {res.state} ({res.formattedPeriod})
                        </div>
                      )}
                    </For>
                    <Show when={residences.length > 2}>
                      <div style={{ 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
                        ... y {residences.length - 2} más
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Card>

      {/* Employment */}
      <Card>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            💼 Historial Laboral ({processedData().employers.all.length} total)
          </h3>

          <Show when={processedData().employers.current}>
            <div style={{
              padding: '1rem',
              background: 'var(--success-light)',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1rem',
              border: '1px solid var(--success-color)'
            }}>
              <strong>✅ Empleo Actual:</strong>
              <div style={{ 'margin-top': '0.5rem' }}>
                {processedData().employers.current?.employerName} - {processedData().employers.current?.occupation}
              </div>
              <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
                {processedData().employers.current?.formattedAddress}
              </div>
              <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
                {processedData().employers.current?.formattedPeriod} ({processedData().employers.current?.duration} meses)
              </div>
            </div>
          </Show>

          <div style={{ 'margin-bottom': '1rem' }}>
            <strong>Últimos 5 años:</strong> {processedData().employers.last5Years.length} empleo(s)
          </div>

          <For each={processedData().employers.all.slice(0, 3)}>
            {(employer) => (
              <div style={{
                padding: '0.75rem',
                background: 'white',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '0.5rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ 'font-weight': '600' }}>
                  {employer.employerName} {employer.isCurrent && '(Actual)'}
                </div>
                <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
                  {employer.occupation} • {employer.formattedPeriod}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {employer.city}, {employer.state}, {employer.country}
                </div>
              </div>
            )}
          </For>
        </div>
      </Card>

      {/* Education */}
      <Card>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            🎓 Educación ({processedData().education.all.length} total)
          </h3>

          <Show when={processedData().education.highest}>
            <div style={{
              padding: '1rem',
              background: 'var(--info-light)',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1rem',
              border: '1px solid var(--info-color)'
            }}>
              <strong>🏆 Nivel Más Alto:</strong>
              <div style={{ 'margin-top': '0.5rem' }}>
                {processedData().education.highest?.schoolType} - {processedData().education.highest?.schoolName}
              </div>
            </div>
          </Show>

          <For each={processedData().education.all}>
            {(school) => (
              <div style={{
                padding: '0.75rem',
                background: 'white',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '0.5rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ 'font-weight': '600' }}>{school.schoolName}</div>
                <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
                  {school.schoolType} • {school.formattedPeriod}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {school.formattedLocation}
                </div>
              </div>
            )}
          </For>
        </div>
      </Card>

      {/* Travel History */}
      <Show when={processedData().travelHistory.all.length > 0}>
        <Card>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              ✈️ Historial de Viajes ({processedData().travelHistory.all.length} entrada(s))
            </h3>

            <div style={{ 'margin-bottom': '1rem' }}>
              <strong>Últimos 5 años:</strong> {processedData().travelHistory.last5Years.length} entrada(s)
            </div>

            <For each={processedData().travelHistory.all.slice(0, 5)}>
              {(entry) => (
                <div style={{
                  padding: '0.75rem',
                  background: 'white',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ 'font-weight': '600' }}>
                    {entry.formattedDate}
                  </div>
                  <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
                    Entrada en: {entry.placeOfEntry}, {entry.state}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Estado: {entry.status} • Hace {entry.daysSinceEntry} días
                  </div>
                </div>
              )}
            </For>
          </div>
        </Card>
      </Show>

      {/* Passports */}
      <Show when={processedData().passports.all.length > 0}>
        <Card>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>
              📔 Pasaportes ({processedData().passports.all.length} total)
            </h3>

            <div style={{ 'margin-bottom': '1rem', display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
              <div style={{
                padding: '0.5rem 1rem',
                background: 'var(--success-light)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                ✅ Válidos: {processedData().passports.valid.length}
              </div>
              <div style={{
                padding: '0.5rem 1rem',
                background: 'var(--danger-light)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                ❌ Expirados: {processedData().passports.expired.length}
              </div>
            </div>

            <Show when={processedData().passports.current}>
              <div style={{
                padding: '1rem',
                background: 'var(--success-light)',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem',
                border: '1px solid var(--success-color)'
              }}>
                <strong>✅ Pasaporte Actual:</strong>
                <div style={{ 'margin-top': '0.5rem' }}>
                  {processedData().passports.current?.passportNumber} ({processedData().passports.current?.countryOfIssuance})
                </div>
                <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem', color: 'var(--text-muted)' }}>
                  Vence: {processedData().passports.current?.formattedExpirationDate}
                  {processedData().passports.current?.daysUntilExpiration &&
                    ` (en ${processedData().passports.current.daysUntilExpiration} días)`
                  }
                </div>
              </div>
            </Show>

            <For each={processedData().passports.all}>
              {(passport) => (
                <div style={{
                  padding: '0.75rem',
                  background: 'white',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ 'font-weight': '600' }}>
                    {passport.passportNumber} {passport.isValid && '✅'} {passport.isExpired && '❌'}
                  </div>
                  <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
                    {passport.countryOfIssuance}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Emitido: {passport.formattedIssueDate} • Vence: {passport.formattedExpirationDate}
                  </div>
                </div>
              )}
            </For>
          </div>
        </Card>
      </Show>

      {/* Marriage Info */}
      <Show when={processedData().marriage}>
        <Card>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>💑 Información de Matrimonio</h3>
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong>Fecha:</strong>{' '}
                {processedData().marriage?.date?.toLocaleDateString('es-ES') || '-'}
              </div>
              <div>
                <strong>Lugar:</strong> {processedData().marriage?.place?.formatted || '-'}
              </div>
            </div>
          </div>
        </Card>
      </Show>

      {/* Raw JSON View (for debugging) */}
      <Card>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>🔧 Datos Procesados (JSON)</h3>
          <details>
            <summary style={{ cursor: 'pointer', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              Ver JSON completo
            </summary>
            <pre style={{
              background: '#1e1e1e',
              color: '#d4d4d4',
              padding: '1rem',
              'border-radius': 'var(--border-radius-sm)',
              overflow: 'auto',
              'max-height': '400px',
              'font-size': '0.75rem'
            }}>
              {JSON.stringify(processedData(), null, 2)}
            </pre>
          </details>
        </div>
      </Card>
    </div>
  );
};

export default ClientDataPreview;
