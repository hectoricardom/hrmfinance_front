import { Component, createSignal, onMount, Show } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { HBL, HBLLocationScan } from '../types';
import HBLScanProgress from '../components/HBLScanProgress';
import HBLScanIndicator from '../components/HBLScanIndicator';
import { Card } from '../../ui';
import { hblStore } from '../data/hblStore';
import { devLog } from '../../../services/utils';

/**
 * Demo page to showcase HBL scan location tracking feature
 * Supports query parameter: ?hbl=HBL_NUMBER to load real data
 */
const HBLScanLocationDemo: Component = () => {
  const [searchParams] = useSearchParams();
  const [loadingHBL, setLoadingHBL] = createSignal(false);
  const [hblNotFound, setHblNotFound] = createSignal(false);

  // Sample HBL data with scan history (fallback for demo)
  const sampleScans: HBLLocationScan[] = [
    {
      locationId: 'YABA_09',
      locationLabel: 'Recogida en Tienda',
      scannedAt: new Date('2025-01-10T10:00:00'),
      scannedBy: 'John Doe',
      notes: 'Package received from customer'
    },
    {
      locationId: 'YABA_11',
      locationLabel: 'En transito hacia YABA WH',
      scannedAt: new Date('2025-01-10T14:30:00'),
      scannedBy: 'Transport Driver',
      notes: 'Loaded on truck #45'
    },
    {
      locationId: 'YABA_13',
      locationLabel: 'YABA ALMACEN',
      scannedAt: new Date('2025-01-11T09:15:00'),
      scannedBy: 'Warehouse Staff',
      notes: 'Received in main warehouse'
    },
    {
      locationId: 'YABA_14',
      locationLabel: 'En transito hacia FL',
      scannedAt: new Date('2025-01-11T16:00:00'),
      scannedBy: 'Logistics Coordinator'
    },
    {
      locationId: 'YABA_22',
      locationLabel: 'Entrega a la aerolinea',
      scannedAt: new Date('2025-01-12T11:30:00'),
      scannedBy: 'Airport Handler',
      notes: 'Delivered to airline counter - Flight AA1234'
    }
  ];

  const sampleHBL: HBL = {
    idreserve: 'RES123456',
    idairnumber: 'AIR789',
    idairguide: 'AG001234',
    datereserve: '2025-01-10',
    hbl: '230123456',
    cidentity: '12345678',
    street: '123 Main St, Apt 4B',
    ctelephone: '+1234567890',
    nameshipper: 'Test Shipper',
    quantity: '2',
    weight: '15.5',
    idguidestate: 'YABA_22',
    namegood: 'Electronics',
    bagnumber: 'BAG-001',
    agency: 'Miami Office',
    guia: 'GUIDE-123',
    consigneeName: 'Juan Perez',
    phoneshipper: '+9876543210',
    address: {
      estate: 'La Habana',
      city: 'Habana del Este',
      rpto: 'Alamar',
      streetName: 'Calle 5ta',
      streetNo: '123',
      betwen: 'Entre A y B'
    },
    scannedLocations: sampleScans
  };

  const [hblData, setHblData] = createSignal<any>();

  // Load HBL data from query parameter
  onMount(async () => {
    const hblNumber = searchParams.hbl;
    if (hblNumber) {
      setLoadingHBL(true);
      setHblNotFound(false);

      try {
        // Fetch HBL by number
        let locationsHBL = await hblStore.fetchScannedLocations(hblNumber);

         let foundHBL = await hblStore.fetchHBLs(hblNumber);
       

        let kkk = {...foundHBL}
        kkk.scannedLocations = locationsHBL;

        // Check if HBL was found
         devLog(kkk)
        if (kkk.hbl) {
          setHblData(kkk);
          setHblNotFound(false);
        } else {
          setHblNotFound(true);
        }
      } catch (error) {
        devLog('Error loading HBL:', error);
        setHblNotFound(true);
      } finally {
        setLoadingHBL(false);
      }
    }
  });

  const containerStyle = {
    padding: '2rem',
    'max-width': '1200px',
    margin: '0 auto'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem'
  };

  const sectionStyle = {
    'margin-bottom': '2rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const infoBoxStyle = {
    padding: '1rem',
    'background-color': '#f8f9fa',
    'border-radius': '8px',
    border: '1px solid #dee2e6'
  };

  const labelStyle = {
    'font-size': '0.85rem',
    'font-weight': '600',
    color: '#6c757d',
    'margin-bottom': '0.25rem'
  };

  const valueStyle = {
    'font-size': '1rem',
    color: '#212529'
  };

  const codeBlockStyle = {
    padding: '1rem',
    'background-color': '#f5f5f5',
    border: '1px solid #ddd',
    'border-radius': '6px',
    'font-family': 'monospace',
    'font-size': '0.85rem',
    'white-space': 'pre-wrap' as const,
    'overflow-x': 'auto' as const,
    'margin-top': '0.5rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ margin: '0 0 0.5rem 0', 'font-size': '2rem' }}>
          📍 HBL Scan Location Tracking
          <Show when={searchParams.hbl}>
            {' '}- {searchParams.hbl}
          </Show>
        </h1>
        <p style={{ color: '#6c757d', 'font-size': '1.1rem', margin: '0' }}>
          <Show when={!searchParams.hbl}>
            Demo: Track package progress through multiple scan locations
          </Show>
          <Show when={searchParams.hbl && !loadingHBL() && !hblNotFound()}>
            Tracking real-time scan locations for this HBL
          </Show>
          <Show when={loadingHBL()}>
            Cargando información del HBL...
          </Show>
          <Show when={hblNotFound()}>
            <span style={{ color: '#dc3545' }}>
              ❌ HBL no encontrado - Mostrando datos de demostración
            </span>
          </Show>
        </p>
      </div>

      {/* Loading State */}
      <Show when={loadingHBL()}>
        <Card>
          <div style={{ padding: '3rem', 'text-align': 'center' }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>⏳</div>
            <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>
              Cargando HBL...
            </h2>
            <p style={{ color: '#6c757d', margin: '0' }}>
              Por favor espere
            </p>
          </div>
        </Card>
      </Show>

      {/* HBL Info Card */}
      <Show when={!loadingHBL()}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.5rem' }}>
              HBL Information
              <Show when={hblNotFound()}>
                <span style={{ 'font-size': '0.875rem', color: '#dc3545', 'margin-left': '1rem' }}>
                  (Datos de Demostración)
                </span>
              </Show>
            </h2>

            <div style={gridStyle}>
            <div style={infoBoxStyle}>
              <div style={labelStyle}>HBL Number</div>
              <div style={valueStyle}>{hblData()?.hbl}</div>
            </div>

            <div style={infoBoxStyle}>
              <div style={labelStyle}>Consignee</div>
              <div style={valueStyle}>{hblData()?.consigneeName}</div>
            </div>

            <div style={infoBoxStyle}>
              <div style={labelStyle}>Current Status</div>
              <div style={valueStyle}>{hblData()?.idguidestate}</div>
            </div>

            <div style={infoBoxStyle}>
              <div style={labelStyle}>Scan Progress</div>
              <div style={{ 'margin-top': '0.5rem' }}>
                <HBLScanIndicator
                  scannedLocations={hblData()?.scannedLocations}
                  size="medium"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

        {/* Scan Progress Display */}
        <div style={sectionStyle}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.5rem' }}>
              Full Scan Progress View
            </h2>
            <HBLScanProgress
              scannedLocations={hblData()?.scannedLocations}
              currentStatus={hblData()?.idguidestate}
            />
          </div>
        </Card>
      </div>

        {/* Compact View */}
        <div style={sectionStyle}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.5rem' }}>
              Compact View (for lists)
            </h2>
            <HBLScanProgress
              scannedLocations={hblData()?.scannedLocations}
              currentStatus={hblData()?.idguidestate}
              compact={true}
            />
          </div>
        </Card>
      </div>

        {/* Scan Indicators */}
        <div style={sectionStyle}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.5rem' }}>
              Scan Indicators
            </h2>
            <p style={{ color: '#6c757d', 'margin-bottom': '1rem' }}>
              These compact indicators can be used in list views to show scan status at a glance:
            </p>

            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                <span style={{ 'min-width': '120px', 'font-weight': '600' }}>With scans:</span>
                <HBLScanIndicator
                  scannedLocations={sampleScans}
                  size="small"
                />
              </div>

              <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                <span style={{ 'min-width': '120px', 'font-weight': '600' }}>Medium size:</span>
                <HBLScanIndicator
                  scannedLocations={sampleScans}
                  size="medium"
                />
              </div>

              <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                <span style={{ 'min-width': '120px', 'font-weight': '600' }}>No scans:</span>
                <HBLScanIndicator
                  scannedLocations={[]}
                  size="small"
                />
              </div>

              <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                <span style={{ 'min-width': '120px', 'font-weight': '600' }}>Hide count:</span>
                <HBLScanIndicator
                  scannedLocations={sampleScans}
                  showCount={false}
                  size="small"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

        {/* Usage Example */}
        <div style={sectionStyle}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.5rem' }}>
              Usage Example
            </h2>
            <p style={{ color: '#6c757d', 'margin-bottom': '1rem' }}>
              Here's how to integrate scan location tracking in your HBL workflow:
            </p>

            <div>
              <h3 style={{ 'font-size': '1rem', 'margin-bottom': '0.5rem' }}>
                1. Update HBL Type (Already Done)
              </h3>
              <div style={codeBlockStyle}>
{`export interface HBL {
  // ... other fields
  scannedLocations?: HBLLocationScan[];
}`}
              </div>

              <h3 style={{ 'font-size': '1rem', 'margin': '1rem 0 0.5rem 0' }}>
                2. Update Status with Location Scan
              </h3>
              <div style={codeBlockStyle}>
{`import { updateHBLStatus } from './status/hblUpdateService';

// When scanning an HBL at a location
await updateHBLStatus(
  '230123456',           // HBL number
  'YABA_13',             // Status/Location ID
  'Optional notes',      // Notes
  'John Doe'             // Scanned by user
);`}
              </div>

              <h3 style={{ 'font-size': '1rem', 'margin': '1rem 0 0.5rem 0' }}>
                3. Display Scan Progress
              </h3>
              <div style={codeBlockStyle}>
{`import HBLScanProgress from './components/HBLScanProgress';

<HBLScanProgress
  scannedLocations={hbl.scannedLocations}
  currentStatus={hbl.idguidestate}
  compact={false}
/>`}
              </div>

              <h3 style={{ 'font-size': '1rem', 'margin': '1rem 0 0.5rem 0' }}>
                4. Use Scan Indicator in Lists
              </h3>
              <div style={codeBlockStyle}>
{`import HBLScanIndicator from './components/HBLScanIndicator';

<HBLScanIndicator
  scannedLocations={hbl.scannedLocations}
  size="small"
/>`}
              </div>
            </div>
          </div>
        </Card>
      </div>

        {/* Features */}
        <div style={sectionStyle}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.5rem' }}>
              ✨ Features
            </h2>
            <ul style={{ 'margin': '0', 'padding-left': '1.5rem', 'line-height': '1.8' }}>
              <li>
                <strong>Complete Location History:</strong> Track every scan location with timestamps
              </li>
              <li>
                <strong>User Attribution:</strong> See who scanned each location
              </li>
              <li>
                <strong>Notes Support:</strong> Add contextual notes to each scan
              </li>
              <li>
                <strong>Visual Timeline:</strong> Beautiful timeline visualization of scan progress
              </li>
              <li>
                <strong>Current Location Indicator:</strong> Clearly shows the latest location
              </li>
              <li>
                <strong>Compact Views:</strong> Space-efficient indicators for list views
              </li>
              <li>
                <strong>Responsive Design:</strong> Works on all screen sizes
              </li>
              <li>
                <strong>Automatic Integration:</strong> Works seamlessly with existing HBL scanner
              </li>
            </ul>
          </div>
        </Card>
      </div>

        {/* Query Parameter Help */}
        <Show when={!searchParams.hbl}>
          <div style={sectionStyle}>
            <Card>
              <div style={{ padding: '1.5rem', 'background-color': '#e7f3ff', 'border-left': '4px solid #0066cc' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.125rem', color: '#0066cc' }}>
                  💡 Tip: Load Real HBL Data
                </h3>
                <p style={{ margin: '0', color: '#334155', 'line-height': '1.6' }}>
                  To view scan location data for a real HBL, add the query parameter <code style={{ background: 'white', padding: '0.125rem 0.375rem', 'border-radius': '4px', 'font-family': 'monospace' }}>?hbl=HBL_NUMBER</code> to the URL.
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', 'font-size': '0.875rem' }}>
                  Example: <code style={{ background: 'white', padding: '0.125rem 0.375rem', 'border-radius': '4px', 'font-family': 'monospace' }}>/#/hbl-scan-location?hbl=230123456</code>
                </p>
              </div>
            </Card>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default HBLScanLocationDemo;
